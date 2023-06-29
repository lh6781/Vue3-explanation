import { isPlainObject } from '@vue/shared'
import { DeprecationTypes, warnDeprecation } from './compatConfig'
/**
 * 
 * @param to 
 * @param from 
 * @returns 
 * `deepMergeData` 是一个函数，用于深度合并两个对象的数据。

函数的参数如下：

- `to`：目标对象，将源对象的数据合并到该对象中。
- `from`：源对象，包含要合并到目标对象中的数据。

函数会遍历源对象的属性，并根据以下条件进行处理：

- 如果目标对象中已存在相同的属性，并且属性值都是普通对象，那么递归调用 `deepMergeData` 函数将源对象的对应属性值合并到目标对象的属性值中。
- 否则，直接将源对象的属性值赋值给目标对象的对应属性。

最后，函数返回合并后的目标对象。

该函数在合并对象数据时可以保持深度合并的方式，即逐层遍历对象属性进行合并，确保合并后的对象保留了源对象和目标对象的属性和数据。在某些情况下，可能会触发兼容性警告，并通过 `warnDeprecation` 函数进行提示。
 */
export function deepMergeData(to: any, from: any) {
  for (const key in from) {
    const toVal = to[key]
    const fromVal = from[key]
    if (key in to && isPlainObject(toVal) && isPlainObject(fromVal)) {
      __DEV__ && warnDeprecation(DeprecationTypes.OPTIONS_DATA_MERGE, null, key)
      deepMergeData(toVal, fromVal)
    } else {
      to[key] = fromVal
    }
  }
  return to
}
