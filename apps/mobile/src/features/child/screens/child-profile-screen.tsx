/**
 * Hồ sơ một đứa trẻ — 05 F13, 07 §4.5.
 *
 *     Bé An · 14 tháng
 *
 *     SẮP TỚI
 *     ◆ Sởi - Rubella (MR)   mũi 1    còn 9 ngày
 *
 *     ĐÃ TIÊM                          12 mũi ›
 *     CHIỀU CAO · CÂN NẶNG                   ›
 *     GIẤY TỜ                          4 mục ›
 *
 * ── BA TRẠNG THÁI RỖNG, VÀ CHÚNG KHÁC NHAU ──
 *
 * 1. **Chưa có ngày sinh** → không dựng được mốc nào. Hỏi ngày sinh, không đoán.
 * 2. **Chưa seed bảng lịch tiêm** → app NÓI THẬT là chưa có lịch trong app, và
 *    nói vì sao (cần người có chuyên môn y tế xác nhận). KHÔNG bịa ra một mốc
 *    nào, kể cả một mốc "phổ biến ai cũng biết" — 07 §4.2.
 * 3. **Có lịch nhưng chưa dựng cho bé này** → nút dựng lịch.
 *
 * Gộp ba trạng thái đó thành một "chưa có dữ liệu" là xoá mất thông tin mà
 * người dùng cần để biết phải làm gì.
 *
 * ── DÒNG MIỄN TRỪ LUÔN HIỆN ──
 *
 * `scheduleDisclaimer` không phải thứ ẩn sau một nút "tìm hiểu thêm". App đưa
 * ra một lịch THAM KHẢO; cơ sở tiêm chủng mới là nơi quyết định.
 */

import { buildVaccineSchedule, doseStatus, formatDoseLabel } from '@family-organizer/domain';
import type { UUID } from '@family-organizer/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, ErrorState, ListSkeleton, NavRow, SectionHeader } from '@/design/components';
import { DoseRow } from '@/features/child/components';
import {
  useChildDoses,
  useChildGrowth,
  useMarkDoseDone,
  useSeedVaccineSchedule,
  useUndoDose,
  useVaccineSchedule,
} from '@/features/child/queries/use-child';
import { useMembers } from '@/features/member/queries/use-members';
import { childAgeText, doseLabelText, useT } from '@/i18n';
import { useToday } from '@/lib/use-today';

