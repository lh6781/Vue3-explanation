import {
  createStructuralDirectiveTransform,
  TransformContext
} from '../transform'
import {
  NodeTypes,
  ExpressionNode,
  createSimpleExpression,
  SourceLocation,
  SimpleExpressionNode,
  createCallExpression,
  createFunctionExpression,
  createObjectExpression,
  createObjectProperty,
  ForCodegenNode,
  RenderSlotCall,
  SlotOutletNode,
  ElementNode,
  DirectiveNode,
  ForNode,
  PlainElementNode,
  createVNodeCall,
  VNodeCall,
  ForRenderListExpression,
  BlockCodegenNode,
  ForIteratorExpression,
  ConstantTypes,
  createBlockStatement,
  createCompoundExpression,
  getVNodeBlockHelper,
  getVNodeHelper
} from '../ast'
import { createCompilerError, ErrorCodes } from '../errors'
import {
  getInnerRange,
  findProp,
  isTemplateNode,
  isSlotOutlet,
  injectProp,
  findDir
} from '../utils'
import {
  RENDER_LIST,
  OPEN_BLOCK,
  FRAGMENT,
  IS_MEMO_SAME
} from '../runtimeHelpers'
import { processExpression } from './transformExpression'
import { validateBrowserExpression } from '../validateExpression'
import { PatchFlags, PatchFlagNames } from '@vue/shared'
/**
 * 这段代码定义了 `transformFor` 函数，用于处理 `v-for` 指令的转换逻辑。

`transformFor` 是一个由 `createStructuralDirectiveTransform` 创建的结构化指令转换函数。它接受三个参数：
- `'for'`：指令名称，表示这是处理 `v-for` 指令的转换函数。
- 回调函数 `(node, dir, context) => { ... }`：用于定义 `v-for` 指令的转换逻辑。

在回调函数中，首先通过调用 `processFor` 函数处理 `v-for` 指令的解析结果，并返回一个用于创建循环渲染函数的表达式。

接下来，根据一些条件判断和配置信息，构建循环渲染函数的参数和选项，然后使用 `createVNodeCall` 创建一个表示循环渲染的虚拟节点。

最后，返回一个函数作为转换结果。这个函数会在节点退出时被调用，用于完成循环渲染的代码生成。

总体来说，`transformFor` 函数用于将 `v-for` 指令转换为循环渲染的代码。它处理 `v-for` 指令的解析结果，生成循环渲染函数的参数和选项，并创建一个表示循环渲染的虚拟节点。最后，返回一个函数用于完成循环渲染的代码生成。
 */
