// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';

import { hasOptedIn, hasOptedOut, parseNumericEnvironmentVariableWithDefault } from './environment';

describe('environment variables', () => {
  const envVarsUsedInTest = [
    //
    'DASH0_TEST_IS_NOT_SET',
    'DASH0_TEST_IS_SET',
    'DASH0_TEST_NOT_A_NUMBER',
    'DASH0_TEST_NUMERIC_ENV_VAR',
  ];
  const originalValues: Map<string, string | undefined> = new Map();

  before(() => {
    envVarsUsedInTest.forEach(envVar => {
      originalValues.set(envVar, process.env[envVar]);
    });
  });

  afterEach(() => {
    envVarsUsedInTest.forEach(envVar => {
      process.env[envVar] = originalValues.get(envVar);
    });
  });

  describe('opt-in', () => {
    it('returns false if env var is not set', async () => {
      expect(hasOptedIn('DASH0_TEST_IS_NOT_SET')).to.be.false;
    });

    it('returns false if env var is not set to true', async () => {
      process.env.DASH0_TEST_IS_SET = 'whatever';
      expect(hasOptedIn('DASH0_TEST_IS_SET')).to.be.false;
    });

    it('returns true if env var is to true', async () => {
      process.env.DASH0_TEST_IS_SET = 'true';
      expect(hasOptedIn('DASH0_TEST_IS_SET')).to.be.true;
    });

    it('returns true if env var is to true (case-insensitive)', async () => {
      process.env.DASH0_TEST_IS_SET = 'tRuE';
      expect(hasOptedIn('DASH0_TEST_IS_SET')).to.be.true;
    });
  });

  describe('opt-out', () => {
    it('returns false if env var is not set', async () => {
      expect(hasOptedOut('DASH0_TEST_IS_NOT_SET')).to.be.false;
    });

    it('returns false if env var is not set to false', async () => {
      process.env.DASH0_TEST_IS_SET = 'whatever';
      expect(hasOptedOut('DASH0_TEST_IS_SET')).to.be.false;
    });

    it('returns true if env var is to false', async () => {
      process.env.DASH0_TEST_IS_SET = 'false';
      expect(hasOptedOut('DASH0_TEST_IS_SET')).to.be.true;
    });

    it('returns true if env var is to false (case-insensitive)', async () => {
      process.env.DASH0_TEST_IS_SET = 'fAlSe';
      expect(hasOptedOut('DASH0_TEST_IS_SET')).to.be.true;
    });
  });

  describe('numeric', () => {
    it('returns default if env var is not set', async () => {
      expect(parseNumericEnvironmentVariableWithDefault('DASH0_TEST_IS_NOT_SET', 123)).to.equal(123);
    });

    it('returns default if env var is set but cannot be parsed', async () => {
      process.env.DASH0_TEST_NOT_A_NUMBER = 'abc';
      expect(parseNumericEnvironmentVariableWithDefault('DASH0_TEST_NOT_A_NUMBER', 456)).to.equal(456);
    });

    it('returns parsed value if env var is set and can be parsed', async () => {
      process.env.DASH0_TEST_NUMERIC_ENV_VAR = '1302';
      expect(parseNumericEnvironmentVariableWithDefault('DASH0_TEST_NUMERIC_ENV_VAR', 789)).to.equal(1302);
    });
  });
});
