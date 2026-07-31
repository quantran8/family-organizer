/**
 * Danh sách Giấy tờ — 05 §7.1.
 *
 * Sắp theo ngày hết hạn gần nhất. Lọc: Tất cả · Sắp hết hạn · Không có hạn.
 *
 * ── **CHỈ tải thumbnail, không bao giờ tải bản gốc** (01 §6) ──
 *
 * Ràng buộc của màn này, và không phải tối ưu băng thông đơn thuần: một danh
 * sách tự tải mười bản scan hộ chiếu đầy đủ để lại mười bản sao trong cache đĩa
 * của máy — cho một thứ người dùng chỉ định liếc qua. Bản gốc chỉ được ký khi
 * người dùng thật sự mở một file ra xem, ở màn chi tiết.
 *
 * Repository đã ép điều này ở tầng dưới: câu select của `list` cố ý KHÔNG lấy
 * cột `r2_key`. `useFileUrls(..., 'thumb')` ở đây là vế còn lại.
 *
 * ── Dòng, KHÔNG phải thẻ (design.md §8) ──
 *
 * *"Lists use spacing and dividers, not cards."* Spec 05 §7.1 viết "lưới
 * thumbnail hoặc danh sách (đổi được)", nhưng một lưới thẻ lặp lại là đúng thứ
 * design.md cấm — và ở đây nó còn sai về nội dung: thứ người dùng cần đọc là
 * **hạn** và **chỗ để bản giấy**, hai dòng chữ. Một lưới ảnh đặt ảnh lên làm
 * thông tin chính, trong khi phần lớn giấy tờ sẽ không có ảnh nào.
 *
 * ── "Sắp hết hạn" báo bằng CHỮ, không chỉ bằng màu (§19) ──
 *
 * *"Status is not communicated by color alone."* Nhãn "Còn 5 ngày" tự nó đã
 * nói đủ; màu `attention` chỉ để mắt tìm thấy nó nhanh hơn khi lướt.
 *
 * ── Bộ lọc "Theo người" / "Theo loại" của spec: CHƯA làm ──
 *
 * Hai cái đó cần một lớp chọn thứ hai (chọn ai / chọn loại nào) và chỉ có nghĩa
 * khi nhà đã có vài chục giấy tờ. Ba nút hiện tại là ba trạng thái toàn cục,
 * không cần lớp thứ hai nào.
 */

import { formatDueLabel, type FamilyDocument, type UUID } from '@family-organizer/domain';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Segmented,
  Toast,
} from '@/design/components';
import { useDocuments } from '@/features/document/queries/use-documents';
import { useFileUrls } from '@/features/document/queries/use-file-urls';
import type { DocumentFilter } from '@/features/document/repository';
import { useMembers } from '@/features/member/queries/use-members';
import { dueLabelText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useUIPrefs } from '@/stores/ui-prefs';

/** Trùng `EXPIRING_WINDOW_DAYS` ở repository — nhãn amber bật ở cùng ngưỡng. */
const EXPIRING_DAYS = 30;

export function DocumentListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const filter = useUIPrefs((s) => s.docFilter);
  const setDocFilter = useUIPrefs((s) => s.setDocFilter);

  const { data: docs, isPending, isError, refetch } = useDocuments(filter, today);
  const { data: members } = useMembers();

  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  /**
   * MỘT thumbnail cho mỗi giấy tờ — trang đầu.
   *
   * Không xin URL cho mọi file: một hợp đồng thuê nhà 6 trang chỉ hiện một ô ở
   * đây, nên năm chữ ký kia là năm lần ký không ai nhìn tới.
   */
  const firstFileIds = useMemo(
    () => (docs ?? []).map((d) => d.files[0]?.id).filter((x): x is UUID => x !== undefined),
    [docs],
  );
  const thumbUrls = useFileUrls(firstFileIds, 'thumb');

  const filterOptions: { value: DocumentFilter; label: string }[] = [
    { value: 'all', label: t.doc.filterAll },
    { value: 'expiring', label: t.doc.filterExpiring },
    { value: 'no_expiry', label: t.doc.filterNoExpiry },
  ];

  const header = (
    <View className="px-4 pb-2 pt-4">
      <Segmented options={filterOptions} value={filter} onChange={setDocFilter} />
    </View>
  );

  if (isPending) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="px-4">
          <ListSkeleton rows={5} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="px-4">
          <ErrorState
            message={t.error.unknown}
            retryLabel={t.common.retry}
            onRetry={() => void refetch()}
          />
        </View>
      </View>
    );
  }

  const rows = docs ?? [];

  return (
    <View className="flex-1 bg-white">
      {header}

      {rows.length === 0 ? (
        <EmptyState
          title={t.doc.emptyTitle}
          body={t.doc.emptyBody}
          actionLabel={t.doc.formTitle}
          onAction={() => router.push('/(modals)/doc-form')}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-12"
          showsVerticalScrollIndicator={false}
        >
          {rows.map((d) => (
            <DocumentRow
              key={d.id}
              doc={d}
              today={today}
              ownerName={d.ownerMemberId ? (memberName.get(d.ownerMemberId) ?? null) : null}
              thumbUrl={d.files[0] ? (thumbUrls[d.files[0].id] ?? null) : null}
              onPress={() => router.push({ pathname: '/(app)/docs/[id]', params: { id: d.id } })}
            />
          ))}

          <View className="mt-8">
            <Button
              label={t.doc.formTitle}
              variant="secondary"
              onPress={() => router.push('/(modals)/doc-form')}
            />
          </View>
        </ScrollView>
      )}

      <Toast />
    </View>
  );
}

