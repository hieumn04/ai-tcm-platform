function definePlatformEvidence(sequelize, DataTypes) {
  const PlatformEvidence = sequelize.define(
    'platform_evidence',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      case_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'cases',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      platform: {
        type: DataTypes.ENUM('Web', 'Wap', 'Zma', 'iOS', 'Android', 'API'),
        allowNull: false,
      },
      evidenceImageUrls: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        field: 'evidenceImageUrls'
      },
      evidenceDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        field: 'evidenceDescription'
      },
    },
    {
      underscored: true,
      tableName: 'platform_evidences',
    }
  );

  PlatformEvidence.associate = (models) => {
    PlatformEvidence.belongsTo(models.Case, {
      foreignKey: 'case_id',
      onDelete: 'CASCADE',
    });
  };

  return PlatformEvidence;
}

module.exports = definePlatformEvidence; 