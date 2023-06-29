import {
  VNode,
  VNodeProps,
  createVNode,
  VNodeArrayChildren,
  Fragment,
  Text,
  Comment,
  isVNode
} from './vnode'
import { Teleport, TeleportProps } from './components/Teleport'
import { Suspense, SuspenseProps } from './components/Suspense'
import { isObject, isArray } from '@vue/shared'
import { RawSlots } from './componentSlots'
import {
  FunctionalComponent,
  Component,
  ComponentOptions,
  ConcreteComponent
} from './component'
import { EmitsOptions } from './componentEmits'
import { DefineComponent } from './apiDefineComponent'

// `h` is a more user-friendly version of `createVNode` that allows omitting the
// props when possible. It is intended for manually written render functions.
// Compiler-generated code uses `createVNode` because
// 1. it is monomorphic and avoids the extra call overhead
// 2. it allows specifying patchFlags for optimization

/*
// type only
h('div')

// type + props
h('div', {})

// type + omit props + children
// Omit props does NOT support named slots
h('div', []) // array
h('div', 'foo') // text
h('div', h('br')) // vnode
h(Component, () => {}) // default slot

// type + props + children
h('div', {}, []) // array
h('div', {}, 'foo') // text
h('div', {}, h('br')) // vnode
h(Component, {}, () => {}) // default slot
h(Component, {}, {}) // named slots

// named slots without props requires explicit `null` to avoid ambiguity
h(Component, null, {})
**/
/**
 * `RawProps` 是一个类型别名，表示原始的组件属性对象。它继承了 `VNodeProps` 类型，并添加了一些特定的属性。

属性说明：
- `__v_isVNode`：用于与单个 VNode 对象作为子节点进行区分的属性。通过将其定义为 `never` 类型，确保在属性对象中不存在名为 `__v_isVNode` 的属性。
- `[Symbol.iterator]`：用于与数组子节点进行区分的属性。通过将其定义为 `never` 类型，确保在属性对象中不存在名为 `[Symbol.iterator]` 的属性。
- `Record<string, any>`：该部分表示任意其他属性。`Record<string, any>` 表示一个字符串索引签名，允许 `RawProps` 对象包含任意数量的字符串属性名和对应的任意值。

`RawProps` 类型用于描述组件的原始属性，它允许组件接收任意的属性，并将其作为一个键值对对象进行处理。通过使用 `RawProps` 类型，可以在类型系统中定义组件属性的结构和类型约束。
 */
type RawProps = VNodeProps & {
  // used to differ from a single VNode object as children
  __v_isVNode?: never
  // used to differ from Array children
  [Symbol.iterator]?: never
} & Record<string, any>
/**
 * `RawChildren` 是一个联合类型，用于描述组件的原始子节点。它可以是以下类型之一：

- `string`：表示文本节点的内容。
- `number`：表示数字节点的内容。
- `boolean`：表示布尔节点的值。
- `VNode`：表示一个单独的虚拟节点对象。
- `VNodeArrayChildren`：表示一个由虚拟节点组成的数组，用于表示多个子节点。
- `() => any`：表示一个函数，该函数返回一个值作为子节点。

`RawChildren` 类型用于描述组件的原始子节点，允许组件接收不同类型的子节点，并进行相应的处理和渲染。通过使用 `RawChildren` 类型，可以在类型系统中定义组件子节点的结构和类型约束。
 */
type RawChildren =
  | string
  | number
  | boolean
  | VNode
  | VNodeArrayChildren
  | (() => any)

// fake constructor type returned from `defineComponent`
/**
 * `Constructor` 接口用于描述一个构造函数，该构造函数可以用来创建具有 `$props` 属性的实例。它具有以下特征：

- `P`：表示构造函数的参数类型。默认为 `any`。
- `__isFragment`：用于指示是否为片段组件，如果存在该属性且值为 `never`，则表示不是片段组件。
- `__isTeleport`：用于指示是否为传送门组件，如果存在该属性且值为 `never`，则表示不是传送门组件。
- `__isSuspense`：用于指示是否为悬挂组件，如果存在该属性且值为 `never`，则表示不是悬挂组件。
- `new (...args: any[]): { $props: P }`：表示构造函数的签名，接受任意数量的参数，并返回一个具有 `$props` 属性的实例。

`Constructor` 接口的作用是定义一个构造函数类型，该类型可以用于创建具有 `$props` 属性的实例，通常用于组件的类型声明和实例化。
 */
interface Constructor<P = any> {
  __isFragment?: never
  __isTeleport?: never
  __isSuspense?: never
  new (...args: any[]): { $props: P }
}

// The following is a series of overloads for providing props validation of
// manually written render functions.

// element
export function h(type: string, children?: RawChildren): VNode
export function h(
  type: string,
  props?: RawProps | null,
  children?: RawChildren | RawSlots
): VNode

// text/comment
export function h(
  type: typeof Text | typeof Comment,
  children?: string | number | boolean
): VNode
export function h(
  type: typeof Text | typeof Comment,
  props?: null,
  children?: string | number | boolean
): VNode
// fragment
export function h(type: typeof Fragment, children?: VNodeArrayChildren): VNode
export function h(
  type: typeof Fragment,
  props?: RawProps | null,
  children?: VNodeArrayChildren
): VNode

