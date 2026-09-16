'use client'
import React, {
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useState,
  useContext,
} from 'react'
import { useRouter } from '@/src/navigation'
import {
  useSearchParams,
  usePathname,
  useRouter as useNextRouter,
} from 'next/navigation'
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Tooltip,
  Divider,
  Selection,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@nextui-org/react'
import {
  Save,
  Circle,
  ArrowLeft,
  ChevronDown,
  CopyPlus,
  CopyMinus,
} from 'lucide-react'
import TestCaseSelector from './TestCaseSelector'
import RunProgressDounut from './RunPregressDonutChart'
import { wsService } from '@/src/utils/websocket.service'
import { testRunCaseStatus, testRunStatus } from '@/config/selection'
import {
  RunType,
  RunMessages,
  RunCaseType,
  PlatformStatusType,
  RunStatusCountType,
} from '@/types/run'
import { CaseMessages } from '@/types/case'
import { capitalizeWords } from '@/utils/textUtils'
import { fetchRun, updateRun, updateRunCases } from '../runsControl'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import { useFormGuard } from '@/utils/formGuard'
import { PriorityMessages } from '@/types/priority'
import { RunStatusMessages, TestRunCaseStatusMessages } from '@/types/status'
import { TestTypeMessages } from '@/types/testType'
import { LocaleCodeType } from '@/types/locale'
import { fetchRunCases, removeRunCases } from '@/utils/runCaseControl'
import {
  fetchAllPlatformStatuses,
  updateRunPlatformStatus,
} from '../runsControl'

type PlatformType = {
  id: string
  platform: string
  isInclude: boolean
}

const defaultTestRun = {
  id: 0,
  name: '',
  configurations: 0,
  description: '',
  state: 0,
  projectId: 0,
  createdAt: '',
  updatedAt: '',
}

type Props = {
  projectId: string
  runId: string
  messages: RunMessages
  runStatusMessages: RunStatusMessages
  testRunCaseStatusMessages: TestRunCaseStatusMessages
  priorityMessages: PriorityMessages
  testTypeMessages: TestTypeMessages
  testCaseMessages: CaseMessages
  locale: LocaleCodeType
}

