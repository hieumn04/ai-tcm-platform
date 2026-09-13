'use client'
import { useState, useEffect, useContext } from 'react'
import { Listbox, ListboxItem } from '@nextui-org/react'
import {
  Home,
  Files,
  FlaskConical,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { usePathname, useRouter } from '@/src/navigation'
import useGetCurrentIds from '@/utils/useGetCurrentIds'
import { ProjectMessages } from '@/types/project'
import { TokenContext } from '@/utils/TokenProvider'
import { fetchProject } from '@/utils/projectsControl'

export type Props = {
  messages: ProjectMessages
  locale: any
}

export default function Sidebar({ messages, locale }: Props) {
  const { projectId } = useGetCurrentIds()
  const router = useRouter()
  const pathname = usePathname()
  const context = useContext(TokenContext)

  const [currentKey, setCurrentTab] = useState('home')
  const [isOpen, setIsOpen] = useState(true)
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    const handleRouteChange = (currentPath: string) => {
      const mappings: Record<string, string> = {
        home: 'home',
        folders: 'cases',
        runs: 'runs',
        members: 'members',
        settings: 'settings',
      }

      const matchedKey = Object.keys(mappings).find((key) =>
        currentPath.includes(key),
      )
      if (matchedKey) {
        setCurrentTab(mappings[matchedKey])
      }
    }

    handleRouteChange(pathname)
  }, [pathname])

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (projectId) {
        try {
          const data = await fetchProject(
            context.token.access_token,
            Number(projectId),
          )
          setProjectName(data?.name || 'Unknown Project')
        } catch (error) {
          console.error('Failed to fetch project details:', error)
          setProjectName('Error Loading Project')
        }
      }
    }

    fetchProjectDetails()
  }, [projectId, context.token.access_token])

  const baseClass = (isOpen: boolean) =>
    isOpen
      ? 'p-3 flex flex-row items-center space-x-2 cursor-pointer'
      : 'p-3 flex flex-col items-center justify-center space-y-1 cursor-pointer'

  const selectedClass = (isOpen: boolean) =>
    `${baseClass(isOpen)} bg-neutral-200 dark:bg-neutral-700`

  const handleTabClick = (key: string) => {
    const routes: Record<string, string> = {
      home: 'home',
      cases: 'folders',
      runs: 'runs',
      members: 'members',
      settings: 'settings',
    }

    if (routes[key]) {
      router.push(`/projects/${projectId}/${routes[key]}`, { locale: locale })
    }
  }

  let tabItems = [
    {
      key: 'home',
      text: messages.home,
      startContent: <Home strokeWidth={1} size={20} />,
    },
    {
      key: 'cases',
      text: messages.testCases,
      startContent: <Files strokeWidth={1} size={20} />,
    },
    {
      key: 'runs',
      text: messages.testRuns,
      startContent: <FlaskConical strokeWidth={1} size={20} />,
    },
  ]

  const canManageProject =
    context.isAdmin() ||
    (projectId !== null && context.isProjectManager(projectId))

  if (canManageProject) {
    tabItems.push(
      {
        key: 'members',
        text: messages.members,
        startContent: <Users strokeWidth={1} size={20} />,
      },
      {
        key: 'settings',
        text: messages.settings,
        startContent: <Settings strokeWidth={1} size={20} />,
      },
    )
  }

  return (
    <div className="relative">
      {/* Sidebar (Now Shrinks) */}
      <div
        className="fixed left-0 top-[60px] h-[calc(100vh-60px)] bg-white dark:bg-neutral-900 shadow-md border-r border-neutral-300 dark:border-neutral-700 transition-all duration-200"
        style={{ width: isOpen ? '14rem' : '4.5rem' }} // Sidebar shrinks but icons remain visible
      >
        {/* Project Name + Toggle Button */}
        <div className="flex items-center justify-between p-3 border-b border-neutral-300 dark:border-neutral-700">
          {isOpen && (
            <span className="font-semibold truncate flex-grow">
              {projectName || 'Loading...'}
            </span>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {/* Navigation Tabs */}
        <Listbox aria-label="Listbox Variants" variant="light">
          {tabItems.map((itr) => (
            <ListboxItem
              key={itr.key}
              startContent={itr.startContent}
              onClick={() => handleTabClick(itr.key)}
              className={
                currentKey === itr.key
                  ? selectedClass(isOpen)
                  : baseClass(isOpen)
              }
            >
              {isOpen && (
                <span className="transition-opacity duration-200">
                  {itr.text}
                </span>
              )}
            </ListboxItem>
          ))}
        </Listbox>
      </div>

      {/* Content Push Effect */}
      <div
        className={`transition-all duration-300 ease-in-out ${!isOpen ? 'ml-16' : 'ml-56'} w-full`}
      >
        {/* For the one who later receives this code, don't remove this div, trust me */}
      </div>
    </div>
  )
}
