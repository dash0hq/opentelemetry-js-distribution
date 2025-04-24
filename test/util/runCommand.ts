// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { promisify } from 'util';

let pathToNpm: string;

export async function runNpmCommand(command: string, workingDirectory: string) {
  if (pathToNpm == null) {
    await findNpm();
  }
  await runCommand(`${pathToNpm} ${command}`, workingDirectory);
}

export async function runCommand(command: string, workingDirectory: string) {
  const originalWorkingDirectory = process.cwd();
  process.chdir(workingDirectory);
  try {
    console.log(`Running "${command}" in directory ${process.cwd()}.`);
    const execAsync = promisify(childProcess.exec).bind(childProcess);
    const { stdout, stderr } = await execAsync(command);
    echoOutputWithIndentation(command, 'stdout', stdout);
    echoOutputWithIndentation(command, 'stderr', stderr);
  } finally {
    process.chdir(originalWorkingDirectory);
  }
}

function echoOutputWithIndentation(command: string, label: string, output: string) {
  if (output && output.trim().length > 0) {
    console.log(`${command} ${label}:`);
    const lines = output.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }
  }
}

async function findNpm() {
  // Under normal circumstances, we could just run npm and trust that it is in the path, but: This package depends on,
  // semantic-release (as a dev dependency), which in turn depends on npm (as an npm package), so there is a npm binary
  // in node_modules/.bin, and that one takes precedence. However, that npm version (determined by the package.json file
  // of semantic-release) can be incompatible with the Node.js version used for running the tests.
  const nodeJsFullPath = process.execPath;
  pathToNpm = path.join(path.dirname(nodeJsFullPath), 'npm');
  try {
    await fs.stat(pathToNpm);
    console.log(`Found npm executable matching currently used Node.js version at ${pathToNpm}.`);
    await runNpmCommand(`--version`, process.cwd());
  } catch (e) {
    throw new Error(
      `Cannot derive path to npm from path to Node.js executable (${nodeJsFullPath}), ${pathToNpm} does not exist:`,
      { cause: e },
    );
  }
}
