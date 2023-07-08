import {
  NodeTransform,
  NodeTypes,
  ElementTypes,
  ComponentNode,
  IfBranchNode
} from '@vue/compiler-core'
import { TRANSITION } from '../runtimeHelpers'
import { createDOMCompilerError, DOMErrorCodes } from '../errors'
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * `transformTransition` 是一个用于转换过渡组件的节点转换函数。

函数接受两个参数：
- `node`：要进行转换的节点。
- `context`：转换上下文对象。

函数首先判断节点的类型是否为 `Element`，且标签类型为组件 (`COMPONENT`)。如果是组件类型的节点，则进一步判断该组件是否为内置过渡组件 (`TRANSITION`)，通过调用 `context.isBuiltInComponent` 方法进行检查。

如果组件类型为过渡组件 (`TRANSITION`)，则返回一个函数，该函数将在代码生成阶段执行。在该函数中，将执行以下操作：

1. 检查过渡组件是否具有子节点。如果没有子节点，则直接返回，不做任何处理。

2. 检查过渡组件是否具有多个子节点。如果有多个子节点，则发出警告，提示多个子节点在过渡组件中无效。

3. 检查过渡组件是否只有一个子节点，并且该子节点具有 `v-show` 指令。如果满足条件，则向过渡组件的属性列表中添加一个属性节点，用于表示持久化过渡状态。这个属性节点的名称为 `'persisted'`，没有具体的值。

最终，返回这个函数。

该节点转换函数的作用是对过渡组件进行转换，根据其子节点的情况，向过渡组件添加额外的属性或发出警告，以满足过渡组件的使用要求。
 */
export const transformTransition: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ELEMENT &&
    node.tagType === ElementTypes.COMPONENT
  ) {
    const component = context.isBuiltInComponent(node.tag)
    if (component === TRANSITION) {
      return () => {
        if (!node.children.length) {
          return
        }

        // warn multiple transition children
        if (hasMultipleChildren(node)) {
          context.onError(
            createDOMCompilerError(
              DOMErrorCodes.X_TRANSITION_INVALID_CHILDREN,
              {
                start: node.children[0].loc.start,
                end: node.children[node.children.length - 1].loc.end,
                source: ''
              }
            )
          )
        }

        // check if it's s single child w/ v-show
        // if yes, inject "persisted: true" to the transition props
        const child = node.children[0]
        if (child.type === NodeTypes.ELEMENT) {
          for (const p of child.props) {
            if (p.type === NodeTypes.DIRECTIVE && p.name === 'show') {
              node.props.push({
                type: NodeTypes.ATTRIBUTE,
                name: 'persisted',
                value: undefined,
                loc: node.loc
              })
            }
          }
        }
      }
    }
  }
}
/**
 * 
 * @param node 
 * @returns 
 * `hasMultipleChildren` 是一个用于检查节点是否具有多个子节点的辅助函数。

函数接受一个参数 `node`，表示要检查的节点。

函数的主要逻辑如下：

1. 首先，对节点的子节点进行过滤，将其中的注释节点和只包含空格内容的文本节点移除。这是通过过滤条件 `c.type !== NodeTypes.COMMENT && !(c.type === NodeTypes.TEXT && !c.content.trim())` 实现的。过滤后的子节点数组保存在 `children` 变量中。

2. 获取过滤后的子节点数组的第一个节点，并将其保存在 `child` 变量中。

3. 判断以下条件之一是否成立：
   - 子节点数组的长度不等于 1
   - 第一个子节点的类型是 `FOR` 节点
   - 第一个子节点的类型是 `IF` 节点，并且其中的某个分支节点具有多个子节点（递归调用 `hasMultipleChildren` 函数进行判断）

如果以上条件中的任意一个成立，则说明节点具有多个子节点，函数返回 `true`，否则返回 `false`。

该辅助函数的作用是判断节点是否具有多个子节点。在转换过渡组件时，通过调用这个函数来检查过渡组件是否满足只有一个子节点的要求。如果存在多个子节点，那么在过渡组件中使用这些子节点是无效的，并会发出相应的警告。
 */
function hasMultipleChildren(node: ComponentNode | IfBranchNode): boolean {
  // #1352 filter out potential comment nodes.
  const children = (node.children = node.children.filter(
    c =>
      c.type !== NodeTypes.COMMENT &&
      !(c.type === NodeTypes.TEXT && !c.content.trim())
  ))
  const child = children[0]
  return (
    children.length !== 1 ||
    child.type === NodeTypes.FOR ||
    (child.type === NodeTypes.IF && child.branches.some(hasMultipleChildren))
  )
}
