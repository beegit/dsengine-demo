var DiffSyncClient = require("dsengine").Client;
var _ = require("lodash");



$(document).ready(function() {
  var client1 = new DiffSyncClient({
    transport: {
      send: function(editPacket) {
        return $.ajax({
          url: "/sync",
          method: "POST",
          dataType: "json",
          data: JSON.stringify({
            docId: "1",
            clientId: "abc",
            editPacket: {
              clientVersion: editPacket.clientVersion,
              serverVersion: editPacket.serverVersion,
              editStack: editPacket.editStack
            }
          }),
          contentType: "application/json",
        });
      }
    },
    clientVersion: 0,
    serverVersion: 0,
    contents: "",
    shadow: ""
  });

  $("#syncClient1").on("click", function() {
    client1.startSync($("#client1").val())
      .then(function(editPacket) {
        client1.receiveEdits(editPacket);
      });
  });

  var client2 = new DiffSyncClient({
    transport: {
      send: function(editPacket) {
        return $.ajax({
          url: "/sync",
          method: "POST",
          dataType: "json",
          data: JSON.stringify({
            docId: "1",
            clientId: "defg",
            editPacket: {
              clientVersion: editPacket.clientVersion,
              serverVersion: editPacket.serverVersion,
              editStack: editPacket.editStack
            }
          }),
          contentType: "application/json",
        });
      }
    },
    clientVersion: 0,
    serverVersion: 0,
    contents: "",
    shadow: ""
  });

  $("#syncClient2").on("click", function() {
    client2.startSync($("#client2").val())
      .then(function(editPacket) {
        client2.receiveEdits(editPacket);
      });
  });

  console.log("hello, world!");
});
