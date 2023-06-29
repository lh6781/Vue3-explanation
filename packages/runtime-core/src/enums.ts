/**
 * `LifecycleHooks` 是一个常量枚举，包含了各个生命周期钩子函数的名称。每个钩子函数名称都对应着一个唯一的字符串值。

以下是枚举中定义的生命周期钩子函数及其对应的字符串值：

- `BEFORE_CREATE`: 组件实例创建之前的钩子函数。字符串值为 `'bc'`。
- `CREATED`: 组件实例创建完成的钩子函数。字符串值为 `'c'`。
- `BEFORE_MOUNT`: 组件挂载之前的钩子函数。字符串值为 `'bm'`。
- `MOUNTED`: 组件挂载完成的钩子函数。字符串值为 `'m'`。
- `BEFORE_UPDATE`: 组件更新之前的钩子函数。字符串值为 `'bu'`。
- `UPDATED`: 组件更新完成的钩子函数。字符串值为 `'u'`。
- `BEFORE_UNMOUNT`: 组件卸载之前的钩子函数。字符串值为 `'bum'`。
- `UNMOUNTED`: 组件卸载完成的钩子函数。字符串值为 `'um'`。
- `DEACTIVATED`: 组件失活的钩子函数。字符串值为 `'da'`。
- `ACTIVATED`: 组件激活的钩子函数。字符串值为 `'a'`。
- `RENDER_TRIGGERED`: 渲染触发的钩子函数。字符串值为 `'rtg'`。
- `RENDER_TRACKED`: 渲染追踪的钩子函数。字符串值为 `'rtc'`。
- `ERROR_CAPTURED`: 错误捕获的钩子函数。字符串值为 `'ec'`。
- `SERVER_PREFETCH`: 服务器预取的钩子函数。字符串值为 `'sp'`。

这些钩子函数代表了组件在不同阶段的生命周期中的回调函数。通过在相应的钩子函数中编写逻辑，可以在组件的不同生命周期阶段执行相应的操作和处理。
 */
export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
  SERVER_PREFETCH = 'sp'
}
