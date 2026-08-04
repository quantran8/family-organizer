/**
 * Chi tiết Giấy tờ — 05 §7.2.
 *
 * ── **Vị trí bản giấy là trường quan trọng NHẤT trên màn hình này** ──
 *
 * Không phải một dòng trong danh sách thuộc tính: nó đứng riêng, chữ to, ngay
 * dưới hạn. Đây là thứ Google Drive không làm được, và là nhu cầu thật — giấy
 * tờ quan trọng thường chỉ một người biết chỗ, và người kia cần biết mà không
 * phải hỏi.
 *
 * Khi CHƯA ghi, chỗ đó là một nút mời ghi chứ không phải một dòng trống: ô
 * trống nói "bạn thiếu dữ liệu", còn nút nói "chạm vào đây thì xong". Vì đã bỏ
 * máy quét, ma sát để có ảnh chụp cao hơn hẳn, nên đường "chỉ ghi chỗ để giấy"
 * phải là đường mượt nhất trên màn hình này.
 *
 * ── Giấy tờ không có file nào vẫn là bản ghi ĐẦY ĐỦ ──
 *
 * Khu vực file không bao giờ hiện như một khoảng thiếu sót. Không có badge đỏ,
 * không có "0 file", không có dấu chấm than. Chỉ một dòng nhỏ nói thẳng rằng
 * biết chỗ để bản giấy cũng đã đủ dùng.
 *
 * ── Hàng đợi upload sống ngoài màn hình này ──
 *
 * Chọn 8 ảnh rồi rời màn hình / khoá máy là tình huống PHẢI chịu được (01 §6).
 * Nên trạng thái tải nằm ở `stores/upload-queue` (persist), còn ở đây chỉ đọc
 * ra để hiện. Đóng màn hình không huỷ gì cả.
 */

import { formatDueLabel, type DocumentFile, type UUID } from '@family-organizer/domain';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';

import {
  Button,
  ErrorState,
  ListSkeleton,
  MoneyText,
  Screen,
  SectionHeader,
  Toast,
} from '@/design/components';
import {
  useDeleteDocument,
  useDeleteDocumentFile,
  useDocument,
} from '@/features/document/queries/use-documents';
import { useFileUrls, useOpenFileUrl } from '@/features/document/queries/use-file-urls';
import { useDocumentUploads } from '@/features/document/queries/use-upload-queue';
import { useMembers } from '@/features/member/queries/use-members';
import { dueLabelText, useT } from '@/i18n';
import { pickDocuments, pickPhotos, takePhoto, type PickedFile } from '@/lib/upload/pick';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';
import { useUploadQueue, type UploadItem } from '@/stores/upload-queue';

