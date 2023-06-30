import {
  ElementNode,
  ObjectExpression,
  createObjectExpression,
  NodeTypes,
  createObjectProperty,
  createSimpleExpression,
  createFunctionExpression,
  DirectiveNode,
  ElementTypes,
  ExpressionNode,
  Property,
  TemplateChildNode,
  SourceLocation,
  createConditionalExpression,
  ConditionalExpression,
  SimpleExpressionNode,
  FunctionExpression,
  CallExpression,
  createCallExpression,
  createArrayExpression,
  SlotsExpression
} from '../ast'
import { TransformContext, NodeTransform } from '../transform'
import { createCompilerError, ErrorCodes } from '../errors'
import {
  findDir,
  isTemplateNode,
  assert,
  isVSlot,
  hasScopeRef,
  isStaticExp
} from '../utils'
import { CREATE_SLOTS, RENDER_LIST, WITH_CTX } from '../runtimeHelpers'
import { parseForExpression, createForLoopParams } from './vFor'
import { SlotFlags, slotFlagsText } from '@vue/shared'
/**
 * 这段代码定义了一个名为 `defaultFallback` 的变量，它是一个简单表达式节点，表示默认的回退值。该表达式的内容是字符串 "undefined"，且不是常量。

这个默认回退值通常在某些上下文中使用，用于指定当特定条件不满足时的默认值。在这里，`defaultFallback` 表示在没有指定回退值时的默认情况下的回退值，即使用 `undefined`。
 */
const defaultFallback = createSimpleExpression(`undefined`, false)

// A NodeTransform that:
// 1. Tracks scope identifiers for scoped slots so that they don't get prefixed
//    by transformExpression. This is only applied in non-browser builds with
//    { prefixIdentifiers: true }.
// 2. Track v-slot depths so that we know a slot is inside another slot.
//    Note the exit callback is executed before buildSlots() on the same node,
//    so only nested slots see positive numbers.
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这段代码定义了一个名为 `trackSlotScopes` 的节点转换函数，用于追踪插槽作用域。

在这个函数中，首先判断节点类型是否为元素节点，并且标签类型为组件或模板。接下来，通过 `findDir` 函数查找是否存在 `v-slot` 指令。如果找到了 `v-slot` 指令，则表示该插槽引入了作用域变量。

在处理 `v-slot` 指令时，会增加 `vSlot` 作用域计数器，表示当前处于插槽作用域内。同时，如果在非浏览器环境下且启用了前缀标识符选项（`prefixIdentifiers`），则会将 `slotProps` 添加到标识符列表中。

最后，返回一个清理函数，在清理阶段会减少 `vSlot` 作用域计数器，并在非浏览器环境下且启用了前缀标识符选项时，将 `slotProps` 从标识符列表中移除。

该转换函数的作用是在编译过程中追踪插槽作用域，以便正确处理插槽中的作用域变量。
 */
export const trackSlotScopes: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ELEMENT &&
    (node.tagType === ElementTypes.COMPONENT ||
      node.tagType === ElementTypes.TEMPLATE)
  ) {
    // We are only checking non-empty v-slot here
    // since we only care about slots that introduce scope variables.
    const vSlot = findDir(node, 'slot')
    if (vSlot) {
      const slotProps = vSlot.exp
      if (!__BROWSER__ && context.prefixIdentifiers) {
        slotProps && context.addIdentifiers(slotProps)
      }
      context.scopes.vSlot++
      return () => {
        if (!__BROWSER__ && context.prefixIdentifiers) {
          slotProps && context.removeIdentifiers(slotProps)
        }
        context.scopes.vSlot--
      }
    }
  }
}

// A NodeTransform that tracks scope identifiers for scoped slots with v-for.
// This transform is only applied in non-browser builds with { prefixIdentifiers: true }
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这段代码定义了一个名为 `trackVForSlotScopes` 的节点转换函数，用于追踪包含 `v-for` 指令的插槽作用域。

在这个函数中，首先判断节点是否为模板节点（`isTemplateNode`），并且节点的属性列表中存在 `v-slot` 指令。同时，通过 `findDir` 函数查找是否存在 `v-for` 指令，并将其结果赋值给 `vFor`。

如果找到了符合条件的节点并且成功解析了 `v-for` 表达式，则会获取 `v-for` 表达式的解析结果，其中包括 `value`、`key` 和 `index` 等变量名。接下来，根据是否启用了前缀标识符选项（`prefixIdentifiers`），将这些变量名添加到标识符列表中。

