'use client'
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
  useContext,
} from 'react'
import dayjs from 'dayjs'
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
  Pagination,
  Input,
  Tooltip,
  Spinner,
  Chip,
} from '@nextui-org/react'
import {
  Plus,
  MoreVertical,
  Trash,
  Clipboard,
  RotateCcw,
  Play,
  ExternalLink,
  Copy,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { CaseType, CasesMessages } from '@/types/case'
import { PriorityMessages } from '@/types/priority'
import TestCasePriority from '@/components/TestCasePriority'
import { LocaleCodeType } from '@/types/locale'
import { FolderType } from '@/types/folder'
import { StatusType } from '@/types/devStatus'
import { useRouter } from 'next/navigation'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import WebSocketService from '../../../../../../../utils/websocket.service'
import AiAnalysisModal from './AiAnalysisModal'
import { executeCaseWithAi, AiAnalysisData } from '@/utils/aiControl'

// Declare global handler type for TypeScript
declare global {
  interface Window {
    __removeCaseFromSelection?: (caseId: number) => void
  }
}

type Props = {
  projectId: string
  isDisabled: boolean
  cases: CaseType[]
  onCreateCase: () => void
  onImportCase: () => void
  onOpenAiDialog?: () => void
  onDeleteCase: (caseId: number) => void
  onDuplicateCase: (caseId: number) => void
  onDeleteCases: (caseIds: number[]) => void
  messages: CasesMessages
  priorityMessages: PriorityMessages
  locale: LocaleCodeType
  folder: FolderType
  onSearchCases: (query: string) => void
  totalCasesCount: number
  filteredTotalCasesCount: number
  aiCasesCount: number
  page: number | undefined
  setPage: (page: number) => void
  loading: boolean
  totalPages: number
  isPageLoaded: boolean
  searchTerm: string
  setSearchTerm: (value: string) => void
  onAddTestCasesIntoRun: (caseIds: number[]) => void
  isAllPagesSelected: boolean
  setIsAllPagesSelected: (value: boolean) => void
  sortColumn?: string
  sortDirection?: 'ASC' | 'DESC'
  onSortChange?: (column: string, direction: 'ASC' | 'DESC') => void
  onResetFilters?: () => void
}

export default function TestCaseTable({
  projectId,
  isDisabled,
  cases,
  onCreateCase,
  onImportCase,
  onDeleteCase,
  onDuplicateCase,
  onDeleteCases,
  messages,
  priorityMessages,
  locale,
  folder,
  onSearchCases,
  totalCasesCount,
  aiCasesCount,
  page,
  setPage,
  loading,
  totalPages,
  isPageLoaded,
  searchTerm,
  onAddTestCasesIntoRun,
  isAllPagesSelected,
  setIsAllPagesSelected,
  sortColumn,
  sortDirection,
  onSortChange,
  onResetFilters,
  onOpenAiDialog,
}: Props) {
  const router = useRouter()
  const tokenContext = useContext(TokenContext)
  const toastContext = useContext(ToastContext)

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [analysisData, setAnalysisData] = useState<AiAnalysisData | null>(null)
  const [analysisCaseTitle, setAnalysisCaseTitle] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const headerColumns = [
    { name: 'ID', uid: 'customId', sortable: true },
    { name: messages.title, uid: 'title', sortable: true },
    { name: messages.caseDescription, uid: 'description', sortable: true },
    {
      name: 'Steps Detail',
      uid: 'stepsDetail',
      sortable: true,
      className: 'w-1/4',
    },
    {
      name: 'Expected Results',
      uid: 'expectedResults',
      sortable: true,
      className: 'w-1/5',
    },
    { name: messages.priority, uid: 'priority', sortable: true },
    { name: messages.actions, uid: 'actions' },
  ]
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]))
  const [searchInputValue, setSearchInputValue] = useState(searchTerm)
  const [isSearching, setIsSearching] = useState(false)
  const senaiResponseDataRef = useRef<Record<number, any>>({})
  // Track if a case detail view is in progress
  const isViewingCaseDetailRef = useRef(false)

  // WebSocket service instance
  const webSocketServiceRef = useRef<WebSocketService | null>(null)
  const activeWebhooksRef = useRef<Set<string>>(new Set())

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sortColumn && sortColumn.trim() !== '' ? sortColumn : '',
    direction: sortDirection === 'ASC' ? 'ascending' : 'descending',
  })

  // Initialize WebSocket service
  useEffect(() => {
    webSocketServiceRef.current = new WebSocketService()

    return () => {
      if (webSocketServiceRef.current) {
        webSocketServiceRef.current.disconnect()
      }
    }
  }, [])

  // Update sortDescriptor when props change
  useEffect(() => {
    setSortDescriptor({
      column: sortColumn && sortColumn.trim() !== '' ? sortColumn : '',
      direction: sortDirection === 'ASC' ? 'ascending' : 'descending',
    })
  }, [sortColumn, sortDirection])

  // Update search input value when searchTerm changes
  useEffect(() => {
    setSearchInputValue(searchTerm)
  }, [searchTerm])

  // Handle sort change
  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor)
    if (onSortChange && descriptor.column) {
      onSortChange(
        descriptor.column.toString(),
        descriptor.direction === 'ascending' ? 'ASC' : 'DESC',
      )
    }
  }

  // For client-side sorting of the current page data when needed
  const sortedItems = useMemo(() => {
    return cases.length === 0 ? [] : cases
  }, [cases])

  // Generate UUID for webhook
  const generateWebhookId = useCallback(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      },
    )
  }, [])

  const handleExecuteRunSenai = useCallback(
    async (testCase: CaseType) => {
      if (!tokenContext.isSignedIn()) {
        toastContext.showToast('Vui lòng đăng nhập để sử dụng tính năng DeepSeek AI', 'error')
        return
      }

      setIsAnalyzing(true)
      toastContext.showToast(`[DeepSeek AI]: Đang phân tích kịch bản ${testCase.customId || testCase.title}...`, 'dark')

      try {
        const analysis = await executeCaseWithAi(
          tokenContext.token.access_token,
          testCase,
          locale === 'ja' ? 'en' : 'vi'
        )

        if (analysis) {
          testCase.aiAssessment = analysis
          setAnalysisCaseTitle(testCase.title)
          setAnalysisData(analysis)
          setIsAnalysisModalOpen(true)
          toastContext.showToast(`[DeepSeek AI]: Đã phân tích & lưu kịch bản ${testCase.customId || testCase.title}!`, 'success')
        }
      } catch (error: any) {
        console.error('[AI Execution Error]:', error)
        toastContext.showToast(`Phân tích AI thất bại: ${error.message}`, 'error', 5000)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [tokenContext, toastContext, locale],
  )

  const handleViewSavedAiAnalysis = useCallback((testCase: CaseType) => {
    if (testCase.aiAssessment) {
      setAnalysisCaseTitle(testCase.title)
      setAnalysisData(testCase.aiAssessment)
      setIsAnalysisModalOpen(true)
    }
  }, [])

  const handleOpenDeeplink = useCallback(
    (testCase: CaseType) => {
      console.log(`[WS: Opening deeplink for test case ${testCase.id}]`)

      const testCaseResponseData =
        senaiResponseDataRef.current[testCase.id]?.data?.outputs?.result ||
        senaiResponseDataRef.current[testCase.id] ||
        {}

      if (Object.keys(testCaseResponseData).length === 0) {
        console.warn(
          `[WS: No response data available for test case ${testCase.id}]`,
        )
        toastContext.showToast(
          `[WS: No response data available for test case ${testCase.customId || testCase.id}]`,
          'warning',
        )
        return
      }

      try {
        const encoded = encodeURIComponent(JSON.stringify(testCaseResponseData))
        const deeplink = `tcmAuto://open?data=${encoded}`

        console.log(`[WS: Deeplink] -`, { deeplink })
        toastContext.showToast(
          '[WS: Generated deeplink] shown in console log',
          'success',
          3000,
        )
        window.open(deeplink, '_blank')
      } catch (error: any) {}
    },
    [toastContext],
  )

  const handleDeleteCase = useCallback(
    (deleteCaseId: number) => {
      onDeleteCase(deleteCaseId)
    },
    [onDeleteCase],
  )

  const handleDuplicateCase = useCallback(
    (duplicateCaseId: number) => {
      onDuplicateCase(duplicateCaseId)
    },
    [onDuplicateCase],
  )

  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') {
      setSelectedKeys('all')
      setIsAllPagesSelected(false)
    } else {
      setSelectedKeys(keys)
      setIsAllPagesSelected(false)
    }
  }

  const handleSelectAllPages = () => {
    if (isAllPagesSelected) {
      setIsAllPagesSelected(false)
      setSelectedKeys(new Set([]))
    } else {
      setIsAllPagesSelected(true)
      setSelectedKeys('all')
    }
  }

  // Register global handler for removing case from selection
  useEffect(() => {
    // Define the handler to remove a case from selection
    const removeCaseFromSelection = (caseId: number) => {
      if (selectedKeys === 'all') {
        // If all items are selected, we need to create a new selection without this item
        const newSelection = new Set(
          cases
            .filter((caseItem) => caseItem.id !== caseId)
            .map((caseItem) => caseItem.id.toString()),
        )
        setSelectedKeys(newSelection)
        // Also ensure we're not in "all pages selected" mode anymore
        if (isAllPagesSelected) {
          setIsAllPagesSelected(false)
        }
      } else if (selectedKeys instanceof Set) {
        // Check if the case is in our selection
        if (selectedKeys.has(caseId.toString())) {
          const newSelection = new Set(selectedKeys)
          newSelection.delete(caseId.toString())
          setSelectedKeys(newSelection)
        }
      }
    }

    // Register the handler globally
    window.__removeCaseFromSelection = removeCaseFromSelection

    // Cleanup on unmount
    return () => {
      window.__removeCaseFromSelection = undefined
    }
  }, [selectedKeys, cases, isAllPagesSelected, setIsAllPagesSelected])

  // Navigate to test case detail page
  const navigateToDetail = (item: CaseType) => {
    // Set viewing flag before navigation
    isViewingCaseDetailRef.current = true
    router.push(
      `/${locale}/projects/${projectId}/folders/${item.folderId}/cases/${item.id}`,
    )
  }

  // Handle row cell click
  const handleCellClick = (
    item: CaseType,
    columnKey: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()

    // Only the checkbox column and ID column should handle tick/untick actions
    if (columnKey === 'customId') {
      // Do nothing - let the selection system handle it
      return
    }

    // All other columns navigate to detail page
    navigateToDetail(item)
  }

  // Get the status color for the ID column vertical stripe
  const getStatusColor = (
    statusLabel: StatusType | 'No Dev' | 'Pending' | undefined,
  ): string => {
    switch (statusLabel) {
      case 'passed':
        return 'bg-success'
      case 'pending':
        return 'bg-warning'
      case 'failed':
        return 'bg-danger'
      case 'No Dev':
      default:
        return 'bg-gray-300'
    }
  }

  const renderCell = useCallback(
    (testCase: CaseType, columnKey: string): ReactNode => {
      const cellValue = testCase[columnKey as keyof CaseType]

      switch (columnKey) {
        case 'customId': {
          const statusLabel: StatusType | 'No Dev' | 'Pending' =
            testCase.statusLabel ?? 'No Dev'
          const statusColor = getStatusColor(statusLabel)
          const hasSavedAi = Boolean(testCase.aiAssessment)

          return (
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center">
                <div className={`${statusColor} w-1 h-6 rounded-sm mr-2`}></div>
                <span className="font-medium">
                  {(cellValue as string) || '-'}
                </span>
              </div>
              {hasSavedAi && (
                <Tooltip content="DeepSeek AI Analysis Available (Click to view)">
                  <button
                    type="button"
                    className="cursor-pointer inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 transition-colors tracking-wide"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewSavedAiAnalysis(testCase)
                    }}
                  >
                    AI
                  </button>
                </Tooltip>
              )}
            </div>
          )
        }
        case 'title': {
          const text = cellValue as string
          const lines = text ? text.split(/\r?\n/) : []
          const displayLines = lines.slice(0, 5)
          const isTruncated = lines.length > 5 || (text && text.length > 100)
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
                  {text}
                </div>
              }
              radius="none"
              style={{ maxWidth: 400 }}
            >
              <div
                className={`text-left w-full ${
                  ['stepsDetail', 'expectedResults'].includes(columnKey)
                    ? 'min-w-0 max-w-full'
                    : ''
                }`}
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
        case 'description':
        case 'expectedResults':
        case 'stepsDetail': {
          const text = cellValue as string
          const lines = text ? text.split(/\r?\n/) : []
          const displayLines = lines.slice(0, 5)
          const isTruncated = lines.length > 5 || (text && text.length > 100)
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
                  {text}
                </div>
              }
              radius="none"
              style={{ maxWidth: 400 }}
            >
              <div
                className={`text-left w-full ${
                  [
                    'title',
                    'description',
                    'stepsDetail',
                    'expectedResults',
                  ].includes(columnKey)
                    ? 'min-w-0 max-w-full'
                    : ''
                }`}
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
        case 'createdBy':
          return <span>{testCase.user?.email}</span>
        case 'updatedAt':
          return (
            <span>{dayjs(cellValue as number).format('DD/MM/YYYY HH:mm')}</span>
          )
        case 'actions':
          return (
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  radius="full"
                  size="sm"
                  variant="light"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="test case actions">
                {testCase.aiAssessment ? (
                  <DropdownItem
                    key={`view-ai-${testCase.id}`}
                    startContent={<Sparkles size={16} className="text-primary" />}
                    onClick={() => handleViewSavedAiAnalysis(testCase)}
                  >
                    View AI Analysis (Saved)
                  </DropdownItem>
                ) : null}
                <DropdownItem
                  key={`execute-senai-${testCase.id}`}
                  startContent={
                    testCase.aiAssessment ? (
                      <RefreshCw size={16} className="text-primary" />
                    ) : (
                      <Sparkles size={16} className="text-primary" />
                    )
                  }
                  isDisabled={isDisabled || !tokenContext.isSignedIn()}
                  onClick={() => handleExecuteRunSenai(testCase)}
                >
                  {testCase.aiAssessment
                    ? 'Re-analyze with AI (DeepSeek)'
                    : 'Execute AI Analysis (DeepSeek)'}
                </DropdownItem>
                <DropdownItem
                  key={`open-deeplink-${testCase.id}`}
                  startContent={<ExternalLink size={16} />}
                  isDisabled={isDisabled || !tokenContext.isSignedIn()}
                  onClick={() => handleOpenDeeplink(testCase)}
                >
                  Open deeplink
                </DropdownItem>
                <DropdownItem
                  key={`duplicate-${testCase.id}`}
                  startContent={<Copy size={16} />}
                  isDisabled={isDisabled}
                  onClick={() => handleDuplicateCase(testCase.id)}
                >
                  Duplicate test case
                </DropdownItem>
                <DropdownItem
                  key={`delete-${testCase.id}`}
                  className="text-danger"
                  startContent={<Trash size={16} />}
                  isDisabled={isDisabled}
                  onClick={() => handleDeleteCase(testCase.id)}
                >
                  {messages.deleteCase}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )
        default:
          return cellValue as string
      }
    },
    [
      priorityMessages,
      isDisabled,
      messages.deleteCase,
      handleDeleteCase,
      handleExecuteRunSenai,
      handleViewSavedAiAnalysis,
      handleOpenDeeplink,
      tokenContext,
      handleDuplicateCase,
    ],
  )

  const handleDeleteCases = () => {
    let deleteCaseIds: number[]

    if (selectedKeys === 'all') {
      // Only delete cases that are currently displayed in the current page
      deleteCaseIds = cases.map((item) => item.id)
    } else {
      deleteCaseIds = Array.from(selectedKeys).map(Number)
    }

    onDeleteCases(deleteCaseIds)
    setSelectedKeys(new Set([]))
  }

  const handleAddTestCaseIntoRun = () => {
    let caseIds: number[]

    if (selectedKeys === 'all') {
      caseIds = cases.map((item) => item.id)
    } else {
      caseIds = Array.from(selectedKeys).map(Number)
    }

    onAddTestCasesIntoRun(caseIds)
    setSelectedKeys(new Set([]))
  }

  const renderWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
    return text.replace(urlRegex, (url) => {
      const href = url.startsWith('http') ? url : `https://${url}`
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${url}</a>`
    })
  }

  const handleSearch = useCallback(() => {
    setIsSearching(true)
    onSearchCases(searchInputValue)
    setIsSearching(false)
  }, [onSearchCases, searchInputValue])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchInputValue !== searchTerm) {
        handleSearch()
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [handleSearch, searchInputValue, searchTerm])

  // Add reset all filters function
  const handleResetFilters = () => {
    if (onResetFilters) {
      onResetFilters()
      setSortDescriptor({
        column: '',
        direction: 'ascending',
      })
      setSearchInputValue('')
    }
  }

  return (
    <>
      <div className="border-b dark:border-neutral-700 w-full p-3 flex flex-wrap items-start justify-between gap-4">
        <h3
          className="font-bold flex-1 min-w-0 max-w-[1100px] break-words whitespace-normal"
          dangerouslySetInnerHTML={{
            __html: renderWithLinks(folder?.detail || ''),
          }}
        ></h3>

        <div className="flex items-center gap-x-3 flex-shrink-0">
          {((selectedKeys !== 'all' && selectedKeys.size > 0) ||
            selectedKeys === 'all') && (
            <>
              <Button
                startContent={<Trash size={16} />}
                size="sm"
                color="danger"
                onClick={handleDeleteCases}
                isDisabled={isDisabled}
              >
                {messages.delete}
              </Button>
              <Button
                startContent={<Plus size={16} />}
                size="sm"
                color="primary"
                onClick={handleAddTestCaseIntoRun}
                isDisabled={isDisabled}
              >
                {'Add To Run'}
              </Button>
            </>
          )}
          <Button
            startContent={<Plus size={16} />}
            size="sm"
            color="primary"
            onClick={onImportCase}
            isDisabled={isDisabled}
          >
            {messages.import}
          </Button>
          <Button
            startContent={<Plus size={16} />}
            size="sm"
            color="primary"
            onClick={onCreateCase}
            isDisabled={isDisabled}
          >
            {messages.newTestCase}
          </Button>
          {onOpenAiDialog && (
            <Button
              size="sm"
              color="secondary"
              variant="shadow"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-md hover:opacity-90 transition-all"
              onClick={onOpenAiDialog}
              isDisabled={isDisabled}
            >
              Generate with AI
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar & Case Count Chips */}
      <div className="border-b dark:border-neutral-700 w-full p-3 flex flex-wrap items-center justify-between gap-4">
        {/* Search Bar (Left-aligned) */}
        <div className="w-full md:w-auto relative flex items-center gap-2">
          <Input
            placeholder="Search test cases by ID, Test suite/Function or Summary"
            value={searchInputValue}
            onChange={(e) => {
              setSearchInputValue(e.target.value)
            }}
            className="w-full md:w-80"
            endContent={isSearching && <Spinner size="sm" />}
          />
          {(searchInputValue || sortDescriptor.column) && (
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

        {/* Selection Message (Centered & Wrapping) */}
        <div className="flex flex-col items-center text-center min-w-[200px] max-w-[300px]">
          {isAllPagesSelected ? (
            <>
              <span>
                All {totalCasesCount} cases across all pages are selected.
              </span>
              <button className="text-blue-500" onClick={handleSelectAllPages}>
                Clear selection
              </button>
            </>
          ) : selectedKeys === 'all' ? (
            <>
              <span>All cases on this page are selected.</span>
              <button className="text-blue-500" onClick={handleSelectAllPages}>
                Select all {totalCasesCount} test cases across all pages
              </button>
            </>
          ) : null}
        </div>

        {/* Chips (Right-aligned) */}
        <div className="flex items-center gap-3">
          <Chip
            variant="flat"
            startContent={<Clipboard size={16} />}
            className="px-3"
          >
            {totalCasesCount} Test Cases
          </Chip>
          <Chip
            variant="flat"
            startContent={<Sparkles size={16} />}
            className="px-3"
          >
            {aiCasesCount} AI Test Cases
          </Chip>
        </div>
      </div>

      {/* Table Wrapper with Scrollable Content */}
      <div className="border rounded-md overflow-hidden min-h-[calc(100vh-250px)]">
        <div
          className="overflow-y-auto flex-grow"
          style={{ maxHeight: 'calc(100vh - 250px)' }}
        >
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" label="Loading test cases..." />
            </div>
          ) : (
            <Table
              isCompact
              removeWrapper
              aria-label="Test cases table"
              selectedKeys={selectedKeys}
              selectionMode="multiple"
              sortDescriptor={sortDescriptor}
              onSelectionChange={handleSelectionChange}
              onSortChange={handleSortChange}
              isHeaderSticky
              classNames={{
                th: 'bg-default-100 font-semibold text-sm py-3',
                td: 'py-2',
                sortIcon: 'text-default-500 ml-1',
              }}
            >
              {/* Table Header */}
              <TableHeader columns={headerColumns}>
                {(column) => (
                  <TableColumn
                    key={column.uid}
                    align={column.uid === 'actions' ? 'center' : 'start'}
                    allowsSorting={column.sortable}
                    className={`${sortDescriptor.column === column.uid ? 'text-primary' : ''} ${column.className || ''}`}
                  >
                    {column.name}
                  </TableColumn>
                )}
              </TableHeader>

              {/* Table Body */}
              <TableBody
                emptyContent={
                  loading ? 'Loading cases...' : messages.noCasesFound
                }
                items={sortedItems}
                isLoading={loading}
                loadingContent={<Spinner />}
              >
                {(item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-200 dark:hover:bg-neutral-700 transition"
                  >
                    {(columnKey) => (
                      <TableCell
                        onClick={(e) =>
                          handleCellClick(item, columnKey.toString(), e)
                        }
                        className={
                          columnKey === 'customId'
                            ? 'cursor-default' // Only ID column for selection
                            : 'cursor-pointer' // Other columns navigate on click
                        }
                      >
                        {renderCell(item, columnKey.toString())}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-4">
        {isPageLoaded &&
          page !== undefined && ( // ✅ Ensure page is fully loaded before rendering
            <Pagination
              isCompact
              showControls
              showShadow
              total={page >= totalPages ? page : totalPages}
              page={page}
              onChange={(newPage) => {
                setPage(newPage)
              }}
              classNames={{
                item: 'text-xl',
                next: 'text-xl',
                prev: 'text-xl',
              }}
              isDisabled={loading}
            />
          )}
      </div>

      <AiAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        testCaseTitle={analysisCaseTitle}
        analysis={analysisData}
      />
    </>
  )
}
