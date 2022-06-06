#!/bin/bash

set -e

./build.sh

rm -f build.zip;
zip -r build build;
# to-debertas build.zip

scp -i ~/.ssh/tracker.pem build.zip ubuntu@ec2-34-216-196-172.us-west-2.compute.amazonaws.com:
