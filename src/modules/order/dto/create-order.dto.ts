import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({ description: 'Name of the item', example: 'Premium Resume Visibility' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the item', example: '30 days of premium resume visibility' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quantity of the item', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Price of the item', example: 49.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'ID of the product', example: 'prod_123' })
  @IsOptional()
  @IsString()
  productId?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Total amount of the order', example: 49.99 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency of the order', example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Items in the order', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Payment method ID', example: 'pm_123456789' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Notes for the order', example: 'Please process ASAP' })
  @IsOptional()
  @IsString()
  notes?: string;
} 