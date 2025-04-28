import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('jobs', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      jobTitle: {
        type: DataTypes.STRING,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      jobDescription: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      emailAddress: {
        type: DataTypes.STRING,
        allowNull: false
      },
      specialisms: {
        type: DataTypes.JSON,
        allowNull: true
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true
      },
      jobType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      offeredSalary: {
        type: DataTypes.STRING,
        allowNull: true
      },
      careerLevel: {
        type: DataTypes.STRING,
        allowNull: true
      },
      experience: {
        type: DataTypes.STRING,
        allowNull: true
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true
      },
      industry: {
        type: DataTypes.STRING,
        allowNull: true
      },
      qualification: {
        type: DataTypes.STRING,
        allowNull: true
      },
      applicationDeadlineDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      completeAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      additionalAttachments: {
        type: DataTypes.JSON,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
      },
      verificationStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      applications: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('jobs');
  }
}; 