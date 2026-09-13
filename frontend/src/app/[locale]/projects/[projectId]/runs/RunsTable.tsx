'use client'
import { useState, useEffect, useMemo, ReactNode } from 'react'
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
  SortDescriptor,
} from '@nextui-org/react'
import { MoreVertical } from 'lucide-react'
import { RunsMessages, RunType } from '@/types/run'
import dayjs from 'dayjs'
import { LocaleCodeType } from '@/types/locale'
import { testRunStatus } from '@/config/selection'
import { truncateText } from '@/utils/textUtils'

type Props = {
  projectId: string
  isDisabled: boolean
  runs: RunType[]
  onDeleteRun: (runId: number) => void
  onDuplicateRun: (run: RunType) => void
  messages: RunsMessages
  locale: LocaleCodeType
}

export default function RunsTable({
  projectId,
  isDisabled,
  runs,
  onDeleteRun,
  onDuplicateRun,
  messages,
  locale,
}: Props) {
  const [disabledKeys, setDisabledKeys] = useState<string[]>([])

  useEffect(() => {
    if (isDisabled) {
      setDisabledKeys(['delete', 'duplicate'])
    } else {
      setDisabledKeys([])
    }
  }, [isDisabled])

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'updatedAt',
    direction: 'descending',
  })

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const headerColumns = [
    { name: 'ID', uid: 'id', sortable: true },
    { name: messages.name, uid: 'name', sortable: true },
    { name: 'State', uid: 'state', sortable: true },
    { name: messages.lastUpdate, uid: 'updatedAt', sortable: true },
    { name: 'Status', uid: 'state', sortable: true },
    { name: messages.actions, uid: 'actions' },
  ]

  const sortedItems = useMemo(() => {
    const runsArray = Array.isArray(runs) ? runs : []
    return [...runsArray].sort((a: RunType, b: RunType) => {
      const first = a[sortDescriptor.column as keyof RunType]
      const second = b[sortDescriptor.column as keyof RunType]
      const cmp =
        sortDescriptor.column === 'id'
          ? Number(first) - Number(second)
          : String(first).localeCompare(String(second))

      return sortDescriptor.direction === 'descending' ? -cmp : cmp
    })
  }, [runs, sortDescriptor])

  const renderCell = (run: RunType, columnKey: string) => {
    const cellValue = run[columnKey as keyof RunType]

    switch (columnKey) {
      case 'name':
        const maxLength = 30
        const truncatedDescription = truncateText(run.description, maxLength)
        return (
          <div>
            <span>{cellValue as string}</span>
            <div className="text-xs text-default-500">
              <div>{truncatedDescription}</div>
            </div>
          </div>
        )
      case 'state':
        const status = testRunStatus[run.state]
        return <span>{status ? formatStatus(status.uid) : 'Unknown'}</span>
      case 'updatedAt':
        return (
          <span>{dayjs(cellValue as string).format('DD/MM/YYYY HH:mm')}</span>
        )
      case 'actions':
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly radius="full" size="sm" variant="light">
                <MoreVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="run actions" disabledKeys={disabledKeys}>
              <DropdownItem key="duplicate" onClick={() => onDuplicateRun(run)}>
                {messages.duplicateRun}
              </DropdownItem>
              <DropdownItem
                className="text-danger"
                key="delete"
                onClick={() => onDeleteRun(run.id)}
              >
                {messages.deleteRun}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )
      default:
        return cellValue
    }
  }

  const classNames = useMemo(
    () => ({
      wrapper: ['max-w-3xl'],
      th: ['bg-transparent', 'text-default-500', 'border-b', 'border-divider'],
      td: [
        // changing the rows border radius
        // first
        'group-data-[first=true]:first:before:rounded-none',
        'group-data-[first=true]:last:before:rounded-none',
        // middle
        'group-data-[middle=true]:before:rounded-none',
        // last
        'group-data-[last=true]:first:before:rounded-none',
        'group-data-[last=true]:last:before:rounded-none',
      ],
    }),
    [],
  )

  return (
    <>
      <Table
        isCompact
        aria-label="Runs table"
        classNames={classNames}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
      >
        <TableHeader columns={headerColumns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.uid === 'actions' ? 'center' : 'start'}
              allowsSorting={column.sortable}
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody emptyContent={messages.noRunsFound} items={sortedItems}>
          {(item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() =>
                (window.location.href = `/${locale}/projects/${projectId}/runs/${item.id}`)
              }
            >
              {(columnKey) => (
                <TableCell>
                  {renderCell(item, columnKey as string) as ReactNode}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  )
}
