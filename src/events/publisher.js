const amqp = require("amqplib");

class EventPublisher {
  constructor() {
    this.channel = null;
  }

  async connect() {
    const connection = await amqp.connect("amqp://guest:guest@127.0.0.1:5672");
    this.channel = await connection.createChannel();
  }

  async publish(queue, data) {
    if (!this.channel) await this.connect();
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
  }
}

module.exports = new EventPublisher();
