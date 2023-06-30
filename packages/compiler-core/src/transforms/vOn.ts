import { DirectiveTransform, DirectiveTransformResult } from '../transform'
import {
  createCompoundExpression,
  createObjectProperty,
  createSimpleExpression,
  DirectiveNode,
  ElementTypes,
  ExpressionNode,
  NodeTypes,
  SimpleExpressionNode
} from '../ast'
import { camelize, toHandlerKey } from '@vue/shared'
import { createCompilerError, ErrorCodes } from '../errors'
import { processExpression } from './transformExpression'
import { validateBrowserExpression } from '../validateExpression'
import { hasScopeRef, isMemberExpression } from '../utils'
import { TO_HANDLER_KEY } from '../runtimeHelpers'
/**
 * 这是一个正则表达式 `fnExpRE`，用于匹配函数表达式的模式。

它包括两个主要部分：

1. `^`：表示匹配字符串的开始位置。
2. 函数表达式的模式：
   - `([\w$_]+|(async\s*)?\([^)]*?\))\s*`：匹配函数名或函数参数。
     - `[\w$_]+`：匹配由字母、数字、下划线和 `$` 组成的函数名。
     - `(async\s*)?\([^)]*?\)`：匹配异步函数的参数部分，可以是空参数或带括号的参数列表。
   - `(:[^=]+)?`：匹配函数类型（如 `:number`），并将其捕获为分组。
   - `=>`：匹配箭头函数的箭头部分。
   - `|`：或运算符，表示两种模式的选择。
   - `^\s*(async\s+)?function(?:\s+[\w$]+)?\s*\(`：匹配普通函数的模式。
     - `(async\s+)?`：匹配异步函数的 `async` 关键字。
     - `function`：匹配 `function` 关键字。
     - `(?:\s+[\w$]+)?`：匹配函数名，非捕获分组，可选。
     - `\s*\(`：匹配函数的左括号。

该正则表达式可以用于判断字符串是否符合函数表达式的模式。
 */
