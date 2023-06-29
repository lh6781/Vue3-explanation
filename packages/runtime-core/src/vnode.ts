import {
  isArray,
  isFunction,
  isString,
  isObject,
  EMPTY_ARR,
  extend,
  normalizeClass,
  normalizeStyle,
  PatchFlags,
  ShapeFlags,
  SlotFlags,
  isOn
} from '@vue/shared'
import {
  ComponentInternalInstance,
  Data,
  ConcreteComponent,
  ClassComponent,
  Component,
  isClassComponent
} from './component'
import { RawSlots } from './componentSlots'
import { isProxy, Ref, toRaw, ReactiveFlags, isRef } from '@vue/reactivity'
import { AppContext } from './apiCreateApp'
import {
  Suspense,
  SuspenseImpl,
  isSuspense,
  SuspenseBoundary
} from './components/Suspense'
import { DirectiveBinding } from './directives'
import { TransitionHooks } from './components/BaseTransition'
import { warn } from './warning'
import { Teleport, TeleportImpl, isTeleport } from './components/Teleport'
import {
  currentRenderingInstance,
  currentScopeId
} from './componentRenderContext'
import { RendererNode, RendererElement } from './renderer'
import { NULL_DYNAMIC_COMPONENT } from './helpers/resolveAssets'
import { hmrDirtyComponents } from './hmr'
import { convertLegacyComponent } from './compat/component'
import { convertLegacyVModelProps } from './compat/componentVModel'
import { defineLegacyVNodeProperties } from './compat/renderFn'
import { callWithAsyncErrorHandling, ErrorCodes } from './errorHandling'
import { ComponentPublicInstance } from './componentPublicInstance'
/**
 * 这段代码定义了一个名为 `Fragment` 的常量，其值为一个特殊的符号（Symbol），用于表示虚拟片段（Fragment）。

具体逻辑如下：
- 使用 `Symbol.for('v-fgt')` 创建一个唯一的符号值。
- 通过类型断言 `as any as { __isFragment: true }` 将符号类型转换为包含 `__isFragment` 属性的对象类型。
- 对象类型具有一个无参构造函数，用于创建虚拟片段的实例。
  - `__isFragment` 属性被设置为 `true`，表示这是一个虚拟片段。
  - `$props` 属性用于存储虚拟片段的属性。

通过使用这个 `Fragment` 符号和相关的对象类型，可以创建表示虚拟片段的实例，并在虚拟 DOM 的构建和处理过程中使用它们。

请注意，这段代码是一个导出的常量声明，用于提供给其他模块使用。具体的使用方式和上下文需要在代码的其他部分进行进一步的查看和分析。
 */
export const Fragment = Symbol.for('v-fgt') as any as {
  __isFragment: true
  new (): {
    $props: VNodeProps
  }
}
/**
 * 定义了一个名为Text的常量变量。Text变量的值是使用Symbol.for()方法生成的，该方法创建了一个描述为'v-txt'的符号(Symbol)。符号是唯一且不可变的值，可用作对象属性的键。通过使用Symbol.for()，确保该符号在全局符号注册表中注册，可以从代码的不同部分访问它。
 */
export const Text = Symbol.for('v-txt')
/**
 * 这段代码定义了一个名为 `Comment` 的常量，其值为一个特殊的符号（Symbol），用于表示注释节点（Comment Node）。

具体逻辑如下：
- 使用 `Symbol.for('v-cmt')` 创建一个唯一的符号值，用于表示注释节点。
- 将该符号赋值给常量 `Comment`。

通过使用这个 `Comment` 符号，可以在虚拟 DOM 的构建和处理过程中标识和处理注释节点。

请注意，这段代码是一个导出的常量声明，用于提供给其他模块使用。具体的使用方式和上下文需要在代码的其他部分进行进一步的查看和分析。
 */
export const Comment = Symbol.for('v-cmt')
/**
 * 这段代码定义了一个名为 `Static` 的常量，其值为一个特殊的符号（Symbol），用于表示静态节点（Static Node）。

具体逻辑如下：
- 使用 `Symbol.for('v-stc')` 创建一个唯一的符号值，用于表示静态节点。
- 将该符号赋值给常量 `Static`。

通过使用这个 `Static` 符号，可以在虚拟 DOM 的构建和处理过程中标识和处理静态节点，这些节点在组件的渲染过程中不会发生变化。

请注意，这段代码是一个导出的常量声明，用于提供给其他模块使用。具体的使用方式和上下文需要在代码的其他部分进行进一步的查看和分析。
 */
export const Static = Symbol.for('v-stc')
/**
 * 这段代码定义了两个类型别名：`VNodeTypes` 和 `VNodeRef`。

`VNodeTypes` 是一个联合类型，表示虚拟节点（VNode）的类型。它可以是以下类型之一：
- 字符串（string）：表示一个普通的 HTML 标签名称。
- `VNode`：表示另一个虚拟节点。
- `Component`：表示一个组件实例。
- `typeof Text`：表示一个文本节点。
- `typeof Static`：表示一个静态节点。
- `typeof Comment`：表示一个注释节点。
- `typeof Fragment`：表示一个虚拟片段。
- `typeof Teleport`：表示一个传送门（Teleport）组件。
- `typeof TeleportImpl`：表示一个传送门组件的实现。
- `typeof Suspense`：表示一个悬挂（Suspense）组件。
- `typeof SuspenseImpl`：表示一个悬挂组件的实现。

`VNodeRef` 是一个联合类型，表示虚拟节点的引用类型。它可以是以下类型之一：
- 字符串（string）：表示一个字符串引用。
- `Ref`：表示一个响应式引用。
- 回调函数：一个函数，用于处理引用的更新。该函数接收两个参数：引用的元素、组件实例或 `null`，以及一个记录所有引用的对象。

这些类型别名用于定义虚拟节点的类型和引用的类型，以在虚拟 DOM 的构建和处理过程中提供类型安全性和便利性。

请注意，这段代码中的 `typeof Text`、`typeof Static`、`typeof Comment`、`typeof Fragment`、`typeof Teleport`、`typeof TeleportImpl`、`typeof Suspense`、`typeof SuspenseImpl` 是为了表示相应类型的构造函数，而不是具体的值。
 */
export type VNodeTypes =
  | string
  | VNode
  | Component
  | typeof Text
  | typeof Static
  | typeof Comment
  | typeof Fragment
  | typeof Teleport
  | typeof TeleportImpl
  | typeof Suspense
  | typeof SuspenseImpl
/**
 * 这段代码定义了两个类型别名：`VNodeTypes` 和 `VNodeRef`。

`VNodeTypes` 是一个联合类型，表示虚拟节点（VNode）的类型。它可以是以下类型之一：
- 字符串（string）：表示一个普通的 HTML 标签名称。
- `VNode`：表示另一个虚拟节点。
- `Component`：表示一个组件实例。
- `typeof Text`：表示一个文本节点。
- `typeof Static`：表示一个静态节点。
- `typeof Comment`：表示一个注释节点。
- `typeof Fragment`：表示一个虚拟片段。
- `typeof Teleport`：表示一个传送门（Teleport）组件。
- `typeof TeleportImpl`：表示一个传送门组件的实现。
- `typeof Suspense`：表示一个悬挂（Suspense）组件。
- `typeof SuspenseImpl`：表示一个悬挂组件的实现。

`VNodeRef` 是一个联合类型，表示虚拟节点的引用类型。它可以是以下类型之一：
- 字符串（string）：表示一个字符串引用。
- `Ref`：表示一个响应式引用。
- 回调函数：一个函数，用于处理引用的更新。该函数接收两个参数：引用的元素、组件实例或 `null`，以及一个记录所有引用的对象。

这些类型别名用于定义虚拟节点的类型和引用的类型，以在虚拟 DOM 的构建和处理过程中提供类型安全性和便利性。

请注意，这段代码中的 `typeof Text`、`typeof Static`、`typeof Comment`、`typeof Fragment`、`typeof Teleport`、`typeof TeleportImpl`、`typeof Suspense`、`typeof SuspenseImpl` 是为了表示相应类型的构造函数，而不是具体的值。
 */
export type VNodeRef =
  | string
  | Ref
  | ((
      ref: Element | ComponentPublicInstance | null,
      refs: Record<string, any>
    ) => void)
