// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

const config = Cypress.env("TEST_CONFIG_EXCLUDE_ARGO");
import { testGitApiInput } from "../../views/common";

describe("Application UI: [P3][Sev3][app-lifecycle-ui] Application Creation Validate git api Test", () => {
  if (!Cypress.env("IS_CANARY") && Cypress.env("TEST_MODE") !== "smoke") {
    //run this test only on PRs
    it(`Verify git api can access git branches`, () => {
      cy.log("Test cluster", Cypress.config().baseUrl);
      for (const type in config) {
        const apps = config[type].data;
        apps.forEach(data => {
          if (data.enable && data.new && type === "git") {
            testGitApiInput(data);
          }
        });
      }
    });
  } else {
    it("Skipping test for canary or smoke test mode", () => {
      cy.log(
        "Test is run when running full suite for PRs or against localhost"
      );
    });
  }
});
