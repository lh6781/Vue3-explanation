import { Node, ObjectPattern, Program } from '@babel/types'
import { SFCDescriptor } from '../parse'
import { generateCodeFrame } from '@vue/shared'
import { parse as babelParse, ParserPlugin } from '@babel/parser'
import { ImportBinding, SFCScriptCompileOptions } from '../compileScript'
import { PropsDestructureBindings } from './defineProps'
import { ModelDecl } from './defineModel'
import { BindingMetadata } from '../../../compiler-core/src'
import MagicString from 'magic-string'
import { TypeScope } from './resolveType'
/**
 * `ScriptCompileContext` 是一个类，用于在编译过程中跟踪和管理脚本相关的上下文信息。

该类具有以下属性和方法：

- 属性：
  - `isJS`：布尔值，表示脚本是否为 JavaScript 语言。
  - `isTS`：布尔值，表示脚本是否为 TypeScript 语言。
  - `scriptAst`：Program | null 类型，表示脚本的 AST（抽象语法树）。
  - `scriptSetupAst`：Program | null 类型，表示 script setup 部分的 AST。
  - `source`：表示脚本的源代码字符串。
  - `filename`：表示脚本的文件名。
  - `s`：MagicString 类的实例，用于处理源代码字符串的编辑和转换。
  - `startOffset`：表示 script setup 部分的起始偏移量。
  - `endOffset`：表示 script setup 部分的结束偏移量。
  - `scope`：TypeScope 类型，表示脚本的作用域。
  - `globalScopes`：TypeScope[] 类型，表示全局作用域的集合。
  - `userImports`：Record<string, ImportBinding> 类型，表示用户自定义的导入项。
  - `hasDefinePropsCall`：布尔值，表示是否存在 `defineProps` 函数调用。
  - `hasDefineEmitCall`：布尔值，表示是否存在 `defineEmit` 函数调用。
  - `hasDefineExposeCall`：布尔值，表示是否存在 `defineExpose` 函数调用。
  - `hasDefaultExportName`：布尔值，表示是否存在默认导出的名称。
  - `hasDefaultExportRender`：布尔值，表示是否存在默认导出的渲染函数。
  - `hasDefineOptionsCall`：布尔值，表示是否存在 `defineOptions` 函数调用。
  - `hasDefineSlotsCall`：布尔值，表示是否存在 `defineSlots` 函数调用。
  - `hasDefineModelCall`：布尔值，表示是否存在 `defineModel` 函数调用。
  - `propsIdentifier`：string | undefined 类型，表示 `props` 的标识符。
  - `propsRuntimeDecl`：Node | undefined 类型，表示 `props` 的运行时声明。
  - `propsTypeDecl`：Node | undefined 类型，表示 `props` 的类型声明。
  - `propsDestructureDecl`：ObjectPattern | undefined 类型，表示 `props` 的解构声明。
  - `propsDestructuredBindings`：PropsDestructureBindings 类型，表示 `props` 的解构绑定。
  - `propsDestructureRestId`：string | undefined 类型，表示 `props` 的解构剩余部分的标识符。
  - `propsRuntimeDefaults`：Node | undefined 类型，表示 `props` 的运行时默认值。
  - `emitsRuntimeDecl`：Node | undefined 类型，表示 `emits` 的运行时声明。
  - `emitsTypeDecl`：Node | undefined 类型，表示 `emits` 的类型声明。
  - `emitIdentifier`：string | undefined 类型，

表示 `emit` 的标识符。
  - `modelDecls`：Record<string, ModelDecl> 类型，表示 `model` 的声明。
  - `optionsRuntimeDecl`：Node | undefined 类型，表示 `options` 的运行时声明。
  - `bindingMetadata`：BindingMetadata 类型，表示绑定的元数据。
  - `helperImports`：Set<string> 类型，表示导入的帮助程序。
  - `deps`：Set<string> 类型，用于 HMR（热模块替换）缓存破坏。
  - `fs`：NonNullable<SFCScriptCompileOptions['fs']> 类型，用于缓存解析后的文件系统对象。

- 方法：
  - `constructor(descriptor: SFCDescriptor, options: Partial<SFCScriptCompileOptions>)`：构造函数，接受 SFCDescriptor 和 SFCScriptCompileOptions 对象作为参数，并根据参数初始化实例的属性。
  - `getString(node: Node, scriptSetup = true): string`：根据节点获取源代码字符串，可选择在 script setup 中查找，默认为 true。
  - `error(msg: string, node: Node, scope?: TypeScope): never`：抛出错误，将错误消息、节点和作用域信息作为参数。
  - `helper(key: string): string`：返回帮助程序的标识符，并将其添加到导入的帮助程序集合中。返回的标识符以 `_<key>` 的形式命名。

`ScriptCompileContext` 类提供了许多用于管理编译过程中脚本相关信息的属性和方法。它通过解析脚本的源代码和 AST，提供了一种方便的方式来分析和操作脚本的各个部分，并且能够收集和记录有关脚本的信息，如导入项、定义的属性、事件、插槽等。同时，它还提供了一些实用方法，用于处理源代码字符串和生成错误信息。
 */
