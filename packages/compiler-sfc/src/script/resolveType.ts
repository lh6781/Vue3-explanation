import {
  Expression,
  Identifier,
  Node,
  Statement,
  TSCallSignatureDeclaration,
  TSEnumDeclaration,
  TSExpressionWithTypeArguments,
  TSFunctionType,
  TSImportType,
  TSIndexedAccessType,
  TSInterfaceDeclaration,
  TSMappedType,
  TSMethodSignature,
  TSModuleBlock,
  TSModuleDeclaration,
  TSPropertySignature,
  TSQualifiedName,
  TSType,
  TSTypeAnnotation,
  TSTypeElement,
  TSTypeLiteral,
  TSTypeQuery,
  TSTypeReference,
  TemplateLiteral
} from '@babel/types'
import {
  UNKNOWN_TYPE,
  createGetCanonicalFileName,
  getId,
  getImportedName,
  normalizePath,
  joinPaths
} from './utils'
import { ScriptCompileContext, resolveParserPlugins } from './context'
import { ImportBinding, SFCScriptCompileOptions } from '../compileScript'
import { capitalize, hasOwn } from '@vue/shared'
import { parse as babelParse } from '@babel/parser'
import { parse } from '../parse'
import { createCache } from '../cache'
import type TS from 'typescript'
import { extname, dirname } from 'path'
import { minimatch as isMatch } from 'minimatch'

/**
 * TypeResolveContext is compatible with ScriptCompileContext
 * but also allows a simpler version of it with minimal required properties
 * when resolveType needs to be used in a non-SFC context, e.g. in a babel
 * plugin. The simplest context can be just:
 * ```ts
 * const ctx: SimpleTypeResolveContext = {
 *   filename: '...',
 *   source: '...',
 *   options: {},
 *   error() {},
 *   ast: []
 * }
 * ```
 * 这里定义了一个类型 `SimpleTypeResolveContext`，表示简单类型解析的上下文。

该类型包含以下属性：
- `source`：源代码的内容。
- `filename`：源代码所在的文件名。
- `error`：错误处理函数。
- `options`：编译选项。
- `scope`：作用域对象（可选）。
- `globalScopes`：全局作用域对象（可选）。
- `deps`：依赖模块对象（可选）。
- `fs`：文件系统对象（可选）。
- `ast`：表示脚本的语法树（Statement 数组）。

这个类型的作用是为简单类型解析提供上下文信息，包括源代码、文件名、错误处理函数、编译选项等，并可选择性地提供作用域、全局作用域、依赖模块和文件系统等。
 */
export type SimpleTypeResolveContext = Pick<
  ScriptCompileContext,
  // required
  'source' | 'filename' | 'error' | 'options'
> &
  Partial<
    Pick<ScriptCompileContext, 'scope' | 'globalScopes' | 'deps' | 'fs'>
  > & {
    ast: Statement[]
  }
/**
 * 这里定义了一个类型 `TypeResolveContext`，表示类型解析的上下文。

该类型可以是 `ScriptCompileContext` 类型或 `SimpleTypeResolveContext` 类型的对象。

`ScriptCompileContext` 包含了更多的属性，用于支持完整的脚本编译和类型解析过程。

`SimpleTypeResolveContext` 是 `ScriptCompileContext` 的子集，仅包含了用于简单类型解析所需的属性。

通过定义 `TypeResolveContext` 类型，可以在类型解析过程中灵活使用完整的编译上下文或简化的上下文对象。
 */
export type TypeResolveContext = ScriptCompileContext | SimpleTypeResolveContext
/**
 * `Import` 类型是 `ImportBinding` 类型的一个子集，只包含 `source` 和 `imported` 属性。

它表示脚本中的导入语句，其中：
- `source` 指的是导入的源模块或文件。
- `imported` 指的是具体被导入的标识符或模块。

通过使用 `Import` 类型，您可以处理导入语句并访问源和被导入的值。
 */
type Import = Pick<ImportBinding, 'source' | 'imported'>
/**
 * `WithScope` 接口定义了一个 `_ownerScope` 属性，它表示具有作用域的实体。

在这个接口中，`_ownerScope` 属性的类型是 `TypeScope`，它表示一个类型作用域。

通过实现 `WithScope` 接口并提供 `_ownerScope` 属性，您可以将作用域与实体相关联，以便在需要的时候可以访问和使用该作用域。
 */
interface WithScope {
  _ownerScope: TypeScope
}

// scope types always has ownerScope attached
/**
 * `ScopeTypeNode` 类型定义了一个节点（`Node`）并扩展了 `WithScope` 接口，同时还可以包含一个 `_ns` 属性。

`WithScope` 接口表示具有作用域的实体，而 `ScopeTypeNode` 类型进一步扩展了这个概念。它表示一个节点，该节点具有作用域，并可以在需要时使用 `_ns` 属性来表示一个带有作用域的 TS 模块声明。

通过使用 `ScopeTypeNode` 类型，可以为节点添加作用域信息，并且在需要时可以通过 `_ns` 属性访问该节点的作用域。
 */
type ScopeTypeNode = Node &
  WithScope & { _ns?: TSModuleDeclaration & WithScope }
/**
 * `TypeScope` 是一个类，它表示类型的作用域。它具有以下属性和方法：

- `filename`：文件名，表示该作用域所属的文件。
- `source`：源代码，表示该作用域所属的源代码。
- `offset`：偏移量，表示该作用域在源代码中的偏移位置。
- `imports`：导入项，一个记录了导入信息的对象。
- `types`：类型定义项，一个记录了类型定义信息的对象。
- `declares`：声明项，一个记录了声明信息的对象。

`TypeScope` 类还具有以下属性：

- `resolvedImportSources`：已解析的导入源，一个记录了已解析的导入源的对象。
- `exportedTypes`：导出的类型，一个记录了导出的类型的对象。
- `exportedDeclares`：导出的声明，一个记录了导出的声明的对象。

通过创建 `TypeScope` 实例，可以表示一个特定作用域的类型信息，并使用对象来存储导入项、类型定义项和声明项的相关信息。此外，`TypeScope` 类还提供了一些用于存储已解析的导入源和导出的类型/声明的对象，以供进一步使用。
 */
export class TypeScope {
  constructor(
    public filename: string,
    public source: string,
    public offset: number = 0,
    public imports: Record<string, Import> = Object.create(null),
    public types: Record<string, ScopeTypeNode> = Object.create(null),
    public declares: Record<string, ScopeTypeNode> = Object.create(null)
  ) {}

  resolvedImportSources: Record<string, string> = Object.create(null)
  exportedTypes: Record<string, ScopeTypeNode> = Object.create(null)
  exportedDeclares: Record<string, ScopeTypeNode> = Object.create(null)
}
/**
 * `MaybeWithScope` 是一个接口，表示可能具有作用域 `_ownerScope` 的对象。它具有一个可选属性 `_ownerScope`，该属性可以是 `TypeScope` 类型的实例，表示对象所属的作用域。

通过实现 `MaybeWithScope` 接口，可以表示具有作用域信息的对象，并在需要时使用 `_ownerScope` 属性来引用所属的 `TypeScope` 对象。
 */
export interface MaybeWithScope {
  _ownerScope?: TypeScope
}
/**
 * `ResolvedElements` 是一个接口，表示已解析的元素集合。它具有两个属性：

1. `props` 属性是一个记录类型（Record），用于存储解析后的属性。它是一个字符串到属性签名的映射。每个属性签名可以是 `TSPropertySignature` 或 `TSMethodSignature` 类型，并且都附加了 `_ownerScope` 属性，表示属性所属的作用域 `TypeScope`。

2. `calls` 属性是一个可选的数组，用于存储解析后的函数调用签名或函数类型。它可以包含 `TSCallSignatureDeclaration` 或 `TSFunctionType` 类型的元素。

通过实现 `ResolvedElements` 接口，可以将解析后的属性和函数调用签名存储在一个对象中，并为每个属性和函数签名附加所属的作用域信息。
 */
interface ResolvedElements {
  props: Record<
    string,
    (TSPropertySignature | TSMethodSignature) & {
      // resolved props always has ownerScope attached
      _ownerScope: TypeScope
    }
  >
  calls?: (TSCallSignatureDeclaration | TSFunctionType)[]
}

/**
 * Resolve arbitrary type node to a list of type elements that can be then
 * mapped to runtime props or emits.
 * `resolveTypeElements` 是一个函数，用于解析类型元素（Type Elements）并返回解析后的结果。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文，可以是 `ScriptCompileContext` 或 `SimpleTypeResolveContext` 类型。
- `node: Node & MaybeWithScope & { _resolvedElements?: ResolvedElements }`：待解析的节点，该节点可能包含作用域信息和已解析的元素缓存。
- `scope?: TypeScope`：可选参数，表示当前节点的作用域。如果未提供，则会根据上下文生成作用域。

函数的主要逻辑如下：
1. 首先，检查节点是否已经具有已解析的元素缓存，如果有，则直接返回缓存结果，避免重复解析。
2. 否则，调用 `innerResolveTypeElements` 函数进行实际的类型元素解析，并将解析结果存储在节点的 `_resolvedElements` 属性中。
3. 返回解析后的元素结果。

通过调用 `resolveTypeElements` 函数，可以对节点进行类型元素解析，并在需要时缓存解析结果，以提高性能并避免重复解析。
 */
