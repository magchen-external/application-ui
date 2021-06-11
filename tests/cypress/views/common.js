// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project

/// <reference types="cypress" />
import { checkExistingUrls } from "./resources.js";

export const pageLoader = {
  shouldExist: () =>
    cy.get(".content-spinner", { timeout: 20000 }).should("exist"),
  shouldNotExist: () =>
    cy.get(".content-spinner", { timeout: 20000 }).should("not.exist")
};

export const selectDate = (date, key) => {
  date.forEach(d => {
    const { dateId } = indexedCSS(
      { dateId: d.toLowerCase().substring(0, 3) + "-timeWindow" },
      key
    );
    cy.get(`#${dateId}`, { timeout: 20 * 1000 }).click({ force: true });
  });
};

export const selectTimeWindow = (timeWindow, key = 0) => {
  if (!timeWindow) {
    cy.log("timeWindow info not available, ignore this section");
    return;
  }
  const { setting, type, date, hours } = timeWindow;
  if (setting && date) {
    cy.log(`Select TimeWindow - ${type}...`);
    const { active, blocked } = indexedCSS(
      {
        active: "#active-mode-timeWindow",
        blocked: "#blocked-mode-timeWindow"
      },
      key
    );
    const typeID = type === "blockinterval" ? blocked : active;
    cy
      .get(typeID)
      .scrollIntoView()
      .click({ force: true });
    selectDate(date, key);

    cy.get(".pf-c-select.config-timezone-combo-box").within($timezone => {
      cy.get("[type='button']").click();
      cy
        .get(".pf-c-select__menu-item:first", {
          timeout: 30 * 1000
        })
        .click();
    });

    if (hours) {
      const group = key != 0 ? `grp${key}` : "";
      hours.forEach((interval, idx) => {
        const startTime = `#start-time-${idx}-timeWindow${group}-input`;
        const endTime = `#end-time-${idx}-timeWindow${group}-input`;
        cy.get(startTime).type(interval.start);
        cy.get(endTime).type(interval.end);

        if (idx < hours.length - 1) {
          cy
            .get(".add-time-btn", { timeout: 10 * 1000 })
            .scrollIntoView()
            .click({ force: true });
        }
      });
    }

    // Check that time window mode is still selected after toggling YAML editor
    if (key == 0) {
      cy.get("#edit-yaml", { timeout: 10 * 1000 }).click({ force: true });
      cy.get("#edit-yaml", { timeout: 10 * 1000 }).click({ force: true });
      cy.get(typeID).should("be.checked");
    }
  } else {
    cy.log("leave default `active`");
  }
};

export const submitSave = (successState, redirectString) => {
  modal.shouldNotBeDisabled();
  modal.clickSubmit();
  cy
    .get("#notifications", { timeout: 5 * 1000 })
    .scrollIntoView({ offset: { top: -500, left: 0 } });

  if (successState) {
    notification.shouldExist("success");
    if (redirectString) {
      cy
        .location("pathname", { timeout: 10 * 1000 })
        .should("include", `${redirectString}`);
    }
  } else {
    notification.shouldExist("danger");
    cy.log("Verify Save button is disabled");
    modal.shouldBeDisabled();
  }
};

const getPFTableRowSelector = key =>
  `[data-ouia-component-type="PF4/TableRow"][data-ouia-component-id='${key}']`;

export const resourceTable = {
  getRow: function(name, key, timeout) {
    return cy.get(getPFTableRowSelector(key), {
      timeout: timeout || 30 * 1000
    });
  },
  getCell: function(name, index) {
    const attribute = index ? `data-key=${index}` : `data-label="${name}"`;
    return cy.get(`td[${attribute}]`, { timeout: 30 * 1000 });
  },
  rowShouldExist: function(name, key, timeout) {
    this.searchTable(name);
    this.getRow(name, key, timeout).should("exist");
  },
  rowShouldNotExist: function(name, key, timeout, disableSearch) {
    !disableSearch && this.searchTable(name);
    this.getRow(name, key, timeout).should("not.exist");
  },
  searchTable: function(name) {
    cy
      .get(".pf-c-search-input__text-input", {
        timeout: 30 * 10000
      })
      .type(name);
  },
  openRowMenu: function(name, key) {
    cy
      .get(`${getPFTableRowSelector(key)} .pf-c-dropdown__toggle`, {
        timeout: 20 * 10000
      })
      .scrollIntoView()
      .click({ force: true });
  },
  getMenuButton: function(action) {
    return cy.contains("button", action, {
      matchCase: false,
      timeout: 20 * 1000
    });
  },
  menuClick: function(action) {
    return this.getMenuButton(action).click({ force: true });
  }
};

export const noResource = {
  shouldExist: () =>
    cy
      .get(".pf-c-empty-state__content", { timeout: 20000 })
      .should("be.visible"),
  shouldNotExist: timeout =>
    cy
      .get(".pf-c-empty-state__content", {
        timeout: timeout ? timeout : 20 * 1000
      })
      .should("not.exist")
};

