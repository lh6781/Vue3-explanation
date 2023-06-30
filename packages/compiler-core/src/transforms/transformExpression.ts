// - Parse expressions in templates into compound expressions so that each
//   identifier gets more accurate source-map locations.
//
// - Prefix identifiers with `_ctx.` or `$xxx` (for known binding types) so that
//   they are accessed from the right source
//
// - This transform is only applied in non-browser builds because it relies on
//   an additional JavaScript parser. In the browser, there is no source-map
//   support and the code is wrapped in `with (this) { ... }`.
import { NodeTransform, TransformContext } from '../transform'
import {
  NodeTypes,
  createSimpleExpression,
  ExpressionNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  createCompoundExpression,
  ConstantTypes
} from '../ast'
import {
  isInDestructureAssignment,
  isStaticProperty,
  isStaticPropertyKey,
  walkIdentifiers
} from '../babelUtils'
import { advancePositionWithClone, isSimpleIdentifier } from '../utils'
import {
  isGloballyAllowed,
  makeMap,
  hasOwn,
  isString,
  genPropsAccessExp
} from '@vue/shared'
import { createCompilerError, ErrorCodes } from '../errors'
import {
  Node,
  Identifier,
  AssignmentExpression,
  UpdateExpression
} from '@babel/types'
import { validateBrowserExpression } from '../validateExpression'
import { parse } from '@babel/parser'
import { IS_REF, UNREF } from '../runtimeHelpers'
import { BindingTypes } from '../options'
/**
 * `isLiteralWhitelisted` 是一个函数调用表达式，用于创建一个检查字面量是否在白名单中的函数。以下是代码的解释：

```javascript
const isLiteralWhitelisted = /*#__PURE__ makeMap('true,false,null,this')
```

函数 `makeMap` 接受一个以逗号分隔的字符串参数，该字符串包含要包含在白名单中的字面量。该函数的作用是创建一个函数，该函数可以用于检查给定的字面量是否在白名单中。

函数调用表达式 `makeMap('true,false,null,this')` 返回的结果被赋值给常量 `isLiteralWhitelisted`。这个常量实际上是一个函数，它可以接受一个参数，用于检查该参数是否在白名单中。

例如，调用 `isLiteralWhitelisted('true')` 将返回 `true`，因为 `'true'` 在白名单中。调用 `isLiteralWhitelisted('foo')` 将返回 `false`，因为 `'foo'` 不在白名单中。

通过使用 `isLiteralWhitelisted` 函数，可以检查特定的字面量是否在预定义的白名单中。
 */
const isLiteralWhitelisted = /*#__PURE__*/ makeMap('true,false,null,this')

// a heuristic safeguard to bail constant expressions on presence of
// likely function invocation and member access
/**
 * `constantBailRE` 是一个正则表达式，用于匹配代码中需要进行常量提取的情况。以下是对该正则表达式的解释：

```javascript
const constantBailRE = /\w\s*\(|\.[^\d]/
```

正则表达式的模式由两部分组成：

1. `\w\s*\(`: 匹配以字母、数字或下划线开头，后跟零个或多个空格，以及一个左括号 `(` 的模式。该模式用于匹配以函数调用的形式出现的代码片段，例如 `foo(` 或 `bar (`.
2. `\.[^\d]`: 匹配以点号 `.` 开头，后面不是数字的模式。该模式用于匹配以点号开头的属性访问表达式，并确保点号后面不是数字，例如 `obj.property`。

因此，`constantBailRE` 可以用于在代码中找到需要进行常量提取的位置。这些位置通常是在函数调用或属性访问的情况下，以确保提取的值是常量而不是表达式。
 */