export class ScriptCompileContext {
  isJS: boolean
  isTS: boolean

  scriptAst: Program | null
  scriptSetupAst: Program | null

  source = this.descriptor.source
  filename = this.descriptor.filename
  s = new MagicString(this.source)
  startOffset = this.descriptor.scriptSetup?.loc.start.offset
  endOffset = this.descriptor.scriptSetup?.loc.end.offset

  // import / type analysis
  scope?: TypeScope
  globalScopes?: TypeScope[]
  userImports: Record<string, ImportBinding> = Object.create(null)

  // macros presence check
  hasDefinePropsCall = false
  hasDefineEmitCall = false
  hasDefineExposeCall = false
  hasDefaultExportName = false
  hasDefaultExportRender = false
  hasDefineOptionsCall = false
  hasDefineSlotsCall = false
  hasDefineModelCall = false

  // defineProps
  propsIdentifier: string | undefined
  propsRuntimeDecl: Node | undefined
  propsTypeDecl: Node | undefined
  propsDestructureDecl: ObjectPattern | undefined
  propsDestructuredBindings: PropsDestructureBindings = Object.create(null)
  propsDestructureRestId: string | undefined
  propsRuntimeDefaults: Node | undefined

  // defineEmits
  emitsRuntimeDecl: Node | undefined
  emitsTypeDecl: Node | undefined
  emitIdentifier: string | undefined

  // defineModel
  modelDecls: Record<string, ModelDecl> = {}

  // defineOptions
  optionsRuntimeDecl: Node | undefined

  // codegen
  bindingMetadata: BindingMetadata = {}
  helperImports: Set<string> = new Set()
  helper(key: string): string {
    this.helperImports.add(key)
    return `_${key}`
  }

  /**
   * to be exposed on compiled script block for HMR cache busting
   */
  deps?: Set<string>

  /**
   * cache for resolved fs
   */
  fs?: NonNullable<SFCScriptCompileOptions['fs']>

