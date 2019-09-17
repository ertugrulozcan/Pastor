using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Pastor.Infrastructure.Auth;
using Pastor.Infrastructure.Events;
using Pastor.Infrastructure.Helpers;
using Pastor.Infrastructure.Net;
using Pastor.Infrastructure.Services;
using Pastor.Infrastructure.Sys;

namespace Pastor.SignalR.Hubs
{
	// [Authorize(Roles = "Admin")]
	public abstract class ObservableHub : Hub, IDisposable
	{
		#region Constants

		private const string AdministratorGroup = "AdministratorGroup";

		private const string OnConnectionListChangedEventKey = "onConnectionListChanged";
		private const string OnConnectionOpenedEventKey = "onConnectionOpened";
		private const string OnConnectionClosedEventKey = "onConnectionClosed";
		private const string OnServerConsoleStreamEventKey = "onServerConsoleStream";
		
		private const string WhoamiRequestEventKey = "whoami";
		private const string ShutdownRequestEventKey = "shutdown";
		private const string GetClientListRequestEventKey = "getClientList";
		private const string GetOthersRequestEventKey = "getOthers";
		private const string GetConnectionHistoryRequestEventKey = "getConnectionHistory";
		private const string ClearHistoryRequestEventKey = "clearHistory";

		#endregion
		
		#region Services

		private readonly IConnectionService connectionService;

		#endregion

		#region Fields

		private object threadLock = new object();

		#endregion
		
		#region Properties

		public bool NotifyConnectionChangeToAllUsers { get; set; } = true;

		#endregion

		#region Constructors

		/// <summary>
		/// Constructor
		/// </summary>
		/// <param name="connectionService"></param>
		protected ObservableHub(IConnectionService connectionService)
		{
			this.connectionService = connectionService;

			this.connectionService.OnConnectionListChanged += this.ConnectionServiceOnConnectionListChanged;
		}

		#endregion

		#region Methods
		
		public override Task OnConnectedAsync()
		{
			if (this.disposed)
			{
				return Task.CompletedTask;
			}
			
			lock (this.threadLock)
			{
				this.connectionService.OpenConnection(this.Context, this.Clients.Caller);
				this.SubscribeConsoleOutputStream();
				return base.OnConnectedAsync();
			}
		}

		public override Task OnDisconnectedAsync(Exception exception)
		{
			if (this.disposed)
			{
				return Task.CompletedTask;
			}
			
			lock (this.threadLock)
			{
				this.connectionService.CloseConnection(this.Context.ConnectionId);
				this.UnsubscribeConsoleOutputStream();
				return base.OnDisconnectedAsync(exception);
			}
		}

		private void SubscribeConsoleOutputStream()
		{
			if (this.disposed)
				return;

			IConnection connection;
			
			lock (this.threadLock)
			{
				connection = this.connectionService.GetConnection(this.Context.ConnectionId);
			}
			
			if (connection != null && connection.UserRole == UserRoles.Admin)
			{
				this.Groups.AddToGroupAsync(connection.ConnectionId, AdministratorGroup);
			}
			
			ConsoleWriter.Current.WriteEvent += this.ConsoleWriterOnWriteEvent;
			ConsoleWriter.Current.WriteLineEvent += this.ConsoleWriterOnWriteEvent;
		}

		private void UnsubscribeConsoleOutputStream()
		{
			if (this.disposed)
				return;
			
			IConnection connection;
			
			lock (this.threadLock)
			{
				connection = this.connectionService.GetConnection(this.Context.ConnectionId);
			}
			
			if (connection != null && connection.UserRole == UserRoles.Admin)
			{
				this.Groups.RemoveFromGroupAsync(connection.ConnectionId, AdministratorGroup);
			}
			
			ConsoleWriter.Current.WriteEvent -= this.ConsoleWriterOnWriteEvent;
			ConsoleWriter.Current.WriteLineEvent -= this.ConsoleWriterOnWriteEvent;
		}

		private async void PublishConsoleOutput(string line)
		{
			await this.PublishSignalREvent(AdministratorGroup, OnServerConsoleStreamEventKey, line);
		}
		
