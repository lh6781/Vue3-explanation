import { ComponentInternalInstance } from '../component'
import { SuspenseBoundary } from './Suspense'
import {
  RendererInternals,
  MoveType,
  RendererElement,
  RendererNode,
  RendererOptions,
  traverseStaticChildren
} from '../renderer'
import { VNode, VNodeArrayChildren, VNodeProps } from '../vnode'
import { isString, ShapeFlags } from '@vue/shared'
import { warn } from '../warning'
import { isHmrUpdating } from '../hmr'
/**
 * 这段代码定义了一个类型别名 `TeleportVNode`，它是对 `VNode` 类型的特化。

`TeleportVNode` 表示一个具有特定属性 `TeleportProps` 的虚拟节点，其中：
- `RendererNode` 是渲染器节点的类型。
- `RendererElement` 是渲染器元素的类型。
- `TeleportProps` 是用于传递给 `<teleport>` 组件的属性的类型。

通过使用 `TeleportVNode` 类型，可以指定一个特定于 `<teleport>` 组件的虚拟节点。这有助于在代码中明确标识 `<teleport>` 组件的使用和属性。
 */
export type TeleportVNode = VNode<RendererNode, RendererElement, TeleportProps>
/**
 * `TeleportProps` 是一个接口，用于描述 `<teleport>` 组件的属性。

它具有以下属性：

- `to`：指定要传送（teleport）到的目标位置。可以是字符串、渲染器元素，或者 `null` 或 `undefined`。
- `disabled`（可选）：指示是否禁用 `<teleport>` 组件的属性。如果设置为 `true`，则 `<teleport>` 组件将被禁用。

这个接口定义了 `<teleport>` 组件所支持的属性，可以在使用 `<teleport>` 组件时使用这些属性来配置其行为和目标位置。
 */
export interface TeleportProps {
  to: string | RendererElement | null | undefined
  disabled?: boolean
}
/**
 * 
 * @param type 
 * @returns 
 * `isTeleport` 是一个函数，用于判断给定的类型是否为 `<teleport>` 组件。

它接受一个参数 `type`，表示要判断的类型。通过访问 `type.__isTeleport` 属性，函数可以确定该类型是否为 `<teleport>` 组件。

如果 `type` 是 `<teleport>` 组件，则函数返回 `true`，否则返回 `false`。该函数可用于在代码中检查特定类型是否为 `<teleport>` 组件，并根据需要执行相应的逻辑。
 */
export const isTeleport = (type: any): boolean => type.__isTeleport
/**
 * 
 * @param props 
 * @returns 
 * `isTeleportDisabled` 是一个函数，用于判断给定的 `<teleport>` 组件的 props 是否禁用。

它接受一个参数 `props`，表示要判断的组件的 props 对象。函数通过检查 `props` 对象中的 `disabled` 属性来确定是否禁用了 `<teleport>` 组件。

如果 `props` 存在且 `disabled` 属性为 `true` 或为空字符串，则函数返回 `true`，表示 `<teleport>` 组件已禁用。否则，函数返回 `false`，表示 `<teleport>` 组件未禁用。

该函数可用于在代码中检查给定 `<teleport>` 组件的 props 是否指示组件被禁用，并根据需要执行相应的逻辑。
 */
const isTeleportDisabled = (props: VNode['props']): boolean =>
  props && (props.disabled || props.disabled === '')
/**
 * 
 * @param target 
 * @returns 
 * `isTargetSVG` 是一个函数，用于判断给定的目标元素是否为 SVG 元素。

它接受一个参数 `target`，表示要判断的目标元素。函数通过检查全局环境中是否存在 `SVGElement` 类型，并且判断 `target` 是否为 `SVGElement` 类型的实例来确定目标元素是否为 SVG 元素。

如果全局环境中存在 `SVGElement` 类型并且 `target` 是 `SVGElement` 类型的实例，则函数返回 `true`，表示目标元素是 SVG 元素。否则，函数返回 `false`，表示目标元素不是 SVG 元素。

该函数可用于在代码中判断给定的目标元素是否为 SVG 元素，并根据需要执行相应的逻辑。
 */
const isTargetSVG = (target: RendererElement): boolean =>
  typeof SVGElement !== 'undefined' && target instanceof SVGElement
/**
 * 
 * @param props 
 * @param select 
 * @returns 
 * `resolveTarget` 是一个函数，用于解析传送门（Teleport）的目标元素。

它接受两个参数：
- `props`：传送门的属性对象，类型为 `TeleportProps | null`。
- `select`：查询选择器的函数，类型为 `RendererOptions['querySelector']`。

函数首先获取传送门的目标选择器 `targetSelector`，它从 `props.to` 中获取。接下来，函数根据 `targetSelector` 的类型进行不同的处理。

如果 `targetSelector` 是字符串类型，表示要使用查询选择器获取目标元素。函数首先检查 `select` 是否存在，如果不存在则打印警告信息，并返回 `null`。如果 `select` 存在，则使用 `select` 函数通过目标选择器获取目标元素 `target`。如果获取的 `target` 为 `null`，则打印警告信息，提示无法定位到目标元素。最后，函数将 `target` 强制类型转换为泛型类型 `T`，并返回。

如果 `targetSelector` 不是字符串类型，则表示传送门没有指定目标选择器。在开发模式下，函数会检查 `targetSelector` 是否为 `null`，并且不是禁用状态（根据 `isTeleportDisabled` 函数判断）。如果条件不满足，则打印警告信息，提示目标选择器无效。最后，函数将 `targetSelector` 强制类型转换为泛型类型 `T`，并返回。

该函数用于根据传送门的属性和查询选择器，解析并返回传送门的目标元素。在解析过程中会进行各种条件检查，并在需要时打印警告信息。
 */
const resolveTarget = <T = RendererElement>(
  props: TeleportProps | null,
  select: RendererOptions['querySelector']
): T | null => {
  const targetSelector = props && props.to
  if (isString(targetSelector)) {
    if (!select) {
      __DEV__ &&
        warn(
          `Current renderer does not support string target for Teleports. ` +
            `(missing querySelector renderer option)`
        )
      return null
    } else {
      const target = select(targetSelector)
      if (!target) {
        __DEV__ &&
          warn(
            `Failed to locate Teleport target with selector "${targetSelector}". ` +
              `Note the target element must exist before the component is mounted - ` +
              `i.e. the target cannot be rendered by the component itself, and ` +
              `ideally should be outside of the entire Vue component tree.`
          )
      }
      return target as T
    }
  } else {
    if (__DEV__ && !targetSelector && !isTeleportDisabled(props)) {
      warn(`Invalid Teleport target: ${targetSelector}`)
    }
    return targetSelector as T
  }
}
/**
 * `TeleportImpl` 是一个对象，包含了处理传送门（Teleport）的方法。

该对象包含以下方法：

- `process`: 处理传送门的挂载和更新。它接受多个参数，包括旧的传送门节点 `n1`、新的传送门节点 `n2`、容器元素 `container`、插入位置 `anchor`、父组件实例 `parentComponent`、父级悬挂边界 `parentSuspense`、是否为 SVG 元素 `isSVG`、作用域 ID 数组 `slotScopeIds`、是否为优化模式 `optimized`，以及渲染器内部方法和属性 `internals`。该方法会根据传送门节点的状态进行不同的操作，包括插入占位符和锚点元素、获取传送目标元素、挂载子节点等。

- `remove`: 移除传送门的方法。它接受多个参数，包括传送门节点 `vnode`、父组件实例 `parentComponent`、父级悬挂边界 `parentSuspense`、是否为优化模式 `optimized`、渲染器内部方法和属性 `internals`，以及一个布尔值 `doRemove`。该方法会移除传送门节点及其子节点。

- `move`: 移动传送门的方法。它接受多个参数，包括传送门节点 `n2`、目标元素 `target`、目标锚点元素 `targetAnchor`、渲染器内部方法和属性 `internals`，以及一个表示移动类型的枚举值 `TeleportMoveTypes`。该方法用于移动传送门及其子节点到指定的目标位置。

- `hydrate`: 水合传送门的方法。它接受多个参数，包括传送门节点 `vnode`、父组件实例 `parentComponent`、父级悬挂边界 `parentSuspense`、是否为优化模式 `optimized`，以及渲染器内部方法和属性 `internals`。该方法用于水合传送门及其子节点。

`TeleportImpl` 对象包含了处理传送门各个生命周期阶段的方法，用于实现传送门的挂载、更新、移除和水合等功能。
 */
export const TeleportImpl = {
  __isTeleport: true,
  process(
    n1: TeleportVNode | null,
    n2: TeleportVNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean,
    internals: RendererInternals
  ) {
    const {
      mc: mountChildren,
      pc: patchChildren,
      pbc: patchBlockChildren,
      o: { insert, querySelector, createText, createComment }
    } = internals

    const disabled = isTeleportDisabled(n2.props)
    let { shapeFlag, children, dynamicChildren } = n2

    // #3302
    // HMR updated, force full diff
    if (__DEV__ && isHmrUpdating) {
      optimized = false
      dynamicChildren = null
    }

    if (n1 == null) {
      // insert anchors in the main view
      const placeholder = (n2.el = __DEV__
        ? createComment('teleport start')
        : createText(''))
      const mainAnchor = (n2.anchor = __DEV__
        ? createComment('teleport end')
        : createText(''))
      insert(placeholder, container, anchor)
      insert(mainAnchor, container, anchor)
      const target = (n2.target = resolveTarget(n2.props, querySelector))
      const targetAnchor = (n2.targetAnchor = createText(''))
      if (target) {
        insert(targetAnchor, target)
        // #2652 we could be teleporting from a non-SVG tree into an SVG tree
        isSVG = isSVG || isTargetSVG(target)
      } else if (__DEV__ && !disabled) {
        warn('Invalid Teleport target on mount:', target, `(${typeof target})`)
      }

      const mount = (container: RendererElement, anchor: RendererNode) => {
        // Teleport *always* has Array children. This is enforced in both the
        // compiler and vnode children normalization.
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(
            children as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          )
        }
      }

      if (disabled) {
        mount(container, mainAnchor)
      } else if (target) {
        mount(target, targetAnchor)
      }
    } else {
      // update content
      n2.el = n1.el
      const mainAnchor = (n2.anchor = n1.anchor)!
      const target = (n2.target = n1.target)!
      const targetAnchor = (n2.targetAnchor = n1.targetAnchor)!
      const wasDisabled = isTeleportDisabled(n1.props)
      const currentContainer = wasDisabled ? container : target
      const currentAnchor = wasDisabled ? mainAnchor : targetAnchor
      isSVG = isSVG || isTargetSVG(target)

      if (dynamicChildren) {
        // fast path when the teleport happens to be a block root
        patchBlockChildren(
          n1.dynamicChildren!,
          dynamicChildren,
          currentContainer,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds
        )
        // even in block tree mode we need to make sure all root-level nodes
        // in the teleport inherit previous DOM references so that they can
        // be moved in future patches.
        traverseStaticChildren(n1, n2, true)
      } else if (!optimized) {
        patchChildren(
          n1,
          n2,
          currentContainer,
          currentAnchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          false
        )
      }

      if (disabled) {
        if (!wasDisabled) {
          // enabled -> disabled
          // move into main container
          moveTeleport(
            n2,
            container,
            mainAnchor,
            internals,
            TeleportMoveTypes.TOGGLE
          )
        }
      } else {
        // target changed
        if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
          const nextTarget = (n2.target = resolveTarget(
            n2.props,
            querySelector
          ))
          if (nextTarget) {
            moveTeleport(
              n2,
              nextTarget,
              null,
              internals,
              TeleportMoveTypes.TARGET_CHANGE
            )
          } else if (__DEV__) {
            warn(
              'Invalid Teleport target on update:',
              target,
              `(${typeof target})`
            )
          }
        } else if (wasDisabled) {
          // disabled -> enabled
          // move into teleport target
          moveTeleport(
            n2,
            target,
            targetAnchor,
            internals,
            TeleportMoveTypes.TOGGLE
          )
        }
      }
    }

    updateCssVars(n2)
  },

  remove(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    optimized: boolean,
    { um: unmount, o: { remove: hostRemove } }: RendererInternals,
    doRemove: Boolean
  ) {
    const { shapeFlag, children, anchor, targetAnchor, target, props } = vnode

    if (target) {
      hostRemove(targetAnchor!)
    }

    // an unmounted teleport should always remove its children if not disabled
    if (doRemove || !isTeleportDisabled(props)) {
      hostRemove(anchor!)
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          const child = (children as VNode[])[i]
          unmount(
            child,
            parentComponent,
            parentSuspense,
            true,
            !!child.dynamicChildren
          )
        }
      }
    }
  },

  move: moveTeleport,
  hydrate: hydrateTeleport
}
/**
 * `TeleportMoveTypes` 是一个枚举类型，用于表示传送门的移动类型。

该枚举包含以下三个常量：

- `TARGET_CHANGE`: 表示传送门的目标位置发生了改变。
- `TOGGLE`: 表示传送门的启用状态发生了改变，即从启用到禁用或从禁用到启用。
- `REORDER`: 表示传送门在主视图中的位置发生了重新排序。

这些常量可以在传送门的移动过程中使用，以确定传送门的具体移动类型，从而执行相应的操作。
 */
export const enum TeleportMoveTypes {
  TARGET_CHANGE,
  TOGGLE, // enable / disable
  REORDER // moved in the main view
}
/**
 * 
 * @param vnode 
 * @param container 
 * @param parentAnchor 
 * @param param3 
 * @param moveType
 * `moveTeleport` 函数用于移动传送门（Teleport）的位置。它接受以下参数：

- `vnode: VNode`：传送门的虚拟节点。
- `container: RendererElement`：目标容器元素，表示传送门将要移动到的容器。
- `parentAnchor: RendererNode | null`：父级锚点元素，表示传送门将要移动到的锚点位置。
- `{ o: { insert }, m: move }: RendererInternals`：渲染器内部工具集，包含插入和移动操作的方法。
- `moveType: TeleportMoveTypes = TeleportMoveTypes.REORDER`：传送门的移动类型，默认为重新排序。

在移动传送门时，函数会根据移动类型执行相应的操作。如果移动类型是 `TARGET_CHANGE`，则会移动目标锚点位置。如果移动类型是 `REORDER`，则会移动主视图锚点位置。然后，根据传送门的状态和移动类型，决定是否移动传送门的子节点。最后，再次移动主视图锚点位置。

请注意，传送门的子节点可以是一个数组或没有子节点。如果传送门是重新排序且启用状态，则不移动子节点。只有在不是重新排序或者传送门被禁用时，才会移动子节点。

这个函数的作用是确保传送门及其子节点正确地移动到目标位置，并维护正确的顺序和关系。 
 */
function moveTeleport(
  vnode: VNode,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  { o: { insert }, m: move }: RendererInternals,
  moveType: TeleportMoveTypes = TeleportMoveTypes.REORDER
) {
  // move target anchor if this is a target change.
  if (moveType === TeleportMoveTypes.TARGET_CHANGE) {
    insert(vnode.targetAnchor!, container, parentAnchor)
  }
  const { el, anchor, shapeFlag, children, props } = vnode
  const isReorder = moveType === TeleportMoveTypes.REORDER
  // move main view anchor if this is a re-order.
  if (isReorder) {
    insert(el!, container, parentAnchor)
  }
  // if this is a re-order and teleport is enabled (content is in target)
  // do not move children. So the opposite is: only move children if this
  // is not a reorder, or the teleport is disabled
  if (!isReorder || isTeleportDisabled(props)) {
    // Teleport has either Array children or no children.
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      for (let i = 0; i < (children as VNode[]).length; i++) {
        move(
          (children as VNode[])[i],
          container,
          parentAnchor,
          MoveType.REORDER
        )
      }
    }
  }
  // move main view anchor if this is a re-order.
  if (isReorder) {
    insert(anchor!, container, parentAnchor)
  }
}
/**
 * 接口 `TeleportTargetElement` 是对 `Element` 接口的扩展，用于表示传送门的目标元素。它具有一个可选属性 `_lpa`，用于存储上一次传送门的目标位置（锚点节点）。

这个扩展接口可以用于标识传送门的目标元素，并在需要时跟踪上一次传送门的位置。
 */
interface TeleportTargetElement extends Element {
  // last teleport target
  _lpa?: Node | null
}
/**
 * 
 * @param node 
 * @param vnode 
 * @param parentComponent 
 * @param parentSuspense 
 * @param slotScopeIds 
 * @param optimized 
 * @param param6 
 * @param hydrateChildren 
 * @returns 
 * `hydrateTeleport` 函数用于在服务器端渲染时对传送门进行恢复操作。它接受一些参数，包括当前节点 `node`、传送门的虚拟节点 `vnode`、父组件实例 `parentComponent`、父悬挂边界 `parentSuspense`、插槽作用域 ID、是否启用优化等。

该函数首先通过 `resolveTarget` 函数解析传送门的目标元素 `target`。然后，根据传送门是否被禁用，选择恢复传送门的内容。

如果传送门被禁用，会调用 `hydrateChildren` 函数来恢复传送门的子节点，并将恢复后的节点作为锚点节点 `anchor`。目标锚点节点 `targetAnchor` 则为目标元素的第一个子节点。

如果传送门未被禁用，则通过遍历目标元素的子节点，找到目标锚点节点 `targetAnchor`。遍历过程中，判断节点是否为注释节点且具有特定的注释内容，如果是，则将其作为目标锚点节点，并将其下一个兄弟节点作为上一次传送门的位置 `_lpa`。然后调用 `hydrateChildren` 函数恢复传送门的子节点，并将目标锚点节点作为锚点节点。

最后，调用 `updateCssVars` 函数更新传送门的 CSS 变量，并返回锚点节点的下一个兄弟节点。
 */
