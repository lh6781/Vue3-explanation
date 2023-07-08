import {
  SourceLocation,
  Position,
  ElementNode,
  NodeTypes,
  CallExpression,
  createCallExpression,
  DirectiveNode,
  ElementTypes,
  TemplateChildNode,
  RootNode,
  ObjectExpression,
  Property,
  JSChildNode,
  createObjectExpression,
  SlotOutletNode,
  TemplateNode,
  RenderSlotCall,
  ExpressionNode,
  IfBranchNode,
  TextNode,
  InterpolationNode,
  VNodeCall,
  SimpleExpressionNode,
  BlockCodegenNode,
  MemoExpression
} from './ast'
import { TransformContext } from './transform'
import {
  MERGE_PROPS,
  TELEPORT,
  SUSPENSE,
  KEEP_ALIVE,
  BASE_TRANSITION,
  TO_HANDLERS,
  NORMALIZE_PROPS,
  GUARD_REACTIVE_PROPS,
  WITH_MEMO
} from './runtimeHelpers'
import { isString, isObject, hyphenate, extend, NOOP } from '@vue/shared'
import { PropsExpression } from './transforms/transformElement'
import { parseExpression } from '@babel/parser'
import { Expression } from '@babel/types'
/**
 * 
 * @param p 
 * @returns 
 * 这段代码定义了一个辅助函数 `isStaticExp`。该函数用于判断给定的节点 `p` 是否为静态表达式节点，返回一个布尔值。

函数的实现逻辑如下：
- 首先，检查节点 `p` 的类型是否为 `NodeTypes.SIMPLE_EXPRESSION`，这表示它是一个简单表达式节点。
- 接下来，检查节点 `p` 的 `isStatic` 属性是否为 `true`，这表示该节点是一个静态表达式节点。
- 如果上述两个条件都满足，则返回 `true`，表示节点是一个静态表达式节点。
- 否则，返回 `false`，表示节点不是一个静态表达式节点。

通过调用这个辅助函数，可以方便地检查一个节点是否为静态表达式节点。
 */
export const isStaticExp = (p: JSChildNode): p is SimpleExpressionNode =>
  p.type === NodeTypes.SIMPLE_EXPRESSION && p.isStatic
/**
 * 
 * @param tag 
 * @param expected 
 * @returns 
 * 这段代码定义了一个辅助函数 `isBuiltInType`，用于判断给定的标签 `tag` 是否为内置类型 `expected`。

函数的实现逻辑如下：
- 首先，检查给定的标签 `tag` 是否与期望的内置类型 `expected` 相等，如果相等则返回 `true`。
- 否则，将 `expected` 转换为连字符形式（使用 `hyphenate` 函数），再次与标签 `tag` 进行比较，如果相等则返回 `true`。
- 如果上述两个条件都不满足，则返回 `false`。

通过调用这个辅助函数，可以方便地判断给定的标签是否为内置类型，支持同时匹配连字符形式和非连字符形式的标签。
 */
export const isBuiltInType = (tag: string, expected: string): boolean =>
  tag === expected || tag === hyphenate(expected)
/**
 * 
 * @param tag 
 * @returns 
 * 这段代码定义了一个函数 `isCoreComponent`，用于判断给定的标签 `tag` 是否为核心组件。核心组件是指在 Vue.js 中内置的一些特殊组件，如 `<Teleport>`、`<Suspense>`、`<KeepAlive>` 和 `<BaseTransition>`。

函数的实现逻辑如下：
- 首先，通过调用辅助函数 `isBuiltInType` 判断给定的标签 `tag` 是否与内置类型相匹配。
- 如果匹配上了相应的内置类型，就返回对应的符号（symbol），用于标识核心组件。返回的符号可以在其他地方用于识别特定的核心组件。
- 如果标签 `tag` 不匹配任何内置类型，则返回 `undefined`。

通过调用这个函数，可以判断给定的标签是否为核心组件，并获取相应的标识符。
 */
export function isCoreComponent(tag: string): symbol | void {
  if (isBuiltInType(tag, 'Teleport')) {
    return TELEPORT
  } else if (isBuiltInType(tag, 'Suspense')) {
    return SUSPENSE
  } else if (isBuiltInType(tag, 'KeepAlive')) {
    return KEEP_ALIVE
  } else if (isBuiltInType(tag, 'BaseTransition')) {
    return BASE_TRANSITION
  }
}
/**
 * 这是一个正则表达式 `nonIdentifierRE`，用于匹配非标识符字符或以数字开头的字符串。

- `^\d`：匹配以数字开头的字符串。
- `[^\$\w]`：匹配除了美元符号 `$` 和字母数字字符之外的任意字符。

该正则表达式通常用于判断字符串是否符合标识符的命名规则。如果一个字符串匹配了 `nonIdentifierRE`，则可以认为它不符合标识符的命名规则。
 */
const nonIdentifierRE = /^\d|[^\$\w]/
/**
 * 
 * @param name 
 * @returns 
 * `isSimpleIdentifier` 是一个函数，用于判断给定的字符串 `name` 是否是一个简单的标识符。

它使用了正则表达式 `nonIdentifierRE` 来测试字符串是否匹配非标识符字符或以数字开头的模式。如果 `name` 字符串不匹配该模式，即不包含非标识符字符且不以数字开头，则返回 `true`，表示该字符串是一个简单的标识符。否则，返回 `false`，表示该字符串不是一个简单的标识符。
 */
export const isSimpleIdentifier = (name: string): boolean =>
  !nonIdentifierRE.test(name)
