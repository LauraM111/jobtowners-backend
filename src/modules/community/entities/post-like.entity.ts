import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Default,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { CommunityPost } from './community-post.entity';

@Table({ 
  tableName: 'post_likes',
  timestamps: true,
  updatedAt: false // This tells Sequelize not to use updatedAt
})
export class PostLike extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => CommunityPost)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  postId: string;

  @BelongsTo(() => CommunityPost)
  post: CommunityPost;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;
} 