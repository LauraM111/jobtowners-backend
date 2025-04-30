import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CandidatePaymentService } from '../../modules/candidate-payment/candidate-payment.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const candidatePaymentService = app.get(CandidatePaymentService);
    
    console.log('Seeding default candidate plan...');
    
    // Check if default plan already exists
    const existingPlans = await candidatePaymentService.findAllPlans();
    
    if (existingPlans.length === 0) {
      // Create default plan
      await candidatePaymentService.createPlan({
        name: 'Job Application Access',
        description: 'One-time payment for unlimited job applications (15 per day)',
        price: 15.00,
        currency: 'usd',
        dailyApplicationLimit: 15
      });
      
      console.log('Default candidate plan created successfully');
    } else {
      console.log('Default candidate plan already exists');
    }
  } catch (error) {
    console.error('Error seeding default candidate plan:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 