/**
 * `MemberExpLexState` 是一个枚举类型，它表示成员表达式解析过程中的不同状态。

该枚举定义了四个枚举成员：

1. `inMemberExp`: 表示在成员表达式中的状态。例如，对于表达式 `obj.prop`，当前状态是 `inMemberExp`，因为我们正在处理成员访问部分 `obj.prop`。
2. `inBrackets`: 表示在方括号中的状态。例如，对于表达式 `arr[index]`，当前状态是 `inBrackets`，因为我们正在处理方括号内的表达式 `index`。
3. `inParens`: 表示在圆括号中的状态。例如，对于表达式 `func(arg1, arg2)`，当前状态是 `inParens`，因为我们正在处理圆括号内的表达式 `arg1, arg2`。
4. `inString`: 表示在字符串中的状态。例如，对于表达式 `"Hello, world!"`，当前状态是 `inString`，因为我们正在处理字符串内容 `"Hello, world!"`。

这些状态有助于在解析成员表达式时跟踪当前所在的上下文，以确保正确解析各种复杂的表达式结构。
 */
const enum MemberExpLexState {
  inMemberExp,
  inBrackets,
  inParens,
  inString
}
/**
 * `validFirstIdentCharRE` 是一个正则表达式，用于检查一个字符串的第一个字符是否是一个有效的标识符的起始字符。

该正则表达式匹配以下字符范围：

- `A-Z`: 大写字母
- `a-z`: 小写字母
- `_`: 下划线
- `$`: 美元符号
- `\xA0-\uFFFF`: Unicode 范围中的所有字符

通过使用这个正则表达式，可以验证一个字符串是否可以作为标识符的起始字符。如果一个字符串的第一个字符匹配 `validFirstIdentCharRE`，则它可以作为标识符的起始字符；否则，它不是一个有效的标识符起始字符。
 */
const validFirstIdentCharRE = /[A-Za-z_$\xA0-\uFFFF]/
/**
 * `validIdentCharRE` 是一个正则表达式，用于检查一个字符串的字符是否是有效的标识符字符。

该正则表达式匹配以下字符范围：

- `\.`: 点号，用于表示对象属性访问
- `\?`: 问号，用于条件表达式
- `\w`: 字母、数字和下划线字符
- `$`: 美元符号
- `\xA0-\uFFFF`: Unicode 范围中的所有字符

通过使用这个正则表达式，可以验证一个字符串是否可以作为标识符的字符。如果一个字符串的所有字符都匹配 `validIdentCharRE`，则它是一个有效的标识符字符；否则，它不是一个有效的标识符字符。
 */
const validIdentCharRE = /[\.\?\w$\xA0-\uFFFF]/
/**
 * `whitespaceRE` 是一个正则表达式，用于匹配包含空白字符的特定模式。它的模式如下：

- `\s+`: 匹配一个或多个连续的空白字符（空格、制表符、换行符等）。
- `[.[]`: 匹配字符 "." 或 "["。
- `\s*`: 匹配零个或多个连续的空白字符。

该正则表达式的作用是查找满足以下条件的模式：

1. 模式的前面是一个或多个连续的空白字符。
2. 模式的后面是字符 "." 或 "["。
3. 模式之间可以包含零个或多个连续的空白字符。

通过使用这个正则表达式，可以匹配包含空白字符的特定模式，并进行相应的处理或替换。
 */
const whitespaceRE = /\s+[.[]\s*|\s*[.[]\s+/g

/**
 * Simple lexer to check if an expression is a member expression. This is
 * lax and only checks validity at the root level (i.e. does not validate exps
 * inside square brackets), but it's ok since these are only used on template
 * expressions and false positives are invalid expressions in the first place.
 * `isMemberExpressionBrowser` 是一个函数，用于判断给定的路径字符串是否表示有效的成员表达式。它使用有限状态机来解析路径字符串并进行验证。

函数的逻辑如下：

1. 首先，将路径字符串去除首尾空白字符，并使用 `whitespaceRE` 正则表达式替换掉 "." 或 "[" 周围的空白字符。

2. 然后，定义了一些变量来跟踪解析过程中的状态和计数器。`state` 表示当前的解析状态，`stateStack` 用于存储状态堆栈，`currentOpenBracketCount` 和 `currentOpenParensCount` 分别表示当前打开的方括号和圆括号的数量，`currentStringType` 表示当前的字符串类型。

3. 接下来，通过循环遍历路径字符串的每个字符，并根据当前的状态执行相应的逻辑。

4. 在状态为 `inMemberExp`（在成员表达式内部）时，如果字符是 "["，则将状态切换为 `inBrackets`（在方括号内部），并增加方括号计数器。如果字符是 "("，则将状态切换为 `inParens`（在圆括号内部），并增加圆括号计数器。如果字符不满足标识符的合法字符要求，则返回 `false`。

5. 在状态为 `inBrackets`（在方括号内部）时，如果字符是引号字符（单引号、双引号或反引号），则将状态切换为 `inString`（在字符串内部），并记录当前的字符串类型。如果字符是 "["，则增加方括号计数器。如果字符是 "]"，则减少方括号计数器，如果方括号计数器归零，则将状态恢复为之前的状态。

6. 在状态为 `inParens`（在圆括号内部）时，如果字符是引号字符（单引号、双引号或反引号），则将状态切换为 `inString`（在字符串内部），并记录当前的字符串类型。如果字符是 "("，则增加圆括号计数器。如果字符是 ")"，则判断是否为表达式的末尾，如果是则返回 `false`，否则减少圆括号计数器，如果圆括号计数器归零，则将状态恢复为之前的状态。

7. 在状态为 `inString`（在字符串内部）时，如果字符与当前字符串类型相同，则将状态恢复为之前的状态，并将当前字符串类型设置为 `null`。

8. 循环结束后，如果方括号计数器和圆括号计数器均为零，则表示路径字符串是有效的成员表达式，返回 `true`；否则返回 `false`。

通过该函数，可以判断给定的路径字符串是否表示有效的成员表达式，其中方

括号和圆括号的嵌套、字符串的引号匹配等都会被正确处理。
 */
export const isMemberExpressionBrowser = (path: string): boolean => {
  // remove whitespaces around . or [ first
  path = path.trim().replace(whitespaceRE, s => s.trim())

  let state = MemberExpLexState.inMemberExp
  let stateStack: MemberExpLexState[] = []
  let currentOpenBracketCount = 0
  let currentOpenParensCount = 0
  let currentStringType: "'" | '"' | '`' | null = null

  for (let i = 0; i < path.length; i++) {
    const char = path.charAt(i)
    switch (state) {
      case MemberExpLexState.inMemberExp:
        if (char === '[') {
          stateStack.push(state)
          state = MemberExpLexState.inBrackets
          currentOpenBracketCount++
        } else if (char === '(') {
          stateStack.push(state)
          state = MemberExpLexState.inParens
          currentOpenParensCount++
        } else if (
          !(i === 0 ? validFirstIdentCharRE : validIdentCharRE).test(char)
        ) {
          return false
        }
        break
      case MemberExpLexState.inBrackets:
        if (char === `'` || char === `"` || char === '`') {
          stateStack.push(state)
          state = MemberExpLexState.inString
          currentStringType = char
        } else if (char === `[`) {
          currentOpenBracketCount++
        } else if (char === `]`) {
          if (!--currentOpenBracketCount) {
            state = stateStack.pop()!
          }
        }
        break
      case MemberExpLexState.inParens:
        if (char === `'` || char === `"` || char === '`') {
          stateStack.push(state)
          state = MemberExpLexState.inString
          currentStringType = char
        } else if (char === `(`) {
          currentOpenParensCount++
        } else if (char === `)`) {
          // if the exp ends as a call then it should not be considered valid
          if (i === path.length - 1) {
            return false
          }
          if (!--currentOpenParensCount) {
            state = stateStack.pop()!
          }
        }
        break
      case MemberExpLexState.inString:
        if (char === currentStringType) {
          state = stateStack.pop()!
          currentStringType = null
        }
        break
    }
  }
  return !currentOpenBracketCount && !currentOpenParensCount
}
/**
 * `isMemberExpressionNode` 是一个函数，用于判断给定的路径字符串是否表示有效的成员表达式（在编译时或运行时）。根据当前环境，函数的实现有所不同。

如果是在浏览器环境 (`__BROWSER__` 为真)，则函数直接返回 `NOOP`，即空函数。

如果不是在浏览器环境，则使用 `parseExpression` 函数将路径字符串解析为表达式对象，并进行一些处理和判断。具体逻辑如下：

1. 首先，使用 `parseExpression` 函数解析路径字符串为表达式对象 `ret`，并传入 `context.expressionPlugins` 作为插件配置。

2. 如果 `ret` 的类型是 `'TSAsExpression'` 或 `'TSTypeAssertion'`，则将 `ret` 设置为 `ret.expression`，以获取实际的表达式对象。

3. 最后，判断 `ret` 的类型是否为 `'MemberExpression'`、`'OptionalMemberExpression'` 或 `'Identifier'`，如果是则表示路径字符串是有效的成员表达式，返回 `true`；否则返回 `false`。

如果在解析过程中发生异常，则捕获异常并返回 `false`，表示路径字符串无效。

根据当前环境的不同，`isMemberExpressionNode` 函数提供了不同的实现，以适应不同的使用场景。
 */
export const isMemberExpressionNode = __BROWSER__
  ? (NOOP as any as (path: string, context: TransformContext) => boolean)
  : (path: string, context: TransformContext): boolean => {
      try {
        let ret: Expression = parseExpression(path, {
          plugins: context.expressionPlugins
        })
        if (ret.type === 'TSAsExpression' || ret.type === 'TSTypeAssertion') {
          ret = ret.expression
        }
        return (
          ret.type === 'MemberExpression' ||
          ret.type === 'OptionalMemberExpression' ||
          ret.type === 'Identifier'
        )
      } catch (e) {
        return false
      }
    }
/**
 * `isMemberExpression` 是一个函数，用于判断给定的路径字符串是否表示有效的成员表达式。根据当前环境，函数的实现有所不同。

如果是在浏览器环境 (`__BROWSER__` 为真)，则函数的实现使用 `isMemberExpressionBrowser` 函数，该函数基于字符串解析和状态机进行成员表达式的验证。

如果不是在浏览器环境，则函数的实现使用 `isMemberExpressionNode` 函数，该函数使用 JavaScript 解析器将路径字符串解析为表达式对象，并进行类型判断来验证成员表达式的有效性。

通过根据环境选择不同的实现，`isMemberExpression` 函数能够在不同的上下文中进行成员表达式的验证。
 */
export const isMemberExpression = __BROWSER__
  ? isMemberExpressionBrowser
  : isMemberExpressionNode
/**
 * 
 * @param loc 
 * @param offset 
 * @param length 
 * @returns 
 * `getInnerRange` 是一个函数，用于从给定的源代码位置信息 (`loc`) 中提取指定偏移量 (`offset`) 和长度 (`length`) 的内部范围。

函数首先通过 `loc.source.slice(offset, offset + length)` 从源代码中提取指定范围的子字符串，然后创建一个新的位置信息对象 `newLoc`，其中 `source` 字段为提取的子字符串。

`newLoc` 的 `start` 字段通过调用 `advancePositionWithClone` 函数计算得出，它会基于原始位置信息 `loc.start` 和源代码字符串 `loc.source` 进行偏移量的调整。偏移量是相对于源代码字符串的起始位置的偏移量。

如果给定了长度 (`length != null`)，则 `newLoc.end` 字段也会进行计算。它会使用 `advancePositionWithClone` 函数基于原始位置信息 `loc.start` 和源代码字符串 `loc.source` 以及偏移量加上长度的位置进行调整。

最后，函数返回新的位置信息对象 `newLoc`，其中包含了提取的子字符串的范围。在函数中有 `__TEST__` 条件语句用于在测试环境下进行断言检查。

总结而言，`getInnerRange` 函数用于从源代码位置信息中提取指定偏移量和长度的内部范围，并返回相应的位置信息对象。
 */
export function getInnerRange(
  loc: SourceLocation,
  offset: number,
  length: number
): SourceLocation {
  __TEST__ && assert(offset <= loc.source.length)
  const source = loc.source.slice(offset, offset + length)
  const newLoc: SourceLocation = {
    source,
    start: advancePositionWithClone(loc.start, loc.source, offset),
    end: loc.end
  }

  if (length != null) {
    __TEST__ && assert(offset + length <= loc.source.length)
    newLoc.end = advancePositionWithClone(
      loc.start,
      loc.source,
      offset + length
    )
  }

  return newLoc
}
/**
 * 
 * @param pos 
 * @param source 
 * @param numberOfCharacters 
 * @returns 
 * `advancePositionWithClone` 是一个函数，用于在给定的源代码位置信息 (`pos`) 基础上，通过指定的字符数量 (`numberOfCharacters`) 来进行位置的偏移。

函数首先调用 `extend({}, pos)` 来创建原始位置信息对象 `pos` 的副本，确保不会直接修改原始对象。

然后，函数调用 `advancePositionWithMutation` 函数，将创建的位置信息副本、源代码字符串 `source` 和字符数量 `numberOfCharacters` 作为参数传递给它。

`advancePositionWithMutation` 函数会根据源代码字符串和字符数量来更新位置信息副本的行号 (`line`)、列号 (`column`) 和偏移量 (`offset`)。

最后，函数返回更新后的位置信息副本，表示偏移后的位置信息。

总结而言，`advancePositionWithClone` 函数用于在给定的源代码位置信息的副本上进行位置偏移，并返回更新后的位置信息副本。这样可以避免直接修改原始位置信息对象。
 */
export function advancePositionWithClone(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length
): Position {
  return advancePositionWithMutation(
    extend({}, pos),
    source,
    numberOfCharacters
  )
}

// advance by mutation without cloning (for performance reasons), since this
// gets called a lot in the parser
/**
 * 
 * @param pos 
 * @param source 
 * @param numberOfCharacters 
 * @returns 
 * `advancePositionWithMutation` 是一个函数，用于在给定的源代码位置信息 (`pos`) 上进行位置的偏移。函数根据源代码字符串 (`source`) 和字符数量 (`numberOfCharacters`) 来更新位置信息的行号 (`line`)、列号 (`column`) 和偏移量 (`offset`)。

函数首先初始化变量 `linesCount` 为 0，用于记录遇到的换行符的数量，以及变量 `lastNewLinePos` 为 -1，用于记录最后一个换行符的位置。

然后，函数通过遍历前 `numberOfCharacters` 个字符，检查每个字符是否是换行符（使用 `source.charCodeAt(i) === 10` 进行判断，其中 10 是换行符的字符码）。如果遇到换行符，则增加 `linesCount` 的计数，并更新 `lastNewLinePos` 为当前位置 `i`。

接下来，函数更新位置信息的偏移量 (`offset`)，行号 (`line`) 和列号 (`column`)。偏移量增加 `numberOfCharacters`，行号增加 `linesCount`，列号的计算有两种情况：
- 如果没有遇到换行符，列号增加 `numberOfCharacters`。
- 如果遇到了换行符，列号为 `numberOfCharacters - lastNewLinePos`，表示当前位置相对于最后一个换行符的偏移量。

最后，函数返回更新后的位置信息对象 `pos`，表示偏移后的位置信息。

总结而言，`advancePositionWithMutation` 函数用于在给定的源代码位置信息上进行位置偏移，并返回更新后的位置信息对象。函数通过计算字符数量、换行符的数量和最后一个换行符的位置来更新偏移量、行号和列号。这个函数会直接修改原始位置信息对象。
 */
export function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length
): Position {
  let linesCount = 0
  let lastNewLinePos = -1
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* newline char code */) {
      linesCount++
      lastNewLinePos = i
    }
  }

  pos.offset += numberOfCharacters
  pos.line += linesCount
  pos.column =
    lastNewLinePos === -1
      ? pos.column + numberOfCharacters
      : numberOfCharacters - lastNewLinePos

  return pos
}
/**
 * 
 * @param condition 
 * @param msg 
 * `assert` 函数用于在编译器中检查条件是否为真，如果条件为假，则抛出一个错误。它的作用类似于断言，用于确保在编译器中的某个特定点条件是满足的。如果条件不满足，就会抛出一个错误，其中的错误信息可以是可选的。

这个函数的实现很简单，如果 `condition` 为假，则抛出一个错误，错误信息为 `msg`，如果没有提供 `msg`，则使用默认的错误信息 "unexpected compiler condition"。

在生产环境下 (`__TEST__` 为假)，这个函数会被 `istabul` 忽略，所以不会影响到生产代码。但在测试环境中 (`__TEST__` 为真)，这个函数会起到断言的作用，帮助检查代码的正确性。
 */
