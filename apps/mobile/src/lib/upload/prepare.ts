/**
 * Xử lý ảnh TRƯỚC khi upload — 01 §6, bảng "xử lý trước khi upload (bắt buộc)".
 *
 * Bắt buộc, không phải tối ưu: một tấm ảnh chụp bằng máy 2026 là 4–8MB, và
 * quota miễn phí là 50MB. Không nén thì tám tấm ảnh hồ sơ — đúng tình huống
 * thật mà 01 §6 nêu — đã ăn hết quota của cả nhà. Nén cạnh dài 2000px q=0.8 cho
 * ra ~400KB và vẫn đọc được chữ trên một tờ giấy A4 chụp bằng điện thoại.
 *
 * HEIC → JPEG cũng nằm ở đây: ảnh iPhone mặc định là HEIC, thứ Android và phần
 * lớn trình xem web không mở được. Một giấy tờ vợ chụp mà chồng không mở được
 * là hỏng đúng thứ app hứa làm được.
 *
 * ── Thumbnail là một object RIÊNG, không phải một tham số ──
 *
 * Danh sách giấy tờ chỉ tải thumbnail (01 §6). Muốn vậy thì thumbnail phải là
 * một file độc lập trên R2 có key riêng — không có cách nào "tải một phần" một
 * object S3 thành ảnh nhỏ. 300px là đủ cho ô lưới trên màn hình 3x.
 *
 * PDF không đi qua đây: `expo-image-manipulator` không mở được PDF, và dựng
 * thumbnail cho PDF cần thêm một thư viện native (`react-native-pdf-thumbnail`).
 * PDF upload nguyên bản, không thumbnail — màn danh sách hiện ô giữ chỗ theo
 * MIME. Đổi lại là một dependency native ít hơn cho một loại file hiếm hơn ảnh
 * rất nhiều.
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

/** Cạnh dài tối đa của bản gốc sau nén (01 §6). */
const MAX_EDGE = 2000;
/** Cạnh dài của thumbnail. */
const THUMB_EDGE = 300;
const QUALITY = 0.8;
const THUMB_QUALITY = 0.7;

export interface PreparedFile {
  uri: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  /** `null` cho PDF và cho ảnh mà bước dựng thumbnail hỏng. */
  thumbUri: string | null;
  thumbSizeBytes: number;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/** Kích thước thật trên đĩa. `File.size` là `null` khi file không tồn tại. */
function sizeOf(uri: string): number {
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Nén ảnh và dựng thumbnail. PDF đi thẳng, không đụng tới.
 *
 * Không ném khi bước thumbnail hỏng: bản gốc mới là thứ người dùng cần giữ, và
 * để cả file trượt chỉ vì không dựng được ảnh nhỏ là đánh đổi sai. `thumbUri`
 * `null` thì danh sách hiện ô giữ chỗ.
 */
export async function prepareForUpload(
  uri: string,
  filename: string,
  mime: string,
): Promise<PreparedFile> {
  if (!isImageMime(mime)) {
    return {
      uri,
      filename,
      mime,
      sizeBytes: sizeOf(uri),
      thumbUri: null,
      thumbSizeBytes: 0,
    };
  }

  // Ghim CẠNH DÀI, không phải luôn luôn ghim `width`.
  //
  // `resize` giữ tỉ lệ khi chỉ truyền một chiều, nhưng chiều được truyền là
  // chiều bị ghim. Ảnh giấy tờ chụp bằng điện thoại phần lớn là ảnh DỌC: ghim
  // `width: 2000` cho một tấm 3024×4032 ra 2000×2667 — cạnh dài vẫn 2667px,
  // vượt mức 01 §6 và file nặng hơn hẳn mức đã tính quota. Phải đọc kích thước
  // thật trước rồi mới biết ghim chiều nào.
  //
  // Ảnh vốn đã nhỏ hơn ngưỡng thì KHÔNG phóng to lên: `resize` sẽ vui vẻ làm
  // thế, và kết quả là một file nặng gấp mấy lần bản gốc mà không rõ hơn tí nào.
  const source = await ImageManipulator.manipulate(uri).renderAsync();
  const longEdge = Math.max(source.width, source.height);
  const context = ImageManipulator.manipulate(uri);
  const resized =
    longEdge > MAX_EDGE
      ? context.resize(
          source.width >= source.height ? { width: MAX_EDGE } : { height: MAX_EDGE },
        )
      : context;
  const rendered = await resized.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });

  // HEIC vừa được chuyển thành JPEG ở trên — tên file phải đi theo, nếu không
  // màn chi tiết hiện "cccd.heic" cho một file thật ra là JPEG, và nút chia sẻ
  // sẽ đưa cái tên sai đó sang app khác.
  const outName = replaceExtension(filename, 'jpg');

  let thumbUri: string | null = null;
  let thumbSizeBytes = 0;
  try {
    const thumbContext = ImageManipulator.manipulate(uri);
    const thumbRendered = await thumbContext
      .resize(source.width >= source.height ? { width: THUMB_EDGE } : { height: THUMB_EDGE })
      .renderAsync();
    const thumb = await thumbRendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: THUMB_QUALITY,
    });
    thumbUri = thumb.uri;
    thumbSizeBytes = sizeOf(thumb.uri);
  } catch {
    thumbUri = null;
    thumbSizeBytes = 0;
  }

  return {
    uri: saved.uri,
    filename: outName,
    mime: 'image/jpeg',
    sizeBytes: sizeOf(saved.uri),
    thumbUri,
    thumbSizeBytes,
  };
}

function replaceExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}
