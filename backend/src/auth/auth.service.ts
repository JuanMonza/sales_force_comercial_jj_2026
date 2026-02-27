import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { Role } from '../common/types/role.enum';
import { LoginDto } from './dto/login.dto';

type LoginUserRow = {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  role_key: Role;
  director_regional_id: string | null;
  coordinator_zone_id: string | null;
  coordinator_regional_id: string | null;
  advisor_zone_id: string | null;
  advisor_regional_id: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private async isPasswordValid(password: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
      return bcrypt.compare(password, storedHash);
    }

    // Compatibilidad de entorno demo para seed inicial.
    return password === storedHash;
  }

  private buildScopeByRole(user: LoginUserRow): { regionalId: string | null; zoneId: string | null } {
    switch (user.role_key) {
      case Role.DIRECTOR:
        return { regionalId: user.director_regional_id, zoneId: null };
      case Role.COORDINADOR:
        return { regionalId: user.coordinator_regional_id, zoneId: user.coordinator_zone_id };
      case Role.ASESOR:
        return { regionalId: user.advisor_regional_id, zoneId: user.advisor_zone_id };
      default:
        return { regionalId: null, zoneId: null };
    }
  }

  async login(dto: LoginDto, tenantIdFromHeader?: string) {
    const fallbackTenantId = this.configService.get<string>('DEFAULT_TENANT_ID');
    const tenantId = dto.tenantId || tenantIdFromHeader || fallbackTenantId;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant no definido');
    }

    const { rows } = await this.db.query<LoginUserRow>(
      `
        SELECT
          u.id,
          u.tenant_id,
          u.email,
          u.password_hash,
          u.is_active,
          r.role_key,
          dp.regional_id AS director_regional_id,
          cp.zone_id AS coordinator_zone_id,
          zc.regional_id AS coordinator_regional_id,
          ap.zone_id AS advisor_zone_id,
          za.regional_id AS advisor_regional_id
        FROM users u
        JOIN roles r ON r.id = u.role_id
        LEFT JOIN director_profiles dp ON dp.user_id = u.id
        LEFT JOIN coordinator_profiles cp ON cp.user_id = u.id
        LEFT JOIN zones zc ON zc.id = cp.zone_id
        LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
        LEFT JOIN zones za ON za.id = ap.zone_id
        WHERE u.tenant_id = $1
          AND lower(u.email) = lower($2)
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      [tenantId, dto.email]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordValid = await this.isPasswordValid(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const scope = this.buildScopeByRole(user);
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role_key,
      regionalId: scope.regionalId,
      zoneId: scope.zoneId
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        role: user.role_key,
        regionalId: scope.regionalId,
        zoneId: scope.zoneId
      }
    };
  }
}

