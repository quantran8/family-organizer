/**
 * Query key — 01 §3.
 *
 * MỌI key bắt đầu bằng `['hh', householdId, …]`. Đó không phải quy ước cho đẹp:
 * nó là thứ khiến `queryClient.removeQueries({ queryKey: ['hh', id] })` xoá
 * sạch được dữ liệu của một nhà khi đăng xuất hoặc đổi nhà. Nếu key phẳng theo
 * loại (`['assets', …]`) thì cache của nhà cũ sẽ rò sang nhà mới, và người dùng
 * thấy tiền của gia đình khác trong một khoảnh khắc trước khi refetch xong.
 *
 * Key được xây theo tầng, tầng trên là tiền tố của tầng dưới, nên
 * `invalidateQueries({ queryKey: keys.assets.all(hh) })` quét luôn cả `detail`.
 * Đây là lý do dùng hàm trả mảng thay vì hằng chuỗi ghép tay.
 */

import type { ISODate, MoneyEntityType, UUID } from '@family-organizer/domain';

import type { DocumentFilter } from '@/features/document/repository';
import type { PaymentWindow } from '@/features/payment/repository';

/** Gốc của một household — dùng để xoá sạch khi đăng xuất / đổi nhà. */
const hh = (id: UUID) => ['hh', id] as const;

export const queryKeys = {
  household: {
    all: (id: UUID) => [...hh(id), 'household'] as const,
    detail: (id: UUID) => [...hh(id), 'household', 'detail'] as const,
    /** View `home_feed` — MỘT lần fetch cho toàn bộ dashboard (05 §4). */
    homeFeed: (id: UUID, from: ISODate, to: ISODate) =>
      [...hh(id), 'household', 'home-feed', from, to] as const,
    /** View `finance_metrics` — nguyên liệu thô, trạng thái tính ở client. */
    financeMetrics: (id: UUID) => [...hh(id), 'household', 'finance-metrics'] as const,
  },

  members: {
    all: (id: UUID) => [...hh(id), 'members'] as const,
    list: (id: UUID) => [...hh(id), 'members', 'list'] as const,
    me: (id: UUID) => [...hh(id), 'members', 'me'] as const,
  },

  invite: {
    all: (id: UUID) => [...hh(id), 'invite'] as const,
    currentCode: (id: UUID) => [...hh(id), 'invite', 'code'] as const,
  },

  tasks: {
    all: (id: UUID) => [...hh(id), 'tasks'] as const,
    list: (id: UUID) => [...hh(id), 'tasks', 'list'] as const,
    detail: (id: UUID, taskId: UUID) => [...hh(id), 'tasks', 'detail', taskId] as const,
    instances: (id: UUID, from: ISODate, to: ISODate) =>
      [...hh(id), 'tasks', 'instances', from, to] as const,
    recentDone: (id: UUID, taskId: UUID) =>
      [...hh(id), 'tasks', 'recent-done', taskId] as const,
    byEvent: (id: UUID, eventId: UUID) => [...hh(id), 'tasks', 'by-event', eventId] as const,
  },

  events: {
    all: (id: UUID) => [...hh(id), 'events'] as const,
    list: (id: UUID) => [...hh(id), 'events', 'list'] as const,
    detail: (id: UUID, eventId: UUID) => [...hh(id), 'events', 'detail', eventId] as const,
  },

  assets: {
    all: (id: UUID) => [...hh(id), 'assets'] as const,
    list: (id: UUID) => [...hh(id), 'assets', 'list'] as const,
    detail: (id: UUID, assetId: UUID) => [...hh(id), 'assets', 'detail', assetId] as const,
  },

  payments: {
    all: (id: UUID) => [...hh(id), 'payments'] as const,
    list: (id: UUID, window: PaymentWindow) => [...hh(id), 'payments', 'list', window] as const,
    detail: (id: UUID, paymentId: UUID) => [...hh(id), 'payments', 'detail', paymentId] as const,
    byEvent: (id: UUID, eventId: UUID) => [...hh(id), 'payments', 'by-event', eventId] as const,
    byDebt: (id: UUID, debtId: UUID) => [...hh(id), 'payments', 'by-debt', debtId] as const,
  },

  debts: {
    all: (id: UUID) => [...hh(id), 'debts'] as const,
    list: (id: UUID) => [...hh(id), 'debts', 'list'] as const,
    detail: (id: UUID, debtId: UUID) => [...hh(id), 'debts', 'detail', debtId] as const,
  },

  goals: {
    all: (id: UUID) => [...hh(id), 'goals'] as const,
    list: (id: UUID) => [...hh(id), 'goals', 'list'] as const,
    detail: (id: UUID, goalId: UUID) => [...hh(id), 'goals', 'detail', goalId] as const,
  },

  snapshots: {
    all: (id: UUID) => [...hh(id), 'snapshots'] as const,
    latest: (id: UUID) => [...hh(id), 'snapshots', 'latest'] as const,
    history: (id: UUID) => [...hh(id), 'snapshots', 'history'] as const,
  },

  moneyEvents: {
    all: (id: UUID) => [...hh(id), 'money-events'] as const,
    /**
     * Timeline chung. `entityType` nằm trong key vì nó là bộ lọc của cùng một
     * danh sách — KHÔNG có bộ lọc theo người ở đây, và sẽ không bao giờ có
     * (ràng buộc #1: không tổng hợp tiền theo người).
     */
    timeline: (id: UUID, entityType?: MoneyEntityType) =>
      [...hh(id), 'money-events', 'timeline', entityType ?? 'all'] as const,
    forEntity: (id: UUID, entityType: MoneyEntityType, entityId: UUID) =>
      [...hh(id), 'money-events', 'entity', entityType, entityId] as const,
  },

  attention: {
    all: (id: UUID) => [...hh(id), 'attention'] as const,
    open: (id: UUID) => [...hh(id), 'attention', 'open'] as const,
    /**
     * Cùng dữ liệu nhưng KÈM tên khoản (G9) — key riêng vì hình dạng khác.
     *
     * Dùng chung key với `open` thì màn Tiền và màn Cần trao đổi đọc trúng
     * cache của nhau, và bên thiếu `entityName` render ra dòng trống.
     */
    openWithEntities: (id: UUID) => [...hh(id), 'attention', 'open-with-entities'] as const,
  },

  documents: {
    all: (id: UUID) => [...hh(id), 'documents'] as const,
    list: (id: UUID, filter: DocumentFilter) => [...hh(id), 'documents', 'list', filter] as const,
    detail: (id: UUID, docId: UUID) => [...hh(id), 'documents', 'detail', docId] as const,
    byEvent: (id: UUID, eventId: UUID) => [...hh(id), 'documents', 'by-event', eventId] as const,
    storageUsed: (id: UUID) => [...hh(id), 'documents', 'storage-used'] as const,
    /**
     * URL đã ký cho thumbnail / bản gốc.
     *
     * Đoạn `'signed-url'` KHÔNG phải để đọc cho vui — `client.ts` dùng đúng
     * chuỗi này để loại nhóm key khỏi cache đĩa. Chữ ký sống 15 phút, còn cache
     * đĩa sống 7 ngày: ghi xuống đĩa thì lần mở app sau khôi phục một loạt URL
     * đã chết, và màn hình hiện đúng số ô ảnh với đúng bố cục, chỉ mọi ảnh đều
     * vỡ — không có lỗi nào để nhìn thấy vì truy vấn đã "thành công".
     */
    fileUrls: (id: UUID, kind: 'thumb' | 'original', fileIds: readonly UUID[]) =>
      [...hh(id), 'documents', 'signed-url', kind, fileIds.join(',')] as const,
  },
} as const;

