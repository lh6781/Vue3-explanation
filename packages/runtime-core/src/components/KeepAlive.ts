import {
  ConcreteComponent,
  getCurrentInstance,
  SetupContext,
  ComponentInternalInstance,
  currentInstance,
  getComponentName,
  ComponentOptions
} from '../component'
import {
  VNode,
  cloneVNode,
  isVNode,
  VNodeProps,
  invokeVNodeHook,
  isSameVNodeType
} from '../vnode'
import { warn } from '../warning'
import {
  onBeforeUnmount,
  injectHook,
  onUnmounted,
  onMounted,
  onUpdated
} from '../apiLifecycle'
import {
  isString,
  isArray,
  isRegExp,
  ShapeFlags,
  remove,
  invokeArrayFns
} from '@vue/shared'
import { watch } from '../apiWatch'
import {
  RendererInternals,
  queuePostRenderEffect,
  MoveType,
  RendererElement,
  RendererNode
} from '../renderer'
import { setTransitionHooks } from './BaseTransition'
import { ComponentRenderContext } from '../componentPublicInstance'
import { devtoolsComponentAdded } from '../devtools'
import { isAsyncWrapper } from '../apiAsyncComponent'
import { isSuspense } from './Suspense'
import { LifecycleHooks } from '../enums'
/**
 * `MatchPattern` 是一个类型别名，用于表示匹配模式。它可以是字符串、正则表达式或字符串/正则表达式数组的组合。

- 如果 `MatchPattern` 是一个字符串，则它表示一个精确的匹配模式。只有与该字符串完全相等的值才会匹配。

- 如果 `MatchPattern` 是一个正则表达式，则它表示一个模式，用于进行模式匹配。与该正则表达式匹配的值将被视为匹配项。

- 如果 `MatchPattern` 是一个字符串/正则表达式数组的组合，则表示多个匹配模式。只要值与数组中的任何一个模式匹配，就被视为匹配项。

`MatchPattern` 类型别名的作用是提供一种灵活的方式来定义匹配模式，用于在不同的场景中进行匹配和筛选。
 */
type MatchPattern = string | RegExp | (string | RegExp)[]
/**
 * `KeepAliveProps` 是一个接口，用于定义 `KeepAlive` 组件的属性（props）。它具有以下属性：

- `include?: MatchPattern`：一个匹配模式，用于指定哪些组件应该被缓存并保持活动状态。只有匹配该模式的组件才会被缓存。

- `exclude?: MatchPattern`：一个匹配模式，用于指定哪些组件不应该被缓存。与该模式匹配的组件将不会被缓存。

- `max?: number | string`：指定缓存的最大组件实例数量。可以是一个数字或字符串。当缓存的组件实例数量达到最大值时，最早缓存的实例将被销毁。

`KeepAliveProps` 接口提供了配置 `KeepAlive` 组件行为的选项。通过设置 `include` 和 `exclude` 属性，可以精确控制哪些组件需要被缓存或排除在缓存之外。`max` 属性用于限制缓存的组件实例数量，以防止无限增长。
 */
export interface KeepAliveProps {
  include?: MatchPattern
  exclude?: MatchPattern
  max?: number | string
}
/**
 * `CacheKey` 是一个类型别名，用于表示缓存键的类型。它可以是以下类型之一：

- `string`：表示一个字符串键。
- `number`：表示一个数字键。
- `symbol`：表示一个符号键。
- `ConcreteComponent`：表示一个具体的组件类型。

`CacheKey` 用于标识缓存中的组件实例。在 `KeepAlive` 组件中，每个被缓存的组件实例都会关联一个缓存键，以便在缓存中进行查找和匹配。可以根据需要选择适当的缓存键类型。
 */
