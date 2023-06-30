import { CompilerOptions } from './options'
import { baseParse } from './parse'
import { transform, NodeTransform, DirectiveTransform } from './transform'
import { generate, CodegenResult } from './codegen'
import { RootNode } from './ast'
import { isString, extend } from '@vue/shared'
import { transformIf } from './transforms/vIf'
import { transformFor } from './transforms/vFor'
import { transformExpression } from './transforms/transformExpression'
import { transformSlotOutlet } from './transforms/transformSlotOutlet'
import { transformElement } from './transforms/transformElement'
import { transformOn } from './transforms/vOn'
import { transformBind } from './transforms/vBind'
import { trackSlotScopes, trackVForSlotScopes } from './transforms/vSlot'
import { transformText } from './transforms/transformText'
import { transformOnce } from './transforms/vOnce'
import { transformModel } from './transforms/vModel'
import { transformFilter } from './compat/transformFilter'
import { defaultOnError, createCompilerError, ErrorCodes } from './errors'
import { transformMemo } from './transforms/vMemo'
/**
 * 这是一个 `TransformPreset` 类型的声明，它是一个元组类型，包含两个元素。

第一个元素是一个 `NodeTransform` 类型的数组，用于存储节点转换函数的集合。每个节点转换函数接收一个 `Node` 类型的参数，并对该节点进行特定的转换操作。

第二个元素是一个键值对对象，用于存储指令转换函数。这个对象的键是指令的名称，值是对应的指令转换函数。指令转换函数接收一个 `Node` 类型的参数，并对该指令节点进行转换操作。

这个 `TransformPreset` 类型的声明用于定义转换阶段的预设配置。它将一组节点转换函数和指令转换函数打包成一个可复用的预设，以便在编译过程中使用。通过使用预设配置，可以方便地组合和重用不同的转换规则。
 */
export type TransformPreset = [
  NodeTransform[],
  Record<string, DirectiveTransform>
]
/**
 * 
 * @param prefixIdentifiers 
 * @returns 
 * 这是一个名为 `getBaseTransformPreset` 的函数，它接受一个可选的 `prefixIdentifiers` 参数，并返回一个 `TransformPreset` 类型的值。

该函数用于获取基础的转换预设配置。在函数内部，它首先定义了一个包含两个元素的数组，分别是节点转换函数的数组和指令转换函数的对象。

节点转换函数的数组包含以下几个元素：
- `transformOnce`: 用于处理 `v-once` 指令的转换。
- `transformIf`: 用于处理条件语句的转换，如 `v-if`、`v-else-if` 和 `v-else`。
- `transformMemo`: 用于处理 `v-memo` 指令的转换。
- `transformFor`: 用于处理 `v-for` 指令的转换。
- `transformFilter`: 用于处理 `v-filter` 指令的转换（仅在兼容模式下存在）。
- `transformExpression`: 用于处理表达式的转换。

接下来，根据环境变量和参数 `prefixIdentifiers` 的值，可能会添加一些额外的转换函数：
- 如果在非浏览器环境下且 `prefixIdentifiers` 为 `true`，则添加了 `trackVForSlotScopes` 和 `transformExpression` 转换函数。
- 如果在浏览器环境下且开发模式为开启状态，则添加了 `transformExpression` 转换函数。

最后，指令转换函数的对象包含以下几个键值对：
- `on`: 用于处理 `v-on` 指令的转换。
- `bind`: 用于处理 `v-bind` 指令的转换。
- `model`: 用于处理 `v-model` 指令的转换。

函数返回了由这两个元素组成的数组，表示整个转换预设的配置。
 */
export function getBaseTransformPreset(
  prefixIdentifiers?: boolean
): TransformPreset {
  return [
    [
      transformOnce,
      transformIf,
      transformMemo,
      transformFor,
      ...(__COMPAT__ ? [transformFilter] : []),
      ...(!__BROWSER__ && prefixIdentifiers
        ? [
            // order is important
            trackVForSlotScopes,
            transformExpression
          ]
        : __BROWSER__ && __DEV__
        ? [transformExpression]
        : []),
      transformSlotOutlet,
      transformElement,
      trackSlotScopes,
      transformText
    ],
    {
      on: transformOn,
      bind: transformBind,
      model: transformModel
    }
  ]
}

