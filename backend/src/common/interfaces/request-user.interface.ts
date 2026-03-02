import { Role } from '../types/role.enum';

export interface RequestUser {
  userId: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  regionalId?: string | null;
  zoneId?: string | null;
}

