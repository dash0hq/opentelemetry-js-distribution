// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { sendReadyToParentProcess } from '../../util/sendToParentProcess';

console.log('test application started');

sendReadyToParentProcess();

process.nextTick(() => {
  console.log('test application will terminate');
});
