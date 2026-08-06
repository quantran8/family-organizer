/**
 * Tài sản — 05 §6.3.
 *
 * Danh sách nhóm theo `liquidity`. Mỗi dòng: tên · nơi giữ · giá trị · chip
 * người giữ · nhãn số khai LUÔN hiện (ai khai, khai lúc nào).
 *
 * **Ràng buộc #1 ở màn này:** chip người giữ hiện Ở CẤP TỪNG DÒNG và chỉ ở đó.
 * Không có tổng theo người, không nhóm theo người, không đếm "Vợ giữ 3 khoản".
 * `holderMemberId` trả lời *"tiền đang ở đâu"* — nó là một mẩu ngữ cảnh để đi
 * tìm cuốn sổ tiết kiệm, không phải một chiều để gộp.
 *
 * Vào từ một trong ba dòng nhóm trên màn tổng quan, mang theo `?group=`. Nhóm
 * đó được cuộn tới và các nhóm khác VẪN hiện: người dùng chạm "Có thể dùng
 * ngay" thường là để so nó với phần còn lại, và lọc mất phần còn lại buộc họ
 * quay ra quay vào ba lần.
 */

import {
  formatDeclaredAt,
  type Asset,
  type ISODate,
  type Liquidity,
  type UUID,
} from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  MoneyText,
  Toast,
} from '@/design/components';
import { useAssets } from '@/features/asset/queries/use-assets';
import { useMembers } from '@/features/member/queries/use-members';
import { declaredAtText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

/**
 * Thứ tự nhóm: dùng được ngay → để dành → dài hạn.
 *
 * Cùng thứ tự với bốn dòng trên màn tổng quan và với bốn ô của nghi thức cập
 * nhật. Ba chỗ nói về cùng một thứ mà xếp khác thứ tự thì mắt phải đọc lại nhãn
 * mỗi lần thay vì nhớ vị trí.
 */
const GROUPS: readonly Liquidity[] = ['usable_now', 'not_immediate', 'long_term'];

export function AssetListScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { group } = useLocalSearchParams<{ group?: string }>();
  const highlighted = GROUPS.includes(group as Liquidity) ? (group as Liquidity) : null;

  const { data: assets, isPending, isError, refetch } = useAssets();
  const { data: members } = useMembers();

  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  const grouped = useMemo(() => {
    const map = new Map<Liquidity, Asset[]>();
    for (const g of GROUPS) map.set(g, []);
    for (const a of assets ?? []) {
      // Khoản đã đóng không nằm trong danh sách đang có: nó không còn là tiền
      // của nhà mình, và cộng nó vào một nhóm sẽ làm tổng ở đây lệch với
      // `finance_metrics` trên màn tổng quan.
      if (a.isClosed) continue;
      map.get(a.liquidity)?.push(a);
    }
    return map;
  }, [assets]);

  if (isPending) {
    return (
      <View className="flex-1 bg-surface px-4">
        <ListSkeleton rows={5} />
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

  const total = GROUPS.reduce((n, g) => n + (grouped.get(g)?.length ?? 0), 0);

  if (total === 0) {
    return (
      <View className="flex-1 bg-surface px-4">
        <EmptyState
          title={t.asset.emptyTitle}
          body={t.asset.emptyBody}
          actionLabel={t.asset.formTitle}
          onAction={() => router.push('/(modals)/asset-form')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {GROUPS.map((g) => {
          const rows = grouped.get(g) ?? [];
          // Nhóm rỗng ẩn hẳn — trừ nhóm người dùng vừa chạm để tới đây. Nhóm đó
          // PHẢI hiện dù rỗng: chạm "Tài sản dài hạn" rồi tới một màn không có
          // dòng nào mang tên đó trông như đi lạc.
          if (rows.length === 0 && g !== highlighted) return null;

          return (
            <View key={g} className="mt-6">
              <Text className="mb-1 text-label font-semibold text-muted">{t.liquidity[g]}</Text>

              {rows.length === 0 ? (
                <Text className="py-3 text-body text-subtle">{t.event.noneYet}</Text>
              ) : (
                rows.map((a) => (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    holderName={
                      a.holderMemberId ? (memberName.get(a.holderMemberId) ?? null) : null
                    }
                    updatedByName={
                      a.updatedByMemberId ? (memberName.get(a.updatedByMemberId) ?? null) : null
                    }
                    today={today}
                    onPress={() => router.push(`/(app)/money/asset/${a.id}`)}
                  />
                ))
              )}
            </View>
          );
        })}

        <View className="mt-8">
          <Button
            label={t.asset.formTitle}
            variant="secondary"
            onPress={() => router.push('/(modals)/asset-form')}
          />
        </View>
      </ScrollView>

      <Toast />
    </View>
  );
}

/**
 * Một khoản.
 *
 * Số ĐẦY ĐỦ, không rút gọn: đây là màn danh sách, chỗ người dùng tới để đối
 * chiếu với sổ tiết kiệm hay app ngân hàng, và ở đó từng đồng mới có nghĩa
 * (design.md §4 chỉ cho rút gọn ở màn tổng quan).
 */
function AssetRow({
  asset,
  holderName,
  updatedByName,
  today,
  onPress,
}: {
  asset: Asset;
  holderName: string | null;
  updatedByName: string | null;
  today: ISODate;
  onPress: () => void;
}) {
  const { t } = useT();

  // Số lượng + nơi giữ + người giữ trên cùng một dòng phụ. Người giữ là NGỮ
  // CẢNH ngang hàng với "ngân hàng nào", không phải một nhãn trách nhiệm.
  //
  // Số lượng đứng ĐẦU với vàng: con số tiền bên phải chỉ đúng tới lần giá vàng
  // đổi tiếp theo, còn "2 chỉ" thì đúng mãi. Dòng này KHÔNG có nhãn nên nghĩa
  // của `institution` đổi theo loại mà vẫn đọc được — "Chú Ba · 20/12" tự nói
  // ra nó là gì.
  const qty =
    asset.quantity !== null && asset.quantityUnit
      ? `${asset.quantity} ${t.quantityUnit[asset.quantityUnit]}`
      : null;
  const sub = [qty, asset.institution, holderName].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={asset.name}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 border-b border-line py-3 active:bg-soft"
    >
      <View className="flex-1">
        <Text numberOfLines={1} className="text-body text-ink">
          {asset.name}
        </Text>
        {sub !== '' ? (
          <Text numberOfLines={1} className="mt-0.5 text-caption text-subtle">
            {sub}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <MoneyText amount={asset.currentValue} size="body" />
        {/* LUÔN hiện, kể cả khi vừa cập nhật hôm nay — 05 §6.3.
            Trước G13 nhãn này bị giấu khi số còn mới, với lo ngại rằng hiện ngày
            trên mọi dòng biến danh sách thành bảng kiểm tra ai chăm cập nhật hơn.
            Lo ngại đó đúng chỗ nhưng sai cách chặn: giấu nhãn không bỏ được phép
            so sánh, nó chỉ làm con số đọc như sự thật hiện tại trong khi nó là số
            MỘT NGƯỜI đã khai (03 §8). Việc chặn so sánh nằm ở chỗ khác và đã có:
            không có tổng theo người ở bất kỳ đâu trong app. */}
        <Text className="mt-0.5 text-micro text-subtle">
          {declaredAtText(formatDeclaredAt(asset.asOfDate, updatedByName, today))}
        </Text>
      </View>

      <Text className="text-body text-subtle">›</Text>
    </Pressable>
  );
}
