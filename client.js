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
function DSClientController(docId, clientId) {
  var client = window[clientId] = new DiffSyncClient({
    transport: new Transport(docId, clientId),
    clientVersion: 0,
    serverVersion: 0,
    contents: "",
    shadow: ""
  });

  this.$button = $("#" + clientId + "-button");
  this.$input = $("#" + clientId + "-textarea");
  this.$packetList = $("#" + clientId + "-packetList");

  this.client = client;

  this.$button.on("click", this.startSync.bind(this));

  this.startSync();
}

/**
 * Called to start sync process with server
 */
DSClientController.prototype.startSync = function() {
  this.client.startSync(this.$input.val())
    .then(this.updateClient.bind(this));
};
/**
 * Called when server responds from sync
 * @param editPacket
 */
DSClientController.prototype.updateClient = function(editPacket) {
    this.client.receiveEdits(editPacket);
    this.$packetList
      .append(
      "<li class='list-group-item'><pre>" +
        JSON.stringify(editPacket, null, 4) +
      "</pre></li>");
    this.$input.val(this.client.clientData.contents);
};

$(document).ready(function() {

  // initialize two clients
  new DSClientController("d1", "client1");
  new DSClientController("d1", "client2");
});
