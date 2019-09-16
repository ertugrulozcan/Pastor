using System;
using System.IO;
using System.Text;
using Pastor.Infrastructure.Events;

namespace Pastor.Infrastructure.Sys
{
	public class ConsoleWriter : TextWriter
	{
		private static ConsoleWriter self;

		public static ConsoleWriter Current
		{
			get
			{
				if (self == null)
					self = new ConsoleWriter();
				
				return self;
			}
		}
		
		public override Encoding Encoding { get { return Encoding.UTF8; } }
		
		public event EventHandler<ConsoleWriterEventArgs> WriteEvent;
		public event EventHandler<ConsoleWriterEventArgs> WriteLineEvent;

		private ConsoleWriter()
		{
			Console.SetOut(this);
		}

		public override void Write(string value)
		{
			this.WriteEvent?.Invoke(this, new ConsoleWriterEventArgs(value));
			base.Write(value);
		}

		public override void WriteLine(string value)
		{
			this.WriteLineEvent?.Invoke(this, new ConsoleWriterEventArgs(value));
			base.WriteLine(value);
		}
	}
}