import {
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
  useRef,
  useContext,
} from 'react'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Selection,
  SortDescriptor,
  Input,
  Chip,
  Pagination,
  Spinner,
  Tooltip,
} from '@nextui-org/react'
import { MoreVertical, RotateCcw, ClipboardList, FileText, Sparkles, RefreshCw } from 'lucide-react'
import { testRunCaseStatus } from '@/config/selection'
import { CaseMessages, CaseType, PlatformEvidenceType } from '@/types/case'
import { RunCaseType, RunMessages } from '@/types/run'
import TestCaseDetailDialog from './TestCaseDetailDialog'
import { PriorityMessages } from '@/types/priority'
import TestCasePriority from '@/components/TestCasePriority'
import { TestTypeMessages } from '@/types/testType'
import { TestRunCaseStatusMessages } from '@/types/status'
import { renderStatusIcon } from '@/utils/renderStatusIcon'
import PlatformEvidenceDialog from './PlatformEvidenceDialog'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import AiAnalysisModal from '../../folders/[folderId]/cases/AiAnalysisModal'
import { executeCaseWithAi, AiAnalysisData } from '@/utils/aiControl'

// Declare global handler type for TypeScript
declare global {
  interface Window {
    __removeCaseFromSelection?: (caseId: number) => void
  }
}

type Props = {
  runCases: RunCaseType[]
  isDisabled: boolean
  selectedKeys: Selection
  onSelectionChange: React.Dispatch<React.SetStateAction<Selection>>
  onChangeStatus: (
    changeRunCaseId: number,
    platform: string,
    status: number,
  ) => void
  onClearStatus: (changeRunCaseId: number) => void
  messages: RunMessages
  testRunCaseStatusMessages: TestRunCaseStatusMessages
  priorityMessages: PriorityMessages
  testTypeMessages: TestTypeMessages
  testCaseMessages: CaseMessages
  onSearchCases: (query: string) => void
  selectedStatuses: string[]
  page: number
  setPage: (page: number) => void
  filteredTotalCasesCount: number
  totalRunCasesCount: number
  totalPages: number
  handlePageChange: (page: number) => void
  pendingPage: number | null
  sortColumn?: string
  sortDirection?: 'ASC' | 'DESC'
  onSortChange?: (column: string, direction: 'ASC' | 'DESC') => void
  onResetFilters?: () => void
  loading?: boolean
  onRefreshData?: () => Promise<void>
  // Add new props for all pages selection
  isAllPagesSelected?: boolean
  setIsAllPagesSelected?: React.Dispatch<React.SetStateAction<boolean>>
}

