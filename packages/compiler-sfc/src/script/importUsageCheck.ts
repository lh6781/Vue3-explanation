import { parseExpression } from '@babel/parser'
import { SFCDescriptor } from '../parse'
import {
  NodeTypes,
  SimpleExpressionNode,
  createRoot,
  parserOptions,
  transform,
  walkIdentifiers
} from '@vue/compiler-dom'
import { createCache } from '../cache'
import { camelize, capitalize, isBuiltInDirective } from '@vue/shared'

/**
 * Check if an import is used in the SFC's template. This is used to determine
 * the properties that should be included in the object returned from setup()
 * when not using inline mode.
 * 这个函数名为 `isImportUsed`，它用于检查在单文件组件 (SFC) 中是否使用了指定的导入。

函数接受两个参数：`local`（字符串类型，表示导入的本地名称）和 `sfc`（SFCDescriptor 类型，表示单文件组件的描述符）。

函数通过创建一个正则表达式来检查导入的使用情况。正则表达式的模式是通过将 `local` 进行转义和包装来生成的。在模式中，使用了 `[^\\w$_]` 来匹配一个非单词字符，这样可以确保只匹配导入的整个单词而不是部分字符串。在模式中，还对 `$` 进行了特殊处理，因为它是正则表达式的特殊字符，需要进行转义。

最后，函数使用 `test` 方法将生成的正则表达式应用于解析后的模板字符串（通过调用 `resolveTemplateUsageCheckString` 函数获得）。如果正则表达式匹配到了任何匹配项，则返回 `true`，表示导入被使用了；否则返回 `false`，表示导入未被使用。
 */
export function isImportUsed(local: string, sfc: SFCDescriptor): boolean {
  return new RegExp(
    // #4274 escape $ since it's a special char in regex
    // (and is the only regex special char that is valid in identifiers)
    `[^\\w$_]${local.replace(/\$/g, '\\$')}[^\\w$_]`
  ).test(resolveTemplateUsageCheckString(sfc))
}
/**
 * 这是一个命名为 `templateUsageCheckCache` 的常量声明。它使用了 `createCache` 函数创建了一个缓存对象，用于缓存字符串类型的数据。

`createCache` 函数可以根据需要设置缓存的大小、过期策略等选项。它返回一个具有缓存功能的对象，可以用于存储和检索数据。在这种情况下，缓存对象用于存储解析后的模板字符串，以便在多次调用 `isImportUsed` 函数时重复使用，避免重复的解析操作，提高性能。
 */
const templateUsageCheckCache = createCache<string>()
/**
 * 
 * @param sfc 
 * @returns 
 * 这是一个名为 `resolveTemplateUsageCheckString` 的函数。它接受一个 `SFCDescriptor` 参数，该参数包含了单文件组件的模板信息。

该函数的主要目的是解析模板的使用情况，并生成一个用于检查模板使用的字符串。

首先，函数从 `sfc.template` 中获取模板的内容和 AST。然后，它尝试从 `templateUsageCheckCache` 缓存中获取已解析的模板字符串，如果缓存中存在，则直接返回缓存的字符串，避免重复解析。

如果缓存中不存在，则开始遍历模板的 AST，通过 `transform` 函数进行转换。在 `nodeTransforms` 中定义了一个转换函数，它会处理各种类型的节点。

对于 `ELEMENT` 类型的节点，函数会判断是否为自定义组件或内置组件，如果不是，则将其转换为驼峰形式的字符串以及首字母大写的驼峰形式的字符串，并添加到 `code` 字符串中。

对于 `DIRECTIVE` 类型的节点，函数会判断是否为内置指令，如果不是，则将其转换为驼峰形式的字符串，并添加到 `code` 字符串中。如果指令有表达式，则将表达式内容也添加到 `code` 字符串中。

对于 `INTERPOLATION` 类型的节点，函数会将插值表达式的内容添加到 `code` 字符串中。

转换结束后，将 `code` 字符串末尾添加一个分号，并将生成的字符串存入 `templateUsageCheckCache` 缓存中，以便下次复用。

最后，函数返回生成的字符串。

这个函数的作用是为了生成一个用于检查模板使用的字符串，可以用于判断模板中是否使用了特定的组件、指令或表达式。
 */
function resolveTemplateUsageCheckString(sfc: SFCDescriptor) {
  const { content, ast } = sfc.template!
  const cached = templateUsageCheckCache.get(content)
  if (cached) {
    return cached
  }

  let code = ''
  transform(createRoot([ast]), {
    nodeTransforms: [
      node => {
        if (node.type === NodeTypes.ELEMENT) {
          if (
            !parserOptions.isNativeTag!(node.tag) &&
            !parserOptions.isBuiltInComponent!(node.tag)
          ) {
            code += `,${camelize(node.tag)},${capitalize(camelize(node.tag))}`
          }
          for (let i = 0; i < node.props.length; i++) {
            const prop = node.props[i]
            if (prop.type === NodeTypes.DIRECTIVE) {
              if (!isBuiltInDirective(prop.name)) {
                code += `,v${capitalize(camelize(prop.name))}`
              }
              if (prop.exp) {
                code += `,${processExp(
                  (prop.exp as SimpleExpressionNode).content,
                  prop.name
                )}`
              }
            }
          }
        } else if (node.type === NodeTypes.INTERPOLATION) {
          code += `,${processExp(
            (node.content as SimpleExpressionNode).content
          )}`
        }
      }
    ]
  })

  code += ';'
  templateUsageCheckCache.set(content, code)
  return code
}
/**
 * 
 * 这是一个名为 `forAliasRE` 的正则表达式，用于匹配 `v-for` 指令的别名和列表表达式。

正则表达式的模式为 `/([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/`，具体含义如下：

- `([\s\S]*?)`：匹配任意数量的字符（包括换行符），非贪婪模式，用于匹配 `v-for` 指令的别名部分。
- `\s+`：匹配一个或多个空白字符（包括空格、制表符、换行符等），用于分隔别名和列表表达式。
- `(?:in|of)`：非捕获性分组，匹配字符串 "in" 或 "of"，用于指示迭代的方式。
- `\s+`：匹配一个或多个空白字符，用于分隔迭代方式和列表表达式。
- `([\s\S]*)`：匹配任意数量的字符（包括换行符），贪婪模式，用于匹配 `v-for` 指令的列表表达式部分。

这个正则表达式可以用于解析 `v-for` 指令的别名和列表表达式，例如：

```js
const match = expression.match(forAliasRE);
if (match) {
  const alias = match[1].trim(); // 获取别名部分
  const listExpression = match[2].trim(); // 获取列表表达式部分
  // ...
}
```

注意，这个正则表达式只适用于简单的 `v-for` 用法，对于复杂的嵌套和嵌入 JavaScript 表达式的情况可能无法完全匹配。
 */
