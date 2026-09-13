'use client'
import React from 'react'
import {
  DailyLineChart,
  WeeklyLineChart,
  MonthlyLineChart,
  QuarterlyLineChart,
} from '../charts'

type Props = {
  projectId: string
}

export default function UserActivityCharts({ projectId }: Props) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium mb-2">Daily Activity</p>
          <DailyLineChart projectId={projectId} />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Weekly Activity</p>
          <WeeklyLineChart projectId={projectId} />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Monthly Activity</p>
          <MonthlyLineChart projectId={projectId} />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Quarterly Activity</p>
          <QuarterlyLineChart projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
