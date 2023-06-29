import {
  ComponentInternalInstance,
  currentInstance,
  isInSSRComponentSetup,
  setCurrentInstance,
  unsetCurrentInstance
} from './component'
import { ComponentPublicInstance } from './componentPublicInstance'
import { callWithAsyncErrorHandling, ErrorTypeStrings } from './errorHandling'
import { warn } from './warning'
import { toHandlerKey } from '@vue/shared'
import { DebuggerEvent, pauseTracking, resetTracking } from '@vue/reactivity'
import { LifecycleHooks } from './enums'

export { onActivated, onDeactivated } from './components/KeepAlive'
/**
 * 
 * @param type 
 * @param hook 
 * @param target 
 * @param prepend 
 * @returns 
 * 这段代码定义了一个名为 `injectHook` 的函数，用于在组件实例的生命周期钩子中注入函数。

函数接受以下参数：

- `type`：生命周期钩子类型，表示要注入的钩子类型。
- `hook`：要注入的函数。
- `target`：目标组件实例，默认为当前组件实例 `currentInstance`。
- `prepend`：是否将注入的函数添加到钩子数组的开头，默认为 `false`。

函数的逻辑如下：

1. 如果目标组件实例存在（`target` 不为空），则获取目标组件实例对应的钩子数组（`target[type]`）或创建一个新的钩子数组，并将其赋值给 `hooks` 变量。
2. 创建一个经过错误处理包装的钩子函数（`wrappedHook`）：
   - 如果钩子函数已经经过错误处理包装（`hook.__weh` 存在），则直接使用包装后的钩子函数。
   - 否则，创建一个新的包装后的钩子函数，该函数会执行以下操作：
     - 如果目标组件已经卸载（`target.isUnmounted` 为 `true`），则直接返回。
     - 禁用追踪（tracking）以防止在钩子执行期间触发其他追踪操作。
     - 在钩子执行期间设置当前组件实例（`setCurrentInstance`）为目标组件实例。
     - 使用带有异步错误处理的方式调用原始钩子函数（`callWithAsyncErrorHandling`），传递目标组件实例、钩子类型和参数。
     - 清除当前组件实例的设置（`unsetCurrentInstance`）。
     - 重置追踪状态。
     - 返回原始钩子函数的执行结果。
   - 将包装后的钩子函数赋值给原始钩子函数的 `__weh` 属性，以便缓存错误处理包装后的钩子函数，以便在调度程序中进行去重。
3. 如果 `prepend` 为 `true`，将包装后的钩子函数插入到钩子数组的开头，否则将其添加到数组的末尾。
4. 返回包装后的钩子函数。

如果目标组件实例不存在（`target` 为空），则会在开发模式下发出警告，提示在没有活动组件实例与之关联时调用该函数。并提醒生命周期注入 API 只能在 `setup` 函数执行期间使用。

这个函数的作用是在组件生命周期钩子中注入函数，并对函数执行进行错误处理。
 */
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInternalInstance | null = currentInstance,
  prepend: boolean = false
): Function | undefined {
  if (target) {
    const hooks = target[type] || (target[type] = [])
    // cache the error handling wrapper for injected hooks so the same hook
    // can be properly deduped by the scheduler. "__weh" stands for "with error
    // handling".
    const wrappedHook =
      hook.__weh ||
      (hook.__weh = (...args: unknown[]) => {
        if (target.isUnmounted) {
          return
        }
        // disable tracking inside all lifecycle hooks
        // since they can potentially be called inside effects.
        pauseTracking()
        // Set currentInstance during hook invocation.
        // This assumes the hook does not synchronously trigger other hooks, which
        // can only be false when the user does something really funky.
        setCurrentInstance(target)
        const res = callWithAsyncErrorHandling(hook, target, type, args)
        unsetCurrentInstance()
        resetTracking()
        return res
      })
    if (prepend) {
      hooks.unshift(wrappedHook)
    } else {
      hooks.push(wrappedHook)
    }
    return wrappedHook
  } else if (__DEV__) {
    const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''))
    warn(
      `${apiName} is called when there is no active component instance to be ` +
        `associated with. ` +
        `Lifecycle injection APIs can only be used during execution of setup().` +
        (__FEATURE_SUSPENSE__
          ? ` If you are using async setup(), make sure to register lifecycle ` +
            `hooks before the first await statement.`
          : ``)
    )
  }
}
/**
 * 
 * @param lifecycle 
 * @returns 
 * 这段代码定义了一个名为 `createHook` 的函数。它是一个高阶函数，用于创建并注入钩子函数到组件实例的生命周期钩子中。

函数的定义使用了泛型 `<T extends Function = () => any>`，表示钩子函数的类型，默认为接受任意参数并返回任意类型的函数。

函数接受以下参数：

- `lifecycle`：生命周期钩子类型，表示要注入钩子函数的生命周期阶段。
- `hook`：要注入的钩子函数。
- `target`：目标组件实例，默认为当前组件实例 `currentInstance`。

函数的逻辑如下：

1. 如果当前环境不是 SSR 组件的设置阶段（`isInSSRComponentSetup` 为 `false`），或者生命周期类型为 `LifecycleHooks.SERVER_PREFETCH`，则执行以下操作：
   - 调用 `injectHook` 函数，将生命周期类型、经过包装的钩子函数和目标组件实例作为参数进行注入。
   - 包装的钩子函数会执行传入的原始钩子函数，并进行错误处理。
2. 返回注入钩子函数的结果。

该函数的作用是根据生命周期类型创建钩子函数，并将其注入到组件实例的生命周期钩子中。在 SSR 组件设置阶段，除了 `SERVER_PREFETCH` 生命周期钩子外，其他钩子函数的注入都会被忽略，以避免在 SSR 过程中执行不必要的钩子函数。
 */
