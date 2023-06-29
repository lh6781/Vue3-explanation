import {
  extend,
  hyphenate,
  isArray,
  isObject,
  isString,
  makeMap,
  normalizeClass,
  normalizeStyle,
  ShapeFlags,
  toHandlerKey
} from '@vue/shared'
import {
  Component,
  ComponentInternalInstance,
  ComponentOptions,
  Data,
  InternalRenderFunction
} from '../component'
import { currentRenderingInstance } from '../componentRenderContext'
import { DirectiveArguments, withDirectives } from '../directives'
import {
  resolveDirective,
  resolveDynamicComponent
} from '../helpers/resolveAssets'
import {
  Comment,
  createVNode,
  isVNode,
  normalizeChildren,
  VNode,
  VNodeArrayChildren,
  VNodeProps
} from '../vnode'
import {
  checkCompatEnabled,
  DeprecationTypes,
  isCompatEnabled
} from './compatConfig'
import { compatModelEventPrefix } from './componentVModel'
/**
 * 
 * @param instance 
 * @returns 
 * `convertLegacyRenderFn` 函数用于将旧版的渲染函数转换为兼容的形式。

该函数接受一个组件实例 `instance`，并做如下处理：

首先，获取组件实例的类型，将其断言为 `ComponentOptions` 类型，并获取其 `render` 属性作为渲染函数，赋值给 `render` 变量。

然后，对于以下情况，直接返回，不进行后续的转换：
- `render` 不存在，即未定义渲染函数。
- `render` 已经被标记为 Runtime Compiled 模式（`render._rc`）。
- `render` 已经被标记为兼容性检查过（`render._compatChecked`）。
- `render` 已经被标记为兼容性包装过（`render._compatWrapped`）。

接下来，对于满足以下条件的渲染函数 `render` 进行转换：
- `render` 函数的参数个数大于等于 2。这表示该渲染函数是基于 Vue 3 的预编译函数。
- 对于满足兼容性检查开启的情况，进行下一步的兼容性处理。

在兼容性处理中，将原始的 `Component.render` 替换为一个兼容性函数 `compatRender`，该函数在调用时会传入一个兼容性的 `compatH` 函数。

最后，将新的兼容性函数标记为已包装（`wrapped._compatWrapped`）。

通过这个转换函数，可以将旧版的渲染函数转换为兼容 Vue 3 的形式，以便在 Vue 3 的运行时环境中使用。
 */
export function convertLegacyRenderFn(instance: ComponentInternalInstance) {
  const Component = instance.type as ComponentOptions
  const render = Component.render as InternalRenderFunction | undefined

  // v3 runtime compiled, or already checked / wrapped
  if (!render || render._rc || render._compatChecked || render._compatWrapped) {
    return
  }

  if (render.length >= 2) {
    // v3 pre-compiled function, since v2 render functions never need more than
    // 2 arguments, and v2 functional render functions would have already been
    // normalized into v3 functional components
    render._compatChecked = true
    return
  }

  // v2 render function, try to provide compat
  if (checkCompatEnabled(DeprecationTypes.RENDER_FUNCTION, instance)) {
    const wrapped = (Component.render = function compatRender() {
      // @ts-ignore
      return render.call(this, compatH)
    })
    // @ts-ignore
    wrapped._compatWrapped = true
  }
}
/**
 * 接口 `LegacyVNodeProps` 表示在 Vue 中传递给传统 VNode 的属性。以下是每个属性的解释：

- `key`（可选）：VNode 的唯一标识符。
- `ref`（可选）：VNode 的引用标识符。
- `refInFor`（可选）：一个布尔值，表示该 VNode 是否在 `v-for` 循环中使用的引用。

以下属性通常用于普通元素 VNode：

- `staticClass`：静态 CSS 类名。
- `class`：动态绑定的 CSS 类名。
- `staticStyle`：静态内联样式。
- `style`：动态绑定的内联样式。
- `attrs`：普通 HTML 属性。
- `domProps`：DOM 相关的属性，如 `innerHTML`、`textContent` 等。
- `on`：事件监听器。
- `nativeOn`：原生事件监听器。
- `directives`：指令列表。

以下属性通常用于组件 VNode：

- `props`：传递给组件的属性。
- `slot`：指定插槽名称。
- `scopedSlots`：作用域插槽。
- `model`：用于双向绑定的属性对象，包含 `value`、`callback` 和 `expression`。

注意：以上是对每个属性的概述解释，具体属性的用法和含义可能会根据实际情况有所不同。
 */
