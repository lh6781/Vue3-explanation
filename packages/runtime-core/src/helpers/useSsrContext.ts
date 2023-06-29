import { inject } from '../apiInject'
import { warn } from '../warning'
/**
 * `ssrContextKey` 是一个用于在上下文中存储服务器端渲染（SSR）相关信息的 Symbol 键。

在 Vue.js 中，当进行服务器端渲染时，可以使用上下文对象来共享一些特定于服务器端渲染的信息。`ssrContextKey` 是一个用于标识服务器端渲染上下文中存储 SSR 相关信息的键。

通过使用 `Symbol.for('v-scx')`，确保在不同的模块之间，即使使用相同的字符串作为标识键，也能够得到相同的 Symbol 值。这样可以确保在整个应用程序中使用相同的键来访问服务器端渲染上下文中的数据，避免冲突和混淆。

在具体的实现中，`ssrContextKey` 作为一个 Symbol 键，可以用于在上下文中存储和访问服务器端渲染相关的数据和状态。
 */
export const ssrContextKey = Symbol.for('v-scx')
/**
 * 
 * @returns 
 * `useSSRContext` 是一个自定义的 Vue Composition API hook，用于在组件中获取服务器端渲染（SSR）上下文。

该 hook 首先会检查是否在全局构建中使用，如果是则会发出警告，因为在全局构建中不支持使用 `useSSRContext`。接着，它会尝试通过 `inject` 函数从上层组件的注入中获取 SSR 上下文对象。如果成功获取到上下文对象，则返回该对象。如果未能获取到上下文对象，则发出警告，提示在服务器构建中使用 `useSSRContext` 的时候需要提供 SSR 上下文。

通过使用 `useSSRContext`，组件可以访问服务器端渲染的上下文数据和状态，以便在服务器端渲染期间执行相应的逻辑或调整组件的行为。请注意，在使用 `useSSRContext` 之前，需要确保在服务器端渲染过程中提供了正确的 SSR 上下文，否则可能会导致错误或意外行为。

值得注意的是，`useSSRContext` 是一个自定义的 hook，它需要在 Vue 3 的组件中使用，并且需要在支持 Composition API 的环境中运行。
 */
export const useSSRContext = <T = Record<string, any>>() => {
  if (!__GLOBAL__) {
    const ctx = inject<T>(ssrContextKey)
    if (!ctx) {
      __DEV__ &&
        warn(
          `Server rendering context not provided. Make sure to only call ` +
            `useSSRContext() conditionally in the server build.`
        )
    }
    return ctx
  } else if (__DEV__) {
    warn(`useSSRContext() is not supported in the global build.`)
  }
}
