import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('task-queue') private taskQueue: Queue) {}

  async addTask(task: any) {
    await this.taskQueue.add(task);
  }
}
