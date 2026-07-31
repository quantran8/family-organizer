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
    // `name` vừa là tên người dùng thấy, vừa là nguồn duy nhất sinh ra tên thư
    // mục/scheme Xcode khi prebuild (không khoá config nào override được —
    // `ios.scheme` không có tác dụng ở đây). Giữ ASCII, không dấu, không khoảng
    // trắng: Expo bỏ dấu bằng cách xoá luôn nguyên âm có dấu, nên 'Nhà mình'
    // từng ra thư mục `ios/Nhmnh/`.
    name: 'Homi',
    slug: 'nha-minh',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'family',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.visiongroup.homi',
      // TẠM ĐẶT RỖNG để build được cho simulator khi máy chưa có certificate
      // Apple Development hợp lệ. Comment plugin `expo-notifications` ở dưới là
      // KHÔNG ĐỦ: `aps-environment` và `com.apple.developer.applesignin` do
      // autolinking của package trong `dependencies` sinh ra, không phải do
      // danh sách `plugins`. Đặt rỗng ở đây là chốt chặn cuối cùng.
      // BẬT LẠI: xoá dòng này (xem ghi chú ở `plugins`).
      entitlements: {},
      infoPlist: {
        // Tên hiện dưới icon. Đặt tường minh để không phụ thuộc vào `name` —
        // nếu sau này `name` phải đổi cho hợp lệ với Xcode thì tên người dùng
        // thấy vẫn giữ nguyên.
        CFBundleDisplayName: 'Homi',
        NSPhotoLibraryUsageDescription: 'Chọn ảnh giấy tờ để lưu vào nhà mình.',
        NSCameraUsageDescription: 'Chụp ảnh giấy tờ để lưu vào nhà mình.',
        CFBundleAllowMixedLocalizations: true,
      },
    },
    android: {
      // LƯU Ý: Android lấy tên hiển thị thẳng từ `name` (ghi vào `app_name`
      // trong strings.xml) và không có khoá config nào tách ra như
      // `CFBundleDisplayName` của iOS. Hiện `name` đã là 'Homi' nên Android ra
      // đúng tên; nếu sau này `name` phải đổi thì cần một config plugin
      // `withStringsXml` để đặt lại `app_name`.
      package: 'com.visiongroup.homi',
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
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 100,
          resizeMode: 'contain',
          backgroundColor: '#FFFFFF',
        },
      ],
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission: 'Chọn ảnh giấy tờ để lưu vào nhà mình.',
          cameraPermission: 'Chụp ảnh giấy tờ để lưu vào nhà mình.',
        },
      ],
      // TẠM TẮT — push notification và Sign in with Apple.
      //
      // Vì sao: hai thứ này sinh ra entitlement `aps-environment` và
      // `com.apple.developer.applesignin`. Expo bắt buộc phải ký (code sign)
      // khi có `applesignin`, KỂ CẢ khi chỉ build cho simulator — nên máy chưa
      // có certificate Apple Development hợp lệ thì `expo run:ios` chết ngay ở
      // bước ký, chưa kịp build.
      //
      // Gỡ được an toàn vì hiện chưa có code nào import `expo-notifications`
      // hay `expo-apple-authentication` (đăng nhập đang dùng email/password).
      //
      // BẬT LẠI: bỏ comment khối dưới, bỏ comment `ios.entitlements` ở trên,
      // rồi `expo prebuild --clean`. Cần certificate Apple Development hợp lệ
      // (Xcode → Settings → Accounts → Manage Certificates → + ).
      // [
      //   'expo-notifications',
      //   {
      //     icon: './assets/icon.png',
      //     color: '#7457E8',
      //   },
      // ],
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
