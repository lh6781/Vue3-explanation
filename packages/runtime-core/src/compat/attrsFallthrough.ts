import { isOn } from '@vue/shared'
import { ComponentInternalInstance } from '../component'
import { DeprecationTypes, isCompatEnabled } from './compatConfig'
/**
 * 
 * @param key 
 * @param instance 
 * @returns 
 * 该函数用于确定是否应该跳过特定的属性（attribute）。

函数接受两个参数，`key` 表示属性名，`instance` 表示组件的内部实例。

函数首先检查 `key` 是否为 `'is'`，如果是，则返回 `true`，表示应该跳过该属性。

接下来，函数检查 `key` 是否为 `'class'` 或 `'style'`，并且在兼容性配置中启用了相关选项（`DeprecationTypes.INSTANCE_ATTRS_CLASS_STYLE`）。如果是，则返回 `true`，表示应该跳过该属性。

然后，函数检查 `key` 是否为事件监听器属性（以 `on` 开头），并且在兼容性配置中启用了相关选项（`DeprecationTypes.INSTANCE_LISTENERS`）。如果是，则返回 `true`，表示应该跳过该属性。

接着，函数检查 `key` 是否以 `'routerView'` 开头，或者是否等于 `'registerRouteInstance'`。如果是，则返回 `true`，表示应该跳过该属性。这个部分逻辑与 `vue-router` 相关。

最后，如果以上条件都不满足，则返回 `false`，表示不应该跳过该属性。

总结起来，该函数根据属性名和组件实例的配置，判断是否应该跳过特定的属性。通常用于在渲染过程中决定是否应用某个属性到 DOM 元素上。
 */
export function shouldSkipAttr(
  key: string,
  instance: ComponentInternalInstance
): boolean {
  if (key === 'is') {
    return true
  }
  if (
    (key === 'class' || key === 'style') &&
    isCompatEnabled(DeprecationTypes.INSTANCE_ATTRS_CLASS_STYLE, instance)
  ) {
    return true
  }
  if (
    isOn(key) &&
    isCompatEnabled(DeprecationTypes.INSTANCE_LISTENERS, instance)
  ) {
    return true
  }
  // vue-router
  if (key.startsWith('routerView') || key === 'registerRouteInstance') {
    return true
  }
  return false
}
