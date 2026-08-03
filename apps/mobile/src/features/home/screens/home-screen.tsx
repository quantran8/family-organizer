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
 * ── Bố cục (bản dựng lại theo mockup) ──
 *
 * Thứ tự trả lời câu hỏi trung tâm của concept v2, từ trên xuống:
 *
 *   1. **Tài chính** — thẻ màu DUY NHẤT của màn. "Đang có" rồi "sắp cần", vì
 *      con số thứ hai chỉ có nghĩa khi đọc cạnh con số thứ nhất.
 *   2. **Cần mua** — bề mặt hằng ngày, lý do app được mở trong tuần không có
 *      sự kiện nào.
 *   3. **Sắp tới** — MỘT feed trộn việc/sự kiện/khoản phải trả, KHÔNG tách
 *      "Hôm nay" và "Tuần này" thành hai khối. Hai tiêu đề cho một dòng thời
 *      gian liên tục bắt người đọc ghép lại trong đầu thứ vốn đã liền mạch.
 *   4. **Cần chú ý** — thứ có hạn nhưng chưa tới hạn.
 *
 * Chỉ mục 1 là thẻ; ba mục còn lại là danh sách có đường kẻ (design.md §8 —
 * thẻ lặp lại trông gọn lúc viết và chỉ lộ ra khi có mười dòng thật).
 */