  constructor(
    public descriptor: SFCDescriptor,
    public options: Partial<SFCScriptCompileOptions>
  ) {
    const { script, scriptSetup } = descriptor
    const scriptLang = script && script.lang
    const scriptSetupLang = scriptSetup && scriptSetup.lang

    this.isJS =
      scriptLang === 'js' ||
      scriptLang === 'jsx' ||
      scriptSetupLang === 'js' ||
      scriptSetupLang === 'jsx'
    this.isTS =
      scriptLang === 'ts' ||
      scriptLang === 'tsx' ||
      scriptSetupLang === 'ts' ||
      scriptSetupLang === 'tsx'

    // resolve parser plugins
    const plugins: ParserPlugin[] = resolveParserPlugins(
      (scriptLang || scriptSetupLang)!,
      options.babelParserPlugins
    )

    function parse(input: string, offset: number): Program {
      try {
        return babelParse(input, {
          plugins,
          sourceType: 'module'
        }).program
      } catch (e: any) {
        e.message = `[vue/compiler-sfc] ${e.message}\n\n${
          descriptor.filename
        }\n${generateCodeFrame(
          descriptor.source,
          e.pos + offset,
          e.pos + offset + 1
        )}`
        throw e
      }
    }

    this.scriptAst =
      descriptor.script &&
      parse(descriptor.script.content, descriptor.script.loc.start.offset)

    this.scriptSetupAst =
      descriptor.scriptSetup &&
      parse(descriptor.scriptSetup!.content, this.startOffset!)
  }

  getString(node: Node, scriptSetup = true): string {
    const block = scriptSetup
      ? this.descriptor.scriptSetup!
      : this.descriptor.script!
    return block.content.slice(node.start!, node.end!)
  }

  error(msg: string, node: Node, scope?: TypeScope): never {
    const offset = scope ? scope.offset : this.startOffset!
    throw new Error(
      `[@vue/compiler-sfc] ${msg}\n\n${
        (scope || this.descriptor).filename
      }\n${generateCodeFrame(
        (scope || this.descriptor).source,
        node.start! + offset,
        node.end! + offset
      )}`
    )
  }
}
/**
 * 
 * @param lang 
 * @param userPlugins 
 * @param dts 
 * @returns 
 * `resolveParserPlugins` 是一个函数，用于解析语言的解析器插件。

该函数具有以下参数：

- `lang`：字符串类型，表示要解析的语言。
- `userPlugins`：ParserPlugin[] 类型，可选参数，表示用户自定义的解析器插件。
- `dts`：布尔值，可选参数，表示是否为 `.d.ts` 文件。

该函数的主要功能是根据语言类型和用户自定义插件，确定要使用的解析器插件，并返回一个插件数组。

函数的执行过程如下：

1. 创建一个空的插件数组 `plugins`。
2. 如果语言是 'jsx' 或 'tsx'，将 'jsx' 插件添加到 `plugins` 数组中。
3. 否则，如果存在用户自定义插件 `userPlugins`，将其中不为 'jsx' 的插件添加到 `userPlugins` 数组中。
4. 如果语言是 'ts' 或 'tsx'，将 'typescript' 插件和 `{ dts }` 配置项作为数组 `[ 'typescript', { dts } ]` 添加到 `plugins` 数组中。
5. 如果 `plugins` 数组中不包含 'decorators' 插件，将 'decorators-legacy' 插件添加到 `plugins` 数组中。
6. 如果存在用户自定义插件 `userPlugins`，将其中的插件添加到 `plugins` 数组中。
7. 返回 `plugins` 数组。

该函数的作用是根据语言和用户自定义插件，确定要使用的解析器插件。它会考虑到语言类型和配置，并返回一个完整的解析器插件数组，以便在解析过程中使用适当的插件。
 */
export function resolveParserPlugins(
  lang: string,
  userPlugins?: ParserPlugin[],
  dts = false
) {
  const plugins: ParserPlugin[] = []
  if (lang === 'jsx' || lang === 'tsx') {
    plugins.push('jsx')
  } else if (userPlugins) {
    // If don't match the case of adding jsx
    // should remove the jsx from user options
    userPlugins = userPlugins.filter(p => p !== 'jsx')
  }
  if (lang === 'ts' || lang === 'tsx') {
    plugins.push(['typescript', { dts }])
    if (!plugins.includes('decorators')) {
      plugins.push('decorators-legacy')
    }
  }
  if (userPlugins) {
    plugins.push(...userPlugins)
  }
  return plugins
}
