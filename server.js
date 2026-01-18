const express = require("express");
const http = require("http");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { Room } = require("colyseus");

class ForestRoom extends Room {
  onCreate() {
    this.maxClients = 20;

    // حالة بسيطة داخل السيرفر
    this.players = {}; // id -> data
    this.seed = Math.floor(Math.random() * 1e9);

    // تحديث حركة لاعب
    this.onMessage("u", (client, d) => {
      const p = this.players[client.sessionId];
      if (!p) return;

      p.x = d.x; p.y = d.y; p.z = d.z;
      p.ry = d.ry;
      p.r = d.r || 0;
      p.l = d.l || 0;
      p.k = d.k || 0;

      // بث للجميع (خفيف)
      this.broadcast("p", { id: client.sessionId, ...p }, { except: client });
    });
  }

  onJoin(client) {
    this.players[client.sessionId] = { x:0, y:0, z:0, ry:0, r:0, l:0, k:0 };

    // أرسل seed + حالتك + كل اللاعبين الموجودين
    client.send("hello", {
      you: client.sessionId,
      seed: this.seed,
      players: this.players
    });

    // بلغ الكل بلاعب جديد
    this.broadcast("join", { id: client.sessionId }, { except: client });
  }

  onLeave(client) {
    delete this.players[client.sessionId];
    this.broadcast("leave", { id: client.sessionId });
  }
}

const app = express();

// CORS مهم للمتصفح (خصوصًا على Render)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (_, res) => res.send("OK"));

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});
gameServer.define("forest", ForestRoom);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
