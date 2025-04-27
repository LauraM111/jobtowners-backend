import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Token } from './token.model';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(Token)
    private tokenModel: typeof Token,
  ) {}

  async findOne(conditions: Partial<Token>): Promise<Token> {
    return this.tokenModel.findOne({ where: conditions });
  }

  async update(id: number, data: Partial<Token>): Promise<void> {
    await this.tokenModel.update(data, { where: { id } });
  }

  async create(data: Partial<Token>): Promise<Token> {
    return this.tokenModel.create(data);
  }
} 