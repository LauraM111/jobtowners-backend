import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Resume } from './resume.entity';

@Table({
  tableName: 'experiences',
  timestamps: true
})
export class Experience extends Model {
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
  position: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  companyName: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  endDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description: string;

  @ForeignKey(() => Resume)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  resumeId: number;

  @BelongsTo(() => Resume)
  resume: Resume;
} 