import { isArray, isDate, isObject, isSymbol } from './general'
/**
 * 
 * 这段代码定义了一个名为looseCompareArrays的函数，用于松散比较两个数组的内容是否相等。

函数接受两个参数a和b，分别表示要比较的两个数组。

函数的逻辑如下：

首先，比较数组a和数组b的长度，如果它们的长度不相等，则直接返回false，表示两个数组内容不相等。
初始化一个变量equal为true，用于标记比较的结果是否相等。
使用for循环遍历数组a的元素，同时判断equal为true，以及索引i小于数组长度。
在循环中，调用looseEqual函数比较数组a和数组b中对应索引i的元素是否相等。
将比较结果赋值给equal，如果当前元素比较结果为false，则equal将变为false，表示两个数组内容不相等。
循环结束后，返回equal的值作为最终的比较结果。
总结起来，该函数的作用是比较两个数组的内容是否相等。它首先比较数组长度，然后逐个比较对应索引位置上的元素是否相等。如果数组长度不同或存在不相等的元素，将返回false，否则返回true，表示两个数组内容相等。
 */
function looseCompareArrays(a: any[], b: any[]) {
  if (a.length !== b.length) return false
  let equal = true
  for (let i = 0; equal && i < a.length; i++) {
    equal = looseEqual(a[i], b[i])
  }
  return equal
}
/**
 * 
 * 这段代码定义了一个名为looseEqual的函数，用于松散比较两个值的相等性。

函数接受两个参数a和b，分别表示要比较的两个值。

函数的逻辑如下：

首先，使用严格相等运算符(===)比较a和b是否相等，如果相等，则直接返回true。
接下来，检查a和b的类型是否为日期类型，通过调用isDate函数进行判断。如果其中一个值为日期类型，则判断两个值是否都为日期类型，如果是，则比较它们的时间戳(getTime())是否相等，如果相等返回true，否则返回false。
然后，检查a和b的类型是否为符号类型，通过调用isSymbol函数进行判断。如果其中一个值为符号类型，则直接比较它们的值是否相等，如果相等返回true，否则返回false。
接下来，检查a和b的类型是否为数组类型，通过调用isArray函数进行判断。如果其中一个值为数组类型，则判断两个值是否都为数组类型，如果是，则调用looseCompareArrays函数比较数组的内容是否相等，如果相等返回true，否则返回false。
然后，检查a和b的类型是否为对象类型，通过调用isObject函数进行判断。如果其中一个值为对象类型，则判断两个值是否都为对象类型。如果其中一个值不是对象类型，则返回false。
如果两个值都为对象类型，则比较它们的键值对是否相等。首先比较两个对象的键的数量是否相等，如果不相等，则返回false。然后使用for...in循环遍历对象a的属性，并判断相应的属性在对象b中是否存在且对应的值是否相等。如果存在不相等的属性或属性值，则返回false。
最后，将a和b转换为字符串类型，并比较它们的字符串表示是否相等，如果相等返回true，否则返回false。
总结起来，该函数的作用是在松散相等的情况下比较两个值的相等性。它能够处理各种类型的值，包括基本类型、日期类型、符号类型、数组类型和对象类型，并根据各类型的特点进行相应的比较操作。
 */
export function looseEqual(a: any, b: any): boolean {
  if (a === b) return true
  let aValidType = isDate(a)
  let bValidType = isDate(b)
  if (aValidType || bValidType) {
    return aValidType && bValidType ? a.getTime() === b.getTime() : false
  }
  aValidType = isSymbol(a)
  bValidType = isSymbol(b)
  if (aValidType || bValidType) {
    return a === b
  }
  aValidType = isArray(a)
  bValidType = isArray(b)
  if (aValidType || bValidType) {
    return aValidType && bValidType ? looseCompareArrays(a, b) : false
  }
  aValidType = isObject(a)
  bValidType = isObject(b)
  if (aValidType || bValidType) {
    /* istanbul ignore if: this if will probably never be called */
    if (!aValidType || !bValidType) {
      return false
    }
    const aKeysCount = Object.keys(a).length
    const bKeysCount = Object.keys(b).length
    if (aKeysCount !== bKeysCount) {
      return false
    }
    for (const key in a) {
      const aHasKey = a.hasOwnProperty(key)
      const bHasKey = b.hasOwnProperty(key)
      if (
        (aHasKey && !bHasKey) ||
        (!aHasKey && bHasKey) ||
        !looseEqual(a[key], b[key])
      ) {
        return false
      }
    }
  }
  return String(a) === String(b)
}
/**
 * 
这段代码定义了一个名为looseIndexOf的函数，用于在数组中查找指定值的索引。

函数接受两个参数arr和val，分别表示要查找的数组和目标值。

函数的逻辑如下：

使用数组的findIndex方法，传入一个回调函数作为参数。
在回调函数中，调用looseEqual函数比较数组中的每个元素和目标值是否相等。
如果找到相等的元素，则findIndex方法会返回该元素在数组中的索引，如果找不到相等的元素，则返回-1。
函数直接返回findIndex方法的结果作为最终的索引值。
总结起来，该函数的作用是在数组中查找指定值的索引。它使用松散相等的方式进行比较，找到第一个相等的元素后返回其索引，如果找不到相等的元素则返回-1。
 */
export function looseIndexOf(arr: any[], val: any): number {
  return arr.findIndex(item => looseEqual(item, val))
}