export const modal = {
  shouldBeOpen: modalId => cy.get(modalId, { timeout: 20000 }).should("exist"),
  shouldBeClosed: modalId =>
    cy.get(modalId, { timeout: 20000 }).should("not.exist"),
  shouldBeVisible: () =>
    cy.get("#create-button-portal-id", { timeout: 20000 }).should("be.visible"),
  shouldNotBeVisible: () =>
    cy
      .get("#create-button-portal-id", { timeout: 20000 })
      .should("not.be.visible"),
  shouldNotBeDisabled: () =>
    cy
      .get(".pf-c-button.pf-m-primary", {
        timeout: 20000
      })
      .should("not.be.disabled"),
  shouldBeDisabled: () =>
    cy
      .get(".pf-c-button.pf-m-primary", {
        timeout: 20000
      })
      .should("be.disabled"),
  clickSubmit: () =>
    cy
      .get(".pf-c-button.pf-m-primary", {
        timeout: 20000
      })
      .click({ force: true }),
  clickResources: () =>
    cy.get("#remove-app-resources", { timeout: 20000 }).click({ force: true }),
  clickDanger: () =>
    cy.get(".pf-m-danger", { timeout: 20000 }).click({ force: true }),
  clickPrimary: () =>
    cy
      .get(".pf-c-button.pf-m-primary", {
        timeout: 20 * 1000
      })
      .then($el => {
        Cypress.dom.isDetached($el); // false
      })
      .click({ force: true }),
  confirmAction: text => cy.get("#confirm-action").type(text)
};

export const notification = {
  shouldExist: type =>
    cy.get(`.pf-c-alert.pf-m-${type}`, { timeout: 10 * 1000 }).should("exist"),
  shouldNotExist: type =>
    cy
      .get(`.pf-c-alert.pf-m-${type}`, { timeout: 5 * 1000 })
      .should("not.exist")
};

export const selectClusterDeployment = (deployment, clusterName, key) => {
  cy.log(
    `Execute selectClusterDeployment with options clusterName=${clusterName} deployment=${deployment} and key=${key}`
  );
  if (deployment) {
    const { local, online, matchingLabel, existing } = deployment;
    cy.log(
      `cluster options are  local=${local} online=${online} matchingLabel=${matchingLabel} existing=${existing}`
    );
    const clusterDeploymentCss = indexedCSS(
      {
        localClusterID: "#local-cluster-checkbox",
        onlineClusterID: "#online-cluster-only-checkbox",
        uniqueClusterID: "#clusterSelector-checkbox-clusterSelector",
        existingClusterID: "#existingrule-checkbox",
        existingRuleComboID: "#placementrulecombo-label",
        labelNameID: "#labelName-0-clusterSelector",
        labelValueID: "#labelValue-0-clusterSelector"
      },
      key
    );
    const {
      localClusterID,
      onlineClusterID,
      uniqueClusterID,
      existingClusterID,
      existingRuleComboID,
      labelNameID,
      labelValueID
    } = clusterDeploymentCss;
    cy.log(
      `existingClusterID=${existingClusterID} existingRuleCombo=${existingRuleComboID} existing=${existing}`
    );
    if (existing) {
      cy.log(`Select to deploy using existing placement ${existing}`);
      cy
        .get(existingClusterID, { timeout: 50 * 1000 })
        .click({ force: true })
        .trigger("mouseover", { force: true });

      cy.get(existingRuleComboID).within($rules => {
        cy.get(".pf-c-select__toggle-button").click();
        cy
          .get(".pf-c-select__menu-item:first", {
            timeout: 30 * 1000
          })
          .click();
      });

      cy
        .get(uniqueClusterID, {
          timeout: 30 * 1000
        })
        .should("be.disabled");
      cy
        .get(labelNameID, {
          timeout: 30 * 1000
        })
        .should("be.disabled");
      cy
        .get(labelValueID, {
          timeout: 30 * 1000
        })
        .should("be.disabled");
    } else if (online) {
      cy.log("Select to deploy to all online clusters including local cluster");
      cy
        .get(onlineClusterID, { timeout: 50 * 1000 })
        .click({ force: true })
        .trigger("mouseover", { force: true });
    } else if (local) {
      cy.log("Select to deploy to local cluster only");
      cy
        .get(localClusterID, { timeout: 50 * 1000 })
        .click({ force: true })
        .trigger("mouseover", { force: true });
    } else {
      cy.log(
        "Select Deploy application resources only on clusters matching specified labels, which is the default"
      );
      cy.log(`deploying app to cluster-${clusterName}`),
        selectMatchingLabel(clusterName, key);
    }
  } else {
    throw new Error(
      "no available imported OCP clusters to deploy applications"
    );
  }
};

