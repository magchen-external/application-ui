/*******************************************************************************
 * Licensed Materials - Property of IBM
 * 5737-E67
 * (c) Copyright IBM Corporation 2019. All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/
'use strict'
import { RESOURCE_TYPES } from '../../../../lib/shared/constants'
import _ from 'lodash'

export function getUpdates(previousParsed, currentParsed) {
  let cantUpdate = false
  const updates = []
  Object.keys(currentParsed).some(key => {
    switch (key) {
    case 'PlacementPolicy':
      cantUpdate = getPlacementPolicyUpdates(
        previousParsed,
        currentParsed[key],
        updates
      )
      break

    case 'Application':
    case 'ApplicationRelationship':
    case 'Deployable':
    case 'PlacementBinding':
      break

    default:
      cantUpdate = true
      break
    }
    return cantUpdate
  })
  return { cantUpdate, updates }
}

function getPlacementPolicyUpdates(
  { placementPolicies },
  currentParsed,
  updates
) {
  currentParsed.some(({ $raw: currentRaw }, idx) => {
    // assumes current and previous are in same order
    if (idx < placementPolicies.length) {
      const { $raw: previousRaw, $org: originalRaw } = placementPolicies[idx]
      if (!_.isEqual(currentRaw, previousRaw)) {
        const name = _.get(currentRaw, 'metadata.name')
        const namespace = _.get(currentRaw, 'metadata.namespace')
        const selfLink = _.get(originalRaw, 'metadata.selfLink')
        updates.push({
          resourceType: RESOURCE_TYPES.HCM_PLACEMENT_POLICIES,
          namespace,
          name,
          selfLink,
          resource: currentRaw
        })
      }
      return false
    }
    return true
  })
}
