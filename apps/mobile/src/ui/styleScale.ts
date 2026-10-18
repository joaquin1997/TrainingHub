/**
 * The closed-scale check (spec 0034 AC-5): finds style values written as
 * literals instead of tokens. Pure, so the test that runs it over `src/` and
 * its own unit tests share it.
 *
 * - **type / shape / spacing** — a number other than 0 in the value of a font
 *   size, line height, corner radius, padding, margin or gap;
 * - **colour** — a hex, `rgb()`/`hsl()` or named colour value;
 * - **keyboard** — a `<TextInput` without `keyboardAppearance`, or with a
 *   fixed one instead of the theme's (0034 FR-3, 0038 FR-12);
 * - **statusBar** — a `<StatusBar` with a fixed `style` (0038 AC-3).
 *
 * Widths, heights, border widths and icon sizes are not checked: they are
 * sizes, not steps of a scale (hairline borders are not spacing — FR-11).
 */
export type ScaleViolationKind = 'type' | 'radius' | 'spacing' | 'colour' | 'keyboard' | 'statusBar';

export interface ScaleViolation {
  kind: ScaleViolationKind;
  line: number;
  text: string;
}

const PROPERTY =
  /\b(fontSize|lineHeight|borderRadius|border(?:Top|Bottom)(?:Left|Right|Start|End)Radius|(?:padding|margin)(?:Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?|gap|rowGap|columnGap)\s*:\s*([^,}\n]+)/g;
/** A number literal that is not part of an identifier or a member access. */
const NUMBER = /(?:^|[^\w.$])(\d*\.?\d+)/g;
const HEX_COLOUR = /(['"`])#[0-9a-fA-F]{3,8}\1/;
const FUNCTION_COLOUR = /\b(?:rgba?|hsla?)\(/;
const NAMED_COLOUR = /\b\w*[cC]olou?r\w*\s*[:=]\s*\{?\s*(['"])([a-zA-Z]+)\1/g;
const ALLOWED_NAMED = new Set(['transparent', 'currentColor']);

function kindOf(property: string): ScaleViolationKind {
  if (property === 'fontSize' || property === 'lineHeight') {
    return 'type';
  }
  return property.endsWith('Radius') ? 'radius' : 'spacing';
}

/** Comments become spaces, keeping line numbers and string contents intact. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, (_, before: string) => before);
}

function hasNonZeroNumber(value: string): boolean {
  for (const match of value.matchAll(NUMBER)) {
    if (Number(match[1]) !== 0) {
      return true;
    }
  }
  return false;
}

/** The text of a JSX element's opening tag starting at `start` (`<Tag ... >`). */
function openingTag(source: string, start: number): string {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    } else if (char === '>' && depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

export function scanStyleSource(source: string): ScaleViolation[] {
  const code = stripComments(source);
  const lines = code.split('\n');
  const violations: ScaleViolation[] = [];

  lines.forEach((text, index) => {
    const line = index + 1;
    for (const match of text.matchAll(PROPERTY)) {
      if (hasNonZeroNumber(match[2]!)) {
        violations.push({ kind: kindOf(match[1]!), line, text: match[0].trim() });
      }
    }
    if (HEX_COLOUR.test(text) || FUNCTION_COLOUR.test(text)) {
      violations.push({ kind: 'colour', line, text: text.trim() });
    } else {
      for (const match of text.matchAll(NAMED_COLOUR)) {
        if (!ALLOWED_NAMED.has(match[2]!)) {
          violations.push({ kind: 'colour', line, text: match[0].trim() });
        }
      }
    }
  });

  for (const match of code.matchAll(/<TextInput\b/g)) {
    const tag = openingTag(code, match.index);
    const line = code.slice(0, match.index).split('\n').length;
    if (!/\bkeyboardAppearance\b/.test(tag)) {
      violations.push({ kind: 'keyboard', line, text: '<TextInput without keyboardAppearance' });
    } else if (/\bkeyboardAppearance\s*=\s*["'{]\s*["']?(dark|light|default)/.test(tag)) {
      violations.push({ kind: 'keyboard', line, text: '<TextInput with a fixed keyboardAppearance' });
    }
  }

  for (const match of code.matchAll(/<StatusBar\b/g)) {
    const tag = openingTag(code, match.index);
    if (/\bstyle\s*=\s*["'{]\s*["']?(dark|light|auto|inverted)/.test(tag)) {
      const line = code.slice(0, match.index).split('\n').length;
      violations.push({ kind: 'statusBar', line, text: '<StatusBar with a fixed style' });
    }
  }

  return violations;
}