export const selectMatchingLabel = (cluster, key) => {
  const matchingLabelCSS = indexedCSS(
    {
      labelName: "#labelName-0-clusterSelector",
      labelValue: "#labelValue-0-clusterSelector"
    },
    key
  );
  const { labelName, labelValue } = matchingLabelCSS;
  cy
    .get(labelName)
    .scrollIntoView({ offset: { top: -100, left: 0 } })
    .type("name"),
    cy.get(labelValue).type(cluster);
};

export const verifyYamlTemplate = text => {
  cy.log(
    `Verify that the existing placement selection is updated in yaml editor upon editing an application, new value must be ${text}`
  );
  cy.get("#template-editor-search-application").type(text);
  cy
    .get(".view-lines", { timeout: 20 * 1000 })
    .invoke("text")
    .should("contains", text);
};

/*
Validate advanced configuration tables content
*/
export const validateSubscriptionTable = (
  name,
  tableType,
  sub,
  numberOfRemoteClusters,
  data
) => {
  let checkClusterColumn = true;
  let checkTimeWindowColumn = false;
  let checkResourceColumn = false;
  let singularDisplayName;

  switch (tableType) {
    case "subscriptions":
      singularDisplayName = "subscription";
      checkTimeWindowColumn = true;
      break;
    case "placementrules":
      singularDisplayName = "placement rule";
      break;
    case "channels":
      singularDisplayName = "channel";
      // will not check channel table since we can't get the aggregated number
      checkClusterColumn = false;
      checkResourceColumn = true;
      break;
  }
  cy.log(`validateSubscriptionTable tableType=${tableType}`);
  const resourceKey = getResourceKey(
    name,
    getNamespace(tableType === "channels" ? name : data.name)
  );
  resourceTable.getRow(name, resourceKey).within(() =>
    resourceTable
      .getCell("Name")
      .invoke("text")
      .should("eq", name)
  );

  let hasWindow = "";
  if (checkTimeWindowColumn > 0) {
    //validate time window for subscriptions
    cy.log("Validate Window column");

    if (sub.timeWindow && sub.timeWindow.type) {
      if (sub.timeWindow.type == "activeinterval") {
        hasWindow = "Active";
      } else if (sub.timeWindow.type == "blockinterval") {
        hasWindow = "Blocked";
      }
    }
    resourceTable.getRow(name, resourceKey).within(() =>
      resourceTable
        .getCell("Time window")
        .invoke("text")
        .should("eq", hasWindow)
    );
  }

  if (checkClusterColumn && hasWindow.length == 0) {
    //don't validate cluster count if time window is set since it might be blocked
    //validate remote cluster value
    cy.log("Validate remote cluster values");

    const { local, online, matchingLabel, existing } = sub.deployment;
    const onlineDeploy = online ? true : false;
    const remoteDeploy = matchingLabel || existing ? true : false;
    const localDeploy = local ? true : false;

    let clusterText = "None";
    if (onlineDeploy) {
      //clusterText = `${numberOfRemoteClusters} Remote, 1 Local`;
      //TODO:enable cluster number check
      clusterText = "Remote, 1 Local"; //when multiple clusters deployment is not always completed on all so for now disabling number check
    } else if (remoteDeploy && localDeploy) {
      clusterText = "1 Remote, 1 Local";
    } else if (localDeploy) {
      clusterText = "Local";
    } else if (remoteDeploy) {
      clusterText = "1 Remote";
    }
    resourceTable.getRow(name, resourceKey).within(() =>
      resourceTable
        .getCell("Clusters")
        .invoke("text")
        .should("contain", clusterText)
    );
  }

  if (checkResourceColumn) {
    cy.log("Validate Repository popup");
    resourceTable.getRow(name, resourceKey).within(() =>
      resourceTable
        .getCell("Type")
        .find(".pf-c-label")
        .click()
    );
    cy
      .get(".channel-labels-popover-content .channel-entry")
      .invoke("text")
      .should("include", sub.url);
  }

  if (data.type == "git") {
    cy.log(`Validate Menu actions for ${tableType} with name ${name}`);
    resourceTable.openRowMenu(name, resourceKey);

    resourceTable.getMenuButton(`search ${singularDisplayName}`);
    resourceTable.getMenuButton(`edit ${singularDisplayName}`);
    resourceTable.getMenuButton(`delete ${singularDisplayName}`);
  }
};

