import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Resume } from './resume.entity';

@Table({
  tableName: 'attachments',
  timestamps: true
})
export class Attachment extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

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
    type: DataType.INTEGER,
    allowNull: false
  })
  resumeId: number;

  @BelongsTo(() => Resume)
  resume: Resume;
} 