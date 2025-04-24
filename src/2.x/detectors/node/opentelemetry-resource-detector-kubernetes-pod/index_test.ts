// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { DetectedResource } from '@opentelemetry/resources';
import { SEMRESATTRS_K8S_POD_UID } from '@opentelemetry/semantic-conventions';
import { expect } from 'chai';
import fs from 'node:fs/promises';
import Sinon from 'sinon';
import sinon from 'sinon';
import PodUidDetector from './index';

const etcHostsFileName = '/etc/hosts';
const procSelfCgroupFileName = '/proc/self/cgroup';
const procSelfMountInfoFileName = '/proc/self/mountinfo';

const etcHostsContent = `# Kubernetes-managed hosts file.
127.0.0.1\tlocalhost
::1\tlocalhost ip6-localhost ip6-loopback
fe00::0\tip6-localnet
fe00::0\tip6-mcastprefix
fe00::1\tip6-allnodes
fe00::2\tip6-allrouters
10.1.18.147\topentelemetry-demo-someservice-1234d7cddc-2vsj5`;

const procSelfCgroupContentNoPodUid = '0::/';

const procSelfCgroupContentWithPodUid = `11:memory:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
10:freezer:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
9:pids:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
8:blkio:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
7:perf_event:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
6:devices:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
5:hugetlb:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
4:cpu,cpuacct:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
3:net_cls,net_prio:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
2:cpuset:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope
1:name=systemd:/kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope`;

const procSelfMountInfoContentWithPodUid = `2070 1678 0:552 / / rw,relatime master:199 - overlay overlay rw,lowerdir=/var/lib/docker/overlay2/l/OJZ7JQ4ARSNC3Z2YD2D6OZFJ2T:/var/lib/docker/overlay2/l/YNFYQMQ4JPWXSRMISEKJQ2EAOZ:/var/lib/docker/overlay2/l/NNEI5OO4B5UGLPIRR2FEQ4EPPR:/var/lib/docker/overlay2/l/QOA6GG74TMIF5OHXD6BI74FPA3:/var/lib/docker/overlay2/l/IDVQPNUVG4B3Z2OINQEFMN7QLF:/var/lib/docker/overlay2/l/FJQTQGY6HEFD4GRGMC62NYF4MS,upperdir=/var/lib/docker/overlay2/be815ecdb1e307322d18bb5be01d1a42d3b0afd2892c1ce929fc36652046b2f7/diff,workdir=/var/lib/docker/overlay2/be815ecdb1e307322d18bb5be01d1a42d3b0afd2892c1ce929fc36652046b2f7/work
2071 2070 0:554 / /proc rw,nosuid,nodev,noexec,relatime - proc proc rw
2072 2070 0:555 / /dev rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
2073 2072 0:556 / /dev/pts rw,nosuid,noexec,relatime - devpts devpts rw,gid=9,mode=620,ptmxmode=666
2074 2070 0:342 / /sys ro,nosuid,nodev,noexec,relatime - sysfs sysfs ro
2075 2074 0:30 / /sys/fs/cgroup ro,nosuid,nodev,noexec,relatime - cgroup2 cgroup rw
2076 2072 0:328 / /dev/mqueue rw,nosuid,nodev,noexec,relatime - mqueue mqueue rw
2077 2072 254:1 /kubelet/pods/702cc0d1-1251-4dd8-8d74-4c40bcee810e/containers/someservice/69604667 /dev/termination-log rw,relatime - ext4 /dev/vda1 rw,discard
2078 2070 254:1 /docker/containers/acb5d7abd5a2a1edfab75dad79fea1e52fae910bb35fa16bd46149ceb6775d69/resolv.conf /etc/resolv.conf rw,relatime - ext4 /dev/vda1 rw,discard
2079 2070 254:1 /docker/containers/acb5d7abd5a2a1edfab75dad79fea1e52fae910bb35fa16bd46149ceb6775d69/hostname /etc/hostname rw,relatime - ext4 /dev/vda1 rw,discard
2080 2070 254:1 /kubelet/pods/702cc0d1-1251-4dd8-8d74-4c40bcee810e/etc-hosts /etc/hosts rw,relatime - ext4 /dev/vda1 rw,discard
2081 2072 0:310 / /dev/shm rw,nosuid,nodev,noexec,relatime - tmpfs shm rw,size=65536k
2082 2070 0:278 / /run/secrets/kubernetes.io/serviceaccount ro,relatime - tmpfs tmpfs rw,size=16257092k
1679 2071 0:554 /bus /proc/bus ro,nosuid,nodev,noexec,relatime - proc proc rw
1693 2071 0:554 /fs /proc/fs ro,nosuid,nodev,noexec,relatime - proc proc rw
1694 2071 0:554 /irq /proc/irq ro,nosuid,nodev,noexec,relatime - proc proc rw
1695 2071 0:554 /sys /proc/sys ro,nosuid,nodev,noexec,relatime - proc proc rw
1696 2071 0:554 /sysrq-trigger /proc/sysrq-trigger ro,nosuid,nodev,noexec,relatime - proc proc rw
1697 2071 0:555 /null /proc/kcore rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1698 2071 0:555 /null /proc/keys rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1699 2071 0:555 /null /proc/timer_list rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1700 2074 0:557 / /sys/firmware ro,relatime - tmpfs tmpfs ro`;

