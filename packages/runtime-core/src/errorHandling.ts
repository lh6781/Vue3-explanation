import { VNode } from './vnode'
import { ComponentInternalInstance } from './component'
import { warn, pushWarningContext, popWarningContext } from './warning'
import { isPromise, isFunction } from '@vue/shared'
import { LifecycleHooks } from './enums'

// contexts where user provided function may be executed, in addition to
// lifecycle hooks.
/**
 * `ErrorCodes` 是一个常量枚举，包含了不同类型的错误代码。每个错误代码对应着一个数字值。

以下是枚举中定义的错误代码：

- `SETUP_FUNCTION`: 设置函数错误。对应的数字值为 `0`。
- `RENDER_FUNCTION`: 渲染函数错误。对应的数字值为 `1`。
- `WATCH_GETTER`: Watch getter 错误。对应的数字值为 `2`。
- `WATCH_CALLBACK`: Watch 回调函数错误。对应的数字值为 `3`。
- `WATCH_CLEANUP`: Watch 清理函数错误。对应的数字值为 `4`。
- `NATIVE_EVENT_HANDLER`: 原生事件处理器错误。对应的数字值为 `5`。
- `COMPONENT_EVENT_HANDLER`: 组件事件处理器错误。对应的数字值为 `6`。
- `VNODE_HOOK`: VNode 钩子函数错误。对应的数字值为 `7`。
- `DIRECTIVE_HOOK`: 指令钩子函数错误。对应的数字值为 `8`。
- `TRANSITION_HOOK`: 过渡钩子函数错误。对应的数字值为 `9`。
- `APP_ERROR_HANDLER`: 应用程序错误处理器错误。对应的数字值为 `10`。
- `APP_WARN_HANDLER`: 应用程序警告处理器错误。对应的数字值为 `11`。
- `FUNCTION_REF`: 函数引用错误。对应的数字值为 `12`。
- `ASYNC_COMPONENT_LOADER`: 异步组件加载器错误。对应的数字值为 `13`。
- `SCHEDULER`: 调度器错误。对应的数字值为 `14`。

这些错误代码用于标识不同类型的错误，在错误处理和错误报告中起到辅助的作用。当出现错误时，可以根据错误代码来定位和处理具体的错误类型。
 */
export const enum ErrorCodes {
  SETUP_FUNCTION,
  RENDER_FUNCTION,
  WATCH_GETTER,
  WATCH_CALLBACK,
  WATCH_CLEANUP,
  NATIVE_EVENT_HANDLER,
  COMPONENT_EVENT_HANDLER,
  VNODE_HOOK,
  DIRECTIVE_HOOK,
  TRANSITION_HOOK,
  APP_ERROR_HANDLER,
  APP_WARN_HANDLER,
  FUNCTION_REF,
  ASYNC_COMPONENT_LOADER,
  SCHEDULER
}
/**
 * `ErrorTypeStrings` 是一个记录类型，用于将 `LifecycleHooks` 和 `ErrorCodes` 枚举值映射到对应的错误类型字符串。

每个枚举值对应着一个错误类型字符串，用于在错误处理和错误报告中提供更具体的错误信息。

例如，`ErrorTypeStrings[LifecycleHooks.CREATED]` 的值为 `'created hook'`，用于表示 `created` 生命周期钩子的错误类型字符串。

该记录类型的定义确保了每个枚举值都有一个对应的错误类型字符串，以便在处理错误时能够准确定位和描述错误的类型。
 */
