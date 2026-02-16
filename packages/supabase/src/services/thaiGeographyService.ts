import { SupabaseClient } from '@supabase/supabase-js';

export interface ThaiProvince {
  id: number;
  name_th: string;
  name_en: string;
  province_code: number | null;
}

export interface ThaiDistrict {
  id: number;
  province_id: number;
  district_code: number | null;
  name_th: string;
  name_en: string;
}

export interface ThaiSubdistrict {
  id: number;
  district_id: number;
  name_th: string;
  name_en: string;
  zipcode: string;
}

/**
 * Get all Thai provinces
 */
export async function getProvinces(
  client: SupabaseClient
): Promise<ThaiProvince[]> {
  const { data, error } = await client
    .from('thai_provinces')
    .select('*')
    .order('name_th');

  if (error) throw error;
  return data || [];
}

/**
 * Get districts for a province
 */
export async function getDistricts(
  client: SupabaseClient,
  provinceId: number
): Promise<ThaiDistrict[]> {
  const { data, error } = await client
    .from('thai_districts')
    .select('*')
    .eq('province_id', provinceId)
    .order('name_th');

  if (error) throw error;
  return data || [];
}

/**
 * Get subdistricts for a district
 */
export async function getSubdistricts(
  client: SupabaseClient,
  districtId: number
): Promise<ThaiSubdistrict[]> {
  const { data, error } = await client
    .from('thai_subdistricts')
    .select('*')
    .eq('district_id', districtId)
    .order('name_th');

  if (error) throw error;
  return data || [];
}

export const thaiGeographyService = {
  getProvinces,
  getDistricts,
  getSubdistricts,
};
