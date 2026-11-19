// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ignoresRegisteredApi, resolveApiVersion } from './apiVersion';

describe('@opentelemetry/api version', () => {
  describe('ignoresRegisteredApi', () => {
    it('should accept a registration with the same version', () => {
      expect(ignoresRegisteredApi('1.10.0', '1.10.0')).to.be.false;
    });

    it('should accept a registration with a newer minor version', () => {
      expect(ignoresRegisteredApi('1.9.0', '1.10.0')).to.be.false;
    });

    it('should accept a registration with an older patch version', () => {
      expect(ignoresRegisteredApi('1.10.2', '1.10.0')).to.be.false;
    });

    it('should ignore a registration with an older minor version', () => {
      expect(ignoresRegisteredApi('1.11.0', '1.10.0')).to.be.true;
    });

    it('should ignore a registration with a different major version', () => {
      expect(ignoresRegisteredApi('2.0.0', '1.10.0')).to.be.true;
    });

    it('should not report invalid versions', () => {
      expect(ignoresRegisteredApi('not-a-version', '1.10.0')).to.be.false;
    });
  });

  describe('resolveApiVersion', () => {
    let tmpDir: string;

    before(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dash0-api-version-'));
      const apiDir = path.join(tmpDir, 'app', 'node_modules', '@opentelemetry', 'api');
      await fs.mkdir(path.join(apiDir, 'dist'), { recursive: true });
      await fs.writeFile(
        path.join(apiDir, 'package.json'),
        JSON.stringify({
          name: '@opentelemetry/api',
          version: '1.11.0',
          main: './dist/index.cjs',
          exports: { '.': './dist/index.cjs' },
        }),
      );
      await fs.writeFile(path.join(apiDir, 'dist', 'index.cjs'), '');
      await fs.mkdir(path.join(tmpDir, 'no-api'));
    });

    after(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should read the version of the copy that resolves from the application', () => {
      expect(resolveApiVersion([path.join(tmpDir, 'app', 'index.js')])).to.equal('1.11.0');
    });

    it('should try the next location when the first one does not resolve', () => {
      expect(resolveApiVersion([path.join(tmpDir, 'no-api'), path.join(tmpDir, 'app')])).to.equal('1.11.0');
    });

    it('should return undefined when no copy resolves', () => {
      expect(resolveApiVersion([path.join(tmpDir, 'no-api')])).to.be.undefined;
    });
  });
});