const fnExpRE =
  /^\s*([\w$_]+|(async\s*)?\([^)]*?\))\s*(:[^=]+)?=>|^\s*(async\s+)?function(?:\s+[\w$]+)?\s*\(/
/**
 * 这里定义了一个接口 `VOnDirectiveNode`，它继承自 `DirectiveNode` 接口，并添加了一些额外的属性。

`VOnDirectiveNode` 接口的属性包括：

- `arg: ExpressionNode`：指令的参数表达式。当使用 `v-on` 指令并且带有参数时，这个属性表示指令的参数。
- `exp: SimpleExpressionNode | undefined`：表达式节点，用于表示指令的表达式。在这里，`exp` 是一个简单表达式节点，表示指令的表达式部分。这里指定为可选属性，因为 `v-on` 指令在具有参数时，会被特殊处理而跳过表达式转换过程。

通过定义这个接口，可以在 AST（抽象语法树） 的节点中使用 `VOnDirectiveNode` 类型的对象，以表示具有 `v-on` 指令和参数的节点。
 */
export interface VOnDirectiveNode extends DirectiveNode {
  // v-on without arg is handled directly in ./transformElements.ts due to it affecting
  // codegen for the entire props object. This transform here is only for v-on
  // *with* args.
  arg: ExpressionNode
  // exp is guaranteed to be a simple expression here because v-on w/ arg is
  // skipped by transformExpression as a special case.
  exp: SimpleExpressionNode | undefined
}
/**
 * 
 * @param dir 
 * @param node 
 * @param context 
 * @param augmentor 
 * @returns 
 * 这是一个名为 `transformOn` 的函数，它是用于转换 `v-on` 指令的指令转换器（DirectiveTransform）。

该函数接受以下参数：

- `dir`：指令节点的信息，类型为 `VOnDirectiveNode`，包含了指令的参数和表达式等信息。
- `node`：当前节点的信息。
- `context`：转换上下文，包含了转换过程中的各种信息和辅助方法。
- `augmentor`：扩展编译器增强器，用于对转换结果进行进一步处理和增强。

在函数内部，首先从 `dir` 中获取指令的位置、修饰符和参数等信息。然后根据参数的类型进行处理，生成对应的事件名。

接下来处理指令的表达式，判断是否需要缓存处理程序，并进行相关的优化处理。如果指令的表达式是内联语句或可缓存的成员表达式，则进行相应的转换和优化。

在处理表达式过程中，会根据上下文的设置进行标识符的处理和分析，以及相关的验证工作。

最后，根据转换结果生成相应的指令属性，并应用可能存在的编译器增强器。如果需要缓存处理程序，则对属性值进行缓存。最后，将属性标记为处理程序键，以便进行属性规范化检查。

函数返回转换后的指令属性对象，其中包含了转换后的属性信息。
 */
export const transformOn: DirectiveTransform = (
  dir,
  node,
  context,
  augmentor
) => {
  const { loc, modifiers, arg } = dir as VOnDirectiveNode
  if (!dir.exp && !modifiers.length) {
    context.onError(createCompilerError(ErrorCodes.X_V_ON_NO_EXPRESSION, loc))
  }
  let eventName: ExpressionNode
  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (arg.isStatic) {
      let rawName = arg.content
      if (__DEV__ && rawName.startsWith('vnode')) {
        context.onWarn(
          createCompilerError(ErrorCodes.DEPRECATION_VNODE_HOOKS, arg.loc)
        )
      }
      if (rawName.startsWith('vue:')) {
        rawName = `vnode-${rawName.slice(4)}`
      }
      const eventString =
        node.tagType !== ElementTypes.ELEMENT ||
        rawName.startsWith('vnode') ||
        !/[A-Z]/.test(rawName)
          ? // for non-element and vnode lifecycle event listeners, auto convert
            // it to camelCase. See issue #2249
            toHandlerKey(camelize(rawName))
          : // preserve case for plain element listeners that have uppercase
            // letters, as these may be custom elements' custom events
            `on:${rawName}`
      eventName = createSimpleExpression(eventString, true, arg.loc)
    } else {
      // #2388
      eventName = createCompoundExpression([
        `${context.helperString(TO_HANDLER_KEY)}(`,
        arg,
        `)`
      ])
    }
  } else {
    // already a compound expression.
    eventName = arg
    eventName.children.unshift(`${context.helperString(TO_HANDLER_KEY)}(`)
    eventName.children.push(`)`)
  }

  // handler processing
  let exp: ExpressionNode | undefined = dir.exp as
    | SimpleExpressionNode
    | undefined
  if (exp && !exp.content.trim()) {
    exp = undefined
  }
  let shouldCache: boolean = context.cacheHandlers && !exp && !context.inVOnce
  if (exp) {
    const isMemberExp = isMemberExpression(exp.content, context)
    const isInlineStatement = !(isMemberExp || fnExpRE.test(exp.content))
    const hasMultipleStatements = exp.content.includes(`;`)

    // process the expression since it's been skipped
    if (!__BROWSER__ && context.prefixIdentifiers) {
      isInlineStatement && context.addIdentifiers(`$event`)
      exp = dir.exp = processExpression(
        exp,
        context,
        false,
        hasMultipleStatements
      )
      isInlineStatement && context.removeIdentifiers(`$event`)
      // with scope analysis, the function is hoistable if it has no reference
      // to scope variables.
      shouldCache =
        context.cacheHandlers &&
        // unnecessary to cache inside v-once
        !context.inVOnce &&
        // runtime constants don't need to be cached
        // (this is analyzed by compileScript in SFC <script setup>)
        !(exp.type === NodeTypes.SIMPLE_EXPRESSION && exp.constType > 0) &&
        // #1541 bail if this is a member exp handler passed to a component -
        // we need to use the original function to preserve arity,
        // e.g. <transition> relies on checking cb.length to determine
        // transition end handling. Inline function is ok since its arity
        // is preserved even when cached.
        !(isMemberExp && node.tagType === ElementTypes.COMPONENT) &&
        // bail if the function references closure variables (v-for, v-slot)
        // it must be passed fresh to avoid stale values.
        !hasScopeRef(exp, context.identifiers)
      // If the expression is optimizable and is a member expression pointing
      // to a function, turn it into invocation (and wrap in an arrow function
      // below) so that it always accesses the latest value when called - thus
      // avoiding the need to be patched.
      if (shouldCache && isMemberExp) {
        if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
          exp.content = `${exp.content} && ${exp.content}(...args)`
        } else {
          exp.children = [...exp.children, ` && `, ...exp.children, `(...args)`]
        }
      }
    }

    if (__DEV__ && __BROWSER__) {
      validateBrowserExpression(
        exp as SimpleExpressionNode,
        context,
        false,
        hasMultipleStatements
      )
    }

    if (isInlineStatement || (shouldCache && isMemberExp)) {
      // wrap inline statement in a function expression
      exp = createCompoundExpression([
        `${
          isInlineStatement
            ? !__BROWSER__ && context.isTS
              ? `($event: any)`
              : `$event`
            : `${
                !__BROWSER__ && context.isTS ? `\n//@ts-ignore\n` : ``
              }(...args)`
        } => ${hasMultipleStatements ? `{` : `(`}`,
        exp,
        hasMultipleStatements ? `}` : `)`
      ])
    }
  }

  let ret: DirectiveTransformResult = {
    props: [
      createObjectProperty(
        eventName,
        exp || createSimpleExpression(`() => {}`, false, loc)
      )
    ]
  }

  // apply extended compiler augmentor
  if (augmentor) {
    ret = augmentor(ret)
  }

  if (shouldCache) {
    // cache handlers so that it's always the same handler being passed down.
    // this avoids unnecessary re-renders when users use inline handlers on
    // components.
    ret.props[0].value = context.cache(ret.props[0].value)
  }

  // mark the key as handler for props normalization check
  ret.props.forEach(p => (p.key.isHandlerKey = true))
  return ret
}
