import {
  ConstantTypes,
  RootNode,
  NodeTypes,
  TemplateChildNode,
  SimpleExpressionNode,
  ElementTypes,
  PlainElementNode,
  ComponentNode,
  TemplateNode,
  VNodeCall,
  ParentNode,
  JSChildNode,
  CallExpression,
  createArrayExpression,
  getVNodeBlockHelper,
  getVNodeHelper
} from '../ast'
import { TransformContext } from '../transform'
import { PatchFlags, isString, isSymbol, isArray } from '@vue/shared'
import { isSlotOutlet } from '../utils'
import {
  OPEN_BLOCK,
  GUARD_REACTIVE_PROPS,
  NORMALIZE_CLASS,
  NORMALIZE_PROPS,
  NORMALIZE_STYLE
} from '../runtimeHelpers'
/**
 * 
 * @param root 
 * @param context 
 * `hoistStatic` 函数用于提升模板中的静态节点。它接受两个参数：`root` 表示模板的根节点，`context` 表示转换上下文。

该函数利用 `walk` 函数遍历模板的 AST（抽象语法树），并执行静态节点的提升操作。传递给 `walk` 的第三个参数是一个布尔值，指示根节点是否是单个元素且没有父级的 fallthrough 属性。这一点很重要，因为如果根节点具有潜在的父级 fallthrough 属性，它就不能被提升。

静态节点的提升目的是将它们从模板中提取出来，以便在渲染过程中可以更高效地处理它们。
 */
export function hoistStatic(root: RootNode, context: TransformContext) {
  walk(
    root,
    context,
    // Root node is unfortunately non-hoistable due to potential parent
    // fallthrough attributes.
    isSingleElementRoot(root, root.children[0])
  )
}
/**
 * 
 * @param root 
 * @param child 
 * @returns 
 * `isSingleElementRoot` 函数用于判断给定的根节点是否是单个元素根节点。它接受两个参数：`root` 表示模板的根节点，`child` 表示根节点的子节点。

该函数通过检查以下条件来确定根节点是否为单个元素根节点：
- 子节点的类型是普通元素节点、组件节点或模板节点。
- 根节点的子节点数量为 1。
- 子节点不是插槽节点。

如果满足以上条件，函数返回 `true`，表示根节点是单个元素根节点；否则，返回 `false`。这个判断对于静态节点的提升操作非常重要，因为只有单个元素根节点才能被提升，而具有其他类型或多个子节点的根节点无法进行提升。
 */
export function isSingleElementRoot(
  root: RootNode,
  child: TemplateChildNode
): child is PlainElementNode | ComponentNode | TemplateNode {
  const { children } = root
  return (
    children.length === 1 &&
    child.type === NodeTypes.ELEMENT &&
    !isSlotOutlet(child)
  )
}
/**
 * 
 * @param node 
 * @param context 
 * @param doNotHoistNode 
 * `walk` 函数用于遍历节点树，并对每个节点进行处理。它接受三个参数：`node` 表示当前节点，`context` 表示变换上下文，`doNotHoistNode` 表示是否禁止对当前节点进行提升，默认为 `false`。

`walk` 函数的主要功能如下：
- 对于普通元素节点和文本调用节点，判断其是否符合提升条件。
  - 如果节点是普通元素节点且标签类型为普通元素，则判断其是否为常量节点。如果是常量节点且符合提升条件，则将其进行提升。
  - 如果节点包含动态子节点，但其属性符合提升条件，则将其属性进行提升。
- 对于元素节点，递归调用 `walk` 函数处理子节点。
- 对于 `v-for` 节点，如果其子节点只有一个，则禁止对其进行提升，否则继续递归调用 `walk` 函数处理子节点。
- 对于 `v-if` 节点，对每个分支节点进行递归调用 `walk` 函数处理子节点。
- 如果存在已经提升的节点，并且上下文中定义了 `transformHoist` 方法，则调用该方法对提升的节点进行处理。
- 如果所有子节点都被提升，且当前节点是普通元素节点且标签类型为普通元素，并且存在已经生成的代码节点且其类型为 `vnodeCall`，且子节点是数组类型，那么将整个子节点数组进行提升。

`walk` 函数的作用是在节点树中查找符合提升条件的节点，并将其进行提升。它在静态节点的处理过程中起到关键的作用，确保只有符合条件的节点才会被提升，从而优化渲染性能。
 */