interface LegacyVNodeProps {
  key?: string | number
  ref?: string
  refInFor?: boolean

  staticClass?: string
  class?: unknown
  staticStyle?: Record<string, unknown>
  style?: Record<string, unknown>
  attrs?: Record<string, unknown>
  domProps?: Record<string, unknown>
  on?: Record<string, Function | Function[]>
  nativeOn?: Record<string, Function | Function[]>
  directives?: LegacyVNodeDirective[]

  // component only
  props?: Record<string, unknown>
  slot?: string
  scopedSlots?: Record<string, Function>
  model?: {
    value: any
    callback: (v: any) => void
    expression: string
  }
}
/**
 * 接口 `LegacyVNodeDirective` 表示传统 VNode 中的指令。以下是每个属性的解释：

- `name`：指令的名称。
- `value`：指令的值。
- `arg`（可选）：指令的参数。
- `modifiers`（可选）：修饰符对象，包含额外的指令修饰符。

指令是在 Vue 模板中使用的特殊属性，用于在 DOM 元素上应用特定的行为或操作。指令可以是内置指令（如 `v-if`、`v-for` 等），也可以是自定义指令。

注意：以上是对每个属性的概述解释，具体属性的用法和含义可能会根据实际情况有所不同。
 */
interface LegacyVNodeDirective {
  name: string
  value: unknown
  arg?: string
  modifiers?: Record<string, boolean>
}
/**
 * 类型 `LegacyVNodeChildren` 表示传统 VNode 中的子节点。它可以是以下类型之一：

- `string`：表示文本节点的内容。
- `number`：表示文本节点的内容中的数字。
- `boolean`：表示布尔值节点的值。
- `VNode`：表示一个嵌套的 VNode（虚拟节点）。
- `VNodeArrayChildren`：表示一组嵌套的 VNode 组成的数组。

这个类型用于描述 VNode 的子节点，可以是简单的文本或值，也可以是嵌套的 VNode 组成的树形结构。这样的结构可以用来表示 Vue 组件树中的节点关系和层级。
 */
type LegacyVNodeChildren =
  | string
  | number
  | boolean
  | VNode
  | VNodeArrayChildren
/**
 * 
 * @param type 
 * @param children
 * 函数 `compatH` 是用于创建虚拟节点（VNode）的辅助函数，用于在 Vue 3 的兼容模式中创建 VNode。

函数的重载形式如下：

1. `compatH(type: string | Component, children?: LegacyVNodeChildren): VNode`
2. `compatH(type: string | Component, props?: Data & LegacyVNodeProps, children?: LegacyVNodeChildren): VNode`
3. `compatH(type: any, propsOrChildren?: any, children?: any): VNode`

参数说明：
- `type`：表示组件的类型，可以是字符串或组件对象。
- `props`：表示组件的属性，可以是一个数据对象。
- `children`：表示组件的子节点，可以是一个单独的 VNode 或 VNode 数组。

函数的逻辑如下：
1. 如果 `type` 为空，则将其设置为 `Comment` 组件。
2. 如果 `type` 是字符串类型，则进行特殊处理，如转换为连字符形式、解析动态组件等。
3. 根据参数个数和类型进行适配：
   - 如果参数个数为 2，或者第二个参数是数组类型，则判断第二个参数是否为对象，如果是 VNode，则创建只有一个子节点的 VNode；如果是属性对象，则创建没有子节点的 VNode，并将属性对象转换为新的格式。
   - 如果参数个数大于等于 3，或者第二个参数不是数组类型，则判断第三个参数是否为 VNode，如果是，则将其转换为数组形式；然后创建具有属性和子节点的 VNode，并对属性对象进行转换。
4. 最后，通过转换函数将 VNode 中的插槽和指令进行兼容性处理，并返回最终的 VNode。

该函数的作用是创建兼容 Vue 2 的风格的 VNode，在 Vue 3 兼容模式中使用。 
 */
export function compatH(
  type: string | Component,
  children?: LegacyVNodeChildren
): VNode
export function compatH(
  type: string | Component,
  props?: Data & LegacyVNodeProps,
  children?: LegacyVNodeChildren
): VNode

