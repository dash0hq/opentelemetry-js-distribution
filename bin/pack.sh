#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname ${BASH_SOURCE})"/..

rm -f dash0-opentelemetry-*.tgz
npm run build
pushd dist > /dev/null
npm pack
mv dash0-opentelemetry-*.tgz ..
popd > /dev/null

echo
echo "The package tar archive $(ls dash0-opentelemetry-*.tgz) has been created:"
tar -tf dash0-opentelemetry-*.tgz