const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/
/**
 * 
 * @param exp 
 * @param dir 
 * @returns 
 * 这是一个名为 `processExp` 的函数，用于处理表达式字符串并返回处理后的结果字符串。

函数的参数如下：
- `exp: string`：要处理的表达式字符串。
- `dir?: string`：可选参数，用于指示表达式的上下文，可能的取值为 `'slot'`、`'on'` 或 `'for'`。

函数的主要逻辑如下：
- 首先，通过正则表达式 `/ as\s+\w|<.*>|:/` 检测表达式中是否包含特定模式，包括 `as` 关键字、尖括号包裹的内容、以及冒号。如果匹配到了这些模式，说明表达式比较复杂，需要进一步处理。
- 如果 `dir` 参数的值为 `'slot'`，则将表达式包裹在箭头函数中，形如 `(${exp})=>{}`。
- 如果 `dir` 参数的值为 `'on'`，则将表达式包裹在箭头函数中，并在函数体内使用 `return` 语句返回表达式的值，形如 `()=>{return ${exp}}`。
- 如果 `dir` 参数的值为 `'for'`，则尝试使用正则表达式 `forAliasRE` 匹配 `v-for` 指令的别名和列表表达式。如果匹配成功，将别名和列表表达式分开处理，并递归调用 `processExp` 处理它们，最终将两部分拼接在一起返回。
- 如果表达式中存在潜在的类型转换或泛型参数的使用，将使用 TypeScript 解析器解析表达式，并遍历其中的标识符，将它们以逗号分隔的形式拼接在一起返回。
- 如果表达式不满足以上条件，将调用 `stripStrings` 函数去除字符串字面量的引号，并返回处理后的结果。

这个函数主要用于处理包含复杂表达式的特定上下文中的字符串，并提取出其中的标识符或特定模式进行进一步处理。
 */
function processExp(exp: string, dir?: string): string {
  if (/ as\s+\w|<.*>|:/.test(exp)) {
    if (dir === 'slot') {
      exp = `(${exp})=>{}`
    } else if (dir === 'on') {
      exp = `()=>{return ${exp}}`
    } else if (dir === 'for') {
      const inMatch = exp.match(forAliasRE)
      if (inMatch) {
        let [, LHS, RHS] = inMatch
        // #6088
        LHS = LHS.trim().replace(/^\(|\)$/g, '')
        return processExp(`(${LHS})=>{}`) + processExp(RHS)
      }
    }
    let ret = ''
    // has potential type cast or generic arguments that uses types
    const ast = parseExpression(exp, { plugins: ['typescript'] })
    walkIdentifiers(ast, node => {
      ret += `,` + node.name
    })
    return ret
  }
  return stripStrings(exp)
}
/**
 * 
 * @param exp 
 * @returns 
 * 这是一个名为 `stripStrings` 的函数，用于从给定的表达式字符串中去除字符串字面量。

函数的参数如下：
- `exp: string`：要处理的表达式字符串。

函数的主要逻辑如下：
- 首先，使用正则表达式 `/'[^']*'|"[^"]*"/g` 匹配单引号或双引号包裹的字符串字面量，并将其替换为空字符串。
- 然后，使用正则表达式 ``/`[^`]+`/g`` 匹配反引号包裹的模板字符串，并将其替换为经过 `stripTemplateString` 处理后的结果。

该函数用于从表达式中去除字符串字面量，以便对表达式进行进一步处理或分析。
 */
function stripStrings(exp: string) {
  return exp
    .replace(/'[^']*'|"[^"]*"/g, '')
    .replace(/`[^`]+`/g, stripTemplateString)
}
/**
 * 
 * @param str 
 * @returns 
 * 这是一个名为 `stripTemplateString` 的函数，用于从给定的模板字符串中提取插值表达式。

函数的参数如下：
- `str: string`：要处理的模板字符串。

函数的主要逻辑如下：
- 使用正则表达式 `/\${[^}]+}/g` 匹配模板字符串中的插值表达式，并将匹配到的结果存储在 `interpMatch` 数组中。
- 如果 `interpMatch` 不为空，则遍历 `interpMatch` 数组，并使用 `slice` 方法去掉插值表达式中的 `${` 和 `}`，然后将处理后的结果用逗号拼接起来。
- 如果 `interpMatch` 为空，则返回空字符串。

该函数用于从模板字符串中提取插值表达式，以便进一步处理或分析这些表达式。
 */
function stripTemplateString(str: string): string {
  const interpMatch = str.match(/\${[^}]+}/g)
  if (interpMatch) {
    return interpMatch.map(m => m.slice(2, -1)).join(',')
  }
  return ''
}