type CacheKey = string | number | symbol | ConcreteComponent
/**
 * `Cache` 是一个类型别名，用于表示缓存对象的类型。它是一个 `Map` 类型，其中的键是 `CacheKey` 类型，值是 `VNode` 类型。

在 `KeepAlive` 组件中，缓存对象用于存储已经创建的组件实例的虚拟节点 (`VNode`)。通过使用缓存对象，`KeepAlive` 组件可以根据缓存键快速检索和复用组件实例，而不必每次都重新创建。这有助于提高组件的性能和响应速度。
 */
type Cache = Map<CacheKey, VNode>
/**
 * `Keys` 是一个类型别名，用于表示一组缓存键的集合。它是一个 `Set` 类型，包含了多个 `CacheKey` 类型的值。

在 `KeepAlive` 组件中，`Keys` 用于跟踪当前缓存对象中存储的所有组件实例的缓存键。通过维护一个键的集合，`KeepAlive` 组件可以在需要时快速判断某个组件实例是否已经存在于缓存中，以及在缓存对象中添加或删除缓存键。这有助于在组件的激活和非激活状态之间进行快速切换，并管理缓存对象的状态。
 */
type Keys = Set<CacheKey>
/**
 * `KeepAliveContext` 接口扩展了 `ComponentRenderContext`，并添加了额外的属性和方法来支持 `KeepAlive` 组件的上下文操作。

- `renderer: RendererInternals`：表示渲染器的内部实现。它提供了与渲染器相关的方法和功能，用于在 `KeepAlive` 组件的上下文中执行特定的操作。

- `activate: Function`：激活函数，用于将一个虚拟节点（`vnode`）渲染并激活到指定的容器中。它接收以下参数：
  - `vnode: VNode`：要激活的虚拟节点。
  - `container: RendererElement`：容器元素，用于容纳激活的节点。
  - `anchor: RendererNode | null`：锚点节点，表示在哪个节点之前插入激活的节点。可以是一个有效的节点或 `null`。
  - `isSVG: boolean`：一个布尔值，指示容器是否为 SVG 元素。
  - `optimized: boolean`：一个布尔值，指示是否为优化模式。优化模式下，渲染器可能会应用特定的优化策略。

- `deactivate: Function`：停用函数，用于将一个虚拟节点（`vnode`）从容器中停用并移除。它接收以下参数：
  - `vnode: VNode`：要停用的虚拟节点。

`KeepAliveContext` 提供了与渲染器和节点激活/停用相关的方法和属性，以便在 `KeepAlive` 组件的上下文中进行操作和管理。
 */
export interface KeepAliveContext extends ComponentRenderContext {
  renderer: RendererInternals
  activate: (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    isSVG: boolean,
    optimized: boolean
  ) => void
  deactivate: (vnode: VNode) => void
}
/**
 * 
 * @param vnode 
 * @returns 
 * `isKeepAlive` 是一个函数，用于检查给定的虚拟节点 (`vnode`) 是否是一个 `KeepAlive` 组件。

它通过访问虚拟节点的 `type` 属性，并检查该属性的 `__isKeepAlive` 字段来确定节点是否为 `KeepAlive` 组件。这里使用了类型断言 `(vnode.type as any)`，将 `vnode.type` 视为 `any` 类型以访问 `__isKeepAlive` 字段。

如果 `__isKeepAlive` 字段存在且为真，则返回 `true`，表示虚拟节点是一个 `KeepAlive` 组件。否则，返回 `false`，表示虚拟节点不是一个 `KeepAlive` 组件。
 */
export const isKeepAlive = (vnode: VNode): boolean =>
  (vnode.type as any).__isKeepAlive
