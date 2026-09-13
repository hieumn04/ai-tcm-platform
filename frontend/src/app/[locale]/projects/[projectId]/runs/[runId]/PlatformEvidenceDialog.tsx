import { useState, useEffect, useContext, useRef, useMemo } from 'react'
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Textarea,
  Image,
  Card,
  CardBody,
  Spinner,
} from '@nextui-org/react'
import { PlatformEvidenceType } from '@/types/case'
import { TokenContext } from '@/utils/TokenProvider'
import { ToastContext } from '@/utils/ToastProvider'
import { uploadPlatformEvidence } from '@/utils/platformEvidenceControl'
import { Camera, X, Upload, FileImage } from 'lucide-react'

type Props = {
  isOpen: boolean
  caseId: number
  platform: string
  onClose: () => void
  onSaved?: (evidence: PlatformEvidenceType) => void
  initialEvidence?: PlatformEvidenceType
}

const MAX_IMAGES = 5
const DELETE_BUTTON_CLASS =
  'absolute w-7 h-7 z-30 rounded-full flex items-center justify-center p-0 min-w-0 shadow-lg bg-red-500 hover:bg-red-600 text-white border-2 border-white'
const GRID_COLS_CLASS = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'

const normalizePlatformForBackend = (platform: string): string => {
  const platformMap: { [key: string]: string } = {
    web: 'Web',
    wap: 'Wap',
    zma: 'Zma',
    ios: 'iOS',
    android: 'Android',
    api: 'API',
  }
  return platformMap[platform.toLowerCase()] || platform
}

