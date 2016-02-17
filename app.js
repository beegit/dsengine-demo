var DseServer = require("dsengine").Server;
var DseRedis = require("dsengine-db-redis");
var express = require("express");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var REDIS_PORT = process.env.REDIS_PORT || 6379;
var REDIS_HOST = process.env.REDIS_HOST || "localhost";
var REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
var SIMULATE_CLIENT_TO_SRV_LOSS = 0;  // 0 to 100 for pkt loss %
var SIMULATE_SRV_TO_CLIENT_LOSS = 0;  // 0 to 100 for pkt loss %
var USE_DELTA_PATCHING = require("./config").USE_DELTA_PATCHING;
var app = express();
var redis = require("redis").createClient(REDIS_PORT, REDIS_HOST, {
  auth_pass: REDIS_PASSWORD,
  retry_max_delay: 2000
}).on("connect", function() {
  console.log("[Redis] Connected to server.");
}).on("reconnecting", function(retry) {
  console.log("[Redis] Reconnecting...", retry);
}).on("error", function() {
  console.log("[Redis] Error", arguments);
});

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulateLostPacket(lossPercent) {
  if (lossPercent === 0) {
    return false;
  }
  if (lossPercent === 100) {
    return true;
  }

  var randomLoss = getRandomIntInclusive(1, 99);
  return lossPercent <= randomLoss;
}

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(morgan("dev"));

app.put("/pktloss", function(req, res) {
  if (req.body.clientToServerPktLoss) {
    SIMULATE_CLIENT_TO_SRV_LOSS = Number(req.body.clientToServerPktLoss);
  }
  if (req.body.serverToClientPktLoss) {
    SIMULATE_SRV_TO_CLIENT_LOSS = Number(req.body.serverToClientPktLoss);
  }
  res.status(200).json({
    clientToServerPktLoss: SIMULATE_CLIENT_TO_SRV_LOSS,
    serverToClientPktLoss: SIMULATE_SRV_TO_CLIENT_LOSS
  });
});

app.post("/sync", function(req, res) {
  var docId = req.body.docId;
  var clientId = req.body.clientId;
  var editPacket = req.body.editPacket;

  if (!docId || !clientId) {
    return res.status(400).send();
  }

  var server = new DseServer({
    docId: docId,
    clientId: clientId,
    client: redis,
    db: DseRedis,
    useDeltaPatching: USE_DELTA_PATCHING
  });

  // Simulate client-to-server packet loss
  if (simulateLostPacket(SIMULATE_CLIENT_TO_SRV_LOSS)) {
    return;
  }

  server.receiveEdits(editPacket, function(err) {
    // Simulate server-to-client packet loss
    if (simulateLostPacket(SIMULATE_SRV_TO_CLIENT_LOSS)) {
      return;
    }
    if (err) {
      return res.status(500).send(err);
    }

    server.generateResponse(function(err, responsePkt) {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(responsePkt);
    });
  });
});

app.listen(3000, function() {
  console.log("Express server listening on port 3000");
});
