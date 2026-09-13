function defineStep(sequelize, DataTypes) {
  const Step = sequelize.define('step', {
    caseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    step: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  });

  Step.associate = (models) => {
    Step.belongsToMany(models.Case, {
      through: 'caseSteps',
    });
  };

  return Step;
}

module.exports = defineStep;