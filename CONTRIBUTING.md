# Contributing

## Setup

Please use the Node.js version defined in [.nvmrc](.nvmrc) for local development.
Additionally, all code needs to work with the Node.js versions tested in the GitHub
[verify](./.github/workflows/verify.yaml) action.

Run `npm install` in the root of the repository after cloning the repository.

## Local development

* Use `npm run verify` to run all linters and run all tests locally. This run script is also used on CI.
* Use `npm run lint` to only run linters (eslint & prettier), but no tests.
* Use `npm run eslint` to only run eslint (including `typescript-eslint`), but not prettier.
* Use `npm run prettier-check`: to check if all files are formatted correctly.
* Use `npm run prettier` to automatically format all files according to the prettier configuration.
* Use `npm run test` to run all tests (unit tests & integration tests), but no linters.
* Use `npm run test:unit` to only run unit tests, but no integration tests.
* Use `npm run test:integration` to only run integration tests, but no unit tests.
* Use `npm run test:coverage` to run unit and integration tests and generate a coverage report.
* Use `npm run build` to create a production build in the `dist` folder.

## Dependencies

The 1.x and 2.x OpenTelemetry SDK packages declare a peer dependency on `@opentelemetry/api` below 1.10.0, but they
must share a single copy of `@opentelemetry/api` 1.10.0 with the rest of the distribution. An application that depends
on `@opentelemetry/api` 1.10.0 itself only sees the SDK if the SDK registered its globals with that version or a newer
one.

* `overrides` in `package.json` forces that single copy when this repository is the root project. The override repeats
  the version range from `dependencies` instead of referencing it with `$@opentelemetry/api`, because npm 9 fails to
  install the published package with the reference form. `src/util/dependencies_test.ts` checks that both ranges match.
* npm ignores `overrides` when the distribution is installed as a dependency, which is how the Dash0 operator installs
  it. `bundleDependencies` therefore ships the dependency tree resolved here inside the published package.
* `test/integration/packaged_test.ts` packs the distribution and installs it as a dependency to verify the published
  tree. Changes to dependencies should keep that test green, not only the tests that run against `src`. Packing runs
  the `prepack` script, so the integration tests rebuild `dist` and delete any `dash0-opentelemetry-*.tgz` in the
  repository root.