export const transformFor = createStructuralDirectiveTransform(
  'for',
  (node, dir, context) => {
    const { helper, removeHelper } = context
    return processFor(node, dir, context, forNode => {
      // create the loop render function expression now, and add the
      // iterator on exit after all children have been traversed
      const renderExp = createCallExpression(helper(RENDER_LIST), [
        forNode.source
      ]) as ForRenderListExpression
      const isTemplate = isTemplateNode(node)
      const memo = findDir(node, 'memo')
      const keyProp = findProp(node, `key`)
      const keyExp =
        keyProp &&
        (keyProp.type === NodeTypes.ATTRIBUTE
          ? createSimpleExpression(keyProp.value!.content, true)
          : keyProp.exp!)
      const keyProperty = keyProp ? createObjectProperty(`key`, keyExp!) : null

      if (!__BROWSER__ && isTemplate) {
        // #2085 / #5288 process :key and v-memo expressions need to be
        // processed on `<template v-for>`. In this case the node is discarded
        // and never traversed so its binding expressions won't be processed
        // by the normal transforms.
        if (memo) {
          memo.exp = processExpression(
            memo.exp! as SimpleExpressionNode,
            context
          )
        }
        if (keyProperty && keyProp!.type !== NodeTypes.ATTRIBUTE) {
          keyProperty.value = processExpression(
            keyProperty.value as SimpleExpressionNode,
            context
          )
        }
      }

      const isStableFragment =
        forNode.source.type === NodeTypes.SIMPLE_EXPRESSION &&
        forNode.source.constType > ConstantTypes.NOT_CONSTANT
      const fragmentFlag = isStableFragment
        ? PatchFlags.STABLE_FRAGMENT
        : keyProp
        ? PatchFlags.KEYED_FRAGMENT
        : PatchFlags.UNKEYED_FRAGMENT

      forNode.codegenNode = createVNodeCall(
        context,
        helper(FRAGMENT),
        undefined,
        renderExp,
        fragmentFlag +
          (__DEV__ ? ` /* ${PatchFlagNames[fragmentFlag]} */` : ``),
        undefined,
        undefined,
        true /* isBlock */,
        !isStableFragment /* disableTracking */,
        false /* isComponent */,
        node.loc
      ) as ForCodegenNode

      return () => {
        // finish the codegen now that all children have been traversed
        let childBlock: BlockCodegenNode
        const { children } = forNode

        // check <template v-for> key placement
        if ((__DEV__ || !__BROWSER__) && isTemplate) {
          node.children.some(c => {
            if (c.type === NodeTypes.ELEMENT) {
              const key = findProp(c, 'key')
              if (key) {
                context.onError(
                  createCompilerError(
                    ErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT,
                    key.loc
                  )
                )
                return true
              }
            }
          })
        }

        const needFragmentWrapper =
          children.length !== 1 || children[0].type !== NodeTypes.ELEMENT
        const slotOutlet = isSlotOutlet(node)
          ? node
          : isTemplate &&
            node.children.length === 1 &&
            isSlotOutlet(node.children[0])
          ? (node.children[0] as SlotOutletNode) // api-extractor somehow fails to infer this
          : null

        if (slotOutlet) {
          // <slot v-for="..."> or <template v-for="..."><slot/></template>
          childBlock = slotOutlet.codegenNode as RenderSlotCall
          if (isTemplate && keyProperty) {
            // <template v-for="..." :key="..."><slot/></template>
            // we need to inject the key to the renderSlot() call.
            // the props for renderSlot is passed as the 3rd argument.
            injectProp(childBlock, keyProperty, context)
          }
        } else if (needFragmentWrapper) {
          // <template v-for="..."> with text or multi-elements
          // should generate a fragment block for each loop
          childBlock = createVNodeCall(
            context,
            helper(FRAGMENT),
            keyProperty ? createObjectExpression([keyProperty]) : undefined,
            node.children,
            PatchFlags.STABLE_FRAGMENT +
              (__DEV__
                ? ` /* ${PatchFlagNames[PatchFlags.STABLE_FRAGMENT]} */`
                : ``),
            undefined,
            undefined,
            true,
            undefined,
            false /* isComponent */
          )
        } else {
          // Normal element v-for. Directly use the child's codegenNode
          // but mark it as a block.
          childBlock = (children[0] as PlainElementNode)
            .codegenNode as VNodeCall
          if (isTemplate && keyProperty) {
            injectProp(childBlock, keyProperty, context)
          }
          if (childBlock.isBlock !== !isStableFragment) {
            if (childBlock.isBlock) {
              // switch from block to vnode
              removeHelper(OPEN_BLOCK)
              removeHelper(
                getVNodeBlockHelper(context.inSSR, childBlock.isComponent)
              )
            } else {
              // switch from vnode to block
              removeHelper(
                getVNodeHelper(context.inSSR, childBlock.isComponent)
              )
            }
          }
          childBlock.isBlock = !isStableFragment
          if (childBlock.isBlock) {
            helper(OPEN_BLOCK)
            helper(getVNodeBlockHelper(context.inSSR, childBlock.isComponent))
          } else {
            helper(getVNodeHelper(context.inSSR, childBlock.isComponent))
          }
        }

        if (memo) {
          const loop = createFunctionExpression(
            createForLoopParams(forNode.parseResult, [
              createSimpleExpression(`_cached`)
            ])
          )
          loop.body = createBlockStatement([
            createCompoundExpression([`const _memo = (`, memo.exp!, `)`]),
            createCompoundExpression([
              `if (_cached`,
              ...(keyExp ? [` && _cached.key === `, keyExp] : []),
              ` && ${context.helperString(
                IS_MEMO_SAME
              )}(_cached, _memo)) return _cached`
            ]),
            createCompoundExpression([`const _item = `, childBlock as any]),
            createSimpleExpression(`_item.memo = _memo`),
            createSimpleExpression(`return _item`)
          ])
          renderExp.arguments.push(
            loop as ForIteratorExpression,
            createSimpleExpression(`_cache`),
            createSimpleExpression(String(context.cached++))
          )
        } else {
          renderExp.arguments.push(
            createFunctionExpression(
              createForLoopParams(forNode.parseResult),
              childBlock,
              true /* force newline */
            ) as ForIteratorExpression
          )
        }
      }
    })
  }
)

