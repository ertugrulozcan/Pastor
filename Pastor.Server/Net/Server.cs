using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Pastor.Infrastructure.Net;
using Pastor.Infrastructure.Services;
using Pastor.Server.Hubs;
using Pastor.Server.Security;
using Pastor.SignalR.Services;

namespace Pastor.Server.Net
{
	public class Server : IServer
	{
		#region Constants

		private readonly SecurityKey AuthKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes("SECRET_KEY"));

		#endregion
		
		#region Properties

		private IWebHost Host { get; set; }
		
		private IServiceCollection Services { get; set; }

		#endregion
		
		#region Events

		public event EventHandler Started;
		public event EventHandler Ended;

		#endregion

		#region Methods

		public IServer Initialize(string host, int port)
		{
			var webHostBuilder = WebHost.CreateDefaultBuilder();
			webHostBuilder.UseStartup<Server>();
			webHostBuilder.UseUrls($"{host}:{port}");
			this.Host = webHostBuilder.Build();
			
			return this;
		}

		public void Configure(IApplicationBuilder app, IHostingEnvironment env)
		{
			if (env.IsDevelopment())
			{
				app.UseDeveloperExceptionPage();
			}

			app.UseCors("CorsPolicy");
			app.UseAuthentication();
			app.UseSignalR(routes =>
			{
				routes.MapHub<MessengerHub>("/hub");
			});
		}
		
		public void ConfigureServices(IServiceCollection services)
		{
			this.Services = services;
			
			this.Services.AddCors(options => options.AddPolicy("CorsPolicy", builder => 
			{
				builder
					.AllowAnyMethod()
					.AllowAnyHeader()
					.WithOrigins("http://localhost:5000")
					.AllowCredentials()
					.SetIsOriginAllowed((host) => true);
			}));
			
			/*
			this.Services.AddIdentity<ApplicationUser, IdentityRole>()
				.AddDefaultTokenProviders();
			*/

			this.Services.AddAuthentication(options =>
			{
	            // Identity made Cookie authentication the default.
	            // However, we want JWT Bearer Auth to be the default.
	            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
	            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
			})
			.AddJwtBearer(options =>
			{
				// Configure JWT Bearer Auth to expect our security key
				options.TokenValidationParameters = new TokenValidationParameters
				{
					LifetimeValidator = (before, expires, token, param) => expires > DateTime.UtcNow,
					ValidateAudience = false,
					ValidateIssuer = false,
					ValidateActor = false,
					ValidateLifetime = true,
					IssuerSigningKey = this.AuthKey
				};

	            // We have to hook the OnMessageReceived event in order to
	            // allow the JWT authentication handler to read the access
	            // token from the query string when a WebSocket or 
	            // Server-Sent Events request comes in.
	            options.Events = new JwtBearerEvents
	            {
	                OnMessageReceived = context =>
	                {
	                    var accessToken = context.Request.Query["access_token"];

	                    // If the request is for our hub...
	                    var path = context.HttpContext.Request.Path;
	                    if (!string.IsNullOrEmpty(accessToken) && (path.StartsWithSegments("/hub")))
	                    {
	                        // Read the token out of the query string
	                        context.Token = accessToken;
	                    }
						
	                    return Task.CompletedTask;
	                }
	            };
	        });

			this.Services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);

			this.Services.AddSingleton<IUserIdProvider, ConnectionUserIdProvider>();
			this.Services.AddSingleton<IConnectionService, ConnectionService>();

			this.Services.AddSignalR();
		}
		
		public IServer Start()
		{
			try
			{
				this.Host.Run();
				this.Started?.Invoke(this, new EventArgs());
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex);
				throw;
			}

			return this;
		}
		
		public IServer Stop()
		{
			try
			{
				this.Host.StopAsync();
				this.Ended?.Invoke(this, new EventArgs());
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex);
				throw;
			}

			return this;
		}

		#endregion
	}
}