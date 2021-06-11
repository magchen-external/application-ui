// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

/// <reference types="cypress" />
import {
  pageLoader,
  resourceTable,
  modal,
  notification,
  noResource,
  indexedCSS,
  validateSubscriptionTable,
  getSingleAppClusterTimeDetails,
  getNamespace,
  getArgoGroupKey,
  getResourceKey,
  verifyApplicationData,
  validateSubscriptionDetails,
  submitSave,
  selectTimeWindow,
  validateDeployables,
  validateRbacAlert,
  selectClusterDeployment,
  verifyYamlTemplate,
  validateSyncFunction
} from "./common";

import { channelsInformation, checkExistingUrls } from "./resources.js";

export const createApplication = (
  clusterName,
  data,
  type,
  namespace = "default"
) => {
  cy.visit("/multicloud/applications");
  // wait for create button to be enabled
  cy.get("[data-test-create-application=true]", { timeout: 50 * 1000 }).click();
  const { name, config } = data;
  namespace == "default" ? (namespace = `${name}-ns`) : namespace;
  cy.log(`Test create application ${name}`);
  cy.get(".pf-c-title").should("exist");
  cy.get("#eman", { timeout: 50 * 1000 }).type(name);
  cy.get("#emanspace", { timeout: 50 * 1000 }).type(namespace);
  if (type === "git") {
    createGit(clusterName, config);
  } else if (type === "objectstore") {
    createObj(clusterName, config);
  } else if (type === "helm") {
    createHelm(clusterName, config);
  }
  submitSave(true, name);
};

export const gitTasks = (clusterName, value, gitCss, key = 0) => {
  const {
    url,
    username,
    token,
    branch,
    path,
    commitHash,
    tag,
    timeWindow,
    deployment,
    gitReconcileOption,
    repositoryReconcileRate,
    disableAutoReconcileOption,
    insecureSkipVerifyOption
  } = value;
  cy.log(`gitTasks key=${key}, url=${url}, path=${path}`);
  const {
    gitUrl,
    gitUser,
    gitKey,
    gitBranch,
    gitPath,
    gitCommitHash,
    gitTag,
    merge,
    reconcileRate,
    disableAutoReconcile,
    insecureSkipVerify
  } = gitCss;

  cy
    .get(`#git`)
    .last()
    .scrollIntoView()
    .click()
    .trigger("mouseover");

  checkExistingUrls(gitUser, username, gitKey, token, gitUrl, url);

  if (insecureSkipVerifyOption) {
    cy.get(insecureSkipVerify).click({ force: true });
  }
  // type in branch and path
  cy.get(".bx—inline.loading", { timeout: 30 * 1000 }).should("not.exist");
  //type in branch name here instead of trying to select one
  // the git api is unreliable and we don't want to fail all git app tests
  //if the branch doesn't show up
  cy
    .get(gitBranch, { timeout: 50 * 1000 })
    .type(branch, { timeout: 50 * 1000 })
    .blur();

  cy.wait(1000);
  cy.get(".bx—inline.loading", { timeout: 30 * 1000 }).should("not.exist");
  //type in folder name here instead of trying to select one, same reason as above, for branch
  cy
    .get(gitPath, { timeout: 20 * 1000 })
    .type(path, { timeout: 30 * 1000 })
    .blur();

  commitHash &&
    cy
      .get(gitCommitHash, { timeout: 20 * 1000 })
      .type(commitHash, { timeout: 30 * 1000 })
      .blur();

  tag &&
    cy
      .get(gitTag, { timeout: 20 * 1000 })
      .type(tag, { timeout: 30 * 1000 })
      .blur();

  if (gitReconcileOption) {
    cy
      .get(merge)
      .type(gitReconcileOption)
      .blur();
  }
  if (repositoryReconcileRate) {
    cy
      .get(reconcileRate)
      .clear({ force: true })
      .type(repositoryReconcileRate, { force: true });
  }
  if (disableAutoReconcileOption) {
    cy.get(disableAutoReconcile).click({ force: true });
  }
  selectPrePostTasks(value, key);
  selectClusterDeployment(deployment, clusterName, key);
  selectTimeWindow(timeWindow, key);
};

