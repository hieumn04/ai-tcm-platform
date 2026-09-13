function defineRun(sequelize, DataTypes) {
  const Run = sequelize.define(
    'run',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      configurations: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'project',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    },
    {
      timestamps: true, // Ensure timestamps are managed
    }
  );

  Run.associate = (models) => {
    Run.belongsTo(models.Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });
    Run.hasMany(models.RunCase, { foreignKey: 'runId', onDelete: 'CASCADE', as: 'runCases' });

    // Many-to-Many: Run <-> PlatformStatus (through RunPlatform)
    Run.belongsToMany(models.PlatformStatus, {
      through: models.RunPlatform,
      foreignKey: 'runId',
      otherKey: 'platformId',
      as: 'platforms',
    });
  };

  return Run;
}

module.exports = defineRun; 