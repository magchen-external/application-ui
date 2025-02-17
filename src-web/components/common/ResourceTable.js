/** *****************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2019. All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/
// Copyright (c) 2020 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
'use strict'

/* NOTE: These eslint exceptions are added to help keep this file consistent with platform-ui. */
/* eslint-disable react/prop-types, react/jsx-no-bind */

import _ from 'lodash'
import React from 'react'
import {
  AcmEmptyState,
  AcmTable
} from '@open-cluster-management/ui-components'
import msgs from '../../../nls/platform.properties'
import resources from '../../../lib/shared/resources'
import { withRouter } from 'react-router-dom'
import { handleActionClick } from './TableRowActionMenu'

resources(() => {
  require('../../../scss/table.scss')
})

class ResourceTable extends React.Component {
  render() {
    const {
      actions,
      page,
      setPage,
      search,
      setSearch,
      sort,
      setSort,
      staticResourceData,
      locale
    } = this.props
    const toolbarControls = actions && actions.length > 0 ? actions : undefined

    return [
      <AcmTable
        key="data-table"
        plural={msgs.get(staticResourceData.pluralKey, locale)}
        items={this.getResources()}
        columns={this.getColumns()}
        keyFn={
          staticResourceData?.keyFn ||
          (item => `${item.namespace}/${item.name}`)
        }
        rowActions={this.getRowActions()}
        rowActionResolver={this.getRowActionResolver()}
        emptyState={
          <AcmEmptyState
            title={staticResourceData.emptyTitle(locale)}
            message={staticResourceData.emptyMessage(locale)}
            isEmptyTableState={toolbarControls ? true : false}
          />
        }
        extraToolbarControls={toolbarControls}
        groupFn={staticResourceData.groupFn}
        groupSummaryFn={
          staticResourceData.groupSummaryFn
            ? items => staticResourceData.groupSummaryFn(items, locale)
            : undefined
        }
        page={page}
        setPage={setPage}
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
      />
    ]
  }

  getColumns() {
    const { staticResourceData, items, itemIds, locale } = this.props
    const enabledColumns = staticResourceData.tableKeys.filter(tableKey => {
      const disabled =
        typeof tableKey.disabled === 'function'
          ? tableKey.disabled(itemIds && itemIds.map(id => items[id]))
          : tableKey.disabled
      return tableKey.disabled ? !disabled : true
    })
    const allColumnsEnabled =
      enabledColumns.length === staticResourceData.tableKeys.length
    const columns = enabledColumns.map(tableKey => ({
      header: msgs.get(tableKey.msgKey, locale),
      cell:
        tableKey.transformFunction &&
        typeof tableKey.transformFunction === 'function'
          ? item => tableKey.transformFunction(item, locale)
          : tableKey.resourceKey,
      sort:
        tableKey.textFunction && typeof tableKey.textFunction === 'function'
          ? `transformed.${tableKey.resourceKey}.text`
          : tableKey.resourceKey,
      search:
        tableKey.textFunction && typeof tableKey.textFunction === 'function'
          ? `transformed.${tableKey.resourceKey}.text`
          : tableKey.resourceKey,
      transforms: allColumnsEnabled ? tableKey.transforms : undefined, // column widths no longer correct
      tooltip: tableKey.tooltipKey
        ? msgs.get(tableKey.tooltipKey, locale)
        : undefined
    }))
    return columns
  }

  getActionMapper() {
    const { resourceType, locale, history } = this.props

    return action => ({
      id: action.key,
      title: msgs.get(action.key, locale),
      click: item => {
        handleActionClick(action, resourceType, item, history)
      }
    })
  }

  getRowActionResolver() {
    const { tableActionsResolver } = this.props

    return tableActionsResolver
      ? item => {
        return tableActionsResolver(item).map(this.getActionMapper())
      }
      : undefined
  }

  getRowActions() {
    const { tableActions } = this.props

    return tableActions ? tableActions.map(this.getActionMapper()) : undefined
  }

  getResources() {
    const { items, itemIds, staticResourceData } = this.props
    const { normalizedKey } = staticResourceData
    return itemIds
      ? itemIds.map(
        id =>
          items[id] ||
            (Array.isArray(items) &&
              items.find(
                target =>
                  (normalizedKey && _.get(target, normalizedKey) === id) ||
                  target.name === id
              ))
      )
      : undefined
  }
}

export default withRouter(ResourceTable)
