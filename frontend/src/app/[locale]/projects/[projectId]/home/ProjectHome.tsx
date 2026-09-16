'use client'
import { useState, useEffect, useContext } from 'react'
import { Folder, Clipboard, FlaskConical } from 'lucide-react'
import { title, subtitle } from '@/components/primitives'
import { Card, CardBody, Chip, Divider } from '@nextui-org/react'
import { HomeMessages } from './page'
import { TokenContext } from '@/utils/TokenProvider'
import { aggregateBasicInfo } from './aggregate'
import Config from '@/config/config'
import { UserActivityCharts } from './charts'
import { ProjectType } from '@/types/project'
import { ChartDataProvider } from './charts/ChartDataProvider'
import { FilterControls } from './charts/hooks/FilterControls'

const apiServer = Config.apiServer

// Chart section component that wraps both filter controls and charts
const ChartSection = ({
  projectId,
  accessToken,
  email,
}: {
  projectId: string
  accessToken: string
  email: string
}) => {
  return (
    <ChartDataProvider accessToken={accessToken} email={email}>
      <div className="flex justify-between items-center mb-3">
        <h2 className={subtitle()}>User Activity Statistics</h2>
        <FilterControls />
      </div>
      <div className="w-full">
        <UserActivityCharts projectId={projectId} />
      </div>
    </ChartDataProvider>
  )
}

async function fetchProject(jwt: string, projectId: number) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  }

  const url = `${apiServer}/home/${projectId}`

  try {
    const response = await fetch(url, fetchOptions)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error fetching data:', error.message)
  }
}

type Props = {
  projectId: string
  messages: HomeMessages
}

export function ProjectHome({ projectId, messages }: Props) {
  const context = useContext(TokenContext)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [project, setProject] = useState<ProjectType>({
    id: 0,
    name: '',
    detail: '',
    isPublic: false,
    userId: 0,
    createdAt: '',
    updatedAt: '',
    folders: [],
    runs: [],
    folderCount: 0,
    runCount: 0,
    caseCount: 0,
    aiCasesCount: 0,
  })
  const [stats, setStats] = useState({
    folderNum: 0,
    caseNum: 0,
    runNum: 0,
    aiCasesCount: 0,
  })

  useEffect(() => {
    async function fetchDataEffect() {
      if (!context.isSignedIn()) {
        return
      }

      try {
        setLoading(true)
        setAccessToken(context.token.access_token)
        setUserEmail(context.token.user?.email || '')

        const data = await fetchProject(
          context.token.access_token,
          Number(projectId),
        )
        if (data) {
          setProject(data)
        }
      } catch (error: any) {
        console.error('Error in effect:', error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDataEffect()
  }, [context, projectId])

  useEffect(() => {
    if (!project) return

    const { folderNum, runNum, caseNum, aiCasesCount } =
      aggregateBasicInfo(project)
    setStats({ folderNum, runNum, caseNum, aiCasesCount })
  }, [project])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading project data...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl p-6 px-6 flex-grow">
      <h1 className={title({ size: 'sm' })}>{project?.name || 'Project'}</h1>
      <div className="mt-4">
        <Chip
          variant="flat"
          startContent={<Folder size={16} />}
          className="px-3"
        >
          {stats.folderNum} {messages.folders}
        </Chip>
        <Chip
          variant="flat"
          startContent={<Clipboard size={16} />}
          className="px-3 ms-2"
        >
          {stats.caseNum} {messages.testCases}
        </Chip>
        <Chip
          variant="flat"
          className="px-3 ms-2"
        >
          {stats.aiCasesCount} {'AI Test Cases'}
        </Chip>
        <Chip
          variant="flat"
          startContent={<FlaskConical size={16} />}
          className="px-3 ms-2"
        >
          {stats.runNum} {messages.testRuns}
        </Chip>
      </div>

      {project?.detail && (
        <Card
          className="mt-3 bg-neutral-100 dark:bg-neutral-700 dark:text-white"
          shadow="none"
        >
          <CardBody>Detail: {project.detail}</CardBody>
        </Card>
      )}

      <Divider className="my-8" />

      <div>
        {accessToken && (
          <ChartSection
            projectId={projectId}
            accessToken={accessToken}
            email={userEmail}
          />
        )}
      </div>
    </div>
  )
}
