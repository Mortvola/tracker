#!/bin/bash

set -e

scp -i ~/.ssh/tracker.pem build.zip ubuntu@ec2-52-12-234-64.us-west-2.compute.amazonaws.com:

