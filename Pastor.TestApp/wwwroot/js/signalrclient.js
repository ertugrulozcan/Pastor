var OnMessageSentEventKey = "onMessageSent";
var OnConnectionListChangedEventKey = "onConnectionListChanged";
var OnConnectionOpenedEventKey = "onConnectionOpened";
var OnConnectionClosedEventKey = "onConnectionClosed";

var WhoamiRequestEventKey = "whoami";
var GetClientListRequestEventKey = "getClientList";
var GetOthersRequestEventKey = "getOthers";
var GetConnectionHistoryRequestEventKey = "getConnectionHistory";
var ClearHistoryRequestEventKey = "clearHistory";

var connectionIdSpan;
var signalrUrlInputBox;
var signalrOutputBox;
var signalrConnectButton;
var signalrMessageInputBox;
var signalrSendButton;
var signalrDataTransferTestButton;
var connectionsDropdown;
var connectionsDropdownDiv;

var myConnectionId;
var signalrConnection;

var isConnected = false;

function setIsConnected(isConnected)
{
	this.isConnected = isConnected;
	$("#adminConnectButton").prop( "disabled", this.isConnected);
	
	if (this.isConnected)
	{
		$("#mainConnectionsDiv").css( "visibility", "visible");
	}
	else 
	{
		$("#mainConnectionsDiv").css( "visibility", "hidden");
	}
}

var SignalRModule =
{
    log: function (text)
    {
    	if (signalrOutputBox !== null && signalrOutputBox !== undefined)
        	signalrOutputBox.innerHTML += "<span class='output'>" + "> " + text + "</span><br/>"
    },

    error: function (text)
    {
		if (signalrOutputBox !== null && signalrOutputBox !== undefined)
        	signalrOutputBox.innerHTML += "<span class='output darkred'>" + "> " + text + "</span><br/>"
    },

    success: function (text)
    {
		if (signalrOutputBox !== null && signalrOutputBox !== undefined)
        	signalrOutputBox.innerHTML += "<span class='output green'>" + "> " + text + "</span><br/>"
    }
};

function setConnectionsDropdown(connectionList)
{
	/*
    if (connectionList === null || connectionList === undefined)
    {
        SignalRModule.log("ConnectionList is null.");
    }
    else if (connectionList.length === 0) 
    {
        SignalRModule.log("ConnectionList is empty.");
    }
    else 
    {
        connectionList.forEach(function iterate(connectionId)
        {
            SignalRModule.success(connectionId);    
        });
    }
    */
    
    if (connectionList === null || connectionList === undefined || connectionList.length === 0)
    {
        connectionsDropdown.innerHTML = "<option value=\"-1\" selected=\"selected\">No connection</option>";
        $("#connectionsDropdown" ).prop("disabled", true);
        $("#connectionsDropdownDiv").css("max-width", 230);
    }
    else 
    {
        var otherConnections = [];
        connectionList.forEach(function iterate(connection)
        {
            if (connection.connectionId !== myConnectionId)
                otherConnections.push(connection);
        });

        if (otherConnections.length === 0)
            return;
        
        var optionsHtml = "";
        otherConnections.forEach(function iterate(connection) 
        {
            optionsHtml += "<option value=\"" + connection.connectionId + "\" selected=\"selected\">" + connection.connectionId + "</option>" + "\n";
        });

        connectionsDropdown.innerHTML = optionsHtml;
        $("#connectionsDropdown" ).prop("disabled", false);
        $("#connectionsDropdownDiv").css("max-width", 230);
    }
}

function connectToSignalRServer()
{
	signalrConnection = new signalR.HubConnectionBuilder().withUrl(signalrUrlInputBox.value, { accessTokenFactory: function ()
		{
			return "token";
		}}).build();
	
	signalrConnection.connection.onclose = function (error)
	{
		SignalRModule.error("Connection closed.");
	};
	
	signalrConnection.on(WhoamiRequestEventKey, function (connectionId)
	{
		myConnectionId = connectionId;
		SignalRModule.log("ConnectionId : " + connectionId);
		connectionIdSpan.innerText = "[ID : " + connectionId + "]";
	});
	
	signalrConnection.on(GetOthersRequestEventKey, function (connections)
	{
		setConnectionsDropdown(connections);
	});
	
	signalrConnection.on(OnConnectionListChangedEventKey, function (connections)
	{
		setConnectionsDropdown(connections);
	});
	
	signalrConnection.on(OnMessageSentEventKey, function (messageModel)
	{
		SignalRModule.success("[" + messageModel.senderId + " -> " + messageModel.recepientId + "]" + messageModel.message)
	});
	
	signalrConnection.start()
	.then(function()
	{
		SignalRModule.success("Connected.");
		
		signalrConnection
		.invoke("whoami")
		.catch(function(err)
		{
			SignalRModule.error("Handshaking error. (" + err.toString() + ")");
		});
		
		SignalRModule.log("Handshake request sent.");
		
		signalrConnection
		.invoke("getothers")
		.catch(function(err)
		{
			SignalRModule.error("ConnectionList could not fetched! (" + err.toString() + ")");
		});
	})
	.catch(function(err)
	{
		SignalRModule.error("Connection failed. ");
		SignalRModule.error(err.stack);
		
		return console.error(err.toString());
	});
}

function initializeSignalR()
{
	console.log("SignalR Test Client initializing...");
	
	connectionIdSpan = document.getElementById("connectionIdSpan");
	signalrUrlInputBox = document.getElementById("signalrUrlInputBox");
	signalrOutputBox = document.getElementById("signalrOutputBox");
	signalrConnectButton = document.getElementById("signalrConnectButton");
	signalrMessageInputBox = document.getElementById("signalrMessageInputBox");
	signalrSendButton = document.getElementById("signalrSendButton");
	signalrDataTransferTestButton = document.getElementById("signalrDataTransferTestButton");
	connectionsDropdown = document.getElementById("connectionsDropdown");
	connectionsDropdownDiv = document.getElementById("connectionsDropdownDiv");
	
	setConnectionsDropdown(null);
	
	/*
	// Sayfa acilisinda otomatik baglanmasi icin
	$(document).ready(function()
	{
		connectToSignalRServer();
	});
	*/
	
	signalrConnectButton.addEventListener("click", function (event)
	{
		connectToSignalRServer();
	});
	
	signalrSendButton.addEventListener("click", function (event)
	{
		signalrConnection
		.invoke("Send", signalrMessageInputBox.value, connectionsDropdown.options[connectionsDropdown.selectedIndex].value)
		.catch(function(err)
		{
			SignalRModule.error("Message could not sent!. (" + err.toString() + ")");
		});
	});
	
	/*
	signalrDataTransferTestButton.addEventListener("click", function (event) {
		console.time('Timer');
		for (var i = 0; i <= 10000; i++) {
			signalrConnection.invoke("DataTransferTest", i + " - " + signalrMessageInputBox.value)
		}
		console.timeEnd('Timer');
	});
	*/
}