// target-agnostic transform used for both Client and SSR
/**
 * 
 * @param node 
 * @param dir 
 * @param context 
 * @param processCodegen 
 * @returns 
 * 这段代码定义了 `processFor` 函数，用于处理 `v-for` 指令的解析和转换。

`processFor` 函数接受四个参数：
- `node: ElementNode`：`v-for` 指令所在的元素节点。
- `dir: DirectiveNode`：`v-for` 指令节点。
- `context: TransformContext`：转换上下文对象。
- `processCodegen?: (forNode: ForNode) => (() => void) | undefined`：可选的用于处理代码生成的回调函数。

在函数内部，首先检查 `v-for` 指令是否具有表达式，如果没有，则抛出相应的编译错误。

然后，调用 `parseForExpression` 函数解析 `v-for` 指令的表达式，得到解析结果对象 `parseResult`。

如果解析失败，会抛出相应的编译错误。

接下来，根据解析结果和上下文信息，构造一个 `ForNode` 对象，表示 `v-for` 循环节点，并将它替换掉原始的节点。

在处理过程中，还会进行一些作用域管理和标识符的处理。

最后，返回一个函数作为退出函数。在退出时，会进行一些清理操作，包括作用域管理和标识符的移除，并调用可选的 `processCodegen` 回调函数。

总体来说，`processFor` 函数用于解析和转换 `v-for` 指令。它会解析 `v-for` 指令的表达式，构造一个 `ForNode` 对象来表示循环节点，并在转换过程中进行作用域管理和标识符处理。最后，返回一个退出函数用于清理操作，并可选地调用 `processCodegen` 回调函数来处理代码生成。
 */
export function processFor(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext,
  processCodegen?: (forNode: ForNode) => (() => void) | undefined
) {
  if (!dir.exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_NO_EXPRESSION, dir.loc)
    )
    return
  }

  const parseResult = parseForExpression(
    // can only be simple expression because vFor transform is applied
    // before expression transform.
    dir.exp as SimpleExpressionNode,
    context
  )

  if (!parseResult) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION, dir.loc)
    )
    return
  }

  const { addIdentifiers, removeIdentifiers, scopes } = context
  const { source, value, key, index } = parseResult

  const forNode: ForNode = {
    type: NodeTypes.FOR,
    loc: dir.loc,
    source,
    valueAlias: value,
    keyAlias: key,
    objectIndexAlias: index,
    parseResult,
    children: isTemplateNode(node) ? node.children : [node]
  }

  context.replaceNode(forNode)

  // bookkeeping
  scopes.vFor++
  if (!__BROWSER__ && context.prefixIdentifiers) {
    // scope management
    // inject identifiers to context
    value && addIdentifiers(value)
    key && addIdentifiers(key)
    index && addIdentifiers(index)
  }

  const onExit = processCodegen && processCodegen(forNode)

  return () => {
    scopes.vFor--
    if (!__BROWSER__ && context.prefixIdentifiers) {
      value && removeIdentifiers(value)
      key && removeIdentifiers(key)
      index && removeIdentifiers(index)
    }
    if (onExit) onExit()
  }
}
/**
 * 这是一个正则表达式 `forAliasRE`，用于匹配 `v-for` 指令中的迭代别名和迭代源。

正则表达式的模式如下：

```javascript
/([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
```

该正则表达式包含两个捕获组：
1. 第一个捕获组 `([\s\S]*?)` 用于匹配迭代别名，它可以匹配任意字符（包括换行符），但尽量少匹配（非贪婪模式）。
2. 第二个捕获组 `([\s\S]*)` 用于匹配迭代源，它可以匹配任意字符（包括换行符）。

正则表达式中的 `(?:in|of)` 表示匹配字符串 "in" 或 "of"，但不捕获该部分。

这个正则表达式可以用于提取 `v-for` 指令中的迭代别名和迭代源。例如，对于 `v-for` 表达式 `"item in items"`，使用该正则表达式可以匹配到迭代别名为 `"item"`，迭代源为 `"items"`。

请注意，这个正则表达式只适用于简单的 `v-for` 表达式，例如 `"item in items"` 或 `"item of items"`。对于更复杂的 `v-for` 表达式，例如带有索引或键的表达式，这个正则表达式可能无法完全匹配。
 */
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
// This regex doesn't cover the case if key or index aliases have destructuring,
// but those do not make sense in the first place, so this works in practice.
/**
 * 这是一个正则表达式 `forIteratorRE`，用于匹配 `v-for` 指令中的迭代器部分。

正则表达式的模式如下：

```javascript
/,([^,\}\]]*)(?:,([^,\}\]]*))?$/
```

该正则表达式包含两个捕获组：
1. 第一个捕获组 `([^,\}\]]*)` 用于匹配迭代器的值别名，它匹配逗号后面的任意字符，直到遇到下一个逗号、右大括号或右方括号。
2. 第二个捕获组 `([^,\}\]]*)` 用于匹配迭代器的键别名，它与第一个捕获组的模式相同。

正则表达式中的 `(?:,([^,\}\]]*))?` 表示逗号后面的部分是可选的，并且可以捕获一个额外的键别名。

这个正则表达式可以用于提取 `v-for` 指令中的迭代器部分，包括值别名和键别名（如果有）。例如，对于 `v-for` 表达式 `"item in items"`，使用该正则表达式可以匹配到值别名为 `"item"`，而键别名为空。对于 `v-for` 表达式 `"value, key in object"`，该正则表达式可以匹配到值别名为 `"value"`，键别名为 `"key"`。

请注意，这个正则表达式假设迭代器部分的语法是正确的，即逗号后面应该跟着值别名，而可选的第二个逗号后面是键别名。如果迭代器部分的语法不正确，可能会导致匹配结果不准确。
 */
