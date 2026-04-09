import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase 미설정 시 null 반환 → 인메모리 폴백으로 자동 전환
export const supabase = url && key ? createClient(url, key) : null;

export const DB_ENABLED = !!supabase;
