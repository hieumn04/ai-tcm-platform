function defineRunCaseStatus(sequelize, DataTypes) {
  const RunCaseStatus = sequelize.define('runCaseStatuses', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    runCaseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'runCases',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    platformId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'platformStatuses',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  });

  // Define associations
  RunCaseStatus.associate = (models) => {
    RunCaseStatus.belongsTo(models.RunCase, {
      foreignKey: 'runCaseId',
      onDelete: 'CASCADE',
    });

    RunCaseStatus.belongsTo(models.PlatformStatus, {
      foreignKey: 'platformId',
      as: 'platformStatus',
      onDelete: 'CASCADE',
    });

    RunCaseStatus.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
  };

  return RunCaseStatus;
}

module.exports = defineRunCaseStatus; 