export function compatH(
  type: any,
  propsOrChildren?: any,
  children?: any
): VNode {
  if (!type) {
    type = Comment
  }

  // to support v2 string component name look!up
  if (typeof type === 'string') {
    const t = hyphenate(type)
    if (t === 'transition' || t === 'transition-group' || t === 'keep-alive') {
      // since transition and transition-group are runtime-dom-specific,
      // we cannot import them directly here. Instead they are registered using
      // special keys in @vue/compat entry.
      type = `__compat__${t}`
    }
    type = resolveDynamicComponent(type)
  }

  const l = arguments.length
  const is2ndArgArrayChildren = isArray(propsOrChildren)
  if (l === 2 || is2ndArgArrayChildren) {
    if (isObject(propsOrChildren) && !is2ndArgArrayChildren) {
      // single vnode without props
      if (isVNode(propsOrChildren)) {
        return convertLegacySlots(createVNode(type, null, [propsOrChildren]))
      }
      // props without children
      return convertLegacySlots(
        convertLegacyDirectives(
          createVNode(type, convertLegacyProps(propsOrChildren, type)),
          propsOrChildren
        )
      )
    } else {
      // omit props
      return convertLegacySlots(createVNode(type, null, propsOrChildren))
    }
  } else {
    if (isVNode(children)) {
      children = [children]
    }
    return convertLegacySlots(
      convertLegacyDirectives(
        createVNode(type, convertLegacyProps(propsOrChildren, type), children),
        propsOrChildren
      )
    )
  }
}
/**
 * `skipLegacyRootLevelProps` 是一个用于创建映射表的函数 `makeMap` 的调用结果。该映射表用于过滤掉在 Vue 2 中被视为根级别属性的属性名。

映射表中包含了以下属性名：`staticStyle`、`staticClass`、`directives`、`model` 和 `hook`。这些属性在 Vue 3 的兼容模式下被视为根级别的属性，不会传递给组件的实例对象。
 */
const skipLegacyRootLevelProps = /*#__PURE__*/ makeMap(
  'staticStyle,staticClass,directives,model,hook'
)
/**
 * 
 * @param legacyProps 
 * @param type 
 * @returns 
 * `convertLegacyProps` 函数用于将 Vue 2 中的旧属性对象 `LegacyVNodeProps` 转换为 Vue 3 中的新属性对象 `Data & VNodeProps`。

函数首先检查传入的 `legacyProps` 是否为空，如果为空，则返回 `null`。

接下来，函数创建一个空对象 `converted` 用于存储转换后的属性。

然后，函数遍历 `legacyProps` 中的每个属性。对于属性名为 `'attrs'`、`'domProps'` 或 `'props'` 的属性，将其内容扩展到 `converted` 对象中。

对于属性名为 `'on'` 或 `'nativeOn'` 的属性，这些属性包含事件监听器。函数遍历每个事件及其对应的处理函数，并将其转换为 Vue 3 的事件名格式。如果属性名为 `'nativeOn'`，则事件名后面会添加 `'Native'` 后缀。然后，将转换后的事件名和处理函数添加到 `converted` 对象中。如果同一个事件在 `converted` 对象中已经存在对应的处理函数，那么将新的处理函数与已有的处理函数合并为一个数组。

对于其他非根级别的属性名（不在 `skipLegacyRootLevelProps` 映射表中），将其直接赋值给 `converted` 对象。

最后，函数检查 `legacyProps` 中的 `'staticClass'` 和 `'staticStyle'` 属性，如果存在则进行处理。`'staticClass'` 属性将与 `converted.class` 进行规范化合并，而 `'staticStyle'` 属性将与 `converted.style` 进行规范化合并。

如果 `legacyProps` 中存在 `'model'` 属性，并且 `type` 是一个对象（组件），则表示该属性是 Vue 2 中的组件的 `v-model`。函数将根据 `type` 对象中的 `model` 配置提取出 `prop` 和 `event` 的名称，并将其转换为 Vue 3 的属性名格式。然后，将 `legacyProps.model.value` 赋值给 `converted[prop]`，将 `legacyProps.model.callback` 赋值给 `converted[compatModelEventPrefix + event]`，其中 `compatModelEventPrefix` 是一个前缀常量。

最后，函数返回转换后的属性对象 `converted`。
 */
