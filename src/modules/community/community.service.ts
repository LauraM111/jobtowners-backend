import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CommunityPost, PostStatus, PostType } from './entities/community-post.entity';
import { PostComment, CommentStatus } from './entities/post-comment.entity';
import { PostLike } from './entities/post-like.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from '../user/entities/user.entity';
import { Op } from 'sequelize';

@Injectable()
export class CommunityService {
  constructor(
    @InjectModel(CommunityPost)
    private communityPostModel: typeof CommunityPost,
    @InjectModel(PostComment)
    private postCommentModel: typeof PostComment,
    @InjectModel(PostLike)
    private postLikeModel: typeof PostLike,
  ) {}

  // Post Management
  async createPost(createPostDto: CreatePostDto, user: any) {
    // Check if user exists and has an ID
    console.log('Service received user:', user);
    
    // The user object from JWT has 'sub' instead of 'id'
    if (!user || (!user.id && !user.sub)) {
      throw new UnauthorizedException('User not authenticated or invalid user data');
    }
    
    // Ensure user has an id property (use sub if id is not available)
    const userId = user.id || user.sub;
    
    // Validate post type based on user role
    this.validatePostTypeForUser(createPostDto.postType, user);

    // Create the post
    const post = await this.communityPostModel.create({
      ...createPostDto,
      authorId: userId, // Use the extracted userId
      status: user.userType === 'admin' ? PostStatus.ACTIVE : PostStatus.PENDING,
    });

    return {
      success: true,
      message: 'Post created successfully',
      data: post
    };
  }

  async getPosts(page = 1, limit = 10, postType?: PostType, status = PostStatus.ACTIVE) {
    const offset = (page - 1) * limit;
    
    const where: any = { status };
    if (postType) {
      where.postType = postType;
    }
    
    const { count, rows } = await this.communityPostModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
    
    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async getPostById(id: string, user?: any) {
    const post = await this.communityPostModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    // Get comments separately for better control over ordering
    const comments = await this.postCommentModel.findAll({
      where: {
        postId: id,
        status: CommentStatus.ACTIVE,
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'ASC']], // Oldest first (change to DESC for newest first)
    });
    
    // Add comments to the post
    const postWithComments = post.toJSON();
    postWithComments.comments = comments;
    
    // Check if the user has liked the post (if user is authenticated)
    if (user) {
      console.log('Checking if user has liked post:', { user, postId: id });
      
      const userId = user.id || user.sub;
      if (userId) {
        try {
          const like = await this.postLikeModel.findOne({
            where: {
              postId: id,
              userId: userId,
            },
          });
          
          console.log('Like found:', like);
          postWithComments.isLiked = !!like;
        } catch (error) {
          console.error('Error checking like status:', error);
          postWithComments.isLiked = false;
        }
      } else {
        console.log('No userId found in user object');
        postWithComments.isLiked = false;
      }
    } else {
      postWithComments.isLiked = false;
    }
    
    return postWithComments;
  }

  async updatePost(id: string, updatePostDto: UpdatePostDto, user: User) {
    const post = await this.communityPostModel.findByPk(id);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    // Check if user is the author or an admin
    if (post.authorId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this post');
    }
    
    // If post type is being updated, validate it
    if (updatePostDto.postType) {
      this.validatePostTypeForUser(updatePostDto.postType, user);
    }
    
    // Update the post
    await post.update(updatePostDto);
    
    return post;
  }

  async deletePost(id: string, user: User) {
    const post = await this.communityPostModel.findByPk(id);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    // Check if user is the author or an admin
    if (post.authorId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this post');
    }
    
    // Soft delete the post
    await post.destroy();
    
    return { success: true, message: 'Post deleted successfully' };
  }

  // Comment Management
  async addComment(postId: string, createCommentDto: CreateCommentDto, user: any) {
    const post = await this.communityPostModel.findByPk(postId);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }
    
    // Extract userId from user object (use sub if id is not available)
    const userId = user.id || user.sub;
    
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    // Create the comment
    const comment = await this.postCommentModel.create({
      ...createCommentDto,
      postId,
      authorId: userId, // Use the extracted userId
    });
    
