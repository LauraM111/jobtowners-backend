import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../user/entities/user.entity';
import { JobApplication } from '../job-application/entities/job-application.entity';
import { UserType } from '../user/entities/user.entity';
import { Job } from '../job/entities/job.entity';
import { Op } from 'sequelize';

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(Conversation)
    private conversationModel: typeof Conversation,
    @InjectModel(Message)
    private messageModel: typeof Message,
    @InjectModel(MessageAttachment)
    private messageAttachmentModel: typeof MessageAttachment,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(JobApplication)
    private jobApplicationModel: typeof JobApplication,
    @InjectModel(Job)
    private jobModel: typeof Job,
    private sequelize: Sequelize,
  ) {}

  /**
   * Create a new conversation (employer only)
   */
  async createConversation(employerId: string, createConversationDto: CreateConversationDto): Promise<Conversation> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Verify the employer
      const employer = await this.userModel.findByPk(employerId, { transaction });
      if (!employer || employer.userType !== UserType.EMPLOYER) {
        throw new ForbiddenException('Only employers can initiate conversations');
      }
      
      // Verify the candidate
      const candidate = await this.userModel.findByPk(createConversationDto.candidateId, { transaction });
      if (!candidate || candidate.userType !== UserType.CANDIDATE) {
        throw new NotFoundException('Candidate not found');
      }
      
      // Verify the job application
      const jobApplication = await this.jobApplicationModel.findByPk(createConversationDto.jobApplicationId, {
        include: [{ model: Job }],
        transaction
      });
      
      if (!jobApplication) {
        throw new NotFoundException('Job application not found');
      }
      
      // Verify that the job belongs to the employer
      if (jobApplication.job.userId !== employerId) {
        throw new ForbiddenException('You can only message candidates who applied to your jobs');
      }
      
      // Check if a conversation already exists
      const existingConversation = await this.conversationModel.findOne({
        where: {
          employerId,
          candidateId: createConversationDto.candidateId,
          jobApplicationId: createConversationDto.jobApplicationId
        },
        transaction
      });
      
      if (existingConversation) {
        await transaction.commit();
        return existingConversation;
      }
      
      // Create the conversation
      const conversation = await this.conversationModel.create({
        employerId,
        candidateId: createConversationDto.candidateId,
        jobApplicationId: createConversationDto.jobApplicationId,
        lastMessageAt: new Date()
      }, { transaction });
      
      await transaction.commit();
      return conversation;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string, userType: UserType): Promise<Conversation[]> {
    const whereClause = userType === UserType.EMPLOYER
      ? { employerId: userId }
      : { candidateId: userId };
    
    return this.conversationModel.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: JobApplication,
          include: [{ model: Job, attributes: ['id', 'title', 'jobTitle'] }]
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'candidate',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: JobApplication,
          include: [{ model: Job, attributes: ['id', 'title', 'jobTitle'] }]
        }
      ]
    });
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    
    // Verify that the user is part of the conversation
    if (conversation.employerId !== userId && conversation.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
    
    return conversation;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, userId: string, page = 1, limit = 20): Promise<{ messages: Message[], total: number }> {
    // Verify the conversation exists and user has access
    const conversation = await this.conversationModel.findByPk(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    
    if (conversation.employerId !== userId && conversation.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
    
    // Ensure page and limit are valid numbers
    const parsedPage = parseInt(String(page), 10) || 1;
    const parsedLimit = parseInt(String(limit), 10) || 20;
    
    // Calculate pagination
    const offset = (parsedPage - 1) * parsedLimit;
    
    // Get total count
    const total = await this.messageModel.count({
      where: { conversationId }
    });
    
    // Get messages with pagination
    const messages = await this.messageModel.findAll({
      where: { conversationId },
      include: [
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email', 'userType']
        },
        {
          model: this.messageAttachmentModel
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset
    });
    
    // Mark unread messages as read if the user is the recipient
    const unreadMessages = messages.filter(
      message => !message.isRead && message.senderId !== userId
    );
    
    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(message => 
          message.update({ isRead: true })
        )
      );
    }
    
    return { messages, total };
  }

  /**
   * Create a new message
   */
  async createMessage(
    userId: string, 
    createMessageDto: CreateMessageDto, 
    attachments?: Array<{fileName: string, fileType: string, fileSize: number, fileUrl: string}>
  ): Promise<Message> {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Verify the conversation exists and user has access
      const conversation = await this.conversationModel.findByPk(createMessageDto.conversationId, { transaction });
      
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      
      if (conversation.employerId !== userId && conversation.candidateId !== userId) {
        throw new ForbiddenException('You do not have access to this conversation');
      }
      
      // Create the message
      const message = await this.messageModel.create({
        conversationId: createMessageDto.conversationId,
        senderId: userId,
        content: createMessageDto.content,
        isRead: false
      }, { transaction });
      
      // Update the conversation's lastMessageAt
      await conversation.update({
        lastMessageAt: new Date()
      }, { transaction });
      
      // Handle file attachments if any
      if (attachments && attachments.length > 0) {
        const messageAttachments = await Promise.all(
          attachments.map(attachment => 
            this.messageAttachmentModel.create({
              messageId: message.id,
              fileName: attachment.fileName,
              fileType: attachment.fileType,
              fileSize: attachment.fileSize,
              fileUrl: attachment.fileUrl
            }, { transaction })
          )
        );
        
        message.setDataValue('attachments', messageAttachments);
      }
      
      await transaction.commit();
      
      // Return the message with sender info
      return this.messageModel.findByPk(message.id, {
        include: [
          {
            model: User,
            attributes: ['id', 'firstName', 'lastName', 'email', 'userType']
          },
          {
            model: MessageAttachment
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    // Find conversations where the user is either employer or candidate
    const conversations = await this.conversationModel.findAll({
      where: {
        [Op.or]: [
          { employerId: userId },
          { candidateId: userId }
        ]
      },
      attributes: ['id']
    });
    
    const conversationIds = conversations.map(c => c.id);
    
    if (conversationIds.length === 0) {
      return 0;
    }
    
    // Count unread messages where the user is not the sender
    return this.messageModel.count({
      where: {
        conversationId: {
          [Op.in]: conversationIds
        },
        senderId: {
          [Op.ne]: userId
        },
        isRead: false
      }
    });
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    // Verify the conversation exists and user has access
    const conversation = await this.conversationModel.findByPk(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    
    if (conversation.employerId !== userId && conversation.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
    
    // Mark all unread messages sent by the other user as read
    await this.messageModel.update(
      { isRead: true },
      {
        where: {
          conversationId,
          senderId: {
            [Op.ne]: userId
          },
          isRead: false
        }
      }
    );
  }
} 