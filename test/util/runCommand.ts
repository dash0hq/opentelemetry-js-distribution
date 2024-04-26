// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import { promisify } from 'util';

export default async function runCommand(command: string, workingDirectory: string) {
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
