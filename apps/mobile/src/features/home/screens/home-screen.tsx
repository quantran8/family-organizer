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
 *   3. **Việc cần làm · Sự kiện sắp tới · Khoản sắp trả** — ba nhóm riêng, tách
 *      theo LOẠI. Bên trong mỗi nhóm vẫn KHÔNG tách "Hôm nay" / "Tuần này":
 *      hai tiêu đề cho một dòng thời gian liên tục bắt người đọc ghép lại trong
 *      đầu thứ vốn đã liền mạch, nên mỗi dòng tự mang nhãn ngày. Nhưng ba LOẠI
 *      thì tách, vì chúng đòi ba hành động khác nhau — việc thì tick tại chỗ,
 *      sự kiện thì chuẩn bị trước nhiều ngày, khoản trả thì chuyển tiền — và
 *      mỗi nhóm đi tới một màn khác khi bấm "Xem tất cả".
 *   4. **Cần chú ý** — thứ có hạn nhưng chưa tới hạn.
 *
 * Chỉ mục 1 là thẻ; ba mục còn lại là danh sách có đường kẻ (design.md §8 —
 * thẻ lặp lại trông gọn lúc viết và chỉ lộ ra khi có mười dòng thật).
 */

import {
  addDays,
  compareISODate,
  computeFinanceStatus,
  explainFinanceStatus,
  formatDeclaredAt,
  formatDueLabel,
  groupTasksByDue,
  projectRunway,
  weekdayOf,
  type FamilyEvent,
  type ISODate,
  type Task,
  type UpcomingPayment,
  type UUID,
} from '@family-organizer/domain';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  EmptyState,
  Icon,
  ICON_COLOR,
  ListSkeleton,
  MemberAvatar,
  MoneyText,
  Section,
  StatusPill,
  UndoToast,
  useUndo,
} from '@/design/components';
import { useOpenAttentionWithEntities } from '@/features/attention/queries/use-attention';
import { EventRow } from '@/features/event/components';
import { useCostAskPrompt } from '@/features/event/queries/use-cost-ask-prompt';
import { useEvents } from '@/features/event/queries/use-events';
import { AddFab } from '@/features/home/components';
import { useFinanceMetrics, useUpcomingNeeds } from '@/features/household/queries/use-household';
import { useMe, useMembers } from '@/features/member/queries/use-members';
import { usePayments } from '@/features/payment/queries/use-payments';
import { useShoppingItems } from '@/features/shopping/queries/use-shopping';
import { TaskRow } from '@/features/task/components';
import { useDeleteTask, useSetTaskDone, useTasks } from '@/features/task/queries/use-tasks';
import {
  declaredAtText,
  dueLabelText,
  financeReasonText,
  interpolate,
  shortSolarDate,
  useT,
  weekdayShort,
} from '@/i18n';
import { useToday } from '@/lib/use-today';
import { useSessionStore } from '@/stores/session';

/**
 * Cửa sổ của nhóm SỰ KIỆN trên Nhà mình.
 *
 * 30 ngày, dài hơn cửa sổ việc (hết tuần) vì hai loại này được chuẩn bị ở hai
 * nhịp khác nhau: một cái giỗ báo trước ba ngày là đã muộn — phải đặt mâm, xếp
 * lịch nghỉ, gọi họ hàng — trong khi việc nhà tuần sau kéo lên hôm nay chỉ làm
 * loãng câu trả lời ba giây.
 */
const HOME_EVENT_HORIZON_DAYS = 30;

/** Cắt ở 3 dòng như CẦN CHÚ Ý — con số trên tiêu đề vẫn đếm đủ. */
const HOME_PAYMENT_LIMIT = 3;

/**
 * Sự kiện trong cửa sổ, sắp theo ngày dương gần nhất.
 *
 * Sự kiện chưa có `nextOccurrenceDate` bị LOẠI, không xếp xuống cuối: đó là
 * sự kiện âm lịch vừa tạo mà Edge `refresh-lunar-dates` chưa chạy tới (ràng
 * buộc #2 — không có đường code thứ hai nào tính lịch âm). Nó có chỗ ở tab Sự
 * kiện, nơi `EventRow` nói rõ "chưa tính được ngày"; còn ở đây, một dòng không
 * có ngày nằm giữa một danh sách sắp theo ngày là một dòng không đọc được.
 */
function pickUpcomingEvents(events: readonly FamilyEvent[], today: ISODate): FamilyEvent[] {
  const until = addDays(today, HOME_EVENT_HORIZON_DAYS);
  return events
    .filter(
      (e) =>
        e.nextOccurrenceDate !== null &&
        compareISODate(e.nextOccurrenceDate, today) >= 0 &&
        compareISODate(e.nextOccurrenceDate, until) <= 0,
    )
    .sort((a, b) => compareISODate(a.nextOccurrenceDate ?? '', b.nextOccurrenceDate ?? ''));
}

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

  // Việc hôm nay và việc cuối tuần vẫn đi CHUNG một danh sách — cái tách ra ở
  // G17 là ba LOẠI (việc / sự kiện / khoản trả), không phải ba mốc thời gian.
  // Thứ tự giữ nguyên vì `groupTasksByDue` đã trả đúng — nối, không sắp lại.
  const upcomingTasks = useMemo(
    () => [...todayTasks, ...weekTasks],
    [todayTasks, weekTasks],
  );

  // Sự kiện và khoản trả phải được tính vào "rỗng" từ lúc chúng có mục riêng:
  // thiếu vế này thì một nhà chưa có việc nào nhưng có ba cái giỗ sẽ vừa hiện
  // "Bắt đầu từ điều gần nhất" vừa hiện ba dòng sự kiện ngay bên trên.
  const { data: events } = useEvents();
  const { data: payments } = usePayments('30d', today);
  const upcomingEvents = useMemo(() => pickUpcomingEvents(events ?? [], today), [events, today]);
  const upcomingPayments = useMemo(
    () => (payments ?? []).filter((p) => p.state === 'unpaid'),
    [payments],
  );

  const isEmpty =
    !isPending &&
    upcomingTasks.length === 0 &&
    upcomingEvents.length === 0 &&
    upcomingPayments.length === 0 &&
    !hasShopping;

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
      onPress={() => router.push({ pathname: '/(modals)/task-edit', params: { id: item.id } })}
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
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <ScrollView
        className="flex-1"
        // `gap-4`: khoảng cách GIỮA các mảng section (§7.3 — 16–20px). Đây là
        // thứ thay cho `mt-8` mà từng nhóm tự khai trước đây; để mỗi nhóm tự
        // đặt lề trên thì nhóm nào ẩn đi sẽ để lại một khoảng trống khác nhau.
        contentContainerClassName="gap-4 px-4 pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Kéo xuống để làm mới. Không auto-refresh theo chu kỳ (05 §4).
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <HomeHeader householdName={householdName ?? t.app.name} today={today} />

        <FinanceCard today={today} onPress={() => router.push('/(app)/(tabs)/money')} />

        <ShoppingSection onPress={() => router.push('/(app)/(tabs)/plan')} />

        <InviteCard hasFirstRecord={(tasks ?? []).length > 0} />

        {isPending ? (
          <Section>
            <ListSkeleton rows={4} />
          </Section>
        ) : null}

        {/* Ba nhóm theo thứ tự người dùng xử lý chúng trong ngày: việc tick
            được ngay, sự kiện cần chuẩn bị trước, khoản trả cần tiền. Mỗi nhóm
            ẩn HẲN khi rỗng và "Xem tất cả" đi tới đúng màn của nó — trước đây
            cả ba loại chung một tiêu đề nên nút này chỉ đi được tới một chỗ. */}
        {upcomingTasks.length > 0 ? (
          <HomeSection
            title={t.home.sectionTasks}
            onAction={() => router.push('/(app)/(tabs)/plan')}
          >
            {/* `gap-5` = 20px, mức sàn của §7.3 cho khoảng cách giữa hai dòng
                phẳng. KHÔNG có `border-b` giữa các dòng: §8 nói khoảng cách là
                dải phân cách mặc định, đường kẻ chỉ dành cho danh sách dày. */}
            <View className="gap-5">{upcomingTasks.map(renderTask)}</View>
          </HomeSection>
        ) : null}

        {upcomingEvents.length > 0 ? (
          <HomeSection
            title={t.home.sectionEvents}
            onAction={() => router.push('/(app)/(tabs)/plan')}
          >
            <View className="gap-5">
              {upcomingEvents.map((event, i) => (
                <EventRow
                  key={event.id}
                  event={event}
                  // Dòng đầu = sự kiện gần nhất, vì `pickUpcomingEvents` đã sắp
                  // theo ngày. ĐÚNG MỘT ô ngày mang accent trong cả nhóm — hai
                  // ô chanh cạnh nhau làm chữ "gần nhất" mất nghĩa (§5.3).
                  isNext={i === 0}
                  onPress={() => router.push(`/(app)/plan/event/${event.id}`)}
                />
              ))}
            </View>
          </HomeSection>
        ) : null}

        {upcomingPayments.length > 0 ? (
          <HomeSection
            title={t.home.sectionPayments}
            onAction={() => router.push('/(app)/money/payments')}
          >
            <View className="gap-5">
              {upcomingPayments.slice(0, HOME_PAYMENT_LIMIT).map((payment) => (
                <HomePaymentRow
                  key={payment.id}
                  payment={payment}
                  today={today}
                  onPress={() => router.push(`/(app)/money/payment/${payment.id}`)}
                />
              ))}
            </View>
          </HomeSection>
        ) : null}

        <AttentionSection onPress={() => router.push('/(app)/money/attention')} />

        {isEmpty ? (
          <View className="mt-6">
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
function HomeHeader({ householdName, today }: { householdName: string; today: ISODate }) {
  const { t } = useT();
  const router = useRouter();
  const { data: me } = useMe();

  return (
    <View className="pt-2">
      {/* Hàng trên: avatar + ngày hôm nay. Ngày ở đây là DƯƠNG lịch và cố ý
          ngắn — nó chỉ neo người đọc vào "hôm nay là ngày mấy" trước khi họ
          đọc các mốc hạn bên dưới, không phải một ô lịch để tra cứu. */}
      <View className="flex-row items-center gap-3">
        {/* Đường vào Cài đặt — qua avatar, KHÔNG chiếm một tab (05 §2). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.a11y.settings}
          hitSlop={8}
          onPress={() => router.push('/(app)/settings')}
          className="min-h-touch justify-center"
        >
          <MemberAvatar name={me?.displayName ?? t.app.name} />
        </Pressable>

        <View className="flex-1">
          <Text className="text-micro font-medium uppercase tracking-[1.4px] text-muted">
            {`${weekdayShort(weekdayOf(today))} · ${shortSolarDate(today)}`}
          </Text>
          <Text className="mt-0.5 text-caption font-medium text-ink" numberOfLines={1}>
            {householdName}
          </Text>
        </View>
      </View>

      {/* Câu hỏi trung tâm của màn (§2.1) — một dòng, không có đoạn giải thích
          bên dưới: §12 cấm văn xuôi trên màn tổng quan, và câu trả lời nằm ngay
          trong các nhóm phía dưới. */}
      <Text className="mt-7 text-display font-semibold tracking-[-1.6px] text-ink">
        {t.home.eyebrow}
      </Text>
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
    // Mảng trắng như mọi nhóm khác, và nút là CTA đen (§10.1) — đây là thứ duy
    // nhất trên Nhà mình thật sự muốn người dùng bấm, nên nó được nút chính.
    <Section>
      <Text className="text-heading font-semibold text-ink">{t.home.inviteCardTitle}</Text>
      <Text className="mt-2 text-body text-muted">{t.home.inviteCardBody}</Text>
      <View className="mt-5 flex-row">
        <Button
          label={t.home.inviteCardAction}
          onPress={() => router.push('/(app)/settings/invite')}
        />
      </View>
    </Section>
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
    // Mảng TRẮNG như mọi nhóm khác, KHÔNG tô nền accent: §5.3 giữ accent ở mức
    // tín hiệu nhỏ, và §13.2 nói thẳng là khối tài chính không được có nền
    // riêng. Thứ làm nó nổi lên đầu màn là CỠ của con số, không phải màu nền.
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.home.financeMore}
      onPress={onPress}
      className="rounded-section bg-surface p-5 shadow-section active:opacity-90"
    >
      {/* ── Đang có ──
          Nhãn nhóm đi kèm một chấm accent: đủ để khối này có nhận diện mà không
          cần một mảng màu (§4.3). Con số là phần tử LỚN NHẤT của khối (§13.2). */}
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-accent" />
            <Text className="text-caption font-medium text-muted">{t.home.financeUsable}</Text>
          </View>

          <MoneyText amount={metrics.totalUsable} size="display" className="mt-4" />

          {/* Nhãn thời gian của SỐ KHAI — bắt buộc ở mọi chỗ hiện số tổng
              (03 §8). Dùng nhóm "dùng ngay" vì đó là con số ngay bên trên. */}
          <View className="mt-3 flex-row items-center gap-1">
            <Icon name="declaredAt" size={13} color={ICON_COLOR.muted} />
            <Text className="text-caption text-muted">
              {declaredAtText(formatDeclaredAt(metrics.lastUsableUpdatedOn, null, today))}
            </Text>
          </View>
        </View>

        <StatusPill status={status} />
      </View>

      <View className="my-5 h-px bg-line" />

      {/* ── Sắp cần ──
          Hai cột đơn giản (§13.2). Con số ở đây nhỏ hơn hẳn con số trên: đọc
          cạnh nhau thì thứ tự quan trọng phải thấy được mà không cần nhãn. */}
      <View className="flex-row gap-8">
        <View className="flex-1">
          <Text className="text-micro font-medium uppercase tracking-[0.8px] text-muted">
            {t.home.financeNeeded}
          </Text>
          <MoneyText amount={runway.total} size="title2" className="mt-1" />
          {/* `basis` luôn là 'declared' — đây là DỰ TÍNH từ số đã ghi, không
              phải một báo cáo. Câu này là chỗ nói ra điều đó. */}
          <Text className="mt-1 text-caption text-muted">{t.home.financeNeededBasis}</Text>
        </View>
      </View>

      {/* Nhãn màu không kèm lý do sẽ bị đọc là phán xét (03 §1). */}
      <Text className="mt-5 text-body text-ink">{financeReasonText(reason)}</Text>
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
    <HomeSection title={t.shopping.cardTitle} onAction={onPress}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="min-h-touch flex-row items-center gap-4 active:opacity-70"
      >
        {/* Ô icon nền accent — §5.3 cho phép ô icon nhỏ mang màu này, và đây là
            khối duy nhất trên màn có nó ngoài chấm ở khối tài chính. */}
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Icon name="shopping" size={20} color={ICON_COLOR.accentInk} />
        </View>
        <View className="flex-1">
          <Text className="text-body font-medium text-ink" numberOfLines={1}>
            {head}
          </Text>
          {rest > 0 ? (
            <Text className="mt-1 text-caption text-muted" numberOfLines={1}>
              {interpolate(t.home.shoppingMore, { count: rest })}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
      </Pressable>
    </HomeSection>
  );
}

/**
 * Một khoản sắp trả trên Nhà mình.
 *
 * Cùng quy tắc với `PaymentRow` ở màn Sắp phải trả: khoản quá hạn KHÔNG tô đỏ
 * cả dòng, chỉ riêng chữ nhãn mang màu cảnh báo (04 §7 — không doạ). Ở đầu màn
 * chính thì điều đó còn quan trọng hơn: một khối đỏ chào buổi sáng là cách
 * nhanh nhất để người ta thôi mở app.
 *
 * KHÔNG có nút [Đã trả] ở đây, dù `useSettlePayment` là thao tác một chạm có
 * optimistic. Đánh dấu đã trả là một câu khẳng định về tiền thật; nó thuộc màn
 * chi tiết nơi người dùng đọc được số tiền, ngày, và dư nợ còn lại — không phải
 * một nút nhỏ cạnh mười thứ khác trên màn chính.
 */
function HomePaymentRow({
  payment,
  today,
  onPress,
}: {
  payment: UpcomingPayment;
  today: ISODate;
  onPress: () => void;
}) {
  const { t } = useT();

  const due = payment.dueDate ? formatDueLabel(payment.dueDate, today) : null;
  const isOverdue = due?.kind === 'overdue_days';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={payment.name}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 active:opacity-70"
    >
      <View className="flex-1">
        <Text numberOfLines={1} className="text-body font-medium text-ink">
          {payment.name}
        </Text>
        <Text className={`mt-1 text-caption ${isOverdue ? 'text-critical' : 'text-muted'}`}>
          {due
            ? dueLabelText(due)
            : // Khoản chỉ biết tháng ("học phí tháng 9") — hiện tháng, không bịa ra ngày.
              payment.dueMonth
              ? shortSolarDate(payment.dueMonth)
              : t.event.noneYet}
        </Text>
      </View>

      <MoneyText amount={payment.amount} size="body" />
      <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
    </Pressable>
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
    <HomeSection title={t.home.sectionAttention} onAction={onPress}>
      {/* Tối đa 3 dòng; phần còn lại ở màn Cần trao đổi. Con số trên tiêu đề
          vẫn đếm ĐỦ, nên cắt ở đây không giấu mất thứ gì. */}
      <View className="gap-6">
        {open.slice(0, 3).map((flag) => {
          // Cùng thứ tự dự phòng với màn `money/attention`: khoản bị xoá mềm
          // trả `entityName = null`, và cờ vẫn phải đọc được thay vì hiện dòng
          // trống.
          const headline = flag.entityName ?? t.attention.title;
          return (
            <Pressable
              key={flag.id}
              accessibilityRole="button"
              onPress={onPress}
              className="min-h-touch flex-row items-center gap-4 active:opacity-70"
            >
              {/* Ô icon mang màu ngữ nghĩa `attention` — đây là chỗ §13.6 cho
                  phép, vì màu đang nói "thứ này có hạn", không phải trang trí. */}
              <View className="h-11 w-11 items-center justify-center rounded-full bg-attention-soft">
                <Icon name="alert" size={20} color={ICON_COLOR.attention} />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium text-ink" numberOfLines={1}>
                  {headline}
                </Text>
                {flag.note ? (
                  <Text className="mt-1 text-caption text-muted" numberOfLines={1}>
                    {flag.note}
                  </Text>
                ) : null}
              </View>
              <Icon name="chevron" size={20} color={ICON_COLOR.subtle} />
            </Pressable>
          );
        })}
      </View>
    </HomeSection>
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
    // `mb-5` = 20px, khoảng cách tiêu đề → nội dung của §7.3. Không còn
    // `min-h-touch` cho cả hàng: chiều cao đó sinh ra để nút "Xem tất cả" đủ
    // vùng chạm, nhưng chính nút mới cần nó, còn ép cả hàng cao 44px làm tiêu
    // đề của nhóm không có nút bị đội xuống lệch với nhóm có nút.
    <View className="mb-5 flex-row items-center justify-between gap-4">
      <View className="flex-row items-center gap-3">
        <Text className="text-title2 font-semibold tracking-[-0.6px] text-ink">{title}</Text>
        {/* Đếm số việc đang chờ, không đếm tổng cả việc đã xong: con số hữu ích
            là "còn bao nhiêu", không phải "đã từng có bao nhiêu".

            Nền accent — đây đúng là thứ §5.3 giao cho màu này ("counts"): một
            mảng nhỏ, mang thông tin. Chữ trên nó là `accent-ink` vì nền sáng. */}
        {count !== undefined ? (
          <View className="min-w-6 items-center justify-center rounded-status bg-accent px-2.5 py-1">
            <Text className="text-micro font-semibold text-accent-ink">{count}</Text>
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
          <Text className="text-label font-semibold text-ink">{t.home.seeAll}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Một nhóm trên Nhà mình = tiêu đề + nội dung, đặt trên MỘT mảng trắng.
 *
 * Mảng trắng do `Section` của `design/` lo (§13.1); phần thêm ở đây chỉ là
 * tiêu đề cỡ lớn của màn này. Tách làm hai lớp vì mảng trắng còn dùng cho
 * những khối KHÔNG có tiêu đề — khối tài chính, thẻ mời, skeleton lúc đang tải.
 */
function HomeSection({
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
    <Section>
      <SectionHeading
        title={title}
        {...(count !== undefined ? { count } : {})}
        {...(onAction ? { onPress: onAction } : {})}
      />
      {children}
    </Section>
  );
}