function walk(
  node: ParentNode,
  context: TransformContext,
  doNotHoistNode: boolean = false
) {
  const { children } = node
  const originalCount = children.length
  let hoistedCount = 0

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    // only plain elements & text calls are eligible for hoisting.
    if (
      child.type === NodeTypes.ELEMENT &&
      child.tagType === ElementTypes.ELEMENT
    ) {
      const constantType = doNotHoistNode
        ? ConstantTypes.NOT_CONSTANT
        : getConstantType(child, context)
      if (constantType > ConstantTypes.NOT_CONSTANT) {
        if (constantType >= ConstantTypes.CAN_HOIST) {
          ;(child.codegenNode as VNodeCall).patchFlag =
            PatchFlags.HOISTED + (__DEV__ ? ` /* HOISTED */` : ``)
          child.codegenNode = context.hoist(child.codegenNode!)
          hoistedCount++
          continue
        }
      } else {
        // node may contain dynamic children, but its props may be eligible for
        // hoisting.
        const codegenNode = child.codegenNode!
        if (codegenNode.type === NodeTypes.VNODE_CALL) {
          const flag = getPatchFlag(codegenNode)
          if (
            (!flag ||
              flag === PatchFlags.NEED_PATCH ||
              flag === PatchFlags.TEXT) &&
            getGeneratedPropsConstantType(child, context) >=
              ConstantTypes.CAN_HOIST
          ) {
            const props = getNodeProps(child)
            if (props) {
              codegenNode.props = context.hoist(props)
            }
          }
          if (codegenNode.dynamicProps) {
            codegenNode.dynamicProps = context.hoist(codegenNode.dynamicProps)
          }
        }
      }
    }

    // walk further
    if (child.type === NodeTypes.ELEMENT) {
      const isComponent = child.tagType === ElementTypes.COMPONENT
      if (isComponent) {
        context.scopes.vSlot++
      }
      walk(child, context)
      if (isComponent) {
        context.scopes.vSlot--
      }
    } else if (child.type === NodeTypes.FOR) {
      // Do not hoist v-for single child because it has to be a block
      walk(child, context, child.children.length === 1)
    } else if (child.type === NodeTypes.IF) {
      for (let i = 0; i < child.branches.length; i++) {
        // Do not hoist v-if single child because it has to be a block
        walk(
          child.branches[i],
          context,
          child.branches[i].children.length === 1
        )
      }
    }
  }

  if (hoistedCount && context.transformHoist) {
    context.transformHoist(children, context, node)
  }

  // all children were hoisted - the entire children array is hoistable.
  if (
    hoistedCount &&
    hoistedCount === originalCount &&
    node.type === NodeTypes.ELEMENT &&
    node.tagType === ElementTypes.ELEMENT &&
    node.codegenNode &&
    node.codegenNode.type === NodeTypes.VNODE_CALL &&
    isArray(node.codegenNode.children)
  ) {
    node.codegenNode.children = context.hoist(
      createArrayExpression(node.codegenNode.children)
    )
  }
}
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * `getConstantType` 函数用于确定节点的常量类型，以便在静态节点优化中进行处理。它接受两个参数：`node` 表示当前节点，`context` 表示变换上下文。

