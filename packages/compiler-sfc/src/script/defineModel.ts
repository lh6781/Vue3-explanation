import { LVal, Node, ObjectProperty, TSType } from '@babel/types'
import { ScriptCompileContext } from './context'
import { inferRuntimeType } from './resolveType'
import {
  UNKNOWN_TYPE,
  concatStrings,
  isCallOf,
  toRuntimeTypeString,
  unwrapTSNode
} from './utils'
import { BindingTypes } from '@vue/compiler-dom'
import { warnOnce } from '../warn'
/**
 * `DEFINE_MODEL` 是一个常量，表示 Vue 组件中的 `defineModel` 函数或选项的名称。
 */
export const DEFINE_MODEL = 'defineModel'
/**
 * `ModelDecl` 是一个接口，用于描述组件中的模型声明。它具有以下属性：

- `type`：表示模型的类型，可以是 `TSType` 类型或 `undefined`。
- `options`：表示模型的选项，可以是字符串或 `undefined`。
- `identifier`：表示模型的标识符，可以是字符串或 `undefined`。
 */
export interface ModelDecl {
  type: TSType | undefined
  options: string | undefined
  identifier: string | undefined
}
/**
 * 
 * @param ctx 
 * @param node 
 * @param declId 
 * @returns 
 * `processDefineModel` 是一个函数，用于处理 `defineModel` 的调用并提取相关信息。

它具有以下参数：

- `ctx: ScriptCompileContext`：脚本编译上下文对象。
- `node: Node`：当前节点，表示 `defineModel` 的调用。
- `declId?: LVal`：可选参数，表示模型的标识符。

函数的功能如下：

- 首先判断是否启用了 `defineModel` 选项以及当前节点是否是 `defineModel` 的调用，如果不满足则返回 `false`。
- 设置 `ctx.hasDefineModelCall` 为 `true`，表示存在 `defineModel` 的调用。
- 提取模型的类型、模型名称和选项。
- 检查模型名称是否重复，如果重复则报错。
- 将模型信息存储到 `ctx.modelDecls` 对象中，包括类型、选项和标识符。
- 注册绑定类型为 `BindingTypes.PROPS`，表示这是一个属性绑定。
- 生成运行时的选项字符串，用于在代码中插入运行时代码。
- 使用 `ctx.s.overwrite` 方法将 `defineModel` 的调用替换为运行时代码。

函数最后返回 `true`，表示成功处理了 `defineModel` 的调用。
 */