export const ErrorTypeStrings: Record<LifecycleHooks | ErrorCodes, string> = {
  [LifecycleHooks.SERVER_PREFETCH]: 'serverPrefetch hook',
  [LifecycleHooks.BEFORE_CREATE]: 'beforeCreate hook',
  [LifecycleHooks.CREATED]: 'created hook',
  [LifecycleHooks.BEFORE_MOUNT]: 'beforeMount hook',
  [LifecycleHooks.MOUNTED]: 'mounted hook',
  [LifecycleHooks.BEFORE_UPDATE]: 'beforeUpdate hook',
  [LifecycleHooks.UPDATED]: 'updated',
  [LifecycleHooks.BEFORE_UNMOUNT]: 'beforeUnmount hook',
  [LifecycleHooks.UNMOUNTED]: 'unmounted hook',
  [LifecycleHooks.ACTIVATED]: 'activated hook',
  [LifecycleHooks.DEACTIVATED]: 'deactivated hook',
  [LifecycleHooks.ERROR_CAPTURED]: 'errorCaptured hook',
  [LifecycleHooks.RENDER_TRACKED]: 'renderTracked hook',
  [LifecycleHooks.RENDER_TRIGGERED]: 'renderTriggered hook',
  [ErrorCodes.SETUP_FUNCTION]: 'setup function',
  [ErrorCodes.RENDER_FUNCTION]: 'render function',
  [ErrorCodes.WATCH_GETTER]: 'watcher getter',
  [ErrorCodes.WATCH_CALLBACK]: 'watcher callback',
  [ErrorCodes.WATCH_CLEANUP]: 'watcher cleanup function',
  [ErrorCodes.NATIVE_EVENT_HANDLER]: 'native event handler',
  [ErrorCodes.COMPONENT_EVENT_HANDLER]: 'component event handler',
  [ErrorCodes.VNODE_HOOK]: 'vnode hook',
  [ErrorCodes.DIRECTIVE_HOOK]: 'directive hook',
  [ErrorCodes.TRANSITION_HOOK]: 'transition hook',
  [ErrorCodes.APP_ERROR_HANDLER]: 'app errorHandler',
  [ErrorCodes.APP_WARN_HANDLER]: 'app warnHandler',
  [ErrorCodes.FUNCTION_REF]: 'ref function',
  [ErrorCodes.ASYNC_COMPONENT_LOADER]: 'async component loader',
  [ErrorCodes.SCHEDULER]:
    'scheduler flush. This is likely a Vue internals bug. ' +
    'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/core'
}
/**
 * `ErrorTypes` 是一个类型别名，用于表示错误类型。它可以是 `LifecycleHooks` 枚举值或 `ErrorCodes` 枚举值之一。

这个类型别名的目的是为了方便在代码中引用错误类型，可以将 `ErrorTypes` 用作函数参数、变量类型或返回值类型，以明确指定错误的类型范围。

例如，一个函数可以声明如下的参数类型：

```typescript
function handleError(error: Error, type: ErrorTypes) {
  // 处理特定类型的错误
  if (type === LifecycleHooks.CREATED) {
    // 处理 created 生命周期钩子的错误
  } else if (type === ErrorCodes.SETUP_FUNCTION) {
    // 处理 setup 函数的错误
  } else {
    // 处理其他类型的错误
  }
}
```

通过使用 `ErrorTypes` 类型别名，可以在函数签名中明确指定错误类型，提高代码的可读性和可维护性。
 */
export type ErrorTypes = LifecycleHooks | ErrorCodes
/**
 * 
 * @param fn 
 * @param instance 
 * @param type 
 * @param args 
 * @returns 
 * `callWithErrorHandling` 函数用于调用函数并处理其中可能发生的错误。它接受以下参数：

- `fn: Function`：要调用的函数。
- `instance: ComponentInternalInstance | null`：组件实例，可以为 `null`。
- `type: ErrorTypes`：错误类型，表示函数调用的上下文。
- `args?: unknown[]`：可选的参数数组，传递给函数调用。

该函数的执行逻辑如下：

1. 首先，声明一个变量 `res` 用于存储函数的返回值。
2. 使用 `try...catch` 块执行函数调用，如果函数调用中发生错误，则捕获错误并调用 `handleError` 函数处理错误。
3. 如果函数调用成功完成，将返回值存储在 `res` 变量中。
4. 返回函数的返回值 `res`。

通过使用 `callWithErrorHandling` 函数，可以确保在函数调用过程中捕获并处理任何可能发生的错误，以提高代码的可靠性和健壮性。
 */
