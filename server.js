const express = require("express");
const http = require("http");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { Room } = require("colyseus");

class ForestRoom extends Room {
  onCreate() {
    this.maxClients = 10;

    this.setState({
      seed: Math.floor(Math.random() * 1e9),
      players: {}
    });

    this.onMessage("u", (client, d) => {
      const p = this.state.players[client.sessionId];
      if (!p) return;
      Object.assign(p, d);
    });
  }

  onJoin(client) {
    this.state.players[client.sessionId] = {
      x:0,y:0,z:0, ry:0,
      m:0,r:0,l:0,k:0
    };
    client.send("seed", { seed: this.state.seed });
  }

  onLeave(client) {
    delete this.state.players[client.sessionId];
  }
}

const app = express();
const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});
gameServer.define("forest", ForestRoom);

// مهم جدًا لـ Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on", PORT));
