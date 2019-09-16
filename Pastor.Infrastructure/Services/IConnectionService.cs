using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.SignalR;
using Pastor.Infrastructure.Events;
using Pastor.Infrastructure.Net;

namespace Pastor.Infrastructure.Services
{
	public interface IConnectionService
	{
		IConnection OpenConnection(HubCallerContext hubContext, IClientProxy clientProxy);

		IConnection CloseConnection(string connectionId);
		
		List<string> GetConnectionIds();
		
		IConnection GetConnection(string connectionId);
		
		List<IConnection> GetConnections();

		List<IConnection> GetConnectionHistory();

		void ClearHistory();
		
		List<IConnection> GetOthers(string connectionId);

		event EventHandler<ConnectionListChangedEventArgs> OnConnectionListChanged;
	}
}