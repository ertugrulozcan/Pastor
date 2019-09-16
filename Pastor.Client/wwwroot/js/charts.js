var materialChart;
var connectionsDataModel = 
	{ 
		connectionList: [],
		activeConnectionCount: 0,
		closedStartConnectionCount: 0, 
		closedConnectionCount: 0,
		minAxisTime: new Date(),
		maxAxisTime: new Date()
	};

function dateToMinuteResolution(date)
{
	return (new Date((new Date(date)).setSeconds(0))).setMilliseconds(0);
}

function dateToSecondsResolution(date)
{
	return (new Date(date)).setMilliseconds(0);
}

function differentToTimeSpan(datetime1, datetime2)
{
	var totalMilliseconds = Math.abs(datetime1 - datetime2);
	return convertToTimeSpan(totalMilliseconds);
}

function convertToTimeSpan(totalMilliseconds)
{
	var milliSeconds = totalMilliseconds - Math.floor(totalMilliseconds / 1000) * 1000;
	
	var totalSeconds = (totalMilliseconds - milliSeconds) / 1000;
	var seconds = totalSeconds - Math.floor(totalSeconds / 60) * 60;
	
	var totalMinutes = (totalSeconds - seconds) / 60;
	var minutes = totalMinutes - Math.floor(totalMinutes / 60) * 60;
	
	var totalHours = (totalMinutes - minutes) / 60;
	var hours = totalHours - Math.floor(totalHours / 60) * 60;
	
	var totalDays = (totalHours - hours) / 24;
	var days = totalDays - Math.floor(totalDays / 24) * 24;
	
	return {
		totalMilliseconds : totalMilliseconds,
		milliSeconds : milliSeconds,
		totalSeconds : totalSeconds,
		seconds : seconds,
		totalMinutes : totalMinutes,
		minutes : minutes,
		totalHours : totalHours,
		hours : hours,
		totalDays : totalDays,
		days : days
	}
}

function timeSpanToString(timeSpan)
{
	var daysPart = timeSpan.days > 0 ? timeSpan.days + " days, " : "";
	var hoursPart = timeSpan.hours < 10 ? "0" + timeSpan.hours : timeSpan.hours;
	var minutesPart = timeSpan.minutes < 10 ? "0" + timeSpan.minutes : timeSpan.minutes;
	var secondsPart = timeSpan.seconds < 10 ? "0" + timeSpan.seconds : timeSpan.seconds;
	
	var milliSecondsPart = "";
	if (timeSpan.milliSeconds < 10)
		milliSecondsPart = "000" + timeSpan.milliSeconds;
	else if (timeSpan.milliSeconds < 100)
		milliSecondsPart = "00" + timeSpan.milliSeconds;
	else if (timeSpan.milliSeconds < 1000)
		milliSecondsPart = "0" + timeSpan.milliSeconds;
	else
		milliSecondsPart = "" + timeSpan.milliSeconds;
	
	return daysPart + hoursPart + ":" + minutesPart + ":" + secondsPart + "." + milliSecondsPart;
}

function inflateTimeRangeByPercent(datetime, timespan, percent)
{
	if (timespan.days > 0) 
	{
		
	}
}

