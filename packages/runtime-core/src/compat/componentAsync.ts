import { isArray, isObject, isPromise } from '@vue/shared'
import { defineAsyncComponent } from '../apiAsyncComponent'
import { Component } from '../component'
import { isVNode } from '../vnode'
/**
 * 这是一个接口 `LegacyAsyncOptions`，用于描述旧版的异步组件选项。

该接口具有以下属性：

- `component`：表示异步加载的组件。它是一个返回 `Promise<Component>` 类型的值，即异步加载的组件是通过 Promise 对象进行获取的。
- `loading`（可选）：表示在组件加载过程中显示的占位组件。它是一个组件对象，用于展示加载中的状态。
- `error`（可选）：表示在组件加载出错时显示的组件。它也是一个组件对象，用于展示加载出错的状态。
- `delay`（可选）：表示延迟加载的时间，单位是毫秒。即在指定的延迟时间后开始加载组件，默认值为 200 毫秒。
- `timeout`（可选）：表示加载超时的时间，单位是毫秒。如果加载组件的时间超过指定的超时时间，则会触发加载超时错误。

这个接口用于描述旧版的异步组件的选项配置，它是在新版中进行了改进和替代。在新版中，推荐使用新的异步组件加载方式，例如使用 `defineAsyncComponent` 函数。
 */
interface LegacyAsyncOptions {
  component: Promise<Component>
  loading?: Component
  error?: Component
  delay?: number
  timeout?: number
}
/**
 * 这是一个类型别名 `LegacyAsyncReturnValue`，用于描述旧版异步组件的返回值类型。

该类型别名可以表示两种类型的值：

1. `Promise<Component>`：表示直接返回一个 Promise 对象，该 Promise 对象最终解析为异步加载的组件。
2. `LegacyAsyncOptions`：表示返回一个对象，该对象包含了异步组件的详细配置选项，包括 `component`、`loading`、`error`、`delay` 和 `timeout` 等属性。

使用这个类型别名可以灵活地描述旧版异步组件的返回值，可以是直接返回 Promise 对象，也可以返回一个包含配置选项的对象。
 */
type LegacyAsyncReturnValue = Promise<Component> | LegacyAsyncOptions
/**
 * 这是一个类型别名 `LegacyAsyncComponent`，用于描述旧版异步组件的类型。

该类型别名是一个函数类型，接受两个可选的参数 `resolve` 和 `reject`，并返回一个 `LegacyAsyncReturnValue` 类型的值或 `undefined`。

在使用旧版的异步组件时，可以使用 `LegacyAsyncComponent` 类型来定义异步组件的类型。该类型别名定义了异步组件函数的参数和返回值的类型，方便在代码中进行类型检查和推断。
 */
type LegacyAsyncComponent = (
  resolve?: (res: LegacyAsyncReturnValue) => void,
  reject?: (reason?: any) => void
) => LegacyAsyncReturnValue | undefined
/**
 * 这段代码创建了一个名为 `normalizedAsyncComponentMap` 的新 Map 对象，用于将旧版异步组件函数与对应的组件进行映射关系。

Map 是 JavaScript 的内置对象，用于存储键值对。在这里，`normalizedAsyncComponentMap` 的键是 `LegacyAsyncComponent` 类型的旧版异步组件函数，值是 `Component` 类型的组件。

通过将旧版异步组件函数作为键，可以快速查找并获取对应的组件。这在某些场景下可能会用到，例如在异步组件加载完成后，需要根据异步组件函数获取对应的组件进行处理或渲染。

注意，这里使用了泛型类型参数 `<LegacyAsyncComponent, Component>` 来明确指定键值对的类型，以便在使用 Map 的方法时获得正确的类型检查和推断。
 */
const normalizedAsyncComponentMap = new Map<LegacyAsyncComponent, Component>()
/**
 * 
 * @param comp 
 * @returns 
 * 这段代码定义了 `convertLegacyAsyncComponent` 函数，用于将旧版的异步组件函数转换为新版的异步组件。

函数的参数 `comp` 是一个旧版的异步组件函数，它可能具有不同的签名形式。函数首先检查 `normalizedAsyncComponentMap` 是否已经存在对应的转换后的组件，如果存在则直接返回已转换的组件。

接下来，函数创建了用于解析和拒绝的 `resolve` 和 `reject` 函数，并创建了一个回退的 Promise 对象 `fallbackPromise`。回退 Promise 对象用于处理当旧版异步组件函数未返回有效值时的情况。

然后，函数调用旧版异步组件函数 `comp`，传入解析和拒绝函数，并将返回值存储在变量 `res` 中。

根据 `res` 的类型，函数进行不同的转换处理：
- 如果 `res` 是一个 Promise 对象，函数使用 `defineAsyncComponent` 函数创建一个新版异步组件，加载函数为 `() => res`。
- 如果 `res` 是一个对象且不是虚拟节点或数组，函数使用 `defineAsyncComponent` 函数创建一个新版异步组件，根据对象中的属性设置加载函数、加载中组件、错误组件、延迟和超时时间。
- 如果 `res` 是 `null` 或 `undefined`，函数使用 `defineAsyncComponent` 函数创建一个新版异步组件，加载函数为 `() => fallbackPromise`。
- 否则，将 `comp` 视为新版函数式组件，直接返回。

最后，函数将转换后的组件 `converted` 存储到 `normalizedAsyncComponentMap` 中，以便下次快速获取，并返回转换后的组件。

这样，通过调用 `convertLegacyAsyncComponent` 函数，可以将旧版的异步组件函数转换为新版的异步组件，并进行相应的处理和渲染。
 */
export function convertLegacyAsyncComponent(comp: LegacyAsyncComponent) {
  if (normalizedAsyncComponentMap.has(comp)) {
    return normalizedAsyncComponentMap.get(comp)!
  }

  // we have to call the function here due to how v2's API won't expose the
  // options until we call it
  let resolve: (res: LegacyAsyncReturnValue) => void
  let reject: (reason?: any) => void
  const fallbackPromise = new Promise<Component>((r, rj) => {
    ;(resolve = r), (reject = rj)
  })

  const res = comp(resolve!, reject!)

  let converted: Component
  if (isPromise(res)) {
    converted = defineAsyncComponent(() => res)
  } else if (isObject(res) && !isVNode(res) && !isArray(res)) {
    converted = defineAsyncComponent({
      loader: () => res.component,
      loadingComponent: res.loading,
      errorComponent: res.error,
      delay: res.delay,
      timeout: res.timeout
    })
  } else if (res == null) {
    converted = defineAsyncComponent(() => fallbackPromise)
  } else {
    converted = comp as any // probably a v3 functional comp
  }
  normalizedAsyncComponentMap.set(comp, converted)
  return converted
}
