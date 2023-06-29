import {
  extend,
  looseEqual,
  looseIndexOf,
  looseToNumber,
  NOOP,
  toDisplayString
} from '@vue/shared'
import {
  ComponentPublicInstance,
  PublicPropertiesMap
} from '../componentPublicInstance'
import { getCompatChildren } from './instanceChildren'
import {
  DeprecationTypes,
  assertCompatEnabled,
  isCompatEnabled
} from './compatConfig'
import { off, on, once } from './instanceEventEmitter'
import { getCompatListeners } from './instanceListeners'
import { shallowReadonly } from '@vue/reactivity'
import { legacySlotProxyHandlers } from './componentFunctional'
import { compatH } from './renderFn'
import { createCommentVNode, createTextVNode } from '../vnode'
import { renderList } from '../helpers/renderList'
import {
  legacyBindDynamicKeys,
  legacyBindObjectListeners,
  legacyBindObjectProps,
  legacyCheckKeyCodes,
  legacyMarkOnce,
  legacyPrependModifier,
  legacyRenderSlot,
  legacyRenderStatic,
  legacyresolveScopedSlots
} from './renderHelpers'
import { resolveFilter } from '../helpers/resolveAssets'
import { InternalSlots, Slots } from '../componentSlots'
import { ContextualRenderFn } from '../componentRenderContext'
import { resolveMergedOptions } from '../componentOptions'
/**
 * `LegacyPublicInstance` 是一个类型别名，表示旧版的公共实例类型。它继承自 `ComponentPublicInstance` 类型，并添加了 `LegacyPublicProperties` 类型的属性。

`ComponentPublicInstance` 类型代表组件的公共实例类型，包含了组件实例的属性和方法。

`LegacyPublicProperties` 类型表示旧版的公共属性类型，可能包含了一些旧版的属性或方法。

通过将这两个类型合并，`LegacyPublicInstance` 类型可以表示旧版组件的公共实例，包含了旧版的属性、方法以及组件实例的属性和方法。
 */
export type LegacyPublicInstance = ComponentPublicInstance &
  LegacyPublicProperties
/**
 * `LegacyPublicProperties` 接口定义了一组旧版组件的公共属性。

- `$set(target: object, key: string, value: any): void`: 将目标对象的指定属性设置为指定值。
- `$delete(target: object, key: string): void`: 删除目标对象的指定属性。
- `$mount(el?: string | Element): this`: 将组件实例挂载到指定的 DOM 元素上，如果未提供参数，则创建一个新的 DOM 元素并挂载。
- `$destroy(): void`: 销毁组件实例，清理相关资源。
- `$scopedSlots: Slots`: 插槽对象，包含具名插槽的渲染函数。
- `$on(event: string | string[], fn: Function): this`: 监听指定的事件，当事件触发时执行回调函数。
- `$once(event: string, fn: Function): this`: 监听指定的事件，仅在第一次触发时执行回调函数，之后自动解绑。
- `$off(event?: string | string[], fn?: Function): this`: 解绑事件监听器，可选择性地指定要解绑的事件和回调函数。
- `$children: LegacyPublicProperties[]`: 子组件的公共属性数组。
- `$listeners: Record<string, Function | Function[]>`: 当前组件监听的事件及其对应的回调函数。

这些属性和方法是旧版组件实例的公共接口，用于操作和控制组件的行为和状态。
 */
export interface LegacyPublicProperties {
  $set(target: object, key: string, value: any): void
  $delete(target: object, key: string): void
  $mount(el?: string | Element): this
  $destroy(): void
  $scopedSlots: Slots
  $on(event: string | string[], fn: Function): this
  $once(event: string, fn: Function): this
  $off(event?: string | string[], fn?: Function): this
  $children: LegacyPublicProperties[]
  $listeners: Record<string, Function | Function[]>
}
/**
 * 
 * @param map 
 * `installCompatInstanceProperties` 函数用于安装兼容性实例属性，将一组旧版组件实例的属性和方法添加到指定的映射对象 `map` 中。

该函数内部定义了一些辅助函数 `set` 和 `del`，用于设置属性值和删除属性。然后使用 `extend` 方法将旧版组件实例的属性和方法添加到 `map` 中。

以下是添加的属性和方法的解释：

- `$set: i => set`: 旧版组件实例的 `$set` 方法，用于设置目标对象的属性值。
- `$delete: i => del`: 旧版组件实例的 `$delete` 方法，用于删除目标对象的属性。
- `$mount: i => i.ctx._compat_mount || NOOP`: 旧版组件实例的 `$mount` 方法，用于将组件实例挂载到 DOM 元素上。如果存在 `_compat_mount` 方法，则使用该方法，否则使用占位函数 `NOOP`。
- `$destroy: i => i.ctx._compat_destroy || NOOP`: 旧版组件实例的 `$destroy` 方法，用于销毁组件实例。如果存在 `_compat_destroy` 方法，则使用该方法，否则使用占位函数 `NOOP`。
- `$slots: i => new Proxy(i.slots, legacySlotProxyHandlers)`: 旧版组件实例的 `$slots` 属性，返回代理对象，用于访问插槽。
- `$scopedSlots: i => {...}`: 旧版组件实例的 `$scopedSlots` 属性，返回非作用域插槽的对象。
- `$on: i => on.bind(null, i)`: 旧版组件实例的 `$on` 方法，用于监听事件。
- `$once: i => once.bind(null, i)`: 旧版组件实例的 `$once` 方法，用于监听一次性事件。
- `$off: i => off.bind(null, i)`: 旧版组件实例的 `$off` 方法，用于解绑事件监听器。
- `$children: getCompatChildren`: 获取旧版组件实例的子组件数组。
- `$listeners: getCompatListeners`: 获取旧版组件实例的事件监听器对象。

如果启用了 `DeprecationTypes.PRIVATE_APIS` 兼容性选项，还会添加一些私有属性和方法。

这个函数的作用是将旧版组件实例的属性和方法添加到兼容性映射对象中，以确保在兼容模式下能够正确访问和调用这些属性和方法。
 */
