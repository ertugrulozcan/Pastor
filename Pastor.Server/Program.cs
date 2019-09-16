using System;
using Pastor.Infrastructure.Sys;

namespace Pastor.Server
{
	public class Program
	{
		static void Main(string[] args)
		{
			new Net.Server().Initialize("http://localhost", 9718).Start();
		}
	}
}