/**
 * Điểm vào của repository Household.
 *
 * Tầng trên import từ đây. Tên file theo FEATURE, không theo backend — đổi
 * Supabase sang API tự viết thì chỉ nội dung household-repository.ts đổi,
 * không phải đổi tên file hay sửa chỗ gọi.
 */

export type {
  HouseholdPatch,
  HouseholdRepository,
} from './household-repository.interface';
export { householdRepository } from './household-repository';
