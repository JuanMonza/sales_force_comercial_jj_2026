import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/types/role.enum';

type CreatedUserRow = { id: string };
type UserViewRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  document_id: string | null;
  is_active: boolean;
  role: Role;
  regional_id: string | null;
  coordinator_zone_id: string | null;
  coordinator_zone_name: string | null;
  advisor_zone_id: string | null;
  advisor_zone_name: string | null;
  category: string | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async create(actor: RequestUser, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const roleResult = await this.db.query<{ id: number }>(
      'SELECT id FROM roles WHERE role_key = $1 LIMIT 1',
      [dto.role]
    );

    const roleId = roleResult.rows[0]?.id;
    if (!roleId) {
      throw new BadRequestException('Rol invalido');
    }

    const createdUser = await this.db.query<CreatedUserRow>(
      `
        INSERT INTO users (
          tenant_id, role_id, email, password_hash, first_name, last_name, document_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING id
      `,
      [actor.tenantId, roleId, dto.email, passwordHash, dto.firstName, dto.lastName, dto.documentId ?? null]
    );

    const userId = createdUser.rows[0].id;

    if (dto.role === Role.DIRECTOR) {
      if (!dto.regionalId) {
        throw new BadRequestException('regionalId es requerido para director');
      }
      await this.db.query(
        'INSERT INTO director_profiles (user_id, regional_id) VALUES ($1, $2)',
        [userId, dto.regionalId]
      );
    }

    if (dto.role === Role.COORDINADOR) {
      if (!dto.zoneId) {
        throw new BadRequestException('zoneId es requerido para coordinador');
      }
      await this.db.query(
        'INSERT INTO coordinator_profiles (user_id, zone_id) VALUES ($1, $2)',
        [userId, dto.zoneId]
      );
    }

    if (dto.role === Role.ASESOR) {
      let advisorZoneId = dto.zoneId;

      if (dto.coordinatorId) {
        const coordinatorScope = await this.db.query<{ zone_id: string }>(
          `
            SELECT cp.zone_id
            FROM coordinator_profiles cp
            JOIN users u ON u.id = cp.user_id
            JOIN roles r ON r.id = u.role_id
            WHERE u.tenant_id = $1
              AND u.id = $2
              AND r.role_key = 'COORDINADOR'
              AND u.deleted_at IS NULL
            LIMIT 1
          `,
          [actor.tenantId, dto.coordinatorId]
        );

        advisorZoneId = coordinatorScope.rows[0]?.zone_id;
        if (!advisorZoneId) {
          throw new BadRequestException('coordinatorId invalido para este tenant');
        }
      }

      if (!advisorZoneId) {
        throw new BadRequestException('zoneId o coordinatorId es requerido para asesor');
      }

      await this.db.query(
        'INSERT INTO advisor_profiles (user_id, zone_id, category) VALUES ($1, $2, $3)',
        [userId, advisorZoneId, dto.category ?? 'GENERAL']
      );
    }

    return this.findOne(actor, userId);
  }

  async findAll(actor: RequestUser) {
    const { rows } = await this.db.query<UserViewRow>(
      `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.document_id,
        u.is_active,
        r.role_key AS role,
        dp.regional_id,
        cp.zone_id AS coordinator_zone_id,
        cz.name AS coordinator_zone_name,
        ap.zone_id AS advisor_zone_id,
        az.name AS advisor_zone_name,
        ap.category
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN director_profiles dp ON dp.user_id = u.id
      LEFT JOIN coordinator_profiles cp ON cp.user_id = u.id
      LEFT JOIN zones cz ON cz.id = cp.zone_id
      LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
      LEFT JOIN zones az ON az.id = ap.zone_id
      WHERE u.tenant_id = $1
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `,
      [actor.tenantId]
    );

    return rows;
  }

  async findOne(actor: RequestUser, id: string): Promise<UserViewRow> {
    const { rows } = await this.db.query<UserViewRow>(
      `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.document_id,
        u.is_active,
        r.role_key AS role,
        dp.regional_id,
        cp.zone_id AS coordinator_zone_id,
        cz.name AS coordinator_zone_name,
        ap.zone_id AS advisor_zone_id,
        az.name AS advisor_zone_name,
        ap.category
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN director_profiles dp ON dp.user_id = u.id
      LEFT JOIN coordinator_profiles cp ON cp.user_id = u.id
      LEFT JOIN zones cz ON cz.id = cp.zone_id
      LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
      LEFT JOIN zones az ON az.id = ap.zone_id
      WHERE u.tenant_id = $1
        AND u.id = $2
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
      [actor.tenantId, id]
    );

    const user = rows[0];
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(actor: RequestUser, id: string, dto: UpdateUserDto) {
    const previous = await this.findOne(actor, id);

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.db.query(
      `
      UPDATE users
      SET
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        document_id = COALESCE($5, document_id),
        password_hash = COALESCE($6, password_hash),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
    `,
      [
        actor.tenantId,
        id,
        dto.firstName ?? null,
        dto.lastName ?? null,
        dto.documentId ?? null,
        passwordHash ?? null,
        typeof dto.isActive === 'boolean' ? dto.isActive : null
      ]
    );

    const updated = await this.findOne(actor, id);

    const versionQuery = await this.db.query<{ next_version: number }>(
      `
        SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
        FROM record_versions
        WHERE tenant_id = $1
          AND entity_name = 'users'
          AND record_id = $2
      `,
      [actor.tenantId, id]
    );

    const versionNo = versionQuery.rows[0]?.next_version ?? 1;
    await this.db.query(
      `
        INSERT INTO record_versions (
          tenant_id, entity_name, record_id, version_no, changed_by, change_reason, old_data, new_data
        ) VALUES ($1, 'users', $2, $3, $4, $5, $6::jsonb, $7::jsonb)
      `,
      [
        actor.tenantId,
        id,
        versionNo,
        actor.userId,
        'Actualizacion segura de usuario',
        JSON.stringify(previous),
        JSON.stringify(updated)
      ]
    );

    return updated;
  }

  async softDelete(actor: RequestUser, id: string) {
    const found = await this.findOne(actor, id);
    await this.db.query(
      `
      UPDATE users
      SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
    `,
      [actor.tenantId, id]
    );
    return { deleted: true, userId: found.id };
  }
}