export const createHelm = (clusterName, configs, addOperation) => {
  let helmCss = {
    helmURL: "#helmURL",
    helmUsername: "#helmUser",
    helmPassword: "#helmPassword",
    helmChartName: "#helmChartName",
    helmPackageAlias: "#helmPackageAlias",
    helmPackageVersion: "#helmPackageVersion",
    insecureSkipVerify: "#helmInsecureSkipVerify",
    reconcileRate: "#helmReconcileRate",
    disableAutoReconcile: "#helmSubReconcileRate"
  };
  if (addOperation) {
    //add new subscription to existing app
    for (const [key, value] of Object.entries(configs.new)) {
      multipleTemplate(
        clusterName,
        value,
        helmCss,
        parseInt(key) + Object.entries(configs.config).length - 1,
        helmTasks
      );
    }
  } else {
    //create application
    for (const [key, value] of Object.entries(configs)) {
      key == 0
        ? helmTasks(clusterName, value, helmCss)
        : multipleTemplate(clusterName, value, helmCss, key, helmTasks);
    }
  }
};

export const helmTasks = (clusterName, value, css, key = 0) => {
  const {
    url,
    username,
    password,
    chartName,
    packageAlias,
    packageVersion,
    timeWindow,
    deployment,
    insecureSkipVerifyOption,
    repositoryReconcileRate,
    disableAutoReconcileOption
  } = value;
  const {
    helmURL,
    helmUsername,
    helmPassword,
    helmChartName,
    helmPackageAlias,
    helmPackageVersion,
    insecureSkipVerify,
    reconcileRate,
    disableAutoReconcile
  } = css;
  cy
    .get("#helm")
    .last()
    .click()
    .trigger("mouseover");

  checkExistingUrls(
    helmUsername,
    username,
    helmPassword,
    password,
    helmURL,
    url
  );

  if (insecureSkipVerifyOption) {
    cy.get(insecureSkipVerify).click({ force: true });
  }
  cy
    .get(helmChartName, { timeout: 20 * 1000 })
    .type(chartName)
    .blur();
  packageAlias && cy.get(helmPackageAlias, { timeout: 20 * 1000 }).clear();
  packageAlias &&
    cy
      .get(helmPackageAlias, { timeout: 20 * 1000 })
      .type(packageAlias)
      .blur();

  packageVersion &&
    cy
      .get(helmPackageVersion, { timeout: 20 * 1000 })
      .type(packageVersion)
      .blur();

  if (repositoryReconcileRate) {
    cy.get(reconcileRate).type(repositoryReconcileRate, { force: true });
  }
  if (disableAutoReconcileOption) {
    cy.get(disableAutoReconcile).click({ force: true });
  }

  selectClusterDeployment(deployment, clusterName, key);
  selectTimeWindow(timeWindow, key);
};

export const createGit = (clusterName, configs, addOperation) => {
  const gitCss = {
    gitUrl: "#githubURL",
    gitUser: "#githubUser",
    gitKey: "#githubAccessId",
    gitBranch: "#githubBranch",
    gitPath: "#githubPath",
    gitCommitHash: "#gitDesiredCommit",
    gitTag: "#gitTag",
    merge: "#gitReconcileOption",
    reconcileRate: "#gitReconcileRate",
    disableAutoReconcile: "#gitSubReconcileRate",
    insecureSkipVerify: "#gitInsecureSkipVerify"
  };
  if (addOperation) {
    //add new subscription to existing app
    for (const [key, value] of Object.entries(configs.new)) {
      multipleTemplate(
        clusterName,
        value,
        gitCss,
        parseInt(key) + Object.entries(configs.config).length - 1,
        gitTasks
      );
    }
  } else {
    //create application
    for (const [key, value] of Object.entries(configs)) {
      cy.log(`About to create git with key ${key}, typeof=${typeof key}`);
      key == 0
        ? gitTasks(clusterName, value, gitCss)
        : multipleTemplate(clusterName, value, gitCss, key, gitTasks);
    }
  }
};

export const createObj = (clusterName, configs, addOperation) => {
  let objCss = {
    objUrl: "#objectstoreURL",
    objAccess: "#accessKey",
    objSecret: "#secretKey"
  };
  if (addOperation) {
    //add new subscription to existing app
    for (const [key, value] of Object.entries(configs.new)) {
      multipleTemplate(
        clusterName,
        value,
        objCss,
        parseInt(key) + Object.entries(configs.config).length - 1,
        objTasks
      );
    }
  } else {
    //create application
    for (const [key, value] of Object.entries(configs)) {
      key == 0
        ? objTasks(clusterName, value, objCss)
        : multipleTemplate(clusterName, value, objCss, key, objTasks);
    }
  }
};