export function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
) {
  let res
  try {
    res = args ? fn(...args) : fn()
  } catch (err) {
    handleError(err, instance, type)
  }
  return res
}
/**
 * 
 * @param fn 
 * @param instance 
 * @param type 
 * @param args 
 * @returns 
 * `callWithAsyncErrorHandling` 函数用于调用函数或函数数组，并处理其中可能发生的异步错误。它接受以下参数：

- `fn: Function | Function[]`：要调用的函数或函数数组。
- `instance: ComponentInternalInstance | null`：组件实例，可以为 `null`。
- `type: ErrorTypes`：错误类型，表示函数调用的上下文。
- `args?: unknown[]`：可选的参数数组，传递给函数调用。

该函数的执行逻辑如下：

1. 首先，检查 `fn` 是否为函数。如果是单个函数，则执行步骤 2；如果是函数数组，则执行步骤 4。
2. 使用 `callWithErrorHandling` 函数调用单个函数 `fn`，并传递 `instance`、`type` 和 `args`。
   - 如果函数调用返回一个 Promise 对象，则通过 `res.catch` 捕获 Promise 的异步错误，并调用 `handleError` 函数处理错误。
   - 返回函数的返回值 `res`。
3. 返回函数调用的返回值 `res`。
4. 声明一个空数组 `values` 用于存储函数调用的返回值。
5. 使用 `for` 循环遍历函数数组 `fn`，对每个函数调用递归调用 `callWithAsyncErrorHandling`，并传递 `instance`、`type` 和 `args`。
6. 将每个函数调用的返回值存储在 `values` 数组中。
7. 返回包含所有函数调用返回值的数组 `values`。

通过使用 `callWithAsyncErrorHandling` 函数，可以确保在函数调用过程中捕获并处理任何可能发生的异步错误，以保证应用程序的稳定性和可靠性。
 */
export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
): any[] {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args)
    if (res && isPromise(res)) {
      res.catch(err => {
        handleError(err, instance, type)
      })
    }
    return res
  }

  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
  }
  return values
}
/**
 * 
 * @param err 
 * @param instance 
 * @param type 
 * @param throwInDev 
 * @returns 
 * `handleError` 函数用于处理错误，并根据错误的类型执行相应的错误处理逻辑。它接受以下参数：

- `err: unknown`：要处理的错误对象。
- `instance: ComponentInternalInstance | null`：组件实例，可以为 `null`。
- `type: ErrorTypes`：错误类型，表示错误的上下文。
- `throwInDev = true`：一个布尔值，指示是否在开发模式下抛出错误。

该函数的执行逻辑如下：

1. 如果存在组件实例 `instance`，则将组件实例的虚拟节点 `instance.vnode` 赋值给变量 `contextVNode`，否则将其置为 `null`。
2. 如果存在组件实例 `instance`，则：
   - 初始化变量 `cur` 为组件实例的父级。
   - 将组件实例的代理对象 `instance.proxy` 赋值给变量 `exposedInstance`，以保持与 Vue 2.x 的一致性。
   - 根据开发模式 `__DEV__`，将错误类型 `type` 转换为相应的错误信息 `errorInfo`。
   - 在循环中遍历 `cur` 的每个父级，查找是否存在 `errorCapturedHooks` 错误捕获钩子数组。
     - 如果存在 `errorCapturedHooks`，则对每个错误捕获钩子函数调用，传递错误对象 `err`、代理对象 `exposedInstance` 和错误信息 `errorInfo`。
     - 如果某个错误捕获钩子函数返回 `false`，则立即返回，不再继续处理错误。
   - 如果组件实例的应用程序上下文存在 `errorHandler` 错误处理函数，则调用 `callWithErrorHandling` 函数执行应用程序级别的错误处理逻辑。
3. 如果存在应用程序级别的错误处理函数 `appErrorHandler`，则调用 `callWithErrorHandling` 函数执行错误处理逻辑，并传递错误对象 `err`、`null`（表示没有组件实例）、`ErrorCodes.APP_ERROR_HANDLER` 和包含错误信息的参数数组。
4. 最后，调用 `logError` 函数记录错误，传递错误对象 `err`、错误类型 `type`、上下文虚拟节点 `contextVNode` 和开发模式下是否抛出错误的标志 `throwInDev`。

`handleError` 函数的作用是在发生错误时，根据错误的类型执行相应的错误处理逻辑，包括调用组件级别和应用程序级别的错误捕获钩子函数、应用程序级别的错误处理函数以及记录错误信息。这样可以确保错误能够被适当地处理，从而提高应用程序的容错能力和可维护性。
 */
