import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Make emailAddress column nullable in jobs table
    await queryInterface.changeColumn('jobs', 'emailAddress', {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Revert emailAddress column back to not nullable
    // Note: This might fail if there are existing null values
    await queryInterface.changeColumn('jobs', 'emailAddress', {
      type: DataTypes.STRING,
      allowNull: false
    });
  }
};
