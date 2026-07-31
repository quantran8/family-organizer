/**
 * Nhà mình — 05 §4.
 *
 * Trả lời trong ba giây: *nhà mình sắp có gì và cần chuẩn bị gì?*
 *
 * MỘT lần fetch cho toàn màn: view `home_feed` + `finance_metrics`. Trạng thái
 * tài chính tính ở client bằng `computeFinanceStatus` — hàm thuần của 11 con số,
 * nên nó hiện tức thì và đúng cả khi offline.
 *
 * Nhóm rỗng ẩn HẲN, không hiện "không có gì" (05 §4). Một màn hình liệt kê ba
 * dòng "chưa có gì" là ba lần nhắc người dùng rằng họ chưa làm gì.
 *
 * G4 dựng: thẻ trạng thái · HÔM NAY · TUẦN NÀY · trạng thái rỗng. `CẦN CHÚ Ý`
 * lên ở G7 cùng tầng tiền — nguồn của nó là cờ trên khoản tiền, chưa có màn nào
 * tạo ra cờ đó.
 */

import {
  computeFinanceStatus,
  explainFinanceStatus,
  formatDueLabel,
  groupTasksByDue,
  lunarLabelOfDate,
  parseISODate,
  weekdayOf,
  type Task,
  type UUID,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  FAB,
  ListSkeleton,
  MemberAvatar,
  StatusPill,
  UndoToast,
  useUndo,
} from '@/design/components';
import { useFinanceMetrics } from '@/features/household/queries/use-household';
import { useMe, useMembers } from '@/features/member/queries/use-members';
import { TaskRow } from '@/features/task/components';
import { useDeleteTask, useSetTaskDone, useTasks } from '@/features/task/queries/use-tasks';
import { financeReasonText, lastUpdatedText, useT, weekdayName } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useSessionStore } from '@/stores/session';

export function HomeScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();
  const householdName = useSessionStore((s) => s.householdName);

  const { data: tasks, isPending, refetch, isRefetching } = useTasks();
  const { data: members } = useMembers();
  const setDone = useSetTaskDone();
  const deleteTask = useDeleteTask();
  const undo = useUndo();

  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  // Nhà mình chỉ quan tâm việc gần: hôm nay + phần còn lại của tuần. Việc tháng
  // sau có chỗ của nó ở tab Việc; kéo nó lên đây làm loãng câu trả lời ba giây.
  const { todayTasks, weekTasks } = useMemo(() => {
    const hidden = undo.pendingIds;
    const groups = groupTasksByDue(tasks ?? [], today);
    const pick = (keys: string[]): Task[] =>
      groups
        .filter((g) => keys.includes(g.key))
        .flatMap((g) => g.tasks)
        .filter((x) => !hidden.has(x.id));
    return {
      // Quá hạn đi CÙNG nhóm hôm nay, không thành một nhóm đỏ riêng: việc nhà
      // quên một hôm là chuyện thường, và một khối đỏ đầu màn hình mỗi sáng là
      // cách nhanh nhất để người ta thôi mở app.
      todayTasks: pick(['overdue', 'today']),
      weekTasks: pick(['tomorrow', 'this_week']),
    };
  }, [tasks, today, undo.pendingIds]);

  const isEmpty = !isPending && todayTasks.length === 0 && weekTasks.length === 0;

  const renderTask = (item: Task) => (
    <TaskRow
      key={item.id}
      title={item.title}
      done={item.status === 'done'}
      assigneeName={item.assigneeId ? (memberName.get(item.assigneeId) ?? null) : null}
      repeats={item.recur !== null}
      onToggle={(next) => setDone.mutate({ id: item.id, done: next })}
      onPress={() => router.push(`/(app)/plan/task/${item.id}`)}
      onDelete={() =>
        undo.schedule({
          id: item.id,
          message: t.task.deleted,
          onCommit: () => deleteTask.mutate(item.id),
        })
      }
    />
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Kéo xuống để làm mới. Không auto-refresh theo chu kỳ (05 §4).
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <TodayHeader today={today} householdName={householdName ?? t.app.name} />

        <FinanceCard today={today} onPress={() => router.push('/(app)/money')} />

        <InviteCard hasFirstRecord={(tasks ?? []).length > 0} />

        {isPending ? <ListSkeleton rows={4} /> : null}

        {todayTasks.length > 0 ? (
          <Group title={t.home.sectionToday}>{todayTasks.map(renderTask)}</Group>
        ) : null}

        {weekTasks.length > 0 ? (
          <Group title={t.home.sectionThisWeek}>{weekTasks.map(renderTask)}</Group>
        ) : null}

        {isEmpty ? (
          <View className="mt-10">
            <EmptyState
              title={t.home.emptyTitle}
              body={t.home.emptyBody}
              actionLabel={t.home.emptyAddTask}
              onAction={() => router.push('/(modals)/quick-add')}
            />
          </View>
        ) : null}
      </ScrollView>

      <UndoToast pending={undo.pending} onUndo={undo.undo} />
      <FAB onPress={() => router.push('/(modals)/quick-add')} />
    </View>
  );
}

