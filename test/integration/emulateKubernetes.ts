// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs/promises';
import sinon from 'sinon';

const sandbox = sinon.createSandbox();
const readFileStub = sandbox.stub(fs, 'readFile');
stubFile('/etc/hosts', '# Kubernetes-managed hosts file.\n127.0.0.1\tlocalhost');
stubFile(
  '/proc/self/cgroup',
  '11:memory:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope',
);

function stubFile(filename: string, content: string) {
  readFileStub.withArgs(filename).returns(Promise.resolve(content));
}
