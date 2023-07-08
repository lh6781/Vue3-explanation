import {
  Node,
  LVal,
  ObjectProperty,
  ObjectMethod,
  ObjectExpression,
  Expression
} from '@babel/types'
import { BindingTypes, isFunctionType } from '@vue/compiler-dom'
import { ScriptCompileContext } from './context'
import { inferRuntimeType, resolveTypeElements } from './resolveType'
import {
  resolveObjectKey,
  UNKNOWN_TYPE,
  concatStrings,
  isLiteralNode,
  isCallOf,
  unwrapTSNode,
  toRuntimeTypeString,
  getEscapedKey
} from './utils'
import { genModelProps } from './defineModel'
import { getObjectOrArrayExpressionKeys } from './analyzeScriptBindings'
import { processPropsDestructure } from './definePropsDestructure'
/**
 * `DEFINE_PROPS` 是一个常量，用于表示 `defineProps` 的标识符。

`defineProps` 是一个函数，用于声明组件的 Props 属性。它用于定义组件接受的输入属性，并进行类型验证。当使用 `defineProps` 定义 Props 后，在组件中就可以使用这些 Props 属性。

以下是 `processDefineProps` 函数的实现，用于处理 `defineProps` 的调用：

```javascript
export function processDefineProps(
  ctx: ScriptCompileContext,
  node: Node
): boolean {
  if (isCallOf(node, DEFINE_PROPS)) {
    if (ctx.hasDefinePropsCall) {
      ctx.error(`duplicate ${DEFINE_PROPS}() call`, node)
    }
    ctx.hasDefinePropsCall = true
    return true
  }
  return false
}
```

在 `processDefineProps` 函数中，它首先检查传入的 `node` 是否是 `defineProps` 的调用。如果是，则将 `ctx.hasDefinePropsCall` 设置为 `true`，表示已经处理了 `defineProps` 的调用。如果之前已经有过 `defineProps` 的调用，则会报错，因为重复调用 `defineProps` 是不允许的。

如果传入的 `node` 不是 `defineProps` 的调用，则返回 `false`，表示未处理该调用。

因此，通过使用 `DEFINE_PROPS` 常量和 `processDefineProps` 函数，可以在编译器中处理和识别 `defineProps` 的调用，并进行相应的报错和处理。
 */
export const DEFINE_PROPS = 'defineProps'
/**
 * `WITH_DEFAULTS` 是一个常量，用于表示 `withDefaults` 的标识符。

`withDefaults` 是一个函数，用于创建具有默认属性的组件。它接受两个参数：`component` 和 `defaults`。`component` 是要添加默认属性的组件对象，而 `defaults` 是一个对象，包含要设置为默认值的属性。

以下是 `processWithDefaults` 函数的实现，用于处理 `withDefaults` 的调用：

```javascript
export function processWithDefaults(
  ctx: ScriptCompileContext,
  node: Node
): boolean {
  if (isCallOf(node, WITH_DEFAULTS)) {
    // Process the withDefaults() call
    // ...
    return true;
  }
  return false;
}
```

在 `processWithDefaults` 函数中，它首先检查传入的 `node` 是否是 `withDefaults` 的调用。如果是，则进行相应的处理。在具体的处理逻辑中，可以根据实际需求对 `component` 和 `defaults` 进行解析和处理。

如果传入的 `node` 不是 `withDefaults` 的调用，则返回 `false`，表示未处理该调用。

因此，通过使用 `WITH_DEFAULTS` 常量和 `processWithDefaults` 函数，可以在编译器中处理和识别 `withDefaults` 的调用，并进行相应的处理逻辑。
 */
export const WITH_DEFAULTS = 'withDefaults'
/**
 * `PropTypeData` 是一个接口，用于表示属性的类型数据。它具有以下属性：

- `key`：属性的键名，表示属性的名称。
- `type`：属性的类型，以字符串数组的形式表示。可以有多个类型，表示属性可以接受多种类型的值。
- `required`：一个布尔值，表示属性是否为必需的。如果为 `true`，则属性为必需属性，必须提供该属性的值。如果为 `false`，则属性为可选属性，可以不提供该属性的值。
- `skipCheck`：一个布尔值，表示是否跳过属性的类型检查。如果为 `true`，则在编译时会跳过对属性类型的检查。如果为 `false`，则在编译时会进行属性类型的检查。

通过使用 `PropTypeData` 接口，可以在代码中表示和操作属性的类型信息。例如，可以创建一个包含属性类型数据的数组，或者在处理属性时使用 `PropTypeData` 对象来存储和访问属性的类型信息。
 */
