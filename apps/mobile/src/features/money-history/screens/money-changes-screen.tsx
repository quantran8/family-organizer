/**
 * Lịch sử biến động — 05 §6.8, timeline chung của `money_events` gộp theo THÁNG.
 *
 * Đây là màn hình khiến người không giữ tiền cảm thấy nắm tình hình: niềm tin
 * đến từ việc THẤY ĐƯỢC THAY ĐỔI, không phải từ con số hiện tại.
 *
 * Tầng lịch sử thứ hai, khác `history.tsx`:
 *   `money_snapshots` = tổng của CẢ NHÀ theo mốc thời gian.
 *   `money_events`    = thay đổi của TỪNG KHOẢN.
 * Cần cả hai, và chúng trả lời hai câu khác nhau: *"nhà mình đang khá hơn hay
 * kém đi?"* và *"cái gì vừa đổi?"*.
 *
 * ── LIỆT KÊ THÌ TRUNG THỰC KHI THIẾU. CỘNG TỔNG THÌ KHÔNG. (08 §1.2) ──
 *
 * Một dòng *"Sửa xe −2.000.000 ₫ · 15/9"* vẫn đúng dù nhà mình còn mười khoản
 * khác chưa ghi — nó không tự nhận là đầy đủ. Một con số *"Tháng 9 chi 12
 * triệu"* thì tự nhận là đầy đủ, và sẽ sai 30–40% mãi mãi.
 *
 * Vì thế dòng tổng tháng ở đây BẮT BUỘC kèm số lượng bản ghi và chữ "đã ghi",
 * và vì thế màn này **không bao giờ có biểu đồ**. Khi vẽ tổng theo tháng thành
 * một đường, tháng nào hai người bận và quên ghi sẽ trông y hệt một tháng tiết
 * kiệm — app vừa nói dối một cách rất thuyết phục. Danh sách không có vấn đề đó
 * vì không ai nhìn một danh sách rồi kết luận nó đầy đủ.
 *
 * Cũng cấm: so sánh giữa các kỳ ("nhiều hơn tháng trước 20%"), phân loại chi
 * tiêu theo danh mục, và tổng hợp theo người (08 §1.4).
 *
 * **RÀNG BUỘC #1 áp ở đây rõ hơn bất cứ màn nào khác trong app.** Bộ lọc là
 * theo LOẠI KHOẢN (tài sản · nợ · khoản trả · mục tiêu), và sẽ không bao giờ có
 * bộ lọc theo người. `actorDisplayName` hiện ở cấp TỪNG DÒNG như một mẩu ngữ
 * cảnh ("Chồng cập nhật"), không bao giờ là một chiều để gộp, đếm, hay lọc.
 * Query key ở `keys.ts` cũng cố ý không có chỗ cho `actorProfileId`.
 *
 * **Chỉ đọc.** `money_events` append-only — DB có trigger chặn update/delete, và
 * repository cũng không có phương thức ghi. Không nút nào ở đây sửa hay xoá
 * lịch sử; sửa sai bằng cách cập nhật lại giá trị qua thao tác bình thường.
 */

import { describeMoneyEvent, type MoneyEntityType } from '@family-organizer/domain';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { ChipSelect, EmptyState, ErrorState, ListSkeleton } from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useMoneyEventTimeline } from '@/features/money-history/queries/use-money-events';
import { deltaText, fullSolarDate, moneyEventText, monthLabelText, useT, type Dictionary } from '@/i18n';
import { useToday } from '@/lib/use-today';

/**
 * Bốn loại khoản `money_events` chấp nhận — schema §5.5 check constraint.
 *
 * Khai một chỗ rồi sinh chip từ đó, không gõ tay bốn chip: thêm một loại vào
 * `MoneyEntityType` mà quên thêm chip thì cả một mảng lịch sử biến mất khỏi màn
 * này mà không có lỗi nào — bộ lọc "Tất cả" vẫn hiện nó, nên không ai để ý.
 */
const ENTITY_TYPES: readonly MoneyEntityType[] = ['asset', 'debt', 'upcoming_payment', 'goal'];

/** Nhãn cho từng loại. Ánh xạ tường minh để `t` không phải đoán theo tên khoá. */
const ENTITY_LABEL: Record<MoneyEntityType, (t: Dictionary) => string> = {
  asset: (t) => t.asset.title,
  debt: (t) => t.debt.title,
  upcoming_payment: (t) => t.payment.title,
  goal: (t) => t.goal.title,
};

