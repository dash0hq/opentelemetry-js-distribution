// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind } from '@opentelemetry/api';
import { expect } from 'chai';
import { FileHandle, open, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import semver from 'semver';

import delay from '../util/delay';

import { expectResourceAttribute, expectSpanAttribute } from '../util/expectAttribute';
import { expectMatchingSpan, expectMatchingSpanInFileDump } from '../util/expectMatchingSpan';
import runCommand from '../util/runCommand';
import waitUntil from '../util/waitUntil';
import ChildProcessWrapper, { defaultAppConfiguration } from './ChildProcessWrapper';
import { collector } from './rootHooks';

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

  describe('print spans to file', () => {
    let appUnderTest: ChildProcessWrapper;
    const spanFilename = join(__dirname, 'spans.json');
    // const metricsFilename = join(__dirname, 'metrics.json');

    before(async () => {
      try {
        await unlink(spanFilename);
        // await unlink(metricsFilename);
      } catch {
        // expected outcome, files did not exist
      }

      const appConfiguration = defaultAppConfiguration(appPort);
      appConfiguration.env!.DASH0_DEBUG_PRINT_SPANS = spanFilename;
      // appConfiguration.env!.DASH0_DEBUG_PRINT_METRICS = metricsFilename;
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
      try {
        await unlink(spanFilename);
        // await unlink(metricsFilename);
      } catch (e) {
        // ignore
      }
    });

    it('should attach via --require and print spans to the configured file', async () => {
      // await waitUntil(async () => {
      //   const metricsFile = await verifyFileHasBeenCreated(metricsFilename);
      //   const metrics = JSON.parse(String(await metricsFile.readFile()));
      //   expect(metrics).to.not.be.empty;
      // });

      await waitUntil(async () => {
        await sendRequestAndVerifyResponse();
        const spanFile = await verifyFileHasBeenCreated(spanFilename);
        const spans = [];
        for await (const line of spanFile.readLines()) {
          try {
            spans.push(JSON.parse(line));
          } catch (error) {
            // ignore malformed lines
          }
        }

        expectMatchingSpanInFileDump(
          spans,
          [
            resourceAttributes => expect(resourceAttributes['telemetry.sdk.name']).to.equal('opentelemetry'),
            resourceAttributes => expect(resourceAttributes['telemetry.sdk.language']).to.equal('nodejs'),
            resourceAttributes => expect(resourceAttributes['telemetry.distro.name']).to.equal('dash0-nodejs'),
            resourceAttributes =>
              expect(resourceAttributes['telemetry.distro.version']).to.equal(expectedDistroVersion),
          ],
          [spanAttributes => expect(spanAttributes.kind).to.equal(SpanKind.SERVER)],
          [spanAttributes => expect(spanAttributes['http.route']).to.equal('/ohai')],
        );
      });
    });
  });

  describe('disable via DASH0_DISABLE', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      appConfiguration.env!.DASH0_DISABLE = 'true';
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should do nothing if disabled', async () => {
      await delay(1000);
      await sendRequestAndVerifyResponse();
      await delay(2000);

      if (await collector().hasTelemetry()) {
        fail('The collector received telemetry data although it should not have received anything.');
      }
    });
  });

  async function waitForTelemetry() {
    await sendRequestAndVerifyResponse();
    if (!(await collector().hasTraces())) {
      throw new Error('The collector never received any spans.');
    }
    return await collector().fetchTelemetry();
  }

  async function sendRequestAndVerifyResponse() {
    const response = await fetch(`http://localhost:${appPort}/ohai`);
    expect(response.status).to.equal(200);
    const responsePayload = await response.json();
    expect(responsePayload).to.deep.equal({ message: 'We make Observability easy for every developer.' });
  }

  async function verifyFileHasBeenCreated(filename: string): Promise<FileHandle> {
    let file;
    try {
      file = await open(filename);
    } catch (e: any) {
      if (e.code && e.code === 'ENOENT') {
        fail(`The Dash0 Node.js distribution in the application under test did not create the file ${filename}.`);
      }
      throw e;
    }
    return file;
  }
});
