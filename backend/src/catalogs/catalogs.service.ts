import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { DatabaseService } from '../database/database.service';
import {
  CreateBudgetDto,
  CreatePlanDto,
  CreateRegionalDto,
  CreateServiceDto,
  CreateStatusDto,
  CreateZoneDto,
  UpdateBudgetDto,
  UpdatePlanDto,
  UpdateRegionalDto,
  UpdateServiceDto,
  UpdateStatusDto,
  UpdateZoneDto
} from './dto/catalog.dto';

@Injectable()
export class CatalogsService {
  constructor(private readonly db: DatabaseService) {}

  /* ═══════════════════════════════════════════════════════════════════════════
     REGIONALS
  ═══════════════════════════════════════════════════════════════════════════ */
  async listRegionals(actor: RequestUser) {
    const res = await this.db.query(
      `SELECT id, code, name, created_at, updated_at
       FROM regionals
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [actor.tenantId]
    );
    return res.rows;
  }

  async createRegional(actor: RequestUser, dto: CreateRegionalDto) {
    const res = await this.db.query<{ id: string }>(
      `INSERT INTO regionals (tenant_id, code, name)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, created_at`,
      [actor.tenantId, dto.code.toUpperCase(), dto.name]
    );
    return res.rows[0];
  }

  async updateRegional(actor: RequestUser, id: string, dto: UpdateRegionalDto) {
    const existing = await this.db.query(
      `SELECT id FROM regionals WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, actor.tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundException('Regional no encontrada');

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (dto.code !== undefined) { sets.push(`code = $${i++}`); vals.push(dto.code.toUpperCase()); }
    if (dto.name !== undefined) { sets.push(`name = $${i++}`); vals.push(dto.name); }
    if (!sets.length) throw new BadRequestException('Nada que actualizar');
    sets.push(`updated_at = NOW()`);
    vals.push(id, actor.tenantId);

    const res = await this.db.query(
      `UPDATE regionals SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING id, code, name`,
      vals
    );
    return res.rows[0];
  }

  async deleteRegional(actor: RequestUser, id: string) {
    const res = await this.db.query(
      `UPDATE regionals SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, actor.tenantId]
    );
    if (!res.rows[0]) throw new NotFoundException('Regional no encontrada');
    return { message: 'Regional eliminada' };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ZONES
  ═══════════════════════════════════════════════════════════════════════════ */
  async listZones(actor: RequestUser) {
    const res = await this.db.query(
      `SELECT z.id, z.code, z.name, z.regional_id, r.name AS regional_name, z.created_at, z.updated_at
       FROM zones z
       JOIN regionals r ON r.id = z.regional_id
       WHERE z.tenant_id = $1 AND z.deleted_at IS NULL
       ORDER BY r.name, z.name ASC`,
      [actor.tenantId]
    );
    return res.rows;
  }

  async createZone(actor: RequestUser, dto: CreateZoneDto) {
    const regional = await this.db.query(
      `SELECT id FROM regionals WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [dto.regional_id, actor.tenantId]
    );
    if (!regional.rows[0]) throw new BadRequestException('Regional no válida');

    const res = await this.db.query<{ id: string }>(
      `INSERT INTO zones (tenant_id, regional_id, code, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, code, name, regional_id, created_at`,
      [actor.tenantId, dto.regional_id, dto.code.toUpperCase(), dto.name]
    );
    return res.rows[0];
  }

  async updateZone(actor: RequestUser, id: string, dto: UpdateZoneDto) {
    const existing = await this.db.query(
      `SELECT id FROM zones WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, actor.tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundException('Zona no encontrada');

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (dto.regional_id !== undefined) { sets.push(`regional_id = $${i++}`); vals.push(dto.regional_id); }
    if (dto.code !== undefined) { sets.push(`code = $${i++}`); vals.push(dto.code.toUpperCase()); }
    if (dto.name !== undefined) { sets.push(`name = $${i++}`); vals.push(dto.name); }
    if (!sets.length) throw new BadRequestException('Nada que actualizar');
    sets.push(`updated_at = NOW()`);
    vals.push(id, actor.tenantId);

    const res = await this.db.query(
      `UPDATE zones SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING id, code, name`,
      vals
    );
    return res.rows[0];
  }

  async deleteZone(actor: RequestUser, id: string) {
    const res = await this.db.query(
      `UPDATE zones SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, actor.tenantId]
    );
    if (!res.rows[0]) throw new NotFoundException('Zona no encontrada');
    return { message: 'Zona eliminada' };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     PLANS
  ═══════════════════════════════════════════════════════════════════════════ */
  async listPlans(actor: RequestUser) {
    const res = await this.db.query(
      `SELECT id, code, name, base_price, is_active, created_at, updated_at
       FROM plans
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [actor.tenantId]
    );
    return res.rows;
  }

  async createPlan(actor: RequestUser, dto: CreatePlanDto) {
    const res = await this.db.query<{ id: string }>(
      `INSERT INTO plans (tenant_id, code, name, base_price, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, name, base_price, is_active, created_at`,
      [actor.tenantId, dto.code.toUpperCase(), dto.name, dto.base_price, dto.is_active ?? true]
    );
    return res.rows[0];
  }

  async updatePlan(actor: RequestUser, id: string, dto: UpdatePlanDto) {
    const existing = await this.db.query(
      `SELECT id FROM plans WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, actor.tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundException('Plan no encontrado');

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (dto.code !== undefined) { sets.push(`code = $${i++}`); vals.push(dto.code.toUpperCase()); }
    if (dto.name !== undefined) { sets.push(`name = $${i++}`); vals.push(dto.name); }
    if (dto.base_price !== undefined) { sets.push(`base_price = $${i++}`); vals.push(dto.base_price); }
    if (dto.is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(dto.is_active); }
    if (!sets.length) throw new BadRequestException('Nada que actualizar');
    sets.push(`updated_at = NOW()`);
    vals.push(id, actor.tenantId);

    const res = await this.db.query(
      `UPDATE plans SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING id, code, name, base_price, is_active`,
      vals
    );
    return res.rows[0];
  }

  async deletePlan(actor: RequestUser, id: string) {
    const res = await this.db.query(
      `UPDATE plans SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, actor.tenantId]
    );
    if (!res.rows[0]) throw new NotFoundException('Plan no encontrado');
    return { message: 'Plan eliminado' };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SERVICES
  ═══════════════════════════════════════════════════════════════════════════ */
  async listServices(actor: RequestUser) {
    const res = await this.db.query(
      `SELECT id, code, name, price, is_active, created_at, updated_at
       FROM services
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [actor.tenantId]
    );
    return res.rows;
  }

  async createService(actor: RequestUser, dto: CreateServiceDto) {
    const res = await this.db.query<{ id: string }>(
      `INSERT INTO services (tenant_id, code, name, price, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, name, price, is_active, created_at`,
      [actor.tenantId, dto.code.toUpperCase(), dto.name, dto.price, dto.is_active ?? true]
    );
    return res.rows[0];
  }

  async updateService(actor: RequestUser, id: string, dto: UpdateServiceDto) {
    const existing = await this.db.query(
      `SELECT id FROM services WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, actor.tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundException('Servicio no encontrado');

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (dto.code !== undefined) { sets.push(`code = $${i++}`); vals.push(dto.code.toUpperCase()); }
    if (dto.name !== undefined) { sets.push(`name = $${i++}`); vals.push(dto.name); }
    if (dto.price !== undefined) { sets.push(`price = $${i++}`); vals.push(dto.price); }
    if (dto.is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(dto.is_active); }
    if (!sets.length) throw new BadRequestException('Nada que actualizar');
    sets.push(`updated_at = NOW()`);
    vals.push(id, actor.tenantId);

    const res = await this.db.query(
      `UPDATE services SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING id, code, name, price, is_active`,
      vals
    );
    return res.rows[0];
  }

  async deleteService(actor: RequestUser, id: string) {
    const res = await this.db.query(
      `UPDATE services SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, actor.tenantId]
    );
    if (!res.rows[0]) throw new NotFoundException('Servicio no encontrado');
    return { message: 'Servicio eliminado' };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STATUS_CATALOG
  ═══════════════════════════════════════════════════════════════════════════ */
  async listStatuses(actor: RequestUser) {
    const res = await this.db.query(
      `SELECT id, code, name, is_final, is_approved, is_active, created_at, updated_at
       FROM status_catalog
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY name ASC`,
      [actor.tenantId]
    );
    return res.rows;
  }

  async createStatus(actor: RequestUser, dto: CreateStatusDto) {
    const res = await this.db.query<{ id: string }>(
      `INSERT INTO status_catalog (tenant_id, code, name, is_final, is_approved, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, name, is_final, is_approved, is_active, created_at`,
      [
        actor.tenantId,
        dto.code.toUpperCase(),
        dto.name,
        dto.is_final ?? false,
        dto.is_approved ?? false,
        dto.is_active ?? true
      ]
    );
    return res.rows[0];
  }

  async updateStatus(actor: RequestUser, id: string, dto: UpdateStatusDto) {
    const existing = await this.db.query(
      `SELECT id FROM status_catalog WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, actor.tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundException('Estado no encontrado');

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (dto.code !== undefined) { sets.push(`code = $${i++}`); vals.push(dto.code.toUpperCase()); }
    if (dto.name !== undefined) { sets.push(`name = $${i++}`); vals.push(dto.name); }
    if (dto.is_final !== undefined) { sets.push(`is_final = $${i++}`); vals.push(dto.is_final); }
    if (dto.is_approved !== undefined) { sets.push(`is_approved = $${i++}`); vals.push(dto.is_approved); }
    if (dto.is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(dto.is_active); }
    if (!sets.length) throw new BadRequestException('Nada que actualizar');
    sets.push(`updated_at = NOW()`);
    vals.push(id, actor.tenantId);

    const res = await this.db.query(
      `UPDATE status_catalog SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING id, code, name, is_final, is_approved, is_active`,
      vals
    );
    return res.rows[0];
  }

  async deleteStatus(actor: RequestUser, id: string) {
    const res = await this.db.query(
      `UPDATE status_catalog SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, actor.tenantId]
    );
    if (!res.rows[0]) throw new NotFoundException('Estado no encontrado');
    return { message: 'Estado eliminado' };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BUDGETS
  ═══════════════════════════════════════════════════════════════════════════ */
  async listBudgets(actor: RequestUser) {
    const res = await this.db.query(
      `SELECT b.id, b.month_date, b.scope_type, b.scope_id,
              b.target_amount, b.target_count, b.target_120_amount, b.approved_target_amount,
              b.created_at, b.updated_at,
              COALESCE(r.name, z.name, u.first_name || ' ' || u.last_name) AS scope_label
       FROM budgets b
       LEFT JOIN regionals r ON r.id = b.scope_id AND b.scope_type = 'REGIONAL'
       LEFT JOIN zones z ON z.id = b.scope_id AND b.scope_type = 'ZONE'
       LEFT JOIN users u ON u.id = b.scope_id AND b.scope_type = 'ADVISOR'
       WHERE b.tenant_id = $1 AND b.deleted_at IS NULL
       ORDER BY b.month_date DESC, b.scope_type, scope_label ASC`,
      [actor.tenantId]
    );
    return res.rows;
  }

  async createBudget(actor: RequestUser, dto: CreateBudgetDto) {
    const monthDate = dto.month_date.substring(0, 7) + '-01';
    const res = await this.db.query<{ id: string }>(
      `INSERT INTO budgets
         (tenant_id, month_date, scope_type, scope_id, target_amount, target_count,
          target_120_amount, approved_target_amount, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, month_date, scope_type, scope_id, target_amount, target_count,
                 target_120_amount, approved_target_amount`,
      [
        actor.tenantId,
        monthDate,
        dto.scope_type,
        dto.scope_id ?? null,
        dto.target_amount,
        dto.target_count ?? 0,
        dto.target_120_amount ?? 0,
        dto.approved_target_amount ?? 0,
        actor.userId
      ]
    );
    return res.rows[0];
  }

  async updateBudget(actor: RequestUser, id: string, dto: UpdateBudgetDto) {
    const existing = await this.db.query(
      `SELECT id FROM budgets WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, actor.tenantId]
    );
    if (!existing.rows[0]) throw new NotFoundException('Presupuesto no encontrado');

    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (dto.target_amount !== undefined) { sets.push(`target_amount = $${i++}`); vals.push(dto.target_amount); }
    if (dto.target_count !== undefined) { sets.push(`target_count = $${i++}`); vals.push(dto.target_count); }
    if (dto.target_120_amount !== undefined) { sets.push(`target_120_amount = $${i++}`); vals.push(dto.target_120_amount); }
    if (dto.approved_target_amount !== undefined) { sets.push(`approved_target_amount = $${i++}`); vals.push(dto.approved_target_amount); }
    if (!sets.length) throw new BadRequestException('Nada que actualizar');
    sets.push(`updated_at = NOW()`);
    vals.push(id, actor.tenantId);

    const res = await this.db.query(
      `UPDATE budgets SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i}
       RETURNING id, month_date, scope_type, target_amount, target_count, target_120_amount, approved_target_amount`,
      vals
    );
    return res.rows[0];
  }

  async deleteBudget(actor: RequestUser, id: string) {
    const res = await this.db.query(
      `UPDATE budgets SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, actor.tenantId]
    );
    if (!res.rows[0]) throw new NotFoundException('Presupuesto no encontrado');
    return { message: 'Presupuesto eliminado' };
  }
}
