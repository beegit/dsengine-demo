var DseClient = require("dsengine").Client;
var _ = require("lodash");
var USE_DELTA_PATCHING = require("./config.js").USE_DELTA_PATCHING;

/**
 * Transport for DSClientController's
 * @param docId document id
 * @param clientId client id
 * @constructor
 */
function Transport(docId, clientId) {
  this.docId = docId;
  this.clientId = clientId;
}

/**
 * called by clientData to sync with server
 * @param editPacket
 * @returns {*}
 */
Transport.prototype.send = function(editPacket) {
  return $.ajax({
    url: "/sync",
    method: "POST",
    dataType: "json",
    contentType: "application/json",
    timeout: 3000,
    data: JSON.stringify({
      docId: this.docId,
      clientId: this.clientId,
      editPacket: {
        v: editPacket.v,
        editStack: editPacket.editStack
      }
    })
  });
};

/**
 * Controller for demo to link DseClient with DOM
 * @param docId
 * @param clientId
 * @constructor
 */
function DSClientController(docId, element, clientId) {
  var client = window[clientId] = new DseClient({
    transport: new Transport(docId, clientId),
    doc: "",
    useDeltaPatching: USE_DELTA_PATCHING
  });

  this.$button = $("#" + element + "-button");
  this.$input = $("#" + element + "-textarea");
  this.$packetList = $("#" + element + "-packetList");
  this.client = client;
  this.$button.on("click", this.sync.bind(this));
  this.sync();
}

DSClientController.prototype.log = function(line, level) {
  level = (level || "info");

  if (level != "info") {
    level = "alert-" + level;
  }

  var logLine =
    "<li class='list-group-item " + level + "'>" + line + "</li>";

  this.$packetList.prepend(logLine);
};

DSClientController.prototype.logCode = function(line) {
  this.log("<pre>" + line + "</pre>");
};

DSClientController.prototype.logWarning = function(line) {
  this.log(line, "warning");
};

DSClientController.prototype.logError = function(line) {
  this.log(line, "error");
};

/**
 * Called to start sync process with server
 */
DSClientController.prototype.sync = function() {
  var _this = this;
  var promise = this.client.startSync(this.$input.val());

  if (promise) {
    _this.log("Syncing client " + _this.client.transport.clientId + "...");
    promise.then(this.updateClient.bind(this))
      .fail(function(xhr, textStatus) {
        _this.client.syncFailed();
        if (textStatus === "timeout") {
          console.warn("Timeout", xhr, textStatus);
          _this.logWarning("Timeout");
        }
      });
  }
};

/**
 * Called when server responds from sync
 * @param editPacket
 */
DSClientController.prototype.updateClient = function(editPacket) {
  this.client.receiveEdits(editPacket);

  this.logCode(JSON.stringify(editPacket, null, 4));
  this.$input.val(this.client.shadow.doc);
};

$(document).ready(function() {
  var clientIds = [];

  function getRandomIntInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getClientId() {
    var min = 1;
    var max = 10000;
    var id = getRandomIntInclusive(min, max);

    while (_.contains(clientIds, id)) {
      id = getRandomIntInclusive(min, max);
    }

    clientIds.push(id);
    return id;
  }

  // initialize two clients, we are treating each page session like a new client
  var client1 = new DSClientController("d1", "client1", String(getClientId()));
  var client2 = new DSClientController("d1", "client2", String(getClientId()));

  $("#updateSettings").click(function() {
    [client1, client2].forEach(function(client) {
      client.log("Updating packet loss settings...");
    });

    return $.ajax({
      url: "/pktloss",
      method: "PUT",
      dataType: "json",
      contentType: "application/json",
      data: JSON.stringify({
        clientToServerPktLoss: $("#clientToServerPktLoss").val(),
        serverToClientPktLoss: $("#serverToClientPktLoss").val()
      })
    })
      .done(function(data) {
        [client1, client2].forEach(function(client) {
          client.logCode(JSON.stringify(data));
        });
      })
      .fail(function() {
        [client1, client2].forEach(function(client) {
          client.logError("Update failed");
        });
      });
  });
});
