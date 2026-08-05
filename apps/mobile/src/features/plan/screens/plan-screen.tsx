/**
 * Việc & Sự kiện — 05 §5, 09 §D.
 *
 * Tab con `Việc | Mua sắm | Sự kiện`, nhớ tab đã chọn lần trước (`stores/ui-prefs`).
 *
 * Ba tab nhóm theo ba trục khác nhau vì chúng trả lời ba câu hỏi khác nhau: Việc
 * gom theo LOẠI việc ("còn gì phải làm"), Mua sắm là một danh sách phẳng ("cần
 * mua gì"), Sự kiện gom theo tháng ("sắp tới nhà mình có dịp gì"). Phép gom của
 * Việc và Sự kiện nằm ở `packages/domain` sau cổng test.
 *
 * ── Bố cục (bản dựng lại theo mockup) ──
 *
 * Mỗi nhóm là một **mảng trắng** (`Section`) trên nền `canvas`, có badge đếm ở
 * tiêu đề; bên trong, từng dòng PHẲNG cách nhau 20px (§8, §13.1). Đây là cùng
 * ngôn ngữ với màn Nhà mình, nên hai màn đọc như một app chứ không phải hai.
 *
 * ── Hai danh sách việc hiện CÙNG LÚC, không còn bộ chọn ──
 *
 * Trước đây «Định kỳ» / «Linh hoạt» là một `Segmented` con và lựa chọn được nhớ
 * lại (`ui-prefs.taskListTab`). Giờ cả hai xếp chồng trong một lần cuộn.
 *
 * Lý do: bộ chọn đó bắt trả một cái giá mỗi ngày — người dùng phải nhớ mình
 * đang đứng ở danh sách nào, và việc ở danh sách kia thì **vô hình**. Với một
 * nhà có chừng năm việc định kỳ và vài việc phát sinh, hai thẻ chồng nhau vừa
 * một màn hình rưỡi; ẩn một nửa để tiết kiệm chỗ mà không có chỗ nào để tiết
 * kiệm là đổi thông tin lấy một cử chỉ.
 *
 * Ba khác biệt về HÀNH VI giữa hai danh sách thì giữ nguyên (09 §D.1) — chúng
 * là quyết định sản phẩm, không phải hệ quả của việc chúng từng nằm ở hai tab.
 *
 * `taskListTab` trong `ui-prefs` KHÔNG còn ai đọc từ màn này. Để lại trong store
 * vì nó đã persist trên máy người dùng; xoá khoá khỏi state không xoá được giá
 * trị đã ghi, nên dọn nó là một việc riêng có migration.
 *
 * ── Vì sao `ScrollView` chứ không `SectionList` ──
 *
 * Một màn chứa hai đến ba mảng trắng, mỗi mảng vài chục dòng. `SectionList` sinh
 * ra cho danh sách phẳng dài, và không có cách nào để nó vẽ nền trắng bo góc bao
 * quanh từng nhóm mà không dựng lại `ListHeaderComponent`/`ListFooterComponent`
 * cho mỗi section. Ảo hoá để dành cho danh sách giấy tờ, nơi số dòng thật sự lớn.
 */