export function MoneyChangesScreen() {
  const { t, f } = useT();
  const today = useToday();
  const currency = useCurrency();

  const [entityType, setEntityType] = useState<MoneyEntityType | null>(null);

  const {
    data: groups,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMoneyEventTimeline(entityType ?? undefined);

  const filter = (
    <View className="px-4 pt-3">
      <ChipSelect
        scroll
        value={entityType}
        onChange={setEntityType}
        options={[
          { value: null, label: t.common.all },
          ...ENTITY_TYPES.map((k) => ({
            value: k as MoneyEntityType | null,
            label: ENTITY_LABEL[k](t),
          })),
        ]}
      />
    </View>
  );

  if (isError) {
    return (
      <View className="flex-1 bg-white px-4">
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {filter}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          // Cuộn tới gần đáy thì nạp trang kế. Phân trang theo con trỏ NGÀY
          // (không phải offset) — offset trượt khi có event mới ghi vào giữa
          // lúc đang cuộn, và người dùng sẽ thấy một dòng lặp lại hai lần.
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const nearBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
          if (nearBottom && hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
      >
        {isPending ? <ListSkeleton rows={5} /> : null}

        {!isPending && (groups ?? []).length === 0 ? (
          <EmptyState title={t.money.changesEmptyTitle} body={t.money.changesEmptyBody} />
        ) : null}

        {(groups ?? []).map((g) => (
          <View key={g.month} className="mt-6">
            {/* ── DÒNG TỔNG THÁNG ──
                BẮT BUỘC đủ hai thứ: số lượng bản ghi và chữ "đã ghi" (08 §1.3).

                Đây là đường phân giới của cả màn hình. "5 khoản nhà mình đã ghi:
                −12 triệu" đúng theo đúng nghĩa đen của nó, kể cả khi nhà mình còn
                mười khoản khác chưa ghi — nó không tự nhận là đầy đủ. Bỏ `count`
                đi thì câu còn lại là "tháng 9: −12 triệu", và câu đó TỰ NHẬN là
                bức tranh đầy đủ, sẽ sai 30–40% mãi mãi.

                Nếu có lúc nào cần rút gọn dòng này cho gọn: rút phần khác, đừng
                rút `count`. */}
            <View className="mb-1 flex-row items-end justify-between gap-3">
              <View className="flex-1">
                <Text className="text-label font-semibold uppercase text-muted">
                  {monthLabelText(g.month, today)}
                </Text>
                <Text className="mt-0.5 text-caption text-subtle">
                  {f(t.money.monthlyRecorded, { count: g.count })}
                </Text>
              </View>
              {/* Không tô màu theo dấu, không vẽ thành đường: chỉ danh sách và
                  một con số có nhãn. Xem chú thích đầu file. */}
              <Text
                className="text-heading font-semibold text-ink"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {deltaText(g.total, currency)}
              </Text>
            </View>

            {g.items.map((e) => {
              const shape = describeMoneyEvent(e);
              return (
                <View
                  key={e.id}
                  className="min-h-touch flex-row items-center gap-3 border-b border-line py-3"
                >
                  <View className="flex-1">
                    {/* Tên khoản trước, thay đổi sau. Người dùng quét cột trái
                        để tìm "sổ tiết kiệm", không để tìm "220 triệu". */}
                    <Text numberOfLines={1} className="text-body text-ink">
                      {e.entityTitle ?? t.error.notFound}
                    </Text>
                    <Text className="mt-0.5 text-caption text-muted">
                      {moneyEventText(shape, currency)}
                    </Text>
                    <Text className="mt-0.5 text-micro text-subtle">
                      {[
                        fullSolarDate(e.occurredOn),
                        // Người thực hiện — NGỮ CẢNH ở cấp dòng, không phải một
                        // chiều để gộp. Xem ràng buộc #1 ở đầu file.
                        e.actorDisplayName
                          ? f(t.money.changeBy, { name: e.actorDisplayName })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {e.note ? (
                      <Text className="mt-0.5 text-caption text-muted">{e.note}</Text>
                    ) : null}
                  </View>

                  {/* Chênh lệch không tô màu theo dấu — đây là bức tranh, không
                      phải điểm số (design.md §3.4). */}
                  {e.delta !== null ? (
                    <Text
                      className="text-body text-muted"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {deltaText(e.delta, currency)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

        {isFetchingNextPage ? (
          <View className="py-6">
            <ActivityIndicator size="small" color="#6257F6" />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

