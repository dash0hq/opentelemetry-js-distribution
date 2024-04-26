// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import ChildProcessWrapper, { ChildProcessWrapperOptions } from '../integration/ChildProcessWrapper';
import { collector } from '../integration/rootHooks';
import { OpenTelemetryData, Stats } from './Sink';

export default class CollectorChildProcessWrapper extends ChildProcessWrapper {
  constructor(options: ChildProcessWrapperOptions) {
    super(options);
  }

  async fetchStats() {
    return <Stats>await collector().sendRequest({ command: 'stats' });
  }

  async hasTraces() {
    const stats = await collector().fetchStats();
    return stats.traces >= 1;
  }

  async fetchTelemetry() {
    return <OpenTelemetryData>await collector().sendRequest({ command: 'telemetry' });
  }
}