`getConstantType` 函数的主要逻辑如下：
- 针对不同的节点类型，进行相应的处理：
  - 对于普通元素节点：
    - 如果节点的标签类型不是普通元素，则返回 `ConstantTypes.NOT_CONSTANT`。
    - 首先检查缓存中是否存在该节点的常量类型，如果存在，则直接返回缓存的值。
    - 获取节点的代码生成节点（codegenNode）。
    - 如果代码生成节点的类型不是 `NodeTypes.VNODE_CALL`，则返回 `ConstantTypes.NOT_CONSTANT`。
    - 如果代码生成节点具有块级别标志（isBlock）且标签不是 'svg' 和 'foreignObject'，则返回 `ConstantTypes.NOT_CONSTANT`。
    - 获取代码生成节点的补丁标志（patchFlag）。
    - 如果补丁标志不存在，则进一步检查：
      - 检查节点的属性是否符合提升条件，如果属性的常量类型为 `ConstantTypes.NOT_CONSTANT`，则返回 `ConstantTypes.NOT_CONSTANT`。
      - 如果属性的常量类型比 `returnType` 更低，则更新 `returnType`。
      - 遍历节点的子节点，获取子节点的常量类型，如果子节点的常量类型为 `ConstantTypes.NOT_CONSTANT`，则返回 `ConstantTypes.NOT_CONSTANT`。
      - 如果子节点的常量类型比 `returnType` 更低，则更新 `returnType`。
      - 如果 `returnType` 大于 `ConstantTypes.CAN_SKIP_PATCH`，则遍历节点的属性，检查是否有绑定指令的表达式，如果表达式的常量类型为 `ConstantTypes.NOT_CONSTANT`，则返回 `ConstantTypes.NOT_CONSTANT`。
    - 如果代码生成节点是块级别的，则进一步检查：
      - 遍历节点的属性，如果存在自定义指令，则返回 `ConstantTypes.NOT_CONSTANT`。
      - 移除上下文中的辅助函数 `OPEN_BLOCK` 和块级别虚拟节点的辅助函数。
      - 将代码生成节点的块级别标志设置为 `false`。
      - 获取用于创建普通虚拟节点的辅助函数，并添加到上下文的辅助函数列表中。
    - 将节点的常量类型缓存起来，并返回 `returnType`。
  - 对于文本和注释节点，返回 `ConstantTypes.CAN_STRINGIFY`。
  - 对于 `v-if`、`v-for` 和 `v-if` 分支节点，返回 `ConstantTypes.NOT_CONSTANT`。
  - 对于插值和文本调用节点，递归调用 `getConstantType` 函数处理其内容。
  - 对于简单表达式节点，返回节点的常量类型。
  - 对于复合表达式节点，遍历节点的子节点：
    - 如果子节点是字符串或符号，则继续下

一个循环。
    - 获取子节点的常量类型，如果子节点的常量类型为 `ConstantTypes.NOT_CONSTANT`，则返回 `ConstantTypes.NOT_CONSTANT`。
    - 如果子节点的常量类型比 `returnType` 更低，则更新 `returnType`。
  - 对于其他未列出的节点类型，在开发模式下触发编译器错误，否则返回 `ConstantTypes.NOT_CONSTANT`。

`getConstantType` 函数的作用是确定节点的常量类型，以便进行静态节点优化。根据节点的类型和属性，它判断节点是否是常量节点，从而决定是否对其进行提升处理。
 */
