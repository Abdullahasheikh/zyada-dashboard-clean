const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

// Webhook: جميع الأحداث + تخزين التوكن من app.store.authorize
app.post("/webhooks/events", async (req, res) => {
  try {
    const { event, merchant, created_at, data } = req.body;
    console.log(`📥 Event received: ${event}`);

    await client.connect();
    const db = client.db("zyada");

    // 📌 التعامل مع حدث التوكن
    if (event === "app.store.authorize") {
      const store_id = Number(merchant);
      const access_token = data?.access_token;

      if (!store_id || !access_token) {
        console.log("❌ Missing store_id or access_token");
        return res.status(400).json({ error: "Missing store_id or access_token" });
      }

      const stores = db.collection("connected_stores");

      await stores.updateOne(
        { store_id },
        {
          $set: {
            store_id,
            access_token,
            refresh_token: data?.refresh_token,
            token_type: data?.token_type,
            connected_at: new Date()
          }
        },
        { upsert: true }
      );

      console.log("✅ Access Token saved for store:", store_id);
    }

    // ✨ تخزين كل الأحداث الأخرى في logs
    const logs = db.collection("webhook_logs");
    await logs.insertOne({
      event,
      merchant,
      created_at: created_at || new Date(),
      data,
      received_at: new Date()
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.sendStatus(500);
  }
});

// API: عرض آخر الأحداث من قاعدة البيانات
app.get("/api/events", async (req, res) => {
  try {
    await client.connect();
    const db = client.db("zyada");
    const logs = db.collection("webhook_logs");

    const events = await logs
      .find({})
      .sort({ received_at: -1 })
      .limit(100)
      .toArray();

    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("🚀 Webhook + MongoDB unified server is running.");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
