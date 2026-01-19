// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind } from '@opentelemetry/api';
import { expect } from 'chai';
import semver from 'semver';

import { expectResourceAttribute, expectSpanAttribute } from '../util/expectAttribute';
import { expectMatchingSpan } from '../util/expectMatchingSpan';
import { runNpmCommand } from '../util/runCommand';
import waitUntil from '../util/waitUntil';
import ChildProcessWrapper, { defaultAppConfiguration } from './ChildProcessWrapper';
import { collector } from './rootHooks';
import { skipWhenNodeJsVersionIsSmallerThan } from './constants';

const appConfiguration = defaultAppConfiguration(0);
delete appConfiguration.env!.PORT;
appConfiguration.env!.KAFKAJS_NO_PARTITIONER_WARNING = '1';
appConfiguration.path = 'test/apps/kafkajs';

describe('kafka tracing', () => {
  let appUnderTest: ChildProcessWrapper;

  before(async function () {
    if (semver.lt(process.version, skipWhenNodeJsVersionIsSmallerThan)) {
      this.skip();
      return;
    }

    await runNpmCommand('ci --quiet --no-fund --no-audit', 'test/apps/kafkajs');

    appUnderTest = new ChildProcessWrapper(appConfiguration);
    await appUnderTest.start();
  });

  beforeEach(async function () {
    collector().clear();
  });

  after(async () => {
    if (appUnderTest) {
      await appUnderTest.stop();
    }
  });

  it('should capture producer spans', async () => {
    await waitUntil(async () => {
      const traces = await produceMessageAndFetchTraceData();
      expectMatchingSpan(
        traces,
        [
          resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
          resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
          resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
        ],
        [
          span => expect(span.kind).to.equal(SpanKind.PRODUCER, 'span kind should be producer'),
          span => expectSpanAttribute(span, 'messaging.system', 'kafka'),
          span => expectSpanAttribute(span, ['messaging.destination', 'messaging.destination.name'], 'test-topic'),
        ],
      );
    });
  });

  it('should capture consumer spans', async () => {
    await waitUntil(async () => {
      const traces = await consumeMessageAndFetchTraceData();
      expectMatchingSpan(
        traces,
        [
          resource => expectResourceAttribute(resource, 'telemetry.sdk.name', 'opentelemetry'),
          resource => expectResourceAttribute(resource, 'telemetry.sdk.language', 'nodejs'),
          resource => expectResourceAttribute(resource, 'telemetry.distro.name', 'dash0-nodejs'),
        ],
        [
          span => expect(span.kind).to.equal(SpanKind.CONSUMER, 'span kind should be consumer'),
          span => expectSpanAttribute(span, 'messaging.system', 'kafka'),
          span => expectSpanAttribute(span, ['messaging.destination', 'messaging.destination.name'], 'test-topic'),
        ],
      );
    });
  });

  async function produceMessageAndFetchTraceData() {
    await produceMessage();
    return collector().fetchTraces();
  }

  async function produceMessage() {
    await appUnderTest.sendIpcRequest({ command: 'produce-message' });
  }

  async function consumeMessageAndFetchTraceData() {
    await consumeMessage();
    return collector().fetchTraces();
  }

  async function consumeMessage() {
    await appUnderTest.sendIpcRequest({ command: 'consume-message' });
  }
});
