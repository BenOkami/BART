import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Configuração do Supabase                                            */
/*                                                                     */
/* Duas formas de configurar (a primeira que tiver valor vence):       */
/*  1) Arquivo .env na raiz do projeto:                                */
/*       VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co             */
/*       VITE_SUPABASE_ANON_KEY=sua-chave-anon-public                  */
/*  2) Colar direto nas constantes abaixo.                             */
/* ------------------------------------------------------------------ */

const PASTE_SUPABASE_URL = ""; // ← cole aqui a URL do projeto (opcional)
const PASTE_SUPABASE_ANON_KEY = ""; // ← cole aqui a chave anon/public (opcional)

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || PASTE_SUPABASE_URL;
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || PASTE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
