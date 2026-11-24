// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import * as logsApi from '@opentelemetry/api-logs';
import express, { Express } from 'express';
import { execFileSync } from 'node:child_process';

import { sendReadyToParentProcess } from '../../util/sendToParentProcess';

const port: number = parseInt(process.env.PORT || '1302');
const app: Express = express();

const logger = logsApi.logs.getLoggerProvider().getLogger('default');

app.get('/ohai', (req, res) => {
  logger.emit({
    severityNumber: logsApi.SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'log body',
    attributes: { 'log.type': 'LogRecord' },
  });
  res.json({ message: 'We make Observability easy for every developer.' });
});

// Reports the OTEL_CONFIG_FILE value a child process of this app inherits.
app.get('/child-env', (req, res) => {
  const childValue = execFileSync(
    process.execPath,
    ['-e', 'process.stdout.write(process.env.OTEL_CONFIG_FILE ?? "")'],
    {
      env: process.env,
    },
  ).toString();
  res.json({ OTEL_CONFIG_FILE: childValue });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
  sendReadyToParentProcess();
});