// teleport (target prop is required)
export function h(
  type: typeof Teleport,
  props: RawProps & TeleportProps,
  children: RawChildren | RawSlots
): VNode

// suspense
export function h(type: typeof Suspense, children?: RawChildren): VNode
export function h(
  type: typeof Suspense,
  props?: (RawProps & SuspenseProps) | null,
  children?: RawChildren | RawSlots
): VNode

// functional component
/**
 * 
 * @param type 
 * @param props 
 * @param children
 * `h` 函数是 Vue 3 中用于创建虚拟节点（`VNode`）的核心函数。它支持多种重载形式，用于创建不同类型的虚拟节点。

下面是 `h` 函数的重载形式和功能说明：

- `h(type: string, children?: RawChildren): VNode`
- `h(type: string, props?: RawProps | null, children?: RawChildren | RawSlots): VNode`
  - 创建普通元素节点的虚拟节点，可以指定子节点和属性。

- `h(type: typeof Text | typeof Comment, children?: string | number | boolean): VNode`
- `h(type: typeof Text | typeof Comment, props?: null, children?: string | number | boolean): VNode`
  - 创建文本或注释节点的虚拟节点。

- `h(type: typeof Fragment, children?: VNodeArrayChildren): VNode`
- `h(type: typeof Fragment, props?: RawProps | null, children?: VNodeArrayChildren): VNode`
  - 创建片段节点的虚拟节点，可以指定子节点和属性。

- `h(type: typeof Teleport, props: RawProps & TeleportProps, children: RawChildren | RawSlots): VNode`
  - 创建传送门节点的虚拟节点，需要指定目标容器和子节点。

- `h(type: typeof Suspense, children?: RawChildren): VNode`
- `h(type: typeof Suspense, props?: (RawProps & SuspenseProps) | null, children?: RawChildren | RawSlots): VNode`
  - 创建悬挂节点的虚拟节点，可以指定子节点和属性。

- `h<P, E extends EmitsOptions = {}, S extends Record<string, any> = {}>(type: FunctionalComponent<P, E, S>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode`
  - 创建函数式组件的虚拟节点，可以指定组件类型、属性和子节点。

- `h(type: Component, children?: RawChildren): VNode`
  - 创建组件节点的虚拟节点，可以指定组件类型和子节点。

- `h<P>(type: ConcreteComponent | string, children?: RawChildren): VNode`
- `h<P>(type: ConcreteComponent<P> | string, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren): VNode`
  - 创建具体组件的虚拟节点，可以指定组件类型、属性和子节点。

- `h<P>(type: Component<P>, props?: (RawProps & P) | null, children?: RawChildren | RawSlots): VNode`
  - 创建不带属性的组件的虚拟节点，可以指定组件类型、属性和子节点。

- `h(type: ComponentOptions<P>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode`
  - 创建组件选项对象的虚拟节点，可以指定组件类型、属性和子节点。

- `h(type: Constructor, children?: RawChildren): VNode`
- `h<P>(type: Constructor<P>, props?: (RawProps & P) | ({} extends P ? null :

 never), children?: RawChildren | RawSlots): VNode`
  - 创建构造函数类型的虚拟节点，可以指定构造函数、属性和子节点。

- `h(type: DefineComponent, children?: RawChildren): VNode`
- `h<P>(type: DefineComponent<P>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode`
  - 创建定义组件类型的虚拟节点，可以指定组件类型、属性和子节点。

- `h(type: any, propsOrChildren?: any, children?: any): VNode`
  - `h` 函数的实际实现，用于处理其他未匹配到的情况，并创建虚拟节点。

`h` 函数根据传入的参数类型和数量，选择合适的重载形式创建对应类型的虚拟节点，并返回该虚拟节点。

注意：`h` 函数是 Vue 3 的内部函数，用于支持模板编译器生成的渲染函数。在应用开发中，通常使用模板或组件的方式创建虚拟节点，而不直接调用 `h` 函数。 
 */
export function h<
  P,
  E extends EmitsOptions = {},
  S extends Record<string, any> = {}
>(
  type: FunctionalComponent<P, E, S>,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren | RawSlots
): VNode

// catch-all for generic component types
export function h(type: Component, children?: RawChildren): VNode

// concrete component
export function h<P>(
  type: ConcreteComponent | string,
  children?: RawChildren
): VNode
export function h<P>(
  type: ConcreteComponent<P> | string,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren
): VNode

// component without props
export function h<P>(
  type: Component<P>,
  props?: (RawProps & P) | null,
  children?: RawChildren | RawSlots
): VNode

// exclude `defineComponent` constructors
export function h<P>(
  type: ComponentOptions<P>,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren | RawSlots
): VNode

// fake constructor type returned by `defineComponent` or class component
export function h(type: Constructor, children?: RawChildren): VNode
export function h<P>(
  type: Constructor<P>,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren | RawSlots
): VNode

// fake constructor type returned by `defineComponent`
export function h(type: DefineComponent, children?: RawChildren): VNode
export function h<P>(
  type: DefineComponent<P>,
  props?: (RawProps & P) | ({} extends P ? null : never),
  children?: RawChildren | RawSlots
): VNode

// Actual implementation
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // single vnode without props
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // props without children
      return createVNode(type, propsOrChildren)
    } else {
      // omit props
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
