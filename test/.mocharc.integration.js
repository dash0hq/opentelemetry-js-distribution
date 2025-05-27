// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/* global module, require */

const isCi = require('is-ci');

module.exports = {
  extension: ['ts'],
  ignore: ['test/**/node_modules/**'],
  // For running tests on Node.js 16.x, we need to enable fetch explicitly.
  'node-option': ['experimental-fetch'],
  recursive: true,
  require: ['ts-node/register'],
  slow: 3000,
  spec: ['test/**/*test.ts'],
  timeout: isCi ? 20000 : 10000,
};
