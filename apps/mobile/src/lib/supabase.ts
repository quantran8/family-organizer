/**
 * Supabase client — CHỖ DUY NHẤT trong app import @supabase/*.
 *
 * eslint chặn import từ app/ và src/components/ (01 §2). Nếu cần dữ liệu ở
 * tầng UI: gọi hook trong src/data/queries, hook gọi repository.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import type { Database } from './database.types';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra.supabaseUrl as string | undefined) ?? '';
const supabaseAnonKey = (extra.supabaseAnonKey as string | undefined) ?? '';

if (!supabaseUrl) {
  // Không ném: app vẫn mở được để xem màn hình, chỉ không gọi được mạng.
  console.warn('Chưa cấu hình supabaseUrl trong app.json → extra');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // React Native không có URL bar; deep link được xử lý ở app/_layout.tsx.
    detectSessionInUrl: false,
  },
});
