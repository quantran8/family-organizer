/**
 * Chi tiết một khoản tài sản — 05 §6.3.
 *
 * Nút chính là **Cập nhật giá trị**, không phải "Sửa". Đó là thao tác người
 * dùng quay lại đây để làm: giá trị một sổ tiết kiệm đổi mỗi tháng, còn tên và
 * nơi giữ thì gõ một lần rồi thôi. Sửa các trường khác nằm sau nút phụ.
 *
 * Cập nhật giá trị đi qua RPC `update_asset_value`, KHÔNG qua `update()`: hai
 * lệnh ghi (assets + money_events) phải nằm trong một transaction. Ghép từ
 * client mà mất mạng giữa chừng sẽ để lại lịch sử sai VĨNH VIỄN — money_events
 * append-only, không sửa được sau đó.
 *
 * **G7b — mục "Thay đổi gần nhất"** ở cuối màn. Đây là chỗ trả lời câu *"sổ
 * tiết kiệm này tháng trước bao nhiêu?"* ngay tại nơi người dùng đang đứng,
 * không bắt họ đi tìm một màn lịch sử riêng. Chỉ đọc — không nút nào sửa hay
 * xoá lịch sử.
 */

import { describeMoneyEvent, formatDeclaredAt, type UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import {
  Button,
  Divider,
  ErrorState,
  ListSkeleton,
  MoneyText,
  Screen,
  SectionHeader,
  Toast,
} from '@/design/components';
import { useCurrency } from '@/design/use-currency';
import { useAsset, useDeleteAsset } from '@/features/asset/queries/use-assets';
import { useFlagAttention } from '@/features/attention/queries/use-attention';
import { useEntityMoneyEvents } from '@/features/money-history/queries/use-money-events';
import { useMembers } from '@/features/member/queries/use-members';
import { declaredAtText, deltaText, fullSolarDate, moneyEventText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { showToast } from '@/stores/toast';

export function AssetDetailScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const currency = useCurrency();

  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = id as UUID;

  const { data: asset, isPending, isError, refetch } = useAsset(assetId);
  const { data: members } = useMembers();
  const { data: events } = useEntityMoneyEvents('asset', assetId);
  const remove = useDeleteAsset();
  const flag = useFlagAttention();

  if (isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }

  if (isError || !asset) {
    return (
      <Screen>
        <ErrorState
          message={isError ? t.error.unknown : t.error.notFound}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const holder = asset.holderMemberId
    ? ((members ?? []).find((m) => m.id === asset.holderMemberId)?.displayName ?? null)
    : null;

  // Người KHAI con số, khác người GIỮ khoản: chồng có thể cập nhật số dư sổ tiết
  // kiệm đứng tên vợ. Hai câu hỏi khác nhau nên là hai dòng khác nhau.
  const updatedBy = asset.updatedByMemberId
    ? ((members ?? []).find((m) => m.id === asset.updatedByMemberId)?.displayName ?? null)
    : null;

  const confirmDelete = (): void => {
    Alert.alert(asset.name, t.common.delete, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(assetId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text className="pt-2 text-title1 font-semibold text-ink">{asset.name}</Text>

      <View className="mt-2">
        <MoneyText amount={asset.currentValue} size="display" />
        {/* Nhãn SỐ KHAI, đủ hai nửa: ai khai và khai lúc nào — 03 §8.
            Trước G13 chỗ này chỉ có nửa sau ("Cập nhật 40 ngày trước"), vì cột
            `updated_by_member_id` chưa tồn tại. Mất tên người làm con số đọc như
            một sự thật khách quan, trong khi nó là điều MỘT NGƯỜI đã nói ra.
            Vẫn là nhãn TRUNG TÍNH: "6 tuần trước", không phải "Quá hạn 6 tuần" —
            người dùng chưa hứa sẽ cập nhật nó bao giờ. */}
        <Text className="mt-1 text-caption text-subtle">
          {declaredAtText(formatDeclaredAt(asset.asOfDate, updatedBy, today))}
        </Text>
      </View>

      {/* Loại · nơi giữ · người giữ.
          Người giữ là NGỮ CẢNH ngang hàng với "ngân hàng nào" (ràng buộc #1) —
          nó trả lời "tiền đang ở đâu", không phải "ai chịu trách nhiệm". */}
      <View className="mt-6 rounded-status border border-line">
        <InfoRow label={t.asset.fieldKind} value={t.assetKind[asset.assetKind]} />
        {asset.institution ? (
          <InfoRow label={t.asset.fieldInstitution} value={asset.institution} />
        ) : null}
        {holder ? <InfoRow label={t.asset.fieldHolder} value={holder} /> : null}
        <InfoRow
          label={t.liquidity[asset.liquidity]}
          value={t.asset.changeLiquidity}
          onPress={() =>
            router.push({ pathname: '/(modals)/asset-form', params: { id: assetId } })
          }
          last
        />
      </View>

      {asset.notes ? <Text className="mt-4 text-body text-muted">{asset.notes}</Text> : null}

      <View className="mt-6 gap-3">
        <Button
          label={t.asset.updateValue}
          onPress={() =>
            router.push({ pathname: '/(modals)/update-asset-value', params: { id: assetId } })
          }
        />
        <Button
          label={t.common.edit}
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/(modals)/asset-form', params: { id: assetId } })
          }
        />
        {/*
          "Cần trao đổi" — gắn cờ từ chi tiết BẤT KỲ khoản nào (05 §6.7).
          Không có luồng bình luận: app không thay thế việc hai người nói chuyện.
          Trùng cờ thì DB trả `conflict` và hook nuốt lỗi — hai người cùng thấy
          một khoản lạ và cùng gắn cờ là chuyện bình thường, không phải sự cố.
        */}
        <Button
          label={t.attention.flag}
          variant="secondary"
          loading={flag.isPending}
          onPress={() =>
            flag.mutate(
              { entityType: 'asset', entityId: assetId },
              { onSuccess: () => showToast(t.attention.flagSaved) },
            )
          }
        />
      </View>

      {/* ── THAY ĐỔI GẦN NHẤT (G7b) ──
          CHỈ ĐỌC. Không nút sửa, không nút xoá: `money_events` append-only và DB
          có trigger chặn update/delete. Sửa sai bằng cách cập nhật lại giá trị,
          không phải bằng cách viết lại lịch sử. */}
      <SectionHeader title={t.money.recentChanges} />
      {(events ?? []).length === 0 ? (
        <Text className="text-body text-subtle">{t.event.noneYet}</Text>
      ) : (
        (events ?? []).map((e, i) => {
          const shape = describeMoneyEvent(e);
          return (
            <View key={e.id}>
              {i > 0 ? <Divider /> : null}
              <View className="min-h-touch flex-row items-center gap-3 py-3">
                <View className="flex-1">
                  <Text className="text-body text-ink">{moneyEventText(shape, currency)}</Text>
                  <Text className="mt-0.5 text-caption text-subtle">
                    {[
                      fullSolarDate(e.occurredOn),
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

                {/* Chênh lệch KHÔNG tô màu theo dấu: đây là bức tranh, không
                    phải điểm số (design.md §3.4). `deltaText` dùng dấu trừ thật
                    (U+2212) để nó cân với dấu cộng. */}
                {e.delta !== null ? (
                  <Text
                    className="text-body text-muted"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {deltaText(e.delta, currency)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      <View className="mt-10">
        <Button label={t.common.delete} variant="danger" onPress={confirmDelete} />
      </View>

      <View className="h-8" />
      <Toast />
    </Screen>
  );
}

/** Một dòng thông tin tĩnh; có `onPress` thì thành dòng dẫn sang chỗ sửa. */
function InfoRow({
  label,
  value,
  onPress,
  last = false,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <View
      className={`min-h-touch flex-row items-center gap-3 px-4 py-3 ${
        last ? '' : 'border-b border-line'
      }`}
    >
      <Text className="flex-1 text-body text-muted">{label}</Text>
      <Text
        numberOfLines={1}
        className={`max-w-[55%] text-body ${onPress ? 'text-ink' : 'text-ink'}`}
        onPress={onPress}
        // Dòng "Đổi cách phân loại" là một nút thật — khai vai trò để trình đọc
        // màn hình không đọc nó thành một giá trị tĩnh.
        accessibilityRole={onPress ? 'button' : undefined}
      >
        {value}
      </Text>
    </View>
  );
}
