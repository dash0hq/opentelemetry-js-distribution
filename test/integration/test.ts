// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind } from '@opentelemetry/api';
import { expect } from 'chai';
import { readFile } from 'node:fs/promises';
import semver from 'semver';

import { expectResourceAttribute, expectSpanAttribute } from '../util/expectAttribute';
import { expectMatchingSpan } from '../util/expectMatchingSpan';
import runCommand from '../util/runCommand';
import waitUntil from '../util/waitUntil';
import ChildProcessWrapper, { defaultAppConfiguration } from './ChildProcessWrapper';
import { collector } from './rootHooks';
import delay from '../util/delay';

const skipWhenNodeJsVersionIsSmallerThan = '18.0.0';

const { fail } = expect;

const appPort = 1302;
let expectedDistroVersion: number;

describe('attach', () => {
  before(async function () {
    if (semver.lt(process.version, skipWhenNodeJsVersionIsSmallerThan)) {
      this.skip();
      return;
    }

    await runCommand('npm ci', 'test/apps/express-typescript');
    expectedDistroVersion = JSON.parse(String(await readFile('package.json'))).version;
  });

  describe('tracing', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should attach via --require and capture spans', async () => {
      await waitUntil(async () => {
        const telemetry = await waitForTelemetry();
        expectMatchingSpan(
          telemetry.traces,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [
            span => expect(span.kind).to.equal(SpanKind.SERVER),
            span => expectSpanAttribute(span, 'http.route', '/ohai'),
          ],
        );
      });
    });
  });

  describe('pod uid detection', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      appConfiguration.emulateKubernetesPodUid = true;
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should attach via --require and detect the pod uid', async () => {
      await waitUntil(async () => {
        const telemetry = await waitForTelemetry();
        expectMatchingSpan(
          telemetry.traces,
          [resource => expectResourceAttribute(resource, 'k8s.pod.uid', 'f57400dc-94ce-4806-a52e-d2726f448f15')],
          [
            span => expect(span.kind).to.equal(SpanKind.SERVER),
            span => expectSpanAttribute(span, 'http.route', '/ohai'),
          ],
        );
      });
    });
  });

  describe('service name fallback', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should attach via --require and derive a service name from the package.json file', async () => {
      await waitUntil(async () => {
        const telemetry = await waitForTelemetry();
        expectMatchingSpan(
          telemetry.traces,
          [
            resource =>
              expectResourceAttribute(resource, 'service.name', 'dash0-app-under-test-express-typescript@1.0.0'),
          ],
          [
            span => expect(span.kind).to.equal(SpanKind.SERVER),
            span => expectSpanAttribute(span, 'http.route', '/ohai'),
          ],
        );
      });
    });
  });

  describe('disable via DASH0_DISABLE', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      if (!appConfiguration.env) {
        appConfiguration.env = {};
      }
      appConfiguration.env.DASH0_DISABLE = 'true';
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should do nothing if disabled', async () => {
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

  async function waitForTelemetry() {
    const response = await fetch(`http://localhost:${appPort}/ohai`);
    expect(response.status).to.equal(200);
    const responsePayload = await response.json();
    expect(responsePayload).to.deep.equal({ message: 'We make Observability easy for every developer.' });

    if (!(await collector().hasTraces())) {
      throw new Error('The collector never received any spans.');
    }
    return await collector().fetchTelemetry();
  }
});
