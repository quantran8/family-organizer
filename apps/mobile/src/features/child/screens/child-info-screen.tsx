/**
 * Thông tin của con — ngày sinh, trường lớp, số BHYT (07 §4.4).
 *
 * Ngày sinh là trường quan trọng nhất ở đây: nó là ĐẦU VÀO của
 * `buildVaccineSchedule()`. Không có nó thì app không dựng được mốc tiêm nào —
 * và app HỎI chứ không đoán, vì một ngày sinh sai làm sai mọi mốc theo sau.
 *
 * Ba trường còn lại là chữ để hiện lại, không phải thứ app tính toán gì trên
 * đó. Chúng nằm ở `members` chứ không phải một bảng `schools` — một bảng riêng
 * cho thứ đổi mỗi năm một lần và không nối vào đâu sẽ là một module không ai
 * xin.
 */

import type { UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button, DatePicker, Field, Sheet } from '@/design/components';
import { useUpdateChildInfo } from '@/features/child/queries/use-child';
import { useMembers } from '@/features/member/queries/use-members';
import { useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function ChildInfoScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = (params.memberId ?? '') as UUID;

  const { data: members } = useMembers();
  const child = (members ?? []).find((m) => m.id === memberId) ?? null;
  const update = useUpdateChildInfo();

  const [birthday, setBirthday] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolClass, setSchoolClass] = useState('');
  const [insuranceNo, setInsuranceNo] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || child === null) return;
    setBirthday(child.birthday);
    setSchoolName(child.schoolName ?? '');
    setSchoolClass(child.schoolClass ?? '');
    setInsuranceNo(child.healthInsuranceNo ?? '');
    setLoaded(true);
  }, [loaded, child]);

  const save = (): void => {
    if (update.isPending) return;
    update.mutate(
      {
        memberId,
        input: {
          birthday,
          schoolName: schoolName.trim() === '' ? null : schoolName.trim(),
          schoolClass: schoolClass.trim() === '' ? null : schoolClass.trim(),
          healthInsuranceNo: insuranceNo.trim() === '' ? null : insuranceNo.trim(),
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Sheet
      title={child?.displayName ?? t.child.title}
      onClose={() => router.back()}
      actions={<Button label={t.common.save} loading={update.isPending} onPress={save} />}
    >
      {/* Đầu vào của lịch tiêm — app hỏi, không đoán. */}
      <Field label={t.child.fieldBirthday}>
        <DatePicker value={birthday} onChange={setBirthday} today={today} />
      </Field>

      <Field
        label={t.child.fieldSchoolName}
        value={schoolName}
        onChangeText={setSchoolName}
        maxLength={120}
      />

      <Field
        label={t.child.fieldSchoolClass}
        value={schoolClass}
        onChangeText={setSchoolClass}
        maxLength={60}
      />

      <Field
        label={t.child.fieldInsuranceNo}
        value={insuranceNo}
        onChangeText={setInsuranceNo}
        maxLength={60}
      />

      {update.isError ? (
        <Text className="text-caption text-critical">{t.error.unknown}</Text>
      ) : null}
    </Sheet>
  );
}
