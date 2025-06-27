const app = require("./app");
const sequelize = require("./config/db");
const PORT = process.env.PORT || 5003;

sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Referral service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });
