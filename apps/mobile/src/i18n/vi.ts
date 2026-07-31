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
 * formatLunarLabel ở @nhaminh/domain. Bảng này chỉ ghép nhãn quanh chúng.
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
  },

  tabs: {
    home: 'Nhà mình',
    plan: 'Việc & Sự kiện',
    money: 'Tiền',
    docs: 'Giấy tờ',
    addAria: 'Thêm vào nhà mình',
  },

  auth: {
    google: 'Tiếp tục với Google',
    apple: 'Tiếp tục với Apple',
    or: 'hoặc',
    email: 'Email',
    emailPlaceholder: 'ban@email.com',
    password: 'Mật khẩu',
    passwordPlaceholder: 'Ít nhất 8 ký tự',
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

  home: {
    greeting: 'Nhà mình có gì hôm nay?',
    sectionToday: 'Hôm nay',
    sectionWeekend: 'Cuối tuần',
    sectionThisWeek: 'Tuần này',
    sectionAttention: 'Cần chú ý',
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
    reasonStale: 'Số liệu cập nhật lần cuối {days} ngày trước.',
    reasonOk: 'Không có khoản nào cần chuẩn bị gấp.',
    lastUpdated: 'Cập nhật {label}',
    neverUpdated: 'Chưa cập nhật lần nào',
  },

  task: {
    title: 'Việc',
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
    fieldTitlePlaceholder: 'Đổ rác',
    fieldAssignee: 'Ai làm',
    fieldAssigneeNone: 'Chưa phân',
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
    formTitle: 'Sự kiện mới',
    formEditTitle: 'Sửa sự kiện',
    fieldTitle: 'Tên sự kiện',
    fieldTitlePlaceholder: 'Giỗ ông ngoại',
    fieldKind: 'Loại',
    fieldSide: 'Bên gia đình',
    fieldCalendar: 'Lịch',
    calendarSolar: 'Dương lịch',
    calendarLunar: 'Âm lịch',
    fieldLunarDay: 'Ngày âm',
    fieldLunarMonth: 'Tháng âm',
    fieldLeapMonth: 'Tháng nhuận',
    fieldLocation: 'Địa điểm',
    fieldEstimatedCost: 'Chi phí dự kiến',
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
    /**
     * Sự kiện âm lịch vừa tạo, Edge `refresh-lunar-dates` chưa chạy xong.
     * Nói thẳng thay vì để trống — chỗ trống ở đúng vị trí ngày trông như dữ
     * liệu hỏng, và người dùng vừa bấm Lưu sẽ tưởng thao tác thất bại.
     */
    pendingDate: 'Đang tính ngày',
    lunarBoth: '{lunar} âm — {weekday} {solar}',
    lastYear: 'Năm ngoái: {date}',
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
    other: 'Khác',
  },

  // Ánh xạ enum family_side của schema — KHÔNG phải husband_family/wife_family
  // như 02 §1 viết. Schema là bất biến.
  familySide: {
    paternal: 'Nhà nội',
    maternal: 'Nhà ngoại',
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
    updateSituation: 'Cập nhật tình hình',
    emptyTitle: 'Chưa có gì về tiền',
    emptyBody: 'Thêm một khoản sắp phải trả, hay ghi lại tiền nhà mình đang có.',

    snapshotTitle: 'Cập nhật tình hình',
    snapshotSave: 'Lưu cập nhật',
    snapshotSaved: 'Đã cập nhật',
    // KHÔNG BAO GIỜ viết "X đã thay đổi số tiền".
    snapshotPush: 'Tình hình tài chính gia đình vừa được cập nhật.',

    historyTitle: 'Nhà mình qua từng mốc',
    historyEmptyTitle: 'Chưa có mốc nào',
    historyEmptyBody: 'Lần cập nhật đầu tiên sẽ nằm ở đây.',
    historyAuto: 'Tự ghi',

    changesTitle: 'Nhà mình đã thay đổi gì',
    changesEmptyTitle: 'Chưa có thay đổi nào',
    changesEmptyBody: 'Khi giá trị một khoản đổi, nó sẽ được ghi lại ở đây.',
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
  },

  goal: {
    title: 'Mục tiêu',
    formTitle: 'Mục tiêu mới',
    fieldName: 'Tên mục tiêu',
    fieldNamePlaceholder: 'Mua nhà',
    fieldTarget: 'Cần đạt',
    fieldCurrent: 'Đã có',
    fieldTargetDate: 'Muốn xong trước',
    contribute: 'Góp thêm',
    have: 'Đã có {amount}',
    need: 'Cần thêm {amount}',
    emptyTitle: 'Chưa có mục tiêu nào',
    emptyBody: 'Đặt một mục tiêu chung để biết tiền để dành đang đi về đâu.',
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
    docTitle: 'Nhập tên giấy tờ',
    displayName: 'Nhập tên hiển thị',
    eventDate: 'Chọn ngày cho sự kiện',
    amountPositive: 'Số tiền phải lớn hơn 0',
    inviteCodeLength: 'Mã mời có 6 ký tự',
  },

  a11y: {
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
