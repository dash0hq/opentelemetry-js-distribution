// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import semver from 'semver';

import { expectManualSpanInRequestTrace } from '../util/expectManualSpanInRequestTrace';
import { runNpmCommand } from '../util/runCommand';
import waitUntil from '../util/waitUntil';
import ChildProcessWrapper, { defaultAppConfiguration } from './ChildProcessWrapper';
import { collector } from './rootHooks';
import { skipWhenNodeJsVersionIsSmallerThan } from './constants';

const appPort = 1302;

// Installs the packed distribution as a dependency of an otherwise empty project, the way the Dash0 operator installs
// it. npm ignores the overrides in this repository's package.json there, so this checks the tree that users get.
describe('packaged distribution', () => {
  let tmpDir: string;
  let installedDistroPath: string;
  let appUnderTest: ChildProcessWrapper;

  before(async function () {
    if (semver.lt(process.version, skipWhenNodeJsVersionIsSmallerThan)) {
      this.skip();
      return;
    }
    // Packing builds the distribution, and npm takes minutes to install the bundled tree on CI runners.
    this.timeout(600000);

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dash0-packaged-distribution-'));
    await runNpmCommand(`pack --quiet --pack-destination ${tmpDir}`, '.');
    const tarball = (await fs.readdir(tmpDir)).find(file => file.endsWith('.tgz'));
    const consumerDir = path.join(tmpDir, 'consumer');
    await fs.mkdir(consumerDir);
    await fs.writeFile(path.join(consumerDir, 'package.json'), JSON.stringify({ private: true }));
    await runNpmCommand(`install --quiet --no-fund --no-audit ${path.join(tmpDir, tarball!)}`, consumerDir);
    installedDistroPath = path.join(consumerDir, 'node_modules', '@dash0', 'opentelemetry');

    await runNpmCommand('ci --quiet --no-fund --no-audit', 'test/apps/manual-instrumentation');
    const appConfiguration = defaultAppConfiguration(appPort);
    appConfiguration.path = 'test/apps/manual-instrumentation';
    appConfiguration.distroPath = installedDistroPath;
    appUnderTest = new ChildProcessWrapper(appConfiguration);
    await appUnderTest.start();
  });

  beforeEach(async () => {
    collector().clear();
  });

  after(async () => {
    if (appUnderTest) {
      await appUnderTest.stop();
    }
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should contain a single copy of @opentelemetry/api', async () => {
    const versions = await findPackageVersions(path.join(tmpDir, 'consumer'), '@opentelemetry/api');
    expect(versions).to.have.lengthOf(1, `found @opentelemetry/api versions ${versions.join(', ')}`);
  });

  it('should capture manual spans in the trace of the auto-instrumented request', async () => {
    await waitUntil(async () => {
      const response = await fetch(`http://localhost:${appPort}/ohai`);
      expect(response.status).to.equal(200);
      expectManualSpanInRequestTrace(await collector().fetchTraces());
    });
  });
});

/**
 * Returns the version of every installed copy of the given package below dir.
 */
async function findPackageVersions(dir: string, packageName: string): Promise<string[]> {
  const versions: string[] = [];
  const nodeModules = path.join(dir, 'node_modules');
  const candidate = path.join(nodeModules, packageName, 'package.json');
  try {
    versions.push(JSON.parse(await fs.readFile(candidate, 'utf8')).version);
  } catch {
    // not installed at this level
  }
  let entries: string[];
  try {
    entries = await fs.readdir(nodeModules);
  } catch {
    return versions;
  }
  for (const entry of entries) {
    const packageDirs = entry.startsWith('@')
      ? (await fs.readdir(path.join(nodeModules, entry))).map(name => path.join(nodeModules, entry, name))
      : [path.join(nodeModules, entry)];
    for (const packageDir of packageDirs) {
      versions.push(...(await findPackageVersions(packageDir, packageName)));
    }
  }
  return versions;
}
