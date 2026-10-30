// SPDX-FileCopyrightText: Copyright 2026 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';

describe('dependencies', () => {
  it('should override @opentelemetry/api with the same range as the dependency', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    expect(packageJson.overrides['@opentelemetry/api']).to.equal(packageJson.dependencies['@opentelemetry/api']);
  });
});
