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

/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */

const _ = require("lodash");
const fs = require("fs");
const yaml = require("js-yaml");
const dir = "./cypress/test-artifacts/";
const testConfig = require("../config").getConfig().config;
const secretConfig = require("../config").getConfig().secretConfig;
const kubeConfig = require("../config").getKubeConfig();
const getUsers = require("../config").getUsers();
const rbacConfig = require("../config").getrbacConfig();

module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  // require('@cypress/code-coverage/task')(on, config)
  // config.env.TEST_CONFIG = testConfig
  require("cypress-log-to-output").install(on);

  on("task", {
    log(message) {
      console.log(message);

      return null;
    }
  });

  on("task", {
    yaml2json(filename) {
      obj = yaml.safeLoadAll(fs.readFileSync(dir + filename, "utf-8"));
      return JSON.stringify(obj, null, 2);
    }
  });

  on("task", {
    readFile(file) {
      let content = fs.readFileSync(dir + file, "utf8");
      return content;
    }
  });

  on("task", {
    getFileList(str) {
      var list = [];
      fs.readdirSync(dir).forEach(file => {
        if (file.includes(str)) {
          list.push(file);
        }
      });
      return list.sort();
    }
  });

  on("task", {
    getResourceMetadataInFile(filename) {
      const kinds = ["channel", "subscription", "placementrule", "application"];
      var data = fs.readFileSync(dir + filename, "utf8");
      const meta = {};
      let file = yaml.safeLoadAll(data, "utf8");
      file.forEach(el => {
        if (kinds.indexOf(el.kind.toLowerCase()) > -1) {
          //In the array!
          meta.kind = el.kind;
          meta.name = el.metadata.name;
          meta.namespace = el.metadata.namespace;
        }
      });
      return meta;
    }
  });

  on("task", {
    readFileMaybe(filename) {
      if (fs.existsSync(filename)) {
        return fs.readFileSync(filename, "utf8");
      }
      return false;
    }
  });

  if (config.env.TEST_MODE === "functional") config.videoUploadOnPasses = false; // disable video compression for passing spec files

  config.env.TEST_CONFIG = JSON.parse(testConfig);
  config.env.TEST_CONFIG_EXCLUDE_ARGO = _.pickBy(
    JSON.parse(testConfig),
    function(value, key) {
      return !_.startsWith(key, "argo");
    }
  );
  config.env.SECRET_CONFIG = JSON.parse(secretConfig);
  config.env.KUBE_CONFIG = kubeConfig;
  config.env.USER_CONFIG = getUsers;
  config.env.RBAC_CONFIG = JSON.parse(rbacConfig);

  config.env.IS_CANARY = !(
    config.baseUrl.includes("localhost") || config.env.PROW
  )
    ? "true"
    : "";

  return config;
};
