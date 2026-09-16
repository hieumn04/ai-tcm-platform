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
  Code2,
  Copy,
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
  streamGenerateTestCasesWithAi,
  validateAndParseTestSuite,
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
  const [language, setLanguage] = useState<'en' | 'vi' | 'ja'>('en')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [streamError, setStreamError] = useState<string | null>(null)

  const [generatedCases, setGeneratedCases] = useState<GeneratedCaseData[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamViewportRef = useRef<HTMLDivElement>(null)
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const [showRawOutputModal, setShowRawOutputModal] = useState(false)

  const DRAFT_KEY = `ai_case_draft_${folderId}`

  // Load draft from localStorage when dialog opens
  useEffect(() => {
    if (!isOpen) return

    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.prompt && !prompt) {
          setPrompt(parsed.prompt)
        }
        if (parsed.language) {
          setLanguage(parsed.language)
        }
        if (parsed.mode) {
          setMode(parsed.mode)
        }
        if (parsed.streamText && !streamText) {
          setStreamText(parsed.streamText)
        }
        if (parsed.generatedCases && parsed.generatedCases.length > 0 && generatedCases.length === 0) {
          setGeneratedCases(parsed.generatedCases)
          setSelectedIndices(
            parsed.selectedIndices && parsed.selectedIndices.length > 0
              ? parsed.selectedIndices
              : parsed.generatedCases.map((_: any, idx: number) => idx)
          )
          setHasRestoredDraft(true)
        }
      }
    } catch (e) {
      console.warn('[AI Draft Restore Error]:', e)
    }
  }, [isOpen, folderId])

  // Automatically persist draft whenever prompt, streamText or generated cases change
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (generatedCases.length > 0 || prompt.trim() || streamText.trim()) {
      const draftData = {
        prompt,
        mode,
        language,
        streamText,
        generatedCases,
        selectedIndices,
        updatedAt: Date.now(),
      }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      } catch (e) {
        console.warn('[AI Draft Save Error]:', e)
      }
    }
  }, [prompt, mode, language, streamText, generatedCases, selectedIndices, folderId])

  // Smooth, throttled auto-scroll using requestAnimationFrame to prevent visual jittering
  useEffect(() => {
    if (streamViewportRef.current) {
      const el = streamViewportRef.current
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [streamText])

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
    setStreamText('')
    setStreamError(null)

    try {
      // Point 6: Stream tokens using HTTP SSE
      const rawOutput = await streamGenerateTestCasesWithAi(
        tokenContext.token.access_token,
        Number(folderId),
        textToUse.trim(),
        language,
        attachedImage,
        (chunk) => {
          setStreamText((prev) => prev + chunk)
        },
      )

      // Point 7: Strict schema validation on complete raw output
      const results = validateAndParseTestSuite(rawOutput)
      if (results && results.length > 0) {
        setGeneratedCases(results)
        setSelectedIndices(results.map((_, i) => i))
        toastContext.showToast(
          `DeepSeek generated ${results.length} test ${results.length > 1 ? 'cases' : 'case'} successfully!`,
          'success',
        )
      } else {
        toastContext.showToast('No test cases generated. Please refine your prompt.', 'warning')
      }
    } catch (error: any) {
      console.error('[AI Generation Stream Error]:', error)
      setStreamError(error.message || 'Failed to generate test cases')
      toastContext.showToast(`AI generation error: ${error.message}`, 'error', 6000)
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

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch (e) {}
    setPrompt('')
    setAttachedImage(null)
    setImageFileName('')
    setGeneratedCases([])
    setSelectedIndices([])
    setStreamText('')
    setStreamError(null)
    setHasRestoredDraft(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    toastContext.showToast('AI draft cleared!', 'dark')
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

      // Clear draft storage after saving successfully
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch (e) {}
      setPrompt('')
      setAttachedImage(null)
      setImageFileName('')
      setGeneratedCases([])
      setSelectedIndices([])
      setStreamText('')
      setStreamError(null)
      setHasRestoredDraft(false)

      onCaseCreated()
      onClose()
    } catch (error: any) {
      toastContext.showToast(`Save error: ${error.message}`, 'error', 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (isGenerating) {
      toastContext.showToast('AI generation in progress. Please wait for completion...', 'warning')
      return
    }
    // Safe closing: Keep prompt & generatedCases in state and localStorage so user never loses data
    setStreamError(null)
    onClose()
  }

  const getPriorityLabel = (val: number) => {
    return priorities[val]?.uid?.toUpperCase() || 'P2'
  }

  const getTypeLabel = (val: number) => {
    return testTypes[val]?.uid || 'functional'
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      isDismissable={false}
      isKeyboardDismissDisabled={isGenerating}
      hideCloseButton={isGenerating}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        header: 'border-b border-gray-200 dark:border-neutral-700 pb-3',
        footer: 'border-t border-gray-200 dark:border-neutral-700 pt-3',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between text-primary font-bold">
          <div className="flex items-center gap-2">
            <span>AI Test Case Generator (Powered by DeepSeek Vision)</span>
          </div>
          {(prompt || generatedCases.length > 0) && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              className="text-xs h-7 mr-6"
              onClick={handleClearDraft}
            >
              Clear Draft
            </Button>
          )}
        </ModalHeader>

        {hasRestoredDraft && generatedCases.length > 0 && (
          <div className="mx-6 mt-3 flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
            <div className="flex items-center gap-2">
              <span>
                <strong>Draft Restored:</strong> Restored {generatedCases.length} unsaved test scenarios from your previous session.
              </span>
            </div>
            <Button
              size="sm"
              variant="flat"
              color="warning"
              className="h-6 px-2.5 text-xs font-medium"
              onClick={handleClearDraft}
            >
              Start New Prompt
            </Button>
          </div>
        )}

        <ModalBody className="py-4">
          {generatedCases.length === 0 ? (
            /* STEP 1: PROMPT INPUT, IMAGE ATTACHMENT & CONFIGURATION */
            <div className="flex flex-col gap-4">
              {!isGenerating && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Enter business requirements, or <strong>attach a UI screenshot / wireframe</strong>. DeepSeek AI will analyze visual components and architect a structured Test Suite.
                </div>
              )}

              {/* Mode Selection - hidden during generation to focus on live stream */}
              {!isGenerating && (
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
                      Smart Test Suite (Dynamic Scenarios & Deep Analysis) — Recommended
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
              )}

              <Textarea
                label="Feature Description / User Story"
                placeholder="e.g., Verify real-time chat concurrency, or leave empty if providing a UI screenshot below..."
                value={prompt}
                onValueChange={setPrompt}
                minRows={isGenerating ? 2 : 3}
                maxRows={isGenerating ? 2 : 5}
                variant="bordered"
                isDisabled={isGenerating}
              />

              {/* AI Live Streaming Terminal / Console (Clean Light Theme with Crisp Dark Text) */}
              {(isGenerating || streamText) && (
                <div
                  ref={terminalContainerRef}
                  className="flex flex-col gap-2.5 p-4 bg-slate-50 text-slate-800 rounded-xl border-2 border-primary/30 shadow-md overflow-hidden font-mono text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block shadow-sm"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm"></span>
                      </div>
                      <span className="text-[12px] font-semibold text-slate-800 ml-1.5 font-sans">
                        DeepSeek Live Token Stream (HTTP SSE)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-sans">
                      {isGenerating ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full font-semibold">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                          </span>
                          <span>Streaming tokens in real-time...</span>
                        </div>
                      ) : streamError ? (
                        <span className="text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full text-[11px] font-medium">Validation Error</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">✓ Stream Complete</span>
                          {streamText && (
                            <Button
                              size="sm"
                              variant="flat"
                              className="h-6 px-2 text-[11px] font-medium bg-slate-200 hover:bg-slate-300 text-slate-800"
                              startContent={<Code2 size={12} />}
                              onClick={() => setShowRawOutputModal(true)}
                            >
                              View Full Output
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {streamError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center justify-between font-sans">
                      <span className="font-medium">{streamError}</span>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onClick={() => handleGenerate()}
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  <div
                    ref={streamViewportRef}
                    className="min-h-[380px] max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-900 bg-white border border-slate-200 rounded-lg p-4 shadow-inner font-mono text-[13px] tracking-normal font-medium select-text scroll-smooth transition-all"
                  >
                    {streamText ? (
                      <>
                        {streamText}
                        {isGenerating && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-middle shadow-sm"></span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500 italic flex items-center gap-2 font-sans">
                        <Spinner size="sm" color="primary" />
                        Connecting to DeepSeek SSE stream & generating test suite...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Options hidden during generation to prevent clutter and keep stream front and center */}
              {!isGenerating && (
                <>
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
                        variant={language === 'ja' ? 'solid' : 'bordered'}
                        color={language === 'ja' ? 'primary' : 'default'}
                        onClick={() => setLanguage('ja')}
                      >
                        日本語 (Japanese)
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
                </>
              )}
            </div>
          ) : (
            /* STEP 2: MULTI-CASE PREVIEW & SELECT */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Generated Test Suite ({generatedCases.length} Scenarios)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="text-xs font-semibold bg-primary-50 text-primary hover:bg-primary-100"
                    startContent={<Code2 size={14} />}
                    onClick={() => setShowRawOutputModal(true)}
                  >
                    View Full DeepSeek Output
                  </Button>
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

                                <div className="space-y-2 mt-2">
                                  {c.steps.map((s: any, sIdx: number) => (
                                    <div
                                      key={sIdx}
                                      className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs flex flex-col gap-1"
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="font-semibold text-primary min-w-[50px]">
                                          Step {s.stepNo || sIdx + 1}:
                                        </span>
                                        <span className="text-gray-800 dark:text-gray-200 flex-1">
                                          {s.step || s.action}
                                        </span>
                                      </div>
                                      {s.data && (
                                        <div className="flex items-start gap-2 pl-[58px]">
                                          <span className="text-gray-500 font-medium">Data:</span>
                                          <span className="font-mono bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-[11px] text-gray-700 dark:text-gray-300">
                                            {s.data}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-start gap-2 pl-[58px]">
                                        <span className="text-success-600 dark:text-success-400 font-medium">
                                          Expected:
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-300">
                                          {s.result || s.expected}
                                        </span>
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

        <ModalFooter className="flex items-center justify-between">
          <Button
            variant="light"
            onClick={handleClose}
            isDisabled={isGenerating || isSaving}
          >
            {generatedCases.length === 0 ? 'Cancel' : 'Back'}
          </Button>

          {generatedCases.length === 0 ? (
            isGenerating ? (
              <Button
                color="success"
                variant="flat"
                className="font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40"
                isDisabled={true}
                startContent={
                  <span className="relative flex h-2.5 w-2.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                }
              >
                Streaming DeepSeek Tokens...
              </Button>
            ) : (
              <Button
                color="primary"
                onClick={() => handleGenerate()}
                className="font-medium"
              >
                Generate with DeepSeek
              </Button>
            )
          ) : (
            <div className="flex items-center justify-between w-full ml-4">
              <Button
                size="sm"
                variant="flat"
                color="default"
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
                startContent={<Code2 size={14} />}
                onClick={() => setShowRawOutputModal(true)}
              >
                DeepSeek Raw Response
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="bordered"
                  color="secondary"
                  startContent={<RotateCcw size={14} />}
                  onClick={handleClearDraft}
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
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* Sub-modal: Full DeepSeek Raw Output Viewer */}
    <Modal
      isOpen={showRawOutputModal}
      onOpenChange={(open) => setShowRawOutputModal(open)}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: 'bg-white dark:bg-neutral-900',
        header: 'border-b border-slate-200 dark:border-neutral-700 pb-3',
        footer: 'border-t border-slate-200 dark:border-neutral-700 pt-3',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between text-slate-900 dark:text-white font-bold">
          <div className="flex items-center gap-2">
            <Code2 className="text-primary" size={20} />
            <span>Full DeepSeek AI Raw Response</span>
          </div>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="mr-6 text-xs font-semibold"
            startContent={<Copy size={14} />}
            onClick={() => {
              const textToCopy = streamText || (generatedCases.length > 0 ? JSON.stringify(generatedCases, null, 2) : '')
              if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                toastContext.showToast('Copied full DeepSeek output to clipboard!', 'success')
              }
            }}
          >
            Copy Raw Output
          </Button>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Below is the complete, raw JSON / text response received directly from DeepSeek API:
          </div>
          <pre className="bg-slate-50 text-slate-900 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed border border-slate-300 shadow-sm select-text">
            {streamText || (generatedCases.length > 0 ? JSON.stringify(generatedCases, null, 2) : 'No raw output available.')}
          </pre>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" variant="light" onClick={() => setShowRawOutputModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  )
}
