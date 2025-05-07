import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CandidatePaymentService } from '../modules/candidate-payment/candidate-payment.service';
import { CreateCandidatePlanDto } from '../modules/candidate-payment/dto/create-candidate-plan.dto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('Starting candidate plan seeder...');
    
    const candidatePaymentService = app.get(CandidatePaymentService);
    
    // Check if plans already exist
    const existingPlansResult = await candidatePaymentService.findAllPlans(1, 100);
    
    // Access the plans array from the result
    if (existingPlansResult.plans.length === 0) {
      // Create default plans
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
        await candidatePaymentService.createPlan(planData);
        console.log(`Created plan: ${planData.name}`);
      }
      
      console.log('Candidate plans seeded successfully');
    } else {
      console.log(`Skipping candidate plan seeding. ${existingPlansResult.plans.length} plans already exist.`);
    }
  } catch (error) {
    console.error('Error seeding candidate plans:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap(); 