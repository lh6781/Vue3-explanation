import { isOn } from '@vue/shared'
import { ComponentInternalInstance } from '../component'
import { assertCompatEnabled, DeprecationTypes } from './compatConfig'
/**
 * 
 * @param instance 
 * @returns 
 * `getCompatListeners` 是一个用于获取组件实例 (`ComponentInternalInstance`) 的监听器对象的函数。

该函数接受一个参数 `instance`，表示要获取监听器的组件实例。

函数内部首先通过调用 `assertCompatEnabled` 函数来验证兼容性是否启用，以确保该函数在兼容模式下使用。

然后，函数创建一个空的监听器对象 `listeners`，用于存储监听器的键值对。

接下来，函数获取组件实例的原始属性对象 `rawProps`，即组件实例对应的 VNode 的 props 属性。

如果原始属性对象不存在，则直接返回空的监听器对象。

如果原始属性对象存在，函数遍历原始属性对象的键值对。对于每个键值对，函数判断键名是否以 `on` 开头，表示它是一个事件监听器。

如果是事件监听器，则将键名的第三个字符转换为小写，并截取第三个字符之后的部分作为事件名，将事件名作为键，对应的值作为监听器函数存储到 `listeners` 对象中。

最后，函数返回存储了事件监听器的 `listeners` 对象。

`getCompatListeners` 函数用于获取组件实例的事件监听器对象。它会遍历组件实例的原始属性对象，将以 `on` 开头的键值对转换为对应的事件名和监听器函数，并存储到监听器对象中返回。
 */
export function getCompatListeners(instance: ComponentInternalInstance) {
  assertCompatEnabled(DeprecationTypes.INSTANCE_LISTENERS, instance)

  const listeners: Record<string, Function | Function[]> = {}
  const rawProps = instance.vnode.props
  if (!rawProps) {
    return listeners
  }
  for (const key in rawProps) {
    if (isOn(key)) {
      listeners[key[2].toLowerCase() + key.slice(3)] = rawProps[key]
    }
  }
  return listeners
}
