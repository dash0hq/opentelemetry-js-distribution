// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind } from '@opentelemetry/api';
import { expect } from 'chai';
import { readFile } from 'node:fs/promises';
import { expectResourceAttribute, expectSpanAttribute } from '../util/expectAttribute';
import { expectMatchingSpan } from '../util/expectMatchingSpan';
import runCommand from '../util/runCommand';
import waitUntil from '../util/waitUntil';
import ChildProcessWrapper, { ChildProcessWrapperOptions } from './ChildProcessWrapper';
import { collector } from './rootHooks';

const appPort = 1302;
let expectedDistroVersion: number;

describe('attach', () => {
  before(async () => {
    await runCommand('npm ci', 'test/apps/express-typescript');
    expectedDistroVersion = JSON.parse(String(await readFile('package.json'))).version;
  });

  describe('tracing', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration();
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should attach via --require and collect capture spans', async () => {
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
      const appConfiguration = defaultAppConfiguration();
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

  function defaultAppConfiguration(): ChildProcessWrapperOptions {
    return {
      path: 'test/apps/express-typescript',
      label: 'app',
      useTsNode: true,
      useDistro: true,
      env: {
        PORT: appPort.toString(),
        // have the Node.js SDK send spans every 100 ms instead of every 5 seconcds to speed up tests
        OTEL_BSP_SCHEDULE_DELAY: '100',
        DASH0_OTEL_COLLECTOR_BASE_URL: 'http://localhost:4318',
        // OTEL_LOG_LEVEL: 'VERBOSE',
      },
    };
  }

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
