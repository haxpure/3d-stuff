// Supabase login for the Maker Tools.
// Fill in the two values from Supabase → Project Settings → API (Project URL + anon / publishable key).
// While both are empty, the login is switched off and every tool opens without an account.
window.AUTH_CONFIG = {
  url: '',   // e.g. 'https://abcdefghijkl.supabase.co'
  key: '',   // anon public key ('eyJ…') or publishable key ('sb_publishable_…') — never the service_role / secret key
};
