/**
 * Hook đọc/ghi Giấy tờ.
 *
 * KHÔNG optimistic cho tạo/sửa và tuyệt đối không cho upload (01 §3): một file
 * hiện ra rồi biến mất vì lỗi mạng làm người dùng tưởng đã lưu xong và xoá bản
 * gốc trên máy.
 */

import { canUpload, type CanUploadResult, type ISODate, type UUID } from '@family-organizer/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateHomeFeed } from '@/data/queries/invalidate';
import { queryKeys } from '@/data/queries/keys';
import {
  documentRepository,
  type DocumentFilter,
  type DocumentInput,
} from '@/features/document/repository';
import { useHouseholdId } from '@/stores/session';
import { useHousehold } from '@/features/household/queries/use-household';

export function useDocuments(filter: DocumentFilter, today: ISODate) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.documents.list(hh, filter),
    queryFn: () => documentRepository.list(hh, filter, today),
  });
}

/**
 * Nhận `null` — cùng lý do với `useAsset` / `usePayment` / `useDebt` ở G7b.
 *
 * `document-form` dùng chung cho tạo mới lẫn sửa. Thiếu `enabled` thì mỗi lần
 * mở form tạo mới bắn một query với id rỗng, Postgres từ chối vì không phải
 * uuid hợp lệ, và màn hình hiện lỗi cho một thứ người dùng chưa hề làm.
 */
export function useDocument(id: UUID | null) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.documents.detail(hh, id ?? ('' as UUID)),
    queryFn: () => documentRepository.get(hh, id as UUID),
    enabled: id !== null,
  });
}

export function useDocumentsByEvent(eventId: UUID) {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.documents.byEvent(hh, eventId),
    queryFn: () => documentRepository.listByEvent(hh, eventId),
  });
}

export function useCreateDocument() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentInput) => documentRepository.create(hh, input),
    onSuccess: (doc) => {
      void qc.invalidateQueries({ queryKey: queryKeys.documents.all(hh) });
      // Giấy tờ có hạn sinh reminder → xuất hiện trên Nhà mình.
      if (doc.expiryDate) invalidateHomeFeed(qc, hh);
    },
  });
}

export function useUpdateDocument() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: UUID; patch: Partial<DocumentInput> }) =>
      documentRepository.update(hh, id, patch),
    onSuccess: (doc) => {
      qc.setQueryData(queryKeys.documents.detail(hh, doc.id), doc);
      void qc.invalidateQueries({ queryKey: queryKeys.documents.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}

export function useDeleteDocument() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => documentRepository.softDelete(hh, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.documents.all(hh) });
      invalidateHomeFeed(qc, hh);
    },
  });
}

export function useDeleteDocumentFile() {
  const hh = useHouseholdId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: UUID) => documentRepository.softDeleteFile(hh, fileId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.documents.all(hh) }),
  });
}

export function useStorageUsed() {
  const hh = useHouseholdId();
  return useQuery({
    queryKey: queryKeys.documents.storageUsed(hh),
    queryFn: () => documentRepository.storageUsedBytes(hh),
  });
}

/**
 * Kiểm quota TRƯỚC khi mở bộ chọn file.
 *
 * Đây là kiểm ở client để nói sớm và nói rõ ("Đã dùng 48MB trên 50MB"), KHÔNG
 * phải để bảo vệ: Edge `presign-upload` chạy lại đúng `canUpload` này ở phía
 * server và nó mới là chỗ quyết định. Cùng một hàm thuần ở hai runtime — đó là
 * lý do `packages/domain` không có dependency nào.
 */
export function useCanUpload(sizeBytes: number): CanUploadResult | null {
  const { data: household } = useHousehold();
  const { data: used } = useStorageUsed();
  if (!household) return null;
  // Đếm lại từ document_files nếu có; nếu chưa kịp, dùng cột do trigger duy trì.
  // Chênh lệch giữa hai nguồn chỉ xảy ra khi trigger lỡ nhịp, và lúc đó con số
  // đếm lại mới là con số đúng.
  return canUpload(
    used === undefined ? household : { ...household, storageUsedBytes: used },
    sizeBytes,
  );
}
