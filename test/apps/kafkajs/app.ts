// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { inspect } from 'node:util';
import * as kafkajs from 'kafkajs';
import {
  Consumer,
  ConsumerRunConfig,
  EachMessagePayload,
  Kafka,
  KafkaJSError,
  KafkaMessage,
  Producer,
  RecordMetadata,
} from 'kafkajs';
import { IpcRequest } from '../../util/ipc';
import sendToParentProcess, { sendReadyToParentProcess } from '../../util/sendToParentProcess';

// for testing purposes, we need a reference to the kafakjs instrumentation
import { kafkaJsInstrumentation } from '../../../src/util/kafkajs';

const kafka = new Kafka({
  clientId: 'dash0-kafkajs-tests',
  brokers: ['dummy:1302'],
});

let producer: Producer;
let consumer: Consumer;
let runConfig: ConsumerRunConfig | undefined;

process.on('message', async message => {
  const ipcRequest = <IpcRequest>message;
  const command = ipcRequest.command;
  const id = ipcRequest.id;
  switch (command) {
    case 'produce-message':
      await produceMessage(id);
      break;
    case 'consume-message':
      await consumeMessage(id);
      break;
    default:
      const errorMsg = `Unknown message: ${inspect(message)}`;
      sendToParentProcess({ id, error: errorMsg });
      console.error(errorMsg);
  }
});

(function initKafka() {
  producer = kafka.producer();

  getRunConfig();

  // Since we patch the consumer, we need to disable/enable the instrumentation to make sure it the instrumentation is
  // still applied, see
  // https://github.com/open-telemetry/opentelemetry-js-contrib/blob/2c32e5869ef9b6d582ba4da02623a030309bcaf3/plugins/node/instrumentation-kafkajs/test/kafkajs.test.ts#L142-L143.
  kafkaJsInstrumentation.disable();
  kafkaJsInstrumentation.enable();

  consumer = kafka.consumer({
    groupId: 'testing-group-id',
  });

  sendReadyToParentProcess();
})();

function getRunConfig() {
  const origConsumerFactory = kafkajs.Kafka.prototype.consumer;
  kafkajs.Kafka.prototype.consumer = function (...args): Consumer {
    const consumer: Consumer = origConsumerFactory.apply(this, args);
    consumer.run = function (config?: ConsumerRunConfig): Promise<void> {
      runConfig = config;
      return Promise.resolve();
    };
    return consumer;
  };
}

async function produceMessage(id: number) {
  try {
    const res: RecordMetadata[] = await producer.send({
      topic: 'test-topic',
      messages: [
        {
          value: 'testing message content',
        },
      ],
    });
    sendToParentProcess({ id, ok: true, res });
  } catch (err) {
    if (err instanceof KafkaJSError && err.message === 'The producer is disconnected') {
      // This is expected, since we are not starting an actual Kafka broker for the integration tests, hence we are
      // also not connected to any broker.
      sendToParentProcess({ id, ok: true });
    } else {
      sendToParentProcess({ id, error: err });
    }
  }
}

async function consumeMessage(id: number) {
  consumer.run({
    eachMessage: async (): Promise<void> => {},
  });
  const payload = createPayload();
  await runConfig?.eachMessage!(payload);
  sendToParentProcess({ id, ok: true });
}

function createPayload(): EachMessagePayload {
  return {
    topic: 'test-topic',
    partition: 0,
    message: createMessage('456'),
    heartbeat: async () => {},
    pause: () => () => {},
  };
}

function createMessage(offset: string): KafkaMessage {
  return {
    key: Buffer.from('message-key', 'utf8'),
    value: Buffer.from('message content', 'utf8'),
    timestamp: '1234',
    size: 10,
    attributes: 1,
    offset: offset,
  };
}
