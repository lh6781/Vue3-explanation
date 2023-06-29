import {
  VNode,
  normalizeVNode,
  Text,
  Comment,
  Static,
  Fragment,
  VNodeHook,
  createVNode,
  createTextVNode,
  invokeVNodeHook
} from './vnode'
import { flushPostFlushCbs } from './scheduler'
import { ComponentInternalInstance } from './component'
import { invokeDirectiveHook } from './directives'
import { warn } from './warning'
import { PatchFlags, ShapeFlags, isReservedProp, isOn } from '@vue/shared'
import { RendererInternals } from './renderer'
import { setRef } from './rendererTemplateRef'
import {
  SuspenseImpl,
  SuspenseBoundary,
  queueEffectWithSuspense
} from './components/Suspense'
import { TeleportImpl, TeleportVNode } from './components/Teleport'
import { isAsyncWrapper } from './apiAsyncComponent'
/**
 * `RootHydrateFunction` 是一个类型别名，表示根据虚拟节点 `vnode` 将内容渲染到容器 `container` 中的函数。

函数接受两个参数：
- `vnode: VNode<Node, Element>`：要渲染的虚拟节点。
- `container: (Element | ShadowRoot) & { _vnode?: VNode }`：要将内容渲染到的容器，可以是普通的 DOM 元素或 Shadow DOM 的根节点。容器还可以包含一个名为 `_vnode` 的属性，用于存储与容器相关联的虚拟节点。

函数的作用是将虚拟节点 `vnode` 渲染到容器 `container` 中。具体的渲染方式取决于实际的渲染引擎或框架。

通过使用 `RootHydrateFunction` 类型别名，可以在类型注解或类型声明中明确函数的参数和返回值类型，以提高代码的可读性和可维护性。
 */
export type RootHydrateFunction = (
  vnode: VNode<Node, Element>,
  container: (Element | ShadowRoot) & { _vnode?: VNode }
) => void
/**
 * `const enum DOMNodeTypes` 是一个常量枚举，用于表示 DOM 节点的类型。

它定义了以下三个枚举成员：
- `ELEMENT`：表示 DOM 元素节点的类型值为 1。
- `TEXT`：表示 DOM 文本节点的类型值为 3。
- `COMMENT`：表示 DOM 注释节点的类型值为 8。

使用常量枚举可以在代码中使用更加可读性强的符号来表示不同的 DOM 节点类型，而不需要硬编码对应的类型值。例如，可以使用 `DOMNodeTypes.ELEMENT` 来表示元素节点的类型，而不是直接使用数字 1。

常量枚举在编译时会被内联，而不会生成额外的 JavaScript 代码。这意味着在运行时，`DOMNodeTypes.ELEMENT`、`DOMNodeTypes.TEXT` 和 `DOMNodeTypes.COMMENT` 实际上会被替换为对应的类型值。这可以提高代码的性能和可维护性。
 */
const enum DOMNodeTypes {
  ELEMENT = 1,
  TEXT = 3,
  COMMENT = 8
}
/**
 * `hasMismatch` 是一个布尔类型的变量，用于表示是否存在不匹配的情况。

在代码中，`hasMismatch` 的初始值为 `false`，表示不存在不匹配的情况。根据代码的上下文，`hasMismatch` 可能会在某些条件满足时被修改为 `true`，以指示存在不匹配的情况。

具体的修改逻辑需要查看代码中的其他部分来确定。在给定的代码片段中，`hasMismatch` 的初始值为 `false`，但没有展示出它是如何被修改的。
 */
let hasMismatch = false
/**
 * 
 * @param container 】
 * @returns 
 * `isSVGContainer` 是一个函数，用于判断给定的 `container` 是否是 SVG 容器。

函数接受一个参数 `container`，它应该是一个 DOM 元素。函数通过检查 `container` 的命名空间 URI 和标签名来确定是否是 SVG 容器。

具体来说，函数首先使用正则表达式 `/svg/` 来测试 `container` 的命名空间 URI 是否包含 "svg" 字符串。如果命名空间 URI 中包含 "svg" 字符串，表示该容器是 SVG 容器。

另外，函数还会检查 `container` 的标签名是否为 "foreignObject"。如果标签名不是 "foreignObject"，则认为该容器是 SVG 容器。

如果 `container` 是 SVG 容器，函数会返回 `true`，否则返回 `false`。
 */
