/**
 * Gói khởi tạo — 05 §3.4, 06 §10.
 *
 * Một danh sách tick, KHÔNG PHẢI FORM. Dưới 20 giây.
 *
 * Vì sao thứ này tồn tại dù `05 §3.3` nói "không ép nhập dữ liệu ban đầu":
 * tick một danh sách gợi ý không phải nhập liệu. Nhưng app phụ thuộc mật độ dữ
 * liệu — một household trống ngày đầu là một household chết, vì mọi màn hình
 * đều trả lời "chưa có gì" và người dùng không có cách nào thấy app làm được
 * gì cho mình.
 *
 * Vì sao danh mục nằm ở domain chứ không ở app: đây là **nội dung nghiệp vụ**
 * (nhà Việt thường có những việc gì) chứ không phải chuỗi hiển thị, và nó cần
 * được ghim bằng test — thêm một mục vào đây là một quyết định sản phẩm, không
 * phải một dòng UI. Phần CHỮ hiện lên màn hình vẫn dựng ở `i18n` theo `key`;
 * `defaultTitle` dưới đây là tiêu đề GHI VÀO DB, không phải nhãn trên nút.
 */

import type { EventKind, ISODate } from '../types/base.ts';

/** Khoá ổn định — đi vào i18n và vào test, không đổi khi sửa câu chữ. */
export type StarterPackKey =
  | 'tet'
  | 'death_anniversary'
  | 'parents_birthday'
  | 'vehicle_inspection'
  | 'vehicle_insurance'
  | 'tuition';

export interface StarterPackItem {
  key: StarterPackKey;
  /** Tiêu đề ghi vào `events.title`. Người dùng sửa được ngay sau đó. */
  defaultTitle: string;
  kind: EventKind;
  /**
   * Tick sẵn hay không (05 §3.4). Bốn mục tick sẵn là bốn thứ gần như nhà nào
   * cũng có; hai mục bỏ trống là hai thứ chỉ đúng với một phần các nhà.
   *
   * Tick sẵn HẾT sẽ là ép nhập dữ liệu bằng cách khác — người dùng bấm "Thêm
   * vào" theo quán tính rồi nhận về sáu sự kiện không phải của mình, và việc
   * đầu tiên họ làm trong app là dọn dẹp.
   */
  defaultChecked: boolean;
  /**
   * Mục cần ngày mà gói khởi tạo KHÔNG hỏi (giỗ, học phí).
   *
   * Tạo ở trạng thái chưa có ngày và hiện trong CẦN CHÚ Ý cho tới khi được bổ
   * sung (05 §3.4). Hỏi ngày ngay tại đây sẽ biến danh sách tick thành form —
   * đúng thứ mục này nói là không phải.
   */
  needsDate: boolean;
  /**
   * Ngày dương cố định hằng năm, nếu có. `null` = phải hỏi sau.
   *
   * CỐ Ý chỉ có với những mục có ngày THẬT SỰ cố định. Tết là âm lịch nên cũng
   * `null` ở đây — nó có nhánh riêng bên dưới.
   */
  fixedSolarMonthDay: { month: number; day: number } | null;
  /** Tết dùng lịch âm: mùng 1 tháng Giêng. */
  fixedLunarMonthDay: { month: number; day: number } | null;
}

/**
 * Sáu mục, đúng thứ tự hiện trên màn hình (05 §3.4).
 *
 * Thứ tự không phải ngẫu nhiên: hai mục đầu là hai thứ mang tính nghi lễ (thứ
 * khiến app này khác một app to-do), bốn mục sau là những khoản có hạn. Đảo
 * lại thành "việc hành chính trước" làm màn hình đầu tiên của một app về gia
 * đình đọc như một danh sách đóng phí.
 */