import {
  computeFinanceStatus,
  explainFinanceStatus,
  formatDeclaredAt,
  formatDueLabel,
  groupTasksByDue,
  projectRunway,
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
  Icon,
  ICON_COLOR,
  ListSkeleton,
  MemberAvatar,
  MoneyText,
  StatusPill,
  UndoToast,
  useUndo,
} from '@/design/components';
import { useOpenAttentionWithEntities } from '@/features/attention/queries/use-attention';
import { useCostAskPrompt } from '@/features/event/queries/use-cost-ask-prompt';
import { AddFab } from '@/features/home/components';
import { useFinanceMetrics, useUpcomingNeeds } from '@/features/household/queries/use-household';
import { useMe, useMembers } from '@/features/member/queries/use-members';
import { useShoppingItems } from '@/features/shopping/queries/use-shopping';
import { TaskRow } from '@/features/task/components';
import { useDeleteTask, useSetTaskDone, useTasks } from '@/features/task/queries/use-tasks';
import { declaredAtText, dueLabelText, financeReasonText, interpolate, useT } from '@/i18n';
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

  // "Sắp tới" là MỘT feed, nên hai nhóm cũ nối lại thành một danh sách. Việc
  // hôm nay vẫn đứng trước việc cuối tuần vì `groupTasksByDue` đã trả theo thứ
  // tự đó — nối, không sắp xếp lại.
  const upcomingTasks = useMemo(
    () => [...todayTasks, ...weekTasks],
    [todayTasks, weekTasks],
  );

  const isEmpty = !isPending && upcomingTasks.length === 0 && !hasShopping;

  const renderTask = (item: Task) => (
    <TaskRow
      key={item.id}
      title={item.title}
      done={item.status === 'done'}
      // Nhãn ngày BẮT BUỘC từ lúc "Hôm nay" và "Tuần này" gộp làm một feed:
      // trước đây tiêu đề nhóm nói hộ dòng nào tới hạn khi nào, giờ không còn
      // tiêu đề đó nữa nên mỗi dòng phải tự nói.
      meta={item.dueDate ? dueLabelText(formatDueLabel(item.dueDate, today)) : null}
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
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Kéo xuống để làm mới. Không auto-refresh theo chu kỳ (05 §4).
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <HomeHeader householdName={householdName ?? t.app.name} />

        <FinanceCard today={today} onPress={() => router.push('/(app)/money')} />

        <ShoppingSection onPress={() => router.push('/(app)/plan')} />

        <InviteCard hasFirstRecord={(tasks ?? []).length > 0} />

        {isPending ? <ListSkeleton rows={4} /> : null}

        {upcomingTasks.length > 0 ? (
          <Section title={t.home.sectionUpcoming} onAction={() => router.push('/(app)/plan')}>
            {upcomingTasks.map(renderTask)}
          </Section>
        ) : null}

        <AttentionSection onPress={() => router.push('/(app)/money/attention')} />

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
 * Đầu màn: nhãn nhỏ + tên nhà + avatar.
 *
 * Khối ngày/tháng âm ĐÃ BỎ khỏi đây. Ngày âm vẫn là dữ liệu gốc của app (ràng
 * buộc #2) và vẫn hiện ở đúng chỗ nó có nghĩa — trên từng dòng sự kiện, nơi
 * người ta thật sự cần đọc nó ("Giỗ ông ngoại · CN 15/8 âm"). Một ô lịch đứng
 * riêng ở đầu màn chỉ lặp lại thứ điện thoại nào cũng hiện sẵn trên thanh trạng
 * thái, và nó chiếm đúng khoảng chiều cao mà con số tài chính cần.
 */
function HomeHeader({ householdName }: { householdName: string }) {
  const { t } = useT();
  const router = useRouter();
  const { data: me } = useMe();

  return (
    <View className="flex-row items-center gap-4 pt-2">
      <View className="flex-1">
        <Text className="text-micro font-semibold tracking-[1.4px] text-muted">
          {t.home.eyebrow}
        </Text>
        <Text className="mt-1 text-display font-semibold text-ink">{householdName}</Text>
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
  // `needs` là đầu vào BẮT BUỘC từ v2: con số "cần chuẩn bị 30 ngày" phải gồm
  // cả chi phí sự kiện và phí gia hạn giấy tờ, không chỉ khoản sắp trả (06 §0.2).
  const { data: needs } = useUpcomingNeeds(today);

  if (!metrics) return null;
  const needsList = needs ?? [];
  const status = computeFinanceStatus(metrics, needsList, today);
  if (status === 'no_data') return null;

  const { reason } = explainFinanceStatus(metrics, needsList, today);
  // Con số "sắp cần" lấy từ ĐÚNG hàm mà màn Sắp tới dùng, không cộng tay tại
  // chỗ này: hai công thức cho cùng một câu hỏi là hai con số sẽ lệch nhau, và
  // người dùng gặp chúng cách nhau đúng một cú chạm.
  const runway = projectRunway(metrics, needsList, today);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.home.financeMore}
      onPress={onPress}
      className="mt-7 rounded-featured bg-brand-soft p-5"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-icon bg-surface">
          <Icon name="wallet" size={19} color={ICON_COLOR.brand} />
        </View>
        <Text className="flex-1 text-heading font-semibold text-ink">{t.home.financeTitle}</Text>
        <Icon name="openDetail" size={20} color={ICON_COLOR.brand} />
      </View>

      {/* ── Đang có ── */}
      <View className="mt-5">
        <Text className="text-caption font-medium text-muted">{t.home.financeUsable}</Text>
        <MoneyText amount={metrics.totalUsable} size="display" className="mt-1" />
        {/* Nhãn thời gian của SỐ KHAI — bắt buộc ở mọi chỗ hiện số tổng (03 §8).
            Dùng nhóm "dùng ngay" vì đó là con số ngay bên trên. */}
        <View className="mt-2 flex-row items-center gap-1">
          <Icon name="declaredAt" size={13} color={ICON_COLOR.muted} />
          <Text className="text-caption text-muted">
            {declaredAtText(formatDeclaredAt(metrics.lastUsableUpdatedOn, null, today))}
          </Text>
        </View>
      </View>

      <View className="my-5 h-px bg-brand-line" />

      {/* ── Sắp cần ── */}
      <View className="flex-row items-end justify-between gap-4">
        <View className="flex-1">
          <Text className="text-caption font-medium text-muted">{t.home.financeNeeded}</Text>
          <MoneyText amount={runway.total} size="title2" className="mt-1" />
          {/* `basis` luôn là 'declared' — đây là DỰ TÍNH từ số đã ghi, không
              phải một báo cáo. Câu này là chỗ nói ra điều đó. */}
          <Text className="mt-2 text-caption text-muted">{t.home.financeNeededBasis}</Text>
        </View>
        <StatusPill status={status} />
      </View>

      {/* Nhãn màu không kèm lý do sẽ bị đọc là phán xét (03 §1). */}
      <Text className="mt-4 text-body text-ink">{financeReasonText(reason)}</Text>
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
function ShoppingSection({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  const { data: items } = useShoppingItems();

  const pending = (items ?? []).filter((i) => !i.isDone);
  if (pending.length === 0) return null;

  // Hai tên đầu trên dòng chính, phần dư gộp thành "và N món khác". Liệt kê cả
  // năm tên làm dòng bị cắt giữa một từ, và cái người ta cần biết trong siêu
  // thị là CÒN BAO NHIÊU chứ không phải tên món thứ tư.
  const head = pending.slice(0, 2).map((i) => i.title).join(' · ');
  const rest = pending.length - 2;

  return (
    <View className="mt-8">
      <SectionHeading title={t.shopping.cardTitle} count={pending.length} onPress={onPress} />

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-touch flex-row items-center gap-4 border-b border-line py-4 active:bg-soft"
      >
        <View className="h-11 w-11 items-center justify-center rounded-icon bg-soft">
          <Icon name="shopping" size={21} color={ICON_COLOR.ink} />
        </View>
        <View className="flex-1">
          <Text className="text-heading font-medium text-ink" numberOfLines={1}>
            {head}
          </Text>
          {rest > 0 ? (
            <Text className="mt-1 text-label text-muted" numberOfLines={1}>
              {interpolate(t.home.shoppingMore, { count: rest })}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

/**
 * CẦN CHÚ Ý — cờ "cần trao đổi" đang mở (05 §6.7).
 *
 * Ẩn HẲN khi không có cờ nào: một mục "Cần chú ý — không có gì" mỗi ngày dạy
 * người dùng bỏ qua đúng cái mục mà hôm có chuyện thật họ cần đọc.
 */
function AttentionSection({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  const { data: flags } = useOpenAttentionWithEntities();

  const open = flags ?? [];
  if (open.length === 0) return null;

  return (
    <View className="mt-8">
      <SectionHeading title={t.home.sectionAttention} count={open.length} onPress={onPress} />

      {/* Tối đa 3 dòng; phần còn lại ở màn Cần trao đổi. Con số trên tiêu đề
          vẫn đếm ĐỦ, nên cắt ở đây không giấu mất thứ gì. */}
      {open.slice(0, 3).map((flag) => {
        // Cùng thứ tự dự phòng với màn `money/attention`: khoản bị xoá mềm trả
        // `entityName = null`, và cờ vẫn phải đọc được thay vì hiện dòng trống.
        const headline = flag.entityName ?? t.attention.title;
        return (
          <Pressable
            key={flag.id}
            accessibilityRole="button"
            onPress={onPress}
            className="min-h-touch flex-row items-center gap-4 border-b border-line py-4 active:bg-soft"
          >
            <View className="h-11 w-11 items-center justify-center rounded-icon bg-attention-soft">
              <Icon name="alert" size={21} color={ICON_COLOR.attention} />
            </View>
            <View className="flex-1">
              <Text className="text-body font-medium text-ink" numberOfLines={1}>
                {headline}
              </Text>
              {flag.note ? (
                <Text className="mt-1 text-label text-muted" numberOfLines={1}>
                  {flag.note}
                </Text>
              ) : null}
            </View>
            <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Tiêu đề nhóm trên Nhà mình — to hơn `SectionHeader` của `design/`.
 *
 * KHÔNG dùng chung với primitive kia: nó phục vụ màn chi tiết (16px, nhãn phụ),
 * còn ở đây tiêu đề là mốc điều hướng chính của một màn cuộn dài. Gộp hai cỡ
 * vào một component sẽ đẻ ra một prop `size` mà mọi chỗ gọi phải chọn.
 */
function SectionHeading({
  title,
  count,
  onPress,
}: {
  title: string;
  count?: number;
  onPress?: () => void;
}) {
  const { t } = useT();
  return (
    <View className="mb-1 min-h-touch flex-row items-center justify-between gap-4">
      <View className="flex-row items-center gap-3">
        <Text className="text-title2 font-semibold text-ink">{title}</Text>
        {/* Đếm số việc đang chờ, không đếm tổng cả việc đã xong: con số hữu ích
            là "còn bao nhiêu", không phải "đã từng có bao nhiêu". */}
        {count !== undefined ? (
          <View className="min-w-6 items-center justify-center rounded-status bg-soft px-2 py-1">
            <Text className="text-caption font-semibold text-muted">{count}</Text>
          </View>
        ) : null}
      </View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPress}
          className="min-h-touch justify-center pl-3"
        >
          <Text className="text-label font-semibold text-brand">{t.home.seeAll}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({
  title,
  count,
  onAction,
  children,
}: {
  title: string;
  count?: number;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-8">
      <SectionHeading
        title={title}
        {...(count !== undefined ? { count } : {})}
        {...(onAction ? { onPress: onAction } : {})}
      />
      {children}
    </View>
  );
}
