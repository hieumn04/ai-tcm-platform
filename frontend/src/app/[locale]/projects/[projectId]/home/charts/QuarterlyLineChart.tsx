'use client'
import { useRef, useCallback, useState, useMemo } from 'react'
import { Card, CardBody, Button, Switch } from '@nextui-org/react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Download } from 'lucide-react'
import { useChartOptions } from './hooks/useChartHooks'
import { useContextAggregatedChartData } from './hooks/useContextAggregatedChartData'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

type Props = {
  projectId: string
}

export default function QuarterlyLineChart({ projectId }: Props) {
  const [showGrid, setShowGrid] = useState(true)
  const [showFill, setShowFill] = useState(true)
  const chartRef = useRef<ChartJS<'line'>>(null)
  const chartInstanceId = useMemo(
    () => `quarterly-chart-${Math.random().toString(36).substring(2, 9)}`,
    [],
  )

  const { chartData, loading, error } =
    useContextAggregatedChartData('quarterly')

  const { options, getDatasetStyling } = useChartOptions(showGrid, showFill)

  const handleDownloadChart = useCallback(() => {
    if (chartRef.current) {
      const link = document.createElement('a')
      link.download = `quarterly-cases-chart-${new Date().toISOString().split('T')[0]}.png`
      link.href = chartRef.current.toBase64Image()
      link.click()
    }
  }, [])

  const data = useMemo(() => {
    if (!chartData?.chartData) return null
    return {
      labels: chartData.chartData.labels,
      datasets: chartData.chartData.datasets.map(getDatasetStyling),
    }
  }, [chartData, getDatasetStyling])

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody className="flex items-center justify-center py-6">
          Loading chart data...
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardBody className="flex items-center justify-center py-6">
          Error: {error}
        </CardBody>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardBody className="flex items-center justify-center py-6">
          No data available
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardBody className="px-4 py-3">
        <div className="flex justify-between items-center gap-2 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                isSelected={showGrid}
                onValueChange={setShowGrid}
              />
              <span className="text-sm">Grid</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                isSelected={showFill}
                onValueChange={setShowFill}
              />
              <span className="text-sm">Fill</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="flat"
            onClick={handleDownloadChart}
            startContent={<Download size={16} />}
          >
            Export
          </Button>
        </div>

        <div>
          <Line
            key={chartInstanceId}
            ref={chartRef}
            options={options}
            data={data}
            redraw={true}
          />
        </div>
      </CardBody>
    </Card>
  )
}
