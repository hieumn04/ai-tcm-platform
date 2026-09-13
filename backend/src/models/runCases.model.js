function defineRunCase(sequelize, DataTypes) {
  const RunCase = sequelize.define(
    'runCases',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      runId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'run',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      caseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'case',
          key: 'id',
        },
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      aiAssessment: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      timestamps: true, // Ensure timestamps are enabled
    }
  );

  RunCase.associate = (models) => {
    RunCase.belongsTo(models.Run, {
      foreignKey: 'runId',
      onDelete: 'CASCADE',
    });
    RunCase.belongsTo(models.Case, {
      foreignKey: 'caseId',
      onDelete: 'CASCADE',
    });
    RunCase.hasMany(models.RunCaseStatus, {
      foreignKey: 'runCaseId',
      as: 'statuses',
      onDelete: 'CASCADE',
    });
  };

  return RunCase;
}

module.exports = defineRunCase; 