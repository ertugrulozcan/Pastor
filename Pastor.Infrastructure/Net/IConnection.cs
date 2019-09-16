using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using Pastor.Infrastructure.Auth;

namespace Pastor.Infrastructure.Net
{
	public interface IConnection
	{
		string ConnectionId { get; set; }
		
		ConnectionState State { get; set; }
		
		UserRoles UserRole { get; }
		
		[JsonIgnore]
		IClientProxy Client { get; set; }
		
		Dictionary<string, string> ClientInformations { get; set; }
		
		DateTime? OpenTime { get; set; }
		
		DateTime? CloseTime { get; set; }

		HttpContext GetHttpContext();
		
		void SetHttpContext(HttpContext context);
	}
}