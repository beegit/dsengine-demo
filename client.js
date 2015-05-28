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
    data: JSON.stringify({
      docId: this.docId,
      clientId: this.clientId,
      editPacket: {
        clientVersion: editPacket.clientVersion,
        serverVersion: editPacket.serverVersion,
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
    clientVersion: 0,
    serverVersion: 0,
    doc: "",
    shadow: "",
    useDeltaPatching: USE_DELTA_PATCHING
  });

  this.$button = $("#" + element + "-button");
  this.$input = $("#" + element + "-textarea");
  this.$packetList = $("#" + element + "-packetList");
  this.client = client;
  this.$button.on("click", this.startSync.bind(this));
  this.startSync();
}

/**
 * Called to start sync process with server
 */
DSClientController.prototype.startSync = function() {
  var _this = this;
  var promise = this.client.startSync(this.$input.val());

  if (promise) {
    promise.then(this.updateClient.bind(this))
      .fail(function() {
        _this.client.syncFailed();
      });
  }
};

/**
 * Called when server responds from sync
 * @param editPacket
 */
DSClientController.prototype.updateClient = function(editPacket) {
  this.client.receiveEdits(editPacket);

  this.$packetList.prepend(
    "<li class='list-group-item'><pre>" +
      JSON.stringify(editPacket, null, 4) +
    "</pre></li>");

  this.$input.val(this.client.shadow.doc);
};

$(document).ready(function() {
  var clientIds = [];

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getClientId() {
    var min = 1;
    var max = 10000;
    var id = getRandomInt(min, max);

    while (_.contains(clientIds, id)) {
      id = getRandomInt(min, max);
    }

    clientIds.push(id);
    return id;
  }

  // initialize two clients, we are treating each page session like a new client
  new DSClientController("d1", "client1", String(getClientId()));
  new DSClientController("d1", "client2", String(getClientId()));
});
