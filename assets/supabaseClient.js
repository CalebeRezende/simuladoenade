
export function getSupabase() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("COLE_AQUI") || key.includes("COLE_AQUI")) {
    throw new Error("Supabase não configurado. Edite o arquivo config.js com a URL e a anon key.");
  }

  return window.supabase.createClient(url, key);
}
