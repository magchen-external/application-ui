/*******************************************************************************
 * Licensed Materials - Property of IBM
 * 5737-E67
 * (c) Copyright IBM Corporation 2018, 2019. All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/
'use strict'
import moment from 'moment'
import { NODE_SIZE, StatusIcon } from '../visualizers/constants.js'
import jsYaml from 'js-yaml'
import {
  getStoredObject,
  saveStoredObject
} from '../../../../lib/client/resource-helper'
import config from '../../../../lib/shared/config'
import * as Actions from '../../../actions'
import msgs from '../../../../nls/platform.properties'
import _ from 'lodash'

export default {
  //general order in which to organize diagram with 'application' at upper left
  designTypes: [
    'application',
    'subscription',
    'rules',
    'clusters',
    'deployable'
  ],
  topologyTypes: ['service', 'deployment', 'pod', 'package', 'other'],

  typeToShapeMap: {
    application: {
      shape: 'application',
      className: 'design',
      nodeRadius: 30
    },
    deployable: {
      shape: 'deployable',
      className: 'design'
    },
    subscription: {
      shape: 'subscription',
      className: 'design'
    },
    rules: {
      shape: 'rules',
      className: 'design'
    },
    clusters: {
      shape: 'cluster',
      className: 'container'
    },
    service: {
      shape: 'service',
      className: 'service'
    },
    deployment: {
      shape: 'deployment',
      className: 'deployment'
    },
    pod: {
      shape: 'pod',
      className: 'pod'
    },
    'package': {
      shape: 'chart',
      className: 'container'
    },

  },

  diagramOptions: {
    showLineLabels: true, // show labels on lines
    filterByType: true, //dynamic type filtering
    showSectionTitles: false, // show titles over sections
    defaultTypes: new Set( ['application', 'subscription', 'rules', 'clusters', 'deployable', 'service', 'deployment', 'pod', 'package', 'other']),
  },

  // merge table/diagram/topology definitions
  mergeDefinitions,

  // nodes, links and yaml
  getActiveChannel,
  getDiagramElements,

  // get description for under node
  getNodeTitle,
  getNodeDescription: getDesignNodeDescription,
  getNodeTooltips: getDesignNodeTooltips,
  getNodeDetails: getDesignNodeDetails,

  // get section titles
  getSectionTitles,

  // cytoscape layout options
  getConnectedLayoutOptions,
  getUnconnectedLayoutOptions
}

// merge table/diagram/topology definitions
function mergeDefinitions(topologyDefs) {
  // merge diagram with table definitions
  const defs = Object.assign(this, {})

  // add topology types to design types
  defs.typeToShapeMap = Object.assign(
    defs.typeToShapeMap,
    topologyDefs.typeToShapeMap
  )
  defs.shapeTypeOrder = [...defs.designTypes, ...defs.topologyTypes]
  defs.getTopologyElements = topologyDefs.getTopologyElements
  defs.getNodeGroups = topologyDefs.getNodeGroups

  this.updateNodeIcons = nodes => {
    updateNodeIcons(nodes)
    topologyDefs.updateNodeIcons(nodes)
  }

  this.getNodeDescription = (node, locale) => {
    if (_.get(node, 'specs.isDesign')) {
      return getDesignNodeDescription(node, locale)
    }
    return topologyDefs.getNodeDescription(node)
  }

  return defs
}

// remove the system stuff
const system = [
  'creationTimestamp',
  'selfLink',
  'status',
  'uid',
  'annotations',
  'livenessProbe',
  'resourceVersion'
]
const removeMeta = obj => {
  for (const key in obj) {
    if (system.indexOf(key) !== -1) {
      delete obj[key]
    } else if (typeof obj[key] === 'object') {
      removeMeta(obj[key])
    }
  }
}
const sortKeys = (a, b) => {
  if (a === 'name' && b !== 'name') {
    return -1
  } else if (a !== 'name' && b === 'name') {
    return 1
  } else if (a === 'namespace' && b !== 'namespace') {
    return -1
  } else if (a !== 'namespace' && b === 'namespace') {
    return 1
  }
  return a.localeCompare(b)
}

function getActiveChannel(localStoreKey) {
  const storedActiveChannel = getStoredObject(localStoreKey)
  if (storedActiveChannel) {
    return storedActiveChannel.activeChannel
  }
}

function getDiagramElements(item, topology, diagramFilters, localStoreKey) {
  const { status, loaded, reloading } = topology
  const topologyReloading = reloading
  const topologyLoadError = status === Actions.REQUEST_STATUS.ERROR
  if (loaded && !topologyLoadError) {
    // topology from api will have raw k8 objects, pods status
    const { links, nodes } = this.getTopologyElements(topology)

    // create yaml and what row links to what node
    let row = 0
    const yamls = []
    const clusters = []
    let activeChannel
    let channels = []
    const originalMap = {}
    const podMap = {}
    nodes.forEach(node => {
      const { type, name } = node
      switch (type) {
      case 'application':
        activeChannel = _.get(node, 'specs.activeChannel')
        channels = _.get(node, 'specs.channels', [])
        break
      case 'pod':
        podMap[name] = node
        break
      }

      const raw = _.get(node, 'specs.raw')
      if (raw) {
        node.specs.row = row
        originalMap[raw.kind] = raw
        const dumpRaw =  _.cloneDeep(raw)
        removeMeta(dumpRaw)
        const yaml = jsYaml.safeDump(dumpRaw, { sortKeys })
        yamls.push(yaml)
        row += yaml.split('\n').length
      }
    })
    const yaml = yamls.join('---\n')

    // associate pods with status
    topology.pods.forEach(pod=>{
      // get pod name w/o uid suffix
      let name = pod.name.replace(
        /-[0-9a-fA-F]{8,10}-[0-9a-zA-Z]{4,5}$/,
        ''
      )
      if (name === pod.name) {
        const idx = name.lastIndexOf('-')
        if (idx !== -1) {
          name = name.substr(0, idx)
        }
      }
      if (podMap[name]) {
        let podModel = podMap[name].podModel
        if (!podModel) {
          podModel = podMap[name].podModel = {}
        }
        podModel[pod.name] = pod
      }
    })

    // save results
    saveStoredObject(localStoreKey, {
      activeChannel,
      channels,
    })
    saveStoredObject(`${localStoreKey}-${activeChannel}`, {
      clusters,
      links,
      nodes,
      yaml
    })

    return {
      clusters,
      activeChannel,
      channels,
      links,
      nodes,
      pods: topology.pods,
      yaml,
      originalMap,
      topologyLoaded: true,
      storedVersion: false,
      topologyLoadError,
      topologyReloading
    }
  }

  // if not loaded yet, see if there's a stored version
  // with the same diagram filters
  if (!topologyReloading) {
    let channels = []
    let activeChannel
    const storedActiveChannel = getStoredObject(localStoreKey)
    if (storedActiveChannel) {
      activeChannel = storedActiveChannel.activeChannel
      channels = storedActiveChannel.channels || []
    }
    //console.log('localkey '+localStoreKey+ ' fetch '+ JSON.stringify(_.get(topology, 'fetchFilters.application')))
    activeChannel = _.get(topology, 'fetchFilters.application.channel', activeChannel)
    if (activeChannel) {
      const storedElements = getStoredObject(`${localStoreKey}-${activeChannel}`)
      if (storedElements) {
        const {
          clusters = [],
          links = [],
          nodes = [],
          yaml = ''
        } = storedElements
        return {
          clusters,
          activeChannel,
          channels,
          links,
          nodes,
          yaml,
          topologyLoaded: true,
          storedVersion: true,
          topologyLoadError,
          topologyReloading
        }
      }
    }
  }

  // if no topology yet, create diagram with search item
  const links = []
  const nodes = []
  const clusters = []
  const channels = []
  const yaml = ''

  // create application node
  const { name: an, namespace: ans } = item
  const appId = `application--${an}`
  nodes.push({
    name: an,
    namespace: ans,
    type: 'application',
    uid: appId,
    specs: { isDesign: true }
  })
  return {
    clusters,
    channels,
    links,
    nodes,
    yaml,
    topologyLoaded: false,
    topologyLoadError,
    topologyReloading
  }
}

function getDesignNodeDescription(node, locale) {
  let description = ''
  switch (node.type) {
  case 'application':
  case 'subscription':
    description = node.namespace
    break
  case 'deployable':
    description = _.get(node, 'deployable.chartName.$v')
    break
  case 'dependency':
    description = _.get(node, 'dependency.kind.$v')
    break
  case 'policy':
    description = msgs.get('application.policy', locale)
    break
  }
  return description
}

function getNodeTitle(node, locale) {
  const {type} = node
  switch (type) {
  case 'application':
    return msgs.get('topology.title.application', locale)

  default:
    if (!this.diagramOptions.defaultTypes.has(type)) {
      return type
    }
  }
  return ''
}

function updateNodeIcons(nodes) {
  nodes.forEach(node => {
    let statusIcon
    let tooltips = ''
    if (node.type==='pod') {
      if (node.podModel) {
        let anyPending = false
        let anyFailure = false
        Object.values(node.podModel).forEach(({status})=>{
          switch (status.toLowerCase()) {
          case 'running':
          case 'succeeded':
            //
            break
          case 'pending':
            anyPending = true
            break
          default:
            anyFailure = true
            break
          }
        })
        if (anyFailure) {
          statusIcon = StatusIcon.error
        } else if (anyPending) {
          statusIcon = StatusIcon.pending
        } else {
          statusIcon = StatusIcon.success
        }
      } else {
        statusIcon = StatusIcon.warning
      }
    } else if (node.status) {
      switch (node.status.toLowerCase()) {
      case 'completed':
        statusIcon = StatusIcon.success
        break

      default:
        statusIcon = StatusIcon.error
        tooltips = [{ name: 'Reason', value: node.reason }]
        break
      }
    }
    if (statusIcon) {
      let nodeIcons = node.layout.nodeIcons
      if (!nodeIcons) {
        nodeIcons = node.layout.nodeIcons = {}
      }
      nodeIcons['status'] = Object.assign(statusIcon, { tooltips })
    }
  })
}

function getDesignNodeDetails(node) {
  const details = []
  let labels = {}
  if (node) {
    const { name, type, namespace, specs } = node
    const metadata = _.get(specs, 'raw.metadata', {})
    const {labels: l = []} = metadata
    addDetails(details, [
      { labelKey: 'resource.type', value: type },
    ])
    labels = l
    switch (type) {
    case 'application': {
      const selector = _.get(specs, 'raw.spec.selector', {})
      const yaml = jsYaml.safeDump(selector).split('\n')
      if (yaml.length > 0) {
        details.push({
          type: 'label',
          labelKey: 'resource.selector'
        })
        yaml.forEach(value => {
          const labelDetails = [{ value }]
          addDetails(details, labelDetails)
        })
      }
      break
    }
    case 'subscription': {
      const channel = _.get(specs, 'raw.spec.channel')
      if (channel) {
        addDetails(details, [
          { labelKey: 'resource.channel', value: channel },
        ])
      }
      const placement = _.get(specs, 'raw.spec.placement', {})
      const yaml = jsYaml.safeDump(placement).split('\n')
      if (yaml.length > 0) {
        details.push({
          type: 'label',
          labelKey: 'resource.placement'
        })
        yaml.forEach(value => {
          const labelDetails = [{ value }]
          addDetails(details, labelDetails)
        })
      }
      break
    }
    case 'rules': {
      const clusterReplicas = _.get(specs, 'raw.spec.clusterReplicas')
      if (clusterReplicas) {
        addDetails(details, [
          { labelKey: 'resource.replicas', value: clusterReplicas },
        ])
      }
      const clusterLabels = _.get(specs, 'raw.spec.clusterLabels', {})
      const yaml = jsYaml.safeDump(clusterLabels).split('\n')
      if (yaml.length > 0) {
        details.push({
          type: 'label',
          labelKey: 'resource.cluster.labels'
        })
        yaml.forEach(value => {
          const labelDetails = [{ value }]
          addDetails(details, labelDetails)
        })
      }
      break
    }
    case 'pod': {
      if (node.podModel) {
        Object.values(node.podModel).forEach((pod)=>{
          const {name:n, namespace:ns, cluster, container, created, startedAt, hostIP, podIP, restarts, status} = pod
          addDetails(details, [
            { labelKey: 'resource.name', value: n },
            { labelKey: 'resource.namespace', value: ns },
            { labelKey: 'resource.status', value: status },
            { labelKey: 'resource.cluster', value: cluster },
            { labelKey: 'resource.container', value: container },
            { labelKey: 'resource.hostip', value: hostIP },
            { labelKey: 'resource.podip', value: podIP },
            { labelKey: 'resource.startedAt', value: getAge(startedAt) },
            { labelKey: 'resource.created', value: getAge(created) },
            { labelKey: 'resource.restarts', value: restarts },
          ])
        })
      } else {
        addDetails(details, [
          { labelKey: 'resource.name', value: name },
          { labelKey: 'resource.namespace', value: namespace },
          { labelKey: 'resource.status', value: 'Unknown' },
        ])
      }
      break
    }
    default:
      addDetails(details, [
        { labelKey: 'resource.name', value: name },
        { labelKey: 'resource.namespace', value: namespace },
      ])
    }
  }

  // add labels
  labels = Object.entries(labels)
  if (labels.length > 0) {
    details.push({
      type: 'label',
      labelKey: 'resource.labels'
    })
    labels.forEach(([name, value]) => {
      const labelDetails = [{ value: `${name} = ${value}` }]
      addDetails(details, labelDetails)
    })
  }

  return details
}


function getDesignNodeTooltips(node, locale) {
  let href
  const tooltips = []
  const contextPath = config.contextPath.replace(
    new RegExp('/applications'),
    ''
  )
  const { name, type, namespace, specs } = node
  const metadata = _.get(specs, 'raw.metadata', {})

  const addNameTooltip = (namespace, name) => {
    href = `${contextPath}/search?filters={"textsearch":"kind:${type} name:${name}"}`
    if (this.diagramOptions.defaultTypes.has(type)) {
      tooltips.push({ name: msgs.get(`resource.${type}`, locale), value: name, href })
    } else {
      tooltips.push({ name: msgs.get('resource.type', locale), value: type })
      tooltips.push({ name: msgs.get('resource.name', locale), value: name, href })
    }
    if (namespace) {
      href = `${contextPath}/search?filters={"textsearch":"kind:namespace name:${namespace}"}`
      tooltips.push({
        name: msgs.get('resource.namespace', locale),
        value: namespace,
        href
      })
    }
  }
  switch (type) {

  case 'subscription': {
    addNameTooltip(metadata.namespace, metadata.name)
    let channel = _.get(specs, 'raw.spec.channel')
    if (channel) {
      ([,channel] = channel.split('/'))
      href = `${contextPath}/search?filters={"textsearch":"kind:channel name:${channel}"}`
      tooltips.push({
        name: msgs.get('resource.channel', locale),
        value: channel,
        href
      })
    }
  }
    break

  case 'deployable':
  case 'rules':
    addNameTooltip(metadata.namespace, metadata.name)
    break

  case 'clusters': {
    if (specs.clusterNames) {
      let names = specs.clusterNames
      const length = names.length
      const andMore = length>4
      names = andMore ? names.splice(0,4) : names
      names.forEach(name=>{
        href = `${contextPath}/search?filters={"textsearch":"cluster:${name}"}`
        tooltips.push({name:msgs.get('resource.cluster', locale), value:name, href})
      })
      if (andMore) {
        tooltips.push({desc:msgs.get('resource.and.more', [length-4], locale)})
      }
    }
  }
    break

  default:
    addNameTooltip(namespace, name)
    break
  }
  return tooltips
}

function getSectionTitles(isMulticluster, clusters, types) {
  const hasTitle = ['chart', 'deployment', 'pod', 'service']
  types = types.filter(type => {
    return hasTitle.indexOf(type) === -1
  })
  return types.length === 0 ? clusters.join(', ') : ''
}

function getConnectedLayoutOptions({ elements }) {
  // pre position elements to try to keep webcola from random layouts
  const roots = elements
    .nodes()
    .roots()
    .toArray()
  positionRows(roots)
  if (roots.length === 1) {
    return {
      name: 'preset'
    }
  }

  // let cola position them, nicely
  return {
    name: 'cola',
    animate: false,
    boundingBox: {
      x1: 0,
      y1: 0,
      w: 1000,
      h: 1000
    },

    // do directed graph, top to bottom
    flow: { axis: 'x', minSeparation: NODE_SIZE * 1.2 },

    // running in headless mode, we need to provide node size here
    nodeSpacing: () => {
      return NODE_SIZE * 1.3
    },

    // put charts along y to separate design from k8 objects
    alignment: node => {
      const { node: { specs = {} } } = node.data()
      if (specs.isDivider) {
        return { y: 0 }
      }
      return null
    },

    unconstrIter: 10, // works on positioning nodes to making edge lengths ideal
    userConstIter: 20, // works on flow constraints (lr(x axis)or tb(y axis))
    allConstIter: 20 // works on overlap
  }
}

const positionRows = (row) => {
  const placeLast = []
  const deployableList = []
  const positionMap = {}
  const placedSet = new Set()

  // place rows from top to bottom
  positionRowsDown(0, 0, row, placedSet, positionMap, deployableList, placeLast)

  // center deployable parents above them
  const parentMap = {}
  if (!deployableList.some(deployable=>{
    const incomers = deployable.incomers().nodes()
    if (incomers.length===1) {
      parentMap[incomers[0].id()] = incomers[0]
      return false
    }
    return true
  })) {
    Object.values(parentMap).forEach(n=>{
      // get center of deployables excluding rules
      const outgoers = n.outgoers().nodes().filter(o=>{
        const { node: {type} } = o.data()
        if (type==='rules') {
          return false
        }
        return true
      })
      const bb = outgoers.boundingBox()
      const x = bb.x1 + bb.w/2

      // center cluster and subscription
      n.point({x})
      const { node: { type } } = n.data()
      if (type==='clusters') {
        const subscriptions = n.incomers().nodes()
        if (subscriptions.length===1) {
          subscriptions[0].point({x})
        }
      }
    })
  }

  // place these nodes based on other nodes
  placeLast.forEach(n=>{
    const { node: { type } } = n.data()
    if (type==='rules') {
      const subscriptions = n.incomers().nodes()
      let x, y
      subscriptions.forEach((subscription, idx)=>{
        const pos = subscription.point()
        // place rules next to first subscription that uses it
        if (idx===0) {
          void ({x, y} = pos)
        } else if (pos.x<x) {
          x = pos.x
        }
      })
      x += NODE_SIZE * 3
      n.position({x , y})
    }
  })

}

const positionRowsDown = (idx, y, row, placedSet, positionMap, deployableList, placeLast, offsetRow=0) => {
  if (row.length) {

    // remember deployables to center its parent later
    row.forEach(n=>{
      const { node } = n.data()
      const { type } = node
      if (type==='deployable') {
        deployableList.push(n)
      }
    })

    // place each node in this row
    const width = row.length * NODE_SIZE * 3

    // normally center the row
    let x = -(width / 2) + offsetRow
    if (row.length===1) {
      // however if just node under one parent, center under its parent
      const incommers = row[0].incomers().nodes()
      if (incommers.length===1) {
        x = incommers[0].point().x
      }
    }

    let hadRule = false
    row.forEach(n => {
      placedSet.add(n.id())
      const pos = { x, y }
      const { node: { type, name, specs } } = n.data()
      let key = type
      switch (type) {
      case 'subscription':
        key = `subscription/${name}`
        if (hadRule) {
          x += NODE_SIZE * 3
          pos.x = x
        }
        hadRule = specs.hasRules
        break
      case 'clusters':
        pos.y += NODE_SIZE/2
        break
      case 'deployment':
        key = `deployment/${name}`
        break
      case 'pod':
        pos.x = positionMap[`deployment/${name}`].x
        key = `pod/${name}`
        break
      default:
        if (!exports.default.typeToShapeMap[type]) {
          pos.y += 30
        }
        break
      }
      positionMap[key] = pos
      n.position(pos)
      x += NODE_SIZE * 3
    })


    // find and sort next row down
    let nextRow = []
    const kindOrder = ['chart', 'service', 'deployment', 'other']
    row.forEach(n => {
      const outgoers = n
        .outgoers()
        .nodes()
        .filter(n => {
          return !placedSet.has(n.id())
        })
        .sort((a, b) => {
          a = a.data().node
          b = b.data().node
          if (a.type === 'subscription' && b.type === 'subscription') {
            if (a.specs.isPlaced && !b.specs.isPlaced) {
              return -1
            } else if (!a.specs.isPlaced && b.specs.isPlaced) {
              return 1
            }
            return a.name.localeCompare(b.name)
          } else if (a.type === 'deployable' && b.type === 'deployable') {
            let kinda = kindOrder.indexOf(
              _.get(a, 'specs.raw.spec.template.kind', 'other').toLowerCase()
            )
            let kindb = kindOrder.indexOf(
              _.get(b, 'specs.raw.spec.template.kind', 'other').toLowerCase()
            )
            if (kinda<0) kinda = 10
            if (kindb<0) kindb = 10
            return kinda - kindb
          }
          return 0
        })
        .toArray()
      nextRow = [...nextRow, ...outgoers]
    })
    nextRow = _.uniqBy(nextRow, (n)=>{
      return n.id()
    })

    // don't put clusters and deployables on same row
    let clusterList = []
    nextRow = nextRow.filter(n=>{
      const { node } = n.data()
      const { type } = node
      if (type==='rules') {
        placeLast.push(n)
        return false
      } else if (type==='clusters') {
        clusterList.push(n)
        return false
      }
      return true
    })
    if (nextRow.length===0) {
      nextRow = clusterList
      clusterList = []
    }
    const hybridRow = clusterList.length>0 // deployables and clusters

    // place next row down
    y += NODE_SIZE * 2.4
    positionRowsDown(idx + 1, y, nextRow, placedSet, positionMap, deployableList, placeLast, hybridRow?width/2:0)
    if (hybridRow) {
      y += NODE_SIZE * 2.4
      positionRowsDown(idx + 1, y, clusterList, placedSet, positionMap, deployableList, placeLast)
    }
  }
}

function getUnconnectedLayoutOptions(collection, columns, index) {
  const count = collection.elements.length
  const cols = Math.min(count, columns[index])
  const h = Math.ceil(count / columns[index]) * NODE_SIZE * 2.7
  const w = cols * NODE_SIZE * 3
  return {
    name: 'grid',
    avoidOverlap: false, // prevents node overlap, may overflow boundingBox if not enough space
    boundingBox: {
      x1: 0,
      y1: 0,
      w,
      h
    },
    sort: (a, b) => {
      const { node: { layout: la } } = a.data()
      const { node: { layout: lb } } = b.data()
      return la.label.localeCompare(lb.label)
    },
    cols
  }
}

function addDetails(details, newDetails) {
  newDetails.forEach(({ labelKey, value }) => {
    if (value) {
      details.push({
        type: 'label',
        labelKey,
        value
      })
    }
  })
}

function getAge(value) {
  if (value) {
    if (value.includes('T')) {
      return moment(value, 'YYYY-MM-DDTHH:mm:ssZ').fromNow()
    } else {
      return moment(value, 'YYYY-MM-DD HH:mm:ss').fromNow()
    }
  }
  return '-'
}