最后，返回一个清理函数，在清理阶段会将之前添加的变量名从标识符列表中移除。

该转换函数的作用是在编译过程中追踪包含 `v-for` 指令的插槽作用域，并将相应的变量名添加到标识符列表中，以便正确处理插槽中的作用域变量。
 */
export const trackVForSlotScopes: NodeTransform = (node, context) => {
  let vFor
  if (
    isTemplateNode(node) &&
    node.props.some(isVSlot) &&
    (vFor = findDir(node, 'for'))
  ) {
    const result = (vFor.parseResult = parseForExpression(
      vFor.exp as SimpleExpressionNode,
      context
    ))
    if (result) {
      const { value, key, index } = result
      const { addIdentifiers, removeIdentifiers } = context
      value && addIdentifiers(value)
      key && addIdentifiers(key)
      index && addIdentifiers(index)

      return () => {
        value && removeIdentifiers(value)
        key && removeIdentifiers(key)
        index && removeIdentifiers(index)
      }
    }
  }
}
/**
 * `SlotFnBuilder` 是一个类型别名，它定义了一个函数签名。具体来说，`SlotFnBuilder` 是一个接受三个参数的函数类型，这些参数分别是：

1. `slotProps: ExpressionNode | undefined`：表示插槽的属性表达式节点，可以是一个表达式节点或者 `undefined`。
2. `slotChildren: TemplateChildNode[]`：表示插槽的子节点列表，是一个包含多个模板子节点的数组。
3. `loc: SourceLocation`：表示源代码位置的信息，包括行号、列号等。

该函数类型的返回值为一个函数表达式（`FunctionExpression`）。

总结起来，`SlotFnBuilder` 是一个用于构建插槽函数的函数类型，它接受插槽的属性表达式、子节点列表和源代码位置信息作为参数，并返回一个函数表达式。
 */
export type SlotFnBuilder = (
  slotProps: ExpressionNode | undefined,
  slotChildren: TemplateChildNode[],
  loc: SourceLocation
) => FunctionExpression
/**
 * 
 * @param props 
 * @param children 
 * @param loc 
 * @returns 
 * `buildClientSlotFn` 是一个符合 `SlotFnBuilder` 类型的函数实现。它接受三个参数 `props`、`children` 和 `loc`，然后使用这些参数来创建一个函数表达式。

具体来说，它调用了 `createFunctionExpression` 函数来创建函数表达式，并传递了以下参数：

- `props`：插槽的属性表达式节点。
- `children`：插槽的子节点列表。
- `false`：表示不在函数表达式的开头添加换行符。
- `true`：表示这是一个插槽函数。
- `children.length ? children[0].loc : loc`：表示函数表达式的源代码位置，如果子节点列表不为空，则使用第一个子节点的位置，否则使用传入的 `loc`。

最终，`buildClientSlotFn` 返回创建的函数表达式作为结果。
 */
const buildClientSlotFn: SlotFnBuilder = (props, children, loc) =>
  createFunctionExpression(
    props,
    children,
    false /* newline */,
    true /* isSlot */,
    children.length ? children[0].loc : loc
  )

// Instead of being a DirectiveTransform, v-slot processing is called during
// transformElement to build the slots object for a component.
/**
 * 
 * @param node 
 * @param context 
 * @param buildSlotFn 
 * @returns 
 * `buildSlots` 是一个函数，用于构建组件的插槽。

函数接受三个参数：
- `node: ElementNode`：组件的 AST 节点。
- `context: TransformContext`：转换上下文对象。
- `buildSlotFn: SlotFnBuilder = buildClientSlotFn`：构建插槽函数的函数。

函数内部首先调用 `context.helper(WITH_CTX)`，这是一个帮助函数，用于生成在生成的代码中引用 `withCtx` 函数。

接下来，函数会遍历组件的子节点，检查是否存在插槽，并构建插槽的属性列表和动态插槽列表。

在遍历子节点的过程中，函数会根据不同情况执行以下操作：
- 如果存在组件上的插槽（`v-slot`），将其添加到插槽属性列表中。
- 如果存在模板插槽（`<template v-slot>`），则根据具体情况构建动态插槽，并将其添加到动态插槽列表中。

最后，函数根据插槽的情况构建最终的插槽表达式对象，并返回包含插槽表达式和是否存在动态插槽的对象。

需要注意的是，函数内部还有一些条件判断和错误处理的逻辑，用于处理插槽的特殊情况和错误情况。
 */
