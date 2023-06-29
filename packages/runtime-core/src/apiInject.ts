import { isFunction } from '@vue/shared'
import { currentInstance } from './component'
import { currentRenderingInstance } from './componentRenderContext'
import { currentApp } from './apiCreateApp'
import { warn } from './warning'
/**
 * 这段代码定义了一个泛型接口 `InjectionKey<T>`，用于表示注入的键。

`InjectionKey<T>` 是一个继承自 `Symbol` 的接口，它的泛型参数 `T` 表示注入的值的类型。

接口的定义非常简单，它并没有添加任何新的成员或方法，只是用 `Symbol` 类型作为基础，为注入键添加了类型参数。

通过使用 `InjectionKey<T>`，我们可以在组件之间进行依赖注入，用于传递和共享特定类型的值。在使用依赖注入时，我们可以使用 `InjectionKey<T>` 作为键来标识和获取对应类型的注入值。
 */
export interface InjectionKey<T> extends Symbol {}
/**
 * 
 * @param key 
 * @param value 
 * 这段代码定义了一个名为 `provide` 的函数，用于在组件中提供依赖注入。

函数的参数包括 `key` 和 `value`。`key` 表示注入的键，可以是泛型类型 `InjectionKey<T>`、字符串类型或数字类型。`value` 表示要注入的值，它的类型根据 `key` 的不同而确定。

函数首先检查当前是否存在组件实例 `currentInstance`。如果不存在，则在开发环境下发出警告，并提示 `provide()` 函数只能在 `setup()` 内部使用。

如果存在组件实例 `currentInstance`，则获取当前组件实例的提供对象 `provides`。默认情况下，实例会继承其父组件的提供对象。但是，当实例需要提供自己的值时，它会创建一个以父组件提供对象为原型的新的提供对象。这样，在 `inject` 中我们可以直接从直接父组件进行查找注入值，而由原型链负责处理。

然后，将注入的键值对添加到提供对象 `provides` 中。需要注意的是，由于 TypeScript 不允许使用符号类型作为索引类型，所以将键 `key` 强制转换为字符串类型来索引提供对象。

总之，`provide` 函数用于在组件中提供依赖注入，并将注入的键值对添加到组件实例的提供对象中，以便其他组件可以通过 `inject` 函数来获取对应的注入值。
 */
export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T
) {
  if (!currentInstance) {
    if (__DEV__) {
      warn(`provide() can only be used inside setup().`)
    }
  } else {
    let provides = currentInstance.provides
    // by default an instance inherits its parent's provides object
    // but when it needs to provide values of its own, it creates its
    // own provides object using parent provides object as prototype.
    // this way in `inject` we can simply look up injections from direct
    // parent and let the prototype chain do the work.
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    // TS doesn't allow symbol as index type
    provides[key as string] = value
  }
}
/**
 * 
 * @param key 
 * 这段代码定义了一个名为 `inject` 的函数，用于在组件中获取依赖注入的值。

函数有多个重载形式，根据传入的参数不同，有不同的行为。

第一个重载形式接受一个 `key` 参数，表示要获取的注入值的键。它可以是泛型类型 `InjectionKey<T>` 或字符串类型。函数会尝试从当前组件实例或当前渲染实例中查找注入值，如果找到则返回该值，否则返回 `undefined`。

第二个重载形式接受一个 `key` 参数和一个 `defaultValue` 参数。除了尝试从注入中获取值外，如果注入值不存在，函数会返回 `defaultValue` 的值。如果 `treatDefaultAsFactory` 参数被设置为 `false`（默认值），则 `defaultValue` 直接作为默认值返回；如果 `treatDefaultAsFactory` 参数被设置为 `true`，并且 `defaultValue` 是一个函数，则会将函数作为工厂函数调用并返回其结果。

第三个重载形式与第二个重载形式类似，但它额外支持将 `defaultValue` 参数视为工厂函数，无论 `treatDefaultAsFactory` 的值是什么。如果 `defaultValue` 是一个函数，则会将其作为工厂函数调用并返回其结果。

函数首先尝试从当前组件实例 `currentInstance` 或当前渲染实例 `currentRenderingInstance` 中查找注入值。如果实例存在，则获取它的父组件的提供对象 `provides`。如果实例没有父组件，则尝试获取其所属应用程序上下文的提供对象 `provides`。这样可以支持在根组件和应用程序级别的提供对象中查找注入值。

如果在提供对象 `provides` 中找到了与键 `key` 匹配的注入值，则返回该值。

如果传入了 `defaultValue` 参数，并且函数未能找到注入值，则根据 `treatDefaultAsFactory` 参数的值进行处理。如果 `treatDefaultAsFactory` 为 `true`，并且 `defaultValue` 是一个函数，则将该函数作为工厂函数调用，并返回其结果。否则，直接返回 `defaultValue` 的值。

如果在开发环境下调用了 `inject` 函数但无法找到匹配的注入值，则会发出警告。

最后，如果没有当前组件实例或当前渲染实例，或者在开发环境下调用了 `inject` 函数但不在 `setup` 或函数式组件内部，则会发出相应的警告。

总之，`inject` 函数用于在组件中获取依赖注入的值。它首先尝试从组件实例或渲染实例的提供对象中查找匹配的注入值，如果找到则返回该值。如果未找到，并且提供了默认值，则返回默认值。
 */
export function inject<T>(key: InjectionKey<T> | string): T | undefined
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T,
  treatDefaultAsFactory?: false
): T
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory: true
): T
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  // fallback to `currentRenderingInstance` so that this can be called in
  // a functional component
  const instance = currentInstance || currentRenderingInstance

  // also support looking up from app-level provides w/ `app.runWithContext()`
  if (instance || currentApp) {
    // #2400
    // to support `app.use` plugins,
    // fallback to appContext's `provides` if the instance is at root
    const provides = instance
      ? instance.parent == null
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        : instance.parent.provides
      : currentApp!._context.provides

    if (provides && (key as string | symbol) in provides) {
      // TS doesn't allow symbol as index type
      return provides[key as string]
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue
    } else if (__DEV__) {
      warn(`injection "${String(key)}" not found.`)
    }
  } else if (__DEV__) {
    warn(`inject() can only be used inside setup() or functional components.`)
  }
}

/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place (e.g. outside of
 * setup()). This is used by libraries that want to use `inject()` internally without triggering a warning to the end
 * user. One example is `useRoute()` in `vue-router`.
 * 这段代码定义了一个名为 `hasInjectionContext` 的函数，用于检查当前是否存在注入上下文。

函数通过判断当前组件实例 `currentInstance`、当前渲染实例 `currentRenderingInstance` 和当前应用程序实例 `currentApp` 是否存在来确定是否存在注入上下文。

如果其中任何一个实例存在，函数会返回 `true`，表示存在注入上下文；否则，函数会返回 `false`，表示不存在注入上下文。

该函数可以用于在需要确定是否在正确的上下文中使用依赖注入时进行检查。
 */
export function hasInjectionContext(): boolean {
  return !!(currentInstance || currentRenderingInstance || currentApp)
}
