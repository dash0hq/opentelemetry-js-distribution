// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { PackageJson } from 'type-fest';

/**
 * We have not tried to compute this specific value yet.
 */
export type Unknown = {
  state: 'not-attempted';
};

/**
 * We have already tried to compute this specific value but failed. There is no reason to try it again.
 */
export type Failed = {
  state: 'attempt-has-failed';
};

/**
 * We have already tried to compute this specific value and succeeded.
 */
export type Cached<T> = {
  state: 'value-has-been-cached';
  value: T;
};

export type CachedValue<T> = Unknown | Failed | Cached<T>;

export const unknown: Unknown = {
  state: 'not-attempted',
};

let cachedPackageJson: CachedValue<PackageJson> = unknown;
let attemptInProgress: Promise<PackageJson | null> | null = null;

export async function readPackageJson(): Promise<PackageJson | null> {
  if (attemptInProgress) {
    return attemptInProgress;
  }
  switch (cachedPackageJson.state) {
    case 'not-attempted':
      attemptInProgress = findAndParsePackageJsonFromEntrypoint();
      const parsedPackageJson = await attemptInProgress;
      if (parsedPackageJson != null) {
        cachedPackageJson = { state: 'value-has-been-cached', value: parsedPackageJson };
      } else {
        cachedPackageJson = { state: 'attempt-has-failed' };
      }
      attemptInProgress = null;
      return parsedPackageJson;
    case 'attempt-has-failed':
      return null;
    case 'value-has-been-cached':
      return cachedPackageJson.value;
    default:
      throw new Error(`Unknown cache state: ${JSON.stringify(cachedPackageJson)}`);
  }
}

async function findAndParsePackageJsonFromEntrypoint(): Promise<PackageJson | null> {
  const entrypoint = process.argv[1];
  let entrypointStat;
  try {
    entrypointStat = await stat(entrypoint);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null;
  }
  if (entrypointStat.isDirectory()) {
    return checkDirectoryOrAncestor(entrypoint);
  } else {
    return checkDirectoryOrAncestor(path.dirname(entrypoint));
  }
}

async function checkDirectoryOrAncestor(directory: string): Promise<PackageJson | null> {
  const packageJsonCandidate = path.join(directory, 'package.json');
  let packageJsonStat;
  try {
    packageJsonStat = await stat(packageJsonCandidate);
  } catch (e) {
    if (isNoEntityError(e)) {
      return traverseToParent(directory);
    } else {
      return null;
    }
  }

  if (!packageJsonStat.isFile()) {
    return traverseToParent(directory);
  }

  const insideNodeModulesFolder = directory.includes('node_modules');
  if (insideNodeModulesFolder) {
    // For deployment scenarios where the app is published to a registry and installed from there to the target
    // environment, we just go with the first package.json file we find, without checking for a sibling node_modules
    // folder. Since the app is installed in a node_modules folder, the app directory itself might not have a
    // node_modules folder due to deduplication.
    return readAndParse(directory, packageJsonCandidate);
  } else {
    return checkForSiblingNodeModulesFolder(directory, packageJsonCandidate);
  }
}

async function checkForSiblingNodeModulesFolder(
  directory: string,
  packageJsonCandidate: string,
): Promise<PackageJson | null> {
  const nodeModulesCandidate = path.join(directory, 'node_modules');
  let nodeModulesStat;
  try {
    nodeModulesStat = await stat(nodeModulesCandidate);
  } catch (e) {
    if (isNoEntityError(e)) {
      return traverseToParent(directory);
    }
    return null;
  }

  if (nodeModulesStat.isDirectory()) {
    return readAndParse(directory, packageJsonCandidate);
  } else {
    return traverseToParent(directory);
  }
}

async function traverseToParent(directory: string): Promise<PackageJson | null> {
  const parentDirectory = path.join(directory, '..');
  if (directory === parentDirectory) {
    return null;
  }

  return checkDirectoryOrAncestor(parentDirectory);
}

async function readAndParse(directory: string, packageJsonPath: string): Promise<PackageJson | null> {
  let packageJsonContent;
  try {
    packageJsonContent = await readFile(packageJsonPath, { encoding: 'utf8' });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // package.json candidate may not be readable (no permissions)
    return traverseToParent(directory);
  }
  return parse(directory, packageJsonContent);
}

async function parse(directory: string, packageJsonContent: string): Promise<PackageJson | null> {
  try {
    return JSON.parse(packageJsonContent);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return traverseToParent(directory);
  }
}

function isNoEntityError(error: any): boolean {
  return isErrorCode(error, 'ENOENT');
}

function isErrorCode(error: any, code: string): error is NodeJS.ErrnoException {
  return isError(error) && error.code === code;
}

function isError(error: any): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export function _resetOnlyForTesting() {
  cachedPackageJson = unknown;
  attemptInProgress = null;
}
