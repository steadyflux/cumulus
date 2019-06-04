#!/bin/bash
set -e
. ./bamboo/abort-if-not-pr-or-redeployment.sh
. ./bamboo/abort-if-skip-integration-tests.sh
. ./bamboo/set-bamboo-env-variables.sh

if [[ $USE_NPM_PACKAGES == true ]]; then
  echo "Running package install"
  (cd example && npm install)
else
  npm install && npm run bootstrap
fi
cd example && npm test