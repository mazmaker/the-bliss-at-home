import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ImageUpload } from './ImageUpload'
import {
  X,
  Globe,
  Package,
  Upload,
  Link2,
  AlertCircle,
} from 'lucide-react'

// Validation schema for a service add-on (P5). One add-on can link to MANY services
// (service_ids), or apply to ALL services incl. future ones (applies_to_all).
const addOnFormSchema = z
  .object({
    service_ids: z.array(z.string()).optional().default([]),
    applies_to_all: z.boolean().default(false),
    name_th: z.string().min(1, 'กรุณากรอกชื่อภาษาไทย'),
    name_en: z.string().min(1, 'English name is required'),
    name_cn: z.string().optional(),
    description_th: z.string().optional(),
    description_en: z.string().optional(),
    description_cn: z.string().optional(),
    price: z.coerce
      .number({ required_error: 'ระบุราคาเป็นตัวเลข', invalid_type_error: 'ระบุราคาเป็นตัวเลข' })
      .min(0, 'ราคาต้องไม่ติดลบ')
      .max(50000, 'ราคาสูงสุด 50,000 บาท'),
    icon: z.string().optional(),
    image_url: z.string().optional(),
    is_active: z.boolean(),
    sort_order: z.number().optional(),
  })
  .refine((d) => d.applies_to_all || (d.service_ids && d.service_ids.length > 0), {
    message: 'เลือกอย่างน้อย 1 บริการ หรือเปิด "ใช้กับทุกบริการ"',
    path: ['service_ids'],
  })

export type AddOnFormData = z.infer<typeof addOnFormSchema>

export interface ServiceOption {
  id: string
  name_th: string
  name_en: string
}

interface AddOnFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editData?: AddOnFormData & { id: string }
  services: ServiceOption[]
}

const emptyDefaults: AddOnFormData = {
  service_ids: [],
  applies_to_all: false,
  name_th: '',
  name_en: '',
  name_cn: '',
  description_th: '',
  description_en: '',
  description_cn: '',
  price: undefined as unknown as number,
  icon: '',
  image_url: '',
  is_active: true,
  sort_order: 0,
}

