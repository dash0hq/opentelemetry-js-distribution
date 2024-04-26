// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import Sink from './Sink';

export default class AbstractServer {
  bindAddress: string;
  sink: Sink;

  constructor(bindAddress: string, sink: Sink) {
    this.bindAddress = bindAddress;
    this.sink = sink;
  }
}
