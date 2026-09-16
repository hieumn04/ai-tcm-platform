'use client'
import { useState, useEffect, useContext, useCallback, useRef } from 'react'
import { TokenContext } from '@/utils/TokenProvider'
import TestCaseTable from './TestCaseTable'
import {
  fetchCases,
  createCase,
  deleteCases,
  importCases,
  duplicateCase,
} from '@/utils/caseControl'
import { CaseType, CasesMessages } from '@/types/case'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import CaseDialog from './CaseDialog'
import { PriorityMessages } from '@/types/priority'
import { LocaleCodeType } from '@/types/locale'
import ImportCaseDialog from './ImportCaseDialog'
import AiGenerateCaseDialog from './AiGenerateCaseDialog'
import { FolderType } from '@/types/folder'
import { fetchFolderByFolderId } from '../../foldersControl'
import { useRouter } from '@/src/navigation'
import { ToastContext } from '@/utils/ToastProvider'
import { addRunCases } from '@/utils/runCaseControl'
import AddTestCasesIntoRunDialog from './AddTestCasesIntoRunDialog'
import {
  useSearchParams,
  usePathname,
  useRouter as useNextRouter,
} from 'next/navigation'

type Props = {
  projectId: string
  folderId: string
  messages: CasesMessages
  priorityMessages: PriorityMessages
  locale: LocaleCodeType
}

