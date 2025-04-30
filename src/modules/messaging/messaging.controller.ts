import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { UploadService } from '../upload/upload.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly uploadService: UploadService
  ) {}

  @Post('conversations')
  @UseGuards(RolesGuard)
  @Roles(UserType.EMPLOYER)
  @ApiOperation({ summary: 'Create a new conversation (employer only)' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @Request() req,
    @Body() createConversationDto: CreateConversationDto
  ) {
    try {
      const conversation = await this.messagingService.createConversation(
        req.user.sub,
        createConversationDto
      );
      return successResponse(conversation, 'Conversation created successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getConversations(@Request() req) {
    try {
      const conversations = await this.messagingService.getConversations(
        req.user.sub,
        req.user.userType
      );
      return successResponse(conversations, 'Conversations retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  async getConversation(@Request() req, @Param('id') id: string) {
    try {
      const conversation = await this.messagingService.getConversation(id, req.user.sub);
      return successResponse(conversation, 'Conversation retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Request() req,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    try {
      // Convert page and limit to numbers with defaults
      const parsedPage = page ? parseInt(page, 10) : 1;
      const parsedLimit = limit ? parseInt(limit, 10) : 20;
      
      // Validate that they are valid numbers
      if (isNaN(parsedPage) || isNaN(parsedLimit)) {
        throw new BadRequestException('Page and limit must be valid numbers');
      }
      
      const { messages, total } = await this.messagingService.getMessages(
        id,
        req.user.sub,
        parsedPage,
        parsedLimit
      );
      
      return successResponse(
        { 
          messages, 
          total, 
          page: parsedPage, 
          limit: parsedLimit 
        },
        'Messages retrieved successfully'
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('messages')
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('attachments', 5))
  async createMessage(
    @Request() req,
    @Body() createMessageDto: CreateMessageDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    try {
      // Upload files to DigitalOcean Spaces if any
      const uploadedFiles = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const fileUrl = await this.uploadService.uploadFile(
            file.buffer,
            'message-attachments',
            file.originalname
          );
          
          uploadedFiles.push({
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            fileUrl
          });
        }
      }

      const message = await this.messagingService.createMessage(
        req.user.sub,
        createMessageDto,
        uploadedFiles
      );
      
      return successResponse(message, 'Message sent successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count for the current user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadMessageCount(@Request() req) {
    try {
      const count = await this.messagingService.getUnreadMessageCount(req.user.sub);
      return successResponse({ count }, 'Unread count retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markMessagesAsRead(@Request() req, @Param('id') id: string) {
    try {
      await this.messagingService.markMessagesAsRead(id, req.user.sub);
      return successResponse(null, 'Messages marked as read');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 