/**
 * `KeepAliveImpl` 是一个实现了 `ComponentOptions` 接口的对象，用于定义 `KeepAlive` 组件的行为和配置。

该对象具有以下属性和方法：

- `name: string`：组件的名称，设置为 `"KeepAlive"`。
- `__isKeepAlive: true`：特殊标记，用于在渲染器内部进行特殊处理。避免直接在渲染器中使用 `===` 检查 `KeepAlive` 组件，因为直接导入它会阻止树摇优化。
- `props: KeepAliveProps`：组件的属性定义，包括 `include`、`exclude` 和 `max`。
- `setup(props: KeepAliveProps, { slots }: SetupContext)`：组件的设置函数，用于设置组件的内部逻辑和响应式数据。它接收 `props` 和上下文对象 `SetupContext` 作为参数。在设置函数中，执行以下操作：
  - 获取当前组件实例 `instance`。
  - 获取共享上下文对象 `sharedContext`，其中包含渲染器的内部信息和 `activate`、`deactivate` 方法的实现。
  - 如果是服务端渲染 (`__SSR__`) 且没有注册内部渲染器，表示当前处于服务端渲染环境，此时只需渲染组件的子节点。
  - 创建缓存 `cache`，用于存储已缓存的虚拟节点。
  - 创建键集合 `keys`，用于存储缓存的键。
  - 初始化 `current` 变量为 `null`，用于存储当前活动的虚拟节点。
  - 如果是开发模式 (`__DEV__`) 或者开启了生产环境下的开发工具支持 (`__FEATURE_PROD_DEVTOOLS__`)，将缓存对象 `cache` 挂载到实例的 `__v_cache` 属性上，以便在开发工具中使用。
  - 获取父级 `suspense` 对象。
  - 从共享上下文中获取渲染器的相关方法，如 `patch`、`move`、`_unmount` 和 `createElement`。
  - 创建存储容器 `storageContainer`，用于在离开阶段暂存被缓存的节点。
  - 定义 `sharedContext` 的 `activate` 方法，用于激活缓存的节点，并在合适的位置进行渲染和激活相关钩子函数。
  - 定义 `sharedContext` 的 `deactivate` 方法，用于取消激活缓存的节点，并在合适的位置调用相关钩子函数。
  - 定义 `unmount` 方法，用于卸载虚拟节点。
  - 定义 `pruneCache` 方法，用于根据 `include` 和 `exclude` 过滤条件清理缓存。
  - 监听 `props.include` 和 `props.exclude` 的变化，根据新的过滤条件进行
 */