export const objTasks = (clusterName, value, css, key = 0) => {
  const { url, accessKey, secretKey, timeWindow, deployment } = value;
  const { objUrl, objAccess, objSecret } = css;
  cy
    .get("#object-storage")
    .last()
    .click()
    .trigger("mouseover");

  checkExistingUrls(objAccess, accessKey, objSecret, secretKey, objUrl, url);
  selectClusterDeployment(deployment, clusterName, key);
  selectTimeWindow(timeWindow, key);
};

export const multipleTemplate = (clusterName, value, css, key, func) => {
  cy.wait(1000);
  cy.get("#add-channels").click({ force: true });
  cy
    .get(".creation-view-group-container")
    .eq(key)
    .within($content => {
      func(clusterName, value, indexedCSS(css, key), key);
    });
};

export const validateAdvancedTables = (
  name,
  data,
  type,
  numberOfRemoteClusters
) => {
  cy.log(
    `Execute validateAdvancedTables for name=${name}, data.config=${
      data.config
    }`
  );
  for (const [key, subscriptionItem] of Object.entries(data.config)) {
    const { local } = subscriptionItem.deployment;
    channelsInformation(name, key).then(({ channelName }) => {
      let resourceTypes = {
        channels: channelName, //validate channels table first to allow subscriptions time to propagate
        subscriptions: `${name}-subscription-${parseInt(key) + 1}`,
        placementrules: `${name}-placement-${parseInt(key) + 1}`
      };
      cy.log(`Validate instance-${key} with channel name ${channelName}`);
      Object.keys(resourceTypes).map(function(tableType) {
        cy.log(`Validating now the ${tableType} table for app ${name}`);
        const tableTimout = tableType == "placementrules" ? 30 : 120; // wait for subscription creation longer
        if (local && tableType == "placementrules") {
          cy.log(
            `no placementrules for app - ${name} because it has been deployed locally`
          );
        } else {
          cy.log(`Validating ${tableType} on Advanced Tables`);
          cy.visit(`/multicloud/applications/advanced?resource=${tableType}`);

          //search is not properly scrolled to view; attempt to move it lower on the page
          //by asking the terminology to show
          cy
            .get("#ApplicationDeploymentHighlightsTerminology")
            .scrollIntoView();

          resourceTable.rowShouldExist(
            resourceTypes[tableType],
            getResourceKey(
              resourceTypes[tableType],
              getNamespace(
                tableType === "channels" ? resourceTypes[tableType] : data.name
              )
            ),
            tableTimout * 1000
          );
          validateSubscriptionTable(
            resourceTypes[tableType],
            tableType,
            subscriptionItem,
            numberOfRemoteClusters,
            data
          );
        }
      });
    });
  }
};

export const verifyDetails = (name, namespace, apiVersion) => {
  cy.visit(
    `/multicloud/applications/${namespace}/${name}${
      apiVersion ? apiVersion : ""
    }`
  );
  cy.reload();
  cy
    .get(".search-query-card-loading", { timeout: 50 * 1000 })
    .should("not.exist");
  cy
    .get(".pf-l-grid__item")
    .first()
    .contains(name);
};

