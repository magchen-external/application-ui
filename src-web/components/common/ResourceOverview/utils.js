/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2019. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
import R from 'ramda'
import {
  kindsToIncludeForDeployments,
  getResourcesStatusPerChannel
} from '../../ApplicationDeploymentPipeline/components/PipelineGrid/utils'

// Method will take in an object and return back the channels mapped for display purposes
export const getChannelsList = channels => {
  if (
    channels &&
    channels.items instanceof Array &&
    channels.items.length > 0
  ) {
    const mappedChannels = channels.items.map(channel => {
      // Will return back status as:
      // [0, 0, 0, 0, 0]
      // Pass, Fail, InProgress, Pending, Unidentified
      const status = getResourcesStatusPerChannel(channel, false)
      return {
        name: channel.name || '',
        counts: {
          completed: {
            total: status[0] + status[4]
          },
          inProgress: {
            total: status[2] + status[3]
          },
          failed: {
            total: status[1]
          }
        }
      }
    })
    return mappedChannels
  }
  return []
}

export const getNumDeployables = data => {
  if (data && data.related instanceof Array && data.related.length > 0) {
    const filtered = data.related.filter(elem => elem.kind === 'deployable')
    if (filtered.length > 0) {
      return filtered.reduce((acc, cur) => acc + cur['count'], 0)
    } else {
      return 0
    }
  } else {
    return 0
  }
}

export const getNumDeployments = data => {
  if (data && data.related instanceof Array && data.related.length > 0) {
    const filtered = data.related.filter(elem =>
      kindsToIncludeForDeployments.includes(elem.kind)
    )
    if (filtered.length > 0) {
      return filtered.reduce((acc, cur) => acc + cur['count'], 0)
    } else {
      return 0
    }
  } else {
    return 0
  }
}

export const getNumInProgressDeployments = data => {
  const status = getResourcesStatusPerChannel(data, false)
  return status[2] + status[3]
}

export const getNumFailedDeployments = data => {
  const status = getResourcesStatusPerChannel(data, false)
  return status[1]
}

export const getNumCompletedDeployments = data => {
  const status = getResourcesStatusPerChannel(data, false)
  return status[0] + status[4]
}

export const getIcamLink = (activeAccountId, applicationUid) => {
  if (activeAccountId && applicationUid) {
    return `/cemui/applications/${encodeURIComponent(
      applicationUid.split('/').pop()
    )}?subscriptionId=${encodeURIComponent(activeAccountId)}`
  }
  return '#'
}

// Given a current resource data INCLUDING its related resources
// we want to return all the channels.
// Channels are not returned inside related resources so we have to
// insepect each related subscription because it contains the channel
export const getResourceChannels = resourceData => {
  if (resourceData && resourceData.related) {
    const relatedData = resourceData.related
    // We want to pull only subscription data
    const filterToSubscriptions = x => x.kind == 'subscription'
    const subscriptionData = R.filter(filterToSubscriptions, relatedData)
    if (subscriptionData[0] && subscriptionData[0].items) {
      const channels = subscriptionData[0].items.map(sub => {
        return sub.channel
      })
      return channels
    }
    return []
  }
  return []
}

// Given an resource Object (item) and a list of resources Objects (appRelations)
// We want to go through the appRelations to see there is a resource UID that
// matches the item resource.
// If there is a match we want to return it and count it as common because
// it appears in both.
const findMatchingResource = (kind, item, appRelations) => {
  const match = appRelations.map(resource => {
    const kindItems = resource.items || []
    const kindTwo = resource.kind || ''
    const matched = kindItems.map(itemTwo => {
      if (kindTwo == kind && item._uid == itemTwo._uid) {
        return { kind: kind, items: [itemTwo] }
      }
    })
    const filterOutUndefined = x => x != undefined && x.length > 0
    const filteredData = R.filter(filterOutUndefined, matched)
    return filteredData
  })

  const filterOutEmpty = x => x.length > 0
  const filteredDataTwo = R.filter(filterOutEmpty, match)
  console.log('match', filteredDataTwo, match)
  return filteredDataTwo
}

// We want to find the commone resources that between too objects
// EXAMPLE:
//  - We have one application with all of its related resources.
//  - We have a list of channels with all their relate resources.
//  - Given those TWO lists we want to find the common resources that are in
//    both the application related resources and the channels related resources.
//
// The reason is the channel resources wiill include ALL related resources in
// that particular channel which includes many different application resources
// if sepearate applications chose to put a subscription under that channel.
//
export const getCommonResources = (channelData, appRelations) => {
  let channelFormat = []
  let commonResources = []
  // Go through Each Channel
  channelData.map(channel => {
    // That channels related data
    channel.related.map(resource => {
      const kindItems = resource.items || []
      const kind = resource.kind || ''
      kindItems.map(item => {
        const match = findMatchingResource(kind, item, appRelations)
        commonResources = commonResources.concat(match)
        console.log('commonResources', commonResources)
      })
    })
    // we want to tall up all the related resources for the given channel
    channelFormat = channelFormat.concat([
      { name: channelData.name, items: commonResources }
    ])
  })
  console.log('channelFormat', channelFormat)
  const filterOutEmpty = x => x.length > 0
  const filteredData = R.filter(filterOutEmpty, channelFormat)
  return filteredData
}

// We want to get the current Application if there is only ONE application.
// We check the secondaryHeader to see if there are two breadcrumbs which would
// mean that the user has selected one application to look into.
// We then extract the items from the application list and then pull out the application
// at location 0 which we know because there is only 1 application selected
// at this time.
export const getCurrentApplication = (HCMApplicationList, secondaryHeader) => {
  const applicationView = secondaryHeader.breadcrumbItems.length == 2
  const currentApplication = R.pathOr([], ['items'])(HCMApplicationList)
  const currentApplicationItemZero =
    (applicationView &&
      (currentApplication.length > 0 && currentApplication[0])) ||
    {}
  return currentApplicationItemZero
}
