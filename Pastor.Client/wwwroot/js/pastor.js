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

var isConsoleOpened = true;

var serverUrl = "";
var myConnectionId;
var signalrConnection;

var connectionList = [["connectionId", "status", "openTime", "closeTime", "forceCloseButton"]];

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
	
	var getStatusColor = function (status)
	{
		if (status === "Open")
			return "#22CC44";
		else if (status === "Closed")
			return "#CC2244";
		else
			return "#252525";
	};
	
	var generateConnectionInfoHtml = function (connectionInfoDict)
	{
		if (connectionInfoDict === null) 
		{
			return "<ul>" + "</ul>";
		}
		
		var keys = Object.keys(connectionInfoDict);
		var listHtml = "";
		keys.forEach(function iterate(key)
		{
			listHtml += "<li>" + "<span style='font-weight: bold; margin-right: 5px;'>" + key + "   :   " + "</span>" + "<span style='font-family: Consolas;'>" + connectionInfoDict[key] + "</span>" + "</li>";
		});
		
		return "<ul>" + listHtml + "</ul>";
	};
	
	var clearConnectionList = function ()
	{
		connectionList = [["connectionId", "status", "openTime", "closeTime", "forceCloseButton"]];
	};
	
	var loadConnectionList = function (connections)
	{
		clearConnectionList();
		
		connections.forEach(function(connection)
		{
			if (connection.connectionId === myConnectionId)
				return;
			
			var row = [];
			row.push([connection.connectionId, connection.clientInformations]);
			row.push(connection.state === 1 ? "Open" : "Closed");
			row.push(formatDate(connection.openTime));
			row.push(formatDate(connection.closeTime));
			row.push({ connectionId : connection.connectionId, status : connection.state });
			
			connectionList.push(row);
		});
		
		calculateConnectionCounts(connections);
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
	
	var drawTable = function ()
	{
		if (window.table !== null && window.table !== undefined)
		{
			window.table.dispose();
			window.table = null;
		}
		
		var table = window.table = new KingTable(
		{
			id: "connections-table",
			idProperty: "connectionId",
			data: connectionList,
			caption: "Connections",
			element: document.getElementById("tableDiv"),
			columns:
			{
				connectionId:
				{
					name: "Connection ID",
					html: function (item, value)
					{
						try
						{
							var connectionId = value[0];
							var clientInformations = generateConnectionInfoHtml(value[1]);
							return "<a href=\"#\" id='popoverLink' title=\"Client Informations\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" data-content=\"" + clientInformations + "\">" + "<span style='font-family: Consolas'>" + connectionId + "</span>" + "</a>";	
						}
						catch (ex)
						{
							return "<a href=\"#\" id='popoverLink' title=\"Client Informations\" data-toggle=\"popover\" data-trigger=\"focus\" data-html=\"true\" data-content=\"" + "<span style='color: red;'>" + ex.stackTrace + "</span>" + "\">" + "<span style='font-family: Consolas'>" + connectionId + "</span>" + "</a>";
						}
					}
				},
				status:
				{
					name: "Status",
					html: function (item, value)
					{
						try
						{
							return "<span class=\"kt-color\" style=\"background-color:" + getStatusColor(value) + "\"></span><span class=\"kt-color-hex\">" + this.highlight(value) + "</span>";
						}
						catch (ex)
						{
							return "<span class=\"kt-color\" style=\"background-color:" + "#000000" + "\"></span><span class=\"kt-color-hex\">" + "#000000" + "</span>";
						}
					},
					type: "foo"
				},
				openTime: "Start Time",
				closeTime: "Close Time",
				forceCloseButton:
				{
					name: "",
					html: function (item, value)
					{
						try
						{
							if (value.status === 1)
								return "<div id='" + "row_" + value.connectionId + "'>" + "<button id='" + value.connectionId + "' onclick='forceCloseConnection(this.id)'>Close</button>" + "</div>";
							else
								return "<div id='" + "row_" + value.connectionId + "'>" + "</div>";
						}
						catch (ex)
						{
							return "<div id='" + "row_" + value.connectionId + "'>" + "<span style='color: red;'>" + ex.stackTrace + "</span>" + "</div>";
						}
					}
				}
			}
		});
		
		table.render();
		
		$(document).ready(function()
		{
			$('[data-toggle="popover"]').popover();
			$('a#popoverLink').on('click', function(e) { e.preventDefault(); return true; });
		});
	};
	
	function formatDate(date)
	{
		if (date === null || date === undefined)
			return "";
		
		try
		{
			return new Date(date).toISOString();
		}
		catch (e)
		{
			SignalRModule.error(e.stackTrace);
			return "";
		}
	}
	
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
		}
		else
		{
			connectToAdminServer();
		}
	}
	
	function logout()
	{
		setIsConnected(false);
		
		clearConnectionList();
		loadConnectionList(connectionList);
		drawTable();
		loadChart(connectionList);
		
		myConnectionId = null;
		signalrConnection = null;
	}
	
	var connectToAdminServer = function ()
	{
		signalrConnection.on(WhoamiRequestEventKey, function (connectionId)
		{
			myConnectionId = connectionId;
			SignalRModule.log("AdminConnectionId : " + connectionId);
			
			setIsConnected(true);
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
			drawTable();
			loadChart(connections);
		});
		
		signalrConnection.on(ClearHistoryRequestEventKey, function (connections)
		{
			loadConnectionList(connections);
			drawTable();
			loadChart(connections);
			SignalRModule.log("Connection history cleared.");
		});
		
		signalrConnection.on(OnConnectionOpenedEventKey, function (connectionId)
		{
			SignalRModule.success("[" + connectionId + "] connected.");
			fetchConnectionHistory();
		});
		
		signalrConnection.on(OnConnectionClosedEventKey, function (connectionId)
		{
			var hiddenRowIdentifier = $('#connections-table').find('#row_' + connectionId);
			var row = hiddenRowIdentifier.parent().parent();
			row.css({"background": "red"});
			SignalRModule.error("[" + connectionId + "] connection closed.");
			
			fetchConnectionHistory();
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
}