function convertLegacyProps(
  legacyProps: LegacyVNodeProps | undefined,
  type: any
): (Data & VNodeProps) | null {
  if (!legacyProps) {
    return null
  }

  const converted: Data & VNodeProps = {}

  for (const key in legacyProps) {
    if (key === 'attrs' || key === 'domProps' || key === 'props') {
      extend(converted, legacyProps[key])
    } else if (key === 'on' || key === 'nativeOn') {
      const listeners = legacyProps[key]
      for (const event in listeners) {
        let handlerKey = convertLegacyEventKey(event)
        if (key === 'nativeOn') handlerKey += `Native`
        const existing = converted[handlerKey]
        const incoming = listeners[event]
        if (existing !== incoming) {
          if (existing) {
            converted[handlerKey] = [].concat(existing as any, incoming as any)
          } else {
            converted[handlerKey] = incoming
          }
        }
      }
    } else if (!skipLegacyRootLevelProps(key)) {
      converted[key] = legacyProps[key as keyof LegacyVNodeProps]
    }
  }

  if (legacyProps.staticClass) {
    converted.class = normalizeClass([legacyProps.staticClass, converted.class])
  }
  if (legacyProps.staticStyle) {
    converted.style = normalizeStyle([legacyProps.staticStyle, converted.style])
  }

  if (legacyProps.model && isObject(type)) {
    // v2 compiled component v-model
    const { prop = 'value', event = 'input' } = (type as any).model || {}
    converted[prop] = legacyProps.model.value
    converted[compatModelEventPrefix + event] = legacyProps.model.callback
  }

  return converted
}
/**
 * 
 * @param event 
 * @returns 
 * `convertLegacyEventKey` 函数用于将 Vue 2 中的事件修饰符字符串转换为 Vue 3 中的事件修饰符字符串。

函数首先对事件修饰符进行规范化。如果事件修饰符字符串的第一个字符是 `'&'`，则将其去除，并在末尾添加 `'Passive'` 后缀。如果事件修饰符字符串的第一个字符是 `'~'`，则将其去除，并在末尾添加 `'Once'` 后缀。如果事件修饰符字符串的第一个字符是 `'!'`，则将其去除，并在末尾添加 `'Capture'` 后缀。

最后，函数调用 `toHandlerKey` 函数将规范化后的事件修饰符字符串转换为 Vue 3 的事件处理函数的键名格式，并返回转换后的字符串。
 */
function convertLegacyEventKey(event: string): string {
  // normalize v2 event prefixes
  if (event[0] === '&') {
    event = event.slice(1) + 'Passive'
  }
  if (event[0] === '~') {
    event = event.slice(1) + 'Once'
  }
  if (event[0] === '!') {
    event = event.slice(1) + 'Capture'
  }
  return toHandlerKey(event)
}
/**
 * 
 * @param vnode 
 * @param props 
 * @returns 
 * `convertLegacyDirectives` 函数用于将 Vue 2 中的指令转换为 Vue 3 中的指令。

函数接收一个 `vnode` 参数作为输入的虚拟节点，并可选地接收一个 `props` 参数，其中包含了 Vue 2 中的指令信息。

如果 `props` 存在且包含 `directives` 属性，则将指令转换为 Vue 3 的格式。函数通过遍历 `props.directives` 数组，将每个指令项转换为 Vue 3 的指令格式。转换的过程包括解析指令名称、值、参数和修饰符，并将其组装为指令参数数组 `[directive, value, arg, modifiers]`。

最后，函数调用 Vue 3 的 `withDirectives` 函数，将转换后的指令参数数组和输入的虚拟节点 `vnode` 一起传入，创建一个新的带指令的虚拟节点，并返回该节点。

如果 `props` 不存在或不包含 `directives` 属性，则直接返回输入的虚拟节点 `vnode`。
 */
function convertLegacyDirectives(
  vnode: VNode,
  props?: LegacyVNodeProps
): VNode {
  if (props && props.directives) {
    return withDirectives(
      vnode,
      props.directives.map(({ name, value, arg, modifiers }) => {
        return [
          resolveDirective(name)!,
          value,
          arg,
          modifiers
        ] as DirectiveArguments[number]
      })
    )
  }
  return vnode
}
/**
 * 
 * @param vnode 
 * @returns 
 * `convertLegacySlots` 函数用于将 Vue 2 中的插槽转换为 Vue 3 中的插槽。

函数接收一个 `vnode` 参数作为输入的虚拟节点，并根据虚拟节点的类型和属性进行插槽的转换。

首先，函数检查虚拟节点的 `shapeFlag`，如果是组件类型且具有子节点，说明存在插槽。函数遍历子节点数组，将每个子节点根据其 `slot` 属性的值归类到对应的插槽中。如果子节点是一个 `<template>` 标签的虚拟节点，将其子节点作为插槽的内容，否则直接将子节点添加到插槽中。

转换完成后，函数将每个插槽的内容包装成一个函数，并将 `_ns` 属性设置为 `true`，表示非作用域插槽。

接下来，函数检查虚拟节点的 `props` 属性中是否存在 `scopedSlots`，如果存在，则将其删除，并将 `scopedSlots` 合并到插槽中。

最后，如果存在插槽，函数调用 `normalizeChildren` 函数对虚拟节点的 `children` 进行规范化处理，将插槽作为新的子节点。

最终，函数返回转换后的虚拟节点。
 */