const KeepAliveImpl: ComponentOptions = {
  name: `KeepAlive`,

  // Marker for special handling inside the renderer. We are not using a ===
  // check directly on KeepAlive in the renderer, because importing it directly
  // would prevent it from being tree-shaken.
  __isKeepAlive: true,

  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },

  setup(props: KeepAliveProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    // KeepAlive communicates with the instantiated renderer via the
    // ctx where the renderer passes in its internals,
    // and the KeepAlive instance exposes activate/deactivate implementations.
    // The whole point of this is to avoid importing KeepAlive directly in the
    // renderer to facilitate tree-shaking.
    const sharedContext = instance.ctx as KeepAliveContext

    // if the internal renderer is not registered, it indicates that this is server-side rendering,
    // for KeepAlive, we just need to render its children
    if (__SSR__ && !sharedContext.renderer) {
      return () => {
        const children = slots.default && slots.default()
        return children && children.length === 1 ? children[0] : children
      }
    }

    const cache: Cache = new Map()
    const keys: Keys = new Set()
    let current: VNode | null = null

    if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
      ;(instance as any).__v_cache = cache
    }

    const parentSuspense = instance.suspense

    const {
      renderer: {
        p: patch,
        m: move,
        um: _unmount,
        o: { createElement }
      }
    } = sharedContext
    const storageContainer = createElement('div')

    sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
      const instance = vnode.component!
      move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
      // in case props have changed
      patch(
        instance.vnode,
        vnode,
        container,
        anchor,
        instance,
        parentSuspense,
        isSVG,
        vnode.slotScopeIds,
        optimized
      )
      queuePostRenderEffect(() => {
        instance.isDeactivated = false
        if (instance.a) {
          invokeArrayFns(instance.a)
        }
        const vnodeHook = vnode.props && vnode.props.onVnodeMounted
        if (vnodeHook) {
          invokeVNodeHook(vnodeHook, instance.parent, vnode)
        }
      }, parentSuspense)

      if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
        // Update components tree
        devtoolsComponentAdded(instance)
      }
    }

    sharedContext.deactivate = (vnode: VNode) => {
      const instance = vnode.component!
      move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
      queuePostRenderEffect(() => {
        if (instance.da) {
          invokeArrayFns(instance.da)
        }
        const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
        if (vnodeHook) {
          invokeVNodeHook(vnodeHook, instance.parent, vnode)
        }
        instance.isDeactivated = true
      }, parentSuspense)

      if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
        // Update components tree
        devtoolsComponentAdded(instance)
      }
    }

    function unmount(vnode: VNode) {
      // reset the shapeFlag so it can be properly unmounted
      resetShapeFlag(vnode)
      _unmount(vnode, instance, parentSuspense, true)
    }

    function pruneCache(filter?: (name: string) => boolean) {
      cache.forEach((vnode, key) => {
        const name = getComponentName(vnode.type as ConcreteComponent)
        if (name && (!filter || !filter(name))) {
          pruneCacheEntry(key)
        }
      })
    }

    function pruneCacheEntry(key: CacheKey) {
      const cached = cache.get(key) as VNode
      if (!current || !isSameVNodeType(cached, current)) {
        unmount(cached)
      } else if (current) {
        // current active instance should no longer be kept-alive.
        // we can't unmount it now but it might be later, so reset its flag now.
        resetShapeFlag(current)
      }
      cache.delete(key)
      keys.delete(key)
    }

    // prune cache on include/exclude prop change
    watch(
      () => [props.include, props.exclude],
      ([include, exclude]) => {
        include && pruneCache(name => matches(include, name))
        exclude && pruneCache(name => !matches(exclude, name))
      },
      // prune post-render after `current` has been updated
      { flush: 'post', deep: true }
    )

    // cache sub tree after render
    let pendingCacheKey: CacheKey | null = null
    const cacheSubtree = () => {
      // fix #1621, the pendingCacheKey could be 0
      if (pendingCacheKey != null) {
        cache.set(pendingCacheKey, getInnerChild(instance.subTree))
      }
    }
    onMounted(cacheSubtree)
    onUpdated(cacheSubtree)

    onBeforeUnmount(() => {
      cache.forEach(cached => {
        const { subTree, suspense } = instance
        const vnode = getInnerChild(subTree)
        if (cached.type === vnode.type && cached.key === vnode.key) {
          // current instance will be unmounted as part of keep-alive's unmount
          resetShapeFlag(vnode)
          // but invoke its deactivated hook here
          const da = vnode.component!.da
          da && queuePostRenderEffect(da, suspense)
          return
        }
        unmount(cached)
      })
    })

    return () => {
      pendingCacheKey = null

      if (!slots.default) {
        return null
      }

      const children = slots.default()
      const rawVNode = children[0]
      if (children.length > 1) {
        if (__DEV__) {
          warn(`KeepAlive should contain exactly one component child.`)
        }
        current = null
        return children
      } else if (
        !isVNode(rawVNode) ||
        (!(rawVNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) &&
          !(rawVNode.shapeFlag & ShapeFlags.SUSPENSE))
      ) {
        current = null
        return rawVNode
      }

      let vnode = getInnerChild(rawVNode)
      const comp = vnode.type as ConcreteComponent

      // for async components, name check should be based in its loaded
      // inner component if available
      const name = getComponentName(
        isAsyncWrapper(vnode)
          ? (vnode.type as ComponentOptions).__asyncResolved || {}
          : comp
      )

      const { include, exclude, max } = props

      if (
        (include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))
      ) {
        current = vnode
        return rawVNode
      }

      const key = vnode.key == null ? comp : vnode.key
      const cachedVNode = cache.get(key)

      // clone vnode if it's reused because we are going to mutate it
      if (vnode.el) {
        vnode = cloneVNode(vnode)
        if (rawVNode.shapeFlag & ShapeFlags.SUSPENSE) {
          rawVNode.ssContent = vnode
        }
      }
      // #1513 it's possible for the returned vnode to be cloned due to attr
      // fallthrough or scopeId, so the vnode here may not be the final vnode
      // that is mounted. Instead of caching it directly, we store the pending
      // key and cache `instance.subTree` (the normalized vnode) in
      // beforeMount/beforeUpdate hooks.
      pendingCacheKey = key

      if (cachedVNode) {
        // copy over mounted state
        vnode.el = cachedVNode.el
        vnode.component = cachedVNode.component
        if (vnode.transition) {
          // recursively update transition hooks on subTree
          setTransitionHooks(vnode, vnode.transition!)
        }
        // avoid vnode being mounted as fresh
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        // make this key the freshest
        keys.delete(key)
        keys.add(key)
      } else {
        keys.add(key)
        // prune oldest entry
        if (max && keys.size > parseInt(max as string, 10)) {
          pruneCacheEntry(keys.values().next().value)
        }
      }
      // avoid vnode being unmounted
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      current = vnode
      return isSuspense(rawVNode.type) ? rawVNode : vnode
    }
  }
}
/**
 * 如果 `__COMPAT__` 为真，则将 `KeepAliveImpl.__isBuildIn` 设置为 `true`。

这段代码的作用是在兼容模式下，将 `KeepAliveImpl` 标记为内置组件。这可能与特定的兼容性处理相关，但没有给出具体的上下文，因此无法提供更多信息。
 */
