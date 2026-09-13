'use client'
import { useEffect, useState, useContext } from 'react'
import { Button } from '@nextui-org/react'
import { Plus } from 'lucide-react'
import { TokenContext } from '@/utils/TokenProvider'
import {
  ProjectDialogMessages,
  ProjectType,
  ProjectsMessages,
} from '@/types/project'
import ProjectsTable from './ProjectsTable'
import ProjectDialog from '@/components/ProjectDialog'
import { fetchProjects, createProject } from '@/utils/projectsControl'
import { LocaleCodeType } from '@/types/locale'

export type Props = {
  messages: ProjectsMessages
  projectDialogMessages: ProjectDialogMessages
  locale: LocaleCodeType
}

export default function ProjectsPage({
  messages,
  projectDialogMessages,
  locale,
}: Props) {
  const context = useContext(TokenContext)
  const [projects, setProjects] = useState<ProjectType[]>([])

  useEffect(() => {
    async function fetchDataEffect() {
      if (!context.isSignedIn()) {
        return
      }
      try {
        const response = await fetchProjects(context.token.access_token)
        // Extract the data array from the API response
        const projectsData = response?.data || []
        setProjects(Array.isArray(projectsData) ? projectsData : [])
      } catch (error: any) {
        console.error('Error in effect:', error.message)
        setProjects([])
      }
    }
    fetchDataEffect()
  }, [context])

  // Filter projects based on user's roles (Admin/Member)
  const filteredProjects =
    projects?.filter((project) => {
      if (!context.projectRoles) {
        return false
      }
      const userRole = context.projectRoles.find(
        (role) => role.projectId === project.id,
      )

      // Check if user is Admin or Member
      return (
        context.isAdmin() ||
        (userRole && (userRole.isOwner || userRole.isMember))
      )
    }) || []

  // project dialog
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectType | null>(null)
  const openDialogForCreate = () => {
    setIsProjectDialogOpen(true)
    setEditingProject(null)
  }

  const closeDialog = () => {
    setIsProjectDialogOpen(false)
    setEditingProject(null)
  }

  const onSubmit = async (name: string, detail: string, isPublic: boolean) => {
    try {
      const response = await createProject(
        context.token.access_token,
        name,
        detail,
        isPublic,
      )
      const newProject = response?.data

      if (newProject) {
        setProjects([...projects, newProject])
      }

      // refresh project roles
      await context.refreshProjectRoles()
      closeDialog()
    } catch (error: any) {
      console.error('Error creating project:', error.message)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl pt-16 px-6 flex-grow">
      <div className="w-full p-3 flex items-center justify-between">
        <h3 className="font-bold">{messages.projectList}</h3>
        <div>
          {context.isAdmin() && (
            <Button
              startContent={<Plus size={16} />}
              size="sm"
              color="primary"
              onClick={openDialogForCreate}
            >
              {messages.newProject}
            </Button>
          )}
        </div>
      </div>

      <ProjectsTable
        projects={filteredProjects}
        messages={messages}
        locale={locale}
      />

      <ProjectDialog
        isOpen={isProjectDialogOpen}
        editingProject={editingProject}
        onCancel={closeDialog}
        onSubmit={onSubmit}
        projectDialogMessages={projectDialogMessages}
      />
    </div>
  )
}
