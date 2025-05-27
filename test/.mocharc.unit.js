// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/* global module, process, require */

const semver = require('semver');

module.exports = {
  extension: ['ts'],
  recursive: true,
  require: ['ts-node/register'],
  spec: semver.lt(process.version, '18.19.0')
    ? ['src/1.x/**/*test.ts', 'src/util/**/*test.ts']
    : ['src/2.x/**/*test.ts', 'src/util/**/*test.ts'],
};
