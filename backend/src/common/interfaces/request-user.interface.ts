import { Role } from '../types/role.enum';

export interface RequestUser {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
  regionalId?: string | null;
  zoneId?: string | null;
}