if (__COMPAT__) {
  KeepAliveImpl.__isBuildIn = true
}

// export the public type for h/tsx inference
// also to avoid inline import() in generated d.ts files
/**
 * `KeepAlive` 是将 `KeepAliveImpl` 作为导出的组件，并通过类型断言将其转换为特定类型的对象。

这段代码定义了 `KeepAlive` 对象，其中包含以下属性和方法：

- `__isKeepAlive: true`：用于标识该对象为 KeepAlive 组件。
- `new (): { ... }`：定义了一个构造函数，可以创建一个新的 KeepAlive 实例。
- `$props`：包含了继承自 `VNodeProps` 和 `KeepAliveProps` 的属性。
- `$slots.default()`：用于获取默认插槽内容，返回一个 `VNode` 数组。

通过这样的定义，可以创建一个 KeepAlive 组件实例，并访问其属性和插槽内容。
 */
export const KeepAlive = KeepAliveImpl as any as {
  __isKeepAlive: true
  new (): {
    $props: VNodeProps & KeepAliveProps
    $slots: {
      default(): VNode[]
    }
  }
}
/**
 * 
 * @param pattern 
 * @param name 
 * @returns 
 * 该函数用于判断给定的名称 `name` 是否与匹配模式 `pattern` 匹配。

- 如果 `pattern` 是一个数组，它会遍历数组中的每个元素，使用每个元素作为新的模式进行递归调用 `matches` 函数，并返回其中任意一个元素返回 `true` 的结果。
- 如果 `pattern` 是一个字符串，它会使用逗号分隔字符串，并检查是否包含给定的名称 `name`。
- 如果 `pattern` 是一个正则表达式，它会使用正则表达式对给定的名称 `name` 进行匹配。
- 如果 `pattern` 不是数组、字符串或正则表达式，则返回 `false`。

如果没有匹配的情况，则最后会返回 `false`。

请注意，这段代码中的注释 `/* istanbul ignore next ` 是一个用于代码覆盖率工具的特殊注释，指示工具忽略下一行代码的覆盖率统计。
 */
