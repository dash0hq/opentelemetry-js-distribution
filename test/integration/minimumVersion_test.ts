// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import semver from 'semver';
import delay from '../util/delay';

import runCommand from '../util/runCommand';
import ChildProcessWrapper, { defaultAppConfiguration } from './ChildProcessWrapper';
import { collector } from './rootHooks';

const { fail } = expect;

const appPort = 1302;

// This test verifies that the distribution does not attempt to initialize itself if the Node.js runtime version is too
// old.
const skipWhenNodeJsVersionIsGreaterOrEquals = '18.0.0';

describe('minimum version check', () => {
  let appUnderTest: ChildProcessWrapper;

  before(async function () {
    if (semver.gte(process.version, skipWhenNodeJsVersionIsGreaterOrEquals)) {
      // This suite is deliberatly skipped on supported versions and only run on a Node.js version that is below the
      // minimum supported version.
      this.skip();
      return;
    }

    await runCommand('npm ci', 'test/apps/express-typescript');
    const appConfiguration = defaultAppConfiguration(appPort);
    appUnderTest = new ChildProcessWrapper(appConfiguration);
    await appUnderTest.start();
  });

  after(async () => {
    if (appUnderTest) {
      await appUnderTest.stop();
    }
  });

  it('should stand down without loading the distribution', async () => {
    await delay(1000);
    const response = await fetch(`http://localhost:${appPort}/ohai`);
    await delay(2000);
    expect(response.status).to.equal(200);
    const responsePayload = await response.json();
    expect(responsePayload).to.deep.equal({ message: 'We make Observability easy for every developer.' });

    if (await collector().hasTelemetry()) {
      fail('The collector received telemetry data although it should not have received anything.');
    }
  });
});
