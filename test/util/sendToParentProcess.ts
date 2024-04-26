// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

export default function sendToParentProcess(message: any) {
  if (process.send) {
    process.send(message);
  }
}

export function sendReadyToParentProcess() {
  sendToParentProcess('ready');
}