/**
 * Một giấy tờ — hai dòng chữ và một ô ảnh nhỏ.
 *
 * Dòng phụ gộp hạn + người sở hữu; dòng thứ ba là chỗ để bản giấy. Đó là thứ
 * Google Drive không làm được (05 §7.2), nên nó có mặt ngay ở danh sách chứ
 * không đợi tới màn chi tiết — và khi CHƯA ghi thì hiện lời mời ghi, không phải
 * một dòng trống.
 */
function DocumentRow({
  doc,
  today,
  ownerName,
  thumbUrl,
  onPress,
}: {
  doc: FamilyDocument;
  today: string;
  ownerName: string | null;
  thumbUrl: string | null;
  onPress: () => void;
}) {
  const { t } = useT();

  const dueLabel = doc.expiryDate ? formatDueLabel(doc.expiryDate, today) : null;
  // CHỈ khoảng sắp tới mới tô màu, không tô thứ đã quá hạn từ lâu: "hộ chiếu
  // hết hạn 2019" không còn là việc gấp, và tô nó cùng màu với "còn 5 ngày" làm
  // màu mất hết ý nghĩa.
  const isExpiringSoon =
    dueLabel !== null &&
    ((dueLabel.kind === 'in_days' && dueLabel.days <= EXPIRING_DAYS) ||
      dueLabel.kind === 'today' ||
      dueLabel.kind === 'tomorrow');

  const meta = [dueLabel ? dueLabelText(dueLabel) : t.doc.noExpiry, ownerName]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={doc.title}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line py-3 active:bg-soft"
    >
      <FileThumb doc={doc} url={thumbUrl} />

      <View className="flex-1">
        <Text numberOfLines={1} className="text-body text-ink">
          {doc.title}
        </Text>

        <Text
          numberOfLines={1}
          className={[
            'mt-0.5 text-caption',
            isExpiringSoon ? 'font-medium text-attention' : 'text-subtle',
          ].join(' ')}
        >
          {meta}
        </Text>

        <Text numberOfLines={1} className="mt-0.5 text-caption text-muted">
          {doc.physicalLocation
            ? `${t.doc.physicalPrefix} ${doc.physicalLocation}`
            : t.doc.physicalUnknown}
        </Text>
      </View>

      <Text className="text-body text-subtle">›</Text>
    </Pressable>
  );
}

/**
 * Ô ảnh nhỏ, hoặc một ô giữ chỗ.
 *
 * Ba ca đều BÌNH THƯỜNG, không ca nào là lỗi: không có file (đường chính —
 * "chỉ ghi chỗ để giấy"), có file nhưng là PDF (client không dựng thumbnail cho
 * PDF, xem `prepare.ts`), có file và có thumbnail. Ô giữ chỗ mang chữ cái đầu
 * của tên để một danh sách dài vẫn phân biệt được bằng mắt.
 */
function FileThumb({ doc, url }: { doc: FamilyDocument; url: string | null }) {
  const { t } = useT();
  const file = doc.files[0];

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        contentFit="cover"
        // `expo-image` cache theo URL. Chữ ký đổi mỗi 15 phút nên URL đổi theo —
        // cache miss lúc đó là đúng, và `memory-disk` vẫn giúp trong một phiên.
        cachePolicy="memory-disk"
        transition={120}
        className="h-11 w-11 rounded-icon bg-soft"
      />
    );
  }

  return (
    <View className="h-11 w-11 items-center justify-center rounded-icon bg-soft">
      <Text className="text-caption font-semibold text-subtle">
        {file ? t.doc.fileKindPdf : doc.title.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
