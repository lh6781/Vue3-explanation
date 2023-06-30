import { RESOLVE_FILTER } from '../runtimeHelpers'
import {
  ExpressionNode,
  AttributeNode,
  DirectiveNode,
  NodeTypes,
  SimpleExpressionNode
} from '../ast'
import {
  CompilerDeprecationTypes,
  isCompatEnabled,
  warnDeprecation
} from './compatConfig'
import { NodeTransform, TransformContext } from '../transform'
import { toValidAssetId } from '../utils'
/**
 * 这个变量名为 `validDivisionCharRE`，它是一个正则表达式对象。

正则表达式 `/[\w).+\-_$\]]/` 用于匹配合法的除法字符。

解释正则表达式的各个部分：
- `[]` 表示字符类，匹配方括号内的任意字符。
- `\w` 匹配任意字母、数字或下划线字符。
- `)` 匹配右括号字符。
- `.` 匹配点号字符。
- `+` 匹配加号字符。
- `\-` 匹配减号字符。
- `_$\]` 匹配下划线、美元符号和右方括号字符。

正则表达式中的斜杠 `\` 是转义符，用于转义后面的字符。

所以，`validDivisionCharRE` 正则表达式用于判断一个字符是否是合法的除法字符。如果一个字符匹配了该正则表达式，那么它就是一个合法的除法字符。
 */
const validDivisionCharRE = /[\w).+\-_$\]]/
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这段代码导出了一个名为 `transformFilter` 的变量，它是一个类型为 `NodeTransform` 的函数。

该函数接受两个参数：`node` 和 `context`，用于对节点进行转换操作。

函数的主要作用是在编译过程中转换过滤器。它首先检查是否启用了 COMPILER_FILTERS 兼容选项，如果未启用，则直接返回。

然后，它检查节点的类型。如果节点是插值表达式（INTERPOLATION），则将对应的内容进行重写，以处理过滤器。

如果节点是元素节点（ELEMENT），则遍历其属性列表。对于属性列表中的每个指令节点（DIRECTIVE），除了 'for' 指令以外，并且存在表达式（exp），也会对表达式进行过滤器的重写操作。

总体而言，`transformFilter` 函数用于处理过滤器的转换，根据兼容性选项和节点类型进行相应的处理。
 */
