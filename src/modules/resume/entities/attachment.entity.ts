import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Resume } from './resume.entity';

@Table({
  tableName: 'attachments',
  timestamps: true
})
export class Attachment extends Model {
  @Column({
    type: DataType.STRING(36),
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  fileName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  fileUrl: string;

  @ForeignKey(() => Resume)
  @Column({
    type: DataType.STRING(36),
    allowNull: false
  })
  resumeId: string;

  @BelongsTo(() => Resume)
  resume: Resume;

  @BeforeCreate
  static generateId(instance: Attachment) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 