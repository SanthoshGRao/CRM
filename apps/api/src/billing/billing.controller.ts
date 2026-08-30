import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

/**
 * No `SubscriptionGuard` here — these routes are the allowlist a tenant with
 * a lapsed subscription still needs, so it can see its plan and pay.
 */
@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: 'Current plan, subscription status and trial/period countdown' })
  async getSubscription(@CurrentUser('tenantId') tenantId: string) {
    const data = await this.billingService.getSubscriptionSummary(tenantId);
    return { success: true, data };
  }

  @Get('payments')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: 'Payment history for this workspace' })
  async getPayments(@CurrentUser('tenantId') tenantId: string) {
    const data = await this.billingService.getPaymentHistory(tenantId);
    return { success: true, data };
  }

  @Get('plans')
  @RequirePermission('billing.view')
  @ApiOperation({ summary: 'Paid plans this workspace can subscribe to' })
  async getPlans() {
    const data = await this.billingService.listPlans();
    return { success: true, data };
  }

  @Post('checkout')
  @RequirePermission('billing.manage')
  @ApiOperation({ summary: 'Create a Razorpay order to pay for a plan (Owner only)' })
  async createCheckout(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateCheckoutDto) {
    const data = await this.billingService.createCheckoutOrder(tenantId, dto.planId, dto.seats);
    return { success: true, data };
  }

  @Post('verify')
  @RequirePermission('billing.manage')
  @ApiOperation({ summary: 'Verify a completed Razorpay payment and activate the subscription (Owner only)' })
  async verify(@CurrentUser('tenantId') tenantId: string, @Body() dto: VerifyPaymentDto) {
    const data = await this.billingService.verifyPayment(tenantId, dto);
    return { success: true, data, message: 'Payment verified. Subscription active.' };
  }
}
