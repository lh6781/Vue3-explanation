import { toHandlerKey, isObject } from '@vue/shared'
import { warn } from '../warning'

/**
 * For prefixing keys in v-on="obj" with "on"
 * @private
 * `toHandlers` 函数用于将对象转换为事件处理函数的集合，返回一个新的对象。

函数接受两个参数：

1. `obj: Record<string, any>`：要转换的对象，它包含事件名称和对应的处理函数。
2. `preserveCaseIfNecessary?: boolean`：可选参数，如果为 `true`，则会在转换过程中保留事件名称的大小写（大写字母），默认为 `false`。

具体实现如下：

1. 首先，函数会创建一个空对象 `ret`，用于存储转换后的事件处理函数集合。
2. 如果传入的 `obj` 不是一个对象，函数会发出警告并返回空对象 `ret`。
3. 遍历 `obj` 中的每个属性（事件名称）：
   - 如果 `preserveCaseIfNecessary` 为 `true`，并且事件名称包含大写字母，则将事件名称转换为 `on:事件名称` 的形式，并将处理函数赋值给对应的属性。
   - 否则，将事件名称转换为驼峰式，并将处理函数赋值给对应的属性。
4. 返回转换后的对象 `ret`，其中包含了转换后的事件处理函数集合。

总之，`toHandlers` 函数用于将对象转换为事件处理函数的集合。它遍历对象的属性（事件名称），根据需要转换事件名称的大小写，并将处理函数赋值给对应的属性。返回一个新的对象，其中包含转换后的事件处理函数集合。
 */
export function toHandlers(
  obj: Record<string, any>,
  preserveCaseIfNecessary?: boolean
): Record<string, any> {
  const ret: Record<string, any> = {}
  if (__DEV__ && !isObject(obj)) {
    warn(`v-on with no argument expects an object value.`)
    return ret
  }
  for (const key in obj) {
    ret[
      preserveCaseIfNecessary && /[A-Z]/.test(key)
        ? `on:${key}`
        : toHandlerKey(key)
    ] = obj[key]
  }
  return ret
}
