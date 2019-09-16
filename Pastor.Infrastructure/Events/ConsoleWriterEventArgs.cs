using System;

namespace Pastor.Infrastructure.Events
{
	public class ConsoleWriterEventArgs : EventArgs
	{
		public string Value { get; private set; }
		
		public ConsoleWriterEventArgs(string value)
		{
			this.Value = value;
		}
	}
}