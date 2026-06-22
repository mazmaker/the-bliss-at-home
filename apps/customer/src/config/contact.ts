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

/**
 * The Facebook Page link for the customer "contact us" channel.
 *
 * Used alongside LINE_CONTACT_URL as the two standard contact channels
 * (LINE + Facebook). Replaces the old dead Phone / WhatsApp / Messenger
 * (`m.me/your-facebook-page`) placeholders that pointed nowhere.
 *
 * Override per-environment with VITE_FACEBOOK_CONTACT_URL; defaults to the live Page.
 */
export const FACEBOOK_CONTACT_URL =
  import.meta.env.VITE_FACEBOOK_CONTACT_URL ||
  'https://www.facebook.com/theblissmassageathome'
