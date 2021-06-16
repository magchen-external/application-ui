#!/bin/bash
###############################################################################
# (c) Copyright IBM Corporation 2019, 2020. All Rights Reserved.
# Note to U.S. Government Users Restricted Rights:
# U.S. Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule
# Contract with IBM Corp.
# Licensed Materials - Property of IBM
###############################################################################
# Copyright (c) 2021 Red Hat, Inc.
# Copyright Contributors to the Open Cluster Management project
set -e

UI_CURRENT_IMAGE=$1

function fold_start() {
  echo -e "travis_fold:start:$1\033[33;1m$2\033[0m"
}

function fold_end() {
  echo -e "\ntravis_fold:end:$1\r"
}

###############################################################################
# Install oc and Cluster Keeper
###############################################################################
fold_start install-tools "Install oc and Cluster Keeper"

echo "Running oc/install..."
make oc/install
echo "Cloning Cluster Keeper"
git clone https://github.com/open-cluster-management/cluster-keeper.git
pushd cluster-keeper
cat > user.env << EOF
CLUSTERPOOL_CLUSTER=$CLUSTERPOOL_CLUSTER
CLUSTERPOOL_TARGET_NAMESPACE=$CLUSTERPOOL_TARGET_NAMESPACE
CLUSTERCLAIM_GROUP_NAME=$CLUSTERCLAIM_GROUP_NAME
EOF
export PATH=${PATH}:$(pwd)
popd

fold_end install-tools

###############################################################################
# ClusterPool Lock
###############################################################################
fold_start cp-lock "ClusterPool Lock"

LOCK_ID="travis-${TRAVIS_JOB_ID}"
oc login --token $CLUSTERPOOL_TOKEN $CLUSTERPOOL_CLUSTER --insecure-skip-tls-verify
ck lock -i $LOCK_ID $CLUSTERPOOL_HUB_TEST
ck lock -i $LOCK_ID $CLUSTERPOOL_MANAGED_TEST
ck run -f $CLUSTERPOOL_HUB_TEST     # Resume hub if needed
ck use -f $CLUSTERPOOL_MANAGED_TEST # Resume and wait for managed to be ready
ck use -f $CLUSTERPOOL_HUB_TEST     # Wait for hub to be ready

fold_end cp-lock

###############################################################################
# Test Setup
###############################################################################
fold_start test-setup "Test Setup"

HUB_CREDS=$(ck creds -c $CLUSTERPOOL_HUB_TEST)
export OC_CLUSTER_URL=$(echo $HUB_CREDS | jq -r '.api_url')
export OC_CLUSTER_USER=$(echo $HUB_CREDS | jq -r '.username')
export OC_CLUSTER_PASS=$(echo $HUB_CREDS | jq -r '.password')

# Workaround for "error: x509: certificate signed by unknown authority" problem with oc login
mkdir -p ${HOME}/certificates
OAUTH_POD=$(oc -n openshift-authentication get pods -o jsonpath='{.items[0].metadata.name}')
export OC_CLUSTER_INGRESS_CA=/certificates/ingress-ca.crt
oc rsh -n openshift-authentication $OAUTH_POD cat /run/secrets/kubernetes.io/serviceaccount/ca.crt > ${HOME}${OC_CLUSTER_INGRESS_CA}

MANAGED_CREDS=$(ck creds -f $CLUSTERPOOL_MANAGED_TEST)
export CYPRESS_MANAGED_OCP_URL=$(echo $MANAGED_CREDS | jq -r '.api_url')
export CYPRESS_MANAGED_OCP_USER=$(echo $MANAGED_CREDS | jq -r '.username')
export CYPRESS_MANAGED_OCP_PASS=$(echo $MANAGED_CREDS | jq -r '.password')

echo "Running docker network create..."
docker network create --subnet 10.10.0.0/16 test-network

echo "Running pull-test-image..."
make pull-test-image

# Set up HTTPS
mkdir -p sslcert
echo "$SERVER_KEY" > sslcert/server.key
echo "$SERVER_CRT" > sslcert/server.crt
export CYPRESS_BASE_URL=https://localhost:3001

# Use setup script to set variables
. ./setup-env.sh > /dev/null

docker run --network test-network -d --ip 10.10.0.6 -t -i -p 3001:3001 --name application-ui \
-v $(pwd)/sslcert/:/sslcert/ \
-e serverKey=/sslcert/server.key \
-e serverCert=/sslcert/server.crt \
-e NODE_ENV=development \
-e headerUrl=$headerUrl \
-e hcmUiApiUrl=$hcmUiApiUrl \
-e searchApiUrl=$searchApiUrl \
-e API_SERVER_URL=$API_SERVER_URL \
-e SERVICEACCT_TOKEN=$SERVICEACCT_TOKEN \
-e OAUTH2_REDIRECT_URL=$OAUTH2_REDIRECT_URL \
-e OAUTH2_CLIENT_ID=$OAUTH2_CLIENT_ID \
-e OAUTH2_CLIENT_SECRET=$OAUTH2_CLIENT_SECRET \
$UI_CURRENT_IMAGE

docker container ls -a

fold_end test-setup

###############################################################################
# Functional Tests
###############################################################################
fold_start cypress "Functional Tests"
set +e
make run-test-image-pr
RC=$?
set -e
fold_end cypress

###############################################################################
# ClusterPool Unlock
###############################################################################
fold_start cp-unlock "ClusterPool Unlock"
ck unlock -i $LOCK_ID $CLUSTERPOOL_HUB_TEST
ck unlock -i $LOCK_ID $CLUSTERPOOL_MANAGED_TEST

SLEEP_ON_DAY=6 # Saturday and Sunday
SLEEP_BEFORE=7 # 7 am
SLEEP_AFTER=18 # 6 pm

export TZ=America/Toronto
currentDay=$(date "+%u")
currentHour=$(date "+%k")

echo Day: $currentDay Hour: $currentHour
if [[ $currentDay -ge $SLEEP_ON_DAY || $currentHour -lt $SLEEP_BEFORE || $currentHour -ge $SLEEP_AFTER ]]
then
  echo Attempting to hibernate clusters
  # Attempt to hibernate; do not force and ignore error in case still locked by others
  set +e
  ck hibernate $CLUSTERPOOL_MANAGED_TEST
  ck hibernate $CLUSTERPOOL_HUB_TEST
  set -e
fi

fold_end cp-unlock

exit $RC
