// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports */

'use strict';

const eslint = require('@eslint/js');
const tsEsLint = require('typescript-eslint');

const header = require('eslint-plugin-header');
const mocha = require('eslint-plugin-mocha');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = tsEsLint.config(
  //
  eslint.configs.recommended,
  ...tsEsLint.configs.recommended,
  {
    plugins: {
      header,
      mocha,
      simpleImportSort,
      unusedImports,
    },
    ignores: [
      //
      'test/collector/opentelemetry-proto',
      'test/collector/types',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'header/header': [
        2,
        'line',
        [
          {
            pattern: ' SPDX-FileCopyrightText: Copyright \\d{4} Dash0 Inc\\.',
            template: ` SPDX-FileCopyrightText: Copyright ${new Date().getFullYear()} Dash0 Inc.`,
          },
          ' SPDX-License-Identifier: Apache-2.0',
        ],
        2,
      ],
      'mocha/no-exclusive-tests': 'error',
      'no-case-declarations': 'off',
      'simpleImportSort/exports': 'error',
      'unusedImports/no-unused-imports': 'error',
    },
  },
  {
    files: ['src/**/*_test.*', 'test/**/*'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    files: ['**/.mocharc.*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
