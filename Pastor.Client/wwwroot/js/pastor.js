var OnMessageSentEventKey = "onMessageSent";
var OnConnectionListChangedEventKey = "onConnectionListChanged";
var OnConnectionOpenedEventKey = "onConnectionOpened";
var OnConnectionClosedEventKey = "onConnectionClosed";
var OnServerConsoleStreamEventKey = "onServerConsoleStream";

var WhoamiRequestEventKey = "whoami";
var GetClientListRequestEventKey = "getClientList";
var GetOthersRequestEventKey = "getOthers";
var GetConnectionHistoryRequestEventKey = "getConnectionHistory";
var ClearHistoryRequestEventKey = "clearHistory";

var administrationUrlInputBox;
var loginPanelServerUrlInput;
var adminConnectButton;
var loginPanelConnectButton;
var adminDisconnectButton;
var adminPanelConnectionIdSpan;
var activeConnectionCountSpan;
var closedConnectionCountSpan;
var clearHistoryButton;
var consoleTextBox;
var consoleToggleButton;
var consoleCloseButton;
var testToggleButton;
var testPanelCloseButton;
var testPanelTextBox;
var testPushButton;

var isConsoleOpened = true;
var isTestPanelOpened = false;

var serverUrl = "";
var myConnectionId;
var signalrConnection;

//var connectionList = [["connectionId", "status", "openTime", "closeTime", "forceCloseButton"]];
var connectionList = [];

var IsConnected = false;

function setServerUrl(url)
{
	serverUrl = url;
	$("#administrationUrlInputBox").val(serverUrl);
	$("#loginPanelServerUrlInput").val(serverUrl);
}

function setIsConnected(isConnected)
{
	IsConnected = isConnected;
	
	var connectButton = $("#adminConnectButton");
	var disconnectButton = $("#adminDisconnectButton");
	connectButton.prop( "disabled", IsConnected);
	disconnectButton.prop( "disabled", !IsConnected);
	
	if (IsConnected)
	{
		adminPanelConnectionIdSpan.innerText = myConnectionId;
		
		$(".justLoginVisible").show();
		$(".justLogoutVisible").hide();
	}
	else 
	{
		adminPanelConnectionIdSpan.innerText = "";
		
		$(".justLoginVisible").hide();
		$(".justLogoutVisible").show();
	}
	
	$(".progress-ring").hide();
}

var SignalRModule =
{
    log: function (text)
    {
    	console.log(text);
		if (consoleTextBox !== null && consoleTextBox !== undefined)
			consoleTextBox.innerHTML += "<span class='console'>" + "> " + text + "</span><br/>";
    },

    error: function (text)
    {
		console.error(text);
		if (consoleTextBox !== null && consoleTextBox !== undefined)
			consoleTextBox.innerHTML += "<span class='console error'>" + "> " + text + "</span><br/>";
    },

    success: function (text)
    {
		console.log(text);
		if (consoleTextBox !== null && consoleTextBox !== undefined)
        	consoleTextBox.innerHTML += "<span class='console success'>" + "> " + text + "</span><br/>";
    }
};

function forceCloseConnection(connectionId)
{
	signalrConnection
	.invoke("shutdown", connectionId)
	.catch(function(err)
	{
		SignalRModule.error("Shutdown error. (" + err.toString() + ")");
	});
};

