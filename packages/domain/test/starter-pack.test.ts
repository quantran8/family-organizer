import { describe, expect, it } from 'vitest';

import {
  buildStarterPack,
  defaultCheckedKeys,
  STARTER_PACK_ITEMS,
  starterPackItem,
  type StarterPackKey,
} from '../src/onboarding/starter-pack.js';

const TODAY = '2026-08-01';

describe('danh mục gói khởi tạo (05 §3.4)', () => {
  it('đúng sáu mục, đúng thứ tự spec', () => {
    expect(STARTER_PACK_ITEMS.map((i) => i.key)).toEqual([
      'tet',
      'death_anniversary',
      'parents_birthday',
      'vehicle_inspection',
      'vehicle_insurance',
      'tuition',
    ]);
  });

  it('KHÔNG tick sẵn hết — tick hết là ép nhập dữ liệu bằng cách khác', () => {
    // Người dùng bấm "Thêm vào" theo quán tính rồi nhận về sáu sự kiện không
    // phải của mình, và việc đầu tiên họ làm trong app là dọn dẹp.
    const checked = defaultCheckedKeys();
    expect(checked.length).toBeGreaterThan(0);
    expect(checked.length).toBeLessThan(STARTER_PACK_ITEMS.length);
  });

  it('giỗ và học phí bỏ trống, bốn mục còn lại tick sẵn', () => {
    expect(defaultCheckedKeys()).toEqual([
      'tet',
      'parents_birthday',
      'vehicle_inspection',
      'vehicle_insurance',
    ]);
  });

  it('starterPackItem tra được và trả null cho khoá lạ', () => {
    expect(starterPackItem('tet')?.defaultTitle).toBe('Tết Nguyên đán');
    expect(starterPackItem('khong_co' as StarterPackKey)).toBeNull();
  });
});

describe('buildStarterPack', () => {
  it('không tick gì → không tạo gì', () => {
    expect(buildStarterPack([], TODAY)).toEqual([]);
  });

  it('Tết là ÂM lịch mùng 1 tháng Giêng, không phải một ngày dương cố định', () => {
    const [tet] = buildStarterPack(['tet'], TODAY);
    expect(tet).toMatchObject({
      calendar: 'lunar',
      lunarDay: 1,
      lunarMonth: 1,
      solarDate: null,
      needsDate: false,
    });
  });

  it('mục cần ngày VẪN được tạo, ở trạng thái chưa có ngày', () => {
    // 05 §3.4: tạo rồi hiện ở CẦN CHÚ Ý cho tới khi bổ sung. Lọc bỏ chúng thì
    // thứ người dùng vừa tick biến mất không dấu vết.
    const drafts = buildStarterPack(['death_anniversary', 'tuition'], TODAY);
    expect(drafts).toHaveLength(2);
    for (const d of drafts) {
      expect(d.needsDate).toBe(true);
      expect(d.solarDate).toBeNull();
      expect(d.lunarDay).toBeNull();
    }
  });

  it('trả theo thứ tự DANH MỤC, không theo thứ tự tick', () => {
    // Thứ tự tick là ngẫu nhiên theo ngón tay; thứ tự danh mục đã được cân nhắc.
    const drafts = buildStarterPack(['tuition', 'tet', 'vehicle_inspection'], TODAY);
    expect(drafts.map((d) => d.key)).toEqual(['tet', 'vehicle_inspection', 'tuition']);
  });

  it('bỏ qua khoá lạ thay vì ném', () => {
    const drafts = buildStarterPack(['tet', 'khong_co' as StarterPackKey], TODAY);
    expect(drafts.map((d) => d.key)).toEqual(['tet']);
  });

  it('tick trùng một khoá vẫn chỉ tạo một sự kiện', () => {
    // Màn hình dùng Set nên khó xảy ra, nhưng hàm này không được tin chỗ gọi:
    // hai dòng "Đăng kiểm xe" giống hệt nhau là thứ người dùng phải tự xoá.
    const drafts = buildStarterPack(['tet', 'tet'], TODAY);
    expect(drafts).toHaveLength(1);
  });

  it('tick hết thì tạo đủ sáu', () => {
    const all = STARTER_PACK_ITEMS.map((i) => i.key);
    expect(buildStarterPack(all, TODAY)).toHaveLength(6);
  });

  it('tiêu đề ghi vào DB là tiếng Việt có dấu, sửa được sau', () => {
    const [tet] = buildStarterPack(['tet'], TODAY);
    expect(tet?.title).toBe('Tết Nguyên đán');
  });
});
