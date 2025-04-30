import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from './messaging.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  
  // Map to store user connections
  private userSockets: Map<string, string[]> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagingService: MessagingService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Client attempted to connect without a token');
        client.disconnect();
        return;
      }
      
      // Verify token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      
      // Store the connection
      client.data.userId = userId;
      
      // Add socket to user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId).push(client.id);
      
      // Join user's room
      client.join(`user:${userId}`);
      
      this.logger.log(`Client connected: ${client.id} for user ${userId}`);
      
      // Send unread message count
      const unreadCount = await this.messagingService.getUnreadMessageCount(userId);
      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId) {
      // Remove socket from user's sockets
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        const index = userSockets.indexOf(client.id);
        if (index !== -1) {
          userSockets.splice(index, 1);
        }
        
        // If no more sockets, remove user from map
        if (userSockets.length === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageDto
  ) {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        return { error: 'Unauthorized' };
      }
      
      // Validate conversationId
      if (!data.conversationId) {
        return { error: 'Conversation ID is required' };
      }
      
      // Create the message
      const message = await this.messagingService.createMessage(userId, data);
      
      // Get the conversation to find the other user
      const conversation = await this.messagingService.getConversation(data.conversationId, userId);
      
      // Determine the recipient
      const recipientId = conversation.employerId === userId 
        ? conversation.candidateId 
        : conversation.employerId;
      
      // Emit to the recipient's room
      this.server.to(`user:${recipientId}`).emit('new_message', {
        message,
        conversationId: data.conversationId
      });
      
      // Also emit unread count update
      const unreadCount = await this.messagingService.getUnreadMessageCount(recipientId);
      this.server.to(`user:${recipientId}`).emit('unread_count', { count: unreadCount });
      
      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        return { error: 'Unauthorized' };
      }
      
      // Mark messages as read
      await this.messagingService.markMessagesAsRead(data.conversationId, userId);
      
      // Get the conversation to find the other user
      const conversation = await this.messagingService.getConversation(data.conversationId, userId);
      
      // Determine the sender (the other user)
      const senderId = conversation.employerId === userId 
        ? conversation.candidateId 
        : conversation.employerId;
      
      // Emit to the sender that their messages were read
      this.server.to(`user:${senderId}`).emit('messages_read', {
        conversationId: data.conversationId,
        readBy: userId
      });
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    const userId = client.data.userId;
    
    if (!userId) {
      return { error: 'Unauthorized' };
    }
    
    // Join the conversation room
    client.join(`conversation:${data.conversationId}`);
    
    return { success: true };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    // Leave the conversation room
    client.leave(`conversation:${data.conversationId}`);
    
    return { success: true };
  }
} 