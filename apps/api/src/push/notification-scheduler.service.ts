import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { PushService } from './push.service';

/**
 * Task due dates are date-only (no time-of-day — see TaskForm's `type="date"`
 * input), so "about to be due" can't mean a precise countdown. Instead this
 * runs once a day and tells each assignee what's due *today*, plus a digest
 * of their open leads/deals — the two things asked for.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  @Cron('0 8 * * *')
  async runDaily() {
    if (!this.push.enabled) return;
    await this.sendDueTodayReminders();
    await this.sendDailyDigests();
  }

  private async sendDueTodayReminders() {
    const { start, end } = todayRange();

    const dueToday = await this.prisma.task.findMany({
      where: {
        dueDate: { gte: start, lt: end },
        status: { not: 'completed' },
        assignedToId: { not: null },
        dueReminderSentAt: null,
      },
      select: { id: true, title: true, assignedToId: true },
    });

    const byAssignee = new Map<string, typeof dueToday>();
    for (const task of dueToday) {
      const list = byAssignee.get(task.assignedToId!) ?? [];
      list.push(task);
      byAssignee.set(task.assignedToId!, list);
    }

    for (const [userId, tasks] of byAssignee) {
      const body =
        tasks.length === 1
          ? tasks[0].title
          : `${tasks[0].title} and ${tasks.length - 1} more`;

      await this.push.sendToUser(userId, {
        title: tasks.length === 1 ? 'Task due today' : `${tasks.length} tasks due today`,
        body,
        data: { type: 'tasks_due_today' },
      });
    }

    if (dueToday.length > 0) {
      await this.prisma.task.updateMany({
        where: { id: { in: dueToday.map((t) => t.id) } },
        data: { dueReminderSentAt: new Date() },
      });
    }

    this.logger.log(`Due-today reminders: ${dueToday.length} task(s) across ${byAssignee.size} user(s).`);
  }

  private async sendDailyDigests() {
    const { start: digestNotSentSince } = todayRange();

    const users = await this.prisma.user.findMany({
      where: {
        status: 'active',
        pushTokens: { some: {} },
        OR: [{ lastDigestSentAt: null }, { lastDigestSentAt: { lt: digestNotSentSince } }],
      },
      select: { id: true, tenantId: true },
    });

    const { start, end } = todayRange();
    let sent = 0;

    for (const user of users) {
      const [openLeads, openDeals, tasksDueToday, tasksOverdue] = await Promise.all([
        this.prisma.lead.count({
          where: { tenantId: user.tenantId, ownerId: user.id, status: { notIn: ['converted', 'lost'] } },
        }),
        this.prisma.deal.count({
          where: { tenantId: user.tenantId, ownerId: user.id, status: 'open' },
        }),
        this.prisma.task.count({
          where: { tenantId: user.tenantId, assignedToId: user.id, status: { not: 'completed' }, dueDate: { gte: start, lt: end } },
        }),
        this.prisma.task.count({
          where: { tenantId: user.tenantId, assignedToId: user.id, status: { not: 'completed' }, dueDate: { lt: start } },
        }),
      ]);

      if (openLeads + openDeals + tasksDueToday + tasksOverdue === 0) {
        await this.prisma.user.update({ where: { id: user.id }, data: { lastDigestSentAt: new Date() } });
        continue;
      }

      const parts: string[] = [];
      if (tasksDueToday > 0) parts.push(`${tasksDueToday} task${tasksDueToday === 1 ? '' : 's'} due today`);
      if (tasksOverdue > 0) parts.push(`${tasksOverdue} overdue`);
      if (openLeads > 0) parts.push(`${openLeads} open lead${openLeads === 1 ? '' : 's'}`);
      if (openDeals > 0) parts.push(`${openDeals} open deal${openDeals === 1 ? '' : 's'}`);

      await this.push.sendToUser(user.id, {
        title: 'Your day at a glance',
        body: parts.join(' · '),
        data: { type: 'daily_digest' },
      });
      await this.prisma.user.update({ where: { id: user.id }, data: { lastDigestSentAt: new Date() } });
      sent++;
    }

    this.logger.log(`Daily digest: sent to ${sent}/${users.length} eligible user(s).`);
  }
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