export interface PropTypeData {
  key: string
  type: string[]
  required: boolean
  skipCheck: boolean
}
/**
 * `PropsDestructureBindings` 是一个类型别名，表示属性解构绑定的映射关系。它是一个记录类型，将属性的公共键名映射到一个对象，该对象包含以下属性：

- `local`：属性的本地标识符，表示在组件内部使用的属性变量名。这个标识符可能与公共键名不同，因为可以通过解构赋值为属性指定不同的变量名。
- `default`：一个可选的表达式，表示属性的默认值。如果属性未提供值，则使用默认值。

通过使用 `PropsDestructureBindings` 类型别名，可以定义一个对象，其中属性的公共键名与相应的本地标识符和默认值关联起来。这样可以在组件中进行属性解构绑定，并访问解构后的属性和默认值。
 */
export type PropsDestructureBindings = Record<
  string, // public prop key
  {
    local: string // local identifier, may be different
    default?: Expression
  }
>
/**
 * 
 * @param ctx 
 * @param node 
 * @param declId 
 * @returns 
 * `processDefineProps` 是一个函数，用于处理 `defineProps` 函数的调用。它接受三个参数：

- `ctx`：表示脚本编译的上下文对象，包含编译过程中的状态和信息。
- `node`：表示当前正在处理的节点，即 `defineProps` 函数的调用节点。
- `declId`：表示属性定义的标识符，可以是变量名或对象模式。

该函数的作用如下：

1. 首先，判断当前节点是否为 `defineProps` 函数的调用。如果不是，则调用 `processWithDefaults` 函数处理节点，并返回结果。
2. 如果已经存在 `defineProps` 的调用，即 `ctx.hasDefinePropsCall` 为 `true`，则报告错误，表示重复调用了 `defineProps`。
3. 将 `ctx.hasDefinePropsCall` 设置为 `true`，表示已经调用了 `defineProps`。
4. 将属性定义的运行时声明 `node.arguments[0]` 赋值给 `ctx.propsRuntimeDecl`。
5. 注册属性绑定，遍历 `ctx.propsRuntimeDecl` 中的所有属性键，并将它们添加到 `ctx.bindingMetadata` 中，标记为属性绑定类型。
6. 如果调用节点存在类型参数 `node.typeParameters`，则判断 `ctx.propsRuntimeDecl` 是否存在。如果存在，则报告错误，表示不能同时接受类型和非类型参数，必须选择其中之一。
7. 将类型参数 `node.typeParameters.params[0]` 赋值给 `ctx.propsTypeDecl`，表示属性的类型声明。
8. 如果存在属性定义的标识符 `declId`，则根据标识符的类型进行处理：
   - 如果 `declId` 的类型为 `'ObjectPattern'`，表示使用了对象模式的属性解构，调用 `processPropsDestructure` 函数进行处理。
   - 否则，将 `declId` 转换为字符串，并赋值给 `ctx.propsIdentifier`，表示属性的标识符。

最后，函数返回 `true`，表示成功处理了 `defineProps` 函数的调用。
 */
