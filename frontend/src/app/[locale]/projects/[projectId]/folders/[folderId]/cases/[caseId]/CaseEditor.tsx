'use client'
import { useState, useEffect, useContext } from 'react'
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  Button,
  Divider,
  Tooltip,
} from '@nextui-org/react'
import { useRouter } from '@/src/navigation'
import { Save, Plus, ArrowLeft, Circle, Trash } from 'lucide-react'
import { priorities, templates, testTypes } from '@/config/selection'
import CaseStepsEditor from './CaseStepsEditor'
import { fetchCase, updateCase } from '@/utils/caseControl'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import { useFormGuard } from '@/utils/formGuard'
import { CaseType, CaseMessages, StepType } from '@/types/case'
import { PriorityMessages } from '@/types/priority'
import { TestTypeMessages } from '@/types/testType'
import { CaseAutoStatus } from '@/src/enums/CaseAutoStatus'
import {
  fetchDevStatus,
  saveDevStatus,
  deleteDevStatusEntry,
} from '@/utils/devStatusControl'
import CaseLogDropdown from './CaseLog'
import { capitalizeWords } from '@/utils/textUtils'
import AiAnalysisModal from '../AiAnalysisModal'
import { executeCaseWithAi, AiAnalysisData } from '@/utils/aiControl'

const defaultTestCase: CaseType = {
  id: 0,
  title: '',
  state: 0,
  priority: 1,
  type: 0,
  automationStatus: 0,
  description: '',
  template: 0,
  preConditions: '',
  expectedResults: '',
  folderId: 0,
  stepsDetail: '',
  Steps: [],
  isAuto: CaseAutoStatus.Manual,
  useAI: false,
  createdAt: Date(),
  updatedAt: Date(),
}

type Props = {
  projectId: string
  folderId: string
  caseId: string
  messages: CaseMessages
  priorityMessages: PriorityMessages
  testTypeMessages?: TestTypeMessages
}

const roles = ['app', 'backend', 'frontend'] as const
const statuses = ['passed', 'failed', 'pending'] as const

type RoleType = (typeof roles)[number]
type StatusType = (typeof statuses)[number]

type DevStatusEntry = {
  id?: string
  role: RoleType
  status: StatusType
}

