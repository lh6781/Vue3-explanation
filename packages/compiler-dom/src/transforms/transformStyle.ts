import {
  NodeTransform,
  NodeTypes,
  createSimpleExpression,
  SimpleExpressionNode,
  SourceLocation,
  ConstantTypes
} from '@vue/compiler-core'
import { parseStringStyle } from '@vue/shared'

// Parse inline CSS strings for static style attributes into an object.
// This is a NodeTransform since it works on the static `style` attribute and
// converts it into a dynamic equivalent:
// style="color: red" -> :style='{ "color": "red" }'
// It is then processed by `transformElement` and included in the generated
// props.
/**
 * 
 * @param node 
 * `transformStyle` 是一个节点转换函数，用于将元素节点中的 `style` 属性转换为 `v-bind` 指令。

函数接受一个参数 `node`，表示要进行节点转换的节点，类型为 `ElementNode`。

函数首先判断节点的类型是否为 `ELEMENT`：
- 如果是 `ELEMENT` 类型，则遍历节点的属性列表。
  - 对于每个属性节点，判断其类型是否为 `ATTRIBUTE`，名称是否为 `'style'`，并且存在属性值。
    - 如果满足条件，将该属性节点替换为一个指令节点。
      - 指令节点的类型为 `DIRECTIVE`。
      - 指令名称为 `'bind'`。
      - 指令的参数为一个简单表达式节点，内容为 `'style'`。
      - 指令的表达式为解析属性值内容得到的内联 CSS 表达式节点。
      - 指令没有修饰符。
      - 指令的位置信息与原属性节点相同。

最终，函数完成对节点的转换操作。

该函数用于将元素节点中的 `style` 属性转换为 `v-bind` 指令，使得样式可以响应式地绑定到数据上。
 * 
 */
export const transformStyle: NodeTransform = node => {
  if (node.type === NodeTypes.ELEMENT) {
    node.props.forEach((p, i) => {
      if (p.type === NodeTypes.ATTRIBUTE && p.name === 'style' && p.value) {
        // replace p with an expression node
        node.props[i] = {
          type: NodeTypes.DIRECTIVE,
          name: `bind`,
          arg: createSimpleExpression(`style`, true, p.loc),
          exp: parseInlineCSS(p.value.content, p.loc),
          modifiers: [],
          loc: p.loc
        }
      }
    })
  }
}
/**
 * 
 * @param cssText 
 * @param loc 
 * @returns 
 * `parseInlineCSS` 是一个解析内联 CSS 的函数。

函数接受两个参数：
- `cssText`：要解析的内联 CSS 文本。
- `loc`：内联 CSS 的位置信息。

函数首先通过调用 `parseStringStyle` 函数解析内联 CSS 文本，将其转换为规范化的 CSS 对象。

然后，函数使用 `createSimpleExpression` 函数创建一个简单表达式节点，表示解析后的内联 CSS。
- 表达式节点的内容是通过 `JSON.stringify` 将规范化的 CSS 对象转换为字符串。
- 表达式节点不是常量类型，即其值可能会改变。
- 表达式节点的位置信息与传入的位置信息相同。
- 表达式节点的常量类型为 `ConstantTypes.CAN_STRINGIFY`，表示它可以被字符串化。

最后，函数返回创建的简单表达式节点。

该函数的作用是将内联 CSS 文本解析为一个简单表达式节点，可以在代码生成阶段使用该节点来生成对应的代码，实现对样式的动态绑定。
 */
const parseInlineCSS = (
  cssText: string,
  loc: SourceLocation
): SimpleExpressionNode => {
  const normalized = parseStringStyle(cssText)
  return createSimpleExpression(
    JSON.stringify(normalized),
    false,
    loc,
    ConstantTypes.CAN_STRINGIFY
  )
}