export function buildSlots(
  node: ElementNode,
  context: TransformContext,
  buildSlotFn: SlotFnBuilder = buildClientSlotFn
): {
  slots: SlotsExpression
  hasDynamicSlots: boolean
} {
  context.helper(WITH_CTX)

  const { children, loc } = node
  const slotsProperties: Property[] = []
  const dynamicSlots: (ConditionalExpression | CallExpression)[] = []

  // If the slot is inside a v-for or another v-slot, force it to be dynamic
  // since it likely uses a scope variable.
  let hasDynamicSlots = context.scopes.vSlot > 0 || context.scopes.vFor > 0
  // with `prefixIdentifiers: true`, this can be further optimized to make
  // it dynamic only when the slot actually uses the scope variables.
  if (!__BROWSER__ && !context.ssr && context.prefixIdentifiers) {
    hasDynamicSlots = hasScopeRef(node, context.identifiers)
  }

  // 1. Check for slot with slotProps on component itself.
  //    <Comp v-slot="{ prop }"/>
  const onComponentSlot = findDir(node, 'slot', true)
  if (onComponentSlot) {
    const { arg, exp } = onComponentSlot
    if (arg && !isStaticExp(arg)) {
      hasDynamicSlots = true
    }
    slotsProperties.push(
      createObjectProperty(
        arg || createSimpleExpression('default', true),
        buildSlotFn(exp, children, loc)
      )
    )
  }

  // 2. Iterate through children and check for template slots
  //    <template v-slot:foo="{ prop }">
  let hasTemplateSlots = false
  let hasNamedDefaultSlot = false
  const implicitDefaultChildren: TemplateChildNode[] = []
  const seenSlotNames = new Set<string>()
  let conditionalBranchIndex = 0

  for (let i = 0; i < children.length; i++) {
    const slotElement = children[i]
    let slotDir

    if (
      !isTemplateNode(slotElement) ||
      !(slotDir = findDir(slotElement, 'slot', true))
    ) {
      // not a <template v-slot>, skip.
      if (slotElement.type !== NodeTypes.COMMENT) {
        implicitDefaultChildren.push(slotElement)
      }
      continue
    }

    if (onComponentSlot) {
      // already has on-component slot - this is incorrect usage.
      context.onError(
        createCompilerError(ErrorCodes.X_V_SLOT_MIXED_SLOT_USAGE, slotDir.loc)
      )
      break
    }

    hasTemplateSlots = true
    const { children: slotChildren, loc: slotLoc } = slotElement
    const {
      arg: slotName = createSimpleExpression(`default`, true),
      exp: slotProps,
      loc: dirLoc
    } = slotDir

    // check if name is dynamic.
    let staticSlotName: string | undefined
    if (isStaticExp(slotName)) {
      staticSlotName = slotName ? slotName.content : `default`
    } else {
      hasDynamicSlots = true
    }

    const slotFunction = buildSlotFn(slotProps, slotChildren, slotLoc)
    // check if this slot is conditional (v-if/v-for)
    let vIf: DirectiveNode | undefined
    let vElse: DirectiveNode | undefined
    let vFor: DirectiveNode | undefined
    if ((vIf = findDir(slotElement, 'if'))) {
      hasDynamicSlots = true
      dynamicSlots.push(
        createConditionalExpression(
          vIf.exp!,
          buildDynamicSlot(slotName, slotFunction, conditionalBranchIndex++),
          defaultFallback
        )
      )
    } else if (
      (vElse = findDir(slotElement, /^else(-if)?$/, true /* allowEmpty */))
    ) {
      // find adjacent v-if
      let j = i
      let prev
      while (j--) {
        prev = children[j]
        if (prev.type !== NodeTypes.COMMENT) {
          break
        }
      }
      if (prev && isTemplateNode(prev) && findDir(prev, 'if')) {
        // remove node
        children.splice(i, 1)
        i--
        __TEST__ && assert(dynamicSlots.length > 0)
        // attach this slot to previous conditional
        let conditional = dynamicSlots[
          dynamicSlots.length - 1
        ] as ConditionalExpression
        while (
          conditional.alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
        ) {
          conditional = conditional.alternate
        }
        conditional.alternate = vElse.exp
          ? createConditionalExpression(
              vElse.exp,
              buildDynamicSlot(
                slotName,
                slotFunction,
                conditionalBranchIndex++
              ),
              defaultFallback
            )
          : buildDynamicSlot(slotName, slotFunction, conditionalBranchIndex++)
      } else {
        context.onError(
          createCompilerError(ErrorCodes.X_V_ELSE_NO_ADJACENT_IF, vElse.loc)
        )
      }
    } else if ((vFor = findDir(slotElement, 'for'))) {
      hasDynamicSlots = true
      const parseResult =
        vFor.parseResult ||
        parseForExpression(vFor.exp as SimpleExpressionNode, context)
      if (parseResult) {
        // Render the dynamic slots as an array and add it to the createSlot()
        // args. The runtime knows how to handle it appropriately.
        dynamicSlots.push(
          createCallExpression(context.helper(RENDER_LIST), [
            parseResult.source,
            createFunctionExpression(
              createForLoopParams(parseResult),
              buildDynamicSlot(slotName, slotFunction),
              true /* force newline */
            )
          ])
        )
      } else {
        context.onError(
          createCompilerError(ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION, vFor.loc)
        )
      }
    } else {
      // check duplicate static names
      if (staticSlotName) {
        if (seenSlotNames.has(staticSlotName)) {
          context.onError(
            createCompilerError(
              ErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES,
              dirLoc
            )
          )
          continue
        }
        seenSlotNames.add(staticSlotName)
        if (staticSlotName === 'default') {
          hasNamedDefaultSlot = true
        }
      }
      slotsProperties.push(createObjectProperty(slotName, slotFunction))
    }
  }

  if (!onComponentSlot) {
    const buildDefaultSlotProperty = (
      props: ExpressionNode | undefined,
      children: TemplateChildNode[]
    ) => {
      const fn = buildSlotFn(props, children, loc)
      if (__COMPAT__ && context.compatConfig) {
        fn.isNonScopedSlot = true
      }
      return createObjectProperty(`default`, fn)
    }

    if (!hasTemplateSlots) {
      // implicit default slot (on component)
      slotsProperties.push(buildDefaultSlotProperty(undefined, children))
    } else if (
      implicitDefaultChildren.length &&
      // #3766
      // with whitespace: 'preserve', whitespaces between slots will end up in
      // implicitDefaultChildren. Ignore if all implicit children are whitespaces.
      implicitDefaultChildren.some(node => isNonWhitespaceContent(node))
    ) {
      // implicit default slot (mixed with named slots)
      if (hasNamedDefaultSlot) {
        context.onError(
          createCompilerError(
            ErrorCodes.X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN,
            implicitDefaultChildren[0].loc
          )
        )
      } else {
        slotsProperties.push(
          buildDefaultSlotProperty(undefined, implicitDefaultChildren)
        )
      }
    }
  }

  const slotFlag = hasDynamicSlots
    ? SlotFlags.DYNAMIC
    : hasForwardedSlots(node.children)
    ? SlotFlags.FORWARDED
    : SlotFlags.STABLE

  let slots = createObjectExpression(
    slotsProperties.concat(
      createObjectProperty(
        `_`,
        // 2 = compiled but dynamic = can skip normalization, but must run diff
        // 1 = compiled and static = can skip normalization AND diff as optimized
        createSimpleExpression(
          slotFlag + (__DEV__ ? ` /* ${slotFlagsText[slotFlag]} */` : ``),
          false
        )
      )
    ),
    loc
  ) as SlotsExpression
  if (dynamicSlots.length) {
    slots = createCallExpression(context.helper(CREATE_SLOTS), [
      slots,
      createArrayExpression(dynamicSlots)
    ]) as SlotsExpression
  }

  return {
    slots,
    hasDynamicSlots
  }
}
/**
 * 
 * @param name 
 * @param fn 
 * @param index 
 * @returns 
 * `buildDynamicSlot` 是一个函数，用于构建动态插槽的对象表达式。

函数接受三个参数：
- `name: ExpressionNode`：插槽的名称。
- `fn: FunctionExpression`：插槽函数的表达式。
- `index?: number`：插槽的索引（可选参数）。

函数内部首先构建一个包含 `name` 和 `fn` 属性的属性列表，通过调用 `createObjectProperty` 函数创建每个属性。属性名为字符串，属性值为相应的表达式。

如果提供了 `index` 参数，则还会添加一个 `key` 属性，用于标识插槽的索引。`index` 会被转换为字符串，并作为属性值的表达式。

最后，函数通过调用 `createObjectExpression` 函数将属性列表转换为对象表达式，并返回该对象表达式作为动态插槽的表示。
 */