/**
 * Đầu màn: ngày dương + thứ + NGÀY ÂM.
 *
 * Ngày âm nằm ngay đây, không giấu sau một màn hình khác — đây là điểm khác biệt
 * bản địa rõ nhất của app (05 §5.3), và nó phải có mặt từ dòng đầu tiên.
 */
function TodayHeader({ today, householdName }: { today: string; householdName: string }) {
  const { t } = useT();
  const router = useRouter();
  const { data: me } = useMe();
  const c = parseISODate(today);
  const lunar = lunarLabelOfDate(today);

  return (
    <View className="flex-row items-center gap-4 pt-2">
      <View className="h-14 w-14 items-center justify-center rounded-icon bg-soft">
        <Text className="text-heading font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {c.day}
        </Text>
        <Text className="text-micro font-medium text-muted">
          {`${lunar.day}/${lunar.month}`}
        </Text>
      </View>

      <View className="flex-1">
        <Text className="text-title1 font-semibold text-ink">{householdName}</Text>
        <Text className="text-caption text-subtle">
          {`${weekdayName(weekdayOf(today))} · ${t.event.calendarLunar} ${lunar.day}/${lunar.month}`}
        </Text>
      </View>

      {/* Đường vào Cài đặt — qua avatar, KHÔNG chiếm một tab (05 §2). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y.settings}
        hitSlop={8}
        onPress={() => router.push('/(app)/settings')}
        className="min-h-touch min-w-touch items-end justify-center"
      >
        <MemberAvatar name={me?.displayName ?? t.app.name} />
      </Pressable>
    </View>
  );
}

/**
 * Thẻ mời người thứ hai — 05 §3.3, F2.
 *
 * Nằm NGAY trên màn hình chính, không nhét vào cài đặt: đó là "ngoại lệ duy
 * nhất" mà 05 §3.3 cho phép trên một màn hình cố ý không ép làm gì.
 *
 * HOÃN tới khi A có bản ghi đầu tiên (05 §9). Lý do không phải thẩm mỹ mà là
 * cốt lõi của F2: *"Người thứ hai không bao giờ thấy màn hình rỗng."* Mời lúc
 * nhà còn trống thì B chạm link, đăng nhập, và mở ra một app không có gì —
 * chính xác cái ấn tượng đầu tiên mà cả luồng này sinh ra để tránh. Một lời mời
 * gửi sớm vài phút đổi lấy một người thứ hai không quay lại là món hời rất tệ.
 *
 * Có người thứ hai rồi thì thẻ biến mất. Không có nút đóng: nó đã tự biết lúc
 * nào nên đi, và một thẻ đóng được là một thẻ sẽ bị đóng nhầm rồi không tìm lại.
 */
function InviteCard({ hasFirstRecord }: { hasFirstRecord: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const { data: members } = useMembers();

  if (!hasFirstRecord) return null;
  // Chỉ đếm người CÓ TÀI KHOẢN: con nhỏ và bố mẹ hai bên là member nhưng
  // `profileId = null` (schema §1). Đếm cả họ thì thêm một đứa con vào nhà sẽ
  // làm thẻ mời biến mất trong khi người thứ hai vẫn chưa vào.
  const withAccount = (members ?? []).filter((m) => m.profileId !== null).length;
  if (withAccount > 1) return null;

  return (
    <View className="mt-5">
      <Card emphasis="brand">
        <Text className="text-heading font-semibold text-ink">{t.home.inviteCardTitle}</Text>
        <Text className="mt-1 text-body text-muted">{t.home.inviteCardBody}</Text>
        <View className="mt-4">
          <Button
            label={t.home.inviteCardAction}
            variant="secondary"
            onPress={() => router.push('/(app)/settings/invite')}
          />
        </View>
      </Card>
    </View>
  );
}

/**
 * Thẻ trạng thái tài chính — chấm màu + một từ + MỘT CÂU giải thích.
 *
 * Nhãn không kèm lý do sẽ bị đọc là phán xét (03 §1, 05 §4). Chạm → tab Tiền.
 *
 * Chưa có số liệu thì KHÔNG hiện thẻ: một thẻ "Chưa đủ dữ liệu" ở đầu màn hình
 * của người mới cài app là một lời trách trước khi họ kịp làm gì.
 */
function FinanceCard({ today, onPress }: { today: string; onPress: () => void }) {
  const { t } = useT();
  const { data: metrics } = useFinanceMetrics();

  if (!metrics) return null;
  const status = computeFinanceStatus(metrics, today);
  if (status === 'no_data') return null;

  const { reason } = explainFinanceStatus(metrics, today);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mt-5">
      <Card>
        <StatusPill status={status} />
        <Text className="mt-2 text-body text-ink">{financeReasonText(reason)}</Text>
        <Text className="mt-1 text-caption text-subtle">
          {metrics.lastUpdatedOn
            ? lastUpdatedText(formatDueLabel(metrics.lastUpdatedOn, today))
            : t.financeStatus.neverUpdated}
        </Text>
      </Card>
    </Pressable>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="mb-1 text-label font-semibold text-muted">{title}</Text>
      {children}
    </View>
  );
}
