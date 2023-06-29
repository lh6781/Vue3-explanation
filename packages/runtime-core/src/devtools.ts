/* eslint-disable no-restricted-globals */
import { App } from './apiCreateApp'
import { Fragment, Text, Comment, Static } from './vnode'
import { ComponentInternalInstance } from './component'
/**
 * `AppRecord` 接口定义了一个应用程序记录对象，用于描述一个应用程序的相关信息。它包含以下属性：

- `id: number`：应用程序的唯一标识符，通常为数字类型。
- `app: App`：应用程序实例，通常是一个 Vue 应用程序实例。
- `version: string`：应用程序的版本号，通常为字符串类型。
- `types: Record<string, string | Symbol>`：类型记录，用于描述应用程序中定义的类型。它是一个键值对的对象，其中键是类型的名称，值可以是字符串类型或符号类型。

通过使用 `AppRecord` 接口，可以定义一个包含应用程序信息的对象，以便在应用程序中进行引用和使用。
 */
interface AppRecord {
  id: number
  app: App
  version: string
  types: Record<string, string | Symbol>
}
/**
 * `DevtoolsHooks` 是一个常量枚举，用于定义开发者工具钩子的名称。它包含了一组常量字符串，用于标识不同的开发者工具事件。这些常量字符串包括：

- `APP_INIT`: 应用程序初始化完成的钩子事件。
- `APP_UNMOUNT`: 应用程序卸载的钩子事件。
- `COMPONENT_UPDATED`: 组件更新完成的钩子事件。
- `COMPONENT_ADDED`: 组件添加完成的钩子事件。
- `COMPONENT_REMOVED`: 组件移除完成的钩子事件。
- `COMPONENT_EMIT`: 组件触发事件的钩子事件。
- `PERFORMANCE_START`: 性能监测开始的钩子事件。
- `PERFORMANCE_END`: 性能监测结束的钩子事件。

使用这些常量枚举可以提供一致的命名和标识，用于在开发者工具中处理和监听相应的事件。
 */
const enum DevtoolsHooks {
  APP_INIT = 'app:init',
  APP_UNMOUNT = 'app:unmount',
  COMPONENT_UPDATED = 'component:updated',
  COMPONENT_ADDED = 'component:added',
  COMPONENT_REMOVED = 'component:removed',
  COMPONENT_EMIT = 'component:emit',
  PERFORMANCE_START = 'perf:start',
  PERFORMANCE_END = 'perf:end'
}
/**
 * `DevtoolsHook` 是一个接口，用于定义开发者工具的钩子函数。它包含了以下属性和方法：

- `enabled`（可选）: 表示开发者工具是否已启用的布尔值。
- `emit`: 一个函数，用于触发指定事件并传递参数。
  - 参数 `event` 是要触发的事件名称。
  - 参数 `...payload` 是要传递给事件处理函数的参数列表。
- `on`: 一个函数，用于监听指定事件并绑定处理函数。
  - 参数 `event` 是要监听的事件名称。
  - 参数 `handler` 是要绑定的事件处理函数。
- `once`: 一个函数，用于监听指定事件并绑定一次性的处理函数。
  - 参数 `event` 是要监听的事件名称。
  - 参数 `handler` 是要绑定的一次性事件处理函数。
- `off`: 一个函数，用于取消监听指定事件的处理函数。
  - 参数 `event` 是要取消监听的事件名称。
  - 参数 `handler` 是要取消绑定的事件处理函数。
- `appRecords`: 一个数组，包含应用程序记录的列表。每个应用程序记录都是一个 `AppRecord` 对象，包含应用程序的相关信息。
- `cleanupBuffer`（可选）: 一个函数，用于清理缓冲区中的数据。
  - 参数 `matchArg` 是用于匹配和清理缓冲区数据的参数。
  - 返回值是一个布尔值，表示参数是否在缓冲区中找到并清理。

通过使用 `DevtoolsHook` 接口，开发者工具可以与应用程序进行通信、监听事件、管理应用程序记录，并提供其他实用功能。
 */
