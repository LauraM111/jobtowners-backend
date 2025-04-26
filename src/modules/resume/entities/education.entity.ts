import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Resume } from './resume.entity';

@Table({
  tableName: 'education',
  timestamps: true
})
export class Education extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  degreeName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  universityName: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  fromYear: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  toYear: number;

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