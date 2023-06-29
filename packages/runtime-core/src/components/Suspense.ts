import {
  VNode,
  normalizeVNode,
  VNodeProps,
  isSameVNodeType,
  openBlock,
  closeBlock,
  currentBlock,
  Comment,
  createVNode,
  isBlockTreeEnabled
} from '../vnode'
import { isFunction, isArray, ShapeFlags, toNumber } from '@vue/shared'
import { ComponentInternalInstance, handleSetupResult } from '../component'
import { Slots } from '../componentSlots'
import {
  RendererInternals,
  MoveType,
  SetupRenderEffectFn,
  RendererNode,
  RendererElement
} from '../renderer'
import { queuePostFlushCb } from '../scheduler'
import { filterSingleRoot, updateHOCHostEl } from '../componentRenderUtils'
import {
  pushWarningContext,
  popWarningContext,
  warn,
  assertNumber
} from '../warning'
import { handleError, ErrorCodes } from '../errorHandling'
/**
 * `SuspenseProps` 是一个接口，用于描述 Suspense 组件的属性（props）。具体属性如下：

- `onResolve?: () => void`：在 Suspense 解析（resolve）时调用的回调函数。
- `onPending?: () => void`：在 Suspense 处于挂起状态（pending）时调用的回调函数。
- `onFallback?: () => void`：在显示 Suspense fallback 内容时调用的回调函数。
- `timeout?: string | number`：设置 Suspense 的超时时间，可以是字符串（例如："200ms"）或数字（例如：200）。
- `suspensible?: boolean`：设置是否允许 Suspense 组件被父级 Suspense 组件捕获。默认值为 `false`。

这些属性用于配置 Suspense 组件的行为和钩子函数，可以通过在使用 Suspense 组件时传递这些属性来自定义其行为。
 */
export interface SuspenseProps {
  onResolve?: () => void
  onPending?: () => void
  onFallback?: () => void
  timeout?: string | number
  /**
   * Allow suspense to be captured by parent suspense
   *
   * @default false
   */
  suspensible?: boolean
}
/**
 * 
 * @param type 
 * @returns 
 * `isSuspense` 是一个函数，用于判断给定的组件类型是否为 Suspense 组件。

它通过检查组件类型的 `__isSuspense` 属性来进行判断。如果 `type.__isSuspense` 为 `true`，则表示该组件类型是一个 Suspense 组件，返回 `true`；否则返回 `false`。

这个函数可以用于在开发过程中判断组件是否为 Suspense 组件，以便进行相应的处理或逻辑判断。
 */
export const isSuspense = (type: any): boolean => type.__isSuspense

// Suspense exposes a component-like API, and is treated like a component
// in the compiler, but internally it's a special built-in type that hooks
// directly into the renderer.
/**
 * `SuspenseImpl` 是一个对象，用于实现 Suspense 组件的处理逻辑。

它包含以下属性和方法：

- `name`: Suspense 组件的名称，为 `'Suspense'`。
- `__isSuspense`: 一个标志，表示该对象对应的组件类型是 Suspense 组件。在渲染器中，通过检查组件类型的 `__isSuspense` 属性来确定是否为 Suspense 组件。
- `process`: 一个方法，用于处理 Suspense 组件的挂载和更新逻辑。它接收多个参数，包括旧的 VNode (`n1`)、新的 VNode (`n2`)、容器元素 (`container`)、锚点节点 (`anchor`)、父组件实例 (`parentComponent`)、父级 Suspense 边界实例 (`parentSuspense`)、是否为 SVG 元素 (`isSVG`)、插槽作用域 ID (`slotScopeIds`)、是否启用优化模式 (`optimized`)，以及渲染器内部实现的相关参数。根据传入的参数，它会调用不同的方法来进行挂载或更新 Suspense 组件。
- `hydrate`: 一个方法，用于在服务端渲染中对 Suspense 组件进行水合（hydrate）操作。
- `create`: 一个方法，用于创建 Suspense 边界实例。
- `normalize`: 一个方法，用于规范化 Suspense 组件的子节点。

这些方法和属性共同组成了处理 Suspense 组件的逻辑。在渲染器中，根据组件类型的 `__isSuspense` 属性来调用对应的逻辑处理方法，从而实现 Suspense 组件的挂载、更新和水合等操作。
 */
export const SuspenseImpl = {
  name: 'Suspense',
  // In order to make Suspense tree-shakable, we need to avoid importing it
  // directly in the renderer. The renderer checks for the __isSuspense flag
  // on a vnode's type and calls the `process` method, passing in renderer
  // internals.
  __isSuspense: true,
  process(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean,
    // platform-specific impl passed from renderer
    rendererInternals: RendererInternals
  ) {
    if (n1 == null) {
      mountSuspense(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized,
        rendererInternals
      )
    } else {
      patchSuspense(
        n1,
        n2,
        container,
        anchor,
        parentComponent,
        isSVG,
        slotScopeIds,
        optimized,
        rendererInternals
      )
    }
  },
  hydrate: hydrateSuspense,
  create: createSuspenseBoundary,
  normalize: normalizeSuspenseChildren
}

// Force-casted public typing for h and TSX props inference
/**
 * `Suspense` 是一个导出的变量，用于表示 Suspense 组件。

根据条件 `__FEATURE_SUSPENSE__` 的值，它的取值可能是 `SuspenseImpl` 或 `null`。

如果 `__FEATURE_SUSPENSE__` 为真，则 `Suspense` 的值为 `SuspenseImpl`，即一个实现了 Suspense 组件处理逻辑的对象。

如果 `__FEATURE_SUSPENSE__` 为假，则 `Suspense` 的值为 `null`。

最后，通过类型断言 `as unknown as { ... }`，将 `Suspense` 的类型指定为一个对象类型，该对象类型具有以下属性和方法：

- `__isSuspense: true`：一个标志，表示该对象对应的组件类型是 Suspense 组件。
- `new (): { ... }`：一个构造函数，用于创建 Suspense 组件的实例。该实例具有 `$props` 属性，表示组件的属性集合，包括 VNodeProps 和 SuspenseProps；以及 `$slots` 属性，表示组件的插槽集合，包括 `default` 插槽和 `fallback` 插槽。

通过这种方式导出的 `Suspense` 变量，可以在使用该组件时获取到组件的类型信息，并进行类型推断和类型检查。
 */
export const Suspense = (__FEATURE_SUSPENSE__
  ? SuspenseImpl
  : null) as unknown as {
  __isSuspense: true
  new (): {
    $props: VNodeProps & SuspenseProps
    $slots: {
      default(): VNode[]
      fallback(): VNode[]
    }
  }
}
/**
 * 
 * @param vnode 
 * @param name 
 * 函数 `triggerEvent` 用于触发指定的事件回调函数。它接受两个参数：

1. `vnode: VNode`：表示一个虚拟节点对象，用于获取事件回调函数。
2. `name: 'onResolve' | 'onPending' | 'onFallback'`：表示事件的名称，可以是 `'onResolve'`、`'onPending'` 或 `'onFallback'`。

函数的执行步骤如下：

1. 首先，判断 `vnode.props` 是否存在且具有 `name` 对应的属性。
2. 如果存在且是一个函数类型（即事件回调函数），则调用该函数。

这个函数的作用是触发虚拟节点的特定事件回调函数，以便执行相关的逻辑。它可以用于在特定情况下执行一些自定义的操作或处理逻辑，例如在 Suspense 组件的不同阶段触发相应的事件回调函数。
 */
function triggerEvent(
  vnode: VNode,
  name: 'onResolve' | 'onPending' | 'onFallback'
) {
  const eventListener = vnode.props && vnode.props[name]
  if (isFunction(eventListener)) {
    eventListener()
  }
}
/**
 * 
 * @param vnode 
 * @param container 
 * @param anchor 
 * @param parentComponent 
 * @param parentSuspense 
 * @param isSVG 
 * @param slotScopeIds 
 * @param optimized 
 * @param rendererInternals 
 * 函数 `mountSuspense` 用于挂载 Suspense 组件及其内容。它接受多个参数，用于描述挂载的相关信息。

函数的执行步骤如下：

1. 获取渲染器的内部方法和 createElement 函数，用于后续的操作。
2. 创建一个隐藏的容器元素 `hiddenContainer`，用于挂载内容子树。
3. 创建 SuspenseBoundary 对象 `suspense`，并将其设置为 vnode 的 `suspense` 属性。该对象用于管理 Suspense 组件的行为。
4. 使用渲染器的 `patch` 方法，将 `suspense.pendingBranch`（即 Suspense 组件的内容子树）挂载到 `hiddenContainer` 中。这一步实际上是将内容子树挂载到一个离线的 DOM 容器中，暂时不显示在实际的页面中。
5. 检查是否存在异步依赖项（async deps）。如果存在异步依赖项，表示内容子树中存在异步组件，需要等待异步组件加载完成。
   - 触发 `vnode` 的 `'onPending'` 和 `'onFallback'` 事件回调函数，通知父组件当前处于等待状态。
   - 使用 `patch` 方法将 `vnode.ssFallback`（即 Suspense 组件的 fallback 树）挂载到实际的容器元素 `container` 中。
   - 将 `suspense` 的活动分支设置为 `vnode.ssFallback`，表示当前显示的是 fallback 树。
6. 如果不存在异步依赖项，则表示 Suspense 组件的内容子树可以立即显示，无需等待异步加载。
   - 调用 `suspense.resolve(false, true)`，将 `suspense` 标记为已解决状态，并传入 `false` 表示没有异步加载，`true` 表示内容子树需要显示。

这个函数的作用是在 Suspense 组件挂载过程中，根据异步加载情况决定显示内容子树还是 fallback 树，并触发相应的事件回调函数。
 */
function mountSuspense(
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  rendererInternals: RendererInternals
) {
  const {
    p: patch,
    o: { createElement }
  } = rendererInternals
  const hiddenContainer = createElement('div')
  const suspense = (vnode.suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    container,
    hiddenContainer,
    anchor,
    isSVG,
    slotScopeIds,
    optimized,
    rendererInternals
  ))

  // start mounting the content subtree in an off-dom container
  patch(
    null,
    (suspense.pendingBranch = vnode.ssContent!),
    hiddenContainer,
    null,
    parentComponent,
    suspense,
    isSVG,
    slotScopeIds
  )
  // now check if we have encountered any async deps
  if (suspense.deps > 0) {
    // has async
    // invoke @fallback event
    triggerEvent(vnode, 'onPending')
    triggerEvent(vnode, 'onFallback')

    // mount the fallback tree
    patch(
      null,
      vnode.ssFallback!,
      container,
      anchor,
      parentComponent,
      null, // fallback tree will not have suspense context
      isSVG,
      slotScopeIds
    )
    setActiveBranch(suspense, vnode.ssFallback!)
  } else {
    // Suspense has no async deps. Just resolve.
    suspense.resolve(false, true)
  }
}
/**
 * 
 * @param n1 
 * @param n2 
 * @param container 
 * @param anchor 
 * @param parentComponent 
 * @param isSVG 
 * @param slotScopeIds 
 * @param optimized 
 * @param param8 
 * 函数 `patchSuspense` 用于更新 Suspense 组件及其内容。它接受多个参数，用于描述更新的相关信息。

函数的执行步骤如下：

1. 获取 Suspense 相关的状态和属性，如 `activeBranch`、`pendingBranch`、`isInFallback` 等。
2. 更新 `n2.suspense` 和 `n2.el`，将它们设置为新的 vnode 的对应属性。
3. 获取新的内容子树和 fallback 树。
4. 如果存在 `pendingBranch`，表示 Suspense 组件之前处于等待状态，需要继续等待异步加载完成。
   - 将 `pendingBranch` 更新为新的内容子树 `newBranch`。
   - 检查新旧内容子树的根节点类型是否相同。
     - 如果相同，使用 `patch` 方法更新 `pendingBranch` 的内容，将其挂载到隐藏容器 `suspense.hiddenContainer` 中。
       - 如果 `suspense.deps` 小于等于 0，表示异步加载已完成，调用 `suspense.resolve()` 解决 Suspense。
       - 如果当前处于 fallback 状态，则使用 `patch` 方法更新 `activeBranch`（即 fallback 树）。
     - 如果不相同，表示内容子树发生了切换。
       - 增加 `suspense.pendingId`，用于使异步回调失效。
       - 如果当前处于 hydrating（即服务器端渲染）状态，将 `suspense.activeBranch` 设置为 `pendingBranch`，表示当前显示的是之前的内容子树。
       - 否则，调用 `unmount` 方法卸载 `pendingBranch`。
       - 重置 `suspense` 的一些状态，如 `deps`、`effects`、`hiddenContainer`。
       - 如果当前处于 fallback 状态，使用 `patch` 方法将 `newBranch`（即内容子树）挂载到实际的容器元素 `container` 中，并将 `activeBranch` 设置为 `newFallback`（即新的 fallback 树）。
       - 否则，使用 `patch` 方法将 `newBranch`（即内容子树）挂载到隐藏容器 `suspense.hiddenContainer` 中。
       - 如果 `suspense.deps` 小于等于 0，表示异步加载已完成，调用 `suspense.resolve()` 解决 Suspense。
   - 注意：在这个过程中，可能会触发 fallback 树的更新和解决。
5. 如果不存在 `pendingBranch`，表示 Suspense 组件之前处于展示内容子树的状态，现在需要切换到新的内容子树。
   - 如果 `activeBranch` 存在并且新旧内容子树的根节点类型相同，使用 `patch` 方法更新 `activeBranch`（即内容子树）。
     - 调用 `setActiveBranch` 方法将 `suspense.activeBranch` 设置为 `newBranch`。
   - 否则，表示内容子树发生了切换。
     - 触发 `n2` 的 `'onPending'` 事件回调函数，通知

父组件当前处于等待状态。
     - 将 `suspense.pendingBranch` 更新为新的内容子树 `newBranch`。
     - 增加 `suspense.pendingId`，用于使异步回调失效。
     - 使用 `patch` 方法将 `newBranch`（即新的内容子树）挂载到隐藏容器 `suspense.hiddenContainer` 中。
     - 如果 `suspense.deps` 小于等于 0，表示异步加载已完成，调用 `suspense.resolve()` 解决 Suspense。
     - 否则，根据 `suspense.timeout` 的值判断是否需要延迟处理：
       - 如果 `timeout > 0`，表示需要延迟一段时间再处理。
         - 在延迟结束后，检查 `suspense.pendingId` 是否与之前的值相同，如果相同，则调用 `suspense.fallback()`，显示 fallback 树。
       - 如果 `timeout === 0`，表示立即处理。
         - 调用 `suspense.fallback()`，显示 fallback 树。

这个函数的作用是在 Suspense 组件更新过程中，根据异步加载情况和内容子树的变化决定显示内容子树还是 fallback 树，并触发相应的事件回调函数。
 */
