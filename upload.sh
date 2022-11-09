#!/bin/bash

set -e

scp -i ~/.ssh/tracker.pem build.zip ubuntu@${TRACKER_SERVER}:

