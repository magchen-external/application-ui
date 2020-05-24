/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2019. All Rights Reserved.
 * Copyright (c) 2020 Red Hat, Inc.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/
'use strict'

import R from 'ramda'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import _ from 'lodash'
import moment from 'moment'
import msgs from '../../../../nls/platform.properties'

const metadataName = 'specs.raw.metadata.name'
const notDeployedStr = msgs.get('spec.deploy.not.deployed')
const deployedStr = msgs.get('spec.deploy.deployed')

/*
* UI helpers to help with data transformations
* */
export const getAge = value => {
  if (value) {
    if (value.includes('T')) {
      return moment(value, 'YYYY-MM-DDTHH:mm:ssZ').fromNow()
    } else {
      return moment(value, 'YYYY-MM-DD HH:mm:ss').fromNow()
    }
  }
  return '-'
}

export const addDetails = (details, dets) => {
  dets.forEach(({ labelKey, labelValue, value, indent, isError }) => {
    if (value !== undefined) {
      details.push({
        type: 'label',
        labelKey,
        labelValue,
        value,
        indent,
        isError: isError
      })
    }
  })
}

export const getClusterName = nodeId => {
  const startPos = nodeId.indexOf('--clusters--') + 12
  const endPos = nodeId.indexOf('--', startPos)

  return nodeId.slice(startPos, endPos)
}

export const getWrappedNodeLabel = (label, width, rows = 3) => {
  // if too long, add elipse and split the rest
  const ip = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.exec(label)
  if (ip) {
    label = label.substr(0, ip.index) + '\n' + ip[0]
  } else {
    if (label.length > width * rows) {
      if (rows === 2) {
        label = label.substr(0, width) + '..\n' + label.substr(-width)
      } else {
        label =
          splitLabel(label.substr(0, width * 2), width, rows - 1) +
          '..\n' +
          label.substr(-width)
      }
    } else {
      label = splitLabel(label, width, rows)
    }
  }
  return label
}

const splitLabel = (label, width, rows) => {
  let line = ''
  const lines = []
  const parts = label.split(/([^A-Za-z0-9])+/)
  let remaining = label.length
  do {
    // add label part
    line += parts.shift()

    // add splitter
    if (parts.length) {
      line += parts.shift()
    }

    // if next label part puts it over width split it
    if (parts.length) {
      if (line.length + parts[0].length > width) {
        remaining -= line.length
        if (remaining > width) {
          if (rows === 2) {
            // if pentulitmate row do a hard break
            const split = parts[0]
            const idx = width - line.length
            line += split.substr(0, idx)
            parts[0] = split.substr(idx)
          }
        }
        lines.push(line)
        line = ''
        rows -= 1
      }
    } else {
      // nothing left, push last line
      lines.push(line)
    }
  } while (parts.length)

  // pull last line in if too short
  if (lines.length > 1) {
    let lastLine = lines.pop()
    if (lastLine.length <= 2) {
      lastLine = lines.pop() + lastLine
    }
    lines.push(lastLine)
  }
  return lines.join('\n')
}

//as scale decreases from max to min, return a counter zoomed value from min to max
export const counterZoom = (scale, scaleMin, scaleMax, valueMin, valueMax) => {
  if (scale >= scaleMax) {
    return valueMin
  } else if (scale <= scaleMin) {
    return valueMax
  }
  return (
    valueMin +
    (1 - (scale - scaleMin) / (scaleMax - scaleMin)) * (valueMax - valueMin)
  )
}

export const getTooltip = tooltips => {
  return ReactDOMServer.renderToStaticMarkup(
    <React.Fragment>
      {tooltips.map(
        ({
          name,
          value,
          href,
          target = '_blank',
          rel = 'noopener noreferrer'
        }) => {
          return (
            <div key={Math.random()}>
              <span className="label">{name}: </span>
              {href ? (
                <a className="link" href={href} target={target} rel={rel}>
                  {value}
                </a>
              ) : (
                <span className="value">{value}</span>
              )}
            </div>
          )
        }
      )}
    </React.Fragment>
  )
}

export const getHashCode = str => {
  let hash = 0,
      i,
      chr
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0
  }
  return hash
}

export const getNodePropery = (
  node,
  propPath,
  key,
  defaultValue,
  showAsError
) => {
  const dataObj = R.pathOr(undefined, propPath)(node)

  let data = dataObj
  if (data) {
    data = R.replace(/:/g, '=', R.toString(data))
    data = R.replace(/{/g, '', data)
    data = R.replace(/}/g, '', data)
    data = R.replace(/"/g, '', data)
    data = R.replace(/ /g, '', data)
  } else {
    if (defaultValue) {
      data = defaultValue
    }
  }

  if (data) {
    return {
      labelKey: key,
      value: data,
      isError: showAsError && !dataObj //show as error message if data not defined and marked for error
    }
  }

  return undefined
}

export const addPropertyToList = (list, data) => {
  if (list && data) {
    list.push(data)
  }

  return list
}

export const nodeMustHavePods = node => {
  //returns true if the node should deploy pods
  let mustHavePods = false
  if (
    node &&
    R.length(
      R.pathOr([], ['specs', 'raw', 'spec', 'template', 'spec', 'containers'])(
        node
      )
    ) > 0
  ) {
    mustHavePods = true
  }

  return mustHavePods
}

const getPulseStatusForSubscription = node => {
  let pulse = 'green'

  const resourceMap = _.get(node, `specs.${node.type}Model`)
  if (!resourceMap) {
    pulse = 'orange' //resource not available
    return pulse
  }

  let isPlaced = false
  Object.values(resourceMap).forEach(subscriptionItem => {
    if (R.contains('Failed', subscriptionItem.status)) {
      pulse = 'red'
    }
    if (subscriptionItem.status === 'Subscribed') {
      isPlaced = true // at least one cluster placed
    }

    if (
      subscriptionItem.status !== 'Subscribed' &&
      subscriptionItem.status !== 'Propagated' &&
      pulse !== 'red'
    ) {
      pulse = 'yellow' // anything but failed or subscribed
    }
  })
  if (pulse === 'green' && !isPlaced) {
    pulse = 'yellow' // set to yellow if not placed
  }

  return pulse
}

const getPulseStatusForGenericNode = node => {
  let pulse = 'green'

  const resourceName = _.get(node, metadataName, '')
  const resourceMap = _.get(node, `specs.${node.type}Model`)
  if (!resourceMap) {
    pulse = 'orange' //resource not available
    return pulse
  }

  const clusterNames = R.split(',', getClusterName(node.id))

  //go through all clusters to make sure all pods are counted, even if they are not deployed there
  clusterNames.forEach(clusterName => {
    clusterName = R.trim(clusterName)
    const resourceItem = resourceMap[`${resourceName}-${clusterName}`]

    if (!resourceItem) {
      // resource not created on a cluster
      pulse = 'yellow'
    }
  })

  return pulse
}

const getPulseForNodeWithPodStatus = node => {
  let pulse = 'green'
  const desired = _.get(node, 'specs.raw.spec.replicas', 'NA')

  const resourceName = _.get(node, metadataName, '')
  const resourceMap = _.get(node, `specs.${node.type}Model`)

  if (!resourceMap) {
    pulse = 'orange' //resource not available
    return pulse
  }

  const clusterNames = R.split(',', getClusterName(node.id))

  //must have pods, set the pods status here
  const podStatusMap = {}

  //go through all clusters to make sure all pods are counted, even if they are not deployed there
  clusterNames.forEach(clusterName => {
    clusterName = R.trim(clusterName)
    const resourceItem = resourceMap[`${resourceName}-${clusterName}`]

    if (resourceItem) {
      if (resourceItem.ready) {
        podStatusMap[clusterName] = {
          available: resourceItem.available,
          current: resourceItem.current,
          desired: resourceItem.desired,
          ready: resourceItem.ready
        }
      } else {
        //the resource doesn't have the pods info, it must be an embedded object between resource and pods
        //get the pods info from the pods model
        let podsReady = 0
        const podList = _.get(node, 'specs.podModel', {})
        Object.values(podList).forEach(podItem => {
          if (
            clusterName.indexOf(podItem.cluster) > -1 &&
            podItem.status === 'Running'
          ) {
            podsReady = podsReady + 1
          }
        })

        podStatusMap[clusterName] = {
          available: 0,
          current: 0,
          desired: desired,
          ready: podsReady
        }

        if (podsReady < desired) {
          pulse = 'yellow'
        }
      }
    } else {
      podStatusMap[clusterName] = {
        available: 0,
        current: 0,
        desired: desired,
        ready: 0
      }

      pulse = 'yellow'
    }
  })

  _.set(node, 'podStatusMap', podStatusMap)

  return pulse
}

export const computeNodeStatus = node => {
  let pulse = 'green'

  if (nodeMustHavePods(node)) {
    pulse = getPulseForNodeWithPodStatus(node)
  }

  switch (node.type) {
  case 'package':
    break
  case 'application':
    if (!_.get(node, 'specs.channels')) {
      pulse = 'red'
    }
    break
  case 'rules':
    if (!_.get(node, 'specs.raw.status.decisions')) {
      pulse = 'red'
    }
    break
  case 'subscription':
    pulse = getPulseStatusForSubscription(node)
    break
  default:
    pulse = getPulseStatusForGenericNode(node)
  }

  _.set(node, 'specs.pulse', pulse)
}

export const createDeployableYamlLink = (node, details) => {
  //returns yaml for the deployable
  if (details && node) {
    const row = R.pathOr(undefined, ['specs', 'row'])(node)
    if (row !== undefined) {
      details.push({
        type: 'link',
        value: {
          label: msgs.get('props.view.yaml'),
          id: node.id,
          data: {
            specs: {
              row: row,
              isDesign: true
            }
          },
          indent: true
        }
      })
    }
  }

  return details
}

export const createResourceSearchLink = (node, details) => {
  //returns search link for resource
  if (details && node && R.pathOr('', ['specs', 'pulse'])(node) !== 'orange') {
    //pulse orange means not deployed on any cluster so don't show link to search page
    details.push({
      type: 'link',
      value: {
        label: msgs.get('props.show.search.view'),
        id: node.id,
        data: {
          action: 'show_search',
          name: node.name,
          namespace: node.namespace,
          kind: node.type
        },
        indent: true
      }
    })
  }

  return details
}

const computeResourceName = (
  relatedKind,
  deployableName,
  name,
  isClusterGrouped
) => {
  if (relatedKind.kind === 'pod' && !deployableName) {
    const pname = name
    // get pod name w/o uid suffix
    name = pname.replace(/-[0-9a-fA-F]{8,10}-[0-9a-zA-Z]{4,5}$/, '')
    if (name === pname) {
      const idx = name.lastIndexOf('-')
      if (idx !== -1) {
        name = name.substr(0, idx)
      }
    }
  }

  if (relatedKind.kind !== 'subscription') {
    //expect for subscriptions, use cluster name to group resources
    name = isClusterGrouped.value ? name : `${name}-${relatedKind.cluster}`
  }

  return name
}

//creates a map with all related kinds for this app, not only pod types
export const setupResourceModel = (list, resourceMap, isClusterGrouped) => {
  if (list && resourceMap) {
    list.forEach(kindArray => {
      const relatedKindList = R.pathOr([], ['items'])(kindArray)

      relatedKindList.forEach(relatedKind => {
        let name = relatedKind.name
        const kind = relatedKind.kind
        let podHash = null
        let deployableName = null

        //look for pod template hash and remove it from the name if there
        const labelsList = relatedKind.label
          ? R.split(';')(relatedKind.label)
          : []
        labelsList.forEach(resLabel => {
          const values = R.split('=')(resLabel)
          if (values.length === 2) {
            const labelKey = values[0].trim()
            if (labelKey === 'pod-template-hash') {
              podHash = values[1].trim()
              name = R.replace(`-${podHash}`, '')(name)
            }
            if (
              labelKey === 'openshift.io/deployment-config.name' ||
              R.contains('deploymentconfig')(resLabel)
            ) {
              //look for deployment config info in the label; the name of the resource could be different than the one defined by the deployable
              //openshift.io/deployment-config.name
              deployableName = values[1].trim()
              name = deployableName
            }
          }
        })

        name = computeResourceName(
          relatedKind,
          deployableName,
          name,
          isClusterGrouped
        )

        if (resourceMap[name]) {
          const kindModel = _.get(resourceMap[name], `specs.${kind}Model`, {})
          kindModel[`${relatedKind.name}-${relatedKind.cluster}`] = relatedKind
          _.set(resourceMap[name], `specs.${kind}Model`, kindModel)
        }
      })
    })
  }

  return resourceMap
}

//show resource deployed status on the remote clusters
//for resources not producing pods
export const setResourceDeployStatus = (node, details) => {
  if (
    nodeMustHavePods(node) ||
    R.contains(node.type, [
      'application',
      'rules',
      'cluster',
      'subscription',
      'package'
    ])
  ) {
    //resource with pods info is processed separately
    //ignore packages
    return
  }

  const resourceName = _.get(node, metadataName, '')
  const clusterNames = R.split(',', getClusterName(node.id))
  const resourceMap = _.get(node, `specs.${node.type}Model`, {})

  const clusterStatusMap = {}
  clusterNames.forEach(clusterName => {
    clusterName = R.trim(clusterName)
    const res = resourceMap[`${resourceName}-${clusterName}`]
    clusterStatusMap[clusterName] = res ? deployedStr : notDeployedStr
  })

  details.push({
    type: 'label',
    labelKey: 'resource.deploy.statuses'
  })

  Object.keys(clusterStatusMap).forEach(key => {
    details.push({
      labelValue: key,
      value: clusterStatusMap[key],
      isError: clusterStatusMap[key] === notDeployedStr
    })
  })

  details.push({
    type: 'spacer'
  })
}

//show resource deployed status for resources producing pods
export const setPodDeployStatus = (node, details) => {
  if (!nodeMustHavePods(node)) {
    return //process only resources with pods
  }

  details.push({
    type: 'label',
    labelKey: 'resource.deploy.pods.statuses'
  })

  const podModel = _.get(node, 'specs.podModel', {})
  const podStatusModel = _.get(node, 'podStatusMap', {})

  const clusterNames = R.split(',', getClusterName(node.id))
  clusterNames.forEach(clusterName => {
    clusterName = R.trim(clusterName)
    const res = podStatusModel[clusterName]
    const valueStr = res ? `${res.ready}/${res.desired}` : notDeployedStr
    const isErrorMsg = valueStr === notDeployedStr || res.ready < res.desired
    details.push({
      labelValue: clusterName,
      value: valueStr,
      isError: isErrorMsg
    })
  })

  details.push({
    type: 'spacer'
  })

  Object.values(podModel).forEach(pod => {
    const { status, restarts, hostIP, podIP, startedAt, cluster } = pod
    const podError = R.contains(pod.status, [
      'CrashLoopBackOff',
      'ImageLoopBackOff',
      'Error',
      'InvalidImageName',
      'OOMKilled'
    ])
    details.push({
      type: 'label',
      labelKey: 'resource.container.logs'
    })
    details.push({
      type: 'link',
      value: {
        label: msgs.get('props.show.log'),
        data: {
          action: 'show_pod_log',
          name: pod.name,
          namespace: pod.namespace,
          cluster: pod.cluster
        }
      },
      indent: true
    })

    addDetails(details, [
      {
        labelKey: 'resource.clustername',
        value: cluster
      },
      {
        labelKey: 'resource.pod',
        value: pod.name
      },
      {
        labelKey: 'resource.hostip',
        value: hostIP
      },
      {
        labelKey: 'resource.podip',
        value: podIP
      },
      {
        labelKey: 'resource.created',
        value: getAge(startedAt)
      },
      {
        labelKey: 'resource.status',
        value: status,
        isError: podError
      },
      {
        labelKey: 'resource.restarts',
        value: restarts
      }
    ])
    details.push({
      type: 'spacer'
    })
  })
}

export const setSubscriptionDeployStatus = (node, details) => {
  if (node.type !== 'subscription') {
    return
  }
  details.push({
    type: 'label',
    labelKey: 'resource.deploy.statuses'
  })

  const resourceMap = _.get(node, 'specs.subscriptionModel', {})
  Object.values(resourceMap).forEach(subscription => {
    details.push({
      labelValue: subscription.cluster,
      value: subscription.status,
      isError: R.contains('Fail', subscription.status)
    })
  })

  details.push({
    type: 'spacer'
  })
}

export const setApplicationDeployStatus = (node, details) => {
  if (node.type !== 'application') {
    return
  }
  addPropertyToList(
    details,
    getNodePropery(
      node,
      ['specs', 'raw', 'spec', 'selector'],
      'spec.selector.matchExpressions',
      msgs.get('spec.selector.matchExpressions.err'),
      true
    )
  )

  details.push({
    type: 'spacer'
  })

  addPropertyToList(
    details,
    getNodePropery(
      node,
      ['specs', 'channels'],
      'spec.app.channels',
      msgs.get('resource.application.error.msg'),
      true
    )
  )
}
