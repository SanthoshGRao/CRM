import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_MkLxxxxxxxxxxx' })
  @IsString()
  razorpay_order_id: string;

  @ApiProperty({ example: 'pay_MkLxxxxxxxxxxx' })
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty({ example: '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d' })
  @IsString()
  razorpay_signature: string;
}
