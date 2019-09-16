using System;
using Pastor.Infrastructure.Net;

namespace Pastor.Infrastructure.Events
{
	public class ConnectionListChangedEventArgs : EventArgs
	{
		public enum CollectionMethod
		{
			Add,
			Remove,
			Reset
		}
		
		public CollectionMethod Method { get; set; }
		
		public IConnection Connection { get; set; }
	}
}