function loadChartData(connections)
{
	var timeSeries = {};
	connections.forEach(function iterate(connection)
	{
		if (connection.connectionId === myConnectionId)
			return;
		
		if (connection.state === 1)
		{
			if (!!connection.openTime)
			{
				var time1 = dateToSecondsResolution(connection.openTime);
				if (timeSeries[time1] === undefined)
					timeSeries[time1] = { activeConnections: [], closedStartConnections: [], closedConnections: [] };
				
				timeSeries[time1].activeConnections.push(connection);
			}
		}
		else if (connection.state === 2)
		{
			if (!!connection.openTime)
			{
				var time2 = dateToSecondsResolution(connection.openTime);
				if (timeSeries[time2] === undefined)
					timeSeries[time2] = { activeConnections: [], closedStartConnections: [], closedConnections: [] };
				
				timeSeries[time2].closedStartConnections.push(connection);
			}
			
			if (!!connection.closeTime)
			{
				var time3 = dateToSecondsResolution(connection.closeTime);
				if (timeSeries[time3] === undefined)
					timeSeries[time3] = { activeConnections: [], closedStartConnections: [], closedConnections: [] };
				
				timeSeries[time3].closedConnections.push(connection);
			}
		}
	});
	
	var dataTable = new google.visualization.DataTable();
	
	dataTable.addColumn('datetime', 'Time');
	dataTable.addColumn({'type': 'string', 'role': 'tooltip', 'p': { 'html': true }});
	dataTable.addColumn('number', 'Active');
	dataTable.addColumn('number', 'ClosedStart');
	dataTable.addColumn('number', 'Closed');
	
	var minAxisTime = null;
	var maxAxisTime = null;
	
	var timeLineData = [];
	for (var millisecond in timeSeries)
	{
		var timeGroup = timeSeries[millisecond];
		
		var dateTime = new Date(parseInt(millisecond,10));
		var hour = dateTime.getHours();
		var minute = dateTime.getMinutes();
		var seconds = dateTime.getSeconds();
		
		var hourStr = "" + hour;
		if (hour < 10)
			hourStr = "0" + hour;
		
		var minuteStr = "" + minute;
		if (minute < 10)
			minuteStr = "0" + minute;
		
		var secondsStr = "" + seconds;
		if (seconds < 10)
			secondsStr = "0" + seconds;
		
		var activeConnectionCount = timeGroup.activeConnections.length;
		var closedStartConnectionCount = timeGroup.closedStartConnections.length;
		var closedConnectionCount = timeGroup.closedConnections.length;
		
		var connectionsTableHtml = "";
		connectionsTableHtml += "<div style='width: 180px; padding: 10px;'>";
		connectionsTableHtml += "<span style='color: #333333;'>" + hourStr + ":" + minuteStr + ":" + secondsStr + "</span>";
		connectionsTableHtml += "<table style='color: #111;'>";
		connectionsTableHtml += "<tbody>";
		
		if (activeConnectionCount > 0)
		{
			for (var activeConnection in timeGroup.activeConnections)
			{
				connectionsTableHtml += "<tr>";
				connectionsTableHtml += "<td style='width: 180px;'>";
				connectionsTableHtml += "<span class='label label-success'>" + timeGroup.activeConnections[activeConnection].connectionId + "</span>";
				connectionsTableHtml += "</td>";
				connectionsTableHtml += "</tr>";
			}
		}
		
		if (closedStartConnectionCount > 0)
		{
			for (var closedStartConnection in timeGroup.closedStartConnections)
			{
				connectionsTableHtml += "<tr>";
				connectionsTableHtml += "<td style='width: 180px;'>";
				connectionsTableHtml += "<span class='label label-primary'>" + timeGroup.closedStartConnections[closedStartConnection].connectionId + "</span>";
				connectionsTableHtml += "</td>";
				connectionsTableHtml += "</tr>";
			}
		}
		
		if (closedConnectionCount > 0)
		{
			for (var closedConnection in timeGroup.closedConnections)
			{
				connectionsTableHtml += "<tr>";
				connectionsTableHtml += "<td style='width: 180px;'>";
				connectionsTableHtml += "<span class='label label-danger'>" + timeGroup.closedConnections[closedConnection].connectionId + "</span>";
				connectionsTableHtml += "</td>";
				connectionsTableHtml += "</tr>";
			}
		}
		
		connectionsTableHtml += "</tbody>";
		connectionsTableHtml += "</table>";
		connectionsTableHtml += "</div>";
		
		var tooltipText = connectionsTableHtml;
		
		timeLineData.push([dateTime, tooltipText, activeConnectionCount, closedStartConnectionCount, closedConnectionCount]);
		
		if (maxAxisTime === null || dateTime > maxAxisTime)
			maxAxisTime = dateTime;
		
		if (minAxisTime === null || dateTime < minAxisTime)
			minAxisTime = dateTime;
		
		connectionsDataModel.activeConnectionCount = activeConnectionCount;
		connectionsDataModel.closedStartConnectionCount = closedStartConnectionCount;
		connectionsDataModel.closedConnectionCount = closedConnectionCount;
		
		connectionsDataModel.maxAxisTime = maxAxisTime;
		connectionsDataModel.minAxisTime = minAxisTime;
	}
	
	dataTable.addRows(timeLineData);
	
	return dataTable;
}