function buildDynamicSlot(
  name: ExpressionNode,
  fn: FunctionExpression,
  index?: number
): ObjectExpression {
  const props = [
    createObjectProperty(`name`, name),
    createObjectProperty(`fn`, fn)
  ]
  if (index != null) {
    props.push(
      createObjectProperty(`key`, createSimpleExpression(String(index), true))
    )
  }
  return createObjectExpression(props)
}
/**
 * 
 * @param children 
 * @returns 
 * `hasForwardedSlots` 是一个函数，用于检查模板节点中是否存在转发的插槽。

函数接受一个参数 `children: TemplateChildNode[]`，表示要检查的模板节点的子节点数组。

函数通过遍历子节点数组，逐个检查每个子节点的类型，并根据节点类型进行相应的处理。具体的处理逻辑如下：

- 如果子节点是元素节点（`NodeTypes.ELEMENT`），则判断节点的 `tagType` 是否为 `ElementTypes.SLOT`，或者递归调用 `hasForwardedSlots` 检查节点的子节点数组（`child.children`）是否存在转发的插槽。如果满足其中任一条件，则返回 `true`。
- 如果子节点是条件节点（`NodeTypes.IF`），则递归调用 `hasForwardedSlots` 检查条件节点的分支数组（`child.branches`）是否存在转发的插槽。如果存在，则返回 `true`。
- 如果子节点是条件分支节点（`NodeTypes.IF_BRANCH`）或循环节点（`NodeTypes.FOR`），则递归调用 `hasForwardedSlots` 检查节点的子节点数组是否存在转发的插槽。如果存在，则返回 `true`。
- 对于其他节点类型，不进行任何处理。

如果遍历完所有子节点后仍未返回 `true`，则表示不存在转发的插槽，函数返回 `false`。

该函数的作用是在构建插槽时，判断是否需要将插槽标记为转发插槽。
 */
