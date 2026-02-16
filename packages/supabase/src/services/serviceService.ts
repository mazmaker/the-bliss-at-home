import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Service = Database['public']['Tables']['services']['Row'];
type ServiceAddon = Database['public']['Tables']['service_addons']['Row'];

interface ServiceWithAddons extends Service {
  addons: ServiceAddon[];
}

/**
 * Get all active services
 */
export async function getServices(
  client: SupabaseClient<Database>
): Promise<Service[]> {
  const { data, error } = await client
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get services by category
 */
export async function getServicesByCategory(
  client: SupabaseClient<Database>,
  category: Database['public']['Enums']['service_category']
): Promise<Service[]> {
  const { data, error } = await client
    .from('services')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get service by ID with add-ons
 */
export async function getServiceById(
  client: SupabaseClient<Database>,
  id: string
): Promise<ServiceWithAddons | null> {
  const { data: service, error: serviceError } = await client
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (serviceError) throw serviceError;
  if (!service) return null;

  const { data: addons, error: addonsError } = await client
    .from('service_addons')
    .select('*')
    .eq('service_id', id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (addonsError) throw addonsError;

  return {
    ...service,
    addons: addons || [],
  };
}

/**
 * Get service by slug with add-ons
 */
export async function getServiceBySlug(
  client: SupabaseClient<Database>,
  slug: string
): Promise<ServiceWithAddons | null> {
  const { data: service, error: serviceError } = await client
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (serviceError) {
    if (serviceError.code === 'PGRST116') return null; // Not found
    throw serviceError;
  }
  if (!service) return null;

  const { data: addons, error: addonsError } = await client
    .from('service_addons')
    .select('*')
    .eq('service_id', service.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (addonsError) throw addonsError;

  return {
    ...service,
    addons: addons || [],
  };
}

export const serviceService = {
  getServices,
  getServicesByCategory,
  getServiceById,
  getServiceBySlug,
};
