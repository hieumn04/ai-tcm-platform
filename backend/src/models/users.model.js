function defineUser(sequelize, DataTypes) {
  const User = sequelize.define(
    'user',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      avatarPath: {
        type: DataTypes.STRING,
      },
    },
    { underscored: true }
  );

  User.associate = (models) => {
    User.hasMany(models.Project, { foreignKey: 'userId', onDelete: 'CASCADE' });
    User.hasMany(models.Case, { foreignKey: 'userId', onDelete: 'CASCADE' });

    User.hasMany(models.DevStatus, {
      foreignKey: 'createdBy',
      as: 'createdDevStatuses',
    });

    User.hasMany(models.DevStatus, {
      foreignKey: 'updatedBy',
      as: 'updatedDevStatuses',
    });
  };

  return User;
}

module.exports = defineUser; 