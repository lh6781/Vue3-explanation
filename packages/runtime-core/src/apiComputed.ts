import { computed as _computed } from '@vue/reactivity'
import { isInSSRComponentSetup } from './component'
/**
 * 
 * @param getterOrOptions 
 * @param debugOptions 
 * @returns 
 * computed 是一个函数，它是 _computed 函数的包装器。_computed 是 Vue.js 提供的计算属性的实现。

这个函数接受两个参数：getterOrOptions 和 debugOptions。

getterOrOptions 参数可以是一个计算属性的 getter 函数，也可以是一个包含 getter 和 setter 函数以及其他计算属性选项的对象。
debugOptions 参数是一个可选的调试选项对象，用于在开发环境下进行计算属性的调试。
在函数体内部，调用 _computed 函数，并将传入的参数和 isInSSRComponentSetup 参数一起传递给 _computed 函数。

最后，将 _computed 函数的返回值作为结果返回。

通过这个函数，我们可以使用更简洁的方式定义计算属性，并在需要时传递调试选项。它简化了计算属性的使用方式，并提供了一些便利的功能。
 */
export const computed: typeof _computed = (
  getterOrOptions: any,
  debugOptions?: any
) => {
  // @ts-ignore
  return _computed(getterOrOptions, debugOptions, isInSSRComponentSetup)
}