export function assert(condition: boolean, msg?: string) {
  /* istanbul ignore if */
  if (!condition) {
    throw new Error(msg || `unexpected compiler condition`)
  }
}
/**
 * 
 * @param node 
 * @param name 
 * @param allowEmpty 
 * @returns 
 * `findDir` 函数用于在元素节点的属性列表中查找指令节点（DirectiveNode）。它接受一个元素节点 `node`、一个指令名称 `name`，以及一个可选的参数 `allowEmpty`。

函数会遍历元素节点的属性列表，对每个属性进行判断。如果属性是指令节点，并且满足以下条件之一，则返回该指令节点：

- `allowEmpty` 为真，或者属性的表达式部分存在（即非空）。
- `name` 是字符串，且与属性的名称相等。
- `name` 是正则表达式，且属性的名称匹配该正则表达式。

如果未找到匹配的指令节点，函数会返回 `undefined`。

函数的实现很简单，通过遍历属性列表，逐个判断属性是否满足条件。如果找到匹配的指令节点，就返回该节点；否则返回 `undefined`。

注意：这个函数只会返回第一个匹配的指令节点，如果需要找到所有匹配的指令节点，可以进行适当的修改。
 */
export function findDir(
  node: ElementNode,
  name: string | RegExp,
  allowEmpty: boolean = false
): DirectiveNode | undefined {
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i]
    if (
      p.type === NodeTypes.DIRECTIVE &&
      (allowEmpty || p.exp) &&
      (isString(name) ? p.name === name : name.test(p.name))
    ) {
      return p
    }
  }
}
/**
 * 
 * @param node 
 * @param name 
 * @param dynamicOnly 
 * @param allowEmpty 
 * @returns 
 * `findProp` 函数用于在元素节点的属性列表中查找属性节点（AttributeNode）。它接受一个元素节点 `node`、一个属性名称 `name`，以及两个可选参数 `dynamicOnly` 和 `allowEmpty`。

函数会遍历元素节点的属性列表，对每个属性进行判断。根据以下条件之一进行匹配判断：

- 如果 `dynamicOnly` 为真，则只匹配动态绑定的属性（即带有 `bind` 指令的属性）。
  - 属性节点类型为 `ATTRIBUTE` 时，跳过当前属性继续下一轮循环。
  - 属性节点类型为 `ATTRIBUTE` 时，如果属性名称与 `name` 相等，且属性值存在（非空），则返回该属性节点。
- 如果 `dynamicOnly` 为假，则匹配静态属性和动态绑定的属性。
  - 属性节点类型为 `ATTRIBUTE` 时，如果属性名称与 `name` 相等，且属性值存在（非空），则返回该属性节点。
  - 属性节点类型为 `BIND` 时，如果 `arg` 与 `name` 相等，且表达式部分存在（非空），则返回该属性节点。

如果未找到匹配的属性节点，函数会返回 `undefined`。

函数的实现通过遍历属性列表，根据不同的节点类型进行判断，返回匹配的属性节点或 `undefined`。

需要注意的是，函数只会返回第一个匹配的属性节点。如果需要找到所有匹配的属性节点，可以进行适当的修改。
 */