export const createHook =
  <T extends Function = () => any>(lifecycle: LifecycleHooks) =>
  (hook: T, target: ComponentInternalInstance | null = currentInstance) =>
    // post-create lifecycle registrations are noops during SSR (except for serverPrefetch)
    (!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH) &&
    injectHook(lifecycle, (...args: unknown[]) => hook(...args), target)
/**
 * 这段代码定义了一个名为 `onBeforeMount` 的常量，它使用 `createHook` 函数创建了一个在组件实例挂载之前执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.BEFORE_MOUNT`：表示生命周期阶段为组件实例挂载之前。
- 一个函数，作为要注入的钩子函数。

因此，`onBeforeMount` 常量就是一个在组件实例挂载之前执行的钩子函数，它会在组件实例挂载之前调用传入的函数。
 */
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
/**
 * 这段代码定义了一个名为 `onMounted` 的常量，它使用 `createHook` 函数创建了一个在组件实例挂载完成后执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.MOUNTED`：表示生命周期阶段为组件实例挂载完成后。
- 一个函数，作为要注入的钩子函数。

因此，`onMounted` 常量就是一个在组件实例挂载完成后执行的钩子函数，它会在组件实例挂载完成后调用传入的函数。
 */
export const onMounted = createHook(LifecycleHooks.MOUNTED)
/**
 * 这段代码定义了一个名为 `onBeforeUpdate` 的常量，它使用 `createHook` 函数创建了一个在组件实例更新之前执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.BEFORE_UPDATE`：表示生命周期阶段为组件实例更新之前。
- 一个函数，作为要注入的钩子函数。

因此，`onBeforeUpdate` 常量就是一个在组件实例更新之前执行的钩子函数，它会在组件实例更新之前调用传入的函数。
 */
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
/**
 * 这段代码定义了一个名为 `onUpdated` 的常量，它使用 `createHook` 函数创建了一个在组件实例更新完成后执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.UPDATED`：表示生命周期阶段为组件实例更新完成后。
- 一个函数，作为要注入的钩子函数。

因此，`onUpdated` 常量就是一个在组件实例更新完成后执行的钩子函数，它会在组件实例更新完成后调用传入的函数。
 */
export const onUpdated = createHook(LifecycleHooks.UPDATED)
/**
 * 这段代码定义了一个名为 `onBeforeUnmount` 的常量，它使用 `createHook` 函数创建了一个在组件实例即将卸载之前执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.BEFORE_UNMOUNT`：表示生命周期阶段为组件实例即将卸载之前。
- 一个函数，作为要注入的钩子函数。

因此，`onBeforeUnmount` 常量就是一个在组件实例即将卸载之前执行的钩子函数，它会在组件实例即将卸载之前调用传入的函数。
 */
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
/**
 * 这段代码定义了一个名为 `onUnmounted` 的常量，它使用 `createHook` 函数创建了一个在组件实例已经卸载之后执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.UNMOUNTED`：表示生命周期阶段为组件实例已经卸载。
- 一个函数，作为要注入的钩子函数。

因此，`onUnmounted` 常量就是一个在组件实例已经卸载之后执行的钩子函数，它会在组件实例已经卸载之后调用传入的函数。
 */
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
/**
 * 这段代码定义了一个名为 `onServerPrefetch` 的常量，它使用 `createHook` 函数创建了一个在服务器端预取数据阶段执行的钩子函数。

`createHook` 函数的调用传入了两个参数：
- `LifecycleHooks.SERVER_PREFETCH`：表示生命周期阶段为服务器端预取数据阶段。
- 一个函数，作为要注入的钩子函数。

因此，`onServerPrefetch` 常量就是一个在服务器端预取数据阶段执行的钩子函数，它会在服务器端预取数据阶段调用传入的函数。
 */
