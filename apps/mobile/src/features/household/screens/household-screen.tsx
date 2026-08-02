/**
 * Nhà mình — 05 §8.
 *
 * Tên nhà · danh sách thành viên · thêm người KHÔNG có tài khoản.
 *
 * Thành viên không nhất thiết có tài khoản (`profile_id = null`, schema §1):
 * con nhỏ, bố mẹ hai bên. "Giỗ ông nội" cần ông nội là một member để gắn vào,
 * dù ông không bao giờ mở app. Đây là lý do `members` tách khỏi `profiles`.
 *
 * KHÔNG hiện "đã tham gia / chưa tham gia" cạnh mỗi người: nó biến danh sách
 * gia đình thành bảng theo dõi trạng thái, và người không có tài khoản trông
 * như một mục còn thiếu — trong khi họ là bản ghi đầy đủ.
 */

import type { MemberRole } from '@family-organizer/domain';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import {
  Button,
  ChipSelect,
  Divider,
  Field,
  ListSkeleton,
  MemberAvatar,
  Screen,
  SectionHeader,
} from '@/design/components';
import { useHousehold, useUpdateHousehold } from '@/features/household/queries/use-household';
import { THRESHOLD_OPTIONS } from '@/features/household/screens/threshold-screen';
import { useCreateMember, useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';

/**
 * Vai trò chọn được khi thêm người.
 *
 * `owner` không có ở đây: chủ nhà sinh ra từ `create_household`, không phải thứ
 * gán tay. `partner` cũng không — người thứ hai vào bằng mã mời, và tự tạo một
 * `partner` rỗng ở đây sẽ tạo một bản ghi mồ côi không bao giờ nối được với tài
 * khoản thật của họ.
 */
const ADDABLE_ROLES: readonly MemberRole[] = ['child', 'relative'];

export function HouseholdSettingsScreen() {
  const { t } = useT();
  const { data: household } = useHousehold();
  const { data: members, isPending } = useMembers();
  const updateHousehold = useUpdateHousehold();
  const createMember = useCreateMember();

  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('child');

  useEffect(() => {
    if (household) setName(household.name);
  }, [household]);

  const saveName = (): void => {
    const trimmed = name.trim();
    if (!household || trimmed === '') {
      if (household) setName(household.name);
      return;
    }
    if (trimmed !== household.name) updateHousehold.mutate({ name: trimmed });
  };

  const addMember = (): void => {
    const trimmed = newName.trim();
    if (trimmed === '' || createMember.isPending) return;
    createMember.mutate(
      { displayName: trimmed, role: newRole, birthday: null },
      {
        onSuccess: () => {
          setNewName('');
          setNewRole('child');
        },
      },
    );
  };

  return (
    <Screen scroll>
      <Field label={t.settings.householdName}>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          placeholder={t.app.name}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.settings.householdName}
          maxLength={60}
          className="min-h-touch rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
        />
      </Field>

      {/* Ngưỡng ghi — quy ước hai người tự chốt lúc onboarding (06 §2).
          Sửa được bất cứ lúc nào, và đổi nó KHÔNG làm gì với dữ liệu đã ghi:
          nó chưa bao giờ là ràng buộc, chỉ là một dòng nhắc dưới ô nhập tiền. */}
      <SectionHeader title={t.threshold.settingsLabel} />
      <View className="mb-4">
        <ChipSelect
          value={household?.recordThresholdAmount ?? null}
          onChange={(value) => updateHousehold.mutate({ recordThresholdAmount: value })}
          options={THRESHOLD_OPTIONS.map((o) => ({
            value: o.value,
            label: t.threshold[o.labelKey],
          }))}
        />
      </View>

      <SectionHeader title={t.settings.members} />
      {isPending ? (
        <ListSkeleton rows={2} />
      ) : (
        (members ?? []).map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <View className="min-h-touch flex-row items-center gap-3 py-3">
              <MemberAvatar name={m.displayName} />
              <Text className="flex-1 text-body text-ink">{m.displayName}</Text>
              <Text className="text-caption text-subtle">{t.memberRole[m.role]}</Text>
            </View>
          </View>
        ))
      )}

      <SectionHeader title={t.settings.addMember} />
      <Text className="mb-3 text-caption text-subtle">{t.settings.addMemberHint}</Text>

      <Field label={t.settings.displayName}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder={t.setup.displayNamePlaceholder}
          placeholderTextColor="#A4A4AD"
          accessibilityLabel={t.settings.displayName}
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={addMember}
          className="min-h-touch rounded-control border border-line bg-surface px-4 py-3 text-body text-ink"
        />
      </Field>

      <View className="mb-4">
        <ChipSelect
          value={newRole}
          onChange={setNewRole}
          options={ADDABLE_ROLES.map((r) => ({ value: r, label: t.memberRole[r] }))}
        />
      </View>

      <Button
        label={t.settings.addMember}
        variant="secondary"
        disabled={newName.trim() === ''}
        loading={createMember.isPending}
        onPress={addMember}
      />

      {createMember.isError || updateHousehold.isError ? (
        <Text className="mt-3 text-caption text-critical">{t.error.unknown}</Text>
      ) : null}

      <View className="h-8" />
    </Screen>
  );
}
