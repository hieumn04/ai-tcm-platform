function defineFolderPlatform(sequelize, DataTypes) {
  const FolderPlatform = sequelize.define(
    'folderPlatform',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      folderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'folders',
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
      tableName: 'folderPlatforms',
      timestamps: true,
    }
  );

  return FolderPlatform;
}

module.exports = defineFolderPlatform; 