// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { inspect } from 'node:util';
import { ChildProcess, fork, ForkOptions } from 'node:child_process';
import EventEmitter from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';

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

const repoRoot = path.join(__dirname, '..', '..');
const distroPath = path.join(repoRoot, 'src');
const emulateKubernetesPath = path.join(repoRoot, 'test', 'integration', 'emulateKubernetes');

export default class ChildProcessWrapper {
  private childProcess?: ChildProcess;
  private ready: boolean;
  private terminated: boolean;
  private options: ChildProcessWrapperOptions;
  private nextIpcRequestId: number;
  private responseEmitter: ResponseEmitter;

  constructor(options: ChildProcessWrapperOptions) {
    this.options = options;
    if (!this.options.label) {
      this.options.label = this.options.path;
    }
    this.ready = false;
    this.terminated = false;
    this.nextIpcRequestId = 0;
    this.responseEmitter = new ResponseEmitter();
  }

  async start() {
    const { modulePath, forkOptions } = await this.createForkOptions();
    this.childProcess = fork(modulePath, this.options.args ?? [], forkOptions);
    this.listenToIpcMessages();
    this.childProcess.on('exit', () => {
      this.terminated = true;
    });
    this.echoOutputStreams();
    await this.waitUntilReady();
  }

  private async createForkOptions(): Promise<{ modulePath: string; forkOptions: ForkOptions }> {
    let cwd;
    let modulePath;
    const stat = await fs.stat(this.options.path);
    if (stat.isDirectory()) {
      // provided path is a directory, use that directory as working directory and do fork "node ."
      cwd = path.resolve(repoRoot, this.options.path);
      modulePath = '.';
    } else {
      // provided path is a file, use that file's parent directory as working directory and fork "node filename"
      cwd = path.resolve(repoRoot, path.dirname(this.options.path));
      modulePath = path.basename(this.options.path);
    }

    const forkOptions: ForkOptions = {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
    };
    if (this.options.useTsNode) {
      this.addExecArgvs(forkOptions, '--require', 'ts-node/register');
    }
    if (this.options.emulateKubernetesPodUid) {
      // Note: Kubernetes file system stubbing needs to come before --require distroPath.
      this.addExecArgvs(forkOptions, '--require', emulateKubernetesPath);
    }
    if (this.options.useDistro) {
      this.addExecArgvs(forkOptions, '--require', distroPath);
    }
    if (this.options.env) {
      forkOptions.env = this.options.env;
    }
    return { modulePath, forkOptions };
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
    let waitForReadyRetryOptions = this.options.waitForReadyRetryOptions;
    if (!waitForReadyRetryOptions && semver.lt(process.version, '16.0.0')) {
      // Under Node.js 14 (used for the minimum version), starting a process takes quite a while. Might be because
      // locally on Mac Silicon this is executed under emulation, that is, for example in a shell started with
      // arch -x86_64 zsh (because there is no Node.js 14 binary for arm).
      waitForReadyRetryOptions = {
        maxAttempts: 40,
        waitBetweenRetries: 300,
      };
    }
    await waitUntil(() => {
      if (!this.ready) {
        throw new Error('Child process has not started.');
      }
    }, waitForReadyRetryOptions);
  }

  async waitUntilTerminated() {
    await waitUntil(() => {
      if (!this.terminated) {
        throw new Error('Child process has not terminated yet.');
      }
    }, this.options.waitForReadyRetryOptions);
  }

  async stop(signal?: number | NodeJS.Signals): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    return new Promise(resolve => {
      if (this.childProcess) {
        this.childProcess.once('exit', () => {
          this.childProcess = undefined;
          resolve();
        });
        if (signal) {
          this.childProcess.kill(signal);
        } else {
          this.childProcess.kill();
        }
      }
    });
  }

  async sendIpcRequest(message: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this.nextIpcRequestId++;
      const messageWithId = {
        id: requestId,
        ...message,
      };
      this.childProcess?.send(messageWithId);
      const eventName = String(requestId);
      this.responseEmitter.once(eventName, response => {
        if (!response.ok) {
          reject(new Error(`IPC request ${inspect(messageWithId)} did not succeed: ${inspect(response)}`));
          return;
        }
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

export function defaultAppConfiguration(appPort: number): ChildProcessWrapperOptions {
  return {
    path: 'test/apps/express-typescript',
    label: 'app',
    useTsNode: true,
    useDistro: true,
    env: {
      ...process.env,
      PORT: appPort.toString(),

      // have the Node.js SDK send spans every 20 ms instead of every 5 seconds to speed up tests
      OTEL_BSP_SCHEDULE_DELAY: '20',

      // have the Node.js SDK send logs every 20 ms instead of every 5 seconds to speed up tests
      OTEL_BLRP_SCHEDULE_DELAY: '20',

      // have the Node.js SDK send metrics every 100 ms instead of every 60 seconds to speed up tests
      OTEL_METRIC_EXPORT_INTERVAL: '100',
      OTEL_METRIC_EXPORT_TIMEOUT: '90',

      DASH0_OTEL_COLLECTOR_BASE_URL: 'http://localhost:4318',

      // helpful options for troubleshooting integration tests:
      // DASH0_DEBUG_PRINT_SPANS: 'true',
      // OTEL_LOG_LEVEL: 'debug',
    },
  };
}