export default function CaseEditor({
  projectId,
  folderId,
  caseId,
  messages,
  priorityMessages,
  testTypeMessages,
}: Props) {
  const tokenContext = useContext(TokenContext)
  const toastContext = useContext(ToastContext)
  const [testCase, setTestCase] = useState<CaseType>(defaultTestCase)
  const [isUpdating, setIsUpdating] = useState(false)
  const [plusCount, setPlusCount] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [initialTitle, setInitialTitle] = useState('')
  const [refreshFlag, setRefreshFlag] = useState(false)
  const [entries, setEntries] = useState<DevStatusEntry[]>([
    { role: 'app', status: 'pending' },
  ])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [analysisData, setAnalysisData] = useState<AiAnalysisData | null>(null)

  const router = useRouter()
  useFormGuard(isDirty, messages.areYouSureLeave)

  const handleRunAi = async () => {
    if (testCase.aiAssessment && !isDirty) {
      setAnalysisData(testCase.aiAssessment)
      setIsAnalysisModalOpen(true)
      return
    }

    if (!tokenContext.isSignedIn()) {
      toastContext.showToast('Vui lòng đăng nhập để sử dụng DeepSeek AI', 'error')
      return
    }

    setIsAnalyzing(true)
    toastContext.showToast(
      `[DeepSeek AI]: Đang quét phát hiện Race Condition & Lỗ hổng bảo mật...`,
      'dark',
    )

    try {
      const analysis = await executeCaseWithAi(
        tokenContext.token.access_token,
        testCase,
        'vi',
      )

      if (analysis) {
        setTestCase((prev) => ({ ...prev, aiAssessment: analysis }))
        setAnalysisData(analysis)
        setIsAnalysisModalOpen(true)
        toastContext.showToast(
          `[DeepSeek AI]: Đã phát hiện nguy cơ & lưu kết quả thành công!`,
          'success',
        )
      }
    } catch (error: any) {
      console.error('[AI Execution Error]:', error)
      toastContext.showToast(`Phân tích AI thất bại: ${error.message}`, 'error', 5000)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleForceReanalyze = async () => {
    if (!tokenContext.isSignedIn()) return
    setIsAnalyzing(true)
    toastContext.showToast(`[DeepSeek AI]: Đang phân tích lại kịch bản...`, 'dark')
    try {
      const analysis = await executeCaseWithAi(
        tokenContext.token.access_token,
        testCase,
        'vi',
      )
      if (analysis) {
        setTestCase((prev) => ({ ...prev, aiAssessment: analysis }))
        setAnalysisData(analysis)
        toastContext.showToast(
          `[DeepSeek AI]: Đã cập nhật phân tích mới nhất!`,
          'success',
        )
      }
    } catch (error: any) {
      toastContext.showToast(`Phân tích AI thất bại: ${error.message}`, 'error', 5000)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Permission check helpers
  const canEditCase =
    tokenContext.isProjectDeveloper(Number(projectId)) || tokenContext.isAdmin()
  const canEditDevStatus =
    tokenContext.isProjectReporter(Number(projectId)) ||
    tokenContext.isAdmin() ||
    tokenContext.isProjectManager(Number(projectId))
  const isReporterOnly =
    tokenContext.isProjectReporter(Number(projectId)) && !tokenContext.isAdmin()

  const handleAddEntry = () => {
    const availableRoles = roles.filter(
      (role) => !entries.some((entry) => entry.role === role),
    )
    if (availableRoles.length === 0) return
    setEntries([...entries, { role: availableRoles[0], status: 'pending' }])
  }

  const handleRoleChange = (index: number, newRole: RoleType) => {
    setEntries((prev) => {
      const newEntries = [...prev]
      newEntries[index].role = newRole
      return newEntries
    })
  }

  const handleStatusChange = (index: number, newStatus: StatusType) => {
    setEntries((prev) => {
      const newEntries = [...prev]
      newEntries[index].status = newStatus
      return newEntries
    })
  }

  const onPlusClick = (newStepNo: number) => {
    setIsDirty(true)
    const newStep: StepType = {
      id: plusCount,
      step: '',
      result: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      caseSteps: { stepNo: newStepNo },
      uid: `uid${plusCount}`,
      editState: 'new',
    }
    setPlusCount(plusCount + 1)

    if (testCase.Steps) {
      const updatedSteps = testCase.Steps.map((step) => {
        if (step.caseSteps.stepNo >= newStepNo) {
          return {
            ...step,
            editState:
              step.editState === 'notChanged' ? 'changed' : step.editState,
            caseSteps: { ...step.caseSteps, stepNo: step.caseSteps.stepNo + 1 },
          }
        }
        return step
      })

      updatedSteps.push(newStep)
      setTestCase({ ...testCase, Steps: updatedSteps })
    }
  }

  const onDeleteClick = (stepId: number) => {
    setIsDirty(true)
    if (!testCase.Steps) return

    const deletedStep = testCase.Steps.find((step) => step.id === stepId)
    if (!deletedStep) return

    const deletedStepNo = deletedStep.caseSteps.stepNo
    deletedStep.editState = 'deleted'

    const updatedSteps = testCase.Steps.map((step) => {
      if (step.caseSteps.stepNo > deletedStepNo) {
        return {
          ...step,
          editState:
            step.editState === 'notChanged' ? 'changed' : step.editState,
          caseSteps: { ...step.caseSteps, stepNo: step.caseSteps.stepNo - 1 },
        }
      }
      return step
    })

    setTestCase({ ...testCase, Steps: updatedSteps })
  }

  const handleDeleteEntry = async (role: string, entryId?: string) => {
    if (entryId) {
      await deleteDevStatusEntry(
        tokenContext.token.access_token,
        entryId,
        Number(caseId),
      )
    }
    setEntries((prevEntries) =>
      prevEntries.filter((entry) => entry.role !== role),
    )
  }

  const handleSave = async () => {
    setIsUpdating(true)
    try {
      if (!isReporterOnly) {
        await updateCase(tokenContext.token.access_token, testCase)
      }
      if (canEditDevStatus) {
        await saveDevStatus(
          tokenContext.token.access_token,
          entries,
          Number(caseId),
        )
      }
      toastContext.showToast(messages.updatedTestCase, 'success')
      setIsDirty(false)
      setRefreshFlag((prev) => !prev)
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    async function fetchDataEffect() {
      if (!tokenContext.isSignedIn()) return

      try {
        const data = await fetchCase(
          tokenContext.token.access_token,
          Number(caseId),
        )
        if (!data) {
          toastContext.showToast('Test case not found', 'error')
          return
        }
        if (!data.Steps) data.Steps = []
        data.Steps.forEach((step: StepType) => {
          step.editState = 'notChanged'
        })
        setTestCase(data)
        setInitialTitle(data.title)

        const devStatusData = await fetchDevStatus(
          tokenContext.token.access_token,
          Number(caseId),
        )
        if (devStatusData && devStatusData.length > 0) {
          setEntries(
            devStatusData.map((entry) => ({
              id: entry.id,
              role: entry.role,
              status: entry.status,
            })),
          )
        } else {
          setEntries([{ role: 'app', status: 'pending' }])
        }
      } catch (error: any) {
        console.error('Error in effect:', error.message)
      }
    }

    fetchDataEffect()
  }, [tokenContext, refreshFlag, caseId, toastContext])

  return (
    <>
      <div className="border-b-1 dark:border-neutral-700 w-full p-3 flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip content={messages.backToCases} placement="left">
            <Button
              isIconOnly
              size="sm"
              className="rounded-full bg-neutral-50 dark:bg-neutral-600"
              onClick={() =>
                router.push(`/projects/${projectId}/folders/${folderId}/cases`)
              }
            >
              <ArrowLeft size={16} />
            </Button>
          </Tooltip>
          <h3
            className="font-bold ms-2 break-words max-w-full overflow-x-hidden text-ellipsis whitespace-pre-line"
            style={{ wordBreak: 'break-word' }}
          >
            {initialTitle}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <CaseLogDropdown
            onClose={() => {}}
            jwt={tokenContext.token.access_token}
            caseId={Number(caseId)}
          />
          {isDirty && (
            <Circle size={8} color="#525252" fill="#525252" className="me-1" />
          )}
          <Button
            size="sm"
            variant="flat"
            isLoading={isAnalyzing}
            onClick={handleRunAi}
            className="font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all shadow-sm"
          >
            {isAnalyzing
              ? 'AI Analyzing...'
              : testCase.aiAssessment && !isDirty
              ? 'AI Review & Vulnerabilities (View)'
              : 'AI Review & Vulnerabilities'}
          </Button>
          <Button
            startContent={<Save size={16} />}
            size="sm"
            isDisabled={!canEditCase && !canEditDevStatus}
            color="primary"
            isLoading={isUpdating}
            onClick={handleSave}
          >
            {isUpdating ? messages.updating : messages.update}
          </Button>
        </div>
      </div>

      <div className="p-5">
        <h6 className="font-bold">{messages.basic}</h6>
        <span className="text-sm font-bold">
          Created by {testCase.user?.email}
        </span>

        <Input
          size="sm"
          type="text"
          variant="bordered"
          label={<span className="font-bold">ID</span>}
          value={testCase.customId || ''}
          onChange={(e) => {
            setTestCase({ ...testCase, customId: e.target.value })
            setIsDirty(true)
          }}
          className="mt-3 break-words max-w-full overflow-x-hidden"
          isDisabled={isReporterOnly}
        />

        <Input
          size="sm"
          type="text"
          variant="bordered"
          label={<span className="font-bold">{messages.title}</span>}
          value={testCase.title}
          onChange={(e) => {
            setTestCase({ ...testCase, title: e.target.value })
            setIsDirty(true)
          }}
          className="mt-3 break-words max-w-full overflow-x-hidden"
          isDisabled={isReporterOnly}
        />

        <Textarea
          size="sm"
          variant="bordered"
          label={<span className="font-bold">{messages.description}</span>}
          placeholder={messages.testCaseDescription}
          value={testCase.description}
          onValueChange={(changeValue) => {
            setTestCase({ ...testCase, description: changeValue })
            setIsDirty(true)
          }}
          className="mt-3 break-words max-w-full overflow-x-hidden"
          maxRows={5}
          style={{ wordBreak: 'break-word' }}
          isDisabled={isReporterOnly}
        />

        <div className="flex gap-4 mt-3">
          <div className="flex-1">
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={[
                priorities[testCase.priority]?.uid || priorities[0].uid,
              ]}
              onSelectionChange={(newSelection) => {
                if (newSelection !== 'all' && newSelection.size !== 0) {
                  const selectedUid = Array.from(newSelection)[0]
                  const index = priorities.findIndex(
                    (priority) => priority.uid === selectedUid,
                  )
                  setTestCase({ ...testCase, priority: index })
                  setIsDirty(true)
                }
              }}
              startContent={
                <Circle
                  size={8}
                  color={
                    priorities[testCase.priority]?.color || priorities[0].color
                  }
                  fill={
                    priorities[testCase.priority]?.color || priorities[0].color
                  }
                />
              }
              label={<span className="font-bold">{messages.priority}</span>}
              isDisabled={isReporterOnly}
            >
              {priorities.map((priority, index) => (
                <SelectItem key={priority.uid} value={index}>
                  {priorityMessages[priority.uid]}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex-1">
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={[
                testTypes[testCase.type]?.uid || testTypes[0]?.uid || 'other',
              ]}
              onSelectionChange={(newSelection) => {
                if (newSelection !== 'all' && newSelection.size !== 0) {
                  const selectedUid = Array.from(newSelection)[0]
                  const index = testTypes.findIndex(
                    (type) => type.uid === selectedUid,
                  )
                  if (index !== -1) {
                    setTestCase({ ...testCase, type: index })
                    setIsDirty(true)
                  }
                }
              }}
              startContent={
                <Circle
                  size={8}
                  color={
                    testTypes[testCase.type]?.chartColor ||
                    testTypes[0]?.chartColor ||
                    '#fba91e'
                  }
                  fill={
                    testTypes[testCase.type]?.chartColor ||
                    testTypes[0]?.chartColor ||
                    '#fba91e'
                  }
                />
              }
              label={<span className="font-bold">{messages.type}</span>}
              isDisabled={isReporterOnly}
            >
              {testTypes.map((type, index) => (
                <SelectItem key={type.uid} value={index}>
                  {testTypeMessages?.[type.uid] || type.uid}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex-1">
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={testCase.complexity ? [testCase.complexity] : []}
              onSelectionChange={(newSelection) => {
                if (newSelection !== 'all' && newSelection.size !== 0) {
                  const selectedComplexity = Array.from(newSelection)[0]
                  setTestCase({
                    ...testCase,
                    complexity: selectedComplexity as '1' | '2' | '3',
                  })
                  setIsDirty(true)
                }
              }}
              label={<span className="font-bold">{messages.complexity}</span>}
              isDisabled={isReporterOnly}
            >
              <SelectItem key="1" value="1">
                Easy
              </SelectItem>
              <SelectItem key="2" value="2">
                Medium
              </SelectItem>
              <SelectItem key="3" value="3">
                Hard
              </SelectItem>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 mt-3">
          <div className="flex-1">
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={[
                testCase.isAuto === CaseAutoStatus.Auto ? 'auto' : 'manual',
              ]}
              onSelectionChange={(newSelection) => {
                if (newSelection !== 'all' && newSelection.size !== 0) {
                  const selectedUid = Array.from(newSelection)[0]
                  setTestCase({
                    ...testCase,
                    isAuto:
                      selectedUid === 'auto'
                        ? CaseAutoStatus.Auto
                        : CaseAutoStatus.Manual,
                  })
                  setIsDirty(true)
                }
              }}
              label={<span className="font-bold">{messages.isAuto}</span>}
              isDisabled={isReporterOnly}
            >
              <SelectItem key="manual" value="manual">
                Manual
              </SelectItem>
              <SelectItem key="auto" value="auto">
                Auto
              </SelectItem>
            </Select>
          </div>

          <div className="flex-1">
            <Select
              size="sm"
              variant="bordered"
              selectedKeys={[testCase.useAI ? 'yes' : 'no']}
              onSelectionChange={(newSelection) => {
                if (newSelection !== 'all' && newSelection.size !== 0) {
                  const selectedValue = Array.from(newSelection)[0]
                  setTestCase({ ...testCase, useAI: selectedValue === 'yes' })
                  setIsDirty(true)
                }
              }}
              label={<span className="font-bold">{messages.useAI}</span>}
              isDisabled={isReporterOnly}
            >
              <SelectItem key="yes" value="yes">
                Yes
              </SelectItem>
              <SelectItem key="no" value="no">
                No
              </SelectItem>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <h6 className="font-bold">Dev Status</h6>
          <div className="flex flex-col gap-3 mt-3">
            {entries.map((entry, index) => (
              <div key={index} className="flex gap-2 font-bold">
                <Select
                  size="sm"
                  variant="bordered"
                  selectedKeys={[entry.role]}
                  onSelectionChange={(newSelection) => {
                    const selectedRole = Array.from(newSelection)[0] as RoleType
                    handleRoleChange(index, selectedRole)
                    setIsDirty(true)
                  }}
                  label="Role"
                  isDisabled={!canEditDevStatus}
                >
                  {roles
                    .filter(
                      (role) =>
                        !entries.some((e, i) => i !== index && e.role === role),
                    )
                    .map((role) => (
                      <SelectItem key={role} value={role}>
                        {capitalizeWords(role)}
                      </SelectItem>
                    ))}
                </Select>

                <Select
                  size="sm"
                  variant="bordered"
                  selectedKeys={[entry.status]}
                  onSelectionChange={(newSelection) => {
                    const selectedStatus = Array.from(
                      newSelection,
                    )[0] as StatusType
                    handleStatusChange(index, selectedStatus)
                    setIsDirty(true)
                  }}
                  label="Status"
                  isDisabled={!canEditDevStatus}
                >
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {capitalizeWords(status)}
                    </SelectItem>
                  ))}
                </Select>

                {canEditDevStatus && (
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    onClick={() => {
                      handleDeleteEntry(entry.role, entry?.id)
                      setIsDirty(true)
                    }}
                    className="h-auto w-[50px]"
                    isDisabled={entries.length === 1}
                  >
                    <Trash size={20} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {entries.length < roles.length && canEditDevStatus && (
            <Button
              startContent={<Plus size={16} />}
              size="sm"
              color="primary"
              className="mt-3 w-full"
              onClick={() => {
                handleAddEntry()
                setIsDirty(true)
              }}
            >
              Add Role
            </Button>
          )}
        </div>

        <Divider className="my-6" />

        {templates[testCase.template].uid === 'text' ? (
          <div>
            <h6 className="font-bold">{messages.testDetail}</h6>
            <Textarea
              size="sm"
              variant="bordered"
              label={
                <span className="font-bold">{messages.preconditions}</span>
              }
              value={testCase.preConditions}
              onValueChange={(changeValue) => {
                setTestCase({ ...testCase, preConditions: changeValue })
                setIsDirty(true)
              }}
              className="mt-3"
              isDisabled={isReporterOnly}
            />

            <div className="flex gap-4 mt-3">
              <Textarea
                size="sm"
                variant="bordered"
                label={<span className="font-bold">Steps</span>}
                value={testCase.stepsDetail}
                onValueChange={(changeValue) => {
                  setTestCase({ ...testCase, stepsDetail: changeValue })
                  setIsDirty(true)
                }}
                isDisabled={isReporterOnly}
              />
              <Textarea
                size="sm"
                variant="bordered"
                label={
                  <span className="font-bold">{messages.expectedResult}</span>
                }
                value={testCase.expectedResults}
                onValueChange={(changeValue) => {
                  setTestCase({ ...testCase, expectedResults: changeValue })
                  setIsDirty(true)
                }}
                isDisabled={isReporterOnly}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-3">
              <h6 className="font-bold">{messages.steps}</h6>
              <Button
                startContent={<Plus size={16} />}
                size="sm"
                isDisabled={!canEditCase}
                color="primary"
                className="ms-3"
                onClick={() => onPlusClick(1)}
              >
                {messages.newStep}
              </Button>
            </div>
            {testCase.Steps && (
              <CaseStepsEditor
                isDisabled={!canEditCase}
                steps={testCase.Steps}
                onStepUpdate={(stepId, changeStep) => {
                  if (testCase.Steps) {
                    setTestCase({
                      ...testCase,
                      Steps: testCase.Steps.map((step) => {
                        if (step.id === stepId) {
                          return changeStep
                        } else {
                          return step
                        }
                      }),
                    })
                    setIsDirty(true)
                  }
                }}
                onStepPlus={onPlusClick}
                onStepDelete={onDeleteClick}
                messages={messages}
              />
            )}
            {(!testCase.Steps || testCase.Steps.length === 0) && testCase.stepsDetail && (
              <div className="mt-3">
                <Textarea
                  size="sm"
                  variant="bordered"
                  label={<span className="font-bold">Steps Detail (Text)</span>}
                  value={testCase.stepsDetail}
                  onValueChange={(changeValue) => {
                    setTestCase({ ...testCase, stepsDetail: changeValue })
                    setIsDirty(true)
                  }}
                  isDisabled={isReporterOnly}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <AiAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        testCaseTitle={testCase.title}
        analysis={analysisData || testCase.aiAssessment || null}
        onReanalyze={handleForceReanalyze}
        isReanalyzing={isAnalyzing}
      />
    </>
  )
}
