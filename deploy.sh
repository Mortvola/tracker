#!/bin/bash

set -e

./build.sh

rm -f build.zip;
zip -r build build;
# to-debertas build.zip


./upload.sh
