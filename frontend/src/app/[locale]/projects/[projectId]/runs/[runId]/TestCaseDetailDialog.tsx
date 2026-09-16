import { useState, useEffect, useContext } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Avatar,
  Textarea,
} from '@nextui-org/react'
import { templates, testTypes } from '@/config/selection'
import { RunMessages } from '@/types/run'
import { CaseMessages, CaseType, StepType } from '@/types/case'
import { PriorityMessages } from '@/types/priority'
import TestCasePriority from '@/components/TestCasePriority'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import { fetchCase } from '@/utils/caseControl'
import { TestTypeMessages } from '@/types/testType'
import { capitalizeWords } from '@/utils/textUtils'

type Props = {
  isOpen: boolean
  caseId: number
  onCancel: () => void
  messages: RunMessages
  testTypeMessages: TestTypeMessages
  priorityMessages: PriorityMessages
  testCaseMessages: CaseMessages
}

const DEFAULT_TEST_CASE = {
  id: 0,
  title: '',
  state: 0,
  priority: 0,
  type: 0,
  automationStatus: 0,
  description: '',
  template: 0,
  preConditions: '',
  expectedResults: '',
  folderId: 0,
}

const MODAL_BODY_BORDER = 'border-b border-gray-200'

export default function TestCaseDetailDialog({
  isOpen,
  caseId,
  onCancel,
  messages,
  priorityMessages,
  testTypeMessages,
  testCaseMessages,
}: Props) {
  const context = useContext(TokenContext)
  const toastContext = useContext(ToastContext)
  const [testCase, setTestCase] = useState<CaseType>(DEFAULT_TEST_CASE)

  useEffect(() => {
    if (!context.isSignedIn() || !caseId || caseId <= 0) return

    const fetchData = async () => {
      try {
        const data = await fetchCase(context.token.access_token, caseId)

        const stepsList = (data as any).Steps || (data as any).steps
        if (Array.isArray(stepsList) && stepsList.length > 0) {
          stepsList.sort(
            (a: any, b: any) =>
              (a?.caseSteps?.stepNo ?? a?.stepNo ?? 0) - (b?.caseSteps?.stepNo ?? b?.stepNo ?? 0),
          )
        }

        setTestCase(data)
      } catch (error: any) {
        toastContext.showToast(
          error.message || 'Failed to fetch test case details',
          'error',
        )
      }
    }

    fetchData()
  }, [context, caseId, toastContext])

  const stepsList = (testCase as any)?.Steps || (testCase as any)?.steps
  const hasStepObjects = Array.isArray(stepsList) && stepsList.length > 0
  const hasStepsDetailText = Boolean(testCase.stepsDetail && testCase.stepsDetail.trim())

  const renderTextTemplate = () => (
    <>
      <p className="font-bold mt-2">{messages.testDetail}</p>
      {testCase.preConditions && (
        <div className="flex gap-2 my-2">
          <Textarea
            isReadOnly
            size="sm"
            variant="flat"
            label={<span className="font-bold">{messages.preconditions}</span>}
            value={testCase.preConditions}
          />
        </div>
      )}
      <div className="flex gap-2 my-2">
        <div className={testCase.expectedResults ? "w-1/2" : "w-full"}>
          <Textarea
            isReadOnly
            size="sm"
            variant="flat"
            label={<span className="font-bold">{messages.steps}</span>}
            value={testCase.stepsDetail || 'No detailed steps provided.'}
          />
        </div>
        {testCase.expectedResults && (
          <div className="w-1/2">
            <Textarea
              isReadOnly
              size="sm"
              variant="flat"
              label={<span className="font-bold">{messages.expectedResult}</span>}
              value={testCase.expectedResults}
            />
          </div>
        )}
      </div>
    </>
  )

  const renderStepsTemplate = () => (
    <>
      <p className="font-bold mt-2">{messages.steps}</p>
      {stepsList.map((step: any, index: number) => {
        const stepNum = step?.caseSteps?.stepNo ?? step?.stepNo ?? (index + 1)
        const stepText = step?.step || step?.text || step?.detailsOfTheStep || ''
        const resultText = step?.result || step?.expectedResult || ''
        return (
          <div key={step.id || index} className="flex items-center my-1">
            <Avatar
              className="me-2"
              size="sm"
              name={String(stepNum)}
            />
            <div className="grow flex gap-2">
              <div className={resultText ? "w-1/2" : "w-full"}>
                <Textarea
                  isReadOnly
                  size="sm"
                  variant="flat"
                  label={messages.detailsOfTheStep}
                  value={stepText}
                />
              </div>
              {resultText && (
                <div className="w-1/2">
                  <Textarea
                    isReadOnly
                    size="sm"
                    variant="flat"
                    label={messages.expectedResult}
                    value={resultText}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      size="5xl"
      scrollBehavior="outside"
      onOpenChange={onCancel}
      classNames={{
        header: 'border-b border-gray-200',
        closeButton:
          'top-4 right-4 z-50 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 break-words max-w-full overflow-hidden whitespace-pre-line">
          {testCase.title}
        </ModalHeader>

        <ModalBody className={MODAL_BODY_BORDER}>
          <p className="font-bold mt-2">
            {testCaseMessages.createdBy} {testCase.user?.email || 'N/A'}
          </p>
          <p className="font-bold mt-2">{testCaseMessages.description}</p>
          <div className="break-words max-w-full overflow-hidden whitespace-pre-line max-h-[120px] overflow-y-auto">
            {testCase.description || 'No description available'}
          </div>
        </ModalBody>

        <ModalBody className={MODAL_BODY_BORDER}>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="font-bold">{testCaseMessages.priority}</p>
              <TestCasePriority
                priorityValue={testCase.priority}
                priorityMessages={priorityMessages}
              />
            </div>
            <div>
              <p className="font-bold">{testCaseMessages.type}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor:
                      testTypes[testCase.type]?.chartColor || '#fba91e',
                  }}
                />
                <span>
                  {testTypeMessages && testTypes[testCase.type]
                    ? testTypeMessages[testTypes[testCase.type].uid]
                    : 'Other'}
                </span>
              </div>
            </div>
            <div>
              <p className="font-bold">{testCaseMessages.isAuto}</p>
              <div>{testCase.isAuto === 'manual' ? 'Manual' : 'Auto'}</div>
            </div>
            <div>
              <p className="font-bold">{testCaseMessages.useAI}</p>
              <div>{testCase.useAI ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </ModalBody>

        {testCase.devStatuses && testCase.devStatuses.length > 0 && (
          <ModalBody className={MODAL_BODY_BORDER}>
            <p className="font-bold mt-2">Dev Status</p>
            <div className="flex flex-col gap-2">
              {testCase.devStatuses.map((entry) => (
                <div key={entry.role} className="flex gap-2">
                  <span className="font-bold">
                    {capitalizeWords(entry.role)}:
                  </span>
                  <span>{capitalizeWords(entry.status)}</span>
                </div>
              ))}
            </div>
          </ModalBody>
        )}

        <ModalBody>
          {hasStepObjects
            ? renderStepsTemplate()
            : renderTextTemplate()}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