export const STARTER_PACK_ITEMS: readonly StarterPackItem[] = [
  {
    key: 'tet',
    defaultTitle: 'Tết Nguyên đán',
    kind: 'holiday',
    defaultChecked: true,
    needsDate: false,
    fixedSolarMonthDay: null,
    fixedLunarMonthDay: { month: 1, day: 1 },
  },
  {
    key: 'death_anniversary',
    defaultTitle: 'Giỗ',
    kind: 'death_anniversary',
    // Bỏ trống: nhà nào cũng có giỗ, nhưng giỗ AI thì app không đoán được, và
    // một sự kiện tên "Giỗ" không ngày không người là một dòng vô nghĩa.
    defaultChecked: false,
    needsDate: true,
    fixedSolarMonthDay: null,
    fixedLunarMonthDay: null,
  },
  {
    key: 'parents_birthday',
    defaultTitle: 'Sinh nhật bố mẹ hai bên',
    kind: 'birthday',
    defaultChecked: true,
    needsDate: true,
    fixedSolarMonthDay: null,
    fixedLunarMonthDay: null,
  },
  {
    key: 'vehicle_inspection',
    defaultTitle: 'Đăng kiểm xe',
    kind: 'other',
    defaultChecked: true,
    needsDate: true,
    fixedSolarMonthDay: null,
    fixedLunarMonthDay: null,
  },
  {
    key: 'vehicle_insurance',
    defaultTitle: 'Bảo hiểm xe',
    kind: 'other',
    defaultChecked: true,
    needsDate: true,
    fixedSolarMonthDay: null,
    fixedLunarMonthDay: null,
  },
  {
    key: 'tuition',
    defaultTitle: 'Học phí',
    kind: 'school',
    defaultChecked: false,
    needsDate: true,
    fixedSolarMonthDay: null,
    fixedLunarMonthDay: null,
  },
];

/**
 * Hình dạng một sự kiện sắp được tạo từ gói khởi tạo.
 *
 * CỐ Ý không dùng `EventInput` của mobile: domain không biết kiểu đó (nó nằm ở
 * `features/event/repository`), và chiều phụ thuộc phải là app → domain. Chỗ
 * gọi ở app map sang `EventInput` — map đó là một phép gán thẳng.
 */
export interface StarterPackDraft {
  key: StarterPackKey;
  title: string;
  kind: EventKind;
  calendar: 'solar' | 'lunar';
  solarDate: ISODate | null;
  lunarDay: number | null;
  lunarMonth: number | null;
  /** true → tạo không ngày, hiện ở CẦN CHÚ Ý cho tới khi bổ sung. */
  needsDate: boolean;
}

export function starterPackItem(key: StarterPackKey): StarterPackItem | null {
  return STARTER_PACK_ITEMS.find((i) => i.key === key) ?? null;
}

/** Các mục tick sẵn — trạng thái ban đầu của màn hình. */
export function defaultCheckedKeys(): StarterPackKey[] {
  return STARTER_PACK_ITEMS.filter((i) => i.defaultChecked).map((i) => i.key);
}

/**
 * Dựng danh sách sự kiện sẽ tạo từ những mục người dùng đã tick.
 *
 * Hàm thuần, không I/O, `today` là tham số — chỗ gọi quyết định "năm nay" là
 * năm nào. Trả về theo đúng thứ tự trong danh mục chứ không theo thứ tự tick:
 * thứ tự tick là ngẫu nhiên theo ngón tay, còn thứ tự danh mục là thứ tự đã
 * cân nhắc.
 *
 * Mục `needsDate` vẫn được tạo — KHÔNG bị lọc bỏ. Đó là toàn bộ ý của
 * `05 §3.4`: một sự kiện chưa có ngày hiện ở CẦN CHÚ Ý là một lời nhắc còn
 * sống, còn không tạo gì cả thì thứ người dùng vừa tick biến mất không dấu vết.
 */
export function buildStarterPack(
  selected: readonly StarterPackKey[],
  today: ISODate,
): StarterPackDraft[] {
  const picked = new Set(selected);
  const year = Number(today.slice(0, 4));

  return STARTER_PACK_ITEMS.filter((i) => picked.has(i.key)).map((i) => {
    if (i.fixedLunarMonthDay) {
      return {
        key: i.key,
        title: i.defaultTitle,
        kind: i.kind,
        calendar: 'lunar' as const,
        solarDate: null,
        lunarDay: i.fixedLunarMonthDay.day,
        lunarMonth: i.fixedLunarMonthDay.month,
        needsDate: false,
      };
    }

    if (i.fixedSolarMonthDay) {
      const { month, day } = i.fixedSolarMonthDay;
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return {
        key: i.key,
        title: i.defaultTitle,
        kind: i.kind,
        calendar: 'solar' as const,
        solarDate: `${year}-${mm}-${dd}`,
        lunarDay: null,
        lunarMonth: null,
        needsDate: false,
      };
    }

    return {
      key: i.key,
      title: i.defaultTitle,
      kind: i.kind,
      calendar: 'solar' as const,
      solarDate: null,
      lunarDay: null,
      lunarMonth: null,
      needsDate: true,
    };
  });
}