		private void ConsoleWriterOnWriteEvent(object sender, ConsoleWriterEventArgs e)
		{
			this.PublishConsoleOutput(e.Value);
		}

		#endregion

		#region Rpc Methods

		/// <summary>
		/// Publish to single client
		/// </summary>
		/// <param name="connectionId"></param>
		/// <param name="eventKey"></param>
		/// <param name="parameter"></param>
		/// <param name="cancellationToken"></param>
		private async Task PostSignalREvent(string connectionId, string eventKey, object parameter, CancellationToken? cancellationToken = null)
		{
			if (this.disposed)
				return;
			
			if (cancellationToken == null)
				await this.Clients.Client(connectionId).SendAsync(eventKey, parameter);
			else
				await this.Clients.Client(connectionId).SendAsync(eventKey, parameter, cancellationToken);
			
			LogHelper.PrintLog($"'{eventKey}' event published from [{this.Context.ConnectionId}] to [{connectionId}].");
		}
		
		/// <summary>
		/// Publish to all clients
		/// </summary>
		/// <param name="eventKey"></param>
		/// <param name="parameter"></param>
		/// <param name="cancellationToken"></param>
		private async Task PublishSignalREvent(string eventKey, object parameter, CancellationToken? cancellationToken = null)
		{
			if (this.disposed)
				return;
			
			if (cancellationToken == null)
				await this.Clients.All.SendAsync(eventKey, parameter);
			else
				await this.Clients.All.SendAsync(eventKey, parameter, cancellationToken);
			
			LogHelper.PrintLog($"'{eventKey}' event published from [{this.Context.ConnectionId}] to all clients.");
		}
		
		/// <summary>
		/// Publish to all clients
		/// </summary>
		/// <param name="groupName"></param>
		/// <param name="eventKey"></param>
		/// <param name="parameter"></param>
		/// <param name="cancellationToken"></param>
		private async Task PublishSignalREvent(string groupName, string eventKey, object parameter, CancellationToken? cancellationToken = null)
		{
			if (this.disposed)
				return;
			
			if (cancellationToken == null)
				await this.Clients.Group(groupName).SendAsync(eventKey, parameter);
			else
				await this.Clients.Group(groupName).SendAsync(eventKey, parameter, cancellationToken);
			
			LogHelper.PrintLog($"'{eventKey}' event published from [{this.Context.ConnectionId}] to all clients.");
		}
		
		/// <summary>
		/// Publish to just caller client
		/// </summary>
		/// <param name="eventKey"></param>
		/// <param name="parameter"></param>
		/// <param name="cancellationToken"></param>
		private async Task ReturnSignalREvent(string eventKey, object parameter, CancellationToken? cancellationToken = null)
		{
			if (this.disposed)
				return;
			
			if (cancellationToken == null)
				await this.Clients.Caller.SendAsync(eventKey, parameter);
			else
				await this.Clients.Caller.SendAsync(eventKey, parameter, cancellationToken);
			
			LogHelper.PrintLog($"'{eventKey}' remote method returned to [{this.Context.ConnectionId}]");
		}
		
		public async Task Whoami()
		{
			if (this.disposed)
				return;
			
			LogHelper.PrintLog($"[{this.Context.ConnectionId}].Whoami();");
			await this.ReturnSignalREvent(WhoamiRequestEventKey, this.Context.ConnectionId);
		}

		public async Task Shutdown(string connectionId)
		{
			if (this.disposed)
				return;
			
			LogHelper.PrintLog($"[{this.Context.ConnectionId}].Shutdown({connectionId});");
			lock (this.threadLock)
			{
				IConnection connection = this.connectionService.GetConnection(connectionId);
				connection?.GetHttpContext()?.Abort();
			}
			
			await this.ReturnSignalREvent(ShutdownRequestEventKey, connectionId);
		}

		public async Task GetClientList()
		{
			if (this.disposed)
				return;
			
			LogHelper.PrintLog($"[{this.Context.ConnectionId}].GetClientList();");
			
			List<string> connectionIds;
			lock (this.threadLock)
			{
				connectionIds = this.connectionService.GetConnectionIds();
			}
			
			await this.ReturnSignalREvent(GetClientListRequestEventKey, connectionIds);
		}
		
