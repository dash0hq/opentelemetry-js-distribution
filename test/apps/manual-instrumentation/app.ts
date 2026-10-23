// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { trace } from '@opentelemetry/api';
import express, { Express } from 'express';

import { sendReadyToParentProcess } from '../../util/sendToParentProcess';

const port: number = parseInt(process.env.PORT || '1302');
const app: Express = express();

const tracer = trace.getTracer('manual-instrumentation');

app.get('/ohai', (req, res) => {
  tracer.startActiveSpan('manual-span', span => {
    res.json({ message: 'We make Observability easy for every developer.' });
    span.end();
  });
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
  sendReadyToParentProcess();
});