interface DevtoolsHook {
  enabled?: boolean
  emit: (event: string, ...payload: any[]) => void
  on: (event: string, handler: Function) => void
  once: (event: string, handler: Function) => void
  off: (event: string, handler: Function) => void
  appRecords: AppRecord[]
  /**
   * Added at https://github.com/vuejs/devtools/commit/f2ad51eea789006ab66942e5a27c0f0986a257f9
   * Returns wether the arg was buffered or not
   */
  cleanupBuffer?: (matchArg: unknown) => boolean
}
/**
 * `devtools` 是一个变量，类型为 `DevtoolsHook`，用于在开发者工具中实例化和操作开发者工具的钩子函数。通过该变量，可以访问和调用 `DevtoolsHook` 接口中定义的属性和方法，以与开发者工具进行交互。

在导出语句中，`devtools` 被声明为可变的变量（使用 `let` 关键字），因此可以在代码中对其进行赋值和修改。开发者可以使用 `devtools` 变量来引用开发者工具的实例，并通过该实例执行相关的操作，例如触发事件、监听事件、管理应用程序记录等。

请注意，在导出语句中，`devtools` 变量被声明为导出的成员，因此其他模块可以导入并使用它来与开发者工具进行通信和交互。
 */
export let devtools: DevtoolsHook
/**
 * `buffer` 是一个变量，类型为 `{ event: string; args: any[] }[]`，用于存储事件和参数的缓冲区。它是一个数组，每个元素是一个对象，包含两个属性：`event` 表示事件的名称，`args` 表示事件的参数数组。

通过使用 `buffer` 变量，可以将事件和参数添加到缓冲区中，而不立即触发或处理它们。这对于在某些情况下需要延迟处理事件或在特定条件下进行批量处理时很有用。可以使用 `buffer.push()` 方法将事件和参数添加到缓冲区，然后根据需要在后续步骤中处理它们。

请注意，`buffer` 变量是在导出之前使用 `let` 关键字声明的，因此其他模块可以导入并使用它来访问和操作缓冲区中的事件和参数。
 */
let buffer: { event: string; args: any[] }[] = []
/**
 * `devtoolsNotInstalled` 是一个变量，类型为 `boolean`，用于表示 Devtools 是否未安装。

当 `devtoolsNotInstalled` 的值为 `false` 时，表示 Devtools 已安装。这意味着开发者工具可以与应用程序进行通信，并使用 Devtools 相关的功能。

当 `devtoolsNotInstalled` 的值为 `true` 时，表示 Devtools 未安装。这可能意味着开发者工具插件未正确安装或版本不兼容，或者当前环境不支持 Devtools。

在某些情况下，应用程序可能需要根据 `devtoolsNotInstalled` 的值来采取特定的行动，例如在 Devtools 未安装时提供备用的调试方式或功能。

请注意，`devtoolsNotInstalled` 是在导出之前声明的变量，因此其他模块可以导入并使用它来检查 Devtools 是否已安装。
 */
let devtoolsNotInstalled = false
/**
 * 
 * @param event 
 * @param args 
 * 这是一个名为 `emit` 的函数，用于发送事件。

函数接受两个参数：
- `event`：表示要发送的事件的名称，类型为 `string`。
- `args`：表示要发送的事件的附加参数，类型为可变参数列表（`...args: any[]`）。

在函数内部，它首先检查 `devtools` 是否已定义（不为 `null` 或 `undefined`）。如果 `devtools` 已定义，则调用 `devtools.emit(event, ...args)` 方法将事件和参数发送给开发者工具。

如果 `devtools` 未定义，并且 `devtoolsNotInstalled` 的值为 `false`，则将事件和参数添加到 `buffer` 数组中，以便稍后在 Devtools 安装时发送。

请注意，`buffer` 是一个在之前声明的变量，用于缓存在 Devtools 未安装时发送的事件。这样做是为了确保在 Devtools 安装后，之前发生的事件也能被捕获和处理。
 */
function emit(event: string, ...args: any[]) {
  if (devtools) {
    devtools.emit(event, ...args)
  } else if (!devtoolsNotInstalled) {
    buffer.push({ event, args })
  }
}
/**
 * 
 * @param hook 
 * @param target 
 * 这是一个名为 `setDevtoolsHook` 的函数，用于设置 Devtools 钩子。

函数接受两个参数：
- `hook`：表示要设置的 Devtools 钩子对象，类型为 `DevtoolsHook`。
- `target`：表示要设置 Devtools 钩子的目标对象，类型为 `any`。

在函数内部，它首先将传入的 `hook` 赋值给全局变量 `devtools`，表示已安装了 Devtools 钩子。

然后，它检查 `devtools` 是否已定义。如果已定义，则将 `devtools.enabled` 设置为 `true`，并将缓冲区中的所有事件和参数发送给 Devtools 钩子。发送后，将清空缓冲区。

如果 `devtools` 未定义，并且满足一些特定条件（当前运行环境为浏览器环境、`window` 对象存在且为完整的 `HTMLElement` 对象、不是 jsdom 环境），则将新的 Devtools 钩子添加到回放列表 `__VUE_DEVTOOLS_HOOK_REPLAY__` 中。这是为了处理在稍后注入 Devtools 钩子的情况。

如果在一定的延迟时间（3秒）后仍未安装 Devtools 钩子，则将 `devtoolsNotInstalled` 标志设置为 `true`，并清空缓冲区。

如果当前运行环境不是浏览器环境，则将 `devtoolsNotInstalled` 标志设置为 `true`，并清空缓冲区。

总之，`setDevtoolsHook` 函数用于设置和处理 Devtools 钩子的安装和事件回放。
 */
