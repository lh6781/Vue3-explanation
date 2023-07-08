import {
  DirectiveTransform,
  createObjectProperty,
  createSimpleExpression
} from '@vue/compiler-core'
import { createDOMCompilerError, DOMErrorCodes } from '../errors'
/**
 * 
 * @param dir 
 * @param node 
 * @param context 
 * @returns 
 * `transformVHtml` 是一个用于处理 `v-html` 指令的转换函数。

该函数接受三个参数：`dir` 表示指令对象，`node` 表示当前节点，`context` 表示转换上下文。

函数的主要逻辑如下：

1. 首先，从指令对象中获取表达式 `exp` 和位置信息 `loc`。

2. 如果 `exp` 不存在，则表示在 `v-html` 指令中缺少表达式，此时会通过调用 `context.onError` 方法发出错误，错误类型为 `DOMErrorCodes.X_V_HTML_NO_EXPRESSION`。

3. 如果当前节点存在子节点，则表示在使用 `v-html` 指令时还有其他内容，此时会通过调用 `context.onError` 方法发出错误，错误类型为 `DOMErrorCodes.X_V_HTML_WITH_CHILDREN`。并且将子节点数组清空，即 `node.children.length = 0`。

4. 返回一个包含属性的对象，其中属性为 `innerHTML`，对应的值为 `exp` 或一个空的简单表达式（`createSimpleExpression('', true)`）。

该转换函数的作用是处理 `v-html` 指令，并生成对应的属性节点，用于将表达式的结果作为内部 HTML 内容插入到当前节点中。如果指令使用不当，例如缺少表达式或同时存在其他子节点，则会发出相应的错误。
 */
export const transformVHtml: DirectiveTransform = (dir, node, context) => {
  const { exp, loc } = dir
  if (!exp) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_HTML_NO_EXPRESSION, loc)
    )
  }
  if (node.children.length) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_HTML_WITH_CHILDREN, loc)
    )
    node.children.length = 0
  }
  return {
    props: [
      createObjectProperty(
        createSimpleExpression(`innerHTML`, true, loc),
        exp || createSimpleExpression('', true)
      )
    ]
  }
}
