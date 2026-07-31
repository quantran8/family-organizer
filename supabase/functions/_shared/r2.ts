/**
 * Ký URL presigned cho Cloudflare R2 — SigV4, viết tay bằng Web Crypto.
 *
 * Vì sao không dùng `aws-sdk` / `aws4fetch`: Edge Function này chỉ cần ĐÚNG MỘT
 * thứ — một chuỗi URL đã ký cho `PUT` và cho `GET`. SDK S3 kéo theo vài trăm KB
 * và một cây dependency mà mỗi lần deploy phải tải lại; SigV4 cho presigned URL
 * là ~60 dòng và không có gì để hỏng âm thầm. Deno có sẵn `crypto.subtle` nên
 * không cần polyfill.
 *
 * R2 nói giao thức S3 nhưng khác hai chỗ đáng nhớ:
 *   - Region LUÔN là `auto`. Đặt `ap-southeast-1` cho giống Supabase sẽ làm chữ
 *     ký sai và R2 trả 403 kèm thông báo không nhắc gì tới region.
 *   - Endpoint là `https://{account_id}.r2.cloudflarestorage.com`, bucket nằm
 *     trong PATH chứ không phải subdomain (path-style). Virtual-host style ký
 *     ra chữ ký hợp lệ nhưng trỏ tới một host không tồn tại.
 *
 * ── Vì sao ghim `content-length` và `content-type` vào chữ ký (01 §6) ──
 *
 * Presigned PUT là cấp quyền GHI thật vào bucket. Không ghim thì cùng một URL
 * đó tải lên được file 2GB thay vì tấm ảnh 300KB vừa kiểm quota, và bộ đếm
 * `storage_used_bytes` sẽ nói một con số không liên quan gì tới dung lượng thật.
 * Ghim vào `SignedHeaders` nghĩa là R2 tự từ chối nếu client gửi khác — kiểm
 * quota ở `presign-upload` mới có nghĩa.
 */

const REGION = 'auto';
const SERVICE = 's3';
const ALGORITHM = 'AWS4-HMAC-SHA256';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Đọc cấu hình R2 từ env, hoặc `null` nếu chưa đặt.
 *
 * Trả `null` thay vì ném: nửa "ghi thông tin + vị trí bản giấy" của Giấy tờ
 * KHÔNG cần R2, và nó là đường chính (05 §7.2). Chưa có key thì chỉ phần đính
 * file dừng lại, kèm một câu nói rõ — chứ không phải cả tính năng chết.
 */
export function r2ConfigFromEnv(): R2Config | null {
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const bucket = Deno.env.get('R2_BUCKET');
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function endpoint(cfg: R2Config): string {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com`;
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

/**
 * Mã hoá từng đoạn của key theo luật URI của S3.
 *
 * `encodeURIComponent` bỏ sót `!'()*` và S3 thì không — chữ ký tính trên chuỗi
 * đã mã hoá, nên lệch một ký tự là 403. Dấu `/` giữ nguyên vì nó là phân cách
 * đoạn đường dẫn thật, không phải một phần tên file.
 */
function encodeKey(key: string): string {
  return key
    .split('/')
    .map((seg) =>
      encodeURIComponent(seg).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
}

/** `20260731T090000Z` và `20260731`. */
function stamps(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

async function signingKey(cfg: R2Config, dateStamp: string): Promise<ArrayBuffer> {
  const kDate = await hmac(
    new TextEncoder().encode(`AWS4${cfg.secretAccessKey}`),
    dateStamp,
  );
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

interface PresignOptions {
  /**
   * Phương thức phải KHỚP với phương thức thật sự gửi đi: nó nằm ngay dòng đầu
   * của canonical request, nên ký `GET` rồi gửi `HEAD` là 403.
   */
  method: 'PUT' | 'GET' | 'HEAD' | 'DELETE';
  key: string;
  expiresIn: number;
  /**
   * Header ghim vào chữ ký. R2 từ chối request nếu client gửi giá trị khác —
   * đó chính là điểm của việc ghim (xem đầu file).
   */
  signedHeaders?: Record<string, string>;
  now?: Date;
}

/**
 * URL presigned. Không gọi mạng — chỉ là băm và nối chuỗi.
 *
 * Dùng presigned QUERY (`X-Amz-*` trên query string) chứ không phải header
 * `Authorization`: client React Native chỉ có một URL để đưa cho `fetch` hoặc
 * cho `<Image source>`, và thẻ ảnh thì không gắn header được.
 */
export async function presignR2Url(
  cfg: R2Config,
  { method, key, expiresIn, signedHeaders = {}, now = new Date() }: PresignOptions,
): Promise<string> {
  const { amzDate, dateStamp } = stamps(now);
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${cfg.bucket}/${encodeKey(key)}`;

  // `host` luôn có mặt trong chữ ký; phần còn lại do chỗ gọi ghim thêm.
  const headers: Record<string, string> = { host, ...lowerKeys(signedHeaders) };
  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames
    .map((h) => `${h}:${headers[h]?.trim() ?? ''}\n`)
    .join('');
  const signedHeaderList = sortedHeaderNames.join(';');

  const credential = `${cfg.accessKeyId}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  // Query phải sắp theo thứ tự từ điển TRƯỚC khi ký, và cùng thứ tự đó phải
  // xuất hiện trong URL cuối. Sắp lại một lần rồi dùng chung cho cả hai.
  const query: [string, string][] = [
    ['X-Amz-Algorithm', ALGORITHM],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', signedHeaderList],
  ];
  query.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonicalQuery = query
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // `UNSIGNED-PAYLOAD`: nội dung file không đi qua đây nên không băm được. Đây
  // là lý do `content-length` phải được ghim — không có nó thì không còn gì
  // ràng buộc kích thước thật của thứ được tải lên.
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderList,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    ALGORITHM,
    amzDate,
    `${dateStamp}/${REGION}/${SERVICE}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = hex(await hmac(await signingKey(cfg, dateStamp), stringToSign));

  return `${endpoint(cfg)}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function lowerKeys(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
  return out;
}

/**
 * File có thật trên R2 chưa, và nặng bao nhiêu — dùng ở `confirm-upload`.
 *
 * Đây là lý do `is_confirmed` là trường chỉ đọc với client (02 §7): tin client
 * nói "xong rồi" thì quota đếm cả những file chưa bao giờ lên tới nơi. HEAD
 * request là chỗ duy nhất biết sự thật.
 */
export async function headR2Object(
  cfg: R2Config,
  key: string,
): Promise<{ exists: boolean; sizeBytes: number }> {
  const url = await presignR2Url(cfg, { method: 'HEAD', key, expiresIn: 60 });
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) return { exists: false, sizeBytes: 0 };
  return { exists: true, sizeBytes: Number(res.headers.get('content-length') ?? 0) };
}

/** Xoá object. Bỏ qua lỗi 404 — không còn ở đó cũng là kết quả mong muốn. */
export async function deleteR2Object(cfg: R2Config, key: string): Promise<void> {
  const url = await presignR2Url(cfg, { method: 'DELETE', key, expiresIn: 60 });
  await fetch(url, { method: 'DELETE' }).catch(() => undefined);
}