const constantBailRE = /\w\s*\(|\.[^\d]/
/**
 * 
 * @param node 
 * @param context
 *  这是一个导出的 `transformExpression` 函数，它是一个节点转换函数（`NodeTransform`）用于在编译器的 AST 转换阶段对表达式进行处理。以下是对该函数的解释：

```javascript
export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(
      node.content as SimpleExpressionNode,
      context
    )
  } else if (node.type === NodeTypes.ELEMENT) {
    // 处理元素上的指令
    for (let i = 0; i < node.props.length; i++) {
      const dir = node.props[i]
      // 对于 v-on 和 v-for，不进行处理，因为它们有特殊处理方式
      if (dir.type === NodeTypes.DIRECTIVE && dir.name !== 'for') {
        const exp = dir.exp
        const arg = dir.arg
        // 对于 v-on:arg，不处理 exp，因为需要对内联语句进行特殊处理
        if (
          exp &&
          exp.type === NodeTypes.SIMPLE_EXPRESSION &&
          !(dir.name === 'on' && arg)
        ) {
          dir.exp = processExpression(
            exp,
            context,
            // 对于 slot 指令，将其参数处理为函数参数
            dir.name === 'slot'
          )
        }
        if (arg && arg.type === NodeTypes.SIMPLE_EXPRESSION && !arg.isStatic) {
          dir.arg = processExpression(arg, context)
        }
      }
    }
  }
}
```

该函数的作用是对表达式节点进行转换处理。具体来说：

- 如果节点类型是插值表达式（`INTERPOLATION`），则调用 `processExpression` 函数对插值表达式中的内容进行处理。
- 如果节点类型是元素（`ELEMENT`），则遍历元素上的属性，对指令进行处理。对于除了 `v-on` 和 `v-for` 之外的指令，如果存在表达式（`exp`）并且不是 `v-on:arg` 的情况，调用 `processExpression` 函数对表达式进行处理。同时，如果存在参数（`arg`）并且不是静态的，则也调用 `processExpression` 函数对参数进行处理。

总体而言，`transformExpression` 函数用于在编译器的 AST 转换阶段对表达式进行转换处理，以便在后续的编译过程中得到正确的结果。
 */
export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(
      node.content as SimpleExpressionNode,
      context
    )
  } else if (node.type === NodeTypes.ELEMENT) {
    // handle directives on element
    for (let i = 0; i < node.props.length; i++) {
      const dir = node.props[i]
      // do not process for v-on & v-for since they are special handled
      if (dir.type === NodeTypes.DIRECTIVE && dir.name !== 'for') {
        const exp = dir.exp
        const arg = dir.arg
        // do not process exp if this is v-on:arg - we need special handling
        // for wrapping inline statements.
        if (
          exp &&
          exp.type === NodeTypes.SIMPLE_EXPRESSION &&
          !(dir.name === 'on' && arg)
        ) {
          dir.exp = processExpression(
            exp,
            context,
            // slot args must be processed as function params
            dir.name === 'slot'
          )
        }
        if (arg && arg.type === NodeTypes.SIMPLE_EXPRESSION && !arg.isStatic) {
          dir.arg = processExpression(arg, context)
        }
      }
    }
  }
}
/**
 * 这是一个名为 `PrefixMeta` 的接口（interface）的定义。它描述了一个具有以下属性的对象类型：

- `prefix?: string`：可选属性，表示前缀字符串。
- `isConstant: boolean`：表示一个布尔值，指示是否为常量。
- `start: number`：表示起始位置的数字。
- `end: number`：表示结束位置的数字。
- `scopeIds?: Set<string>`：可选属性，表示作用域标识的集合。

该接口用于描述具有上述属性的对象，以便在代码中使用这些属性进行类型检查和约束。
 */
interface PrefixMeta {
  prefix?: string
  isConstant: boolean
  start: number
  end: number
  scopeIds?: Set<string>
}

// Important: since this function uses Node.js only dependencies, it should
// always be used with a leading !__BROWSER__ check so that it can be
// tree-shaken from the browser build.
/**
 * 
 * @param node 
 * @param context 
 * @param asParams 
 * @param asRawStatements 
 * @param localVars 
 * @returns 
 * 这是一个名为 `transformExpression` 的函数，用于转换表达式节点。它接受以下参数：

- `node: SimpleExpressionNode`：要处理的表达式节点。
- `context: TransformContext`：转换的上下文对象。
- `asParams = false`：一个布尔值，指示是否将某些表达式解析为函数参数。默认为 `false`。
- `asRawStatements = false`：一个布尔值，指示是否将某些表达式解析为原始语句。默认为 `false`。
- `localVars: Record<string, number> = Object.create(context.identifiers)`：局部变量对象，用于存储本地变量和标识符。默认为一个新对象，其中包含上下文标识符的副本。

该函数根据传入的表达式节点类型进行不同的处理逻辑：

- 如果节点类型为 `INTERPOLATION`，则将节点内容作为简单表达式节点传递给 `processExpression` 函数进行处理。
- 如果节点类型为 `ELEMENT`，则遍历节点的属性列表，并对每个指令进行处理。
  - 对于类型为 `DIRECTIVE` 且指令名称不为 `'for'` 的指令，如果存在表达式 `exp`，则将其作为简单表达式节点传递给 `processExpression` 函数进行处理。
  - 如果存在参数 `arg`，且其类型为 `SIMPLE_EXPRESSION` 且不是静态的，则将其作为简单表达式节点传递给 `processExpression` 函数进行处理。

最后，根据处理结果返回相应的节点。
 */
