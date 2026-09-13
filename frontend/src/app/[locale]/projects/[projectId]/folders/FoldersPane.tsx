'use client'
import { FolderType, FoldersMessages } from '@/types/folder'
import { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { Button, Listbox, ListboxItem } from '@nextui-org/react'
import { Folder, Plus } from 'lucide-react'
import { usePathname, useRouter } from '@/src/navigation'
import { TokenContext } from '@/utils/TokenProvider'
import useGetCurrentIds from '@/utils/useGetCurrentIds'
import FolderDialog from './FolderDialog'
import FolderEditMenu from './FolderEditMenu'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import {
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from './foldersControl'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// Use a global cache to prevent duplicate API calls across re-renders and remounts
const fetchCache: Record<string, Promise<any>> = {}

type Props = {
  projectId: string
  messages: FoldersMessages
  locale: any
}

export default function FoldersPane({ projectId, messages, locale }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const context = useContext(TokenContext)
  const [folders, setFolders] = useState<FolderType[]>([])
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null)
  const { folderId } = useGetCurrentIds()
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep track if we have loaded folders already
  const hasLoadedFoldersRef = useRef(false)

  // Fetch folders only once and cache the result
  const fetchFoldersData = useCallback(
    async (force = false) => {
      // Don't fetch if not signed in or if we've already loaded and not forcing
      if (!context.isSignedIn() || (hasLoadedFoldersRef.current && !force)) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const cacheKey = `folders_${projectId}`

        // Use cached promise if available to deduplicate requests
        if (!fetchCache[cacheKey] || force) {
          // Create a new promise for this fetch operation and cache it
          fetchCache[cacheKey] = fetchFolders(
            context.token.access_token,
            Number(projectId),
          )
        }

        // Use the cached promise
        const fetchedFolders = (await fetchCache[cacheKey]) as FolderType[]

        // Validate that fetchedFolders is an array
        if (!Array.isArray(fetchedFolders)) {
          throw new Error(
            'Invalid response format: folders data is not an array',
          )
        }

        // Only set state if we have new data
        if (fetchedFolders) {
          setFolders(fetchedFolders)
          hasLoadedFoldersRef.current = true

          if (fetchedFolders.length === 0) {
            setIsLoading(false)
            return
          }

          const selectedFolderFromUrl = fetchedFolders.find(
            (folder) => folder.id === folderId,
          )
          setSelectedFolder(selectedFolderFromUrl || null)

          // Redirect if we're on the base folders path and have folders
          if (
            pathname === `/projects/${projectId}/folders` &&
            fetchedFolders.length > 0
          ) {
            sessionStorage.setItem('currentPage', '1')
            router.push(
              `/projects/${projectId}/folders/${fetchedFolders[0].id}/cases`,
              { locale },
            )
          }
        }
      } catch (error: any) {
        setError(error.message || 'Failed to fetch folders')
        setFolders([]) // Reset folders to empty array on error
        // Clear cache on error
        const cacheKey = `folders_${projectId}`
        delete fetchCache[cacheKey]
      } finally {
        setIsLoading(false)
      }
    },
    [context, projectId, pathname, router, locale, folderId],
  )

  // Fetch on initial mount and when dependencies change
  useEffect(() => {
    fetchFoldersData()

    // Reset the flag when projectId changes
    return () => {
      if (projectId) {
        hasLoadedFoldersRef.current = false
      }
    }
  }, [fetchFoldersData, projectId])

  // Update selected folder when folderId changes
  useEffect(() => {
    if (folders.length > 0 && folderId) {
      const selectedFolderFromUrl = folders.find(
        (folder) => folder.id === folderId,
      )
      setSelectedFolder(selectedFolderFromUrl || null)
    }
  }, [folderId, folders])

  // Force a refresh (used after mutations)
  const refreshFolders = useCallback(() => {
    // Force a refresh by ignoring the cache
    fetchFoldersData(true)
  }, [fetchFoldersData])

  const openDialogForCreate = () => {
    setIsFolderDialogOpen(true)
    setEditingFolder(null)
  }

  const closeDialog = () => {
    setIsFolderDialogOpen(false)
    setEditingFolder(null)
  }

  const onSubmit = async (name: string, detail: string) => {
    try {
      if (editingFolder) {
        const updatedFolder = await updateFolder(
          context.token.access_token,
          editingFolder.id,
          name,
          detail,
          projectId,
          null,
        )

        // Update local state without a full refetch
        setFolders((prevFolders) =>
          prevFolders.map((folder) =>
            folder.id === updatedFolder.id ? updatedFolder : folder,
          ),
        )

        sessionStorage.setItem('currentPage', '1')
        router.push(
          `/projects/${projectId}/folders/${updatedFolder.id}/cases`,
          { locale },
        )
      } else {
        const newFolder = await createFolder(
          context.token.access_token,
          name,
          detail,
          projectId,
          null,
        )

        // Update local state without a full refetch
        setFolders((prevFolders) => [newFolder, ...prevFolders]) // Add new folder at the top

        // Auto-redirect to the new folder
        sessionStorage.setItem('currentPage', '1')
        router.push(`/projects/${projectId}/folders/${newFolder.id}/cases`, {
          locale,
        })
      }
    } finally {
      // Always invalidate the cache after mutations
      const cacheKey = `folders_${projectId}`
      delete fetchCache[cacheKey]
    }

    closeDialog()
  }

  const onEditClick = (folder: FolderType) => {
    setEditingFolder(folder)
    setIsFolderDialogOpen(true)
  }

  // Delete confirm dialog
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] =
    useState(false)
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null)

  const closeDeleteConfirmDialog = () => {
    setIsDeleteConfirmDialogOpen(false)
    setDeleteFolderId(null)
  }

  const onDeleteClick = (deleteFolderId: number) => {
    setDeleteFolderId(deleteFolderId)
    setIsDeleteConfirmDialogOpen(true)
  }

  const onConfirm = async () => {
    if (deleteFolderId) {
      try {
        await deleteFolder(context.token.access_token, deleteFolderId)

        // Invalidate cache after deletion
        const cacheKey = `folders_${projectId}`
        delete fetchCache[cacheKey]

        router.push(`/projects/${projectId}/folders`, { locale })
        closeDeleteConfirmDialog()

        // Refresh folders after a short delay to ensure navigation completes
        setTimeout(() => {
          refreshFolders()
        }, 100)
      } catch (error) {
        console.error('Error deleting folder:', error)
      }
    }
  }

  const baseClass = ''
  const selectedClass = `${baseClass} bg-neutral-200 dark:bg-neutral-700`

  return (
    <>
      <div className="w-64 min-h-[calc(100vh-64px)] border-r-1 dark:border-neutral-700 overflow-y-auto max-h-[calc(100vh-64px)] ml-1">
        <div className="flex justify-center m-2">
          <Button
            startContent={<Plus size={16} />}
            size="sm"
            variant="bordered"
            isDisabled={
              !(
                context.isProjectDeveloper(Number(projectId)) ||
                context.isAdmin()
              )
            }
            onClick={openDialogForCreate}
          >
            {messages.newFolder}
          </Button>
        </div>
        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : isLoading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : (
          <Listbox aria-label="Listbox Variants" variant="light">
            {Array.isArray(folders)
              ? folders.map((folder) => (
                  <ListboxItem
                    key={folder.id}
                    onClick={() => {
                      if (selectedFolder?.id !== folder.id) {
                        sessionStorage.setItem('currentPage', '1')
                        router.push(
                          `/projects/${projectId}/folders/${folder.id}/cases`,
                          { locale },
                        )
                      }
                    }}
                    startContent={
                      <Folder size={20} color="#F7C24E" fill="#F7C24E" />
                    }
                    className={
                      selectedFolder && folder.id === selectedFolder.id
                        ? selectedClass
                        : baseClass
                    }
                    endContent={
                      <FolderEditMenu
                        folder={folder}
                        isDisabled={
                          !(
                            context.isProjectDeveloper(Number(projectId)) ||
                            context.isAdmin()
                          )
                        }
                        onEditClick={onEditClick}
                        onDeleteClick={onDeleteClick}
                        messages={messages}
                      />
                    }
                  >
                    <div className="flex flex-col">
                      <span>{folder.name}</span>
                      <span className="text-xs text-neutral-500">
                        {dayjs(folder.updatedAt)
                          .tz('Asia/Bangkok')
                          .format('DD/MM/YYYY HH:mm')}
                      </span>
                    </div>
                  </ListboxItem>
                ))
              : null}
          </Listbox>
        )}
      </div>

      <FolderDialog
        isOpen={isFolderDialogOpen}
        editingFolder={editingFolder}
        onCancel={closeDialog}
        onSubmit={onSubmit}
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
    </>
  )
}
