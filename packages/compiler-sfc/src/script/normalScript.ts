import { shouldTransform, transformAST } from '@vue/reactivity-transform'
import { analyzeScriptBindings } from './analyzeScriptBindings'
import { ScriptCompileContext } from './context'
import MagicString from 'magic-string'
import { RawSourceMap } from 'source-map-js'
import { rewriteDefaultAST } from '../rewriteDefault'
import { genNormalScriptCssVarsCode } from '../style/cssVars'

export const normalScriptDefaultVar = `__default__`
/**
 * 
 * @param ctx 
 * @param scopeId 
 * @returns 
 * 这是一个名为 `processNormalScript` 的函数，用于处理普通脚本块。

函数的参数如下：
- `ctx: ScriptCompileContext`：脚本编译上下文对象。
- `scopeId: string`：作用域 ID。

函数的主要逻辑如下：
- 首先检查脚本的语言类型，如果不是 JavaScript 或 TypeScript，则直接返回脚本对象。
- 在处理过程中，可能会修改脚本的内容和源映射。
- 解析脚本的 AST，并分析脚本中的绑定信息。
- 获取一些编译选项和描述符的信息，如源代码、文件名和 CSS 变量等。
- 如果启用了响应性转换且需要转换内容，则使用 MagicString 库进行转换。
- 如果存在 CSS 变量或需要生成默认变量的情况，使用 MagicString 库进行重写。
- 生成用于导出 CSS 变量和默认变量的代码，并将其追加到脚本内容中。
- 返回经过处理后的脚本对象，包括修改后的内容、映射、绑定信息和脚本的 AST。

该函数用于处理普通的脚本块，进行必要的转换和重写，以满足编译的需求。
 */
export function processNormalScript(
  ctx: ScriptCompileContext,
  scopeId: string
) {
  const script = ctx.descriptor.script!
  if (script.lang && !ctx.isJS && !ctx.isTS) {
    // do not process non js/ts script blocks
    return script
  }
  try {
    let content = script.content
    let map = script.map
    const scriptAst = ctx.scriptAst!
    const bindings = analyzeScriptBindings(scriptAst.body)
    const { source, filename, cssVars } = ctx.descriptor
    const { sourceMap, genDefaultAs, isProd } = ctx.options

    // TODO remove in 3.4
    if (ctx.options.reactivityTransform && shouldTransform(content)) {
      const s = new MagicString(source)
      const startOffset = script.loc.start.offset
      const endOffset = script.loc.end.offset
      const { importedHelpers } = transformAST(scriptAst, s, startOffset)
      if (importedHelpers.length) {
        s.prepend(
          `import { ${importedHelpers
            .map(h => `${h} as _${h}`)
            .join(', ')} } from 'vue'\n`
        )
      }
      s.remove(0, startOffset)
      s.remove(endOffset, source.length)
      content = s.toString()
      if (sourceMap !== false) {
        map = s.generateMap({
          source: filename,
          hires: true,
          includeContent: true
        }) as unknown as RawSourceMap
      }
    }

    if (cssVars.length || genDefaultAs) {
      const defaultVar = genDefaultAs || normalScriptDefaultVar
      const s = new MagicString(content)
      rewriteDefaultAST(scriptAst.body, s, defaultVar)
      content = s.toString()
      if (cssVars.length) {
        content += genNormalScriptCssVarsCode(
          cssVars,
          bindings,
          scopeId,
          !!isProd,
          defaultVar
        )
      }
      if (!genDefaultAs) {
        content += `\nexport default ${defaultVar}`
      }
    }
    return {
      ...script,
      content,
      map,
      bindings,
      scriptAst: scriptAst.body
    }
  } catch (e: any) {
    // silently fallback if parse fails since user may be using custom
    // babel syntax
    return script
  }
}
