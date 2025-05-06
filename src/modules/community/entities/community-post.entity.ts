import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  Default,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { PostComment } from './post-comment.entity';
import { PostLike } from './post-like.entity';

export enum PostType {
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer',
  GENERAL = 'general',
}

export enum PostStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

@Table({ tableName: 'community_posts' })
export class CommunityPost extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content: string;

  @Column({
    type: DataType.ENUM(...Object.values(PostType)),
    allowNull: false,
  })
  postType: PostType;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  authorId: string;

  @BelongsTo(() => User, 'authorId')
  author: User;

  @Column({
    type: DataType.ENUM(...Object.values(PostStatus)),
    allowNull: false,
    defaultValue: PostStatus.ACTIVE,
  })
  status: PostStatus;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  likesCount: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  commentsCount: number;

  @HasMany(() => PostComment)
  comments: PostComment[];

  @HasMany(() => PostLike)
  likes: PostLike[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @DeletedAt
  deletedAt: Date;
} 