export function setDevtoolsHook(hook: DevtoolsHook, target: any) {
  devtools = hook
  if (devtools) {
    devtools.enabled = true
    buffer.forEach(({ event, args }) => devtools.emit(event, ...args))
    buffer = []
  } else if (
    // handle late devtools injection - only do this if we are in an actual
    // browser environment to avoid the timer handle stalling test runner exit
    // (#4815)
    typeof window !== 'undefined' &&
    // some envs mock window but not fully
    window.HTMLElement &&
    // also exclude jsdom
    !window.navigator?.userAgent?.includes('jsdom')
  ) {
    const replay = (target.__VUE_DEVTOOLS_HOOK_REPLAY__ =
      target.__VUE_DEVTOOLS_HOOK_REPLAY__ || [])
    replay.push((newHook: DevtoolsHook) => {
      setDevtoolsHook(newHook, target)
    })
    // clear buffer after 3s - the user probably doesn't have devtools installed
    // at all, and keeping the buffer will cause memory leaks (#4738)
    setTimeout(() => {
      if (!devtools) {
        target.__VUE_DEVTOOLS_HOOK_REPLAY__ = null
        devtoolsNotInstalled = true
        buffer = []
      }
    }, 3000)
  } else {
    // non-browser env, assume not installed
    devtoolsNotInstalled = true
    buffer = []
  }
}
/**
 * 
 * @param app 
 * @param version
 * 这是一个名为 `devtoolsInitApp` 的函数，用于初始化应用程序，并通过 Devtools 钩子发送应用程序初始化事件。

函数接受两个参数：
- `app`：表示应用程序实例，类型为 `App`。
- `version`：表示应用程序版本，类型为 `string`。

在函数内部，它使用 `emit` 函数发送 `DevtoolsHooks.APP_INIT` 事件，并传递应用程序实例、版本信息以及一些静态节点类型。

通过发送该事件，它将应用程序的初始化信息通知给已安装的 Devtools 插件，以便进行进一步的调试和监控操作。

请注意，`emit` 函数会检查是否已安装 Devtools 钩子，如果未安装，则会将事件和参数缓存到 `buffer` 中，直到 Devtools 钩子安装完成后再发送。 
 */
export function devtoolsInitApp(app: App, version: string) {
  emit(DevtoolsHooks.APP_INIT, app, version, {
    Fragment,
    Text,
    Comment,
    Static
  })
}
/**
 * 
 * @param app 
 * 这是一个名为 `devtoolsUnmountApp` 的函数，用于卸载应用程序，并通过 Devtools 钩子发送应用程序卸载事件。

函数接受一个参数：
- `app`：表示要卸载的应用程序实例，类型为 `App`。

在函数内部，它使用 `emit` 函数发送 `DevtoolsHooks.APP_UNMOUNT` 事件，并传递应用程序实例。

通过发送该事件，它将应用程序的卸载信息通知给已安装的 Devtools 插件，以便进行相应的处理和清理操作。

请注意，`emit` 函数会检查是否已安装 Devtools 钩子，如果未安装，则会将事件和参数缓存到 `buffer` 中，直到 Devtools 钩子安装完成后再发送。
 */
export function devtoolsUnmountApp(app: App) {
  emit(DevtoolsHooks.APP_UNMOUNT, app)
}
/**
 * 这是一个名为 `devtoolsComponentAdded` 的常量，它是通过调用 `createDevtoolsComponentHook` 函数创建的 Devtools 组件添加钩子。

该常量用于在组件添加时触发相应的事件，并将组件相关的信息发送给已安装的 Devtools 插件。

`createDevtoolsComponentHook` 函数接受一个参数：
- `hookEvent`：表示要创建的 Devtools 钩子事件，类型为 `DevtoolsHooks.COMPONENT_ADDED`。

函数内部会返回一个钩子函数，该钩子函数会在组件添加时调用 `emit` 函数，并传递相应的事件和参数，以通知 Devtools 插件进行处理。

通过调用 `devtoolsComponentAdded` 钩子函数，可以将组件添加的信息发送给 Devtools 插件，以便进行调试和监控。
 */