export default function TestCaseSelector({
  runCases,
  selectedKeys,
  onSelectionChange,
  onChangeStatus,
  onClearStatus,
  messages,
  testRunCaseStatusMessages,
  testTypeMessages,
  priorityMessages,
  testCaseMessages,
  onSearchCases,
  selectedStatuses,
  page,
  setPage,
  totalRunCasesCount,
  totalPages,
  handlePageChange,
  pendingPage,
  sortColumn,
  sortDirection,
  onSortChange,
  onResetFilters,
  loading,
  onRefreshData,
  // Add new props
  isAllPagesSelected = false,
  setIsAllPagesSelected,
}: Props) {
  const tokenContext = useContext(TokenContext)
  const toastContext = useContext(ToastContext)

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [analysisData, setAnalysisData] = useState<AiAnalysisData | null>(null)
  const [analysisCaseTitle, setAnalysisCaseTitle] = useState('')
  const [analysisRunCaseId, setAnalysisRunCaseId] = useState<number | null>(null)
  const [currentTestCaseForAnalysis, setCurrentTestCaseForAnalysis] = useState<CaseType | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleExecuteAiAnalysis = useCallback(
    async (testCase: CaseType, runCaseId?: number) => {
      if (!tokenContext.isSignedIn()) {
        toastContext.showToast('Please sign in to use DeepSeek AI analysis', 'error')
        return
      }

      setIsAnalyzing(true)
      toastContext.showToast(
        `[DeepSeek AI]: Analyzing test case "${testCase.customId || testCase.title}"...`,
        'dark'
      )

      try {
        const analysis = await executeCaseWithAi(
          tokenContext.token.access_token,
          testCase,
          'en',
          undefined,
          undefined,
          runCaseId
        )

        if (analysis) {
          setAnalysisCaseTitle(testCase.title)
          setAnalysisData(analysis)
          setAnalysisRunCaseId(runCaseId || null)
          setCurrentTestCaseForAnalysis(testCase)
          setIsAnalysisModalOpen(true)

          // Update local runCases state so AI badge appears immediately
          if (runCaseId) {
            const target = runCases.find((rc) => rc.id === runCaseId)
            if (target) {
              target.aiAssessment = analysis
            }
          }

          toastContext.showToast(
            `[DeepSeek AI]: Analysis completed & saved for "${testCase.customId || testCase.title}"!`,
            'success'
          )
        }
      } catch (error: any) {
        console.error('[AI Execution Error in Runs]:', error)
        toastContext.showToast(`AI Analysis failed: ${error.message}`, 'error', 5000)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [tokenContext, toastContext, runCases]
  )

  const handleViewSavedAiAnalysis = useCallback(
    (runCase: RunCaseType, testCase: CaseType) => {
      const assessment = runCase.aiAssessment || testCase?.aiAssessment
      if (assessment) {
        setAnalysisCaseTitle(testCase.title)
        setAnalysisData(assessment)
        setAnalysisRunCaseId(runCase.id)
        setCurrentTestCaseForAnalysis(testCase)
        setIsAnalysisModalOpen(true)
      }
    },
    []
  )

  const handleReanalyze = useCallback(() => {
    if (currentTestCaseForAnalysis) {
      handleExecuteAiAnalysis(currentTestCaseForAnalysis, analysisRunCaseId || undefined)
    }
  }, [currentTestCaseForAnalysis, analysisRunCaseId, handleExecuteAiAnalysis])

  const handleApplyStatus = useCallback(
    (status: 'passed' | 'pending' | 'failed') => {
      if (!analysisRunCaseId) return
      // testRunCaseStatus: 1 = passed, 2 = failed, 5 = pending
      const statusIdx = status === 'passed' ? 1 : status === 'failed' ? 2 : 5
      selectedStatuses.forEach((platform) => {
        onChangeStatus(analysisRunCaseId, platform, statusIdx)
      })
      toastContext.showToast(
        `Applied AI suggested status "${status.toUpperCase()}" to run case!`,
        'success'
      )
      setIsAnalysisModalOpen(false)
    },
    [analysisRunCaseId, selectedStatuses, onChangeStatus, toastContext]
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [dialogState, setDialogState] = useState({
    isTestCaseDetailOpen: false,
    isPlatformEvidenceOpen: false,
    showingTestCaseId: null as number | null,
    evidencePlatform: '',
    currentRunCaseId: null as number | null,
    currentEvidenceData: undefined as PlatformEvidenceType | undefined,
  })

  const isInitialSearchRender = useRef(true)
  const isViewingCaseDetailRef = useRef(false)

  const platformColumns = useMemo(
    () =>
      selectedStatuses.map((platform) => ({
        name: platform,
        uid: `status-${platform}`,
        sortable: false,
      })),
    [selectedStatuses],
  )

  const headerColumns = useMemo(
    () => [
      { name: messages.id, uid: 'customId', sortable: true },
      { name: messages.title, uid: 'title', sortable: true },
      { name: messages.description, uid: 'description', sortable: true },
      { name: 'Steps', uid: 'steps', sortable: false },
      { name: 'Expected Results', uid: 'expectedResults', sortable: false },
      { name: messages.priority, uid: 'priority', sortable: true },
      ...platformColumns,
      { name: 'Action', uid: 'action', sortable: false },
    ],
    [messages, platformColumns],
  )

  // Register global handler for removing case from selection
  useEffect(() => {
    const removeCaseFromSelection = (caseId: number) => {
      if (selectedKeys === 'all' || isAllPagesSelected) {
        const newSelection = new Set(
          runCases
            .filter((runCase) => runCase.caseId !== caseId)
            .map((runCase) => runCase.id.toString()),
        )
        onSelectionChange(newSelection)
        // Also ensure we're not in "all pages selected" mode anymore
        if (isAllPagesSelected && setIsAllPagesSelected) {
          setIsAllPagesSelected(false)
        }
      } else if (selectedKeys instanceof Set) {
        const runCase = runCases.find((rc) => rc.caseId === caseId)
        if (runCase && selectedKeys.has(runCase.id.toString())) {
          const newSelection = new Set(selectedKeys)
          newSelection.delete(runCase.id.toString())
          onSelectionChange(newSelection)
        }
      }
    }

    window.__removeCaseFromSelection = removeCaseFromSelection

    return () => {
      window.__removeCaseFromSelection = undefined
    }
  }, [
    selectedKeys,
    isAllPagesSelected,
    onSelectionChange,
    runCases,
    setIsAllPagesSelected,
  ])

  // Handle search with debounce
  useEffect(() => {
    if (isInitialSearchRender.current) {
      isInitialSearchRender.current = false
      return
    }

    const delayDebounceFn = setTimeout(() => {
      onSearchCases(searchTerm)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, onSearchCases])

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (!isInitialSearchRender.current) {
      setPage(1)
    }
  }, [searchTerm, setPage])

  // Sort descriptor state management
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn || '',
    direction: sortColumn
      ? sortDirection === 'ASC'
        ? 'ascending'
        : 'descending'
      : 'ascending',
  })

  // Update sort descriptor when props change
  useEffect(() => {
    if (
      sortColumn !== sortDescriptor.column ||
      (sortDirection === 'ASC' && sortDescriptor.direction !== 'ascending') ||
      (sortDirection === 'DESC' && sortDescriptor.direction !== 'descending')
    ) {
      setSortDescriptor({
        column: sortColumn || '',
        direction: sortColumn
          ? sortDirection === 'ASC'
            ? 'ascending'
            : 'descending'
          : 'ascending',
      })
    }
  }, [
    sortColumn,
    sortDirection,
    sortDescriptor.column,
    sortDescriptor.direction,
  ])

  // Handle sort change
  const handleSortChange = useCallback(
    (descriptor: SortDescriptor) => {
      try {
        setSortDescriptor(descriptor)
        if (onSortChange && descriptor.column) {
          onSortChange(
            descriptor.column.toString(),
            descriptor.direction === 'ascending' ? 'ASC' : 'DESC',
          )
        }
      } catch (error) {
        // Sort error handled silently
      }
    },
    [onSortChange],
  )

  // Use runCases directly since filtering is done on the backend
  const sortedItems = useMemo(() => runCases, [runCases])

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    if (onResetFilters) {
      onResetFilters()
      setSearchTerm('')
    }
  }, [onResetFilters])

  // Handle selection changes
  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === 'all') {
        onSelectionChange('all')
        if (setIsAllPagesSelected) {
          setIsAllPagesSelected(false)
        }
      } else {
        onSelectionChange(keys)
        if (setIsAllPagesSelected) {
          setIsAllPagesSelected(false)
        }
      }
    },
    [onSelectionChange, setIsAllPagesSelected],
  )

  // Handle select all pages
  const handleSelectAllPages = useCallback(() => {
    if (isAllPagesSelected) {
      if (setIsAllPagesSelected) {
        setIsAllPagesSelected(false)
      }
      onSelectionChange(new Set([]))
    } else {
      if (setIsAllPagesSelected) {
        setIsAllPagesSelected(true)
      }
      onSelectionChange('all')
    }
  }, [isAllPagesSelected, setIsAllPagesSelected, onSelectionChange])

  // Handle cell click
  const handleCellClick = useCallback(
    (item: RunCaseType, columnKey: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (columnKey === 'customId') return
      isViewingCaseDetailRef.current = true
      setDialogState((prev) => ({
        ...prev,
        isTestCaseDetailOpen: true,
        showingTestCaseId: item.caseId,
      }))
    },
    [],
  )

  // Get evidence data for a specific run case and platform
  const getEvidenceData = useCallback(
    (runCase: CaseType, platform: string): PlatformEvidenceType | undefined => {
      if (!runCase || !platform) return undefined

      const evidence = runCase.platformEvidences?.find((e) => {
        if (
          !e?.platform ||
          typeof e.platform !== 'string' ||
          !platform ||
          typeof platform !== 'string'
        )
          return false
        return e.platform.toLowerCase() === platform.toLowerCase()
      })
      return evidence
    },
    [],
  )

  // Platform evidence dialog handlers
  const showPlatformEvidenceDialog = useCallback(
    (caseId: number, platform: string, runCaseId: number) => {
      const runCase = runCases.find((rc) => rc.id === runCaseId)
      if (!runCase) return

      const evidenceData = getEvidenceData(runCase.case as CaseType, platform)
      setDialogState((prev) => ({
        ...prev,
        isPlatformEvidenceOpen: true,
        showingTestCaseId: caseId,
        evidencePlatform: platform,
        currentRunCaseId: runCaseId,
        currentEvidenceData: evidenceData,
      }))
    },
    [runCases, getEvidenceData],
  )

  const hidePlatformEvidenceDialog = useCallback(() => {
    setDialogState((prev) => ({
      ...prev,
      isPlatformEvidenceOpen: false,
      showingTestCaseId: null,
      evidencePlatform: '',
      currentRunCaseId: null,
      currentEvidenceData: undefined,
    }))
  }, [])

  const hideTestCaseDetailDialog = useCallback(() => {
    setDialogState((prev) => ({
      ...prev,
      isTestCaseDetailOpen: false,
      showingTestCaseId: null,
    }))
    isViewingCaseDetailRef.current = false
  }, [])

  // Handle evidence saved - refresh data after evidence is updated
  const handleEvidenceSaved = useCallback(async () => {
    if (onRefreshData) {
      await onRefreshData()
    }
  }, [onRefreshData])

  // Render table cell content
  const renderCell = useCallback(
    (runCase: RunCaseType, columnKey: string): ReactNode => {
      const testCase = runCase.case
      if (!testCase) return null

      const cellValue = testCase[columnKey as keyof CaseType]

      if (columnKey.startsWith('status-')) {
        const platform = columnKey.replace('status-', '').toLowerCase()
        const platformStatus = runCase.statuses?.find((status) => {
          if (
            !status.platformStatus?.platform ||
            typeof status.platformStatus.platform !== 'string'
          )
            return false
          return status.platformStatus.platform.toLowerCase() === platform
        })
        const statusObj = platformStatus
          ? testRunCaseStatus[platformStatus.status]
          : null
        const evidenceData = getEvidenceData(
          runCase?.case as CaseType,
          platform as string,
        )
        const evidenceExists =
          evidenceData &&
          ((evidenceData.evidenceImageUrls &&
            evidenceData.evidenceImageUrls.length > 0) ||
            (evidenceData.evidenceDescription &&
              evidenceData.evidenceDescription.trim() !== ''))
        const showEvidenceIcon = statusObj && statusObj.uid !== 'untested'

        return (
          <div className="flex flex-row items-center">
            <Dropdown key={platform}>
              <DropdownTrigger>
                <Button size="sm" variant="light" className="px-0">
                  <div className="flex items-center gap-1 overflow-hidden text-ellipsis">
                    {statusObj
                      ? renderStatusIcon(statusObj.uid)
                      : renderStatusIcon('untested')}
                    <span className="truncate">
                      {statusObj
                        ? testRunCaseStatusMessages[statusObj.uid]
                        : 'No Status'}
                    </span>
                  </div>
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label={`Test case actions for ${platform}`}>
                {testRunCaseStatus.map((runCaseStatus, index) => (
                  <DropdownItem
                    key={runCaseStatus.uid}
                    onClick={() => onChangeStatus(runCase.id, platform, index)}
                  >
                    <span className="flex items-center gap-1">
                      {renderStatusIcon(runCaseStatus.uid)}
                      {testRunCaseStatusMessages[runCaseStatus.uid]}
                    </span>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {showEvidenceIcon && (
              <Tooltip
                content={evidenceExists ? 'View Evidence' : 'Add Evidence'}
              >
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  className="px-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (platformStatus) {
                      showPlatformEvidenceDialog(
                        testCase.id,
                        platformStatus.platformStatus.platform,
                        runCase.id,
                      )
                    }
                  }}
                >
                  <FileText
                    size={16}
                    className={
                      evidenceExists
                        ? 'text-blue-500 fill-blue-100'
                        : 'text-gray-400'
                    }
                  />
                </Button>
              </Tooltip>
            )}
          </div>
        )
      }

      switch (columnKey) {
        case 'customId': {
          const borderColorClass =
            testCase?.statusLabel === 'passed'
              ? 'border-l-4 pl-2 border-l-green-500'
              : testCase?.statusLabel === 'pending'
                ? 'border-l-4 pl-2 border-l-yellow-500'
                : testCase?.statusLabel === 'failed'
                  ? 'border-l-4 pl-2 border-l-red-500'
                  : 'border-l-4 pl-2 border-l-gray-300'

          const hasSavedAi = Boolean(runCase.aiAssessment || testCase?.aiAssessment)

          return (
            <div
              className={`text-black w-full h-full text-left overflow-hidden leading-tight flex items-center justify-between gap-1 ${borderColorClass}`}
              style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflow: 'visible',
                minHeight: '1rem',
              }}
            >
              <span>{String(cellValue ?? '')}</span>
              {hasSavedAi && (
                <Tooltip content="DeepSeek AI Analysis Available (Click to view)">
                  <button
                    type="button"
                    className="cursor-pointer inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 transition-colors tracking-wide"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewSavedAiAnalysis(runCase, testCase)
                    }}
                  >
                    AI
                  </button>
                </Tooltip>
              )}
            </div>
          )
        }
        case 'description':
        case 'steps':
        case 'expectedResults': {
          const textValue =
            columnKey === 'description'
              ? testCase.description
              : columnKey === 'steps'
                ? testCase.stepsDetail
                : testCase.expectedResults

          const lines = textValue ? textValue.split(/\r?\n/) : []
          const displayLines = lines.slice(0, 5)
          const isTruncated =
            lines.length > 5 || (textValue && textValue.length > 100)

          return (
            <Tooltip
              content={
                <div
                  style={{
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                    maxWidth: 400,
                  }}
                >
                  {textValue}
                </div>
              }
              radius="none"
              style={{ maxWidth: 400 }}
            >
              <div
                className="text-left w-full"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.5em',
                  maxHeight: '7.5em',
                }}
              >
                {displayLines.join('\n')}
                {isTruncated ? '...' : ''}
              </div>
            </Tooltip>
          )
        }
        case 'title': {
          const title = testCase.title || '-'
          const lines = title.split(/\r?\n/)
          const displayLines = lines.slice(0, 5)
          const isTruncated = lines.length > 5 || (title && title.length > 100)

          return (
            <Tooltip
              content={
                <div
                  style={{
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                    maxWidth: 400,
                  }}
                >
                  {title}
                </div>
              }
              radius="none"
              style={{ maxWidth: 400 }}
            >
              <div
                className="text-left w-full"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.5em',
                  maxHeight: '7.5em',
                }}
              >
                {displayLines.join('\n')}
                {isTruncated ? '...' : ''}
              </div>
            </Tooltip>
          )
        }
        case 'priority':
          return (
            <TestCasePriority
              priorityValue={cellValue as number}
              priorityMessages={priorityMessages}
            />
          )
        case 'action': {
          const hasSavedAi = Boolean(runCase.aiAssessment || testCase?.aiAssessment)
          return (
            <Dropdown>
              <DropdownTrigger>
                <Button size="sm" isIconOnly variant="light">
                  <MoreVertical size={18} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                {hasSavedAi ? (
                  <DropdownItem
                    key={`view-ai-${runCase.id}`}
                    startContent={<Sparkles size={16} className="text-primary" />}
                    onClick={() => handleViewSavedAiAnalysis(runCase, testCase)}
                  >
                    View AI Analysis (Saved)
                  </DropdownItem>
                ) : null}
                <DropdownItem
                  key={`ai-analysis-${runCase.id}`}
                  startContent={
                    hasSavedAi ? (
                      <RefreshCw size={16} className="text-primary" />
                    ) : (
                      <Sparkles size={16} className="text-primary" />
                    )
                  }
                  onClick={() => handleExecuteAiAnalysis(testCase, runCase.id)}
                >
                  {hasSavedAi
                    ? 'Re-analyze with AI (DeepSeek)'
                    : 'Execute AI Analysis (DeepSeek)'}
                </DropdownItem>
                <DropdownItem
                  key="clear-status"
                  onClick={() => onClearStatus(runCase.id)}
                >
                  Clear Statuses
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )
        }
        default:
          return null
      }
    },
    [
      testRunCaseStatusMessages,
      onChangeStatus,
      showPlatformEvidenceDialog,
      priorityMessages,
      onClearStatus,
      getEvidenceData,
      handleViewSavedAiAnalysis,
      handleExecuteAiAnalysis,
    ],
  )

  return (
    <>
      <div className="border-b dark:border-neutral-700 w-full p-3 flex flex-wrap items-start justify-between gap-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <Input
            placeholder="Search test cases by ID, title, or summary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80"
            endContent={loading && <Spinner size="sm" />}
          />
          {(searchTerm || sortColumn) && (
            <Button
              isIconOnly
              variant="light"
              aria-label="Reset filters"
              title="Reset all filters"
              onClick={handleResetFilters}
            >
              <RotateCcw size={16} />
            </Button>
          )}
        </div>

        {/* Test Case Statistics */}
        <div className="flex items-center gap-3 flex-wrap">
          <Chip
            variant="flat"
            startContent={<ClipboardList size={16} />}
            className="px-3"
          >
            {totalRunCasesCount} {'Total Run Cases'}
          </Chip>
          {loading && <Spinner size="sm" />}
        </div>
      </div>

      {/* Selection Message */}
      {(isAllPagesSelected || selectedKeys === 'all') &&
        setIsAllPagesSelected && (
          <div className="border-b dark:border-neutral-700 w-full p-3 flex justify-center">
            <div className="flex flex-col items-center text-center text-sm">
              {isAllPagesSelected ? (
                <>
                  <span>
                    All {totalRunCasesCount} run cases across all pages are
                    selected.
                  </span>
                  <button
                    className="text-blue-500 hover:text-blue-700 underline mt-1"
                    onClick={handleSelectAllPages}
                  >
                    Clear selection
                  </button>
                </>
              ) : selectedKeys === 'all' ? (
                <>
                  <span>All run cases on this page are selected.</span>
                  <button
                    className="text-blue-500 hover:text-blue-700 underline mt-1"
                    onClick={handleSelectAllPages}
                  >
                    Select all {totalRunCasesCount} run cases across all pages
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

      <div
        className="w-full overflow-x-auto overflow-y-auto flex-grow"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        <Table
          isCompact
          removeWrapper
          aria-label="Test cases table"
          isHeaderSticky
          selectedKeys={selectedKeys}
          selectionMode="multiple"
          sortDescriptor={sortDescriptor}
          onSelectionChange={handleSelectionChange}
          onSortChange={handleSortChange}
          className="w-full"
          style={{ tableLayout: 'auto', width: '100%' }}
        >
          <TableHeader columns={headerColumns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                allowsSorting={column.sortable ?? false}
                className={`
                    py-3 text-left
                    ${['priority', 'action'].includes(column.uid) ? 'w-[70px]' : ''}
                    ${column.uid === 'description' ? 'max-w-[200px] truncate' : ''}
                    ${sortDescriptor.column === column.uid ? 'text-primary' : ''}
                  `}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody emptyContent={messages.noCasesFound}>
            {sortedItems.map((item) => (
              <TableRow key={item.id}>
                {headerColumns.map((column) => (
                  <TableCell
                    key={column.uid}
                    onClick={(e) => handleCellClick(item, column.uid, e)}
                    className={`
                          px-2 py-2 text-left
                          ${['priority', 'action'].includes(column.uid) ? 'w-[70px]' : ''}
                          ${['description', 'title'].includes(column.uid) ? 'max-w-[200px] truncate' : ''}
                          ${['steps', 'expectedResults'].includes(column.uid) ? 'max-w-[300px] whitespace-normal' : ''}
                          ${column.uid === 'customId' ? 'cursor-default' : 'cursor-pointer'}
                        `}
                  >
                    {renderCell(item, column.uid)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TestCaseDetailDialog
          isOpen={dialogState.isTestCaseDetailOpen}
          caseId={dialogState.showingTestCaseId || 0}
          onCancel={hideTestCaseDetailDialog}
          messages={messages}
          priorityMessages={priorityMessages}
          testTypeMessages={testTypeMessages}
          testCaseMessages={testCaseMessages}
        />

        <PlatformEvidenceDialog
          isOpen={dialogState.isPlatformEvidenceOpen}
          caseId={dialogState.showingTestCaseId || 0}
          platform={dialogState.evidencePlatform}
          onClose={hidePlatformEvidenceDialog}
          onSaved={handleEvidenceSaved}
          initialEvidence={dialogState.currentEvidenceData}
        />
      </div>

      <div className="flex justify-center mt-4">
        <Pagination
          isCompact
          showControls
          showShadow
          total={Math.max(1, totalPages)}
          page={pendingPage ?? page}
          onChange={handlePageChange}
          classNames={{
            item: 'text-xl',
            next: 'text-xl',
            prev: 'text-xl',
          }}
        />
      </div>

      <AiAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        testCaseTitle={analysisCaseTitle}
        analysis={analysisData}
        onApplyStatus={handleApplyStatus}
        onReanalyze={handleReanalyze}
        isReanalyzing={isAnalyzing}
      />
    </>
  )
}
