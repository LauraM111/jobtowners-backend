import { ApiProperty } from '@nestjs/swagger';

export class DistributionPointDto {
  @ApiProperty({ example: 'candidate', description: 'Category name' })
  name: string;

  @ApiProperty({ example: 600, description: 'Count for this category' })
  value: number;
}

export class DistributionDataDto {
  @ApiProperty({ type: [DistributionPointDto] })
  data: DistributionPointDto[];
} 