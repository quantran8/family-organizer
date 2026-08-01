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
  formatDeclaredAt,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  EmptyState,
  ListSkeleton,
  MemberAvatar,
  StatusPill,
  UndoToast,
  useUndo,
} from '@/design/components';
import { useCostAskPrompt } from '@/features/event/queries/use-cost-ask-prompt';
import { AddFab } from '@/features/home/components';
import { useFinanceMetrics, useUpcomingNeeds } from '@/features/household/queries/use-household';
import { useMe, useMembers } from '@/features/member/queries/use-members';
import { useShoppingItems } from '@/features/shopping/queries/use-shopping';
import { TaskRow } from '@/features/task/components';
import { useDeleteTask, useSetTaskDone, useTasks } from '@/features/task/queries/use-tasks';
import { declaredAtText, financeReasonText, useT, weekdayName } from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useSessionStore } from '@/stores/session';

export function HomeScreen() {
  const { t } = useT();
  const router = useRouter();
  const today = useToday();
  const householdName = useSessionStore((s) => s.householdName);

  // Sheet "dịp vừa qua hết bao nhiêu?" — tự bật MỘT lần mỗi lần chạy app, chỉ
  // khi màn này đang được nhìn (05 §5.7). Toàn bộ điều kiện nằm trong hook.
  useCostAskPrompt();

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

  // Card CẦN MUA hiện cả khi mọi nhóm khác rỗng, nên nó phải được tính vào đây:
  // thiếu vế này thì màn hình vừa hiện "Bắt đầu từ điều gần nhất" vừa hiện một
  // danh sách ba món cần mua — hai câu mâu thuẫn nhau trên cùng một màn.
  const { data: shopping } = useShoppingItems();
  const hasShopping = (shopping ?? []).some((i) => !i.isDone);

  const isEmpty =
    !isPending && todayTasks.length === 0 && weekTasks.length === 0 && !hasShopping;

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
    // `edges={['top']}`: đây là tab gốc, `headerShown: false` nên không có
    // header nào đứng giữa nội dung và notch. Cạnh dưới KHÔNG khai — tab bar đã
    // nằm ở đó và Expo Router tự chừa home indicator; khai thêm sẽ đội nội dung
    // lên một khoảng trống thừa ngay phía trên tab bar.
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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

        <ShoppingCard onPress={() => router.push('/(app)/plan')} />

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
            />
          </View>
        ) : null}
      </ScrollView>

      <UndoToast pending={undo.pending} onUndo={undo.undo} />
      <AddFab />
    </SafeAreaView>
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
  const { data: metrics } = useFinanceMetrics();
  // `needs` là đầu vào BẮT BUỘC từ v2: con số "cần chuẩn bị 30 ngày" phải gồm
  // cả chi phí sự kiện và phí gia hạn giấy tờ, không chỉ khoản sắp trả (06 §0.2).
  const { data: needs } = useUpcomingNeeds(today);

  if (!metrics) return null;
  const needsList = needs ?? [];
  const status = computeFinanceStatus(metrics, needsList, today);
  if (status === 'no_data') return null;

  const { reason } = explainFinanceStatus(metrics, needsList, today);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mt-5">
      <Card>
        <StatusPill status={status} />
        <Text className="mt-2 text-body text-ink">{financeReasonText(reason)}</Text>
        {/* Nhãn thời gian của SỐ KHAI — bắt buộc ở mọi chỗ hiện số tổng (03 §8).
            Dùng nhóm "dùng ngay" vì đó là con số màn Tiền dựa vào. */}
        <Text className="mt-1 text-caption text-subtle">
          {declaredAtText(formatDeclaredAt(metrics.lastUsableUpdatedOn, null, today))}
        </Text>
      </Card>
    </Pressable>
  );
}

/**
 * CẦN MUA — 05 §4, 06 §4.
 *
 * **Nhóm DUY NHẤT được hiện cả khi mọi nhóm khác rỗng.** Mọi nhóm khác trên màn
 * này ẩn hẳn khi trống (một dòng "chưa có gì" là một lần nhắc người dùng rằng
 * họ chưa làm gì), nhưng card này là ngoại lệ có chủ ý: nó là bề mặt hằng ngày,
 * và là lý do app được mở trong tuần không có sự kiện nào.
 *
 * Ẩn khi danh sách RỖNG THẬT — không có gì cần mua thì không có gì để nói. Đó
 * khác với "mọi nhóm khác rỗng", tình huống mà card này vẫn hiện.
 *
 * Hiện SỐ MÓN CHƯA MUA + ba tên đầu. Không đếm tổng cả món đã tick: con số
 * người dùng cần trong siêu thị là "còn bao nhiêu món nữa".
 *
 * KHÔNG có ô đánh dấu ở đây — chạm là đi tới danh sách. Tick ngay trên màn
 * chính nghe tiện, nhưng nó sẽ nhân đôi chỗ chứa cùng một thao tác, và người
 * dùng sẽ không biết chỗ nào là chỗ thật.
 */
function ShoppingCard({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  const { data: items } = useShoppingItems();

  const pending = (items ?? []).filter((i) => !i.isDone);
  if (pending.length === 0) return null;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mt-5">
      <Card>
        <View className="flex-row items-center">
          <Text className="flex-1 text-label font-semibold text-muted">
            {t.shopping.cardTitle}
          </Text>
          <Text className="text-label font-medium text-brand">{pending.length}</Text>
        </View>
        <Text className="mt-1 text-body text-ink" numberOfLines={1}>
          {pending
            .slice(0, 3)
            .map((i) => i.title)
            .join(' · ')}
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
