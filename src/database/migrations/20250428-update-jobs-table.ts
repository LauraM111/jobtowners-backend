import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('jobs', 'verificationStatus', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending'
    });

    await queryInterface.addColumn('jobs', 'rejectionReason', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('jobs', 'companyId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('jobs', 'verificationStatus');
    await queryInterface.removeColumn('jobs', 'rejectionReason');
    await queryInterface.removeColumn('jobs', 'companyId');
  }
}; 