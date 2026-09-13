function defineDevStatus(sequelize, DataTypes) {
  const DevStatus = sequelize.define(
    'devStatus',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      caseId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'case',
          key: 'id',
        },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      role: {
        type: DataTypes.ENUM('app', 'backend', 'frontend'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('passed', 'failed', 'pending'),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Reference to users table
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users', // Reference to users table
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
    },
    {
      tableName: 'dev_status',
      underscored: true,
      timestamps: true,
    }
  );

  DevStatus.associate = (models) => {
    DevStatus.belongsTo(models.Case, {
      foreignKey: 'caseId',
      onDelete: 'CASCADE',
    });

    DevStatus.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator', // Alias for better readability
      onDelete: 'CASCADE',
    });

    DevStatus.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater', // Alias for better readability
      onDelete: 'SET NULL',
    });
  };

  return DevStatus;
}

module.exports = defineDevStatus; 