/**
 * 这段代码定义了 `VNodeNormalizedRefAtom` 类型别名，用于表示规范化的虚拟节点引用。

`VNodeNormalizedRefAtom` 包含以下属性：
- `i`：表示组件的内部实例（`ComponentInternalInstance`）。
- `r`：表示虚拟节点引用（`VNodeRef`）。
- `k`（可选）：表示设置的引用键（`key`）。
- `f`（可选）：表示引用在 `for` 循环中的标记（`refInFor` marker）。

通过定义 `VNodeNormalizedRefAtom` 类型别名，可以将这些属性作为规范化的虚拟节点引用的一部分。这可以帮助在处理虚拟节点引用时提供更多的上下文和元数据。
 */
export type VNodeNormalizedRefAtom = {
  i: ComponentInternalInstance
  r: VNodeRef
  k?: string // setup ref key
  f?: boolean // refInFor marker
}
/**
 * 这段代码定义了 `VNodeNormalizedRef` 类型别名，用于表示规范化的虚拟节点引用。

`VNodeNormalizedRef` 可以是以下两种类型之一：
- `VNodeNormalizedRefAtom`：表示单个规范化的虚拟节点引用。
- `VNodeNormalizedRefAtom[]`：表示多个规范化的虚拟节点引用。

通过定义 `VNodeNormalizedRef` 类型别名，可以将单个或多个规范化的虚拟节点引用作为统一的类型进行处理。这在处理虚拟节点引用列表时非常有用，可以确保引用列表的类型一致性和正确性。
 */
export type VNodeNormalizedRef =
  | VNodeNormalizedRefAtom
  | VNodeNormalizedRefAtom[]
/**
 * `VNodeMountHook` 是一个类型别名，表示虚拟节点挂载的钩子函数类型。

该类型别名定义了一个函数类型，接受一个 `VNode` 参数，并且没有返回值。钩子函数用于在虚拟节点挂载到实际 DOM 上时执行相应的操作或逻辑。通过使用 `VNodeMountHook` 类型别名，可以明确指定这类钩子函数的参数和返回值类型，以便在开发过程中进行类型检查和类型推断。
 */
type VNodeMountHook = (vnode: VNode) => void
/**
 * `VNodeUpdateHook` 是一个类型别名，表示虚拟节点更新的钩子函数类型。

该类型别名定义了一个函数类型，接受两个参数 `vnode` 和 `oldVNode`，并且没有返回值。钩子函数用于在虚拟节点更新时执行相应的操作或逻辑，可以比较新旧虚拟节点的属性和状态，并根据需要进行更新。通过使用 `VNodeUpdateHook` 类型别名，可以明确指定这类钩子函数的参数和返回值类型，以便在开发过程中进行类型检查和类型推断。
 */
type VNodeUpdateHook = (vnode: VNode, oldVNode: VNode) => void
/**
 * `VNodeHook` 是一个类型别名，表示虚拟节点的钩子函数类型。

该类型别名可以包含以下几种类型的值：
- `VNodeMountHook`: 表示虚拟节点挂载的钩子函数类型。
- `VNodeUpdateHook`: 表示虚拟节点更新的钩子函数类型。
- `VNodeMountHook[]`: 表示一个包含多个虚拟节点挂载钩子函数的数组。
- `VNodeUpdateHook[]`: 表示一个包含多个虚拟节点更新钩子函数的数组。

通过使用 `VNodeHook` 类型别名，可以灵活地定义和传递虚拟节点的钩子函数，以便在不同的生命周期阶段执行相应的操作或逻辑。
 */
export type VNodeHook =
  | VNodeMountHook
  | VNodeUpdateHook
  | VNodeMountHook[]
  | VNodeUpdateHook[]

// https://github.com/microsoft/TypeScript/issues/33099
/**
 * `VNodeProps` 是一个类型别名，表示虚拟节点的属性类型。

该类型别名定义了一系列虚拟节点的属性，包括：
- `key`: 用于虚拟节点的唯一标识，可以是字符串、数字或符号类型。
- `ref`: 用于获取虚拟节点的引用，可以是字符串、`Ref` 类型或回调函数类型。
- `ref_for`: 用于标记是否是在循环中使用的引用。
- `ref_key`: 用于指定引用的键名。

此外，还定义了一些用于处理虚拟节点生命周期的钩子函数：
- `onVnodeBeforeMount`: 在虚拟节点挂载之前调用的钩子函数或钩子函数数组。
- `onVnodeMounted`: 在虚拟节点挂载之后调用的钩子函数或钩子函数数组。
- `onVnodeBeforeUpdate`: 在虚拟节点更新之前调用的钩子函数或钩子函数数组。
- `onVnodeUpdated`: 在虚拟节点更新之后调用的钩子函数或钩子函数数组。
- `onVnodeBeforeUnmount`: 在虚拟节点卸载之前调用的钩子函数或钩子函数数组。
- `onVnodeUnmounted`: 在虚拟节点卸载之后调用的钩子函数或钩子函数数组。

通过使用 `VNodeProps` 类型别名，可以定义和传递虚拟节点的属性，并在相应的生命周期阶段执行对应的钩子函数。
 */
export type VNodeProps = {
  key?: string | number | symbol
  ref?: VNodeRef
  ref_for?: boolean
  ref_key?: string

  // vnode hooks
  onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[]
  onVnodeMounted?: VNodeMountHook | VNodeMountHook[]
  onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[]
  onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[]
  onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[]
  onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[]
}
/**
 * `VNodeChildAtom` 是一个类型别名，表示虚拟节点的原子子节点类型。

该类型别名定义了虚拟节点的原子子节点可以是以下类型之一：
- `VNode`: 表示另一个虚拟节点作为子节点。
- `string`: 表示文本内容作为子节点。
- `number`: 表示数字内容作为子节点。
- `boolean`: 表示布尔值作为子节点。
- `null`: 表示空值作为子节点。
- `undefined`: 表示未定义值作为子节点。
- `void`: 表示空白节点作为子节点。

通过使用 `VNodeChildAtom` 类型别名，可以定义虚拟节点的原子子节点的类型，并在创建虚拟节点时指定其子节点的类型。
 */
type VNodeChildAtom =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void
/**
 * `VNodeArrayChildren` 是一个类型别名，表示虚拟节点的数组子节点类型。

该类型别名定义了虚拟节点的数组子节点可以是以下类型之一：
- `VNodeArrayChildren`：表示另一个虚拟节点数组作为子节点。
- `VNodeChildAtom`：表示原子子节点类型，可以是 `VNode`、`string`、`number`、`boolean`、`null`、`undefined` 或 `void` 中的一种。

通过使用 `VNodeArrayChildren` 类型别名，可以定义虚拟节点的子节点为数组类型，并允许嵌套数组作为子节点的一部分。这样可以创建具有多个子节点的复杂虚拟节点结构。
 */
export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>
/**
 * `VNodeChild` 是一个类型别名，表示虚拟节点的子节点类型。

该类型别名定义了虚拟节点的子节点可以是以下类型之一：
- `VNodeChildAtom`：表示原子子节点类型，可以是 `VNode`、`string`、`number`、`boolean`、`null`、`undefined` 或 `void` 中的一种。
- `VNodeArrayChildren`：表示一个虚拟节点数组作为子节点。

通过使用 `VNodeChild` 类型别名，可以灵活地定义虚拟节点的子节点，使其可以是单个原子子节点或一个子节点数组。这样可以满足不同场景下的虚拟节点需求。
 */
export type VNodeChild = VNodeChildAtom | VNodeArrayChildren
/**
 * `VNodeNormalizedChildren` 是一个类型别名，表示虚拟节点的规范化子节点类型。

该类型别名定义了虚拟节点的规范化子节点可以是以下类型之一：
- `string`：表示原始字符串类型的子节点。
- `VNodeArrayChildren`：表示一个虚拟节点数组作为子节点。
- `RawSlots`：表示使用插槽的子节点，它是一个对象。
- `null`：表示没有子节点。

通过使用 `VNodeNormalizedChildren` 类型别名，可以规范定义虚拟节点的子节点类型，使其可以是字符串、子节点数组、插槽或空值之一。这样可以统一处理不同类型的子节点，并提供更好的类型安全性。
 */
export type VNodeNormalizedChildren =
  | string
  | VNodeArrayChildren
  | RawSlots
  | null