/*
Return remote clusters info and time wndow for a single app as it shows in single app table
*/
export const getSingleAppClusterTimeDetails = (
  data,
  numberOfRemoteClusters,
  opType
) => {
  let onlineDeploy = false; //deploy to all online clusters including local
  let localDeploy = false;
  let remoteDeploy = false;
  let hasWindow = "";
  let index = 0;
  data.config.forEach(item => {
    if (opType == "add" && index == 0) {
      // if this is called after add subscription stop, use the new configuration
      //the first initial item was removed on delete subs step
      item = data.new[0];
    } else if (opType == "delete" && index == 0) {
      //ignore first subscription since it was deleted
    } else {
      if (item.timeWindow) {
        hasWindow = "Yes"; // at list one window set
      }
      const { local, online, matchingLabel, existing } = item.deployment;
      onlineDeploy = onlineDeploy || online ? true : false; // if any subscription was set to online option, use that over anything else
      remoteDeploy = matchingLabel || existing ? true : remoteDeploy;
      localDeploy = local ? true : localDeploy;
    }
    index = index + 1;
  });

  let clusterText = "None";
  if (onlineDeploy) {
    //clusterText = `${numberOfRemoteClusters} Remote, 1 Local`;
    //TODO:enable cluster number check
    clusterText = "Remote, 1 Local"; //when multiple clusters deployment is not always completed on all so for now disabling number check
  } else if (remoteDeploy && localDeploy) {
    clusterText = "1 Remote, 1 Local";
  } else if (localDeploy) {
    clusterText = "Local";
  } else if (remoteDeploy) {
    clusterText = "1 Remote";
  }

  return {
    clusterData: clusterText,
    timeWindowData: hasWindow
  };
};

export const verifyApplicationData = (name, data, opType) => {
  cy.log(`Verify application settings for ${name} opType=${opType}`);
  cy.get(".creation-view-controls-section").within($section => {
    for (const [key, itemConfig] of Object.entries(data.config)) {
      let item = itemConfig;
      if (opType == "add") {
        item = key == 0 ? data.config[1] : data.new[0]; // here we assume first subscription was removed by the delete test and then added a new one
      }
      if (opType == "delete") {
        item = key == 0 ? data.config[1] : null; // here we assume first subscription was removed and not added back, so check only second subscription
      }
      if (item == null) {
        continue; //skip deleted subscription
      }

      cy
        .get(".creation-view-group-container")
        .eq(key)
        .within($div => {
          const {
            channelSectionId,
            prSectionId,
            existingRuleId,
            reconcileKey,
            commitHashKey,
            tagKey,
            matchingLabelId,
            onlineId,
            localClusterId
          } = indexedCSS(
            {
              channelSectionId: "#channel-repository-types",
              prSectionId: "#clustersection-select-clusters-to-deploy-to",
              existingRuleId: "#existingrule-checkbox",
              reconcileKey: "#gitReconcileOption",
              commitHashKey: "#gitDesiredCommit",
              tagKey: "#gitTag",
              matchingLabelId: "#clusterSelector-checkbox-clusterSelector",
              onlineId: "#online-cluster-only-checkbox",
              localClusterId: "#local-cluster-checkbox"
            },
            key
          );

          cy.get(channelSectionId).click();
          if (data.type == "git") {
            cy.log(`Verify Git reconcile option for ${name}`);
            if (!item.disableAutoReconcileOption) {
              item.gitReconcileOption &&
                cy
                  .get(reconcileKey)
                  .invoke("val")
                  .should("eq", item.gitReconcileOption);

              !item.gitReconcileOption &&
                cy
                  .get(reconcileKey)
                  .invoke("val")
                  .should("eq", "merge"); //default is merge
            } else {
              cy.log(
                `Git reconcile option for ${name} is hidden because auto-reconcilation is disabled`
              );
            }

            cy.log(`Verify Git commit hash and tag for ${name}`);
            item.commitHash &&
              cy
                .get(commitHashKey)
                .invoke("val")
                .should("eq", item.commitHash);
            item.tag &&
              cy
                .get(tagKey)
                .invoke("val")
                .should("eq", item.tag);
          }

          if (data.type == "git" || data.type == "helm") {
            const { reconcileRate, subReconcileRate } = indexedCSS(
              {
                reconcileRate: `#${data.type}ReconcileRate`,
                subReconcileRate: `#${data.type}SubReconcileRate`
              },
              key
            );

            cy.log(`Verify reconcile rate for ${name}`);
            item.repositoryReconcileRate &&
              cy
                .get(reconcileRate)
                .invoke("val")
                .should("eq", item.repositoryReconcileRate);

            !item.repositoryReconcileRate &&
              cy
                .get(reconcileRate)
                .invoke("val")
                .should("eq", "medium"); //default is medium

            cy.log(`Verify auto reconcilation option for ${name}`);
            item.disableAutoReconcileOption &&
              cy
                .get(subReconcileRate, { timeout: 20 * 1000 })
                .should("be.checked");
            !item.disableAutoReconcileOption &&
              cy
                .get(subReconcileRate, { timeout: 20 * 1000 })
                .should("not.be.checked");
          }

          const { deployment } = item;

          cy.log(`Verify Placement option for ${name}`);
          cy.get(prSectionId).click();

          cy.log(`Verify existing placement rule option should not be checked`);
          cy
            .get(existingRuleId, { timeout: 20 * 1000 })
            .should("not.be.checked");

          cy.log(
            `Verify deploy to clusters by label checkbox deployment.matchingLabel=${
              deployment.matchingLabel
            }`
          );
          (deployment.matchingLabel || deployment.existing) &&
            cy
              .get(matchingLabelId, { timeout: 20 * 1000 })
              .should("be.checked");
          !deployment.matchingLabel &&
            !deployment.existing &&
            cy
              .get(matchingLabelId, { timeout: 20 * 1000 })
              .should("not.be.checked");

          cy.log(
            `Verify deploy to all online clusters checkbox deployment.online=${
              deployment.online
            }`
          );
          deployment.online &&
            cy.get(onlineId, { timeout: 20 * 1000 }).should("be.checked");
          !deployment.online &&
            cy.get(onlineId, { timeout: 20 * 1000 }).should("not.be.checked");

          cy.log(`Verify deploy to local cluster checkbox`);
          deployment.local &&
            cy.get(localClusterId, { timeout: 20 * 1000 }).should("be.checked");
          !deployment.local &&
            cy
              .get(localClusterId, { timeout: 20 * 1000 })
              .should("not.be.checked");

          if (opType == "delete") {
            cy.log(
              "Validate existing subscription can select another placement rule, bug #7359"
            );
            cy.get(prSectionId).click(); //close the section, it will be opened again by selectClusterDeployment
            selectClusterDeployment(
              {
                existing: true,
                local: false,
                online: false,
                matchingLabel: false
              },
              "",
              0
            );
          }
        });
    }
  });

  if (opType == "delete") {
    //verify the second subscription can select placement rule 1, bug #7359
    verifyYamlTemplate(`${name}-placement-1`);
  }
};

