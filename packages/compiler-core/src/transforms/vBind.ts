import { DirectiveTransform } from '../transform'
import {
  createObjectProperty,
  createSimpleExpression,
  ExpressionNode,
  NodeTypes
} from '../ast'
import { createCompilerError, ErrorCodes } from '../errors'
import { camelize } from '@vue/shared'
import { CAMELIZE } from '../runtimeHelpers'

// v-bind without arg is handled directly in ./transformElements.ts due to it affecting
// codegen for the entire props object. This transform here is only for v-bind
// *with* args.
/**
 * 
 * @param dir 
 * @param _node 
 * @param context 
 * @returns 
 * `transformBind` 是一个指令转换函数，用于在绑定指令（`v-bind`）上执行转换操作。

该函数接受三个参数：
- `dir: DirectiveNode`：要进行转换的指令节点。
- `_node: ElementNode`：当前元素节点。
- `context: TransformContext`：转换上下文对象，包含有关转换环境的信息。

函数内部首先获取指令节点的表达式、修饰符和位置信息。然后根据指令的参数进行不同的转换操作。

1. 对于非简单表达式的参数，会在参数的子节点列表首尾添加括号，以确保表达式的正确性。例如，`v-bind:[foo]` 转换为 `([foo]) || ""`。
2. 对于简单表达式的参数，如果参数不是静态的，则在参数内容末尾添加 `|| ""`，以确保在表达式为假时返回空字符串。例如，`v-bind:foo` 转换为 `foo || ""`。
3. 如果指令包含 `camel` 修饰符，将参数内容转换为驼峰命名。如果参数是简单表达式且为静态的，则直接对参数内容进行驼峰转换；如果参数是简单表达式但不是静态的，则使用 `camelize` 辅助函数对参数内容进行驼峰转换。例如，`v-bind:foo.camel` 转换为 `camelCase(foo)`。
4. 如果不是在服务器端渲染环境下，根据修饰符对参数内容进行处理。如果指令包含 `prop` 修饰符，则在参数内容前添加 `.`；如果指令包含 `attr` 修饰符，则在参数内容前添加 `^`。例如，`v-bind:foo.prop` 转换为 `.foo`。
5. 如果表达式为空或只包含空白字符，则报错，并返回一个包含空表达式的对象属性节点。
6. 如果表达式不为空，则返回一个包含参数和表达式的对象属性节点。

总结来说，`transformBind` 函数用于在绑定指令（`v-bind`）上执行转换操作。它处理指令的参数、修饰符和表达式，并生成相应的对象属性节点用于后续的代码生成。在转换过程中，它会添加括号、处理修饰符、转换参数命名，并对表达式进行校验。
 */
export const transformBind: DirectiveTransform = (dir, _node, context) => {
  const { exp, modifiers, loc } = dir
  const arg = dir.arg!

  if (arg.type !== NodeTypes.SIMPLE_EXPRESSION) {
    arg.children.unshift(`(`)
    arg.children.push(`) || ""`)
  } else if (!arg.isStatic) {
    arg.content = `${arg.content} || ""`
  }

  // .sync is replaced by v-model:arg
  if (modifiers.includes('camel')) {
    if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
      if (arg.isStatic) {
        arg.content = camelize(arg.content)
      } else {
        arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`
      }
    } else {
      arg.children.unshift(`${context.helperString(CAMELIZE)}(`)
      arg.children.push(`)`)
    }
  }

  if (!context.inSSR) {
    if (modifiers.includes('prop')) {
      injectPrefix(arg, '.')
    }
    if (modifiers.includes('attr')) {
      injectPrefix(arg, '^')
    }
  }

  if (
    !exp ||
    (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.content.trim())
  ) {
    context.onError(createCompilerError(ErrorCodes.X_V_BIND_NO_EXPRESSION, loc))
    return {
      props: [createObjectProperty(arg, createSimpleExpression('', true, loc))]
    }
  }

  return {
    props: [createObjectProperty(arg, exp)]
  }
}
/**
 * 
 * @param arg 
 * @param prefix 
 * `injectPrefix` 是一个辅助函数，用于在参数表达式中插入前缀字符串。

该函数接受两个参数：
- `arg: ExpressionNode`：要进行处理的参数表达式节点。
- `prefix: string`：要插入的前缀字符串。

函数首先判断参数表达式的类型，如果是简单表达式节点（`NodeTypes.SIMPLE_EXPRESSION`），则根据节点的静态性进行处理。

1. 如果参数表达式是静态的，直接在参数内容前添加前缀字符串。例如，如果参数内容为 `foo`，前缀为 `^`，则结果为 `^foo`。
2. 如果参数表达式不是静态的，则使用模板字符串形式，在参数内容前添加前缀字符串。例如，如果参数内容为 `bar`，前缀为 `.`，则结果为 ```.${bar}```。

如果参数表达式不是简单表达式节点，则将前缀字符串和子节点列表插入到参数表达式的子节点列表中。

1. 在子节点列表的开头添加前缀字符串的引号形式。例如，如果前缀为 `'+'`，则在子节点列表的开头添加 `'+'`。
2. 在子节点列表的末尾添加闭合括号。例如，如果子节点列表为 `['a', 'b', 'c']`，则在末尾添加 `')'`。

总结来说，`injectPrefix` 函数用于在参数表达式中插入前缀字符串。它根据参数表达式的类型和静态性进行处理，并将前缀字符串插入到参数表达式的内容中或子节点列表的开头。这个函数通常与 `transformBind` 函数一起使用，用于处理绑定指令的参数修饰符。
 */
const injectPrefix = (arg: ExpressionNode, prefix: string) => {
  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (arg.isStatic) {
      arg.content = prefix + arg.content
    } else {
      arg.content = `\`${prefix}\${${arg.content}}\``
    }
  } else {
    arg.children.unshift(`'${prefix}' + (`)
    arg.children.push(`)`)
  }
}
