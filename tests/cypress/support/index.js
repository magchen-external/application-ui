/** *****************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2020. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 ****************************************************************************** */
// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";
import "./useradd";
import "./ansibleoperator";
import "./argocdoperator";
import "./createsecret";

// import '@cypress/code-coverage/support'

// Alternatively you can use CommonJS syntax:
// require('./commands')

Cypress.Cookies.defaults({
  preserve: ["acm-access-token-cookie", "_oauth_proxy", "XSRF-TOKEN", "_csrf"]
});

before(() => {
  // Use given user to install ansible and argocd operator
  cy.ocLogin(Cypress.env("OC_CLUSTER_USER"));
  cy.installAnsibleOperator();

  // create ansible tower secret
  cy.createSecret();
  if (!Cypress.env("IS_CANARY")) {
    cy.installArgoCDOperator();
  }
  // This is needed for search to deploy RedisGraph upstream. Without this search won't be operational.
  cy
    .exec("oc get mch -A -o jsonpath='{.items[0].metadata.namespace}'")
    .then(result => {
      const installNamespace = result.stdout;
      cy
        .exec(
          `oc get srcho searchoperator -o jsonpath="{.status.deployredisgraph}" -n ${installNamespace}`,
          { failOnNonZeroExit: false }
        )
        .then(result => {
          if (result.stdout == "true") {
            cy.task("log", "Redisgraph deployment is enabled.");
          } else {
            cy.task(
              "log",
              "Redisgraph deployment disabled, enabling and waiting 60 seconds for the search-redisgraph-0 pod."
            );
            cy.exec(
              `oc set env deploy search-operator DEPLOY_REDISGRAPH="true" -n ${installNamespace}`
            );
            return cy.wait(10 * 1000);
          }
        });
    });
});

beforeEach(() => {
  if (Cypress.config().baseUrl.includes("localhost")) {
    cy.ocLogin("cluster-manager-admin");
    cy.exec("oc whoami -t", { failOnNonZeroExit: false }).then(res => {
      cy.setCookie("acm-access-token-cookie", res.stdout);
      Cypress.env("token", res.stdout);
    });
  } else {
    cy.addUserIfNotCreatedBySuite();
    cy.logInAsRole("cluster-manager-admin");
    cy.acquireToken().then(token => {
      Cypress.env("token", token);
    });
  }
});

Cypress.on("uncaught:exception", (err, runnable) => {
  debugger;
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
