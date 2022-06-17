#!/bin/bash

set -e

scp -i ~/.ssh/tracker.pem build.zip ubuntu@ec2-34-216-196-172.us-west-2.compute.amazonaws.com:

