/**
 * MỌI chuỗi hiển thị của app.
 *
 * Lý do gom một chỗ KHÔNG phải đa ngôn ngữ (MVP chỉ có `vi`), mà là bảng từ
 * vựng ở 04 §7 và design.md §12 — chúng là RÀNG BUỘC SẢN PHẨM. Chuỗi rải rác
 * trong 40+ file thì không ai rà được "app có chỗ nào viết 'phê duyệt' không";
 * gom một chỗ thì nó là một lần grep.
 *
 * DÙNG                    KHÔNG DÙNG
 * Việc của nhà mình       Nhiệm vụ được giao
 * Khoản cần chú ý         Cảnh báo · Vượt chi
 * Cần trao đổi            Cần phê duyệt · Chờ xác nhận
 * Sắp đến hạn             Quá hạn nghiêm trọng
 * Cần chuẩn bị            Bắt buộc hoàn thành
 * Cập nhật gần nhất       Lần chỉnh sửa cuối
 * Vợ giữ · Chồng giữ      Người chịu trách nhiệm
 * Tình hình nhà mình      Báo cáo tài chính
 *
 * Nút đặt tên bằng VIỆC NÓ LÀM và giữ nguyên tên đó suốt luồng: "Lưu cập nhật"
 * sinh ra toast "Đã cập nhật", không phải "Thành công".
 *
 * Số, tiền, ngày KHÔNG nằm ở đây — chúng đi qua formatMoney/formatDueLabel/
 * formatLunarLabel ở @family-organizer/domain. Bảng này chỉ ghép nhãn quanh chúng.
 */

export type Interpolations = Record<string, string | number>;

/**
 * Thay `{key}` bằng giá trị.
 *
 * Không nối chuỗi trong JSX — tiếng Việt có trật tự từ khác và nối chuỗi làm
 * mất chỗ để sửa. Tiếng Việt cũng không biến đổi theo số nên không cần plural
 * rule: `{count}` thẳng là đủ.
 */
export function interpolate(template: string, values?: Interpolations): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const v = values[key];
    return v === undefined ? match : String(v);
  });
}

