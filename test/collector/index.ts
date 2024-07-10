// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { inspect } from 'node:util';

import { IpcRequest } from '../util/ipc';
import sendToParentProcess, { sendReadyToParentProcess } from '../util/sendToParentProcess';
import GrpcServer from './GrpcServer';
import HttpServer from './HttpServer';
import Sink from './Sink';

// listen on the IPv6 local loopback
const bindAddress = '::1';
const sink = new Sink();
const httpServer = new HttpServer(bindAddress, sink);
const grpcServer = new GrpcServer(`[${bindAddress}]`, sink);

async function main() {
  await Promise.all([httpServer.start(), grpcServer.start()]);
  console.log('The Dash0 OpenTelemetry mock collector is ready.');
  registerIpcMessageListener();
  sendReadyToParentProcess();
}

function registerIpcMessageListener() {
  process.on('message', message => {
    const ipcRequest = <IpcRequest>message;
    const command = ipcRequest.command;
    const id = ipcRequest.id;
    switch (command) {
      case 'stats':
        sendToParentProcess({ id, ok: true, ...sink.stats() });
        break;
      case 'telemetry':
        sendToParentProcess({ id, ok: true, ...sink.getTelemetry() });
        break;
      case 'clear':
        sink.clear();
        sendToParentProcess({ id, ok: true });
        break;
      default:
        const errorMsg = `Unknown message: ${inspect(message)}`;
        sendToParentProcess({ id, error: errorMsg });
        console.error(errorMsg);
    }
  });
}

main();
