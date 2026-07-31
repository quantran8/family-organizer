/**
 * Cài đặt — 05 §8.
 *
 * P0 ở giai đoạn này: tên hiển thị · Nhà mình · Mời · Đăng xuất.
 * Thông báo · Dung lượng · Dữ liệu là P1; Gói dịch vụ lên ở G9.
 *
 * Tên hiển thị sửa TẠI CHỖ, không đẩy sang một màn riêng cho đúng một ô chữ.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button, Field, NavRow, Screen, SectionHeader } from '@/design/components';
import { useSignOut } from '@/features/auth/queries/use-auth';
import { useHousehold } from '@/features/household/queries/use-household';
import { useMe, useUpdateMember } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';

export function SettingsScreen() {
  const { t } = useT();
  const router = useRouter();
  const { data: me } = useMe();
  const { data: household } = useHousehold();
  const updateMember = useUpdateMember();
  const signOut = useSignOut();

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (me) setDisplayName(me.displayName);
  }, [me]);

  const saveDisplayName = (): void => {
    const trimmed = displayName.trim();
    // Tên rỗng không lưu, và cũng không báo lỗi đỏ — chỉ trả lại tên cũ. Người
    // dùng xoá trắng ô rồi bỏ đi là thao tác lỡ tay, không phải một ý định.
    if (!me || trimmed === '') {
      if (me) setDisplayName(me.displayName);
      return;
    }
    if (trimmed !== me.displayName) {
      updateMember.mutate({ id: me.id, patch: { displayName: trimmed } });
    }
  };

  const confirmSignOut = (): void => {
    // Hỏi lại: đăng xuất xoá sạch cache của nhà, nên mở lại app sẽ phải tải
    // toàn bộ từ đầu — và trên mạng yếu đó là một màn hình trống khá lâu.
    Alert.alert(t.auth.signOut, '', [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.auth.signOut, style: 'destructive', onPress: () => signOut.mutate() },
    ]);
  };

  return (
    <Screen scroll>
      <Field label={t.settings.displayName}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          onBlur={saveDisplayName}
          placeholder={t.setup.displayNamePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.settings.displayName}
          maxLength={50}
          className="min-h-touch rounded-control border border-line bg-white px-4 py-3 text-body text-ink"
        />
      </Field>

      <SectionHeader title={t.settings.household} />
      <View>
        <NavRow
          label={t.settings.householdName}
          value={household?.name ?? null}
          onPress={() => router.push('/(app)/settings/household')}
        />
        <NavRow
          label={t.settings.invite}
          onPress={() => router.push('/(app)/settings/invite')}
          last
        />
      </View>

      <View className="mt-10">
        <Button label={t.auth.signOut} variant="secondary" onPress={confirmSignOut} />
      </View>

      {signOut.isError ? (
        <Text className="mt-3 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-8" />
    </Screen>
  );
}
