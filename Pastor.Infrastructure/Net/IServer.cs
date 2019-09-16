using System;

namespace Pastor.Infrastructure.Net
{
	public interface IServer
	{
		#region Events

		event EventHandler Started;
		event EventHandler Ended;

		#endregion

		#region Methods

		IServer Initialize(string host, int port);
		
		IServer Start();

		#endregion
	}
}