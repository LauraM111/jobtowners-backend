import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Default,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { CommunityPost } from './community-post.entity';

export enum CommentStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

@Table({ tableName: 'post_comments' })
export class PostComment extends Model {
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
  authorId: string;

  @BelongsTo(() => User, 'authorId')
  author: User;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content: string;

  @Column({
    type: DataType.ENUM(...Object.values(CommentStatus)),
    allowNull: false,
    defaultValue: CommentStatus.ACTIVE,
  })
  status: CommentStatus;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
} 