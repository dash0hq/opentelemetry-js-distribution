// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { ChildProcess, fork, ForkOptions } from 'node:child_process';
import EventEmitter from 'node:events';
import waitUntil, { RetryOptions } from '../util/waitUntil';

export interface ChildProcessWrapperOptions {
  path: string;
  label?: string;
  useTsNode?: boolean;
  useDistro?: boolean;
  emulateKubernetesPodUid?: boolean;
  args?: string[];
  env?: { [key: string]: string };
  waitForReadyRetryOptions?: RetryOptions;
}

export default class ChildProcessWrapper {
  private childProcess?: ChildProcess;
  private ready: boolean;
  private options: ChildProcessWrapperOptions;
  private nextIpcRequestId: number;
  private responseEmitter: ResponseEmitter;

  constructor(options: ChildProcessWrapperOptions) {
    this.options = options;
    if (!this.options.label) {
      this.options.label = this.options.path;
    }
    this.ready = false;
    this.nextIpcRequestId = 0;
    this.responseEmitter = new ResponseEmitter();
  }

  async start() {
    const forkOptions = this.createForkOptions();
    this.childProcess = fork(this.options.path, this.options.args ?? [], forkOptions);
    this.listenToIpcMessages();
    this.echoOutputStreams();
    await this.waitUntilReady();
  }

  private createForkOptions() {
    const forkOptions: ForkOptions = {
      stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
    };
    if (this.options.useTsNode) {
      this.addExecArgvs(forkOptions, '--require', 'ts-node/register');
    }
    if (this.options.emulateKubernetesPodUid) {
      this.addExecArgvs(forkOptions, '--require', './test/integration/emulateKubernetes');
    }
    if (this.options.useDistro) {
      this.addExecArgvs(forkOptions, '--require', './src');
    }
    if (this.options.env) {
      forkOptions.env = this.options.env;
    }
    return forkOptions;
  }

  private addExecArgvs(forkOptions: ForkOptions, ...execArgvs: string[]) {
    if (forkOptions.execArgv) {
      forkOptions.execArgv = forkOptions.execArgv.concat(execArgvs);
    } else {
      forkOptions.execArgv = execArgvs;
    }
  }

  private listenToIpcMessages() {
    this.childProcess?.on('message', message => {
      if (typeof message === 'string' && message === 'ready') {
        this.ready = true;
      } else if (typeof message === 'object') {
        this.processIpcResponse(message);
      } else {
        console.error('Unexpected message from child process:', message);
      }
    });
  }

  private echoOutputStreams() {
    this.childProcess?.stdout?.on('data', data => {
      console.log(`${this.options.label}(${this.childProcess?.pid}):\t${data}`);
    });
    this.childProcess?.stderr?.on('data', data => {
      console.error(`${this.options.label}(${this.childProcess?.pid}):\t${data}`);
    });
  }

  async waitUntilReady() {
    await waitUntil(() => {
      if (!this.ready) {
        throw new Error('Child process has not started.');
      }
    }, this.options.waitForReadyRetryOptions);
  }

  async stop(): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    return new Promise(resolve => {
      if (this.childProcess) {
        this.childProcess.once('exit', () => {
          this.childProcess = undefined;
          resolve();
        });
        this.childProcess.kill();
      }
    });
  }

  async sendRequest(message: object): Promise<object> {
    return new Promise(resolve => {
      const requestId = this.nextIpcRequestId++;
      this.childProcess?.send({
        id: requestId,
        ...message,
      });
      const eventName = String(requestId);
      this.responseEmitter.once(eventName, response => {
        resolve(response);
      });
    });
  }

  private processIpcResponse(message: any) {
    if (message.id == null) {
      console.error('Unexpected IPC message from child process:', message);
      return;
    }
    this.responseEmitter.emit(message.id, message);
  }
}

class ResponseEmitter extends EventEmitter {}
