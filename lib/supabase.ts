// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// DB 조회/수정용 (service role)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Auth 인증용 (anon key)
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
