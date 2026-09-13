'use client'
import React, { useCallback, useState } from 'react'
import { Button, Input } from '@nextui-org/react'
import { Calendar } from 'lucide-react'
import { useChartContext } from './ChartDataContext'

export function FilterControls() {
  const { dateRange, setDateRange, filterDataByDateRange, resetData } =
    useChartContext()
  const [isApplying, setIsApplying] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDateRange({ ...dateRange, start: e.target.value }),
    [setDateRange, dateRange],
  )

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDateRange({ ...dateRange, end: e.target.value }),
    [setDateRange, dateRange],
  )

  const handleApplyFilter = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) {
      return
    }

    setIsApplying(true)
    try {
      await filterDataByDateRange(dateRange.start, dateRange.end)
    } finally {
      setIsApplying(false)
    }
  }, [filterDataByDateRange, dateRange])

  const handleReset = useCallback(async () => {
    setIsResetting(true)
    try {
      await resetData()
    } finally {
      setIsResetting(false)
    }
  }, [resetData])

  const openDatePicker = useCallback((id: string) => {
    const input = document.getElementById(id) as HTMLInputElement
    if (input) input.showPicker()
  }, [])

  return (
    <div className="flex justify-end items-center gap-2">
      <div
        className="cursor-pointer"
        onClick={() => openDatePicker('start-date')}
      >
        <Input
          id="start-date"
          type="date"
          placeholder=" "
          value={dateRange.start}
          onChange={handleStartDateChange}
          size="sm"
          className="w-[130px]"
          startContent={<Calendar size={16} className="text-default-400" />}
          variant="bordered"
          labelPlacement="outside"
        />
      </div>
      <div
        className="cursor-pointer"
        onClick={() => openDatePicker('end-date')}
      >
        <Input
          id="end-date"
          type="date"
          placeholder=" "
          value={dateRange.end}
          onChange={handleEndDateChange}
          size="sm"
          className="w-[130px]"
          startContent={<Calendar size={16} className="text-default-400" />}
          variant="bordered"
          labelPlacement="outside"
        />
      </div>
      <Button
        size="sm"
        color="primary"
        onClick={handleApplyFilter}
        isLoading={isApplying}
        isDisabled={!dateRange.start || !dateRange.end || isResetting}
      >
        Apply
      </Button>
      <Button
        size="sm"
        variant="flat"
        onClick={handleReset}
        isLoading={isResetting}
        isDisabled={isApplying}
      >
        Reset
      </Button>
    </div>
  )
}
