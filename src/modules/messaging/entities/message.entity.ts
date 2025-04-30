import { Column, Model, Table, DataType, ForeignKey, BelongsTo, HasMany, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { Conversation } from './conversation.entity';
import { MessageAttachment } from './message-attachment.entity';

@Table({
  tableName: 'messages',
  timestamps: true
})
export class Message extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @ForeignKey(() => Conversation)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  conversationId: string;

  @BelongsTo(() => Conversation)
  conversation: Conversation;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  senderId: string;

  @BelongsTo(() => User)
  sender: User;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  content: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isRead: boolean;

  @HasMany(() => MessageAttachment)
  attachments: MessageAttachment[];

  @BeforeCreate
  static generateId(instance: Message) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 