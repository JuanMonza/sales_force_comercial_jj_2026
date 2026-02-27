import { Role } from './role.enum';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: Role;
  regionalId?: string | null;
  zoneId?: string | null;
}

