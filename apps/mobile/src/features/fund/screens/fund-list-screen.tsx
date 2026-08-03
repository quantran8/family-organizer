/**
 * Quỹ chung — danh sách, 05 §6.9.
 *
 * Tiền nhà, ăn uống, điện nước của cặp ở riêng. Đáng theo dõi vì TẦN SUẤT NHẬP
 * CỰC THẤP: 2-4 lần một tháng, không phải 200 — nên nó không kéo sản phẩm về
 * phía app thu chi.
 *
 * Nhãn thời gian dùng chữ «Ghi lần cuối …», KHÔNG dùng câu của tài sản. Số dư
 * quỹ là TỔNG CỦA NHỮNG KHOẢN ĐÃ GHI, khác `assets.currentValue` vốn là một con
 * số một người nói ra tại một thời điểm. Dùng lại câu chữ của tài sản ở đây là
 * nói sai bản chất dữ liệu.
 */

import { formatDeclaredAt, type Fund } from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  ICON_COLOR,
  ListSkeleton,
  MoneyText,
  Toast,
} from '@/design/components';
import { useFunds } from '@/features/fund/queries/use-funds';
import { fundRecordedAtText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function FundListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: funds, isPending, isError, refetch } = useFunds();

  if (isPending) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ListSkeleton rows={3} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const list = funds ?? [];

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View className="mt-6">
            <EmptyState
              title={t.fund.emptyTitle}
              body={t.fund.emptyBody}
              actionLabel={t.fund.emptyAction}
              onAction={() => router.push('/(modals)/fund-form')}
            />
          </View>
        ) : (
          list.map((fund) => (
            <FundRow
              key={fund.id}
              fund={fund}
              whenLabel={fundRecordedAtText(formatDeclaredAt(fund.asOfDate, null, today))}
              onPress={() => router.push(`/(app)/money/fund/${fund.id}`)}
            />
          ))
        )}

        {list.length > 0 ? (
          <View className="mt-8">
            <Button
              label={t.fund.emptyAction}
              variant="secondary"
              onPress={() => router.push('/(modals)/fund-form')}
            />
          </View>
        ) : null}
      </ScrollView>

      <Toast />
    </View>
  );
}

function FundRow({
  fund,
  whenLabel,
  onPress,
}: {
  fund: Fund;
  whenLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fund.name}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line py-4 active:bg-soft"
    >
      <View className="flex-1">
        <Text numberOfLines={1} className="text-body text-ink">
          {fund.name}
        </Text>
        {/* Nhãn thời gian là BẮT BUỘC, không ngoại lệ — ràng buộc #4. */}
        <Text className="text-micro text-subtle">{whenLabel}</Text>
      </View>
      <MoneyText amount={fund.currentAmount} size="body" />
      <Icon name="chevron" color={ICON_COLOR.subtle} />
    </Pressable>
  );
}
