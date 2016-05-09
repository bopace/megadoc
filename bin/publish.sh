#!/usr/bin/env bash

# Publish a package to NPM.
#
# Usage:
#
#     $0 PACKAGE
#
# Environment variables:
#
#   - PACKAGE: the package, in case $1 is not passed

[ -f "./package.json" ] && grep '"name": "tinydoc"' ./package.json &> /dev/null || {
  echo "$0: Must be run from tinydoc root.";
  exit 1
}

source "bin/_helpers.sh"

if [ -z $PACKAGE ]; then
  if [ $# -gt 0 ]; then
    PACKAGE=$1
    shift
  fi

  if [ -z $PACKAGE ]; then
    echo "Usage: $0 PACKAGE"
    exit 1
  fi
fi

PACKAGE_NAME="${PACKAGE}"
PACKAGE_ROOT="packages/${PACKAGE_NAME}"

if [ ! -d "${PACKAGE_ROOT}" ]; then
  PACKAGE_NAME="tinydoc-plugin-${PACKAGE}"
  PACKAGE_ROOT="packages/${PACKAGE_NAME}"

  if [ ! -d "${PACKAGE_ROOT}" ]; then
    echo "${PACKAGE_NAME} is not a valid tinydoc plugin package."
    exit 1
  fi
fi

function verify_dependency_versions {
  TINYDOC_VERSION=$(read_package_version package.json | cut -d'.' -f1)
  PACKAGE_VERSION=$(read_package_version $PACKAGE_ROOT/package.json | cut -d'.' -f1)
  TINYDOC_DEP_VERSION=$(read_peer_dependency_version $PACKAGE_ROOT/package.json "tinydoc" | cut -d'.' -f1)

  if [ $TINYDOC_DEP_VERSION != $PACKAGE_VERSION ]; then
    echo "
Package major version seems to be '${PACKAGE_VERSION}' while the version
of tinydoc specified as a peerDependency is '${TINYDOC_VERSION}'.

Optimally, we want major versions to be consistent between the packages
and the tinydoc peerDependency they specify.
    "

    return 1
  fi

  if [ $TINYDOC_VERSION != $TINYDOC_DEP_VERSION ]; then
    echo "
Peer dependency mismatch: package depends on tinydoc v${TINYDOC_DEP_VERSION}
but tinydoc is currently version v${TINYDOC_VERSION}.
    "

    return 1
  fi
}

function build_package {
  ./bin/prepublish.sh $PACKAGE
}

function publish_package {
  (cd $PACKAGE_ROOT; npm publish)
}

echo "Preparing \"${PACKAGE_NAME}\" for publishing... hang on tight."
echo "---------------------------------------------------------------"

run_task verify_dependency_versions

run_task build_package
run_task publish_package

echo "Package \"${PACKAGE_NAME}\" has been published!"
echo "---------------------------------------------------------------"