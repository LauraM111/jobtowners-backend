import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiBearerAuth()
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    try {
      const order = await this.orderService.create(req.user.sub, createOrderDto);
      return successResponse(order, 'Order created successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all orders (admin only)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiBearerAuth()
  async findAll() {
    try {
      const orders = await this.orderService.findAll();
      return successResponse(orders, 'Orders retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get current user\'s orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiBearerAuth()
  async findMyOrders(@Request() req) {
    try {
      const orders = await this.orderService.findByUserId(req.user.sub);
      return successResponse(orders, 'Orders retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const order = await this.orderService.findOne(id);
      
      // Check if the user is the owner of the order or an admin
      if (order.userId !== req.user.sub && req.user.userType !== 'admin') {
        throw new BadRequestException('You do not have permission to view this order');
      }
      
      return successResponse(order, 'Order retrieved successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':id/status')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiBearerAuth()
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    try {
      const order = await this.orderService.updateStatus(id, status);
      return successResponse(order, 'Order status updated successfully');
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
} 