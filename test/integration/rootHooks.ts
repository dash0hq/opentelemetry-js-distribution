// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import CollectorChildProcessWrapper from '../collector/CollectorChildProcessWrapper';

let collectorInstance: CollectorChildProcessWrapper;

export function collector() {
  return collectorInstance;
}

export const mochaHooks = {
  async beforeAll() {
    collectorInstance = new CollectorChildProcessWrapper({
      path: 'test/collector/index.ts',
      label: 'collector',
      useTsNode: true,
    });
    console.debug('[rootHooks] starting global mock collector');
    await collectorInstance.start();
    console.debug('[rootHooks] global mock collector started');
  },

  async beforeEach() {
    collectorInstance.clear();
  },

  async afterAll() {
    console.debug('[rootHooks] stopping global mock collector');
    await collectorInstance.stop();
    console.debug('[rootHooks] global mock collector stopped');
  },
};