export function processDefineProps(
  ctx: ScriptCompileContext,
  node: Node,
  declId?: LVal
) {
  if (!isCallOf(node, DEFINE_PROPS)) {
    return processWithDefaults(ctx, node, declId)
  }

  if (ctx.hasDefinePropsCall) {
    ctx.error(`duplicate ${DEFINE_PROPS}() call`, node)
  }
  ctx.hasDefinePropsCall = true
  ctx.propsRuntimeDecl = node.arguments[0]

  // register bindings
  if (ctx.propsRuntimeDecl) {
    for (const key of getObjectOrArrayExpressionKeys(ctx.propsRuntimeDecl)) {
      if (!(key in ctx.bindingMetadata)) {
        ctx.bindingMetadata[key] = BindingTypes.PROPS
      }
    }
  }

  // call has type parameters - infer runtime types from it
  if (node.typeParameters) {
    if (ctx.propsRuntimeDecl) {
      ctx.error(
        `${DEFINE_PROPS}() cannot accept both type and non-type arguments ` +
          `at the same time. Use one or the other.`,
        node
      )
    }
    ctx.propsTypeDecl = node.typeParameters.params[0]
  }

  if (declId) {
    // handle props destructure
    if (declId.type === 'ObjectPattern') {
      processPropsDestructure(ctx, declId)
    } else {
      ctx.propsIdentifier = ctx.getString(declId)
    }
  }

  return true
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param declId 
 * @returns 
 * `processWithDefaults` 是一个函数，用于处理 `withDefaults` 函数的调用。它接受三个参数：

- `ctx`：表示脚本编译的上下文对象，包含编译过程中的状态和信息。
- `node`：表示当前正在处理的节点，即 `withDefaults` 函数的调用节点。
- `declId`：表示属性定义的标识符，可以是变量名或对象模式。

该函数的作用如下：

1. 首先，判断当前节点是否为 `withDefaults` 函数的调用。如果不是，则返回 `false`。
2. 调用 `processDefineProps` 函数处理 `node.arguments[0]`，即 `withDefaults` 函数的第一个参数，判断是否是 `defineProps` 函数的调用。如果是，则继续处理；如果不是，则报告错误并返回 `false`。
3. 检查 `ctx.propsRuntimeDecl` 是否存在，如果存在，则报告错误，表示 `withDefaults` 只能与基于类型的 `defineProps` 声明一起使用。
4. 检查 `ctx.propsDestructureDecl` 是否存在，如果存在，则报告错误，表示当使用属性解构和 `defineProps` 一起使用时，不需要使用 `withDefaults`。建议使用解构的默认值来设置属性的默认值。
5. 将 `node.arguments[1]` 赋值给 `ctx.propsRuntimeDefaults`，表示属性的默认值。
6. 如果 `ctx.propsRuntimeDefaults` 不存在，则报告错误，表示 `withDefaults` 的第二个参数是必需的。
7. 返回 `true`，表示成功处理了 `withDefaults` 函数的调用。

最后，如果未能成功处理 `withDefaults` 函数的调用，则返回 `false`。
 */
function processWithDefaults(
  ctx: ScriptCompileContext,
  node: Node,
  declId?: LVal
): boolean {
  if (!isCallOf(node, WITH_DEFAULTS)) {
    return false
  }
  if (processDefineProps(ctx, node.arguments[0], declId)) {
    if (ctx.propsRuntimeDecl) {
      ctx.error(
        `${WITH_DEFAULTS} can only be used with type-based ` +
          `${DEFINE_PROPS} declaration.`,
        node
      )
    }
    if (ctx.propsDestructureDecl) {
      ctx.error(
        `${WITH_DEFAULTS}() is unnecessary when using destructure with ${DEFINE_PROPS}().\n` +
          `Prefer using destructure default values, e.g. const { foo = 1 } = defineProps(...).`,
        node.callee
      )
    }
    ctx.propsRuntimeDefaults = node.arguments[1]
    if (!ctx.propsRuntimeDefaults) {
      ctx.error(`The 2nd argument of ${WITH_DEFAULTS} is required.`, node)
    }
  } else {
    ctx.error(
      `${WITH_DEFAULTS}' first argument must be a ${DEFINE_PROPS} call.`,
      node.arguments[0] || node
    )
  }
  return true
}
/**
 * 
 * @param ctx 
 * @returns 
 * `genRuntimeProps` 是一个函数，用于生成运行时的属性声明代码。它接受一个 `ctx` 参数，表示脚本编译的上下文对象。

该函数的作用如下：

1. 首先，定义一个变量 `propsDecls`，初始值为 `undefined`。
2. 判断 `ctx.propsRuntimeDecl` 是否存在，如果存在，则将属性声明的字符串形式赋值给 `propsDecls`。同时判断 `ctx.propsDestructureDecl` 是否存在，如果存在，则生成属性解构的默认值，并将其添加到 `propsDecls` 中。
3. 如果 `ctx.propsTypeDecl` 存在，则调用 `genRuntimePropsFromTypes` 函数生成基于类型的属性声明，并将结果赋值给 `propsDecls`。
4. 调用 `genModelProps` 函数生成模型属性的声明代码，并将结果赋值给 `modelsDecls`。
5. 如果 `propsDecls` 和 `modelsDecls` 都存在，则调用辅助函数 `mergeModels` 将它们合并为一个字符串。
6. 如果只有 `propsDecls` 或 `modelsDecls` 存在，则直接返回对应的值。
7. 返回生成的运行时属性声明代码。

注意，具体生成的代码格式和内容可能与上述描述略有不同，取决于代码的具体实现和上下文对象中的属性。
 */
export function genRuntimeProps(ctx: ScriptCompileContext): string | undefined {
  let propsDecls: undefined | string

  if (ctx.propsRuntimeDecl) {
    propsDecls = ctx.getString(ctx.propsRuntimeDecl).trim()
    if (ctx.propsDestructureDecl) {
      const defaults: string[] = []
      for (const key in ctx.propsDestructuredBindings) {
        const d = genDestructuredDefaultValue(ctx, key)
        const finalKey = getEscapedKey(key)
        if (d)
          defaults.push(
            `${finalKey}: ${d.valueString}${
              d.needSkipFactory ? `, __skip_${finalKey}: true` : ``
            }`
          )
      }
      if (defaults.length) {
        propsDecls = `${ctx.helper(
          `mergeDefaults`
        )}(${propsDecls}, {\n  ${defaults.join(',\n  ')}\n})`
      }
    }
  } else if (ctx.propsTypeDecl) {
    propsDecls = genRuntimePropsFromTypes(ctx)
  }

  const modelsDecls = genModelProps(ctx)

  if (propsDecls && modelsDecls) {
    return `${ctx.helper('mergeModels')}(${propsDecls}, ${modelsDecls})`
  } else {
    return modelsDecls || propsDecls
  }
}
/**
 * 
 * @param ctx 
 * @returns 
 * `genRuntimePropsFromTypes` 是一个函数，用于基于类型生成运行时属性声明的代码。它接受一个 `ctx` 参数，表示脚本编译的上下文对象。

该函数的主要步骤如下：

1. 首先，通过调用 `resolveRuntimePropsFromType` 函数从 `ctx.propsTypeDecl` 中解析运行时属性信息，并将结果赋值给 `props` 数组。
2. 检查 `props` 数组的长度，如果为 0，则直接返回 `undefined`。
3. 创建一个空数组 `propStrings`，用于存储每个属性的字符串表示。
4. 检查是否存在静态的默认值（通过调用 `hasStaticWithDefaults` 函数），并将结果保存在 `hasStaticDefaults` 变量中。
5. 遍历 `props` 数组，对每个属性调用 `genRuntimePropFromType` 函数生成对应的运行时属性代码，并将结果添加到 `propStrings` 数组中。同时，将属性的键名注册到 `ctx.bindingMetadata` 中，表示该属性是一个绑定。
6. 根据 `propStrings` 数组生成属性声明的代码字符串，形如 `{ key1: value1, key2: value2, ... }`。
7. 如果存在 `ctx.propsRuntimeDefaults` 并且不存在静态默认值，则调用辅助函数 `mergeDefaults` 将属性声明和默认值合并为一个新的属性声明代码字符串。
8. 返回生成的属性声明代码字符串。

注意，具体生成的代码格式和内容可能与上述描述略有不同，取决于代码的具体实现和上下文对象中的属性。
 */
function genRuntimePropsFromTypes(ctx: ScriptCompileContext) {
  // this is only called if propsTypeDecl exists
  const props = resolveRuntimePropsFromType(ctx, ctx.propsTypeDecl!)
  if (!props.length) {
    return
  }

  const propStrings: string[] = []
  const hasStaticDefaults = hasStaticWithDefaults(ctx)

  for (const prop of props) {
    propStrings.push(genRuntimePropFromType(ctx, prop, hasStaticDefaults))
    // register bindings
    if (!(prop.key in ctx.bindingMetadata)) {
      ctx.bindingMetadata[prop.key] = BindingTypes.PROPS
    }
  }

  let propsDecls = `{
    ${propStrings.join(',\n    ')}\n  }`

  if (ctx.propsRuntimeDefaults && !hasStaticDefaults) {
    propsDecls = `${ctx.helper('mergeDefaults')}(${propsDecls}, ${ctx.getString(
      ctx.propsRuntimeDefaults
    )})`
  }

  return propsDecls
}
/**
 * 
 * @param ctx 
 * @param node 
 * @returns 
 * `resolveRuntimePropsFromType` 是一个函数，用于解析从类型声明中获取的运行时属性信息。它接受一个 `ctx` 参数，表示脚本编译的上下文对象，以及一个 `node` 参数，表示类型声明节点。

该函数的主要步骤如下：

1. 创建一个空数组 `props`，用于存储解析后的属性信息。
2. 调用 `resolveTypeElements` 函数解析类型声明中的元素信息，并将结果保存在 `elements` 变量中。
3. 遍历 `elements.props` 对象的键（属性名）。
4. 对于每个属性，获取其对应的类型信息 `e`。
5. 调用 `inferRuntimeType` 函数推断类型的运行时表示，并将结果保存在 `type` 变量中。
6. 检查 `type` 是否包含未知类型（`UNKNOWN_TYPE`）。如果包含，则进一步处理。
   - 如果 `type` 包含 `'Boolean'` 或 `'Function'`，则将未知类型从 `type` 中过滤掉，并将 `skipCheck` 设置为 `true`，表示跳过类型检查。
   - 否则，将 `type` 设置为 `['null']`，表示属性类型为 `null`。
7. 创建一个 `PropTypeData` 对象，包含属性的键名 `key`、是否必需 `required`、类型数组 `type` 和是否跳过检查 `skipCheck`。
8. 将该对象添加到 `props` 数组中。
9. 返回解析后的属性信息数组 `props`。

注意，具体的实现可能根据代码的具体情况和上下文对象的属性略有不同。
 */
function resolveRuntimePropsFromType(
  ctx: ScriptCompileContext,
  node: Node
): PropTypeData[] {
  const props: PropTypeData[] = []
  const elements = resolveTypeElements(ctx, node)
  for (const key in elements.props) {
    const e = elements.props[key]
    let type = inferRuntimeType(ctx, e)
    let skipCheck = false
    // skip check for result containing unknown types
    if (type.includes(UNKNOWN_TYPE)) {
      if (type.includes('Boolean') || type.includes('Function')) {
        type = type.filter(t => t !== UNKNOWN_TYPE)
        skipCheck = true
      } else {
        type = ['null']
      }
    }
    props.push({
      key,
      required: !e.optional,
      type: type || [`null`],
      skipCheck
    })
  }
  return props
}
/**
 * 
 * @param ctx 
 * @param param1 
 * @param hasStaticDefaults 
 * @returns 
 * `genRuntimePropFromType` 是一个函数，用于生成基于类型信息的运行时属性表示。它接受以下参数：

- `ctx: ScriptCompileContext`：脚本编译的上下文对象。
- `{ key, required, type, skipCheck }: PropTypeData`：一个包含属性信息的对象，包括属性键名 `key`、是否必需 `required`、类型数组 `type` 和是否跳过检查 `skipCheck`。
- `hasStaticDefaults: boolean`：一个布尔值，表示是否存在静态默认值。

该函数的主要步骤如下：

1. 声明一个变量 `defaultString`，用于保存属性的默认值字符串（如果有）。
2. 调用 `genDestructuredDefaultValue` 函数生成属性的解构默认值，将结果保存在 `destructured` 变量中。
   - 如果存在解构默认值，则生成相应的字符串表示，包括默认值和是否跳过工厂函数。
3. 否则，如果存在静态默认值（`hasStaticDefaults` 为 `true`），则从 `ctx.propsRuntimeDefaults` 中查找与当前属性键名匹配的属性。
   - 如果找到匹配的属性，则生成相应的字符串表示，包括属性的默认值。
4. 根据属性的键名 `key` 获取转义后的键名 `finalKey`。
5. 根据不同的环境（`ctx.options.isProd`），生成不同的属性表示。
   - 如果不是生产环境，生成包含类型、是否必需、是否跳过检查和默认值的对象表示。
   - 如果是生产环境，并且类型数组中包含 `'Boolean'` 或者存在默认值（静态或动态），则生成包含类型和默认值的对象表示。
   - 否则，在生产环境下，生成只包含默认值的简化对象表示。
6. 返回生成的属性表示字符串。

注意，具体的实现可能根据代码的具体情况和上下文对象的属性略有不同。
 */
function genRuntimePropFromType(
  ctx: ScriptCompileContext,
  { key, required, type, skipCheck }: PropTypeData,
  hasStaticDefaults: boolean
): string {
  let defaultString: string | undefined
  const destructured = genDestructuredDefaultValue(ctx, key, type)
  if (destructured) {
    defaultString = `default: ${destructured.valueString}${
      destructured.needSkipFactory ? `, skipFactory: true` : ``
    }`
  } else if (hasStaticDefaults) {
    const prop = (ctx.propsRuntimeDefaults as ObjectExpression).properties.find(
      node => {
        if (node.type === 'SpreadElement') return false
        return resolveObjectKey(node.key, node.computed) === key
      }
    ) as ObjectProperty | ObjectMethod
    if (prop) {
      if (prop.type === 'ObjectProperty') {
        // prop has corresponding static default value
        defaultString = `default: ${ctx.getString(prop.value)}`
      } else {
        defaultString = `${prop.async ? 'async ' : ''}${
          prop.kind !== 'method' ? `${prop.kind} ` : ''
        }default() ${ctx.getString(prop.body)}`
      }
    }
  }
  const finalKey = getEscapedKey(key)
  if (!ctx.options.isProd) {
    return `${finalKey}: { ${concatStrings([
      `type: ${toRuntimeTypeString(type)}`,
      `required: ${required}`,
      skipCheck && 'skipCheck: true',
      defaultString
    ])} }`
  } else if (
    type.some(
      el =>
        el === 'Boolean' ||
        ((!hasStaticDefaults || defaultString) && el === 'Function')
    )
  ) {
    // #4783 for boolean, should keep the type
    // #7111 for function, if default value exists or it's not static, should keep it
    // in production
    return `${finalKey}: { ${concatStrings([
      `type: ${toRuntimeTypeString(type)}`,
      defaultString
    ])} }`
  } else {
    // production: checks are useless
    return `${finalKey}: ${defaultString ? `{ ${defaultString} }` : `{}`}`
  }
}

/**
 * check defaults. If the default object is an object literal with only
 * static properties, we can directly generate more optimized default
 * declarations. Otherwise we will have to fallback to runtime merging.
 * 函数 `hasStaticWithDefaults` 用于判断是否存在静态的默认值。

它接受一个 `ScriptCompileContext` 对象 `ctx` 作为参数，并返回一个布尔值。返回值为 `true` 表示存在静态的默认值，返回值为 `false` 表示不存在静态的默认值。

函数的实现逻辑如下：

1. 首先判断 `ctx.propsRuntimeDefaults` 是否存在且类型为 `ObjectExpression`。
2. 如果存在 `ctx.propsRuntimeDefaults`，则遍历其中的每个属性节点。
3. 对于每个属性节点，判断其类型是否为 `'SpreadElement'`，并且键名是否为非计算属性或者以 `'Literal'` 结尾的类型。
4. 如果存在任何不满足条件的属性节点，则返回 `false`，表示不存在静态的默认值。
5. 如果所有属性节点都满足条件，则返回 `true`，表示存在静态的默认值。

这个函数的作用是判断在 `ctx.propsRuntimeDefaults` 中是否存在静态的默认值。静态的默认值是指在编译时已知并可以直接使用的默认值，而不是在运行时动态计算的值。
 */
function hasStaticWithDefaults(ctx: ScriptCompileContext) {
  return !!(
    ctx.propsRuntimeDefaults &&
    ctx.propsRuntimeDefaults.type === 'ObjectExpression' &&
    ctx.propsRuntimeDefaults.properties.every(
      node =>
        node.type !== 'SpreadElement' &&
        (!node.computed || node.key.type.endsWith('Literal'))
    )
  )
}
/**
 * 
 * @param ctx 
 * @param key 
 * @param inferredType 
 * @returns 
 * 函数 `genDestructuredDefaultValue` 用于生成解构默认值的字符串表示。

它接受一个 `ScriptCompileContext` 对象 `ctx`、一个字符串 `key` 和一个可选的字符串数组 `inferredType` 作为参数，并返回一个对象或 `undefined`。如果存在解构默认值，则返回一个对象，包含两个属性：`valueString` 表示解构默认值的字符串表示，`needSkipFactory` 表示是否需要跳过工厂包装。如果不存在解构默认值，则返回 `undefined`。

函数的实现逻辑如下：

1. 首先根据 `key` 在 `ctx.propsDestructuredBindings` 中查找对应的解构信息。
2. 如果找到解构信息，则获取其 `default` 属性，表示解构的默认值。
3. 如果存在 `default` 值，则将其转换为字符串表示，并使用 `ctx.getString` 方法获取字符串形式的值。
4. 如果存在 `inferredType`，并且不包含 `'null'` 类型，则进行进一步的类型检查。
5. 如果需要类型检查，则使用 `unwrapTSNode` 方法获取 `defaultVal` 的原始 AST 节点。
6. 推断 `defaultVal` 的值类型，并与 `inferredType` 进行比较，如果类型不匹配，则报错。
7. 根据情况确定是否需要跳过工厂包装：
   - 如果不存在 `inferredType`，且 `defaultVal` 是函数类型或标识符类型，则需要跳过工厂包装。
   - 如果需要跳过工厂包装，则将 `needSkipFactory` 设置为 `true`。
   - 如果不需要跳过工厂包装，判断 `defaultVal` 是否为字面量节点、`inferredType` 是否包含 `'Function'` 类型。
8. 最后返回一个对象，包含解构默认值的字符串表示 `valueString` 和是否需要跳过工厂包装 `needSkipFactory`。

这个函数的作用是根据解构的默认值信息生成其字符串表示，并进行类型检查和工厂包装的处理。
 */
function genDestructuredDefaultValue(
  ctx: ScriptCompileContext,
  key: string,
  inferredType?: string[]
):
  | {
      valueString: string
      needSkipFactory: boolean
    }
  | undefined {
  const destructured = ctx.propsDestructuredBindings[key]
  const defaultVal = destructured && destructured.default
  if (defaultVal) {
    const value = ctx.getString(defaultVal)
    const unwrapped = unwrapTSNode(defaultVal)

    if (inferredType && inferredType.length && !inferredType.includes('null')) {
      const valueType = inferValueType(unwrapped)
      if (valueType && !inferredType.includes(valueType)) {
        ctx.error(
          `Default value of prop "${key}" does not match declared type.`,
          unwrapped
        )
      }
    }

    // If the default value is a function or is an identifier referencing
    // external value, skip factory wrap. This is needed when using
    // destructure w/ runtime declaration since we cannot safely infer
    // whether the expected runtime prop type is `Function`.
    const needSkipFactory =
      !inferredType &&
      (isFunctionType(unwrapped) || unwrapped.type === 'Identifier')

    const needFactoryWrap =
      !needSkipFactory &&
      !isLiteralNode(unwrapped) &&
      !inferredType?.includes('Function')

    return {
      valueString: needFactoryWrap ? `() => (${value})` : value,
      needSkipFactory
    }
  }
}

// non-comprehensive, best-effort type infernece for a runtime value
// this is used to catch default value / type declaration mismatches
// when using props destructure.
/**
 * 
 * @param node 
 * @returns 
 * 函数 `inferValueType` 用于推断给定 AST 节点 `node` 的值类型。

该函数通过检查节点的类型，判断节点表示的值的类型，并返回相应的类型字符串。

函数的实现逻辑如下：

1. 根据节点的类型进行判断：
   - 如果节点类型是 `'StringLiteral'`，则返回字符串 `'String'`。
   - 如果节点类型是 `'NumericLiteral'`，则返回字符串 `'Number'`。
   - 如果节点类型是 `'BooleanLiteral'`，则返回字符串 `'Boolean'`。
   - 如果节点类型是 `'ObjectExpression'`，则返回字符串 `'Object'`。
   - 如果节点类型是 `'ArrayExpression'`，则返回字符串 `'Array'`。
   - 如果节点类型是 `'FunctionExpression'` 或 `'ArrowFunctionExpression'`，则返回字符串 `'Function'`。
2. 如果节点类型不在上述情况中，则返回 `undefined`，表示无法推断值的类型。

该函数的作用是根据节点类型推断节点表示的值的类型。它主要用于类型检查和生成代码时的类型判断。
 */
function inferValueType(node: Node): string | undefined {
  switch (node.type) {
    case 'StringLiteral':
      return 'String'
    case 'NumericLiteral':
      return 'Number'
    case 'BooleanLiteral':
      return 'Boolean'
    case 'ObjectExpression':
      return 'Object'
    case 'ArrayExpression':
      return 'Array'
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return 'Function'
  }
}
