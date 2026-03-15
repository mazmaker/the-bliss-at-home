/**
 * Image Upload Component
 * Handles file uploads to Supabase Storage with preview
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ImageUploadProps {
  onUploadComplete: (url: string) => void
  onUploadError: (error: string) => void
  currentImageUrl?: string
  disabled?: boolean
  bucketName?: string
  folder?: string
  maxSizeMB?: number
  accept?: string
  className?: string
}

export function ImageUpload({
  onUploadComplete,
  onUploadError,
  currentImageUrl,
  disabled = false,
  bucketName = 'service-images',
  folder = '',
  maxSizeMB = 5,
  accept = 'image/*',
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate unique filename
  const generateFileName = (originalName: string): string => {
    const timestamp = Date.now()
    const extension = originalName.split('.').pop()
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "")
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const folderPath = folder ? `${folder}/` : ''
    return `${folderPath}${cleanName}-${timestamp}.${extension}`
  }

  // Upload file to Supabase Storage
  const uploadFile = async (file: File): Promise<string> => {
    const fileName = generateFileName(file.name)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return publicUrl
  }

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'กรุณาเลือกไฟล์รูปภาพเท่านั้น'
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${maxSizeMB}MB)`
    }

    return null
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      onUploadError(validationError)
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Upload file
      const publicUrl = await uploadFile(file)

      // Clean up preview URL
      URL.revokeObjectURL(preview)

      // Update with real URL
      setPreviewUrl(publicUrl)
      onUploadComplete(publicUrl)

    } catch (error) {
      // Clean up preview on error
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(currentImageUrl || null)

      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      onUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [disabled, isUploading, currentImageUrl, bucketName, folder, maxSizeMB, onUploadComplete, onUploadError, previewUrl])

  // Handle drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  // Handle click to select file
  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  // Remove image
  const handleRemove = () => {
    if (disabled || isUploading) return

    setPreviewUrl(null)
    onUploadComplete('')
  }

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileSelect(file)
          }
        }}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload Area */}
      {!previewUrl && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${dragOver
              ? 'border-amber-400 bg-amber-50'
              : 'border-gray-300 hover:border-amber-400 hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isUploading ? 'pointer-events-none' : ''}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
              <p className="text-sm text-gray-600">กำลังอัพโหลด...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                คลิกเพื่อเลือกรูปภาพ
              </p>
              <p className="text-xs text-gray-500">
                หรือลากไฟล์มาวางที่นี่
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, WebP (สูงสุด {maxSizeMB}MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className="relative">
          <div className="relative group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-200"
            />

            {/* Upload status overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2" />
                  <p className="text-sm">กำลังอัพโหลด...</p>
                </div>
              </div>
            )}

            {/* Success overlay */}
            {!isUploading && previewUrl && !previewUrl.startsWith('blob:') && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Control buttons */}
            <div className="absolute top-2 left-2 flex space-x-2">
              {/* Remove button */}
              <button
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                title="ลบรูปภาพ"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Replace button */}
              <button
                onClick={handleClick}
                disabled={disabled || isUploading}
                className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                title="เปลี่ยนรูปภาพ"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}