export const transformFilter: NodeTransform = (node, context) => {
  if (!isCompatEnabled(CompilerDeprecationTypes.COMPILER_FILTERS, context)) {
    return
  }

  if (node.type === NodeTypes.INTERPOLATION) {
    // filter rewrite is applied before expression transform so only
    // simple expressions are possible at this stage
    rewriteFilter(node.content, context)
  }

  if (node.type === NodeTypes.ELEMENT) {
    node.props.forEach((prop: AttributeNode | DirectiveNode) => {
      if (
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name !== 'for' &&
        prop.exp
      ) {
        rewriteFilter(prop.exp, context)
      }
    })
  }
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `rewriteFilter` 的函数，用于重写过滤器表达式。

该函数接受两个参数：`node` 表示需要重写的表达式节点，`context` 表示转换上下文。

函数的主要作用是遍历表达式节点，并对其中的过滤器进行解析和重写操作。

如果节点的类型是 `NodeTypes.SIMPLE_EXPRESSION`，则调用 `parseFilter` 函数对该节点进行解析。

如果节点的类型不是 `NodeTypes.SIMPLE_EXPRESSION`，则遍历节点的子节点。对于每个子节点，如果其类型是 `NodeTypes.SIMPLE_EXPRESSION`，则调用 `parseFilter` 函数进行解析。如果其类型是 `NodeTypes.COMPOUND_EXPRESSION`，则递归调用 `rewriteFilter` 函数对该子节点进行重写。如果其类型是 `NodeTypes.INTERPOLATION`，则递归调用 `rewriteFilter` 函数对其内容进行重写。

总体而言，`rewriteFilter` 函数用于遍历并重写表达式节点中的过滤器。它根据节点的类型进行相应的操作，并通过递归处理子节点来实现完整的重写过程。
 */
function rewriteFilter(node: ExpressionNode, context: TransformContext) {
  if (node.type === NodeTypes.SIMPLE_EXPRESSION) {
    parseFilter(node, context)
  } else {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      if (typeof child !== 'object') continue
      if (child.type === NodeTypes.SIMPLE_EXPRESSION) {
        parseFilter(child, context)
      } else if (child.type === NodeTypes.COMPOUND_EXPRESSION) {
        rewriteFilter(node, context)
      } else if (child.type === NodeTypes.INTERPOLATION) {
        rewriteFilter(child.content, context)
      }
    }
  }
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `parseFilter` 的函数，用于解析过滤器表达式。

该函数接受两个参数：`node` 表示需要解析的简单表达式节点，`context` 表示转换上下文。

函数通过遍历表达式节点的内容来解析其中的过滤器。在解析过程中，函数会维护一些状态变量来跟踪当前的解析状态，例如是否在引号内、模板字符串内、正则表达式内，以及括号、方括号和花括号的嵌套层数等。

函数会根据不同的字符进行相应的处理。例如，如果遇到 `|` 字符（管道符号），且该字符前后不是 `|` 字符，并且没有在引号、括号、方括号和花括号内，则表示找到了一个过滤器。函数会将之前的表达式切割出来，并存储到 `expression` 变量中，并将该过滤器存储到 `filters` 数组中。

函数还会处理一些特殊字符，如引号、括号、方括号和花括号等，用于更新解析状态。

在解析完所有过滤器后，函数会根据 `filters` 数组中的过滤器，通过调用 `wrapFilter` 函数对 `expression` 进行包装。

最后，函数会更新节点的内容为解析后的表达式。

总体而言，`parseFilter` 函数用于解析过滤器表达式，并对表达式进行相应的处理和包装。
 */
function parseFilter(node: SimpleExpressionNode, context: TransformContext) {
  const exp = node.content
  let inSingle = false
  let inDouble = false
  let inTemplateString = false
  let inRegex = false
  let curly = 0
  let square = 0
  let paren = 0
  let lastFilterIndex = 0
  let c,
    prev,
    i: number,
    expression,
    filters: string[] = []

  for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    if (inSingle) {
      if (c === 0x27 && prev !== 0x5c) inSingle = false
    } else if (inDouble) {
      if (c === 0x22 && prev !== 0x5c) inDouble = false
    } else if (inTemplateString) {
      if (c === 0x60 && prev !== 0x5c) inTemplateString = false
    } else if (inRegex) {
      if (c === 0x2f && prev !== 0x5c) inRegex = false
    } else if (
      c === 0x7c && // pipe
      exp.charCodeAt(i + 1) !== 0x7c &&
      exp.charCodeAt(i - 1) !== 0x7c &&
      !curly &&
      !square &&
      !paren
    ) {
      if (expression === undefined) {
        // first filter, end of expression
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22:
          inDouble = true
          break // "
        case 0x27:
          inSingle = true
          break // '
        case 0x60:
          inTemplateString = true
          break // `
        case 0x28:
          paren++
          break // (
        case 0x29:
          paren--
          break // )
        case 0x5b:
          square++
          break // [
        case 0x5d:
          square--
          break // ]
        case 0x7b:
          curly++
          break // {
        case 0x7d:
          curly--
          break // }
      }
      if (c === 0x2f) {
        // /
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  function pushFilter() {
    filters.push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  if (filters.length) {
    __DEV__ &&
      warnDeprecation(
        CompilerDeprecationTypes.COMPILER_FILTERS,
        context,
        node.loc
      )
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i], context)
    }
    node.content = expression
  }
}
/**
 * 
 * @param exp 
 * @param filter 
 * @param context 
 * @returns 
 * 这是一个名为 `wrapFilter` 的函数，用于对表达式进行过滤器包装。

该函数接受三个参数：`exp` 表示需要进行包装的表达式，`filter` 表示过滤器的名称和参数，`context` 表示转换上下文。

函数首先调用 `context.helper(RESOLVE_FILTER)`，该方法用于在转换上下文中引入过滤器解析的帮助函数。

接下来，函数会查找过滤器名称中的左括号 `(` 的位置，如果找到则表示过滤器有参数，否则表示过滤器没有参数。

如果过滤器没有参数，则将过滤器名称添加到转换上下文的 `filters` 集合中，并返回 `${toValidAssetId(filter, 'filter')}(${exp})`，即将过滤器应用于表达式。

如果过滤器有参数，则将过滤器名称和参数进行切割，并将过滤器名称添加到转换上下文的 `filters` 集合中。然后返回 `${toValidAssetId(name, 'filter')}(${exp}${args !== ')' ? ',' + args : args}`，即将过滤器应用于表达式和参数。

总体而言，`wrapFilter` 函数用于对表达式进行过滤器包装，根据过滤器是否带有参数进行相应的处理，并将过滤器名称和参数添加到转换上下文的 `filters` 集合中。返回包装后的表达式。
 */
function wrapFilter(
  exp: string,
  filter: string,
  context: TransformContext
): string {
  context.helper(RESOLVE_FILTER)
  const i = filter.indexOf('(')
  if (i < 0) {
    context.filters!.add(filter)
    return `${toValidAssetId(filter, 'filter')}(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    context.filters!.add(name)
    return `${toValidAssetId(name, 'filter')}(${exp}${
      args !== ')' ? ',' + args : args
    }`
  }
}