export default function RunEditor({
  projectId,
  runId,
  messages,
  runStatusMessages,
  testRunCaseStatusMessages,
  priorityMessages,
  testTypeMessages,
  testCaseMessages,
  locale,
}: Props) {
  const tokenContext = useContext(TokenContext)
  const toastContext = useContext(ToastContext)
  const router = useRouter()
  const routerInstance = useNextRouter()

  // Helper function to normalize platform names to match backend expectations
  const normalizePlatform = useCallback(
    (platform: string | undefined): PlatformStatusType['platform'] => {
      if (typeof platform !== 'string' || !platform) {
        return 'web' // fallback
      }
      const lowercasePlatform = platform.toLowerCase()
      // Validate that it's a known platform
      if (
        ['web', 'wap', 'zma', 'ios', 'android', 'api'].includes(
          lowercasePlatform,
        )
      ) {
        return lowercasePlatform as PlatformStatusType['platform']
      }
      // Fallback to web if unknown platform
      return 'web'
    },
    [],
  )

  // Run data state
  const [testRun, setTestRun] = useState<RunType>(defaultTestRun)
  const [runCases, setRunCases] = useState<RunCaseType[]>([])

  // UI state
  const [isNameInvalid, setIsNameInvalid] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(isDirty)
  const [page, setPage] = useState(1)
  const [pendingPage, setPendingPage] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]))
  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false)

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined)
  const [sortDirection, setSortDirection] = useState<
    'ASC' | 'DESC' | undefined
  >(undefined)

  // Platform status state
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<PlatformType[]>([])
  const [selectedPlatformStatus, setSelectedPlatformStatus] = useState<
    Record<string, string>
  >({})

  // URL parameters handling
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // Track if initial data has been loaded to prevent redundant API calls
  const initialDataLoadedRef = useRef(false)
  const initialFetchDoneRef = useRef(false)

  // Track previous fetch parameters to prevent duplicate calls
  const prevFetchParamsRef = useRef({
    pageNum: 0,
    search: '',
    sort: '',
    direction: undefined as 'ASC' | 'DESC' | undefined,
    requestId: '',
  })

  // Track if a fetch is in progress
  const fetchInProgressRef = useRef(false)

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

      // Replace the current URL with updated parameters without changing others
      routerInstance.replace(`${pathname}?${params.toString()}`, {
        scroll: false,
      })
    },
    [searchParams, pathname, routerInstance],
  )

  // Stable references to avoid unnecessary re-renders
  const stablePage = useMemo(() => page, [page])
  const stableSortColumn = useMemo(() => sortColumn, [sortColumn])
  const stableSortDirection = useMemo(() => sortDirection, [sortDirection])
  const stableSearchTerm = useMemo(() => searchTerm, [searchTerm])

  // Read sort parameters from URL on initial load
  useEffect(() => {
    const urlSortColumn = searchParams.get('sortColumn')
    const urlSortDirection = searchParams.get('sortDirection') as
      | 'ASC'
      | 'DESC'
      | null
    const urlPage = searchParams.get('page')
    const urlSearch = searchParams.get('search')

    // Only update state if parameters are present in the URL
    if (urlSortColumn) {
      setSortColumn(urlSortColumn)
    }

    if (urlSortDirection) {
      setSortDirection(urlSortDirection)
    }

    if (urlPage) {
      const pageNum = parseInt(urlPage, 10)
      if (!isNaN(pageNum) && pageNum > 0) {
        setPage(pageNum)
      }
    }

    if (urlSearch) {
      setSearchTerm(urlSearch)
    }

    setIsPageLoaded(true)
  }, [searchParams])

  // Modal state
  const [openStatusDialog, setOpenStatusDialog] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Count state
  const [filteredTotalCasesCount, setFilteredTotalCasesCount] = useState(0)
  const [totalRunCasesCount, setTotalRunCasesCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [runCaseIdsToRemove, setRunCaseIdsToRemove] = useState<number[]>([])

  // Collaborative presence state (Point 2 & 3)
  const [activeTesters, setActiveTesters] = useState<
    Array<{ caseId: number; userId: number; userName: string }>
  >([])

  // Socket.IO Collaborative Test Runs lifecycle & listeners
  useEffect(() => {
    if (!runId) return

    // 1. Join Socket.IO room for this run
    wsService.joinRunRoom(runId)

    // 2. Listen for presence changes (active testers)
    const unsubPresence = wsService.onActiveTestersChanged((data) => {
      if (String(data.runId) === String(runId)) {
        setActiveTesters(data.activeTesters || [])
      }
    })

    // 3. Listen for delta status updates (Point 3 & 4)
    const unsubStatus = wsService.onCaseStatusUpdated((data) => {
      if (String(data.runId) !== String(runId)) return

      const { updatedCases } = data
      if (!Array.isArray(updatedCases) || updatedCases.length === 0) return

      // Update state in-place -> auto recalculates statusCounts -> Donut Chart & Table re-render smoothly
      setRunCases((prevRunCases) => {
        let hasChanges = false
        const nextRunCases = prevRunCases.map((rc) => {
          const matched = updatedCases.find(
            (u) => u.runCaseId === rc.id || u.caseId === rc.caseId,
          )
          if (!matched) return rc

          hasChanges = true
          const newStatuses = [...rc.statuses]
          matched.statuses.forEach((st) => {
            const idx = newStatuses.findIndex(
              (s) =>
                s.platformStatus?.platform?.toLowerCase() ===
                st.platform?.toLowerCase(),
            )
            if (idx !== -1) {
              newStatuses[idx] = { ...newStatuses[idx], status: st.status }
            } else {
              newStatuses.push({
                status: st.status,
                platformStatus: { id: '', platform: st.platform as any },
                platformId: '',
              })
            }
          })

          return {
            ...rc,
            statuses: newStatuses,
            updatedAt: new Date().toISOString(),
          }
        })

        return hasChanges ? nextRunCases : prevRunCases
      })
    })

    return () => {
      wsService.leaveRunRoom(runId)
      unsubPresence?.()
      unsubStatus?.()
    }
  }, [runId])

  // Point 5: Single source of truth for Donut Chart (derived directly from runCases)
  const statusCounts = useMemo<RunStatusCountType[]>(() => {
    const countsMap: Record<number, number> = {}
    testRunCaseStatus.forEach((_, idx) => {
      countsMap[idx] = 0
    })

    runCases.forEach((rc) => {
      if (rc.statuses && rc.statuses.length > 0) {
        rc.statuses.forEach((s) => {
          countsMap[s.status] = (countsMap[s.status] || 0) + 1
        })
      } else {
        countsMap[0] = (countsMap[0] || 0) + 1
      }
    })

    return Object.entries(countsMap).map(([status, count]) => ({
      status: Number(status),
      count,
    }))
  }, [runCases])

  useFormGuard(isDirty, messages.areYouSureLeave)

  // Update the isDirty ref whenever it changes
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // Helper function to check if sort parameters should be applied
  const shouldUseSorting = useCallback(
    (column?: string, direction?: 'ASC' | 'DESC') => {
      return Boolean(column?.trim() && direction)
    },
    [],
  )

  // Main data fetching function
  const fetchData = useCallback(
    async (
      pageNum: number,
      search: string,
      sort?: string,
      direction?: 'ASC' | 'DESC',
      forceRefresh = false,
    ) => {
      if (!tokenContext.isSignedIn() || !tokenContext.token.access_token) return

      // Don't fetch if already fetching
      if (fetchInProgressRef.current) {
        return
      }

      // Generate a request ID to track this specific fetch
      const requestId = `${pageNum}_${search || ''}_${sort || ''}_${direction || ''}`

      // Check if this is the same as the last fetch
      if (
        !forceRefresh &&
        requestId === prevFetchParamsRef.current.requestId &&
        pageNum === prevFetchParamsRef.current.pageNum &&
        search === prevFetchParamsRef.current.search &&
        sort === prevFetchParamsRef.current.sort &&
        direction === prevFetchParamsRef.current.direction
      ) {
        return
      }

      // Mark as fetching
      fetchInProgressRef.current = true
      setIsFetching(true)

      try {
        // Only fetch run and platform data if not already loaded or if forceRefresh is true
        if (!initialDataLoadedRef.current || forceRefresh) {
          try {
            const { run, statusCounts } = await fetchRun(
              tokenContext.token.access_token,
              Number(runId),
            )
            setTestRun(run)

            const platformData = await fetchAllPlatformStatuses(
              tokenContext.token.access_token,
              Number(runId),
            )
            const platformsArray = Array.isArray(platformData)
              ? platformData
              : []
            setPlatforms(platformsArray)
            setSelectedStatuses(
              platformsArray
                .filter((p: PlatformType) => p.isInclude)
                .map((p: PlatformType) => p.platform),
            )

            initialDataLoadedRef.current = true
          } catch (error) {
            toastContext.showToast(`Error loading run data`, 'error')
          }
        }

        const data = await fetchRunCases(
          tokenContext.token.access_token,
          Number(projectId),
          Number(runId),
          pageNum,
          search || undefined,
          sort,
          direction,
        )

        setFilteredTotalCasesCount(data.filteredTotal)
        setTotalRunCasesCount(data.totalRunCases)
        setTotalPages(data.totalPages || 0)
        setRunCases(data.runCases ?? [])

        // Update prev params for future comparisons
        prevFetchParamsRef.current = {
          pageNum,
          search,
          sort: sort || '',
          direction,
          requestId,
        }

        // Mark initial fetch as done
        initialFetchDoneRef.current = true
      } catch (error: any) {
        toastContext.showToast(
          `Error loading test cases: ${error.message}`,
          'error',
        )

        // Reset sort if it caused the error
        if (error.message.includes('sort')) {
          setSortColumn(undefined)
          setSortDirection(undefined)
          updateUrlWithParams({
            sortColumn: '',
            sortDirection: '',
          })
        }
      } finally {
        fetchInProgressRef.current = false
        setIsFetching(false)
      }
    },
    [tokenContext, projectId, runId, toastContext, updateUrlWithParams],
  )

  // Handler for sort changes from the TestCaseSelector
  const handleSortChange = useCallback(
    (column: string, direction: 'ASC' | 'DESC') => {
      setSortColumn(column)
      setSortDirection(direction)
      setPage(1) // Reset to page 1

      // Update URL with sort parameters and reset page
      updateUrlWithParams({
        sortColumn: column,
        sortDirection: direction,
        page: '1', // Reset page to 1
      })

      // Fetch data immediately with the new sort parameters
      fetchData(1, searchTerm, column, direction).catch((error) => {
        toastContext.showToast(`Error sorting data: ${error.message}`, 'error')
        // Reset sort if it caused an error
        setSortColumn(undefined)
        setSortDirection(undefined)
        updateUrlWithParams({
          sortColumn: '',
          sortDirection: '',
        })
      })
    },
    [updateUrlWithParams, fetchData, searchTerm, toastContext],
  )

  // Dialog handlers
  const handleOpenDialog = () => setOpenStatusDialog(true)
  const handleCloseDialog = useCallback(() => {
    setOpenStatusDialog(false)
    setSelectedPlatformStatus({})
  }, [])

  // Page change handlers
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (isDirtyRef.current) {
        setPendingPage(newPage)
        setIsModalOpen(true)
      } else {
        setPage(newPage)
        // Clear selection when changing pages unless all pages are selected
        if (!isAllPagesSelected) {
          setSelectedKeys(new Set([]))
        }
        // Update URL with new page
        updateUrlWithParams({
          page: newPage.toString(),
        })
      }
    },
    [updateUrlWithParams, isAllPagesSelected],
  )

  const handleCancel = useCallback(() => {
    setPendingPage(null)
    setIsModalOpen(false)
  }, [])

  // Check if user has edit permissions
  const hasEditPermission = useCallback(
    () =>
      tokenContext.isAdmin() ||
      tokenContext.isProjectDeveloper(Number(projectId)),
    [tokenContext, projectId],
  )

  const toggleStatus = useCallback(
    async (platform: string, platformId: string) => {
      const isCurrentlySelected = selectedStatuses.includes(platform)
      const newStatuses = isCurrentlySelected
        ? selectedStatuses.filter((s) => s !== platform)
        : [...selectedStatuses, platform]

      setSelectedStatuses(newStatuses)

      await updateRunPlatformStatus(
        tokenContext.token.access_token,
        Number(runId),
        platformId,
        !isCurrentlySelected,
      )
    },
    [selectedStatuses, tokenContext.token.access_token, runId],
  )

  const onSearchCases = useCallback(
    (query: string) => {
      setSearchTerm(query)

      // Only update search parameter in URL, keep current page
      updateUrlWithParams({
        search: query,
      })
    },
    [updateUrlWithParams],
  )

  // Reset filters function
  const resetAllFilters = useCallback(() => {
    setSearchTerm('')
    setSortColumn(undefined)
    setSortDirection(undefined)

    // Only clear the sort and search parameters from URL, preserve page
    updateUrlWithParams({
      sortColumn: '',
      sortDirection: '',
      search: '',
    })
  }, [updateUrlWithParams])

  // Define main saveChanges function again to solve linter errors
  const saveChanges = useCallback(
    async (afterSave?: () => void) => {
      setIsUpdating(true)
      try {
        await updateRun(tokenContext.token.access_token, testRun)
        await updateRunCases(
          tokenContext.token.access_token,
          Number(runId),
          runCases,
        )

        // Add 500ms delay to ensure database consistency before fetching
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Force refresh data after saving changes
        await fetchData(
          stablePage,
          stableSearchTerm,
          shouldUseSorting(stableSortColumn, stableSortDirection)
            ? stableSortColumn
            : undefined,
          shouldUseSorting(stableSortColumn, stableSortDirection)
            ? stableSortDirection
            : undefined,
          true, // Force refresh to get updated data
        )

        toastContext.showToast(messages.updatedTestRun, 'success')
        setIsDirty(false)
        // Clear selections after successful save
        setSelectedKeys(new Set([]))
        setIsAllPagesSelected(false)
        if (afterSave) afterSave()
      } catch (error) {
        toastContext.showToast('Failed to save changes', 'error')
      } finally {
        setIsUpdating(false)
      }
    },
    [
      tokenContext.token.access_token,
      testRun,
      runId,
      runCases,
      stablePage,
      stableSearchTerm,
      stableSortColumn,
      stableSortDirection,
      toastContext,
      messages.updatedTestRun,
      fetchData,
      shouldUseSorting,
    ],
  )

  // Helper function to fetch all run cases when "select all" is used
  const fetchAllRunCases = useCallback(async (): Promise<RunCaseType[]> => {
    try {
      // First, get the total count and determine how many pages we need
      const firstPageData = await fetchRunCases(
        tokenContext.token.access_token,
        Number(projectId),
        Number(runId),
        1, // Start from page 1
        undefined, // No search filter to get all cases
        undefined, // No sort
        undefined, // No direction
      )

      if (!firstPageData.runCases || firstPageData.totalRunCases === 0) {
        return []
      }

      // If we got all cases in the first page, return them
      if (firstPageData.runCases.length >= firstPageData.totalRunCases) {
        return firstPageData.runCases
      }

      // Otherwise, fetch all pages
      const allPages: RunCaseType[] = [...firstPageData.runCases]
      const itemsPerPage = firstPageData.runCases.length || 35
      const totalPages = Math.ceil(firstPageData.totalRunCases / itemsPerPage)

      // Fetch remaining pages in parallel for better performance
      const pagePromises = []
      for (let page = 2; page <= totalPages; page++) {
        pagePromises.push(
          fetchRunCases(
            tokenContext.token.access_token,
            Number(projectId),
            Number(runId),
            page,
            undefined, // No search filter
            undefined, // No sort
            undefined, // No direction
          ),
        )
      }

      const pageResults = await Promise.all(pagePromises)
      pageResults.forEach((pageData) => {
        if (pageData.runCases) {
          allPages.push(...pageData.runCases)
        }
      })

      return allPages
    } catch (error) {
      // Fallback to current page only
      return runCases
    }
  }, [tokenContext.token.access_token, projectId, runId, runCases])

  // Auto save when status changes
  const autoSaveStatusChanges = useCallback(
    async (updatedRunCases: RunCaseType[], shouldClearSelection = false) => {
      if (!hasEditPermission()) return

      setIsUpdating(true)
      try {
        // Only save run cases, not the full test run info
        await updateRunCases(
          tokenContext.token.access_token,
          Number(runId),
          updatedRunCases,
        )

        // Add 500ms delay to ensure database consistency before fetching
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Force refresh data to get the latest state from server
        await fetchData(
          stablePage,
          stableSearchTerm,
          shouldUseSorting(stableSortColumn, stableSortDirection)
            ? stableSortColumn
            : undefined,
          shouldUseSorting(stableSortColumn, stableSortDirection)
            ? stableSortDirection
            : undefined,
          true, // Force refresh is important here
        )

        // Show a subtle toast for auto-save
        toastContext.showToast('Changes automatically saved', 'success')
        setIsDirty(false)

        // Only clear selections if explicitly requested (for bulk operations)
        if (shouldClearSelection) {
          setSelectedKeys(new Set([]))
          setIsAllPagesSelected(false)
        }
      } catch (error) {
        // Keep isDirty true if auto-save fails
      } finally {
        setIsUpdating(false)
      }
    },
    [
      tokenContext.token.access_token,
      runId,
      hasEditPermission,
      stablePage,
      stableSearchTerm,
      stableSortColumn,
      stableSortDirection,
      fetchData,
      shouldUseSorting,
      toastContext,
    ],
  )

  // Fetch data when URL parameters change
  useEffect(() => {
    if (!isPageLoaded || !tokenContext.isSignedIn()) return

    // Get current parameters from URL or state
    const currentPage = Number(searchParams.get('page')) || page
    const currentSearch = searchParams.get('search') || searchTerm || ''
    const currentSortColumn = searchParams.get('sortColumn') || sortColumn
    const currentSortDirection = (searchParams.get('sortDirection') ||
      sortDirection) as 'ASC' | 'DESC' | undefined

    // Fetch data with current parameters
    fetchData(
      currentPage,
      currentSearch,
      shouldUseSorting(currentSortColumn, currentSortDirection)
        ? currentSortColumn
        : undefined,
      shouldUseSorting(currentSortColumn, currentSortDirection)
        ? currentSortDirection
        : undefined,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPageLoaded,
    tokenContext.isSignedIn,
    searchParams,
    page,
    searchTerm,
    sortColumn,
    sortDirection,
    fetchData,
    shouldUseSorting,
  ])

  // Update platforms and statuses when dialog opens
  useEffect(() => {
    async function updatePlatformsAndStatuses() {
      if (!openStatusDialog || !tokenContext.token.access_token) return

      try {
        const data = await fetchAllPlatformStatuses(
          tokenContext.token.access_token,
          Number(runId),
        )
        const platformsArray = Array.isArray(data) ? data : []
        setPlatforms(platformsArray)
        setSelectedStatuses(
          platformsArray
            .filter((p: PlatformType) => p.isInclude)
            .map((p: PlatformType) => p.platform),
        )
        // Reset the modal state when dialog opens
        setSelectedPlatformStatus({})
      } catch (error) {
        toastContext.showToast('Failed to load platform data', 'error')
      }
    }

    updatePlatformsAndStatuses()
  }, [openStatusDialog, tokenContext.token.access_token, runId, toastContext])

  // Status selection handlers
  const handleSelectStatus = useCallback(
    (platformId: string, statusUid: string) => {
      setSelectedPlatformStatus((prev) => ({
        ...prev,
        [platformId]: statusUid,
      }))
    },
    [],
  )

  // Status change handlers
  const handleChangeStatus = useCallback(
    (changeRunCaseId: number, platform: string, newStatus: number) => {
      setIsDirty(true)

      const normalizedPlatform = normalizePlatform(platform)

      const updatedRunCases = runCases.map((runCase) => {
        if (runCase.id !== changeRunCaseId) return runCase

        const existingStatusIndex = runCase.statuses.findIndex(
          (statusObj) =>
            statusObj.platformStatus.platform.toLowerCase() ===
            normalizedPlatform,
        )

        const platformInfo = platforms.find(
          (p) => p.platform.toLowerCase() === normalizedPlatform,
        )

        return {
          ...runCase,
          statuses:
            existingStatusIndex !== -1
              ? runCase.statuses.map((statusObj, index) =>
                  index === existingStatusIndex
                    ? { ...statusObj, status: newStatus }
                    : statusObj,
                )
              : [
                  ...runCase.statuses,
                  {
                    status: newStatus,
                    platformStatus: {
                      id: platformInfo!.id,
                      platform: normalizedPlatform,
                    },
                    platformId: platformInfo!.id,
                  },
                ],
          updatedAt: new Date().toISOString(),
        }
      })

      setRunCases(updatedRunCases)
      autoSaveStatusChanges(updatedRunCases, false) // Don't clear selection for individual changes
    },
    [runCases, autoSaveStatusChanges, normalizePlatform, platforms],
  )

  const handleClearStatus = useCallback(
    (changeRunCaseId: number) => {
      setIsDirty(true)

      const updatedRunCases = runCases.map((runCase) =>
        runCase.id === changeRunCaseId
          ? { ...runCase, statuses: [], updatedAt: new Date().toISOString() }
          : runCase,
      )

      setRunCases(updatedRunCases)
      autoSaveStatusChanges(updatedRunCases, false) // Don't clear selection for individual changes
    },
    [runCases, autoSaveStatusChanges],
  )

  const handleBulkClearStatus = useCallback(async () => {
    try {
      setIsDirty(true)

      let keys: number[]
      let allRunCases: RunCaseType[] = runCases

      if (selectedKeys === 'all' || isAllPagesSelected) {
        // When "select all" is used, we need to fetch ALL run cases, not just the current page
        allRunCases = await fetchAllRunCases()
        keys = allRunCases.map((runCase: RunCaseType) => runCase.id)
      } else {
        keys = Array.from(selectedKeys).map(Number)
        allRunCases = runCases
      }

      if (keys.length === 0) {
        return
      }

      const updatedRunCases = allRunCases.map((runCase: RunCaseType) =>
        keys.includes(runCase.id)
          ? { ...runCase, statuses: [], updatedAt: new Date().toISOString() }
          : runCase,
      )

      // Update local state with current page data only
      const currentPageRunCases = updatedRunCases.filter(
        (runCase: RunCaseType) =>
          runCases.some(
            (currentRunCase: RunCaseType) => currentRunCase.id === runCase.id,
          ),
      )
      setRunCases(currentPageRunCases)

      // Send all updated run cases to backend and clear selection
      autoSaveStatusChanges(updatedRunCases, true)
    } catch (error) {
      toastContext.showToast('Error clearing statuses', 'error')
    }
  }, [
    selectedKeys,
    isAllPagesSelected,
    runCases,
    autoSaveStatusChanges,
    fetchAllRunCases,
    toastContext,
  ])

  const handleChangeStatuses = useCallback(
    async (platformStatusList: { platform: string; newStatus: number }[]) => {
      try {
        setIsDirty(true)

        let keys: number[]
        let allRunCases: RunCaseType[] = runCases

        if (selectedKeys === 'all' || isAllPagesSelected) {
          // When "select all" is used, we need to fetch ALL run cases, not just the current page
          allRunCases = await fetchAllRunCases()
          keys = allRunCases.map((runCase: RunCaseType) => runCase.id)
        } else {
          keys = Array.from(selectedKeys).map(Number)
          allRunCases = runCases
        }

        if (keys.length === 0) {
          return
        }

        const updatedRunCases = allRunCases.map((runCase: RunCaseType) => {
          if (!keys.includes(runCase.id)) return runCase

          let updatedStatuses = [...runCase.statuses]

          platformStatusList.forEach(({ platform, newStatus }) => {
            if (newStatus === -1) return

            const normalizedPlatform = normalizePlatform(platform)
            const platformInfo = platforms.find(
              (p) => p.platform.toLowerCase() === normalizedPlatform,
            )

            if (!platformInfo) {
              return
            }

            const existingStatusIndex = updatedStatuses.findIndex(
              (statusObj) =>
                statusObj.platformStatus.platform.toLowerCase() ===
                normalizedPlatform,
            )

            if (existingStatusIndex !== -1) {
              updatedStatuses[existingStatusIndex] = {
                ...updatedStatuses[existingStatusIndex],
                status: newStatus,
              }
            } else {
              updatedStatuses.push({
                status: newStatus,
                platformStatus: {
                  id: platformInfo.id,
                  platform: normalizedPlatform,
                },
                platformId: platformInfo.id,
              })
            }
          })

          return {
            ...runCase,
            statuses: updatedStatuses,
            updatedAt: new Date().toISOString(),
          }
        })

        // Update local state with current page data only
        const currentPageRunCases = updatedRunCases.filter(
          (runCase: RunCaseType) =>
            runCases.some(
              (currentRunCase: RunCaseType) => currentRunCase.id === runCase.id,
            ),
        )
        setRunCases(currentPageRunCases)

        // Send all updated run cases to backend and clear selection
        autoSaveStatusChanges(updatedRunCases, true)
      } catch (error) {
        toastContext.showToast('Error updating statuses', 'error')
      }
    },
    [
      selectedKeys,
      isAllPagesSelected,
      runCases,
      autoSaveStatusChanges,
      normalizePlatform,
      platforms,
      fetchAllRunCases,
      toastContext,
    ],
  )

  const handleSubmit = useCallback(() => {
    const platformStatusList = Array.isArray(platforms)
      ? platforms
          .filter((platform) => platform.isInclude)
          .map((platform) => ({
            platform: platform.platform,
            newStatus: testRunCaseStatus.findIndex(
              (status) => status.uid === selectedPlatformStatus[platform.id],
            ),
          }))
          .filter((item) => item.newStatus !== -1) // Only include valid status selections
      : []

    if (platformStatusList.length === 0) {
      toastContext.showToast('Please select at least one status', 'warning')
      return
    }

    handleChangeStatuses(platformStatusList)
    handleCloseDialog()
  }, [
    platforms,
    selectedPlatformStatus,
    handleChangeStatuses,
    handleCloseDialog,
    toastContext,
  ])

  // Run case removal handlers
  const handleRemoveFromRun = useCallback(async () => {
    try {
      let keys: number[]

      if (selectedKeys === 'all' || isAllPagesSelected) {
        // When "select all" is used, we need to fetch ALL run cases, not just the current page
        const allRunCases = await fetchAllRunCases()
        keys = allRunCases.map((runCase: RunCaseType) => runCase.id)
      } else {
        keys = Array.from(selectedKeys).map(Number)
      }

      if (keys.length > 0) {
        setRunCaseIdsToRemove(keys)
        setIsConfirmOpen(true)
      } else {
        toastContext.showToast('No test cases selected for removal', 'warning')
      }
    } catch (error) {
      toastContext.showToast('Error preparing to remove test cases', 'error')
    }
  }, [selectedKeys, isAllPagesSelected, fetchAllRunCases, toastContext])

  const confirmRemove = useCallback(async () => {
    if (runCaseIdsToRemove.length === 0) return

    try {
      await removeRunCases(
        tokenContext.token.access_token,
        Number(runId),
        runCaseIdsToRemove,
      )

      setIsConfirmOpen(false)
      setRunCaseIdsToRemove([])
      // Clear selections after successful removal
      setSelectedKeys(new Set([]))
      setIsAllPagesSelected(false)

      // Add small delay to ensure backend consistency
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Check if we need to go back to page 1 if we removed all items from current page
      let targetPage = stablePage
      if (runCaseIdsToRemove.length === runCases.length && stablePage > 1) {
        // If we removed all items from the current page and we're not on page 1
        targetPage = Math.max(1, stablePage - 1)
        setPage(targetPage)
        updateUrlWithParams({
          page: targetPage.toString(),
        })
      }

      // Force refresh data after removing run cases
      try {
        await fetchData(
          targetPage,
          stableSearchTerm,
          shouldUseSorting(stableSortColumn, stableSortDirection)
            ? stableSortColumn
            : undefined,
          shouldUseSorting(stableSortColumn, stableSortDirection)
            ? stableSortDirection
            : undefined,
          true, // Force refresh to get updated data
        )

        toastContext.showToast(
          `Successfully removed ${runCaseIdsToRemove.length} test cases from run`,
          'success',
        )
      } catch (fetchError) {
        toastContext.showToast(
          'Test cases removed but failed to refresh data. Please refresh the page.',
          'warning',
        )
      }
    } catch (error) {
      toastContext.showToast('Error removing test cases from run', 'error')
    }
  }, [
    runCaseIdsToRemove,
    tokenContext.token.access_token,
    runId,
    stablePage,
    stableSearchTerm,
    stableSortColumn,
    stableSortDirection,
    fetchData,
    shouldUseSorting,
    toastContext,
    runCases.length,
    updateUrlWithParams,
  ])

  return (
    <>
      <div className="border-b-1 dark:border-neutral-700 w-full p-3 flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip content={messages.backToRuns}>
            <Button
              isIconOnly
              size="sm"
              className="rounded-full bg-neutral-50 dark:bg-neutral-600"
              onClick={() =>
                router.push(`/projects/${projectId}/runs`, { locale })
              }
            >
              <ArrowLeft size={16} />
            </Button>
          </Tooltip>
          <h3 className="font-bold ms-2">{testRun.name}</h3>
        </div>
        <div className="flex items-center">
          {isDirty && (
            <Circle size={8} color="#525252" fill="#525252" className="me-1" />
          )}
          <Button
            startContent={<Save size={16} />}
            size="sm"
            isDisabled={!hasEditPermission()}
            color="primary"
            isLoading={isUpdating}
            onClick={() => saveChanges()}
          >
            {isUpdating ? messages.updating : messages.update}
          </Button>
        </div>
      </div>

      <div className="container mx-auto w-full pt-1 px-6 flex-grow">
        <div className="flex flex-col lg:flex-row gap-6 items-start mt-2">
          <div className="flex-grow w-full">
            <div className="flex items-center gap-4 w-full">
              <Input
                size="sm"
                type="text"
                variant="bordered"
                label="Run Title"
                value={testRun.name}
                isInvalid={isNameInvalid}
                errorMessage={isNameInvalid ? messages.pleaseEnter : ''}
                onChange={(e) =>
                  setTestRun({ ...testRun, name: e.target.value })
                }
                className="mt-3 flex-grow"
              />
              <Select
                size="sm"
                variant="bordered"
                selectedKeys={[testRunStatus[testRun.state].uid]}
                onSelectionChange={(newSelection) => {
                  if (newSelection !== 'all' && newSelection.size !== 0) {
                    const selectedUid = Array.from(newSelection)[0]
                    const index = testRunStatus.findIndex(
                      (template) => template.uid === selectedUid,
                    )
                    setTestRun({ ...testRun, state: index })
                  }
                }}
                label={messages.status}
                className="mt-3 max-w-xs"
              >
                {testRunStatus.map((status, index) => (
                  <SelectItem key={status.uid} value={index}>
                    {runStatusMessages[status.uid]}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <Textarea
              size="sm"
              variant="bordered"
              label={'Task Link'}
              value={testRun.description}
              onValueChange={(changeValue) => {
                setTestRun({ ...testRun, description: changeValue })
              }}
              className="mt-3"
            />
          </div>

          {/* Donut Chart & Live Sync Indicator */}
          <div className="flex flex-col items-center bg-white dark:bg-neutral-800/80 p-3 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm min-w-[300px]">
            <div className="flex items-center justify-between w-full px-2 mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {messages.progress}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{messages.liveCollaborativeTesting || 'Real-time Live Sync'}</span>
              </div>
            </div>
            <RunProgressDounut
              statusCounts={statusCounts}
              testRunCaseStatusMessages={testRunCaseStatusMessages}
              theme="light"
            />
          </div>
        </div>

        <Divider className="my-3" />

        <div className="flex items-center relative w-full h-12">
          <div className="w-[200px] h-10"></div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            {Array.isArray(platforms) &&
              platforms.map(({ platform, id }) => {
                const isSelected = selectedStatuses.includes(platform)
                const isDisabled = !hasEditPermission()

                return (
                  <Chip
                    key={
                      typeof platform === 'string'
                        ? platform.toLowerCase()
                        : String(platform)
                    }
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'solid' : 'flat'}
                    onClick={() => !isDisabled && toggleStatus(platform, id)}
                    className={`cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    isDisabled={isDisabled}
                  >
                    {platform}
                  </Chip>
                )
              })}
          </div>

          {(selectedKeys === 'all' ||
            selectedKeys.size > 0 ||
            isAllPagesSelected) && (
            <div className="ml-auto">
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    size="sm"
                    isDisabled={!hasEditPermission()}
                    color="primary"
                    endContent={<ChevronDown size={16} />}
                  >
                    {messages.testCaseSelection}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="test case select actions">
                  <DropdownItem
                    key="add-statuses"
                    startContent={<CopyPlus size={16} />}
                    onClick={handleOpenDialog}
                  >
                    {'Add Statuses'}
                  </DropdownItem>
                  <DropdownItem
                    key="clear-all-statuses"
                    startContent={<CopyMinus size={16} />}
                    onClick={handleBulkClearStatus}
                  >
                    {'Clear All Statuses'}
                  </DropdownItem>
                  <DropdownItem
                    key="remove-from-run"
                    startContent={<CopyMinus size={16} />}
                    onClick={handleRemoveFromRun}
                  >
                    {'Remove From Run'}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          )}
        </div>

        {openStatusDialog && (
          <Modal isOpen={openStatusDialog} onClose={handleCloseDialog}>
            <ModalContent>
              <ModalHeader>{'Select Status for Each Platform'}</ModalHeader>
              <ModalBody>
                {Array.isArray(platforms) &&
                  platforms
                    .filter((platform) => platform.isInclude)
                    .map((platform) => (
                      <div
                        key={platform.id}
                        className="flex justify-between items-center py-2 border-b"
                      >
                        <span className="text-sm font-medium">
                          {platform.platform}
                        </span>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button variant="bordered">
                              {capitalizeWords(
                                selectedPlatformStatus[platform.id],
                              ) || 'Choose status'}
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            {testRunCaseStatus.map((status) => (
                              <DropdownItem
                                key={status.uid}
                                onClick={() =>
                                  handleSelectStatus(platform.id, status.uid)
                                }
                              >
                                {capitalizeWords(status.uid)}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    ))}
              </ModalBody>
              <ModalFooter>
                <Button onClick={handleSubmit} color="primary">
                  Apply
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}

        {isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={handleCancel}>
            <ModalContent>
              <ModalHeader>{'Unsaved Changes'}</ModalHeader>
              <ModalBody>
                <p>
                  You have unsaved changes. Do you want to save before switching
                  pages?
                </p>
              </ModalBody>
              <ModalFooter className="flex justify-between">
                <Button
                  onClick={() => {
                    setIsDirty(false)
                    if (pendingPage !== null) setPage(pendingPage)
                    setPendingPage(null)
                    setIsModalOpen(false)
                    setSelectedKeys(new Set())
                  }}
                  color="danger"
                >
                  Discard and Continue
                </Button>
                <Button
                  onClick={() => {
                    saveChanges(() => {
                      if (pendingPage !== null) setPage(pendingPage)
                      setPendingPage(null)
                      setIsModalOpen(false)
                      setSelectedKeys(new Set())
                    })
                  }}
                  color="primary"
                >
                  Save and Continue
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}

        {isConfirmOpen && (
          <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
            <ModalContent>
              <ModalHeader>Confirm Removal</ModalHeader>
              <ModalBody className="inline">
                Are you sure you want to remove{' '}
                <strong>{runCaseIdsToRemove.length}</strong> test cases from
                this run?
              </ModalBody>
              <ModalFooter>
                <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                <Button onClick={confirmRemove} color="danger">
                  Confirm
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}



        <div className="mt-3 flex rounded-small border-2 dark:border-neutral-700 mb-12">
          <div className="w-full">
            <TestCaseSelector
              runCases={runCases}
              runId={runId}
              activeTesters={activeTesters}
              isDisabled={!hasEditPermission()}
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              onChangeStatus={handleChangeStatus}
              onClearStatus={handleClearStatus}
              messages={messages}
              testRunCaseStatusMessages={testRunCaseStatusMessages}
              testTypeMessages={testTypeMessages}
              priorityMessages={priorityMessages}
              testCaseMessages={testCaseMessages}
              onSearchCases={onSearchCases}
              selectedStatuses={selectedStatuses}
              page={page}
              setPage={setPage}
              filteredTotalCasesCount={filteredTotalCasesCount}
              totalRunCasesCount={totalRunCasesCount}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
              pendingPage={pendingPage}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              onResetFilters={resetAllFilters}
              loading={isFetching}
              isAllPagesSelected={isAllPagesSelected}
              setIsAllPagesSelected={setIsAllPagesSelected}
              onRefreshData={() =>
                fetchData(
                  stablePage,
                  stableSearchTerm,
                  shouldUseSorting(stableSortColumn, stableSortDirection)
                    ? stableSortColumn
                    : undefined,
                  shouldUseSorting(stableSortColumn, stableSortDirection)
                    ? stableSortDirection
                    : undefined,
                  true,
                )
              }
            />
          </div>
        </div>
      </div>
    </>
  )
}