export function findProp(
  node: ElementNode,
  name: string,
  dynamicOnly: boolean = false,
  allowEmpty: boolean = false
): ElementNode['props'][0] | undefined {
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i]
    if (p.type === NodeTypes.ATTRIBUTE) {
      if (dynamicOnly) continue
      if (p.name === name && (p.value || allowEmpty)) {
        return p
      }
    } else if (
      p.name === 'bind' &&
      (p.exp || allowEmpty) &&
      isStaticArgOf(p.arg, name)
    ) {
      return p
    }
  }
}
/**
 * 
 * @param arg 
 * @param name 
 * @returns 
 * `isStaticArgOf` 函数用于判断指令节点（DirectiveNode）的参数是否为静态表达式，并且其内容与给定的名称 `name` 相等。它接受一个指令节点的参数 `arg` 和一个名称 `name`。

函数首先判断参数 `arg` 是否存在，并且是否为静态表达式（通过调用 `isStaticExp` 函数进行判断）。如果参数是静态表达式，并且其内容与给定的名称 `name` 相等，则函数返回 `true`，表示参数是静态的且与指定名称匹配。

如果参数不满足以上条件，函数返回 `false`，表示参数不是静态的或者与指定名称不匹配。

函数的实现很简单，只需进行简单的条件判断和比较即可。
 */
export function isStaticArgOf(
  arg: DirectiveNode['arg'],
  name: string
): boolean {
  return !!(arg && isStaticExp(arg) && arg.content === name)
}

export function hasDynamicKeyVBind(node: ElementNode): boolean {
  return node.props.some(
    p =>
      p.type === NodeTypes.DIRECTIVE &&
      p.name === 'bind' &&
      (!p.arg || // v-bind="obj"
        p.arg.type !== NodeTypes.SIMPLE_EXPRESSION || // v-bind:[_ctx.foo]
        !p.arg.isStatic) // v-bind:[foo]
  )
}
/**
 * 
 * @param node 
 * @returns 
 * `isText` 函数用于判断给定的节点（`node`）是否为文本节点或插值节点。它接受一个节点作为参数，并返回一个布尔值表示判断结果。

函数通过比较节点的类型（`type`）来确定节点是否为文本节点或插值节点。如果节点的类型是 `NodeTypes.INTERPOLATION` 或 `NodeTypes.TEXT`，则函数返回 `true`，表示节点是文本节点或插值节点。

如果节点的类型不是文本节点或插值节点，则函数返回 `false`，表示节点不是文本节点或插值节点。

该函数的实现非常简单，只需通过节点的类型进行判断即可。
 */
export function isText(
  node: TemplateChildNode
): node is TextNode | InterpolationNode {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT
}
/**
 * 
 * @param p 
 * @returns 
 * `isVSlot` 函数用于判断给定的属性节点（`p`）是否为插槽指令节点。它接受一个属性节点作为参数，并返回一个布尔值表示判断结果。

函数通过比较属性节点的类型（`type`）和名称（`name`）来确定节点是否为插槽指令节点。如果属性节点的类型是 `NodeTypes.DIRECTIVE` 并且名称是 `'slot'`，则函数返回 `true`，表示节点是插槽指令节点。

如果属性节点的类型不是插槽指令节点或名称不是 `'slot'`，则函数返回 `false`，表示节点不是插槽指令节点。

该函数的实现很简单，只需通过属性节点的类型和名称进行判断即可。
 */
