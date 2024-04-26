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
