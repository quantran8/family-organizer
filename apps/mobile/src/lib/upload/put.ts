/**
 * Pha 2 của ba pha: `PUT` thẳng lên R2.
 *
 * Tách khỏi repository có chủ ý — đây là chỗ DUY NHẤT trong app nói chuyện với
 * một host không phải Supabase, và nó không biết gì về `documents` hay
 * `household_id`. Nó nhận một URL đã ký và một file trên đĩa.
 *
 * ── Vì sao `UploadTask` chứ không phải `fetch` ──
 *
 * Tình huống thật cần chịu được (01 §6): *chụp 8 ảnh hồ sơ rồi khoá máy đi làm
 * việc khác*. `fetch` với một body lớn chết ngay khi iOS treo process — và nó
 * chết im lặng, promise không bao giờ resolve. `UploadTask` với
 * `sessionType: 'background'` giao việc cho `NSURLSession` của hệ điều hành,
 * thứ chạy tiếp khi app đã bị treo.
 *
 * Giới hạn phải biết: JS instance KHÔNG sống lại nếu app bị giết hẳn — Expo nói
 * rõ điều này. Nghĩa là promise ở đây có thể không bao giờ resolve dù file đã
 * lên tới nơi. Đó là lý do hàng đợi ở `stores/upload-queue` persist trạng thái
 * xuống đĩa và pha 3 (`confirm-upload`) chạy lại được: lần mở app sau, hàng đợi
 * gọi confirm cho những file đang dang dở, và Edge HEAD lên R2 để biết sự thật
 * thay vì tin trạng thái trong RAM đã mất.
 */

import { File, UploadTask, UploadType } from 'expo-file-system';

export interface PutResult {
  ok: boolean;
  status: number;
}

/**
 * Tải một file lên URL đã ký.
 *
 * `content-type` và `content-length` phải KHỚP thứ đã ghim vào chữ ký ở
 * `presign-upload`, nếu không R2 trả 403 — và thông báo lỗi của nó không nhắc
 * gì tới header nào lệch. `content-length` do tầng native tự đặt theo kích
 * thước file thật, nên chỗ cần cẩn thận là `mime`: nó phải là đúng chuỗi đã gửi
 * đi lúc xin chữ ký, không phải chuỗi đoán lại từ đuôi file.
 */
export async function putToSignedUrl(
  uri: string,
  signedUrl: string,
  mime: string,
  onProgress?: (fraction: number) => void,
): Promise<PutResult> {
  const file = new File(uri);
  const task = new UploadTask(file, signedUrl, {
    httpMethod: 'PUT',
    // BINARY_CONTENT: R2 muốn nguyên nội dung file trong body. MULTIPART bọc
    // thêm boundary và header, và chữ ký `UNSIGNED-PAYLOAD` vẫn qua được —
    // nhưng object lưu xuống sẽ có rác multipart ở đầu và cuối, tức là một tấm
    // ảnh không mở được. Hỏng ở chỗ chỉ phát hiện khi đi xem lại file.
    uploadType: UploadType.BINARY_CONTENT,
    mimeType: mime,
    headers: { 'content-type': mime },
    sessionType: 'background',
    onProgress: onProgress
      ? ({ bytesSent, totalBytes }) =>
          onProgress(totalBytes > 0 ? bytesSent / totalBytes : 0)
      : undefined,
  });

  try {
    const res = await task.uploadAsync();
    // `uploadAsync` resolve cả với status 4xx/5xx — nó chỉ reject khi không đọc
    // được file hoặc request hỏng hẳn. Kiểm status ở đây, nếu không một chữ ký
    // hết hạn (403) sẽ được ghi nhận là thành công và pha 3 mới phát hiện.
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } finally {
    task.release();
  }
}
