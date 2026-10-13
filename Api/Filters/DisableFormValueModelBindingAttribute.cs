namespace Api.Filters;

using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;

// Streaming multipart actions must not let MVC read and buffer Request.Form before the action.
[AttributeUsage(AttributeTargets.Method)]
public sealed class DisableFormValueModelBindingAttribute : Attribute, IResourceFilter
{
    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        for (var i = context.ValueProviderFactories.Count - 1; i >= 0; i--)
            if (context.ValueProviderFactories[i] is FormValueProviderFactory or FormFileValueProviderFactory
                or JQueryFormValueProviderFactory)
                context.ValueProviderFactories.RemoveAt(i);
    }

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }
}
