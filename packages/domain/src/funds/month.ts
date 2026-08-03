/**
 * Quỹ chung — gom theo tháng. 03 §6b.
 *
 * TOÀN BỘ MODULE NÀY TỒN TẠI DƯỚI MỘT RÀNG BUỘC DUY NHẤT:
 *
 *   Mọi phép gom theo người phải nằm trong phạm vi ĐÚNG MỘT THÁNG.
 *
 * Đây là ngoại lệ thứ hai và cuối cùng của lệnh cấm "tổng tiền theo người"
 * (03 §9). Nó an toàn vì và chỉ vì cửa sổ thời gian:
 *
 *   "Tháng này anh bỏ 5tr, em bỏ 5tr"   -> câu GHI CHÉP. Đóng lại cuối tháng.
 *   "Tính tới nay anh 180tr, em 60tr"   -> câu PHÁN XÉT. Không bao giờ đóng.
 *
 * Cùng dữ liệu, khác hoàn toàn về việc nó dùng để làm gì. Giữa vợ chồng không
 * có cơ chế tất toán nào để xoá một con số cộng dồn, và đến lúc nào đó nó sẽ
 * được đem ra dùng. Đó là khác biệt giữa một cuốn sổ và một bản cáo trạng.
 *
 * CHỮ KÝ HÀM LÀ CHỖ RANH GIỚI ĐƯỢC ÉP: `summarizeFundMonth` nhận `month` là
 * tham số BẮT BUỘC, và không có hàm nào ở đây nhận khoảng thời gian. Thêm một
 * hàm như thế là mở đúng cánh cửa mà cả module này đóng — test
 * `fund.test.ts` đóng băng danh sách export để bắt việc đó.
 *
 * KHÔNG BAO GIỜ THÊM: summarizeFundAllTime, contributorTotals(entries) thiếu
 * tháng, fundBalanceSeries, và mọi hàm trả về số dư nợ giữa hai người.
 */

import type { ISODate } from '../types/base.ts';
import type { FundEntry } from '../types/entities.ts';
import type { FundMonthSummary } from '../types/views.ts';

/** Tên hiện thay cho khoản không ghi tên. Không bỏ khoản đó đi — tiền vẫn vào quỹ. */
export const UNNAMED_CONTRIBUTOR = '(không ghi tên)';

/** 'YYYY-MM' của một ngày. Gom theo cả năm lẫn tháng: cùng tháng khác năm là hai nhóm. */
function monthKeyOf(d: ISODate): string {
  return d.slice(0, 7);
}

/**
 * Gom các khoản của ĐÚNG MỘT tháng.
 *
 * `month` nhận bất kỳ ngày nào trong tháng cần xem — hàm tự lấy 'YYYY-MM'. Trả
 * về một summary rỗng (không phải null) khi tháng đó chưa có khoản nào: màn
 * hình vẫn phải vẽ được bộ chọn tháng và dòng "chưa ghi khoản nào".
 */
export function summarizeFundMonth(entries: FundEntry[], month: ISODate): FundMonthSummary {
  const key = monthKeyOf(month);
  const inMonth = entries.filter((e) => monthKeyOf(e.occurredOn) === key);

  let deposits = 0;
  let withdrawals = 0;
  // Gom theo TÊN, không theo contributorMemberId: người bỏ tiền vào quỹ không
  // nhất thiết là member (bố mẹ đưa, em ruột góp), và memberId chỉ để prefill.
  const byName = new Map<string, { total: number; count: number }>();

  for (const e of inMonth) {
    if (e.kind === 'deposit') {
      deposits += e.amount;

      // CHỈ 'deposit' vào khối người đóng góp. Rút tiền khỏi quỹ không hỏi ai
      // rút — tiền đã vào quỹ là tiền chung, và ghi tên người rút là mở đúng
      // cánh cửa vừa đóng ở trên.
      const name = e.contributorName?.trim() || UNNAMED_CONTRIBUTOR;
      const cur = byName.get(name);
      if (cur) {
        cur.total += e.amount;
        cur.count += 1;
      } else {
        byName.set(name, { total: e.amount, count: 1 });
      }
    } else {
      withdrawals += e.amount;
    }
  }

  const byContributor = [...byName].map(([name, v]) => ({
    name,
    total: v.total,
    count: v.count,
  }));

  // Sắp THEO TÊN, ABC — không theo số tiền. Sắp theo tiền là một bảng xếp hạng,
  // và xếp hạng hai vợ chồng là thứ cả spec này tránh. ABC là thứ tự duy nhất
  // không mang thông điệp nào.
  byContributor.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return {
    month: `${key}-01`,
    deposits,
    withdrawals,
    net: deposits - withdrawals,
    // Số lượng bản ghi là BẮT BUỘC ở mọi chỗ hiển thị tổng — 03 §12.
    entryCount: inMonth.length,
    byContributor,
  };
}

/**
 * Những tháng có bản ghi, mới nhất trước.
 *
 * Dùng để dựng bộ chọn tháng — KHÔNG phải để lặp qua rồi cộng lại. Cộng kết quả
 * của nhiều tháng chính là thứ ngoại lệ 03 §9 cấm; nếu thấy code gọi hàm này
 * rồi map sang summarizeFundMonth và reduce, đó là một hồi quy.
 */
export function fundMonthsPresent(entries: FundEntry[]): ISODate[] {
  const keys = new Set<string>();
  for (const e of entries) keys.add(monthKeyOf(e.occurredOn));
  return [...keys].sort((a, b) => b.localeCompare(a)).map((k) => `${k}-01`);
}
