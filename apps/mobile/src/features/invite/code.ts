/**
 * Mã mời — bảng chữ và chuẩn hoá.
 *
 * Nằm NGOÀI `repository/` có chủ ý: đây là hàm chuỗi thuần, không chạm mạng,
 * và ba tầng cần nó — UI (bóc mã từ deep link), zod schema (validate), và
 * repository (sinh mã). Để nó trong repository buộc tầng UI phải import từ đó,
 * đúng thứ eslint chặn ở 01 §2.
 *
 * Không đặt ở `packages/domain` vì domain không biết gì về khái niệm "lời mời"
 * của tầng ứng dụng — nó chỉ chứa quy tắc nghiệp vụ dùng chung với Edge.
 */

/**
 * Bỏ `0 O 1 I` — bốn ký tự người ta hay đọc nhầm cho nhau khi đọc mã qua điện
 * thoại (01 §8). 32^6 ≈ 1 tỷ tổ hợp, thừa cho một app gia đình.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const CODE_LENGTH = 6;

/**
 * Chuẩn hoá mã người dùng gõ hoặc mã bóc từ deep link (05 §3.2).
 *
 * Chỉ sửa những thứ KHÔNG THỂ SAI: viết hoa, bỏ khoảng trắng và gạch nối
 * (`redeem_invite` khớp bằng `upper(trim(code))`).
 *
 * CỐ Ý KHÔNG tự ánh xạ ký tự dễ nhầm — không đổi `0` thành `O`. `0` và `O`
 * không cùng nằm trong bảng chữ nên không có chiều nào đúng, và đoán sai một ký
 * tự có thể biến mã gõ nhầm thành một mã HỢP LỆ CỦA NHÀ KHÁC. Báo "mã không
 * đúng" rồi để họ gõ lại an toàn hơn nhiều so với đưa họ vào nhầm nhà người lạ.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase().slice(0, CODE_LENGTH);
}

/** Sinh mã mới. Chỉ repository gọi. */
export function generateInviteCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}
