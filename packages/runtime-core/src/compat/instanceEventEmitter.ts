import { isArray } from '@vue/shared'
import { ComponentInternalInstance } from '../component'
import { callWithAsyncErrorHandling, ErrorCodes } from '../errorHandling'
import { assertCompatEnabled, DeprecationTypes } from './compatConfig'
/**
 * `EventRegistry` 是一个接口，用于定义事件注册表的结构。

它是一个以事件名作为键，值为函数数组或 `undefined` 的对象。

每个键（事件名）对应一个函数数组，用于存储该事件的监听函数。如果某个事件没有任何监听函数，则对应的值为 `undefined`。

通过使用 `EventRegistry`，可以方便地管理事件的注册和触发。将事件名作为键，可以快速查找对应的监听函数数组，并执行相应的事件处理逻辑。
 */
interface EventRegistry {
  [event: string]: Function[] | undefined
}
/**
 * `eventRegistryMap` 是一个弱映射（WeakMap），用于将组件内部实例 (`ComponentInternalInstance`) 与事件注册表 (`EventRegistry`) 关联起来。

它的键是组件内部实例，值是事件注册表。通过将组件内部实例作为键，可以轻松地获取和管理该组件实例的事件注册情况。

由于使用了弱映射，当组件实例被垃圾回收时，相应的条目也会被自动删除，避免了内存泄漏的问题。这对于在事件注册表中持有组件实例的引用非常有用。
 */
const eventRegistryMap = /*#__PURE__*/ new WeakMap<
  ComponentInternalInstance,
  EventRegistry
>()
/**
 * 
 * @param instance 
 * @returns 
 * `getRegistry` 是一个用于获取给定组件内部实例 (`ComponentInternalInstance`) 的事件注册表 (`EventRegistry`) 的函数。

它首先尝试从 `eventRegistryMap` 中获取与给定组件实例相关联的事件注册表。如果找不到对应的事件注册表，则创建一个新的空对象作为事件注册表，并将其与组件实例关联起来，然后将其存储在 `eventRegistryMap` 中。最后，返回获取到的事件注册表。

通过调用 `getRegistry` 函数，可以方便地获取特定组件实例的事件注册表，并对其进行操作，例如添加事件处理程序、触发事件等。
 */
export function getRegistry(
  instance: ComponentInternalInstance
): EventRegistry {
  let events = eventRegistryMap.get(instance)
  if (!events) {
    eventRegistryMap.set(instance, (events = Object.create(null)))
  }
  return events!
}
/**
 * 
 * @param instance 
 * @param event 
 * @param fn 
 * @returns 
 * `on` 是一个用于向给定组件内部实例 (`ComponentInternalInstance`) 注册事件监听器的函数。

该函数接受三个参数：`instance` 表示组件实例，`event` 表示要监听的事件，可以是一个字符串或字符串数组，`fn` 表示事件触发时要执行的回调函数。

如果 `event` 参数是一个字符串数组，则会对数组中的每个事件调用 `on` 函数来注册监听器。

如果 `event` 参数是一个字符串，函数会执行以下逻辑：
- 如果 `event` 以 "hook:" 开头，表明是钩子函数事件，会通过 `assertCompatEnabled` 函数进行兼容性检查，以确保该事件的使用是兼容的。
- 如果 `event` 不是以 "hook:" 开头，表明是普通事件，会通过 `assertCompatEnabled` 函数进行兼容性检查，以确保事件发射器的使用是兼容的。
- 获取组件实例的事件注册表，如果该事件的注册表尚未创建，则创建一个空数组，并将其与事件关联起来。
- 将回调函数 `fn` 添加到事件注册表中对应事件的回调函数数组中。

最后，函数返回组件实例的代理对象。

通过调用 `on` 函数，可以方便地向特定组件实例注册事件监听器，并在事件触发时执行相应的回调函数。
 */
export function on(
  instance: ComponentInternalInstance,
  event: string | string[],
  fn: Function
) {
  if (isArray(event)) {
    event.forEach(e => on(instance, e, fn))
  } else {
    if (event.startsWith('hook:')) {
      assertCompatEnabled(
        DeprecationTypes.INSTANCE_EVENT_HOOKS,
        instance,
        event
      )
    } else {
      assertCompatEnabled(DeprecationTypes.INSTANCE_EVENT_EMITTER, instance)
    }
    const events = getRegistry(instance)
    ;(events[event] || (events[event] = [])).push(fn)
  }
  return instance.proxy
}
/**
 * 
 * @param instance 
 * @param event 
 * @param fn 
 * @returns 
 * `once` 是一个用于向给定组件内部实例 (`ComponentInternalInstance`) 注册一次性事件监听器的函数。

该函数接受三个参数：`instance` 表示组件实例，`event` 表示要监听的事件，`fn` 表示事件触发时要执行的回调函数。

函数内部定义了一个包装函数 `wrapped`，该函数在第一次触发事件时会执行以下逻辑：
- 调用 `off` 函数将自身从事件的监听器列表中移除，确保回调函数只会执行一次。
- 使用 `call` 方法将回调函数 `fn` 的执行上下文设置为组件实例的代理对象，并传入相应的参数 `args`，执行回调函数。

然后，将 `fn` 函数赋值给 `wrapped` 函数的 `fn` 属性，以便在移除监听器时可以对比回调函数。
最后，通过调用 `on` 函数，将 `wrapped` 函数注册为事件的监听器。

函数返回组件实例的代理对象。

`once` 函数的作用是注册一个只会执行一次的事件监听器，当事件触发时，会执行回调函数，并自动移除该监听器，以确保回调函数只会执行一次。
 */
