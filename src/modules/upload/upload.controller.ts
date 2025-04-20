import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { successResponse } from '../../common/helpers/response.helper';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Public()
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'documents',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: any,
    @Body('folder') folder: string = 'uploads',
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = await this.uploadService.uploadFile(
      file.buffer,
      folder,
      file.originalname,
    );

    return successResponse({ fileUrl }, 'File uploaded successfully');
  }

  @Public()
  @Post('base64')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        base64Data: {
          type: 'string',
          example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
        },
        folder: {
          type: 'string',
          example: 'documents',
        },
        fileType: {
          type: 'string',
          example: 'jpg',
        },
      },
    },
  })
  async uploadBase64(
    @Body('base64Data') base64Data: string,
    @Body('folder') folder: string = 'uploads',
    @Body('fileType') fileType: string = 'jpg',
  ) {
    if (!base64Data) {
      throw new BadRequestException('No base64 data provided');
    }

    const fileUrl = await this.uploadService.uploadBase64File(
      base64Data,
      folder,
      fileType,
    );

    return successResponse({ fileUrl }, 'File uploaded successfully');
  }
} 