/*
opType = 'create' if run afer app creation step
opType = 'delete' if run afer delete subs step
opType = 'add' if run afer add subs step
*/
export const validateTopology = (
  name,
  data,
  type,
  clusterName,
  numberOfRemoteClusters,
  opType,
  namespace
) => {
  const apiVersion = `?apiVersion=${
    type === "argo" ? "argoproj.io/v1alpha1" : "app.k8s.io%2Fv1beta1"
  }`;
  if (!namespace) {
    namespace = `${name}-ns`;
  }

  verifyDetails(name, namespace, apiVersion);

  const appDetails = getSingleAppClusterTimeDetails(
    data,
    numberOfRemoteClusters,
    opType
  );
  cy.log(
    `Verify cluster deploy status on app card is ${appDetails.clusterData}`
  );

  // verify search resource
  cy
    .get("#app-search-link", { timeout: 20 * 1000 })
    .invoke("attr", "href")
    .should(
      "include",
      `search?filters={"textsearch":"kind%3Aapplication%20name%3A${name}%20namespace%3A${namespace}`
    );

  if (type === "argo") {
    validateArgoLinks(data.config);
  }

  validateSyncFunction(type, opType);

  validateSubscriptionDetails(name, data, type, opType);

  cy.get(".overview-cards-container");
  cy.get("#topologySvgId", { timeout: 50 * 1000 });
  cy.get(".layoutLoadingContainer").should("not.be.visible");
  cy.get(".pf-c-spinner", { timeout: 50 * 1000 }).should("not.be.visible", {
    timeout: 100 * 1000
  });
  // application
  cy.log("validate the application...");
  cy.get(`g[type=${name}]`, { timeout: 25 * 1000 }).should("be.visible");

  if (type !== "argo") {
    //subscription
    cy.log("validate the subscription...");
    const subsIndex = opType == "create" ? 1 : 2; //add new subs or delete subs
    cy
      .get(`g[type="${name}-subscription-${subsIndex}"]`, {
        timeout: 25 * 1000
      })
      .scrollIntoView()
      .should("be.visible");
  }

  // cluster and placement
  for (const [key, value] of Object.entries(data.config)) {
    //ignore as only one subscription exists
    if (opType !== "delete") {
      if (data.config.length > 1 || opType == "add") {
        cy.get(".channelsCombo", { timeout: 60 * 1000 }).within($channels => {
          cy.get(".pf-c-dropdown__toggle", { timeout: 20 * 1000 }).click();
          //select all subscriptions
          cy
            .get(".pf-c-dropdown__menu>li", { timeout: 20 * 1000 })
            .eq(0)
            .click();
        });

        cy
          .get(".pf-c-spinner", { timeout: 50 * 1000 })
          .should("not.be.visible", {
            timeout: 100 * 1000
          });
      }
    }
    if (opType == "delete" && key == 0) {
      //ignore first subscription on delete
    } else {
      //if opType is create, the first subscription was removed by the delete subs test, use the new config option
      validateDeployables(opType == "add" ? data.new[0] : value);
    }
  }

  if (opType == "create") {
    cy
      .get(".pf-l-grid__item", { timeout: 120 * 1000 })
      .last()
      .contains(appDetails.clusterData);
  }

  const successNumber = data.successNumber; // this needs to be set in the yaml as the number of resources that should show success for this app
  if (opType == "create" && successNumber) {
    cy.log(
      `Verify that the deployed resources number with status success is at least ${successNumber}`
    );
    cy
      .get("#green-resources", { timeout: 120 * 1000 })
      .children(".status-count")
      .invoke("text")
      .then(parseInt)
      .should("be.gte", successNumber);
  }
};

export const validatePlacementNode = (name, key) => {
  cy.log("validate the placementrule..."),
    cy
      .get(`g[type="${name}-placement-${parseInt(key) + 1}"]`, {
        timeout: 25 * 1000
      })
      .should("be.visible");
};

export const validateArgoLinks = config => {
  const { path } = config[0];
  // search all related applications
  cy
    .get("#app-search-argo-apps-link", { timeout: 20 * 1000 })
    .invoke("attr", "href")
    .should("include", path);

  // should get element launch argocd editor
  cy.get("#launch-argocd-editor", { timeout: 20 * 1000 });
};

export const validateAppTableMenu = (name, resourceTable) => {
  //validate SEARCH menu

  if (name != "ui-git") {
    // check popup actions on one app only, that's sufficient
    return;
  }
  const resourceKey = getResourceKey(name, getNamespace(name), "local-cluster");
  resourceTable.openRowMenu(name, resourceKey);
  resourceTable.menuClick("search");
  cy
    .url()
    .should(
      "include",
      `multicloud/search?filters={%22textsearch%22:%22name%3A${name}%20namespace%3A${name}-ns%20kind%3Aapplication%20apigroup%3Aapp.k8s.io%22}`
    );

  //get back to app page
  cy.visit(`/multicloud/applications`);
  cy.get(".search-query-card-loading").should("not.exist", {
    timeout: 60 * 1000
  });
  pageLoader.shouldNotExist();
  resourceTable.rowShouldExist(name, resourceKey, 120 * 1000);
  //END SEARCH menu validation

  //validate Edit menu
  resourceTable.openRowMenu(name, resourceKey);
  resourceTable.menuClick("edit");

  //get back to app page
  cy.visit(`/multicloud/applications`);
  cy.get(".search-query-card-loading").should("not.exist", {
    timeout: 60 * 1000
  });
  pageLoader.shouldNotExist();
  resourceTable.rowShouldExist(name, resourceKey, 30 * 1000);
  //END Edit menu validation

  //validate View menu
  resourceTable.openRowMenu(name, resourceKey);
  resourceTable.menuClick("view");
  cy.get(".resourceDiagramSourceContainer").should("exist", {
    timeout: 60 * 1000
  });
};

