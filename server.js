import dotenv from "dotenv";
import cron from "node-cron";
import app from "./app.js";
import SendBusinessesMoney from "./services/SendBusinessesMoney.js";

dotenv.config();

const port = process.env.PORT || 5600;

cron.schedule("0 0 1 * *", async () => {
  await SendBusinessesMoney();
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