function hydrateTeleport(
  node: Node,
  vnode: TeleportVNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean,
  {
    o: { nextSibling, parentNode, querySelector }
  }: RendererInternals<Node, Element>,
  hydrateChildren: (
    node: Node | null,
    vnode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => Node | null
): Node | null {
  const target = (vnode.target = resolveTarget<Element>(
    vnode.props,
    querySelector
  ))
  if (target) {
    // if multiple teleports rendered to the same target element, we need to
    // pick up from where the last teleport finished instead of the first node
    const targetNode =
      (target as TeleportTargetElement)._lpa || target.firstChild
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (isTeleportDisabled(vnode.props)) {
        vnode.anchor = hydrateChildren(
          nextSibling(node),
          vnode,
          parentNode(node)!,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
        vnode.targetAnchor = targetNode
      } else {
        vnode.anchor = nextSibling(node)

        // lookahead until we find the target anchor
        // we cannot rely on return value of hydrateChildren() because there
        // could be nested teleports
        let targetAnchor = targetNode
        while (targetAnchor) {
          targetAnchor = nextSibling(targetAnchor)
          if (
            targetAnchor &&
            targetAnchor.nodeType === 8 &&
            (targetAnchor as Comment).data === 'teleport anchor'
          ) {
            vnode.targetAnchor = targetAnchor
            ;(target as TeleportTargetElement)._lpa =
              vnode.targetAnchor && nextSibling(vnode.targetAnchor as Node)
            break
          }
        }

        hydrateChildren(
          targetNode,
          vnode,
          target,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
      }
    }
    updateCssVars(vnode)
  }
  return vnode.anchor && nextSibling(vnode.anchor as Node)
}

// Force-casted public typing for h and TSX props inference
/**
 * 代码中导出的`Teleport`是一个类型断言。它将`TeleportImpl`转换为未知类型，然后再转换为一个特定形状的对象。这样导出的`Teleport`可以具有与`TeleportImpl`相同的属性和方法，同时还指定了额外的类型信息。

导出的`Teleport`对象具有以下形状：

```typescript
{
  __isTeleport: true,
  new(): {
    $props: VNodeProps & TeleportProps,
    $slots: {
      default(): VNode[]
    }
  }
}
```

该对象表示`Teleport`组件，具有`__isTeleport`属性和一个构造函数。构造函数创建一个新的对象，该对象具有`$props`和`$slots`属性。其中`$props`属性的类型是`VNodeProps & TeleportProps`，`$slots`属性是一个函数，用于获取`default`插槽的`VNode`数组。
 */
export const Teleport = TeleportImpl as unknown as {
  __isTeleport: true
  new(): {
    $props: VNodeProps & TeleportProps
    $slots: {
      default(): VNode[]
    }
  }
}
/**
 * 
 * @param vnode 
 * 该函数用于更新组件的 CSS 变量（CSS variables）。

函数接受一个 `vnode` 参数，表示虚拟节点。它首先通过 `vnode.ctx` 获取上下文对象 `ctx`，然后检查 `ctx` 对象是否具有 `.ut` 方法。这个方法的存在表示该组件使用了 CSS 变量。

如果存在 `.ut` 方法，那么函数会遍历虚拟节点的子节点，找到第一个元素节点，并将其设置 `data-v-owner` 属性为 `ctx.uid`。然后，函数会调用 `ctx.ut()` 方法，以触发组件的更新。

总结起来，该函数的作用是在使用 CSS 变量的组件中，将特定的属性设置到相关的 DOM 元素上，并触发组件的更新，以确保 CSS 变量的值得到正确的应用和更新。
 */
function updateCssVars(vnode: VNode) {
  // presence of .ut method indicates owner component uses css vars.
  // code path here can assume browser environment.
  const ctx = vnode.ctx
  if (ctx && ctx.ut) {
    let node = (vnode.children as VNode[])[0].el!
    while (node !== vnode.targetAnchor) {
      if (node.nodeType === 1) node.setAttribute('data-v-owner', ctx.uid)
      node = node.nextSibling
    }
    ctx.ut()
  }
}