export const vi = {
  app: {
    name: 'Nhà mình',
    tagline:
      'Nơi hai người cùng nhớ việc nhà, sự kiện hai bên, khoản tiền và giấy tờ quan trọng.',
  },

  common: {
    save: 'Lưu',
    cancel: 'Huỷ',
    close: 'Đóng',
    done: 'Xong',
    retry: 'Thử lại',
    delete: 'Xoá',
    edit: 'Sửa',
    add: 'Thêm',
    seeAll: 'Xem tất cả',
    see: 'Xem',
    back: 'Quay lại',
    continue: 'Tiếp tục',
    optional: 'tuỳ chọn',
    loading: 'Đang tải…',
    undo: 'Hoàn tác',
    all: 'Tất cả',
    note: 'Ghi chú',
    notePlaceholder: 'Có gì cần ghi lại không?',
    /**
     * Hỏi lại khi đóng một form sửa còn thay đổi chưa lưu.
     *
     * Chỉ hiện khi THẬT SỰ có thay đổi — mở ra rồi đóng lại ngay mà bị hỏi
     * "bỏ thay đổi?" là app hỏi về một thứ không tồn tại, và người dùng học
     * được rằng hộp thoại này vô nghĩa nên bấm bừa.
     */
    discardTitle: 'Bỏ thay đổi?',
    discardBody: 'Những gì bạn vừa sửa sẽ không được lưu.',
    discardConfirm: 'Bỏ thay đổi',
    keepEditing: 'Tiếp tục sửa',
  },

  tabs: {
    home: 'Nhà mình',
    plan: 'Việc & Sự kiện',
    money: 'Tiền',
    docs: 'Giấy tờ',
    addAria: 'Thêm vào nhà mình',
  },

  auth: {
    // Hai nút nằm cạnh nhau chỉ đủ chỗ cho tên nhà cung cấp. "Tiếp tục với" đã
    // nằm trong ngữ cảnh (ngay dưới dòng "hoặc"), và logo nói phần còn lại.
    google: 'Google',
    apple: 'Apple',
    or: 'hoặc',
    email: 'Email',
    emailPlaceholder: 'ban@email.com',
    password: 'Mật khẩu',
    passwordPlaceholder: 'Ít nhất 8 ký tự',

    // ── Đăng nhập ──
    signInEyebrow: 'Chào mừng trở lại',
    signInTitle: 'Đăng nhập',
    signInBody: 'Tiếp tục quản lý những điều quan trọng của nhà mình.',
    signInSubmit: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    goSignUp: 'Đăng ký',

    // ── Đăng ký ──
    signUpEyebrow: 'Bắt đầu cùng nhau',
    signUpTitle: 'Tạo tài khoản',
    signUpBody: 'Chỉ mất một phút để tạo không gian chung cho nhà mình.',
    signUpSubmit: 'Tạo tài khoản',
    confirmPassword: 'Nhập lại mật khẩu',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
    haveAccount: 'Đã có tài khoản?',
    goSignIn: 'Đăng nhập',
    signUpCheckInbox: 'Đã tạo tài khoản. Kiểm tra hộp thư để xác minh email.',

    // Hiện/ẩn mật khẩu — nhãn cho trình đọc màn hình.
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',

    forgotPassword: 'Quên mật khẩu?',
    forgotTitle: 'Đặt lại mật khẩu',
    forgotBody: 'Nhập email của bạn, chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu.',
    forgotSend: 'Gửi đường dẫn',
    forgotSent: 'Đã gửi. Kiểm tra hộp thư của bạn.',
    resetTitle: 'Mật khẩu mới',
    resetSave: 'Lưu mật khẩu',
    resetDone: 'Đã đổi mật khẩu',
    signOut: 'Đăng xuất',
    emailNotVerified: 'Email chưa được xác minh. Kiểm tra hộp thư để xác minh.',
    resendVerification: 'Gửi lại email xác minh',
  },

  setup: {
    title: 'Bắt đầu',
    createHousehold: 'Tạo nhà mới',
    joinHousehold: 'Tôi có mã mời',
    displayName: 'Tên hiển thị của bạn',
    displayNameHint: 'Ví dụ: Vợ, Chồng, hoặc tên riêng',
    displayNamePlaceholder: 'Vợ',
    createSubmit: 'Tạo nhà mình',
    inviteCode: 'Mã mời',
    inviteCodeHint: '6 ký tự người kia chia sẻ cho bạn',
    joinSubmit: 'Tham gia',
    joinConfirmTitle: 'Xác nhận tên hiển thị',
    joining: 'Đang tham gia…',
  },

  /**
   * Ngưỡng ghi — 05 §3.3.
   *
   * Câu hỏi phải nghe như hai vợ chồng hỏi nhau, không như app hỏi người dùng.
   * "Nhà mình" chứ không "bạn"; "ghi lại" chứ không "nhập liệu" hay "theo dõi".
   */
  threshold: {
    question: 'Khoản từ bao nhiêu trở lên thì nhà mình ghi lại?',
    body: 'Hai người tự chốt với nhau. App chỉ nhớ hộ, không chặn gì cả.',
    k500: '500 nghìn',
    m1: '1 triệu',
    m2: '2 triệu',
    own: 'Tự quyết',
    changeable: 'Đổi lúc nào cũng được.',
    skip: 'Để sau',
    /** Nhãn ở Cài đặt → Nhà mình. */
    settingsLabel: 'Ngưỡng ghi',
    settingsNone: 'Tự quyết',
    /** Dòng gợi ý dưới ô nhập tiền. KHÔNG phải cảnh báo — không bao giờ chặn. */
    hint: 'Nhà mình ghi từ {amount} trở lên',
  },

  /**
   * Gói khởi tạo — 05 §3.4.
   *
   * Câu mở đầu nói "nhà mình THƯỜNG có", không phải "nhà mình CẦN có": đây là
   * một quan sát về các gia đình Việt để người dùng đối chiếu, không phải một
   * danh sách phải hoàn thành.
   */
  seed: {
    title: 'Nhà mình thường có những việc này.',
    body: 'Chọn cái nào đúng — bỏ qua cũng được, thêm sau lúc nào cũng xong.',
    tet: 'Tết Nguyên đán',
    death_anniversary: 'Giỗ',
    parents_birthday: 'Sinh nhật bố mẹ hai bên',
    vehicle_inspection: 'Đăng kiểm xe',
    vehicle_insurance: 'Bảo hiểm xe',
    tuition: 'Học phí',
    /** Mục cần ngày: nói luôn là chọn ngày sau, để việc tick không thành một câu hỏi. */
    needsDateHint: 'chọn ngày sau',
    submit: 'Thêm vào',
    skip: 'Để sau',
    /** Sau khi thêm: nói rõ mục chưa có ngày nằm ở đâu, không để chúng biến mất. */
    addedNeedsDate: 'Đã thêm. Mục chưa có ngày nằm ở CẦN CHÚ Ý.',
  },

  /**
   * Nhập nhanh bằng AI — 06 §6, F4.
   *
   * Chữ ở đây tránh mọi từ khiến kết quả đọc như sự thật: "app đọc được" chứ
   * không phải "app đã ghi", và luôn có một câu nói rõ người dùng phải xem lại.
   */
  capture: {
    title: 'Kiểm lại giúp mình',
    /** Câu quan trọng nhất màn này: AI đoán, người quyết. */
    body: 'App đọc được thế này. Sửa lại nếu chưa đúng rồi lưu.',
    pickImage: 'Chọn ảnh',
    fromText: 'Dán nội dung',
    textPlaceholder: 'Dán tin nhắn hoặc gõ nội dung',
    reading: 'Đang đọc…',
    /** Không nói "AI không hiểu" — nói việc cần làm tiếp. */
    nothingFound: 'Chưa đọc được gì từ ảnh này. Nhập tay giúp mình nhé.',
    manualEntry: 'Nhập tay',
    save: 'Lưu',
    discard: 'Bỏ',
    /** Còn bao nhiêu lượt — nói con số cụ thể, không doạ (04 §8). */
    left: 'Còn {count} lượt tháng này',
    /** Hết lượt: nói rõ mất gì và còn gì. Đường nhập tay KHÔNG bao giờ bị chặn. */
    outOfQuota: 'Hết lượt đọc ảnh tháng này. Vẫn nhập tay được như thường.',
    /** Chưa cắm nhà cung cấp model — KHÁC hết lượt, và không phải lỗi của người dùng. */
    notConfigured: 'Đọc ảnh chưa bật. Nhập tay giúp mình nhé.',
    /** Loại bản ghi mà app đoán được. */
    asEvent: 'Sự kiện',
    asTask: 'Việc',
    asPayment: 'Khoản sắp trả',
    asDoc: 'Giấy tờ',
  },

  home: {
    /**
     * Tiêu đề lớn đầu màn — chữ thường, KHÔNG viết hoa toàn bộ.
     *
     * Trước đây đây là một dòng eyebrow 11px in hoa nằm trên tên nhà. Giờ nó là
     * tiêu đề chính (`text-display`), còn tên nhà lùi lên hàng avatar: §7.4 cấm
     * đặt một eyebrow lặp lại đúng nghĩa của thứ ngay bên dưới nó, và "NHÀ
     * MÌNH" trên "Nhà mình" là đúng trường hợp đó.
     */
    eyebrow: 'Nhà mình',
    /** Còn dùng ở `date-picker` ("Cuối tuần" là một lựa chọn ngày nhanh). */
    sectionWeekend: 'Cuối tuần',
    sectionAttention: 'Cần chú ý',

    // ── Khối tài chính đầu màn ──
    // "Sắp tới nhà mình cần bao nhiêu?" là câu hỏi trung tâm của concept v2
    // (03 §1c), nên hai con số này đứng trên cùng.
    financeTitle: 'Tài chính',
    financeUsable: 'Tài sản dùng ngay',
    // 90 ngày = RUNWAY_HORIZON_DAYS. Viết "3 tháng" vì đó là cách người ta nói,
    // nhưng con số phải lấy đúng từ projectRunway để hai nơi không lệch nhau.
    financeNeeded: 'Cần trong 3 tháng',
    financeNeededBasis: 'Dự tính hôm nay',
    financeMore: 'Xem chi tiết tài chính',

    // Ba nhóm "sắp tới", tách theo LOẠI chứ không theo mốc thời gian. Hôm
    // nay/Tuần này vẫn KHÔNG tách (mỗi dòng tự mang nhãn ngày qua
    // `dueLabelText`) — cái tách ở đây là ba thứ người đọc xử lý khác nhau:
    // việc thì tick, sự kiện thì chuẩn bị, khoản trả thì chuyển tiền. Trộn
    // chúng vào một danh sách bắt người đọc phân loại lại từng dòng.
    sectionUpcoming: 'Sắp tới',
    sectionTasks: 'Việc cần làm',
    sectionEvents: 'Sự kiện sắp tới',
    sectionPayments: 'Khoản sắp trả',
    seeAll: 'Xem tất cả',
    shoppingMore: 'Và {count} món khác',
    emptyTitle: 'Bắt đầu từ điều gần nhất',
    emptyBody:
      'Thêm một việc, một ngày giỗ, hay một khoản sắp phải trả — thứ nào cũng được.',
    emptyAddTask: 'Thêm việc',
    emptyAddEvent: 'Thêm sự kiện',
    inviteCardTitle: 'Rủ người kia cùng dùng',
    inviteCardBody: 'Cả hai cùng thấy việc nhà, sự kiện và giấy tờ quan trọng.',
    inviteCardAction: 'Chia sẻ mã mời',
    doneCount: '{done}/{total} xong',
  },

  financeStatus: {
    ok: 'Ổn',
    watch: 'Cần chú ý',
    tight: 'Căng',
    no_data: 'Chưa đủ dữ liệu',
    // explainFinanceStatus() trả mã lý do có tham số; câu dựng ở đây.
    reasonNoData: 'Thêm một khoản để biết nhà mình đang thế nào.',
    reasonOverdue: 'Có {count} khoản đã qua hạn.',
    reasonNotEnough: 'Khoản sắp trả trong 30 ngày nhiều hơn tiền đang có sẵn.',
    reasonAttention: 'Có {count} khoản cần hai người xem lại.',
    reasonDueSoon: 'Có {count} khoản đến hạn trong 7 ngày.',
    // ĐÃ BỎ reasonStale: độ mới của số liệu không còn đổi trạng thái (03 §1).
    // Nó là một nhãn riêng — xem `declaredAt` bên dưới.
    reasonOk: 'Không có khoản nào cần chuẩn bị gấp.',
    lastUpdated: 'Cập nhật {label}',
    neverUpdated: 'Chưa cập nhật lần nào',
  },

  /**
   * Nhãn thời gian cho SỐ KHAI — BẮT BUỘC ở mọi chỗ hiện số tổng (03 §8).
   *
   * Con số tài sản là thứ MỘT NGƯỜI ĐÃ NÓI RA TẠI MỘT THỜI ĐIỂM, không phải sự
   * thật hiện tại. Hai người cùng tin vào một thứ có thể đã sai còn tệ hơn
   * không có app.
   *
   * Hai biến thể vì tên người có thể không biết (người khai đã rời nhà). Nhãn
   * thời gian mới là phần bắt buộc; tên là phần bổ nghĩa.
   */
  declaredAt: {
    never: 'Chưa có số liệu',
    today: '{by} cập nhật hôm nay',
    todayAnon: 'Cập nhật hôm nay',
    yesterday: '{by} cập nhật hôm qua',
    yesterdayAnon: 'Cập nhật hôm qua',
    daysAgo: '{by} cập nhật {days} ngày trước',
    daysAgoAnon: 'Cập nhật {days} ngày trước',
    weeksAgo: '{by} cập nhật {weeks} tuần trước',
    weeksAgoAnon: 'Cập nhật {weeks} tuần trước',
    monthsAgo: '{by} cập nhật {months} tháng trước',
    monthsAgoAnon: 'Cập nhật {months} tháng trước',
  },

  /**
   * Màn hình "Sắp tới nhà mình cần bao nhiêu" — 05 §6.1, trái tim sản phẩm.
   *
   * Cả bảng từ vựng ở đây phải nói rõ MỘT điều: đây là một DỰ TÍNH dựng từ
   * những khoản hai người đã ghi, không phải một báo cáo về tình hình thật.
   * Mô hình dữ liệu không biết những gì chưa ai ghi vào, và mọi câu chữ ở màn
   * này phải trung thực về giới hạn đó.
   */
  upcoming: {
    title: 'Sắp tới',
    /** Nhãn của con số lớn nhất màn hình. 90 ngày = "ba tháng tới". */
    heroLabel: 'Ba tháng tới',
    /**
     * BẮT BUỘC, KHÔNG ĐƯỢC RÚT GỌN (06 §3).
     *
     * Đây là câu phân biệt một dự tính với một báo cáo. Bỏ nó đi thì con số ở
     * trên tự nhận là bức tranh đầy đủ, và nó sẽ sai mãi mãi vì luôn có khoản
     * chưa ai ghi. Không rút thành "ước tính" — chữ đó không nói ra ĐIỀU GÌ
     * làm nó chỉ là ước tính.
     */
    basisDeclared: 'theo những khoản nhà mình đã ghi',
    /**
     * Nhãn khối mục tiêu — v3 §7.2.
     *
     * Chữ "có thể hoãn" là phần quan trọng nhất của nhãn này: nó nói ra ngay
     * rằng khối bên dưới KHÔNG cùng loại với những khoản phía trên, và vì thế
     * không nằm trong con số hero. Bỏ nửa sau đi thì hai loại trông như một.
     */
    optionalTitle: 'Mục tiêu — có thể hoãn',
    usable: 'Tài sản dùng ngay',
    remaining: 'Còn lại dự kiến',
    /** Thay chỗ `remaining` khi thiếu. KHÔNG kèm lời khuyên nào (05 §6.1). */
    shortfall: 'Thiếu khoảng {amount}',
    /**
     * Dòng hỏi lại số dư — ngoại lệ DUY NHẤT được phép hỏi, và hỏi theo NGỮ
     * CẢNH chứ không theo lịch (03 §1b). Chỉ hiện khi shouldAskForRefresh()
     * trả true: có khoản lớn sắp tới VÀ số dư đã cũ.
     */
    refreshAsk: 'Tính toán này dựa trên số dư ghi {label} — còn đúng không?',
    refreshUpdate: 'Cập nhật',
    /** Bỏ qua thì im 14 ngày. Không push, không badge, không hỏi lại trong phiên. */
    refreshDismiss: 'Bỏ qua',
    emptyTitle: 'Chưa có khoản nào sắp tới',
    emptyBody: 'Ghi một khoản sắp phải trả, hay chi phí dự tính của một sự kiện.',
  },

  /**
   * Mua sắm — 05 §5.3.
   *
   * Câu chữ ở đây cố ý KHÔNG có chữ nào mang nghĩa giao việc: không "phân
   * công", không "ai mua", không "nhắc mua". Danh sách này là một tờ giấy dán
   * tủ lạnh, không phải một hàng đợi công việc.
   */
  shopping: {
    title: 'Mua sắm',
    /** Ô nhập cố định trên cùng — bàn phím giữ nguyên sau khi thêm. */
    addPlaceholder: 'Thêm đồ cần mua…',
    emptyTitle: 'Chưa có gì cần mua',
    emptyBody: 'Gõ vào ô trên để thêm món đầu tiên.',
    /** Card trên Nhà mình. Đếm món CHƯA mua, không đếm tổng. */
    cardTitle: 'Cần mua',
    /** Dòng phụ dưới tiêu đề: nói rõ đây là danh sách chung của hai người. */
    cardSubtitle: 'Cả hai cùng thêm',
    /** Badge đếm. Đếm món CHƯA mua — "còn bao nhiêu", không phải "đã từng có". */
    countLabel: '{count} món',
    itemAdded: 'Đã thêm',
    itemDeleted: 'Đã xoá món',
  },

  task: {
    title: 'Việc',
    /**
     * Hai danh sách — 03 §4b, v3 §7.3.
     *
     * "Linh hoạt" chứ không "Việc vặt": việc vặt nghe như việc không quan trọng,
     * mà gọi thợ sửa ống nước thì quan trọng — nó chỉ không có hạn cứng.
     */
    listRecurring: 'Định kỳ',
    listFlexible: 'Linh hoạt',
    /** Badge đếm trên tiêu đề mỗi danh sách. Đếm việc CHƯA xong. */
    countLabel: '{count} việc',
    /**
     * Nút nhận việc ở danh sách Linh hoạt — 09 §D.1b.
     *
     * "Nhận", KHÔNG phải "Giao": nút này chỉ gán việc cho CHÍNH người đang
     * chạm. Không có đường nào từ danh sách này đặt tên người kia lên một dòng
     * việc — đó là ranh giới giữ nó là danh sách của nhà, không phải hộp thư
     * nhiệm vụ. Muốn bỏ nhận thì chạm lại vào chính chip của mình.
     */
    claim: 'Nhận',
    claimHint: 'Chạm để nhận việc này về mình',
    unclaimHint: 'Chạm để bỏ nhận việc này',
    /** Trạng thái rỗng riêng cho từng danh sách: hai câu khác nhau vì hai loại
     *  việc khác nhau, và một câu chung sẽ sai với ít nhất một bên. */
    emptyRecurringTitle: 'Chưa có việc định kỳ',
    emptyRecurringBody: 'Việc lặp lại như đổ rác, tưới cây — thêm một lần, app nhắc mãi.',
    emptyFlexibleTitle: 'Chưa có việc nào',
    emptyFlexibleBody: 'Việc phát sinh, không gấp — ai rảnh thì làm.',
    groupOverdue: 'Quá hạn',
    groupToday: 'Hôm nay',
    groupTomorrow: 'Ngày mai',
    groupThisWeek: 'Tuần này',
    groupLater: 'Sau đó',
    groupNoDue: 'Không có hạn',
    emptyTitle: 'Chưa có việc nào',
    emptyBody: 'Thêm việc đầu tiên của nhà mình.',
    emptyAction: 'Thêm việc',
    formTitle: 'Việc mới',
    formEditTitle: 'Sửa việc',
    fieldTitle: 'Tên việc',
    fieldTitlePlaceholder: 'Việc gì cần làm?',
    fieldAssignee: 'Ai làm',
    assigneeMe: 'Mình',
    fieldAssigneeNone: 'Chưa phân',
    /** Tiêu đề sheet chọn — dạng câu hỏi, khác nhãn trên dòng (một danh từ). */
    pickAssignee: 'Ai làm?',
    /**
     * Gợi ý cho trình đọc màn hình khi chạm chip người phụ trách (06 §7).
     *
     * "Đổi người làm", KHÔNG phải "giao việc cho người khác": việc đã tồn tại
     * và cần được làm; chỉ người làm là biến số. Chữ "giao" đặt một người ở thế
     * ra lệnh và người kia ở thế nhận lệnh — đúng thứ ranh giới thứ nhất cấm.
     */
    cycleAssigneeHint: 'Chạm để đổi người làm',
    pickDate: 'Chọn ngày',
    /** Dòng mở lịch cho ngày xa, nằm dưới bảy ngày gần. */
    otherDate: 'Ngày khác',
    noDueDate: 'Không có hạn',
    fieldDueDate: 'Ngày',
    fieldDueTime: 'Giờ',
    fieldRecur: 'Lặp lại',
    fieldRemindLead: 'Nhắc trước',
    fieldNotes: 'Ghi chú',
    fieldEvent: 'Sự kiện liên quan',
    snooze: 'Hoãn sang mai',
    snoozed: 'Đã hoãn sang mai',
    deleted: 'Đã xoá việc',
    recentDone: '5 lần gần nhất đã xong',
    noRecentDone: 'Chưa có lần nào',
  },

  event: {
    title: 'Sự kiện',
    emptyTitle: 'Chưa có sự kiện nào',
    emptyBody: 'Thêm ngày giỗ, sinh nhật, hay dịp quan trọng của hai bên.',
    emptyAction: 'Thêm sự kiện',
    formTitle: 'Thêm sự kiện',
    formEditTitle: 'Sửa sự kiện',
    fieldTitle: 'Tên sự kiện',
    fieldTitlePlaceholder: 'Giỗ, sinh nhật hoặc dịp gia đình',
    fieldKind: 'Loại',
    fieldDate: 'Ngày',
    fieldSide: 'Bên gia đình',
    /**
     * Nhắc kép — 03 §5b.
     *
     * `prepHint` là phần quan trọng nhất: nó nói ra HỆ QUẢ trước khi người dùng
     * chọn. Mốc này KHÔNG bắn thêm một thông báo nữa về cùng một sự kiện — nó
     * thêm một dòng việc vào danh sách linh hoạt. Hai thứ đó khác nhau hoàn
     * toàn về mức phiền, và người dùng phải biết trước khi bật.
     */
    fieldPrepLead: 'Nhắc chuẩn bị',
    prepNone: 'Không',
    prepDays: 'Trước {days} ngày',
    prepHint: 'Sẽ thêm một việc vào danh sách Linh hoạt.',
    /** Sự kiện của con nào — v3 §7.5. */
    fieldChild: 'Của con',
    childNone: 'Chưa chọn',
    fieldCalendar: 'Lịch',
    calendarSolar: 'Dương lịch',
    calendarLunar: 'Âm lịch',
    fieldLunarDay: 'Ngày âm',
    fieldLunarMonth: 'Tháng âm',
    fieldLeapMonth: 'Tháng nhuận',
    fieldLocation: 'Địa điểm',
    fieldEstimatedCost: 'Chi phí dự kiến',
    calendarBasisLunar: 'Lặp theo ngày âm',
    calendarBasisSolar: 'Theo ngày dương',
    repeatYearly: 'Lặp hằng năm',
    repeatNone: 'Không lặp',
    repeatSolar: 'Ngày dương',
    repeatLunar: 'Ngày âm',
    previousMonth: 'Tháng trước',
    nextMonth: 'Tháng sau',
    currentMonth: 'Về tháng hiện tại',
    month: 'Tháng',
    sectionFamily: 'Gia đình',
    sectionDetails: 'Chi tiết',
    pastDate: 'Ngày này đã ở trong quá khứ.',
    /**
     * Dòng xem trước — không có nó người dùng sẽ không tin app hiểu lịch âm.
     *
     * `05 §5.5` viết mẫu là "Năm nay rơi vào…", nhưng câu đó SAI ở một ca rất
     * hay gặp: ngày âm đã qua trong năm nay thì lần kế tiếp rơi vào năm sau, và
     * "năm nay" lúc đó là một lời nói dối kèm ngày đúng — thứ làm mất niềm tin
     * nhanh hơn cả không có dòng nào. Dùng "Lần tới rơi vào" cho mọi trường
     * hợp, và luôn kèm đủ năm để người dùng tự thấy.
     */
    lunarPreview: 'Lần tới rơi vào {weekday} {date}',
    /** Hậu tố sau ngày âm: "15/8 âm". Tách riêng để dòng ngày ghép được. */
    lunarSuffix: 'âm',
    monthLabel: 'Tháng {month}/{year}',
    /** Badge đếm trên tiêu đề mỗi nhóm tháng. */
    countLabel: '{count} sự kiện',
    /** Cả ngày — sự kiện không có giờ cụ thể. Giỗ, sinh nhật thường là loại này. */
    allDay: 'Cả ngày',
    /**
     * Sự kiện âm lịch vừa tạo, Edge `refresh-lunar-dates` chưa chạy xong.
     * Nói thẳng thay vì để trống — chỗ trống ở đúng vị trí ngày trông như dữ
     * liệu hỏng, và người dùng vừa bấm Lưu sẽ tưởng thao tác thất bại.
     */
    pendingDate: 'Đang tính ngày',
    lunarBoth: '{lunar} âm — {weekday} {solar}',

    /* ── Trí nhớ năm ngoái (06 §5) ───────────────────────────────────────── */

    /**
     * Tiêu đề khối NĂM NGOÁI ở màn chi tiết — `05 §5.5`.
     *
     * Khối này KHÔNG hiện khi chưa có lần diễn ra nào, và cố ý không có câu
     * "chưa có dữ liệu": một khối trống nói với người dùng rằng họ đang thiếu
     * thứ gì đó, còn không có khối nào thì không nói gì cả — và ở năm đầu tiên,
     * không nói gì mới là đúng.
     */
    sectionLastYear: 'Năm ngoái',
    /** Dòng trong khối: "3/10/2025 — thực tế 3.200.000 ₫". */
    lastYearWithCost: '{date} — thực tế {amount}',
    /**
     * Lần diễn ra mà người dùng đã bỏ qua câu hỏi chi phí.
     *
     * Vẫn hiện ngày: một dịp đã diễn ra là một dữ kiện thật, và giấu nó đi vì
     * thiếu con số sẽ làm khối NĂM NGOÁI trống ở đúng năm thứ hai — lúc nó cần
     * có mặt nhất. Không có chỗ nào mời nhập lại: đã bỏ qua là xong.
     */
    lastYearNoCost: '{date} — không ghi chi phí',
    /** Điền sẵn ô chi phí dự kiến ở form khi đã có số thực tế năm ngoái. */
    lastYearPrefill: 'Năm ngoái hết {amount}',

    /* ── Hỏi chi phí thực tế — 05 §5.7 ───────────────────────────────────── */

    /**
     * Sheet hỏi MỘT LẦN sau khi một dịp có chi phí dự kiến trôi qua.
     *
     * Câu mở đầu là một lời xác nhận, không phải câu hỏi: "đã xong" nói rằng
     * app biết chuyện đã qua. Chỉ sau đó mới hỏi. Đảo thứ tự — hỏi trước rồi
     * mới nói dịp nào — biến nó thành một cuộc thẩm vấn nhỏ.
     */
    costAskTitle: '{title} đã xong.',
    costAskBody: 'Thực tế hết bao nhiêu?',
    costAskField: 'Chi phí thực tế',
    costAskSave: 'Lưu',
    /**
     * "Bỏ qua", KHÔNG phải "Để sau".
     *
     * "Để sau" là một lời hứa app sẽ hỏi lại, và app sẽ không hỏi lại — đúng
     * theo thiết kế (`cost_asked` bật lên trong cả hai nhánh). Một nút nói sai
     * việc nó làm là chỗ nhỏ nhất mà niềm tin rò ra.
     */
    costAskSkip: 'Bỏ qua',
    /** Dòng nhỏ dưới hai nút — nói trước hệ quả, để "Bỏ qua" là lựa chọn có hiểu biết. */
    costAskOnce: 'Chỉ hỏi một lần. Bỏ qua thì thôi, không hỏi lại.',

    sectionTasks: 'Việc cần chuẩn bị',
    sectionCosts: 'Chi phí',
    sectionDocs: 'Giấy tờ',
    addTask: 'Thêm việc',
    addPayment: 'Thêm khoản',
    attachDoc: 'Gắn giấy tờ',
    noneYet: 'chưa có',
    prepCount: '{count} việc cần chuẩn bị',
  },

  eventKind: {
    death_anniversary: 'Giỗ',
    wedding: 'Cưới hỏi',
    birthday: 'Sinh nhật',
    holiday: 'Lễ, Tết',
    medical: 'Khám bệnh',
    trip: 'Đi chơi',
    school: 'Trường lớp',
    /** v3 §7.5: tiêm, họp phụ huynh, sinh nhật bạn cùng lớp. Con nào thì xem
     *  `childMemberId` — mỗi con một màu. */
    child: 'Của con',
    other: 'Khác',
  },

  // Ánh xạ enum family_side (migration 0004 §1).
  //
  // Trục là "NHÀ AI", không phải "nội/ngoại" — hai trục đó khác nhau và không
  // ánh xạ được: với một cặp vợ chồng "nhà nội" là nhà chồng, nhưng "bên nội
  // của vợ" cũng tồn tại. Chọn trục theo thứ người dùng thật sự nghĩ (06 §0.1).
  familySide: {
    husband_family: 'Nhà chồng',
    wife_family: 'Nhà vợ',
    both: 'Cả hai',
    own: 'Nhà mình',
  },

  money: {
    title: 'Tiền',
    usable: 'Có thể dùng ngay',
    savings: 'Tiết kiệm & dự phòng',
    longTerm: 'Tài sản dài hạn',
    debt: 'Đang nợ',
    sectionUpcoming: 'Sắp phải trả',
    sectionAttention: 'Cần trao đổi',
    sectionGoals: 'Mục tiêu',
    emptyTitle: 'Chưa có gì về tiền',
    emptyBody: 'Thêm một khoản sắp phải trả, hay ghi lại tiền nhà mình đang có.',

    snapshotTitle: 'Cập nhật tình hình',
    snapshotSave: 'Lưu cập nhật',
    snapshotSaved: 'Đã cập nhật',
    // KHÔNG BAO GIỜ viết "X đã thay đổi số tiền".
    snapshotPush: 'Tình hình tài chính gia đình vừa được cập nhật.',

    historyTitle: 'Nhà mình qua từng mốc',
    historyEmptyTitle: 'Chưa có mốc nào',
    // Mốc do cron ghi cuối mỗi tháng, người dùng không tạo (06 §1). Câu này
    // nói ĐIỀU SẼ XẢY RA, không mời họ đi làm gì.
    historyEmptyBody: 'Cuối tháng nhà mình sẽ có mốc đầu tiên ở đây.',

    changesTitle: 'Lịch sử biến động',
    changesEmptyTitle: 'Chưa có thay đổi nào',
    changesEmptyBody: 'Khi giá trị một khoản đổi, nó sẽ được ghi lại ở đây.',
    /**
     * Dòng tổng của một tháng — BẮT BUỘC đủ hai thứ: số lượng bản ghi và chữ
     * "đã ghi" (08 §1.3).
     *
     * "5 khoản nhà mình đã ghi: −12 triệu" đúng theo đúng nghĩa đen của nó, kể
     * cả khi nhà mình còn mười khoản khác quên ghi. "Tháng 9 chi 12 triệu" thì
     * tự nhận là đầy đủ và sẽ sai 30–40% mãi mãi.
     *
     * Đừng tách `{count}` ra khỏi câu này để dùng riêng: nó với chữ "đã ghi" là
     * một cặp, và tách ra là lúc con số tổng đi lang thang một mình.
     */
    monthlyRecorded: '{count} khoản nhà mình đã ghi',
    /** Nhãn nhóm tháng: "Tháng 9" · "Tháng 12/2025" khi khác năm hiện tại. */
    monthLabel: 'Tháng {month}',
    monthLabelWithYear: 'Tháng {month}/{year}',
    recentChanges: 'Thay đổi gần nhất',
    changeTransition: '{before} → {after}',
    changeInitial: 'Ghi lần đầu {after}',
    changeSettled: 'đã trả',
    changeBy: '{name} cập nhật',
    bucketToday: 'Hôm nay',
    bucketYesterday: 'Hôm qua',
    bucketThisWeek: 'Tuần này',
    bucketLastWeek: 'Tuần trước',
  },

  asset: {
    title: 'Tài sản',
    formTitle: 'Khoản mới',
    formEditTitle: 'Sửa khoản',
    fieldName: 'Tên khoản',
    fieldNamePlaceholder: 'Sổ tiết kiệm ACB',
    fieldKind: 'Loại tài sản',
    fieldValue: 'Giá trị',
    fieldInstitution: 'Nơi giữ',
    fieldHolder: 'Người giữ',
    fieldAsOf: 'Cập nhật ngày',
    // Thanh khoản KHÔNG hỏi — suy ra từ loại, ẩn sau dòng nhỏ này (03 §2).
    changeLiquidity: 'Đổi cách phân loại',
    updateValue: 'Cập nhật giá trị',
    updateValueSaved: 'Đã cập nhật giá trị',
    staleValue: 'Cập nhật {label}',
    emptyTitle: 'Chưa ghi khoản nào',
    emptyBody: 'Ghi lại tiền nhà mình đang có ở đâu.',
    close: 'Đóng khoản này',
  },

  assetKind: {
    cash: 'Tiền mặt',
    bank_account: 'Tài khoản ngân hàng',
    savings: 'Sổ tiết kiệm',
    gold: 'Vàng',
    real_estate: 'Bất động sản',
    investment: 'Đầu tư',
    receivable: 'Cho vay',
    other: 'Khác',
  },

  liquidity: {
    usable_now: 'Có thể dùng ngay',
    not_immediate: 'Tiết kiệm & dự phòng',
    long_term: 'Tài sản dài hạn',
  },

  payment: {
    title: 'Sắp phải trả',
    filter7d: '7 ngày',
    filter30d: '30 ngày',
    filterOverdue: 'Quá hạn',
    filterPaid: 'Đã trả',
    filterAll: 'Tất cả',
    formTitle: 'Khoản sắp trả',
    fieldName: 'Tên khoản',
    fieldNamePlaceholder: 'Học phí kỳ 1',
    fieldAmount: 'Số tiền',
    fieldDueDate: 'Đến hạn',
    markPaid: 'Đã trả',
    markPaidDate: 'Ngày trả',
    markPaidSaved: 'Đã ghi khoản đã trả',
    debtAfter: 'Dư nợ {name} sẽ còn {amount}.',
    emptyTitle: 'Chưa có khoản nào sắp phải trả',
    emptyBody: 'Ghi khoản tiền nhà mình cần chuẩn bị.',
  },

  debt: {
    title: 'Nợ',
    formTitle: 'Khoản nợ',
    fieldName: 'Tên khoản nợ',
    fieldNamePlaceholder: 'Vay mua nhà BIDV',
    fieldLender: 'Bên cho vay',
    fieldPrincipal: 'Gốc',
    fieldRemaining: 'Dư nợ',
    fieldInterest: 'Lãi suất (%/năm)',
    fieldInstallment: 'Tiền mỗi kỳ',
    fieldNextDue: 'Kỳ trả tiếp theo',
    fieldFinalDue: 'Tất toán dự kiến',
    fieldBorrower: 'Người vay',
    progress: 'Đã trả {paid} trên {total}',
    sectionHistory: 'Các kỳ đã trả',
    emptyTitle: 'Chưa có khoản nợ nào',
    emptyBody: 'Ghi lại khoản nợ để biết mỗi kỳ cần chuẩn bị bao nhiêu.',

    // ── G9 ──
    formEditTitle: 'Sửa khoản nợ',
    /** Nhãn dưới con số lớn trên màn chi tiết. */
    remainingLabel: 'Còn phải trả',
    perPeriod: '{amount} mỗi kỳ',
    nextDueLabel: 'Kỳ tới {date}',
    noNextDue: 'Chưa đặt kỳ trả tiếp theo',
    settled: 'Đã tất toán',
    /** Bộ lọc: nợ đã tất toán vẫn xem lại được, nhưng không nằm cùng nợ đang trả. */
    filterOpen: 'Đang trả',
    filterSettled: 'Đã tất toán',
    /**
     * Dư nợ là trường CHỈ ĐỌC sau khi tạo (02 §7) — dòng này giải thích vì sao
     * form sửa không có ô đó, thay vì để người dùng đi tìm.
     */
    remainingReadonly: 'Dư nợ tự giảm mỗi lần bạn đánh dấu một kỳ đã trả.',
    deleteConfirm: 'Xoá khoản nợ này?',
    savedToast: 'Đã lưu khoản nợ',
  },

  /**
   * Mục tiêu — 05 §6.7, P0 từ `08 §2`.
   *
   * BA con số và chỉ ba: đã có, cần đạt, còn thiếu. Bảng từ vựng ở đây CỐ Ý
   * không có chữ nào cho "mỗi tháng cần góp bao nhiêu", "còn bao lâu theo tốc
   * độ hiện tại", hay "ai góp bao nhiêu". App không biết thu nhập và không biết
   * hoàn cảnh; một dòng "bạn đang chậm kế hoạch" với cặp vợ chồng đang chật vật
   * là sự tàn nhẫn được tự động hoá. Thiếu chuỗi là cách rẻ nhất để tính năng
   * đó không lặng lẽ mọc lại.
   */
  goal: {
    title: 'Mục tiêu',
    formTitle: 'Mục tiêu mới',
    formEditTitle: 'Sửa mục tiêu',
    fieldName: 'Tên mục tiêu',
    fieldNamePlaceholder: 'Mua nhà',
    fieldTarget: 'Cần đạt',
    fieldCurrent: 'Đã có',
    fieldTargetDate: 'Muốn xong trước',
    contribute: 'Góp thêm',
    contributeTitle: 'Góp thêm vào mục tiêu',
    contributeField: 'Số tiền góp',
    contributeSaved: 'Đã ghi khoản góp',
    have: 'Đã có {amount}',
    need: 'Cần thêm {amount}',
    /** Nhãn ba con số ở màn chi tiết. */
    labelHave: 'Đã có',
    labelTarget: 'Cần đạt',
    labelRemaining: 'Còn thiếu',
    /** Đã góp đủ. Một câu ghi nhận, không phải một huy hiệu. */
    reached: 'Đã đủ',
    history: 'Các lần góp',
    delete: 'Xoá mục tiêu này',
    emptyTitle: 'Chưa có mục tiêu nào',
    emptyBody: 'Đặt một mục tiêu chung để biết tiền để dành đang đi về đâu.',
  },

  /**
   * Quỹ chung — v3 §7.6.
   *
   * BỐN CHỮ KHÔNG BAO GIỜ ĐƯỢC XUẤT HIỆN ở đây hay bất cứ đâu trong app:
   * "còn thiếu", "chưa góp", "nợ quỹ", "đóng góp bắt buộc" (09 §A.5). Chúng
   * biến một cuốn sổ ghi chép thành một bản cáo trạng. Kiểm bằng:
   *   grep -rn "còn thiếu\|chưa góp\|nợ quỹ" apps/mobile/src/i18n/
   *
   * Dùng "Bỏ vào / Rút ra" chứ không "Đóng góp / Chi": "đóng góp" mang nghĩa
   * nghĩa vụ với một mức đã định, mà app cố ý không biết mức đó là bao nhiêu.
   */
  fund: {
    title: 'Quỹ chung',
    formTitle: 'Quỹ mới',
    formEditTitle: 'Sửa quỹ',
    fieldName: 'Tên quỹ',
    fieldNamePlaceholder: 'Quỹ sinh hoạt',
    deposit: 'Bỏ vào',
    withdraw: 'Rút ra',
    depositTitle: 'Bỏ tiền vào quỹ',
    withdrawTitle: 'Rút tiền khỏi quỹ',
    fieldAmount: 'Số tiền',
    fieldDate: 'Ngày',
    fieldPurpose: 'Mục đích',
    fieldPurposePlaceholder: 'Tiền nhà tháng 9',
    /** Chỉ hỏi khi BỎ VÀO. Rút thì không hỏi ai rút — tiền trong quỹ là tiền chung. */
    fieldContributor: 'Ai bỏ vào',
    fieldContributorPlaceholder: 'Gõ tên khác nếu không phải hai vợ chồng',
    saved: 'Đã ghi',
    deleted: 'Đã xoá khoản này',
    /**
     * "Ghi lần cuối", KHÔNG phải "cập nhật lần cuối": số dư quỹ là tổng của
     * những khoản đã ghi, khác số khai của tài sản vốn là con số một người nói
     * ra tại một thời điểm.
     */
    /**
     * Nhãn thời gian của số dư quỹ. CỐ Ý không dùng lại `declaredAt` của tài
     * sản: chữ "cập nhật" hàm ý một người vừa khai lại một con số, còn số dư quỹ
     * là TỔNG của những khoản đã ghi. Dùng lại câu kia là nói sai bản chất
     * dữ liệu.
     */
    recordedNever: 'Chưa ghi khoản nào',
    recordedToday: 'Ghi lần cuối hôm nay',
    recordedYesterday: 'Ghi lần cuối hôm qua',
    recordedDaysAgo: 'Ghi lần cuối {days} ngày trước',
    recordedWeeksAgo: 'Ghi lần cuối {weeks} tuần trước',
    recordedMonthsAgo: 'Ghi lần cuối {months} tháng trước',
    monthDeposits: 'Bỏ vào',
    monthWithdrawals: 'Rút ra',
    /** BẮT BUỘC kèm mọi con số tổng — cùng luật với màn lịch sử biến động. */
    entryCount: '{count} khoản nhà mình đã ghi',
    /** Nhãn khối ngoại lệ. Không có chữ nào mang nghĩa so sánh hay thiếu đủ. */
    contributors: 'Người bỏ vào',
    contributorTimes: '{count} lần',
    unnamedContributor: '(không ghi tên)',
    emptyTitle: 'Chưa có quỹ chung',
    emptyBody: 'Quỹ chung để hai người cùng thấy tiền nhà, ăn uống, điện nước đang còn bao nhiêu.',
    emptyAction: 'Tạo quỹ',
    /** Trạng thái rỗng của MỘT tháng — không có nút, bộ chọn tháng đã ở ngay trên. */
    monthEmpty: 'Tháng này chưa ghi khoản nào',
    delete: 'Xoá quỹ này',
  },

  attention: {
    title: 'Cần trao đổi',
    flag: 'Cần trao đổi',
    flagNote: 'Ghi chú',
    flagNotePlaceholder: 'Khoản này cao hơn bình thường',
    flagSaved: 'Đã gắn cờ cần trao đổi',
    flagPush: 'Có một khoản cần hai người xem lại.',
    resolve: 'Đã rõ',
    resolveNote: 'Kết luận',
    resolveNotePlaceholder: 'Hai người đã thống nhất…',
    resolved: 'Đã đóng cờ',
    // Cờ tự hết hiệu lực sau 14 ngày để trạng thái không mắc kẹt ở "Cần chú ý".
    expiresIn: 'Tự hết hiệu lực sau {days} ngày',
    emptyTitle: 'Không có gì cần trao đổi',
    emptyBody: 'Khi một khoản cần hai người cùng xem, nó sẽ hiện ở đây.',
    // Câu hỏi KHÔNG BAO GIỜ là "vì sao khoản này giảm".
    suggestTitle: 'Khoản này thay đổi khá nhiều',
    suggestBody: 'Ghi chú lại để cả hai cùng nắm?',

    // ── G9 ──
    /** Tiêu đề sheet gắn cờ — nói việc nó làm, không doạ. */
    flagTitle: 'Đánh dấu cần trao đổi',
    flagBody: 'Người kia sẽ thấy khoản này trong mục Cần trao đổi.',
    resolveTitle: 'Đóng cờ này?',
    /** Ai gắn + khi nào. Ngữ cảnh, KHÔNG phải quy trách nhiệm. */
    flaggedBy: '{name} đánh dấu {date}',
    flaggedOn: 'Đánh dấu {date}',
    /** Dòng dẫn sang khoản liên quan. */
    seeEntity: 'Xem khoản này',
    /** Khoản gắn cờ đã bị xoá — cờ vẫn còn, nhưng không dẫn đi đâu được. */
    entityGone: 'Khoản này đã bị xoá',
  },

  doc: {
    title: 'Giấy tờ',
    formTitle: 'Giấy tờ mới',
    fieldTitle: 'Tên giấy tờ',
    fieldTitlePlaceholder: 'Bảo hiểm xe',
    fieldType: 'Loại',
    fieldOwner: 'Thuộc về',
    fieldIssued: 'Ngày cấp',
    fieldExpiry: 'Hết hạn',
    // Trường quan trọng nhất trên màn chi tiết (05 §7.2).
    fieldPhysical: 'Bản giấy để đâu',
    fieldPhysicalPlaceholder: 'Ngăn kéo phòng làm việc',
    fieldRenewalCost: 'Phí gia hạn dự kiến',
    fieldExternalLink: 'Đường dẫn',
    filterExpiring: 'Sắp hết hạn',
    filterByOwner: 'Theo người',
    filterByType: 'Theo loại',
    viewGrid: 'Lưới',
    viewList: 'Danh sách',
    addFiles: 'Thêm ảnh hoặc file',
    pickPhoto: 'Chọn ảnh',
    takePhoto: 'Chụp ảnh',
    pickFile: 'Chọn file',
    noFiles: 'Chưa có ảnh hoặc file',
    // Giấy tờ không có file vẫn là bản ghi đầy đủ — biết chỗ để giấy đã có giá trị.
    noFilesHint: 'Biết chỗ để bản giấy cũng đã đủ dùng.',
    uploading: 'Đang tải lên…',
    uploadFailed: 'Chưa tải lên được',
    related: 'Liên quan',
    createRenewalTask: 'Tạo việc gia hạn',
    createRenewalPayment: 'Ghi khoản chi',
    emptyTitle: 'Chưa có giấy tờ nào',
    emptyBody: 'Ghi lại giấy tờ quan trọng và chỗ để bản giấy.',

    // ── G8 ──
    formEditTitle: 'Sửa giấy tờ',
    // Nhắc lại ngay dưới tên form: file là bước sau, không phải điều kiện để lưu.
    formFilesLater: 'Lưu trước, thêm ảnh sau cũng được.',
    filterAll: 'Tất cả',
    filterNoExpiry: 'Không có hạn',
    noExpiry: 'Không có hạn',
    /** Ô giữ chỗ khi file là PDF — client không dựng thumbnail cho PDF. */
    fileKindPdf: 'PDF',
    expiresOn: 'Hết hạn {date}',
    // Dòng phụ trên thẻ: còn bao nhiêu ngày. Quá hạn dùng agoLabel, không trách móc.
    ownedBy: 'Thuộc về {name}',
    physicalPrefix: 'Bản giấy:',
    physicalUnknown: 'Chưa ghi chỗ để bản giấy',
    fieldNotes: 'Ghi chú',
    fieldRemindLead: 'Nhắc trước',
    remindLeadDays: '{days} ngày',
    sectionFiles: 'Ảnh và file',
    // Hàng đợi: người dùng rời màn hình được, nên trạng thái phải đọc được từ xa.
    queueUploading: 'Đang tải {done}/{total}',
    queueFailed: '{count} file chưa tải lên được',
    queueRetry: 'Thử lại',
    queueRemove: 'Bỏ khỏi hàng đợi',
    queuePending: 'Đang chờ',
    fileRemove: 'Gỡ file này',
    fileRemoveConfirm: 'Gỡ file khỏi giấy tờ này?',
    openFile: 'Mở file',
    share: 'Chia sẻ',
    storageUsed: 'Đã dùng {used} trên {total}',
    // Sau khi lưu — tên nút là việc nó làm, toast nhắc lại đúng việc đó.
    savedToast: 'Đã lưu giấy tờ',
    fileAddedToast: 'Đã thêm file',
    deleteConfirm: 'Xoá giấy tờ này?',
  },

  docType: {
    marriage_cert: 'Đăng ký kết hôn',
    birth_cert: 'Giấy khai sinh',
    id_card: 'Căn cước',
    passport: 'Hộ chiếu',
    insurance: 'Bảo hiểm',
    vehicle: 'Giấy tờ xe',
    housing_contract: 'Hợp đồng nhà',
    loan_contract: 'Hợp đồng vay',
    medical: 'Hồ sơ y tế',
    vaccination: 'Tiêm chủng',
    school: 'Trường lớp',
    invoice_warranty: 'Hoá đơn, bảo hành',
    asset: 'Giấy tờ tài sản',
    tax_admin: 'Thuế, hành chính',
    other: 'Khác',
  },

  /**
   * Sổ hiếu hỉ — 07 §3.
   *
   * BẢNG TỪ VỰNG RIÊNG của module này. Không có chữ nào mang nghĩa nợ nần hay
   * xếp hạng: không "còn thiếu", không "đã trả đủ", không "mừng nhiều nhất",
   * không "hào phóng". Hai chiều đọc là "Nhà mình nhận" và "Nhà mình đi" —
   * SONG SONG, không bao giờ trừ nhau (07 §3.4).
   */
  gift: {
    /**
     * "Sổ hiếu hỉ", không phải "sổ mừng cưới": cưới chỉ là MỘT trong tám dịp
     * (07 §3). Tân gia, đầy tháng, giỗ không phải ngoại lệ của cưới.
     */
    title: 'Sổ hiếu hỉ',
    contactsTitle: 'Người quen',

    /** Dòng gợi ý — TOÀN BỘ lý do module này tồn tại (07 §3.4). */
    suggestLine: '{name} đã mừng nhà mình',
    suggestUse: 'Dùng số này',
    /** "2.000.000 ₫ — cưới, 3/2023" */
    suggestBasis: '{amount} — {occasion}, {date}',

    emptyTitle: 'Sổ hiếu hỉ còn trống',
    emptyBody: 'Ghi lại một khoản mừng để lần sau còn nhớ nhà nào đã đi bao nhiêu.',
    emptyAction: 'Ghi khoản mừng',
    contactsEmptyTitle: 'Chưa có người quen nào',
    contactsEmptyBody: 'Thêm tên khi ghi khoản mừng đầu tiên.',

    formTitle: 'Khoản mừng',
    formEditTitle: 'Sửa khoản mừng',
    fieldContact: 'Nhà nào',
    fieldContactPlaceholder: 'Chú Ba',
    fieldDirection: 'Chiều',
    fieldOccasion: 'Dịp',
    fieldAmount: 'Số tiền mừng',
    fieldDate: 'Ngày',
    fieldEvent: 'Gắn với đám',
    /** Quà hiện vật: khi đó số tiền = 0 và không có dòng gợi ý nào. */
    fieldInKind: 'Quà hiện vật',
    fieldInKindPlaceholder: 'Một cây vàng',
    fieldNotes: 'Ghi chú',

    contactFormTitle: 'Người quen',
    fieldName: 'Tên',
    fieldNamePlaceholder: 'Chú Ba',
    fieldRelation: 'Quan hệ',
    /** Chữ TỰ DO. Không enum hoá quan hệ họ hàng VN — quá nhiều nhánh. */
    fieldRelationPlaceholder: 'Chú ruột bên nội',
    fieldSide: 'Bên',

    /** Nhập hàng loạt — ngày cưới nhận 100 phong bì (07 §3.3). */
    bulkTitle: 'Nhập nhanh',
    bulkHint: 'Gõ tên rồi số tiền. Xong một dòng thì Enter để sang dòng tiếp.',
    bulkName: 'Tên',
    bulkAmount: 'Số tiền',
    bulkAdd: 'Thêm dòng',
    bulkSave: 'Lưu {count} dòng',
    bulkSaved: 'Đã lưu {count} khoản mừng',
    bulkEmpty: 'Chưa có dòng nào để lưu',

    /** Tổng của MỘT đám — luôn kèm SỐ LƯỢNG bản ghi (ràng buộc #5). */
    occasionTotal: '{total} — {count} nhà đã ghi',

    /** Hai chiều SONG SONG. Không bao giờ có dòng chênh lệch giữa chúng. */
    received: 'Nhà mình nhận',
    given: 'Nhà mình đi',
    timesReceived: 'Đã mừng nhà mình {count} lần',
    timesGiven: 'Nhà mình đã đi {count} lần',
    neverReceived: 'Chưa ghi lần nào',

    /**
     * NGHĨA VỤ ĐÁP LỄ — 07 §3.2.
     *
     * Câu chữ ở đây quyết định module này là một lời nhắc hay một lời đòi nợ.
     * Mọi chuỗi dưới đây nói về MỘT KHOẢN CỤ THỂ, không bao giờ về mối quan hệ,
     * và KHÔNG BAO GIỜ CÓ SỐ TIỀN — phép thử ở 07 §3.6: bỏ hết số tiền đi mà
     * thông tin vẫn còn giá trị thì đó là nghĩa vụ, không phải sổ nợ.
     *
     * KHÔNG dùng chữ "nợ", "còn thiếu", "chưa trả", "quá hạn". Nghĩa vụ đáp lễ
     * không có hạn — nó chờ đến khi nhà đó có việc.
     */
    outstandingTitle: 'Chưa đáp lễ',
    outstanding: 'Chưa đáp lễ',
    reciprocated: 'Đã đáp lễ',
    notNeeded: 'Không cần đáp lễ',
    /** Trên khoản ĐI: "Đáp lễ: chú Ba mừng cưới mình, 3/2023" */
    reciprocatesLine: 'Đáp lễ: {occasion}, {date}',

    outstandingEmptyTitle: 'Không có khoản nào đang chờ',
    outstandingEmptyBody: 'Những khoản nhà mình nhận mà chưa có dịp đi lại sẽ hiện ở đây.',
    /** Nhắc trong form khi nhà này còn khoản chưa đáp lễ (07 §3.4). */
    outstandingHint: 'Nhà này còn {count} khoản chưa đáp lễ',

    /** Nút ghép cặp. "Chọn khoản" chứ không phải "trả" — đây không phải nợ. */
    linkAction: 'Đánh dấu đáp lễ khoản này',
    linkPick: 'Khoản nào?',
    unlinkAction: 'Bỏ ghép',
    linkedToast: 'Đã đánh dấu đáp lễ',

    /**
     * KHOẢN KHÔNG CẦN ĐÁP — 07 §3.4b. Bố mẹ mừng con, người trên mừng người
     * dưới, người đã mất. App KHÔNG BAO GIỜ tự đoán; người dùng tự bật.
     */
    markNotNeeded: 'Không cần đáp lễ',
    unmarkNotNeeded: 'Bỏ đánh dấu',
    notNeededHint: 'Khoản này vẫn nằm trong sổ, chỉ không nằm ở mục chờ đáp lễ.',

    sortByDate: 'Theo ngày',
    /** Tuỳ chọn, KHÔNG BAO GIỜ mặc định, và không có nhãn "nhiều/ít nhất". */
    sortByAmount: 'Theo số tiền',

    savedToast: 'Đã ghi khoản mừng',
    deletedToast: 'Đã xoá khoản mừng',
    deleteConfirm: 'Xoá khoản mừng này?',
    contactSavedToast: 'Đã lưu người quen',
  },

  giftDirection: {
    received: 'Nhà mình nhận',
    given: 'Nhà mình đi',
  },

  giftOccasion: {
    wedding: 'Cưới',
    engagement: 'Ăn hỏi',
    funeral: 'Tang lễ',
    death_anniversary: 'Giỗ',
    full_month: 'Đầy tháng',
    birthday: 'Sinh nhật',
    housewarming: 'Tân gia',
    other: 'Khác',
  },

  contactSide: {
    husband_family: 'Nhà chồng',
    wife_family: 'Nhà vợ',
    shared: 'Cả hai',
    other: 'Khác',
  },

  /**
   * Hồ sơ con — 07 §4. PHẦN CẨN THẬN NHẤT CỦA CẢ APP.
   *
   * Ba ràng buộc về CHỮ ở đây, mỗi cái đều có hậu quả thật:
   *
   * 1. `scheduleDisclaimer` phải hiện ở MỌI màn có lịch tiêm — app đưa ra một
   *    lịch tham khảo, không phải một chỉ định y tế.
   * 2. Mũi trễ đọc là "quá lịch", KHÔNG dùng chữ trách móc ("bạn đã bỏ lỡ",
   *    "chưa hoàn thành"), và luôn kèm một việc LÀM ĐƯỢC: liên hệ cơ sở tiêm.
   * 3. Không có chuỗi nào cho việc hoãn, bỏ, hay đổi thứ tự mũi — vì không có
   *    tính năng đó, và sẽ không bao giờ có (07 §4.2).
   */
  child: {
    title: 'Hồ sơ con',
    /** "Bé An · 14 tháng" */
    header: '{name} · {age}',
    ageMonths: '{count} tháng',
    ageYears: '{count} tuổi',

    sectionUpcoming: 'Sắp tới',
    sectionDone: 'Đã tiêm',
    sectionGrowth: 'Chiều cao · cân nặng',
    sectionDocs: 'Giấy tờ',
    sectionSchool: 'Trường lớp',

    doseCount: '{count} mũi',
    docCount: '{count} mục',

    /** BẮT BUỘC ở mọi màn có lịch tiêm — 07 §4.2. */
    scheduleDisclaimer:
      'Lịch tham khảo theo Chương trình Tiêm chủng mở rộng. Hãy xác nhận với cơ sở tiêm chủng.',
    /** Nguồn + phiên bản của file seed — để một năm sau còn truy được. */
    scheduleSource: 'Nguồn: {source}, {date}',

    /**
     * Bảng tham chiếu chưa seed. Nói THẬT là app chưa có lịch, không bịa ra
     * một mốc nào — 07 §4.2 và `supabase/seed/README.md`.
     */
    scheduleEmptyTitle: 'Chưa có lịch tiêm trong app',
    scheduleEmptyBody:
      'Lịch tiêm cần được người có chuyên môn y tế xác nhận trước khi đưa vào app. Trong lúc chờ, vẫn ghi tay được từng mũi đã tiêm.',

    birthdayNeededTitle: 'Chưa có ngày sinh',
    birthdayNeededBody: 'Thêm ngày sinh để app dựng các mốc tiêm.',
    birthdayNeededAction: 'Thêm ngày sinh',

    generateSchedule: 'Dựng lịch tiêm',
    scheduleGenerated: 'Đã dựng {count} mốc tiêm',

    dosesEmptyTitle: 'Chưa ghi mũi nào',
    dosesEmptyBody: 'Ghi lại những mũi đã tiêm để không phải nhớ.',

    /** "còn 9 ngày" · "quá lịch 12 ngày" · "đã tiêm 5/10/2025" */
    doseIn: 'còn {days} ngày',
    doseToday: 'hôm nay',
    doseOverdue: 'quá lịch {days} ngày',
    doseNoDate: 'chưa hẹn ngày',
    doseDone: 'đã tiêm {date}',

    /** Mũi trễ: một việc LÀM ĐƯỢC, không phải một lời trách. */
    overdueHint: 'Liên hệ cơ sở tiêm chủng để tiêm bù.',

    markDone: 'Đã tiêm',
    markDoneTitle: 'Ghi mũi đã tiêm',
    fieldAdministeredOn: 'Ngày tiêm',
    fieldFacility: 'Nơi tiêm',
    fieldFacilityPlaceholder: 'Trạm y tế phường',
    doseDoneToast: 'Đã ghi mũi tiêm',
    undoDose: 'Bỏ đánh dấu',
    undoDoseToast: 'Đã bỏ đánh dấu',

    /** Mũi ngoài lịch: dịch vụ, tiêm bù. */
    addDose: 'Thêm mũi ngoài lịch',
    fieldDoseName: 'Tên mũi',
    fieldDoseNamePlaceholder: 'Cúm mùa',
    fieldDueDate: 'Ngày hẹn',

    /**
     * Chiều cao cân nặng: GHI VÀ VẼ, KHÔNG DIỄN GIẢI (07 §4.3).
     * Không có chuỗi nào cho bách phân vị, chuẩn WHO, hay đánh giá.
     */
    growthTitle: 'Chiều cao · cân nặng',
    growthEmptyTitle: 'Chưa có số đo nào',
    growthEmptyBody: 'Ghi lại chiều cao và cân nặng sau mỗi lần khám.',
    addGrowth: 'Thêm số đo',
    fieldMeasuredOn: 'Ngày đo',
    fieldHeight: 'Chiều cao (cm)',
    fieldWeight: 'Cân nặng (kg)',
    growthSavedToast: 'Đã ghi số đo',
    growthDeleteConfirm: 'Xoá số đo này?',

    /** ĐẦU VÀO của buildVaccineSchedule() — app hỏi, không đoán. */
    fieldBirthday: 'Ngày sinh',
    fieldSchoolName: 'Trường',
    fieldSchoolClass: 'Lớp',
    fieldInsuranceNo: 'Số thẻ BHYT',
    infoSavedToast: 'Đã lưu',

    /** Danh sách con trên tab Giấy tờ. */
    listTitle: 'Con',
    listEmptyTitle: 'Chưa có con trong nhà mình',
    listEmptyBody: 'Thêm con ở phần Thành viên để theo dõi lịch tiêm và giấy tờ.',
  },

  settings: {
    title: 'Cài đặt',
    household: 'Nhà mình',
    householdName: 'Tên nhà',
    members: 'Thành viên',
    addMember: 'Thêm người trong nhà',
    addMemberHint: 'Con, bố mẹ hai bên — không cần tài khoản',
    invite: 'Mời',
    inviteTitle: 'Mã mời',
    inviteBody: 'Chia sẻ mã này để người kia cùng vào nhà mình.',
    inviteShare: 'Chia sẻ',
    inviteCopy: 'Sao chép mã',
    inviteCopied: 'Đã sao chép',
    // Nội dung share sheet. Có CẢ mã lẫn đường dẫn: người nhận trên máy đã cài
    // app chạm link là xong, người chưa cài vẫn đọc được mã để gõ tay sau.
    inviteShareMessage:
      'Vào {household} cùng mình nhé. Mã mời: {code}\n{url}',
    inviteExpiry: 'Mã có hiệu lực 7 ngày.',
    subscription: 'Gói dịch vụ',
    notifications: 'Thông báo',
    storage: 'Dung lượng',
    data: 'Dữ liệu',
    displayName: 'Tên hiển thị',
    snapshotInterval: 'Nhịp cập nhật',
    snapshotInterval7: '7 ngày',
    snapshotInterval30: '30 ngày',
  },

  memberRole: {
    owner: 'Chủ nhà',
    partner: 'Vợ/Chồng',
    child: 'Con',
    relative: 'Người thân',
  },

  subscription: {
    title: 'Gói dịch vụ',
    statusTrialing: 'Đang dùng thử',
    statusActive: 'Đang dùng bản Pro',
    statusGrace: 'Cần gia hạn',
    statusExpired: 'Đã hết hạn',
    statusNone: 'Bản miễn phí',
    expiresOn: 'Hết hạn {date}',
    upgrade: 'Nâng cấp',
    restore: 'Khôi phục giao dịch',
    // Giải thích CỤ THỂ đang bị chặn gì, không doạ.
    paywallTitle: 'Lưu file cần bản Pro',
    paywallBody:
      'Bạn vẫn ghi được thông tin giấy tờ và vị trí bản giấy. Bản Pro thêm 10GB để lưu ảnh và file.',
    paywallShared: 'Mua một lần, cả hai người cùng dùng.',
  },

  recur: {
    none: 'Không lặp',
    daily: 'Hằng ngày',
    weekly: 'Hằng tuần',
    monthly: 'Hằng tháng',
    yearly: 'Hằng năm',
  },

  dueLabel: {
    today: 'Hôm nay',
    tomorrow: 'Ngày mai',
    yesterday: 'Hôm qua',
    inDays: 'Còn {days} ngày',
    overdueDays: 'Quá hạn {days} ngày',
    /**
     * Khoảng cách về quá khứ KHÔNG mang nghĩa trễ hẹn.
     *
     * "Quá hạn 40 ngày" đúng cho một khoản phải trả, nhưng SAI cho một sổ tiết
     * kiệm chưa cập nhật giá trị: người dùng không hứa sẽ cập nhật, nên họ
     * không lỡ hẹn gì cả. Dùng nhãn trung tính này ở mọi chỗ nói về độ mới của
     * số liệu (04 §7 — không phán xét).
     */
    daysAgo: '{days} ngày trước',
  },

  weekday: {
    0: 'Chủ nhật',
    1: 'Thứ Hai',
    2: 'Thứ Ba',
    3: 'Thứ Tư',
    4: 'Thứ Năm',
    5: 'Thứ Sáu',
    6: 'Thứ Bảy',
    short0: 'CN',
    short1: 'T2',
    short2: 'T3',
    short3: 'T4',
    short4: 'T5',
    short5: 'T6',
    short6: 'T7',
  },

  quickAdd: {
    title: 'Thêm vào nhà mình',
    task: 'Việc',
    event: 'Sự kiện',
    payment: 'Khoản sắp trả',
    asset: 'Khoản tiền',
    doc: 'Giấy tờ',
    /** Nhập nhanh bằng AI (06 §6). "Từ ảnh" chứ không "AI": người dùng quan tâm
        họ đưa vào cái gì, không quan tâm app dùng kỹ thuật nào. */
    capture: 'Từ ảnh',
  },

  // 04 §8 — nói rõ chuyện gì và cách sửa. Không xin lỗi, không mơ hồ.
  error: {
    // Mất mạng khi ghi KHÔNG PHẢI LỖI — thao tác nằm trong hàng đợi và sẽ chạy.
    offlineWrite: 'Chưa gửi được. Sẽ tự lưu khi có mạng.',
    offlineQueued: 'Đang chờ mạng để lưu {count} thay đổi',
    quota: 'Đã dùng {used} trên {total}. Nâng cấp để thêm dung lượng, hoặc xoá bớt file.',
    notFound: 'Mục này đã bị xoá.',
    premium: 'Lưu file cần bản Pro. Bạn vẫn ghi được thông tin và vị trí bản giấy.',
    auth: 'Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.',
    conflict: 'Có người vừa sửa mục này. Tải lại để xem bản mới nhất.',
    unknown: 'Chưa làm được. Thử lại giúp mình nhé.',
    // Không nói rõ email hay mật khẩu sai.
    invalidCredentials: 'Email hoặc mật khẩu chưa đúng.',
    emailInvalid: 'Email chưa đúng định dạng.',
    passwordTooShort: 'Mật khẩu cần ít nhất 8 ký tự.',
    passwordMismatch: 'Mật khẩu nhập lại chưa khớp.',
    // Màn Đăng ký nói RÕ là email đã có — khác màn Đăng nhập. Ở đây người dùng
    // đang tự khai một email của chính mình, nên không lộ thêm gì; im lặng thì
    // họ không biết phải sang màn Đăng nhập.
    emailTaken: 'Email này đã có tài khoản. Đăng nhập để tiếp tục.',
    inviteInvalid: 'Mã mời không đúng hoặc đã hết hạn.',
    required: 'Chưa nhập {field}',
  },

  validation: {
    taskTitle: 'Nhập tên việc',
    eventTitle: 'Nhập tên sự kiện',
    assetName: 'Nhập tên khoản',
    paymentName: 'Nhập tên khoản',
    debtName: 'Nhập tên khoản nợ',
    goalName: 'Nhập tên mục tiêu',
    fundName: 'Nhập tên quỹ',
    /** Rút mà không ghi để làm gì thì tháng sau không ai nhớ. Nạp thì không bắt. */
    fundPurpose: 'Ghi rõ rút để làm gì',
    docTitle: 'Nhập tên giấy tờ',
    displayName: 'Nhập tên hiển thị',
    eventDate: 'Chọn ngày cho sự kiện',
    amountPositive: 'Số tiền phải lớn hơn 0',
    inviteCodeLength: 'Mã mời có 6 ký tự',
    /** Không có dịp mặc định — cưới chỉ là một trong tám dịp (07 §3). */
    giftOccasion: 'Chọn dịp',
  },

  a11y: {
    previousMonth: 'Tháng trước',
    nextMonth: 'Tháng sau',
    checkboxTodo: 'Đánh dấu xong',
    checkboxDone: 'Bỏ đánh dấu xong',
    addButton: 'Thêm vào nhà mình',
    back: 'Quay lại',
    close: 'Đóng',
    settings: 'Cài đặt',
    avatar: 'Ảnh đại diện {name}',
    moreOptions: 'Thêm lựa chọn',
  },
} as const;

export type Dictionary = typeof vi;