const procSelfMountInfoContentWithPodUid2 = `2317 1432 0:473 / / rw,relatime master:320 - overlay overlay rw,lowerdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69739/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69738/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69735/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69734/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69733/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69731/fs:/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/116/fs,upperdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69740/fs,workdir=/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/69740/work
2318 2317 0:475 / /proc rw,nosuid,nodev,noexec,relatime - proc proc rw
2319 2317 0:476 / /dev rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
2320 2319 0:477 / /dev/pts rw,nosuid,noexec,relatime - devpts devpts rw,gid=9,mode=620,ptmxmode=666
2321 2319 0:401 / /dev/mqueue rw,nosuid,nodev,noexec,relatime - mqueue mqueue rw
2322 2317 0:417 / /sys ro,nosuid,nodev,noexec,relatime - sysfs sysfs ro
2323 2322 0:478 / /sys/fs/cgroup rw,nosuid,nodev,noexec,relatime - tmpfs tmpfs rw,mode=755
2324 2323 0:25 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/systemd ro,nosuid,nodev,noexec,relatime master:9 - cgroup cgroup rw,xattr,release_agent=/usr/lib/systemd/systemd-cgroups-agent,name=systemd
2325 2323 0:27 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/cpuset ro,nosuid,nodev,noexec,relatime master:10 - cgroup cgroup rw,cpuset
2326 2323 0:28 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/net_cls,net_prio ro,nosuid,nodev,noexec,relatime master:11 - cgroup cgroup rw,net_cls,net_prio
2327 2323 0:29 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/cpu,cpuacct ro,nosuid,nodev,noexec,relatime master:12 - cgroup cgroup rw,cpu,cpuacct
2328 2323 0:30 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/hugetlb ro,nosuid,nodev,noexec,relatime master:13 - cgroup cgroup rw,hugetlb
2329 2323 0:31 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/devices ro,nosuid,nodev,noexec,relatime master:14 - cgroup cgroup rw,devices
2330 2323 0:32 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/perf_event ro,nosuid,nodev,noexec,relatime master:15 - cgroup cgroup rw,perf_event
2331 2323 0:33 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/blkio ro,nosuid,nodev,noexec,relatime master:16 - cgroup cgroup rw,blkio
2332 2323 0:34 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/pids ro,nosuid,nodev,noexec,relatime master:17 - cgroup cgroup rw,pids
2333 2323 0:35 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/freezer ro,nosuid,nodev,noexec,relatime master:18 - cgroup cgroup rw,freezer
2334 2323 0:36 /kubepods.slice/kubepods-podf57400dc_94ce_4806_a52e_d2726f448f15.slice/cri-containerd-44f639a16a22e394061fb35d2138ef9391c2131db9bf5ae742ef4e447e824887.scope /sys/fs/cgroup/memory ro,nosuid,nodev,noexec,relatime master:19 - cgroup cgroup rw,memory
2335 2317 259:1 /var/lib/kubelet/pods/f57400dc-94ce-4806-a52e-d2726f448f15/volumes/kubernetes.io~configmap/config /etc/dash0 ro,noatime - xfs /dev/nvme0n1p1 rw,attr2,inode64,logbufs=8,logbsize=32k,noquota
2336 2317 259:1 /var/lib/kubelet/pods/f57400dc-94ce-4806-a52e-d2726f448f15/etc-hosts /etc/hosts rw,noatime - xfs /dev/nvme0n1p1 rw,attr2,inode64,logbufs=8,logbsize=32k,noquota
2337 2319 259:1 /var/lib/kubelet/pods/f57400dc-94ce-4806-a52e-d2726f448f15/containers/api/5f9dc7b6 /dev/termination-log rw,noatime - xfs /dev/nvme0n1p1 rw,attr2,inode64,logbufs=8,logbsize=32k,noquota
2338 2317 259:1 /var/lib/containerd/io.containerd.grpc.v1.cri/sandboxes/141e80b1fd73c453e117972a858c4214df9ae2a865273f846270c41781559dcb/hostname /etc/hostname rw,noatime - xfs /dev/nvme0n1p1 rw,attr2,inode64,logbufs=8,logbsize=32k,noquota
2339 2317 259:1 /var/lib/containerd/io.containerd.grpc.v1.cri/sandboxes/141e80b1fd73c453e117972a858c4214df9ae2a865273f846270c41781559dcb/resolv.conf /etc/resolv.conf rw,noatime - xfs /dev/nvme0n1p1 rw,attr2,inode64,logbufs=8,logbsize=32k,noquota
2340 2319 0:368 / /dev/shm rw,nosuid,nodev,noexec,relatime - tmpfs shm rw,size=65536k
1434 2318 0:475 /bus /proc/bus ro,nosuid,nodev,noexec,relatime - proc proc rw
1435 2318 0:475 /fs /proc/fs ro,nosuid,nodev,noexec,relatime - proc proc rw
1436 2318 0:475 /irq /proc/irq ro,nosuid,nodev,noexec,relatime - proc proc rw
1437 2318 0:475 /sys /proc/sys ro,nosuid,nodev,noexec,relatime - proc proc rw
1438 2318 0:475 /sysrq-trigger /proc/sysrq-trigger ro,nosuid,nodev,noexec,relatime - proc proc rw
1439 2318 0:479 / /proc/acpi ro,relatime - tmpfs tmpfs ro
1450 2318 0:476 /null /proc/kcore rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1451 2318 0:476 /null /proc/keys rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1453 2318 0:476 /null /proc/latency_stats rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1454 2318 0:476 /null /proc/timer_list rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1456 2318 0:476 /null /proc/sched_debug rw,nosuid - tmpfs tmpfs rw,size=65536k,mode=755
1457 2322 0:480 / /sys/firmware ro,relatime - tmpfs tmpfs ro`;

