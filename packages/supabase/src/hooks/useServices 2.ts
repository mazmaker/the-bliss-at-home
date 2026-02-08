import { useSupabaseQuery } from './useSupabaseQuery';
import { serviceService } from '../services';
import { Database } from '../types/database.types';

/**
 * Get all active services
 */
export function useServices() {
  return useSupabaseQuery({
    queryKey: ['services'],
    queryFn: (client) => serviceService.getServices(client),
  });
}

/**
 * Get services by category
 */
export function useServicesByCategory(category: string) {
  return useSupabaseQuery({
    queryKey: ['services', 'category', category],
    queryFn: (client) => serviceService.getServicesByCategory(client, category),
    enabled: !!category,
  });
}

/**
 * Get service by ID with add-ons
 */
export function useServiceById(id: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['services', 'detail', id],
    queryFn: (client) => serviceService.getServiceById(client, id!),
    enabled: !!id,
  });
}

/**
 * Get service by slug with add-ons
 */
export function useServiceBySlug(slug: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['services', 'slug', slug],
    queryFn: (client) => serviceService.getServiceBySlug(client, slug!),
    enabled: !!slug,
  });
}