const convertTimeFormat = time => {
  if (time !== "") {
    const hour24 = time.substring(0, 2);
    let hour12 = hour24 % 12 || 12;
    const period = hour24 < 12 ? "am" : "pm";
    return hour12 + time.substring(2) + period;
  } else {
    return "";
  }
};

export const validateSyncFunction = (type, opType) => {
  if (opType === "create") {
    if (type === "git") {
      // wait for sync button to display
      cy
        .get("#sync-app", { timeout: 50 * 1000 })
        .scrollIntoView()
        .click();
      modal.shouldBeOpen("#sync-resource-modal");
      cy.get(".pf-c-empty-state", { timeout: 100 * 1000 }).should("not.exist");
      modal.clickSubmit();
      modal.shouldBeClosed("#sync-resource-modal");
      notification.shouldExist("success");
    } else if (type === "argo") {
      cy.log(`verify sync button doesn't exist for Argo apps`);
      cy.get("#sync-app", { timeout: 10 * 1000 }).should("not.exist");
    }
  } else {
    //ignore this
    return;
  }
};

export const validateSubscriptionDetails = (name, data, type, opType) => {
  if (opType == "delete") {
    //ignore this
    return;
  }

  if (type !== "argo") {
    // as soon as details button is enabled we can proceed
    cy
      .get("[data-test-subscription-details=true]", { timeout: 50 * 1000 })
      .scrollIntoView()
      .click();
    for (const [key, itemConfig] of Object.entries(data.config)) {
      let value = itemConfig;
      if (opType == "add") {
        value = key == 0 ? data.config[1] : data.new[0]; // here we assume first subscription was removed by the delete test and then added a new one
      }

      // some subscriptions might not have time window
      const type = value.timeWindow ? value.timeWindow.type : "active"; //if not defined is always active
      cy.log(`Validate subscriptions cards for ${name} key=${key}`);

      // Get "Repository resource" info
      let repoInfo = value.url;
      if (value.branch && value.branch.length > 0) {
        repoInfo = `${repoInfo}Branch:${value.branch}`;
      }
      if (value.path && value.path.length > 0) {
        repoInfo = `${repoInfo}Path:${value.path}`;
      }

      // Get "Time window" info
      let timeWindowInfo = {};
      if (value.timeWindow) {
        timeWindowInfo["date"] = `Days of the week${value.timeWindow.date.join(
          ", "
        )}`;

        if (value.timeWindow.hours) {
          let timeRangeString = "";
          value.timeWindow.hours.forEach((range, i) => {
            timeRangeString =
              `${timeRangeString}${convertTimeFormat(
                range.start
              )} - ${convertTimeFormat(range.end)}` +
              `${i < value.timeWindow.hours.length - 1 ? ", " : ""}`;
          });
          timeWindowInfo["hours"] = `Time range${timeRangeString}`;
        }
      }
      const keywords = {
        blockinterval: "Blocked",
        activeinterval: "Active",
        active: "Set time window"
      };

      // 1. Check "Repository resource" button and popover
      cy
        .get(".overview-cards-subs-section", { timeout: 120 * 1000 })
        .children()
        .eq(key)
        .within($subcards => {
          cy.log("Validate subscription repository info");
          let repositoryText =
            data.type === "objectstore"
              ? "Object storage"
              : data.type === "helm" ? "Helm" : "Git";

          //get repository popup info
          cy
            .get(".add-right-border", { timeout: 20 * 1000 })
            .eq(1)
            .within($repo => {
              cy
                .get(".pf-c-label__content", { timeout: 120 * 1000 })
                .invoke("text")
                .should("include", repositoryText);
            });

          cy.log("Validate Repository popup");
          let repoInfo = value.url;
          if (value.branch && value.branch.length > 0) {
            repoInfo = `${repoInfo}Branch:${value.branch}`;
          }
          if (value.path && value.path.length > 0) {
            repoInfo = `${repoInfo}Path:${value.path}`;
          }
          cy
            .get(".pf-c-label")
            .first()
            .click({ force: true });
        });
      // Validate info in popover
      cy
        .get(".channel-labels-popover-content .channel-entry", {
          timeout: 20 * 1000
        })
        .invoke("text")
        .should("include", repoInfo);
      cy
        .get(".subs-icon")
        .first()
        .click(); // Close any popovers

      // 2. Check "Time window" button and popover
      cy
        .get(".overview-cards-subs-section", { timeout: 20 * 1000 })
        .children()
        .eq(key)
        .within($subcards => {
          cy.log(`Validate time window for subscription is ${keywords[type]}`);
          type == "active"
            ? cy
                .get(".set-time-window-link", { timeout: 20 * 1000 })
                .contains(keywords[type])
            : cy
                .get(".timeWindow-status-icon", { timeout: 20 * 1000 })
                .contains(keywords[type].toLowerCase());

          if (type !== "active") {
            cy.log("Validate time window popup");
            cy
              .get(".timeWindow-status-icon", { timeout: 20 * 1000 })
              .click({ force: true });
          }
        });
      // Validate info in popover
      if (type !== "active") {
        cy
          .get(".timeWindow-labels-popover-content", { timeout: 20 * 1000 })
          .invoke("text")
          .should("include", "Edit time window");
        cy
          .get(".subs-icon")
          .first()
          .click(); // Close any popovers
      }
    }
  } else {
    cy.log(
      `${name} is an argoCD application. Show subscription details should be hidden.`
    );
    cy
      .get("[data-test-subscription-details=true]", { timeout: 50 * 1000 })
      .should("not.exist");
  }
};

