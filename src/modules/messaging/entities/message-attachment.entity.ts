import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Message } from './message.entity';

@Table({
  tableName: 'message_attachments',
  timestamps: true
})
export class MessageAttachment extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @ForeignKey(() => Message)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  messageId: string;

  @BelongsTo(() => Message)
  message: Message;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  fileName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  fileType: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  fileSize: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  fileUrl: string;

  @BeforeCreate
  static generateId(instance: MessageAttachment) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 