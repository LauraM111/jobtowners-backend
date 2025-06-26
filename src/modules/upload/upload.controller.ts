import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { successResponse } from '../../common/helpers/response.helper';
import { Public } from '../auth/decorators/public.decorator';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Public()
  @Post('file')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: MAX_FILE_SIZE, // 10MB
      files: 1
    },
    fileFilter: (req, file, cb) => {
      if (file.size && file.size > MAX_FILE_SIZE) {
        cb(new BadRequestException(`File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`), false);
      }
      cb(null, true);
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB)'
        },
        folder: {
          type: 'string',
          example: 'documents',
          description: 'Destination folder for the file'
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })
        ]
      })
    ) file: any,
    @Body('folder') folder: string = 'uploads',
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const fileUrl = await this.uploadService.uploadFile(
        file.buffer,
        folder,
        file.originalname,
      );

      return successResponse({ 
        fileUrl,
        size: file.size,
        filename: file.originalname,
        mimetype: file.mimetype
      }, 'File uploaded successfully');
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
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