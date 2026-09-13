'use client'

import React, { useState, useEffect } from 'react'
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@nextui-org/react'
import { FileText, X } from 'lucide-react'
import { fetchCaseLog } from '@/utils/logControl'

type Props = {
  onClose: () => void
  jwt: string
  caseId: number
}

export default function CaseLogDialog({ jwt, caseId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<
    { email: string; time: string; action: string }[]
  >([])

  useEffect(() => {
    const loadLogs = async () => {
      if (isOpen) {
        try {
          const data = await fetchCaseLog(jwt, caseId)
          if (data) {
            setLogs(
              data.map((log: any) => ({
                email: log.author,
                time: new Date(log.time).toLocaleString(),
                action: formatChanges(log.content),
              })),
            )
          }
        } catch (error) {
          console.error('Error fetching case logs:', error)
        }
      }
    }

    loadLogs()
  }, [isOpen, jwt, caseId])

  const formatChanges = (changes: any): string => {
    if (typeof changes === 'string') {
      return changes.replace(/\n/g, '<br />')
    }

    if (typeof changes === 'object' && changes !== null) {
      const changeItems = Object.entries(changes).map(
        ([field, change]: [string, any]) => {
          if (
            change &&
            typeof change === 'object' &&
            'old' in change &&
            'new' in change
          ) {
            const oldValue = change.old || '(empty)'
            const newValue = change.new || '(empty)'
            return `<strong>${field}:</strong> ${oldValue} → ${newValue}`
          }
          return `<strong>${field}:</strong> ${change}`
        },
      )

      return changeItems.join('<br />')
    }

    return String(changes)
  }

  return (
    <>
      <div className="inline-block me-4">
        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          color="primary"
          startContent={<FileText size={16} />}
        >
          Change Log
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: 'max-h-[80vh]',
          body: 'p-0',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Change Log</h2>
          </ModalHeader>

          <ModalBody className="p-0">
            <div className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No change logs found
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">
                        {log.email}
                      </span>
                      <span className="text-sm text-gray-500">{log.time}</span>
                    </div>
                    <div
                      className="text-gray-700 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: log.action }}
                    />
                  </div>
                ))
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
