import { SuspenseBoundary } from './components/Suspense'
import { VNode, VNodeNormalizedRef, VNodeNormalizedRefAtom } from './vnode'
import {
  EMPTY_OBJ,
  hasOwn,
  isArray,
  isFunction,
  isString,
  remove,
  ShapeFlags
} from '@vue/shared'
import { isAsyncWrapper } from './apiAsyncComponent'
import { getExposeProxy } from './component'
import { warn } from './warning'
import { isRef } from '@vue/reactivity'
import { callWithErrorHandling, ErrorCodes } from './errorHandling'
import { SchedulerJob } from './scheduler'
import { queuePostRenderEffect } from './renderer'

/**
 * Function for handling a template ref
 * 这段代码是 Vue.js 中的 `setRef` 函数。它用于设置组件中的引用（ref）。

首先，代码检查 `rawRef` 是否为数组，如果是数组，则对数组中的每个引用调用 `setRef` 函数进行处理。这样可以处理多个引用的情况。

接下来，代码检查是否为异步组件且非卸载状态。如果是，则不需要进行任何操作，因为模板引用会被转发给内部组件。

然后，代码根据组件类型的不同，确定引用的值。如果是有状态组件（`shapeFlag & ShapeFlags.STATEFUL_COMPONENT`），则使用组件的代理对象或组件实例本身作为引用值。否则，使用元素节点作为引用值。

接着，代码处理旧引用的情况。如果旧引用存在且与当前引用不同，则对旧引用进行处理。如果旧引用是字符串类型，则将其从引用对象中移除，并在 `setupState` 对象中将其置为 `null`。如果旧引用是响应式引用（`isRef(oldRef)`），则将其值置为 `null`。

接下来，代码处理新引用的情况。如果新引用是函数类型，则调用 `callWithErrorHandling` 函数执行函数引用，并传递引用值和引用对象作为参数。如果新引用是字符串类型或响应式引用，则根据不同情况进行处理。如果 `rawRef.f` 为真，则表示新引用是数组类型的引用。在卸载状态下，将引用值从数组中移除；在非卸载状态下，将引用值添加到数组中。如果新引用是字符串类型，则将引用值直接赋值给引用对象。如果新引用是响应式引用，则将引用值赋值给引用对象的 `value` 属性。如果以上情况都不满足，则输出警告信息，表示引用类型无效。

最后，如果引用值不为 `null`，则将 `doSet` 函数添加到渲染后的回调队列中，以在渲染完成后执行。否则，直接执行 `doSet` 函数。

总体而言，`setRef` 函数用于在组件中设置引用，并处理旧引用和新引用之间的关系。它支持处理多个引用和不同类型的引用，包括函数、字符串和响应式引用。
 */
export function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: SuspenseBoundary | null,
  vnode: VNode,
  isUnmount = false
) {
  if (isArray(rawRef)) {
    rawRef.forEach((r, i) =>
      setRef(
        r,
        oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef),
        parentSuspense,
        vnode,
        isUnmount
      )
    )
    return
  }

  if (isAsyncWrapper(vnode) && !isUnmount) {
    // when mounting async components, nothing needs to be done,
    // because the template ref is forwarded to inner component
    return
  }

  const refValue =
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? getExposeProxy(vnode.component!) || vnode.component!.proxy
      : vnode.el
  const value = isUnmount ? null : refValue

  const { i: owner, r: ref } = rawRef
  if (__DEV__ && !owner) {
    warn(
      `Missing ref owner context. ref cannot be used on hoisted vnodes. ` +
        `A vnode with ref must be created inside the render function.`
    )
    return
  }
  const oldRef = oldRawRef && (oldRawRef as VNodeNormalizedRefAtom).r
  const refs = owner.refs === EMPTY_OBJ ? (owner.refs = {}) : owner.refs
  const setupState = owner.setupState

  // dynamic ref changed. unset old ref
  if (oldRef != null && oldRef !== ref) {
    if (isString(oldRef)) {
      refs[oldRef] = null
      if (hasOwn(setupState, oldRef)) {
        setupState[oldRef] = null
      }
    } else if (isRef(oldRef)) {
      oldRef.value = null
    }
  }

  if (isFunction(ref)) {
    callWithErrorHandling(ref, owner, ErrorCodes.FUNCTION_REF, [value, refs])
  } else {
    const _isString = isString(ref)
    const _isRef = isRef(ref)
    if (_isString || _isRef) {
      const doSet = () => {
        if (rawRef.f) {
          const existing = _isString
            ? hasOwn(setupState, ref)
              ? setupState[ref]
              : refs[ref]
            : ref.value
          if (isUnmount) {
            isArray(existing) && remove(existing, refValue)
          } else {
            if (!isArray(existing)) {
              if (_isString) {
                refs[ref] = [refValue]
                if (hasOwn(setupState, ref)) {
                  setupState[ref] = refs[ref]
                }
              } else {
                ref.value = [refValue]
                if (rawRef.k) refs[rawRef.k] = ref.value
              }
            } else if (!existing.includes(refValue)) {
              existing.push(refValue)
            }
          }
        } else if (_isString) {
          refs[ref] = value
          if (hasOwn(setupState, ref)) {
            setupState[ref] = value
          }
        } else if (_isRef) {
          ref.value = value
          if (rawRef.k) refs[rawRef.k] = value
        } else if (__DEV__) {
          warn('Invalid template ref type:', ref, `(${typeof ref})`)
        }
      }
      if (value) {
        // #1789: for non-null values, set them after render
        // null values means this is unmount and it should not overwrite another
        // ref with the same key
        ;(doSet as SchedulerJob).id = -1
        queuePostRenderEffect(doSet, parentSuspense)
      } else {
        doSet()
      }
    } else if (__DEV__) {
      warn('Invalid template ref type:', ref, `(${typeof ref})`)
    }
  }
}
