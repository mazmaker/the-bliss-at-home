import { useSupabaseQuery } from './useSupabaseQuery';
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
  type ThaiProvince,
  type ThaiDistrict,
  type ThaiSubdistrict,
} from '../services/thaiGeographyService';

// Re-export types for consumers
export type { ThaiProvince, ThaiDistrict, ThaiSubdistrict };

const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

/**
 * Fetch all Thai provinces (cached for 24 hours)
 */
export function useProvinces() {
  return useSupabaseQuery<ThaiProvince[]>({
    queryKey: ['thai-provinces'],
    queryFn: (client) => getProvinces(client),
    staleTime: TWENTY_FOUR_HOURS,
    gcTime: TWENTY_FOUR_HOURS,
  });
}

/**
 * Fetch districts for a province (cached for 24 hours)
 */
export function useDistricts(provinceId: number | null) {
  return useSupabaseQuery<ThaiDistrict[]>({
    queryKey: ['thai-districts', provinceId],
    queryFn: (client) => getDistricts(client, provinceId!),
    enabled: !!provinceId,
    staleTime: TWENTY_FOUR_HOURS,
    gcTime: TWENTY_FOUR_HOURS,
  });
}

/**
 * Fetch subdistricts for a district (cached for 24 hours)
 */
export function useSubdistricts(districtId: number | null) {
  return useSupabaseQuery<ThaiSubdistrict[]>({
    queryKey: ['thai-subdistricts', districtId],
    queryFn: (client) => getSubdistricts(client, districtId!),
    enabled: !!districtId,
    staleTime: TWENTY_FOUR_HOURS,
    gcTime: TWENTY_FOUR_HOURS,
  });
}