export default function PlatformEvidenceDialog({
  isOpen,
  caseId,
  platform,
  onClose,
  onSaved,
  initialEvidence,
}: Props) {
  const tokenContext = useContext(TokenContext)
  const toastContext = useContext(ToastContext)
  const [platformEvidence, setPlatformEvidence] =
    useState<PlatformEvidenceType | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [deletedImageIndices, setDeletedImageIndices] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [evidenceDescription, setEvidenceDescription] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setPlatformEvidence(null)
      setSelectedFiles([])
      setDeletedImageIndices([])
      setEvidenceDescription('')
      setIsLoading(false)
      setIsSaving(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!caseId || caseId <= 0 || !platform || !isOpen) return

    setIsLoading(true)
    setSelectedFiles([])

    const normalizedEvidence = initialEvidence
      ? {
          id: initialEvidence.id,
          caseId,
          platform: platform as any,
          evidenceImageUrls: initialEvidence.evidenceImageUrls || [],
          evidenceDescription: initialEvidence.evidenceDescription || '',
        }
      : {
          id: 0,
          caseId,
          platform: platform as any,
          evidenceImageUrls: [],
          evidenceDescription: '',
        }

    setPlatformEvidence(normalizedEvidence)
    setEvidenceDescription(normalizedEvidence.evidenceDescription)
    setIsLoading(false)
  }, [caseId, platform, isOpen, initialEvidence])

  const currentImagesCount =
    (platformEvidence?.evidenceImageUrls?.length || 0) -
    deletedImageIndices.length
  const totalCurrentImages = currentImagesCount + selectedFiles.length

  const hasChanges = () => {
    const hasNewImages = selectedFiles.length > 0
    const hasDeletions = deletedImageIndices.length > 0
    const hasDescriptionChanges =
      evidenceDescription !== (platformEvidence?.evidenceDescription || '')
    const hasNonEmptyDescription = evidenceDescription.trim().length > 0

    return (
      hasDeletions ||
      hasNewImages ||
      (hasDescriptionChanges &&
        (hasNonEmptyDescription || platformEvidence?.evidenceDescription))
    )
  }

  const validateFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter((file) =>
      file.type.startsWith('image/'),
    )

    if (imageFiles.length !== fileArray.length) {
      toastContext.showToast('Only image files are allowed', 'error')
      return []
    }

    const remainingSlots =
      MAX_IMAGES - currentImagesCount - selectedFiles.length
    if (imageFiles.length > remainingSlots) {
      toastContext.showToast(
        `Cannot upload ${imageFiles.length} images. Maximum ${MAX_IMAGES} images allowed. Current: ${currentImagesCount}, Selected: ${selectedFiles.length}, Available slots: ${remainingSlots}`,
        'error',
      )
      return []
    }

    return imageFiles
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((prev) => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((prev) => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (!files?.length) return

    const validFiles = validateFiles(files)
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    const validFiles = validateFiles(files)
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
    event.target.value = ''
  }

  const handleAddEvidence = () => {
    if (totalCurrentImages >= MAX_IMAGES) {
      toastContext.showToast(`Maximum ${MAX_IMAGES} images allowed`, 'error')
      return
    }
    fileInputRef.current?.click()
  }

  const handleStageImageForDeletion = (index: number) => {
    setDeletedImageIndices((prev) => [...prev, index])
  }

  const handleSaveEvidence = async () => {
    if (!tokenContext.isSignedIn() || isSaving) return

    const shouldUploadImages = selectedFiles.length > 0
    const shouldUpdateDescription =
      evidenceDescription !== platformEvidence?.evidenceDescription
    const shouldDeleteImages = deletedImageIndices.length > 0

    if (!shouldUploadImages && !shouldUpdateDescription && !shouldDeleteImages)
      return

    setIsSaving(true)

    try {
      const response = await uploadPlatformEvidence(
        tokenContext.token.access_token,
        caseId,
        normalizePlatformForBackend(platform),
        shouldUploadImages ? selectedFiles : null,
        shouldUpdateDescription ? evidenceDescription : null,
        shouldDeleteImages ? deletedImageIndices : null,
      )

      setPlatformEvidence(response.data)
      setSelectedFiles([])
      setDeletedImageIndices([])

      if (onSaved && response.data) {
        await onSaved(response.data)
      }

      toastContext.showToast(
        response.message || 'Evidence updated successfully',
        'success',
      )
      onClose()
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update evidence'
      toastContext.showToast(errorMessage, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const openImagePreview = (imageUrl: string) => {
    const newWindow = window.open('', '_blank')
    if (!newWindow) return

    newWindow.document.write(`
      <html>
        <head>
          <title>Evidence Image Preview</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { height: 100%; overflow: hidden; background: #000; }
            body { display: flex; justify-content: center; align-items: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; background: #000; }
            img { max-width: 95vw; max-height: 95vh; width: auto; height: auto; object-fit: contain; cursor: zoom-out; border-radius: 8px; box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1); }
            .close-button { position: absolute; top: 20px; right: 20px; background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 50%; width: 48px; height: 48px; cursor: pointer; font-size: 24px; z-index: 10; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); transition: all 0.2s ease; }
            .close-button:hover { background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.5); transform: scale(1.05); }
          </style>
        </head>
        <body>
          <div class="container">
            <button class="close-button" onclick="window.close()" title="Close">&times;</button>
            <img src="${imageUrl}" alt="Evidence Image" onclick="window.close()" />
          </div>
        </body>
      </html>
    `)
  }

  const renderDeleteButton = (onClick: () => void, position: string) => (
    <Button
      isIconOnly
      size="sm"
      color="danger"
      variant="solid"
      className={`${DELETE_BUTTON_CLASS} ${position} opacity-95 group-hover:opacity-100 transition-all duration-200 hover:scale-110`}
      onClick={onClick}
      title="Delete image"
    >
      <X size={14} />
    </Button>
  )

  const renderImageCard = (
    imageUrl: string,
    alt: string,
    onDelete: () => void,
    fileName?: string,
  ) => (
    <Card className="relative group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300">
      {renderDeleteButton(onDelete, 'top-2 right-2')}
      <CardBody className="p-4">
        <div className="relative overflow-hidden rounded-lg bg-gray-50">
          <Image
            src={imageUrl}
            alt={alt}
            className="w-full h-36 md:h-44 object-cover cursor-pointer rounded-lg hover:scale-110 transition-transform duration-300 shadow-sm"
            onClick={() => openImagePreview(imageUrl)}
          />
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-lg"></div>
        </div>
        {fileName && (
          <p className="text-xs text-center mt-3 truncate text-gray-600 font-medium">
            {fileName}
          </p>
        )}
      </CardBody>
    </Card>
  )

  const renderDropZone = () => {
    const canAddMore = totalCurrentImages < MAX_IMAGES

    return (
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${
            isDragOver && canAddMore
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : canAddMore
                ? 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          }
        `}
        onClick={canAddMore ? handleAddEvidence : undefined}
      >
        {isDragOver && canAddMore ? (
          <div className="flex flex-col items-center gap-3 text-blue-600">
            <Upload size={48} className="animate-bounce" />
            <p className="text-lg font-semibold">Drop images here!</p>
            <p className="text-sm text-blue-500">
              {MAX_IMAGES - totalCurrentImages} slot(s) available
            </p>
          </div>
        ) : canAddMore ? (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <div className="flex items-center justify-center gap-2">
              <FileImage size={32} />
              <Camera size={32} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">
                Drag & drop images here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Support for multiple image files ({totalCurrentImages}/
                {MAX_IMAGES} used)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <FileImage size={32} />
            <p className="text-lg font-semibold">Maximum images reached</p>
            <p className="text-sm">
              ({MAX_IMAGES}/{MAX_IMAGES} images)
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      size="3xl"
      scrollBehavior="outside"
      onOpenChange={onClose}
      classNames={{
        header: 'border-b border-gray-200',
        closeButton:
          'top-4 right-4 z-50 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 break-words max-w-full overflow-hidden whitespace-pre-line">
          Evidence for {platform} Platform
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 mb-5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
              />

              {renderDropZone()}

              {platformEvidence?.evidenceImageUrls &&
                currentImagesCount > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">
                        Current Images ({currentImagesCount})
                      </p>
                      <span className="text-xs text-gray-500">
                        Click to preview • Delete with ✕
                      </span>
                    </div>
                    <div className={GRID_COLS_CLASS}>
                      {platformEvidence.evidenceImageUrls.map(
                        (imageUrl: string, index: number) =>
                          !deletedImageIndices.includes(index) &&
                          renderImageCard(
                            imageUrl,
                            `Evidence ${index + 1}`,
                            () => handleStageImageForDeletion(index),
                          ),
                      )}
                    </div>
                  </div>
                )}

              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-blue-700">
                      New Images to Upload ({selectedFiles.length})
                    </p>
                  </div>
                  <div className={GRID_COLS_CLASS}>
                    {selectedFiles.map((file, index) =>
                      renderImageCard(
                        URL.createObjectURL(file),
                        `New Evidence ${index + 1}`,
                        () =>
                          setSelectedFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          ),
                        file.name,
                      ),
                    )}
                  </div>
                </div>
              )}

              <Textarea
                label="Evidence Description"
                placeholder="Enter description for this evidence..."
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                classNames={{
                  base: 'w-full',
                  inputWrapper: 'min-h-[100px]',
                }}
              />

              <div className="flex justify-center gap-4">
                <Button
                  color="danger"
                  variant="light"
                  onClick={onClose}
                  size="md"
                  className="px-8"
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={handleSaveEvidence}
                  isLoading={isSaving}
                  isDisabled={!hasChanges()}
                  size="md"
                  className="px-8"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