const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/
/**
 * 这是一个正则表达式 `stripParensRE`，用于去除字符串两端的圆括号。

正则表达式的模式如下：

```javascript
/^\(|\)$/g
```

该正则表达式包含两个部分：
1. `^\(` 匹配以左圆括号开头的字符串。
2. `\)$` 匹配以右圆括号结尾的字符串。

结合起来，`/^\(|\)$/g` 可以匹配字符串两端的圆括号，包括左圆括号和右圆括号。

通过使用正则表达式的 `replace` 方法，将匹配到的圆括号替换为空字符串，就可以去除字符串两端的圆括号。

例如，对于字符串 `(example)`，使用该正则表达式可以将两端的圆括号去除，得到结果 `"example"`。

请注意，该正则表达式只去除字符串两端的圆括号，不会匹配或替换字符串中间的圆括号。
 */
const stripParensRE = /^\(|\)$/g
/**
 * 这是一个接口 `ForParseResult`，它描述了 `v-for` 指令解析后的结果。

接口定义如下：

```typescript
export interface ForParseResult {
  source: ExpressionNode;      // 循环源表达式
  value: ExpressionNode | undefined;   // 值的别名表达式（可选）
  key: ExpressionNode | undefined;     // 键的别名表达式（可选）
  index: ExpressionNode | undefined;   // 索引的别名表达式（可选）
}
```

- `source` 字段表示循环的源表达式，它是一个 `ExpressionNode` 类型的节点，描述了源数据。
- `value` 字段表示循环中每一项的值的别名表达式，它是一个 `ExpressionNode` 类型的节点，用于表示当前循环项的值。它是可选的，如果没有指定值的别名，则该字段的值为 `undefined`。
- `key` 字段表示循环中每一项的键的别名表达式，它是一个 `ExpressionNode` 类型的节点，用于表示当前循环项的键。它是可选的，如果没有指定键的别名，则该字段的值为 `undefined`。
- `index` 字段表示循环中每一项的索引的别名表达式，它是一个 `ExpressionNode` 类型的节点，用于表示当前循环项的索引。它是可选的，如果没有指定索引的别名，则该字段的值为 `undefined`。

这个接口的作用是将 `v-for` 指令解析后的相关信息组织在一起，方便后续的处理和代码生成。
 */
