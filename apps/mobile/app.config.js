/**
 * Cấu hình Expo — đọc `extra` từ biến môi trường thay vì hard-code.
 *
 * Vì sao đổi từ `app.json` sang file JS: `app.json` là dữ liệu tĩnh nên URL và
 * anon key phải nằm thẳng trong git. Với local Docker thì vô hại (anon key demo
 * của Supabase CLI ai cũng có), nhưng với cloud thì đó là key thật của một
 * project thật — và một key đã vào lịch sử git thì coi như đã lộ, xoá đi cũng
 * không lấy lại được.
 *
 * Anon key KHÔNG phải bí mật theo nghĩa mật khẩu: nó được nhúng vào app và ai
 * cài app cũng đọc được, RLS mới là thứ bảo vệ dữ liệu. Nhưng nó vẫn không nên
 * nằm trong repo — nó xác định project nào đang bị gọi, và một repo public sẽ
 * biến project của bạn thành đích cho bot dò.
 *
 * Nguồn giá trị:
 *   - máy dev: `.env` ở `apps/mobile/` (đã bị .gitignore chặn)
 *   - EAS build: EAS secrets (01 §12)
 *
 * `SUPABASE_SERVICE_ROLE_KEY` KHÔNG BAO GIỜ xuất hiện ở đây. Nó bỏ qua toàn bộ
 * RLS; nhúng nó vào app là trao chìa khoá đọc-ghi mọi nhà cho bất kỳ ai gỡ được
 * bundle. Nó chỉ sống ở Supabase Edge Function secrets.
 */

require('dotenv').config({ path: `${__dirname}/.env` });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Cảnh báo chứ không ném: `expo export`/`typecheck` trong CI không cần chúng,
  // và một build hỏng ở đây khó đọc hơn nhiều so với một dòng cảnh báo.
  console.warn(
    '[nha-minh] Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      '  Chép apps/mobile/.env.example thành apps/mobile/.env rồi điền giá trị từ\n' +
      '  Supabase Dashboard → Project Settings → API.',
  );
}

module.exports = {
  expo: {
    name: 'Nhà mình',
    slug: 'nha-minh',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'family',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.nhaminh.app',
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'Chọn ảnh giấy tờ để lưu vào nhà mình.',
        NSCameraUsageDescription: 'Chụp ảnh giấy tờ để lưu vào nhà mình.',
        CFBundleAllowMixedLocalizations: true,
      },
    },
    android: {
      package: 'com.nhaminh.app',
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          data: [{ scheme: 'family' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission: 'Chọn ảnh giấy tờ để lưu vào nhà mình.',
          cameraPermission: 'Chụp ảnh giấy tờ để lưu vào nhà mình.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#7457E8',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  },
};
