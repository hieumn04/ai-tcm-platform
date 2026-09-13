'use client'
import React, { useState, useEffect } from 'react'
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@nextui-org/react'
import { RunType, RunsMessages } from '@/types/run'

type Props = {
  isOpen: boolean
  editingRun: RunType | null
  onCancel: () => void
  onSubmit: (name: string, description: string) => void
  messages: RunsMessages
}

export default function RunDialog({
  isOpen,
  editingRun,
  onCancel,
  onSubmit,
  messages,
}: Props) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g

  const [runName, setRunName] = useState({
    text: editingRun ? editingRun.name : '',
    isInvalid: false,
    errorMessage: '',
  })

  const [runDescription, setRunDescription] = useState({
    text: editingRun ? editingRun.description : '',
    isInvalid: false,
    errorMessage: '',
  })

  useEffect(() => {
    if (editingRun) {
      setRunName({
        ...runName,
        text: editingRun.name,
      })

      setRunDescription({
        ...runDescription,
        text: editingRun.description ? editingRun.description : '',
      })
    } else {
      setRunName({
        ...runName,
        text: '',
      })

      setRunDescription({
        ...runDescription,
        text: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRun])

  const clear = () => {
    setRunName({
      isInvalid: false,
      text: '',
      errorMessage: '',
    })
    setRunDescription({
      isInvalid: false,
      text: '',
      errorMessage: '',
    })
  }

  const validate = () => {
    let hasError = false

    if (!runName.text) {
      setRunName({
        text: '',
        isInvalid: true,
        errorMessage: messages.pleaseEnter,
      })
      hasError = true
    }

    if (!urlRegex.test(runDescription.text)) {
      setRunDescription((prev) => ({
        ...prev,
        isInvalid: true,
        errorMessage: 'Please enter a valid link in the description.',
      }))
      hasError = true
    }

    if (hasError) return

    onSubmit(runName.text, runDescription.text)
    clear()
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={() => {
        onCancel()
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {messages.run}
        </ModalHeader>
        <ModalBody>
          <Input
            type="text"
            label={messages.runName}
            value={runName.text}
            isInvalid={runName.isInvalid}
            errorMessage={runName.errorMessage}
            onChange={(e) => {
              setRunName({
                ...runName,
                text: e.target.value,
                isInvalid: false,
                errorMessage: '',
              })
            }}
          />
          <Textarea
            label={messages.runDescription}
            value={runDescription.text}
            isInvalid={runDescription.isInvalid}
            errorMessage={runDescription.errorMessage}
            placeholder="Please enter a valid link (e.g., https://example.com)"
            onChange={(e) => {
              setRunDescription({
                ...runDescription,
                text: e.target.value,
                isInvalid: false,
                errorMessage: '',
              })
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={onCancel}>
            {messages.close}
          </Button>
          <Button color="primary" onClick={validate}>
            {editingRun && editingRun.createdAt
              ? messages.update
              : messages.create}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