const isSVGContainer = (container: Element) =>
  /svg/.test(container.namespaceURI!) && container.tagName !== 'foreignObject'
/**
 * 
 * @param node 
 * @returns 
 * `isComment` 是一个函数，用于判断给定的 `node` 是否是注释节点（Comment Node）。

函数接受一个参数 `node`，它应该是一个 DOM 节点。函数通过检查 `node` 的 `nodeType` 属性是否等于 `DOMNodeTypes.COMMENT` 来确定是否是注释节点。

如果 `node` 是注释节点，函数会返回 `true`，否则返回 `false`。
 */
const isComment = (node: Node): node is Comment =>
  node.nodeType === DOMNodeTypes.COMMENT

// Note: hydration is DOM-specific
// But we have to place it in core due to tight coupling with core - splitting
// it out creates a ton of unnecessary complexity.
// Hydration also depends on some renderer internal logic which needs to be
// passed in via arguments.
/**
 * 
 * @param rendererInternals 
 * @returns 
 * `createHydrationFunctions` 函数是一个用于创建 SSR（服务器端渲染）的元素注水（hydration）相关函数的导出函数。注水是将服务器渲染的 HTML 内容与客户端的虚拟 DOM 进行匹配和同步的过程。

在这个函数中，首先从传入的 `rendererInternals` 对象中获取所需的渲染函数和操作函数。然后定义了一个名为 `hydrate` 的函数，用于执行注水操作。`hydrate` 函数会检查容器元素是否有子节点，如果没有子节点，则会执行完整的挂载操作；否则，会通过调用 `hydrateNode` 函数来进行节点的匹配和同步。

`hydrateNode` 函数是核心的注水函数，它根据节点类型的不同执行相应的匹配和同步操作。根据节点的类型，可以分为文本节点、注释节点、静态节点、片段节点、元素节点、组件节点、传送门节点和异步组件节点等。

函数的逻辑主要包括以下几个步骤：
1. 根据节点类型执行相应的匹配和同步操作。
2. 检查是否需要更新节点的属性。
3. 执行节点的钩子函数。
4. 处理节点的子节点。

最后，根据匹配结果和执行过程中的错误情况，可能会输出一些警告信息。

总之，`createHydrationFunctions` 函数用于创建在服务器端渲染的 HTML 内容和客户端的虚拟 DOM 之间进行注水操作的函数，以确保两者保持一致性。
 */