export function isVSlot(p: ElementNode['props'][0]): p is DirectiveNode {
  return p.type === NodeTypes.DIRECTIVE && p.name === 'slot'
}
/**
 * 
 * @param node 
 * @returns 
 * `isTemplateNode` 函数用于判断给定的节点（`node`）是否为模板节点。它接受一个节点作为参数，并返回一个布尔值表示判断结果。

函数通过比较节点的类型（`type`）和标签类型（`tagType`）来确定节点是否为模板节点。如果节点的类型是 `NodeTypes.ELEMENT` 并且标签类型是 `ElementTypes.TEMPLATE`，则函数返回 `true`，表示节点是模板节点。

如果节点的类型不是模板节点或标签类型不是 `ElementTypes.TEMPLATE`，则函数返回 `false`，表示节点不是模板节点。

该函数的实现很简单，只需通过节点的类型和标签类型进行判断即可。
 */
export function isTemplateNode(
  node: RootNode | TemplateChildNode
): node is TemplateNode {
  return (
    node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.TEMPLATE
  )
}
/**
 * 
 * @param node 
 * @returns 
 * `isSlotOutlet` 函数用于判断给定的节点（`node`）是否为插槽节点。它接受一个节点作为参数，并返回一个布尔值表示判断结果。

函数通过比较节点的类型（`type`）和标签类型（`tagType`）来确定节点是否为插槽节点。如果节点的类型是 `NodeTypes.ELEMENT` 并且标签类型是 `ElementTypes.SLOT`，则函数返回 `true`，表示节点是插槽节点。

如果节点的类型不是插槽节点或标签类型不是 `ElementTypes.SLOT`，则函数返回 `false`，表示节点不是插槽节点。

该函数的实现也很简单，只需通过节点的类型和标签类型进行判断即可。
 */
export function isSlotOutlet(
  node: RootNode | TemplateChildNode
): node is SlotOutletNode {
  return node.type === NodeTypes.ELEMENT && node.tagType === ElementTypes.SLOT
}
/**
 * `propsHelperSet` 是一个 `Set` 数据结构，用于存储一组特定的常量值。在这个代码片段中，`propsHelperSet` 存储了两个常量值，分别是 `NORMALIZE_PROPS` 和 `GUARD_REACTIVE_PROPS`。

`Set` 是 JavaScript 中的一种数据结构，它允许你存储不重复的值。你可以使用 `Set` 来存储一组相关的值，并且可以快速地判断一个值是否在集合中。

在这里，`propsHelperSet` 用于存储特定的常量值，以便在需要的时候进行判断或处理。你可以通过 `Set` 的 `has` 方法来检查一个值是否存在于集合中，例如 `propsHelperSet.has(NORMALIZE_PROPS)` 将返回 `true` 或 `false`，表示集合中是否包含 `NORMALIZE_PROPS` 这个常量值。
 */
const propsHelperSet = new Set([NORMALIZE_PROPS, GUARD_REACTIVE_PROPS])
/**
 * 
 * @param props 
 * @param callPath 
 * @returns 
 * `getUnnormalizedProps` 函数接受 `props` 和 `callPath` 作为参数，并返回一个包含未规范化的 `props` 和 `callPath` 的数组。

该函数首先检查 `props` 是否被定义且不是字符串，并且其类型是 `NodeTypes.JS_CALL_EXPRESSION`。如果满足这些条件，它会检查 `props` 的 `callee` 是否不是字符串，并且是否存在于 `propsHelperSet` 集合中。

如果 `callee` 存在于 `propsHelperSet` 中，函数会递归调用 `getUnnormalizedProps`，并将第一个参数设为 `props.arguments[0]`（即调用表达式的第一个参数），并将 `callPath` 附加上当前的 `props`。这样可以实现递归处理嵌套的调用表达式。
 */
function getUnnormalizedProps(
  props: PropsExpression | '{}',
  callPath: CallExpression[] = []
): [PropsExpression | '{}', CallExpression[]] {
  if (
    props &&
    !isString(props) &&
    props.type === NodeTypes.JS_CALL_EXPRESSION
  ) {
    const callee = props.callee
    if (!isString(callee) && propsHelperSet.has(callee)) {
      return getUnnormalizedProps(
        props.arguments[0] as PropsExpression,
        callPath.concat(props)
      )
    }
  }
  return [props, callPath]
}
/**
 * 
 * @param node 
 * @param prop 
 * @param context 
 * `injectProp` 函数用于向节点（`node`）注入属性（`prop`）。它接受节点、属性和转换上下文作为参数。

函数首先定义了一个变量 `propsWithInjection`，用于存储注入属性后的新属性表达式或调用表达式。然后根据节点的类型，获取真实的属性对象 `props`，以便在规范化之前使用。

如果 `props` 为 `null` 或字符串类型，则创建一个新的对象表达式，只包含注入的属性。

如果 `props` 是一个调用表达式，则将注入的属性添加到调用表达式的参数列表中。如果调用表达式的 `callee` 是 `toHandlers`，则使用 `mergeProps` 辅助函数将注入的属性与原有属性进行合并。否则，将注入的属性作为第一个参数插入到调用表达式的参数列表中。

如果 `props` 是一个对象表达式，则将注入的属性插入到属性列表的最前面。

如果 `props` 是一个单独的 `v-bind` 表达式，其中包含表达式，则创建一个合并后的替代表达式，使用 `mergeProps` 辅助函数将注入的属性与原有属性进行合并。

在注入属性后，如果存在父级调用表达式（`parentCall`），则更新父级调用表达式的参数。否则，更新节点的属性。

最后，函数返回注入属性后的节点。
 */
