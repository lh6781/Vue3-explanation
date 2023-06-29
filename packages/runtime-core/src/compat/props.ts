import { isArray } from '@vue/shared'
import { inject } from '../apiInject'
import { ComponentInternalInstance, Data } from '../component'
import { ComponentOptions, resolveMergedOptions } from '../componentOptions'
import { DeprecationTypes, warnDeprecation } from './compatConfig'
/**
 * 
 * @param instance 
 * @param rawProps 
 * @param propKey 
 * @returns 
 * `createPropsDefaultThis` 是一个用于创建代理对象的函数，用于在访问属性时提供默认的 `this` 上下文。

该函数接受三个参数：
- `instance`：组件实例，即 `ComponentInternalInstance`。
- `rawProps`：原始属性对象，即组件实例对应的 VNode 的 props 属性。
- `propKey`：属性键名。

函数内部使用 `Proxy` 创建一个代理对象，代理对象的 `get` 方法会在访问属性时触发。

在 `get` 方法内部，首先通过调用 `warnDeprecation` 函数发出一个警告，提示使用了已废弃的特性 `DeprecationTypes.PROPS_DEFAULT_THIS`。

然后，根据访问的属性 `key` 进行以下判断和处理：
- 如果属性 `key` 是 `$options`，则返回解析合并后的组件选项对象，即调用 `resolveMergedOptions(instance)` 函数。
- 如果属性 `key` 存在于原始属性对象 `rawProps` 中，则直接返回对应的属性值。
- 如果组件类型的 `inject` 属性存在，则进行进一步判断：
  - 如果 `inject` 是一个数组，并且属性 `key` 存在于 `inject` 数组中，则返回对应的注入值，即调用 `inject(key)` 函数。
  - 如果 `inject` 是一个对象，并且属性 `key` 存在于 `inject` 对象中，则返回对应的注入值，即调用 `inject(key)` 函数。

最后，函数返回创建的代理对象。

`createPropsDefaultThis` 函数用于创建一个代理对象，用于提供默认的 `this` 上下文。在访问属性时，代理对象会根据属性的类型和来源返回对应的值。这在处理组件实例的属性、选项和注入时非常有用。
 */
export function createPropsDefaultThis(
  instance: ComponentInternalInstance,
  rawProps: Data,
  propKey: string
) {
  return new Proxy(
    {},
    {
      get(_, key: string) {
        __DEV__ &&
          warnDeprecation(DeprecationTypes.PROPS_DEFAULT_THIS, null, propKey)
        // $options
        if (key === '$options') {
          return resolveMergedOptions(instance)
        }
        // props
        if (key in rawProps) {
          return rawProps[key]
        }
        // injections
        const injections = (instance.type as ComponentOptions).inject
        if (injections) {
          if (isArray(injections)) {
            if (injections.includes(key)) {
              return inject(key)
            }
          } else if (key in injections) {
            return inject(key)
          }
        }
      }
    }
  )
}
