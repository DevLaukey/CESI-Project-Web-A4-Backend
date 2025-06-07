module.exports = (sequelize, DataTypes) => {
  const MenuItems = sequelize.define(
    "MenuItems",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      menuId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "menu_id",
      },
      itemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "item_id",
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      isOptional: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_optional",
      },
      extraPrice: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
        field: "extra_price",
      },
    },
    {
      tableName: "menu_items",
      timestamps: false,
      indexes: [
        { fields: ["menu_id"] },
        { fields: ["item_id"] },
        { fields: ["menu_id", "item_id"], unique: true },
      ],
    }
  );

  MenuItems.associate = function (models) {
    MenuItems.belongsTo(models.Menu, { foreignKey: "menuId" });
    MenuItems.belongsTo(models.Item, { foreignKey: "itemId" });
  };

  return MenuItems;
};
