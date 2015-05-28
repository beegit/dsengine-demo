var DseServer = require("dsengine").Server;
var DseRedis = require("dsengine-db-redis");
var express = require("express");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var USE_DELTA_PATCHING = require("./config").USE_DELTA_PATCHING;
var app = express();

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(morgan("dev"));

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
    db: DseRedis,
    useDeltaPatching: USE_DELTA_PATCHING
  });

  server.initialize(function(err) {
    if (err) {
      return res.status(500).send(err);
    }

    server.receiveEdits(editPacket, function(err, responsePkt) {
      if (err) {
        return res.status(500).send(err);
      }

      res.json(responsePkt);
    });
  })
});

app.listen(3000, function() {
  console.log("Express server listening on port 3000");
});
