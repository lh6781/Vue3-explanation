import { NodeTransform } from '../transform'
import { findDir } from '../utils'
import { ElementNode, ForNode, IfNode, NodeTypes } from '../ast'
import { SET_BLOCK_TRACKING } from '../runtimeHelpers'
/**
 * 这是一个用于存储已经处理过的节点的 WeakSet 对象的声明。WeakSet 是 JavaScript 内置对象，它允许你存储弱引用的对象。在这里，`seen` WeakSet 用于存储已经处理过的节点，以防止重复处理。

使用 WeakSet 的好处是，当节点不再被引用时，它们会被自动从 WeakSet 中删除，无需手动清理内存。

在这段代码中，`seen` WeakSet 被用于在处理转换过程中跟踪已经处理过的节点，以避免对同一个节点进行多次处理。这可以在一些场景下提高性能和避免循环处理的问题。
 */
const seen = new WeakSet()
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这是一个用于处理 "v-once" 指令的转换函数。"v-once" 指令用于标记一个元素或组件只渲染一次，后续的更新将被忽略。

在这段代码中，首先判断节点类型是否为 ELEMENT，并使用 `findDir` 函数查找是否存在 "once" 指令。如果存在 "once" 指令，则继续执行转换逻辑。

接下来，通过判断节点是否已经处理过、是否在 v-once 区域中或是否在服务器端渲染 (SSR) 环境中，来决定是否继续处理。如果节点已经处理过或者处于 v-once 区域或 SSR 环境，则直接返回。

如果节点需要进行处理，将其添加到 `seen` WeakSet 中，表示已经处理过。然后将 `context.inVOnce` 设置为 `true`，表示当前处于 v-once 区域。

接下来，通过调用 `context.helper(SET_BLOCK_TRACKING)`，使用上下文中的 `SET_BLOCK_TRACKING` 辅助函数，来设置块级跟踪，以便将来对节点进行更新时可以进行优化。

最后，返回一个函数作为清理函数。在清理函数中，将 `context.inVOnce` 设置为 `false`，表示离开 v-once 区域。然后，获取当前节点 `context.currentNode`，如果存在 `codegenNode`，将其缓存起来，以便在后续的更新中重用。

这段代码的作用是处理 "v-once" 指令，并在适当的时机设置块级跟踪和缓存节点，以实现只渲染一次的效果。
 */
export const transformOnce: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT && findDir(node, 'once', true)) {
    if (seen.has(node) || context.inVOnce || context.inSSR) {
      return
    }
    seen.add(node)
    context.inVOnce = true
    context.helper(SET_BLOCK_TRACKING)
    return () => {
      context.inVOnce = false
      const cur = context.currentNode as ElementNode | IfNode | ForNode
      if (cur.codegenNode) {
        cur.codegenNode = context.cache(cur.codegenNode, true /* isVNode */)
      }
    }
  }
}
