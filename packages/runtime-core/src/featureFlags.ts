import { getGlobalThis } from '@vue/shared'

/**
 * This is only called in esm-bundler builds.
 * It is called when a renderer is created, in `baseCreateRenderer` so that
 * importing runtime-core is side-effects free.
 *
 * istanbul-ignore-next
 * `initFeatureFlags` 函数用于初始化特性标志。它执行以下操作：

1. 创建一个空数组 `needWarn`，用于存储需要警告的特性标志。
2. 检查全局变量 `__FEATURE_OPTIONS_API__` 是否为布尔值，如果不是，则执行以下步骤：
   - 在开发模式下，将特性标志名称 `__VUE_OPTIONS_API__` 添加到 `needWarn` 数组中。
   - 将全局变量 `__VUE_OPTIONS_API__` 设置为 `true`。
3. 检查全局变量 `__FEATURE_PROD_DEVTOOLS__` 是否为布尔值，如果不是，则执行以下步骤：
   - 在开发模式下，将特性标志名称 `__VUE_PROD_DEVTOOLS__` 添加到 `needWarn` 数组中。
   - 将全局变量 `__VUE_PROD_DEVTOOLS__` 设置为 `false`。
4. 如果处于开发模式 `__DEV__` 且 `needWarn` 数组非空，则执行以下步骤：
   - 根据 `needWarn` 数组的长度确定警告信息中的单数或复数形式。
   - 使用 `console.warn` 输出警告信息，提醒开发者需要在打包配置中全局注入特性标志。
5. 函数执行完毕。

`initFeatureFlags` 函数的作用是在运行时初始化特性标志。特性标志是用于控制 Vue 的不同特性和行为的全局变量。在函数内部，它检查特性标志的全局变量是否已定义，如果未定义，则将其设置为默认值，并在开发模式下提醒开发者在打包配置中注入特性标志。这样可以确保在不同的构建环境中正确配置特性标志，以获得所需的功能和优化。
 */
export function initFeatureFlags() {
  const needWarn = []

  if (typeof __FEATURE_OPTIONS_API__ !== 'boolean') {
    __DEV__ && needWarn.push(`__VUE_OPTIONS_API__`)
    getGlobalThis().__VUE_OPTIONS_API__ = true
  }

  if (typeof __FEATURE_PROD_DEVTOOLS__ !== 'boolean') {
    __DEV__ && needWarn.push(`__VUE_PROD_DEVTOOLS__`)
    getGlobalThis().__VUE_PROD_DEVTOOLS__ = false
  }

  if (__DEV__ && needWarn.length) {
    const multi = needWarn.length > 1
    console.warn(
      `Feature flag${multi ? `s` : ``} ${needWarn.join(', ')} ${
        multi ? `are` : `is`
      } not explicitly defined. You are running the esm-bundler build of Vue, ` +
        `which expects these compile-time feature flags to be globally injected ` +
        `via the bundler config in order to get better tree-shaking in the ` +
        `production bundle.\n\n` +
        `For more details, see https://link.vuejs.org/feature-flags.`
    )
  }
}
