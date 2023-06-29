import { isFunction, isObject } from '@vue/shared'
import { Component, ComponentInternalInstance } from '../component'
import {
  checkCompatEnabled,
  DeprecationTypes,
  softAssertCompatEnabled
} from './compatConfig'
import { convertLegacyAsyncComponent } from './componentAsync'
import { convertLegacyFunctionalComponent } from './componentFunctional'
/**
 * 
 * @param comp 
 * @param instance 
 * @returns 
 * 这段代码是一个函数 `convertLegacyComponent`，用于将旧版组件转换为新版组件。

函数接受两个参数 `comp` 和 `instance`，其中 `comp` 是待转换的组件，`instance` 是组件实例。

函数首先检查 `comp` 是否为内置组件，如果是，则直接返回该组件，不进行转换。

接下来，函数判断 `comp` 是否为 2.x 版本的构造函数。如果 `comp` 是一个函数且具有 `cid` 属性，说明它是 2.x 版本的构造函数，将其转换为新版组件选项对象 `comp.options`。

然后，函数判断 `comp` 是否为 2.x 版本的异步组件。如果 `comp` 是一个函数且通过 `checkCompatEnabled` 检查通过（即启用了异步组件的兼容性），则调用 `convertLegacyAsyncComponent` 函数将其转换为新版的异步组件。

接着，函数判断 `comp` 是否为 2.x 版本的函数式组件。如果 `comp` 是一个对象且具有 `functional` 属性，并且通过 `softAssertCompatEnabled` 检查通过（即启用了函数式组件的兼容性），则调用 `convertLegacyFunctionalComponent` 函数将其转换为新版的函数式组件。

最后，如果以上条件都不满足，则直接返回 `comp`，表示不需要进行转换。

这个函数的作用是根据组件的类型和兼容性配置，将旧版的组件转换为新版的组件。在转换过程中，可能会应用一些新版特性或规则，以确保组件在新版中的正确运行。
 */
export function convertLegacyComponent(
  comp: any,
  instance: ComponentInternalInstance | null
): Component {
  if (comp.__isBuiltIn) {
    return comp
  }

  // 2.x constructor
  if (isFunction(comp) && comp.cid) {
    comp = comp.options
  }

  // 2.x async component
  if (
    isFunction(comp) &&
    checkCompatEnabled(DeprecationTypes.COMPONENT_ASYNC, instance, comp)
  ) {
    // since after disabling this, plain functions are still valid usage, do not
    // use softAssert here.
    return convertLegacyAsyncComponent(comp)
  }

  // 2.x functional component
  if (
    isObject(comp) &&
    comp.functional &&
    softAssertCompatEnabled(
      DeprecationTypes.COMPONENT_FUNCTIONAL,
      instance,
      comp
    )
  ) {
    return convertLegacyFunctionalComponent(comp)
  }

  return comp
}
