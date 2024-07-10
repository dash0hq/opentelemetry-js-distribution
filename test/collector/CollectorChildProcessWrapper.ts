// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import ChildProcessWrapper, { ChildProcessWrapperOptions } from '../integration/ChildProcessWrapper';
import { OpenTelemetryData, Stats } from './Sink';

export default class CollectorChildProcessWrapper extends ChildProcessWrapper {
  constructor(options: ChildProcessWrapperOptions) {
    super(options);
  }

  async fetchStats() {
    return <Stats>await this.sendIpcRequest({ command: 'stats' });
  }

  async hasTraces() {
    const stats = await this.fetchStats();
    return stats.traces >= 1;
  }

  async fetchTraces() {
    if (!(await this.hasTraces())) {
      throw new Error('The collector never received any spans.');
    }
    return (await this.fetchTelemetry()).traces;
  }

  async hasMetrics() {
    const stats = await this.fetchStats();
    return stats.metrics >= 1;
  }

  async fetchMetrics() {
    if (!(await this.hasMetrics())) {
      throw new Error('The collector never received any metrics.');
    }
    return (await this.fetchTelemetry()).metrics;
  }

  async hasLogs() {
    const stats = await this.fetchStats();
    return stats.logs >= 1;
  }

  async fetchLogRecords() {
    if (!(await this.hasLogs())) {
      throw new Error('The collector never received any log records.');
    }
    return (await this.fetchTelemetry()).logs;
  }

  async hasTelemetry() {
    const stats = await this.fetchStats();
    return stats.traces >= 1 || stats.metrics >= 1 || stats.logs >= 1;
  }

  async fetchTelemetry() {
    return <OpenTelemetryData>await this.sendIpcRequest({ command: 'telemetry' });
  }

  async clear() {
    await this.sendIpcRequest({ command: 'clear' });
  }
}
