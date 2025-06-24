import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.addColumn('subscription_plans', 'skipStripe', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    console.log('Added skipStripe column to subscription_plans table');
  } catch (error) {
    console.error('Error adding skipStripe column:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.removeColumn('subscription_plans', 'skipStripe');
    console.log('Removed skipStripe column from subscription_plans table');
  } catch (error) {
    console.error('Error removing skipStripe column:', error);
    throw error;
  }
} 