function convertLegacySlots(vnode: VNode): VNode {
  const { props, children } = vnode

  let slots: Record<string, any> | undefined

  if (vnode.shapeFlag & ShapeFlags.COMPONENT && isArray(children)) {
    slots = {}
    // check "slot" property on vnodes and turn them into v3 function slots
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const slotName =
        (isVNode(child) && child.props && child.props.slot) || 'default'
      const slot = slots[slotName] || (slots[slotName] = [] as any[])
      if (isVNode(child) && child.type === 'template') {
        slot.push(child.children)
      } else {
        slot.push(child)
      }
    }
    if (slots) {
      for (const key in slots) {
        const slotChildren = slots[key]
        slots[key] = () => slotChildren
        slots[key]._ns = true /* non-scoped slot */
      }
    }
  }

  const scopedSlots = props && props.scopedSlots
  if (scopedSlots) {
    delete props!.scopedSlots
    if (slots) {
      extend(slots, scopedSlots)
    } else {
      slots = scopedSlots
    }
  }

  if (slots) {
    normalizeChildren(vnode, slots)
  }

  return vnode
}
/**
 * 
 * @param vnode 
 * `defineLegacyVNodeProperties` 函数用于定义 Vue 2 兼容模式下的虚拟节点属性。

函数接收一个 `vnode` 参数作为输入的虚拟节点，并根据当前的兼容模式配置和渲染实例的上下文来定义虚拟节点的属性。

首先，函数通过 `isCompatEnabled` 函数检查是否启用了 `RENDER_FUNCTION` 和 `PRIVATE_APIS` 这两种兼容模式。如果启用了这两种模式，则继续执行属性定义逻辑。

在属性定义逻辑中，函数使用当前渲染的实例作为上下文，并定义了以下属性：

- `tag`：获取虚拟节点的类型。
- `data`：获取或设置虚拟节点的属性对象。
- `elm`：获取虚拟节点对应的真实 DOM 元素。
- `componentInstance`：获取虚拟节点关联的组件实例。
- `child`：获取虚拟节点关联的子组件实例。
- `text`：获取虚拟节点的文本内容。
- `context`：获取当前渲染实例的代理对象。
- `componentOptions`：获取虚拟节点关联组件的选项对象。

其中，`componentOptions` 属性根据虚拟节点的类型和属性来返回相应的组件选项对象。如果虚拟节点的 `shapeFlag` 表示它是一个有状态组件，且还没有缓存 `componentOptions`，则创建一个新的组件选项对象，包括组件的构造函数、属性数据和子节点。

最终，函数为虚拟节点定义了这些属性，并完成了兼容模式下的属性设置。

需要注意的是，函数中的属性定义逻辑会根据当前的兼容模式配置和渲染实例的上下文进行条件判断，只有在启用兼容模式的情况下才会执行属性定义操作。
 */
export function defineLegacyVNodeProperties(vnode: VNode) {
  /* istanbul ignore if */
  if (
    isCompatEnabled(
      DeprecationTypes.RENDER_FUNCTION,
      currentRenderingInstance,
      true /* enable for built-ins */
    ) &&
    isCompatEnabled(
      DeprecationTypes.PRIVATE_APIS,
      currentRenderingInstance,
      true /* enable for built-ins */
    )
  ) {
    const context = currentRenderingInstance
    const getInstance = () => vnode.component && vnode.component.proxy
    let componentOptions: any
    Object.defineProperties(vnode, {
      tag: { get: () => vnode.type },
      data: { get: () => vnode.props || {}, set: p => (vnode.props = p) },
      elm: { get: () => vnode.el },
      componentInstance: { get: getInstance },
      child: { get: getInstance },
      text: { get: () => (isString(vnode.children) ? vnode.children : null) },
      context: { get: () => context && context.proxy },
      componentOptions: {
        get: () => {
          if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            if (componentOptions) {
              return componentOptions
            }
            return (componentOptions = {
              Ctor: vnode.type,
              propsData: vnode.props,
              children: vnode.children
            })
          }
        }
      }
    })
  }
}
