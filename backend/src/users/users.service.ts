import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/types/role.enum';

type CreatedUserRow = { id: string };

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
      if (!dto.zoneId) {
        throw new BadRequestException('zoneId es requerido para asesor');
      }
      await this.db.query(
        'INSERT INTO advisor_profiles (user_id, zone_id, category) VALUES ($1, $2, $3)',
        [userId, dto.zoneId, dto.category ?? 'GENERAL']
      );
    }

    return this.findOne(actor, userId);
  }

  async findAll(actor: RequestUser) {
    const { rows } = await this.db.query(
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
        ap.zone_id AS advisor_zone_id,
        ap.category
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN director_profiles dp ON dp.user_id = u.id
      LEFT JOIN coordinator_profiles cp ON cp.user_id = u.id
      LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
      WHERE u.tenant_id = $1
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `,
      [actor.tenantId]
    );

    return rows;
  }

  async findOne(actor: RequestUser, id: string) {
    const { rows } = await this.db.query(
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
        ap.zone_id AS advisor_zone_id,
        ap.category
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN director_profiles dp ON dp.user_id = u.id
      LEFT JOIN coordinator_profiles cp ON cp.user_id = u.id
      LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
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
    await this.findOne(actor, id);

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

    return this.findOne(actor, id);
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

