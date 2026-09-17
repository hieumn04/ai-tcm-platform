'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Divider,
} from '@nextui-org/react'
import { AlertTriangle, ShieldAlert, FileText, RefreshCw, Languages, Code2, Copy } from 'lucide-react'
import { AiAnalysisData } from '@/utils/aiControl'

type Props = {
  isOpen: boolean
  onClose: () => void
  testCaseTitle: string
  analysis: AiAnalysisData | null
  evidenceImage?: string | null
  onApplyStatus?: (status: 'passed' | 'pending' | 'failed') => void
  onReanalyze?: () => void
  isReanalyzing?: boolean
  isAnalyzing?: boolean
}

export default function AiAnalysisModal({
  isOpen,
  onClose,
  testCaseTitle,
  analysis,
  evidenceImage,
  onApplyStatus,
  onReanalyze,
  isReanalyzing,
  isAnalyzing,
}: Props) {
  const [activeLang, setActiveLang] = useState<'en' | 'vi'>('en')
  const [showRawOutput, setShowRawOutput] = useState(false)

  useEffect(() => {
    if (analysis && analysis.vi && !analysis.en) {
      setActiveLang('vi')
    } else {
      setActiveLang('en')
    }
  }, [analysis])

  const isLoadingState = Boolean(isAnalyzing || isReanalyzing || (!analysis && isOpen))

  if (!analysis && !isLoadingState) return null

  const hasBilingual = Boolean(analysis?.vi && analysis?.en)
  const currentContent: any = analysis
    ? (activeLang === 'vi' && analysis.vi ? analysis.vi : (analysis.en || analysis))
    : {}

  const isVi = activeLang === 'vi'

  return (
    <>
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      isDismissable={false}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        header: 'border-b border-gray-200 dark:border-neutral-700 pb-3',
        footer: 'border-t border-gray-200 dark:border-neutral-700 pt-3',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between text-primary font-bold pr-8 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span>DeepSeek AI - Execution & Risk Analysis</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language switcher button (0 tokens, instant toggle) */}
            {hasBilingual && (
              <div className="flex items-center bg-gray-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-gray-200 dark:border-neutral-700">
                <button
                  type="button"
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeLang === 'vi'
                      ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  onClick={() => setActiveLang('vi')}
                >
                  🇻🇳 Tiếng Việt
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeLang === 'en'
                      ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  onClick={() => setActiveLang('en')}
                >
                  🇺🇸 English
                </button>
              </div>
            )}

            {analysis?.analyzedAt && (
              <span className="text-xs text-default-400 font-normal">
                {new Date(analysis.analyzedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </ModalHeader>

        {isLoadingState ? (
          <ModalBody className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              DeepSeek AI is analyzing test case...
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Evaluating execution feasibility, edge cases, and calculating risk assessment. Please wait a moment...
            </p>
          </ModalBody>
        ) : (
          <>
            <ModalBody className="py-4 flex flex-col gap-4">
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase block">
              {isVi ? 'Phân tích Test Case:' : 'Analyzing Test Case:'}
            </span>
            <div className="font-bold text-base text-gray-800 dark:text-gray-200 mt-1">
              {testCaseTitle}
            </div>
          </div>

          {evidenceImage && (
            <div className="flex flex-col gap-1 p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isVi ? 'Ảnh chụp màn hình thực thi đính kèm:' : 'Attached Execution Screenshot:'}
              </span>
              <img
                src={evidenceImage}
                alt="Evidence"
                className="max-h-48 object-contain rounded border border-neutral-200 dark:border-neutral-700"
              />
            </div>
          )}

          <div className="p-3.5 bg-slate-50 dark:bg-neutral-800/60 rounded-xl border border-slate-200 dark:border-neutral-700">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {isVi ? 'Đánh giá kỹ thuật của AI:' : 'AI Technical Evaluation:'}
            </span>
            <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {currentContent?.assessment || 'No assessment provided'}
            </div>
          </div>

          {/* Synthetic Test Data */}
          {Array.isArray(currentContent?.testData) && currentContent.testData.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-2">
                <FileText size={16} className="text-primary" />
                <span>{isVi ? 'Bộ dữ liệu Test giả lập do AI sinh (Synthetic Data):' : 'Synthetic Test Data Generated by AI:'}</span>
              </div>
              <div className="flex flex-col gap-2">
                {currentContent.testData.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 flex flex-col gap-1"
                  >
                    <div className="font-semibold text-primary">
                      {idx + 1}. {isVi ? 'Kịch bản' : 'Scenario'}: {item.scenario}
                    </div>
                    <div className="text-gray-800 dark:text-gray-200 font-mono text-xs bg-white dark:bg-neutral-900 p-2 rounded border border-gray-100 dark:border-neutral-800">
                      <span className="font-sans font-semibold text-gray-500 mr-1">
                        {isVi ? 'Dữ liệu đầu vào:' : 'Input Data:'}
                      </span>
                      {item.inputs}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                      <span className="font-semibold text-gray-500 mr-1">
                        {isVi ? 'Kết quả mong đợi:' : 'Expected Outcome:'}
                      </span>
                      {item.expectedOutcome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Divider />

          {/* Edge Cases */}
          {Array.isArray(currentContent?.edgeCases) && currentContent.edgeCases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-2 text-warning">
                <ShieldAlert size={16} />
                <span>{isVi ? 'Trường hợp biên & Lỗ hổng tiềm ẩn:' : 'Edge Cases & Potential Vulnerabilities:'}</span>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 flex flex-col gap-1 pl-2">
                {currentContent.edgeCases.map((edge: string, idx: number) => (
                  <li key={idx}>{edge}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {currentContent?.recommendations && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900 text-sm">
              <span className="font-bold text-success block mb-1">
                {isVi ? '💡 Khuyến nghị cho QA & Lập trình viên:' : '💡 Recommendations for QA & Developers:'}
              </span>
              <div className="text-gray-700 dark:text-gray-300">
                {currentContent.recommendations}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              color="default"
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
              startContent={<Code2 size={13} />}
              onClick={() => setShowRawOutput(true)}
            >
              {isVi ? 'Xem Raw DeepSeek' : 'Raw DeepSeek Response'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {onReanalyze && (
              <Button
                size="sm"
                variant="flat"
                onClick={onReanalyze}
                isLoading={isReanalyzing}
                startContent={<RefreshCw size={14} />}
              >
                {isVi ? 'Phân tích lại' : 'Re-Analyze'}
              </Button>
            )}
            <Button size="sm" variant="light" onClick={onClose}>
              {isVi ? 'Đóng' : 'Close'}
            </Button>
          </div>
        </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    {/* Sub-modal: Raw DeepSeek AI Analysis JSON Viewer */}
    <Modal
      isOpen={showRawOutput}
      onOpenChange={(open) => setShowRawOutput(open)}
      size="2xl"
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
            <span>Raw DeepSeek AI Response (JSON)</span>
          </div>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="mr-6 text-xs font-semibold"
            startContent={<Copy size={14} />}
            onClick={() => {
              if (analysis) {
                navigator.clipboard.writeText(JSON.stringify(analysis, null, 2))
              }
            }}
          >
            Copy JSON
          </Button>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Detailed raw JSON returned by DeepSeek API for this test case analysis:
          </div>
          <pre className="bg-slate-50 text-slate-900 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed border border-slate-300 shadow-sm select-text">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" variant="light" onClick={() => setShowRawOutput(false)}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  )
}
