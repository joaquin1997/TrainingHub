// One-off codemod for spec 0038 (runtime theme), kept for reference:
//
//   node apps/mobile/scripts/theme-codemod.mjs [--dry]
//
// Over every .ts/.tsx under src/ (tests and ui/theme.ts, ui/tokens.ts aside):
// 1. `const x = StyleSheet.create({ … })` → `const x = createStyles(() => ({ … }))`;
// 2. in files that draw with the theme, `useTheme();` first in every
//    capitalised function component;
// 3. imports of `createStyles` / `useTheme` from `@/ui/theme`, and
//    `StyleSheet` dropped from react-native when no longer used;
// 4. lists colour reads at module level (evaluated once, so they would never
//    change theme) for a fix by hand.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const dry = process.argv.includes('--dry');

const SKIP = new Set(['src/ui/theme.ts', 'src/ui/tokens.ts']);
const THEME_NAMES = ['colors', 'commonStyles', 'screenHeader', 'styles'];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const isFunctionLike = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node);

const report = [];

for (const path of files(join(app, 'src'))) {
  const rel = relative(app, path);
  if (SKIP.has(rel)) continue;
  const source = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  let usesTheme = false;
  let madeStyles = false;
  const components = [];

  const visit = (node) => {
    // 1. StyleSheet.create(...) at module level.
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'StyleSheet.create' &&
      node.arguments.length === 1 &&
      ts.isVariableDeclaration(node.parent)
    ) {
      const arg = node.arguments[0];
      edits.push({
        start: node.getStart(file),
        end: node.getEnd(),
        text: `createStyles(() => (${arg.getText(file)}))`,
      });
      madeStyles = true;
      usesTheme = true;
    }
    if (ts.isIdentifier(node) && THEME_NAMES.includes(node.text)) {
      const parent = node.parent;
      const isRead =
        (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
        ts.isSpreadAssignment(parent) ||
        ts.isSpreadElement(parent);
      if (isRead) {
        usesTheme = true;
        if (node.text === 'colors') {
          let ancestor = node.parent;
          let inFunction = false;
          while (ancestor) {
            if (isFunctionLike(ancestor)) {
              inFunction = true;
              break;
            }
            ancestor = ancestor.parent;
          }
          if (!inFunction) {
            const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
            report.push(`${rel}:${line + 1} ${parent.getText(file)}`);
          }
        }
      }
    }
    // 2. Capitalised function components with a block body.
    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text) && node.body) {
      components.push(node.body);
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /^[A-Z]/.test(node.name.text) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
      ts.isBlock(node.initializer.body)
    ) {
      components.push(node.initializer.body);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  if (!usesTheme) continue;

  for (const body of components) {
    const already = body.statements.some((statement) => statement.getText(file).startsWith('useTheme()'));
    if (!already) {
      const at = body.getStart(file) + 1;
      edits.push({ start: at, end: at, text: '\n  useTheme();' });
    }
  }

  let next = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }

  // 3. Imports.
  const needed = [madeStyles ? 'createStyles' : null, components.length > 0 ? 'useTheme' : null].filter(Boolean);
  const themeImport = /import \{([^}]*)\} from '(@\/ui\/theme|\.\/theme|\.\.\/ui\/theme)';/;
  const match = next.match(themeImport);
  if (match) {
    const names = new Set(match[1].split(',').map((name) => name.trim()).filter(Boolean));
    needed.forEach((name) => names.add(name));
    const list = [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    next = next.replace(themeImport, `import { ${list.join(', ')} } from '${match[2]}';`);
  } else if (needed.length > 0) {
    const from = rel.startsWith('src/ui/') ? './theme' : '@/ui/theme';
    const lines = next.split('\n');
    let last = 0;
    lines.forEach((line, index) => {
      if (/^import .* from '.*';$/.test(line) || /^} from '.*';$/.test(line)) last = index;
    });
    lines.splice(last + 1, 0, `import { ${needed.join(', ')} } from '${from}';`);
    next = lines.join('\n');
  }
  if (madeStyles && !/StyleSheet\.(?!create)/.test(next) && !/StyleSheet\b(?!\.)/.test(next.replace(/import[^;]*;/g, ''))) {
    next = next.replace(/(import \{[^}]*?)\bStyleSheet,\s*/s, '$1').replace(/,\s*StyleSheet(\s*\})/, '$1');
  }

  if (next !== source) {
    if (!dry) writeFileSync(path, next);
    console.log('updated', rel);
  }
}

console.log('\nModule-level colour reads (fix by hand):');
console.log(report.join('\n') || '(none)');
