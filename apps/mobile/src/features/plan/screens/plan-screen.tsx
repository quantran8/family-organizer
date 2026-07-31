/**
 * Việc & Sự kiện — 05 §5.
 *
 * Tab con `Việc | Sự kiện`, nhớ tab đã chọn lần trước (`stores/ui-prefs`).
 *
 * Hai tab con nhóm theo hai trục khác nhau vì chúng trả lời hai câu hỏi khác
 * nhau: Việc gom theo hạn ("còn gì phải làm"), Sự kiện gom theo tháng ("sắp tới
 * nhà mình có dịp gì"). Cả hai phép gom nằm ở `packages/domain` sau cổng test.
 *
 * Danh sách dùng `SectionList` chứ không `FlashList`: sáu nhóm cố định với vài
 * chục dòng mỗi nhóm không cần ảo hoá, còn tiêu đề dính (`stickySectionHeaders`)
 * thì có sẵn. FlashList để dành cho danh sách giấy tờ, nơi số dòng thật sự lớn.
 */

import {
  addDays,
  groupEventsByMonth,
  groupTasksByDue,
  type FamilyEvent,
  type Task,
  type TaskGroupKey,
  type UUID,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, Text, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  Screen,
  Segmented,
  UndoToast,
  useUndo,
} from '@/design/components';
import { EventRow } from '@/features/event/components';
import { useEvents } from '@/features/event/queries/use-events';
import { AddFab } from '@/features/home/components';
import { useMembers } from '@/features/member/queries/use-members';
import { TaskRow } from '@/features/task/components';
import {
  useDeleteTask,
  useRescheduleTask,
  useSetTaskDone,
  useTasks,
} from '@/features/task/queries/use-tasks';
import { useT, vi } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useUIPrefs, type PlanTab } from '@/stores/ui-prefs';

export function PlanScreen() {
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

      {planTab === 'task' ? <TaskList /> : <EventList />}
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
            // Thẳng tới form việc, KHÔNG qua menu [+]: người dùng đang đứng ở
            // tab Việc và vừa chạm một nút ghi rõ "Thêm việc" — hỏi lại họ muốn
            // thêm loại gì là hỏi một câu họ vừa trả lời.
            onAction={() => router.push('/(modals)/task-form')}
          />
        </View>
        <AddFab />
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
      <AddFab />
    </>
  );
}

/**
 * Tab Sự kiện — 05 §5.3.
 *
 * Chia mốc theo tháng, sắp theo `nextOccurrenceDate`. Mỗi dòng hiện **CẢ HAI**
 * ngày với ngày âm màu son: *"Đây là điểm khác biệt bản địa rõ nhất — đừng giấu."*
 */
function EventList() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const { data: events, isPending, isError, refetch, isRefetching } = useEvents();

  const sections = useMemo(
    () =>
      groupEventsByMonth(events ?? [], today).map((g) => ({
        key: g.month ?? 'undated',
        // Nhóm chưa tính được ngày dùng nhãn riêng — nó không phải một tháng.
        title:
          g.monthNumber === null || g.year === null
            ? t.event.pendingDate
            : f(t.event.monthLabel, { month: g.monthNumber, year: g.year }),
        data: g.events,
      })),
    [events, today, t, f],
  );

  if (isPending) return <ListSkeleton rows={4} />;
  if (isError) {
    return (
      <ErrorState
        message={t.error.unknown}
        retryLabel={t.common.retry}
        onRetry={() => void refetch()}
      />
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <View className="flex-1 justify-center">
          <EmptyState
            title={t.event.emptyTitle}
            body={t.event.emptyBody}
            actionLabel={t.event.emptyAction}
            onAction={() => router.push('/(modals)/event-form')}
          />
        </View>
        <AddFab />
      </>
    );
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item: FamilyEvent) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-24"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        renderSectionHeader={({ section }) => (
          <Text className="mb-1 mt-6 text-label font-semibold text-muted">{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <EventRow
            event={item}
            onPress={() => router.push(`/(app)/plan/event/${item.id}`)}
          />
        )}
      />
      <AddFab />
    </>
  );
}