const saveErrorShouldNotExist = () => {
  cy.log("Verify Save errors are gone");
  cy
    .get("#notifications", { timeout: 50 * 1000 })
    .scrollIntoView({ offset: { top: -500, left: 0 } });
  notification.shouldNotExist("error", { timeout: 2 * 1000 }); //save error goes away
};

//verify https://github.com/open-cluster-management/backlog/issues/7080
export const testDefect7080 = () => {
  //click all clusters option
  cy.log("Test defect 7080 - check all online clusters option");
  cy
    .get("#online-cluster-only-checkbox", { timeout: 50 * 1000 })
    .click({ force: true });

  //click local cluster only
  cy.log("Test defect 7080 - verify local cluster option can be checked");
  cy
    .get("#local-cluster-checkbox", { timeout: 50 * 1000 })
    .click({ force: true });

  cy.log("Test defect 7080 - now go back to default option");
  cy
    .get("#local-cluster-checkbox", { timeout: 50 * 1000 })
    .click({ force: true });
};

//verify that as we select the git api, we get the branch and path information
export const testGitApiInput = data => {
  const { config } = data;
  const { url, branch, path, username, token } = config[0];
  const gitCss = {
    gitUrl: "#githubURL",
    gitUser: "#githubUser",
    gitKey: "#githubAccessId",
    gitBranch: "#githubBranch",
    gitPath: "#githubPath",
    merge: "#gitReconcileOption",
    insecureSkipVerify: "#gitInsecureSkipVerify"
  };

  const { gitUrl, gitUser, gitKey, gitBranch, gitPath } = gitCss;

  cy.visit("/multicloud/applications");
  // wait for create button to be enabled
  cy.get("[data-test-create-application=true]", { timeout: 50 * 1000 }).click();
  cy.get(".pf-c-title").should("exist");

  cy.log("Select git url");
  cy
    .get("#git", { timeout: 20 * 1000 })
    .click({ force: true })
    .trigger("mouseover");

  checkExistingUrls(gitUser, username, gitKey, token, gitUrl, url);

  // check branch and path info shows up
  cy.get(".bx—inline.loading", { timeout: 30 * 1000 }).should("not.exist");
  if (url.indexOf("github.com") >= 0) {
    cy.get(gitBranch, { timeout: 50 * 1000 }).click();
    cy.contains(".tf--list-box__menu-item", new RegExp(`^${branch}$`)).click();
  } else {
    cy.log("Nothing to test");
    cy
      .get(gitBranch, { timeout: 50 * 1000 })
      .type(branch, { timeout: 50 * 1000 })
      .blur();
  }

  cy.wait(1000);
  cy.get(".bx—inline.loading", { timeout: 30 * 1000 }).should("not.exist");
  if (url.indexOf("github.com") >= 0) {
    cy.get(gitPath, { timeout: 20 * 1000 }).click();
    cy.contains(".tf--list-box__menu-item", new RegExp(`^${path}$`)).click();
  } else {
    cy
      .get(gitPath, { timeout: 20 * 1000 })
      .type(path, { timeout: 30 * 1000 })
      .blur();
  }
};

