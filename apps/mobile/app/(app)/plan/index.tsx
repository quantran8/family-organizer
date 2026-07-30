/**
 * Việc & Sự kiện — 05 §5.
 *
 * Tab con `Việc | Sự kiện`, nhớ tab đã chọn lần trước (`stores/ui-prefs`).
 *
 * Tab Sự kiện lên ở G6 cùng lịch âm — ở đây nó là trạng thái rỗng thật, không
 * phải chỗ giữ chỗ: người dùng vẫn thấy đúng lời mời "Thêm ngày giỗ, sinh
 * nhật…" và nút dẫn tới form khi form có mặt.
 *
 * Danh sách dùng `SectionList` chứ không `FlashList`: sáu nhóm cố định với vài
 * chục dòng mỗi nhóm không cần ảo hoá, còn tiêu đề dính (`stickySectionHeaders`)
 * thì có sẵn. FlashList để dành cho danh sách giấy tờ, nơi số dòng thật sự lớn.
 */

import { addDays, groupTasksByDue, type Task, type TaskGroupKey, type UUID } from '@nhaminh/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, Text, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  FAB,
  ListSkeleton,
  Screen,
  Segmented,
  TaskRow,
  UndoToast,
  useUndo,
} from '@/design/components';
import { useMembers } from '@/features/member/queries/use-members';
import {
  useDeleteTask,
  useRescheduleTask,
  useSetTaskDone,
  useTasks,
} from '@/features/task/queries/use-tasks';
import { useT, vi } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useUIPrefs, type PlanTab } from '@/stores/ui-prefs';

export default function PlanScreen() {
  const { t } = useT();
  const planTab = useUIPrefs((s) => s.planTab);
  const setPlanTab = useUIPrefs((s) => s.setPlanTab);

  const options: readonly { value: PlanTab; label: string }[] = [
    { value: 'task', label: t.task.title },
    { value: 'event', label: t.event.title },
  ];

  return (
    <Screen>
      <View className="pt-2">
        <Text className="mb-4 text-title1 font-semibold text-ink">{t.tabs.plan}</Text>
        <Segmented options={options} value={planTab} onChange={setPlanTab} />
      </View>

      {planTab === 'task' ? <TaskList /> : <EventPlaceholder />}
    </Screen>
  );
}

/** Nhóm của domain → nhãn ở `vi.task`. Sáu nhóm, không nhiều hơn (05 §5.1). */
const GROUP_LABEL: Record<TaskGroupKey, keyof typeof vi.task> = {
  overdue: 'groupOverdue',
  today: 'groupToday',
  tomorrow: 'groupTomorrow',
  this_week: 'groupThisWeek',
  later: 'groupLater',
  no_due: 'groupNoDue',
};

function TaskList() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: tasks, isPending, isError, refetch, isRefetching } = useTasks();
  const { data: members } = useMembers();
  const setDone = useSetTaskDone();
  const reschedule = useRescheduleTask();
  const deleteTask = useDeleteTask();
  const undo = useUndo();

  // Tên người phụ trách tra bằng map: dòng nào cũng cần, và `find` trong render
  // là O(dòng × người) mỗi lần một ô tròn được chạm.
  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  // Nhóm rỗng ẩn HẲN — không hiện "không có gì" (05 §4).
  const sections = useMemo(() => {
    const hidden = undo.pending ? undo.pendingIds : null;
    return groupTasksByDue(tasks ?? [], today)
      .map((g) => ({
        key: g.key,
        title: t.task[GROUP_LABEL[g.key]],
        // Dòng đang chờ xoá biến mất NGAY, trước khi lệnh xoá thật chạy — nếu
        // không, "hoàn tác" là hoàn tác một thứ vẫn còn nằm đó.
        data: hidden ? g.tasks.filter((x) => !hidden.has(x.id)) : g.tasks,
      }))
      .filter((g) => g.data.length > 0);
  }, [tasks, today, t, undo.pending, undo.pendingIds]);

  if (isPending) return <ListSkeleton rows={5} />;
  if (isError) {
    return <ErrorState message={t.error.unknown} retryLabel={t.common.retry} onRetry={() => void refetch()} />;
  }

  if (sections.length === 0) {
    return (
      <>
        <View className="flex-1 justify-center">
          <EmptyState
            title={t.task.emptyTitle}
            body={t.task.emptyBody}
            actionLabel={t.task.emptyAction}
            onAction={() => router.push('/(modals)/quick-add')}
          />
        </View>
        <FAB onPress={() => router.push('/(modals)/quick-add')} />
      </>
    );
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item: Task) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24"
        refreshControl={
          // Kéo xuống để làm mới. Không auto-refresh theo chu kỳ (05 §4).
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-1 mt-6 text-label font-semibold text-muted">{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TaskRow
            title={item.title}
            done={item.status === 'done'}
            assigneeName={item.assigneeId ? (memberName.get(item.assigneeId) ?? null) : null}
            repeats={item.recur !== null}
            onToggle={(next) => setDone.mutate({ id: item.id, done: next })}
            onPress={() => router.push(`/(app)/plan/task/${item.id}`)}
            onSnooze={() =>
              reschedule.mutate({ id: item.id, dueDate: addDays(item.dueDate ?? today, 1) })
            }
            onDelete={() =>
              undo.schedule({
                id: item.id,
                message: t.task.deleted,
                onCommit: () => deleteTask.mutate(item.id),
              })
            }
          />
        )}
      />

      <UndoToast pending={undo.pending} onUndo={undo.undo} />
      <FAB onPress={() => router.push('/(modals)/quick-add')} />
    </>
  );
}

/** Tab Sự kiện — nội dung thật lên ở G6 cùng lịch âm. */
function EventPlaceholder() {
  const { t } = useT();
  return (
    <View className="flex-1 justify-center">
      <EmptyState title={t.event.emptyTitle} body={t.event.emptyBody} />
    </View>
  );
}
