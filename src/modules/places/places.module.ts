import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService]
})
export class PlacesModule {} 