function matches(pattern: MatchPattern, name: string): boolean {
  if (isArray(pattern)) {
    return pattern.some((p: string | RegExp) => matches(p, name))
  } else if (isString(pattern)) {
    return pattern.split(',').includes(name)
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}
/**
 * 
 * @param hook 
 * @param target 
 * 该函数用于注册组件激活时的钩子函数。它接受两个参数：

1. `hook`：要注册的钩子函数。
2. `target`（可选）：要注册钩子函数的组件实例。

函数会调用 `registerKeepAliveHook` 方法来注册钩子函数，指定钩子类型为 `LifecycleHooks.ACTIVATED`，并传入目标组件实例（如果提供）。这样，在组件激活时，该钩子函数将被调用。

注意：该函数通常用于与 `KeepAlive` 组件一起使用，用于注册在组件被激活时执行的逻辑。
 */
export function onActivated(
  hook: Function,
  target?: ComponentInternalInstance | null
) {
  registerKeepAliveHook(hook, LifecycleHooks.ACTIVATED, target)
}
/**
 * 
 * @param hook 
 * @param target 
 * 该函数用于注册组件停用时的钩子函数。它接受两个参数：

1. `hook`：要注册的钩子函数。
2. `target`（可选）：要注册钩子函数的组件实例。

函数会调用 `registerKeepAliveHook` 方法来注册钩子函数，指定钩子类型为 `LifecycleHooks.DEACTIVATED`，并传入目标组件实例（如果提供）。这样，在组件停用时，该钩子函数将被调用。

注意：该函数通常用于与 `KeepAlive` 组件一起使用，用于注册在组件被停用时执行的逻辑。
 */
export function onDeactivated(
  hook: Function,
  target?: ComponentInternalInstance | null
) {
  registerKeepAliveHook(hook, LifecycleHooks.DEACTIVATED, target)
}
/**
 * 
 * @param hook 
 * @param type 
 * @param target 
 * 该函数用于注册 KeepAlive 组件中的钩子函数。它接受三个参数：

1. `hook`：要注册的钩子函数。
2. `type`：钩子类型，指示是激活时的钩子（`LifecycleHooks.ACTIVATED`）还是停用时的钩子（`LifecycleHooks.DEACTIVATED`）。
3. `target`（可选）：要注册钩子函数的组件实例。

函数的主要逻辑如下：

1. 创建一个经过包装的钩子函数 `wrappedHook`。该函数会在执行前先检查目标组件实例是否处于停用状态，如果是则不执行钩子函数。
2. 调用 `injectHook` 方法，将包装后的钩子函数注册到目标组件实例的钩子队列中，指定钩子类型为 `type`。
3. 除了在目标组件实例上注册钩子函数外，还会遍历父级组件链，找到所有的 KeepAlive 根组件，并将钩子函数注册到这些根组件上。这样做是为了在执行钩子函数时不需要遍历整个组件树，同时也避免了在数组中跟踪子组件的需求。

该函数的目的是为了实现 KeepAlive 组件中的钩子函数的注册和执行，确保只有在组件未停用时才会执行相应的钩子函数。
 */
function registerKeepAliveHook(
  hook: Function & { __wdc?: Function },
  type: LifecycleHooks,
  target: ComponentInternalInstance | null = currentInstance
) {
  // cache the deactivate branch check wrapper for injected hooks so the same
  // hook can be properly deduped by the scheduler. "__wdc" stands for "with
  // deactivation check".
  const wrappedHook =
    hook.__wdc ||
    (hook.__wdc = () => {
      // only fire the hook if the target instance is NOT in a deactivated branch.
      let current: ComponentInternalInstance | null = target
      while (current) {
        if (current.isDeactivated) {
          return
        }
        current = current.parent
      }
      return hook()
    })
  injectHook(type, wrappedHook, target)
  // In addition to registering it on the target instance, we walk up the parent
  // chain and register it on all ancestor instances that are keep-alive roots.
  // This avoids the need to walk the entire component tree when invoking these
  // hooks, and more importantly, avoids the need to track child components in
  // arrays.
  if (target) {
    let current = target.parent
    while (current && current.parent) {
      if (isKeepAlive(current.parent.vnode)) {
        injectToKeepAliveRoot(wrappedHook, type, target, current)
      }
      current = current.parent
    }
  }
}
/**
 * 
 * @param hook 
 * @param type 
 * @param target 
 * @param keepAliveRoot 
 * 该函数用于将钩子函数注册到 KeepAlive 根组件中。它接受四个参数：

1. `hook`：要注册的钩子函数。
2. `type`：钩子类型，指示是激活时的钩子（`LifecycleHooks.ACTIVATED`）还是停用时的钩子（`LifecycleHooks.DEACTIVATED`）。
3. `target`：要注册钩子函数的组件实例。
4. `keepAliveRoot`：KeepAlive 根组件的组件实例。

函数的主要逻辑如下：

1. 使用 `injectHook` 方法将钩子函数注册到 KeepAlive 根组件的钩子队列中，并指定钩子类型为 `type`。
2. 在目标组件实例卸载时，移除钩子函数从 KeepAlive 根组件的钩子队列中。
   - 首先，通过 `onUnmounted` 函数在目标组件实例卸载时执行一个回调函数。
   - 在回调函数中，使用 `remove` 方法从 KeepAlive 根组件的钩子队列中移除钩子函数。

该函数的目的是将钩子函数注册到 KeepAlive 根组件中，并在目标组件实例卸载时将钩子函数从 KeepAlive 根组件中移除，以避免潜在的内存泄漏。
 */
function injectToKeepAliveRoot(
  hook: Function & { __weh?: Function },
  type: LifecycleHooks,
  target: ComponentInternalInstance,
  keepAliveRoot: ComponentInternalInstance
) {
  // injectHook wraps the original for error handling, so make sure to remove
  // the wrapped version.
  const injected = injectHook(type, hook, keepAliveRoot, true /* prepend */)
  onUnmounted(() => {
    remove(keepAliveRoot[type]!, injected)
  }, target)
}
/**
 * 
 * @param vnode 
 * 该函数用于重置 VNode 的形状标志（shapeFlag）以移除 KeepAlive 相关的标志位。它接受一个 VNode 参数。

函数的主要逻辑如下：

1. 使用按位与（bitwise AND）操作符和按位取反（bitwise NOT）操作符，将 VNode 的 shapeFlag 中的 `COMPONENT_SHOULD_KEEP_ALIVE` 和 `COMPONENT_KEPT_ALIVE` 标志位设置为 0。
   - 通过 `&=` 操作符将 shapeFlag 和 `~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE` 的按位与结果重新赋值给 shapeFlag，从而移除 `COMPONENT_SHOULD_KEEP_ALIVE` 标志位。
   - 同样地，通过 `&=` 操作符将 shapeFlag 和 `~ShapeFlags.COMPONENT_KEPT_ALIVE` 的按位与结果重新赋值给 shapeFlag，从而移除 `COMPONENT_KEPT_ALIVE` 标志位。

该函数的目的是重置 VNode 的形状标志，以清除与 KeepAlive 相关的标志位，以便在组件被重新激活时重新计算其形状。
 */
function resetShapeFlag(vnode: VNode) {
  // bitwise operations to remove keep alive flags
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE
}
/**
 * 
 * @param vnode 
 * @returns 
 * 该函数用于获取 VNode 的内部子节点。它接受一个 VNode 参数，并返回其内部子节点。

函数的主要逻辑如下：

1. 使用按位与（bitwise AND）操作符检查 VNode 的 shapeFlag 是否包含 `ShapeFlags.SUSPENSE` 标志位。
2. 如果 VNode 的 shapeFlag 包含 `ShapeFlags.SUSPENSE` 标志位，则返回 vnode.ssContent 属性作为内部子节点。
3. 如果 VNode 的 shapeFlag 不包含 `ShapeFlags.SUSPENSE` 标志位，则直接返回传入的 vnode。

该函数的目的是根据 VNode 的形状标志，获取其内部的实际子节点，特别是在使用了 Suspense 组件时。如果 VNode 是 Suspense 组件，则返回 vnode.ssContent 属性作为内部子节点，否则返回原始的 vnode。
 */
function getInnerChild(vnode: VNode) {
  return vnode.shapeFlag & ShapeFlags.SUSPENSE ? vnode.ssContent! : vnode
}
