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
  orderFlexibleTasks,
  type FamilyEvent,
  type Task,
  type TaskGroupKey,
  type UUID,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, SectionList, Text, View } from 'react-native';

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
import { ShoppingListScreen } from '@/features/shopping/screens/shopping-list-screen';
import { TaskRow } from '@/features/task/components';
import {
  useDeleteTask,
  useRescheduleTask,
  useSetTaskDone,
  useTasks,
  useUpdateTask,
} from '@/features/task/queries/use-tasks';
import { useT, vi } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useUIPrefs, type PlanTab, type TaskListTab } from '@/stores/ui-prefs';

export function PlanScreen() {
  const { t } = useT();
  const planTab = useUIPrefs((s) => s.planTab);
  const setPlanTab = useUIPrefs((s) => s.setPlanTab);

  const options: readonly { value: PlanTab; label: string }[] = [
    { value: 'task', label: t.task.title },
    { value: 'shopping', label: t.shopping.title },
    { value: 'event', label: t.event.title },
  ];

  return (
    <Screen>
      <View className="pt-2">
        <Text className="mb-4 text-title1 font-semibold text-ink">{t.tabs.plan}</Text>
        <Segmented options={options} value={planTab} onChange={setPlanTab} />
      </View>

      {planTab === 'task' ? <TaskTabs /> : null}
      {planTab === 'shopping' ? <ShoppingListScreen /> : null}
      {planTab === 'event' ? <EventList /> : null}
    </Screen>
  );
}

/**
 * Hai danh sách việc — 03 §4b, 09 §D.1.
 *
 * Bộ chọn lồng bên trong tab Việc, không phải tab thứ tư ở cấp trên: bốn mục
 * trên một `Segmented` là quá chật, và quan trọng hơn, «Định kỳ» / «Linh hoạt»
 * là hai cách nhìn CÙNG MỘT thứ (việc nhà), khác cấp với «Việc | Mua sắm | Sự
 * kiện» vốn là ba loại dữ liệu khác nhau.
 */
