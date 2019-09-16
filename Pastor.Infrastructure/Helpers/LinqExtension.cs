using System;
using System.Collections.Generic;

namespace Pastor.Infrastructure.Helpers
{
	public static class LinqExtension
	{
		public static void ForEach<TSource>(this IEnumerable<TSource> source, Action<TSource> iteration)
		{
			foreach (var item in source)
			{
				iteration(item);
			}
		}
	}
}