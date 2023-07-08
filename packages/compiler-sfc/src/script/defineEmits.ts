import { Identifier, LVal, Node, RestElement } from '@babel/types'
import { isCallOf } from './utils'
import { ScriptCompileContext } from './context'
import { resolveTypeElements, resolveUnionType } from './resolveType'
/**
 * `DEFINE_EMITS` 是一个常量，它的值是字符串 `'defineEmits'`。
 */
export const DEFINE_EMITS = 'defineEmits'
/**
 * 
 * @param ctx 
 * @param node 
 * @param declId 
 * @returns 
 * `processDefineEmits` 是一个函数，它接受 `ctx`、`node` 和 `declId` 作为参数。该函数用于处理 `DEFINE_EMITS`（即 `'defineEmits'`）的调用。

函数首先检查传入的 `node` 是否是 `DEFINE_EMITS` 的调用，如果不是，则返回 `false`。如果 `ctx` 中已经存在了 `DEFINE_EMITS` 的调用，函数会报错并抛出异常。

如果是有效的 `DEFINE_EMITS` 调用，函数会将 `ctx.hasDefineEmitCall` 标记为 `true`，表示已经存在了 `DEFINE_EMITS` 的调用。然后，它会将 `node.arguments[0]`（即第一个参数）赋值给 `ctx.emitsRuntimeDecl`，表示运行时声明的部分。如果 `node` 中包含类型参数（typeParameters），函数会进一步处理类型声明。如果 `ctx.emitsRuntimeDecl` 和 `node.typeParameters` 同时存在，函数会报错并抛出异常，因为不能同时使用类型和非类型参数。最后，如果传入了 `declId`，函数会将其赋值给 `ctx.emitIdentifier`，表示标识符的名称。

函数返回 `true`，表示成功处理了 `DEFINE_EMITS` 的调用。
 */
export function processDefineEmits(
  ctx: ScriptCompileContext,
  node: Node,
  declId?: LVal
): boolean {
  if (!isCallOf(node, DEFINE_EMITS)) {
    return false
  }
  if (ctx.hasDefineEmitCall) {
    ctx.error(`duplicate ${DEFINE_EMITS}() call`, node)
  }
  ctx.hasDefineEmitCall = true
  ctx.emitsRuntimeDecl = node.arguments[0]
  if (node.typeParameters) {
    if (ctx.emitsRuntimeDecl) {
      ctx.error(
        `${DEFINE_EMITS}() cannot accept both type and non-type arguments ` +
          `at the same time. Use one or the other.`,
        node
      )
    }
    ctx.emitsTypeDecl = node.typeParameters.params[0]
  }

  if (declId) {
    ctx.emitIdentifier =
      declId.type === 'Identifier' ? declId.name : ctx.getString(declId)
  }

  return true
}
/**
 * 
 * @param ctx 
 * @returns 
 * `genRuntimeEmits` 是一个函数，它接受 `ctx` 作为参数，并返回一个字符串或 `undefined`。

函数首先声明了一个变量 `emitsDecl`，初始值为空字符串。然后，函数检查 `ctx.emitsRuntimeDecl` 是否存在。如果存在，将 `ctx.emitsRuntimeDecl` 转换为字符串，并去除首尾的空格，将结果赋值给 `emitsDecl`。如果 `ctx.emitsRuntimeDecl` 不存在但 `ctx.emitsTypeDecl` 存在，函数调用 `extractRuntimeEmits` 函数提取运行时声明的事件，并将结果保存在 `typeDeclaredEmits` 变量中。然后，函数根据 `typeDeclaredEmits` 的大小来决定是否生成事件声明。如果 `typeDeclaredEmits` 非空，函数将生成一个包含事件名称的数组字符串，每个事件名称都使用 `JSON.stringify` 进行处理，并使用逗号分隔。如果 `typeDeclaredEmits` 为空，将生成一个空字符串。

接下来，函数检查 `ctx.hasDefineModelCall` 是否为 `true`，表示是否存在 `DEFINE_MODEL` 的调用。如果是，函数会生成一个包含所有模型声明的数组字符串，并将其赋值给 `modelEmitsDecl` 变量。模型声明的格式为 `update:xxx`，其中 `xxx` 是模型的名称。然后，函数检查 `emitsDecl` 是否存在。如果存在，表示之前已经生成了事件声明，函数将调用 `ctx.helper('mergeModels')` 来合并模型声明和事件声明，并将合并的结果赋值给 `emitsDecl`。如果 `emitsDecl` 不存在，表示之前没有生成事件声明，直接将 `modelEmitsDecl` 赋值给 `emitsDecl`。

最后，函数返回 `emitsDecl`，表示生成的事件声明字符串或 `undefined`。
 */
