// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { sendReadyToParentProcess } from '../../util/sendToParentProcess';

console.log('test application started');

sendReadyToParentProcess();

// Exit via an empty event loop with the exit code requested by the test.
process.exitCode = Number(process.env.APP_EXIT_CODE);
