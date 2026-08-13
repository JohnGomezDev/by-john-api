import type { Admin } from '../entities/admin.entity';

export const ADMIN_REPOSITORY = 'ADMIN_REPOSITORY';

export interface IAdminRepository {
  findByUsername(username: string): Promise<Admin | null>;
  findById(id: string): Promise<Admin | null>;
}