export const validateResourceTable = (
  name,
  data,
  type,
  numberOfRemoteClusters,
  namespace,
  deployedNamespace
) => {
  if (!namespace) {
    namespace = getNamespace(name);
  }
  cy.visit(`/multicloud/applications`);
  cy.get(".search-query-card-loading").should("not.exist", {
    timeout: 60 * 1000
  });
  pageLoader.shouldNotExist();
  const groupKey =
    type === "argo"
      ? getArgoGroupKey(name, namespace, "local-cluster", data)
      : null;
  const resourceKey = getResourceKey(name, namespace, "local-cluster");
  resourceTable.rowShouldExist(name, resourceKey, 60 * 1000);

  //validate content
  resourceTable.getRow(name, groupKey || resourceKey).within(() =>
    resourceTable
      .getCell("Name")
      .invoke("text")
      .should("include", name)
  );

  if (type === "argo") {
    // validate that argo icon exists
    resourceTable.getRow(type, groupKey || resourceKey).within(() =>
      resourceTable
        .getCell("Name")
        .invoke("text")
        .should("include", type)
    );
    cy.get("#expandable-toggle0").click();
  }
  resourceTable.getRow(name, resourceKey).within(() =>
    resourceTable
      .getCell("Namespace", type === "argo" ? 2 : null)
      .invoke("text")
      .should("include", type === "argo" ? deployedNamespace : namespace)
  );

  const appDetails = getSingleAppClusterTimeDetails(
    data,
    numberOfRemoteClusters,
    "create"
  );

  cy.log("Validate Cluster column");
  resourceTable.getRow(name, groupKey || resourceKey).within(() =>
    resourceTable
      .getCell("Clusters")
      .invoke("text")
      .should("contains", appDetails.clusterData)
  );

  const subscriptionLength = data.config.length;
  let repositoryText =
    data.type === "objectstore"
      ? "Object storage"
      : data.type === "helm" ? "Helm" : "Git";
  repositoryText =
    subscriptionLength > 1
      ? `${repositoryText} (${subscriptionLength})`
      : repositoryText;
  cy.log("Validate Repository column");
  resourceTable.getRow(name, groupKey || resourceKey).within(() =>
    resourceTable
      .getCell("Resource")
      .invoke("text")
      .should("eq", repositoryText)
  );

  cy.log("Validate Repository popup");
  resourceTable.getRow(name, groupKey || resourceKey).within(() =>
    resourceTable
      .getCell("Resource")
      .find(".pf-c-label")
      .click()
  );

  data.config.forEach(item => {
    let repoInfo = `${item.url}`;
    if (item.branch && item.branch.length > 0) {
      repoInfo = `${repoInfo}Branch:${item.branch}`;
    }
    if (item.path && item.path.length > 0) {
      repoInfo = `${repoInfo}Path:${item.path}`;
    }

    cy
      .get(".channel-labels-popover-content .channel-entry")
      .invoke("text")
      .should("include", repoInfo);
  });

  cy.log("Validate Window column");
  resourceTable.getRow(name, groupKey || resourceKey).within(() =>
    resourceTable
      .getCell("Time window")
      .invoke("text")
      .should("eq", appDetails.timeWindowData)
  );

  if (data.type == "git") {
    cy.log("Validate popup actions");
    //validate menu for one app only, no need to check all
    validateAppTableMenu(name, resourceTable, numberOfRemoteClusters);
  }
};

//delete application resources from advanced tables
export const deleteResourceUI = (name, type) => {
  cy.visit(`/multicloud/applications/advanced?resource=${type}`);

  let resourceTypes = {
    subscriptions: `${name}-subscription-1`,
    placementrules: `${name}-placement-1`,
    channels: "hkubernetes-chartsstoragegoogleapiscom"
  };
  cy.log(
    `Verify that resource ${resourceTypes[type]} can be deleted for app ${name}`
  );
  const resourceKey = getResourceKey(
    resourceTypes[type],
    getNamespace(type === "channels" ? resourceTypes[type] : name)
  );
  resourceTable.rowShouldExist(resourceTypes[type], resourceKey, 60 * 1000);

  resourceTable.openRowMenu(resourceTypes[type], resourceKey);
  resourceTable.menuClick("delete");
  modal.shouldBeOpen("#remove-resource-modal");
  cy.get(".pf-c-empty-state", { timeout: 100 * 1000 }).should("not.exist");
  modal.clickDanger();
  modal.shouldBeClosed("#remove-resource-modal");

  // verify success alert
  notification.shouldExist("success");

  // after deleting the app, it should not exist in the app table
  resourceTable.rowShouldNotExist(
    resourceTypes[type],
    resourceKey,
    300 * 1000,
    true
  );
};

