using Microsoft.AspNetCore.SignalR;

namespace Pastor.Server.Security
{
	public class ConnectionUserIdProvider : IUserIdProvider
	{
		public string GetUserId(HubConnectionContext connection)
		{
			return connection.User?.Identity?.Name;
		}
	}
}