// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/* global module */

module.exports = {
  extension: ['ts'],
  ignore: ['test/**/node_modules/**'],
  recursive: true,
  require: ['ts-node/register'],
  slow: 3000,
  spec: ['test/**/*test.ts'],
  timeout: 10000,
};
