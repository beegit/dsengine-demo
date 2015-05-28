var DiffSyncClient = require("dsengine").Client;
var _ = require("lodash");

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
 * Controller for demo to link DiffSyncClient with DOM
 * @param docId
 * @param clientId
 * @constructor
 */
function DSClientController(docId, element, clientId) {
  var client = window[clientId] = new DiffSyncClient({
    transport: new Transport(docId, clientId),
    clientVersion: 0,
    serverVersion: 0,
    doc: "",
    shadow: ""
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
        _this.client.syncing = false;
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
  // we are treating each page session like a new client
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // initialize two clients
  new DSClientController("d1", "client1", String(getRandomInt(1, 10000)));
  new DSClientController("d1", "client2", String(getRandomInt(1, 10000)));
});
