import { Role } from './role.enum';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  regionalId?: string | null;
  zoneId?: string | null;
}

