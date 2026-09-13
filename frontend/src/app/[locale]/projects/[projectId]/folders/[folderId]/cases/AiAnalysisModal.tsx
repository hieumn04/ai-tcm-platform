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
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, FileText, RefreshCw, Sparkles, Languages } from 'lucide-react'
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
}: Props) {
  const [activeLang, setActiveLang] = useState<'en' | 'vi'>('vi')

  useEffect(() => {
    // If only English exists, default to 'en', otherwise default to 'vi'
    if (analysis && analysis.vi) {
      setActiveLang('vi')
    } else {
      setActiveLang('en')
    }
  }, [analysis])

  if (!analysis) return null

  const hasBilingual = Boolean(analysis.vi && analysis.en)
  const currentContent = (activeLang === 'vi' && analysis.vi) ? analysis.vi : (analysis.en || analysis)

  const isVi = activeLang === 'vi'

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Chip color="success" variant="flat" startContent={<CheckCircle2 size={14} />}>
            {isVi ? 'Passed (Đạt / Khả thi cao)' : 'Passed (High Feasibility)'}
          </Chip>
        )
      case 'failed':
        return (
          <Chip color="danger" variant="flat" startContent={<XCircle size={14} />}>
            {isVi ? 'Failed (Không đạt / Rủi ro cao)' : 'Failed (High Risk / Flaws Detected)'}
          </Chip>
        )
      default:
        return (
          <Chip color="warning" variant="flat" startContent={<AlertTriangle size={14} />}>
            {isVi ? 'Pending (Cần bổ sung bằng chứng)' : 'Pending (Needs Clarification)'}
          </Chip>
        )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
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
            <Sparkles className="text-primary" size={20} />
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
                  🇬🇧 English
                </button>
              </div>
            )}

            {analysis.analyzedAt && (
              <span className="text-xs text-default-400 font-normal">
                {new Date(analysis.analyzedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </ModalHeader>

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

          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <span className="text-sm font-semibold">{isVi ? 'Đánh giá của AI:' : 'AI Assessment:'}</span>
            {getStatusChip(analysis.suggestedStatus)}
            <span className="text-sm text-gray-700 dark:text-gray-300 ml-2">
              {currentContent.assessment}
            </span>
          </div>

          {/* Synthetic Test Data */}
          {Array.isArray(currentContent.testData) && currentContent.testData.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-2">
                <FileText size={16} className="text-primary" />
                <span>{isVi ? 'Bộ dữ liệu Test giả lập do AI sinh (Synthetic Data):' : 'Synthetic Test Data Generated by AI:'}</span>
              </div>
              <div className="flex flex-col gap-2">
                {currentContent.testData.map((item, idx) => (
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
          {Array.isArray(currentContent.edgeCases) && currentContent.edgeCases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-bold text-sm mb-2 text-warning">
                <ShieldAlert size={16} />
                <span>{isVi ? 'Trường hợp biên & Lỗ hổng tiềm ẩn:' : 'Edge Cases & Potential Vulnerabilities:'}</span>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 flex flex-col gap-1 pl-2">
                {currentContent.edgeCases.map((edge, idx) => (
                  <li key={idx}>{edge}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {currentContent.recommendations && (
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
            <Chip color="success" variant="flat" size="sm" startContent={<CheckCircle2 size={12} />}>
              {isVi ? 'Đã lưu vào Database' : 'Saved to Database'}
            </Chip>
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
            {onApplyStatus && analysis.suggestedStatus && (
              <Button
                size="sm"
                color={
                  analysis.suggestedStatus === 'passed'
                    ? 'success'
                    : analysis.suggestedStatus === 'failed'
                      ? 'danger'
                      : 'warning'
                }
                variant="solid"
                onClick={() => onApplyStatus(analysis.suggestedStatus)}
                startContent={<CheckCircle2 size={14} />}
              >
                {isVi
                  ? `Áp dụng trạng thái (${analysis.suggestedStatus.toUpperCase()})`
                  : `Apply Status (${analysis.suggestedStatus.toUpperCase()})`}
              </Button>
            )}
            <Button size="sm" variant="light" onClick={onClose}>
              {isVi ? 'Đóng' : 'Close'}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
