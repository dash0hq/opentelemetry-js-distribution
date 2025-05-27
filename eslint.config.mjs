// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import header from 'eslint-plugin-header';
import mocha from 'eslint-plugin-mocha';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
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
    // Note: These patterns need to have a file type extension, otherwise they will match temp files like `.swp` from
    // vim.
    files: ['src/**/*_test*.ts', 'test/**/*.ts', 'test/**/*.js'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  {
    // Note: These patterns need to have a file type extension, otherwise they will match temp files like `.swp` from
    // vim.
    files: ['**/.mocharc.*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