function initializeSignalRAdmin()
{
	administrationUrlInputBox = document.getElementById("administrationUrlInputBox");
	loginPanelServerUrlInput = document.getElementById("loginPanelServerUrlInput");
	adminConnectButton = document.getElementById("adminConnectButton");
	loginPanelConnectButton = document.getElementById("loginPanelConnectButton");
	adminDisconnectButton = document.getElementById("adminDisconnectButton");
	adminPanelConnectionIdSpan = document.getElementById("adminPanelConnectionIdSpan");
	activeConnectionCountSpan = document.getElementById("activeConnectionCountSpan");
	closedConnectionCountSpan = document.getElementById("closedConnectionCountSpan");
	clearHistoryButton = document.getElementById("clearHistoryButton");
	consoleTextBox = document.getElementById("consoleTextBox");
	consoleToggleButton = document.getElementById("consoleToggleButton");
	consoleCloseButton = document.getElementById("consoleCloseButton");
	testToggleButton = document.getElementById("testToggleButton");
	testPanelCloseButton = document.getElementById("testPanelCloseButton");
	testPanelTextBox = document.getElementById("testPanelTextBox");
	testPushButton = document.getElementById("test-push-button");
	
	loginPanelServerUrlInput.addEventListener("keyup", function(event) 
	{
		if (event.keyCode === 13) 
		{
			event.preventDefault();
			loginPanelConnectButton.click();
		}
	});
	
	$(".progress-ring").hide();
	setIsConnected(false);
	closeConsole();
	
	var onConnectionOpened = function (connection)
	{
		connectionList.push(connection);
		loadConnectionList(connectionList);
	};
	
	var onConnectionClosed = function (connection)
	{
		// Remove the closed connection
		connectionList = connectionList.filter(function(item, index, arr)
		{
			return item.connectionId !== connection.connectionId;
		});
		
		connectionList.push(connection);
		loadConnectionList(connectionList);
	};
	
	var calculateConnectionCounts = function (connections)
	{
		var openedConnections = [];
		var closedConnections = [];
		
		connections.forEach(function(connection)
		{
			if (connection.connectionId === myConnectionId)
				return;
			
			if (connection.state === 1) 
				openedConnections.push(connection);
			else if (connection.state === 2)
				closedConnections.push(connection);
		});
		
		var openedConnectionsCount = openedConnections.length;
		activeConnectionCountSpan.innerText = openedConnectionsCount.toString();
		
		var closedConnectionsCount = closedConnections.length;
		closedConnectionCountSpan.innerText = closedConnectionsCount.toString();
	};
	
	var fetchConnectionHistory = function ()
	{
		signalrConnection
		.invoke("getConnectionHistory")
		.catch(function(err)
		{
			SignalRModule.error("Error. (" + err.toString() + ")");
		});
	};
	
	function loginToServer(serverUrl)
	{
		if (signalrConnection === null || signalrConnection === undefined)
		{
			signalrConnection = new signalR.HubConnectionBuilder().withUrl(serverUrl + "?isAdmin=true").build();
			
			signalrConnection.start()
			.then(function()
			{
				connectToAdminServer();
				setServerUrl(serverUrl);
			})
			.catch(function(err)
			{
				SignalRModule.error("Connection failed. ");
				SignalRModule.error(err.stack);
				SignalRModule.error(err.toString());
				
				logout();
				showConsole();
				alert("Connection failed.")
			});
			
			signalrConnection.connection.onclose = function (error)
			{
				logout();
				SignalRModule.error("Server connection lost. (Error : " + error + ")");
				alert("Server connection lost.");
			};
		}
		else
		{
			connectToAdminServer();
		}
	}
	
	function logout()
	{
		setIsConnected(false);
		loadConnectionList([]);
		myConnectionId = null;
		signalrConnection = null;
	}
	
	var loadConnectionList = function (connections)
	{
		connectionList = connections;
		calculateConnectionCounts(connectionList);
		loadTable(connections);
		drawTable();
		loadChart(connections);
	};
	
	var connectToAdminServer = function ()
	{
		signalrConnection.on(WhoamiRequestEventKey, function (connectionId)
		{
			myConnectionId = connectionId;
			SignalRModule.log("AdminConnectionId : " + connectionId);
			
			setIsConnected(true);
			fetchConnectionHistory();
		});
		
		signalrConnection
		.invoke("whoami")
		.catch(function(err)
		{
			SignalRModule.error("Handshaking error. (" + err.toString() + ")");
		});
		
		signalrConnection.on(GetConnectionHistoryRequestEventKey, function (connections)
		{
			loadConnectionList(connections);
		});
		
		signalrConnection.on(ClearHistoryRequestEventKey, function (connections)
		{
			loadConnectionList(connections);
			SignalRModule.log("Connection history cleared.");
		});
		
		signalrConnection.on(OnConnectionOpenedEventKey, function (connection)
		{
			SignalRModule.success("[" + connection.connectionId + "] connected.");
			//fetchConnectionHistory();
			onConnectionOpened(connection);
		});
		
		signalrConnection.on(OnConnectionClosedEventKey, function (connection)
		{
			var hiddenRowIdentifier = $('#connections-table').find('#row_' + connection.connectionId);
			var row = hiddenRowIdentifier.parent().parent();
			row.css({"background": "red"});
			SignalRModule.error("[" + connection.connectionId + "] connection closed.");
			
			//fetchConnectionHistory();
			onConnectionClosed(connection);
		});
		
		signalrConnection.on(OnServerConsoleStreamEventKey, function (line)
		{
			SignalRModule.log(line);
		});
	};
	
	loginPanelConnectButton.addEventListener("click", function (event)
	{
		$(".progress-ring").show();
		loginToServer(loginPanelServerUrlInput.value);
	});
	
	adminConnectButton.addEventListener("click", function (event)
	{
		loginToServer(administrationUrlInputBox.value);
	});
	
	adminDisconnectButton.addEventListener("click", function (event)
	{
		signalrConnection.stop()
		.then(function()
		{
			logout();
			
			SignalRModule.success("Disconnected. ");
		})
		.catch(function(err)
		{
			SignalRModule.error("Disconnection failed. ");
			SignalRModule.error(err.stack);
			SignalRModule.error(err.toString());
		});
	});
	
	clearHistoryButton.addEventListener("click", function (event)
	{
		signalrConnection
		.invoke("clearhistory")
		.catch(function(err)
		{
			SignalRModule.error("Clear history error. (" + err.toString() + ")");
		});
	});
	
	function showConsole()
	{
		$('.consoleDiv').css('visibility', 'visible');
		isConsoleOpened = true;
	}
	
	function closeConsole()
	{
		$('.consoleDiv').css('visibility', 'hidden');
		isConsoleOpened = false;
	}
	
	function showTestPanel()
	{
		$('.testPanelDiv').css('visibility', 'visible');
		isTestPanelOpened = true;
	}
	
	function closeTestPanel()
	{
		$('.testPanelDiv').css('visibility', 'hidden');
		isTestPanelOpened = false;
	}
	
	consoleToggleButton.addEventListener("click", function (event)
	{
		if (isConsoleOpened) 
			closeConsole();
		else
			showConsole();
	});
	
	consoleCloseButton.addEventListener("click", function (event)
	{
		closeConsole();
	});
	
	testPanelCloseButton.addEventListener("click", function (event)
	{
		closeTestPanel();
	});
	
	testToggleButton.addEventListener("click", function (event)
	{
		if (isTestPanelOpened)
			closeTestPanel();
		else
			showTestPanel();
	});
	
	testPushButton.addEventListener("click", function (event)
	{
		var json = testPanelTextBox.value;
		
		if (signalrConnection !== null && signalrConnection !== undefined)
		{
			signalrConnection
			.invoke("BroadcastLiveMatchEvent", json)
			.catch(function(err)
			{
				SignalRModule.error("Error. (" + err.toString() + ")");
			});
		}
		else
		{
			SignalRModule.error("Error. (SignalR connection instance is null!)");
		}
	});
}