export function processDefineModel(
  ctx: ScriptCompileContext,
  node: Node,
  declId?: LVal
): boolean {
  if (!ctx.options.defineModel || !isCallOf(node, DEFINE_MODEL)) {
    return false
  }

  warnOnce(
    `This project is using defineModel(), which is an experimental ` +
      ` feature. It may receive breaking changes or be removed in the future, so ` +
      `use at your own risk.\n` +
      `To stay updated, follow the RFC at https://github.com/vuejs/rfcs/discussions/503.`
  )

  ctx.hasDefineModelCall = true

  const type =
    (node.typeParameters && node.typeParameters.params[0]) || undefined
  let modelName: string
  let options: Node | undefined
  const arg0 = node.arguments[0] && unwrapTSNode(node.arguments[0])
  if (arg0 && arg0.type === 'StringLiteral') {
    modelName = arg0.value
    options = node.arguments[1]
  } else {
    modelName = 'modelValue'
    options = arg0
  }

  if (ctx.modelDecls[modelName]) {
    ctx.error(`duplicate model name ${JSON.stringify(modelName)}`, node)
  }

  const optionsString = options && ctx.getString(options)

  ctx.modelDecls[modelName] = {
    type,
    options: optionsString,
    identifier: declId && declId.type === 'Identifier' ? declId.name : undefined
  }
  // register binding type
  ctx.bindingMetadata[modelName] = BindingTypes.PROPS

  let runtimeOptions = ''
  if (options) {
    if (options.type === 'ObjectExpression') {
      const local = options.properties.find(
        p =>
          p.type === 'ObjectProperty' &&
          ((p.key.type === 'Identifier' && p.key.name === 'local') ||
            (p.key.type === 'StringLiteral' && p.key.value === 'local'))
      ) as ObjectProperty

      if (local) {
        runtimeOptions = `{ ${ctx.getString(local)} }`
      } else {
        for (const p of options.properties) {
          if (p.type === 'SpreadElement' || p.computed) {
            runtimeOptions = optionsString!
            break
          }
        }
      }
    } else {
      runtimeOptions = optionsString!
    }
  }

  ctx.s.overwrite(
    ctx.startOffset! + node.start!,
    ctx.startOffset! + node.end!,
    `${ctx.helper('useModel')}(__props, ${JSON.stringify(modelName)}${
      runtimeOptions ? `, ${runtimeOptions}` : ``
    })`
  )

  return true
}
/**
 * 
 * @param ctx 
 * @returns 
 * `genModelProps` 是一个函数，用于生成模型属性的声明字符串。

它具有以下参数：

- `ctx: ScriptCompileContext`：脚本编译上下文对象。

函数的功能如下：

- 首先判断是否存在 `defineModel` 的调用，如果不存在则直接返回。
- 获取是否处于生产模式的标志 `isProd`。
- 初始化 `modelPropsDecl` 字符串，用于存储模型属性的声明代码。
- 遍历 `ctx.modelDecls` 对象的条目，其中键为属性名称，值为模型声明对象。
- 对于每个模型声明对象，进行以下处理：
  - 判断是否存在模型类型 `type`，如果存在，则推断其运行时类型 `runtimeTypes`。
  - 对于存在运行时类型的情况，根据生产模式和是否存在未知类型进行过滤。
  - 将运行时类型转换为运行时类型字符串 `runtimeType`。
  - 生成属性的代码生成选项字符串 `codegenOptions`。
  - 根据运行时类型和选项生成属性的声明字符串 `decl`。
  - 将属性名称和声明字符串添加到 `modelPropsDecl` 中。
- 返回生成的模型属性声明字符串。

函数生成的字符串的格式类似于：

```javascript
{
  propertyName1: declaration1,
  propertyName2: declaration2,
  ...
}
```

其中每个属性的声明由属性名称和属性值组成。
 */
export function genModelProps(ctx: ScriptCompileContext) {
  if (!ctx.hasDefineModelCall) return

  const isProd = !!ctx.options.isProd
  let modelPropsDecl = ''
  for (const [name, { type, options }] of Object.entries(ctx.modelDecls)) {
    let skipCheck = false

    let runtimeTypes = type && inferRuntimeType(ctx, type)
    if (runtimeTypes) {
      const hasUnknownType = runtimeTypes.includes(UNKNOWN_TYPE)

      runtimeTypes = runtimeTypes.filter(el => {
        if (el === UNKNOWN_TYPE) return false
        return isProd
          ? el === 'Boolean' || (el === 'Function' && options)
          : true
      })
      skipCheck = !isProd && hasUnknownType && runtimeTypes.length > 0
    }

    let runtimeType =
      (runtimeTypes &&
        runtimeTypes.length > 0 &&
        toRuntimeTypeString(runtimeTypes)) ||
      undefined

    const codegenOptions = concatStrings([
      runtimeType && `type: ${runtimeType}`,
      skipCheck && 'skipCheck: true'
    ])

    let decl: string
    if (runtimeType && options) {
      decl = ctx.isTS
        ? `{ ${codegenOptions}, ...${options} }`
        : `Object.assign({ ${codegenOptions} }, ${options})`
    } else {
      decl = options || (runtimeType ? `{ ${codegenOptions} }` : '{}')
    }
    modelPropsDecl += `\n    ${JSON.stringify(name)}: ${decl},`
  }
  return `{${modelPropsDecl}\n  }`
}
