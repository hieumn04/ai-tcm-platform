function definePlatformStatus(sequelize, DataTypes) {
  const PlatformStatus = sequelize.define(
    'platformStatus',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      platform: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'platformStatuses',
      timestamps: true,
    }
  );

  PlatformStatus.associate = (models) => {
    // Many-to-Many: PlatformStatus <-> Run (through RunPlatform)
    PlatformStatus.belongsToMany(models.Run, {
      through: models.RunPlatform,
      foreignKey: 'platformId',
      otherKey: 'runId',
      as: 'runs',
    });
  };

  return PlatformStatus;
}

module.exports = definePlatformStatus; 