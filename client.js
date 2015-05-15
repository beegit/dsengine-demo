var DiffSyncClient = require("dsengine").Client;
var _ = require("lodash");

$(document).ready(function() {
  var client1 = window.client1 = new DiffSyncClient({
    transport: {
      send: function(editPacket) {
        return $.ajax({
          url: "/sync",
          method: "POST",
          dataType: "json",
          data: JSON.stringify({
            docId: "d1",
            clientId: "c1",
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
        console.info("Setting client1 contents", client1.clientData.contents);
        $("#client1").val(client1.clientData.contents);
      });
  });

  var client2 = window.client2 = new DiffSyncClient({
    transport: {
      send: function(editPacket) {
        return $.ajax({
          url: "/sync",
          method: "POST",
          dataType: "json",
          data: JSON.stringify({
            docId: "d1",
            clientId: "c2",
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
        console.info("Setting client2 contents", client2.clientData.contents);
        $("#client2").val(client2.clientData.contents);
      });
  });
});