import {
  addDays,
  formatDueLabel,
  groupEventsByMonth,
  groupTasksByDue,
  orderFlexibleTasks,
  type FamilyEvent,
  type Task,
  type TaskGroupKey,
  type UUID,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  Section,
  Segmented,
  UndoToast,
  useUndo,
} from '@/design/components';
import { EventRow } from '@/features/event/components';
import { useEvents } from '@/features/event/queries/use-events';
import { AddFab } from '@/features/home/components';
import { useMe, useMembers } from '@/features/member/queries/use-members';
import { ShoppingListScreen } from '@/features/shopping/screens/shopping-list-screen';
import { TaskRow } from '@/features/task/components';
import {
  useDeleteTask,
  useRescheduleTask,
  useSetTaskDone,
  useTasks,
  useUpdateTask,
} from '@/features/task/queries/use-tasks';
import { dueLabelText, useT, vi } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useUIPrefs, type PlanTab } from '@/stores/ui-prefs';

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
    // `edges={['top']}`: đây là tab gốc, `headerShown: false` nên không có header
    // nào đứng giữa nội dung và notch. Cạnh dưới KHÔNG khai — tab bar đã nằm ở
    // đó và Expo Router tự chừa home indicator.
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="px-4 pt-3">
        {/* Tên nhà làm dòng dẫn phía trên tiêu đề: nó trả lời "đây là app của
            nhà mình", còn tiêu đề trả lời "đang xem cái gì". Gộp hai thứ vào
            một dòng thì mất một trong hai. */}
        <Text className="text-caption font-medium text-muted">{t.tabs.home}</Text>
        <Text className="mt-1 text-title1 font-semibold tracking-[-0.9px] text-ink">
          {t.tabs.plan}
        </Text>

        <View className="mt-6">
          <Segmented options={options} value={planTab} onChange={setPlanTab} />
        </View>
      </View>

      {planTab === 'task' ? <TaskLists /> : null}
      {planTab === 'shopping' ? <ShoppingListScreen /> : null}
      {planTab === 'event' ? <EventList /> : null}

      {/* FAB nổi như ba tab còn lại — mockup vẽ nút «Thêm» trong header nhưng
          giữ FAB: bốn tab dùng chung một cách thêm là thứ người dùng học một
          lần, và một tab làm khác đi bắt họ tìm lại cái nút ở chỗ mới. */}
      <AddFab />
    </SafeAreaView>
  );
}

/**
 * Vỏ cuộn dùng chung cho tab Việc và tab Sự kiện.
 *
 * `gap-4` giữa các mảng section (§7.3 — 16–20px), giống màn Nhà mình. Khoảng
 * cách đặt ở CONTAINER chứ không để mỗi section tự khai lề trên: section nào ẩn
 * đi sẽ để lại một khoảng trống khác nhau nếu mỗi cái tự lo.
 */
