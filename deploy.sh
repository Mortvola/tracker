#!/bin/bash

set -e

./build.sh

rm -f build.zip;
zip -r build build;

./upload.sh