export function DocumentDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const { id } = useLocalSearchParams<{ id: string }>();
  const docId = id as UUID;

  const { data: doc, isPending, isError, refetch } = useDocument(docId);
  const { data: members } = useMembers();
  const deleteDoc = useDeleteDocument();
  const deleteFile = useDeleteDocumentFile();

  const enqueue = useUploadQueue((s) => s.enqueue);
  const retry = useUploadQueue((s) => s.retry);
  const removeFromQueue = useUploadQueue((s) => s.remove);
  const { items: queueItems } = useDocumentUploads(docId);
  const openUrl = useOpenFileUrl();

  const fileIds = useMemo(() => (doc?.files ?? []).map((x) => x.id), [doc]);
  const thumbUrls = useFileUrls(fileIds, 'thumb');

  const [openingFileId, setOpeningFileId] = useState<UUID | null>(null);

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }

  if (isError || !doc) {
    return (
      <Screen>
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const owner = doc.ownerMemberId
    ? (members ?? []).find((m) => m.id === doc.ownerMemberId)
    : undefined;
  const dueLabel = doc.expiryDate ? formatDueLabel(doc.expiryDate, today) : null;

  const addFiles = async (pick: () => Promise<PickedFile[]>): Promise<void> => {
    const picked = await pick();
    if (picked.length === 0) return;
    // `pageOrder` nối tiếp file đã có: hợp đồng 6 trang chọn làm hai lần vẫn
    // giữ đúng thứ tự trang.
    enqueue(docId, picked, doc.files.length + queueItems.length);
  };

  /**
   * Mở một file: ký URL BẢN GỐC ngay lúc chạm, không ký sẵn.
   *
   * Đây là vế còn lại của "danh sách chỉ tải thumbnail" (01 §6) — ký sẵn bản
   * gốc cho cả lưới thì ràng buộc kia thành trang trí.
   *
   * Mở bằng trình xem của hệ điều hành thay vì dựng màn xem riêng: 05 §7.4 muốn
   * phóng to, vuốt qua trang, cuộn PDF và một nút chia sẻ — hệ điều hành đã có
   * đủ cả bốn, và bản dựng lại sẽ thiếu ít nhất một cái.
   */
  const openFile = (fileId: UUID): void => {
    setOpeningFileId(fileId);
    openUrl.mutate(fileId, {
      onSuccess: (url) => {
        if (url) void Linking.openURL(url);
        else showToast(t.error.notFound);
      },
      onError: () => showToast(t.error.unknown),
      onSettled: () => setOpeningFileId(null),
    });
  };

  const confirmDeleteDoc = (): void => {
    Alert.alert(doc.title, t.doc.deleteConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () =>
          deleteDoc.mutate(docId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const confirmDeleteFile = (fileId: UUID): void => {
    Alert.alert(t.doc.fileRemove, t.doc.fileRemoveConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => deleteFile.mutate(fileId),
      },
    ]);
  };

  return (
    <Screen>
      <Text className="text-title1 font-semibold text-ink">{doc.title}</Text>

      <Text className="mt-1 text-caption text-subtle">
        {owner ? f(t.doc.ownedBy, { name: owner.displayName }) : t.docType[doc.type]}
      </Text>

      {/* ── Hạn ── Nhãn bằng CHỮ, màu chỉ để mắt tìm nhanh (§19). */}
      <View className="mt-6 flex-row items-baseline justify-between">
        <Text className="text-body text-muted">
          {doc.expiryDate
            ? f(t.doc.expiresOn, { date: shortDate(doc.expiryDate) })
            : t.doc.noExpiry}
        </Text>
        {dueLabel ? (
          <Text
            className={[
              'text-body font-medium',
              dueLabel.kind === 'in_days' && dueLabel.days <= 30
                ? 'text-attention'
                : 'text-ink',
            ].join(' ')}
          >
            {dueLabelText(dueLabel)}
          </Text>
        ) : null}
      </View>

      {/* ── VỊ TRÍ BẢN GIẤY — trường quan trọng nhất (05 §7.2) ──
          Một mảng màu nhạt duy nhất trên màn hình này (design.md §5.5: tối đa
          MỘT mảng màu lớn mỗi viewport). Chưa ghi thì đây là lời mời, không
          phải một ô trống. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.doc.fieldPhysical}
        onPress={() => router.push({ pathname: '/(modals)/doc-form', params: { id: docId } })}
        className="mt-5 rounded-status bg-accent-soft p-4 active:opacity-80"
      >
        <Text className="text-label font-medium text-ink">{t.doc.fieldPhysical}</Text>
        <Text
          className={[
            'mt-1 text-title2',
            doc.physicalLocation ? 'text-ink' : 'text-subtle',
          ].join(' ')}
        >
          {doc.physicalLocation ?? t.doc.physicalUnknown}
        </Text>
      </Pressable>

      {doc.renewalCost !== null ? (
        <View className="mt-5 flex-row items-baseline justify-between">
          <Text className="text-body text-muted">{t.doc.fieldRenewalCost}</Text>
          <MoneyText amount={doc.renewalCost} size="body" />
        </View>
      ) : null}

      {/* ── Ảnh và file ── Không bao giờ hiện như một khoảng thiếu sót. */}
      <SectionHeader title={t.doc.sectionFiles} />

      {doc.files.length === 0 && queueItems.length === 0 ? (
        <Text className="text-caption text-subtle">{t.doc.noFilesHint}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {doc.files.map((file) => (
            <FileTile
              key={file.id}
              file={file}
              url={thumbUrls[file.id] ?? null}
              busy={openingFileId === file.id}
              onPress={() => void openFile(file.id)}
              onLongPress={() => confirmDeleteFile(file.id)}
            />
          ))}

          {/* Mục đang tải nằm CÙNG lưới với file đã xong, không thành một khu
              riêng: người dùng nghĩ về chúng như "ảnh của giấy tờ này", không
              phải "hàng đợi kỹ thuật". */}
          {queueItems
            .filter((x) => x.status !== 'done')
            .map((item) => (
              <QueueTile
                key={item.id}
                item={item}
                onRetry={() => retry(item.id)}
                onRemove={() => removeFromQueue(item.id)}
              />
            ))}
        </View>
      )}

      <View className="mt-5 gap-3">
        <Button
          label={t.doc.takePhoto}
          variant="secondary"
          onPress={() => void addFiles(takePhoto)}
        />
        <Button
          label={t.doc.pickPhoto}
          variant="secondary"
          onPress={() => void addFiles(pickPhotos)}
        />
        <Button
          label={t.doc.pickFile}
          variant="secondary"
          onPress={() => void addFiles(pickDocuments)}
        />
      </View>

      {doc.notes ? (
        <>
          <SectionHeader title={t.common.note} />
          <Text className="text-body text-muted">{doc.notes}</Text>
        </>
      ) : null}

      <View className="mt-10">
        <Button label={t.common.delete} variant="danger" onPress={confirmDeleteDoc} />
      </View>

      <View className="h-8" />
      <Toast />
    </Screen>
  );
}

/** `2027-03-15` → `15/3/2027`. Năm LUÔN hiện — xem ghi chú ở G6 về "năm nay". */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

/**
 * Một file đã tải xong.
 *
 * Chạm để mở (ký bản gốc lúc đó), giữ lâu để gỡ. Gỡ nằm sau thao tác giữ lâu
 * chứ không phải một nút [×] góc ảnh: nút [×] trên mỗi ô làm cả lưới trông như
 * đang chờ bị dọn, và một chạm nhầm sẽ xoá thứ người dùng vừa mất công chụp.
 */
function FileTile({
  file,
  url,
  busy,
  onPress,
  onLongPress,
}: {
  file: DocumentFile;
  url: string | null;
  busy: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { t } = useT();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={file.filename}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-24 w-24 items-center justify-center overflow-hidden rounded-icon bg-soft active:opacity-80"
    >
      {url ? (
        <Image
          source={{ uri: url }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          className="h-full w-full"
        />
      ) : (
        <Text className="text-caption font-semibold text-subtle">{t.doc.fileKindPdf}</Text>
      )}

      {busy ? (
        <View className="absolute inset-0 items-center justify-center bg-surface/70">
          <ActivityIndicator size="small" color="#101014" />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Một file đang trong hàng đợi.
 *
 * Ba trạng thái đọc được từ xa: đang chờ · đang tải (kèm phần trăm) · chưa tải
 * lên được (chạm để thử lại, giữ lâu để bỏ). Không có thanh tiến trình mảnh —
 * ở kích thước 96px thì một con số đọc nhanh hơn một thanh.
 */
function QueueTile({
  item,
  onRetry,
  onRemove,
}: {
  item: UploadItem;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  const failed = item.status === 'failed';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={failed ? t.doc.queueRetry : t.doc.uploading}
      onPress={failed ? onRetry : undefined}
      onLongPress={onRemove}
      className={[
        'h-24 w-24 items-center justify-center rounded-icon px-2',
        failed ? 'bg-critical-soft' : 'bg-soft',
      ].join(' ')}
    >
      {failed ? (
        <>
          <Text className="text-center text-caption font-medium text-critical">
            {t.doc.uploadFailed}
          </Text>
          <Text className="mt-1 text-micro text-critical">{t.doc.queueRetry}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="small" color="#707078" />
          <Text className="mt-2 text-micro text-muted">
            {item.status === 'uploading'
              ? `${Math.round(item.progress * 100)}%`
              : t.doc.queuePending}
          </Text>
        </>
      )}
    </Pressable>
  );
}