function hasForwardedSlots(children: TemplateChildNode[]): boolean {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    switch (child.type) {
      case NodeTypes.ELEMENT:
        if (
          child.tagType === ElementTypes.SLOT ||
          hasForwardedSlots(child.children)
        ) {
          return true
        }
        break
      case NodeTypes.IF:
        if (hasForwardedSlots(child.branches)) return true
        break
      case NodeTypes.IF_BRANCH:
      case NodeTypes.FOR:
        if (hasForwardedSlots(child.children)) return true
        break
      default:
        break
    }
  }
  return false
}
/**
 * 
 * @param node 
 * @returns 
 * `isNonWhitespaceContent` 是一个函数，用于判断模板节点是否为非空白内容。

函数接受一个参数 `node: TemplateChildNode`，表示要判断的模板节点。

函数首先检查节点的类型，如果节点不是文本节点（`NodeTypes.TEXT`）且不是文本调用节点（`NodeTypes.TEXT_CALL`），则直接返回 `true`，表示节点是非空白内容。

如果节点是文本节点或文本调用节点，函数会进一步判断节点的内容是否包含非空白字符。具体的判断逻辑如下：

- 如果节点是文本节点（`NodeTypes.TEXT`），则使用 `trim` 方法去除内容的首尾空白字符，并判断去除空白后的内容是否为空字符串。如果不为空字符串，则返回 `true`，表示节点是非空白内容。
- 如果节点是文本调用节点（`NodeTypes.TEXT_CALL`），则递归调用 `isNonWhitespaceContent` 函数判断节点的内容是否为非空白内容。

如果节点既不是文本节点也不是文本调用节点，则不进行任何处理，最终返回 `false`，表示节点是空白内容。

该函数的作用是在构建插槽时，判断是否存在非空白内容的隐式默认插槽。
 */
function isNonWhitespaceContent(node: TemplateChildNode): boolean {
  if (node.type !== NodeTypes.TEXT && node.type !== NodeTypes.TEXT_CALL)
    return true
  return node.type === NodeTypes.TEXT
    ? !!node.content.trim()
    : isNonWhitespaceContent(node.content)
}
