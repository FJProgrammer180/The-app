// Supabase project configuration for The-app
// The publishable key is safe to expose in the browser (Supabase RLS protects data).
window.THE_APP_CONFIG = {
  SUPABASE_URL: "https://jutaiicmkdewlkrareqn.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_rqPD9lykFc58PySkCtQbMg_s6neNRHo",
  // Supabase Edge Function that proxies to the 1.5B-parameter coding model
  EDGE_FUNCTION_URL: "https://jutaiicmkdewlkrareqn.supabase.co/functions/v1/code-assistant",
  APP_NAME: "The-app",
  MODEL_NAME: "Qwen2.5-Coder-1.5B-Instruct",
  MODEL_PARAMS: "1.54B",
};
