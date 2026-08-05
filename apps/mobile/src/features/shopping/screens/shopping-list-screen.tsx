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
 *
 * ── Bố cục (bản dựng lại theo mockup) ──
 *
 * Cả danh sách nằm trong MỘT mảng trắng (`Section`) trên nền `canvas`, giống
 * mọi nhóm khác của app, và ô nhập nằm BÊN TRONG mảng đó ngay dưới tiêu đề.
 *
 * Ô nhập vẫn KHÔNG cuộn đi mất, nhưng lý do đổi: trước đây nó là một dải ghim
 * cứng ở đầu màn, tách khỏi danh sách bằng một đường kẻ. Giờ nó là dòng đầu
 * tiên của chính cái thẻ chứa danh sách — cùng một vật, nên "thêm món" đọc như
 * một phần của danh sách chứ không phải một thanh công cụ đứng trên nó. Danh
 * sách của một nhà hai người hiếm khi dài quá một màn, nên cuộn nó ra khỏi tầm
 * mắt gần như không xảy ra.
 */

import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  Icon,
  ICON_COLOR,
  ListSkeleton,
  Section,
} from '@/design/components';
import { ShoppingRow } from '@/features/shopping/components';
import {
  useAddShoppingItem,
  useDeleteShoppingItem,
  useShoppingItems,
  useToggleShoppingItem,
} from '@/features/shopping/queries/use-shopping';
import { useT } from '@/i18n';

export function ShoppingListScreen() {
  const { t, f } = useT();
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

  // Đếm món CHƯA mua, không đếm tổng: con số hữu ích là "còn phải mua bao
  // nhiêu", không phải "danh sách này đã từng có bao nhiêu dòng".
  const remaining = (items ?? []).filter((x) => !x.isDone).length;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-24 pt-5"
      showsVerticalScrollIndicator={false}
      // Chạm vào danh sách trong lúc đang gõ thì đóng bàn phím — nhưng chạm
      // một ô tròn vẫn tick được (`handled` chứ không `always`).
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Section>
        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-heading font-semibold tracking-[-0.4px] text-ink">
              {t.shopping.cardTitle}
            </Text>
            {/* "Cả hai cùng thêm" — nói ra rằng đây là danh sách CHUNG. Không
                có nhãn "ai thêm" trên từng dòng (06 §4), nên câu này là chỗ duy
                nhất nói điều đó, và nó nói một lần cho cả danh sách. */}
            <Text className="mt-1 text-caption text-muted">{t.shopping.cardSubtitle}</Text>
          </View>
          <View className="rounded-status bg-accent px-2.5 py-1">
            <Text className="text-micro font-semibold text-accent-ink">
              {f(t.shopping.countLabel, { count: remaining })}
            </Text>
          </View>
        </View>

        {/* Ô nhập là dòng ĐẦU TIÊN của thẻ, ngay dưới tiêu đề: trong siêu thị,
            thêm một món là thao tác thường xuyên hơn đọc lại cả danh sách. */}
        <View className="flex-row items-center gap-2 rounded-control bg-soft p-1.5">
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder={t.shopping.addPlaceholder}
            placeholderTextColor={ICON_COLOR.subtle}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={submit}
            className="min-h-touch min-w-0 flex-1 px-3 text-body text-ink"
          />
          {/* Nút gửi song song với phím Enter, không thay nó: bàn phím iOS có
              nút "Xong" nhưng bàn phím Android nhiều máy thì không, và một ô
              nhập không có cách nào để gửi ngoài một phím ẩn là một ô nhập
              trông như bị hỏng. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.common.add}
            onPress={submit}
            className="h-touch w-touch items-center justify-center rounded-control bg-action active:bg-action-pressed"
          >
            <Icon name="plus" size={20} color={ICON_COLOR.white} />
          </Pressable>
        </View>

        {isError ? (
          <View className="pt-6">
            <ErrorState
              message={t.error.unknown}
              retryLabel={t.common.retry}
              onRetry={() => void refetch()}
            />
          </View>
        ) : null}

        {isPending ? (
          <View className="pt-5">
            <ListSkeleton rows={5} />
          </View>
        ) : null}

        {(items ?? []).length > 0 ? (
          <View className="mt-5 gap-5">
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
          </View>
        ) : null}

        {/* Trạng thái rỗng ở đây KHÔNG có nút (09 §D.2) — ô nhập đã ở ngay trên,
            và một nút "Thêm món" ngay dưới một ô nhập trống là hai lời mời cho
            cùng một hành động. */}
        {!isPending && !isError && (items ?? []).length === 0 ? (
          <View className="pt-8">
            <EmptyState title={t.shopping.emptyTitle} body={t.shopping.emptyBody} />
          </View>
        ) : null}
      </Section>
    </ScrollView>
  );
}
