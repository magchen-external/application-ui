/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

import lodash from 'lodash'
import * as Actions from '../actions'
import { RESOURCE_TYPES, HCM_TOPOLOGY_FILTER_COOKIE } from '../../lib/shared/constants'

const initialState = {
  availableFilters: {
    clusters: [],
    labels: [],
    namespaces: [],
    types: [],
  },
  activeFilters: {
    namespace: [],
    type: [{ label: 'deployment'}] // Sets the default filters
  },
  links: [],
  nodes: [],
  status: Actions.REQUEST_STATUS.INCEPTION,
}


export const topology = (state = initialState, action) => {
  if (action.resourceType && action.resourceType.name === RESOURCE_TYPES.HCM_TOPOLOGY.name){
    switch (action.type) {
    case Actions.RESOURCE_REQUEST: {
      return {...state, status: Actions.REQUEST_STATUS.IN_PROGRESS}
    }
    case Actions.RESOURCE_RECEIVE_SUCCESS: {

      // ignore topologies that were fetched with a different set of active filters
      if (lodash.isEqual(action.fetchFilters, state.activeFilters)) {
        return { ...state,
          status: Actions.REQUEST_STATUS.DONE,
          nodes: action.nodes,
          links: action.links,
          fetchFilters: action.fetchFilters
        }
      } else {
        return { ...state }
      }
    }
    case Actions.RESOURCE_RECEIVE_FAILURE: {
      return { ...state, status: Actions.REQUEST_STATUS.ERROR, nodes: action.nodes, links: action.links }
    }
    }
  }

  switch (action.type){
  case '@@INIT':{
    return initialState
  }
  case Actions.TOPOLOGY_FILTERS_REQUEST: {
    return {...state,
      filtersStatus: Actions.REQUEST_STATUS.IN_PROGRESS,
    }
  }
  case Actions.TOPOLOGY_FILTERS_RECEIVE_ERROR: {
    return {...state,
      filtersStatus: Actions.REQUEST_STATUS.ERROR,
      err: action.err,
    }
  }
  case Actions.TOPOLOGY_RESTORE_SAVED_FILTERS: {
    const activeFilters = getActiveFilters(state)
    return {...state, activeFilters, savingFilters: true}

  }
  case Actions.TOPOLOGY_NAME_SEARCH: {
    const { searchName } = action
    return {...state, searchName }
  }
  case Actions.TOPOLOGY_FILTERS_RECEIVE_SUCCESS: {
    // The 'clusters' filter is different from other filters.
    // Here we are building the filter options using the cluster labels. When a filter is
    // is selected, we have to use the clusters associated with the label (filterValues).
    const clusterFilters = []
    action.clusters.forEach(({metadata:c}) => {
      clusterFilters.push({
        label: `name: ${c.name}`, //FIXME: NLS. Labels received from the API aren't translated either.
        filterValues: [c.name],
      })
      Object.keys(c.labels).forEach(labelKey => {
        const existingLabel = clusterFilters.find(l => l.label === `${labelKey}: ${c.labels[labelKey]}`)
        if(existingLabel) {
          existingLabel.filterValues.push(c.name)
        }
        else {
          clusterFilters.push({
            label: `${labelKey}: ${c.labels[labelKey]}`,
            filterValues: [c.name],
          })
        }
      })
    })

    const filters = {
      clusters: clusterFilters,
      labels: action.labels.map(l => ({label: `${l.name}: ${l.value}`, name: l.name, value: l.value })),
      namespaces: lodash.uniqBy(action.namespaces, 'metadata.name').map(n => ({ label: n.metadata.name})),
      types: action.types.map(i => ({label: i })),
    }
    return {...state,
      availableFilters: filters,
      filtersStatus: Actions.REQUEST_STATUS.DONE,
    }
  }
  case Actions.TOPOLOGY_FILTERS_UPDATE: {
    const activeFilters = {...state.activeFilters} || {}
    activeFilters[action.filterType] = action.filters
    if (state.savingFilters) {
      const {namespace, name} = action
      const cookieKey = namespace ? `${HCM_TOPOLOGY_FILTER_COOKIE}--${namespace}--${name}` : `${HCM_TOPOLOGY_FILTER_COOKIE}`
      localStorage.setItem(cookieKey, JSON.stringify(activeFilters))
    }
    return {...state, activeFilters}
  }
  case Actions.TOPOLOGY_REQUIRED_FILTERS_RECEIVE_SUCCESS: {
    const {item, staticResourceData: {topologyRequiredFilters}} = action
    const {metadata: {namespace, name}} = item
    const activeFilters = getActiveFilters(state, namespace, name)
    const requiredFilters = topologyRequiredFilters(item)
    activeFilters.label = requiredFilters.label
    return {...state, activeFilters, requiredFilters, savingFilters: true}
  }
  default:
    return { ...state }
  }
}

const getActiveFilters = (state = initialState, namespace, name) => {
  const cookieKey = namespace ? `${HCM_TOPOLOGY_FILTER_COOKIE}--${namespace}--${name}` : `${HCM_TOPOLOGY_FILTER_COOKIE}`
  let activeFilters = {...state.activeFilters} || {}
  const savedActiveFilters = localStorage.getItem(cookieKey)
  if (savedActiveFilters) {
    try {
      activeFilters = JSON.parse(savedActiveFilters)
    } catch (e) {
      //
    }
  }
  return activeFilters
}


