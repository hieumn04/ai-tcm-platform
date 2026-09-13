import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Input,
  Textarea,
  Tooltip,
} from '@nextui-org/react'
import { useContext, useEffect, useState, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchRuns } from '../../../runs/runsControl'
import { RunType } from '@/types/run'
import { TokenContext } from '@/utils/TokenProvider'

type Props = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (
    runId: number | null,
    customRunName?: string,
    description?: string,
  ) => void
  addCaseIds: number[]
  projectId: string
  isAllPagesSelected: boolean
  totalCasesCount: number
}

export default function AddTestCasesIntoRunDialog({
  isOpen,
  onCancel,
  onConfirm,
  addCaseIds,
  projectId,
  isAllPagesSelected,
  totalCasesCount,
}: Props) {
  const [runs, setRuns] = useState<RunType[]>([])
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [customRunName, setCustomRunName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isValidLink, setIsValidLink] = useState<boolean>(true)
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(false)
  const context = useContext(TokenContext)
  const isFetchingRef = useRef(false)

  // Regex to validate URL
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g

  // Fetch runs data freshly (no stale cache to ensure newly created runs appear immediately)
  const fetchRunsData = useCallback(async () => {
    if (!context.isSignedIn() || isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true
    setIsLoadingRuns(true)

    try {
      const data = await fetchRuns(
        context.token.access_token,
        Number(projectId),
      )
      setRuns(data || [])
    } catch (error: any) {
      console.error('Error fetching runs for dialog:', error.message)
    } finally {
      isFetchingRef.current = false
      setIsLoadingRuns(false)
    }
  }, [context, projectId])

  useEffect(() => {
    if (isOpen) {
      fetchRunsData()

      // Auto re-fetch when user switches back to this tab/window
      const handleWindowFocus = () => {
        fetchRunsData()
      }
      window.addEventListener('focus', handleWindowFocus)

      return () => {
        window.removeEventListener('focus', handleWindowFocus)
      }
    } else {
      // Reset state when dialog closes
      setSelectedRunId(null)
      setCustomRunName('')
      setDescription('')
    }
  }, [isOpen, fetchRunsData])

  const handleRunSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setSelectedRunId(value === '' ? null : Number(value))
    setCustomRunName('')
    setDescription('')
  }

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value
    setDescription(value)
    setIsValidLink(value.trim().length === 0 || urlRegex.test(value)) // Optional or valid link
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onCancel}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Add Test Cases Into Run
        </ModalHeader>
        <ModalBody>
          <div className="flex items-center gap-2">
            <Select
              className="flex-1"
              label="Select a Run"
              placeholder={isLoadingRuns ? 'Loading runs...' : 'Choose a test run'}
              isLoading={isLoadingRuns}
              onChange={handleRunSelection}
              isDisabled={customRunName.trim().length > 0}
              value={selectedRunId !== null ? selectedRunId.toString() : ''}
              selectedKeys={selectedRunId !== null ? [selectedRunId.toString()] : []}
            >
              {(runs.length > 0 ? runs : []).map((run) => (
                <SelectItem key={run.id.toString()} value={run.id.toString()}>
                  {run.name}
                </SelectItem>
              ))}
            </Select>
            <Tooltip content="Refresh runs list">
              <Button
                isIconOnly
                variant="flat"
                size="md"
                aria-label="Refresh runs"
                className="h-14 w-12"
                onClick={() => fetchRunsData()}
                disabled={isLoadingRuns}
              >
                <RefreshCw
                  size={18}
                  className={isLoadingRuns ? 'animate-spin text-primary' : 'text-default-500'}
                />
              </Button>
            </Tooltip>
          </div>
          <p className="text-left my-2">OR</p>
          <Input
            label="Create a Custom Run"
            placeholder="Enter new run name"
            value={customRunName}
            onChange={(event) => {
              setCustomRunName(event.target.value)
              if (event.target.value.trim().length > 0) {
                setSelectedRunId(null)
              }
            }}
            isDisabled={selectedRunId !== null}
          />
          <Textarea
            label="Enter Task Link"
            placeholder="Example: https://jira.company.com/browse/PROJ-123"
            value={description}
            onChange={handleDescriptionChange}
            isDisabled={selectedRunId !== null}
            isInvalid={!isValidLink}
            errorMessage={
              !isValidLink ? 'Please enter a valid link in the description' : ''
            }
            minRows={2}
          />
          <p>
            Are you sure you want to add{' '}
            {isAllPagesSelected ? totalCasesCount : addCaseIds.length} test
            cases to the selected run?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={() => {
              onConfirm(
                selectedRunId,
                customRunName.trim().length > 0 ? customRunName : undefined,
                customRunName.trim().length > 0 ? description : undefined,
              )
            }}
            disabled={
              (selectedRunId === null && customRunName.trim().length === 0) ||
              (customRunName.trim().length > 0 &&
                description.trim().length === 0) ||
              (!isValidLink && customRunName.trim().length > 0)
            }
          >
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