export default function CasesPane({
  projectId,
  folderId,
  messages,
  priorityMessages,
  locale,
}: Props) {
  const [cases, setCases] = useState<CaseType[]>([])
  const context = useContext(TokenContext)
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false)
  const [isImportCaseDialogOpen, setIsImportCaseDialogOpen] = useState(false)
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false)
  const [folder, setFolder] = useState<FolderType>()
  const [totalCasesCount, setTotalCasesCount] = useState(0)
  const [filteredTotalCasesCount, setFilteredTotalCasesCount] = useState(0)
  const [aiCasesCount, setAiCasesCount] = useState(0)
  const toastContext = useContext(ToastContext)
  const [page, setPage] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false)
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined)
  const [sortDirection, setSortDirection] = useState<
    'ASC' | 'DESC' | undefined
  >(undefined)
  const [isFetching, setIsFetching] = useState(false)
  const router = useRouter()

  // Add a ref to track the previous fetch parameters
  const prevFetchParams = useRef({
    folderId: '',
    page: 0,
    search: '',
    sortColumn: '',
    sortDirection: undefined as 'ASC' | 'DESC' | undefined,
    lastFetchId: '', // Track the last fetch ID
  })

  // URL parameters handling
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const routerInstance = useNextRouter()

  // Helper function to update URL with current parameters
  const updateUrlWithParams = useCallback(
    (newParams: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove parameters based on provided values
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      // Replace the current URL with updated parameters
      routerInstance.replace(`${pathname}?${params.toString()}`, {
        scroll: false,
      })
    },
    [searchParams, pathname, routerInstance],
  )

  // Load from URL parameters on initial render
  useEffect(() => {
    const urlPage = searchParams.get('page')
    const urlSortColumn = searchParams.get('sortColumn')
    const urlSortDirection = searchParams.get('sortDirection') as
      | 'ASC'
      | 'DESC'
      | null
    const urlSearch = searchParams.get('search')

    if (urlPage) {
      setPage(parseInt(urlPage, 10))
    }

    if (urlSortColumn) {
      setSortColumn(urlSortColumn)
    }

    if (urlSortDirection) {
      setSortDirection(urlSortDirection)
    }

    if (urlSearch) {
      setSearchTerm(urlSearch)
    }

    setIsPageLoaded(true)
  }, [searchParams])

  // Main data fetching function
  const fetchData = useCallback(
    async (
      pageNum: number,
      search: string,
      sort?: string,
      direction?: 'ASC' | 'DESC',
    ) => {
      if (!context.isSignedIn() || isFetching) return

      // Create a fetch ID to represent this specific request
      const fetchId = `${folderId}_${pageNum}_${search || ''}_${sort || ''}_${direction || ''}`

      // Don't refetch the same data
      if (fetchId === prevFetchParams.current.lastFetchId) {
        return
      }

      setIsFetching(true)
      setLoading(true)

      try {
        // Fetch folder data only if not already loaded
        if (!folder) {
          const folderData: FolderType = await fetchFolderByFolderId(
            context.token.access_token,
            Number(projectId),
            Number(folderId),
          )
          setFolder(folderData)
        }

        // Fetch cases with sorting and filtering
        const data = await fetchCases(
          context.token.access_token,
          Number(folderId),
          pageNum,
          search || undefined,
          sort,
          direction,
        )

        // Save the fetch ID to avoid redundant fetches
        prevFetchParams.current.lastFetchId = fetchId

        // Only update state if the component is still mounted and no newer request was made
        setCases(data.cases || [])
        setTotalCasesCount(data.totalCases)
        setFilteredTotalCasesCount(data.filteredTotal)
        setAiCasesCount(data.totalUseAICases)
        setTotalPages(data.totalPages)
      } catch (error: any) {
        toastContext.showToast(
          `Error loading test cases: ${error.message}`,
          'error',
          5000,
        )

        // Reset sort if it caused the error
        if (error.message.includes('sort')) {
          setSortColumn(undefined)
          setSortDirection(undefined)
          updateUrlWithParams({
            sortColumn: undefined,
            sortDirection: undefined,
          })
        }
      } finally {
        setLoading(false)
        setIsFetching(false)
      }
    },
    [
      context,
      projectId,
      folderId,
      folder,
      toastContext,
      updateUrlWithParams,
      isFetching,
    ],
  )

  // Debounced search handler
  const onSearchCases = useCallback(
    (query: string) => {
      if (query === searchTerm) return

      setSearchTerm(query)

      // Update only the search parameter in URL
      updateUrlWithParams({
        search: query,
        page: '1', // Reset page to 1 when searching
      })

      // Clear any pending timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Fetch data with the new search term
      debounceTimeoutRef.current = setTimeout(() => {
        // Only fetch if not already fetching
        if (!fetchInProgressRef.current) {
          fetchInProgressRef.current = true
          setLoading(true)

          // Get current sort parameters
          const currentSortColumn = searchParams.get('sortColumn') || sortColumn
          const currentSortDirection = (searchParams.get('sortDirection') ||
            sortDirection) as 'ASC' | 'DESC' | undefined

          // Perform the data fetch
          fetchCases(
            context.token.access_token,
            Number(folderId),
            1, // Always start at page 1 for new search
            query || undefined,
            currentSortColumn || undefined,
            currentSortDirection,
          )
            .then((data) => {
              setCases(data.cases || [])
              setTotalCasesCount(data.totalCases)
              setFilteredTotalCasesCount(data.filteredTotal)
              setAiCasesCount(data.totalUseAICases)
              setTotalPages(data.totalPages)

              // Update the last fetch params
              lastFetchParamsRef.current = {
                folderId,
                page: 1,
                search: query,
                sortColumn: currentSortColumn || '',
                sortDirection: currentSortDirection,
              }
            })
            .catch((error) => {
              toastContext.showToast(
                `Error searching: ${error.message}`,
                'error',
                5000,
              )
            })
            .finally(() => {
              fetchInProgressRef.current = false
              setLoading(false)
            })
        }
      }, 350)
    },
    [
      updateUrlWithParams,
      searchTerm,
      folderId,
      context.token.access_token,
      sortColumn,
      sortDirection,
      searchParams,
      toastContext,
    ],
  )

  // Add a debounceTimeout ref to handle the debouncing of sort requests
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add a fetchInProgress ref to track if a fetch is already in progress
  const fetchInProgressRef = useRef(false)

  // Add a lastFetchParamsRef to track the last fetch parameters
  const lastFetchParamsRef = useRef({
    folderId: '',
    page: 0,
    search: '',
    sortColumn: '',
    sortDirection: undefined as 'ASC' | 'DESC' | undefined,
  })

  // Sort change handler with debouncing
  const handleSortChange = useCallback(
    (column: string, direction: 'ASC' | 'DESC') => {
      // Prevent duplicate sort calls for the same parameters
      if (sortColumn === column && sortDirection === direction) {
        return
      }

      // Set UI state immediately for responsive feel
      setSortColumn(column)
      setSortDirection(direction)
      setPage(1) // Reset to page 1

      // Update URL params
      updateUrlWithParams({
        sortColumn: column,
        sortDirection: direction,
        page: '1', // Reset page to 1
      })

      // Clear any pending timeout to prevent multiple calls
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Set a debounce timeout to prevent rapid consecutive calls
      debounceTimeoutRef.current = setTimeout(() => {
        const searchToUse = searchParams.get('search') || searchTerm || ''

        // Check if this is a duplicate of the last fetch
        const isSameParams =
          folderId === lastFetchParamsRef.current.folderId &&
          1 === lastFetchParamsRef.current.page && // Always use page 1
          searchToUse === lastFetchParamsRef.current.search &&
          column === lastFetchParamsRef.current.sortColumn &&
          direction === lastFetchParamsRef.current.sortDirection

        if (isSameParams && !searchParams.has('forceRefresh')) {
          return
        }

        // Update the last fetch params
        lastFetchParamsRef.current = {
          folderId,
          page: 1, // Always use page 1
          search: searchToUse,
          sortColumn: column,
          sortDirection: direction,
        }

        // Fetch data but only if not already fetching
        if (!fetchInProgressRef.current) {
          fetchInProgressRef.current = true
          setLoading(true)

          // Perform the data fetch
          fetchCases(
            context.token.access_token,
            Number(folderId),
            1, // Always use page 1
            searchToUse || undefined,
            column,
            direction,
          )
            .then((data) => {
              setCases(data.cases || [])
              setTotalCasesCount(data.totalCases)
              setFilteredTotalCasesCount(data.filteredTotal)
              setAiCasesCount(data.totalUseAICases)
              setTotalPages(data.totalPages)
            })
            .catch((error) => {
              toastContext.showToast(
                `Error loading test cases: ${error.message}`,
                'error',
                5000,
              )

              // Reset sort on error
              setSortColumn(undefined)
              setSortDirection(undefined)
              updateUrlWithParams({
                sortColumn: undefined,
                sortDirection: undefined,
              })
            })
            .finally(() => {
              fetchInProgressRef.current = false
              setLoading(false)
            })
        }
      }, 250)

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }
      }
    },
    [
      updateUrlWithParams,
      context.token.access_token,
      folderId,
      searchTerm,
      sortColumn,
      sortDirection,
      searchParams,
      toastContext,
    ],
  )

  // Page change handler
  const handlePageChange = useCallback(
    (newPage: number) => {
      // Prevent changing to the same page
      if (newPage === page) {
        return
      }

      setPage(newPage)

      // Update URL with new page
      updateUrlWithParams({
        page: newPage.toString(),
      })

      // URL change will trigger the data fetch from the useEffect
    },
    [updateUrlWithParams, page],
  )

  // Fetch data when URL parameters change
  useEffect(() => {
    // Don't fetch until page is loaded and user is signed in
    if (!isPageLoaded || !context.isSignedIn()) {
      return
    }

    // Don't fetch if already fetching
    if (fetchInProgressRef.current) {
      return
    }

    // Get current parameters from URL or state
    const currentPage = Number(searchParams.get('page')) || page
    const currentSearch = searchParams.get('search') || searchTerm || ''
    const currentSortColumn = searchParams.get('sortColumn') || sortColumn
    const currentSortDirection = (searchParams.get('sortDirection') ||
      sortDirection) as 'ASC' | 'DESC' | undefined

    // Check if this is a duplicate of the last fetch
    const isSameParams =
      folderId === lastFetchParamsRef.current.folderId &&
      currentPage === lastFetchParamsRef.current.page &&
      currentSearch === lastFetchParamsRef.current.search &&
      (currentSortColumn || '') === lastFetchParamsRef.current.sortColumn &&
      currentSortDirection === lastFetchParamsRef.current.sortDirection

    if (isSameParams && !searchParams.has('forceRefresh')) {
      return
    }

    // Clear any pending timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set a debounce timeout for URL parameter changes
    debounceTimeoutRef.current = setTimeout(() => {
      fetchInProgressRef.current = true
      setLoading(true)

      // Fetch folder data if not already loaded
      const fetchFolderPromise = !folder
        ? fetchFolderByFolderId(
            context.token.access_token,
            Number(projectId),
            Number(folderId),
          )
        : Promise.resolve(null)

      fetchFolderPromise
        .then((folderData) => {
          if (folderData) {
            setFolder(folderData)
          }

          // Now fetch cases
          return fetchCases(
            context.token.access_token,
            Number(folderId),
            currentPage,
            currentSearch || undefined,
            currentSortColumn || undefined,
            currentSortDirection,
          )
        })
        .then((data) => {
          setCases(data.cases || [])
          setTotalCasesCount(data.totalCases)
          setFilteredTotalCasesCount(data.filteredTotal)
          setAiCasesCount(data.totalUseAICases)
          setTotalPages(data.totalPages)

          // Update the last fetch params
          lastFetchParamsRef.current = {
            folderId,
            page: currentPage,
            search: currentSearch,
            sortColumn: currentSortColumn || '',
            sortDirection: currentSortDirection,
          }
        })
        .catch((error) => {
          toastContext.showToast(
            `Error loading data: ${error.message}`,
            'error',
            5000,
          )
        })
        .finally(() => {
          fetchInProgressRef.current = false
          setLoading(false)
        })
    }, 250)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPageLoaded,
    context.isSignedIn,
    folderId,
    searchParams,
    page,
    searchTerm,
    sortColumn,
    sortDirection,
    context.token.access_token,
    projectId,
    folder,
    toastContext,
  ])

  // Reset all filters and sorting
  const resetAllFilters = useCallback(() => {
    // Clear any pending timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setSearchTerm('')
    setSortColumn(undefined)
    setSortDirection(undefined)

    // Clear parameters from URL but preserve page
    updateUrlWithParams({
      sortColumn: undefined,
      sortDirection: undefined,
      search: undefined,
    })

    // URL change will trigger the data fetch from the useEffect
  }, [updateUrlWithParams, debounceTimeoutRef])

  const closeDialog = () => {
    setIsCaseDialogOpen(false)
  }

  const closeImportDialog = () => {
    setIsImportCaseDialogOpen(false)
  }

  const onSubmit = async (
    customId: string,
    title: string,
    description: string,
  ) => {
    const newCase = await createCase(
      context.token.access_token,
      folderId,
      title,
      description,
      context.token.user?.id as number | null,
      customId,
    )
    setCases([...cases, newCase])
    closeDialog()
    router.push(
      `/projects/${projectId}/folders/${newCase.folderId}/cases/${newCase.id}`,
      { locale: locale },
    )
  }

  const onSubmitImportedCases = async (
    jsonData: any[],
    title: string,
    description: string,
    priority: string,
    preConditions: string,
    expectedResults: string,
    stepsDetail: string,
    isAuto: string,
    useAI: string,
    customId: string,
    complexity: string,
  ) => {
    if (!jsonData.length) return

    try {
      const response = await importCases(
        context.token.access_token,
        folderId,
        jsonData,
        title,
        description,
        priority,
        preConditions,
        expectedResults,
        stepsDetail,
        isAuto,
        useAI,
        customId,
        complexity,
        context.token.user?.id,
      )

      // Clear any pending timeout and reset fetch state
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Reset fetch progress flag
      fetchInProgressRef.current = false

      // Reset the lastFetchParams to force a re-fetch
      lastFetchParamsRef.current = {
        folderId: '',
        page: 0,
        search: '',
        sortColumn: '',
        sortDirection: undefined,
      }

      // Get current parameters from URL and state
      const currentPage = Number(searchParams.get('page')) || page
      const currentSearch = searchParams.get('search') || searchTerm || ''
      const currentSortColumn = searchParams.get('sortColumn') || sortColumn
      const currentSortDirection = (searchParams.get('sortDirection') ||
        sortDirection) as 'ASC' | 'DESC' | undefined

      // Force data refresh after import
      setLoading(true)

      // Use the fetchData function instead of fetchCases directly to ensure proper handling
      try {
        const data = await fetchCases(
          context.token.access_token,
          Number(folderId),
          currentPage,
          currentSearch || undefined,
          currentSortColumn || undefined,
          currentSortDirection,
        )

        setCases(data.cases || [])
        setTotalCasesCount(data.totalCases)
        setFilteredTotalCasesCount(data.filteredTotal)
        setAiCasesCount(data.totalUseAICases)
        setTotalPages(data.totalPages)

        // Show success message from backend response
        toastContext.showToast(
          response.message || 'Import completed successfully',
          'success',
          3000,
        )
      } catch (error) {
        toastContext.showToast(
          `Error refreshing data: ${(error as Error).message}`,
          'error',
          5000,
        )
      } finally {
        setLoading(false)
      }

      // Close dialog only after successful import
      closeImportDialog()
      return true
    } catch (error: any) {
      // Enhanced error handling to show important fields
      let errorMessage = error.message || 'Unknown error occurred'

      // Include cause if available
      if (error.cause) {
        errorMessage += `\n\nCause: ${error.cause}`
      }

      // Include detailed information if available
      if (error.details) {
        errorMessage += `\n\nDetails: ${error.details}`
      }

      toastContext.showToast(`❌ ${errorMessage}`, 'error', 5000) // Show error message for longer time
      throw error // Re-throw the error to be caught by the ImportCaseDialog
    }
  }

  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] =
    useState(false)
  const [deleteCaseIds, setDeleteCaseIds] = useState<number[]>([])
  const closeDeleteConfirmDialog = () => {
    setIsDeleteConfirmDialogOpen(false)
    setDeleteCaseIds([])
  }

  const onDeleteCase = async (deleteCaseId: number) => {
    setDeleteCaseIds([deleteCaseId])
    setIsDeleteConfirmDialogOpen(true)
  }

  const onDeleteCases = (deleteCaseIds: number[]) => {
    setDeleteCaseIds(deleteCaseIds)
    setIsDeleteConfirmDialogOpen(true)
  }

  const onDuplicateCase = async (caseId: number) => {
    try {
      const sourceCase = cases.find((c) => c.id === caseId)
      const duplicatedTitle = sourceCase
        ? `${sourceCase.title} (copy)`
        : undefined

      await duplicateCase(context.token.access_token, caseId, duplicatedTitle)

      // Refresh the cases list to show the new duplicated case
      await fetchData(page, searchTerm, sortColumn, sortDirection)

      toastContext.showToast('Test case duplicated successfully', 'success')
    } catch (error: any) {
      toastContext.showToast(
        `Failed to duplicate test case: ${error.message}`,
        'error',
        5000,
      )
    }
  }

  const onConfirm = async () => {
    if (deleteCaseIds.length > 0 || isAllPagesSelected) {
      try {
        await deleteCases(
          context.token.access_token,
          deleteCaseIds,
          Number(projectId),
          Number(folderId),
          isAllPagesSelected,
        )

        // Show success message
        const message = isAllPagesSelected
          ? 'Successfully deleted all test cases'
          : `Successfully deleted ${deleteCaseIds.length} test case${deleteCaseIds.length > 1 ? 's' : ''}`
        toastContext.showToast(message, 'success', 3000)

        // Reset sort if we deleted all cases
        if (isAllPagesSelected) {
          resetAllFilters()
        } else {
          // Clear any pending timeout and reset fetch state
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
          }

          // Reset fetch progress flag
          fetchInProgressRef.current = false

          // Reset the lastFetchParams to force a re-fetch
          lastFetchParamsRef.current = {
            folderId: '',
            page: 0,
            search: '',
            sortColumn: '',
            sortDirection: undefined,
          }

          // Directly fetch data with current parameters
          const currentPage = Number(searchParams.get('page')) || page
          const currentSearch = searchParams.get('search') || searchTerm || ''
          const currentSortColumn = searchParams.get('sortColumn') || sortColumn
          const currentSortDirection = (searchParams.get('sortDirection') ||
            sortDirection) as 'ASC' | 'DESC' | undefined

          setLoading(true)
          fetchCases(
            context.token.access_token,
            Number(folderId),
            currentPage,
            currentSearch || undefined,
            currentSortColumn || undefined,
            currentSortDirection,
          )
            .then((data) => {
              setCases(data.cases || [])
              setTotalCasesCount(data.totalCases)
              setFilteredTotalCasesCount(data.filteredTotal)
              setAiCasesCount(data.totalUseAICases)
              setTotalPages(data.totalPages)
            })
            .catch((error) => {
              toastContext.showToast(
                `Error refreshing data: ${error.message}`,
                'error',
                5000,
              )
            })
            .finally(() => {
              setLoading(false)
            })
        }

        setIsAllPagesSelected(false)
        closeDeleteConfirmDialog()
      } catch (error: any) {
        toastContext.showToast(
          `Failed to delete test case${deleteCaseIds.length > 1 ? 's' : ''}: ${error.message}`,
          'error',
          5000,
        )
      }
    }
  }

  const [
    isAddTestCasesIntoRunConfirmDialogOpen,
    setIsAddTestCasesIntoRunConfirmDialogOpen,
  ] = useState(false)
  const [addCasesIds, setAddCaseIds] = useState<number[]>([])
  const onAddTestCasesIntoRun = (caseIds: number[]) => {
    setAddCaseIds(caseIds)
    setIsAddTestCasesIntoRunConfirmDialogOpen(true)
  }

  const onConfirmAdd = async (
    runId: number | null,
    customRunName?: string,
    description?: string,
  ) => {
    try {
      if (addCasesIds.length > 0 || isAllPagesSelected) {
        const response = await addRunCases(
          context.token.access_token,
          isAllPagesSelected ? [] : addCasesIds,
          Number(projectId),
          runId,
          Number(folderId),
          isAllPagesSelected,
          customRunName,
          description,
        )

        // Use the backend response message instead of hardcoded message
        toastContext.showToast(
          response.message || 'Test cases added to run successfully',
          'success',
          5000,
        )

        const finalRunId = runId ?? response.runId
        router.push(`/projects/${projectId}/runs/${finalRunId}`, {
          locale: locale,
        })
      }
    } catch (error) {
      toastContext.showToast(
        '❌ Failed to add test cases. Please try again.',
        'error',
        5000,
      )
    }

    setAddCaseIds([])
    setIsAddTestCasesIntoRunConfirmDialogOpen(false)
  }

  const onCancelAdd = () => {
    setIsAddTestCasesIntoRunConfirmDialogOpen(false)
  }

  const handleRefresh = useCallback(async () => {
    prevFetchParams.current.lastFetchId = ''
    setIsFetching(false)
    await fetchData(page, searchTerm, sortColumn, sortDirection)
    toastContext.showToast('Test cases reloaded successfully!', 'success', 2000)
  }, [fetchData, page, searchTerm, sortColumn, sortDirection, toastContext])

  return (
    <>
      <TestCaseTable
        projectId={projectId}
        isDisabled={
          !(context.isProjectDeveloper(Number(projectId)) || context.isAdmin())
        }
        cases={cases}
        onCreateCase={() => setIsCaseDialogOpen(true)}
        onImportCase={() => setIsImportCaseDialogOpen(true)}
        onOpenAiDialog={() => setIsAiDialogOpen(true)}
        onDeleteCase={onDeleteCase}
        onDuplicateCase={onDuplicateCase}
        onDeleteCases={onDeleteCases}
        messages={messages}
        priorityMessages={priorityMessages}
        locale={locale}
        folder={folder || ({} as FolderType)}
        onSearchCases={onSearchCases}
        totalCasesCount={totalCasesCount}
        filteredTotalCasesCount={filteredTotalCasesCount}
        aiCasesCount={aiCasesCount}
        page={page}
        setPage={handlePageChange}
        loading={loading || isFetching}
        totalPages={totalPages}
        isPageLoaded={isPageLoaded}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddTestCasesIntoRun={onAddTestCasesIntoRun}
        isAllPagesSelected={isAllPagesSelected}
        setIsAllPagesSelected={setIsAllPagesSelected}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onResetFilters={resetAllFilters}
        onRefresh={handleRefresh}
      />

      <AiGenerateCaseDialog
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        folderId={folderId}
        onCaseCreated={() => {
          fetchData(page, searchTerm, sortColumn, sortDirection)
        }}
      />

      <CaseDialog
        isOpen={isCaseDialogOpen}
        onCancel={closeDialog}
        onSubmit={onSubmit}
        messages={messages}
      />

      <ImportCaseDialog
        isOpen={isImportCaseDialogOpen}
        onCancel={closeImportDialog}
        onSubmit={onSubmitImportedCases}
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

      <AddTestCasesIntoRunDialog
        isOpen={isAddTestCasesIntoRunConfirmDialogOpen}
        onConfirm={onConfirmAdd}
        onCancel={onCancelAdd}
        addCaseIds={addCasesIds}
        projectId={projectId}
        isAllPagesSelected={isAllPagesSelected}
        totalCasesCount={totalCasesCount}
      />
    </>
  )
}
