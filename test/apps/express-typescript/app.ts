// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import * as logsApi from '@opentelemetry/api-logs';
import express, { Express } from 'express';

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

app.listen(port, () => {
  console.log(`listening on port ${port}`);
  sendReadyToParentProcess();
});