export function handleError(
  err: unknown,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  throwInDev = true
) {
  const contextVNode = instance ? instance.vnode : null
  if (instance) {
    let cur = instance.parent
    // the exposed instance is the render proxy to keep it consistent with 2.x
    const exposedInstance = instance.proxy
    // in production the hook receives only the error code
    const errorInfo = __DEV__ ? ErrorTypeStrings[type] : type
    while (cur) {
      const errorCapturedHooks = cur.ec
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          if (
            errorCapturedHooks[i](err, exposedInstance, errorInfo) === false
          ) {
            return
          }
        }
      }
      cur = cur.parent
    }
    // app-level handling
    const appErrorHandler = instance.appContext.config.errorHandler
    if (appErrorHandler) {
      callWithErrorHandling(
        appErrorHandler,
        null,
        ErrorCodes.APP_ERROR_HANDLER,
        [err, exposedInstance, errorInfo]
      )
      return
    }
  }
  logError(err, type, contextVNode, throwInDev)
}
/**
 * 
 * @param err 
 * @param type 
 * @param contextVNode 
 * @param throwInDev
 * `logError` 函数用于记录错误信息。它接受以下参数：

- `err: unknown`：要记录的错误对象。
- `type: ErrorTypes`：错误类型，表示错误的上下文。
- `contextVNode: VNode | null`：上下文的虚拟节点，可以为 `null`。
- `throwInDev = true`：一个布尔值，指示是否在开发模式下抛出错误，默认为 `true`。

该函数的执行逻辑如下：

1. 如果处于开发模式 `__DEV__`，则执行以下步骤：
   - 根据错误类型 `type` 获取相应的错误信息 `info`。
   - 如果存在上下文虚拟节点 `contextVNode`，则调用 `pushWarningContext` 函数将上下文推入警告上下文栈。
   - 使用 `warn` 函数输出错误信息，包括未处理的错误和错误执行的上下文信息。
   - 如果存在上下文虚拟节点 `contextVNode`，则调用 `popWarningContext` 函数将上下文从警告上下文栈中弹出。
   - 如果 `throwInDev` 为 `true`，则在开发模式下抛出错误。
   - 如果不处于测试模式 `__TEST__`，则使用 `console.error` 输出错误信息。
2. 如果处于生产模式，执行以下步骤：
   - 使用 `console.error` 输出错误信息。

`logError` 函数的作用是根据当前的开发/生产模式，记录错误信息。在开发模式下，它会输出详细的错误信息，并根据 `throwInDev` 参数决定是否抛出错误。而在生产模式下，它仅输出错误信息，以减少对最终用户的影响。这样可以根据不同的环境提供适当的错误处理和日志记录策略。 
 */
function logError(
  err: unknown,
  type: ErrorTypes,
  contextVNode: VNode | null,
  throwInDev = true
) {
  if (__DEV__) {
    const info = ErrorTypeStrings[type]
    if (contextVNode) {
      pushWarningContext(contextVNode)
    }
    warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`)
    if (contextVNode) {
      popWarningContext()
    }
    // crash in dev by default so it's more noticeable
    if (throwInDev) {
      throw err
    } else if (!__TEST__) {
      console.error(err)
    }
  } else {
    // recover in prod to reduce the impact on end-user
    console.error(err)
  }
}
