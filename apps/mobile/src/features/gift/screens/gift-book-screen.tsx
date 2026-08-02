/**
 * Sổ mừng — 05 F12, 07 §3.
 *
 * Hai tab: từng khoản (theo NGÀY) và theo nhà. Mặc định là từng khoản vì đó là
 * thứ vừa ghi xong người ta muốn thấy lại.
 *
 * ── SẮP XẾP ──
 *
 * Mặc định THEO NGÀY, mới nhất trước. Sắp theo số tiền là một tuỳ chọn người
 * dùng phải tự bật, và kể cả khi bật thì KHÔNG có nhãn nào kiểu "mừng nhiều
 * nhất" hay "ít nhất" — chỉ có thứ tự. Xếp hạng họ hàng theo độ hào phóng là
 * thứ khiến người dùng thấy app bẩn (07 §3.4).
 *
 * ── KHÔNG CÓ Ở ĐÂY ──
 *
 * Không có cột chênh lệch đi–nhận, không có tổng "cả sổ", không có nút xuất hay
 * chia sẻ. Dữ liệu này lộ ra ngoài household là một sự cố xã hội thật.
 */

import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState, ErrorState, FAB, ListSkeleton, Segmented } from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { ContactRow, GiftEntryRow } from '@/features/gift/components';
import { useContacts, useGiftEntries, useGiftHistory } from '@/features/gift/queries/use-gifts';
import { useT } from '@/i18n';

type Tab = 'entries' | 'contacts';
type Sort = 'date' | 'amount';

export function GiftBookScreen() {
  const { t } = useT();
  const router = useRouter();
  const currency = useCurrency();

  const [tab, setTab] = useState<Tab>('entries');
  const [sort, setSort] = useState<Sort>('date');

  const entries = useGiftEntries();
  const contacts = useContacts();
  const history = useGiftHistory();

  const isPending = entries.isPending || contacts.isPending || history.isPending;
  const isError = entries.isError || contacts.isError || history.isError;

  const refetch = () => {
    void entries.refetch();
    void contacts.refetch();
    void history.refetch();
  };

  /** `contactId` → tên, để dòng khoản mừng hiện được tên nhà. */
  const nameOf = useMemo(() => {
    return new Map((contacts.data ?? []).map((c) => [c.id, c.displayName]));
  }, [contacts.data]);

  const relationOf = useMemo(() => {
    return new Map((contacts.data ?? []).map((c) => [c.id, c.relationNote]));
  }, [contacts.data]);

  /**
   * Repository đã trả theo ngày giảm dần. Chỉ đảo lại khi người dùng TỰ CHỌN
   * sắp theo tiền — và bản sao trước khi sort vì `data` của react-query là
   * cache dùng chung, sort tại chỗ sẽ làm hỏng thứ tự cho mọi màn khác đọc nó.
   */
  const sortedEntries = useMemo(() => {
    const list = entries.data ?? [];
    if (sort === 'date') return list;
    return [...list].sort((a, b) => b.amount - a.amount);
  }, [entries.data, sort]);

  const hasEntries = (entries.data ?? []).length > 0;
  const hasContacts = (history.data ?? []).length > 0;

  return (
    <View className="flex-1">
      <View className="border-b border-line bg-surface px-4 py-3">
        <Segmented<Tab>
          options={[
            { value: 'entries', label: t.gift.title },
            { value: 'contacts', label: t.gift.contactsTitle },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'entries' && hasEntries ? (
          <View className="mt-3">
            <Segmented<Sort>
              options={[
                { value: 'date', label: t.gift.sortByDate },
                // Tuỳ chọn, không bao giờ mặc định. Không có nhãn "nhiều nhất".
                { value: 'amount', label: t.gift.sortByAmount },
              ]}
              value={sort}
              onChange={setSort}
            />
          </View>
        ) : null}
      </View>

      {isError ? (
        <View className="px-4 pt-6">
          <ErrorState
            message={t.error.unknown}
            retryLabel={t.common.retry}
            onRetry={refetch}
          />
        </View>
      ) : null}

      {isPending ? (
        <View className="px-4 pt-4">
          <ListSkeleton rows={6} />
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={entries.isRefetching} onRefresh={refetch} />
        }
      >
        {tab === 'entries'
          ? sortedEntries.map((g) => (
              <GiftEntryRow
                key={g.id}
                contactName={nameOf.get(g.contactId) ?? ''}
                direction={g.direction}
                occasion={g.occasion}
                amount={g.amount}
                occurredOn={g.occurredOn}
                inKindNote={g.inKindNote}
                currency={currency}
                onPress={() => router.push(`/(modals)/gift-form?id=${g.id}`)}
              />
            ))
          : (history.data ?? []).map((h) => (
              <ContactRow
                key={h.contactId}
                history={h}
                relationNote={relationOf.get(h.contactId) ?? null}
                currency={currency}
                // Chạm một nhà = xem các khoản mừng của riêng nhà đó. KHÔNG mở
                // form sửa contact: thứ người dùng muốn khi chạm vào tên một nhà
                // là "nhà này đã đi lại thế nào", không phải "sửa tên nhà này".
                onPress={() =>
                  router.push({
                    pathname: '/(app)/gifts/[contactId]',
                    params: { contactId: h.contactId },
                  })
                }
              />
            ))}

        {!isPending && !isError && tab === 'entries' && !hasEntries ? (
          <View className="mt-10">
            <EmptyState
              title={t.gift.emptyTitle}
              body={t.gift.emptyBody}
              actionLabel={t.gift.emptyAction}
              onAction={() => router.push('/(modals)/gift-form')}
            />
          </View>
        ) : null}

        {!isPending && !isError && tab === 'contacts' && !hasContacts ? (
          <View className="mt-10">
            <EmptyState
              title={t.gift.contactsEmptyTitle}
              body={t.gift.contactsEmptyBody}
            />
          </View>
        ) : null}
      </ScrollView>

      <FAB onPress={() => router.push('/(modals)/gift-form')} />
    </View>
  );
}
