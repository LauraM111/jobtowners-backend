import { Injectable } from '@nestjs/common';
import { CandidatePaymentService } from '../../modules/candidate-payment/candidate-payment.service';
import { CreateCandidatePlanDto } from '../../modules/candidate-payment/dto/create-candidate-plan.dto';

@Injectable()
export class CandidatePlanSeeder {
  constructor(private readonly candidatePaymentService: CandidatePaymentService) {}

  async seed() {
    console.log('Seeding candidate plans...');
    
    try {
      // Check if plans already exist
      const existingPlansResult = await this.candidatePaymentService.findAllPlans(1, 100);
      
      // Access the plans array from the result
      if (existingPlansResult.plans.length === 0) {
        // Create default plans
        await this.createDefaultPlans();
        console.log('Candidate plans seeded successfully');
      } else {
        console.log(`Skipping candidate plan seeding. ${existingPlansResult.plans.length} plans already exist.`);
      }
    } catch (error) {
      console.error('Error seeding candidate plans:', error.message);
    }
  }

  private async createDefaultPlans() {
    const defaultPlans: CreateCandidatePlanDto[] = [
      {
        name: 'Basic Plan',
        description: 'Apply for up to 15 jobs per day',
        price: 9.99,
        currency: 'usd',
        dailyApplicationLimit: 15
      },
      {
        name: 'Standard Plan',
        description: 'Apply for up to 30 jobs per day',
        price: 19.99,
        currency: 'usd',
        dailyApplicationLimit: 30
      },
      {
        name: 'Premium Plan',
        description: 'Apply for up to 50 jobs per day',
        price: 29.99,
        currency: 'usd',
        dailyApplicationLimit: 50
      }
    ];

    for (const planData of defaultPlans) {
      await this.candidatePaymentService.createPlan(planData);
    }
  }
} 