// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

const config = Cypress.env("IS_CANARY")
  ? Cypress.env("TEST_CONFIG_EXCLUDE_ARGO")
  : Cypress.env("TEST_CONFIG");
import { validateResourceTable } from "../../views/application";
import { getNumberOfManagedClusters } from "../../views/resources";

describe("Application UI: [P2][Sev2][app-lifecycle-ui] Application Validation Test for applications table", () => {
  it(`get the number of the managed OCP clusters`, () => {
    getNumberOfManagedClusters();
  });
  for (const type in config) {
    const apps = config[type].data;
    apps.forEach(data => {
      if (data.enable) {
        it(`Verify application ${
          data.name
        } info from applications table - ${type}: ${data.name}`, () => {
          const numberOfRemoteClusters = Cypress.env("numberOfManagedClusters");
          validateResourceTable(
            data.name,
            data,
            type,
            numberOfRemoteClusters,
            data.namespace,
            data.deployedNamespace
          );
        });
      } else {
        it(`disable validation on resource ${type}`, () => {
          cy.log(`skipping ${type} - ${data.name}`);
        });
      }
    });
  }
});