// we name it `baseCompile` so that higher order compilers like
// @vue/compiler-dom can export `compile` while re-exporting everything else.
/**
 * 
 * @param template 
 * @param options 
 * @returns 
 * 这是一个名为 `baseCompile` 的函数，用于编译模板并生成代码。

函数接受两个参数：`template` 和 `options`。`template` 可以是一个字符串或者已经解析好的根节点对象。`options` 是编译选项的配置对象，默认为空对象。

函数内部首先根据 `options` 中的配置获取错误处理函数 `onError`，如果未提供则使用默认的错误处理函数 `defaultOnError`。同时判断是否处于模块模式，通过判断 `options.mode` 是否为 `'module'`。

在浏览器环境下，会进行一些特定的错误判断和处理。如果 `options.prefixIdentifiers` 为 `true`，则会调用 `onError` 抛出错误提示不支持该配置；如果处于模块模式，则同样会调用 `onError` 抛出错误提示不支持该模式。

接下来根据环境和 `options.prefixIdentifiers` 的值，确定是否启用标识符前缀处理。如果不启用标识符前缀处理且开启了 `options.cacheHandlers`，则会调用 `onError` 抛出错误提示不支持缓存处理器。如果配置了 `options.scopeId` 且不处于模块模式，则会调用 `onError` 抛出错误提示不支持作用域 ID。

然后根据 `template` 的类型，如果是字符串则调用 `baseParse` 解析模板生成 AST，否则直接使用传入的根节点对象。同时获取基础的节点转换函数数组 `nodeTransforms` 和指令转换函数对象 `directiveTransforms`，通过调用 `getBaseTransformPreset` 获取。

如果不在浏览器环境下且开启了 TypeScript 支持（`options.isTS` 为 `true`），会检查是否配置了 TypeScript 表达式插件，如果未配置则将 `'typescript'` 添加到 `options.expressionPlugins` 中。

然后调用 `transform` 函数对 AST 进行转换，传入 AST、扩展了部分 `options` 的配置对象，其中包括 `prefixIdentifiers`、节点转换函数数组和指令转换函数对象。这里会将基础的节点转换函数和指令转换函数与用户自定义的转换函数合并。

最后调用 `generate` 函数生成代码，传入 AST 和扩展了部分 `options` 的配置对象，其中包括 `prefixIdentifiers`。

函数返回生成的代码和其他相关信息，表示编译的结果。
 */
export function baseCompile(
  template: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {
  const onError = options.onError || defaultOnError
  const isModuleMode = options.mode === 'module'
  /* istanbul ignore if */
  if (__BROWSER__) {
    if (options.prefixIdentifiers === true) {
      onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED))
    } else if (isModuleMode) {
      onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED))
    }
  }

  const prefixIdentifiers =
    !__BROWSER__ && (options.prefixIdentifiers === true || isModuleMode)
  if (!prefixIdentifiers && options.cacheHandlers) {
    onError(createCompilerError(ErrorCodes.X_CACHE_HANDLER_NOT_SUPPORTED))
  }
  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED))
  }

  const ast = isString(template) ? baseParse(template, options) : template
  const [nodeTransforms, directiveTransforms] =
    getBaseTransformPreset(prefixIdentifiers)

  if (!__BROWSER__ && options.isTS) {
    const { expressionPlugins } = options
    if (!expressionPlugins || !expressionPlugins.includes('typescript')) {
      options.expressionPlugins = [...(expressionPlugins || []), 'typescript']
    }
  }

  transform(
    ast,
    extend({}, options, {
      prefixIdentifiers,
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || []) // user transforms
      ],
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {} // user transforms
      )
    })
  )

  return generate(
    ast,
    extend({}, options, {
      prefixIdentifiers
    })
  )
}
