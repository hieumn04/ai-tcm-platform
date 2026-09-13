'use client'
import React from 'react'
import { useSharedChartData } from './hooks/useSharedChartData'
import { ChartDataContext } from './hooks/ChartDataContext'

type ChartDataProviderProps = {
  accessToken: string
  email: string
  children: React.ReactNode
}

export function ChartDataProvider({
  accessToken,
  email,
  children,
}: ChartDataProviderProps) {
  const chartData = useSharedChartData(accessToken, email)

  return (
    <ChartDataContext.Provider value={chartData}>
      {children}
    </ChartDataContext.Provider>
  )
}