export function getConstantType(
  node: TemplateChildNode | SimpleExpressionNode,
  context: TransformContext
): ConstantTypes {
  const { constantCache } = context
  switch (node.type) {
    case NodeTypes.ELEMENT:
      if (node.tagType !== ElementTypes.ELEMENT) {
        return ConstantTypes.NOT_CONSTANT
      }
      const cached = constantCache.get(node)
      if (cached !== undefined) {
        return cached
      }
      const codegenNode = node.codegenNode!
      if (codegenNode.type !== NodeTypes.VNODE_CALL) {
        return ConstantTypes.NOT_CONSTANT
      }
      if (
        codegenNode.isBlock &&
        node.tag !== 'svg' &&
        node.tag !== 'foreignObject'
      ) {
        return ConstantTypes.NOT_CONSTANT
      }
      const flag = getPatchFlag(codegenNode)
      if (!flag) {
        let returnType = ConstantTypes.CAN_STRINGIFY

        // Element itself has no patch flag. However we still need to check:

        // 1. Even for a node with no patch flag, it is possible for it to contain
        // non-hoistable expressions that refers to scope variables, e.g. compiler
        // injected keys or cached event handlers. Therefore we need to always
        // check the codegenNode's props to be sure.
        const generatedPropsType = getGeneratedPropsConstantType(node, context)
        if (generatedPropsType === ConstantTypes.NOT_CONSTANT) {
          constantCache.set(node, ConstantTypes.NOT_CONSTANT)
          return ConstantTypes.NOT_CONSTANT
        }
        if (generatedPropsType < returnType) {
          returnType = generatedPropsType
        }

        // 2. its children.
        for (let i = 0; i < node.children.length; i++) {
          const childType = getConstantType(node.children[i], context)
          if (childType === ConstantTypes.NOT_CONSTANT) {
            constantCache.set(node, ConstantTypes.NOT_CONSTANT)
            return ConstantTypes.NOT_CONSTANT
          }
          if (childType < returnType) {
            returnType = childType
          }
        }

        // 3. if the type is not already CAN_SKIP_PATCH which is the lowest non-0
        // type, check if any of the props can cause the type to be lowered
        // we can skip can_patch because it's guaranteed by the absence of a
        // patchFlag.
        if (returnType > ConstantTypes.CAN_SKIP_PATCH) {
          for (let i = 0; i < node.props.length; i++) {
            const p = node.props[i]
            if (p.type === NodeTypes.DIRECTIVE && p.name === 'bind' && p.exp) {
              const expType = getConstantType(p.exp, context)
              if (expType === ConstantTypes.NOT_CONSTANT) {
                constantCache.set(node, ConstantTypes.NOT_CONSTANT)
                return ConstantTypes.NOT_CONSTANT
              }
              if (expType < returnType) {
                returnType = expType
              }
            }
          }
        }

        // only svg/foreignObject could be block here, however if they are
        // static then they don't need to be blocks since there will be no
        // nested updates.
        if (codegenNode.isBlock) {
          // except set custom directives.
          for (let i = 0; i < node.props.length; i++) {
            const p = node.props[i]
            if (p.type === NodeTypes.DIRECTIVE) {
              constantCache.set(node, ConstantTypes.NOT_CONSTANT)
              return ConstantTypes.NOT_CONSTANT
            }
          }

          context.removeHelper(OPEN_BLOCK)
          context.removeHelper(
            getVNodeBlockHelper(context.inSSR, codegenNode.isComponent)
          )
          codegenNode.isBlock = false
          context.helper(getVNodeHelper(context.inSSR, codegenNode.isComponent))
        }

        constantCache.set(node, returnType)
        return returnType
      } else {
        constantCache.set(node, ConstantTypes.NOT_CONSTANT)
        return ConstantTypes.NOT_CONSTANT
      }
    case NodeTypes.TEXT:
    case NodeTypes.COMMENT:
      return ConstantTypes.CAN_STRINGIFY
    case NodeTypes.IF:
    case NodeTypes.FOR:
    case NodeTypes.IF_BRANCH:
      return ConstantTypes.NOT_CONSTANT
    case NodeTypes.INTERPOLATION:
    case NodeTypes.TEXT_CALL:
      return getConstantType(node.content, context)
    case NodeTypes.SIMPLE_EXPRESSION:
      return node.constType
    case NodeTypes.COMPOUND_EXPRESSION:
      let returnType = ConstantTypes.CAN_STRINGIFY
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (isString(child) || isSymbol(child)) {
          continue
        }
        const childType = getConstantType(child, context)
        if (childType === ConstantTypes.NOT_CONSTANT) {
          return ConstantTypes.NOT_CONSTANT
        } else if (childType < returnType) {
          returnType = childType
        }
      }
      return returnType
    default:
      if (__DEV__) {
        const exhaustiveCheck: never = node
        exhaustiveCheck
      }
      return ConstantTypes.NOT_CONSTANT
  }
}
/**
 * `allowHoistedHelperSet` 是一个包含一组允许提升的辅助函数的集合。具体而言，它是一个 `Set` 对象，其中包含了以下辅助函数的名称：

- `NORMALIZE_CLASS`
- `NORMALIZE_STYLE`
- `NORMALIZE_PROPS`
- `GUARD_REACTIVE_PROPS`

这些辅助函数允许在静态节点优化过程中进行提升处理。提升处理意味着将这些函数的调用提升到父级作用域，以减少在渲染过程中的重复计算和创建。在遍历节点树时，如果遇到调用这些函数的节点，并且满足其他提升条件，那么就可以将这些函数的调用进行提升优化。
 */