export const testInvalidApplicationInput = () => {
  const validURL = "http://a.com";
  const invalidValue = "INVALID VALUE";
  const validValue = "default";

  cy.visit("/multicloud/applications");
  // wait for create button to be enabled
  cy.get("[data-test-create-application=true]", { timeout: 50 * 1000 }).click();
  cy.get(".pf-c-title").should("exist");

  //enter a valid ns
  cy
    .get("#emanspace", { timeout: 50 * 1000 })
    .click()
    .clear()
    .type("default")
    .blur();

  cy.log("Test invalid name");
  cy.get("#eman", { timeout: 50 * 1000 }).type(invalidValue);
  cy.get("#eman-helper").should("exist");

  submitSave(false); //test save error

  cy
    .get("#eman", { timeout: 50 * 1000 })
    .clear()
    .type(validValue);
  cy.get("#eman-helper").should("not.exist");
  saveErrorShouldNotExist(); //save error goes away

  cy.log("Test invalid namespace");
  cy
    .get("#emanspace", { timeout: 50 * 1000 })
    .type(invalidValue)
    .blur();
  cy.get("#emanspace-helper").should("exist");
  submitSave(false); //test save error

  cy
    .get("#emanspace", { timeout: 50 * 1000 })
    .click()
    .clear()
    .type("default")
    .blur();
  cy.get("#emanspace-helper").should("not.exist");
  saveErrorShouldNotExist(); //save error goes away

  cy.log("Test invalid git url");
  cy
    .get("#git", { timeout: 20 * 1000 })
    .click({ force: true })
    .trigger("mouseover");

  cy
    .get("#githubURL", { timeout: 20 * 1000 })
    .scrollIntoView()
    .type(invalidValue)
    .blur();

  testDefect7080();

  //enter a valid deployment value
  cy
    .get("#labelName-0-clusterSelector")
    .scrollIntoView()
    .type("label");
  cy.get("#labelValue-0-clusterSelector").type("value");

  cy.get("#githubURL-helper").should("exist");
  cy.wait(1000);
  submitSave(false); //test save error

  cy
    .get("#githubURL", { timeout: 20 * 1000 })
    .click()
    .clear()
    .type(validURL)
    .blur();
  cy.get("#githubURL-helper").should("not.exist");
  saveErrorShouldNotExist(); //save error goes away

  cy
    .get("#githubBranch", { timeout: 20 * 1000 })
    .trigger("mouseover")
    .type(invalidValue)
    .blur();
  cy.get("#githubBranch-helper").should("exist");
  cy.wait(2000);

  cy
    .get("#githubBranch", { timeout: 20 * 1000 })
    .trigger("mouseover")
    .type(validValue)
    .blur();
  cy.get("#githubBranch-helper").should("not.exist");
  saveErrorShouldNotExist(); //save error goes away
  cy.wait(2000);

  cy.log("Test invalid HELM url");
  cy
    .get("#git")
    .last()
    .click()
    .trigger("mouseover");

  cy
    .get("#helm")
    .last()
    .click()
    .trigger("mouseover");

  cy
    .get("#helmURL", { timeout: 20 * 1000 })
    .type(invalidValue)
    .blur();
  //enter a valid deployment value and a chart name
  cy
    .get("#labelName-0-clusterSelector")
    .scrollIntoView()
    .type("label");
  cy.get("#labelValue-0-clusterSelector").type("value");
  cy.get("#helmChartName").type("chartName");

  cy.get("#helmURL-helper").should("exist");
  cy.wait(1000);
  submitSave(false); //test save error

  cy
    .get("#helmURL", { timeout: 20 * 1000 })
    .click()
    .clear()
    .type(validURL)
    .blur();
  cy.get("#helmURL-helper").should("not.exist");
  saveErrorShouldNotExist(); //save error goes away

  cy.log("Test invalid object store url");
  cy
    .get("#helm")
    .click()
    .trigger("mouseover");
  cy
    .get("#object-storage")
    .click()
    .trigger("mouseover");

  cy
    .get("#objectstoreURL", { timeout: 20 * 1000 })
    .type(invalidValue)
    .blur();
  //enter a valid deployment value
  cy
    .get("#labelName-0-clusterSelector")
    .scrollIntoView()
    .type("label");
  cy.get("#labelValue-0-clusterSelector").type("value");

  cy.get("#objectstoreURL-helper").should("exist");
  cy.wait(1000);
  submitSave(false); //test save error

  cy
    .get("#objectstoreURL", { timeout: 20 * 1000 })
    .click()
    .clear()
    .type(validURL)
    .blur();
  cy.get("#objectstoreURL-helper").should("not.exist");
  saveErrorShouldNotExist(); //save error goes away

  cy.log("Test invalid time window");
  const timeWindow = {
    type: "activeinterval",
    setting: true,
    date: []
  };
  selectTimeWindow(timeWindow, 0);
  submitSave(false); //test error
};

