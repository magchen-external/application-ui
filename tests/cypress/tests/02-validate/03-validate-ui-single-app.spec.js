// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
import { validateTopology } from "../../views/application";
import { validateDefect7696 } from "../../views/common";
import {
  getManagedClusterName,
  getNumberOfManagedClusters
} from "../../views/resources";

const config = Cypress.env("IS_CANARY")
  ? Cypress.env("TEST_CONFIG_EXCLUDE_ARGO")
  : Cypress.env("TEST_CONFIG");

describe("Application UI: [P1][Sev1][app-lifecycle-ui] Application Validation Test for single application page, topology ", () => {
  it(`get the name of the managed OCP cluster`, () => {
    getManagedClusterName();
  });
  it(`get the number of the managed OCP clusters`, () => {
    getNumberOfManagedClusters();
  });
  for (const type in config) {
    const apps = config[type].data;
    apps.forEach(data => {
      if (data.enable) {
        it(`Verify application ${
          data.name
        } content from the single application topology - ${type}: ${
          data.name
        }`, () => {
          const numberOfRemoteClusters = Cypress.env("numberOfManagedClusters");
          const clusterName = Cypress.env("managedCluster");
          validateTopology(
            data.name,
            data,
            type,
            clusterName,
            numberOfRemoteClusters,
            "create",
            data.namespace
          );
        });
        if (data.type == "git" && type !== "argo") {
          // argocd applications does not have editor tab
          it("Verify defects 7696 and 8055", () => {
            validateDefect7696(data.name);
          });
        }
      } else {
        it(`disable validation on resource ${type}`, () => {
          cy.log(`skipping ${type} - ${data.name}`);
        });
      }
    });
  }
});
