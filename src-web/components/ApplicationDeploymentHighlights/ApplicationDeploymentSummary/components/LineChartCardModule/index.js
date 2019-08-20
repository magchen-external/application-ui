/*******************************************************************************
 * Licensed Materials - Property of IBM
 * 5737-E67
 * (c) Copyright IBM Corporation 2019. All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/

import React from 'react'
import { withLocale } from '../../../../../providers/LocaleProvider'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  getChartKeyColor,
  getChartKeyName,
  getModuleData,
  getMaxStringWidth
} from './utils'

const LineChartCardModule = withLocale(({ data, locale }) => {
  const moduleData = getModuleData(data)
  const maxString = getMaxStringWidth(data) + 20
  return (
    <ResponsiveContainer width="95%" height="90%">
      <BarChart
        layout="vertical"
        width={400}
        height={250}
        data={moduleData.chartCardItems}
        margin={{
          top: 40,
          right: 0,
          left: maxString,
          bottom: 20
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <defs>
          <linearGradient id="colorUv" x1="1" y1="0" x2="0" y2="0">
            <stop
              offset="5%"
              stopColor={getChartKeyColor('counter')}
              stopOpacity={0.9}
            />
            <stop
              offset="95%"
              stopColor={getChartKeyColor('counter')}
              stopOpacity={0.6}
            />
          </linearGradient>
        </defs>
        <XAxis type="number" axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, transform: 'translate(0, 12)' }}
          interval="preserveStartEnd"
          tickSize={10}
          axisLine={false}
          tickLine={{ stroke: '#DFE3E6', transform: 'translate(0, 6)' }}
        />
        <Tooltip />
        <Bar
          barSize={10}
          legendType="circle"
          dataKey="counter"
          stackId="a"
          stroke={getChartKeyColor('counter')}
          fillOpacity={1}
          fill="url(#colorUv)"
          name={getChartKeyName('counter', locale)}
        />
      </BarChart>
    </ResponsiveContainer>
  )
})

LineChartCardModule.propTypes = {}

export default withLocale(LineChartCardModule)