// Calculates unique CSS selectors based on index
// Always returns a new object to avoid side-effects
export const indexedCSS = (cssMap, index) =>
  index != 0
    ? Object.keys(cssMap).reduce((result, key) => {
        let selector;
        switch (cssMap[key]) {
          case "#clustersection-select-clusters-to-deploy-to":
            selector = `#clustersectiongrp${index}-select-clusters-to-deploy-to`;
            break;
          case "#channel-repository-types":
            selector = `#channelgrp${index}-repository-types`;
            break;
          case "#placementrulecombo-label":
            selector = `#placementrulecombogrp${index}-label`;
            break;
          default:
            selector = `${cssMap[key]}grp${index}`;
            break;
        }
        result[key] = selector;
        return result;
      }, {})
    : cssMap;

export const getNamespace = name => {
  return `${name}-ns`;
};

export const getArgoGroupKey = (name, namespace, cluster, data) => {
  if (data.applicationSet) {
    return JSON.stringify({
      applicationSet: data.applicationSet,
      namespace,
      cluster
    });
  } else if (data.groupedByResource) {
    const config = data.config[0];
    return JSON.stringify({
      repoURL: config.url,
      path: config.path,
      chart: null,
      targetRevision: config.branch || "HEAD"
    });
  }
  return null;
};

export const getResourceKey = (name, namespace, cluster) =>
  (cluster ? `${cluster}/` : "") + `${namespace}/${name}`;

//validate all deployed nodes show up in the app topo
export const validateDeployables = data => {
  if (data.resources) {
    cy.log(`validate deployables list ${data.resources}...`),
      data.resources.forEach(resourceType => {
        cy.log(
          `validate deployable with type ${resourceType} exists in app topology`
        ),
          cy.get(`#diagramShapes_${resourceType}`).should("exist");
      });
  }
};

export const validateRbacAlert = () => {
  const alertMessage =
    "Danger alert:You are not authorized to complete this action. See " +
    "your cluster administrator for role-based " +
    "access control information.";
  cy
    .get(".pf-c-alert__title", { timeout: 20 * 1000 })
    .invoke("text")
    .should("eq", alertMessage);
};

export const validateDefect7696 = name => {
  cy.log(
    "verify defect 7696 - resources still show in topology view after moving from Editor tab to Overview"
  );
  cy.visit(`/multicloud/applications/${name}-ns/${name}`);
  cy.reload();
  cy
    .get(".search-query-card-loading", { timeout: 50 * 1000 })
    .should("not.exist");
  cy
    .get(".pf-l-grid__item")
    .first()
    .contains(name);

  cy.log("Select Editor tab");
  cy
    .get(".pf-c-page__main-nav .pf-c-nav__list .pf-c-nav__item:nth-child(2)", {
      timeout: 20 * 1000
    })
    .click();

  cy.log(
    "Verify defect 8055 - Temptifly 0.1.15 no longer shows yaml toggler for app-ui"
  );

  cy
    .intercept({
      method: "POST", // Route all POST requests
      url: `/multicloud/applications/graphql`
    })
    .as("graphql");
  // as soon as edit button is shown we can proceed
  cy.wait(["@graphql", "@graphql"], {
    timeout: 50 * 1000
  });

  cy.get("#edit-button-portal-id", { timeout: 20 * 1000 }).should("be.visible");

  cy.log("show YAML");
  cy.get("#edit-yaml", { timeout: 2 * 1000 }).should("not.be.checked");
  cy.get("#edit-yaml", { timeout: 2 * 1000 }).click({ force: true });
  cy.get("#edit-yaml", { timeout: 2 * 1000 }).should("be.checked");

  cy.log("Verify YAML shows deployable annotations");
  cy.get(".yamlEditorContainer", { timeout: 5 * 1000 }).should("be.visible");

  cy.log(
    "move back to topology view and check resources still show up - defect 7696"
  );
  cy
    .get(".pf-c-page__main-nav .pf-c-nav__list .pf-c-nav__item:nth-child(1)", {
      timeout: 20 * 1000
    })
    .click();

  cy.log("Verify deployables show up");
  cy.get("#diagramShapes_pod", { timeout: 30 * 1000 }).should("exist");
};