export function injectProp(
  node: VNodeCall | RenderSlotCall,
  prop: Property,
  context: TransformContext
) {
  let propsWithInjection: ObjectExpression | CallExpression | undefined
  /**
   * 1. mergeProps(...)
   * 2. toHandlers(...)
   * 3. normalizeProps(...)
   * 4. normalizeProps(guardReactiveProps(...))
   *
   * we need to get the real props before normalization
   */
  let props =
    node.type === NodeTypes.VNODE_CALL ? node.props : node.arguments[2]
  let callPath: CallExpression[] = []
  let parentCall: CallExpression | undefined
  if (
    props &&
    !isString(props) &&
    props.type === NodeTypes.JS_CALL_EXPRESSION
  ) {
    const ret = getUnnormalizedProps(props)
    props = ret[0]
    callPath = ret[1]
    parentCall = callPath[callPath.length - 1]
  }

  if (props == null || isString(props)) {
    propsWithInjection = createObjectExpression([prop])
  } else if (props.type === NodeTypes.JS_CALL_EXPRESSION) {
    // merged props... add ours
    // only inject key to object literal if it's the first argument so that
    // if doesn't override user provided keys
    const first = props.arguments[0] as string | JSChildNode
    if (!isString(first) && first.type === NodeTypes.JS_OBJECT_EXPRESSION) {
      // #6631
      if (!hasProp(prop, first)) {
        first.properties.unshift(prop)
      }
    } else {
      if (props.callee === TO_HANDLERS) {
        // #2366
        propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [
          createObjectExpression([prop]),
          props
        ])
      } else {
        props.arguments.unshift(createObjectExpression([prop]))
      }
    }
    !propsWithInjection && (propsWithInjection = props)
  } else if (props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
    if (!hasProp(prop, props)) {
      props.properties.unshift(prop)
    }
    propsWithInjection = props
  } else {
    // single v-bind with expression, return a merged replacement
    propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [
      createObjectExpression([prop]),
      props
    ])
    // in the case of nested helper call, e.g. `normalizeProps(guardReactiveProps(props))`,
    // it will be rewritten as `normalizeProps(mergeProps({ key: 0 }, props))`,
    // the `guardReactiveProps` will no longer be needed
    if (parentCall && parentCall.callee === GUARD_REACTIVE_PROPS) {
      parentCall = callPath[callPath.length - 2]
    }
  }
  if (node.type === NodeTypes.VNODE_CALL) {
    if (parentCall) {
      parentCall.arguments[0] = propsWithInjection
    } else {
      node.props = propsWithInjection
    }
  } else {
    if (parentCall) {
      parentCall.arguments[0] = propsWithInjection
    } else {
      node.arguments[2] = propsWithInjection
    }
  }
}

// check existing key to avoid overriding user provided keys
/**
 * 
 * @param prop 
 * @param props 
 * @returns 
 * `hasProp` 函数用于检查属性对象 `props` 中是否存在与给定属性 `prop` 匹配的键。

函数首先将结果初始化为 `false`。然后检查属性 `prop` 的键的类型是否为 `SIMPLE_EXPRESSION`，如果是，则获取属性键的内容。

接下来，使用 `Array.prototype.some` 方法遍历属性对象 `props` 的属性列表。对于每个属性，检查其键的类型是否为 `SIMPLE_EXPRESSION`，并且内容是否与属性键的内容匹配。如果存在匹配的属性键，则将结果设置为 `true`。

最后，函数返回结果，表示属性对象 `props` 是否存在与给定属性 `prop` 匹配的键。
 */
function hasProp(prop: Property, props: ObjectExpression) {
  let result = false
  if (prop.key.type === NodeTypes.SIMPLE_EXPRESSION) {
    const propKeyName = prop.key.content
    result = props.properties.some(
      p =>
        p.key.type === NodeTypes.SIMPLE_EXPRESSION &&
        p.key.content === propKeyName
    )
  }
  return result
}
/**
 * 
 * @param name 
 * @param type 
 * @returns 
 * `toValidAssetId` 函数用于将给定的名称 `name` 转换为有效的资源标识符。根据资源的类型 `type`，函数在生成的标识符前添加相应的前缀。

函数首先创建一个替换后的标识符字符串，初始值为 `_${type}_`。然后，使用正则表达式 `/[^\w]/g` 对名称 `name` 进行匹配，找到非单词字符（除了字母、数字和下划线以外的字符）。

对于每个匹配项，使用替换函数 `(searchValue, replaceValue) => {...}` 进行处理。如果匹配项是连字符 `-`，则将其替换为下划线 `_`；否则，将匹配项的字符编码转换为字符串，并添加到替换后的标识符字符串中。

最后，函数返回生成的有效资源标识符。

例如，如果 `name` 是 `"my-component"`，且 `type` 是 `"component"`，则函数将返回 `"_component_my_component"`。
 */
export function toValidAssetId(
  name: string,
  type: 'component' | 'directive' | 'filter'
): string {
  // see issue#4422, we need adding identifier on validAssetId if variable `name` has specific character
  return `_${type}_${name.replace(/[^\w]/g, (searchValue, replaceValue) => {
    return searchValue === '-' ? '_' : name.charCodeAt(replaceValue).toString()
  })}`
}

