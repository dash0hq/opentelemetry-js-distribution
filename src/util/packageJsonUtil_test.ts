// SPDX-FileCopyrightText: Copyright 2024 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import fs from 'node:fs/promises';
import path from 'node:path';
import sinon from 'sinon';
import * as packageJsonUtil from './packageJsonUtil';

const packageJsonContent = `{
  "name": "@example/app-under-test",
  "version": "2.13.47",
  "description": "a Node.js application",
  "main": "src/index.js"
}`;

const theWrongPackageJsonContent = `{
  "name": "the wrong package.json",
}`;

const unparseablePackageJsonContent = `{
  "name": "@example/app-under-test",
  "version": "2.13.47"
  "cannot be parsed"
}`;

const aDirectory = {
  isDirectory: () => true,
  isFile: () => false,
};
const aFile = {
  isDirectory: () => false,
  isFile: () => true,
};
const doesNotExist = 'ENOENT';
const unreadableFile = 'EACCES';

function newENOENT(currentPath: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`ENOENT: no such file or directory, open '${currentPath}'`);
  error.code = 'ENOENT';
  return error;
}

function newEACCESS(currentPath: string) {
  const error: NodeJS.ErrnoException = new Error(`EACCES: permission denied, open '${currentPath}'`);
  error.code = 'EACCES';
  return error;
}

