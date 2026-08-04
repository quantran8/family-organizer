/**
 * Khối «Người bỏ vào» — 09 §E.9.
 *
 * ĐÂY LÀ CHỖ DUY NHẤT TRONG TOÀN APP HIỆN TỔNG TIỀN THEO NGƯỜI.
 *
 * Nó hợp lệ vì và chỉ vì bốn điều kiện, và cả bốn đều phải giữ:
 *
 *   1. Nằm trong MỘT tháng, và tháng đó hiện rõ ngay phía trên khối này.
 *   2. Kèm số lần — "tổng phải kèm số lượng bản ghi".
 *   3. Sắp theo TÊN, ABC. Không theo số tiền.
 *   4. Chỉ có ở màn quỹ.
 *
 * `month` là PROP BẮT BUỘC dù component không vẽ nó ra. Đó là tầng thứ tư
 * trong bốn tầng ép ranh giới của 03 §9 ngoại lệ 2 (ba tầng kia: view có
 * `month` trong group by, repository không có chữ ký đọc nhiều tháng,
 * `summarizeFundMonth` nhận tháng bắt buộc). Không có đường nào render khối này
 * mà không có một tháng cụ thể trong tay — và một tham số không dùng tới thì
 * kiểu vẫn bắt truyền, còn một quy ước trong tài liệu thì không.
 *
 * KHÔNG BAO GIỜ VẼ Ở ĐÂY: dòng tổng cộng dồn qua các tháng · chữ "còn thiếu" /
 * "chưa góp" / "nợ quỹ" · phần trăm so với một mức chuẩn · màu cảnh báo cho
 * người bỏ vào ít hơn · thanh tiến độ so sánh hai người · biểu đồ bất kỳ.
 *
 * PHÉP THỬ KHI REVIEW: con số này có vắt qua nhiều hơn một tháng không? Có → sai.
 */

import type { FundMonthSummary, ISODate } from '@family-organizer/domain';
import { Text, View } from 'react-native';

import { MoneyText, SectionHeader } from '@/design/components';
import { useT } from '@/i18n';

export interface ContributorBlockProps {
  byContributor: FundMonthSummary['byContributor'];
  /**
   * Tháng đang xem. BẮT BUỘC — xem chú thích đầu file. Không được đổi thành
   * optional, và không được bỏ đi vì "component không dùng tới".
   */
  month: ISODate;
}

export function ContributorBlock({ byContributor, month }: ContributorBlockProps) {
  const { t, f } = useT();

  // Tháng rỗng thì không vẽ khối — một khối trống dưới nhãn "Người bỏ vào" đọc
  // như "chưa ai bỏ vào", mà thật ra là "tháng này chưa ghi gì cả".
  if (byContributor.length === 0) return null;

  return (
    <View accessibilityLabel={`${t.fund.contributors} — ${month}`}>
      <SectionHeader title={t.fund.contributors} />
      <View className="rounded-section border border-line bg-surface">
        {byContributor.map((c, i) => (
          <View
            key={c.name}
            className={
              i === 0
                ? 'min-h-touch flex-row items-center gap-3 px-4 py-3'
                : 'min-h-touch flex-row items-center gap-3 border-t border-line px-4 py-3'
            }
          >
            <Text className="flex-1 text-body text-ink" numberOfLines={1}>
              {c.name}
            </Text>
            <MoneyText amount={c.total} size="body" />
            {/* Số lần đứng SAU số tiền và nhỏ hơn: nó là ngữ cảnh của con số,
                không phải một chỉ số để so giữa hai người. */}
            <Text className="text-caption text-subtle">
              {f(t.fund.contributorTimes, { count: c.count })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
