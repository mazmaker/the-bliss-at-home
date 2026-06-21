/**
 * Single source for the customer "contact / ask us" channel.
 *
 * The LINE Official Account add-friend link. Replaces the old
 * `mailto:support@theblissathome.com` contact links, which silently did nothing
 * ("คลิกแล้วไม่ไปไหน") on devices/in-app browsers with no mail client configured.
 *
 * Override per-environment with VITE_LINE_CONTACT_URL; defaults to the live OA link.
 */
export const LINE_CONTACT_URL =
  import.meta.env.VITE_LINE_CONTACT_URL || 'https://lin.ee/629FvW2'
