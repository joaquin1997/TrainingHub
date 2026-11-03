# Data and asset sources

Application code, dependencies, exercise data, photos and design references
have separate origins. Do not assume one repository-wide license covers them.

## Reviewed exercise catalog

`apps/api/src/scripts/data/catalog/` holds the reviewed bilingual catalog used
by spec 0044. It combines manually curated entries with reviewed entries from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db). The upstream
repository publishes an [Unlicense file](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md)
and describes its data as public domain. Preserve the upstream provenance
when reusing the dataset.

Entries reference source image identifiers. The app normally resolves those
to hosted upstream image URLs rather than vendoring an image library here.
Availability depends on that external source. Locally supplied profile/custom
exercise photos are user data and are not catalog assets.

The curation and image-matching code records the source conventions. Catalog
reviews under `docs/sdd/specs/0044-curated-exercise-catalog/review/` document
technical choices; they are not an independent license grant.

## Historical wger import

`apps/api/src/features/exercises/importers/wger/` and the `import:wger*`
commands remain as historical/maintenance tools. They are not the recommended
fresh-setup source. Imported records retain source identifiers and available
author/license metadata. Verify the original record's terms before using or
redistributing imported content; do not treat every imported image or
translation as having the same license as the application code.

## Application assets and references

`apps/mobile/assets/` contains application branding assets. Screenshot
references under older specs and widget render sheets are development
artifacts; use current, synthetic-data captures for a public demonstration.
External design references and third-party package licenses do not become
application ownership merely by appearing in a spec.

There is currently no open-source license grant for TrainingHub's application
code. Repository review access and an open-source license are different
permissions. Any future license choice should state which code/assets it
covers and preserve applicable third-party notices.
