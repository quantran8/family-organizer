/**
 * Chọn file để đính vào một giấy tờ.
 *
 * **Không có máy quét tài liệu** (đã chốt, khác `05 §7.3`). Spec viết "mặc định
 * mở thẳng máy quét (VisionKit / ML Kit)"; nó cần
 * `react-native-document-scanner-plugin`, một module native không chạy trong
 * Expo Go và buộc phải có EAS dev build — cùng ràng buộc đang giữ Google/Apple
 * Sign-in ở G3.
 *
 * Hệ quả phải nhớ khi đọc màn hình chi tiết: bỏ máy quét làm **ma sát để có ảnh
 * chụp cao hơn**, nên đường "chỉ ghi chỗ để giấy, chưa cần ảnh" càng phải mượt.
 * Giấy tờ không có file nào vẫn là bản ghi đầy đủ (05 §7.2) — đó không phải sự
 * nhân nhượng, đó là đường chính.
 *
 * Ba đường vào, cùng trả về một hình dạng:
 *   `takePhoto` — camera, ca gần máy quét nhất
 *   `pickPhotos` — thư viện ảnh, chọn nhiều
 *   `pickDocuments` — file PDF
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface PickedFile {
  uri: string;
  filename: string;
  mime: string;
}

/** MIME suy từ đuôi khi bộ chọn không nói — hiếm, nhưng có thật trên Android. */
function mimeFromName(name: string, fallback: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return fallback;
}

function nameFromUri(uri: string, fallback: string): string {
  const last = uri.split('/').pop();
  return last && last.includes('.') ? last : fallback;
}

/**
 * Chụp ảnh.
 *
 * `allowsEditing: false` có chủ ý: hộp cắt ảnh của hệ điều hành cắt vuông trên
 * Android, và một tờ A4 cắt vuông là một tờ A4 mất hai đầu. Người dùng chụp lại
 * dễ hơn là hiểu vì sao ảnh bị xén.
 */
export async function takePhoto(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    // Chất lượng 1 ở đây, nén ở `prepare.ts`. Nén hai lần (một lần bởi bộ chọn,
    // một lần bởi mình) là nén một ảnh đã mất chi tiết — chữ trên giấy tờ nhoè
    // đúng ở mức không đọc được nữa.
    quality: 1,
  });
  if (result.canceled) return [];

  return result.assets.map((a) => ({
    uri: a.uri,
    filename: a.fileName ?? nameFromUri(a.uri, 'anh.jpg'),
    mime: a.mimeType ?? mimeFromName(a.fileName ?? a.uri, 'image/jpeg'),
  }));
}

/** Chọn ảnh có sẵn. Nhiều ảnh một lần — hợp đồng 6 trang là một lần chọn. */
export async function pickPhotos(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];

  return result.assets.map((a) => ({
    uri: a.uri,
    filename: a.fileName ?? nameFromUri(a.uri, 'anh.jpg'),
    mime: a.mimeType ?? mimeFromName(a.fileName ?? a.uri, 'image/jpeg'),
  }));
}

/**
 * Chọn file (PDF).
 *
 * `copyToCacheDirectory: true` bắt buộc: URI trả về từ bộ chọn của Android là
 * `content://` trỏ vào một provider chỉ sống trong lượt chọn đó. Upload nền có
 * thể chạy nhiều phút sau — lúc đó URI gốc đã chết, và lỗi hiện ra là "không
 * đọc được file" cho một file người dùng nhìn thấy rõ ràng trong danh sách.
 */
export async function pickDocuments(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  return result.assets.map((a) => ({
    uri: a.uri,
    filename: a.name,
    mime: a.mimeType ?? mimeFromName(a.name, 'application/pdf'),
  }));
}
