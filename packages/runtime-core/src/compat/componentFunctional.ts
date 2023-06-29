import {
  ComponentOptions,
  FunctionalComponent,
  getCurrentInstance
} from '../component'
import { resolveInjections } from '../componentOptions'
import { InternalSlots } from '../componentSlots'
import { getCompatListeners } from './instanceListeners'
import { compatH } from './renderFn'
/**
 * 这段代码定义了一个 `normalizedFunctionalComponentMap`，它是一个映射（Map）对象，用于存储旧版的函数式组件选项对象和转换后的新版函数式组件之间的对应关系。

`normalizedFunctionalComponentMap` 的键是旧版函数式组件选项对象，值是转换后的新版函数式组件。

通过这个映射对象，可以快速获取给定旧版函数式组件选项对象对应的转换后的新版函数式组件，而无需每次都重新进行转换操作。

这个映射对象在代码中被命名为 `normalizedFunctionalComponentMap`，并使用 `Map` 类进行实例化。

使用该映射对象的目的是提高性能，避免重复转换同一个旧版函数式组件选项对象，以及减少转换操作的时间和资源消耗。通过将转换结果缓存到映射对象中，可以在后续使用相同的旧版函数式组件选项对象时直接从映射对象中获取转换后的新版函数式组件，避免重复工作。
 */
const normalizedFunctionalComponentMap = new Map<
  ComponentOptions,
  FunctionalComponent
>()
/**
 * 这段代码定义了一个名为 `legacySlotProxyHandlers` 的常量，它是一个 `ProxyHandler<InternalSlots>` 类型的对象。这个对象用作代理处理程序，用于处理对 `InternalSlots` 对象的属性访问。

在属性访问时，代理处理程序的 `get` 方法会被调用。这个方法接收两个参数：`target` 表示被代理的对象，即 `InternalSlots` 对象，`key` 表示访问的属性名。

在这个代理处理程序中，首先从 `target` 中获取名为 `key` 的属性值，表示对应的插槽函数。然后，通过调用插槽函数来获取插槽内容。如果插槽函数存在，则调用它并返回结果，否则返回 `undefined`。

这个代理处理程序的作用是使访问 `InternalSlots` 对象的属性时，实际上会调用对应的插槽函数获取插槽内容。这样可以在旧版的插槽语法中实现与新版插槽语法类似的行为，使得旧版插槽能够正常工作。
 */
export const legacySlotProxyHandlers: ProxyHandler<InternalSlots> = {
  get(target, key: string) {
    const slot = target[key]
    return slot && slot()
  }
}
/**
 * 
 * @param comp 
 * @returns
 * 这段代码定义了一个名为 `convertLegacyFunctionalComponent` 的函数，用于将旧版的函数式组件转换为新版的函数式组件。

函数接收一个名为 `comp` 的参数，表示旧版函数式组件的选项对象。

首先，函数会检查 `normalizedFunctionalComponentMap` 是否已经包含了 `comp` 对应的转换后的函数式组件，如果已经存在，则直接返回已转换的函数式组件。

接下来，函数会获取旧版函数式组件的 `render` 函数，并将其存储在 `legacyFn` 变量中。

然后，定义了一个名为 `Func` 的新版函数式组件。该函数接收两个参数 `props` 和 `ctx`，表示组件的属性和上下文对象。

在新版函数式组件的实现中，首先通过 `getCurrentInstance()` 获取当前组件实例对象 `instance`。

接下来，创建了一个名为 `legacyCtx` 的对象，用于模拟旧版函数式组件的上下文对象。这个对象包含了旧版函数式组件中常用的属性和方法，例如 `props`、`children`、`data`、`scopedSlots`、`parent` 等。

在 `slots` 方法中，函数还没有给出具体的实现，只有方法的声明。根据代码的后续部分，可以将 `slots` 方法看作是用于处理旧版插槽的方法。

接下来，函数会创建一个新版函数式组件的实例，并将之前创建的 `legacyFn` 函数作为其 `render` 方法。同时，将 `legacyCtx` 作为新版函数式组件实例的上下文对象。

最后，将转换后的新版函数式组件 `Func` 存储在 `normalizedFunctionalComponentMap` 中，并返回它作为结果。

通过这个函数，可以将旧版的函数式组件转换为新版的函数式组件，并确保旧版组件在新版环境中能够正常工作。 
 */
export function convertLegacyFunctionalComponent(comp: ComponentOptions) {
  if (normalizedFunctionalComponentMap.has(comp)) {
    return normalizedFunctionalComponentMap.get(comp)!
  }

  const legacyFn = comp.render as any

  const Func: FunctionalComponent = (props, ctx) => {
    const instance = getCurrentInstance()!

    const legacyCtx = {
      props,
      children: instance.vnode.children || [],
      data: instance.vnode.props || {},
      scopedSlots: ctx.slots,
      parent: instance.parent && instance.parent.proxy,
      slots() {
        return new Proxy(ctx.slots, legacySlotProxyHandlers)
      },
      get listeners() {
        return getCompatListeners(instance)
      },
      get injections() {
        if (comp.inject) {
          const injections = {}
          resolveInjections(comp.inject, injections)
          return injections
        }
        return {}
      }
    }
    return legacyFn(compatH, legacyCtx)
  }
  Func.props = comp.props
  Func.displayName = comp.name
  Func.compatConfig = comp.compatConfig
  // v2 functional components do not inherit attrs
  Func.inheritAttrs = false

  normalizedFunctionalComponentMap.set(comp, Func)
  return Func
}
