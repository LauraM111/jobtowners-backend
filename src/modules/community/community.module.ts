import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityPost } from './entities/community-post.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostLike } from './entities/post-like.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([CommunityPost, PostComment, PostLike]),
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {} 