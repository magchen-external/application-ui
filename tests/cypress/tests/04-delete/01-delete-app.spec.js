// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

const config = Cypress.env("TEST_CONFIG_EXCLUDE_ARGO");
import { deleteApplicationUI } from "../../views/application";
import {
  channelsInformation,
  deleteChannel,
  deleteNamespaceHub
} from "../../views/resources";

describe("Application UI: [P1][Sev1][app-lifecycle-ui] Delete application Test", () => {
  if (!Cypress.env("IS_CANARY")) {
    for (const type in config) {
      const apps = config[type].data;
      apps.forEach(data => {
        if (data.enable) {
          if (data.new && (type === "git" || type === "helm")) {
            it(`Try to delete channel with insecureSkipVerify option for application ${
              data.name
            }`, () => {
              const key = 2; // our tests use the invalidate option on add new subscription, which has index 2
              const name = data.name;
              cy.log(`DATA ${name}`);
              channelsInformation(name, key).then(
                ({ channelNs, channelName }) => {
                  cy.log(`CHANNEL ${channelName}, ${channelNs}`);
                  if (channelName.indexOf("insecureskipverifyoption") != -1) {
                    cy.log(
                      `delete channel ${channelName} ns:  ${channelNs}, set for insecureSkipVerifyOption test `
                    );
                    deleteChannel(channelName, channelNs);

                    cy.log(
                      `Delete insecureSkipVerify channel namespace, ${channelNs}`
                    );
                    deleteNamespaceHub(data, channelName, type);
                  }
                }
              );
            });
          }
          it(`Verify application ${data.name} is deleted from UI`, () => {
            deleteApplicationUI(data.name);
          });
        } else {
          it(`Verify disable deletion on resource ${data.name} ${type}`, () => {
            cy.log(`skipping ${type} - ${data.name}`);
          });
        }
      });
    }
  } else {
    it("Skipping delete resources test if running canary", () => {});
  }
});
