var connectionItemsSource = [];

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

var clearConnectionItemsSource = function ()
{
	//connectionList = [["connectionId", "status", "openTime", "closeTime", "forceCloseButton"]];
	connectionItemsSource = [];
};

var loadTable = function (connections)
{
	clearConnectionItemsSource();
	
	connections.forEach(function(connection)
	{
		if (connection.connectionId === myConnectionId)
			return;
		
		var row = inflateConnectionRow(connection);
		connectionItemsSource.push(row);
	});
};

var inflateConnectionRow = function (connection)
{
	var row = [];
	row.push([connection.connectionId, connection.clientInformations]);
	row.push(connection.state === 1 ? "Open" : "Closed");
	row.push(formatDate(connection.openTime));
	row.push(formatDate(connection.closeTime));
	row.push({ connectionId : connection.connectionId, status : connection.state });
	
	return row;
};

var drawTable = function ()
{
	if (window.table !== null && window.table !== undefined)
	{
		window.table.dispose();
		window.table = null;
	}
	
	//var connectionList = [["connectionId", "status", "openTime", "closeTime", "forceCloseButton"]];
	var connectionsDataSource = [["connectionId", "status", "openTime", "closeTime", "forceCloseButton"]].concat(connectionItemsSource);
	
	var table = window.table = new KingTable(
		{
			id: "connections-table",
			idProperty: "connectionId",
			data: connectionsDataSource,
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