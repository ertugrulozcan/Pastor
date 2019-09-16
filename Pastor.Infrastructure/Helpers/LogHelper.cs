using System;

namespace Pastor.Infrastructure.Helpers
{
	public static class LogHelper
	{
		public static void PrintLog(string message)
		{
			Console.WriteLine($"[{DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")}]    {message}");
		}
	}
}