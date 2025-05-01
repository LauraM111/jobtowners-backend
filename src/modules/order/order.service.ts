import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order)
    private orderModel: typeof Order,
    @InjectModel(OrderItem)
    private orderItemModel: typeof OrderItem,
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  /**
   * Create a new order
   */
  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    // Implementation for creating an order
    const order = await this.orderModel.create({
      userId,
      amount: createOrderDto.amount,
      currency: createOrderDto.currency,
      status: 'pending',
      // Add other fields as needed
    });

    // Create order items if provided
    if (createOrderDto.items && createOrderDto.items.length > 0) {
      await Promise.all(
        createOrderDto.items.map(item => 
          this.orderItemModel.create({
            orderId: order.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            // Add other fields as needed
          })
        )
      );
    }

    return this.findOne(order.id);
  }

  /**
   * Find all orders
   */
  async findAll(): Promise<Order[]> {
    return this.orderModel.findAll({
      include: [
        {
          model: this.orderItemModel,
          as: 'items'
        },
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
  }

  /**
   * Find one order by ID
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findByPk(id, {
      include: [
        {
          model: this.orderItemModel,
          as: 'items'
        },
        {
          model: this.userModel,
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Find all orders by user ID
   */
  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.orderItemModel,
          as: 'items'
        }
      ]
    });
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.findOne(id);
    await order.update({ status });
    return this.findOne(id);
  }

  /**
   * Create a sample order for testing if none exist
   */
  async createSampleOrderIfNoneExist(userId: string): Promise<Order[]> {
    const existingOrders = await this.findByUserId(userId);
    
    if (existingOrders && existingOrders.length > 0) {
      return existingOrders;
    }
    
    // Create a sample order
    const sampleOrder = await this.orderModel.create({
      userId,
      amount: 49.99,
      currency: 'USD',
      status: 'completed',
      notes: 'Sample order for testing'
    });
    
    // Add a sample order item
    await this.orderItemModel.create({
      orderId: sampleOrder.id,
      name: 'Premium Resume Visibility',
      description: '30 days of premium resume visibility',
      quantity: 1,
      price: 49.99
    });
    
    console.log(`Created sample order with ID: ${sampleOrder.id} for user: ${userId}`);
    
    return this.findByUserId(userId);
  }
} 