		public async Task GetOthers()
		{
			if (this.disposed)
				return;
			
			LogHelper.PrintLog($"[{this.Context.ConnectionId}].GetOthers();");
			
			List<IConnection> connectionIds;
			lock (this.threadLock)
			{
				connectionIds = this.connectionService.GetOthers(this.Context.ConnectionId);
			}
			
			await this.ReturnSignalREvent(GetOthersRequestEventKey, connectionIds);
		}

		public async Task GetConnectionHistory()
		{
			if (this.disposed)
				return;
			
			LogHelper.PrintLog($"[{this.Context.ConnectionId}].GetConnectionHistory();");
			
			List<IConnection> connections;
			lock (this.threadLock)
			{
				connections = this.connectionService.GetConnectionHistory();
			}
			
			await this.ReturnSignalREvent(GetConnectionHistoryRequestEventKey, connections);
		}
		
		public async Task ClearHistory()
		{
			if (this.disposed)
				return;
			
			LogHelper.PrintLog($"[{this.Context.ConnectionId}].ClearHistory();");
			
			List<IConnection> connections;
			lock (this.threadLock)
			{
				this.connectionService.ClearHistory();
				connections = this.connectionService.GetConnectionHistory();
			}
			
			await this.ReturnSignalREvent(ClearHistoryRequestEventKey, connections);
		}

		#endregion
		
		#region Event Handlers

		private async void ConnectionServiceOnConnectionListChanged(object sender, ConnectionListChangedEventArgs e)
		{
			if (this.disposed)
				return;
			
			try
			{
				if (this.NotifyConnectionChangeToAllUsers)
				{
					switch (e.Method)
					{
						case ConnectionListChangedEventArgs.CollectionMethod.Add:
							await this.PublishSignalREvent(OnConnectionOpenedEventKey, e.Connection);
							break;
						case ConnectionListChangedEventArgs.CollectionMethod.Remove:
							await this.PublishSignalREvent(OnConnectionClosedEventKey, e.Connection);
							break;
						case ConnectionListChangedEventArgs.CollectionMethod.Reset:
							break;
						default:
							throw new ArgumentOutOfRangeException();
					}
			
					// await this.PublishSignalREvent(OnConnectionListChangedEventKey, this.connectionService.GetConnections());
				}
				else
				{
					switch (e.Method)
					{
						case ConnectionListChangedEventArgs.CollectionMethod.Add:
							await this.PublishSignalREvent(AdministratorGroup, OnConnectionOpenedEventKey, e.Connection);
							break;
						case ConnectionListChangedEventArgs.CollectionMethod.Remove:
							await this.PublishSignalREvent(AdministratorGroup, OnConnectionClosedEventKey, e.Connection);
							break;
						case ConnectionListChangedEventArgs.CollectionMethod.Reset:
							break;
						default:
							throw new ArgumentOutOfRangeException();
					}
			
					// await this.PublishSignalREvent(AdministratorGroup, OnConnectionListChangedEventKey, this.connectionService.GetConnections());
				}
			}
			catch (Exception exception)
			{
				Console.WriteLine("Error on ObservableHub.ConnectionServiceOnOnConnectionListChanged()");
				Console.WriteLine(exception);
			}
		}

		#endregion

		#region Disposing

		private bool disposed;
   
		public new void Dispose()
		{ 
			this.Dispose(true);
			GC.SuppressFinalize(this);           
		}
   
		protected override void Dispose(bool disposing)
		{
			lock (this.threadLock)
			{
				if (this.disposed)
					return; 
      
				if (disposing)
				{
					this.connectionService.OnConnectionListChanged -= this.ConnectionServiceOnConnectionListChanged;
					this.UnsubscribeConsoleOutputStream();
				}
      
				this.disposed = true;		
			}
		}

		~ObservableHub()
		{
			this.Dispose(false);
		}

		#endregion
	}
}