function loadChart(connections)
{
	this.connectionsDataModel.connectionList = connections;
	
	google.charts.load('current', { packages: ['corechart', 'bar'] });
	google.charts.setOnLoadCallback(drawChart);
}

function createChart()
{
	materialChart = new google.visualization.ColumnChart(document.getElementById('connectionsChart'));
}

function drawChart()
{
	if (!materialChart)
		createChart();
	
	var dataTable = loadChartData(this.connectionsDataModel.connectionList);
	
	var minAxisTime = new Date();
	if (connectionsDataModel.minAxisTime !== undefined && connectionsDataModel.minAxisTime !== null)
		minAxisTime = new Date(connectionsDataModel.minAxisTime.getTime());
	
	var maxAxisTime = new Date();
	if (connectionsDataModel.maxAxisTime !== undefined && connectionsDataModel.maxAxisTime !== null)
		maxAxisTime = new Date(connectionsDataModel.maxAxisTime.getTime());
	
	var different = differentToTimeSpan(maxAxisTime, minAxisTime);
	console.log("Different time : " + timeSpanToString(different));
	console.log("MinAxisTime : " + minAxisTime.toTimeString());
	console.log("MaxAxisTime : " + maxAxisTime.toTimeString());
	
	if (different.totalMilliseconds > 60000)
	{
		minAxisTime.setMilliseconds(connectionsDataModel.minAxisTime.getMilliseconds() - (different.totalMilliseconds / 10 + 60000));
		maxAxisTime.setMilliseconds(connectionsDataModel.maxAxisTime.getMilliseconds() + (different.totalMilliseconds / 10 + 60000));
	}
	else 
	{
		minAxisTime.setMilliseconds(connectionsDataModel.minAxisTime.getMilliseconds() - 30000);
		maxAxisTime.setMilliseconds(connectionsDataModel.maxAxisTime.getMilliseconds() + 30000);
	}
	
	var options = {
		backgroundColor: '#171717',
		baselineColor: '#CCCCCC',
		colors: ['green', "#1935D3", '#EE1925'],
		height: 240,
		focusTarget: 'category',
		tooltip: { isHtml: true },
		legend: {
			position: 'right', 
			textStyle: {
				color: '#888888', 
				fontSize: 12
			}
		},
		series: {
			0: { axis: 'Active' },
			1: { axis: 'ClosedStart' },
			2: { axis: 'Closed' }
		},
		axes: {
			y: {
				ActiveLevel: { label: 'Active' },
				ClosedStartLevel: { label: 'ClosedStart' },
				ClosedLevel: { label: 'Closed' }
			}
		},
		hAxis: {
			title: 'Time',
			format: 'HH:mm',
			gridlines: {
				color: "#333333",
				count: 30,
				units: {
					years: { format: ["yyyy"] },
					months: { format: ["MMM"] },
					days: { format: ["dd"] },
					hours: { format: ["HH:mm"] },
					minutes: { format: ["HH:mm"] },
					seconds: { format: ["HH:mm:ss"] }
				}
			},
			viewWindow: {
				min: minAxisTime,
				max: maxAxisTime
			}
		},
		vAxis: {
			gridlines: {
				count: 5,
				color: "#444444"
			}
		},
		explorer: {
			actions: ['dragToZoom', 'rightClickToReset'],
			axis: 'horizontal',
			keepInBounds: true,
			maxZoomIn: 8.0
		}
	};
	
	materialChart.draw(dataTable, options);
}