export const devtoolsComponentAdded = /*#__PURE__*/ createDevtoolsComponentHook(
  DevtoolsHooks.COMPONENT_ADDED
)
/**
 * 这是一个名为 `devtoolsComponentUpdated` 的常量，它是通过调用 `createDevtoolsComponentHook` 函数创建的 Devtools 组件更新钩子。

该常量用于在组件更新时触发相应的事件，并将更新后的组件信息发送给已安装的 Devtools 插件。

`createDevtoolsComponentHook` 函数接受一个参数：
- `hookEvent`：表示要创建的 Devtools 钩子事件，类型为 `DevtoolsHooks.COMPONENT_UPDATED`。

函数内部会返回一个钩子函数，该钩子函数会在组件更新时调用 `emit` 函数，并传递相应的事件和参数，以通知 Devtools 插件进行处理。

通过调用 `devtoolsComponentUpdated` 钩子函数，可以将组件更新的信息发送给 Devtools 插件，以便进行调试和监控。
 */
export const devtoolsComponentUpdated =
  /*#__PURE__*/ createDevtoolsComponentHook(DevtoolsHooks.COMPONENT_UPDATED)
/**
 * 这是一个名为 `_devtoolsComponentRemoved` 的常量，它是通过调用 `createDevtoolsComponentHook` 函数创建的 Devtools 组件移除钩子。

该常量用于在组件被移除时触发相应的事件，并将移除的组件信息发送给已安装的 Devtools 插件。

`createDevtoolsComponentHook` 函数接受一个参数：
- `hookEvent`：表示要创建的 Devtools 钩子事件，类型为 `DevtoolsHooks.COMPONENT_REMOVED`。

函数内部会返回一个钩子函数，该钩子函数会在组件被移除时调用 `emit` 函数，并传递相应的事件和参数，以通知 Devtools 插件进行处理。

通过调用 `_devtoolsComponentRemoved` 钩子函数，可以将组件移除的信息发送给 Devtools 插件，以便进行调试和监控。
 */
const _devtoolsComponentRemoved = /*#__PURE__*/ createDevtoolsComponentHook(
  DevtoolsHooks.COMPONENT_REMOVED
)
/**
 * 
 * @param component 
 * `devtoolsComponentRemoved` 是一个函数，用于处理组件移除的操作，并通知 Devtools 插件。

该函数接受一个参数：
- `component`：表示被移除的组件的 `ComponentInternalInstance` 实例。

函数内部首先检查是否存在已安装的 Devtools，并且确认 `devtools.cleanupBuffer` 是一个函数。这是为了确保在 Devtools 插件存在且具有清理缓冲区的能力时执行后续操作。

如果条件满足，并且通过调用 `devtools.cleanupBuffer(component)` 返回的结果为 `false`，即组件没有被缓冲，则调用 `_devtoolsComponentRemoved` 函数，并将组件实例作为参数传递给它。

通过调用 `devtoolsComponentRemoved` 函数，可以确保在组件被移除时，如果 Devtools 插件已安装且具有清理缓冲区的能力，将移除的组件信息发送给 Devtools 插件进行处理。
 */
export const devtoolsComponentRemoved = (
  component: ComponentInternalInstance
) => {
  if (
    devtools &&
    typeof devtools.cleanupBuffer === 'function' &&
    // remove the component if it wasn't buffered
    !devtools.cleanupBuffer(component)
  ) {
    _devtoolsComponentRemoved(component)
  }
}
/**
 * 
 * @param hook 
 * @returns 
 * `createDevtoolsComponentHook` 是一个函数，用于创建组件相关的 Devtools 钩子函数。

该函数接受一个参数：
- `hook`：表示要创建的 Devtools 钩子的类型，是一个 `DevtoolsHooks` 枚举值。

函数内部返回一个函数，这个返回的函数是实际的 Devtools 钩子函数。该函数接受一个参数 `component`，表示组件的 `ComponentInternalInstance` 实例。

在函数内部，通过调用 `emit` 函数触发对应的事件，并传递以下参数：
- `hook`：表示要触发的事件类型。
- `component.appContext.app`：表示组件所属的应用程序实例。
- `component.uid`：表示组件的唯一标识符。
- `component.parent ? component.parent.uid : undefined`：表示组件的父组件的唯一标识符，如果父组件存在的话；否则为 `undefined`。
- `component`：表示组件的 `ComponentInternalInstance` 实例。

通过调用 `createDevtoolsComponentHook` 函数并传入对应的 `DevtoolsHooks` 枚举值，可以创建一个用于触发对应组件相关事件的 Devtools 钩子函数。
 */
