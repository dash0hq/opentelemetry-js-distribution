// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { DetectorSync, Resource } from '@opentelemetry/resources';
import { ResourceAttributes } from '@opentelemetry/resources/build/src/types';
import { SEMRESATTRS_K8S_POD_UID } from '@opentelemetry/semantic-conventions';
import { readFile } from 'node:fs/promises';
import os from 'os';

const etcHostsFileName = '/etc/hosts';
const expectedFirstLineInEtcHosts = '# Kubernetes-managed hosts file';
const lineSeparator = os.EOL;
const podUidChars = 36;
const podLabel = 'pod';
const podLabelMountPart = '/pods/';
const podUidPartChars = podUidChars + podLabel.length;
const containerIdChars = 64;

// for cgroup v2
const procSelfCgroupFileName = '/proc/self/cgroup';
const podUidInCgroupLineRegex =
  /^[a-z_-]*pod(?<uid>[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12})\.slice$/;

// for cgroup v1
const procSelfMountInfoFileName = '/proc/self/mountinfo';

export default class PodUidDetector implements DetectorSync {
  detect(): Resource {
    return new Resource({}, this.detectPodUid());
  }

  private async detectPodUid(): Promise<ResourceAttributes> {
    if (!(await this.isKubernetes())) {
      return {};
    }
    const podUid = await this.readPodUid();
    if (podUid) {
      return {
        [SEMRESATTRS_K8S_POD_UID]: podUid,
      };
    }

    // Note: This seems to be running in K8s, but we could not figure out the pod uid.
    // This should trigger a monitoring issue. Potentially include troubleshooting information.
    return {};
  }

  private async readPodUid(): Promise<string | null | undefined> {
    const podUid = await this.readPodUidCGroupV1();
    if (podUid) {
      return podUid;
    }
    return await this.readPodUidCGroupV2();
  }

  private async readPodUidCGroupV1(): Promise<string | null | undefined> {
    const mount = (await this.findCandidateLinesInFile(procSelfMountInfoFileName, podUidChars)).find(
      line => line.indexOf(podLabelMountPart) > 0,
    );
    if (!mount) {
      return null;
    }
    const partAfterPodLabel = mount.split(podLabelMountPart)[1];
    if (!partAfterPodLabel) {
      return null;
    }
    return partAfterPodLabel.substring(0, podUidChars);
  }

  private async readPodUidCGroupV2(): Promise<string | null | undefined> {
    const lines = await this.findCandidateLinesInFile(procSelfCgroupFileName, containerIdChars);
    const candidates = lines.map(line => {
      const pathSegments = line.split('/');
      if (pathSegments.length <= 2) {
        return null;
      }
      const penultimatePathSegment = pathSegments[pathSegments.length - 2];
      if (penultimatePathSegment.startsWith(podLabel) && penultimatePathSegment.length === podUidPartChars) {
        return penultimatePathSegment.substring(3, podUidPartChars);
      } else {
        // matches strings like kubepods-pode462ffed_94ce_4806_a52e_d2726f448f15.slice
        const matches = podUidInCgroupLineRegex.exec(penultimatePathSegment);
        if (matches) {
          return matches.groups?.uid?.replaceAll('_', '-');
        } else {
          // questionable: this might actually lead to extracing a wrong uid
          return penultimatePathSegment;
        }
      }
    });
    return candidates.find(podUid => !!podUid);
  }

  private async isKubernetes() {
    let etcHosts: string;
    try {
      etcHosts = String(await readFile(etcHostsFileName, { encoding: 'utf8' }));
    } catch (e) {
      return false;
    }
    if (etcHosts == null || etcHosts.trim().length === 0) {
      return false;
    }
    const lines = etcHosts.split(lineSeparator);
    if (lines.length === 0) {
      return false;
    }
    return lines[0].startsWith(expectedFirstLineInEtcHosts);
  }

  private async findCandidateLinesInFile(filename: string, minimumLength: number) {
    let content;
    try {
      content = await readFile(filename, { encoding: 'utf8' });
    } catch (e) {
      return [];
    }
    if (!content) {
      return [];
    }
    return content
      .split(lineSeparator)
      .map(line => line.trim())
      .filter(line => line != null && line.length > minimumLength);
  }
}