export const deleteApplicationUI = (name, namespace = "default") => {
  namespace == "default" ? (namespace = getNamespace(name)) : namespace;
  cy.visit("/multicloud/applications");
  if (noResource.shouldNotExist()) {
    const resourceKey = getResourceKey(name, namespace, "local-cluster");
    resourceTable.rowShouldExist(name, resourceKey, 30 * 1000);

    resourceTable.openRowMenu(name, resourceKey);
    resourceTable.menuClick("delete");
    modal.shouldBeOpen("#remove-resource-modal");

    cy.get(".pf-c-empty-state", { timeout: 50 * 1000 }).should("not.exist", {
      timeout: 20 * 1000
    });

    if (!name.includes("ui-helm2")) {
      //delete all resources
      cy.log(`Verify that the app and all resources are deleted for ${name}`);
      modal.clickResources();
    }
    modal.clickDanger();
    // after deleting the app, it should not exist in the app table
    modal.shouldBeClosed("#remove-resource-modal");
    resourceTable.rowShouldNotExist(name, resourceKey, 30 * 1000, true);
  } else {
    cy.log("No apps to delete...");
  }

  if (name.includes("ui-helm2")) {
    //delete all resources from advanced table
    deleteResourceUI(name, "subscriptions");
    deleteResourceUI(name, "placementrules");
    // no existing channels
    // deleteResourceUI(name, "channels");
  }
};

export const selectPrePostTasks = (value, key) => {
  const { ansibleSecretName } = value;
  // get the name of the ansible secret from secret config
  const { name } = Cypress.env("SECRET_CONFIG").metadata;
  if (ansibleSecretName && ansibleSecretName == name) {
    key == 0
      ? (cy
          .get("#perpostsection-configure-automation-for-prehook-and-posthook")
          .click(),
        cy
          .get("#ansibleSecretName-label", { timeout: 20 * 1000 })
          .click()
          .type(name))
      : (cy
          .get(`#perpostsectiongrp${key}-set-pre-and-post-deployment-tasks`)
          .click(),
        cy
          .get(`#ansibleSecretName${key}-label`, { timeout: 20 * 1000 })
          .click()
          .type(name));
    cy.wait(1000);
    cy
      .get(".pf-c-select__menu")
      .first()
      .scrollIntoView()
      .click();
  } else {
    cy.log("PrePost SecretName not available, ignore this section");
  }
};

export const edit = (name, namespace = "default") => {
  namespace == "default" ? (namespace = getNamespace(name)) : namespace;
  cy
    .intercept({
      method: "POST", // Route all POST requests
      url: `/multicloud/applications/graphql`
    })
    .as("graphql");
  cy.visit("/multicloud/applications");
  const resourceKey = getResourceKey(name, namespace, "local-cluster");
  resourceTable.rowShouldExist(name, resourceKey, 30 * 1000);
  resourceTable.openRowMenu(name, resourceKey);
  resourceTable.menuClick("edit");
  cy.url().should("include", `/${name}`);
  // as soon as edit button is shown we can proceed
  cy.wait(["@graphql", "@graphql"], {
    timeout: 50 * 1000
  });
  cy.get("#edit-yaml", { timeout: 100 * 1000 }).click({ force: true });
};

export const editApplication = (name, data) => {
  edit(name);
  cy.log("Verify name and namespace fields are disabled");
  cy.get(".pf-c-title", { timeout: 20 * 1000 });
  cy.get(".creation-view-yaml", { timeout: 20 * 1000 });
  cy.get("#eman", { timeout: 20 * 1000 }).should("be.disabled");
  cy
    .get("#eman", { timeout: 20 * 1000 })
    .invoke("val")
    .should("eq", name);
  cy.get("#emanspace", { timeout: 20 * 1000 }).should("be.disabled");
  cy
    .get("#emanspace", { timeout: 20 * 1000 })
    .invoke("val")
    .should("eq", `${name}-ns`);
  cy.log("Verify Update button is disabled");

  modal.shouldBeDisabled();

  verifyApplicationData(name, data, "create");
};