describe('pod ui detection', () => {
  const sandbox = sinon.createSandbox();
  let readFileStub: sinon.SinonStub;
  let podUidDetector: PodUidDetector;

  beforeEach(() => {
    readFileStub = sandbox.stub(fs, 'readFile');
    podUidDetector = new PodUidDetector();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('does not detect a pod uid if /etc/hosts does not exist', async () => {
    readFileStub
      .withArgs(etcHostsFileName)
      .throws(new Error(`ENOENT: no such file or directory, open '${etcHostsFileName}'`));
    const result = podUidDetector.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes[SEMRESATTRS_K8S_POD_UID]).to.not.exist;

    // should only have attempted to read /etc/hosts and no other file
    expect(readFileStub.callCount).to.equal(1);
    expect(readFileStub.args[0][0]).to.equal(etcHostsFileName);
  });

  [
    //
    '',
    '   ',
    ' \n \t ',
    'this is not a Kubernetes-managed /etc/hosts file\nanother line\nanother line',
  ].forEach(content => {
    it(`does not detect a pod uid if /etc/hosts does not have the expected first line (content is "${content}")`, async () => {
      readFileStub.withArgs(etcHostsFileName).returns(content);
      const result = podUidDetector.detect();
      const attributes = await waitForAsyncDetection(result);
      expect(attributes[SEMRESATTRS_K8S_POD_UID]).to.not.exist;

      // should only have attempted to read /etc/hosts and no other file
      expect(readFileStub.callCount).to.equal(1);
      expect(readFileStub.args[0][0]).to.equal(etcHostsFileName);
    });
  });

  it('detects pod uid for cgroup v1', async () => {
    givenAKubernetesManagedEtcHostsFile(readFileStub);
    readFileStub.withArgs(procSelfMountInfoFileName).returns(procSelfMountInfoContentWithPodUid);
    readFileStub.withArgs(procSelfCgroupFileName).returns(procSelfCgroupContentNoPodUid);
    const result = podUidDetector.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.have.property(SEMRESATTRS_K8S_POD_UID, '702cc0d1-1251-4dd8-8d74-4c40bcee810e');

    expect(readFileStub.callCount).to.equal(2);
    expect(readFileStub.args[0][0]).to.equal(etcHostsFileName);
    expect(readFileStub.args[1][0]).to.equal(procSelfMountInfoFileName);
  });

  it('detects pod uid for cgroup v1 #2', async () => {
    givenAKubernetesManagedEtcHostsFile(readFileStub);
    readFileStub.withArgs(procSelfMountInfoFileName).returns(procSelfMountInfoContentWithPodUid2);
    readFileStub.withArgs(procSelfCgroupFileName).returns(procSelfCgroupContentNoPodUid);
    const result = podUidDetector.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.have.property(SEMRESATTRS_K8S_POD_UID, 'f57400dc-94ce-4806-a52e-d2726f448f15');

    expect(readFileStub.callCount).to.equal(2);
    expect(readFileStub.args[0][0]).to.equal(etcHostsFileName);
    expect(readFileStub.args[1][0]).to.equal(procSelfMountInfoFileName);
  });

  it('detects pod uid for cgroup v2', async () => {
    givenAKubernetesManagedEtcHostsFile(readFileStub);
    readFileStub
      .withArgs(procSelfMountInfoFileName)
      .throws(new Error(`ENOENT: no such file or directory, open '${procSelfMountInfoFileName}'`));
    readFileStub.withArgs(procSelfCgroupFileName).returns(procSelfCgroupContentWithPodUid);
    const result = podUidDetector.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes).to.have.property(SEMRESATTRS_K8S_POD_UID, 'f57400dc-94ce-4806-a52e-d2726f448f15');

    expect(readFileStub.callCount).to.equal(3);
    expect(readFileStub.args[0][0]).to.equal(etcHostsFileName);
    expect(readFileStub.args[1][0]).to.equal(procSelfMountInfoFileName);
    expect(readFileStub.args[2][0]).to.equal(procSelfCgroupFileName);
  });

  it("it's Kubernetes but no pod uid can be derived", async () => {
    givenAKubernetesManagedEtcHostsFile(readFileStub);
    readFileStub
      .withArgs(procSelfMountInfoFileName)
      .throws(new Error(`ENOENT: no such file or directory, open '${procSelfMountInfoFileName}'`));
    readFileStub
      .withArgs(procSelfCgroupFileName)
      .throws(new Error(`ENOENT: no such file or directory, open '${procSelfCgroupFileName}'`));
    const result = podUidDetector.detect();
    const attributes = await waitForAsyncDetection(result);
    expect(attributes[SEMRESATTRS_K8S_POD_UID]).to.not.exist;

    expect(readFileStub.callCount).to.equal(3);
    expect(readFileStub.args[0][0]).to.equal(etcHostsFileName);
    expect(readFileStub.args[1][0]).to.equal(procSelfMountInfoFileName);
    expect(readFileStub.args[2][0]).to.equal(procSelfCgroupFileName);
  });

  function givenAKubernetesManagedEtcHostsFile(readFileStub: Sinon.SinonStub<any[], any>) {
    readFileStub.withArgs(etcHostsFileName).returns(etcHostsContent);
  }

  async function waitForAsyncDetection(result: DetectedResource) {
    expect(result).to.exist;
    expect(result.attributes).to.exist;
    const attributes = result.attributes!;
    const keys = Object.keys(attributes);
    expect(keys).to.have.lengthOf(1);
    const resolvedAttributes: { [keys: string]: any } = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedAttributes[keys[i]] = await attributes[keys[i]];
    }
    return resolvedAttributes;
  }
});
