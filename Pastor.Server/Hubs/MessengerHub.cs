using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Pastor.Core.Models;
using Pastor.Infrastructure.Services;
using Pastor.SignalR.Hubs;

namespace Pastor.Server.Hubs
{
	//using Microsoft.AspNetCore.Authorization;
	//[Authorize]
	public class MessengerHub : ObservableHub
	{
		#region Constants

		private const string OnMessageSentEventKey = "onMessageSent";

		#endregion
		
		#region Constructors

		/// <summary>
		/// Constructor
		/// </summary>
		/// <param name="connectionService"></param>
		public MessengerHub(IConnectionService connectionService) : base(connectionService)
		{ }

		#endregion
		
		#region Methods

		public async Task Send(string message, string connectionId)
		{
			var messageModel = new MessageModel()
			{
				Message = message,
				SenderId = this.Context.ConnectionId,
				RecepientId = connectionId
			};

			await this.Clients.Client(connectionId).SendAsync(OnMessageSentEventKey, messageModel);

			Console.WriteLine($"[{messageModel.SenderId} -> {messageModel.RecepientId}] {messageModel.Message}");
		}

		public async Task Broadcast(string message)
		{
			var messageModel = new MessageModel()
			{
				Message = message,
				SenderId = this.Context.ConnectionId
			};

			await this.Clients.All.SendAsync(OnMessageSentEventKey, messageModel);

			Console.WriteLine($"[Broadcast from {messageModel.SenderId}] {messageModel.Message}");
		}

		#endregion
	}
}