function PlanScroll({
  isRefetching,
  onRefresh,
  children,
}: {
  isRefetching: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-24 pt-5"
      showsVerticalScrollIndicator={false}
      refreshControl={
        // Kéo xuống để làm mới. Không auto-refresh theo chu kỳ (05 §4).
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    >
      {children}
    </ScrollView>
  );
}

/**
 * Tiêu đề một mảng trắng: tên nhóm + badge đếm.
 *
 * Badge đếm nền `accent` khi còn việc, `soft` khi hết. Nền accent là thứ §5.3
 * giao đúng cho màu này ("counts") — một mảng nhỏ, mang thông tin. Nhóm đã xong
 * chuyển sang xám vì "0 việc" không phải một tín hiệu cần bắt mắt.
 */
function SectionHeading({
  title,
  count,
  subtitle,
}: {
  title: string;
  count: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-4 flex-row items-start justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-heading font-semibold tracking-[-0.4px] text-ink">{title}</Text>
        {subtitle ? <Text className="mt-1 text-caption text-muted">{subtitle}</Text> : null}
      </View>
      <View className="rounded-status bg-accent-soft px-2.5 py-1">
        <Text className="text-micro font-semibold text-ink">{count}</Text>
      </View>
    </View>
  );
}

/**
 * Hai danh sách việc — 03 §4b, 09 §D.1.
 *
 * Cả hai cùng hiện, «Định kỳ» trước. Thứ tự đó không tuỳ ý: việc định kỳ là thứ
 * có hạn hôm nay, tức là câu hỏi người dùng mở app để trả lời; việc linh hoạt
 * theo đúng định nghĩa của nó thì không gấp.
 *
 * MỘT toast hoàn tác cho cả hai danh sách. Hai `useUndo` riêng sẽ cho hai toast
 * chồng nhau khi người dùng xoá nhanh một dòng ở mỗi bên — và cái thứ hai che
 * mất cái thứ nhất trước khi ai kịp bấm "Hoàn tác".
 */
function TaskLists() {
  const { t } = useT();
  const router = useRouter();
  const undo = useUndo();

  const recurring = useTasks('recurring');
  const flexible = useTasks('flexible');

  const isPending = recurring.isPending || flexible.isPending;
  const isError = recurring.isError || flexible.isError;

  const refetch = () => {
    void recurring.refetch();
    void flexible.refetch();
  };

  if (isPending) {
    return (
      <PlanScroll isRefetching={false} onRefresh={refetch}>
        <Section>
          <ListSkeleton rows={5} />
        </Section>
      </PlanScroll>
    );
  }

  if (isError) {
    return (
      <View className="px-4 pt-6">
        <ErrorState message={t.error.unknown} retryLabel={t.common.retry} onRetry={refetch} />
      </View>
    );
  }

  const hasAny = (recurring.data ?? []).length > 0 || (flexible.data ?? []).length > 0;

  // Cả hai danh sách cùng rỗng → MỘT trạng thái rỗng cho cả màn, không phải hai
  // thẻ mỗi thẻ một câu "chưa có gì". Hai lời mời cạnh nhau cho cùng một hành
  // động là hai lần nhắc người dùng rằng họ chưa làm gì (05 §4).
  if (!hasAny) {
    return (
      <View className="flex-1 justify-center px-4">
        <EmptyState
          title={t.task.emptyTitle}
          body={t.task.emptyBody}
          actionLabel={t.task.emptyAction}
          // Thẳng tới form việc, KHÔNG qua menu [+]: người dùng đang đứng ở tab
          // Việc và vừa chạm một nút ghi rõ "Thêm việc" — hỏi lại họ muốn thêm
          // loại gì là hỏi một câu họ vừa trả lời.
          onAction={() => router.push('/(modals)/task-form')}
        />
      </View>
    );
  }

  return (
    <>
      <PlanScroll
        isRefetching={recurring.isRefetching || flexible.isRefetching}
        onRefresh={refetch}
      >
        <RecurringTaskList tasks={recurring.data ?? []} undo={undo} />
        <FlexibleTaskList tasks={flexible.data ?? []} undo={undo} />
      </PlanScroll>

      <UndoToast pending={undo.pending} onUndo={undo.undo} />
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

type UndoHandle = ReturnType<typeof useUndo>;

/**
 * Danh sách VIỆC ĐỊNH KỲ — 03 §4b, 09 §D.1a.
 *
 * Nhóm theo hạn, sáu nhóm cố định. Chip người phụ trách bấm được để xoay vòng.
 *
 * KHÔNG CÓ VUỐT-ĐỂ-HOÃN, khác bản trước. Với việc lặp, `dueDate` là MỐC NEO chứ
 * không phải một lần xảy ra — lùi nó một ngày là dời cả chuỗi, trong khi người
 * dùng tưởng mình chỉ hoãn hôm nay. Đây là sửa lỗi mặc áo tính năng (10 §2.1).
 */
// `Task[]` chứ không `readonly Task[]`: `groupTasksByDue` và `orderFlexibleTasks`
// nhận mảng mutable, và siết kiểu ở đây chỉ đẩy một `[...tasks]` thừa vào mỗi
// lần render — hàm domain là hàm thuần, nó không ghi vào mảng đầu vào.
function RecurringTaskList({ tasks, undo }: { tasks: Task[]; undo: UndoHandle }) {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: members } = useMembers();
  const setDone = useSetTaskDone();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

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
  const groups = useMemo(() => {
    const hidden = undo.pending ? undo.pendingIds : null;
    return groupTasksByDue(tasks, today)
      .map((g) => ({
        key: g.key,
        title: t.task[GROUP_LABEL[g.key]],
        // Dòng đang chờ xoá biến mất NGAY, trước khi lệnh xoá thật chạy — nếu
        // không, "hoàn tác" là hoàn tác một thứ vẫn còn nằm đó.
        tasks: hidden ? g.tasks.filter((x) => !hidden.has(x.id)) : g.tasks,
      }))
      .filter((g) => g.tasks.length > 0);
  }, [tasks, today, t, undo.pending, undo.pendingIds]);

  const remaining = groups.reduce(
    (n, g) => n + g.tasks.filter((x) => x.status !== 'done').length,
    0,
  );

  // Cả danh sách rỗng thì ẩn HẲN cái thẻ. `TaskLists` đã lo trạng thái rỗng cho
  // cả màn khi cả hai bên cùng trống; ở đây chỉ là "nhà này không có việc định
  // kỳ nào", và một thẻ trắng nói điều đó không thêm gì.
  if (groups.length === 0) return null;

  return (
    <Section>
      <SectionHeading
        title={t.task.listRecurring}
        count={f(t.task.countLabel, { count: remaining })}
      />

      <View className="gap-5">
        {groups.map((g, gi) => (
          <View key={g.key} className="gap-5">
            {/* Nhãn nhóm KHÔNG dính khi cuộn (09 §D.1a). Nhóm đầu không có lề
                trên — tiêu đề section ngay trên nó đã tạo khoảng cách rồi. */}
            <Text className={`text-label font-semibold text-muted ${gi > 0 ? 'mt-1' : ''}`}>
              {g.title}
            </Text>

            {g.tasks.map((item) => (
              <TaskRow
                key={item.id}
                title={item.title}
                done={item.status === 'done'}
                meta={item.dueDate ? dueLabelText(formatDueLabel(item.dueDate, today)) : null}
                metaTone={g.key === 'overdue' ? 'attention' : 'muted'}
                assigneeName={item.assigneeId ? (memberName.get(item.assigneeId) ?? null) : null}
                // Chỉ có nghĩa khi nhà đủ hai người lớn — dưới đó chip để đọc.
                {...(adults.length >= 2 ? { onCycleAssignee: () => cycleAssignee(item) } : {})}
                repeats={item.recur !== null}
                onToggle={(next) => setDone.mutate({ id: item.id, done: next })}
                onPress={() =>
                  router.push({ pathname: '/(modals)/task-edit', params: { id: item.id } })
                }
                // KHÔNG truyền `onSnooze` — xem chú thích đầu hàm.
                onDelete={() =>
                  undo.schedule({
                    id: item.id,
                    message: t.task.deleted,
                    onCommit: () => deleteTask.mutate(item.id),
                  })
                }
              />
            ))}
          </View>
        ))}
      </View>
    </Section>
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
 *   2. **KHÔNG GÁN ĐƯỢC CHO NGƯỜI KIA.** Mặc định không tên. Dòng chưa ai nhận
 *      có nút «Nhận», và nút đó gán cho **chính người đang chạm** — không có
 *      danh sách người để chọn, không có vòng xoay tên như danh sách định kỳ.
 *      Đây là ranh giới giữ cho nó là danh sách việc CỦA NHÀ chứ không phải hộp
 *      thư nhiệm vụ một người gửi cho người kia. Chạm lại chip của mình là bỏ
 *      nhận; chip của người kia thì chỉ đọc.
 *
 *   3. **Việc đã xong KHÔNG bị loại** (`orderFlexibleTasks` giữ lại, chỉ đẩy
 *      xuống dưới). Khác `groupTasksByDue`. Người ta cần thấy thứ mình vừa tick.
 *
 * VUỐT ĐỂ HOÃN thì CÓ ở đây — ngược với danh sách định kỳ: việc một lần có một
 * cái hạn thật, lùi nó một ngày đúng nghĩa là lùi một ngày.
 */
function FlexibleTaskList({ tasks, undo }: { tasks: Task[]; undo: UndoHandle }) {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();

  const { data: me } = useMe();
  const { data: members } = useMembers();
  const setDone = useSetTaskDone();
  const reschedule = useRescheduleTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const memberName = useMemo(() => {
    const m = new Map<UUID, string>();
    for (const x of members ?? []) m.set(x.id, x.displayName);
    return m;
  }, [members]);

  const list = useMemo(() => {
    const hidden = undo.pending ? undo.pendingIds : null;
    const ordered = orderFlexibleTasks(tasks);
    return hidden ? ordered.filter((x) => !hidden.has(x.id)) : ordered;
  }, [tasks, undo.pending, undo.pendingIds]);

  if (list.length === 0) return null;

  const remaining = list.filter((x) => x.status !== 'done').length;

  return (
    <Section>
      <SectionHeading
        title={t.task.listFlexible}
        count={f(t.task.countLabel, { count: remaining })}
      />

      <View className="gap-5">
        {list.map((item) => {
          const mine = me != null && item.assigneeId === me.id;
          return (
            <TaskRow
              key={item.id}
              title={item.title}
              done={item.status === 'done'}
              meta={item.dueDate ? dueLabelText(formatDueLabel(item.dueDate, today)) : null}
              assigneeName={item.assigneeId ? (memberName.get(item.assigneeId) ?? null) : null}
              // KHÔNG truyền `onCycleAssignee` — xem điểm 2 ở chú thích đầu hàm.
              // «Nhận» chỉ hiện khi chưa ai nhận VÀ ta biết mình là member nào;
              // bỏ nhận chỉ khi việc đang thuộc về chính mình.
              {...(me && !item.assigneeId
                ? { onClaim: () => updateTask.mutate({ id: item.id, patch: { assigneeId: me.id } }) }
                : {})}
              {...(mine
                ? { onUnclaim: () => updateTask.mutate({ id: item.id, patch: { assigneeId: null } }) }
                : {})}
              repeats={false}
              onToggle={(next) => setDone.mutate({ id: item.id, done: next })}
              onPress={() =>
                router.push({ pathname: '/(modals)/task-edit', params: { id: item.id } })
              }
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
          );
        })}
      </View>
    </Section>
  );
}

/**
 * Tab Sự kiện — 05 §5.3, 09 §D.3.
 *
 * Mỗi tháng là một mảng trắng, sắp theo `nextOccurrenceDate`. Mỗi dòng hiện
 * **CẢ HAI** ngày: *"Đây là điểm khác biệt bản địa rõ nhất — đừng giấu."*
 */
function EventList() {
  const { t, f } = useT();
  const router = useRouter();
  const today = useToday();
  const { data: events, isPending, isError, refetch, isRefetching } = useEvents();

  const groups = useMemo(
    () =>
      groupEventsByMonth(events ?? [], today).map((g) => ({
        key: g.month ?? 'undated',
        // Nhóm chưa tính được ngày dùng nhãn riêng — nó không phải một tháng.
        title:
          g.monthNumber === null || g.year === null
            ? t.event.pendingDate
            : f(t.event.monthLabel, { month: g.monthNumber, year: g.year }),
        events: g.events,
      })),
    [events, today, t, f],
  );

  // Sự kiện gần nhất — ĐÚNG MỘT dòng mang ô ngày accent. Nó là dòng đầu của
  // nhóm đầu, nhưng chỉ khi nhóm đó đã có ngày: nhóm "Đang tính ngày" xếp cuối
  // ở `groupEventsByMonth`, nên nếu nó là nhóm đầu thì cả danh sách chưa có
  // ngày nào để gọi là "gần nhất".
  const nextEventId = useMemo(() => {
    const first = groups[0];
    if (!first || first.key === 'undated') return null;
    return first.events[0]?.id ?? null;
  }, [groups]);

  if (isPending) {
    return (
      <PlanScroll isRefetching={false} onRefresh={() => void refetch()}>
        <Section>
          <ListSkeleton rows={4} />
        </Section>
      </PlanScroll>
    );
  }

  if (isError) {
    return (
      <View className="px-4 pt-6">
        <ErrorState
          message={t.error.unknown}
          retryLabel={t.common.retry}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View className="flex-1 justify-center px-4">
        <EmptyState
          title={t.event.emptyTitle}
          body={t.event.emptyBody}
          actionLabel={t.event.emptyAction}
          onAction={() => router.push('/(modals)/event-form')}
        />
      </View>
    );
  }

  return (
    <PlanScroll isRefetching={isRefetching} onRefresh={() => void refetch()}>
      {groups.map((g) => (
        <Section key={g.key}>
          <SectionHeading
            title={g.title}
            count={f(t.event.countLabel, { count: g.events.length })}
          />

          <View className="gap-5">
            {g.events.map((event: FamilyEvent) => (
              <EventRow
                key={event.id}
                event={event}
                isNext={event.id === nextEventId}
                onPress={() =>
                  router.push({ pathname: '/(modals)/event-form', params: { id: event.id } })
                }
              />
            ))}
          </View>
        </Section>
      ))}
    </PlanScroll>
  );
}
