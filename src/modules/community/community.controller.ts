import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../auth/decorators/user.decorator';
import { PostType, PostStatus } from './entities/community-post.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // Post Endpoints
  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - User type not allowed to create this post type' })
  async createPost(
    @Body() createPostDto: CreatePostDto, 
    @User() user: any,
    @Req() request: Request
  ) {
    console.log('User from decorator:', user);
    console.log('Request user:', request.user);
    console.log('Auth header:', request.headers.authorization);
    
    if (!user) {
      throw new ForbiddenException('User information not available. Please check your authentication.');
    }
    
    try {
      // Check post type permissions before sending to service
      if (createPostDto.postType === PostType.EMPLOYER && user.userType !== 'employer') {
        throw new ForbiddenException('Only employers can create employer posts. You can create general posts instead.');
      }
      
      if (createPostDto.postType === PostType.CANDIDATE && user.userType !== 'candidate') {
        throw new ForbiddenException('Only candidates can create candidate posts. You can create general posts instead.');
      }
      
      // All user types can create general posts
      return await this.communityService.createPost(createPostDto, user);
    } catch (error) {
      console.error('Error in createPost:', error);
      if (error.status === 403) {
        throw new ForbiddenException(error.message || 'You are not authorized to create this type of post.');
      }
      throw error;
    }
  }

  @Public()
  @Get('posts')
  @ApiOperation({ summary: 'Get all posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'postType', required: false, enum: PostType })
  @ApiResponse({ status: 200, description: 'Returns list of posts' })
  async getPosts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('postType') postType?: PostType,
  ) {
    return this.communityService.getPosts(
      parseInt(page, 10),
      parseInt(limit, 10),
      postType,
    );
  }

  @Public()
  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Returns the post' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPostById(@Param('id') id: string, @Req() request: Request) {
    // Check if user is authenticated
    const user = request.user;
    return this.communityService.getPostById(id, user);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @User() user: any,
  ) {
    return this.communityService.updatePost(id, updatePostDto, user);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async deletePost(@Param('id') id: string, @User() user: any) {
    return this.communityService.deletePost(id, user);
  }

  // Comment Endpoints
  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async addComment(
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @User() user: any,
  ) {
    return this.communityService.addComment(postId, createCommentDto, user);
  }

  @Public()
  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns list of comments' })
  async getComments(
    @Param('id') postId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.communityService.getComments(
      postId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(@Param('id') commentId: string, @User() user: any) {
    return this.communityService.deleteComment(commentId, user);
  }

  // Like Endpoints
  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post liked successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async likePost(@Param('id') postId: string, @User() user: any) {
    return this.communityService.likePost(postId, user);
  }

  @Delete('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post unliked successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async unlikePost(@Param('id') postId: string, @User() user: any) {
    return this.communityService.unlikePost(postId, user);
  }

  // Admin Endpoints
  @Get('admin/pending-posts')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get pending posts (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns list of pending posts' })
  async getPendingPosts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.communityService.getPendingPosts(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Patch('admin/posts/:id/approve')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve a post (Admin only)' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post approved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async approvePost(@Param('id') id: string) {
    return this.communityService.approvePost(id);
  }

  @Patch('admin/posts/:id/reject')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Reject a post (Admin only)' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post rejected successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async rejectPost(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.communityService.rejectPost(id, reason);
  }

  @Public()
  @Get('test')
  @ApiOperation({ summary: 'Test endpoint (Public)' })
  async testPublicEndpoint() {
    return { message: 'Public endpoint works!' };
  }

  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Test authenticated endpoint' })
  async testAuthEndpoint(@User() user: any) {
    return { 
      message: 'Authenticated endpoint works!',
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType
      }
    };
  }
} 