export function installCompatInstanceProperties(map: PublicPropertiesMap) {
  const set = (target: any, key: any, val: any) => {
    target[key] = val
  }

  const del = (target: any, key: any) => {
    delete target[key]
  }

  extend(map, {
    $set: i => {
      assertCompatEnabled(DeprecationTypes.INSTANCE_SET, i)
      return set
    },

    $delete: i => {
      assertCompatEnabled(DeprecationTypes.INSTANCE_DELETE, i)
      return del
    },

    $mount: i => {
      assertCompatEnabled(
        DeprecationTypes.GLOBAL_MOUNT,
        null /* this warning is global */
      )
      // root mount override from ./global.ts in installCompatMount
      return i.ctx._compat_mount || NOOP
    },

    $destroy: i => {
      assertCompatEnabled(DeprecationTypes.INSTANCE_DESTROY, i)
      // root destroy override from ./global.ts in installCompatMount
      return i.ctx._compat_destroy || NOOP
    },

    // overrides existing accessor
    $slots: i => {
      if (
        isCompatEnabled(DeprecationTypes.RENDER_FUNCTION, i) &&
        i.render &&
        i.render._compatWrapped
      ) {
        return new Proxy(i.slots, legacySlotProxyHandlers)
      }
      return __DEV__ ? shallowReadonly(i.slots) : i.slots
    },

    $scopedSlots: i => {
      assertCompatEnabled(DeprecationTypes.INSTANCE_SCOPED_SLOTS, i)
      const res: InternalSlots = {}
      for (const key in i.slots) {
        const fn = i.slots[key]!
        if (!(fn as ContextualRenderFn)._ns /* non-scoped slot */) {
          res[key] = fn
        }
      }
      return res
    },

    $on: i => on.bind(null, i),
    $once: i => once.bind(null, i),
    $off: i => off.bind(null, i),

    $children: getCompatChildren,
    $listeners: getCompatListeners
  } as PublicPropertiesMap)

  /* istanbul ignore if */
  if (isCompatEnabled(DeprecationTypes.PRIVATE_APIS, null)) {
    extend(map, {
      // needed by many libs / render fns
      $vnode: i => i.vnode,

      // inject additional properties into $options for compat
      // e.g. vuex needs this.$options.parent
      $options: i => {
        const res = extend({}, resolveMergedOptions(i))
        res.parent = i.proxy!.$parent
        res.propsData = i.vnode.props
        return res
      },

      // some private properties that are likely accessed...
      _self: i => i.proxy,
      _uid: i => i.uid,
      _data: i => i.data,
      _isMounted: i => i.isMounted,
      _isDestroyed: i => i.isUnmounted,

      // v2 render helpers
      $createElement: () => compatH,
      _c: () => compatH,
      _o: () => legacyMarkOnce,
      _n: () => looseToNumber,
      _s: () => toDisplayString,
      _l: () => renderList,
      _t: i => legacyRenderSlot.bind(null, i),
      _q: () => looseEqual,
      _i: () => looseIndexOf,
      _m: i => legacyRenderStatic.bind(null, i),
      _f: () => resolveFilter,
      _k: i => legacyCheckKeyCodes.bind(null, i),
      _b: () => legacyBindObjectProps,
      _v: () => createTextVNode,
      _e: () => createCommentVNode,
      _u: () => legacyresolveScopedSlots,
      _g: () => legacyBindObjectListeners,
      _d: () => legacyBindDynamicKeys,
      _p: () => legacyPrependModifier
    } as PublicPropertiesMap)
  }
}