export function once(
  instance: ComponentInternalInstance,
  event: string,
  fn: Function
) {
  const wrapped = (...args: any[]) => {
    off(instance, event, wrapped)
    fn.call(instance.proxy, ...args)
  }
  wrapped.fn = fn
  on(instance, event, wrapped)
  return instance.proxy
}
/**
 * 
 * @param instance 
 * @param event 
 * @param fn 
 * @returns 
 * `off` 是一个用于从给定组件内部实例 (`ComponentInternalInstance`) 中移除事件监听器的函数。

该函数接受三个参数：`instance` 表示组件实例，`event` 表示要移除的事件（可选），`fn` 表示要移除的特定回调函数（可选）。

函数内部首先调用 `assertCompatEnabled` 函数，确保兼容性功能已启用。

然后根据参数的不同情况执行以下逻辑：
- 如果没有指定事件 `event`，则移除所有事件的监听器，将 `eventRegistryMap` 中与实例关联的事件注册表设置为空对象，并返回组件实例的代理对象。
- 如果 `event` 是一个事件数组，则递归调用 `off` 函数移除每个事件的监听器，并返回组件实例的代理对象。
- 如果指定了特定的事件 `event`，则从事件注册表中获取该事件对应的回调函数列表 `cbs`。
  - 如果回调函数列表不存在，则直接返回组件实例的代理对象。
  - 如果没有指定要移除的特定回调函数 `fn`，则将事件的回调函数列表设置为 `undefined`，表示将所有回调函数移除。
  - 如果指定了要移除的特定回调函数 `fn`，则将回调函数列表中不等于 `fn` 或者具有属性 `fn` 不等于 `fn` 的回调函数保留，其余的回调函数移除。
最后，返回组件实例的代理对象。

`off` 函数用于移除组件实例中的事件监听器。可以通过不同的参数组合来指定要移除的事件和回调函数。如果没有指定事件和回调函数，则会移除所有事件的监听器。
 */
export function off(
  instance: ComponentInternalInstance,
  event?: string | string[],
  fn?: Function
) {
  assertCompatEnabled(DeprecationTypes.INSTANCE_EVENT_EMITTER, instance)
  const vm = instance.proxy
  // all
  if (!event) {
    eventRegistryMap.set(instance, Object.create(null))
    return vm
  }
  // array of events
  if (isArray(event)) {
    event.forEach(e => off(instance, e, fn))
    return vm
  }
  // specific event
  const events = getRegistry(instance)
  const cbs = events[event!]
  if (!cbs) {
    return vm
  }
  if (!fn) {
    events[event!] = undefined
    return vm
  }
  events[event!] = cbs.filter(cb => !(cb === fn || (cb as any).fn === fn))
  return vm
}
/**
 * 
 * @param instance 
 * @param event 
 * @param args 
 * @returns 
 * `emit` 是一个用于触发组件内部实例 (`ComponentInternalInstance`) 的事件的函数。

该函数接受三个参数：`instance` 表示组件实例，`event` 表示要触发的事件，`args` 表示传递给事件处理函数的参数数组。

函数内部首先从事件注册表中获取指定事件 `event` 对应的回调函数列表 `cbs`。

如果回调函数列表存在，则调用 `callWithAsyncErrorHandling` 函数执行以下操作：
- 将回调函数列表中的每个回调函数绑定到组件实例的代理对象上，并形成一个新的函数数组。
- 使用 `callWithAsyncErrorHandling` 函数调用新的回调函数数组，传递组件实例、错误代码和参数数组作为参数。这样可以在执行回调函数时进行错误处理。

最后，返回组件实例的代理对象。

`emit` 函数用于触发组件实例的事件，并将参数传递给事件处理函数。如果指定事件的回调函数列表存在，则会按顺序执行每个回调函数，并进行错误处理。
 */
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  args: any[]
) {
  const cbs = getRegistry(instance)[event]
  if (cbs) {
    callWithAsyncErrorHandling(
      cbs.map(cb => cb.bind(instance.proxy)),
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }
  return instance.proxy
}
