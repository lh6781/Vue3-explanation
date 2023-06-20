import {
  isArray,
  isMap,
  isObject,
  isFunction,
  isPlainObject,
  isSet,
  objectToString,
  isString
} from './general'

/**
 * For converting {{ interpolation }} values to displayed strings.
 * 这段代码定义了一个名为toDisplayString的常量箭头函数。它接受一个参数val，表示要转换为显示字符串的值。

函数的逻辑如下：

首先通过isString函数判断val是否为字符串类型。
如果val是字符串，则直接返回该字符串。
如果val为null或undefined，则返回空字符串''。
如果val是数组类型，或者是对象类型且满足以下条件之一：
对象的toString方法与objectToString相等，或者
对象的toString方法不是函数类型（即非函数对象）。
则使用JSON.stringify将val转换为格式化后的 JSON 字符串，并返回结果。
否则，将val转换为字符串类型，并返回结果。
总结起来，toDisplayString函数用于将给定的值转换为显示字符串。它根据不同的情况使用不同的转换方式，包括直接返回字符串、空字符串、JSON 字符串或默认字符串转换。这个函数在处理不同类型的值时具有灵活性，并提供了合理的默认行为。
 */
export const toDisplayString = (val: unknown): string => {
  return isString(val)
    ? val
    : val == null
    ? ''
    : isArray(val) ||
      (isObject(val) &&
        (val.toString === objectToString || !isFunction(val.toString)))
    ? JSON.stringify(val, replacer, 2)
    : String(val)
}
/**
 * 
这段代码定义了一个常量箭头函数replacer，它在进行值转换时用作JSON.stringify的替换函数。

函数逻辑如下：

首先判断val是否为响应式引用对象（Reactive Reference）。如果是，则递归调用replacer函数，并将val.value作为新的值进行处理。
如果val是Map类型，则将其转换为一个具有特定格式的对象：
键为Map(size)，表示Map的大小；
值为一个对象，包含Map的每个键值对，键为原始键，值为对应的值。
如果val是Set类型，则将其转换为一个具有特定格式的对象：
键为Set(size)，表示Set的大小；
值为一个数组，包含Set的每个值。
如果val是对象类型，并且不是数组类型也不是普通对象类型（通过isPlainObject判断），则将其转换为字符串类型。
对于其他情况，直接返回val。
总结起来，replacer函数用于在使用JSON.stringify将值转换为字符串时，对特定类型的值进行自定义的替换处理。它处理响应式引用对象、Map和Set类型，并对非数组非普通对象类型的对象进行字符串转换。这样可以在转换过程中提供更详细和有意义的信息。
 */
const replacer = (_key: string, val: any): any => {
  // can't use isRef here since @vue/shared has no deps
  if (val && val.__v_isRef) {
    return replacer(_key, val.value)
  } else if (isMap(val)) {
    return {
      [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val]) => {
        ;(entries as any)[`${key} =>`] = val
        return entries
      }, {})
    }
  } else if (isSet(val)) {
    return {
      [`Set(${val.size})`]: [...val.values()]
    }
  } else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
    return String(val)
  }
  return val
}
