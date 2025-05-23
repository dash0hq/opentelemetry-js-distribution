// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind } from '@opentelemetry/api';
import { expect } from 'chai';
import { FileHandle, open, readFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import semver from 'semver';

import { SeverityNumber } from '../collector/types/opentelemetry/proto/logs/v1/logs';
import delay from '../util/delay';
import {
  expectLogRecordAttribute,
  expectMetricDataPointAttribute,
  expectResourceAttribute,
  expectSpanAttribute,
} from '../util/expectAttribute';
import { expectMatchingLogRecord } from '../util/expectMatchingLogRecord';
import { expectMatchingMetric } from '../util/expectMatchingMetric';
import { expectMatchingSpan, expectMatchingSpanInFileDump } from '../util/expectMatchingSpan';
import { runNpmCommand } from '../util/runCommand';
import waitUntil from '../util/waitUntil';
import ChildProcessWrapper, { defaultAppConfiguration } from './ChildProcessWrapper';
import { collector } from './rootHooks';
import { skipWhenNodeJsVersionIsSmallerThan } from './constants';

const { fail } = expect;

const appPort = 1302;
let expectedDistroVersion: number;

describe('attach', () => {
  before(async function () {
    if (semver.lt(process.version, skipWhenNodeJsVersionIsSmallerThan)) {
      this.skip();
      return;
    }

    await runNpmCommand('ci', 'test/apps/express-typescript');
    expectedDistroVersion = JSON.parse(String(await readFile('package.json'))).version;
  });

  beforeEach(async function () {
    collector().clear();
  });

  describe('basic signals', () => {
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
        const traces = await sendHttpRequestAndFetchTraceData();
        expectMatchingSpan(
          traces,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [
            span => expect(span.kind).to.equal(SpanKind.SERVER, 'span kind should be server'),
            span => expectSpanAttribute(span, 'http.route', '/ohai'),
          ],
        );
      });
    });

    it('should attach via --require and capture metrics', async () => {
      await waitUntil(async () => {
        const metrics = await sendHttpRequestAndFetchMetrics();
        expectMatchingMetric(
          metrics,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [
            metric => expect(metric.name).to.equal('http.server.duration'),
            metric => {
              const dataPoints = metric.histogram?.data_points;
              expect(dataPoints).to.exist;
              expect(dataPoints).to.not.be.empty;
              dataPoints?.forEach(dataPoint => {
                expectMetricDataPointAttribute(dataPoint, 'http.method', 'GET');
                expectMetricDataPointAttribute(dataPoint, 'http.route', '/ohai');
              });
            },
          ],
        );
      });
    });

    it('should attach via --require and capture logs', async () => {
      await waitUntil(async () => {
        const logs = await sendHttpRequestAndFetchLogRecords();
        expectMatchingLogRecord(
          logs,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [
            logRecord => expect(logRecord.body).to.deep.equal({ string_value: 'log body' }),
            logRecord =>
              expect(logRecord.severity_number).to.equal(
                SeverityNumber.SEVERITY_NUMBER_INFO,
                'severity number should be info',
              ),
            logRecord => expect(logRecord.severity_text).to.equal('INFO'),
            logRecord => expectLogRecordAttribute(logRecord, 'log.type', 'LogRecord'),
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
        const traces = await sendHttpRequestAndFetchTraceData();
        expectMatchingSpan(
          traces,
          [resource => expectResourceAttribute(resource, 'k8s.pod.uid', 'f57400dc-94ce-4806-a52e-d2726f448f15')],
          [
            span => expect(span.kind).to.equal(SpanKind.SERVER, 'span kind should be server'),
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
        const traces = await sendHttpRequestAndFetchTraceData();
        expectMatchingSpan(
          traces,
          [
            resource => expectResourceAttribute(resource, 'service.name', 'dash0-app-under-test-express-typescript'),
            resource => expectResourceAttribute(resource, 'service.version', '1.0.0'),
          ],
          [
            span => expect(span.kind).to.equal(SpanKind.SERVER, 'span kind should be server'),
            span => expectSpanAttribute(span, 'http.route', '/ohai'),
          ],
        );
      });
    });
  });

  describe('bootstrap span', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      appConfiguration.env!.DASH0_BOOTSTRAP_SPAN = 'Dash0 Test Bootstrap Span';
      appUnderTest = new ChildProcessWrapper(appConfiguration);
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should create an internal span on bootstrap', async () => {
      // It is important for this test that we do not start the app in the before hook, since the beforeEach from the
      // top level suite clears the mock collector's spans, thus we would accidentally delete the bootstrap span
      // (because the top level beforeHook is executed after this suite's before hook).
      await appUnderTest.start();
      await waitUntil(async () => {
        const traces = await collector().fetchTraces();
        expectMatchingSpan(
          traces,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [span => expect(span.name).to.equal('Dash0 Test Bootstrap Span')],
        );
      });
    });
  });

  describe('flush on exit via signal', () => {
    let appUnderTest: ChildProcessWrapper;

    beforeEach(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      appConfiguration.env!.DASH0_BOOTSTRAP_SPAN = 'Dash0 Test Bootstrap Span';
      appConfiguration.env!.DASH0_FLUSH_ON_SIGTERM_SIGINT = 'true';

      // Reset interval for sending spans back to the default of 5 seconds instead of using the 100 ms the other test
      // cases use. This gives this test case a chance to fail without the flush-on-exit mechanism.
      appConfiguration.env!.OTEL_BSP_SCHEDULE_DELAY = '300000';
      appUnderTest = new ChildProcessWrapper(appConfiguration);
    });

    afterEach(async () => {
      await appUnderTest.stop();
    });

    it('should flush telemetry before process exit due to SIGTERM', async () => {
      await appUnderTest.start();
      await appUnderTest.stop();
      await waitUntil(async () => {
        const traces = await collector().fetchTraces();
        expectMatchingSpan(
          traces,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [span => expect(span.name).to.equal('Dash0 Test Bootstrap Span')],
        );
      });
    });

    it('should flush telemetry before process exit due to SIGINT', async () => {
      await appUnderTest.start();
      await appUnderTest.stop('SIGINT');
      await waitUntil(async () => {
        const traces = await collector().fetchTraces();
        expectMatchingSpan(
          traces,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [span => expect(span.name).to.equal('Dash0 Test Bootstrap Span')],
        );
      });
    });
  });

  describe('flush on normal process exit (empty event loop)', () => {
    let appUnderTest: ChildProcessWrapper;

    beforeEach(async () => {
      const appConfiguration = {
        path: 'test/apps/empty-event-loop',
        label: 'app',
        useTsNode: true,
        useDistro: true,
        env: {
          ...process.env,
          DASH0_OTEL_COLLECTOR_BASE_URL: 'http://localhost:4318',
          DASH0_BOOTSTRAP_SPAN: 'Dash0 Test Bootstrap Span',
        },
      };
      appUnderTest = new ChildProcessWrapper(appConfiguration);
    });

    it('should flush telemetry before process exit due to empty event loop', async () => {
      await appUnderTest.start();
      await waitUntil(async () => {
        const traces = await collector().fetchTraces();
        expectMatchingSpan(
          traces,
          [
            resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
            resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
            resource => expectResourceAttribute(resource, 'telemetry.distro.version', expectedDistroVersion),
          ],
          [span => expect(span.name).to.equal('Dash0 Test Bootstrap Span')],
        );
      });
    });
  });

  describe('timeout for flushing telemetry', () => {
    let appUnderTest: ChildProcessWrapper;

    beforeEach(async () => {
      const appConfiguration = {
        path: 'test/apps/empty-event-loop',
        label: 'app',
        useTsNode: true,
        useDistro: true,
        env: {
          ...process.env,
          // Weird finding: When setting DASH0_OTEL_COLLECTOR_BASE_URL to any url where the host name ends in .local
          // (like http://non-reachable-dns-name.local:4318), the timeout of 500 ms for flushing telemetry is ignored
          // because the DNS lookup blocks for 5 seconds. This apparently happens on Mac as well as on Linux/in Docker.
          DASH0_OTEL_COLLECTOR_BASE_URL: 'http://non-reachable-host.url:4318',
          DASH0_BOOTSTRAP_SPAN: 'Dash0 Test Bootstrap Span',
        },
      };
      appUnderTest = new ChildProcessWrapper(appConfiguration);
    });

    it('should let process terminate after timeout', async () => {
      await appUnderTest.start();
      const startedAt = Date.now();
      await appUnderTest.waitUntilTerminated();
      const terminatedAt = Date.now();
      expect(terminatedAt - startedAt).to.be.lessThan(1000);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        await sendHttpRequestAndVerifyResponse();
        const spanFile = await verifyFileHasBeenCreated(spanFilename);
        const content = await spanFile.readFile({ encoding: 'utf8' });
        const spans = [];
        const lines = content.split(os.EOL);
        for (const line of lines) {
          try {
            spans.push(JSON.parse(line));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          [spanAttributes => expect(spanAttributes.kind).to.equal(SpanKind.SERVER, 'span kind should be server')],
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
      await sendHttpRequestAndVerifyResponse();
      await delay(2000);

      if (await collector().hasTelemetry()) {
        fail('The collector received telemetry data although it should not have received anything.');
      }
    });
  });

  describe('disable when export endpoint is not set', () => {
    let appUnderTest: ChildProcessWrapper;

    before(async () => {
      const appConfiguration = defaultAppConfiguration(appPort);
      delete appConfiguration.env!.DASH0_OTEL_COLLECTOR_BASE_URL;
      appUnderTest = new ChildProcessWrapper(appConfiguration);
      await appUnderTest.start();
    });

    after(async () => {
      await appUnderTest.stop();
    });

    it('should do nothing if DASH0_OTEL_COLLECTOR_BASE_URL is not set', async () => {
      await delay(1000);
      await sendHttpRequestAndVerifyResponse();
      await delay(2000);

      if (await collector().hasTelemetry()) {
        fail('The collector received telemetry data although it should not have received anything.');
      }
    });
  });

  async function sendHttpRequestAndFetchTraceData() {
    await sendHttpRequestAndVerifyResponse();
    return collector().fetchTraces();
  }

  async function sendHttpRequestAndFetchMetrics() {
    await sendHttpRequestAndVerifyResponse();
    return collector().fetchMetrics();
  }

  async function sendHttpRequestAndFetchLogRecords() {
    await sendHttpRequestAndVerifyResponse();
    return collector().fetchLogRecords();
  }

  async function sendHttpRequestAndVerifyResponse() {
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