    // Update comment count on the post
    await post.increment('commentsCount');
    
    return comment;
  }

  async getComments(postId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await this.postCommentModel.findAndCountAll({
      where: {
        postId,
        status: CommentStatus.ACTIVE,
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
    
    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async deleteComment(commentId: string, user: User) {
    const comment = await this.postCommentModel.findByPk(commentId, {
      include: [{ model: CommunityPost }],
    });
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }
    
    // Check if user is the author or an admin
    if (comment.authorId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }
    
    // Update the comment status to deleted
    await comment.update({ status: CommentStatus.DELETED });
    
    // Decrement comment count on the post
    await comment.post.decrement('commentsCount');
    
    return { success: true, message: 'Comment deleted successfully' };
  }

  // Like Management
  async likePost(postId: string, user: any) {
    const post = await this.communityPostModel.findByPk(postId);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }
    
    // Extract userId from user object (use sub if id is not available)
    const userId = user.id || user.sub;
    
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    // Check if user has already liked the post
    const existingLike = await this.postLikeModel.findOne({
      where: {
        postId,
        userId: userId,
      },
    });
    
    // If already liked, unlike it (toggle behavior)
    if (existingLike) {
      await this.postLikeModel.destroy({
        where: {
          id: existingLike.id
        }
      });
      
      // Update like count on the post
      await post.decrement('likesCount');
      
      return { success: true, message: 'Post unliked successfully' };
    }
    
    // Otherwise, like the post
    await this.postLikeModel.create({
      postId,
      userId: userId,
    });
    
    // Update like count on the post
    await post.increment('likesCount');
    
    return { success: true, message: 'Post liked successfully' };
  }

  async unlikePost(postId: string, user: any) {
    const post = await this.communityPostModel.findByPk(postId);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }
    
    // Extract userId from user object (use sub if id is not available)
    const userId = user.id || user.sub;
    
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    
    // Find the like
    const like = await this.postLikeModel.findOne({
      where: {
        postId,
        userId: userId, // Use the extracted userId
      },
      attributes: ['id'] // Only select the ID to make the query lighter
    });
    
    if (!like) {
      throw new BadRequestException('You have not liked this post');
    }
    
    // Delete the like
    await this.postLikeModel.destroy({
      where: {
        id: like.id
      }
    });
    
    // Update like count on the post
    await post.decrement('likesCount');
    
    return { success: true, message: 'Post unliked successfully' };
  }

  // Admin Functions
  async getPendingPosts(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await this.communityPostModel.findAndCountAll({
      where: {
        status: PostStatus.PENDING,
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'email', 'userType'],
        },
      ],
    });
    
    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async approvePost(id: string) {
    const post = await this.communityPostModel.findByPk(id);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    await post.update({ status: PostStatus.ACTIVE });
    
    return { success: true, message: 'Post approved successfully' };
  }

  async rejectPost(id: string, reason: string) {
    const post = await this.communityPostModel.findByPk(id);
    
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    
    await post.update({ status: PostStatus.REJECTED });
    
    // Here you could also store the rejection reason or notify the user
    
    return { success: true, message: 'Post rejected successfully' };
  }

  // Helper Methods
  private validatePostTypeForUser(postType: PostType, user: any) {
    console.log('Validating post type:', postType, 'for user type:', user.userType);
    
    // All users can create general posts
    if (postType === PostType.GENERAL) {
      return true;
    }
    
    // Admins can post any type
    if (user.userType === 'admin') {
      return true;
    }
    
    // Candidates can only post candidate type
    if (user.userType === 'candidate' && postType !== PostType.CANDIDATE) {
      throw new ForbiddenException(`Candidates can only create candidate or general posts. You tried to create a ${postType} post.`);
    }
    
    // Employers can only post employer type
    if (user.userType === 'employer' && postType !== PostType.EMPLOYER) {
      throw new ForbiddenException(`Employers can only create employer or general posts. You tried to create a ${postType} post.`);
    }
    
    return true;
  }
} 