export const deleteFirstSubscription = (name, data, namespace = "default") => {
  namespace == "default" ? (namespace = `${name}-ns`) : namespace;
  edit(name, namespace);
  if (data.config.length > 1) {
    cy.log(`Verified that ${name} has ${data.config.length} subscriptions`);
    cy.log(
      `Verify that the first subscription can be deleted for ${name} application`
    );

    cy.get(".creation-view-controls-section").within($section => {
      cy.wait(1000);
      cy
        .get(".creation-view-group-container")
        .first()
        .within($div => {
          cy
            .get(".creation-view-controls-delete-button")
            .scrollIntoView()
            .click();
        });
    });
    cy.log(
      `verify subscription can no longer be deleted for ${name} since there is only one subscription left`
    );
    cy
      .get(".creation-view-controls-delete-button", { timeout: 20 * 1000 })
      .should("not.exist");
    submitSave(true);

    //verify channel combo doesn't show up
    cy.log(
      "verify defect 7696 channel combo does not show up after one subscription is removed"
    );
    cy.get(".channelsCombo").should("not.exist");
  } else {
    cy.log(
      `verify subscription cannot be deleted for ${name} since this application has only one subscription`
    );
    cy.get(".creation-view-controls-delete-button").should("not.exist");
  }
};

export const addNewSubscription = (
  name,
  data,
  clusterName,
  namespace = "default"
) => {
  cy.log(`Verify that a new subscription can be added to ${name} application`);
  namespace == "default" ? (namespace = `${name}-ns`) : namespace;
  edit(name, namespace);

  if (data.type === "git") {
    createGit(clusterName, data, true);
  } else if (data.type === "objectstore") {
    createObj(clusterName, data, true);
  } else if (data.type === "helm") {
    createHelm(clusterName, data, true);
  }
  if (data.new[0].deployment.existing) {
    verifyYamlTemplate(`${name}-placement-1`);
  }

  submitSave(true);
};

export const verifyEditAfterDeleteSubscription = (
  name,
  data,
  namespace = "default"
) => {
  namespace == "default" ? (namespace = `${name}-ns`) : namespace;
  if (data.config.length > 1) {
    edit(name, namespace);
    cy.log(
      `Verify that after edit, ${name} application has one less subscription`
    );
    cy.get(".creation-view-controls-section").within($section => {
      cy
        .get(".creation-view-group-container")
        .should("have.length", data.config.length - 1);
    });
    cy.log(
      `verify subscription cannot be deleted for ${name} since this application has only one subscription`
    );
    cy.get(".creation-view-controls-delete-button").should("not.exist");

    verifyApplicationData(name, data, "delete");
  }
};

export const verifyEditAfterNewSubscription = (name, data) => {
  edit(name);
  cy.log(
    `Verify that after edit, ${name} application has one more subscription`
  );
  let nbOfSubscriptionsNow =
    data.config.length == 1 ? 1 : data.config.length - 1; //count for the subscription deleted by the delete subs test
  cy.get(".creation-view-controls-section").within($section => {
    cy
      .get(".creation-view-group-container")
      .should("have.length", nbOfSubscriptionsNow + 1);
  });

  verifyApplicationData(name, data, "add");
};

export const verifyInsecureSkipAfterNewSubscription = name => {
  const key = 2; // Target newly created (3rd) channel
  channelsInformation(name, key).then(({ channelNs, channelName }) => {
    cy
      .exec(`oc -n ${channelNs} get channel ${channelName} -o yaml`, {
        timeout: 20000
      })
      .its("stdout")
      .should("include", "insecureSkipVerify: true");
  });
};

export const verifyUnauthorizedApplicationDelete = (name, namespace) => {
  cy.visit("/multicloud/applications");
  const resourceKey = getResourceKey(name, namespace, "local-cluster");
  resourceTable.rowShouldExist(name, resourceKey, 30 * 1000);
  resourceTable.openRowMenu(name, resourceKey);
  resourceTable.menuClick("delete");
  validateRbacAlert();
  cy
    .get("[data-ouia-component-id=OUIA-Generated-Button-danger-1]", {
      timeout: 20 * 1000
    })
    .contains("Delete")
    .should("be.disabled");
};
