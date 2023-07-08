import {
  transformOn as baseTransform,
  DirectiveTransform,
  createObjectProperty,
  createCallExpression,
  createSimpleExpression,
  NodeTypes,
  createCompoundExpression,
  ExpressionNode,
  SimpleExpressionNode,
  isStaticExp,
  CompilerDeprecationTypes,
  TransformContext,
  SourceLocation,
  checkCompatEnabled
} from '@vue/compiler-core'
import { V_ON_WITH_MODIFIERS, V_ON_WITH_KEYS } from '../runtimeHelpers'
import { makeMap, capitalize } from '@vue/shared'
/**
 * `isEventOptionModifier` 是一个函数，用于检查给定的修饰符是否属于事件选项修饰符。

该函数通过调用 `makeMap` 函数创建了一个映射表，该映射表的键是事件选项修饰符的名称，值为 `true`。在这个映射表中，列出了三个事件选项修饰符：`passive`、`once` 和 `capture`。

调用 `isEventOptionModifier(modifier)` 可以判断给定的修饰符 `modifier` 是否是事件选项修饰符。如果是，则返回 `true`，否则返回 `false`。
 */
const isEventOptionModifier = /*#__PURE__*/ makeMap(`passive,once,capture`)
/**
 * `isNonKeyModifier` 是一个函数，用于检查给定的修饰符是否属于非键盘修饰符。

该函数通过调用 `makeMap` 函数创建了一个映射表，该映射表的键是非键盘修饰符的名称，值为 `true`。在这个映射表中，列出了一些非键盘修饰符，包括事件传播管理修饰符（`stop`、`prevent`、`self`）、系统修饰符（`ctrl`、`shift`、`alt`、`meta`、`exact`）以及鼠标修饰符（`middle`）。

调用 `isNonKeyModifier(modifier)` 可以判断给定的修饰符 `modifier` 是否是非键盘修饰符。如果是，则返回 `true`，否则返回 `false`。
 */
const isNonKeyModifier = /*#__PURE__*/ makeMap(
  // event propagation management
  `stop,prevent,self,` +
    // system modifiers + exact
    `ctrl,shift,alt,meta,exact,` +
    // mouse
    `middle`
)
// left & right could be mouse or key modifiers based on event type
/**
 * `maybeKeyModifier` 是一个函数，用于检查给定的修饰符是否可能是键盘修饰符之一。

该函数通过调用 `makeMap` 函数创建了一个映射表，该映射表的键是可能是键盘修饰符的名称，值为 `true`。在这个映射表中，列出了一些可能是键盘修饰符的修饰符，包括 `left` 和 `right`。

调用 `maybeKeyModifier(modifier)` 可以判断给定的修饰符 `modifier` 是否可能是键盘修饰符。如果是，则返回 `true`，否则返回 `false`。注意，返回 `true` 只表示该修饰符可能是键盘修饰符，具体是否是键盘修饰符还需要进一步的判断。
 */
const maybeKeyModifier = /*#__PURE__*/ makeMap('left,right')
/**
 * `isKeyboardEvent` 是一个函数，用于检查给定的事件名称是否属于键盘事件。

该函数通过调用 `makeMap` 函数创建了一个映射表，该映射表的键是键盘事件的名称，值为 `true`。在这个映射表中，列出了一些常见的键盘事件，包括 `onkeyup`、`onkeydown` 和 `onkeypress`。

调用 `isKeyboardEvent(eventName)` 可以判断给定的事件名称 `eventName` 是否属于键盘事件。如果是键盘事件，则返回 `true`，否则返回 `false`。这个函数可以用于判断事件是否与键盘交互相关，以便在相关的逻辑中进行处理。
 */