function patchSuspense(
  n1: VNode,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  { p: patch, um: unmount, o: { createElement } }: RendererInternals
) {
  const suspense = (n2.suspense = n1.suspense)!
  suspense.vnode = n2
  n2.el = n1.el
  const newBranch = n2.ssContent!
  const newFallback = n2.ssFallback!

  const { activeBranch, pendingBranch, isInFallback, isHydrating } = suspense
  if (pendingBranch) {
    suspense.pendingBranch = newBranch
    if (isSameVNodeType(newBranch, pendingBranch)) {
      // same root type but content may have changed.
      patch(
        pendingBranch,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      if (suspense.deps <= 0) {
        suspense.resolve()
      } else if (isInFallback) {
        patch(
          activeBranch,
          newFallback,
          container,
          anchor,
          parentComponent,
          null, // fallback tree will not have suspense context
          isSVG,
          slotScopeIds,
          optimized
        )
        setActiveBranch(suspense, newFallback)
      }
    } else {
      // toggled before pending tree is resolved
      suspense.pendingId++
      if (isHydrating) {
        // if toggled before hydration is finished, the current DOM tree is
        // no longer valid. set it as the active branch so it will be unmounted
        // when resolved
        suspense.isHydrating = false
        suspense.activeBranch = pendingBranch
      } else {
        unmount(pendingBranch, parentComponent, suspense)
      }
      // increment pending ID. this is used to invalidate async callbacks
      // reset suspense state
      suspense.deps = 0
      // discard effects from pending branch
      suspense.effects.length = 0
      // discard previous container
      suspense.hiddenContainer = createElement('div')

      if (isInFallback) {
        // already in fallback state
        patch(
          null,
          newBranch,
          suspense.hiddenContainer,
          null,
          parentComponent,
          suspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        if (suspense.deps <= 0) {
          suspense.resolve()
        } else {
          patch(
            activeBranch,
            newFallback,
            container,
            anchor,
            parentComponent,
            null, // fallback tree will not have suspense context
            isSVG,
            slotScopeIds,
            optimized
          )
          setActiveBranch(suspense, newFallback)
        }
      } else if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
        // toggled "back" to current active branch
        patch(
          activeBranch,
          newBranch,
          container,
          anchor,
          parentComponent,
          suspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        // force resolve
        suspense.resolve(true)
      } else {
        // switched to a 3rd branch
        patch(
          null,
          newBranch,
          suspense.hiddenContainer,
          null,
          parentComponent,
          suspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        if (suspense.deps <= 0) {
          suspense.resolve()
        }
      }
    }
  } else {
    if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
      // root did not change, just normal patch
      patch(
        activeBranch,
        newBranch,
        container,
        anchor,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      setActiveBranch(suspense, newBranch)
    } else {
      // root node toggled
      // invoke @pending event
      triggerEvent(n2, 'onPending')
      // mount pending branch in off-dom container
      suspense.pendingBranch = newBranch
      suspense.pendingId++
      patch(
        null,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      if (suspense.deps <= 0) {
        // incoming branch has no async deps, resolve now.
        suspense.resolve()
      } else {
        const { timeout, pendingId } = suspense
        if (timeout > 0) {
          setTimeout(() => {
            if (suspense.pendingId === pendingId) {
              suspense.fallback(newFallback)
            }
          }, timeout)
        } else if (timeout === 0) {
          suspense.fallback(newFallback)
        }
      }
    }
  }
}
/**
 * 这是一个 TypeScript 接口声明，描述了 `SuspenseBoundary` 对象的属性和方法。

`SuspenseBoundary` 对象表示一个 Suspense 边界，包含了 Suspense 组件的相关信息和状态。具体属性和方法如下：

- `vnode`: 当前 Suspense 组件的 VNode 对象。
- `parent`: 父级 SuspenseBoundary 对象。
- `parentComponent`: 父级组件实例对象。
- `isSVG`: 表示 Suspense 组件是否在 SVG 中使用。
- `container`: Suspense 组件的容器元素。
- `hiddenContainer`: 隐藏的容器元素，用于挂载隐藏的内容子树。
- `anchor`: 插入位置的锚点节点。
- `activeBranch`: 当前激活的内容子树 VNode 对象。
- `pendingBranch`: 正在等待加载的内容子树 VNode 对象。
- `deps`: 表示当前 Suspense 组件的异步依赖数量。
- `pendingId`: 异步加载的标识 ID。
- `timeout`: 异步加载的超时时间。
- `isInFallback`: 表示当前是否处于 fallback 状态。
- `isHydrating`: 表示当前是否处于服务器端渲染的 hydrating 状态。
- `isUnmounted`: 表示当前是否已经卸载。
- `effects`: 存储当前 Suspense 组件的副作用函数。
- `resolve(force?: boolean, sync?: boolean): void`: 解决 Suspense 组件，显示内容子树。
- `fallback(fallbackVNode: VNode): void`: 显示 fallback 树。
- `move(container: RendererElement, anchor: RendererNode | null, type: MoveType): void`: 移动 Suspense 组件的位置。
- `next(): RendererNode | null`: 获取 Suspense 组件的下一个节点。
- `registerDep(instance: ComponentInternalInstance, setupRenderEffect: SetupRenderEffectFn): void`: 注册异步依赖。
- `unmount(parentSuspense: SuspenseBoundary | null, doRemove?: boolean): void`: 卸载 Suspense 组件。

这个接口声明描述了 Suspense 边界对象的属性和方法，用于在实现 Suspense 功能时进行类型检查和约束。
 */
export interface SuspenseBoundary {
  vnode: VNode<RendererNode, RendererElement, SuspenseProps>
  parent: SuspenseBoundary | null
  parentComponent: ComponentInternalInstance | null
  isSVG: boolean
  container: RendererElement
  hiddenContainer: RendererElement
  anchor: RendererNode | null
  activeBranch: VNode | null
  pendingBranch: VNode | null
  deps: number
  pendingId: number
  timeout: number
  isInFallback: boolean
  isHydrating: boolean
  isUnmounted: boolean
  effects: Function[]
  resolve(force?: boolean, sync?: boolean): void
  fallback(fallbackVNode: VNode): void
  move(
    container: RendererElement,
    anchor: RendererNode | null,
    type: MoveType
  ): void
  next(): RendererNode | null
  registerDep(
    instance: ComponentInternalInstance,
    setupRenderEffect: SetupRenderEffectFn
  ): void
  unmount(parentSuspense: SuspenseBoundary | null, doRemove?: boolean): void
}
/**
 * 这是一个全局变量 `hasWarned`，用于跟踪是否已经发出警告。

该变量的初始值为 `false`，表示尚未发出警告。在某些代码逻辑中，可能会根据一定条件判断是否需要发出警告，如果需要发出警告，则将 `hasWarned` 设置为 `true`，表示已经发出警告。

这样可以避免重复发出相同的警告，只在第一次满足条件时发出一次警告，后续的判断会直接跳过。

请注意，在给定的代码片段中，并没有展示出警告的具体逻辑和条件。
 */
let hasWarned = false
/**
 * 
 * @param vnode 
 * @param parentSuspense 
 * @param parentComponent 
 * @param container 
 * @param hiddenContainer 
 * @param anchor 
 * @param isSVG 
 * @param slotScopeIds 
 * @param optimized 
 * @param rendererInternals 
 * @param isHydrating 
 * @returns 
 * 这是一个名为 `createSuspenseBoundary` 的函数，用于创建一个 `SuspenseBoundary` 对象。

函数的参数包括：

- `vnode: VNode`：当前节点的虚拟节点。
- `parentSuspense: SuspenseBoundary | null`：父级 `SuspenseBoundary` 对象。
- `parentComponent: ComponentInternalInstance | null`：父级组件的内部实例。
- `container: RendererElement`：渲染容器元素。
- `hiddenContainer: RendererElement`：隐藏的容器元素。
- `anchor: RendererNode | null`：插入位置的锚点节点。
- `isSVG: boolean`：指示是否为 SVG 元素。
- `slotScopeIds: string[] | null`：作用域插槽的 ID 数组。
- `optimized: boolean`：是否启用优化。
- `rendererInternals: RendererInternals`：渲染器内部方法和属性的集合。
- `isHydrating = false`：是否正在进行水合作用，默认为 `false`。

函数内部首先检查是否需要发出警告，并根据条件设置全局变量 `hasWarned`。然后，函数创建一个名为 `suspense` 的 `SuspenseBoundary` 对象，设置对象的各个属性和方法。

最后，函数返回创建的 `suspense` 对象。

请注意，代码片段中未提供 `toNumber`、`assertNumber`、`isVNodeSuspensible`、`setActiveBranch`、`triggerEvent`、`queuePostFlushCb`、`handleError`、`handleSetupResult`、`updateHOCHostEl`、`popWarningContext`、`pushWarningContext` 等函数的实现。这些函数可能在其他地方定义并被引用。
 */
function createSuspenseBoundary(
  vnode: VNode,
  parentSuspense: SuspenseBoundary | null,
  parentComponent: ComponentInternalInstance | null,
  container: RendererElement,
  hiddenContainer: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  rendererInternals: RendererInternals,
  isHydrating = false
): SuspenseBoundary {
  /* istanbul ignore if */
  if (__DEV__ && !__TEST__ && !hasWarned) {
    hasWarned = true
    // @ts-ignore `console.info` cannot be null error
    console[console.info ? 'info' : 'log'](
      `<Suspense> is an experimental feature and its API will likely change.`
    )
  }

  const {
    p: patch,
    m: move,
    um: unmount,
    n: next,
    o: { parentNode, remove }
  } = rendererInternals

  // if set `suspensible: true`, set the current suspense as a dep of parent suspense
  let parentSuspenseId: number | undefined
  const isSuspensible = isVNodeSuspensible(vnode)
  if (isSuspensible) {
    if (parentSuspense?.pendingBranch) {
      parentSuspenseId = parentSuspense.pendingId
      parentSuspense.deps++
    }
  }

  const timeout = vnode.props ? toNumber(vnode.props.timeout) : undefined
  if (__DEV__) {
    assertNumber(timeout, `Suspense timeout`)
  }

  const suspense: SuspenseBoundary = {
    vnode,
    parent: parentSuspense,
    parentComponent,
    isSVG,
    container,
    hiddenContainer,
    anchor,
    deps: 0,
    pendingId: 0,
    timeout: typeof timeout === 'number' ? timeout : -1,
    activeBranch: null,
    pendingBranch: null,
    isInFallback: true,
    isHydrating,
    isUnmounted: false,
    effects: [],

    resolve(resume = false, sync = false) {
      if (__DEV__) {
        if (!resume && !suspense.pendingBranch) {
          throw new Error(
            `suspense.resolve() is called without a pending branch.`
          )
        }
        if (suspense.isUnmounted) {
          throw new Error(
            `suspense.resolve() is called on an already unmounted suspense boundary.`
          )
        }
      }
      const {
        vnode,
        activeBranch,
        pendingBranch,
        pendingId,
        effects,
        parentComponent,
        container
      } = suspense

      if (suspense.isHydrating) {
        suspense.isHydrating = false
      } else if (!resume) {
        const delayEnter =
          activeBranch &&
          pendingBranch!.transition &&
          pendingBranch!.transition.mode === 'out-in'
        if (delayEnter) {
          activeBranch!.transition!.afterLeave = () => {
            if (pendingId === suspense.pendingId) {
              move(pendingBranch!, container, anchor, MoveType.ENTER)
            }
          }
        }
        // this is initial anchor on mount
        let { anchor } = suspense
        // unmount current active tree
        if (activeBranch) {
          // if the fallback tree was mounted, it may have been moved
          // as part of a parent suspense. get the latest anchor for insertion
          anchor = next(activeBranch)
          unmount(activeBranch, parentComponent, suspense, true)
        }
        if (!delayEnter) {
          // move content from off-dom container to actual container
          move(pendingBranch!, container, anchor, MoveType.ENTER)
        }
      }

      setActiveBranch(suspense, pendingBranch!)
      suspense.pendingBranch = null
      suspense.isInFallback = false

      // flush buffered effects
      // check if there is a pending parent suspense
      let parent = suspense.parent
      let hasUnresolvedAncestor = false
      while (parent) {
        if (parent.pendingBranch) {
          // found a pending parent suspense, merge buffered post jobs
          // into that parent
          parent.effects.push(...effects)
          hasUnresolvedAncestor = true
          break
        }
        parent = parent.parent
      }
      // no pending parent suspense, flush all jobs
      if (!hasUnresolvedAncestor) {
        queuePostFlushCb(effects)
      }
      suspense.effects = []

      // resolve parent suspense if all async deps are resolved
      if (isSuspensible) {
        if (
          parentSuspense &&
          parentSuspense.pendingBranch &&
          parentSuspenseId === parentSuspense.pendingId
        ) {
          parentSuspense.deps--
          if (parentSuspense.deps === 0 && !sync) {
            parentSuspense.resolve()
          }
        }
      }

      // invoke @resolve event
      triggerEvent(vnode, 'onResolve')
    },

    fallback(fallbackVNode) {
      if (!suspense.pendingBranch) {
        return
      }

      const { vnode, activeBranch, parentComponent, container, isSVG } =
        suspense

      // invoke @fallback event
      triggerEvent(vnode, 'onFallback')

      const anchor = next(activeBranch!)
      const mountFallback = () => {
        if (!suspense.isInFallback) {
          return
        }
        // mount the fallback tree
        patch(
          null,
          fallbackVNode,
          container,
          anchor,
          parentComponent,
          null, // fallback tree will not have suspense context
          isSVG,
          slotScopeIds,
          optimized
        )
        setActiveBranch(suspense, fallbackVNode)
      }

      const delayEnter =
        fallbackVNode.transition && fallbackVNode.transition.mode === 'out-in'
      if (delayEnter) {
        activeBranch!.transition!.afterLeave = mountFallback
      }
      suspense.isInFallback = true

      // unmount current active branch
      unmount(
        activeBranch!,
        parentComponent,
        null, // no suspense so unmount hooks fire now
        true // shouldRemove
      )

      if (!delayEnter) {
        mountFallback()
      }
    },

    move(container, anchor, type) {
      suspense.activeBranch &&
        move(suspense.activeBranch, container, anchor, type)
      suspense.container = container
    },

    next() {
      return suspense.activeBranch && next(suspense.activeBranch)
    },

    registerDep(instance, setupRenderEffect) {
      const isInPendingSuspense = !!suspense.pendingBranch
      if (isInPendingSuspense) {
        suspense.deps++
      }
      const hydratedEl = instance.vnode.el
      instance
        .asyncDep!.catch(err => {
          handleError(err, instance, ErrorCodes.SETUP_FUNCTION)
        })
        .then(asyncSetupResult => {
          // retry when the setup() promise resolves.
          // component may have been unmounted before resolve.
          if (
            instance.isUnmounted ||
            suspense.isUnmounted ||
            suspense.pendingId !== instance.suspenseId
          ) {
            return
          }
          // retry from this component
          instance.asyncResolved = true
          const { vnode } = instance
          if (__DEV__) {
            pushWarningContext(vnode)
          }
          handleSetupResult(instance, asyncSetupResult, false)
          if (hydratedEl) {
            // vnode may have been replaced if an update happened before the
            // async dep is resolved.
            vnode.el = hydratedEl
          }
          const placeholder = !hydratedEl && instance.subTree.el
          setupRenderEffect(
            instance,
            vnode,
            // component may have been moved before resolve.
            // if this is not a hydration, instance.subTree will be the comment
            // placeholder.
            parentNode(hydratedEl || instance.subTree.el!)!,
            // anchor will not be used if this is hydration, so only need to
            // consider the comment placeholder case.
            hydratedEl ? null : next(instance.subTree),
            suspense,
            isSVG,
            optimized
          )
          if (placeholder) {
            remove(placeholder)
          }
          updateHOCHostEl(instance, vnode.el)
          if (__DEV__) {
            popWarningContext()
          }
          // only decrease deps count if suspense is not already resolved
          if (isInPendingSuspense && --suspense.deps === 0) {
            suspense.resolve()
          }
        })
    },

    unmount(parentSuspense, doRemove) {
      suspense.isUnmounted = true
      if (suspense.activeBranch) {
        unmount(
          suspense.activeBranch,
          parentComponent,
          parentSuspense,
          doRemove
        )
      }
      if (suspense.pendingBranch) {
        unmount(
          suspense.pendingBranch,
          parentComponent,
          parentSuspense,
          doRemove
        )
      }
    }
  }

  return suspense
}
/**
 * 
 * @param node 
 * @param vnode 
 * @param parentComponent 
 * @param parentSuspense 
 * @param isSVG 
 * @param slotScopeIds 
 * @param optimized 
 * @param rendererInternals 
 * @param hydrateNode 
 * @returns 
 * 这是一个名为 `hydrateSuspense` 的函数，用于进行悬挂处理（suspense）的水合作用（hydrate）。

函数的参数包括：

- `node: Node`：要进行水合作用的 DOM 节点。
- `vnode: VNode`：当前节点的虚拟节点。
- `parentComponent: ComponentInternalInstance | null`：父级组件的内部实例。
- `parentSuspense: SuspenseBoundary | null`：父级 `SuspenseBoundary` 对象。
- `isSVG: boolean`：指示是否为 SVG 元素。
- `slotScopeIds: string[] | null`：作用域插槽的 ID 数组。
- `optimized: boolean`：是否启用优化。
- `rendererInternals: RendererInternals`：渲染器内部方法和属性的集合。
- `hydrateNode: (node: Node, vnode: VNode, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, slotScopeIds: string[] | null, optimized: boolean) => Node | null`：执行节点的水合作用的函数。

函数内部首先创建一个 `SuspenseBoundary` 对象，并命名为 `suspense`。该对象通过调用 `createSuspenseBoundary` 函数进行创建，并传递相应的参数。

接下来，函数尝试对节点进行水合作用，并将返回结果赋值给 `result`。同时，将 `vnode.ssContent`（即服务端渲染内容）作为挂起分支赋值给 `suspense.pendingBranch`。

如果 `suspense` 对象的 `deps` 属性为 0，即没有异步依赖，那么调用 `suspense.resolve(false, true)` 进行解决。

最后，函数返回 `result`。

需要注意的是，代码片段中未提供 `createSuspenseBoundary` 函数的实现。该函数可能在其他地方定义并被引用。
 */
function hydrateSuspense(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  rendererInternals: RendererInternals,
  hydrateNode: (
    node: Node,
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => Node | null
): Node | null {
  /* eslint-disable no-restricted-globals */
  const suspense = (vnode.suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    node.parentNode!,
    document.createElement('div'),
    null,
    isSVG,
    slotScopeIds,
    optimized,
    rendererInternals,
    true /* hydrating */
  ))
  // there are two possible scenarios for server-rendered suspense:
  // - success: ssr content should be fully resolved
  // - failure: ssr content should be the fallback branch.
  // however, on the client we don't really know if it has failed or not
  // attempt to hydrate the DOM assuming it has succeeded, but we still
  // need to construct a suspense boundary first
  const result = hydrateNode(
    node,
    (suspense.pendingBranch = vnode.ssContent!),
    parentComponent,
    suspense,
    slotScopeIds,
    optimized
  )
  if (suspense.deps === 0) {
    suspense.resolve(false, true)
  }
  return result
  /* eslint-enable no-restricted-globals */
}
/**
 * 
 * @param vnode 
 * 这是一个名为 `normalizeSuspenseChildren` 的函数，用于规范化悬挂处理（suspense）的子节点。

函数接收一个虚拟节点 `vnode` 作为参数。首先从 `vnode` 中获取 `shapeFlag` 和 `children` 属性。

函数判断 `shapeFlag` 是否包含 `ShapeFlags.SLOTS_CHILDREN` 标记，以确定子节点是否为插槽内容。如果是插槽内容，则将默认插槽（`children.default`）传递给 `normalizeSuspenseSlot` 函数进行规范化，并将结果赋值给 `vnode.ssContent`。

如果子节点不是插槽内容，则直接将 `children` 传递给 `normalizeSuspenseSlot` 函数进行规范化，并将结果赋值给 `vnode.ssContent`。

接下来，函数处理悬挂处理的回退内容。如果子节点是插槽内容，将回退插槽（`children.fallback`）传递给 `normalizeSuspenseSlot` 函数进行规范化，并将结果赋值给 `vnode.ssFallback`。

如果子节点不是插槽内容，创建一个注释节点的虚拟节点，并将其赋值给 `vnode.ssFallback`。

最后，函数执行完成，并对 `vnode` 的 `ssContent` 和 `ssFallback` 属性进行赋值，完成子节点的规范化处理。

需要注意的是，代码片段中未提供 `normalizeSuspenseSlot` 函数和 `createVNode` 函数的实现。这些函数可能在其他地方定义并被引用。
 */
function normalizeSuspenseChildren(vnode: VNode) {
  const { shapeFlag, children } = vnode
  const isSlotChildren = shapeFlag & ShapeFlags.SLOTS_CHILDREN
  vnode.ssContent = normalizeSuspenseSlot(
    isSlotChildren ? (children as Slots).default : children
  )
  vnode.ssFallback = isSlotChildren
    ? normalizeSuspenseSlot((children as Slots).fallback)
    : createVNode(Comment)
}
/**
 * 
 * @param s 
 * @returns 
 * 这是一个名为 `normalizeSuspenseSlot` 的函数，用于规范化悬挂处理（suspense）的插槽内容。

函数接收一个参数 `s`，表示插槽内容。函数首先定义了一个变量 `block`，用于存储可能存在的块级节点。

接下来，函数检查 `s` 是否为函数类型（函数式组件）。如果是函数类型，且块级树（block tree）跟踪已启用，并且函数存在 `_c` 属性（用于标识编译的插槽），则进行以下操作：

1. 将 `_d` 属性设置为 `false`，以禁用跟踪（disable tracking）。
2. 打开一个新的块级作用域（openBlock）。
3. 执行函数 `s`，获取插槽内容。
4. 将 `_d` 属性设置为 `true`，以重新启用跟踪。
5. 将当前块级节点赋值给变量 `block`。
6. 关闭块级作用域（closeBlock）。

接下来，函数判断 `s` 是否为数组类型。如果是数组类型，则通过 `filterSingleRoot` 函数过滤出单个根节点，如果存在多个根节点则发出警告，并将单个根节点赋值给 `s`。

然后，函数调用 `normalizeVNode` 函数对 `s` 进行规范化处理，将其转换为规范的虚拟节点。

最后，函数检查 `block` 是否存在且 `s` 的 `dynamicChildren` 属性不存在，如果满足条件，则将 `block` 中不等于 `s` 的节点作为动态子节点赋值给 `s` 的 `dynamicChildren` 属性。

函数返回处理后的插槽内容 `s`。

需要注意的是，代码片段中未提供 `filterSingleRoot` 函数和 `normalizeVNode` 函数的实现。这些函数可能在其他地方定义并被引用。
 */
function normalizeSuspenseSlot(s: any) {
  let block: VNode[] | null | undefined
  if (isFunction(s)) {
    const trackBlock = isBlockTreeEnabled && s._c
    if (trackBlock) {
      // disableTracking: false
      // allow block tracking for compiled slots
      // (see ./componentRenderContext.ts)
      s._d = false
      openBlock()
    }
    s = s()
    if (trackBlock) {
      s._d = true
      block = currentBlock
      closeBlock()
    }
  }
  if (isArray(s)) {
    const singleChild = filterSingleRoot(s)
    if (__DEV__ && !singleChild) {
      warn(`<Suspense> slots expect a single root node.`)
    }
    s = singleChild
  }
  s = normalizeVNode(s)
  if (block && !s.dynamicChildren) {
    s.dynamicChildren = block.filter(c => c !== s)
  }
  return s
}
/**
 * 
 * @param fn 
 * @param suspense 
 * 这是一个名为 `queueEffectWithSuspense` 的导出函数，用于将效果函数（effect function）或函数数组（array of functions）添加到悬挂处理（suspense）的效果队列中。

函数接收两个参数：
- `fn`：要添加到效果队列中的效果函数或函数数组。
- `suspense`：悬挂处理边界（`SuspenseBoundary`）对象，用于判断是否存在待处理的悬挂分支。

函数首先检查 `suspense` 是否存在且具有待处理的悬挂分支（`suspense.pendingBranch`）。如果存在待处理的悬挂分支，则将 `fn` 添加到 `suspense.effects` 数组中。

如果 `fn` 是函数数组（`isArray(fn)` 为 `true`），则使用扩展运算符（`...`）将数组元素添加到 `suspense.effects` 数组中。否则，直接将 `fn` 添加到 `suspense.effects` 数组中。

如果 `suspense` 不存在或没有待处理的悬挂分支，则将 `fn` 添加到后置刷新回调队列中，通过调用 `queuePostFlushCb` 函数。

这样，当悬挂分支解析完成后，效果函数将被调用，或者在没有悬挂处理时，函数将在后续的刷新阶段被调用。

需要注意的是，代码片段中未提供 `isArray` 函数和 `queuePostFlushCb` 函数的实现。这些函数可能在其他地方定义并被引用。
 */
export function queueEffectWithSuspense(
  fn: Function | Function[],
  suspense: SuspenseBoundary | null
): void {
  if (suspense && suspense.pendingBranch) {
    if (isArray(fn)) {
      suspense.effects.push(...fn)
    } else {
      suspense.effects.push(fn)
    }
  } else {
    queuePostFlushCb(fn)
  }
}
/**
 * 
 * @param suspense 
 * @param branch 
 * 这是一个名为 `setActiveBranch` 的函数，用于设置悬挂处理（`SuspenseBoundary`）的活动分支（`activeBranch`）。

函数接收两个参数：
- `suspense`：悬挂处理边界对象。
- `branch`：要设置为活动分支的虚拟节点（`VNode`）。

函数执行以下操作：
1. 将 `branch` 赋值给 `suspense` 的 `activeBranch` 属性，表示该悬挂处理边界的当前活动分支是 `branch`。
2. 获取 `suspense` 的相关信息，包括 `vnode`（悬挂处理的虚拟节点）和 `parentComponent`（父组件的内部实例）。
3. 将 `branch.el`（活动分支的 DOM 元素）赋值给 `vnode.el`，更新悬挂处理的虚拟节点的 DOM 元素。
4. 如果 `parentComponent` 存在且 `parentComponent.subTree` 等于 `vnode`，则表示悬挂处理是父组件的根节点。此时需要递归更新高阶组件的 DOM 元素。
   - 将 `el`（活动分支的 DOM 元素）赋值给 `parentComponent.vnode.el`，更新父组件的虚拟节点的 DOM 元素。
   - 调用 `updateHOCHostEl` 函数，更新高阶组件的 DOM 元素。

通过调用 `setActiveBranch`，可以设置悬挂处理的活动分支，并更新相关的 DOM 元素。
 */
function setActiveBranch(suspense: SuspenseBoundary, branch: VNode) {
  suspense.activeBranch = branch
  const { vnode, parentComponent } = suspense
  const el = (vnode.el = branch.el)
  // in case suspense is the root node of a component,
  // recursively update the HOC el
  if (parentComponent && parentComponent.subTree === vnode) {
    parentComponent.vnode.el = el
    updateHOCHostEl(parentComponent, el)
  }
}
/**
 * 
 * @param vnode 
 * @returns 
 * 这是一个名为 `isVNodeSuspensible` 的函数，用于判断虚拟节点（`VNode`）是否可悬挂处理（suspensible）。

函数接收一个参数：
- `vnode`：要判断的虚拟节点。

函数执行以下操作：
1. 访问 `vnode` 的 `props` 属性。
2. 检查 `vnode.props` 是否存在且不为 `null`。
3. 如果存在，则继续检查 `vnode.props.suspensible` 的值。
4. 如果 `vnode.props.suspensible` 存在且不等于 `false`，则返回 `true`，表示该虚拟节点可悬挂处理。
5. 如果 `vnode.props.suspensible` 不存在或等于 `false`，则返回 `false`，表示该虚拟节点不可悬挂处理。

通过调用 `isVNodeSuspensible`，可以判断虚拟节点是否具有悬挂处理的能力。该函数检查虚拟节点的 `props` 属性中是否包含 `suspensible` 属性，并且该属性的值不为 `false`。
 */
function isVNodeSuspensible(vnode: VNode) {
  return vnode.props?.suspensible != null && vnode.props.suspensible !== false
}
