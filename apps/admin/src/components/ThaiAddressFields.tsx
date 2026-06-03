import { useState, useEffect, useMemo } from 'react'
import {
  useProvinces,
  useDistricts,
  useSubdistricts,
  type ThaiProvince,
  type ThaiDistrict,
  type ThaiSubdistrict,
} from '@bliss/supabase/hooks/useThaiGeography'

interface ThaiAddressFieldsProps {
  province: string
  district: string
  subdistrict: string
  zipcode: string
  onChange: (fields: {
    province: string
    district: string
    subdistrict: string
    zipcode: string
  }) => void
  disabled?: boolean
  errors?: Record<string, string>
}

function ThaiAddressFields({
  province,
  district,
  subdistrict,
  zipcode,
  onChange,
  disabled = false,
  errors = {},
}: ThaiAddressFieldsProps) {
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [districtId, setDistrictId] = useState<number | null>(null)

  const { data: provinces = [], isLoading: loadingProvinces } = useProvinces()
  const { data: districts = [], isLoading: loadingDistricts } = useDistricts(provinceId)
  const { data: subdistricts = [], isLoading: loadingSubdistricts } = useSubdistricts(districtId)

  // Reverse-lookup: when province name is set (edit mode), find the ID
  useEffect(() => {
    if (province && provinces.length > 0 && !provinceId) {
      const found = provinces.find((p: ThaiProvince) => p.name_th === province)
      if (found) setProvinceId(found.id)
    }
  }, [province, provinces, provinceId])

  // Reverse-lookup: when district name is set (edit mode), find the ID
  useEffect(() => {
    if (district && districts.length > 0 && !districtId) {
      const found = districts.find((d: ThaiDistrict) => d.name_th === district)
      if (found) setDistrictId(found.id)
    }
  }, [district, districts, districtId])

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value ? Number(e.target.value) : null
    setProvinceId(selectedId)
    setDistrictId(null)

    const selectedProvince = provinces.find((p: ThaiProvince) => p.id === selectedId)
    onChange({
      province: selectedProvince?.name_th || '',
      district: '',
      subdistrict: '',
      zipcode: '',
    })
  }

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value ? Number(e.target.value) : null
    setDistrictId(selectedId)

    const selectedDistrict = districts.find((d: ThaiDistrict) => d.id === selectedId)
    onChange({
      province,
      district: selectedDistrict?.name_th || '',
      subdistrict: '',
      zipcode: '',
    })
  }

  const handleSubdistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value ? Number(e.target.value) : null
    const selectedSubdistrict = subdistricts.find((s: ThaiSubdistrict) => s.id === selectedId)
    onChange({
      province,
      district,
      subdistrict: selectedSubdistrict?.name_th || '',
      zipcode: selectedSubdistrict?.zipcode || '',
    })
  }

  const handleZipcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      province,
      district,
      subdistrict,
      zipcode: e.target.value,
    })
  }

  // Get current selected IDs for dropdown values
  const selectedProvinceValue = useMemo(() => {
    if (!provinceId) return ''
    return String(provinceId)
  }, [provinceId])

  const selectedDistrictValue = useMemo(() => {
    if (!districtId) return ''
    return String(districtId)
  }, [districtId])

  const selectedSubdistrictValue = useMemo(() => {
    if (!subdistrict || subdistricts.length === 0) return ''
    const found = subdistricts.find((s: ThaiSubdistrict) => s.name_th === subdistrict)
    return found ? String(found.id) : ''
  }, [subdistrict, subdistricts])

  const selectClass = (hasError: boolean) =>
    `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
      hasError ? 'border-red-500' : 'border-stone-300'
    }`

  return (
    <>
      {/* Province and District */}
      <div className="grid grid-cols-2 gap-4">
        <div data-field="province">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            จังหวัด <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedProvinceValue}
            onChange={handleProvinceChange}
            disabled={disabled || loadingProvinces}
            className={selectClass(!!errors.province)}
          >
            <option value="">
              {loadingProvinces ? 'กำลังโหลด...' : '-- เลือกจังหวัด --'}
            </option>
            {provinces.map((p: ThaiProvince) => (
              <option key={p.id} value={p.id}>
                {p.name_th}
              </option>
            ))}
          </select>
          {errors.province && (
            <p className="text-xs text-red-600 mt-1">{errors.province}</p>
          )}
        </div>

        <div data-field="district">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            เขต/อำเภอ
          </label>
          <select
            value={selectedDistrictValue}
            onChange={handleDistrictChange}
            disabled={disabled || !provinceId || loadingDistricts}
            className={selectClass(!!errors.district)}
          >
            <option value="">
              {!provinceId
                ? '-- เลือกจังหวัดก่อน --'
                : loadingDistricts
                  ? 'กำลังโหลด...'
                  : '-- เลือกเขต/อำเภอ --'}
            </option>
            {districts.map((d: ThaiDistrict) => (
              <option key={d.id} value={d.id}>
                {d.name_th}
              </option>
            ))}
          </select>
          {errors.district && (
            <p className="text-xs text-red-600 mt-1">{errors.district}</p>
          )}
        </div>
      </div>

      {/* Subdistrict and Zipcode */}
      <div className="grid grid-cols-2 gap-4">
        <div data-field="subdistrict">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            แขวง/ตำบล
          </label>
          <select
            value={selectedSubdistrictValue}
            onChange={handleSubdistrictChange}
            disabled={disabled || !districtId || loadingSubdistricts}
            className={selectClass(!!errors.subdistrict)}
          >
            <option value="">
              {!districtId
                ? '-- เลือกเขต/อำเภอก่อน --'
                : loadingSubdistricts
                  ? 'กำลังโหลด...'
                  : '-- เลือกแขวง/ตำบล --'}
            </option>
            {subdistricts.map((s: ThaiSubdistrict) => (
              <option key={s.id} value={s.id}>
                {s.name_th}
              </option>
            ))}
          </select>
          {errors.subdistrict && (
            <p className="text-xs text-red-600 mt-1">{errors.subdistrict}</p>
          )}
        </div>

        <div data-field="zipcode">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            รหัสไปรษณีย์ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={zipcode}
            onChange={handleZipcodeChange}
            placeholder="10110"
            maxLength={5}
            disabled={disabled}
            className={selectClass(!!errors.zipcode)}
          />
          {errors.zipcode && (
            <p className="text-xs text-red-600 mt-1">{errors.zipcode}</p>
          )}
        </div>
      </div>
    </>
  )
}

export default ThaiAddressFields
