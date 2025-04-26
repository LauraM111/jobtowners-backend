import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SubscriptionPlanService } from '../modules/subscription/subscription-plan.service';
import { PlanInterval } from '../modules/subscription/entities/subscription-plan.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const subscriptionPlanService = app.get(SubscriptionPlanService);
    
    // Create Professional Plan (Weekly)
    await subscriptionPlanService.create({
      name: 'Professional',
      description: 'Basic plan for professionals',
      price: 5,
      interval: PlanInterval.WEEKLY,
      intervalCount: 1,
      currency: 'usd',
      features: [
        'Unlimited access to candidates',
        '1 job per week',
        '50 resume views per month',
        'Resume match notifications',
        'Sort notes to candidates',
        'Enhanced candidate profiles'
      ]
    });
    
    console.log('Professional Plan created successfully');
    
    // Create Standard Plan (Monthly)
    await subscriptionPlanService.create({
      name: 'Standard',
      description: 'Standard plan for businesses',
      price: 10,
      interval: PlanInterval.MONTHLY,
      intervalCount: 1,
      currency: 'usd',
      features: [
        'Unlimited access to candidates',
        '5 jobs per month',
        '100 resumes views per month',
        'Resume match notifications',
        'Sort notes to candidates',
        'Enhanced candidate profiles'
      ]
    });
    
    console.log('Standard Plan created successfully');
    
    // Create Unlimited Plan (Yearly)
    await subscriptionPlanService.create({
      name: 'Unlimited',
      description: 'Unlimited plan for enterprises',
      price: 15,
      interval: PlanInterval.YEARLY,
      intervalCount: 1,
      currency: 'usd',
      features: [
        'Unlimited access to candidates',
        '10 jobs per year',
        '500 resumes views per year',
        'Resume match notifications',
        'Sort notes to candidates',
        'Enhanced candidate profiles'
      ]
    });
    
    console.log('Unlimited Plan created successfully');
    
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 