/** Nhóm key không bao giờ được ghi xuống đĩa — xem `documents.fileUrls`. */
export const EPHEMERAL_KEY_SEGMENT = 'signed-url';

/** Toàn bộ cache của một nhà — gọi khi đăng xuất hoặc đổi nhà. */
export const householdScope = hh;

/**
 * Mọi thứ ăn theo con số tiền.
 *
 * Sau `settle_payment` hay `update_asset_value`, thứ đổi không chỉ là khoản vừa
 * chạm: `finance_metrics` đổi → trạng thái trên Nhà mình đổi → dòng lịch sử mới
 * xuất hiện. Liệt kê ở MỘT chỗ, vì bỏ sót một key nào ở đây thì lỗi hiện ra
 * dưới dạng "số ở màn này khác số ở màn kia" — thứ phá niềm tin nhanh nhất
 * trong một app về tiền chung.
 */
export function financeAffectedKeys(id: UUID): readonly (readonly unknown[])[] {
  return [
    queryKeys.household.financeMetrics(id),
    queryKeys.household.all(id),
    queryKeys.assets.all(id),
    queryKeys.payments.all(id),
    queryKeys.debts.all(id),
    queryKeys.goals.all(id),
    queryKeys.snapshots.all(id),
    queryKeys.moneyEvents.all(id),
  ];
}
