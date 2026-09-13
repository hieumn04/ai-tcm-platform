function defineCase(sequelize, DataTypes) {
  const Case = sequelize.define('case', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 4,
        isInt: true,
      },
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    automationStatus: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    template: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    preConditions: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expectedResults: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isAuto: {
      type: DataTypes.ENUM('manual', 'auto'),
      allowNull: false,
    },
    stepsDetail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    useAI: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    folderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'folder',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    complexity: {
      type: DataTypes.ENUM('1', '2', '3'),
      allowNull: false,
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
  });

  Case.associate = (models) => {
    Case.belongsTo(models.Folder, {
      foreignKey: 'folderId',
      onDelete: 'CASCADE',
    });
    Case.belongsToMany(models.Step, {
      through: 'caseSteps',
    });
    Case.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'CASCADE' });
    Case.hasMany(models.DevStatus, {
      // A Case has many DevStatus
      foreignKey: 'caseId',
      onDelete: 'CASCADE',
    });
    Case.hasMany(models.RunCase, { foreignKey: 'caseId' });
    Case.hasMany(models.PlatformEvidence, {
      // A Case has many PlatformEvidence
      foreignKey: 'case_id',
      onDelete: 'CASCADE',
    });
  };

  return Case;
}

module.exports = defineCase; 