export function genRuntimeEmits(ctx: ScriptCompileContext): string | undefined {
  let emitsDecl = ''
  if (ctx.emitsRuntimeDecl) {
    emitsDecl = ctx.getString(ctx.emitsRuntimeDecl).trim()
  } else if (ctx.emitsTypeDecl) {
    const typeDeclaredEmits = extractRuntimeEmits(ctx)
    emitsDecl = typeDeclaredEmits.size
      ? `[${Array.from(typeDeclaredEmits)
          .map(k => JSON.stringify(k))
          .join(', ')}]`
      : ``
  }
  if (ctx.hasDefineModelCall) {
    let modelEmitsDecl = `[${Object.keys(ctx.modelDecls)
      .map(n => JSON.stringify(`update:${n}`))
      .join(', ')}]`
    emitsDecl = emitsDecl
      ? `${ctx.helper('mergeModels')}(${emitsDecl}, ${modelEmitsDecl})`
      : modelEmitsDecl
  }
  return emitsDecl
}
/**
 * 
 * @param ctx 
 * @returns 
 * `extractRuntimeEmits` 是一个函数，它接受 `ctx` 作为参数，并返回一个 `Set` 类型的结果。

函数首先创建了一个空的 `Set` 对象 `emits`，用于存储提取的事件名称。然后，函数获取 `ctx.emitsTypeDecl` 并断言它不为 `null` 或 `undefined`。接下来，函数根据 `node` 的类型进行不同的处理。

如果 `node` 的类型是 `'TSFunctionType'`，表示事件声明是一个函数类型，函数调用 `extractEventNames` 函数来提取函数的参数列表中的事件名称，并将提取的结果存储在 `emits` 中，然后返回 `emits`。

如果 `node` 的类型不是 `'TSFunctionType'`，则表示事件声明是一个对象类型。函数调用 `resolveTypeElements` 来解析对象类型的属性和方法，并将解析结果保存在 `props` 和 `calls` 中。

接下来，函数通过遍历 `props`，将每个属性名称添加到 `emits` 中，并将 `hasProperty` 设置为 `true` 表示存在属性。

然后，函数检查 `calls` 是否存在。如果存在，表示事件声明中包含方法调用的签名。在这种情况下，函数会检查是否同时存在属性和方法调用的签名，如果是，则抛出错误提示不能混合使用属性和方法调用的语法。然后，函数遍历每个方法调用的参数列表，调用 `extractEventNames` 函数提取参数列表中的事件名称，并将其添加到 `emits` 中。

最后，函数返回 `emits`，其中包含提取的事件名称。
 */
function extractRuntimeEmits(ctx: ScriptCompileContext): Set<string> {
  const emits = new Set<string>()
  const node = ctx.emitsTypeDecl!

  if (node.type === 'TSFunctionType') {
    extractEventNames(ctx, node.parameters[0], emits)
    return emits
  }

  const { props, calls } = resolveTypeElements(ctx, node)

  let hasProperty = false
  for (const key in props) {
    emits.add(key)
    hasProperty = true
  }

  if (calls) {
    if (hasProperty) {
      ctx.error(
        `defineEmits() type cannot mixed call signature and property syntax.`,
        node
      )
    }
    for (const call of calls) {
      extractEventNames(ctx, call.parameters[0], emits)
    }
  }

  return emits
}
/**
 * 
 * @param ctx 
 * @param eventName 
 * @param emits
 * `extractEventNames` 是一个函数，它接受 `ctx`、`eventName` 和 `emits` 作为参数，用于提取事件名称并将其添加到 `emits` 中。

函数首先检查 `eventName` 的类型是否为 `'Identifier'`，并且存在类型注解，并且类型注解的类型为 `'TSTypeAnnotation'`。如果满足这些条件，表示事件名称具有类型注解。

接下来，函数调用 `resolveUnionType` 函数来解析事件名称的联合类型，并将解析结果保存在 `types` 中。

然后，函数遍历 `types` 数组中的每个类型。如果类型是 `'TSLiteralType'`，表示事件名称是一个字面量类型。在这种情况下，函数检查字面量的类型是否为 `'UnaryExpression'` 或 `'TemplateLiteral'`，如果不是，则将字面量的值转换为字符串，并将其添加到 `emits` 中。

最后，函数结束执行，事件名称已经被提取并添加到了 `emits` 中。 
 */
function extractEventNames(
  ctx: ScriptCompileContext,
  eventName: Identifier | RestElement,
  emits: Set<string>
) {
  if (
    eventName.type === 'Identifier' &&
    eventName.typeAnnotation &&
    eventName.typeAnnotation.type === 'TSTypeAnnotation'
  ) {
    const types = resolveUnionType(ctx, eventName.typeAnnotation.typeAnnotation)

    for (const type of types) {
      if (type.type === 'TSLiteralType') {
        if (
          type.literal.type !== 'UnaryExpression' &&
          type.literal.type !== 'TemplateLiteral'
        ) {
          emits.add(String(type.literal.value))
        }
      }
    }
  }
}
