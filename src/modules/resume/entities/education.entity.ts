import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Resume } from './resume.entity';

@Table({
  tableName: 'education',
  timestamps: true
})
export class Education extends Model<Education> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  institution: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  degree: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  fieldOfStudy: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  startDate: Date;

  @Column({
    type: DataType.DATEONLY,
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
    type: DataType.UUID,
    allowNull: false
  })
  resumeId: string;

  @BelongsTo(() => Resume)
  resume: Resume;

  @BeforeCreate
  static generateId(instance: Education) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 