export function processExpression(
  node: SimpleExpressionNode,
  context: TransformContext,
  // some expressions like v-slot props & v-for aliases should be parsed as
  // function params
  asParams = false,
  // v-on handler values may contain multiple statements
  asRawStatements = false,
  localVars: Record<string, number> = Object.create(context.identifiers)
): ExpressionNode {
  if (__BROWSER__) {
    if (__DEV__) {
      // simple in-browser validation (same logic in 2.x)
      validateBrowserExpression(node, context, asParams, asRawStatements)
    }
    return node
  }

  if (!context.prefixIdentifiers || !node.content.trim()) {
    return node
  }

  const { inline, bindingMetadata } = context
  const rewriteIdentifier = (raw: string, parent?: Node, id?: Identifier) => {
    const type = hasOwn(bindingMetadata, raw) && bindingMetadata[raw]
    if (inline) {
      // x = y
      const isAssignmentLVal =
        parent && parent.type === 'AssignmentExpression' && parent.left === id
      // x++
      const isUpdateArg =
        parent && parent.type === 'UpdateExpression' && parent.argument === id
      // ({ x } = y)
      const isDestructureAssignment =
        parent && isInDestructureAssignment(parent, parentStack)

      if (
        isConst(type) ||
        type === BindingTypes.SETUP_REACTIVE_CONST ||
        localVars[raw]
      ) {
        return raw
      } else if (type === BindingTypes.SETUP_REF) {
        return `${raw}.value`
      } else if (type === BindingTypes.SETUP_MAYBE_REF) {
        // const binding that may or may not be ref
        // if it's not a ref, then assignments don't make sense -
        // so we ignore the non-ref assignment case and generate code
        // that assumes the value to be a ref for more efficiency
        return isAssignmentLVal || isUpdateArg || isDestructureAssignment
          ? `${raw}.value`
          : `${context.helperString(UNREF)}(${raw})`
      } else if (type === BindingTypes.SETUP_LET) {
        if (isAssignmentLVal) {
          // let binding.
          // this is a bit more tricky as we need to cover the case where
          // let is a local non-ref value, and we need to replicate the
          // right hand side value.
          // x = y --> isRef(x) ? x.value = y : x = y
          const { right: rVal, operator } = parent as AssignmentExpression
          const rExp = rawExp.slice(rVal.start! - 1, rVal.end! - 1)
          const rExpString = stringifyExpression(
            processExpression(
              createSimpleExpression(rExp, false),
              context,
              false,
              false,
              knownIds
            )
          )
          return `${context.helperString(IS_REF)}(${raw})${
            context.isTS ? ` //@ts-ignore\n` : ``
          } ? ${raw}.value ${operator} ${rExpString} : ${raw}`
        } else if (isUpdateArg) {
          // make id replace parent in the code range so the raw update operator
          // is removed
          id!.start = parent!.start
          id!.end = parent!.end
          const { prefix: isPrefix, operator } = parent as UpdateExpression
          const prefix = isPrefix ? operator : ``
          const postfix = isPrefix ? `` : operator
          // let binding.
          // x++ --> isRef(a) ? a.value++ : a++
          return `${context.helperString(IS_REF)}(${raw})${
            context.isTS ? ` //@ts-ignore\n` : ``
          } ? ${prefix}${raw}.value${postfix} : ${prefix}${raw}${postfix}`
        } else if (isDestructureAssignment) {
          // TODO
          // let binding in a destructure assignment - it's very tricky to
          // handle both possible cases here without altering the original
          // structure of the code, so we just assume it's not a ref here
          // for now
          return raw
        } else {
          return `${context.helperString(UNREF)}(${raw})`
        }
      } else if (type === BindingTypes.PROPS) {
        // use __props which is generated by compileScript so in ts mode
        // it gets correct type
        return genPropsAccessExp(raw)
      } else if (type === BindingTypes.PROPS_ALIASED) {
        // prop with a different local alias (from defineProps() destructure)
        return genPropsAccessExp(bindingMetadata.__propsAliases![raw])
      }
    } else {
      if (
        (type && type.startsWith('setup')) ||
        type === BindingTypes.LITERAL_CONST
      ) {
        // setup bindings in non-inline mode
        return `$setup.${raw}`
      } else if (type === BindingTypes.PROPS_ALIASED) {
        return `$props['${bindingMetadata.__propsAliases![raw]}']`
      } else if (type) {
        return `$${type}.${raw}`
      }
    }

    // fallback to ctx
    return `_ctx.${raw}`
  }

  // fast path if expression is a simple identifier.
  const rawExp = node.content
  // bail constant on parens (function invocation) and dot (member access)
  const bailConstant = constantBailRE.test(rawExp)

  if (isSimpleIdentifier(rawExp)) {
    const isScopeVarReference = context.identifiers[rawExp]
    const isAllowedGlobal = isGloballyAllowed(rawExp)
    const isLiteral = isLiteralWhitelisted(rawExp)
    if (!asParams && !isScopeVarReference && !isAllowedGlobal && !isLiteral) {
      // const bindings exposed from setup can be skipped for patching but
      // cannot be hoisted to module scope
      if (isConst(bindingMetadata[node.content])) {
        node.constType = ConstantTypes.CAN_SKIP_PATCH
      }
      node.content = rewriteIdentifier(rawExp)
    } else if (!isScopeVarReference) {
      if (isLiteral) {
        node.constType = ConstantTypes.CAN_STRINGIFY
      } else {
        node.constType = ConstantTypes.CAN_HOIST
      }
    }
    return node
  }

  let ast: any
  // exp needs to be parsed differently:
  // 1. Multiple inline statements (v-on, with presence of `;`): parse as raw
  //    exp, but make sure to pad with spaces for consistent ranges
  // 2. Expressions: wrap with parens (for e.g. object expressions)
  // 3. Function arguments (v-for, v-slot): place in a function argument position
  const source = asRawStatements
    ? ` ${rawExp} `
    : `(${rawExp})${asParams ? `=>{}` : ``}`
  try {
    ast = parse(source, {
      plugins: context.expressionPlugins
    }).program
  } catch (e: any) {
    context.onError(
      createCompilerError(
        ErrorCodes.X_INVALID_EXPRESSION,
        node.loc,
        undefined,
        e.message
      )
    )
    return node
  }

  type QualifiedId = Identifier & PrefixMeta
  const ids: QualifiedId[] = []
  const parentStack: Node[] = []
  const knownIds: Record<string, number> = Object.create(context.identifiers)

  walkIdentifiers(
    ast,
    (node, parent, _, isReferenced, isLocal) => {
      if (isStaticPropertyKey(node, parent!)) {
        return
      }
      // v2 wrapped filter call
      if (__COMPAT__ && node.name.startsWith('_filter_')) {
        return
      }

      const needPrefix = isReferenced && canPrefix(node)
      if (needPrefix && !isLocal) {
        if (isStaticProperty(parent!) && parent.shorthand) {
          // property shorthand like { foo }, we need to add the key since
          // we rewrite the value
          ;(node as QualifiedId).prefix = `${node.name}: `
        }
        node.name = rewriteIdentifier(node.name, parent, node)
        ids.push(node as QualifiedId)
      } else {
        // The identifier is considered constant unless it's pointing to a
        // local scope variable (a v-for alias, or a v-slot prop)
        if (!(needPrefix && isLocal) && !bailConstant) {
          ;(node as QualifiedId).isConstant = true
        }
        // also generate sub-expressions for other identifiers for better
        // source map support. (except for property keys which are static)
        ids.push(node as QualifiedId)
      }
    },
    true, // invoke on ALL identifiers
    parentStack,
    knownIds
  )

  // We break up the compound expression into an array of strings and sub
  // expressions (for identifiers that have been prefixed). In codegen, if
  // an ExpressionNode has the `.children` property, it will be used instead of
  // `.content`.
  const children: CompoundExpressionNode['children'] = []
  ids.sort((a, b) => a.start - b.start)
  ids.forEach((id, i) => {
    // range is offset by -1 due to the wrapping parens when parsed
    const start = id.start - 1
    const end = id.end - 1
    const last = ids[i - 1]
    const leadingText = rawExp.slice(last ? last.end - 1 : 0, start)
    if (leadingText.length || id.prefix) {
      children.push(leadingText + (id.prefix || ``))
    }
    const source = rawExp.slice(start, end)
    children.push(
      createSimpleExpression(
        id.name,
        false,
        {
          source,
          start: advancePositionWithClone(node.loc.start, source, start),
          end: advancePositionWithClone(node.loc.start, source, end)
        },
        id.isConstant ? ConstantTypes.CAN_STRINGIFY : ConstantTypes.NOT_CONSTANT
      )
    )
    if (i === ids.length - 1 && end < rawExp.length) {
      children.push(rawExp.slice(end))
    }
  })

  let ret
  if (children.length) {
    ret = createCompoundExpression(children, node.loc)
  } else {
    ret = node
    ret.constType = bailConstant
      ? ConstantTypes.NOT_CONSTANT
      : ConstantTypes.CAN_STRINGIFY
  }
  ret.identifiers = Object.keys(knownIds)
  return ret
}
/**
 * 
 * @param id 
 * @returns 
 * 这是一个名为 `canPrefix` 的函数，用于判断是否可以给标识符添加前缀。它接受一个标识符对象 `id` 作为参数。

函数的逻辑如下：

- 首先，检查标识符的名称是否是在全局允许列表中，如果是，则返回 `false`，表示不可以添加前缀。
- 接下来，检查标识符的名称是否是 `'require'`，如果是，则返回 `false`，表示不可以添加前缀。
- 如果以上两个条件都不满足，则返回 `true`，表示可以给标识符添加前缀。

该函数的作用是判断一个标识符是否可以被修改，是否可以在其前面添加前缀。特定的全局变量和关键词可能不允许添加前缀，因此需要进行排除。
 */
function canPrefix(id: Identifier) {
  // skip whitelisted globals
  if (isGloballyAllowed(id.name)) {
    return false
  }
  // special case for webpack compilation
  if (id.name === 'require') {
    return false
  }
  return true
}
/**
 * 
 * @param exp 
 * @returns 
 * 这是一个名为 `stringifyExpression` 的函数，用于将表达式转换为字符串。它接受一个表达式节点对象 `exp` 或字符串作为参数。

函数的逻辑如下：

- 首先，检查参数 `exp` 是否是字符串类型，如果是，则直接返回该字符串。
- 接下来，检查参数 `exp` 的类型是否是 `NodeTypes.SIMPLE_EXPRESSION`，如果是，则返回该表达式节点的内容。
- 如果以上两个条件都不满足，则将 `exp` 视为复合表达式节点，遍历其子节点，并递归调用 `stringifyExpression` 函数将每个子节点转换为字符串，然后使用 `join('')` 将所有子节点的字符串拼接起来。

该函数的作用是将表达式节点或字符串表示的表达式转换为字符串形式。它可以用于在代码生成过程中将表达式转换为可执行的字符串代码。
 */
export function stringifyExpression(exp: ExpressionNode | string): string {
  if (isString(exp)) {
    return exp
  } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
    return exp.content
  } else {
    return (exp.children as (ExpressionNode | string)[])
      .map(stringifyExpression)
      .join('')
  }
}
/**
 * 
 * @param type 
 * @returns 
 * 这是一个名为 `isConst` 的函数，用于检查给定的类型是否表示常量绑定。

函数接受一个参数 `type`，该参数的类型为 `unknown`，即可以是任意类型的值。

函数的逻辑如下：

- 检查参数 `type` 是否等于 `BindingTypes.SETUP_CONST`，如果是，则返回 `true`。
- 否则，检查参数 `type` 是否等于 `BindingTypes.LITERAL_CONST`，如果是，则返回 `true`。
- 如果以上两个条件都不满足，则返回 `false`。

该函数用于判断给定的类型是否表示常量绑定。常量绑定在编译过程中具有特殊的处理逻辑，可能会被优化或进行特殊的代码生成。
 */
function isConst(type: unknown) {
  return (
    type === BindingTypes.SETUP_CONST || type === BindingTypes.LITERAL_CONST
  )
}