export function resolveTypeElements(
  ctx: TypeResolveContext,
  node: Node & MaybeWithScope & { _resolvedElements?: ResolvedElements },
  scope?: TypeScope
): ResolvedElements {
  if (node._resolvedElements) {
    return node._resolvedElements
  }
  return (node._resolvedElements = innerResolveTypeElements(
    ctx,
    node,
    node._ownerScope || scope || ctxToScope(ctx)
  ))
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `innerResolveTypeElements` 是 `resolveTypeElements` 函数的内部实现，用于实际解析类型元素。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文，可以是 `ScriptCompileContext` 或 `SimpleTypeResolveContext` 类型。
- `node: Node`：待解析的节点。
- `scope: TypeScope`：当前节点的作用域。

函数根据节点的类型，执行相应的逻辑来解析类型元素，并返回解析后的结果。

函数的主要逻辑如下：
1. 根据节点的类型，执行相应的解析逻辑：
   - `TSTypeLiteral`：解析类型字面量。
   - `TSInterfaceDeclaration`：解析接口声明。
   - `TSTypeAliasDeclaration`、`TSParenthesizedType`：解析类型别名或括号中的类型。
   - `TSFunctionType`：解析函数类型。
   - `TSUnionType`、`TSIntersectionType`：解析联合类型或交叉类型。
   - `TSMappedType`：解析映射类型。
   - `TSIndexedAccessType`：解析索引访问类型。
   - `TSExpressionWithTypeArguments`、`TSTypeReference`：解析类型引用。
   - `TSImportType`：解析导入类型。
   - `TSTypeQuery`：解析类型查询。
2. 根据解析结果返回相应的元素对象。
3. 如果无法解析节点的类型，则抛出错误。

通过调用 `innerResolveTypeElements` 函数，可以实现对不同类型节点的类型元素解析，并返回解析后的结果。
 */
function innerResolveTypeElements(
  ctx: TypeResolveContext,
  node: Node,
  scope: TypeScope
): ResolvedElements {
  switch (node.type) {
    case 'TSTypeLiteral':
      return typeElementsToMap(ctx, node.members, scope)
    case 'TSInterfaceDeclaration':
      return resolveInterfaceMembers(ctx, node, scope)
    case 'TSTypeAliasDeclaration':
    case 'TSParenthesizedType':
      return resolveTypeElements(ctx, node.typeAnnotation, scope)
    case 'TSFunctionType': {
      return { props: {}, calls: [node] }
    }
    case 'TSUnionType':
    case 'TSIntersectionType':
      return mergeElements(
        node.types.map(t => resolveTypeElements(ctx, t, scope)),
        node.type
      )
    case 'TSMappedType':
      return resolveMappedType(ctx, node, scope)
    case 'TSIndexedAccessType': {
      const types = resolveIndexType(ctx, node, scope)
      return mergeElements(
        types.map(t => resolveTypeElements(ctx, t, t._ownerScope)),
        'TSUnionType'
      )
    }
    case 'TSExpressionWithTypeArguments': // referenced by interface extends
    case 'TSTypeReference': {
      const typeName = getReferenceName(node)
      if (
        (typeName === 'ExtractPropTypes' ||
          typeName === 'ExtractPublicPropTypes') &&
        node.typeParameters &&
        scope.imports[typeName]?.source === 'vue'
      ) {
        return resolveExtractPropTypes(
          resolveTypeElements(ctx, node.typeParameters.params[0], scope),
          scope
        )
      }
      const resolved = resolveTypeReference(ctx, node, scope)
      if (resolved) {
        return resolveTypeElements(ctx, resolved, resolved._ownerScope)
      } else {
        if (typeof typeName === 'string') {
          if (
            // @ts-ignore
            SupportedBuiltinsSet.has(typeName)
          ) {
            return resolveBuiltin(ctx, node, typeName as any, scope)
          } else if (typeName === 'ReturnType' && node.typeParameters) {
            // limited support, only reference types
            const ret = resolveReturnType(
              ctx,
              node.typeParameters.params[0],
              scope
            )
            if (ret) {
              return resolveTypeElements(ctx, ret, scope)
            }
          }
        }
        return ctx.error(
          `Unresolvable type reference or unsupported built-in utility type`,
          node,
          scope
        )
      }
    }
    case 'TSImportType': {
      if (
        getId(node.argument) === 'vue' &&
        node.qualifier?.type === 'Identifier' &&
        node.qualifier.name === 'ExtractPropTypes' &&
        node.typeParameters
      ) {
        return resolveExtractPropTypes(
          resolveTypeElements(ctx, node.typeParameters.params[0], scope),
          scope
        )
      }
      const sourceScope = importSourceToScope(
        ctx,
        node.argument,
        scope,
        node.argument.value
      )
      const resolved = resolveTypeReference(ctx, node, sourceScope)
      if (resolved) {
        return resolveTypeElements(ctx, resolved, resolved._ownerScope)
      }
      break
    }
    case 'TSTypeQuery':
      {
        const resolved = resolveTypeReference(ctx, node, scope)
        if (resolved) {
          return resolveTypeElements(ctx, resolved, resolved._ownerScope)
        }
      }
      break
  }
  return ctx.error(`Unresolvable type: ${node.type}`, node, scope)
}
/**
 * 
 * @param ctx 
 * @param elements 
 * @param scope 
 * @returns 
 * `typeElementsToMap` 函数用于将类型元素列表转换为映射对象。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文，可以是 `ScriptCompileContext` 或 `SimpleTypeResolveContext` 类型。
- `elements: TSTypeElement[]`：类型元素的列表。
- `scope: TypeScope`：当前节点的作用域，默认为通过 `ctxToScope` 函数从上下文中获取。

函数遍历类型元素列表，并根据每个元素的类型执行相应的逻辑：
- 对于 `TSPropertySignature` 或 `TSMethodSignature` 类型的元素，将其添加到结果对象的 `props` 属性中。如果元素具有非计算的键名，则以键名作为属性名称，将元素本身存储为值。如果键名为模板字面量，则根据解析模板字面量的结果，将元素存储在结果对象的 `props` 属性中。
- 对于 `TSCallSignatureDeclaration` 类型的元素，将其添加到结果对象的 `calls` 属性中。

最后，函数返回包含转换后的类型元素的结果对象。

通过调用 `typeElementsToMap` 函数，可以将类型元素列表转换为更便于操作的映射对象表示。
 */
function typeElementsToMap(
  ctx: TypeResolveContext,
  elements: TSTypeElement[],
  scope = ctxToScope(ctx)
): ResolvedElements {
  const res: ResolvedElements = { props: {} }
  for (const e of elements) {
    if (e.type === 'TSPropertySignature' || e.type === 'TSMethodSignature') {
      ;(e as MaybeWithScope)._ownerScope = scope
      const name = getId(e.key)
      if (name && !e.computed) {
        res.props[name] = e as ResolvedElements['props'][string]
      } else if (e.key.type === 'TemplateLiteral') {
        for (const key of resolveTemplateKeys(ctx, e.key, scope)) {
          res.props[key] = e as ResolvedElements['props'][string]
        }
      } else {
        ctx.error(
          `Unsupported computed key in type referenced by a macro`,
          e.key,
          scope
        )
      }
    } else if (e.type === 'TSCallSignatureDeclaration') {
      ;(res.calls || (res.calls = [])).push(e)
    }
  }
  return res
}
/**
 * 
 * @param maps 
 * @param type 
 * @returns 
 * `mergeElements` 函数用于合并多个类型元素映射对象。

它接受以下参数：
- `maps: ResolvedElements[]`：要合并的类型元素映射对象的数组。
- `type: 'TSUnionType' | 'TSIntersectionType'`：合并的类型，可以是联合类型（`TSUnionType`）或交叉类型（`TSIntersectionType`）。

函数执行以下操作：
- 如果 `maps` 数组长度为 1，则直接返回该元素映射对象。
- 否则，创建一个新的结果对象 `res`，其中 `props` 属性初始化为空对象。
- 遍历 `maps` 数组中的每个元素映射对象：
  - 对于每个元素映射对象的 `props` 属性中的键值对：
    - 如果结果对象 `res` 的 `props` 属性中不存在该键，则直接将键值对添加到 `res.props` 中。
    - 如果结果对象 `res` 的 `props` 属性中已经存在该键，则将两个相同键的属性合并为一个新的属性，并将其存储在 `res.props` 中。合并的属性将具有合并类型 (`type`) 和类型数组，其中包含原始属性和新属性。此外，合并后的属性继承原始属性的作用域，并且可选性由原始属性和新属性的可选性决定。
  - 如果元素映射对象具有 `calls` 属性，则将其合并到结果对象 `res` 的 `calls` 属性中。

最后，函数返回合并后的结果对象。

通过调用 `mergeElements` 函数，可以合并多个类型元素映射对象，以便获取它们的并集或交集。
 */
function mergeElements(
  maps: ResolvedElements[],
  type: 'TSUnionType' | 'TSIntersectionType'
): ResolvedElements {
  if (maps.length === 1) return maps[0]
  const res: ResolvedElements = { props: {} }
  const { props: baseProps } = res
  for (const { props, calls } of maps) {
    for (const key in props) {
      if (!hasOwn(baseProps, key)) {
        baseProps[key] = props[key]
      } else {
        baseProps[key] = createProperty(
          baseProps[key].key,
          {
            type,
            // @ts-ignore
            types: [baseProps[key], props[key]]
          },
          baseProps[key]._ownerScope,
          baseProps[key].optional || props[key].optional
        )
      }
    }
    if (calls) {
      ;(res.calls || (res.calls = [])).push(...calls)
    }
  }
  return res
}
/**
 * 
 * @param key 
 * @param typeAnnotation 
 * @param scope 
 * @param optional 
 * @returns 
 * `createProperty` 函数用于创建一个 TypeScript 属性签名（`TSPropertySignature`）对象。

它接受以下参数：
- `key: Expression`：属性的键，通常是一个表达式。
- `typeAnnotation: TSType`：属性的类型注解。
- `scope: TypeScope`：属性所属的作用域对象。
- `optional: boolean`：指示属性是否为可选的布尔值。

函数执行以下操作：
- 创建并返回一个包含以下属性的对象：
  - `type: 'TSPropertySignature'`：指示对象的类型为 TypeScript 属性签名。
  - `key: Expression`：属性的键。
  - `kind: 'get'`：指示属性为 getter 属性。
  - `optional: boolean`：指示属性是否为可选属性。
  - `typeAnnotation: TSTypeAnnotation`：属性的类型注解对象，其中 `typeAnnotation` 属性为传入的 `typeAnnotation` 参数。
  - `_ownerScope: TypeScope`：指示属性所属的作用域对象。

通过调用 `createProperty` 函数，可以方便地创建一个具有特定属性键、类型注解和作用域的 TypeScript 属性签名对象。
 */
function createProperty(
  key: Expression,
  typeAnnotation: TSType,
  scope: TypeScope,
  optional: boolean
): TSPropertySignature & WithScope {
  return {
    type: 'TSPropertySignature',
    key,
    kind: 'get',
    optional,
    typeAnnotation: {
      type: 'TSTypeAnnotation',
      typeAnnotation
    },
    _ownerScope: scope
  }
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `resolveInterfaceMembers` 函数用于解析 TypeScript 接口声明中的成员，并返回一个包含解析后成员的对象。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文对象。
- `node: TSInterfaceDeclaration & MaybeWithScope`：要解析的 TypeScript 接口声明节点。
- `scope: TypeScope`：接口声明所属的作用域对象。

函数执行以下操作：
- 调用 `typeElementsToMap` 函数，将接口声明的成员列表（`node.body.body`）解析为一个包含成员的对象，存储在 `base` 变量中。
- 如果接口声明有继承的接口（`node.extends`），则遍历每个继承的接口。
  - 如果继承的接口有包含 `@vue-ignore` 注释的前置注释，则忽略该继承。
  - 否则，尝试通过调用 `resolveTypeElements` 函数解析继承的接口，并获取其成员。
    - 遍历继承接口的成员，并将其添加到 `base` 中，如果 `base` 中不存在相同键的成员。
    - 如果解析过程中出现错误，捕获错误并使用 `ctx.error` 函数报告错误。

最后，函数返回包含解析后成员的对象 `base`。

通过调用 `resolveInterfaceMembers` 函数，可以解析 TypeScript 接口声明中的成员，并处理继承关系。
 */
function resolveInterfaceMembers(
  ctx: TypeResolveContext,
  node: TSInterfaceDeclaration & MaybeWithScope,
  scope: TypeScope
): ResolvedElements {
  const base = typeElementsToMap(ctx, node.body.body, node._ownerScope)
  if (node.extends) {
    for (const ext of node.extends) {
      if (
        ext.leadingComments &&
        ext.leadingComments.some(c => c.value.includes('@vue-ignore'))
      ) {
        continue
      }
      try {
        const { props } = resolveTypeElements(ctx, ext, scope)
        for (const key in props) {
          if (!hasOwn(base.props, key)) {
            base.props[key] = props[key]
          }
        }
      } catch (e) {
        ctx.error(
          `Failed to resolve extends base type.\nIf this previously worked in 3.2, ` +
            `you can instruct the compiler to ignore this extend by adding ` +
            `/* @vue-ignore */ before it, for example:\n\n` +
            `interface Props extends /* @vue-ignore */ Base {}\n\n` +
            `Note: both in 3.2 or with the ignore, the properties in the base ` +
            `type are treated as fallthrough attrs at runtime.`,
          ext
        )
      }
    }
  }
  return base
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `resolveMappedType` 函数用于解析 TypeScript 中的映射类型（Mapped Type），并返回一个包含解析后成员的对象。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文对象。
- `node: TSMappedType`：要解析的映射类型节点。
- `scope: TypeScope`：映射类型所属的作用域对象。

函数执行以下操作：
- 创建一个空的结果对象 `res`，包含一个空的 `props` 属性。
- 调用 `resolveStringType` 函数，解析映射类型的类型参数约束，获取一个键的字符串数组，存储在 `keys` 变量中。
- 遍历 `keys` 数组，对每个键执行以下操作：
  - 使用 `createProperty` 函数创建一个属性签名（`TSPropertySignature`）节点，作为结果的成员。
    - `key` 为标识符节点（`Identifier`），名称为当前键。
    - `typeAnnotation` 为映射类型的类型注解（`node.typeAnnotation`）。
    - `scope` 为当前作用域。
    - `optional` 根据映射类型的可选性（`node.optional`）设置。
  - 将创建的属性添加到 `res.props` 对象中，以当前键为键名。
- 返回结果对象 `res`，其中包含解析后的成员。

通过调用 `resolveMappedType` 函数，可以解析 TypeScript 中的映射类型，并生成相应的成员。这通常用于根据一组键和类型注解生成属性成员的情况。
 */
function resolveMappedType(
  ctx: TypeResolveContext,
  node: TSMappedType,
  scope: TypeScope
): ResolvedElements {
  const res: ResolvedElements = { props: {} }
  const keys = resolveStringType(ctx, node.typeParameter.constraint!, scope)
  for (const key of keys) {
    res.props[key] = createProperty(
      {
        type: 'Identifier',
        name: key
      },
      node.typeAnnotation!,
      scope,
      !!node.optional
    )
  }
  return res
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `resolveIndexType` 函数用于解析 TypeScript 中的索引访问类型（Indexed Access Type），并返回一个包含解析后类型的数组。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文对象。
- `node: TSIndexedAccessType`：要解析的索引访问类型节点。
- `scope: TypeScope`：索引访问类型所属的作用域对象。

函数执行以下操作：
- 检查 `node.indexType` 的类型，如果为 `'TSNumberKeyword'`，则表示索引类型为数字类型，调用 `resolveArrayElementType` 函数解析数组元素类型，传递 `node.objectType` 和当前作用域 `scope`，并返回解析后的数组元素类型数组。
- 否则，获取 `node.indexType` 和 `node.objectType` 的值，分别赋值给 `indexType` 和 `objectType` 变量。
- 创建一个空数组 `types`，用于存储解析后的类型。
- 创建空数组 `keys` 和空对象 `resolved`，用于存储属性键和解析后的元素对象。
- 如果 `indexType` 的类型为 `'TSStringKeyword'`，则表示索引类型为字符串类型，调用 `resolveTypeElements` 函数解析 `objectType` 的成员，将结果赋值给 `resolved`，并获取成员的键，存储在 `keys` 中。
- 否则，调用 `resolveStringType` 函数解析 `indexType`，获取一个键的字符串数组，存储在 `keys` 中，同时调用 `resolveTypeElements` 函数解析 `objectType` 的成员，将结果赋值给 `resolved`。
- 遍历 `keys` 数组，对每个键执行以下操作：
  - 获取属性键对应的目标类型（`targetType`）。
  - 如果目标类型存在，则将其添加到 `types` 数组中，并为目标类型设置 `_ownerScope` 属性，值为属性键对应的元素对象的 `_ownerScope`。
- 返回解析后的类型数组 `types`。

通过调用 `resolveIndexType` 函数，可以解析 TypeScript 中的索引访问类型，并获取对应的类型信息。函数根据索引类型的不同（数字或字符串）以及所访问的对象类型的成员信息，返回相应的类型结果。
 */
function resolveIndexType(
  ctx: TypeResolveContext,
  node: TSIndexedAccessType,
  scope: TypeScope
): (TSType & MaybeWithScope)[] {
  if (node.indexType.type === 'TSNumberKeyword') {
    return resolveArrayElementType(ctx, node.objectType, scope)
  }

  const { indexType, objectType } = node
  const types: TSType[] = []
  let keys: string[]
  let resolved: ResolvedElements
  if (indexType.type === 'TSStringKeyword') {
    resolved = resolveTypeElements(ctx, objectType, scope)
    keys = Object.keys(resolved.props)
  } else {
    keys = resolveStringType(ctx, indexType, scope)
    resolved = resolveTypeElements(ctx, objectType, scope)
  }
  for (const key of keys) {
    const targetType = resolved.props[key]?.typeAnnotation?.typeAnnotation
    if (targetType) {
      ;(targetType as TSType & MaybeWithScope)._ownerScope =
        resolved.props[key]._ownerScope
      types.push(targetType)
    }
  }
  return types
}
/**
`resolveStringType` 函数用于解析 TypeScript 中表示字符串类型的节点，并返回一个包含解析后的字符串数组。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文对象。
- `node: Node`：要解析的节点。
- `scope: TypeScope`：节点所属的作用域对象。

函数执行以下操作：
- 根据 `node.type` 的类型进行不同的处理：
  - 如果为 `'StringLiteral'`，表示节点是字符串字面量类型，直接返回包含节点的值的字符串数组。
  - 如果为 `'TSLiteralType'`，表示节点是字面量类型，递归调用 `resolveStringType` 函数，传递 `ctx`、`node.literal` 和当前作用域 `scope`，并返回结果。
  - 如果为 `'TSUnionType'`，表示节点是联合类型，遍历 `types` 数组，对每个类型执行以下操作：
    - 递归调用 `resolveStringType` 函数，传递 `ctx`、`t` 和当前作用域 `scope`，并将结果数组进行扁平化处理后返回。
  - 如果为 `'TemplateLiteral'`，表示节点是模板字符串类型，调用 `resolveTemplateKeys` 函数，传递 `ctx`、`node` 和当前作用域 `scope`，并返回结果。
  - 如果为 `'TSTypeReference'`，表示节点是类型引用，进一步判断：
    - 如果能够通过 `resolveTypeReference` 函数解析出引用的类型 `resolved`，则递归调用 `resolveStringType` 函数，传递 `ctx`、`resolved` 和当前作用域 `scope`，并返回结果。
    - 如果无法解析出引用的类型 `resolved`，则进一步判断 `node.typeName.type`：
      - 如果为 `'Identifier'`，表示引用的类型名称是标识符，根据不同的标识符名称进行处理：
        - `'Extract'`：调用 `getParam(1)`，其中 `getParam` 函数用于获取类型引用的类型参数，索引为 1 的参数即为要提取的类型，返回该参数的解析结果。
        - `'Exclude'`：调用 `getParam(1)` 获取要排除的类型参数，调用 `getParam()` 获取要进行排除操作的类型参数，并使用 `filter` 方法排除在要排除的类型参数中出现的类型，返回剩余的类型。
        - `'Uppercase'`：将 `getParam()` 中的每个字符串转换为大写形式，返回转换后的字符串数组。
        - `'Lowercase'`：将 `getParam()` 中的每个字符串转换为小写形式，返回转换后的字符串数组。
        - `'Capitalize'`：将 `getParam()` 中的每个字符串首字母大写，返回转换后的字符串数组。
        - `'Uncapitalize'`：将 `getParam()` 中的每个字符串首字母小写，返回转换后的字符串数组。
        - 如果以上情况都不满足，则抛出错误，提示不支持解析索引类型

时的类型。
  - 如果以上情况都不满足，则表示无法将索引类型解析为有限的键集合，抛出错误，提示无法解析索引类型。

通过调用 `resolveStringType` 函数，可以解析 TypeScript 中表示字符串类型的节点，并返回一个包含解析后的字符串数组。函数根据不同的字符串类型形式进行解析，并返回相应的结果。
 */
function resolveArrayElementType(
  ctx: TypeResolveContext,
  node: Node,
  scope: TypeScope
): TSType[] {
  // type[]
  if (node.type === 'TSArrayType') {
    return [node.elementType]
  }
  // tuple
  if (node.type === 'TSTupleType') {
    return node.elementTypes.map(t =>
      t.type === 'TSNamedTupleMember' ? t.elementType : t
    )
  }
  if (node.type === 'TSTypeReference') {
    // Array<type>
    if (getReferenceName(node) === 'Array' && node.typeParameters) {
      return node.typeParameters.params
    } else {
      const resolved = resolveTypeReference(ctx, node, scope)
      if (resolved) {
        return resolveArrayElementType(ctx, resolved, scope)
      }
    }
  }
  return ctx.error(
    'Failed to resolve element type from target type',
    node,
    scope
  )
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `resolveStringType` 函数用于解析 TypeScript 中表示字符串类型的节点，并返回一个包含解析后的字符串数组。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文对象。
- `node: Node`：要解析的节点。
- `scope: TypeScope`：节点所属的作用域对象。

函数执行以下操作：
- 根据 `node.type` 的类型进行不同的处理：
  - 如果为 `'StringLiteral'`，表示节点是字符串字面量类型，直接返回包含节点的值的字符串数组。
  - 如果为 `'TSLiteralType'`，表示节点是字面量类型，递归调用 `resolveStringType` 函数，传递 `ctx`、`node.literal` 和当前作用域 `scope`，并返回结果。
  - 如果为 `'TSUnionType'`，表示节点是联合类型，遍历 `types` 数组，对每个类型执行以下操作：
    - 递归调用 `resolveStringType` 函数，传递 `ctx`、`t` 和当前作用域 `scope`，并将结果数组进行扁平化处理后返回。
  - 如果为 `'TemplateLiteral'`，表示节点是模板字符串类型，调用 `resolveTemplateKeys` 函数，传递 `ctx`、`node` 和当前作用域 `scope`，并返回结果。
  - 如果为 `'TSTypeReference'`，表示节点是类型引用，进一步判断：
    - 如果能够通过 `resolveTypeReference` 函数解析出引用的类型 `resolved`，则递归调用 `resolveStringType` 函数，传递 `ctx`、`resolved` 和当前作用域 `scope`，并返回结果。
    - 如果无法解析出引用的类型 `resolved`，则进一步判断 `node.typeName.type`：
      - 如果为 `'Identifier'`，表示引用的类型名称是标识符，根据不同的标识符名称进行处理：
        - `'Extract'`：调用 `getParam(1)`，其中 `getParam` 函数用于获取类型引用的类型参数，索引为 1 的参数即为要提取的类型，返回该参数的解析结果。
        - `'Exclude'`：调用 `getParam(1)` 获取要排除的类型参数，调用 `getParam()` 获取要进行排除操作的类型参数，并使用 `filter` 方法排除在要排除的类型参数中出现的类型，返回剩余的类型。
        - `'Uppercase'`：将 `getParam()` 中的每个字符串转换为大写形式，返回转换后的字符串数组。
        - `'Lowercase'`：将 `getParam()` 中的每个字符串转换为小写形式，返回转换后的字符串数组。
        - `'Capitalize'`：将 `getParam()` 中的每个字符串首字母大写，返回转换后的字符串数组。
        - `'Uncapitalize'`：将 `getParam()` 中的每个字符串首字母小写，返回转换后的字符串数组。
        - 如果以上情况都不满足，则抛出错误，提示不支持解析索引类型
 */
function resolveStringType(
  ctx: TypeResolveContext,
  node: Node,
  scope: TypeScope
): string[] {
  switch (node.type) {
    case 'StringLiteral':
      return [node.value]
    case 'TSLiteralType':
      return resolveStringType(ctx, node.literal, scope)
    case 'TSUnionType':
      return node.types.map(t => resolveStringType(ctx, t, scope)).flat()
    case 'TemplateLiteral': {
      return resolveTemplateKeys(ctx, node, scope)
    }
    case 'TSTypeReference': {
      const resolved = resolveTypeReference(ctx, node, scope)
      if (resolved) {
        return resolveStringType(ctx, resolved, scope)
      }
      if (node.typeName.type === 'Identifier') {
        const getParam = (index = 0) =>
          resolveStringType(ctx, node.typeParameters!.params[index], scope)
        switch (node.typeName.name) {
          case 'Extract':
            return getParam(1)
          case 'Exclude': {
            const excluded = getParam(1)
            return getParam().filter(s => !excluded.includes(s))
          }
          case 'Uppercase':
            return getParam().map(s => s.toUpperCase())
          case 'Lowercase':
            return getParam().map(s => s.toLowerCase())
          case 'Capitalize':
            return getParam().map(capitalize)
          case 'Uncapitalize':
            return getParam().map(s => s[0].toLowerCase() + s.slice(1))
          default:
            ctx.error(
              'Unsupported type when resolving index type',
              node.typeName,
              scope
            )
        }
      }
    }
  }
  return ctx.error('Failed to resolve index type into finite keys', node, scope)
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `resolveTemplateKeys` 函数用于解析 TypeScript 中模板字符串类型的键集合，并返回一个包含解析后的字符串数组。

它接受以下参数：
- `ctx: TypeResolveContext`：类型解析上下文对象。
- `node: TemplateLiteral`：要解析的模板字符串节点。
- `scope: TypeScope`：节点所属的作用域对象。

函数执行以下操作：
- 首先判断模板字符串中是否存在表达式，即 `node.expressions` 数组的长度是否为 0。
  - 如果不存在表达式，则返回只包含模板字符串文本部分的原始字符串数组，即 `[node.quasis[0].value.raw]`。
- 如果存在表达式，定义一些辅助变量：
  - `res`：用于存储最终的解析结果的字符串数组。
  - `e`：第一个表达式节点。
  - `q`：第一个模板字符串文本部分节点。
  - `leading`：模板字符串的起始文本部分的原始字符串。
  - `resolved`：通过调用 `resolveStringType` 函数解析第一个表达式节点 `e`，传递 `ctx`、`e` 和当前作用域 `scope`，并返回解析结果的字符串数组。
  - `restResolved`：递归调用 `resolveTemplateKeys` 函数，传递更新后的模板字符串节点（去除第一个表达式和文本部分），并返回解析结果的字符串数组。
- 遍历 `resolved` 数组的每个元素 `r`：
  - 遍历 `restResolved` 数组的每个元素 `rr`：
    - 将 `leading + r + rr` 添加到结果数组 `res` 中。
- 返回最终的解析结果数组 `res`。

通过调用 `resolveTemplateKeys` 函数，可以解析 TypeScript 中模板字符串类型的键集合，并返回一个包含解析后的字符串数组。函数通过递归和组合字符串的方式，将模板字符串中的表达式解析为最终的字符串结果。
 */
function resolveTemplateKeys(
  ctx: TypeResolveContext,
  node: TemplateLiteral,
  scope: TypeScope
): string[] {
  if (!node.expressions.length) {
    return [node.quasis[0].value.raw]
  }

  const res: string[] = []
  const e = node.expressions[0]
  const q = node.quasis[0]
  const leading = q ? q.value.raw : ``
  const resolved = resolveStringType(ctx, e, scope)
  const restResolved = resolveTemplateKeys(
    ctx,
    {
      ...node,
      expressions: node.expressions.slice(1),
      quasis: q ? node.quasis.slice(1) : node.quasis
    },
    scope
  )

  for (const r of resolved) {
    for (const rr of restResolved) {
      res.push(leading + r + rr)
    }
  }

  return res
}
/**
 * 该代码片段定义了一个名为 `SupportedBuiltinsSet` 的常量，它是一个 `Set` 对象，包含了一组支持的 TypeScript 内置类型操作符。

该 `Set` 对象中的元素是以下字符串字面量类型的字面量类型元组：`'Partial'`、`'Required'`、`'Readonly'`、`'Pick'` 和 `'Omit'`。使用 `as const` 语法可以将字符串字面量类型推断为字面量类型元组。

通过创建这个 `Set` 对象，可以方便地检查某个字符串是否属于支持的 TypeScript 内置类型操作符。
 */
const SupportedBuiltinsSet = new Set([
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit'
] as const)
/**
 * 该代码片段定义了一个名为 `GetSetType<T>` 的条件类型。该类型用于获取集合类型 `Set<T>` 中元素类型 `T`。

条件类型 `GetSetType<T>` 使用了泛型参数 `T`，它表示待检查的类型。通过条件判断 `T extends Set<infer V>`，判断 `T` 是否为 `Set` 类型，并将 `Set` 类型的元素类型推断为 `V`。如果 `T` 是 `Set` 类型，则返回 `V`；否则返回 `never` 类型。

这个条件类型可以用于从集合类型中提取元素类型，例如：

```typescript
type MySet = Set<number>;
type ElementType = GetSetType<MySet>; // ElementType 类型为 number
```

它可以方便地提取集合类型中的元素类型，以便在其他类型定义中使用。
 */
type GetSetType<T> = T extends Set<infer V> ? V : never
/**
 * 
 * @param ctx 
 * @param node 
 * @param name 
 * @param scope 
 * @returns 
 * 该函数 `resolveBuiltin` 是用于解析内置类型的辅助函数。它根据传入的内置类型名称 `name` 和相关参数来处理不同的内置类型，并返回相应的结果。

函数接受四个参数：
1. `ctx`: TypeResolveContext 类型，表示类型解析上下文。
2. `node`: TSTypeReference 或 TSExpressionWithTypeArguments 类型，表示对内置类型的引用。
3. `name`: GetSetType<typeof SupportedBuiltinsSet> 类型，表示内置类型名称，必须为 SupportedBuiltinsSet 集合类型中的一个元素。
4. `scope`: TypeScope 类型，表示类型的作用域。

根据 `name` 的不同值，`resolveBuiltin` 函数会执行不同的逻辑来处理不同的内置类型，并返回一个 ResolvedElements 类型的结果，包含解析后的类型信息。

具体来说：
- 对于 'Partial' 类型，会将传入类型中所有属性设置为可选属性，并返回新的 ResolvedElements 对象。
- 对于 'Required' 类型，会将传入类型中所有属性设置为必需属性，并返回新的 ResolvedElements 对象。
- 对于 'Readonly' 类型，直接返回传入类型的 ResolvedElements 对象。
- 对于 'Pick' 类型，会从传入类型中挑选出指定的属性，并返回包含这些属性的新的 ResolvedElements 对象。
- 对于 'Omit' 类型，会从传入类型中删除指定的属性，并返回删除后的新的 ResolvedElements 对象。

总体来说，该函数用于处理一些通用的内置类型，对它们进行解析和转换，以便在类型系统中进行进一步的处理和应用。
 */
function resolveBuiltin(
  ctx: TypeResolveContext,
  node: TSTypeReference | TSExpressionWithTypeArguments,
  name: GetSetType<typeof SupportedBuiltinsSet>,
  scope: TypeScope
): ResolvedElements {
  const t = resolveTypeElements(ctx, node.typeParameters!.params[0], scope)
  switch (name) {
    case 'Partial': {
      const res: ResolvedElements = { props: {}, calls: t.calls }
      Object.keys(t.props).forEach(key => {
        res.props[key] = { ...t.props[key], optional: true }
      })
      return res
    }
    case 'Required': {
      const res: ResolvedElements = { props: {}, calls: t.calls }
      Object.keys(t.props).forEach(key => {
        res.props[key] = { ...t.props[key], optional: false }
      })
      return res
    }
    case 'Readonly':
      return t
    case 'Pick': {
      const picked = resolveStringType(
        ctx,
        node.typeParameters!.params[1],
        scope
      )
      const res: ResolvedElements = { props: {}, calls: t.calls }
      for (const key of picked) {
        res.props[key] = t.props[key]
      }
      return res
    }
    case 'Omit':
      const omitted = resolveStringType(
        ctx,
        node.typeParameters!.params[1],
        scope
      )
      const res: ResolvedElements = { props: {}, calls: t.calls }
      for (const key in t.props) {
        if (!omitted.includes(key)) {
          res.props[key] = t.props[key]
        }
      }
      return res
  }
}
/**
 * `ReferenceTypes` 是一个联合类型，表示引用类型的多种可能性。它包括以下几种类型：

1. `TSTypeReference`: 表示对类型的引用，例如 `SomeType<T>` 中的 `SomeType`。
2. `TSExpressionWithTypeArguments`: 表示带有类型参数的表达式引用，例如 `obj instanceof SomeType<T>` 中的 `SomeType`。
3. `TSImportType`: 表示导入类型，用于引用导入的模块类型。
4. `TSTypeQuery`: 表示类型查询，用于获取某个符号的类型信息。

通过定义 `ReferenceTypes` 类型，可以将这些引用类型作为统一的类型来使用，在需要处理不同引用类型的场景中，可以根据具体的类型来执行相应的逻辑。
 */
type ReferenceTypes =
  | TSTypeReference
  | TSExpressionWithTypeArguments
  | TSImportType
  | TSTypeQuery
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @param name 
 * @param onlyExported 
 * @returns 
 * 该函数用于解析类型引用（`ReferenceTypes`），并返回引用类型对应的 `ScopeTypeNode`。

函数参数说明：
- `ctx`: 类型解析上下文。
- `node`: 引用类型节点，包含了 `_resolvedReference` 属性用于缓存已解析的引用。
- `scope`: 类型作用域。
- `name`: 引用类型的名称。
- `onlyExported`: 是否仅解析导出的类型。

函数的实现逻辑如下：
- 首先，检查引用类型节点是否已经有缓存的解析结果，如果有，则直接返回缓存的结果。
- 如果没有缓存的解析结果，则调用 `innerResolveTypeReference` 函数进行实际的类型解析。
- `innerResolveTypeReference` 函数会根据给定的作用域、名称和导出类型的限制来解析类型引用，并返回对应的 `ScopeTypeNode`。
- 解析结果会被缓存到 `node._resolvedReference` 属性中，并返回该解析结果。

通过这个函数，可以在需要解析类型引用的地方调用，避免重复解析相同的引用类型，提高性能。
 */
function resolveTypeReference(
  ctx: TypeResolveContext,
  node: ReferenceTypes & {
    _resolvedReference?: ScopeTypeNode
  },
  scope?: TypeScope,
  name?: string,
  onlyExported = false
): ScopeTypeNode | undefined {
  if (node._resolvedReference) {
    return node._resolvedReference
  }
  return (node._resolvedReference = innerResolveTypeReference(
    ctx,
    scope || ctxToScope(ctx),
    name || getReferenceName(node),
    node,
    onlyExported
  ))
}
/**
 * 
 * @param ctx 
 * @param scope 
 * @param name 
 * @param node 
 * @param onlyExported 
 * @returns 
 * `innerResolveTypeReference` 函数是 `resolveTypeReference` 函数的内部实现，用于实际解析类型引用并返回对应的 `ScopeTypeNode`。

函数参数说明：
- `ctx`: 类型解析上下文。
- `scope`: 类型作用域。
- `name`: 引用类型的名称，可以是字符串或字符串数组（用于处理嵌套命名空间）。
- `node`: 引用类型节点。
- `onlyExported`: 是否仅解析导出的类型。

函数的实现逻辑如下：
- 首先判断 `name` 是否为字符串，如果是，则根据作用域中的导入声明和声明类型进行查找。
  - 如果在导入声明中找到了对应的名称，则调用 `resolveTypeFromImport` 函数解析导入的类型，并返回解析结果。
  - 如果在当前作用域中找到了对应的名称，则直接返回该类型。
  - 否则，会尝试在全局作用域中查找对应的名称。
- 如果 `name` 是字符串数组，则表示嵌套命名空间，需要逐级解析嵌套的命名空间。
  - 首先，调用 `innerResolveTypeReference` 递归解析第一级命名空间，并返回解析结果 `ns`。
  - 如果 `ns` 存在且不是模块声明类型，则将 `ns` 更新为与其他类型合并的命名空间（`ns._ns`）。
  - 如果 `ns` 存在，则创建子作用域 `childScope`，并调用 `innerResolveTypeReference` 递归解析剩余的命名空间。
  - 最后，根据是否是声明类型来决定是否限制只解析导出的类型。
- 如果以上步骤都没有找到匹配的类型，则返回 `undefined`。

该函数用于在给定的作用域中解析类型引用，处理了导入类型、声明类型和全局作用域的情况，并支持嵌套命名空间的解析。
 */
function innerResolveTypeReference(
  ctx: TypeResolveContext,
  scope: TypeScope,
  name: string | string[],
  node: ReferenceTypes,
  onlyExported: boolean
): ScopeTypeNode | undefined {
  if (typeof name === 'string') {
    if (scope.imports[name]) {
      return resolveTypeFromImport(ctx, node, name, scope)
    } else {
      const lookupSource =
        node.type === 'TSTypeQuery'
          ? onlyExported
            ? scope.exportedDeclares
            : scope.declares
          : onlyExported
          ? scope.exportedTypes
          : scope.types
      if (lookupSource[name]) {
        return lookupSource[name]
      } else {
        // fallback to global
        const globalScopes = resolveGlobalScope(ctx)
        if (globalScopes) {
          for (const s of globalScopes) {
            const src = node.type === 'TSTypeQuery' ? s.declares : s.types
            if (src[name]) {
              ;(ctx.deps || (ctx.deps = new Set())).add(s.filename)
              return src[name]
            }
          }
        }
      }
    }
  } else {
    let ns = innerResolveTypeReference(ctx, scope, name[0], node, onlyExported)
    if (ns) {
      if (ns.type !== 'TSModuleDeclaration') {
        // namespace merged with other types, attached as _ns
        ns = ns._ns
      }
      if (ns) {
        const childScope = moduleDeclToScope(ctx, ns, ns._ownerScope || scope)
        return innerResolveTypeReference(
          ctx,
          childScope,
          name.length > 2 ? name.slice(1) : name[name.length - 1],
          node,
          !ns.declare
        )
      }
    }
  }
}
/**
 * 
 * @param node 
 * @returns 
 * `getReferenceName` 函数用于获取引用类型的名称。根据不同的 `ReferenceTypes` 类型，它会返回相应的名称。

函数参数说明：
- `node`: 引用类型节点，可以是 `TSTypeReference`、`TSExpressionWithTypeArguments`、`TSImportType` 或 `TSTypeQuery` 类型。

函数的实现逻辑如下：
- 首先根据 `node` 的类型确定要获取名称的具体节点 `ref`。
- 如果 `ref` 是 `Identifier` 类型，则返回 `ref.name`。
- 如果 `ref` 是 `TSQualifiedName` 类型，则调用 `qualifiedNameToPath` 函数将其转换为路径形式的名称，并返回结果。
- 如果以上条件都不满足，则返回字符串 `'default'`。

该函数用于从引用类型节点中提取出名称，用于后续的类型解析过程。
 */
function getReferenceName(node: ReferenceTypes): string | string[] {
  const ref =
    node.type === 'TSTypeReference'
      ? node.typeName
      : node.type === 'TSExpressionWithTypeArguments'
      ? node.expression
      : node.type === 'TSImportType'
      ? node.qualifier
      : node.exprName
  if (ref?.type === 'Identifier') {
    return ref.name
  } else if (ref?.type === 'TSQualifiedName') {
    return qualifiedNameToPath(ref)
  } else {
    return 'default'
  }
}
/**
 * 
 * @param node 
 * @returns 
 * `qualifiedNameToPath` 函数用于将 `TSQualifiedName` 类型或 `Identifier` 类型的节点转换为路径形式的名称。

函数参数说明：
- `node`: `Identifier` 或 `TSQualifiedName` 类型的节点。

函数的实现逻辑如下：
- 如果 `node` 的类型是 `Identifier`，则返回包含 `node.name` 的数组。
- 如果 `node` 的类型是 `TSQualifiedName`，则递归调用 `qualifiedNameToPath` 函数来处理 `node.left`，然后将 `node.right.name` 添加到结果数组的末尾，最后返回结果数组。

该函数用于将嵌套的限定名表示转换为路径形式的名称，例如将 `A.B.C` 转换为 `['A', 'B', 'C']`，以便在类型解析过程中使用。
 */
function qualifiedNameToPath(node: Identifier | TSQualifiedName): string[] {
  if (node.type === 'Identifier') {
    return [node.name]
  } else {
    return [...qualifiedNameToPath(node.left), node.right.name]
  }
}
/**
 * 
 * @param ctx 
 * @returns 
 * `resolveGlobalScope` 函数用于解析全局作用域，返回一个包含全局作用域的数组。

函数参数说明：
- `ctx`: TypeResolveContext 对象，类型解析上下文。

函数的实现逻辑如下：
- 首先检查 `ctx.options.globalTypeFiles` 是否存在，它是一个配置选项，用于指定全局类型文件的路径。
- 如果存在 `ctx.options.globalTypeFiles`，则获取解析后的文件系统对象 `fs`，如果不存在则抛出错误提示信息。
- 遍历 `ctx.options.globalTypeFiles` 数组，对每个文件路径执行以下操作：
  - 使用 `normalizePath` 函数规范化文件路径。
  - 调用 `fileToScope` 函数，将规范化后的文件路径和 `true` 作为参数，返回对应文件的作用域对象。
- 返回包含全局作用域的数组。

该函数用于根据配置的全局类型文件路径，获取相应的全局作用域对象。全局作用域对象包含了全局声明的类型信息，可以在类型解析过程中使用。
 */
function resolveGlobalScope(ctx: TypeResolveContext): TypeScope[] | undefined {
  if (ctx.options.globalTypeFiles) {
    const fs = resolveFS(ctx)
    if (!fs) {
      throw new Error('[vue/compiler-sfc] globalTypeFiles requires fs access.')
    }
    return ctx.options.globalTypeFiles.map(file =>
      fileToScope(ctx, normalizePath(file), true)
    )
  }
}
/**
 * `let ts: typeof TS` 这行代码声明了一个变量 `ts`，其类型注解为 `typeof TS`。这个语法允许你将 `TS` 对象的值赋给 `ts` 变量。

以下是一个在 TypeScript 中使用这行代码的示例：

```typescript
import * as TS from 'typescript';

let ts: typeof TS;
// 将 'typescript' 模块的值赋给 'ts' 变量
ts = TS;

// 现在你可以使用 'ts' 变量访问 TypeScript 的类型和 API
const typeChecker = ts.createTypeChecker(/* ... );
const parsed = ts.parseScript(/* ... );
// ...
```

通过将 `TS` 的值赋给 `ts` 变量，你可以通过 `ts` 变量访问 TypeScript 的类型和 API。当你想使用不同的变量名引用 TypeScript 的功能，或者在需要命名导入的模块系统中导入 TypeScript 时，这将非常有用。
 */
let ts: typeof TS

/**
 * @private
 * 这段代码定义了一个名为 `registerTS` 的导出函数，该函数接受一个参数 `_ts`。在函数内部，将传入的 `_ts` 赋值给之前声明的 `ts` 变量。

这个函数可以在模块中被调用，目的是将外部的 `ts` 对象传递给模块内部，以便在模块中使用该对象。通过调用 `registerTS` 函数并传入相应的 TypeScript 对象，你可以将外部的 TypeScript 功能注入到模块中，从而在模块中使用这些功能。

以下是一个示例，展示了如何使用 `registerTS` 函数：

```typescript
import * as TS from 'typescript';

function registerTS(_ts: any) {
  ts = _ts;
}

// 在适当的时机调用 registerTS 函数，将外部的 TypeScript 对象传递进来
registerTS(TS);

// 现在可以在模块中使用 ts 变量访问 TypeScript 的类型和 API
const typeChecker = ts.createTypeChecker(/* ... );
const parsed = ts.parseScript(/* ... );
// ...
```

通过调用 `registerTS` 函数并传入外部的 TypeScript 对象，你可以在模块中使用 `ts` 变量来访问 TypeScript 的功能和类型系统。这种模式对于在模块内部引用外部的 TypeScript 功能非常有用，同时保持模块的独立性和可扩展性。
 */
export function registerTS(_ts: any) {
  ts = _ts
}
/**
 * `FS` 是一个类型别名，它表示了 `SFCScriptCompileOptions['fs']` 的非空类型。在 Vue 单文件组件 (SFC) 的编译选项中，可以指定一个 `fs` 属性，它用于提供文件系统的访问能力。

`FS` 类型别名的目的是确保 `fs` 属性不为 `null` 或 `undefined`。这可以在类型检查过程中防止对可能为空的 `fs` 属性进行访问，从而提高代码的健壮性。

例如，假设有一个类型为 `SFCScriptCompileOptions` 的对象 `options`，它具有一个可选的 `fs` 属性。通过使用 `FS` 类型别名，可以确保在使用 `options.fs` 时，它不会为 `null` 或 `undefined`，从而避免潜在的运行时错误。

以下是一个示例，演示了如何使用 `FS` 类型别名：

```typescript
import { SFCScriptCompileOptions } from 'vue';

type FS = NonNullable<SFCScriptCompileOptions['fs']>;

function readFile(fs: FS, filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

const options: SFCScriptCompileOptions = {
  // ...
  fs: /* provide a file system implementation ,
  // ...
};

const content = readFile(options.fs, '/path/to/file.js');
// 使用 options.fs 时不需要进行空值检查，因为 FS 类型保证了它的非空性

// ...
```

在上述示例中，通过将 `SFCScriptCompileOptions['fs']` 传递给 `NonNullable` 类型辅助程序，我们定义了 `FS` 类型别名。然后，我们使用 `FS` 类型别名定义了 `readFile` 函数的参数类型。在函数体内，我们可以放心地使用 `fs` 参数，因为它已经被类型系统保证不会为空。这提供了类型安全性，并消除了在每次访问 `options.fs` 时进行空值检查的需要。
 */
type FS = NonNullable<SFCScriptCompileOptions['fs']>
/**
 * 
 * @param ctx 
 * @returns 
 * `resolveFS` 是一个函数，用于解析文件系统 (FS) 对象，该对象用于访问文件系统的功能。它接受一个 `TypeResolveContext` 对象作为参数，并返回一个 `FS` 对象或 `undefined`。

在函数内部，首先检查 `ctx.fs` 是否存在。如果存在，则直接返回该值。

如果 `ctx.fs` 不存在，那么接下来会根据不同的条件来获取 `fs` 对象：

1. 首先，检查 `ctx.options.fs` 是否存在。如果存在，则将其赋值给 `fs` 变量。

2. 如果 `ctx.options.fs` 不存在，那么尝试使用 `ts.sys`。`ts.sys` 是 TypeScript 提供的一个文件系统访问接口。

最后，根据获取到的 `fs` 对象，构建并返回一个新的 `FS` 对象。该 `FS` 对象具有两个方法：`fileExists` 和 `readFile`，用于检查文件是否存在和读取文件内容。

在 `fileExists` 和 `readFile` 方法中，会根据文件名的后缀进行一些处理。如果文件名以 `.vue.ts` 结尾，那么会将其替换为不带 `.ts` 后缀的文件名。然后使用 `fs` 对象的相应方法执行实际的文件操作。

最终，返回构建的 `FS` 对象或 `undefined`，以供后续使用。
 */
function resolveFS(ctx: TypeResolveContext): FS | undefined {
  if (ctx.fs) {
    return ctx.fs
  }
  const fs = ctx.options.fs || ts.sys
  if (!fs) {
    return
  }
  return (ctx.fs = {
    fileExists(file) {
      if (file.endsWith('.vue.ts')) {
        file = file.replace(/\.ts$/, '')
      }
      return fs.fileExists(file)
    },
    readFile(file) {
      if (file.endsWith('.vue.ts')) {
        file = file.replace(/\.ts$/, '')
      }
      return fs.readFile(file)
    }
  })
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param name 
 * @param scope 
 * @returns 
 * `resolveTypeFromImport` 是一个函数，用于从导入语句中解析类型引用。它接受一个 `TypeResolveContext` 对象、一个 `ReferenceTypes` 对象、一个字符串 `name` 和一个 `TypeScope` 对象作为参数，并返回一个 `ScopeTypeNode` 对象或 `undefined`。

在函数内部，首先从 `scope.imports` 中根据 `name` 获取到导入信息，包括 `source` 和 `imported`。

然后，通过调用 `importSourceToScope` 函数，将 `node`、`scope`、`source` 作为参数传递进去，获取到源模块的作用域 `sourceScope`。

接下来，调用 `resolveTypeReference` 函数，将 `ctx`、`node`、`sourceScope`、`imported` 和 `true` 作为参数传递进去，来解析类型引用。这里传递的 `true` 表示只解析导出的类型。

最后，返回解析得到的 `ScopeTypeNode` 对象或 `undefined`，以供后续使用。
 */
function resolveTypeFromImport(
  ctx: TypeResolveContext,
  node: ReferenceTypes,
  name: string,
  scope: TypeScope
): ScopeTypeNode | undefined {
  const { source, imported } = scope.imports[name]
  const sourceScope = importSourceToScope(ctx, node, scope, source)
  return resolveTypeReference(ctx, node, sourceScope, imported, true)
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @param source 
 * @returns 
 * `importSourceToScope` 是一个函数，用于将导入的源文件转换为作用域。它接受一个 `TypeResolveContext` 对象、一个 `Node` 对象、一个 `TypeScope` 对象和一个字符串 `source` 作为参数，并返回一个 `TypeScope` 对象。

在函数内部，首先调用 `resolveFS` 函数来获取文件系统访问对象 `fs`。如果没有提供文件系统访问对象，则会在非 Node 环境下抛出错误。

接下来，检查作用域的缓存 `scope.resolvedImportSources` 中是否已经存在源文件的解析结果。如果存在，则直接使用缓存的解析结果。否则，根据源文件的类型执行不同的解析逻辑。

如果源文件以 `.` 开头，表示是相对路径的导入，可以通过简单的路径拼接和解析文件扩展名来确定源文件的位置。

如果源文件不是以 `.` 开头，表示是模块或别名导入，这种情况需要使用完整的 TypeScript 解析逻辑来确定源文件的位置。但这种解析逻辑只在 Node.js 环境下支持。如果当前环境不是 Node.js，则抛出错误。同时，如果没有正确安装 TypeScript 依赖，则也会抛出错误。

如果成功解析到源文件的位置 `resolved`，则将其保存到作用域的缓存 `scope.resolvedImportSources` 中，并对其进行路径规范化。

最后，将解析到的源文件路径添加到上下文的依赖集合 `ctx.deps` 中，并调用 `fileToScope` 函数将源文件转换为作用域，并返回该作用域。

如果无法解析源文件的位置，则会抛出错误。
 */
function importSourceToScope(
  ctx: TypeResolveContext,
  node: Node,
  scope: TypeScope,
  source: string
): TypeScope {
  const fs = resolveFS(ctx)
  if (!fs) {
    return ctx.error(
      `No fs option provided to \`compileScript\` in non-Node environment. ` +
        `File system access is required for resolving imported types.`,
      node,
      scope
    )
  }

  let resolved: string | undefined = scope.resolvedImportSources[source]
  if (!resolved) {
    if (source.startsWith('.')) {
      // relative import - fast path
      const filename = joinPaths(scope.filename, '..', source)
      resolved = resolveExt(filename, fs)
    } else {
      // module or aliased import - use full TS resolution, only supported in Node
      if (!__NODE_JS__) {
        ctx.error(
          `Type import from non-relative sources is not supported in the browser build.`,
          node,
          scope
        )
      }
      if (!ts) {
        ctx.error(
          `Failed to resolve import source ${JSON.stringify(source)}. ` +
            `typescript is required as a peer dep for vue in order ` +
            `to support resolving types from module imports.`,
          node,
          scope
        )
      }
      resolved = resolveWithTS(scope.filename, source, fs)
    }
    if (resolved) {
      resolved = scope.resolvedImportSources[source] = normalizePath(resolved)
    }
  }
  if (resolved) {
    // (hmr) register dependency file on ctx
    ;(ctx.deps || (ctx.deps = new Set())).add(resolved)
    return fileToScope(ctx, resolved)
  } else {
    return ctx.error(
      `Failed to resolve import source ${JSON.stringify(source)}.`,
      node,
      scope
    )
  }
}
/**
 * 
 * @param filename 
 * @param fs 
 * @returns 
 * `resolveExt` 是一个函数，用于解析文件的扩展名。它接受一个字符串 `filename` 和一个 `FS` 对象 `fs` 作为参数，并返回解析后的文件路径。

在函数内部，首先使用正则表达式将文件名中的 `.js` 扩展名替换为空字符串，以去除可能的 `.js` 后缀。

接下来，定义了一个辅助函数 `tryResolve`，用于尝试解析给定的文件路径。如果文件存在，则返回文件路径；否则返回 `undefined`。

然后，按照特定的顺序尝试解析文件的不同扩展名。首先尝试解析原始的文件路径 `filename`，然后依次尝试添加 `.ts`、`.d.ts`、`index.ts` 和 `index.d.ts` 的扩展名进行解析。只要文件存在，就返回解析后的文件路径。

如果所有的解析尝试都失败，那么函数将返回 `undefined`，表示无法解析文件的扩展名。
 */
function resolveExt(filename: string, fs: FS) {
  // #8339 ts may import .js but we should resolve to corresponding ts or d.ts
  filename = filename.replace(/\.js$/, '')
  const tryResolve = (filename: string) => {
    if (fs.fileExists(filename)) return filename
  }
  return (
    tryResolve(filename) ||
    tryResolve(filename + `.ts`) ||
    tryResolve(filename + `.d.ts`) ||
    tryResolve(joinPaths(filename, `index.ts`)) ||
    tryResolve(joinPaths(filename, `index.d.ts`))
  )
}
/**
 * `CachedConfig` 是一个接口，表示缓存的 TypeScript 配置。它具有以下两个属性：

- `config: TS.ParsedCommandLine`：表示已解析的 TypeScript 命令行配置。这包括 TypeScript 编译器解析后的选项和设置，例如编译目标、模块解析规则、编译输出等。
- `cache?: TS.ModuleResolutionCache`：表示可选的模块解析缓存。这是 TypeScript 模块解析过程中使用的缓存，用于提高模块解析的性能。如果提供了缓存对象，则可以在后续的模块解析中重用缓存，避免重复解析相同的模块。

通过使用 `CachedConfig`，可以将已解析的 TypeScript 配置和模块解析缓存保存起来，以便在多次使用相同配置进行代码分析时提高性能和效率。
 */
interface CachedConfig {
  config: TS.ParsedCommandLine
  cache?: TS.ModuleResolutionCache
}
/**
 * `tsConfigCache` 是一个使用 `createCache` 函数创建的缓存，用于存储 `CachedConfig[]` 类型的数据。它可以用于缓存已解析的 TypeScript 配置。

通过使用 `tsConfigCache`，可以在需要缓存多个已解析的 TypeScript 配置时，将它们存储在缓存中。这可以提高重复使用相同配置的性能和效率，并避免重复解析相同的 TypeScript 配置。

具体来说，`tsConfigCache` 可以使用以下方式进行操作：

- 存储已解析的 TypeScript 配置：
  ```typescript
  tsConfigCache.set(key, cachedConfigs);
  ```
  这将使用指定的键（`key`）将已解析的 TypeScript 配置（`cachedConfigs`）存储在缓存中。

- 获取已存储的 TypeScript 配置：
  ```typescript
  const cachedConfigs = tsConfigCache.get(key);
  ```
  这将使用指定的键（`key`）从缓存中获取已存储的 TypeScript 配置。

- 清除特定键的缓存：
  ```typescript
  tsConfigCache.delete(key);
  ```
  这将从缓存中删除具有指定键（`key`）的缓存项。

- 清空整个缓存：
  ```typescript
  tsConfigCache.clear();
  ```
  这将清空缓存中的所有缓存项。

注意：`createCache` 函数是一个假设的辅助函数，用于创建缓存对象。它并不是 TypeScript 或 JavaScript 语言的原生函数。你需要根据实际情况实现该函数，以便创建符合你的需求的缓存对象。
 */
const tsConfigCache = createCache<CachedConfig[]>()
/**
 * `tsConfigRefMap` 是一个 `Map` 类型的对象，用于存储 TypeScript 配置的引用关系。

它使用字符串类型的键（`string`）表示 TypeScript 配置文件的路径，使用字符串类型的值（`string`）表示该配置文件引用的其他配置文件的路径。

通过使用 `tsConfigRefMap`，可以建立和维护不同 TypeScript 配置文件之间的引用关系，以便在需要解析这些配置文件时能够正确地处理它们的依赖关系。

例如，假设有两个 TypeScript 配置文件：`tsconfig1.json` 和 `tsconfig2.json`。如果 `tsconfig2.json` 引用了 `tsconfig1.json`，那么可以使用 `tsConfigRefMap` 来记录它们之间的引用关系，如下所示：

```typescript
tsConfigRefMap.set('tsconfig2.json', 'tsconfig1.json');
```

这表示 `tsconfig2.json` 引用了 `tsconfig1.json`。

通过查阅 `tsConfigRefMap`，你可以确定一个 TypeScript 配置文件是否依赖于其他配置文件，并获取它所依赖的配置文件的路径。

需要注意的是，`tsConfigRefMap` 是使用 `Map` 对象实现的，所以它具有 `Map` 的所有常用方法，例如 `set`、`get`、`delete`、`has` 等，可以根据实际需求进行操作和查询。
 */
const tsConfigRefMap = new Map<string, string>()
/**
 * 
 * @param containingFile 
 * @param source 
 * @param fs 
 * @returns 
 * 函数 `resolveWithTS` 用于使用 TypeScript 解析模块的引用关系。该函数接收三个参数：

1. `containingFile`：包含当前模块引用的文件的路径。
2. `source`：需要解析的模块的引用路径。
3. `fs`：代表文件系统的对象，用于访问文件和文件内容。

这个函数的主要目的是通过 TypeScript 的模块解析算法来解析模块的引用路径，以便能够正确地找到并获取被引用模块的文件路径。

具体的解析过程如下：

1. 首先，函数尝试查找 `containingFile` 所在目录下是否存在 `tsconfig.json` 文件，用于获取 TypeScript 的编译配置信息。如果找到了 `tsconfig.json` 文件，则会读取其中的配置信息。

2. 接着，函数根据找到的 `tsconfig.json` 文件的配置信息，使用 TypeScript 的模块解析算法来解析模块引用 `source`。如果成功解析了模块引用，将得到一个 `resolvedModule` 对象。

3. 最后，如果解析成功，函数将返回被引用模块的文件路径，并根据需要去掉 `.vue.ts` 文件后缀，以便得到最终的文件路径。

需要注意的是，在非 Node.js 环境下，这个函数将直接返回 `undefined`，因为它依赖于 Node.js 环境的文件系统访问能力。

这个函数的作用在于解析模块的引用路径，是在处理 TypeScript 配置文件以及模块之间的依赖关系时非常重要的一环。
 */
function resolveWithTS(
  containingFile: string,
  source: string,
  fs: FS
): string | undefined {
  if (!__NODE_JS__) return

  // 1. resolve tsconfig.json
  const configPath = ts.findConfigFile(containingFile, fs.fileExists)
  // 2. load tsconfig.json
  let tsCompilerOptions: TS.CompilerOptions
  let tsResolveCache: TS.ModuleResolutionCache | undefined
  if (configPath) {
    let configs: CachedConfig[]
    const normalizedConfigPath = normalizePath(configPath)
    const cached = tsConfigCache.get(normalizedConfigPath)
    if (!cached) {
      configs = loadTSConfig(configPath, fs).map(config => ({ config }))
      tsConfigCache.set(normalizedConfigPath, configs)
    } else {
      configs = cached
    }
    let matchedConfig: CachedConfig | undefined
    if (configs.length === 1) {
      matchedConfig = configs[0]
    } else {
      // resolve which config matches the current file
      for (const c of configs) {
        const base = normalizePath(
          (c.config.options.pathsBasePath as string) ||
            dirname(c.config.options.configFilePath as string)
        )
        const included: string[] = c.config.raw?.include
        const excluded: string[] = c.config.raw?.exclude
        if (
          (!included && (!base || containingFile.startsWith(base))) ||
          included.some(p => isMatch(containingFile, joinPaths(base, p)))
        ) {
          if (
            excluded &&
            excluded.some(p => isMatch(containingFile, joinPaths(base, p)))
          ) {
            continue
          }
          matchedConfig = c
          break
        }
      }
      if (!matchedConfig) {
        matchedConfig = configs[configs.length - 1]
      }
    }
    tsCompilerOptions = matchedConfig.config.options
    tsResolveCache =
      matchedConfig.cache ||
      (matchedConfig.cache = ts.createModuleResolutionCache(
        process.cwd(),
        createGetCanonicalFileName(ts.sys.useCaseSensitiveFileNames),
        tsCompilerOptions
      ))
  } else {
    tsCompilerOptions = {}
  }

  // 3. resolve
  const res = ts.resolveModuleName(
    source,
    containingFile,
    tsCompilerOptions,
    fs,
    tsResolveCache
  )

  if (res.resolvedModule) {
    let filename = res.resolvedModule.resolvedFileName
    if (filename.endsWith('.vue.ts')) {
      filename = filename.replace(/\.ts$/, '')
    }
    return filename
  }
}
/**
 * 
 * @param configPath 
 * @param fs 
 * @returns 
 * 函数 `loadTSConfig` 用于加载 TypeScript 的配置文件（tsconfig.json）。该函数接收两个参数：

1. `configPath`：配置文件的路径。
2. `fs`：代表文件系统的对象，用于读取文件内容。

函数的主要目的是解析并加载指定路径下的 TypeScript 配置文件，并返回解析后的配置对象数组。

具体的加载过程如下：

1. 首先，根据提供的 `fs` 对象和 `configPath`，通过调用 TypeScript 的 `ts.readConfigFile` 方法读取配置文件的内容。这里使用的是 TypeScript 提供的文件读取方法，如果在测试环境中，会使用一个 stubbed 的 `readDirectory` 方法。

2. 接着，使用 TypeScript 的 `ts.parseJsonConfigFileContent` 方法解析配置文件的内容，并得到一个 `ParsedCommandLine` 对象。这个对象包含了配置文件中的所有选项和信息。

3. 然后，将解析得到的配置对象存入一个数组 `res` 中。

4. 如果配置文件中包含了项目引用（`projectReferences`），则递归地加载每个项目引用的配置文件，并将它们的配置对象插入到 `res` 数组的开头。同时，还会将项目引用的路径与当前配置文件的路径进行映射，并存入全局的 `tsConfigRefMap` 对象中。

5. 最后，返回包含所有解析后的配置对象的数组 `res`。

需要注意的是，在测试环境中，为了方便测试，会使用一些特定的配置，例如设置 `useCaseSensitiveFileNames` 为 `true`，并提供一个 stubbed 的 `readDirectory` 方法。

这个函数的作用在于加载 TypeScript 的配置文件，并将配置文件中的选项和信息解析为可用的配置对象，以供后续使用。
 */
function loadTSConfig(configPath: string, fs: FS): TS.ParsedCommandLine[] {
  // The only case where `fs` is NOT `ts.sys` is during tests.
  // parse config host requires an extra `readDirectory` method
  // during tests, which is stubbed.
  const parseConfigHost = __TEST__
    ? {
        ...fs,
        useCaseSensitiveFileNames: true,
        readDirectory: () => []
      }
    : ts.sys
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(configPath, fs.readFile).config,
    parseConfigHost,
    dirname(configPath),
    undefined,
    configPath
  )
  const res = [config]
  if (config.projectReferences) {
    for (const ref of config.projectReferences) {
      tsConfigRefMap.set(ref.path, configPath)
      res.unshift(...loadTSConfig(ref.path, fs))
    }
  }
  return res
}
/**
 * `fileToScopeCache` 是一个缓存对象，用于存储已解析的文件对应的 `TypeScope` 对象。它使用 `createCache<TypeScope>()` 函数创建，该函数用于创建一个缓存对象，并指定缓存的值类型为 `TypeScope`。

缓存的作用是提高性能，避免重复解析同一个文件所对应的 `TypeScope` 对象。当需要解析一个文件对应的 `TypeScope` 对象时，首先检查缓存中是否已存在该文件的解析结果。如果存在，则直接返回缓存中的对象，避免重新解析。如果缓存中不存在该文件的解析结果，则进行解析，并将解析结果存入缓存中，以便下次使用。

使用缓存可以减少重复解析的开销，提高代码执行效率，特别是在多次解析相同文件的情况下。缓存对象的设计可以根据具体的需求进行调整，例如可以设置缓存的最大容量、缓存项的过期时间等，以满足不同的性能和内存需求。
 */
const fileToScopeCache = createCache<TypeScope>()

/**
 * @private
 * `invalidateTypeCache` 函数用于使特定文件的类型缓存无效。它接收一个文件名作为参数，并执行以下操作：

1. 规范化文件名：将文件名转换为标准格式，以确保与缓存中的键一致。

2. 删除 `fileToScopeCache` 中对应文件名的缓存项：通过 `fileToScopeCache.delete(filename)` 从缓存中删除指定文件名对应的缓存项，使之无效。

3. 删除 `tsConfigCache` 中对应文件名的缓存项：通过 `tsConfigCache.delete(filename)` 从缓存中删除指定文件名对应的缓存项，使之无效。

4. 检查受影响的配置文件：使用 `tsConfigRefMap` 根据指定文件名获取受影响的配置文件路径 `affectedConfig`。

5. 删除受影响的配置文件缓存项：如果存在受影响的配置文件路径 `affectedConfig`，则通过 `tsConfigCache.delete(affectedConfig)` 从缓存中删除对应的缓存项，使之无效。

通过执行这些操作，可以确保在对特定文件进行了修改或更新后，相关的类型缓存会被正确地清除，从而在下次需要使用类型缓存时重新解析和生成最新的缓存。这对于保持类型系统的准确性和一致性非常重要。
 */
export function invalidateTypeCache(filename: string) {
  filename = normalizePath(filename)
  fileToScopeCache.delete(filename)
  tsConfigCache.delete(filename)
  const affectedConfig = tsConfigRefMap.get(filename)
  if (affectedConfig) tsConfigCache.delete(affectedConfig)
}
/**
 * 
 * @param ctx 
 * @param filename 
 * @param asGlobal 
 * @returns 
 * `fileToScope` 函数用于将文件解析为类型作用域。它接收以下参数：

- `ctx`：类型解析上下文。
- `filename`：要解析的文件名。
- `asGlobal`：一个布尔值，指示是否将文件解析为全局作用域，默认为 `false`。

函数的主要逻辑如下：

1. 检查 `fileToScopeCache` 缓存中是否存在对应文件名的缓存项。如果存在缓存项，则直接返回缓存的类型作用域，不再重复解析。

2. 获取文件系统访问对象 `fs`，确保其存在。

3. 从文件系统中读取指定文件名的源代码内容 `source`。

4. 使用解析器（如 Babel）将源代码解析为抽象语法树（AST），并保存为 `body`。

5. 创建一个新的类型作用域对象 `scope`，并传入文件名、源代码、起始位置和记录的导入信息。

6. 调用 `recordTypes` 函数，根据解析得到的 AST，记录和收集类型信息到类型作用域 `scope` 中。

7. 将解析得到的类型作用域 `scope` 缓存到 `fileToScopeCache` 中，以备下次使用。

8. 返回解析得到的类型作用域 `scope`。

通过执行这些操作，`fileToScope` 函数可以解析指定文件的源代码，并将其中的类型信息记录到类型作用域中，以便后续的类型解析和引用。缓存机制可提高性能，避免重复解析相同的文件，从而加快类型解析的速度。
 */
export function fileToScope(
  ctx: TypeResolveContext,
  filename: string,
  asGlobal = false
): TypeScope {
  const cached = fileToScopeCache.get(filename)
  if (cached) {
    return cached
  }
  // fs should be guaranteed to exist here
  const fs = resolveFS(ctx)!
  const source = fs.readFile(filename) || ''
  const body = parseFile(filename, source, ctx.options.babelParserPlugins)
  const scope = new TypeScope(filename, source, 0, recordImports(body))
  recordTypes(ctx, body, scope, asGlobal)
  fileToScopeCache.set(filename, scope)
  return scope
}
/**
 * 
 * @param filename 
 * @param content 
 * @param parserPlugins 
 * @returns 
 * 
 * `parseFile` 函数用于解析文件内容并返回语法树中的语句列表。它接收以下参数：

- `filename`：要解析的文件名。
- `content`：文件的内容字符串。
- `parserPlugins`：可选参数，用于指定解析器的插件配置。

函数的主要逻辑如下：

1. 获取文件名的扩展名 `ext`。

2. 如果扩展名为 `.ts` 或 `.tsx`，则使用 Babel 解析器解析 TypeScript 内容。使用 `babelParse` 函数解析内容，并传入适当的配置，如解析器插件和源代码类型。

3. 如果扩展名为 `.vue`，则解析 Vue 单文件组件内容。使用 `parse` 函数解析内容，并获取 `script` 和 `scriptSetup` 块。如果两者均不存在，则返回空数组。

4. 根据 `script` 和 `scriptSetup` 的位置信息，确定正确的偏移量，将两个块的内容拼接成一个字符串 `scriptContent`。

5. 获取 `script` 或 `scriptSetup` 的语言类型 `lang`。

6. 使用 Babel 解析器解析 `scriptContent`，并传入适当的配置，如解析器插件和源代码类型。

7. 返回解析得到的语法树中的语句列表。

通过执行这些操作，`parseFile` 函数可以根据文件类型使用适当的解析器解析文件内容，并返回语法树中的语句列表。这些语句列表可以用于进一步的类型解析和处理。
 */
function parseFile(
  filename: string,
  content: string,
  parserPlugins?: SFCScriptCompileOptions['babelParserPlugins']
): Statement[] {
  const ext = extname(filename)
  if (ext === '.ts' || ext === '.tsx') {
    return babelParse(content, {
      plugins: resolveParserPlugins(
        ext.slice(1),
        parserPlugins,
        filename.endsWith('.d.ts')
      ),
      sourceType: 'module'
    }).program.body
  } else if (ext === '.vue') {
    const {
      descriptor: { script, scriptSetup }
    } = parse(content)
    if (!script && !scriptSetup) {
      return []
    }

    // ensure the correct offset with original source
    const scriptOffset = script ? script.loc.start.offset : Infinity
    const scriptSetupOffset = scriptSetup
      ? scriptSetup.loc.start.offset
      : Infinity
    const firstBlock = scriptOffset < scriptSetupOffset ? script : scriptSetup
    const secondBlock = scriptOffset < scriptSetupOffset ? scriptSetup : script

    let scriptContent =
      ' '.repeat(Math.min(scriptOffset, scriptSetupOffset)) +
      firstBlock!.content
    if (secondBlock) {
      scriptContent +=
        ' '.repeat(secondBlock.loc.start.offset - script!.loc.end.offset) +
        secondBlock.content
    }
    const lang = script?.lang || scriptSetup?.lang
    return babelParse(scriptContent, {
      plugins: resolveParserPlugins(lang!, parserPlugins),
      sourceType: 'module'
    }).program.body
  }
  return []
}
/**
 * 
 * @param ctx 
 * @returns 
 * `ctxToScope` 函数用于将 `TypeResolveContext` 对象转换为 `TypeScope` 对象。它接收一个上下文对象 `ctx`，并返回对应的作用域对象。

函数的主要逻辑如下：

1. 检查上下文对象中是否已存在作用域对象 `ctx.scope`，如果存在则直接返回该作用域对象。

2. 根据上下文对象中的信息创建作用域对象的属性 `body`。具体的逻辑如下：
   - 如果上下文对象中存在 `ast` 属性，则将其作为 `body` 属性的值。
   - 如果存在 `scriptAst` 和 `scriptSetupAst` 属性，则将两者的 `body` 属性合并为一个数组，并将其作为 `body` 属性的值。
   - 如果只存在 `scriptSetupAst` 属性，则将其 `body` 属性作为 `body` 属性的值。

3. 创建一个新的作用域对象 `scope`，并传入以下参数：
   - `ctx.filename`：文件名。
   - `ctx.source`：源代码字符串。
   - 根据上下文对象中的信息，确定作用域对象的起始偏移量 `startOffset`。
   - 根据上下文对象中的信息，确定作用域对象的用户导入 `userImports`。如果存在 `ctx.userImports` 属性，则将其作为 `userImports` 属性的值，否则将调用 `recordImports` 函数获取 `body` 中的导入信息。

4. 调用 `recordTypes` 函数，将上下文对象、`body` 和 `scope` 作为参数，记录类型信息到作用域对象中。

5. 将作用域对象保存到上下文对象的 `scope` 属性中。

6. 返回作用域对象。

通过执行这些操作，`ctxToScope` 函数将上下文对象转换为对应的作用域对象，并记录类型信息到作用域对象中。这样可以方便地在类型解析过程中使用作用域对象进行类型查找和处理。
 */
function ctxToScope(ctx: TypeResolveContext): TypeScope {
  if (ctx.scope) {
    return ctx.scope
  }

  const body =
    'ast' in ctx
      ? ctx.ast
      : ctx.scriptAst
      ? [...ctx.scriptAst.body, ...ctx.scriptSetupAst!.body]
      : ctx.scriptSetupAst!.body

  const scope = new TypeScope(
    ctx.filename,
    ctx.source,
    'startOffset' in ctx ? ctx.startOffset! : 0,
    'userImports' in ctx ? Object.create(ctx.userImports) : recordImports(body)
  )

  recordTypes(ctx, body, scope)

  return (ctx.scope = scope)
}
/**
 * `moduleDeclToScope` 函数用于将 TypeScript 模块声明节点（`TSModuleDeclaration`）转换为 `TypeScope` 对象，并为该节点创建一个子作用域。它接收三个参数：

1. `ctx`: 类型解析上下文对象（`TypeResolveContext`）。
2. `node`: TypeScript 模块声明节点，兼容附加了 `_resolvedChildScope` 属性的类型。
3. `parentScope`: 父作用域对象，作为新创建的子作用域的原型。

函数的主要逻辑如下：

1. 检查模块声明节点的 `_resolvedChildScope` 属性，如果已存在，则直接返回该子作用域。

2. 创建一个新的作用域对象 `scope`，并传入以下参数：
   - 使用 `parentScope` 的文件名、源代码字符串和偏移量作为新作用域的属性。
   - 创建一个新的对象作为 `imports` 属性，使用 `parentScope.imports` 作为原型。
   - 创建一个新的对象作为 `types` 属性，使用 `parentScope.types` 作为原型。
   - 创建一个新的对象作为 `declares` 属性，使用 `parentScope.declares` 作为原型。

3. 根据模块声明节点的类型执行不同的逻辑：
   - 如果节点的 `body` 类型是 `TSModuleDeclaration`，表示当前节点是一个嵌套的模块声明。将节点的 `id` 添加到 `scope.types` 和 `scope.exportedTypes` 中，并将 `node.body` 赋值给 `decl._ownerScope`，同时调用 `recordTypes` 函数记录类型信息到新的子作用域中。
   - 否则，如果 `node.body` 类型是 `BlockStatement`，表示当前节点是一个模块中的代码块。调用 `recordTypes` 函数记录代码块中的类型信息到新的子作用域中。

4. 将新创建的子作用域保存到模块声明节点的 `_resolvedChildScope` 属性中。

5. 返回子作用域。

通过执行这些操作，`moduleDeclToScope` 函数将 TypeScript 模块声明节点转换为对应的 `TypeScope` 子作用域，并将相关的类型信息记录到子作用域中。这样可以在模块中正确处理类型，并在类型解析过程中使用相关的作用域对象。
 */
function moduleDeclToScope(
  ctx: TypeResolveContext,
  node: TSModuleDeclaration & { _resolvedChildScope?: TypeScope },
  parentScope: TypeScope
): TypeScope {
  if (node._resolvedChildScope) {
    return node._resolvedChildScope
  }

  const scope = new TypeScope(
    parentScope.filename,
    parentScope.source,
    parentScope.offset,
    Object.create(parentScope.imports),
    Object.create(parentScope.types),
    Object.create(parentScope.declares)
  )

  if (node.body.type === 'TSModuleDeclaration') {
    const decl = node.body as TSModuleDeclaration & WithScope
    decl._ownerScope = scope
    const id = getId(decl.id)
    scope.types[id] = scope.exportedTypes[id] = decl
  } else {
    recordTypes(ctx, node.body.body, scope)
  }

  return (node._resolvedChildScope = scope)
}
/**
 * `importExportRE` 是一个正则表达式，用于匹配以 "Import" 或 "Export" 开头的字符串。

具体的正则表达式是 `/^Import|^Export/`，其中：

- `^Import` 匹配以 "Import" 开头的字符串。
- `^Export` 匹配以 "Export" 开头的字符串。

该正则表达式可以用于检查字符串是否以 "Import" 或 "Export" 开头，用于识别导入和导出相关的语句或声明。
 */
const importExportRE = /^Import|^Export/
/**
 * 
 * @param ctx 
 * @param body 
 * @param scope 
 * @param asGlobal
 * `recordTypes` 函数用于记录类型信息。

该函数接收以下参数：
- `ctx`：类型解析上下文。
- `body`：语句数组，表示要记录类型的语句。
- `scope`：类型作用域，用于存储记录的类型信息。
- `asGlobal`：一个布尔值，表示是否将类型记录为全局类型。默认为 `false`。

在函数内部，根据参数 `asGlobal` 的值和语句的类型，将相应的类型信息记录到指定的作用域中。具体的记录逻辑如下：

1. 如果 `asGlobal` 为 `true`，并且语句数组中没有以 "Import" 或 "Export" 开头的语句，则将类型视为全局声明，将其记录到 `types` 和 `declares` 对象中。
2. 如果 `asGlobal` 为 `true`，并且语句是一个全局模块声明，则将该模块声明体中的语句记录到 `types` 和 `declares` 对象中。
3. 如果 `asGlobal` 为 `false`，则将语句记录到 `types` 和 `declares` 对象中。
4. 如果语句是一个命名导出声明（`ExportNamedDeclaration`），则根据声明的类型进行记录：
   - 如果存在声明语句（`declaration`），则将声明记录到 `types` 和 `declares` 对象中，同时将其记录到 `exportedTypes` 和 `exportedDeclares` 对象中。
   - 如果存在导出符号（`ExportSpecifier`），则根据导出的来源和本地变量名记录导入和导出的类型引用。
5. 如果语句是一个导出全部声明（`ExportAllDeclaration`），则将该导入源的导出类型合并到当前作用域的 `exportedTypes` 中。
6. 如果语句是一个默认导出声明（`ExportDefaultDeclaration`），并且存在声明语句，则将声明记录到 `types` 和 `declares` 对象中，同时将其记录到 `exportedTypes` 和 `exportedDeclares` 对象中；如果声明语句是一个标识符（`Identifier`），并且该标识符在 `types` 中有对应的类型，则将该类型记录为默认导出类型。
7. 最后，将所有记录的类型信息的 `_ownerScope` 设置为当前作用域，并将所有命名空间类型的 `_ownerScope` 设置为当前作用域。

总之，`recordTypes` 函数通过遍历语句数组，根据不同的语句类型将类型信息记录到指定的作用域中，包括全局类型、导出类型和默认导出类型等。 
 */
function recordTypes(
  ctx: TypeResolveContext,
  body: Statement[],
  scope: TypeScope,
  asGlobal = false
) {
  const { types, declares, exportedTypes, exportedDeclares, imports } = scope
  const isAmbient = asGlobal
    ? !body.some(s => importExportRE.test(s.type))
    : false
  for (const stmt of body) {
    if (asGlobal) {
      if (isAmbient) {
        if ((stmt as any).declare) {
          recordType(stmt, types, declares)
        }
      } else if (stmt.type === 'TSModuleDeclaration' && stmt.global) {
        for (const s of (stmt.body as TSModuleBlock).body) {
          recordType(s, types, declares)
        }
      }
    } else {
      recordType(stmt, types, declares)
    }
  }
  if (!asGlobal) {
    for (const stmt of body) {
      if (stmt.type === 'ExportNamedDeclaration') {
        if (stmt.declaration) {
          recordType(stmt.declaration, types, declares)
          recordType(stmt.declaration, exportedTypes, exportedDeclares)
        } else {
          for (const spec of stmt.specifiers) {
            if (spec.type === 'ExportSpecifier') {
              const local = spec.local.name
              const exported = getId(spec.exported)
              if (stmt.source) {
                // re-export, register an import + export as a type reference
                imports[exported] = {
                  source: stmt.source.value,
                  imported: local
                }
                exportedTypes[exported] = {
                  type: 'TSTypeReference',
                  typeName: {
                    type: 'Identifier',
                    name: local
                  },
                  _ownerScope: scope
                }
              } else if (types[local]) {
                // exporting local defined type
                exportedTypes[exported] = types[local]
              }
            }
          }
        }
      } else if (stmt.type === 'ExportAllDeclaration') {
        const sourceScope = importSourceToScope(
          ctx,
          stmt.source,
          scope,
          stmt.source.value
        )
        Object.assign(scope.exportedTypes, sourceScope.exportedTypes)
      } else if (stmt.type === 'ExportDefaultDeclaration' && stmt.declaration) {
        if (stmt.declaration.type !== 'Identifier') {
          recordType(stmt.declaration, types, declares, 'default')
          recordType(
            stmt.declaration,
            exportedTypes,
            exportedDeclares,
            'default'
          )
        } else if (types[stmt.declaration.name]) {
          exportedTypes['default'] = types[stmt.declaration.name]
        }
      }
    }
  }
  for (const key of Object.keys(types)) {
    const node = types[key]
    node._ownerScope = scope
    if (node._ns) node._ns._ownerScope = scope
  }
  for (const key of Object.keys(declares)) {
    declares[key]._ownerScope = scope
  }
}
/**
 * 
 * @param node 
 * @param types 
 * @param declares 
 * @param overwriteId
 * `recordType` 函数用于记录单个类型节点。

该函数接收以下参数：
- `node`：要记录的类型节点。
- `types`：存储类型的对象。
- `declares`：存储声明的对象。
- `overwriteId`：可选参数，用于指定要覆盖的类型节点的标识符。

在函数内部，根据节点的类型进行相应的处理。具体的处理逻辑如下：

1. 对于 `TSInterfaceDeclaration`、`TSEnumDeclaration` 和 `TSModuleDeclaration` 类型的节点，根据节点的标识符获取对应的类型 ID。如果存在相同的类型 ID，则进行合并处理；否则将节点记录到 `types` 对象中。具体处理如下：
   - 对于 `TSModuleDeclaration` 类型的节点，如果存在相同的类型 ID，则将当前节点的命名空间合并到已存在的节点中；如果已存在的节点不是 `TSModuleDeclaration` 类型，则将当前节点作为命名空间附加到已存在的节点上。
   - 对于其他类型的节点，如果存在相同的类型 ID，则将当前节点的成员合并到已存在的节点中。
2. 对于 `ClassDeclaration` 类型的节点，将节点记录到 `types` 对象中。
3. 对于 `TSTypeAliasDeclaration` 类型的节点，将节点的类型注解记录到 `types` 对象中，以类型别名的名称作为键。
4. 对于 `TSDeclareFunction` 类型的节点，如果节点有标识符，则将节点记录到 `declares` 对象中，以标识符的名称作为键。
5. 对于 `VariableDeclaration` 类型的节点，如果节点有 `declare` 标志，则遍历声明列表中的每个声明，如果声明的标识符是 `Identifier` 类型且有类型注解，则将类型注解记录到 `declares` 对象中，以标识符的名称作为键。

总之，`recordType` 函数根据节点的类型将类型节点记录到指定的对象中，用于记录类型和声明信息。 
 */
function recordType(
  node: Node,
  types: Record<string, Node>,
  declares: Record<string, Node>,
  overwriteId?: string
) {
  switch (node.type) {
    case 'TSInterfaceDeclaration':
    case 'TSEnumDeclaration':
    case 'TSModuleDeclaration': {
      const id = overwriteId || getId(node.id)
      let existing = types[id]
      if (existing) {
        if (node.type === 'TSModuleDeclaration') {
          if (existing.type === 'TSModuleDeclaration') {
            mergeNamespaces(existing as typeof node, node)
          } else {
            attachNamespace(existing, node)
          }
          break
        }
        if (existing.type === 'TSModuleDeclaration') {
          // replace and attach namespace
          types[id] = node
          attachNamespace(node, existing)
          break
        }

        if (existing.type !== node.type) {
          // type-level error
          break
        }
        if (node.type === 'TSInterfaceDeclaration') {
          ;(existing as typeof node).body.body.push(...node.body.body)
        } else {
          ;(existing as typeof node).members.push(...node.members)
        }
      } else {
        types[id] = node
      }
      break
    }
    case 'ClassDeclaration':
      types[overwriteId || getId(node.id)] = node
      break
    case 'TSTypeAliasDeclaration':
      types[node.id.name] = node.typeAnnotation
      break
    case 'TSDeclareFunction':
      if (node.id) declares[node.id.name] = node
      break
    case 'VariableDeclaration': {
      if (node.declare) {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier' && decl.id.typeAnnotation) {
            declares[decl.id.name] = (
              decl.id.typeAnnotation as TSTypeAnnotation
            ).typeAnnotation
          }
        }
      }
      break
    }
  }
}
/**
 * 
 * @param to 
 * @param from 
 * `mergeNamespaces` 函数用于合并命名空间。

该函数接收两个 `TSModuleDeclaration` 类型的参数：`to` 和 `from`，分别表示要合并到的目标命名空间和要合并的源命名空间。

函数的处理逻辑如下：

1. 获取目标命名空间和源命名空间的 `body` 属性。
2. 如果目标命名空间的 `body` 是 `TSModuleDeclaration` 类型，则进一步判断源命名空间的 `body` 类型：
   - 如果源命名空间的 `body` 也是 `TSModuleDeclaration` 类型，则递归调用 `mergeNamespaces` 函数，将源命名空间的 `body` 合并到目标命名空间的 `body` 中。
   - 否则，将目标命名空间的 `body` 作为声明导出附加到源命名空间的 `body` 中，导出的类型为 `type`。
3. 如果目标命名空间的 `body` 不是 `TSModuleDeclaration` 类型，但源命名空间的 `body` 是 `TSModuleDeclaration` 类型，则将源命名空间的 `body` 作为声明导出附加到目标命名空间的 `body` 中，导出的类型为 `type`。
4. 如果目标命名空间和源命名空间的 `body` 都不是 `TSModuleDeclaration` 类型，则将源命名空间的 `body` 的成员直接合并到目标命名空间的 `body` 中。

总之，`mergeNamespaces` 函数用于合并命名空间，根据不同的情况将源命名空间的内容合并到目标命名空间中。
 */
function mergeNamespaces(to: TSModuleDeclaration, from: TSModuleDeclaration) {
  const toBody = to.body
  const fromBody = from.body
  if (toBody.type === 'TSModuleDeclaration') {
    if (fromBody.type === 'TSModuleDeclaration') {
      // both decl
      mergeNamespaces(toBody, fromBody)
    } else {
      // to: decl -> from: block
      fromBody.body.push({
        type: 'ExportNamedDeclaration',
        declaration: toBody,
        exportKind: 'type',
        specifiers: []
      })
    }
  } else if (fromBody.type === 'TSModuleDeclaration') {
    // to: block <- from: decl
    toBody.body.push({
      type: 'ExportNamedDeclaration',
      declaration: fromBody,
      exportKind: 'type',
      specifiers: []
    })
  } else {
    // both block
    toBody.body.push(...fromBody.body)
  }
}
/**
 * 
 * @param to 
 * @param ns 
 * `attachNamespace` 函数用于将命名空间附加到节点上。

该函数接收两个参数：`to` 和 `ns`，分别表示要附加到的目标节点和要附加的命名空间。

函数的处理逻辑如下：

1. 检查目标节点的 `_ns` 属性，如果不存在，则将命名空间赋值给 `_ns`。
2. 如果目标节点的 `_ns` 属性已经存在，则调用 `mergeNamespaces` 函数，将命名空间与目标节点的 `_ns` 属性进行合并。

总之，`attachNamespace` 函数用于将命名空间附加到节点上，如果节点已经存在命名空间，则将命名空间与现有的命名空间进行合并。
 */
function attachNamespace(
  to: Node & { _ns?: TSModuleDeclaration },
  ns: TSModuleDeclaration
) {
  if (!to._ns) {
    to._ns = ns
  } else {
    mergeNamespaces(to._ns, ns)
  }
}
/**
 * 
 * @param body 
 * @returns 
 * `recordImports` 函数用于记录代码文件中的导入语句，并返回一个包含导入信息的对象。

该函数接收一个参数 `body`，表示代码文件的语句数组。

函数的处理逻辑如下：

1. 创建一个空对象 `imports`，用于存储导入信息。
2. 遍历语句数组 `body`，对每个语句调用 `recordImport` 函数，将导入信息记录到 `imports` 对象中。
3. 返回 `imports` 对象，其中包含了代码文件中的导入信息。

总之，`recordImports` 函数用于遍历代码文件的语句数组，记录其中的导入语句，并返回一个对象，该对象包含了代码文件中的导入信息。
 */
export function recordImports(body: Statement[]) {
  const imports: TypeScope['imports'] = Object.create(null)
  for (const s of body) {
    recordImport(s, imports)
  }
  return imports
}
/**
 * 
 * @param node 
 * @param imports 
 * @returns 
 * `recordImport` 函数用于记录单个导入语句的信息，并将其添加到导入信息对象中。

该函数接收两个参数：`node` 表示要记录的节点，`imports` 表示存储导入信息的对象。

函数的处理逻辑如下：

1. 首先检查 `node` 的类型，如果不是 `ImportDeclaration`，则直接返回，不进行记录。
2. 对于 `ImportDeclaration` 类型的节点，遍历其中的 `specifiers`，即导入符号列表。
3. 对于每个导入符号，将其本地名称（`s.local.name`）作为键，创建一个对象作为值，该对象包含两个属性：
   - `imported`：调用 `getImportedName(s)` 获取导入的名称。
   - `source`：获取导入语句的源路径（`node.source.value`）。
4. 将上述创建的对象添加到 `imports` 对象中，以本地名称为键。
5. 继续处理其他导入语句，直到遍历完所有的语句。

总之，`recordImport` 函数用于记录单个导入语句的信息，并将其添加到导入信息对象中，其中包括导入的本地名称、导入的名称和源路径。
 */
function recordImport(node: Node, imports: TypeScope['imports']) {
  if (node.type !== 'ImportDeclaration') {
    return
  }
  for (const s of node.specifiers) {
    imports[s.local.name] = {
      imported: getImportedName(s),
      source: node.source.value
    }
  }
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `inferRuntimeType` 函数用于推断节点的运行时类型，并返回一个字符串数组表示推断的类型。

该函数接收三个参数：`ctx` 表示类型解析的上下文，`node` 表示要推断类型的节点，`scope` 表示节点所在的作用域（可选，默认为节点的所有者作用域或上下文的作用域）。

函数的处理逻辑如下：

1. 首先尝试根据节点的类型进行类型推断。
2. 对于不同的节点类型，根据其语义进行推断处理，并返回相应的运行时类型。
3. 如果推断失败或出现异常，函数会捕获错误，并返回一个未知类型的数组 `[UNKNOWN_TYPE]`，表示无法进行运行时类型检查。
4. 函数可能会涉及递归调用，例如对于嵌套的类型或引用类型，会进一步解析和推断。
5. 最终返回推断的类型数组。

总之，`inferRuntimeType` 函数根据节点的类型推断其在运行时的类型，并返回一个字符串数组表示推断的类型。
 */
export function inferRuntimeType(
  ctx: TypeResolveContext,
  node: Node & MaybeWithScope,
  scope = node._ownerScope || ctxToScope(ctx)
): string[] {
  try {
    switch (node.type) {
      case 'TSStringKeyword':
        return ['String']
      case 'TSNumberKeyword':
        return ['Number']
      case 'TSBooleanKeyword':
        return ['Boolean']
      case 'TSObjectKeyword':
        return ['Object']
      case 'TSNullKeyword':
        return ['null']
      case 'TSTypeLiteral':
      case 'TSInterfaceDeclaration': {
        // TODO (nice to have) generate runtime property validation
        const types = new Set<string>()
        const members =
          node.type === 'TSTypeLiteral' ? node.members : node.body.body
        for (const m of members) {
          if (
            m.type === 'TSCallSignatureDeclaration' ||
            m.type === 'TSConstructSignatureDeclaration'
          ) {
            types.add('Function')
          } else {
            types.add('Object')
          }
        }
        return types.size ? Array.from(types) : ['Object']
      }
      case 'TSPropertySignature':
        if (node.typeAnnotation) {
          return inferRuntimeType(
            ctx,
            node.typeAnnotation.typeAnnotation,
            scope
          )
        }
      case 'TSMethodSignature':
      case 'TSFunctionType':
        return ['Function']
      case 'TSArrayType':
      case 'TSTupleType':
        // TODO (nice to have) generate runtime element type/length checks
        return ['Array']

      case 'TSLiteralType':
        switch (node.literal.type) {
          case 'StringLiteral':
            return ['String']
          case 'BooleanLiteral':
            return ['Boolean']
          case 'NumericLiteral':
          case 'BigIntLiteral':
            return ['Number']
          default:
            return [UNKNOWN_TYPE]
        }

      case 'TSTypeReference': {
        const resolved = resolveTypeReference(ctx, node, scope)
        if (resolved) {
          return inferRuntimeType(ctx, resolved, resolved._ownerScope)
        }
        if (node.typeName.type === 'Identifier') {
          switch (node.typeName.name) {
            case 'Array':
            case 'Function':
            case 'Object':
            case 'Set':
            case 'Map':
            case 'WeakSet':
            case 'WeakMap':
            case 'Date':
            case 'Promise':
              return [node.typeName.name]

            // TS built-in utility types
            // https://www.typescriptlang.org/docs/handbook/utility-types.html
            case 'Partial':
            case 'Required':
            case 'Readonly':
            case 'Record':
            case 'Pick':
            case 'Omit':
            case 'InstanceType':
              return ['Object']

            case 'Uppercase':
            case 'Lowercase':
            case 'Capitalize':
            case 'Uncapitalize':
              return ['String']

            case 'Parameters':
            case 'ConstructorParameters':
              return ['Array']

            case 'NonNullable':
              if (node.typeParameters && node.typeParameters.params[0]) {
                return inferRuntimeType(
                  ctx,
                  node.typeParameters.params[0],
                  scope
                ).filter(t => t !== 'null')
              }
              break
            case 'Extract':
              if (node.typeParameters && node.typeParameters.params[1]) {
                return inferRuntimeType(
                  ctx,
                  node.typeParameters.params[1],
                  scope
                )
              }
              break
            case 'Exclude':
            case 'OmitThisParameter':
              if (node.typeParameters && node.typeParameters.params[0]) {
                return inferRuntimeType(
                  ctx,
                  node.typeParameters.params[0],
                  scope
                )
              }
              break
          }
        }
        // cannot infer, fallback to UNKNOWN: ThisParameterType
        break
      }

      case 'TSParenthesizedType':
        return inferRuntimeType(ctx, node.typeAnnotation, scope)

      case 'TSUnionType':
        return flattenTypes(ctx, node.types, scope)
      case 'TSIntersectionType': {
        return flattenTypes(ctx, node.types, scope).filter(
          t => t !== UNKNOWN_TYPE
        )
      }

      case 'TSEnumDeclaration':
        return inferEnumType(node)

      case 'TSSymbolKeyword':
        return ['Symbol']

      case 'TSIndexedAccessType': {
        const types = resolveIndexType(ctx, node, scope)
        return flattenTypes(ctx, types, scope)
      }

      case 'ClassDeclaration':
        return ['Object']

      case 'TSImportType': {
        const sourceScope = importSourceToScope(
          ctx,
          node.argument,
          scope,
          node.argument.value
        )
        const resolved = resolveTypeReference(ctx, node, sourceScope)
        if (resolved) {
          return inferRuntimeType(ctx, resolved, resolved._ownerScope)
        }
        break
      }

      case 'TSTypeQuery': {
        const id = node.exprName
        if (id.type === 'Identifier') {
          // typeof only support identifier in local scope
          const matched = scope.declares[id.name]
          if (matched) {
            return inferRuntimeType(ctx, matched, matched._ownerScope)
          }
        }
        break
      }
    }
  } catch (e) {
    // always soft fail on failed runtime type inference
  }
  return [UNKNOWN_TYPE] // no runtime check
}
/**
 * 
 * @param ctx 
 * @param types 
 * @param scope 
 * @returns 
 * `flattenTypes` 函数用于扁平化多个类型并返回一个唯一的字符串数组表示这些类型的运行时类型。

该函数接收三个参数：`ctx` 表示类型解析的上下文，`types` 表示要扁平化的类型数组，`scope` 表示类型所在的作用域。

函数的处理逻辑如下：

1. 如果类型数组的长度为 1，直接调用 `inferRuntimeType` 函数对该类型进行推断，并返回推断结果。
2. 对于长度大于 1 的类型数组，将每个类型通过 `inferRuntimeType` 函数进行推断，并将推断结果合并为一个数组。
3. 使用 `Set` 数据结构对合并后的数组进行去重，确保每个运行时类型只出现一次。
4. 将去重后的数组转换为字符串数组，并返回作为最终的结果。

总之，`flattenTypes` 函数用于扁平化多个类型，并返回一个唯一的字符串数组表示这些类型的运行时类型。
 */
function flattenTypes(
  ctx: TypeResolveContext,
  types: TSType[],
  scope: TypeScope
): string[] {
  if (types.length === 1) {
    return inferRuntimeType(ctx, types[0], scope)
  }
  return [
    ...new Set(
      ([] as string[]).concat(
        ...types.map(t => inferRuntimeType(ctx, t, scope))
      )
    )
  ]
}
/**
 * 
 * @param node 
 * @returns 
 * `inferEnumType` 函数用于推断枚举类型的运行时类型。

该函数接收一个 `TSEnumDeclaration` 类型的参数 `node`，表示要推断的枚举声明节点。

函数的处理逻辑如下：

1. 创建一个 `Set` 数据结构 `types`，用于存储推断的运行时类型。
2. 遍历枚举声明节点的成员列表 `node.members`。
3. 对于每个成员 `m`，检查其是否有初始化器 `m.initializer`。
4. 如果有初始化器，则根据初始化器的类型进行判断：
   - 如果初始化器的类型是 `StringLiteral`，将运行时类型设为 `'String'`。
   - 如果初始化器的类型是 `NumericLiteral`，将运行时类型设为 `'Number'`。
5. 将推断得到的运行时类型添加到 `types` 集合中。
6. 如果 `types` 集合的大小大于 0，将集合转换为数组并返回作为最终的结果。
7. 如果 `types` 集合的大小为 0，表示没有找到有效的初始化器，则默认将运行时类型设为 `'Number'`。

总之，`inferEnumType` 函数用于推断枚举类型的运行时类型，根据枚举成员的初始化器来确定枚举的基础类型。如果没有有效的初始化器，则默认将运行时类型设为 `'Number'`。返回的结果是一个字符串数组，表示推断得到的运行时类型。
 */
function inferEnumType(node: TSEnumDeclaration): string[] {
  const types = new Set<string>()
  for (const m of node.members) {
    if (m.initializer) {
      switch (m.initializer.type) {
        case 'StringLiteral':
          types.add('String')
          break
        case 'NumericLiteral':
          types.add('Number')
          break
      }
    }
  }
  return types.size ? [...types] : ['Number']
}

/**
 * support for the `ExtractPropTypes` helper - it's non-exhaustive, mostly
 * tailored towards popular component libs like element-plus and antd-vue.
 * `resolveExtractPropTypes` 函数接收一个 `ResolvedElements` 对象和一个 `TypeScope` 作为输入，并从 `ResolvedElements` 的 `props` 属性中解析属性类型。

该函数的工作步骤如下：

1. 创建一个空的 `ResolvedElements` 对象 `res`，并在其中创建一个空的 `props` 属性。
2. 遍历 `props` 对象中的每个键。
3. 对于每个键，获取相应的原始属性信息，存储在 `props[key]` 中。
4. 调用 `reverseInferType` 函数，将键、属性的类型注解和提供的作用域作为参数传递给它。这个函数负责反向推断属性的运行时类型，即根据提供的类型注解来推断属性的实际类型。
5. 推断得到的属性类型赋值给 `res.props[key]`。
6. 遍历所有属性后，返回包含解析后属性类型的 `res` 对象。

简而言之，`resolveExtractPropTypes` 函数通过遍历属性、反向推断属性类型，并返回一个包含解析后属性类型的新的 `ResolvedElements` 对象，从而解析 `ResolvedElements` 对象中的属性类型。
 */
function resolveExtractPropTypes(
  { props }: ResolvedElements,
  scope: TypeScope
): ResolvedElements {
  const res: ResolvedElements = { props: {} }
  for (const key in props) {
    const raw = props[key]
    res.props[key] = reverseInferType(
      raw.key,
      raw.typeAnnotation!.typeAnnotation,
      scope
    )
  }
  return res
}
/**
 * 
 * @param key 
 * @param node 
 * @param scope 
 * @param optional 
 * @param checkObjectSyntax 
 * @returns 
 * `reverseInferType` 函数根据给定的键（`key`）、类型节点（`node`）、作用域（`scope`）以及其他可选参数，反向推断属性的属性签名（`TSPropertySignature`）和作用域。

函数的主要工作步骤如下：

1. 如果 `checkObjectSyntax` 为 `true` 并且类型节点的类型为 `TSTypeLiteral`，则检查类型节点中是否存在 `type` 属性。如果存在，则获取 `type` 属性的类型。
   - 如果存在 `required` 属性并且其类型为 `TSLiteralType`，且字面量类型为 `BooleanLiteral`，则根据字面量的值判断属性是否为可选属性。
   - 通过递归调用 `reverseInferType` 函数，将 `key`、`typeType`（`type` 属性的类型）以及其他参数传递给它，继续反向推断类型。
2. 如果类型节点的类型为 `TSTypeReference`，并且 `typeName` 的类型为 `Identifier`，则进一步检查 `typeName` 的名称。
   - 如果 `typeName` 的名称以 `Constructor` 结尾，表示它是一个构造函数的引用，将其转换为相应的类型。
   - 如果 `typeName` 的名称为 `PropType` 并且存在 `typeParameters`，则将类型参数中的第一个参数作为属性的类型。
3. 如果类型节点的类型为 `TSTypeReference` 或 `TSImportType`，并且存在 `typeParameters`，则尝试捕获 `node.typeParameters.params` 中的类型节点。
   - 通过递归调用 `reverseInferType` 函数，将 `key`、类型节点、作用域以及其他参数传递给它，继续反向推断类型。
   - 如果找到了属性签名，则返回找到的属性签名。
4. 如果上述步骤均未找到属性签名，则创建一个属性签名，类型为 `TSNullKeyword`，并根据提供的参数设置属性的可选性。
5. 返回生成的属性签名。

简而言之，`reverseInferType` 函数根据给定的键和类型节点，通过反向推断的方式创建一个属性签名。它支持检查对象语法和特定类型的引用，可以递归地处理嵌套的类型节点，并根据需要设置属性的可选性。如果无法推断属性的属性签名，则创建一个具有 `TSNullKeyword` 类型的属性签名作为默认值。
 */
function reverseInferType(
  key: Expression,
  node: TSType,
  scope: TypeScope,
  optional = true,
  checkObjectSyntax = true
): TSPropertySignature & WithScope {
  if (checkObjectSyntax && node.type === 'TSTypeLiteral') {
    // check { type: xxx }
    const typeType = findStaticPropertyType(node, 'type')
    if (typeType) {
      const requiredType = findStaticPropertyType(node, 'required')
      const optional =
        requiredType &&
        requiredType.type === 'TSLiteralType' &&
        requiredType.literal.type === 'BooleanLiteral'
          ? !requiredType.literal.value
          : true
      return reverseInferType(key, typeType, scope, optional, false)
    }
  } else if (
    node.type === 'TSTypeReference' &&
    node.typeName.type === 'Identifier'
  ) {
    if (node.typeName.name.endsWith('Constructor')) {
      return createProperty(
        key,
        ctorToType(node.typeName.name),
        scope,
        optional
      )
    } else if (node.typeName.name === 'PropType' && node.typeParameters) {
      // PropType<{}>
      return createProperty(key, node.typeParameters.params[0], scope, optional)
    }
  }
  if (
    (node.type === 'TSTypeReference' || node.type === 'TSImportType') &&
    node.typeParameters
  ) {
    // try if we can catch Foo.Bar<XXXConstructor>
    for (const t of node.typeParameters.params) {
      const inferred = reverseInferType(key, t, scope, optional)
      if (inferred) return inferred
    }
  }
  return createProperty(key, { type: `TSNullKeyword` }, scope, optional)
}
/**
 * 
 * @param ctorType 
 * @returns 
 * `ctorToType` 函数用于将构造函数类型转换为相应的类型节点（`TSType`）。

函数的工作流程如下：

1. 首先，根据传入的构造函数类型（`ctorType`），去除末尾的 "Constructor"，得到构造函数的名称（`ctor`）。
2. 使用 `switch` 语句根据构造函数的名称进行匹配。
   - 对于字符串、数字和布尔类型，返回相应的类型节点，类型为 `TSStringKeyword`、`TSNumberKeyword` 和 `TSBooleanKeyword`。
   - 对于数组、函数、对象、Set、Map、WeakSet、WeakMap、Date 和 Promise 类型，返回相应的类型节点，类型为 `TSTypeReference`，其中 `typeName` 是一个 `Identifier`，名称为构造函数的名称。
3. 如果构造函数的名称不匹配上述情况，则返回一个具有 `TSNullKeyword` 类型的类型节点，作为默认情况的回退值。
4. 返回生成的类型节点。

总结来说，`ctorToType` 函数根据给定的构造函数类型，将其转换为相应的类型节点。它通过匹配构造函数名称，并返回相应的类型节点来实现类型转换。如果构造函数的名称不匹配任何已知类型，则返回一个具有 `TSNullKeyword` 类型的类型节点作为默认值。
 */
function ctorToType(ctorType: string): TSType {
  const ctor = ctorType.slice(0, -11)
  switch (ctor) {
    case 'String':
    case 'Number':
    case 'Boolean':
      return { type: `TS${ctor}Keyword` }
    case 'Array':
    case 'Function':
    case 'Object':
    case 'Set':
    case 'Map':
    case 'WeakSet':
    case 'WeakMap':
    case 'Date':
    case 'Promise':
      return {
        type: 'TSTypeReference',
        typeName: { type: 'Identifier', name: ctor }
      }
  }
  // fallback to null
  return { type: `TSNullKeyword` }
}
/**
 * 
 * @param node 
 * @param key 
 * @returns 
 * `findStaticPropertyType` 函数用于从 `TSTypeLiteral` 类型节点中查找具有指定属性名的静态属性的类型。

函数的工作流程如下：

1. 首先，使用 `find` 方法在 `TSTypeLiteral` 的 `members` 数组中查找满足条件的属性。
2. 在 `find` 方法的回调函数中，对每个属性执行以下条件检查：
   - 属性的类型为 `TSPropertySignature`，表示它是一个属性签名节点。
   - 属性不是计算属性，即 `computed` 为 `false`。
   - 属性的键名对应于要查找的属性名 `key`，通过调用 `getId` 函数获得属性名的标识符形式，用于比较。
   - 属性有类型注解，即 `typeAnnotation` 不为 `null`。
3. 如果找到满足上述条件的属性，则返回该属性的类型注解节点 `typeAnnotation!.typeAnnotation`，即属性的类型。
4. 如果未找到满足条件的属性，则返回 `undefined`。

总结来说，`findStaticPropertyType` 函数在给定的 `TSTypeLiteral` 类型节点中查找具有指定属性名的静态属性，并返回该属性的类型节点。函数通过遍历 `TSTypeLiteral` 的成员来寻找匹配的属性，并执行一系列条件检查来确定是否找到了符合要求的属性。如果找到了匹配的属性，则返回其类型；如果未找到匹配的属性，则返回 `undefined`。
 */
function findStaticPropertyType(node: TSTypeLiteral, key: string) {
  const prop = node.members.find(
    m =>
      m.type === 'TSPropertySignature' &&
      !m.computed &&
      getId(m.key) === key &&
      m.typeAnnotation
  )
  return prop && prop.typeAnnotation!.typeAnnotation
}
/**
 * 
 * @param ctx 
 * @param arg 
 * @param scope 
 * @returns 
 * `resolveReturnType` 函数用于解析函数的返回类型。

函数的工作流程如下：

1. 首先，将 `arg` 参数作为 `resolved` 变量的初始值。`resolved` 用于存储已解析的节点。
2. 判断 `arg` 的类型是否为 `'TSTypeReference'`、`'TSTypeQuery'` 或 `'TSImportType'`，如果是，则调用 `resolveTypeReference` 函数解析类型引用，将解析结果赋值给 `resolved`。
3. 如果 `resolved` 为空，则直接返回。
4. 判断 `resolved` 的类型：
   - 如果为 `'TSFunctionType'`，则返回其 `typeAnnotation?.typeAnnotation` 属性，即函数类型的返回类型。
   - 如果为 `'TSDeclareFunction'`，则返回其 `returnType` 属性，即函数声明的返回类型。
5. 如果 `resolved` 的类型不满足上述条件，则返回 `undefined`。

总结来说，`resolveReturnType` 函数根据传入的节点 `arg` 解析函数的返回类型。如果 `arg` 是类型引用节点，将其解析为具体类型；然后根据解析后的节点类型，返回相应的返回类型节点。如果无法解析或节点类型不满足条件，则返回 `undefined`。
 */
function resolveReturnType(
  ctx: TypeResolveContext,
  arg: Node,
  scope: TypeScope
) {
  let resolved: Node | undefined = arg
  if (
    arg.type === 'TSTypeReference' ||
    arg.type === 'TSTypeQuery' ||
    arg.type === 'TSImportType'
  ) {
    resolved = resolveTypeReference(ctx, arg, scope)
  }
  if (!resolved) return
  if (resolved.type === 'TSFunctionType') {
    return resolved.typeAnnotation?.typeAnnotation
  }
  if (resolved.type === 'TSDeclareFunction') {
    return resolved.returnType
  }
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param scope 
 * @returns 
 * `resolveUnionType` 函数用于解析联合类型。

函数的工作流程如下：

1. 首先判断 `node` 的类型是否为 `'TSTypeReference'`，如果是，则调用 `resolveTypeReference` 函数解析类型引用，将解析结果赋值给 `node`。
2. 接下来定义一个 `types` 变量，用于存储解析后的类型节点。
3. 如果 `node` 的类型是 `'TSUnionType'`，表示当前节点为联合类型，则遍历联合类型的成员，对每个成员递归调用 `resolveUnionType` 函数，并将结果扁平化为一个数组，存储到 `types` 中。
4. 如果 `node` 的类型不是 `'TSUnionType'`，则将当前节点作为单个类型节点存储到 `types` 中。
5. 返回解析后的 `types` 数组。

总结来说，`resolveUnionType` 函数用于解析联合类型。它会递归解析类型引用，并将联合类型的成员展开为一个类型节点数组。如果 `node` 是联合类型，则返回所有成员的解析结果数组；如果 `node` 不是联合类型，则返回包含当前节点的单个类型节点数组。
 */
export function resolveUnionType(
  ctx: TypeResolveContext,
  node: Node & MaybeWithScope & { _resolvedElements?: ResolvedElements },
  scope?: TypeScope
): Node[] {
  if (node.type === 'TSTypeReference') {
    const resolved = resolveTypeReference(ctx, node, scope)
    if (resolved) node = resolved
  }

  let types: Node[]
  if (node.type === 'TSUnionType') {
    types = node.types.flatMap(node => resolveUnionType(ctx, node, scope))
  } else {
    types = [node]
  }

  return types
}
