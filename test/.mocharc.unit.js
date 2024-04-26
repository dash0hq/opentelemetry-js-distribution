// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/* global module */

module.exports = {
  extension: ['ts'],
  recursive: true,
  require: ['ts-node/register'],
  spec: ['src/**/*test.ts'],
};