/**
 * `VNode` 接口定义了虚拟节点的属性和方法。它是一个泛型接口，允许指定宿主节点类型 `HostNode`、宿主元素类型 `HostElement`，以及额外的属性 `ExtraProps`。

该接口包含以下属性：

- `__v_isVNode`：内部属性，用于标识该对象是一个虚拟节点。
- `[ReactiveFlags.SKIP]`：内部属性，用于跳过响应式处理。
- `type`：虚拟节点的类型，可以是字符串、组件、文本节点等。
- `props`：虚拟节点的属性，包括键值对和其他额外的属性。
- `key`：虚拟节点的唯一键，用于优化节点更新。
- `ref`：虚拟节点的引用，用于访问节点的实例或元素。
- `scopeId`：仅在单文件组件中使用，表示虚拟节点的作用域 ID。
- `slotScopeIds`：仅在单文件组件中使用，表示插槽作用域的 ID 列表。
- `children`：虚拟节点的子节点，可以是字符串、子节点数组、插槽或空值。
- `component`：虚拟节点所属的组件实例。
- `dirs`：指令绑定的数组。
- `transition`：过渡钩子函数。
- `el`：DOM 节点。
- `anchor`：片段节点的锚点。
- `target`：传送目标节点。
- `targetAnchor`：传送目标节点的锚点。
- `staticCount`：静态节点中包含的元素数量。
- `suspense`：悬挂边界节点。
- `ssContent`：悬挂边界的内容节点。
- `ssFallback`：悬挂边界的回退节点。
- `shapeFlag`：节点的形状标志。
- `patchFlag`：节点的修补标志。
- `dynamicProps`：动态属性数组。
- `dynamicChildren`：动态子节点数组。
- `appContext`：应用程序上下文。
- `ctx`：词法作用域的拥有实例。
- `memo`：由 `v-memo` 附加的属性。
- `isCompatRoot`：`__COMPAT__` 模式下的兼容根节点标志。
- `ce`：自定义元素拦截钩子。

`VNode` 接口定义了虚拟节点对象的结构，用于描述虚拟 DOM 树的节点。它包含了虚拟节点的各种属性，并提供了一些内部属性和方法，用于在 Vue 的渲染和更新过程中进行处理和优化。
 */
export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  /**
   * @internal
   */
  __v_isVNode: true

  /**
   * @internal
   */
  [ReactiveFlags.SKIP]: true

  type: VNodeTypes
  props: (VNodeProps & ExtraProps) | null
  key: string | number | symbol | null
  ref: VNodeNormalizedRef | null
  /**
   * SFC only. This is assigned on vnode creation using currentScopeId
   * which is set alongside currentRenderingInstance.
   */
  scopeId: string | null
  /**
   * SFC only. This is assigned to:
   * - Slot fragment vnodes with :slotted SFC styles.
   * - Component vnodes (during patch/hydration) so that its root node can
   *   inherit the component's slotScopeIds
   * @internal
   */
  slotScopeIds: string[] | null
  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null
  dirs: DirectiveBinding[] | null
  transition: TransitionHooks<HostElement> | null

  // DOM
  el: HostNode | null
  anchor: HostNode | null // fragment anchor
  target: HostElement | null // teleport target
  targetAnchor: HostNode | null // teleport target anchor
  /**
   * number of elements contained in a static vnode
   * @internal
   */
  staticCount: number

  // suspense
  suspense: SuspenseBoundary | null
  /**
   * @internal
   */
  ssContent: VNode | null
  /**
   * @internal
   */
  ssFallback: VNode | null

  // optimization only
  shapeFlag: number
  patchFlag: number
  /**
   * @internal
   */
  dynamicProps: string[] | null
  /**
   * @internal
   */
  dynamicChildren: VNode[] | null

  // application root node only
  appContext: AppContext | null

  /**
   * @internal lexical scope owner instance
   */
  ctx: ComponentInternalInstance | null

  /**
   * @internal attached by v-memo
   */
  memo?: any[]
  /**
   * @internal __COMPAT__ only
   */
  isCompatRoot?: true
  /**
   * @internal custom element interception hook
   */
  ce?: (instance: ComponentInternalInstance) => void
}

// Since v-if and v-for are the two possible ways node structure can dynamically
// change, once we consider v-if branches and each v-for fragment a block, we
// can divide a template into nested blocks, and within each block the node
// structure would be stable. This allows us to skip most children diffing
// and only worry about the dynamic nodes (indicated by patch flags).
/**
 * `blockStack` 是一个数组，用于存储块级别的虚拟节点数组。每个元素都是一个虚拟节点数组或 `null` 值。

在 Vue 的编译过程中，模板中的块级别指令（如 `v-for`、`v-if`、`v-slot` 等）会被编译为相应的虚拟节点，并放入 `blockStack` 中。这样可以在编译过程中追踪和管理块级别的节点。

在运行时，当处理块级别指令时，会将生成的虚拟节点数组压入 `blockStack` 中，以便在处理完块级别指令后能够正确地恢复到之前的上下文。当块级别指令处理完成后，对应的虚拟节点数组会从 `blockStack` 中弹出。

通过使用 `blockStack`，Vue 能够正确处理嵌套的块级别指令，并确保它们在渲染和更新过程中具有正确的嵌套关系和顺序。
 */
export const blockStack: (VNode[] | null)[] = []
/**
 * `currentBlock` 是一个可变的变量，用于存储当前正在处理的块级别虚拟节点数组。它可以是一个虚拟节点数组或 `null` 值。

在 Vue 的编译过程中，当开始处理一个块级别指令（如 `v-for`、`v-if`、`v-slot` 等）时，会将相应的虚拟节点数组赋值给 `currentBlock`。在处理过程中，可以通过 `currentBlock` 引用和修改当前正在处理的块级别虚拟节点数组。

通过使用 `currentBlock`，Vue 在编译过程中能够跟踪当前正在处理的块级别虚拟节点数组，并在需要时进行操作和修改。它在编译过程中的作用类似于堆栈的顶部指针，指示当前的上下文状态。
 */
export let currentBlock: VNode[] | null = null

/**
 * Open a block.
 * This must be called before `createBlock`. It cannot be part of `createBlock`
 * because the children of the block are evaluated before `createBlock` itself
 * is called. The generated code typically looks like this:
 *
 * ```js
 * function render() {
 *   return (openBlock(),createBlock('div', null, [...]))
 * }
 * ```
 * disableTracking is true when creating a v-for fragment block, since a v-for
 * fragment always diffs its children.
 *`openBlock` 是一个函数，用于打开一个新的块级别。它接受一个可选的 `disableTracking` 参数，默认为 `false`。当 `disableTracking` 为 `true` 时，表示禁用跟踪（tracking），此时将不会创建新的块级别虚拟节点数组，并且 `currentBlock` 将被设置为 `null`。

在 Vue 的编译过程中，块级别用于表示一些特殊的结构，例如 `v-for`、`v-if`、`v-slot` 等。当开始处理这些结构时，需要打开一个新的块级别，并将其作为当前的上下文。

`openBlock` 函数的作用是创建一个新的块级别虚拟节点数组，并将其推入 `blockStack` 数组中，同时将 `currentBlock` 设置为新创建的虚拟节点数组。如果 `disableTracking` 参数为 `true`，则将 `currentBlock` 设置为 `null`，表示禁用跟踪。

通过使用 `openBlock`，可以在编译过程中创建新的块级别虚拟节点数组，并在需要时进行操作和修改。它类似于堆栈的入栈操作，用于创建新的上下文状态。
 * @private
 */
export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}
/**
 * `closeBlock` 是一个函数，用于关闭当前的块级别。它会将 `blockStack` 数组中的最后一个元素弹出，同时更新 `currentBlock` 为弹出后的最后一个元素，或者如果 `blockStack` 数组为空，则将 `currentBlock` 设置为 `null`。

在 Vue 的编译过程中，块级别用于表示一些特殊的结构，例如 `v-for`、`v-if`、`v-slot` 等。当处理完这些结构时，需要关闭当前的块级别，并返回到上一个块级别的上下文。

`closeBlock` 函数的作用是将 `blockStack` 数组中的最后一个元素弹出，将其作为当前的块级别虚拟节点数组，并更新 `currentBlock`。如果 `blockStack` 数组为空，则将 `currentBlock` 设置为 `null`，表示已经回到最外层的上下文。

通过使用 `closeBlock`，可以在编译过程中关闭当前的块级别，并返回到上一个块级别的上下文。它类似于堆栈的出栈操作，用于返回到之前的上下文状态。
 */
