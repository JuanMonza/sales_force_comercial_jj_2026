import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly aiService: AiService
  ) {}

  async runNightlyBatch(trigger: 'CRON' | 'MANUAL' = 'CRON') {
    const startedAt = Date.now();
    await this.db.query('SELECT nightly_refresh_job()');
    const aiSnapshot = await this.aiService.persistNightlySnapshots();
    const elapsedMs = Date.now() - startedAt;

    const response = {
      trigger,
      elapsedMs,
      refreshedViews: true,
      aiSnapshot
    };

    this.logger.log(
      `Nightly batch done. trigger=${trigger} elapsedMs=${elapsedMs} snapshots=${aiSnapshot.persistedCount}`
    );
    return response;
  }

  @Cron('0 2 * * *')
  async handleNightlyJob() {
    await this.runNightlyBatch('CRON');
  }
}
