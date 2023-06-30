import { DirectiveTransform } from '../transform'
/**
 * 
 * @returns 
 * `noopDirectiveTransform` 是一个指令转换函数，它的类型是 `DirectiveTransform`。它接受一个空的函数作为参数，没有实际的指令转换逻辑，只是返回一个空的对象。

在函数内部，它通过箭头函数的方式定义一个函数，并且函数体为空。然后，它返回一个对象，该对象具有 `props` 属性，值为一个空数组 `[]`。

这个函数在指令转换过程中可以被使用，当某个指令没有需要转换的逻辑时，可以使用 `noopDirectiveTransform` 来占位，以保持代码结构的完整性。
 */
export const noopDirectiveTransform: DirectiveTransform = () => ({ props: [] })
