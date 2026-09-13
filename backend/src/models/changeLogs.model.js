function defineChangeLogs(sequelize, DataTypes) {
  const ChangeLogs = sequelize.define('changeLogs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    content: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    folder_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return ChangeLogs;
}

module.exports = defineChangeLogs; 