export function AddOnForm({ isOpen, onClose, onSuccess, editData, services }: AddOnFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uploadError, setUploadError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<AddOnFormData>({
    resolver: zodResolver(addOnFormSchema),
    defaultValues: editData || emptyDefaults,
  })

  const imageUrl = watch('image_url')
  const appliesToAll = watch('applies_to_all')
  const selectedServiceIds = watch('service_ids') || []

  // Load form data when opening (edit or create)
  useEffect(() => {
    if (!isOpen) return
    if (editData) {
      reset({
        service_ids: editData.service_ids || [],
        applies_to_all: editData.applies_to_all || false,
        name_th: editData.name_th || '',
        name_en: editData.name_en || '',
        name_cn: editData.name_cn || '',
        description_th: editData.description_th || '',
        description_en: editData.description_en || '',
        description_cn: editData.description_cn || '',
        price: editData.price ?? (undefined as unknown as number),
        icon: editData.icon || '',
        image_url: editData.image_url || '',
        is_active: editData.is_active !== undefined ? editData.is_active : true,
        sort_order: editData.sort_order || 0,
      })
    } else {
      reset(emptyDefaults)
    }
  }, [editData, isOpen, reset])

  const handleUploadComplete = (url: string) => {
    setValue('image_url', url)
    setUploadError('')
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
  }

  const onSubmit = async (data: AddOnFormData) => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Only write columns that exist on service_addons; coerce empty text → null.
      // service_id (legacy single-FK) is intentionally left NULL — the multi-service model
      // uses service_ids + applies_to_all.
      const cleanData = {
        service_ids: data.service_ids || [],
        applies_to_all: data.applies_to_all,
        name_th: data.name_th.trim(),
        name_en: data.name_en.trim(),
        name_cn: data.name_cn?.trim() || null,
        description_th: data.description_th?.trim() || null,
        description_en: data.description_en?.trim() || null,
        description_cn: data.description_cn?.trim() || null,
        price: data.price,
        icon: data.icon?.trim() || null,
        image_url: data.image_url?.trim() || null,
        is_active: data.is_active,
        sort_order: data.sort_order || 0,
      }

      if (editData?.id) {
        const { error } = await supabase
          .from('service_addons')
          .update(cleanData)
          .eq('id', editData.id)
          .select()
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('service_addons')
          .insert(cleanData)
          .select()
        if (error) throw error
      }

      reset(emptyDefaults)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('AddOn form error:', error)
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก'
      setSubmitError(`บันทึกไม่สำเร็จ: ${errorMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative w-full max-w-3xl bg-white text-left shadow-2xl rounded-2xl transition-all sm:my-8 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-bliss-700 to-bliss-800 px-6 py-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white leading-tight">
                    {editData ? 'แก้ไขบริการเสริม' : 'เพิ่มบริการเสริม (Add-on)'}
                  </h3>
                  <p className="text-xs text-bliss-200">
                    {editData ? 'อัปเดตข้อมูลบริการเสริมที่มีอยู่' : 'กรอกข้อมูลเพื่อสร้างบริการเสริมใหม่'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit, () => {
              setSubmitError('กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วนและถูกต้อง')
            })}
            className="flex flex-col min-h-0 flex-1"
            noValidate
          >
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Section: ข้อมูลบริการเสริม ── */}
              <div className="rounded-xl border border-bliss-200 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                  <Package className="w-5 h-5 text-bliss-600" />
                  <h4 className="text-lg font-bold text-bliss-900">ข้อมูลบริการเสริม</h4>
                </div>

                {/* Linked services (multi-select + apply-to-all) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    <Link2 className="w-4 h-4 inline mr-1" />
                    ผูกกับบริการ
                  </label>

                  {/* Apply-to-all toggle */}
                  <label
                    className={`flex items-center gap-2 p-3 mb-3 rounded-xl border-2 cursor-pointer transition ${
                      appliesToAll ? 'border-bliss-500 bg-bliss-50' : 'border-bliss-200 hover:border-bliss-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={appliesToAll}
                      onChange={(e) => setValue('applies_to_all', e.target.checked, { shouldValidate: true })}
                      className="h-4 w-4 text-bliss-600 focus:ring-bliss-500 border-bliss-300 rounded"
                    />
                    <span className="text-sm font-medium text-bliss-800">
                      ใช้กับทุกบริการ (รวมบริการที่เพิ่มในอนาคต)
                    </span>
                  </label>

                  {/* Per-service checkboxes */}
                  {!appliesToAll && (
                    <div className="border border-bliss-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-bliss-500">
                          เลือกบริการที่จะให้บริการเสริมนี้แสดง ({selectedServiceIds.length} จาก {services.length})
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setValue('service_ids', services.map((s) => s.id), { shouldValidate: true })
                            }
                            className="text-xs px-2 py-1 bg-bliss-100 text-bliss-700 rounded hover:bg-bliss-200 transition"
                          >
                            เลือกทั้งหมด
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue('service_ids', [], { shouldValidate: true })}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                          >
                            ล้าง
                          </button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {services.map((s) => {
                          const checked = selectedServiceIds.includes(s.id)
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-bliss-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setValue('service_ids', [...selectedServiceIds, s.id], {
                                      shouldValidate: true,
                                    })
                                  } else {
                                    setValue(
                                      'service_ids',
                                      selectedServiceIds.filter((id) => id !== s.id),
                                      { shouldValidate: true }
                                    )
                                  }
                                }}
                                className="h-4 w-4 text-bliss-600 focus:ring-bliss-500 border-bliss-300 rounded"
                              />
                              <span className="text-sm text-bliss-700 truncate">{s.name_th}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {appliesToAll && (
                    <p className="text-sm text-bliss-600 bg-bliss-50 border border-bliss-200 rounded-lg px-3 py-2">
                      บริการเสริมนี้จะแสดงในทุกบริการโดยอัตโนมัติ
                    </p>
                  )}

                  {errors.service_ids && (
                    <p className="mt-1 text-sm text-red-600">{errors.service_ids.message as string}</p>
                  )}
                </div>

                {/* Names (TH / EN / CN) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <Globe className="w-4 h-4 inline mr-1" />
                      ชื่อบริการเสริม (ไทย)
                    </label>
                    <input
                      {...register('name_th')}
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="เช่น เพิ่มยาหม่อง"
                    />
                    {errors.name_th && (
                      <p className="mt-1 text-sm text-red-600">{errors.name_th.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Add-on Name (English)
                    </label>
                    <input
                      {...register('name_en')}
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="e.g. Herbal Balm"
                    />
                    {errors.name_en && (
                      <p className="mt-1 text-sm text-red-600">{errors.name_en.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <Globe className="w-4 h-4 inline mr-1" />
                      附加服务名称 (中文)
                    </label>
                    <input
                      {...register('name_cn')}
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="例如：药膏"
                    />
                  </div>
                </div>

                {/* Descriptions (TH / EN / CN) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      รายละเอียด (ไทย)
                    </label>
                    <textarea
                      {...register('description_th')}
                      rows={2}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="คำอธิบายบริการเสริม..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      Description (English)
                    </label>
                    <textarea
                      {...register('description_en')}
                      rows={2}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="Add-on description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      描述 (中文)
                    </label>
                    <textarea
                      {...register('description_cn')}
                      rows={2}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="附加服务描述..."
                    />
                  </div>
                </div>
              </div>{/* end Section: ข้อมูลบริการเสริม */}

              {/* ── Section: ราคา & การตั้งค่า ── */}
              <div className="rounded-xl border border-bliss-200 p-5">
                <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-bliss-100">
                  <span className="inline-block font-bold text-bliss-600 text-lg leading-none">฿</span>
                  <h4 className="text-lg font-bold text-bliss-900">ราคา &amp; การตั้งค่า</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      <span className="inline-block mr-1 font-bold text-bliss-600">฿</span>
                      ราคาบริการเสริม
                    </label>
                    <input
                      {...register('price')}
                      type="number"
                      min="0"
                      max="50000"
                      step="10"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="50"
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                    )}
                  </div>

                  {/* Icon (emoji/text) */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      ไอคอน (emoji, ไม่บังคับ)
                    </label>
                    <input
                      {...register('icon')}
                      type="text"
                      maxLength={8}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="🧴"
                    />
                  </div>

                  {/* Sort order */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-1">
                      ลำดับการแสดง
                    </label>
                    <input
                      {...register('sort_order', { valueAsNumber: true })}
                      type="number"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Image upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    <Upload className="w-4 h-4 inline mr-1" />
                    รูปภาพบริการเสริม (ไม่บังคับ)
                  </label>
                  <ImageUpload
                    currentImageUrl={imageUrl || undefined}
                    onUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                    disabled={isSubmitting}
                    folder="addons"
                    maxSizeMB={5}
                  />
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {uploadError}
                    </p>
                  )}
                </div>

                {/* Active toggle */}
                <div className="flex items-center">
                  <input
                    {...register('is_active')}
                    type="checkbox"
                    id="addon_is_active"
                    className="h-4 w-4 text-bliss-600 focus:ring-bliss-500 border-bliss-300 rounded"
                  />
                  <label htmlFor="addon_is_active" className="ml-2 block text-sm text-bliss-700">
                    เปิดใช้งานบริการเสริมนี้ (ลูกค้าจะเห็นเฉพาะที่เปิดใช้งาน)
                  </label>
                </div>
              </div>{/* end Section: ราคา & การตั้งค่า */}

              {/* Error summary */}
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </div>
              )}
            </div>{/* end Scrollable Body */}

            {/* Sticky Footer */}
            <div className="flex-shrink-0 flex justify-end gap-3 border-t border-bliss-200 bg-bliss-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-bliss-700 bg-white border border-bliss-300 rounded-xl hover:bg-bliss-100 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl hover:from-bliss-700 hover:to-bliss-800 shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : editData ? 'บันทึกการแก้ไข' : 'เพิ่มบริการเสริม'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
