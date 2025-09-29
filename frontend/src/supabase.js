import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 Anon Key 가져오기
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Supabase 클라이언트 초기화
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage:window.sessionStorage,
        autoRefreshToken:true,
        persistSession:true,
        detectSessionInUrl:true
    }
});