using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.SignalR;
using Pastor.Infrastructure.Auth;
using Pastor.Infrastructure.Events;
using Pastor.Infrastructure.Helpers;
using Pastor.Infrastructure.Net;
using Pastor.Infrastructure.Services;
using Pastor.SignalR.Net;

namespace Pastor.SignalR.Services
{
	public class ConnectionService : IConnectionService
	{
		#region Properties

		private ConcurrentDictionary<string, Connection> ClientDictionary { get; } = new ConcurrentDictionary<string, Connection>();
		
		private ConcurrentDictionary<string, Connection> ConnectionHistory { get; } = new ConcurrentDictionary<string, Connection>();

		#endregion

		#region Events

		public event EventHandler<ConnectionListChangedEventArgs> OnConnectionListChanged;

		#endregion

		#region Methods

		public IConnection GetConnection(string connectionId)
		{
			if (!this.ClientDictionary.ContainsKey(connectionId))
				return null;
			
			return this.ClientDictionary[connectionId];
		}
		
		public List<IConnection> GetConnections()
		{
			return this.ClientDictionary.Values.Cast<IConnection>().ToList();
		}
		
		public List<IConnection> GetConnectionHistory()
		{
			return this.ConnectionHistory.Values.Cast<IConnection>().ToList();
		}

		public void ClearHistory()
		{
			var currentHistory = this.GetConnectionHistory();
			foreach (var connectionItem in currentHistory)
			{
				if (connectionItem.State != ConnectionState.Open)
				{
					this.DeleteHistoricalItem(connectionItem.ConnectionId);
				}
			}
		}

		private void DeleteHistoricalItem(string connectionId, bool forceDelete = false)
		{
			if (this.ConnectionHistory.ContainsKey(connectionId))
			{
				if (!forceDelete && this.ConnectionHistory[connectionId].State == ConnectionState.Open)
				{
					throw new InvalidOperationException("Just closed connections can be delete from connection history!");
				}

				this.ConnectionHistory.TryRemove(connectionId, out _);
			}
		}

		public List<string> GetConnectionIds()
		{
			return this.ClientDictionary.Values.Select(x => x.ConnectionId).ToList();
		}

		public List<IConnection> GetOthers(string connectionId)
		{
			return this.ClientDictionary.Values.Where(x => connectionId != x.ConnectionId).Cast<IConnection>().ToList();
		}

		public IConnection OpenConnection(HubCallerContext hubContext, IClientProxy clientProxy)
		{
			string connectionId = hubContext.ConnectionId;
			bool isAdded = this.AddClient(connectionId, clientProxy);
			
			if (isAdded)
			{
				var connection = this.GetConnection(connectionId);
				connection.SetHttpContext(hubContext.GetHttpContext());
				connection.State = ConnectionState.Open;
				connection.OpenTime = DateTime.Now;
				connection.ClientInformations = this.PrepareClientInformationReport(connection);

				if (connection.UserRole == UserRoles.Admin)
				{
					this.DeleteHistoricalItem(connectionId, true);
				}

				LogHelper.PrintLog($"[{connectionId}] connected.");
				this.OnConnectionListChanged?.Invoke(this, new ConnectionListChangedEventArgs()
				{
					Method = ConnectionListChangedEventArgs.CollectionMethod.Add,
					Connection = connection
				});

				return connection;
			}
			else
			{
				LogHelper.PrintLog($"[{connectionId}] could not added to ClientDictionary.");
				return null;
			}
		}

		private bool AddClient(string connectionId, IClientProxy clientProxy)
		{
			bool isAdded = this.ClientDictionary.TryAdd(connectionId, new Connection()
			{
				ConnectionId = connectionId,
				Client = clientProxy
			});

			if (isAdded)
			{
				this.ConnectionHistory.TryAdd(connectionId, this.ClientDictionary[connectionId]);
			}

			return isAdded;
		}
		
		public IConnection CloseConnection(string connectionId)
		{
			var connection = this.GetConnection(connectionId);
			if (connection != null)
			{
				bool isRemoved = this.RemoveClient(connectionId);
				if (isRemoved)
				{
					LogHelper.PrintLog($"[{connectionId}] disconnected.");
					this.OnConnectionListChanged?.Invoke(this, new ConnectionListChangedEventArgs()
					{
						Method = ConnectionListChangedEventArgs.CollectionMethod.Remove,
						Connection = connection
					});
				}
				else
				{
					LogHelper.PrintLog($"[{connectionId}] could not removed to ClientDictionary.");
				}	
			}

			return connection;
		}
		
		private bool RemoveClient(string connectionId)
		{
			bool isRemoved = this.ClientDictionary.TryRemove(connectionId, out _);

			if (isRemoved)
			{
				if (this.ConnectionHistory.ContainsKey(connectionId))
				{
					var connection = this.ConnectionHistory[connectionId];
					connection.State = ConnectionState.Closed;
					connection.CloseTime = DateTime.Now;
				}
			}

			return isRemoved;
		}

		private Dictionary<string, string> PrepareClientInformationReport(IConnection connection)
		{
			Dictionary<string, string> report = new Dictionary<string, string>();

			var httpContext = connection.GetHttpContext();
			if (httpContext != null)
			{
				var connectionInfo = httpContext.Connection;

				report.Add("Host", httpContext.Request.Host.ToString());
				report.Add("Http method", httpContext.Request.Method);
				report.Add("Path", httpContext.Request.Path.ToString());
				report.Add("Query string", httpContext.Request.QueryString.ToString());
				report.Add("Protocol", httpContext.Request.Protocol);

				report.Add("Http connection id", connectionInfo.Id);
				report.Add("Local ip", connectionInfo.LocalIpAddress.ToString());
				report.Add("Local port", connectionInfo.LocalPort.ToString());
				report.Add("Remote ip", connectionInfo.RemoteIpAddress.ToString());
				report.Add("Remote port", connectionInfo.RemotePort.ToString());

				httpContext.Request.Headers.ForEach(x => report.Add("Header:" + x.Key, x.Value));
			}

			return report;
		}
		
		#endregion
	}
}