/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
'use strict'

import { DataType, HeatSelections, GroupByChoices, SizeChoices, ShadeChoices } from './constants.js'
import { inflateKubeValue, deflateKubeValue } from '../../../lib/client/charts-helper'
import _ from 'lodash'


// get data based on choices and nodes
export const getHeatMapData = (filteredOverview, unfilteredOverview, heatMapChoices={}, collapsed) => {

  const { clusters = [] } = unfilteredOverview
  const { clusters:filteredClusters = [] } = filteredOverview

  // how are we grouping data
  // if collapsed, always group by provider since that's what user is seeing
  let groupKey
  const grouping = collapsed ? GroupByChoices.provider : heatMapChoices[HeatSelections.groupBy]
  switch (grouping) {
  default:
  case GroupByChoices.provider:
    groupKey = 'cloud'
    break
  case GroupByChoices.region:
    groupKey = 'region'
    break
  case GroupByChoices.purpose:
    groupKey = 'environment'
    break
  case GroupByChoices.service:
    groupKey = 'vendor'
    break
  }

  // get set of the filtered clusters
  // we only return mapData for those clusters but we calc totals based on ALL clusters
  const filteredSet = new Set()
  filteredClusters.forEach(({metadata: {namespace, name}})=>{
    filteredSet.add(`${namespace}//${name}`)
  })


  // collect data
  let sizeTotal = 0
  const shadeArray = []
  const mapData = {}
  clusters.forEach((cluster)=>{
    const {metadata={}} = cluster
    const {namespace, name, labels={}} = metadata
    const key = labels[groupKey]
    let heatData = mapData[key]
    if (!heatData) {
      heatData = []
      // if not a filtered cluster, don't add to heatmap
      // but include it in shade calculations
      if (filteredSet.has(`${namespace}//${name}`)) {
        mapData[key] = heatData
      }
    }

    let size=0
    switch (heatMapChoices[HeatSelections.size]) {
    default:
    case SizeChoices.nodes:
      size = _.get(cluster, 'capacity.nodes', 0)
      break
    case SizeChoices.pods:
      size = _.get(cluster, 'usage.pods', 0)
      break
    case SizeChoices.nonCompliant:
      size = 2
      break
    }
    sizeTotal+=size

    let shadeForTooltip
    switch (heatMapChoices[HeatSelections.shade]) {
    default:
    case ShadeChoices.vcpu:
      shadeForTooltip = _.get(cluster, 'usage.cpu', 0)
      break
    case ShadeChoices.memory:
      shadeForTooltip = _.get(cluster, 'usage.memory', 0)
      break
    case ShadeChoices.storage:
      shadeForTooltip = _.get(cluster, 'usage.storage', 0)
      break
    }
    const shade = inflateKubeValue(shadeForTooltip)
    shadeArray.push(shade)

    heatData.push({
      name,
      size,
      shade,
      shadeForTooltip, // shade value displayed in tooltip
    })
  })
  // sort by name so that _.isEqual works
  Object.keys(mapData).forEach(key=>{
    mapData[key].sort((a,b) => {
      return a.name.localeCompare(b.name)
    })
  })



  // assign color classname based on where it falls in spectrum
  if (shadeArray.length>4) {
    shadeArray.sort((a,b)=>{return a-b})
    shadeArray.shift()
    shadeArray.pop()
  }
  const avg = _.sum(shadeArray) / shadeArray.length
  const std = Math.max(avg*.05, Math.sqrt(_.sum(_.map(shadeArray, (i) => Math.pow((i - avg), 2))) / shadeArray.length))
  Object.keys(mapData).forEach(key=>{
    mapData[key].forEach(cluster=>{
      const {shade} = cluster
      if (shade < avg-std) {
        cluster.color='square-blue'
      } else if (shade <= avg+std) {
        cluster.color='square-yellow'
      } else {
        cluster.color='square-red'
      }
    })
  })

  const top = deflateKubeValue(avg+std)
  const bottom = deflateKubeValue(avg-std)
  const below = `${bottom.size}${top.units}`
  const average = `${bottom.size} - ${top.size}${top.units}`
  const above = `${top.size}${top.units}`
  return {sizeTotal, mapData, below, average, above}
}

export const getDataValues = (overview, dataType, pieData) => {
  switch (dataType) {
  case DataType.compliance:
    return getComplianceValues(overview, pieData)

  case DataType.pods:
    return getPieValues(overview, 'pods', 'status', pieData)

  case DataType.cluster:
    return getPieValues(overview, 'clusters', 'status', pieData)

  case DataType.cpu:
    return getAvailableUsedValues(overview, 'clusters', 'cpu')

  case DataType.memory:
    return getAvailableUsedValues(overview, 'clusters', 'memory', true)

  case DataType.storage:
    return getAvailableUsedValues(overview, 'clusters', 'storage', true)
  }
  return {valueMap:{}, available:0, used:0, units:''}
}

export const getNoncompliantClusterSet = (overview) => {
  const noncompliantClusterSet = new Set()
  _.get(overview, 'compliances', []).forEach(res=>{
    const policyClusters = _.get(res, 'raw.status.status', '')
    Object.keys(policyClusters).forEach(name=>{
      if ((policyClusters[name].compliant||'').toLowerCase()!=='compliant') {
        noncompliantClusterSet.add(name)
      }
    })
  })
  return noncompliantClusterSet
}

const getComplianceValues = (overview) => {
  const valueMap = {compliant:[], default:[]}
  const clusterSet = _.keyBy(overview.clusters, 'metadata.name')
  const map = new Map([...Object.keys(clusterSet).map(item => [item, true])])
  _.get(overview, 'compliances', []).forEach(res=>{
    const policyClusters = _.get(res, 'raw.status.status', '')
    Object.keys(policyClusters).forEach(name=>{
      if (clusterSet[name]) {
        const value = (policyClusters[name].compliant||'').toLowerCase()
        if (value !== 'compliant') map.set(name, false)
      }
    })
  })
  map.forEach((status, cluster) => {
    if (status) {
      valueMap.compliant.push(cluster)
    } else {
      valueMap.default.push(cluster)
    }
  })
  return {valueMap}
}

const getAvailableUsedValues = (overview, overviewKey, valueKey, deflateValues) => {
  // get available/used
  const data = {
    'available': 0,
    'used': 0,
  }
  const values = _.get(overview, overviewKey, []).reduce((acc, {capacity, usage}) => {
    data['available'] += capacity ? inflateKubeValue(capacity[valueKey]) : 0
    data['used'] += usage ? inflateKubeValue(usage[valueKey]) : 0
    return acc
  }, data)

  let {used} = values
  let available = values.available
  let units = values.units
  if (deflateValues) {
    let deflated = deflateKubeValue(values.available)
    available = deflated.size
    units = deflated.units
    deflated = deflateKubeValue(values.used)
    used = deflated.size
    // in case avaialble is in tetra and used is in giga
    if (used>available) {
      available *= 1024
      units = deflated.units
    }
  }
  return {available, used, units}
}

const getPieValues = (overview, overviewKey, valueKey, pieData) => {
  const valueMap = {}
  _.get(overview, overviewKey, []).forEach(res=>{
    const value = _.get(res, valueKey, '').toLowerCase()
    let key  = 'default'
    for (var pieKey in pieData) {
      // ex: 'running' and 'succeeded' can be the same accumulated
      if (pieData[pieKey].values && pieData[pieKey].values.indexOf(value)!==-1) {
        key = pieKey
        break
      }
    }
    let arr = valueMap[key]
    if (!arr) {
      arr = valueMap[key] = []
    }
    arr.push(res)
  })
  return {valueMap}
}
