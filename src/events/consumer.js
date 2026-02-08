const amqp = require("amqplib");
const Account = require("../modules/finance/accounts.model");
const Snapshot = require("../modules/analytics/snapshot.model");
const Budget = require("../modules/finance/budget.model");

class EventConsumer {
  constructor() {
    this.channel = null;
  }

  async connect() {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost"
    );
    this.channel = await connection.createChannel();
  }

  async consume(queue) {
    if (!this.channel) await this.connect();
    await this.channel.assertQueue(queue, { durable: true });

    console.log(`[*] Waiting for messages in ${queue}...`);
    this.channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        try {
          await this.handleTransactionEvent(data);
          this.channel.ack(msg);
        } catch (err) {
          console.error("Error handling event:", err);
          this.channel.nack(msg, false, true); // requeue
        }
      }
    });
  }

  async handleTransactionEvent(data) {
    const { userId, transactionId, amount, type, accountId, categoryId } = data;
    console.log(data);

    // 1️⃣ Update account balance
    const account = await Account.findById(accountId);
    if (!account) throw new Error("Account not found");

    if (type === "INCOME") account.currentBalance += amount;
    else if (type === "EXPENSE") account.currentBalance -= amount;
    await account.save();

    // 2️⃣ Update snapshot for analytics
    // Example: increment monthly totals
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    let snapshot = await Snapshot.findOne({ userId, month });
    if (!snapshot) {
      snapshot = new Snapshot({
        userId,
        month,
        totalIncome: 0,
        totalExpense: 0,
      });
    }
    if (type === "INCOME") snapshot.totalIncome += amount;
    else if (type === "EXPENSE") snapshot.totalExpense += amount;
    await snapshot.save();

    // 3️⃣ Check budgets
    // const budget = await Budget.findOne({ userId, categoryId, month });
    // if (budget && type === "EXPENSE") {
    // //   budget.spent += amount;
    // //   if (budget.spent > budget.limit) {
    // //     console.log(`[ALERT] Budget exceeded for category ${categoryId}`);
    // //   }
    //   await budget.save();
    // }

    // 4️⃣ TODO: handle savings contributions if needed
  }
}

module.exports = new EventConsumer();
