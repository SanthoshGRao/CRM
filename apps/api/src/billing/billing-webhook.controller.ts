import { BadRequestException, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { BillingService } from './billing.service';

/**
 * Razorpay server→server webhook. Deliberately unauthenticated (Razorpay
 * can't carry our JWT) but signature-verified against the raw request body
 * before anything else touches it — kept in its own controller, separate
 * from `BillingController`, so the "no guard at all" surface stays small
 * and obviously intentional rather than accidentally inherited.
 */
@ApiExcludeController()
@Controller('billing/webhook')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Req() request: FastifyRequest & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    if (!signature || !request.rawBody) {
      throw new BadRequestException('Missing webhook signature.');
    }

    const valid = this.billingService.verifyWebhookSignature(request.rawBody, signature);
    if (!valid) {
      throw new BadRequestException('Invalid webhook signature.');
    }

    const event = JSON.parse(request.rawBody.toString('utf8'));
    await this.billingService.handleWebhookEvent(event);

    return { success: true };
  }
}
