// SPDX-FileCopyrightText: Copyright 2025 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/* global module, require */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const isCi = require('is-ci');

module.exports = {
  extension: ['ts'],
  ignore: ['test/**/node_modules/**'],
  recursive: true,
  require: ['ts-node/register'],
  slow: 3000,
  spec: ['test/integration/minimumVersion_test.js'],
  timeout: isCi ? 20000 : 10000,
};
