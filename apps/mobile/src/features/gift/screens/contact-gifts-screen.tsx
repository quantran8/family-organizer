/**
 * Khoản mừng của MỘT nhà — 07 §3.
 *
 * Hai chiều hiện SONG SONG trong cùng một danh sách theo thứ tự thời gian, để
 * đọc được câu chuyện: "2023 chú Ba mừng đám cưới mình, 2026 mình đi đám con
 * chú Ba."
 *
 * ── KHÔNG CÓ Ở ĐÂY, VÀ SẼ KHÔNG BAO GIỜ CÓ ──
 *
 * Không có dòng chênh lệch. Không có "còn thiếu 500k", không có "đã đi đủ",
 * không có màu nào nói bên nào nặng hơn. Dữ liệu đủ để tính — view
 * `gift_history` có cả hai tổng nằm cạnh nhau — và đó chính là lý do phải nói
 * rõ là không tính (07 §3.4).
 *
 * Hai tổng ở đầu màn đứng cạnh nhau, cùng cỡ chữ, cùng màu, không có phép toán
 * nào nối chúng lại. Người dùng tự cân; app không cân hộ.
 */

import type { UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, ListSkeleton } from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { GiftEntryRow } from '@/features/gift/components';
import { useContacts, useGiftEntries, useGiftHistory } from '@/features/gift/queries/use-gifts';
import { moneyText, useT } from '@/i18n';

export function ContactGiftsScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const currency = useCurrency();

  const params = useLocalSearchParams<{ contactId?: string }>();
  const contactId = (params.contactId ?? '') as UUID;

  const { data: contacts } = useContacts();
  const { data: history } = useGiftHistory();
  const entries = useGiftEntries(contactId);

  const contact = (contacts ?? []).find((c) => c.id === contactId) ?? null;
  const h = (history ?? []).find((x) => x.contactId === contactId) ?? null;

  return (
    <View className="flex-1">
      {entries.isError ? (
        <View className="px-4 pt-6">
          <ErrorState
            message={t.error.unknown}
            retryLabel={t.common.retry}
            onRetry={() => void entries.refetch()}
          />
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={entries.isRefetching}
            onRefresh={() => void entries.refetch()}
          />
        }
      >
        {contact ? (
          <>
            <Text className="text-title2 font-semibold text-ink">{contact.displayName}</Text>
            {contact.relationNote ? (
              <Text className="mt-1 text-body text-muted">{contact.relationNote}</Text>
            ) : null}
          </>
        ) : null}

        {/* HAI TỔNG SONG SONG. Không có phép trừ nào giữa chúng. */}
        {h ? (
          <View className="mt-4 gap-2 rounded-control bg-soft px-4 py-3">
            <View className="flex-row justify-between">
              <Text className="text-caption text-muted">{t.gift.received}</Text>
              <Text className="text-body text-ink">{moneyText(h.totalReceived, currency)}</Text>
            </View>
            <Text className="text-caption text-subtle">
              {f(t.gift.timesReceived, { count: h.timesReceived })}
            </Text>

            <View className="mt-2 flex-row justify-between">
              <Text className="text-caption text-muted">{t.gift.given}</Text>
              <Text className="text-body text-ink">{moneyText(h.totalGiven, currency)}</Text>
            </View>
            <Text className="text-caption text-subtle">
              {f(t.gift.timesGiven, { count: h.timesGiven })}
            </Text>
          </View>
        ) : null}

        {entries.isPending ? (
          <View className="pt-4">
            <ListSkeleton rows={4} />
          </View>
        ) : null}

        <View className="mt-6">
          {(entries.data ?? []).map((g) => (
            <GiftEntryRow
              key={g.id}
              contactName={contact?.displayName ?? ''}
              direction={g.direction}
              occasion={g.occasion}
              amount={g.amount}
              occurredOn={g.occurredOn}
              inKindNote={g.inKindNote}
              currency={currency}
            />
          ))}
        </View>

        {!entries.isPending && !entries.isError && (entries.data ?? []).length === 0 ? (
          <View className="mt-10">
            <EmptyState
              title={t.gift.emptyTitle}
              body={t.gift.emptyBody}
              actionLabel={t.gift.emptyAction}
              onAction={() => router.push('/(modals)/gift-form')}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