export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}

// Whether we should be tracking dynamic child nodes inside a block.
// Only tracks when this value is > 0
// We are not using a simple boolean because this value may need to be
// incremented/decremented by nested usage of v-once (see below)
/**
 * `isBlockTreeEnabled` 是一个变量，用于表示块级别的树是否启用。它的初始值为 `1`。

在 Vue 的编译过程中，块级别的树是一种优化策略，用于在生成代码时跟踪和组织块级别的节点。启用块级别的树可以提高生成的代码的效率和性能。

通过将 `isBlockTreeEnabled` 设置为 `1`，可以启用块级别的树。在编译过程中，相关的优化策略将会生效，并生成适用于块级别的树的代码结构。

需要注意的是，`isBlockTreeEnabled` 是一个可变的变量，可能会在编译过程中被修改，以控制块级别树的启用和禁用。具体的逻辑和用途可能需要参考代码的上下文和使用方式来确定。
 */
export let isBlockTreeEnabled = 1

/**
 * Block tracking sometimes needs to be disabled, for example during the
 * creation of a tree that needs to be cached by v-once. The compiler generates
 * code like this:
 *
 * ``` js
 * _cache[1] || (
 *   setBlockTracking(-1),
 *   _cache[1] = createVNode(...),
 *   setBlockTracking(1),
 *   _cache[1]
 * )
 * ```
 *`setBlockTracking` 是一个函数，用于设置块级别树的跟踪状态。它接受一个值 `value`，并将其添加到 `isBlockTreeEnabled` 变量上。

通过调用 `setBlockTracking` 函数并传递不同的值，可以在运行时动态控制块级别树的跟踪状态。增加 `value` 的值将启用块级别树的跟踪，而减少 `value` 的值将禁用块级别树的跟踪。

需要注意的是，`isBlockTreeEnabled` 是一个可变的变量，可能会在运行时被修改。通过调用 `setBlockTracking` 函数，可以在运行时控制块级别树的跟踪状态，以满足特定的需求和优化要求。
 * @private
 */
export function setBlockTracking(value: number) {
  isBlockTreeEnabled += value
}
/**
 * 
 * @param vnode 
 * @returns 
 * `setupBlock` 是一个函数，用于设置块级别的 vnode。它接受一个 `vnode` 参数，代表要设置的块级别 vnode。

`setupBlock` 函数的主要步骤如下：

1. 将当前块的子节点保存在块级别的 vnode 的 `dynamicChildren` 属性中。如果块级别树的跟踪状态（`isBlockTreeEnabled`）大于 0，并且当前块存在，则将当前块作为子节点保存，否则将设置为 `null`。

2. 关闭当前块，即调用 `closeBlock` 函数。

3. 如果块级别树的跟踪状态（`isBlockTreeEnabled`）大于 0 并且当前块存在，则将当前块作为父块的子节点，将当前块级别的 vnode 添加到父块的子节点列表中。

4. 返回设置好的块级别 vnode。

通过调用 `setupBlock` 函数，可以设置块级别的 vnode，并对块级别树进行适当的管理和跟踪。这在编译模板或进行组件渲染时非常有用，以便正确处理块级别的更新和优化。
 */
function setupBlock(vnode: VNode) {
  // save current block children on the block vnode
  vnode.dynamicChildren =
    isBlockTreeEnabled > 0 ? currentBlock || (EMPTY_ARR as any) : null
  // close block
  closeBlock()
  // a block is always going to be patched, so track it as a child of its
  // parent block
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  return vnode
}

/**
 * @private
 * `createElementBlock` 是一个函数，用于创建块级别的元素 vnode。它接受多个参数来构造块级别的 vnode。

函数的主要步骤如下：

1. 使用 `createBaseVNode` 函数创建基础的 vnode，其中包括了传入的 `type`、`props`、`children`、`patchFlag`、`dynamicProps` 和 `shapeFlag` 等参数。通过将最后一个参数 `true` 传递给 `isBlock`，指示这是一个块级别的 vnode。

2. 调用 `setupBlock` 函数来设置块级别的 vnode。这将保存当前块的子节点、关闭当前块，并将当前块作为父块的子节点。

3. 返回设置好的块级别 vnode。

通过调用 `createElementBlock` 函数，可以创建一个块级别的元素 vnode，并将其用于组件渲染或其他场景中，以便进行块级别的更新和优化。
 */
export function createElementBlock(
  type: string | typeof Fragment,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number
) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true /* isBlock */
    )
  )
}

/**
 * Create a block root vnode. Takes the same exact arguments as `createVNode`.
 * A block root keeps track of dynamic nodes within the block in the
 * `dynamicChildren` array.
 *
 * @private
 * `createBlock` 是一个函数，用于创建块级别的 vnode。它接受多个参数来构造块级别的 vnode。

函数的主要步骤如下：

1. 使用 `createVNode` 函数创建 vnode，其中包括了传入的 `type`、`props`、`children`、`patchFlag` 和 `dynamicProps` 等参数。通过将最后一个参数 `true` 传递给 `isBlock`，防止块级别的 vnode 跟踪自身。

2. 调用 `setupBlock` 函数来设置块级别的 vnode。这将保存当前块的子节点、关闭当前块，并将当前块作为父块的子节点。

3. 返回设置好的块级别 vnode。

通过调用 `createBlock` 函数，可以创建一个块级别的 vnode，并将其用于组件渲染或其他场景中，以便进行块级别的更新和优化。
 */
export function createBlock(
  type: VNodeTypes | ClassComponent,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
): VNode {
  return setupBlock(
    createVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      true /* isBlock: prevent a block from tracking itself */
    )
  )
}
/**
 * 
 * @param value 
 * @returns 
 * `isVNode` 是一个函数，用于判断给定的值是否是一个 VNode（虚拟节点）。

函数的实现逻辑如下：

1. 判断传入的值是否存在（非 null 和 undefined）。
2. 如果值存在，则检查它的 `__v_isVNode` 属性是否为 `true`。
3. 如果 `__v_isVNode` 为 `true`，则返回 `true`，表示该值是一个 VNode。
4. 如果 `__v_isVNode` 不为 `true`，则返回 `false`，表示该值不是一个 VNode。

通过调用 `isVNode` 函数，可以对一个值进行类型检查，判断它是否为 VNode。这在开发 Vue.js 相关应用程序时，特别是在处理虚拟节点的场景中，非常有用。
 */
export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false
}
/**
 * 
 * @param n1 
 * @param n2 
 * @returns 
 * `isSameVNodeType` 是一个函数，用于比较两个 VNode（虚拟节点）的类型是否相同。

函数的实现逻辑如下：

1. 如果开发环境为开发模式（`__DEV__` 为真值）且 `n2` 的 `shapeFlag` 包含 `ShapeFlags.COMPONENT`，并且 `n2.type` 是 `hmrDirtyComponents` 集合中的一个热更新的组件，则执行以下操作：
   - 通过位运算将 `n1` 的 `shapeFlag` 中的 `ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE` 标记清除。
   - 通过位运算将 `n2` 的 `shapeFlag` 中的 `ShapeFlags.COMPONENT_KEPT_ALIVE` 标记清除。
   - 返回 `false`，表示两个 VNode 的类型不相同，需要进行强制重新加载。
2. 如果 `n1` 的 `type` 等于 `n2` 的 `type`，并且 `n1` 的 `key` 等于 `n2` 的 `key`，则返回 `true`，表示两个 VNode 的类型相同。
3. 否则，返回 `false`，表示两个 VNode 的类型不相同。

通过调用 `isSameVNodeType` 函数，可以比较两个 VNode 的类型是否相同。这在 Vue.js 的虚拟 DOM 更新过程中，用于判断两个 VNode 是否可以进行复用，避免不必要的重新渲染。
 */
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  if (
    __DEV__ &&
    n2.shapeFlag & ShapeFlags.COMPONENT &&
    hmrDirtyComponents.has(n2.type as ConcreteComponent)
  ) {
    // #7042, ensure the vnode being unmounted during HMR
    // bitwise operations to remove keep alive flags
    n1.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
    n2.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE
    // HMR only: if the component has been hot-updated, force a reload.
    return false
  }
  return n1.type === n2.type && n1.key === n2.key
}
/**
 * `vnodeArgsTransformer` 是一个变量，其类型可以是一个函数或者 `undefined`。

如果 `vnodeArgsTransformer` 是一个函数，则它接受两个参数：
- `args: Parameters<typeof _createVNode>`：一个由 `_createVNode` 函数的参数类型构成的元组。
- `instance: ComponentInternalInstance | null`：一个组件的内部实例或者 `null`。

函数的返回值是一个由 `_createVNode` 函数的参数类型构成的元组。

换句话说，`vnodeArgsTransformer` 函数用于转换 `_createVNode` 函数的参数。在创建虚拟节点时，可以通过提供自定义的 `vnodeArgsTransformer` 函数来修改 `_createVNode` 函数的参数，从而实现自定义的虚拟节点创建逻辑。

如果 `vnodeArgsTransformer` 是 `undefined`，则表示没有提供自定义的转换函数。

需要注意的是，由于 `vnodeArgsTransformer` 的具体实现没有提供，因此无法确定转换函数的具体逻辑。具体的转换逻辑取决于使用该变量的代码段。
 */
