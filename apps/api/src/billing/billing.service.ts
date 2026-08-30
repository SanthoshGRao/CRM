import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { computeEntitlement, daysLeftInTrial } from '../common/billing/entitlement.util';
import { getMaxUsers } from '../common/billing/plan-limits.util';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

const INTERVAL_MS: Record<string, number> = {
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private razorpay: Razorpay | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getRazorpay(): Razorpay {
    if (this.razorpay) return this.razorpay;

    const keyId = this.config.get<string>('app.billing.razorpay.keyId');
    const keySecret = this.config.get<string>('app.billing.razorpay.keySecret');
    if (!keyId || !keySecret) {
      throw new BadRequestException('Payments are not configured for this deployment yet.');
    }

    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return this.razorpay;
  }

  // ─── Read ────────────────────────────────────────────────────────────────

  async getSubscriptionSummary(tenantId: string) {
    const [subscription, seatsUsed] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    const entitlement = computeEntitlement(subscription);

    return {
      plan: subscription
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            description: subscription.plan.description,
            price: subscription.plan.price,
            currency: subscription.plan.currency,
            interval: subscription.plan.interval,
            features: subscription.plan.features,
            maxUsers: getMaxUsers(subscription.plan.features),
          }
        : null,
      status: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      isEntitled: entitlement.entitled,
      entitlementReason: entitlement.reason,
      daysLeft: daysLeftInTrial(subscription),
      seats: subscription?.seats ?? null,
      seatsUsed,
    };
  }

  async getPaymentHistory(tenantId: string) {
    return this.prisma.payment.findMany({
      where: { tenantId },
      include: { plan: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Paid plans a tenant can check out into — excludes Free, which needs no payment. */
  async listPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true, price: { gt: 0 } },
      orderBy: { price: 'asc' },
    });
  }

  // ─── Checkout ────────────────────────────────────────────────────────────

  /**
   * `planId` picks what to pay for (defaults to the tenant's current plan);
   * `seats` is how many seats to buy on it (defaults to the tenant's current
   * seat count, or 1 for a fresh subscription).
   */
  async createCheckoutOrder(tenantId: string, planId?: string, seats?: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    const plan = planId
      ? await this.prisma.plan.findFirst({ where: { id: planId, isActive: true } })
      : subscription?.plan;

    if (!plan) {
      throw new NotFoundException(
        planId ? 'Plan not found.' : 'This workspace has no plan assigned yet. Pick a plan to continue.',
      );
    }

    const resolvedSeats = seats ?? subscription?.seats ?? 1;
    if (!Number.isInteger(resolvedSeats) || resolvedSeats < 1) {
      throw new BadRequestException('Seats must be a whole number of 1 or more.');
    }

    const maxUsers = getMaxUsers(plan.features);
    if (maxUsers !== null && resolvedSeats > maxUsers) {
      throw new BadRequestException(`The ${plan.name} plan allows up to ${maxUsers} seats. Pick a higher tier for more.`);
    }

    const activeUsers = await this.prisma.user.count({ where: { tenantId } });
    if (resolvedSeats < activeUsers) {
      throw new BadRequestException(
        `This workspace already has ${activeUsers} active users — buy at least that many seats, or remove users first.`,
      );
    }

    const amountPaise = Math.round(Number(plan.price) * 100) * resolvedSeats;
    // Razorpay rejects orders below ₹1 outright — a free plan has nothing to
    // charge, so send a clear message instead of letting that 400 through.
    if (amountPaise < 100) {
      throw new BadRequestException('This plan does not require payment.');
    }

    const razorpay = this.getRazorpay();

    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountPaise,
        currency: plan.currency,
        receipt: `${tenantId}-${Date.now()}`,
        notes: { tenantId, planId: plan.id, seats: resolvedSeats },
      });
    } catch (err: any) {
      // The SDK throws Razorpay's raw error body, not an Error/HttpException —
      // left uncaught it becomes an opaque 500 instead of telling the tenant
      // what actually went wrong.
      const description = err?.error?.description || 'Could not start checkout with Razorpay.';
      this.logger.error(`Razorpay order creation failed for tenant ${tenantId}: ${description}`);
      throw new BadRequestException(description);
    }

    await this.prisma.payment.create({
      data: {
        tenantId,
        subscriptionId: subscription?.id,
        planId: plan.id,
        razorpayOrderId: order.id,
        amount: Number(plan.price) * resolvedSeats,
        seats: resolvedSeats,
        currency: plan.currency,
        status: 'created',
      },
    });

    return {
      orderId: order.id,
      amount: amountPaise,
      currency: plan.currency,
      razorpayKeyId: this.config.get<string>('app.billing.razorpay.keyId'),
      planName: plan.name,
      seats: resolvedSeats,
    };
  }

  async verifyPayment(tenantId: string, dto: VerifyPaymentDto) {
    const keySecret = this.config.get<string>('app.billing.razorpay.keySecret');
    if (!keySecret) {
      throw new BadRequestException('Payments are not configured for this deployment yet.');
    }

    const expected = createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    const valid =
      expected.length === dto.razorpay_signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(dto.razorpay_signature));

    if (!valid) {
      throw new BadRequestException('Payment signature could not be verified.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: dto.razorpay_order_id },
    });
    if (!payment || payment.tenantId !== tenantId) {
      throw new NotFoundException('Payment order not found for this workspace.');
    }

    await this.applyPaymentSuccess(payment.id, dto.razorpay_payment_id, dto.razorpay_signature);

    return this.getSubscriptionSummary(tenantId);
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const webhookSecret = this.config.get<string>('app.billing.razorpay.webhookSecret');
    if (!webhookSecret) return false;

    const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return (
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    );
  }

  async handleWebhookEvent(event: any) {
    const type = event?.event;
    const entity = event?.payload?.payment?.entity;
    if (!entity) return;

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: entity.order_id },
    });
    if (!payment) {
      this.logger.warn(`Webhook for unknown order ${entity.order_id}`);
      return;
    }

    if (type === 'payment.captured') {
      await this.applyPaymentSuccess(payment.id, entity.id, entity.notes?.signature ?? null);
    } else if (type === 'payment.failed') {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { not: 'captured' } },
        data: { status: 'failed', razorpayPaymentId: entity.id },
      });

      if (payment.subscriptionId) {
        await this.prisma.subscription.updateMany({
          where: { id: payment.subscriptionId, status: 'active' },
          data: { status: 'past_due' },
        });
      }
    }
  }

  /** Shared by the verify endpoint and the webhook — idempotent via the status guard. */
  private async applyPaymentSuccess(paymentId: string, razorpayPaymentId: string, signature: string | null) {
    const updated = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { not: 'captured' } },
      data: { status: 'captured', razorpayPaymentId, razorpaySignature: signature },
    });

    if (updated.count === 0) return;

    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { plan: true },
    });

    const start = new Date();
    const end = new Date(start.getTime() + (INTERVAL_MS[payment.plan.interval] ?? INTERVAL_MS.month));

    await this.prisma.subscription.upsert({
      where: { tenantId: payment.tenantId },
      create: {
        tenantId: payment.tenantId,
        planId: payment.planId,
        status: 'active',
        seats: payment.seats,
        currentPeriodStart: start,
        currentPeriodEnd: end,
      },
      update: {
        planId: payment.planId,
        status: 'active',
        seats: payment.seats,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelledAt: null,
      },
    });

    await this.prisma.tenant.update({
      where: { id: payment.tenantId },
      data: { plan: payment.plan.name },
    });

    this.logger.log(`Payment captured for tenant ${payment.tenantId}, plan ${payment.plan.name}`);
  }
}
