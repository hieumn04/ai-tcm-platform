'use client'
import { useEffect, useState, useContext, useRef } from 'react'
import { Button } from '@nextui-org/react'
import { Plus } from 'lucide-react'
import RunsTable from './RunsTable'
import {
  fetchRuns,
  createRun,
  updateRun,
  deleteRun,
  duplicateRun,
} from './runsControl'
import { RunType, RunsMessages } from '@/types/run'
import RunDialog from './RunDialog'
import DuplicateRunDialog from './DuplicateRunDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { TokenContext } from '@/utils/TokenProvider'
import { LocaleCodeType } from '@/types/locale'

// Global cache to prevent redundant API calls across remounts
const runsCache: Record<string, { data: RunType[]; timestamp: number }> = {}
const CACHE_EXPIRY = 5000 // 5 seconds in milliseconds

type Props = {
  projectId: string
  locale: LocaleCodeType
  messages: RunsMessages
}

export default function RunsPage({ projectId, locale, messages }: Props) {
  const context = useContext(TokenContext)
  const [runs, setRuns] = useState<RunType[]>([])
  const isFetchingRef = useRef(false)

  // run dialog
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)
  const [editingRun, setEditingRun] = useState<RunType | null>(null)
  const [duplicatingRun, setDuplicatingRun] = useState<RunType | null>(null)

  // delete confirm dialog
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] =
    useState(false)
  const [deleteRunId, setDeleteRunId] = useState<number | null>(null)

  // Fetch data with caching to prevent redundant API calls
  const fetchData = async (force = false) => {
    if (!context.isSignedIn() || isFetchingRef.current) {
      return
    }

    const cacheKey = `runs_${projectId}`
    const now = Date.now()

    // Use cached data if available and not expired unless forced refresh
    if (
      !force &&
      runsCache[cacheKey] &&
      now - runsCache[cacheKey].timestamp < CACHE_EXPIRY
    ) {
      setRuns(runsCache[cacheKey].data)
      return
    }

    // Set fetching flag to prevent concurrent calls
    isFetchingRef.current = true

    try {
      const data = await fetchRuns(
        context.token.access_token,
        Number(projectId),
      )

      // Cache the result
      runsCache[cacheKey] = {
        data,
        timestamp: now,
      }

      setRuns(data)
    } catch (error: any) {
      console.error('Error fetching runs:', error.message)
      // Clear cache on error
      delete runsCache[cacheKey]
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchData()

    const handleFocus = () => {
      fetchData(true)
    }
    window.addEventListener('focus', handleFocus)

    // Clear fetching flag on unmount
    return () => {
      window.removeEventListener('focus', handleFocus)
      isFetchingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, projectId])

  const openDialogForCreate = () => {
    setEditingRun(null)
    setIsRunDialogOpen(true)
  }

  const openDialogForDuplicate = (run: RunType) => {
    setDuplicatingRun(run)
    setIsDuplicateDialogOpen(true)
  }

  const closeDialog = () => {
    setIsRunDialogOpen(false)
    setEditingRun(null)
  }

  const closeDuplicateDialog = () => {
    setIsDuplicateDialogOpen(false)
    setDuplicatingRun(null)
  }

  const closeDeleteConfirmDialog = () => {
    setIsDeleteConfirmDialogOpen(false)
    setDeleteRunId(null)
  }

  const onSubmit = async (name: string, description: string) => {
    if (editingRun && editingRun.createdAt) {
      const updatedRun: RunType = await updateRun(
        context.token.access_token,
        editingRun,
      )
      const updatedRuns = runs.map((run) =>
        run.id === updatedRun.id ? updatedRun : run,
      )
      setRuns(updatedRuns)

      // Update cache with new data
      const cacheKey = `runs_${projectId}`
      if (runsCache[cacheKey]) {
        runsCache[cacheKey].data = updatedRuns
      }
    } else {
      const newRun = await createRun(
        context.token.access_token,
        Number(projectId),
        name,
        description,
      )
      const updatedRuns = [...runs, newRun]
      setRuns(updatedRuns)

      // Update cache with new data
      const cacheKey = `runs_${projectId}`
      if (runsCache[cacheKey]) {
        runsCache[cacheKey].data = updatedRuns
      }
    }
    closeDialog()
  }

  const onDuplicate = async (name: string, description: string) => {
    if (duplicatingRun && duplicatingRun.id) {
      try {
        await duplicateRun(
          context.token.access_token,
          duplicatingRun.id,
          name,
          description,
        )
        const updatedRuns = await fetchRuns(
          context.token.access_token,
          Number(projectId),
        )
        setRuns(updatedRuns)
        closeDuplicateDialog()
      } catch (error) {
        console.error('Error duplicating run:', error)
      }
    }
  }

  const onDeleteClick = (runId: number) => {
    setDeleteRunId(runId)
    setIsDeleteConfirmDialogOpen(true)
  }

  const onDuplicateClick = (run: RunType) => {
    openDialogForDuplicate(run)
  }

  const onConfirm = async () => {
    if (deleteRunId) {
      await deleteRun(context.token.access_token, deleteRunId)
      const updatedRuns = runs.filter((run) => run.id !== deleteRunId)
      setRuns(updatedRuns)

      // Update cache with new data
      const cacheKey = `runs_${projectId}`
      if (runsCache[cacheKey]) {
        runsCache[cacheKey].data = updatedRuns
      }

      closeDeleteConfirmDialog()
    }
  }

  return (
    <div className="container mx-auto max-w-3xl pt-6 px-6 flex-grow">
      <div className="w-full p-3 flex items-center justify-between">
        <h3 className="font-bold">{messages.runList}</h3>
        <div>
          <Button
            startContent={<Plus size={16} />}
            size="sm"
            isDisabled={
              !(
                context.isAdmin() ||
                context.isProjectDeveloper(Number(projectId))
              )
            }
            color="primary"
            onClick={openDialogForCreate}
          >
            {messages.newRun}
          </Button>
        </div>
      </div>

      <RunsTable
        projectId={projectId}
        isDisabled={
          !(context.isAdmin() || context.isProjectDeveloper(Number(projectId)))
        }
        runs={runs}
        onDeleteRun={onDeleteClick}
        onDuplicateRun={onDuplicateClick}
        messages={messages}
        locale={locale}
      />

      <RunDialog
        isOpen={isRunDialogOpen}
        editingRun={editingRun}
        onCancel={closeDialog}
        onSubmit={onSubmit}
        messages={messages}
      />

      <DuplicateRunDialog
        isOpen={isDuplicateDialogOpen}
        sourceRun={duplicatingRun}
        onCancel={closeDuplicateDialog}
        onSubmit={onDuplicate}
        messages={messages}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmDialogOpen}
        onCancel={closeDeleteConfirmDialog}
        onConfirm={onConfirm}
        closeText={messages.close}
        confirmText={messages.areYouSure}
        deleteText={messages.delete}
      />
    </div>
  )
}
