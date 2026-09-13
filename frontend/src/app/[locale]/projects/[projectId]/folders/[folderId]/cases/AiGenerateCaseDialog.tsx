'use client'

import React, { useState, useContext, useEffect, useRef } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Chip,
  Spinner,
  Checkbox,
  Accordion,
  AccordionItem,
} from '@nextui-org/react'
import {
  Sparkles,
  Check,
  RotateCcw,
  Layers,
  FileText,
  ChevronDown,
  CheckSquare,
  Square,
  UploadCloud,
  ImageIcon,
  X,
} from 'lucide-react'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import {
  generateTestCasesWithAi,
  saveBatchAiTestCases,
  GeneratedCaseData,
} from '@/utils/aiControl'
import { priorities, testTypes } from '@/config/selection'

type Props = {
  isOpen: boolean
  onClose: () => void
  folderId: string
  onCaseCreated: () => void
}

const QUICK_PROMPTS = [
  'Real-time chat concurrency when two users send messages simultaneously',
  'User login with SMS OTP verification & lockout after 5 failed attempts',
  'Apply voucher discount code during shopping cart checkout',
  'Sign up with Google OAuth 2.0 and auto-create user profile',
]

export default function AiGenerateCaseDialog({
  isOpen,
  onClose,
  folderId,
  onCaseCreated,
}: Props) {
  const tokenContext = useContext(TokenContext)
  const toastContext = useContext(ToastContext)

  const [prompt, setPrompt] = useState('')
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string>('')
  const [mode, setMode] = useState<'suite' | 'single'>('suite')
  const [language, setLanguage] = useState<'en' | 'vi'>('en')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Generated cases state
  const [generatedCases, setGeneratedCases] = useState<GeneratedCaseData[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Support paste screenshot directly with Ctrl + V from clipboard
  useEffect(() => {
    if (!isOpen) return

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0]
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            setAttachedImage(base64)
            setImageFileName(file.name || 'Pasted_Screenshot.png')
            toastContext.showToast('Screenshot attached from clipboard!', 'success')
          }
          reader.readAsDataURL(file)
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isOpen, toastContext])

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toastContext.showToast('Please select a valid image (PNG, JPG, WebP)', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toastContext.showToast('Image size exceeds 10MB limit', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setAttachedImage(base64)
      setImageFileName(file.name)
      toastContext.showToast(`Loaded screenshot: ${file.name}`, 'success')
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt !== undefined ? customPrompt : prompt
    if (!textToUse.trim() && !attachedImage) {
      toastContext.showToast('Please enter a description or attach an image', 'error')
      return
    }

    setIsGenerating(true)
    try {
      const results = await generateTestCasesWithAi(
        tokenContext.token.access_token,
        Number(folderId),
        textToUse.trim(),
        mode,
        language,
        attachedImage
      )
      if (results && results.length > 0) {
        setGeneratedCases(results)
        // Select all by default
        setSelectedIndices(results.map((_, i) => i))
        toastContext.showToast(
          `DeepSeek generated ${results.length} test ${results.length > 1 ? 'cases' : 'case'} successfully!`,
          'success'
        )
      } else {
        toastContext.showToast('No test cases generated. Please refine your prompt.', 'warning')
      }
    } catch (error: any) {
      toastContext.showToast(`AI generation error: ${error.message}`, 'error', 5000)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleSelect = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index))
    } else {
      setSelectedIndices([...selectedIndices, index])
    }
  }

  const handleSelectAll = () => {
    if (selectedIndices.length === generatedCases.length) {
      setSelectedIndices([])
    } else {
      setSelectedIndices(generatedCases.map((_, i) => i))
    }
  }

  const handleSave = async () => {
    const casesToSave = selectedIndices.map((i) => generatedCases[i]).filter(Boolean)
    if (casesToSave.length === 0) {
      toastContext.showToast('Please select at least one test case to save', 'warning')
      return
    }

    setIsSaving(true)
    try {
      await saveBatchAiTestCases(
        tokenContext.token.access_token,
        Number(folderId),
        casesToSave
      )
      toastContext.showToast(
        `Successfully saved ${casesToSave.length} test ${casesToSave.length > 1 ? 'cases' : 'case'} to folder!`,
        'success'
      )
      onCaseCreated()
      handleClose()
    } catch (error: any) {
      toastContext.showToast(`Save error: ${error.message}`, 'error', 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setAttachedImage(null)
    setImageFileName('')
    setGeneratedCases([])
    setSelectedIndices([])
    setIsGenerating(false)
    setIsSaving(false)
    onClose()
  }

  const getPriorityLabel = (val: number) => {
    return priorities[val]?.uid?.toUpperCase() || 'P2'
  }

  const getTypeLabel = (val: number) => {
    return testTypes[val]?.uid || 'functional'
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size="4xl"
      scrollBehavior="inside"
      classNames={{
        header: 'border-b border-gray-200 dark:border-neutral-700 pb-3',
        footer: 'border-t border-gray-200 dark:border-neutral-700 pt-3',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-primary font-bold">
          <Sparkles className="text-primary" size={20} />
          <span>AI Test Case Generator (Powered by DeepSeek Vision)</span>
        </ModalHeader>

        <ModalBody className="py-4">
          {generatedCases.length === 0 ? (
            /* STEP 1: PROMPT INPUT, IMAGE ATTACHMENT & CONFIGURATION */
            <div className="flex flex-col gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Enter business requirements, or <strong>attach a UI screenshot / wireframe</strong>. DeepSeek AI will analyze visual components and architect a structured Test Suite.
              </div>

              {/* Mode Selection */}
              <div className="flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Generation Scope:
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={mode === 'suite' ? 'solid' : 'bordered'}
                    color={mode === 'suite' ? 'primary' : 'default'}
                    startContent={<Layers size={15} />}
                    onClick={() => setMode('suite')}
                    className="font-medium"
                  >
                    Test Suite (3 - 4 Scenarios) — Recommended
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === 'single' ? 'solid' : 'bordered'}
                    color={mode === 'single' ? 'primary' : 'default'}
                    startContent={<FileText size={15} />}
                    onClick={() => setMode('single')}
                  >
                    Single Deep-Dive Case
                  </Button>
                </div>
              </div>

              <Textarea
                label="Feature Description / User Story"
                placeholder="e.g., Verify real-time chat concurrency, or leave empty if providing a UI screenshot below..."
                value={prompt}
                onValueChange={setPrompt}
                minRows={3}
                maxRows={6}
                variant="bordered"
                isDisabled={isGenerating}
              />

              {/* Image Upload / Screenshot Paste Zone */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    UI Screenshot / Mockup (Optional):
                  </span>
                  <span className="text-[11px] text-primary">
                    💡 Tip: Paste screenshot directly with Ctrl + V
                  </span>
                </div>

                {!attachedImage ? (
                  <label className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition bg-neutral-50 dark:bg-neutral-800/40">
                    <UploadCloud size={20} className="text-primary" />
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      Click to upload UI design / screenshot, or paste from clipboard (Ctrl + V)
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                      <img
                        src={attachedImage}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded border border-neutral-300 dark:border-neutral-600 shadow-sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">
                          {imageFileName || 'Attached Screenshot'}
                        </span>
                        <span className="text-[11px] text-success font-medium">
                          ✓ Ready for DeepSeek Vision multimodal analysis
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      isIconOnly
                      variant="light"
                      color="danger"
                      onClick={() => {
                        setAttachedImage(null)
                        setImageFileName('')
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      title="Remove image"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Prompts */}
              <div>
                <span className="text-xs font-semibold text-gray-500 block mb-2">
                  Quick Examples (Click to test):
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((qPrompt, idx) => (
                    <Chip
                      key={idx}
                      variant="flat"
                      color="secondary"
                      size="sm"
                      className="cursor-pointer hover:bg-secondary-200 transition"
                      onClick={() => {
                        setPrompt(qPrompt)
                        handleGenerate(qPrompt)
                      }}
                    >
                      {qPrompt}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs font-semibold text-gray-500">Output Language:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={language === 'en' ? 'solid' : 'bordered'}
                    color={language === 'en' ? 'primary' : 'default'}
                    onClick={() => setLanguage('en')}
                  >
                    English
                  </Button>
                  <Button
                    size="sm"
                    variant={language === 'vi' ? 'solid' : 'bordered'}
                    color={language === 'vi' ? 'primary' : 'default'}
                    onClick={() => setLanguage('vi')}
                  >
                    Tiếng Việt
                  </Button>
                </div>
              </div>

              {isGenerating && (
                <div className="flex items-center justify-center gap-3 p-6 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-dashed border-primary">
                  <Spinner size="sm" color="primary" />
                  <span className="text-sm font-medium text-primary">
                    DeepSeek is analyzing {attachedImage ? 'the visual screenshot and ' : ''}requirements to generate structured test cases...
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: MULTI-CASE PREVIEW & SELECT */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-success" />
                  <span className="font-bold text-base text-success">
                    Generated Test Suite ({generatedCases.length} Scenarios)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    startContent={
                      selectedIndices.length === generatedCases.length ? (
                        <CheckSquare size={14} />
                      ) : (
                        <Square size={14} />
                      )
                    }
                    onClick={handleSelectAll}
                  >
                    {selectedIndices.length === generatedCases.length
                      ? 'Deselect All'
                      : `Select All (${generatedCases.length})`}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Review the generated test cases below. Check or uncheck scenarios to select what you want to save into this folder.
              </div>

              {/* Accordion / List of Test Cases */}
              <div className="flex flex-col gap-3">
                {generatedCases.map((c, idx) => {
                  const isSelected = selectedIndices.includes(idx)
                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl transition-all ${
                        isSelected
                          ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                          : 'border-neutral-200 dark:border-neutral-700 opacity-60'
                      }`}
                    >
                      <div className="p-3 flex items-start gap-3">
                        <Checkbox
                          isSelected={isSelected}
                          onValueChange={() => handleToggleSelect(idx)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              #{idx + 1}. {c.title}
                            </span>
                            <div className="flex items-center gap-1">
                              <Chip size="sm" variant="flat" color="primary">
                                Priority: {getPriorityLabel(c.priority)}
                              </Chip>
                              <Chip size="sm" variant="flat" color="secondary">
                                Type: {getTypeLabel(c.type)}
                              </Chip>
                              <Chip size="sm" variant="flat" color="default">
                                Complexity: L{c.complexity}
                              </Chip>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                            {c.description}
                          </p>

                          {/* Collapsible Steps */}
                          <Accordion isCompact variant="light" className="px-0">
                            <AccordionItem
                              key="1"
                              aria-label="View Steps"
                              title={
                                <span className="text-xs font-semibold text-primary">
                                  View {c.steps.length} Steps & Expected Outcomes
                                </span>
                              }
                            >
                              <div className="flex flex-col gap-2 pt-1">
                                {c.preConditions && (
                                  <div className="text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded">
                                    <span className="font-semibold block text-gray-700 dark:text-gray-300">
                                      Preconditions:
                                    </span>
                                    <span className="whitespace-pre-line text-gray-600 dark:text-gray-400">
                                      {c.preConditions}
                                    </span>
                                  </div>
                                )}

                                <div className="flex flex-col gap-1 mt-1">
                                  {c.steps.map((s, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="p-2 bg-white dark:bg-neutral-900 rounded border border-neutral-100 dark:border-neutral-800 text-xs"
                                    >
                                      <div className="font-medium text-gray-800 dark:text-gray-200">
                                        Step {s.stepNo || sIdx + 1}: {s.step}
                                      </div>
                                      <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                                        👉 Expected: {s.result}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={handleClose}>
            Cancel
          </Button>

          {generatedCases.length === 0 ? (
            <Button
              color="primary"
              onClick={() => handleGenerate()}
              isLoading={isGenerating}
            >
              Generate with DeepSeek
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="bordered"
                color="secondary"
                startContent={<RotateCcw size={14} />}
                onClick={() => {
                  setGeneratedCases([])
                  setSelectedIndices([])
                }}
              >
                New Prompt
              </Button>
              <Button
                color="primary"
                onClick={handleSave}
                isLoading={isSaving}
                isDisabled={selectedIndices.length === 0}
                startContent={!isSaving && <Check size={16} />}
              >
                Save {selectedIndices.length} {selectedIndices.length === 1 ? 'Case' : 'Cases'} to Folder
              </Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