const allowHoistedHelperSet = new Set([
  NORMALIZE_CLASS,
  NORMALIZE_STYLE,
  NORMALIZE_PROPS,
  GUARD_REACTIVE_PROPS
])
/**
 * 
 * @param value 
 * @param context 
 * @returns 
 * `getConstantTypeOfHelperCall` 是一个用于获取辅助函数调用的常量类型的函数。它接受一个 `CallExpression` 类型的参数 `value`，表示辅助函数的调用表达式，以及一个 `TransformContext` 类型的参数 `context`，表示转换上下文。

在函数内部，首先检查 `value` 是否符合以下条件：

- `value` 的类型是 `NodeTypes.JS_CALL_EXPRESSION`，表示它是一个 JavaScript 函数调用表达式。
- `value.callee` 不是一个字符串，即调用的函数不是一个字符串常量。
- `value.callee` 在 `allowHoistedHelperSet` 集合中，表示这个函数是允许进行提升的辅助函数。

如果上述条件满足，则进一步处理函数的参数。

- 获取第一个参数 `arg`，并将其类型设置为 `JSChildNode`。
- 如果 `arg` 的类型是 `NodeTypes.SIMPLE_EXPRESSION`，表示它是一个简单表达式，可以直接调用 `getConstantType` 函数获取它的常量类型。
- 如果 `arg` 的类型是 `NodeTypes.JS_CALL_EXPRESSION`，表示它是一个嵌套的辅助函数调用，例如 `normalizeProps(guardReactiveProps(exp))`。在这种情况下，递归调用 `getConstantTypeOfHelperCall` 函数，传入 `arg` 和 `context` 参数，继续获取嵌套调用的常量类型。

如果以上处理都不满足，则返回 `ConstantTypes.NOT_CONSTANT`，表示这个辅助函数调用不是一个常量。
 */
function getConstantTypeOfHelperCall(
  value: CallExpression,
  context: TransformContext
): ConstantTypes {
  if (
    value.type === NodeTypes.JS_CALL_EXPRESSION &&
    !isString(value.callee) &&
    allowHoistedHelperSet.has(value.callee)
  ) {
    const arg = value.arguments[0] as JSChildNode
    if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
      return getConstantType(arg, context)
    } else if (arg.type === NodeTypes.JS_CALL_EXPRESSION) {
      // in the case of nested helper call, e.g. `normalizeProps(guardReactiveProps(exp))`
      return getConstantTypeOfHelperCall(arg, context)
    }
  }
  return ConstantTypes.NOT_CONSTANT
}
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * `getGeneratedPropsConstantType` 是一个用于获取生成的 props 的常量类型的函数。它接受一个 `PlainElementNode` 类型的参数 `node`，表示元素节点，以及一个 `TransformContext` 类型的参数 `context`，表示转换上下文。

在函数内部，首先初始化 `returnType` 为 `ConstantTypes.CAN_STRINGIFY`，表示初始的常量类型为可字符串化。

接下来，通过调用 `getNodeProps` 函数获取节点的 props。

- 如果 `props` 存在且类型为 `NodeTypes.JS_OBJECT_EXPRESSION`，表示它是一个 JavaScript 对象表达式，其中的 `properties` 表示对象的属性列表。
- 对于每个属性，遍历属性列表，获取属性的 `key` 和 `value`。
- 使用 `getConstantType` 函数获取 `key` 的常量类型，并将其存储在 `keyType` 中。
  - 如果 `keyType` 的值为 `ConstantTypes.NOT_CONSTANT`，表示 `key` 不是一个常量，直接返回该常量类型。
  - 如果 `keyType` 小于 `returnType`，则更新 `returnType` 的值为 `keyType`。
