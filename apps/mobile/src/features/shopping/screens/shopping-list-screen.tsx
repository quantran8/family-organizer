/**
 * Cần mua — 05 §5.3.
 *
 * Danh sách PHẲNG. Không nhóm, không lọc, không sắp xếp tuỳ chọn. Một ô nhập cố
 * định trên cùng, và **bàn phím giữ nguyên sau khi thêm** để gõ liên tiếp: người
 * dùng đứng trong bếp nghĩ ra năm món một lúc, và mỗi lần bàn phím đóng lại là
 * một lần họ phải chạm lại vào ô nhập.
 *
 * Đây là bề mặt hằng ngày duy nhất của app (06 §4) — lý do app được mở trong
 * tuần không có sự kiện nào. Mọi thứ ở đây phải chịu được việc lặp lại vài chục
 * lần một tuần mà không làm ai bực.
 *
 * KHÔNG có màn chi tiết: một món cần mua không có gì để xem thêm.
 */

import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { EmptyState, ErrorState, ListSkeleton } from '@/design/components';
import { ShoppingRow } from '@/features/shopping/components';
import {
  useAddShoppingItem,
  useDeleteShoppingItem,
  useShoppingItems,
  useToggleShoppingItem,
} from '@/features/shopping/queries/use-shopping';
import { useT } from '@/i18n';

export function ShoppingListScreen() {
  const { t } = useT();
  const { data: items, isPending, isError, refetch, isRefetching } = useShoppingItems();

  const add = useAddShoppingItem();
  const toggle = useToggleShoppingItem();
  const remove = useDeleteShoppingItem();

  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  const submit = () => {
    const title = draft.trim();
    if (title.length === 0) return;

    // Xoá ô nhập NGAY, không chờ round-trip: đó là thứ làm thao tác cảm thấy
    // tức thì. Dòng mới hiện ra sau ~200ms và không ai thấy chậm.
    setDraft('');
    add.mutate(title);

    // Giữ bàn phím. `onSubmitEditing` mặc định đóng nó, và `blurOnSubmit={false}`
    // ở dưới lo phần đó; gọi `focus()` thêm là lưới an toàn cho Android, nơi
    // `blurOnSubmit` không phải lúc nào cũng được tôn trọng.
    inputRef.current?.focus();
  };

  return (
    <View className="flex-1">
      {/* Ô nhập CỐ ĐỊNH trên cùng, không cuộn theo danh sách: trong siêu thị,
          thêm một món là thao tác thường xuyên hơn đọc lại cả danh sách. */}
      <View className="border-b border-line bg-surface px-4 py-3">
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder={t.shopping.addPlaceholder}
          placeholderTextColor="#A4A4AD"
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={submit}
          className="min-h-touch rounded-control bg-soft px-4 text-body text-ink"
        />
      </View>

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
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        // Chạm vào danh sách trong lúc đang gõ thì đóng bàn phím — nhưng chạm
        // một ô tròn vẫn tick được (`handled` chứ không `always`).
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {(items ?? []).map((item) => (
          <ShoppingRow
            key={item.id}
            title={item.title}
            note={item.note}
            done={item.isDone}
            onToggle={(next) => toggle.mutate({ id: item.id, done: next })}
            onDelete={() => remove.mutate(item.id)}
          />
        ))}

        {!isPending && !isError && (items ?? []).length === 0 ? (
          <View className="mt-10">
            <EmptyState title={t.shopping.emptyTitle} body={t.shopping.emptyBody} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