export function createHydrationFunctions(
  rendererInternals: RendererInternals<Node, Element>
) {
  const {
    mt: mountComponent,
    p: patch,
    o: {
      patchProp,
      createText,
      nextSibling,
      parentNode,
      remove,
      insert,
      createComment
    }
  } = rendererInternals

  const hydrate: RootHydrateFunction = (vnode, container) => {
    if (!container.hasChildNodes()) {
      __DEV__ &&
        warn(
          `Attempting to hydrate existing markup but container is empty. ` +
            `Performing full mount instead.`
        )
      patch(null, vnode, container)
      flushPostFlushCbs()
      container._vnode = vnode
      return
    }
    hasMismatch = false
    hydrateNode(container.firstChild!, vnode, null, null, null)
    flushPostFlushCbs()
    container._vnode = vnode
    if (hasMismatch && !__TEST__) {
      // this error should show up in production
      console.error(`Hydration completed but contains mismatches.`)
    }
  }

  const hydrateNode = (
    node: Node,
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized = false
  ): Node | null => {
    const isFragmentStart = isComment(node) && node.data === '['
    const onMismatch = () =>
      handleMismatch(
        node,
        vnode,
        parentComponent,
        parentSuspense,
        slotScopeIds,
        isFragmentStart
      )

    const { type, ref, shapeFlag, patchFlag } = vnode
    let domType = node.nodeType
    vnode.el = node

    if (patchFlag === PatchFlags.BAIL) {
      optimized = false
      vnode.dynamicChildren = null
    }

    let nextNode: Node | null = null
    switch (type) {
      case Text:
        if (domType !== DOMNodeTypes.TEXT) {
          // #5728 empty text node inside a slot can cause hydration failure
          // because the server rendered HTML won't contain a text node
          if (vnode.children === '') {
            insert((vnode.el = createText('')), parentNode(node)!, node)
            nextNode = node
          } else {
            nextNode = onMismatch()
          }
        } else {
          if ((node as Text).data !== vnode.children) {
            hasMismatch = true
            __DEV__ &&
              warn(
                `Hydration text mismatch:` +
                  `\n- Client: ${JSON.stringify((node as Text).data)}` +
                  `\n- Server: ${JSON.stringify(vnode.children)}`
              )
            ;(node as Text).data = vnode.children as string
          }
          nextNode = nextSibling(node)
        }
        break
      case Comment:
        if (domType !== DOMNodeTypes.COMMENT || isFragmentStart) {
          nextNode = onMismatch()
        } else {
          nextNode = nextSibling(node)
        }
        break
      case Static:
        if (isFragmentStart) {
          // entire template is static but SSRed as a fragment
          node = nextSibling(node)!
          domType = node.nodeType
        }
        if (domType === DOMNodeTypes.ELEMENT || domType === DOMNodeTypes.TEXT) {
          // determine anchor, adopt content
          nextNode = node
          // if the static vnode has its content stripped during build,
          // adopt it from the server-rendered HTML.
          const needToAdoptContent = !(vnode.children as string).length
          for (let i = 0; i < vnode.staticCount!; i++) {
            if (needToAdoptContent)
              vnode.children +=
                nextNode.nodeType === DOMNodeTypes.ELEMENT
                  ? (nextNode as Element).outerHTML
                  : (nextNode as Text).data
            if (i === vnode.staticCount! - 1) {
              vnode.anchor = nextNode
            }
            nextNode = nextSibling(nextNode)!
          }
          return isFragmentStart ? nextSibling(nextNode) : nextNode
        } else {
          onMismatch()
        }
        break
      case Fragment:
        if (!isFragmentStart) {
          nextNode = onMismatch()
        } else {
          nextNode = hydrateFragment(
            node as Comment,
            vnode,
            parentComponent,
            parentSuspense,
            slotScopeIds,
            optimized
          )
        }
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          if (
            domType !== DOMNodeTypes.ELEMENT ||
            (vnode.type as string).toLowerCase() !==
              (node as Element).tagName.toLowerCase()
          ) {
            nextNode = onMismatch()
          } else {
            nextNode = hydrateElement(
              node as Element,
              vnode,
              parentComponent,
              parentSuspense,
              slotScopeIds,
              optimized
            )
          }
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // when setting up the render effect, if the initial vnode already
          // has .el set, the component will perform hydration instead of mount
          // on its sub-tree.
          vnode.slotScopeIds = slotScopeIds
          const container = parentNode(node)!
          mountComponent(
            vnode,
            container,
            null,
            parentComponent,
            parentSuspense,
            isSVGContainer(container),
            optimized
          )

          // component may be async, so in the case of fragments we cannot rely
          // on component's rendered output to determine the end of the fragment
          // instead, we do a lookahead to find the end anchor node.
          nextNode = isFragmentStart
            ? locateClosingAsyncAnchor(node)
            : nextSibling(node)

          // #4293 teleport as component root
          if (
            nextNode &&
            isComment(nextNode) &&
            nextNode.data === 'teleport end'
          ) {
            nextNode = nextSibling(nextNode)
          }

          // #3787
          // if component is async, it may get moved / unmounted before its
          // inner component is loaded, so we need to give it a placeholder
          // vnode that matches its adopted DOM.
          if (isAsyncWrapper(vnode)) {
            let subTree
            if (isFragmentStart) {
              subTree = createVNode(Fragment)
              subTree.anchor = nextNode
                ? nextNode.previousSibling
                : container.lastChild
            } else {
              subTree =
                node.nodeType === 3 ? createTextVNode('') : createVNode('div')
            }
            subTree.el = node
            vnode.component!.subTree = subTree
          }
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          if (domType !== DOMNodeTypes.COMMENT) {
            nextNode = onMismatch()
          } else {
            nextNode = (vnode.type as typeof TeleportImpl).hydrate(
              node,
              vnode as TeleportVNode,
              parentComponent,
              parentSuspense,
              slotScopeIds,
              optimized,
              rendererInternals,
              hydrateChildren
            )
          }
        } else if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
          nextNode = (vnode.type as typeof SuspenseImpl).hydrate(
            node,
            vnode,
            parentComponent,
            parentSuspense,
            isSVGContainer(parentNode(node)!),
            slotScopeIds,
            optimized,
            rendererInternals,
            hydrateNode
          )
        } else if (__DEV__) {
          warn('Invalid HostVNode type:', type, `(${typeof type})`)
        }
    }

    if (ref != null) {
      setRef(ref, null, parentSuspense, vnode)
    }

    return nextNode
  }

  const hydrateElement = (
    el: Element,
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    optimized = optimized || !!vnode.dynamicChildren
    const { type, props, patchFlag, shapeFlag, dirs } = vnode
    // #4006 for form elements with non-string v-model value bindings
    // e.g. <option :value="obj">, <input type="checkbox" :true-value="1">
    const forcePatchValue = (type === 'input' && dirs) || type === 'option'
    // skip props & children if this is hoisted static nodes
    // #5405 in dev, always hydrate children for HMR
    if (__DEV__ || forcePatchValue || patchFlag !== PatchFlags.HOISTED) {
      if (dirs) {
        invokeDirectiveHook(vnode, null, parentComponent, 'created')
      }
      // props
      if (props) {
        if (
          forcePatchValue ||
          !optimized ||
          patchFlag & (PatchFlags.FULL_PROPS | PatchFlags.HYDRATE_EVENTS)
        ) {
          for (const key in props) {
            if (
              (forcePatchValue && key.endsWith('value')) ||
              (isOn(key) && !isReservedProp(key))
            ) {
              patchProp(
                el,
                key,
                null,
                props[key],
                false,
                undefined,
                parentComponent
              )
            }
          }
        } else if (props.onClick) {
          // Fast path for click listeners (which is most often) to avoid
          // iterating through props.
          patchProp(
            el,
            'onClick',
            null,
            props.onClick,
            false,
            undefined,
            parentComponent
          )
        }
      }
      // vnode / directive hooks
      let vnodeHooks: VNodeHook | null | undefined
      if ((vnodeHooks = props && props.onVnodeBeforeMount)) {
        invokeVNodeHook(vnodeHooks, parentComponent, vnode)
      }
      if (dirs) {
        invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount')
      }
      if ((vnodeHooks = props && props.onVnodeMounted) || dirs) {
        queueEffectWithSuspense(() => {
          vnodeHooks && invokeVNodeHook(vnodeHooks, parentComponent, vnode)
          dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted')
        }, parentSuspense)
      }
      // children
      if (
        shapeFlag & ShapeFlags.ARRAY_CHILDREN &&
        // skip if element has innerHTML / textContent
        !(props && (props.innerHTML || props.textContent))
      ) {
        let next = hydrateChildren(
          el.firstChild,
          vnode,
          el,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
        let hasWarned = false
        while (next) {
          hasMismatch = true
          if (__DEV__ && !hasWarned) {
            warn(
              `Hydration children mismatch in <${vnode.type as string}>: ` +
                `server rendered element contains more child nodes than client vdom.`
            )
            hasWarned = true
          }
          // The SSRed DOM contains more nodes than it should. Remove them.
          const cur = next
          next = next.nextSibling
          remove(cur)
        }
      } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        if (el.textContent !== vnode.children) {
          hasMismatch = true
          __DEV__ &&
            warn(
              `Hydration text content mismatch in <${
                vnode.type as string
              }>:\n` +
                `- Client: ${el.textContent}\n` +
                `- Server: ${vnode.children as string}`
            )
          el.textContent = vnode.children as string
        }
      }
    }
    return el.nextSibling
  }

  const hydrateChildren = (
    node: Node | null,
    parentVNode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized: boolean
  ): Node | null => {
    optimized = optimized || !!parentVNode.dynamicChildren
    const children = parentVNode.children as VNode[]
    const l = children.length
    let hasWarned = false
    for (let i = 0; i < l; i++) {
      const vnode = optimized
        ? children[i]
        : (children[i] = normalizeVNode(children[i]))
      if (node) {
        node = hydrateNode(
          node,
          vnode,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
      } else if (vnode.type === Text && !vnode.children) {
        continue
      } else {
        hasMismatch = true
        if (__DEV__ && !hasWarned) {
          warn(
            `Hydration children mismatch in <${container.tagName.toLowerCase()}>: ` +
              `server rendered element contains fewer child nodes than client vdom.`
          )
          hasWarned = true
        }
        // the SSRed DOM didn't contain enough nodes. Mount the missing ones.
        patch(
          null,
          vnode,
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVGContainer(container),
          slotScopeIds
        )
      }
    }
    return node
  }

  const hydrateFragment = (
    node: Comment,
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    const { slotScopeIds: fragmentSlotScopeIds } = vnode
    if (fragmentSlotScopeIds) {
      slotScopeIds = slotScopeIds
        ? slotScopeIds.concat(fragmentSlotScopeIds)
        : fragmentSlotScopeIds
    }

    const container = parentNode(node)!
    const next = hydrateChildren(
      nextSibling(node)!,
      vnode,
      container,
      parentComponent,
      parentSuspense,
      slotScopeIds,
      optimized
    )
    if (next && isComment(next) && next.data === ']') {
      return nextSibling((vnode.anchor = next))
    } else {
      // fragment didn't hydrate successfully, since we didn't get a end anchor
      // back. This should have led to node/children mismatch warnings.
      hasMismatch = true
      // since the anchor is missing, we need to create one and insert it
      insert((vnode.anchor = createComment(`]`)), container, next)
      return next
    }
  }

  const handleMismatch = (
    node: Node,
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    isFragment: boolean
  ): Node | null => {
    hasMismatch = true
    __DEV__ &&
      warn(
        `Hydration node mismatch:\n- Client vnode:`,
        vnode.type,
        `\n- Server rendered DOM:`,
        node,
        node.nodeType === DOMNodeTypes.TEXT
          ? `(text)`
          : isComment(node) && node.data === '['
          ? `(start of fragment)`
          : ``
      )
    vnode.el = null

    if (isFragment) {
      // remove excessive fragment nodes
      const end = locateClosingAsyncAnchor(node)
      while (true) {
        const next = nextSibling(node)
        if (next && next !== end) {
          remove(next)
        } else {
          break
        }
      }
    }

    const next = nextSibling(node)
    const container = parentNode(node)!
    remove(node)

    patch(
      null,
      vnode,
      container,
      next,
      parentComponent,
      parentSuspense,
      isSVGContainer(container),
      slotScopeIds
    )
    return next
  }

  const locateClosingAsyncAnchor = (node: Node | null): Node | null => {
    let match = 0
    while (node) {
      node = nextSibling(node)
      if (node && isComment(node)) {
        if (node.data === '[') match++
        if (node.data === ']') {
          if (match === 0) {
            return nextSibling(node)
          } else {
            match--
          }
        }
      }
    }
    return node
  }

  return [hydrate, hydrateNode] as const
}
