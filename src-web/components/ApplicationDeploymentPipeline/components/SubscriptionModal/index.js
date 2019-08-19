/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2019. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

import React from 'react'
import msgs from '../../../../../nls/platform.properties'
import { withLocale } from '../../../../providers/LocaleProvider'
import resources from '../../../../../lib/shared/resources'
import { RESOURCE_TYPES } from '../../../../../lib/shared/constants'
import { Icon, Modal } from 'carbon-components-react'
import R from 'ramda'
import { getLabelsListClass } from './utils.js'

resources(() => {
  require('./style.scss')
})

//TODO: could add this to a utils.js
const getChannelStatusClass = status => {
  return (
    (status === 'success' && 'statusTagCompleted') ||
    (status === 'failed' && 'statusTagFailed') ||
    (status === 'inprogress' && 'statusTagInProgress') ||
    (true && 'statusTag')
  )
}

const DeploymentStatus = withLocale(
  ({
    deploymentTime = '2019-07-05T09:50:56Z',
    failedTime = '2019-07-05T10:20:56Z',
    deployments = ['d1', 'd2', 'd3', 'd4'],
    clusters = ['c1', 'c2', 'c3', 'c4'],
    percent = '50%',
    status = 'failed', // show if not 'success'
    locale
  }) => {
    // don't show block if it is successful
    if (status == 'success') return null

    return (
      <React.Fragment>
        <div className="deploymentStatusClass">
          <div className="innerContentBox">
            <div className="subHeader">
              <div className="deploymentStatusHeader">
                {msgs.get('description.Modal.deploymentStatus', locale)}
              </div>
              <span className={getChannelStatusClass(status)}>{status}</span>
            </div>
            <div className="deploymentProgress">
              {status == 'inprogress' && percent ? percent : ''}
            </div>
            <div className="deploymentStatusTime">
              {(status == 'failed' || status == 'inprogress') && deploymentTime
                ? msgs.get('description.Modal.deployedAt', locale) +
                  ' ' +
                  deploymentTime +
                  ' '
                : ''}
              {status == 'failed' && failedTime
                ? msgs.get('description.Modal.failedAt', locale) +
                  ' ' +
                  failedTime
                : ''}
            </div>
            <div>{deployments}</div>
          </div>
        </div>
        <div className="targetClustersClass">
          <div className="innerContentBox">
            <div className="subHeader">
              <div className="deploymentStatusHeader">
                {msgs.get('description.Modal.targetClusters', locale)}
              </div>
              <div>{clusters}</div>
            </div>
          </div>
        </div>
      </React.Fragment>
    )
  }
)

