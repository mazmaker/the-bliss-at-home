/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_USE_MOCK_AUTH: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_PORT: string
  readonly VITE_DEBUG: string
  readonly VITE_LIFF_ID?: string
  readonly VITE_OMISE_PUBLIC_KEY?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}