export function ChildProfileScreen() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const params = useLocalSearchParams<{ memberId?: string }>();
  const memberId = (params.memberId ?? '') as UUID;

  const { data: members } = useMembers();
  const child = (members ?? []).find((m) => m.id === memberId) ?? null;

  const doses = useChildDoses(memberId);
  const schedule = useVaccineSchedule();
  const growth = useChildGrowth(memberId);

  const seed = useSeedVaccineSchedule();
  const markDone = useMarkDoseDone();
  const undo = useUndoDose();

  const refetch = () => {
    void doses.refetch();
    void schedule.refetch();
  };

  /** Tách sắp tới / đã tiêm. Mũi quá lịch nằm ở nhóm SẮP TỚI, lên đầu. */
  const { upcoming, done } = useMemo(() => {
    const list = doses.data ?? [];
    const up = list.filter((d) => doseStatus(d, today) !== 'done');
    const dn = list.filter((d) => doseStatus(d, today) === 'done');
    // Quá lịch trước, rồi đến hạn gần nhất. Một mũi đã trễ là thứ cần thấy đầu
    // tiên khi mở màn hình này.
    up.sort((a, b) => {
      const oa = doseStatus(a, today) === 'overdue' ? 0 : 1;
      const ob = doseStatus(b, today) === 'overdue' ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    });
    return { upcoming: up, done: dn };
  }, [doses.data, today]);

  const hasSchedule = (schedule.data ?? []).length > 0;
  const hasDoses = (doses.data ?? []).length > 0;
  const isPending = doses.isPending || schedule.isPending;

  const generate = (): void => {
    if (!child?.birthday || !hasSchedule) return;
    // Hàm THUẦN của domain dựng mốc; hook chỉ ghi xuống. Không có đường nào để
    // màn hình tự bịa ra một mốc tiêm.
    const drafts = buildVaccineSchedule(child.birthday, schedule.data ?? []);
    seed.mutate({
      memberId,
      doses: drafts.map((d) => ({
        scheduleCode: d.scheduleCode,
        customName: d.customName,
        dueDate: d.dueDate,
      })),
    });
  };

  if (doses.isError || schedule.isError) {
    return (
      <View className="flex-1 px-4 pt-6">
        <ErrorState message={t.error.unknown} retryLabel={t.common.retry} onRetry={refetch} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-24 pt-4"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={doses.isRefetching} onRefresh={refetch} />}
    >
      {child ? (
        <Text className="text-title2 font-semibold text-ink">
          {child.birthday
            ? f(t.child.header, {
                name: child.displayName,
                age: childAgeText(child.birthday, today),
              })
            : child.displayName}
        </Text>
      ) : null}

      {isPending ? (
        <View className="pt-4">
          <ListSkeleton rows={5} />
        </View>
      ) : null}

      {/* ── Trạng thái 1: chưa có ngày sinh ── */}
      {!isPending && child !== null && child.birthday === null ? (
        <View className="mt-8">
          <EmptyState
            title={t.child.birthdayNeededTitle}
            body={t.child.birthdayNeededBody}
            actionLabel={t.child.birthdayNeededAction}
            onAction={() => router.push(`/(modals)/child-info?memberId=${memberId}`)}
          />
        </View>
      ) : null}

      {/* ── Trạng thái 2: bảng lịch tiêm chưa được seed ──
          NÓI THẬT. Không bịa một mốc nào, kể cả mốc "ai cũng biết". */}
      {!isPending && child?.birthday && !hasSchedule && !hasDoses ? (
        <View className="mt-8">
          <EmptyState
            title={t.child.scheduleEmptyTitle}
            body={t.child.scheduleEmptyBody}
          />
        </View>
      ) : null}

      {/* ── Trạng thái 3: có lịch, chưa dựng cho bé này ── */}
      {!isPending && child?.birthday && hasSchedule && !hasDoses ? (
        <View className="mt-6">
          <Button
            label={t.child.generateSchedule}
            loading={seed.isPending}
            onPress={generate}
          />
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <View className="mt-6">
          <SectionHeader title={t.child.sectionUpcoming} />
          {upcoming.map((d) => (
            <DoseRow
              key={d.id}
              dose={d}
              status={doseStatus(d, today)}
              label={doseLabelText(formatDoseLabel(d, today))}
              onMarkDone={() =>
                markDone.mutate({ id: d.id, administeredOn: today })
              }
            />
          ))}
        </View>
      ) : null}

      {done.length > 0 ? (
        <View className="mt-6">
          <SectionHeader title={t.child.sectionDone} />
          {done.map((d) => (
            <DoseRow
              key={d.id}
              dose={d}
              status="done"
              label={doseLabelText(formatDoseLabel(d, today))}
              onUndo={() => undo.mutate(d.id)}
            />
          ))}
        </View>
      ) : null}

      {/* Dòng miễn trừ LUÔN hiện khi màn hình có nói về lịch tiêm — 07 §4.2. */}
      {hasDoses || hasSchedule ? (
        <Text className="mt-6 text-caption text-muted">{t.child.scheduleDisclaimer}</Text>
      ) : null}

      <View className="mt-6">
        <NavRow
          label={t.child.sectionGrowth}
          value={
            (growth.data ?? []).length > 0
              ? f(t.child.doseCount, { count: (growth.data ?? []).length })
              : null
          }
          onPress={() => router.push(`/(app)/child/${memberId}/growth`)}
        />
        <NavRow
          label={t.child.sectionSchool}
          onPress={() => router.push(`/(modals)/child-info?memberId=${memberId}`)}
        />
      </View>
    </ScrollView>
  );
}
