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
  sourceRun: RunType | null
  onCancel: () => void
  onSubmit: (name: string, description: string) => void
  messages: RunsMessages
}

export default function DuplicateRunDialog({
  isOpen,
  sourceRun,
  onCancel,
  onSubmit,
  messages,
}: Props) {
  const [runName, setRunName] = useState({
    text: sourceRun ? `${sourceRun.name} (Copy)` : '',
    isInvalid: false,
    errorMessage: '',
  })

  const [runDescription, setRunDescription] = useState({
    text: sourceRun ? sourceRun.description : '',
    isInvalid: false,
    errorMessage: '',
  })

  useEffect(() => {
    if (sourceRun) {
      setRunName({
        ...runName,
        text: `${sourceRun.name} (Copy)`,
        isInvalid: false,
        errorMessage: '',
      })

      setRunDescription({
        ...runDescription,
        text: sourceRun.description || '',
        isInvalid: false,
        errorMessage: '',
      })
    } else {
      setRunName({
        text: '',
        isInvalid: false,
        errorMessage: '',
      })

      setRunDescription({
        text: '',
        isInvalid: false,
        errorMessage: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceRun])

  const validate = () => {
    if (!runName.text) {
      setRunName({
        text: '',
        isInvalid: true,
        errorMessage: messages.pleaseEnter,
      })
      return
    }

    onSubmit(runName.text, runDescription.text)
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
          {messages.duplicateRun}
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
            {messages.duplicate}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