let vnodeArgsTransformer:
  | ((
      args: Parameters<typeof _createVNode>,
      instance: ComponentInternalInstance | null
    ) => Parameters<typeof _createVNode>)
  | undefined

/**
 * Internal API for registering an arguments transform for createVNode
 * used for creating stubs in the test-utils
 * It is *internal* but needs to be exposed for test-utils to pick up proper
 * typings
 * `transformVNodeArgs` 是一个函数，它接受一个名为 `transformer` 的参数，类型为 `typeof vnodeArgsTransformer`。该函数的作用是将传入的 `transformer` 参数赋值给 `vnodeArgsTransformer` 变量。

通过调用 `transformVNodeArgs` 函数，可以将自定义的转换函数赋值给 `vnodeArgsTransformer` 变量，从而改变虚拟节点创建时参数的转换行为。
 */
export function transformVNodeArgs(transformer?: typeof vnodeArgsTransformer) {
  vnodeArgsTransformer = transformer
}
/**
 * 
 * @param args 
 * @returns 
 * `createVNodeWithArgsTransform` 是一个函数，它接受任意数量的参数，并返回一个 `VNode` 对象。该函数会调用 `_createVNode` 函数来创建虚拟节点，但在调用之前会先根据 `vnodeArgsTransformer` 进行参数的转换。

如果 `vnodeArgsTransformer` 存在，则会将 `args` 和 `currentRenderingInstance` 作为参数传递给 `vnodeArgsTransformer` 进行转换，然后将转换后的参数作为 `_createVNode` 的参数进行调用。如果 `vnodeArgsTransformer` 不存在，则直接将原始的 `args` 作为 `_createVNode` 的参数进行调用。

这样，通过使用 `createVNodeWithArgsTransform` 函数来创建虚拟节点，可以在创建过程中应用自定义的参数转换逻辑。
 */
const createVNodeWithArgsTransform = (
  ...args: Parameters<typeof _createVNode>
): VNode => {
  return _createVNode(
    ...(vnodeArgsTransformer
      ? vnodeArgsTransformer(args, currentRenderingInstance)
      : args)
  )
}
/**
 * `InternalObjectKey` 是一个字符串常量，其值为 `__vInternal`。它通常用作内部对象的键，用于存储一些特定的内部属性或标记。在 Vue 内部实现中，`InternalObjectKey` 可能会用于标识一些特殊的对象或属性，以便在不与用户定义的属性冲突的情况下进行访问和操作。
 */
export const InternalObjectKey = `__vInternal`
/**
 * 
 * @param param0 
 * @returns 
 * `normalizeKey` 是一个函数，接受一个 `VNodeProps` 对象作为参数，并返回一个 `VNode` 对象中的 `key` 属性值。

该函数会判断 `key` 属性是否存在，如果存在则返回该值，否则返回 `null`。这个函数的作用是用于规范化 `key` 属性的取值，确保在使用 `key` 时始终得到一个有效的值。
 */
const normalizeKey = ({ key }: VNodeProps): VNode['key'] =>
  key != null ? key : null
/**
 * 
 * @param param0 
 * @returns 
 * `normalizeRef` 是一个函数，接受一个 `VNodeProps` 对象作为参数，并返回一个 `VNodeNormalizedRefAtom` 对象或 `null`。

该函数首先对 `ref` 进行判断和处理。如果 `ref` 的类型是数字，则将其转换为字符串。然后根据不同的情况返回不同的值：

- 如果 `ref` 不为 `null`，则进一步判断其类型：
  - 如果 `ref` 是字符串、`Ref` 对象或函数，则返回一个包含当前渲染实例、`ref` 值、`ref_key` 值和 `ref_for` 值的 `VNodeNormalizedRefAtom` 对象。
  - 如果 `ref` 的类型不是字符串、`Ref` 对象或函数，则直接返回 `ref`。
- 如果 `ref` 为 `null`，则返回 `null`。

这个函数的作用是用于规范化 `ref` 属性的取值，将其转换为统一的格式，并确保在使用 `ref` 时得到一个有效的引用。
 */
const normalizeRef = ({
  ref,
  ref_key,
  ref_for
}: VNodeProps): VNodeNormalizedRefAtom | null => {
  if (typeof ref === 'number') {
    ref = '' + ref
  }
  return (
    ref != null
      ? isString(ref) || isRef(ref) || isFunction(ref)
        ? { i: currentRenderingInstance, r: ref, k: ref_key, f: !!ref_for }
        : ref
      : null
  ) as any
}
/**
 * 
 * @param type 
 * @param props 
 * @param children 
 * @param patchFlag 
 * @param dynamicProps 
 * @param shapeFlag 
 * @param isBlockNode 
 * @param needFullChildrenNormalization 
 * @returns 
 * `createBaseVNode` 是一个用于创建基本的 VNode 的函数。它接受多个参数，用于设置 VNode 的各个属性，并返回创建的 VNode 对象。

函数内部首先创建一个初始的 VNode 对象 `vnode`，并设置其各个属性。其中一些重要的属性包括：

- `type`: VNode 的类型，可以是组件、元素标签名、注释等。
- `props`: VNode 的属性，包括 key、ref 等。
- `key`: VNode 的唯一标识符，用于优化 VNode 更新过程。
- `ref`: VNode 的引用，用于在组件中获取对应的 DOM 元素或组件实例。
- `children`: VNode 的子节点，可以是文本、数组或其他 VNode。
- `shapeFlag`: VNode 的形状标识，表示 VNode 的类型和特性。
- `patchFlag`: VNode 的修补标识，用于指示在更新时需要进行的具体操作。
- `dynamicProps`: 动态属性的数组，用于追踪动态属性的更新。
- `dynamicChildren`: 动态子节点的数组，用于追踪动态子节点的更新。
- `ctx`: 当前渲染实例，用于关联 VNode 和组件实例。

函数还包含一些额外的逻辑，例如对子节点进行规范化处理、验证 key 的有效性、跟踪 VNode 的父级块等。

最后，函数返回创建的 VNode 对象。这个函数通常用于创建普通的 VNode，如果需要创建带有指令或动态属性的 VNode，则可以使用 `createVNode` 函数。
 */
function createBaseVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
    ctx: currentRenderingInstance
  } as VNode

  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
    // normalize suspense children
    if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      ;(type as typeof SuspenseImpl).normalize(vnode)
    }
  } else if (children) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }

  // validate key
  if (__DEV__ && vnode.key !== vnode.key) {
    warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type)
  }

  // track vnode for block tree
  if (
    isBlockTreeEnabled > 0 &&
    // avoid a block node from tracking itself
    !isBlockNode &&
    // has current parent block
    currentBlock &&
    // presence of a patch flag indicates this node needs patching on updates.
    // component nodes also should always be patched, because even if the
    // component doesn't need to update, it needs to persist the instance on to
    // the next vnode so that it can be properly unmounted later.
    (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    // the EVENTS flag is only for hydration and if it is the only flag, the
    // vnode should not be considered dynamic due to handler caching.
    vnode.patchFlag !== PatchFlags.HYDRATE_EVENTS
  ) {
    currentBlock.push(vnode)
  }

  if (__COMPAT__) {
    convertLegacyVModelProps(vnode)
    defineLegacyVNodeProperties(vnode)
  }

  return vnode
}
/**
 * `createBaseVNode`函数被导出为`createElementVNode`。通过使用`export { createBaseVNode as createElementVNode }`语法，你将`createBaseVNode`函数别名为`createElementVNode`导出到模块中。这样，在消费该模块时，你可以导入并使用`createElementVNode`而不是`createBaseVNode`。

例如，如果你在另一个文件中导入该模块：

```javascript
import { createElementVNode } from 'your-module';

// 现在你可以使用`createElementVNode`代替`createBaseVNode`
const vnode = createElementVNode(/* 参数 );
```

这种别名技术为函数提供了一个更具描述性和意义的名称，使得更容易理解函数的目的和用法。
 */