function TaskTabs() {
  const { t } = useT();
  const tab = useUIPrefs((s) => s.taskListTab);
  const setTab = useUIPrefs((s) => s.setTaskListTab);

  const options: readonly { value: TaskListTab; label: string }[] = [
    { value: 'recurring', label: t.task.listRecurring },
    { value: 'flexible', label: t.task.listFlexible },
  ];

  return (
    <>
      <View className="mb-2 mt-3">
        <Segmented options={options} value={tab} onChange={setTab} />
      </View>
      {tab === 'recurring' ? <RecurringTaskList /> : <FlexibleTaskList />}
    </>
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

/**
 * Danh sách VIỆC ĐỊNH KỲ — 03 §4b, 09 §D.1a.
 *
 * Nhóm theo hạn, sáu nhóm cố định. Chip người phụ trách bấm được để xoay vòng.
 *
 * KHÔNG CÓ VUỐT-ĐỂ-HOÃN, khác bản trước. Với việc lặp, `dueDate` là MỐC NEO chứ
 * không phải một lần xảy ra — lùi nó một ngày là dời cả chuỗi, trong khi người
 * dùng tưởng mình chỉ hoãn hôm nay. Đây là sửa lỗi mặc áo tính năng (10 §2.1).
 */
function RecurringTaskList() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: tasks, isPending, isError, refetch, isRefetching } = useTasks('recurring');
  const { data: members } = useMembers();
  const setDone = useSetTaskDone();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const undo = useUndo();

  // Tên người phụ trách tra bằng map: dòng nào cũng cần, và `find` trong render
  // là O(dòng × người) mỗi lần một ô tròn được chạm.
  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  /**
   * Vòng đổi người phụ trách khi chạm chip — 06 §7.
   *
   * CHỈ `owner` và `partner`: một nhà có thể có `child` và `relative` trong
   * `members` (hồ sơ con ở 07 §4, ông bà hai bên), và việc nhà không được rơi
   * vào tên một đứa trẻ chỉ vì người dùng chạm thêm một nhịp.
   *
   * Vòng KHÔNG có nấc "chưa phân": bỏ gán là một quyết định khác hẳn với đổi
   * người, và trộn nó vào cùng một cử chỉ nghĩa là người dùng đang xoay tên qua
   * lại thì bất chợt việc rơi về không ai. Bỏ gán nằm ở màn chi tiết.
   */
  const adults = useMemo(
    () => (members ?? []).filter((m) => m.role === 'owner' || m.role === 'partner'),
    [members],
  );

  const cycleAssignee = (task: Task): void => {
    // Một mình thì không có ai để đổi sang — chip vẫn hiện, chạm không làm gì.
    if (adults.length < 2) return;
    const at = adults.findIndex((m) => m.id === task.assigneeId);
    // Người hiện tại không nằm trong vòng (đã rời nhà, hoặc là `relative`) →
    // `-1 + 1 = 0`, rơi về người đầu. Đúng thứ ta muốn: một cái tên không đổi
    // được nữa là một dòng kẹt.
    const next = adults[(at + 1) % adults.length];
    if (!next) return;
    updateTask.mutate({ id: task.id, patch: { assigneeId: next.id } });
  };

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
            title={t.task.emptyRecurringTitle}
            body={t.task.emptyRecurringBody}
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
        contentContainerClassName="px-4 pb-24"
        ItemSeparatorComponent={ListGap}
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
            // Chỉ có nghĩa khi nhà đủ hai người lớn — dưới đó chip để đọc.
            onCycleAssignee={adults.length >= 2 ? () => cycleAssignee(item) : undefined}
            repeats={item.recur !== null}
            onToggle={(next) => setDone.mutate({ id: item.id, done: next })}
            onPress={() => router.push(`/(app)/plan/task/${item.id}`)}
            // KHÔNG truyền `onSnooze` — xem chú thích đầu hàm.
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
 * Danh sách VIỆC LINH HOẠT — 03 §4b, 09 §D.1b.
 *
 * Việc phát sinh, không gấp, ai làm cũng được: lau quạt trần, gọi thợ, đặt vé.
 *
 * BA KHÁC BIỆT so với danh sách định kỳ, cả ba đều là quyết định sản phẩm:
 *
 *   1. **KHÔNG chia nhóm.** Một danh sách phẳng: chưa xong trước, rồi theo thứ
 *      tự thêm vào. Việc không có hạn thì chia theo hạn là chia theo một trục
 *      không tồn tại.
 *
 *   2. **KHÔNG có chip người phụ trách.** Mặc định không tên, và KHÔNG GÁN ĐƯỢC
 *      CHO NGƯỜI KIA. Đây là ranh giới giữ cho nó là danh sách việc CỦA NHÀ chứ
 *      không phải hộp thư nhiệm vụ một người gửi cho người kia. Muốn nhận việc
 *      thì vào chi tiết và chọn "Mình làm" — chỉ nấc đó.
 *
 *   3. **Việc đã xong KHÔNG bị loại** (`orderFlexibleTasks` giữ lại, chỉ đẩy
 *      xuống dưới). Khác `groupTasksByDue`. Người ta cần thấy thứ mình vừa tick.
 *
 * VUỐT ĐỂ HOÃN thì CÓ ở đây — ngược với danh sách định kỳ: việc một lần có một
 * cái hạn thật, lùi nó một ngày đúng nghĩa là lùi một ngày.
 */
function FlexibleTaskList() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: tasks, isPending, isError, refetch, isRefetching } = useTasks('flexible');
  const setDone = useSetTaskDone();
  const reschedule = useRescheduleTask();
  const deleteTask = useDeleteTask();
  const undo = useUndo();

  const list = useMemo(() => {
    const hidden = undo.pending ? undo.pendingIds : null;
    const ordered = orderFlexibleTasks(tasks ?? []);
    return hidden ? ordered.filter((x) => !hidden.has(x.id)) : ordered;
  }, [tasks, undo.pending, undo.pendingIds]);

  if (isPending) return <ListSkeleton rows={5} />;
  if (isError) {
    return (
      <ErrorState
        message={t.error.unknown}
        retryLabel={t.common.retry}
        onRetry={() => void refetch()}
      />
    );
  }

  if (list.length === 0) {
    return (
      <>
        <View className="flex-1 justify-center">
          <EmptyState
            title={t.task.emptyFlexibleTitle}
            body={t.task.emptyFlexibleBody}
            actionLabel={t.task.emptyAction}
            onAction={() => router.push('/(modals)/task-form')}
          />
        </View>
        <AddFab />
      </>
    );
  }

  return (
    <>
      <FlatList
        data={list}
        keyExtractor={(item: Task) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-24 pt-2"
        ItemSeparatorComponent={ListGap}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        renderItem={({ item }) => (
          <TaskRow
            title={item.title}
            done={item.status === 'done'}
            // KHÔNG truyền `assigneeName` và KHÔNG truyền `onCycleAssignee` —
            // xem điểm 2 ở chú thích đầu hàm.
            repeats={false}
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
        contentContainerClassName="px-4 pb-24"
        ItemSeparatorComponent={ListGap}
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

/**
 * Khoảng cách giữa hai dòng trong danh sách — thay cho đường kẻ.
 *
 * `TaskRow`/`EventRow` không còn tự vẽ `border-b`: chúng là dòng PHẲNG, và §8
 * nói khoảng cách là dải phân cách mặc định, đường kẻ chỉ dành cho danh sách
 * dày bất thường. Đặt ở đây thay vì trong `py` của chính dòng để dòng cuối
 * không thừa một khoảng đệm dưới đáy danh sách.
 */
function ListGap() {
  return <View className="h-5" />;
}