- 接着，根据 `value` 的类型进行处理：
  - 如果 `value` 的类型是 `NodeTypes.SIMPLE_EXPRESSION`，表示它是一个简单表达式，使用 `getConstantType` 函数获取它的常量类型，并将其存储在 `valueType` 中。
  - 如果 `value` 的类型是 `NodeTypes.JS_CALL_EXPRESSION`，表示它是一个辅助函数的调用表达式。在这种情况下，调用 `getConstantTypeOfHelperCall` 函数获取辅助函数调用的常量类型，并将其存储在 `valueType` 中。
  - 否则，将 `valueType` 设置为 `ConstantTypes.NOT_CONSTANT`，表示不是一个常量。
- 根据 `valueType` 进行判断和更新：
  - 如果 `valueType` 的值为 `ConstantTypes.NOT_CONSTANT`，表示 `value` 不是一个常量，直接返回该常量类型。
  - 如果 `valueType` 小于 `returnType`，则更新 `returnType` 的值为 `valueType`。

最后，返回 `returnType`，表示生成的 props 的常量类型。如果在遍历过程中发现有不是常量的情况，将直接返回该常量类型。
 */
function getGeneratedPropsConstantType(
  node: PlainElementNode,
  context: TransformContext
): ConstantTypes {
  let returnType = ConstantTypes.CAN_STRINGIFY
  const props = getNodeProps(node)
  if (props && props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
    const { properties } = props
    for (let i = 0; i < properties.length; i++) {
      const { key, value } = properties[i]
      const keyType = getConstantType(key, context)
      if (keyType === ConstantTypes.NOT_CONSTANT) {
        return keyType
      }
      if (keyType < returnType) {
        returnType = keyType
      }
      let valueType: ConstantTypes
      if (value.type === NodeTypes.SIMPLE_EXPRESSION) {
        valueType = getConstantType(value, context)
      } else if (value.type === NodeTypes.JS_CALL_EXPRESSION) {
        // some helper calls can be hoisted,
        // such as the `normalizeProps` generated by the compiler for pre-normalize class,
        // in this case we need to respect the ConstantType of the helper's arguments
        valueType = getConstantTypeOfHelperCall(value, context)
      } else {
        valueType = ConstantTypes.NOT_CONSTANT
      }
      if (valueType === ConstantTypes.NOT_CONSTANT) {
        return valueType
      }
      if (valueType < returnType) {
        returnType = valueType
      }
    }
  }
  return returnType
}
/**
 * 
 * @param node 
 * @returns 
 * `getNodeProps` 是一个用于获取元素节点的 props 的函数。它接受一个 `PlainElementNode` 类型的参数 `node`，表示元素节点。

在函数内部，首先获取节点的 `codegenNode`，它是元素节点的代码生成节点。

然后，判断 `codegenNode` 的类型：
- 如果 `codegenNode` 的类型是 `NodeTypes.VNODE_CALL`，表示它是一个虚拟节点的调用表达式，其中的 `props` 表示节点的属性。
  - 返回 `codegenNode.props`，即节点的属性。
- 如果 `codegenNode` 的类型不是 `NodeTypes.VNODE_CALL`，则不返回任何值。
 */
function getNodeProps(node: PlainElementNode) {
  const codegenNode = node.codegenNode!
  if (codegenNode.type === NodeTypes.VNODE_CALL) {
    return codegenNode.props
  }
}
/**
 * 
 * @param node 
 * @returns 
 * `getPatchFlag` 是一个用于获取虚拟节点的补丁标记的函数。它接受一个 `VNodeCall` 类型的参数 `node`，表示虚拟节点的调用表达式。

在函数内部，首先获取节点的 `patchFlag` 属性，它表示节点的补丁标记。补丁标记是一个字符串，表示了节点的一些特性或需要进行的操作。

然后，判断 `patchFlag` 是否存在：
- 如果 `patchFlag` 存在，表示节点有补丁标记，将其解析为十进制整数并返回。
- 如果 `patchFlag` 不存在，即节点没有补丁标记，返回 `undefined`。
 */
function getPatchFlag(node: VNodeCall): number | undefined {
  const flag = node.patchFlag
  return flag ? parseInt(flag, 10) : undefined
}