const isKeyboardEvent = /*#__PURE__*/ makeMap(
  `onkeyup,onkeydown,onkeypress`,
  true
)
/**
 * 
 * @param key 
 * @param modifiers 
 * @param context 
 * @param loc 
 * @returns 
 * `resolveModifiers` 是一个函数，用于解析修饰符（modifiers）并将其分类为键盘修饰符（keyModifiers）、非键盘修饰符（nonKeyModifiers）和事件选项修饰符（eventOptionModifiers）。

函数的参数包括 `key`（表达式节点，表示事件的键值）、`modifiers`（修饰符数组）、`context`（转换上下文对象）和 `loc`（源代码位置）。

函数首先创建了三个空数组 `keyModifiers`、`nonKeyModifiers` 和 `eventOptionModifiers`，用于存储不同类型的修饰符。

然后，函数遍历 `modifiers` 数组，对每个修饰符进行分类判断。具体分类逻辑如下：

1. 如果修饰符为 `'native'`，并且兼容模式已启用，则将其添加到 `eventOptionModifiers` 数组中。
2. 如果修饰符属于事件选项修饰符（`isEventOptionModifier(modifier)` 返回 `true`），则将其添加到 `eventOptionModifiers` 数组中。
3. 否则，根据修饰符的特征判断：
   - 如果修饰符可能是键盘修饰符（`maybeKeyModifier(modifier)` 返回 `true`），则进一步判断：
     - 如果 `key` 是静态表达式（`isStaticExp(key)` 返回 `true`），并且表示键盘事件（`isKeyboardEvent((key as SimpleExpressionNode).content)` 返回 `true`），则将修饰符添加到 `keyModifiers` 数组中。
     - 否则，将修饰符添加到 `keyModifiers` 和 `nonKeyModifiers` 数组中。
   - 如果修饰符属于非键盘修饰符（`isNonKeyModifier(modifier)` 返回 `true`），则将其添加到 `nonKeyModifiers` 数组中。
   - 否则，将修饰符添加到 `keyModifiers` 数组中。

最后，函数返回一个包含三个分类后的修饰符数组的对象 `{ keyModifiers, nonKeyModifiers, eventOptionModifiers }`。

这个函数的作用是将修饰符按照键盘修饰符、非键盘修饰符和事件选项修饰符进行分类，以便在后续的代码中根据修饰符类型执行相应的逻辑。
 */
const resolveModifiers = (
  key: ExpressionNode,
  modifiers: string[],
  context: TransformContext,
  loc: SourceLocation
) => {
  const keyModifiers = []
  const nonKeyModifiers = []
  const eventOptionModifiers = []

  for (let i = 0; i < modifiers.length; i++) {
    const modifier = modifiers[i]

    if (
      __COMPAT__ &&
      modifier === 'native' &&
      checkCompatEnabled(
        CompilerDeprecationTypes.COMPILER_V_ON_NATIVE,
        context,
        loc
      )
    ) {
      eventOptionModifiers.push(modifier)
    } else if (isEventOptionModifier(modifier)) {
      // eventOptionModifiers: modifiers for addEventListener() options,
      // e.g. .passive & .capture
      eventOptionModifiers.push(modifier)
    } else {
      // runtimeModifiers: modifiers that needs runtime guards
      if (maybeKeyModifier(modifier)) {
        if (isStaticExp(key)) {
          if (isKeyboardEvent((key as SimpleExpressionNode).content)) {
            keyModifiers.push(modifier)
          } else {
            nonKeyModifiers.push(modifier)
          }
        } else {
          keyModifiers.push(modifier)
          nonKeyModifiers.push(modifier)
        }
      } else {
        if (isNonKeyModifier(modifier)) {
          nonKeyModifiers.push(modifier)
        } else {
          keyModifiers.push(modifier)
        }
      }
    }
  }

  return {
    keyModifiers,
    nonKeyModifiers,
    eventOptionModifiers
  }
}
/**
 * 
 * @param key 
 * @param event 
 * @returns 
 * `resolveModifiers` 是一个函数，用于解析修饰符（modifiers）并将其分类为键盘修饰符（keyModifiers）、非键盘修饰符（nonKeyModifiers）和事件选项修饰符（eventOptionModifiers）。

函数的参数包括 `key`（表达式节点，表示事件的键值）、`modifiers`（修饰符数组）、`context`（转换上下文对象）和 `loc`（源代码位置）。

函数首先创建了三个空数组 `keyModifiers`、`nonKeyModifiers` 和 `eventOptionModifiers`，用于存储不同类型的修饰符。

然后，函数遍历 `modifiers` 数组，对每个修饰符进行分类判断。具体分类逻辑如下：

1. 如果修饰符为 `'native'`，并且兼容模式已启用，则将其添加到 `eventOptionModifiers` 数组中。
2. 如果修饰符属于事件选项修饰符（`isEventOptionModifier(modifier)` 返回 `true`），则将其添加到 `eventOptionModifiers` 数组中。
3. 否则，根据修饰符的特征判断：
   - 如果修饰符可能是键盘修饰符（`maybeKeyModifier(modifier)` 返回 `true`），则进一步判断：
     - 如果 `key` 是静态表达式（`isStaticExp(key)` 返回 `true`），并且表示键盘事件（`isKeyboardEvent((key as SimpleExpressionNode).content)` 返回 `true`），则将修饰符添加到 `keyModifiers` 数组中。
     - 否则，将修饰符添加到 `keyModifiers` 和 `nonKeyModifiers` 数组中。
   - 如果修饰符属于非键盘修饰符（`isNonKeyModifier(modifier)` 返回 `true`），则将其添加到 `nonKeyModifiers` 数组中。
   - 否则，将修饰符添加到 `keyModifiers` 数组中。

最后，函数返回一个包含三个分类后的修饰符数组的对象 `{ keyModifiers, nonKeyModifiers, eventOptionModifiers }`。

这个函数的作用是将修饰符按照键盘修饰符、非键盘修饰符和事件选项修饰符进行分类，以便在后续的代码中根据修饰符类型执行相应的逻辑。
 */
