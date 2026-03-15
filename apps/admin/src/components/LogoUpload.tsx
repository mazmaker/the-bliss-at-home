/**
 * Logo Upload Component
 * Specialized for logo uploads with 1:1 aspect ratio and file info display
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Check, File } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LogoUploadProps {
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

export function LogoUpload({
  onUploadComplete,
  onUploadError,
  currentImageUrl,
  disabled = false,
  bucketName = 'logos',
  folder = '',
  maxSizeMB = 2,
  accept = 'image/*',
  className = ''
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [dragOver, setDragOver] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

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

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return publicUrl
  }

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'กรุณาเลือกไฟล์รูปภาพเท่านั้น'
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${maxSizeMB}MB)`
    }

    return null
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return

    const validationError = validateFile(file)
    if (validationError) {
      onUploadError(validationError)
      return
    }

    setIsUploading(true)
    setFileInfo({ name: file.name, size: file.size })

    try {
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      const publicUrl = await uploadFile(file)

      URL.revokeObjectURL(preview)
      setPreviewUrl(publicUrl)
      onUploadComplete(publicUrl)

    } catch (error) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(currentImageUrl || null)
      setFileInfo(null)

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

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = () => {
    if (disabled || isUploading) return
    setPreviewUrl(null)
    setFileInfo(null)
    onUploadComplete('')
  }

  return (
    <div className={`space-y-3 ${className}`}>
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

      {/* Preview Area */}
      <div className="flex items-start space-x-4">
        {/* Logo Preview - Square 1:1 */}
        <div className="flex-shrink-0">
          <div className="relative">
            {previewUrl ? (
              <div className="relative group">
                <div className="w-24 h-24 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Upload status overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                  </div>
                )}

                {/* Success indicator */}
                {!isUploading && previewUrl && !previewUrl.startsWith('blob:') && (
                  <div className="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                  className="absolute -top-1 -left-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                  title="ลบโลโก้"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upload Info */}
        <div className="flex-1 min-w-0">
          {previewUrl ? (
            // File Info Display
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">
                  {fileInfo?.name || 'Logo file'}
                </span>
              </div>

              {fileInfo && (
                <div className="text-xs text-gray-500">
                  ขนาด: {formatFileSize(fileInfo.size)}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClick}
                  disabled={disabled || isUploading}
                  className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-200 transition disabled:opacity-50"
                >
                  <ImageIcon className="w-3 h-3 mr-1.5" />
                  เปลี่ยนโลโก้
                </button>
              </div>
            </div>
          ) : (
            // Upload Instructions
            <div
              onClick={handleClick}
              className="cursor-pointer space-y-1"
            >
              <p className="text-sm font-medium text-gray-900">
                คลิกเพื่ออัพโหลดโลโก้
              </p>
              <p className="text-xs text-gray-500">
                หรือลากไฟล์มาวางที่นี่
              </p>
              <p className="text-xs text-gray-400">
                PNG, JPG, SVG (สูงสุด {maxSizeMB}MB)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}