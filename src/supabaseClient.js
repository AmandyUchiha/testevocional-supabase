// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Este código LÊ as variáveis do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Este código CRIA a conexão
export const supabase = createClient(supabaseUrl, supabaseAnonKey);