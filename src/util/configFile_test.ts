// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';

import { defaultConfigFile, resolveConfigFile, unsupportedConfigFileOutcome, withConfigFileInEnv } from './configFile';

describe('configuration file', () => {
  const defaultFileExists = (path: string) => path === defaultConfigFile;
  const noFileExists = () => false;

  describe('resolveConfigFile', () => {
    it('uses OTEL_CONFIG_FILE when it is set', () => {
      const env = { OTEL_CONFIG_FILE: '/app/otel.yaml' };
      expect(resolveConfigFile(env, defaultFileExists)).to.deep.equal({ path: '/app/otel.yaml', explicit: true });
    });

    it('uses OTEL_CONFIG_FILE when it is set, even if that file does not exist', () => {
      const env = { OTEL_CONFIG_FILE: '/app/does-not-exist.yaml' };
      expect(resolveConfigFile(env, noFileExists)).to.deep.equal({
        path: '/app/does-not-exist.yaml',
        explicit: true,
      });
    });

    it('trims OTEL_CONFIG_FILE', () => {
      const env = { OTEL_CONFIG_FILE: '  /app/otel.yaml ' };
      expect(resolveConfigFile(env, noFileExists)).to.deep.equal({ path: '/app/otel.yaml', explicit: true });
    });

    it('uses the default file when OTEL_CONFIG_FILE is unset and the default file exists', () => {
      expect(resolveConfigFile({}, defaultFileExists)).to.deep.equal({ path: defaultConfigFile, explicit: false });
    });

    it('uses the default file when OTEL_CONFIG_FILE is blank and the default file exists', () => {
      const env = { OTEL_CONFIG_FILE: ' ' };
      expect(resolveConfigFile(env, defaultFileExists)).to.deep.equal({ path: defaultConfigFile, explicit: false });
    });

    it('returns undefined when OTEL_CONFIG_FILE is unset and the default file does not exist', () => {
      expect(resolveConfigFile({}, noFileExists)).to.be.undefined;
    });
  });

  describe('withConfigFileInEnv', () => {
    it('sets OTEL_CONFIG_FILE to the default file only while fn runs', () => {
      const env: NodeJS.ProcessEnv = {};
      const seen = withConfigFileInEnv({ path: defaultConfigFile, explicit: false }, () => env.OTEL_CONFIG_FILE, env);
      expect(seen).to.equal(defaultConfigFile);
      expect(env).to.not.have.property('OTEL_CONFIG_FILE');
    });

    it('restores a blank OTEL_CONFIG_FILE', () => {
      const env: NodeJS.ProcessEnv = { OTEL_CONFIG_FILE: '' };
      withConfigFileInEnv({ path: defaultConfigFile, explicit: false }, () => undefined, env);
      expect(env.OTEL_CONFIG_FILE).to.equal('');
    });

    it('restores OTEL_CONFIG_FILE when fn throws', () => {
      const env: NodeJS.ProcessEnv = {};
      expect(() =>
        withConfigFileInEnv(
          { path: defaultConfigFile, explicit: false },
          () => {
            throw new Error('boom');
          },
          env,
        ),
      ).to.throw('boom');
      expect(env).to.not.have.property('OTEL_CONFIG_FILE');
    });

    it('leaves an explicit OTEL_CONFIG_FILE untouched', () => {
      const env: NodeJS.ProcessEnv = { OTEL_CONFIG_FILE: '/app/otel.yaml' };
      const seen = withConfigFileInEnv({ path: '/app/otel.yaml', explicit: true }, () => env.OTEL_CONFIG_FILE, env);
      expect(seen).to.equal('/app/otel.yaml');
      expect(env.OTEL_CONFIG_FILE).to.equal('/app/otel.yaml');
    });
  });

  describe('unsupportedConfigFileOutcome', () => {
    const explicitFile = { path: '/app/otel.yaml', explicit: true };
    const defaultFile = { path: defaultConfigFile, explicit: false };

    it('warns and falls back when OTEL_CONFIG_FILE is set and DASH0_OTEL_COLLECTOR_BASE_URL is set', () => {
      const outcome = unsupportedConfigFileOutcome(explicitFile, true, 'v18.18.2');
      expect(outcome?.prohibitive).to.be.false;
      expect(outcome?.message).to.include('OTEL_CONFIG_FILE is set, but configuration files are not supported');
      expect(outcome?.message).to.include('v18.18.2');
    });

    it('refuses to start when OTEL_CONFIG_FILE is set and DASH0_OTEL_COLLECTOR_BASE_URL is not set', () => {
      const outcome = unsupportedConfigFileOutcome(explicitFile, false, 'v18.18.2');
      expect(outcome?.prohibitive).to.be.true;
      expect(outcome?.message).to.include('OTEL_CONFIG_FILE is set');
      expect(outcome?.message).to.include('DASH0_OTEL_COLLECTOR_BASE_URL is not set.');
    });

    it('stays quiet when only the default file exists and DASH0_OTEL_COLLECTOR_BASE_URL is set', () => {
      expect(unsupportedConfigFileOutcome(defaultFile, true, 'v18.18.2')).to.be.undefined;
    });

    it('refuses to start when only the default file exists and DASH0_OTEL_COLLECTOR_BASE_URL is not set', () => {
      const outcome = unsupportedConfigFileOutcome(defaultFile, false, 'v18.18.2');
      expect(outcome?.prohibitive).to.be.true;
      expect(outcome?.message).to.include(`${defaultConfigFile} exists`);
      expect(outcome?.message).to.include('DASH0_OTEL_COLLECTOR_BASE_URL is not set.');
    });
  });
});