function createDevtoolsComponentHook(hook: DevtoolsHooks) {
  return (component: ComponentInternalInstance) => {
    emit(
      hook,
      component.appContext.app,
      component.uid,
      component.parent ? component.parent.uid : undefined,
      component
    )
  }
}
/**
 * `devtoolsPerfStart` 是一个用于触发性能开始事件的 Devtools 钩子函数。

该函数通过调用 `createDevtoolsPerformanceHook` 函数创建，接受一个参数 `hook`，表示要创建的 Devtools 钩子的类型，是一个 `DevtoolsHooks` 枚举值。

在函数内部，通过调用 `emit` 函数触发对应的事件，并传递以下参数：
- `hook`：表示要触发的事件类型。
- `performance`：性能计数器对象。

通过调用 `devtoolsPerfStart` 函数，可以触发性能开始事件，并将性能计数器对象作为参数传递给 Devtools。
 */
export const devtoolsPerfStart = /*#__PURE__*/ createDevtoolsPerformanceHook(
  DevtoolsHooks.PERFORMANCE_START
)
/**
 * `devtoolsPerfEnd` 是一个用于触发性能结束事件的 Devtools 钩子函数。

该函数通过调用 `createDevtoolsPerformanceHook` 函数创建，接受一个参数 `hook`，表示要创建的 Devtools 钩子的类型，是一个 `DevtoolsHooks` 枚举值。

在函数内部，通过调用 `emit` 函数触发对应的事件，并传递以下参数：
- `hook`：表示要触发的事件类型。
- `performance`：性能计数器对象。

通过调用 `devtoolsPerfEnd` 函数，可以触发性能结束事件，并将性能计数器对象作为参数传递给 Devtools。
 */
export const devtoolsPerfEnd = /*#__PURE__*/ createDevtoolsPerformanceHook(
  DevtoolsHooks.PERFORMANCE_END
)
/**
 * 
 * @param hook 
 * @returns 
 * `createDevtoolsPerformanceHook` 是一个用于创建性能相关的 Devtools 钩子函数的辅助函数。

该函数接受一个参数 `hook`，表示要创建的 Devtools 钩子的类型，是一个 `DevtoolsHooks` 枚举值。

在函数内部，它返回一个函数，该函数接受三个参数：
- `component`：表示组件的 `ComponentInternalInstance` 实例。
- `type`：表示性能类型的字符串。
- `time`：表示性能耗时的时间戳。

该函数通过调用 `emit` 函数触发对应的事件，并传递以下参数：
- `hook`：表示要触发的事件类型。
- `component.appContext.app`：表示组件所属的应用实例。
- `component.uid`：表示组件的唯一标识符。
- `component`：表示组件的 `ComponentInternalInstance` 实例。
- `type`：表示性能类型的字符串。
- `time`：表示性能耗时的时间戳。

通过调用 `createDevtoolsPerformanceHook` 函数，可以创建一个性能相关的 Devtools 钩子函数，并在适当的时机调用该函数来触发相应的性能事件，并传递相关的参数给 Devtools。
 */
function createDevtoolsPerformanceHook(hook: DevtoolsHooks) {
  return (component: ComponentInternalInstance, type: string, time: number) => {
    emit(hook, component.appContext.app, component.uid, component, type, time)
  }
}
/**
 * 
 * @param component 
 * @param event 
 * @param params 
 * `devtoolsComponentEmit` 是一个用于在组件实例上触发事件的辅助函数。

该函数接受三个参数：
- `component`：表示组件的 `ComponentInternalInstance` 实例。
- `event`：表示要触发的事件名称。
- `params`：表示要传递给事件处理程序的参数数组。

在函数内部，它通过调用 `emit` 函数触发 `DevtoolsHooks.COMPONENT_EMIT` 事件，并传递以下参数：
- `component.appContext.app`：表示组件所属的应用实例。
- `component`：表示组件的 `ComponentInternalInstance` 实例。
- `event`：表示要触发的事件名称。
- `params`：表示要传递给事件处理程序的参数数组。

通过调用 `devtoolsComponentEmit` 函数，可以方便地在组件实例上触发自定义事件，并将事件信息传递给 Devtools 进行监控和调试。
 */
export function devtoolsComponentEmit(
  component: ComponentInternalInstance,
  event: string,
  params: any[]
) {
  emit(
    DevtoolsHooks.COMPONENT_EMIT,
    component.appContext.app,
    component,
    event,
    params
  )
}
