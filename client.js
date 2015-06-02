var DseClient = require("dsengine").Client;
var _ = require("lodash");
var USE_DELTA_PATCHING = require("./config.js").USE_DELTA_PATCHING;

function LogFactory($el) {
  return function(options) {
    options = (options || {});
    options.title = (options.title || "Unknown operation");
    options.level = (options.level || "info");

    if (options.level != "info") {
      options.level = "alert-" + options.level;
    }

    var logLine = "<li class='list-group-item " + options.level + "'>";
    if(options.detail) {
      logLine += "<button class='toggle pull-right'>Toggle Details</button>";
    }

    logLine += "<h5>" + options.title + "</h5>";

    if (options.detail) {
      logLine += "<pre class='collapse well'>" + options.detail + "</pre>";
    }
    logLine += "</li>";

    var $log = $(logLine);
    $log.on("click", ".toggle", function(e) {
      $(e.target).siblings(".collapse").toggleClass("in");
    });
    $el.prepend($log);
  }
}


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
  this.log = LogFactory($("#" + element + "-packetList"));
  this.client = client;
  this.$button.on("click", this.sync.bind(this));
  this.sync();
}

DSClientController.prototype.logInfo = function(line) {
  this.log({ level: "info", title: line });
};

DSClientController.prototype.logWarning = function(line) {
  this.log({ level: "warning", title: line });
};

DSClientController.prototype.logError = function(line) {
  this.log({ level: "error", title: line });
};

DSClientController.prototype.logResponse = function(title, response) {
  this.log({ level: "success", title: title, detail: response });
};

/**
 * Called to start sync process with server
 */
DSClientController.prototype.sync = function() {
  var _this = this;
  var promise = this.client.startSync(this.$input.val());

  if (promise) {
    _this.logInfo("Syncing client " + _this.client.transport.clientId + "...");

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

  this.logResponse("Sync response", JSON.stringify(editPacket, null, 4));
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
  var client1 = window.client1 = new DSClientController("d1", "client1", String(getClientId()));
  var client2 = window.client2 = new DSClientController("d1", "client2", String(getClientId()));

  $("#updateSettings").click(function() {
    [client1, client2].forEach(function(client) {
      client.logInfo("Updating packet loss settings...");
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
          client.logResponse("Update settings response", JSON.stringify(data));
        });
      })
      .fail(function() {
        [client1, client2].forEach(function(client) {
          client.logError("Update failed");
        });
      });
  });
});