export { createBaseVNode as createElementVNode }
/**
 * 这段代码将`createVNode`函数导出为`_createVNode`的别名，并根据`__DEV__`的值选择性地使用`createVNodeWithArgsTransform`函数进行参数转换。如果`__DEV__`为真，将使用`createVNodeWithArgsTransform`，否则将使用`_createVNode`。

通过这种导出方式，你可以在消费模块时直接使用`createVNode`函数，并根据需要进行参数转换。这样做可以根据开发环境的需求，在开发模式和生产模式下采用不同的参数处理逻辑，从而实现更好的调试和优化。
 */
export const createVNode = (
  __DEV__ ? createVNodeWithArgsTransform : _createVNode
) as typeof _createVNode
/**
 * 
 * @param type 
 * @param props 
 * @param children 
 * @param patchFlag 
 * @param dynamicProps 
 * @param isBlockNode 
 * @returns 
 * 这是`_createVNode`函数的定义。它用于创建虚拟节点（VNode）。以下是函数的参数和功能：

- `type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT`：虚拟节点的类型，可以是字符串、类组件、动态组件或空动态组件。
- `props: (Data & VNodeProps) | null = null`：虚拟节点的属性，是一个包含数据和VNode属性的对象。默认值为null。
- `children: unknown = null`：虚拟节点的子节点。默认值为null。
- `patchFlag: number = 0`：表示虚拟节点的更新标志，用于优化渲染过程。默认值为0。
- `dynamicProps: string[] | null = null`：表示虚拟节点的动态属性列表，这些属性可能会在更新过程中发生变化。默认值为null。
- `isBlockNode = false`：指示是否为块级节点的布尔值，默认为false。

函数首先检查`type`是否为有效值，如果为无效值或空动态组件，则会发出警告并将`type`设置为`Comment`组件。然后，函数会检查`type`是否为现有的虚拟节点，如果是，则克隆该节点，并根据需要合并引用和规范化子节点。如果启用了块级节点跟踪且当前存在父块级节点，则将克隆后的节点添加到父节点中，并设置`patchFlag`为`PatchFlags.BAIL`以避免不必要的更新。

如果`type`是类组件，则将其转换为组件选项。如果启用了2.x的异步/函数组件兼容性，则将`type`转换为兼容的组件。

接下来，函数对属性进行规范化，包括对类和样式进行规范化。如果属性中的类是响应式对象，则需要克隆它以允许修改。样式对象也需要克隆，以防止响应式状态对象被修改。

然后，函数根据`type`的类型将虚拟节点的形状信息编码为一个位图。如果`type`是字符串，则设置形状标志为`ShapeFlags.ELEMENT`。如果启用了`__FEATURE_SUSPENSE__`且`type`是`Suspense`组件，则设置形状标志为`ShapeFlags.SUSPENSE`。如果`type`是`Teleport`组件，则设置形状标志为`ShapeFlags.TELEPORT`。如果`type`是对象，则设置形状标志为`ShapeFlags.STATEFUL_COMPONENT`。如果`type`是函数，则设置形状标志为`ShapeFlags.FUNCTIONAL_COMPONENT`。如果`type`不属于这些类型，则形状标志为0。

最后，函数调用`createBaseVNode`函数创建基本的虚拟节点，并传递给定的参数。`createBaseVNode`函数会进一步处理子节点的规范
 */
function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    if (__DEV__ && !type) {
      warn(`Invalid vnode type when creating vnode: ${type}.`)
    }
    type = Comment
  }

  if (isVNode(type)) {
    // createVNode receiving an existing vnode. This happens in cases like
    // <component :is="vnode"/>
    // #2078 make sure to merge refs during the clone instead of overwriting it
    const cloned = cloneVNode(type, props, true /* mergeRef: true */)
    if (children) {
      normalizeChildren(cloned, children)
    }
    if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock) {
      if (cloned.shapeFlag & ShapeFlags.COMPONENT) {
        currentBlock[currentBlock.indexOf(type)] = cloned
      } else {
        currentBlock.push(cloned)
      }
    }
    cloned.patchFlag |= PatchFlags.BAIL
    return cloned
  }

  // class component normalization.
  if (isClassComponent(type)) {
    type = type.__vccOpts
  }

  // 2.x async/functional component compat
  if (__COMPAT__) {
    type = convertLegacyComponent(type, currentRenderingInstance)
  }

  // class & style normalization.
  if (props) {
    // for reactive or proxy objects, we need to clone it to enable mutation.
    props = guardReactiveProps(props)!
    let { class: klass, style } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
    if (isObject(style)) {
      // reactive state objects need to be cloned since they are likely to be
      // mutated
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style)
      }
      props.style = normalizeStyle(style)
    }
  }

  // encode the vnode type information into a bitmap
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : __FEATURE_SUSPENSE__ && isSuspense(type)
    ? ShapeFlags.SUSPENSE
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0

  if (__DEV__ && shapeFlag & ShapeFlags.STATEFUL_COMPONENT && isProxy(type)) {
    type = toRaw(type)
    warn(
      `Vue received a Component which was made a reactive object. This can ` +
        `lead to unnecessary performance overhead, and should be avoided by ` +
        `marking the component with \`markRaw\` or using \`shallowRef\` ` +
        `instead of \`ref\`.`,
      `\nComponent that was made reactive: `,
      type
    )
  }

  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  )
}
/**
 * 
 * @param props 
 * @returns 
 * `guardReactiveProps`函数用于保护响应式的属性对象。以下是函数的参数和功能：

- `props: (Data & VNodeProps) | null`：要保护的属性对象，包含数据和VNode属性。如果为null，则直接返回null。

函数首先检查`props`是否为null，如果是，则直接返回null。否则，函数会判断`props`是否为响应式对象或具有`InternalObjectKey`属性。如果是，则通过`extend`函数创建属性对象的副本，并返回副本。这样做是为了避免对原始响应式对象进行修改。

如果`props`既不是响应式对象，也没有`InternalObjectKey`属性，则直接返回`props`，表示不需要保护。

总之，`guardReactiveProps`函数用于确保在操作属性对象时不会意外修改响应式对象。它在需要对属性对象进行修改或克隆时起到了保护作用。
 */
export function guardReactiveProps(props: (Data & VNodeProps) | null) {
  if (!props) return null
  return isProxy(props) || InternalObjectKey in props
    ? extend({}, props)
    : props
}
/**
 * 
 * @param vnode 
 * @param extraProps 
 * @param mergeRef 
 * @returns 
 * `cloneVNode`函数用于克隆VNode节点。以下是函数的参数和功能：

- `vnode: VNode<T, U>`：要克隆的VNode节点。
- `extraProps?: (Data & VNodeProps) | null`：要合并到克隆节点的额外属性。
- `mergeRef = false`：是否合并引用(ref)。

函数首先从原始`vnode`中提取`props`、`ref`、`patchFlag`和`children`等属性。然后，根据`extraProps`是否存在，决定是否合并属性。如果存在`extraProps`，则调用`mergeProps`函数将原始`props`和`extraProps`合并为新的`mergedProps`。否则，直接使用原始`props`。

接下来，函数创建一个新的VNode节点`cloned`，并设置其各个属性值。其中，`type`、`scopeId`、`slotScopeIds`、`target`、`targetAnchor`、`staticCount`、`shapeFlag`、`patchFlag`、`dynamicProps`、`dynamicChildren`、`appContext`、`dirs`和`transition`等属性直接从原始`vnode`中获取。而`props`、`key`和`ref`则根据情况进行处理：

- `props`：设置为合并后的`mergedProps`。
- `key`：根据`mergedProps`计算得到。
- `ref`：根据`extraProps`中是否存在`ref`属性进行处理。如果存在，则根据`mergeRef`参数决定是否需要合并引用。如果需要合并，则将原始`ref`和`extraProps.ref`合并为一个数组。如果不需要合并，则直接使用`extraProps.ref`。如果`extraProps`中没有`ref`属性，则使用原始`vnode`中的`ref`。

最后，函数根据是否为兼容模式进行一些兼容处理，并返回克隆后的VNode节点`cloned`。

总之，`cloneVNode`函数用于克隆VNode节点，并可以在克隆过程中添加额外的属性。这样可以创建具有相同类型和内容但具有不同属性的VNode节点。
 */
