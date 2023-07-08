import {
  baseCompile,
  baseParse,
  CompilerOptions,
  CodegenResult,
  ParserOptions,
  RootNode,
  noopDirectiveTransform,
  NodeTransform,
  DirectiveTransform
} from '@vue/compiler-core'
import { parserOptions } from './parserOptions'
import { transformStyle } from './transforms/transformStyle'
import { transformVHtml } from './transforms/vHtml'
import { transformVText } from './transforms/vText'
import { transformModel } from './transforms/vModel'
import { transformOn } from './transforms/vOn'
import { transformShow } from './transforms/vShow'
import { transformTransition } from './transforms/Transition'
import { stringifyStatic } from './transforms/stringifyStatic'
import { ignoreSideEffectTags } from './transforms/ignoreSideEffectTags'
import { extend } from '@vue/shared'

export { parserOptions }
/**
 * `DOMNodeTransforms` 是一个包含节点转换函数的数组。这些节点转换函数用于在编译过程中对 AST (抽象语法树) 进行转换和处理。

在这个特定的数组中，有两个节点转换函数被添加:

1. `transformStyle`: 这个函数用于转换样式相关的节点，例如处理 `v-bind:style` 和 `:style` 指令。

2. `transformTransition`: 这个函数是在开发模式下添加的，用于转换过渡相关的节点，例如处理 `<transition>` 组件。

在生产环境下，由于性能和包大小的考虑，`transformTransition` 函数不会被添加到 `DOMNodeTransforms` 数组中。

通过应用这些节点转换函数，可以在编译过程中对节点进行修改、添加或删除，以生成最终的代码。
 */
export const DOMNodeTransforms: NodeTransform[] = [
  transformStyle,
  ...(__DEV__ ? [transformTransition] : [])
]
/**
 * `DOMDirectiveTransforms` 是一个记录类型，用于存储指令名称和相应的指令转换函数之间的映射关系。

在这个特定的记录中，有以下指令和对应的转换函数:

- `cloak`: 一个没有任何转换操作的空函数 `noopDirectiveTransform`。在 Vue 中，`v-cloak` 指令用于防止未编译的模板内容闪烁显示。

- `html`: 转换函数 `transformVHtml`，用于处理 `v-html` 指令，将指令表达式的结果作为 HTML 解析并插入到元素中。

- `text`: 转换函数 `transformVText`，用于处理 `v-text` 指令，将指令表达式的结果作为纯文本插入到元素中。

- `model`: 转换函数 `transformModel`，在这里进行了重写。在 Vue 中，`v-model` 指令用于双向绑定表单元素的值和数据对象中的属性。

- `on`: 转换函数 `transformOn`，在这里进行了重写。在 Vue 中，`v-on` 指令用于监听 DOM 事件并触发相应的事件处理函数。

- `show`: 转换函数 `transformShow`，用于处理 `v-show` 指令，根据指令表达式的值来控制元素的显示和隐藏。

这些指令转换函数会在编译过程中被调用，用于将指令转换为最终的代码。
 */
export const DOMDirectiveTransforms: Record<string, DirectiveTransform> = {
  cloak: noopDirectiveTransform,
  html: transformVHtml,
  text: transformVText,
  model: transformModel, // override compiler-core
  on: transformOn, // override compiler-core
  show: transformShow
}
/**
 * 
 * @param template 
 * @param options 
 * @returns 
 * `compile` 函数是 Vue 模板编译的入口函数。它接收一个模板字符串和一个可选的编译选项对象，并返回编译结果。

在 `compile` 函数中，它使用 `baseCompile` 函数进行基本的编译操作。`baseCompile` 函数是 Vue 编译器的核心函数，负责将模板字符串编译为代码生成结果。

在调用 `baseCompile` 函数时，传递了一些配置选项，其中包括：

- `nodeTransforms`: 节点转换器数组。在这里，将 `ignoreSideEffectTags` 转换器放在第一个位置，用于忽略 `<script>` 和 `<style>` 标签的编译，以避免在客户端组件模板中处理这些标签的副作用。

- `directiveTransforms`: 指令转换器对象。在这里，使用 `DOMDirectiveTransforms` 对象和传入的 `options.directiveTransforms` 对象进行合并，用于将指令转换为对应的代码。

- `transformHoist`: 静态节点提升转换器。在浏览器环境下为 `null`，在非浏览器环境下为 `stringifyStatic` 函数，用于将静态节点转换为静态字符串。

最终，`compile` 函数返回 `baseCompile` 函数的结果，即代码生成的结果 `CodegenResult` 对象。
 */
export function compile(
  template: string,
  options: CompilerOptions = {}
): CodegenResult {
  return baseCompile(
    template,
    extend({}, parserOptions, options, {
      nodeTransforms: [
        // ignore <script> and <tag>
        // this is not put inside DOMNodeTransforms because that list is used
        // by compiler-ssr to generate vnode fallback branches
        ignoreSideEffectTags,
        ...DOMNodeTransforms,
        ...(options.nodeTransforms || [])
      ],
      directiveTransforms: extend(
        {},
        DOMDirectiveTransforms,
        options.directiveTransforms || {}
      ),
      transformHoist: __BROWSER__ ? null : stringifyStatic
    })
  )
}
/**
 * 
 * @param template 
 * @param options 
 * @returns 
 * `parse` 函数用于将模板字符串解析为抽象语法树（AST），表示模板的结构和内容。

在 `parse` 函数中，它使用 `baseParse` 函数进行基本的解析操作。`baseParse` 函数是 Vue 编译器的解析器函数，负责将模板字符串解析为 AST。

在调用 `baseParse` 函数时，传递了一些配置选项，其中包括：

- `parserOptions`: 解析器选项对象。在这里，将 `parserOptions` 对象和传入的 `options` 对象进行合并，用于配置解析器的行为。

最终，`parse` 函数返回 `baseParse` 函数的结果，即解析得到的根节点 `RootNode` 对象，表示整个模板的结构和内容。
 */
export function parse(template: string, options: ParserOptions = {}): RootNode {
  return baseParse(template, extend({}, parserOptions, options))
}

export * from './runtimeHelpers'
export { transformStyle } from './transforms/transformStyle'
export { createDOMCompilerError, DOMErrorCodes } from './errors'
export * from '@vue/compiler-core'