export const onServerPrefetch = createHook(LifecycleHooks.SERVER_PREFETCH)
/**
 * 这段代码定义了一个名为 `DebuggerHook` 的类型别名，它表示一个调试器钩子函数类型。该类型接受一个 `DebuggerEvent` 类型的参数 `e`，并没有返回值。调试器钩子函数通常用于在调试过程中捕获和处理特定事件。
 */
export type DebuggerHook = (e: DebuggerEvent) => void
/**
 * 这段代码定义了一个名为onRenderTriggered的常量。它使用createHook函数创建，使用DebuggerHook类型参数和LifecycleHooks.RENDER_TRIGGERED值作为lifecycle参数。

createHook函数返回一个函数，该函数接受一个hook函数和一个target组件实例作为参数。在这种情况下，为hook函数指定了DebuggerHook类型，表示它应该是一个接受DebuggerEvent参数的函数。

因此，onRenderTriggered是一个函数，用作RENDER_TRIGGERED生命周期事件的钩子。它可以用于注册一个调试器钩子函数，在组件触发渲染操作时调用该函数。
 */
export const onRenderTriggered = createHook<DebuggerHook>(
  LifecycleHooks.RENDER_TRIGGERED
)
/**
 * 这段代码定义了一个名为onRenderTracked的常量。它使用createHook函数创建，使用DebuggerHook类型参数和LifecycleHooks.RENDER_TRACKED值作为lifecycle参数。

createHook函数返回一个函数，该函数接受一个hook函数和一个target组件实例作为参数。在这种情况下，为hook函数指定了DebuggerHook类型，表示它应该是一个接受DebuggerEvent参数的函数。

因此，onRenderTracked是一个函数，用作RENDER_TRACKED生命周期事件的钩子。它可以用于注册一个调试器钩子函数，在组件的渲染操作被跟踪时调用该函数。
 */
export const onRenderTracked = createHook<DebuggerHook>(
  LifecycleHooks.RENDER_TRACKED
)
/**
 * ErrorCapturedHook是一个类型别名，用于定义错误捕获钩子函数的类型。它接受一个TError类型的错误参数err，一个ComponentPublicInstance类型的组件实例参数instance，以及一个字符串类型的info参数。

错误捕获钩子函数用于在组件内部捕获和处理错误。当组件发生错误时，错误捕获钩子会被调用，并传入错误对象、组件实例以及错误的附加信息。该钩子函数可以返回一个布尔值或void类型。如果返回布尔值，表示是否阻止错误继续传播；如果返回void，表示继续传播错误。

使用ErrorCapturedHook类型别名可以为错误捕获钩子函数提供类型注解和约束。
 */
export type ErrorCapturedHook<TError = unknown> = (
  err: TError,
  instance: ComponentPublicInstance | null,
  info: string
) => boolean | void
/**
 * 
 * @param hook 
 * @param target
 * `onErrorCaptured`是一个函数，用于注册错误捕获钩子函数。它接受一个`ErrorCapturedHook`类型的钩子函数`hook`作为参数，还可以指定可选的组件实例`target`。

当组件发生错误并被捕获时，注册的错误捕获钩子函数会被调用。你可以通过调用`onErrorCaptured`函数来注册自定义的错误捕获钩子函数，以便在组件内部处理错误。

如果不指定`target`参数，当前活动的组件实例（`currentInstance`）会被用作默认的目标实例。

通过调用`injectHook`函数，将错误捕获钩子函数注册到指定的组件实例的`ERROR_CAPTURED`生命周期钩子上。这样，当组件发生错误时，注册的钩子函数就会被触发执行。 
 */
export function onErrorCaptured<TError = Error>(
  hook: ErrorCapturedHook<TError>,
  target: ComponentInternalInstance | null = currentInstance
) {
  injectHook(LifecycleHooks.ERROR_CAPTURED, hook, target)
}