export function cloneVNode<T, U>(
  vnode: VNode<T, U>,
  extraProps?: (Data & VNodeProps) | null,
  mergeRef = false
): VNode<T, U> {
  // This is intentionally NOT using spread or extend to avoid the runtime
  // key enumeration cost.
  const { props, ref, patchFlag, children } = vnode
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props
  const cloned: VNode<T, U> = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref:
      extraProps && extraProps.ref
        ? // #2078 in the case of <component :is="vnode" ref="extra"/>
          // if the vnode itself already has a ref, cloneVNode will need to merge
          // the refs so the single vnode can be set on multiple refs
          mergeRef && ref
          ? isArray(ref)
            ? ref.concat(normalizeRef(extraProps)!)
            : [ref, normalizeRef(extraProps)!]
          : normalizeRef(extraProps)
        : ref,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children:
      __DEV__ && patchFlag === PatchFlags.HOISTED && isArray(children)
        ? (children as VNode[]).map(deepCloneVNode)
        : children,
    target: vnode.target,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag:
      extraProps && vnode.type !== Fragment
        ? patchFlag === -1 // hoisted node
          ? PatchFlags.FULL_PROPS
          : patchFlag | PatchFlags.FULL_PROPS
        : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition: vnode.transition,

    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: vnode.component,
    suspense: vnode.suspense,
    ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
    ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
    el: vnode.el,
    anchor: vnode.anchor,
    ctx: vnode.ctx,
    ce: vnode.ce
  }
  if (__COMPAT__) {
    defineLegacyVNodeProperties(cloned as VNode)
  }
  return cloned as any
}

/**
 * Dev only, for HMR of hoisted vnodes reused in v-for
 * https://github.com/vitejs/vite/issues/2022
 * `deepCloneVNode`函数用于深度克隆一个VNode节点，包括其子节点。以下是函数的参数和功能：

- `vnode: VNode`：要深度克隆的VNode节点。

函数首先使用`cloneVNode`函数克隆原始的`vnode`，得到一个克隆节点`cloned`。然后，判断原始`vnode`的`children`属性是否为数组类型，如果是，则遍历该数组，对每个子节点递归调用`deepCloneVNode`函数进行深度克隆，然后将克隆后的子节点数组赋值给克隆节点`cloned`的`children`属性。

最后，返回深度克隆后的节点`cloned`。

总之，`deepCloneVNode`函数用于深度克隆一个VNode节点，包括其子节点。通过递归调用`cloneVNode`函数和`deepCloneVNode`函数，可以实现对整个VNode树的深度克隆操作。
 */
function deepCloneVNode(vnode: VNode): VNode {
  const cloned = cloneVNode(vnode)
  if (isArray(vnode.children)) {
    cloned.children = (vnode.children as VNode[]).map(deepCloneVNode)
  }
  return cloned
}

/**
 * @private
 * `createTextVNode`函数用于创建一个文本类型的VNode节点。以下是函数的参数和功能：

- `text: string`：要创建的文本内容，默认为空格字符。
- `flag: number`：VNode的标志位，默认为0。

函数通过调用`createVNode`函数创建一个文本类型的VNode节点。传入的参数为`Text`类型表示文本节点，`null`表示没有props属性，`text`表示文本内容，`flag`表示VNode的标志位。

最后，返回创建的文本类型的VNode节点。

总之，`createTextVNode`函数用于创建一个文本类型的VNode节点，并可以指定文本内容和标志位。这个函数可以方便地创建只包含文本内容的VNode节点。
 */
export function createTextVNode(text: string = ' ', flag: number = 0): VNode {
  return createVNode(Text, null, text, flag)
}

/**
 * @private
 * `createStaticVNode`函数用于创建一个静态的VNode节点。以下是函数的参数和功能：

- `content: string`：静态节点的内容，表示一段字符串。
- `numberOfNodes: number`：静态节点中包含的子节点数量。

函数首先通过调用`createVNode`函数创建一个静态类型的VNode节点。传入的参数为`Static`类型表示静态节点，`null`表示没有props属性，`content`表示节点的内容。

接下来，将`numberOfNodes`赋值给VNode的`staticCount`属性，表示静态节点中包含的子节点数量。

最后，返回创建的静态VNode节点。

总之，`createStaticVNode`函数用于创建一个静态的VNode节点，并设置节点的内容和子节点数量。静态节点在渲染过程中不会发生变化，可以提高渲染性能。
 */
export function createStaticVNode(
  content: string,
  numberOfNodes: number
): VNode {
  // A static vnode can contain multiple stringified elements, and the number
  // of elements is necessary for hydration.
  const vnode = createVNode(Static, null, content)
  vnode.staticCount = numberOfNodes
  return vnode
}

/**
 * @private
 * `createCommentVNode`函数用于创建一个注释类型的VNode节点。以下是函数的参数和功能：

- `text: string`：注释节点的文本内容。
- `asBlock: boolean`：是否将注释节点创建为一个块级节点。

如果`asBlock`参数为`true`，则调用`openBlock()`函数打开一个块级节点，并通过`createBlock`函数创建一个注释类型的块级节点，传入参数为`Comment`类型表示注释节点，`null`表示没有props属性，`text`表示注释节点的文本内容。

如果`asBlock`参数为`false`，则直接调用`createVNode`函数创建一个注释类型的VNode节点，传入参数为`Comment`类型表示注释节点，`null`表示没有props属性，`text`表示注释节点的文本内容。

最后，返回创建的注释类型的VNode节点或块级节点。

总之，`createCommentVNode`函数用于创建一个注释类型的VNode节点，可以选择创建为块级节点或非块级节点，并设置节点的文本内容。注释节点在渲染过程中不会产生实际的DOM元素，只是用于注释和标记。
 */
export function createCommentVNode(
  text: string = '',
  // when used as the v-else branch, the comment node must be created as a
  // block to ensure correct updates.
  asBlock: boolean = false
): VNode {
  return asBlock
    ? (openBlock(), createBlock(Comment, null, text))
    : createVNode(Comment, null, text)
}
/**
 * 
 * @param child 
 * @returns 
 * `normalizeVNode`函数用于规范化VNode子节点。以下是函数的参数和功能：

- `child: VNodeChild`：要规范化的VNode子节点。

根据子节点的类型，`normalizeVNode`函数执行不同的操作：

- 如果子节点为`null`、`undefined`或布尔值，则返回一个空的注释类型的VNode节点，作为占位符。
- 如果子节点为数组类型，则将其作为片段类型的VNode节点的子节点，并返回该片段节点。注意，为了避免引用污染，使用`child.slice()`创建子节点的副本。
- 如果子节点为对象类型，则认为它已经是一个VNode节点，直接返回子节点的克隆。
- 否则，将子节点转换为字符串类型，并创建一个文本类型的VNode节点，将子节点转换后的字符串作为文本内容，然后返回该文本节点。

总之，`normalizeVNode`函数用于规范化VNode子节点，确保子节点符合VNode的要求，并返回规范化后的VNode节点。
 */
export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    // empty placeholder
    return createVNode(Comment)
  } else if (isArray(child)) {
    // fragment
    return createVNode(
      Fragment,
      null,
      // #3666, avoid reference pollution when reusing vnode
      child.slice()
    )
  } else if (typeof child === 'object') {
    // already vnode, this should be the most common since compiled templates
    // always produce all-vnode children arrays
    return cloneIfMounted(child)
  } else {
    // strings and numbers
    return createVNode(Text, null, String(child))
  }
}