export interface ForParseResult {
  source: ExpressionNode
  value: ExpressionNode | undefined
  key: ExpressionNode | undefined
  index: ExpressionNode | undefined
}
/**
 * 
 * @param input 
 * @param context 
 * @returns 
 * 该函数用于解析 `v-for` 指令的表达式，并返回解析后的结果。

函数签名如下：

```typescript
export function parseForExpression(
  input: SimpleExpressionNode,
  context: TransformContext
): ForParseResult | undefined
```

参数：
- `input`：一个 `SimpleExpressionNode` 类型的节点，表示 `v-for` 指令的表达式。
- `context`：一个 `TransformContext` 类型的对象，表示转换上下文。

返回值：
- 如果成功解析了 `v-for` 表达式，则返回一个 `ForParseResult` 类型的对象，包含解析后的信息。
- 如果无法解析 `v-for` 表达式，则返回 `undefined`。

函数的具体实现逻辑如下：

1. 提取表达式的位置信息和内容。
2. 使用正则表达式 `forAliasRE` 匹配 `LHS` 和 `RHS`。
   - `LHS` 表示循环项的别名和可选的索引别名和键别名。
   - `RHS` 表示循环的源数据。
3. 如果正则匹配失败，则返回 `undefined`。
4. 创建一个初始的 `ForParseResult` 对象，并设置 `source` 字段为循环的源表达式。
5. 如果支持 `prefixIdentifiers`，则对源表达式进行处理。
6. 如果在开发环境下，检查源表达式是否是浏览器保留字。
7. 提取循环项的别名。
8. 使用正则表达式 `forIteratorRE` 匹配循环项的索引别名和键别名。
9. 如果匹配成功，则提取键别名和索引别名，并对它们进行处理。
10. 如果循环项的别名存在，则对其进行处理。
11. 返回解析后的 `ForParseResult` 对象。

总结起来，该函数的作用是解析 `v-for` 指令的表达式，提取循环的源数据、循环项的别名、键别名和索引别名，并返回解析后的结果。
 */
export function parseForExpression(
  input: SimpleExpressionNode,
  context: TransformContext
): ForParseResult | undefined {
  const loc = input.loc
  const exp = input.content
  const inMatch = exp.match(forAliasRE)
  if (!inMatch) return

  const [, LHS, RHS] = inMatch

  const result: ForParseResult = {
    source: createAliasExpression(
      loc,
      RHS.trim(),
      exp.indexOf(RHS, LHS.length)
    ),
    value: undefined,
    key: undefined,
    index: undefined
  }
  if (!__BROWSER__ && context.prefixIdentifiers) {
    result.source = processExpression(
      result.source as SimpleExpressionNode,
      context
    )
  }
  if (__DEV__ && __BROWSER__) {
    validateBrowserExpression(result.source as SimpleExpressionNode, context)
  }

  let valueContent = LHS.trim().replace(stripParensRE, '').trim()
  const trimmedOffset = LHS.indexOf(valueContent)

  const iteratorMatch = valueContent.match(forIteratorRE)
  if (iteratorMatch) {
    valueContent = valueContent.replace(forIteratorRE, '').trim()

    const keyContent = iteratorMatch[1].trim()
    let keyOffset: number | undefined
    if (keyContent) {
      keyOffset = exp.indexOf(keyContent, trimmedOffset + valueContent.length)
      result.key = createAliasExpression(loc, keyContent, keyOffset)
      if (!__BROWSER__ && context.prefixIdentifiers) {
        result.key = processExpression(result.key, context, true)
      }
      if (__DEV__ && __BROWSER__) {
        validateBrowserExpression(
          result.key as SimpleExpressionNode,
          context,
          true
        )
      }
    }

    if (iteratorMatch[2]) {
      const indexContent = iteratorMatch[2].trim()

      if (indexContent) {
        result.index = createAliasExpression(
          loc,
          indexContent,
          exp.indexOf(
            indexContent,
            result.key
              ? keyOffset! + keyContent.length
              : trimmedOffset + valueContent.length
          )
        )
        if (!__BROWSER__ && context.prefixIdentifiers) {
          result.index = processExpression(result.index, context, true)
        }
        if (__DEV__ && __BROWSER__) {
          validateBrowserExpression(
            result.index as SimpleExpressionNode,
            context,
            true
          )
        }
      }
    }
  }

  if (valueContent) {
    result.value = createAliasExpression(loc, valueContent, trimmedOffset)
    if (!__BROWSER__ && context.prefixIdentifiers) {
      result.value = processExpression(result.value, context, true)
    }
    if (__DEV__ && __BROWSER__) {
      validateBrowserExpression(
        result.value as SimpleExpressionNode,
        context,
        true
      )
    }
  }

  return result
}
/**
 * 
 * @param range 
 * @param content 
 * @param offset 
 * @returns 
 * 该函数用于创建一个别名表达式节点。

函数签名如下：

```typescript
function createAliasExpression(
  range: SourceLocation,
  content: string,
  offset: number
): SimpleExpressionNode
```

参数：
- `range`：一个 `SourceLocation` 类型的对象，表示表达式的位置范围。
- `content`：一个字符串，表示表达式的内容。
- `offset`：一个数字，表示表达式在源代码中的偏移量。

返回值：
- 返回一个 `SimpleExpressionNode` 类型的节点，表示别名表达式。

函数的具体实现逻辑如下：
1. 使用 `createSimpleExpression` 函数创建一个简单表达式节点，传入参数为：
   - `content`：表达式的内容。
   - `false`：表示该表达式不是静态的。
   - `getInnerRange(range, offset, content.length)`：使用 `getInnerRange` 函数获取表达式的内部位置范围。

该函数的作用是根据给定的位置范围、内容和偏移量创建一个别名表达式节点，并返回该节点。
 */
