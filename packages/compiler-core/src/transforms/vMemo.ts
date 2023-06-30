import { NodeTransform } from '../transform'
import { findDir } from '../utils'
import {
  convertToBlock,
  createCallExpression,
  createFunctionExpression,
  ElementTypes,
  MemoExpression,
  NodeTypes,
  PlainElementNode
} from '../ast'
import { WITH_MEMO } from '../runtimeHelpers'
/**
 * 这是一个用于存储弱引用对象的 `WeakSet` 实例化的变量 `seen`。

`WeakSet` 是 JavaScript 中的一种数据结构，它允许存储对象的弱引用。与 `Set` 不同，`WeakSet` 中存储的对象在其他地方没有引用时会被垃圾回收器自动回收，不会阻止对象被释放。

在这个特定的代码中，`seen` 被用作一个标记集合，用于跟踪已经处理过的对象，以避免重复处理。由于 `seen` 是一个 `WeakSet` 实例，它存储的对象是弱引用，当这些对象在其他地方没有被引用时，它们可以被垃圾回收器回收，不会造成内存泄漏。

在实际应用中，`seen` 可能会被用于遍历或递归处理对象树或图等数据结构时，以避免重复处理相同的对象，提高处理效率并防止无限循环。
 */
const seen = new WeakSet()
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这段代码定义了一个名为 `transformMemo` 的 `NodeTransform`，用于处理 `memo` 指令的转换操作。

该转换操作会遍历 AST（抽象语法树），检查每个元素节点是否包含 `memo` 指令。如果没有 `memo` 指令或已经处理过该节点（通过 `seen` 集合判断），则跳过处理。

如果节点包含 `memo` 指令且未被处理过，将该节点添加到 `seen` 集合中，表示已处理。

返回的函数是一个回调函数，在转换完成后执行。该回调函数首先获取节点的代码生成节点 `codegenNode`，如果不存在，则从当前节点的 `codegenNode` 中获取。然后，它会检查 `codegenNode` 是否为 `VNODE_CALL` 类型，如果是非组件子树，则将其转换为块形式（通过调用 `convertToBlock` 函数实现）。

最后，它将更新节点的 `codegenNode`，使用 `createCallExpression` 创建一个调用表达式，其中包含 `WITH_MEMO` 辅助函数、`memo` 指令的表达式 `dir.exp`、一个表示缓存的函数表达式 `createFunctionExpression` 和一个表示缓存的唯一标识符 `_cache`。`context.cached++` 用于生成唯一的缓存标识符。

这段代码的作用是将具有 `memo` 指令的元素节点转换为带有缓存功能的表达式节点，以提高渲染性能。
 */
export const transformMemo: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    const dir = findDir(node, 'memo')
    if (!dir || seen.has(node)) {
      return
    }
    seen.add(node)
    return () => {
      const codegenNode =
        node.codegenNode ||
        (context.currentNode as PlainElementNode).codegenNode
      if (codegenNode && codegenNode.type === NodeTypes.VNODE_CALL) {
        // non-component sub tree should be turned into a block
        if (node.tagType !== ElementTypes.COMPONENT) {
          convertToBlock(codegenNode, context)
        }
        node.codegenNode = createCallExpression(context.helper(WITH_MEMO), [
          dir.exp!,
          createFunctionExpression(undefined, codegenNode),
          `_cache`,
          String(context.cached++)
        ]) as MemoExpression
      }
    }
  }
}
