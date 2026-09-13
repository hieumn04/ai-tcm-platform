function defineFolder(sequelize, DataTypes) {
  const Folder = sequelize.define('folder', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    detail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parentFolderId: {
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
  });

  Folder.associate = (models) => {
    Folder.belongsTo(models.Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });
    Folder.hasMany(models.Case, { foreignKey: 'folderId' });
    // Folder links to PlatformStatus through FolderPlatform
    Folder.belongsToMany(models.PlatformStatus, {
      through: models.FolderPlatform,
      foreignKey: 'folderId',
      otherKey: 'platformId',
      as: 'platforms',
    });
  };

  return Folder;
}

module.exports = defineFolder; 