describe('package json util', () => {
  const sandbox = sinon.createSandbox();

  let readFileStub: sinon.SinonStub;
  let statStub: sinon.SinonStub;
  let originalArgv1: string;

  before(async () => {
    originalArgv1 = process.argv[1];
  });

  beforeEach(() => {
    readFileStub = sandbox.stub(fs, 'readFile');
    statStub = sandbox.stub(fs, 'stat');

    // for paths not handled in createDirectoryStructure, always respond with ENOENT
    statStub.throws(newENOENT(''));
  });

  afterEach(() => {
    sandbox.restore();
    process.argv[1] = originalArgv1;
    packageJsonUtil._resetOnlyForTesting();
  });

  it('finds the package.json file if argv[1] is a file in the same directory', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            'package.json': packageJsonContent,
            node_modules: aDirectory,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.exist;
    expect(packageJson?.name).to.equal('@example/app-under-test');
  });

  it('disregards a package.json file if there is no node_modules folder', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            'package.json': packageJsonContent,
            // no sibling node_modules folder
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.not.exist;
  });

  it('finds the package.json file if argv[1] is a directory with package.json and node_modules in it', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'package.json': packageJsonContent,
            node_modules: aDirectory,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.exist;
    expect(packageJson?.name).to.equal('@example/app-under-test');
  });

  it('disregards the package.json file if argv[1] is a directory with package.json but no node_modules folder in it', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'package.json': packageJsonContent,
            // no sibling node_modules folder
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.not.exist;
  });

  it('returns null if there is no package.json in the directory tree', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.not.exist;
  });

  it('can cope with a non-parseable package.json files', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            // packageJsonUtil will attempt to parse this file, recover, and continue traversing the directory tree up
            // after that.
            'package.json': unparseablePackageJsonContent,
            node_modules: aDirectory,
          },
        },
      },
      'package.json': packageJsonContent,
      node_modules: aDirectory,
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.exist;
    expect(packageJson?.name).to.equal('@example/app-under-test');
  });

  it('can cope with a non-readable package.json files', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            // packageJsonUtil will attempt to parse this file, recover, and continue traversing the directory tree up
            // after that.
            'package.json': unreadableFile,
            node_modules: aDirectory,
          },
        },
      },
      'package.json': packageJsonContent,
      node_modules: aDirectory,
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.exist;
    expect(packageJson?.name).to.equal('@example/app-under-test');
  });

  it('caches the parsed package.json file', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            'package.json': packageJsonContent,
            node_modules: aDirectory,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson1 = await packageJsonUtil.readPackageJson();
    const packageJson2 = await packageJsonUtil.readPackageJson();
    expect(packageJson1).to.exist;
    expect(packageJson2).to.exist;
    expect(packageJson1?.name).to.equal('@example/app-under-test');
    expect(packageJson2?.name).to.equal('@example/app-under-test');

    expect(statStub.withArgs(process.argv[1]).callCount).to.equal(1);
    expect(readFileStub.callCount).to.equal(1);
  });

  it('caches the fact that no package.json file has been found', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            'package.json': packageJsonContent,
            // no sibling node_modules folder
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson1 = await packageJsonUtil.readPackageJson();
    const packageJson2 = await packageJsonUtil.readPackageJson();
    expect(packageJson1).to.not.exist;
    expect(packageJson2).to.not.exist;

    expect(statStub.withArgs(process.argv[1]).callCount).to.equal(1);
  });

  it('queues concurrent attempts and resolves all of them with the same promise', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            'app.js': aFile,
            'package.json': packageJsonContent,
            node_modules: aDirectory,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'app.js');

    const packageJson1Promise = packageJsonUtil.readPackageJson();
    const packageJson2Promise = packageJsonUtil.readPackageJson();
    const [packageJson1, packageJson2] = await Promise.all([packageJson1Promise, packageJson2Promise]);
    expect(packageJson1).to.exist;
    expect(packageJson2).to.exist;
    expect(packageJson1?.name).to.equal('@example/app-under-test');
    expect(packageJson2?.name).to.equal('@example/app-under-test');

    expect(statStub.withArgs(process.argv[1]).callCount).to.equal(1);
    expect(readFileStub.callCount).to.equal(1);
  });

  it('finds the package.json file if argv[1] in a nested directory', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            src: {
              nested: {
                folder: {
                  'app.js': aFile,
                  'package.json': theWrongPackageJsonContent,
                  // no sibling node_modules folder
                },
                'package.json': theWrongPackageJsonContent,
                // no sibling node_modules folder
              },
            },
            // This is the viable candidate, the other package.json files will be disregarded.
            'package.json': packageJsonContent,
            node_modules: aDirectory,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'src', 'nested', 'folder', 'app.js');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.exist;
    expect(packageJson?.name).to.equal('@example/app-under-test');
  });

  it('finds the package.json file if the app is installed into node_modules', async () => {
    createDirectoryStructure({
      path: {
        to: {
          app: {
            node_modules: {
              '@scope': {
                app: {
                  'app.js': aFile,
                  'package.json': packageJsonContent,
                  // no sibling node_modules folder, but for apps installed into node_modules that is fine
                },
                'package.json': theWrongPackageJsonContent,
                node_modules: aDirectory,
              },
              'package.json': theWrongPackageJsonContent,
              node_modules: aDirectory,
            },
            'package.json': theWrongPackageJsonContent,
          },
        },
      },
    });
    process.argv[1] = path.join(__dirname, 'path', 'to', 'app', 'node_modules', '@scope', 'app');

    const packageJson = await packageJsonUtil.readPackageJson();
    expect(packageJson).to.exist;
    expect(packageJson?.name).to.equal('@example/app-under-test');
  });

  type Structure = {
    [key: string]: Structure | typeof aDirectory | typeof aFile | typeof doesNotExist | string;
  };

  function createDirectoryStructure(structure: Structure) {
    createStructure(__dirname, structure);
  }

  function createStructure(currentPath: string, structure: Structure) {
    Object.keys(structure).forEach(name => {
      const dirEntry = structure[name];
      const p = path.join(currentPath, name);
      if (dirEntry === doesNotExist) {
        statStub.withArgs(p).throws(newENOENT(currentPath));
      } else if (dirEntry === unreadableFile) {
        statStub.withArgs(p).returns(aFile);
        readFileStub.withArgs(p).throws(newEACCESS(currentPath));
      } else if (typeof dirEntry === 'string') {
        statStub.withArgs(p).returns(aFile);
        readFileStub.withArgs(p).returns(dirEntry);
      } else if (dirEntry === aFile) {
        statStub.withArgs(p).returns(aFile);
      } else if (dirEntry === aDirectory) {
        statStub.withArgs(p).returns(aDirectory);
      } else {
        statStub.withArgs(p).returns(aDirectory);
        // @ts-expect-error this is fine
        createStructure(p, dirEntry);
      }
    });
  }
});
