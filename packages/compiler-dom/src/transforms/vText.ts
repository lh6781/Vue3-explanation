import {
  DirectiveTransform,
  createObjectProperty,
  createSimpleExpression,
  TO_DISPLAY_STRING,
  createCallExpression,
  getConstantType
} from '@vue/compiler-core'
import { createDOMCompilerError, DOMErrorCodes } from '../errors'
/**
 * 
 * @param dir 
 * @param node 
 * @param context 
 * @returns 
 * `transformVText` 是一个指令转换函数，用于转换 `v-text` 指令。

函数的参数包括 `dir`（指令对象）、`node`（节点对象）和 `context`（转换上下文）。

函数首先从指令对象中提取表达式 `exp` 和位置信息 `loc`。如果表达式为空，则通过 `context.onError` 抛出一个编译错误，指示缺少 `v-text` 表达式。

然后，函数检查节点是否具有子节点。如果有子节点，则通过 `context.onError` 抛出一个编译错误，指示 `v-text` 指令不能与子节点同时存在，并清空子节点数组。

接下来，函数返回一个包含单个属性的对象。属性的键是一个表示 `textContent` 的简单表达式，值根据 `exp` 的情况生成。如果 `exp` 是常量表达式，则直接使用它作为属性值。否则，使用 `createCallExpression` 创建一个调用表达式，调用 `TO_DISPLAY_STRING` 运行时助手，将 `exp` 作为参数传递给它，以在运行时将其转换为字符串。

这个函数的作用是根据 `v-text` 指令的表达式，生成对应的转换结果。转换结果包含一个属性，用于在节点上设置 `textContent`。
 */
export const transformVText: DirectiveTransform = (dir, node, context) => {
  const { exp, loc } = dir
  if (!exp) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_TEXT_NO_EXPRESSION, loc)
    )
  }
  if (node.children.length) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_TEXT_WITH_CHILDREN, loc)
    )
    node.children.length = 0
  }
  return {
    props: [
      createObjectProperty(
        createSimpleExpression(`textContent`, true),
        exp
          ? getConstantType(exp, context) > 0
            ? exp
            : createCallExpression(
                context.helperString(TO_DISPLAY_STRING),
                [exp],
                loc
              )
          : createSimpleExpression('', true)
      )
    ]
  }
}
