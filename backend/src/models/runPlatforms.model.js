function defineRunPlatform(sequelize, DataTypes) {
  const RunPlatform = sequelize.define(
    'runPlatform',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      runId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'runs',
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
      },
    },
    {
      tableName: 'runPlatforms',
      timestamps: true,
    }
  );

  return RunPlatform;
}

module.exports = defineRunPlatform; 