function createAliasExpression(
  range: SourceLocation,
  content: string,
  offset: number
): SimpleExpressionNode {
  return createSimpleExpression(
    content,
    false,
    getInnerRange(range, offset, content.length)
  )
}
/**
 * 
 * @param param0 
 * @param memoArgs 
 * @returns 
 * 该函数用于创建 `v-for` 循环的参数列表。

函数签名如下：

```typescript
function createForLoopParams(
  { value, key, index }: ForParseResult,
  memoArgs: ExpressionNode[] = []
): ExpressionNode[]
```

参数：
- `{ value, key, index }`：一个 `ForParseResult` 对象，包含 `v-for` 表达式解析的结果，包括源数据、值别名、键别名和索引别名。
- `memoArgs`：一个 `ExpressionNode` 数组，表示 `v-for` 中的 memo 参数。

返回值：
- 返回一个 `ExpressionNode` 数组，表示循环的参数列表。

函数的具体实现逻辑如下：
1. 将 `value`、`key`、`index` 和 `memoArgs` 组成一个数组。
2. 调用 `createParamsList` 函数，传入数组作为参数，创建参数列表。

该函数的作用是根据 `v-for` 表达式解析的结果和 memo 参数，创建循环的参数列表，并返回该列表。
 */
export function createForLoopParams(
  { value, key, index }: ForParseResult,
  memoArgs: ExpressionNode[] = []
): ExpressionNode[] {
  return createParamsList([value, key, index, ...memoArgs])
}
/**
 * 
 * @param args 
 * @returns 
 * 该函数用于创建参数列表。

函数签名如下：

```typescript
function createParamsList(args: (ExpressionNode | undefined)[]): ExpressionNode[]
```

参数：
- `args`：一个 `ExpressionNode` 或 `undefined` 的数组，表示参数列表。

返回值：
- 返回一个 `ExpressionNode` 数组，表示参数列表。

函数的具体实现逻辑如下：
1. 从参数列表的末尾开始往前遍历，找到第一个非 `undefined` 的参数，记录其索引为 `i`。
2. 使用 `Array.slice` 方法截取参数列表，从索引 `0` 到索引 `i+1`（不包括 `i+1`）的部分。
3. 对截取后的参数列表进行映射操作，如果参数为 `undefined`，则使用 `createSimpleExpression` 函数创建一个占位符参数，其内容为下划线 `_` 的重复字符串，长度为 `i+1`。
4. 返回映射后的参数列表。

该函数的作用是根据传入的参数列表，创建一个新的参数列表。如果原参数列表中有 `undefined`，则使用占位符参数来填充，占位符参数的内容为下划线 `_` 的重复字符串。返回的新参数列表中不包含末尾的连续 `undefined` 参数。
 */
function createParamsList(
  args: (ExpressionNode | undefined)[]
): ExpressionNode[] {
  let i = args.length
  while (i--) {
    if (args[i]) break
  }
  return args
    .slice(0, i + 1)
    .map((arg, i) => arg || createSimpleExpression(`_`.repeat(i + 1), false))
}