// Check if a node contains expressions that reference current context scope ids
/**
 * 
 * @param node 
 * @param ids 
 * @returns 
 * `hasScopeRef` 函数用于检查给定节点 `node` 是否包含与标识符列表 `ids` 中的作用域引用相关联的内容。该函数递归地遍历节点的属性、子节点和条件分支，并根据节点类型进行相应的处理。

如果节点为空或标识符列表为空，则返回 `false`。

根据节点的类型，进行如下处理：

- 对于元素节点（`NodeTypes.ELEMENT`）：
  - 遍历节点的属性，并对每个指令属性（`NodeTypes.DIRECTIVE`）检查参数（`p.arg`）和表达式（`p.exp`）是否包含作用域引用。如果存在作用域引用，则返回 `true`。
  - 遍历节点的子节点，并对每个子节点递归调用 `hasScopeRef`。如果存在作用域引用，则返回 `true`。
- 对于循环节点（`NodeTypes.FOR`）：
  - 检查循环节点的源表达式（`node.source`）是否包含作用域引用。如果存在作用域引用，则返回 `true`。
  - 遍历节点的子节点，并对每个子节点递归调用 `hasScopeRef`。如果存在作用域引用，则返回 `true`。
- 对于条件节点（`NodeTypes.IF`）：
  - 遍历条件分支（`node.branches`），对每个分支递归调用 `hasScopeRef`。如果存在作用域引用，则返回 `true`。
- 对于条件分支节点（`NodeTypes.IF_BRANCH`）：
  - 检查条件节点的条件表达式（`node.condition`）是否包含作用域引用。如果存在作用域引用，则返回 `true`。
  - 遍历节点的子节点，并对每个子节点递归调用 `hasScopeRef`。如果存在作用域引用，则返回 `true`。
- 对于简单表达式节点（`NodeTypes.SIMPLE_EXPRESSION`）：
  - 检查节点是否为非静态表达式（`!node.isStatic`）。
  - 检查节点的内容是否为简单标识符，并且在标识符列表 `ids` 中存在相应的标识符。如果是，则返回 `true`。
- 对于复合表达式节点（`NodeTypes.COMPOUND_EXPRESSION`）：
  - 遍历节点的子节点，并对每个子节点进行递归调用 `hasScopeRef`。如果存在作用域引用，则返回 `true`。
- 对于插值节点（`NodeTypes.INTERPOLATION`）和文本调用节点（`NodeTypes.TEXT_CALL`）：
  - 检查节点的内容是否包含作用域引用。如果存在作用域引用，则返回 `true`。
- 对于文本节点（`NodeTypes.TEXT`）和注释节点（`NodeTypes.COMMENT`）：
  - 返回 `false`，因为文本节点和注释节点不包含作用域引用。
-

 对于其他未涵盖的节点类型，如果处于开发环境（`__DEV__`），则抛出错误。返回 `false`。

最终，如果在遍历过程中没有找到作用域引用，函数返回 `false`。

注意：函数中的 `isObject` 和 `isSimpleIdentifier` 是辅助函数，用于判断节点的类型。
 */
export function hasScopeRef(
  node: TemplateChildNode | IfBranchNode | ExpressionNode | undefined,
  ids: TransformContext['identifiers']
): boolean {
  if (!node || Object.keys(ids).length === 0) {
    return false
  }
  switch (node.type) {
    case NodeTypes.ELEMENT:
      for (let i = 0; i < node.props.length; i++) {
        const p = node.props[i]
        if (
          p.type === NodeTypes.DIRECTIVE &&
          (hasScopeRef(p.arg, ids) || hasScopeRef(p.exp, ids))
        ) {
          return true
        }
      }
      return node.children.some(c => hasScopeRef(c, ids))
    case NodeTypes.FOR:
      if (hasScopeRef(node.source, ids)) {
        return true
      }
      return node.children.some(c => hasScopeRef(c, ids))
    case NodeTypes.IF:
      return node.branches.some(b => hasScopeRef(b, ids))
    case NodeTypes.IF_BRANCH:
      if (hasScopeRef(node.condition, ids)) {
        return true
      }
      return node.children.some(c => hasScopeRef(c, ids))
    case NodeTypes.SIMPLE_EXPRESSION:
      return (
        !node.isStatic &&
        isSimpleIdentifier(node.content) &&
        !!ids[node.content]
      )
    case NodeTypes.COMPOUND_EXPRESSION:
      return node.children.some(c => isObject(c) && hasScopeRef(c, ids))
    case NodeTypes.INTERPOLATION:
    case NodeTypes.TEXT_CALL:
      return hasScopeRef(node.content, ids)
    case NodeTypes.TEXT:
    case NodeTypes.COMMENT:
      return false
    default:
      if (__DEV__) {
        const exhaustiveCheck: never = node
        exhaustiveCheck
      }
      return false
  }
}
/**
 * 
 * @param node 
 * @returns 
 * `getMemoedVNodeCall` 函数用于获取经过记忆化的 VNode 调用节点。该函数接受一个节点参数 `node`，可以是 `BlockCodegenNode` 或 `MemoExpression` 类型。

函数的逻辑如下：

- 首先判断节点的类型是否为 `JS_CALL_EXPRESSION`，并且调用者（`node.callee`）是否为 `WITH_MEMO`。如果是，则表示该节点经过记忆化处理。
- 返回记忆化节点的第二个参数的返回值，类型断言为 `VNodeCall`。这个返回值就是记忆化的 VNode 调用节点。
- 如果节点类型不是记忆化节点，则直接返回该节点。

注意：函数假设传入的节点 `node` 是经过正确处理的，并且调用者为 `WITH_MEMO`。如果节点类型不符合预期，函数可能会返回不正确的结果。
 */
export function getMemoedVNodeCall(node: BlockCodegenNode | MemoExpression) {
  if (node.type === NodeTypes.JS_CALL_EXPRESSION && node.callee === WITH_MEMO) {
    return node.arguments[1].returns as VNodeCall
  } else {
    return node
  }
}
