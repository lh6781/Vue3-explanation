import { NodeTransform, NodeTypes, ElementTypes } from '@vue/compiler-core'
import { DOMErrorCodes, createDOMCompilerError } from '../errors'
/**
 * 
 * @param node 
 * @param context 
 * `ignoreSideEffectTags` 是一个节点转换函数（`NodeTransform`），用于忽略具有副作用的标签（side effect tags）。

该函数接收一个节点和转换上下文作为参数，并对节点进行处理。主要逻辑如下：

1. 首先，判断节点的类型是否为元素节点（`NodeTypes.ELEMENT`）且标签类型为普通元素（`ElementTypes.ELEMENT`）。

2. 接着，判断节点的标签名是否为 `'script'` 或 `'style'`。如果是这两种标签之一，说明它们可能具有副作用。

3. 在开发环境下，使用 `context.onError` 方法生成一个 DOM 编译错误（`DOMErrorCodes.X_IGNORED_SIDE_EFFECT_TAG`），并传入节点的位置信息。

4. 最后，使用 `context.removeNode()` 方法将该节点从 AST 中移除，实现忽略该节点及其子节点的效果。

该转换函数的作用是忽略具有副作用的标签，例如 `<script>` 和 `<style>` 标签。在编译器的过程中，这些标签通常会被处理为特殊的节点，而不是生成对应的 DOM 元素。通过该转换函数，可以在编译阶段就忽略这些标签，以减少后续处理的复杂性。在开发环境下，还会生成相应的编译错误，以提醒开发者不要在模板中直接使用具有副作用的标签。
 */
export const ignoreSideEffectTags: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ELEMENT &&
    node.tagType === ElementTypes.ELEMENT &&
    (node.tag === 'script' || node.tag === 'style')
  ) {
    __DEV__ &&
      context.onError(
        createDOMCompilerError(
          DOMErrorCodes.X_IGNORED_SIDE_EFFECT_TAG,
          node.loc
        )
      )
    context.removeNode()
  }
}