// optimized normalization for template-compiled render fns
/**
 * 
 * @param child 
 * @returns 
 * `cloneIfMounted`函数用于克隆VNode节点，但仅在节点已挂载或被标记为`memo`时才进行克隆。以下是函数的参数和功能：

- `child: VNode`：要克隆的VNode节点。

`cloneIfMounted`函数的逻辑如下：

- 如果VNode节点的`el`属性为`null`且`patchFlag`属性不等于`PatchFlags.HOISTED`，或者`memo`属性存在，则直接返回原始的VNode节点，不进行克隆操作。
- 否则，调用`cloneVNode`函数对VNode节点进行克隆操作，并返回克隆后的VNode节点。

简而言之，`cloneIfMounted`函数用于在VNode节点已挂载或被标记为`memo`时进行克隆操作，否则直接返回原始的VNode节点。这样可以避免对已挂载或`memo`节点进行不必要的克隆操作。
 */
export function cloneIfMounted(child: VNode): VNode {
  return (child.el === null && child.patchFlag !== PatchFlags.HOISTED) ||
    child.memo
    ? child
    : cloneVNode(child)
}
/**
 * 
 * @param vnode 
 * @param children 
 * @returns 
 * `normalizeChildren`函数用于规范化VNode节点的子节点。以下是函数的参数和功能：

- `vnode: VNode`：要规范化子节点的VNode节点。
- `children: unknown`：要规范化的子节点。

`normalizeChildren`函数的逻辑如下：

- 首先，初始化`type`变量为0，用于表示子节点的类型。
- 如果`children`为`null`或`undefined`，将`children`设置为`null`。
- 如果`children`是数组类型（使用`isArray`判断），将`type`设置为`ShapeFlags.ARRAY_CHILDREN`，表示子节点为数组类型。
- 如果`children`是对象类型（使用`typeof`判断），并且父节点的`shapeFlag`属性包含`ShapeFlags.ELEMENT`或`ShapeFlags.TELEPORT`标志，表示父节点为普通元素或传送门，需要将插槽规范化为普通子节点。在这种情况下，从`children`对象中取出名为`default`的插槽函数，并调用该函数以规范化子节点。如果插槽函数存在 `_c` 属性（通过 `withCtx()` 添加），将其 `_d` 属性设置为 `false`，表示这是一个已编译的插槽。规范化后，将 `_d` 属性设置回 `true`。
- 如果`children`是对象类型，且不是普通插槽对象（没有 `_` 属性），也没有内部对象键（`InternalObjectKey`），则将子节点的 `_ctx` 属性设置为当前渲染实例（`currentRenderingInstance`）。这样可以确保在没有规范化的情况下，子节点具有正确的上下文实例。
- 如果`children`的 `_` 属性值为 `SlotFlags.FORWARDED`，并且存在当前渲染实例，则表示子组件从父组件接收转发的插槽。子组件的插槽类型取决于其父组件的插槽类型。如果父组件的插槽类型为 `SlotFlags.STABLE`，则将子组件的 `_` 属性设置为 `SlotFlags.STABLE`。否则，将子组件的 `_` 属性设置为 `SlotFlags.DYNAMIC`，并将父节点的 `patchFlag` 属性添加 `PatchFlags.DYNAMIC_SLOTS` 标志。
- 如果`children`是函数类型（使用`isFunction`判断），则将`children`包装成对象 `{ default: children, _ctx: currentRenderingInstance }`，表示它是一个具名插槽。将`type`设置为`ShapeFlags.SLOTS_CHILDREN`，表示子节点为插槽类型。
- 否则，将`children`转换为字符串，并根据父节点的`shapeFlag`属性判断子节点的类型。如果父节点是传送门类型，则将`type`设置为`ShapeFlags.ARRAY_CHILDREN`，并将子节点转换为单个文本节点的数组。否则，将`type
 */
export function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0
  const { shapeFlag } = vnode
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    if (shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.TELEPORT)) {
      // Normalize slot to plain children for plain element and Teleport
      const slot = (children as any).default
      if (slot) {
        // _c marker is added by withCtx() indicating this is a compiled slot
        slot._c && (slot._d = false)
        normalizeChildren(vnode, slot())
        slot._c && (slot._d = true)
      }
      return
    } else {
      type = ShapeFlags.SLOTS_CHILDREN
      const slotFlag = (children as RawSlots)._
      if (!slotFlag && !(InternalObjectKey in children!)) {
        // if slots are not normalized, attach context instance
        // (compiled / normalized slots already have context)
        ;(children as RawSlots)._ctx = currentRenderingInstance
      } else if (slotFlag === SlotFlags.FORWARDED && currentRenderingInstance) {
        // a child component receives forwarded slots from the parent.
        // its slot type is determined by its parent's slot type.
        if (
          (currentRenderingInstance.slots as RawSlots)._ === SlotFlags.STABLE
        ) {
          ;(children as RawSlots)._ = SlotFlags.STABLE
        } else {
          ;(children as RawSlots)._ = SlotFlags.DYNAMIC
          vnode.patchFlag |= PatchFlags.DYNAMIC_SLOTS
        }
      }
    }
  } else if (isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    children = String(children)
    // force teleport children to array so it can be moved around
    if (shapeFlag & ShapeFlags.TELEPORT) {
      type = ShapeFlags.ARRAY_CHILDREN
      children = [createTextVNode(children as string)]
    } else {
      type = ShapeFlags.TEXT_CHILDREN
    }
  }
  vnode.children = children as VNodeNormalizedChildren
  vnode.shapeFlag |= type
}
/**
 * 
 * @param args 
 * @returns 
 * `mergeProps`函数用于合并多个属性对象（`Data & VNodeProps`），并返回合并后的属性对象（`Data`）。以下是函数的参数和功能：

- `...args: (Data & VNodeProps)[]`：要合并的属性对象列表。

`mergeProps`函数的逻辑如下：

- 首先，初始化一个空对象 `ret`，用于存储合并后的属性。
- 使用 `for` 循环遍历每个属性对象 `toMerge`。
- 在内部的 `for...in` 循环中，遍历 `toMerge` 对象的每个键 `key`。
  - 如果 `key` 是 `'class'`，则判断 `ret` 对象的 `class` 属性与 `toMerge` 对象的 `class` 属性是否相等。如果不相等，则将 `class` 属性合并为规范化的类名数组，并赋值给 `ret` 对象的 `class` 属性。
  - 如果 `key` 是 `'style'`，则将 `ret` 对象的 `style` 属性与 `toMerge` 对象的 `style` 属性合并为规范化的样式对象，并赋值给 `ret` 对象的 `style` 属性。
  - 如果 `key` 是事件名（通过 `isOn` 判断），则判断 `ret` 对象和 `toMerge` 对象中的该事件是否存在且不相等。如果 `toMerge` 对象中的该事件存在，并且 `ret` 对象中的该事件不是数组，或者是数组但不包含 `toMerge` 对象中的该事件，那么将两个事件合并为数组，并赋值给 `ret` 对象的该事件。
  - 如果 `key` 不为空字符串，则将 `toMerge` 对象中的该键值对赋值给 `ret` 对象。
- 循环结束后，返回合并后的 `ret` 对象。

总结起来，`mergeProps`函数用于合并多个属性对象，并确保合并后的属性对象中的 `class` 属性、`style` 属性和事件属性都被正确合并和规范化。
 */
export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {}
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        const existing = ret[key]
        const incoming = toMerge[key]
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing
            ? [].concat(existing as any, incoming as any)
            : incoming
        }
      } else if (key !== '') {
        ret[key] = toMerge[key]
      }
    }
  }
  return ret
}
/**
 * 
 * @param hook 
 * @param instance 
 * @param vnode 
 * @param prevVNode 
 * `invokeVNodeHook` 函数用于调用 vnode 钩子函数，并提供错误处理。下面是它的参数和功能的解释：

- `hook: VNodeHook`：要调用的 vnode 钩子函数。
- `instance: ComponentInternalInstance | null`：与 vnode 相关联的内部组件实例。如果 vnode 没有关联的组件，它可以为 `null`。
- `vnode: VNode`：要应用钩子函数的 vnode。
- `prevVNode: VNode | null = null`：先前的 vnode。这是可选参数，如果没有提供，则默认为 `null`。

`invokeVNodeHook` 函数会使用 `callWithAsyncErrorHandling` 函数来调用钩子函数，并提供适当的错误处理机制。
 */
export function invokeVNodeHook(
  hook: VNodeHook,
  instance: ComponentInternalInstance | null,
  vnode: VNode,
  prevVNode: VNode | null = null
) {
  callWithAsyncErrorHandling(hook, instance, ErrorCodes.VNODE_HOOK, [
    vnode,
    prevVNode
  ])
}
