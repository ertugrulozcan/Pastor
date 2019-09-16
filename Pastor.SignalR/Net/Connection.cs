using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using Pastor.Infrastructure.Auth;
using Pastor.Infrastructure.Net;

namespace Pastor.SignalR.Net
{
	public class Connection : IConnection
	{
		#region Fields

		private HttpContext httpContext;
		private UserRoles userRole;

		#endregion
		
		#region Properties

		public string ConnectionId { get; set; }

		public ConnectionState State { get; set; }
		
		public UserRoles UserRole
		{
			get
			{
				if (this.httpContext == null)
				{
					throw new InvalidOperationException("UserRole property is not ready yet. First HttpContext must be set!");
				}

				return this.userRole;
			}

			private set
			{
				this.userRole = value;
			}
		}
		
		[JsonIgnore]
		public IClientProxy Client { get; set; }

		public Dictionary<string, string> ClientInformations { get; set; }
		
		public DateTime? OpenTime { get; set; }
		
		public DateTime? CloseTime { get; set; }

		#endregion

		#region Methods

		public HttpContext GetHttpContext()
		{
			return this.httpContext;
		}

		public void SetHttpContext(HttpContext context)
		{
			this.httpContext = context;
			
			this.UserRole = UserRoles.Client;

			var queryString = this.httpContext.Request.Query;
			if (queryString.ContainsKey("isAdmin"))
			{
				var isAdminStr = queryString["isAdmin"].ToString();
				if (!string.IsNullOrEmpty(isAdminStr))
				{
					if (isAdminStr.ToLower() == "true")
					{
						this.UserRole = UserRoles.Admin;
					}
				}
			}
		}

		#endregion
	}
}