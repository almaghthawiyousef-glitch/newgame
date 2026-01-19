const express = require("express");
const http = require("http");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { Room } = require("colyseus");

class ForestRoom extends Room {
  onCreate() {
    this.maxClients = 20;
    this.players = {}; // id -> data
    this.seed = Math.floor(Math.random() * 1e9);

    // الحل: مرر دالة فارغة لـ setSimulationInterval
    this.setSimulationInterval((deltaTime) => {
      // فارغة حالياً – يمكنك إضافة منطق server-side لاحقاً
    }, 1000 / 30);

    // كل الـ onMessage يجب أن تكون داخل onCreate
    this.onMessage("u", (client, d) => {
      const p = this.players[client.sessionId];
      if (!p) return;

      p.x = d.x ?? p.x;
      p.y = d.y ?? p.y;
      p.z = d.z ?? p.z;
      p.ry = d.ry ?? p.ry;
      p.r = d.r ?? 0;
      p.l = d.l ?? 0;
      p.k = d.k ?? 0;
      p.a = d.a || "idle";

      // بث للجميع ما عدا المرسل
      this.broadcast("p", {
        id: client.sessionId,
        x: p.x, y: p.y, z: p.z,
        ry: p.ry,
        r: p.r,
        l: p.l,
        k: p.k,
        a: p.a
      }, { except: client });
    });
  }

  onJoin(client) {
    this.players[client.sessionId] = {
      x: 0, y: 0.9, z: -25,
      ry: 0,
      r: 0,
      l: 0,
      k: 0,
      a: "idle"
    };

    client.send("hello", {
      you: client.sessionId,
      seed: this.seed,
      players: this.players
    });

    this.broadcast("join", { id: client.sessionId }, { except: client });
  }

  onLeave(client) {
    delete this.players[client.sessionId];
    this.broadcast("leave", { id: client.sessionId });
  }
}

const app = express();

// CORS – مهم جدًا على Render
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
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is listening on http://0.0.0.0:${PORT}`);
});
