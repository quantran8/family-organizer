/**
 * Chiều cao · cân nặng — 07 §4.3.
 *
 * GHI VÀ VẼ. KHÔNG DIỄN GIẢI.
 *
 * ── THỨ TUYỆT ĐỐI KHÔNG ĐƯỢC THÊM VÀO MÀN NÀY ──
 *
 * Không bách phân vị. Không đường chuẩn WHO. Không màu xanh đỏ theo giá trị.
 * Không mũi tên tăng giảm. Không câu nào nhận xét về con số.
 *
 * Lý do không phải là "chưa làm kịp": bố mẹ mới rất dễ lo lắng, và một nhãn đỏ
 * do app tự tính sẽ gây hoảng mà không giúp được gì. Việc đánh giá thuộc về bác
 * sĩ. Nếu sau này có nhu cầu thật về đường chuẩn, đó là quyết định cần người có
 * chuyên môn tham gia — không phải một PR thêm thư viện biểu đồ.
 *
 * Vì thế màn này là một DANH SÁCH, không phải một biểu đồ có trục chuẩn: danh
 * sách không có chỗ nào để lén đặt một đường tham chiếu vào.
 */

import type { UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, FAB, ListSkeleton } from '@/design/components';
import { useChildGrowth } from '@/features/child/queries/use-child';
import { fullSolarDate, useT } from '@/i18n';

export function ChildGrowthScreen() {
  const { t } = useT();
  const router = useRouter();

  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = (params.memberId ?? '') as UUID;

  const { data, isPending, isError, refetch, isRefetching } = useChildGrowth(memberId);

  // Mới nhất trước để đọc: repository trả cũ → mới (thứ tự của trục thời gian),
  // nhưng người mở màn hình này muốn thấy lần đo gần nhất trước tiên.
  const rows = [...(data ?? [])].reverse();

  return (
    <View className="flex-1">
      {isError ? (
        <View className="px-4 pt-6">
          <ErrorState
            message={t.error.unknown}
            retryLabel={t.common.retry}
            onRetry={() => void refetch()}
          />
        </View>
      ) : null}

      {isPending ? (
        <View className="px-4 pt-4">
          <ListSkeleton rows={5} />
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {rows.map((g) => (
          <View
            key={g.id}
            className="min-h-touch flex-row items-center justify-between border-b border-line py-3"
          >
            <Text className="text-body text-ink">{fullSolarDate(g.measuredOn)}</Text>
            {/* Hai con số cạnh nhau, KHÔNG có nhận xét nào bên cạnh. */}
            <Text className="text-body text-ink">
              {[
                g.heightCm === null ? null : `${g.heightCm} cm`,
                g.weightKg === null ? null : `${g.weightKg} kg`,
              ]
                .filter((s) => s !== null)
                .join(' · ')}
            </Text>
          </View>
        ))}

        {!isPending && !isError && rows.length === 0 ? (
          <View className="mt-10">
            <EmptyState
              title={t.child.growthEmptyTitle}
              body={t.child.growthEmptyBody}
              actionLabel={t.child.addGrowth}
              onAction={() => router.push(`/(modals)/growth-form?memberId=${memberId}`)}
            />
          </View>
        ) : null}
      </ScrollView>

      <FAB onPress={() => router.push(`/(modals)/growth-form?memberId=${memberId}`)} />
    </View>
  );
}
