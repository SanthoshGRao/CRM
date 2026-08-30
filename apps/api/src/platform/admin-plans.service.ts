import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/admin-plan.dto';

@Injectable()
export class AdminPlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    try {
      return await this.prisma.plan.create({ data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A plan with that name already exists.');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    try {
      return await this.prisma.plan.update({ where: { id }, data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A plan with that name already exists.');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    if (plan._count.subscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete "${plan.name}" — ${plan._count.subscriptions} customer(s) are currently subscribed to it.`,
      );
    }
    await this.prisma.plan.delete({ where: { id } });
    return { id };
  }
}
