import { NodeTransform } from '../transform'
import {
  NodeTypes,
  CompoundExpressionNode,
  createCallExpression,
  CallExpression,
  ElementTypes,
  ConstantTypes,
  createCompoundExpression
} from '../ast'
import { isText } from '../utils'
import { CREATE_TEXT } from '../runtimeHelpers'
import { PatchFlags, PatchFlagNames } from '@vue/shared'
import { getConstantType } from './hoistStatic'

// Merge adjacent text nodes and expressions into a single expression
// e.g. <div>abc {{ d }} {{ e }}</div> should have a single expression node as child.
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * `transformText` 是一个节点转换函数，用于在特定类型的节点上执行文本转换操作。

该函数接受两个参数：
- `node: TemplateChildNode`：要进行转换的节点。
- `context: TransformContext`：转换上下文对象，包含有关转换环境的信息。

函数内部通过判断节点的类型，包括 `ROOT`、`ELEMENT`、`FOR` 和 `IF_BRANCH`，来确定是否需要进行文本转换操作。如果节点类型符合条件，将在节点退出时执行具体的转换操作。

转换操作包括以下步骤：
1. 遍历节点的子节点列表。
2. 判断子节点是否为文本节点，如果是，则将 `hasText` 标志设置为 `true`。
3. 对于连续的文本节点，将它们合并为一个复合表达式节点，并移除原始的文本节点。
4. 如果节点列表中没有文本节点，则不进行后续操作。
5. 如果节点列表长度为 1，并且满足以下条件之一，则不进行后续操作：
   - 节点类型为 `ROOT`。
   - 节点类型为 `ELEMENT`，标签类型为 `ELEMENT`，且不存在自定义指令。
   - 节点类型为 `ELEMENT`，标签为 `template`，且在兼容模式下。
6. 针对文本节点和复合表达式节点，将它们转换为 `createTextVNode` 的调用表达式，以避免运行时的规范化处理。
7. 如果节点是动态文本（非常量文本），则在调用表达式中添加动态文本的标记，以便在块级别进行修补。
8. 更新节点列表中的子节点为转换后的节点。

总结来说，`transformText` 函数用于在特定类型的节点上执行文本转换操作。它会将连续的文本节点合并为一个复合表达式节点，并将文本节点和复合表达式节点转换为 `createTextVNode` 的调用表达式，以优化运行时性能。
 */
export const transformText: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH
  ) {
    // perform the transform on node exit so that all expressions have already
    // been processed.
    return () => {
      const children = node.children
      let currentContainer: CompoundExpressionNode | undefined = undefined
      let hasText = false

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = createCompoundExpression(
                  [child],
                  child.loc
                )
              }
              // merge adjacent text node into current
              currentContainer.children.push(` + `, next)
              children.splice(j, 1)
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }

      if (
        !hasText ||
        // if this is a plain element with a single text child, leave it
        // as-is since the runtime has dedicated fast path for this by directly
        // setting textContent of the element.
        // for component root it's always normalized anyway.
        (children.length === 1 &&
          (node.type === NodeTypes.ROOT ||
            (node.type === NodeTypes.ELEMENT &&
              node.tagType === ElementTypes.ELEMENT &&
              // #3756
              // custom directives can potentially add DOM elements arbitrarily,
              // we need to avoid setting textContent of the element at runtime
              // to avoid accidentally overwriting the DOM elements added
              // by the user through custom directives.
              !node.props.find(
                p =>
                  p.type === NodeTypes.DIRECTIVE &&
                  !context.directiveTransforms[p.name]
              ) &&
              // in compat mode, <template> tags with no special directives
              // will be rendered as a fragment so its children must be
              // converted into vnodes.
              !(__COMPAT__ && node.tag === 'template'))))
      ) {
        return
      }

      // pre-convert text nodes into createTextVNode(text) calls to avoid
      // runtime normalization.
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs: CallExpression['arguments'] = []
          // createTextVNode defaults to single whitespace, so if it is a
          // single space the code could be an empty call to save bytes.
          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push(child)
          }
          // mark dynamic text with flag so it gets patched inside a block
          if (
            !context.ssr &&
            getConstantType(child, context) === ConstantTypes.NOT_CONSTANT
          ) {
            callArgs.push(
              PatchFlags.TEXT +
                (__DEV__ ? ` /* ${PatchFlagNames[PatchFlags.TEXT]} */` : ``)
            )
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,
            loc: child.loc,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }
  }
}