const ChannelInfo = withLocale(
  ({
    conditions = [
      { name: 'condition1', success: true },
      { name: 'condition2', success: false },
      { name: 'condition3', success: true }
    ],
    subscriptionModalSubscriptionInfo,
    success = true,
    locale
  }) => {
    const channel = subscriptionModalSubscriptionInfo.channel || ''
    return (
      <div className="channelInfoClass">
        <div className="subHeader">
          <div className="channelHeader">
            {msgs.get('description.Modal.channel', locale)}
          </div>
          {channel}
        </div>
        <div className="innerContent">
          <div className="conditions">
            <div>
              <div className="conditionStatus">
                {msgs.get('description.Modal.conditions', locale)}
                <span className="conditionStatus">
                  {(success &&
                    msgs.get('description.Modal.conditionsMet', locale)) ||
                    msgs.get('description.Modal.conditionsNotMet', locale)}
                </span>
              </div>
            </div>

            <div className="valueGroup">
              {conditions != null && conditions.length > 0
                ? conditions.map(condition => {
                  return (
                    <div className="valueGroupItem" key={Math.random()}>
                      <Icon
                        name="icon--user"
                        fill="#6c7b85"
                        description=""
                        className="icon"
                      />
                      {condition.name}

                      {condition.success ? (
                        <Icon
                          name="icon--checkmark--solid"
                          fill="#37a900"
                          description=""
                          className="icon"
                        />
                      ) : (
                        <Icon
                          name="icon--error--glyph"
                          fill="#6c7b85"
                          description=""
                          className="icon"
                        />
                      )}
                    </div>
                  )
                })
                : 'None' +
                  (
                    <Icon
                      name="icon--checkmark--solid"
                      fill="#37a900"
                      description=""
                      className="icon"
                    />
                  )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

const SubscriptionInfo = withLocale(
  ({
    versions = 'version2',
    rollingUpdate = '50%',
    modalSubscription,
    editSubscription,
    subscriptionModalSubscriptionInfo,
    locale
  }) => {
    // If there is currently noDeployableSubscription then we want to add rather
    // than edit
    const noDeployableSubscription = R.isEmpty(
      subscriptionModalSubscriptionInfo
    )

    let clusters = []
    let labels = []
    let subName = ''
    let subNamespace = ''
    let label_hover = ''

    if (!noDeployableSubscription) {
      labels = R.split(
        ';',
        R.pathOr('', ['label'], subscriptionModalSubscriptionInfo)
      )
      clusters = R.split(
        ';',
        R.pathOr('', ['cluster'], subscriptionModalSubscriptionInfo)
      )

      const labels_data = getLabelsListClass(labels)
      labels = labels_data.data
      label_hover = labels_data.hover

      subName = subscriptionModalSubscriptionInfo.name || ''
      subNamespace = subscriptionModalSubscriptionInfo.namespace || ''
    }
    return (
      <div className="subscriptionInfoClass">
        <div className="subHeader">
          <div className="subscriptionInfoHeader">
            {msgs.get('description.Modal.SubscriptionInfo', locale)}
          </div>
          {subName}
        </div>
        <div className="subHeader">
          <div className="subscriptionInfoHeader">
            {msgs.get('description.Modal.SubscriptionNamespace', locale)}
          </div>
          {subNamespace}
        </div>
        <div className="innerContent">
          <div className="placement">
            <div>
              <div className="label">
                {msgs.get('description.Modal.placement', locale)}
              </div>
            </div>
            <div>
              <div className="label-indented">
                {msgs.get('description.Modal.clusters', locale)}
              </div>
              <div className="value">{clusters}</div>
            </div>
            <div>
              <div className="label-indented">
                {msgs.get('description.Modal.label', locale)}
              </div>
              <div className="value">
                {' '}
                {labels.map(label => {
                  return (
                    <span
                      className="labelTag"
                      key={Math.random()}
                      tooltip={label_hover}
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="versions">
            <div>
              <div className="label">
                {msgs.get('description.Modal.versions', locale)}
              </div>
              <div className="value">{versions}</div>
            </div>
          </div>
          <div className="update">
            <div>
              <div className="label">
                {msgs.get('description.Modal.update', locale)}
              </div>
              <div className="value">{rollingUpdate}</div>
            </div>
          </div>
          {noDeployableSubscription ? (
            <div className="addSubscriptionButton">{[modalSubscription]}</div>
          ) : (
            <button
              className="editSubscriptionButton"
              onClick={() =>
                editSubscription(
                  RESOURCE_TYPES.HCM_SUBSCRIPTIONS,
                  subscriptionModalSubscriptionInfo
                )
              }
            />
          )}
        </div>
      </div>
    )
  }
)

const SubscriptionModal = withLocale(
  ({
    displayModal,
    closeModal,
    header,
    label,
    modalSubscription,
    editSubscription,
    subscriptionModalSubscriptionInfo,
    locale
  }) => {
    return (
      <div id="SubscriptionModal">
        <Modal
          className="modalAddRepo"
          onRequestClose={() => closeModal()}
          onRequestSubmit={() => closeModal()}
          open={displayModal}
          modalHeading={header}
          modalLabel={label}
          primaryButtonText={msgs.get('actions.close', locale)}
        >
          <div className="channelGridContainer">
            <SubscriptionInfo
              modalSubscription={modalSubscription}
              editSubscription={editSubscription}
              subscriptionModalSubscriptionInfo={
                subscriptionModalSubscriptionInfo
              }
            />
            <ChannelInfo
              subscriptionModalSubscriptionInfo={
                subscriptionModalSubscriptionInfo
              }
            />
            <DeploymentStatus />
          </div>
        </Modal>
      </div>
    )
  }
)

export default withLocale(SubscriptionModal)