const transformClick = (key: ExpressionNode, event: string) => {
  const isStaticClick =
    isStaticExp(key) && key.content.toLowerCase() === 'onclick'
  return isStaticClick
    ? createSimpleExpression(event, true)
    : key.type !== NodeTypes.SIMPLE_EXPRESSION
    ? createCompoundExpression([
        `(`,
        key,
        `) === "onClick" ? "${event}" : (`,
        key,
        `)`
      ])
    : key
}
/**
 * 
 * @param dir 
 * @param node 
 * @param context 
 * @returns 
 * `transformOn` 是一个指令转换函数，用于转换 `v-on` 指令。

函数的参数包括 `dir`（指令对象）、`node`（节点对象）和 `context`（转换上下文）。

函数通过调用 `baseTransform` 来执行基本的转换操作，并传入一个回调函数来对转换结果进行进一步处理。

在回调函数中，函数首先获取指令的修饰符列表 `modifiers`。如果修饰符列表为空，则直接返回基本转换结果。

然后，函数使用 `resolveModifiers` 函数来处理修饰符。该函数根据指令的键值、修饰符列表和转换上下文来解析修饰符，将其分为键盘修饰符、非键盘修饰符和事件选项修饰符。

接下来，函数对非键盘修饰符进行处理。如果存在 `'right'` 修饰符，则将键值转换为 `onContextmenu` 事件；如果存在 `'middle'` 修饰符，则将键值转换为 `onMouseup` 事件。

然后，函数对非键盘修饰符列表进行处理。如果非键盘修饰符列表不为空，函数使用 `V_ON_WITH_MODIFIERS` 辅助函数创建一个调用表达式，将修饰符和处理函数作为参数传递给它。

接着，函数对键盘修饰符列表进行处理。如果键盘修饰符列表不为空，并且键值不是静态表达式，或者键值是键盘事件，则函数使用 `V_ON_WITH_KEYS` 辅助函数创建一个调用表达式，将修饰符和处理函数作为参数传递给它。

最后，函数对事件选项修饰符列表进行处理。如果事件选项修饰符列表不为空，函数将修饰符的首字母大写，并将其连接到键值的末尾，以生成新的键值。

最终，函数返回一个包含转换后的键值和处理函数的对象属性数组。

这个函数的作用是根据 `v-on` 指令的修饰符列表，对键值和处理函数进行转换和处理，生成最终的转换结果。转换的逻辑包括处理非键盘修饰符、键盘修饰符和事件选项修饰符，并使用相应的辅助函数进行转换和包装。
 */
export const transformOn: DirectiveTransform = (dir, node, context) => {
  return baseTransform(dir, node, context, baseResult => {
    const { modifiers } = dir
    if (!modifiers.length) return baseResult

    let { key, value: handlerExp } = baseResult.props[0]
    const { keyModifiers, nonKeyModifiers, eventOptionModifiers } =
      resolveModifiers(key, modifiers, context, dir.loc)

    // normalize click.right and click.middle since they don't actually fire
    if (nonKeyModifiers.includes('right')) {
      key = transformClick(key, `onContextmenu`)
    }
    if (nonKeyModifiers.includes('middle')) {
      key = transformClick(key, `onMouseup`)
    }

    if (nonKeyModifiers.length) {
      handlerExp = createCallExpression(context.helper(V_ON_WITH_MODIFIERS), [
        handlerExp,
        JSON.stringify(nonKeyModifiers)
      ])
    }

    if (
      keyModifiers.length &&
      // if event name is dynamic, always wrap with keys guard
      (!isStaticExp(key) || isKeyboardEvent(key.content))
    ) {
      handlerExp = createCallExpression(context.helper(V_ON_WITH_KEYS), [
        handlerExp,
        JSON.stringify(keyModifiers)
      ])
    }

    if (eventOptionModifiers.length) {
      const modifierPostfix = eventOptionModifiers.map(capitalize).join('')
      key = isStaticExp(key)
        ? createSimpleExpression(`${key.content}${modifierPostfix}`, true)
        : createCompoundExpression([`(`, key, `) + "${modifierPostfix}"`])
    }

    return {
      props: [createObjectProperty(key, handlerExp)]
    }
  })
}
