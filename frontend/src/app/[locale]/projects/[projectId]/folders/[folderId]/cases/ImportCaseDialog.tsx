import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useContext,
} from 'react'
import {
  Button,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@nextui-org/react'
import { CasesMessages } from '@/types/case'
import { parseTableToJson } from '@/utils/parseTableToJson'
import { parseExcelToJson } from '@/utils/parseExcelToJson'
import { ToastContext } from '@/utils/ToastProvider'

type Props = {
  isOpen: boolean
  onCancel: () => void
  onSubmit: (
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
  ) => void
  messages: CasesMessages
}

const dropdownOptions = [
  'Skip This Title ⏭️',
  'ID',
  'Title',
  'Description',
  'Preconditions',
  'ExpectedResult',
  'Priority',
  'StepsDetail',
  'isAuto',
  'useAI',
  'Complexity',
]

const mandatoryFields = [
  'Description',
  'StepsDetail',
  'ExpectedResult',
  'Priority',
]

export default function ImportCaseDialog({
  isOpen,
  onCancel,
  onSubmit,
  messages,
}: Props) {
  const [plainText, setPlainText] = useState({
    text: '',
    isValid: false,
    errorMessage: '',
  })
  const [jsonData, setJsonData] = useState<any[]>([])
  const [selectedOptions, setSelectedOptions] = useState<{
    [key: string]: string
  }>({})
  const [validHeaders, setValidHeaders] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const toastContext = useContext(ToastContext)

  const headerMappings = useMemo(
    () =>
      ({
        id: 'customId',
        testsuitefunction: 'Title',
        'test suite function': 'Title',
        'test suite/function': 'Title',
        'test_suite/_function': 'Title',
        'test_suite/function': 'Title',
        'test suite/ function': 'Title',
        summary: 'Description',
        description: 'Description',
        'pre condition': 'Preconditions',
        'pre-condition': 'Preconditions',
        pre_condition: 'Preconditions',
        preconditions: 'Preconditions',
        step: 'StepsDetail',
        steps: 'StepsDetail',
        steps_detail: 'StepsDetail',
        stepsdetail: 'StepsDetail',
        'expected result': 'ExpectedResult',
        'expected results': 'ExpectedResult',
        expected_result: 'ExpectedResult',
        expected_results: 'ExpectedResult',
        expectedresult: 'ExpectedResult',
        'actual result': 'ExpectedResult',
        'actual results': 'ExpectedResult',
        actual_result: 'ExpectedResult',
        actual_results: 'ExpectedResult',
        actualresult: 'ExpectedResult',
        result: 'ExpectedResult',
        priority: 'Priority',
        useai: 'useAI',
        use_ai: 'useAI',
        'có sử dụng ai': 'useAI',
        có_sử_dụng_ai: 'useAI',
        complexity: 'Complexity',
      }) as Record<string, string>,
    [],
  )

  const normalizeString = useCallback(
    (str: string) => str.replace(/_/g, ' ').trim().toLowerCase(),
    [],
  )

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setPlainText((prev) => ({
      ...prev,
      text,
      isValid: false,
      errorMessage: '',
    }))

    try {
      const parsedData = parseTableToJson(text)
      setJsonData(parsedData.length > 0 ? parsedData : [])
    } catch (error) {
      setJsonData([])
      setPlainText((prev) => ({
        ...prev,
        isValid: true,
        errorMessage: 'Invalid table format.',
      }))
      toastContext?.showToast('Invalid table format.', 'error')
    }
  }

  const handlePasteClick = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      if (!clipboardText) return

      setPlainText((prev) => ({
        ...prev,
        text: clipboardText,
        isValid: false,
        errorMessage: '',
      }))

      try {
        const parsedData = parseTableToJson(clipboardText)
        setJsonData(parsedData.length > 0 ? parsedData : [])
      } catch (error) {
        setJsonData([])
        setPlainText((prev) => ({
          ...prev,
          isValid: true,
          errorMessage: 'Invalid table format.',
        }))
        toastContext?.showToast('Invalid table format.', 'error')
      }
    } catch (error) {
      toastContext?.showToast('Failed to read clipboard contents.', 'error')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const parsedData = await parseExcelToJson(file)
      if (parsedData.length === 0) {
        setJsonData([])
        setPlainText((prev) => ({
          ...prev,
          isValid: true,
          errorMessage: 'Excel file is empty or has no data.',
        }))
        toastContext?.showToast('Excel file is empty or has no data.', 'error')
        return
      }

      setJsonData(parsedData)
      setPlainText((prev) => ({
        ...prev,
        text: '',
        isValid: false,
        errorMessage: '',
      }))
      toastContext?.showToast(
        `Successfully loaded ${parsedData.length} rows from Excel file.`,
        'success',
      )
    } catch (error) {
      setJsonData([])
      setPlainText((prev) => ({
        ...prev,
        isValid: true,
        errorMessage:
          'Failed to parse Excel file. Please check the file format.',
      }))
      toastContext?.showToast(
        'Failed to parse Excel file. Please check the file format.',
        'error',
      )
    }
  }

  // Auto-map headers when JSON data changes
  useEffect(() => {
    if (jsonData.length > 0) {
      const headers = Object.keys(jsonData[0])
      setValidHeaders(headers)

      const mappings: { [key: string]: string } = {}
      headers.forEach((header) => {
        const normalizedHeader = normalizeString(header)
        const matchedKey = Object.keys(headerMappings).find(
          (key) => normalizedHeader === key,
        )
        mappings[header] = matchedKey
          ? headerMappings[matchedKey]
          : 'Skip This Title ⏭️'
      })

      setSelectedOptions(mappings)
    }
  }, [jsonData, headerMappings, normalizeString])

  const handleOptionChange = (header: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [header]: value === 'ID' ? 'customId' : value,
    }))
  }

  const resetState = () => {
    setPlainText({ text: '', isValid: false, errorMessage: '' })
    setJsonData([])
    setSelectedOptions({})
    setValidHeaders([])
    setIsImporting(false)
  }

  const handleSubmit = async () => {
    const reversedOptions = Object.fromEntries(
      Object.entries(selectedOptions)
        .filter(([_, value]) => value !== 'Skip This Title ⏭️')
        .map(([key, value]) => [value, key]),
    )

    const mappedValues = {
      title: reversedOptions['Title'] || '',
      description: reversedOptions['Description'] || '',
      priority: reversedOptions['Priority'] || '',
      preConditions: reversedOptions['Preconditions'] || '',
      expectedResults: reversedOptions['ExpectedResult'] || '',
      stepsDetail: reversedOptions['StepsDetail'] || '',
      isAuto: reversedOptions['isAuto'] || '',
      useAI: reversedOptions['useAI'] || '',
      customId: reversedOptions['customId'] || '',
      complexity: reversedOptions['Complexity'] || '',
    }

    setIsImporting(true)

    try {
      await onSubmit(
        jsonData,
        mappedValues.title,
        mappedValues.description,
        mappedValues.priority,
        mappedValues.preConditions,
        mappedValues.expectedResults,
        mappedValues.stepsDetail,
        mappedValues.isAuto,
        mappedValues.useAI,
        mappedValues.customId,
        mappedValues.complexity,
      )
      resetState()
    } catch (error) {
      setIsImporting(false)
    }
  }

  // Validation logic
  const selectedValues = Object.values(selectedOptions)
  const hasDuplicateMapping =
    selectedValues.filter((v) => v !== 'Skip This Title ⏭️').length !==
    new Set(selectedValues.filter((v) => v !== 'Skip This Title ⏭️')).size
  const hasUnmappedHeaders = selectedValues.includes('Select Option')
  const missingMandatoryFields = mandatoryFields.filter(
    (field) => !selectedValues.includes(field),
  )
  const hasMissingMandatoryFields = missingMandatoryFields.length > 0

  const errorMessage = useMemo(() => {
    if (!plainText.text.trim()) return ''
    if (hasDuplicateMapping)
      return 'Duplicate mapping detected. Please assign unique fields for each column.'
    if (hasMissingMandatoryFields)
      return `Some required fields are not mapped: ${missingMandatoryFields.join(', ')}. Please map all required fields.`
    if (hasUnmappedHeaders)
      return 'Some columns are not mapped. Please map all fields before importing.'
    return ''
  }, [
    plainText.text,
    hasDuplicateMapping,
    hasMissingMandatoryFields,
    hasUnmappedHeaders,
    missingMandatoryFields,
  ])

  const disableImport =
    jsonData.length === 0 ||
    hasDuplicateMapping ||
    hasUnmappedHeaders ||
    hasMissingMandatoryFields ||
    isImporting

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isImporting) {
          resetState()
          onCancel()
        }
      }}
      size="3xl"
      isDismissable={!isImporting}
      hideCloseButton={isImporting}
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{messages.import}</h2>
          <p className="text-sm text-gray-600">
            Import test cases from table data or Excel files
          </p>
        </ModalHeader>

        <ModalBody className="px-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Input
              </label>
              <Textarea
                label="Paste table data here"
                placeholder="Copy and paste table data from Excel, Google Sheets, or any spreadsheet..."
                value={plainText.text}
                isInvalid={plainText.isValid}
                errorMessage={plainText.errorMessage}
                onChange={handleTextChange}
                size="md"
                minRows={4}
                maxRows={8}
                className="w-full"
                isDisabled={isImporting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="bordered"
                onClick={handlePasteClick}
                startContent={<span className="text-lg">📋</span>}
                isDisabled={isImporting}
                className="flex-1 max-w-[200px]"
              >
                Paste from Clipboard
              </Button>

              <div className="flex-1 max-w-[200px]">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                  disabled={isImporting}
                />
                <Button
                  variant="bordered"
                  onClick={() =>
                    document.getElementById('excel-upload')?.click()
                  }
                  startContent={<span className="text-lg">📄</span>}
                  isDisabled={isImporting}
                  className="w-full"
                >
                  Upload Excel File
                </Button>
              </div>
            </div>
          </div>

          {/* Mapping Section */}
          {jsonData.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Field Mapping</h3>
                <span className="text-sm text-gray-500">
                  {jsonData.length} rows detected
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <div className="space-y-3">
                  {validHeaders.map((header) => (
                    <div
                      key={header}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {header}
                        </div>
                        <div className="text-xs text-gray-500">
                          Source column
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span className="text-gray-400">→</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <Dropdown isDisabled={isImporting}>
                          <DropdownTrigger>
                            <Button
                              variant="bordered"
                              size="sm"
                              className="w-full justify-start"
                              isDisabled={isImporting}
                            >
                              <span className="truncate">
                                {selectedOptions[header] === 'customId'
                                  ? 'ID'
                                  : selectedOptions[header] === 'Title'
                                    ? 'Test suite/Function'
                                    : selectedOptions[header] === 'Description'
                                      ? 'Summary'
                                      : selectedOptions[header] ||
                                        'Select field...'}
                              </span>
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label={`Field mapping for ${header}`}
                            selectionMode="single"
                            selectedKeys={
                              selectedOptions[header]
                                ? [selectedOptions[header]]
                                : []
                            }
                            onSelectionChange={(keys) => {
                              const selectedKey = Array.from(keys)[0] as string
                              if (selectedKey) {
                                handleOptionChange(header, selectedKey)
                              }
                            }}
                          >
                            {dropdownOptions.map((option) => (
                              <DropdownItem key={option}>
                                {option === 'Title'
                                  ? 'Test suite/Function'
                                  : option === 'Description'
                                    ? 'Summary'
                                    : option}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                        <div className="text-xs text-gray-500 mt-1">
                          Target field
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Fields Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">ℹ️</span>
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">
                      Required fields:
                    </div>
                    <div className="text-blue-700">
                      {mandatoryFields.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-sm">⚠️</span>
                <p className="text-sm text-red-700 font-medium">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex justify-end gap-3 px-6 py-4">
          <Button
            variant="light"
            onClick={onCancel}
            isDisabled={isImporting}
            className="min-w-[80px]"
          >
            {messages.close}
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            isLoading={isImporting}
            isDisabled={disableImport}
            className="min-w-[100px]"
          >
            {isImporting
              ? 'Importing...'
              : `Import ${jsonData.length > 0 ? `(${jsonData.length})` : ''}`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
