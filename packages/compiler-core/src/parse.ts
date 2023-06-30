import { ErrorHandlingOptions, ParserOptions } from './options'
import { NO, isArray, makeMap, extend } from '@vue/shared'
import {
  ErrorCodes,
  createCompilerError,
  defaultOnError,
  defaultOnWarn
} from './errors'
import {
  assert,
  advancePositionWithMutation,
  advancePositionWithClone,
  isCoreComponent,
  isStaticArgOf
} from './utils'
import {
  Namespaces,
  AttributeNode,
  CommentNode,
  DirectiveNode,
  ElementNode,
  ElementTypes,
  ExpressionNode,
  NodeTypes,
  Position,
  RootNode,
  SourceLocation,
  TextNode,
  TemplateChildNode,
  InterpolationNode,
  createRoot,
  ConstantTypes
} from './ast'
import {
  checkCompatEnabled,
  CompilerCompatOptions,
  CompilerDeprecationTypes,
  isCompatEnabled,
  warnDeprecation
} from './compat/compatConfig'
/**
 * `OptionalOptions` 是一个类型别名，表示可选的选项名称。它是一个联合类型，包含以下几个选项名称：

- `'whitespace'`：空白符处理选项。
- `'isNativeTag'`：判断是否为原生标签的选项。
- `'isBuiltInComponent'`：判断是否为内置组件的选项。
- `keyof CompilerCompatOptions`：`CompilerCompatOptions` 中所有属性的名称。

这个类型别名用于表示在某些情况下可以使用这些选项作为可选配置。你可以根据需要在使用这些选项的地方进行类型约束或配置检查。
 */
type OptionalOptions =
  | 'whitespace'
  | 'isNativeTag'
  | 'isBuiltInComponent'
  | keyof CompilerCompatOptions
  /**
   * `MergedParserOptions` 是一个类型别名，表示合并后的解析器选项。它基于 `ParserOptions` 类型，使用 `Omit` 和 `Pick` 进行属性的拆分和选择。

具体而言，它使用 `Omit` 从 `Required<ParserOptions>` 中排除了 `OptionalOptions` 中的属性，这些属性被认为是必需的。然后，使用 `Pick` 从 `ParserOptions` 中选择了 `OptionalOptions` 中的属性。

通过这样的处理，`MergedParserOptions` 将包含所有必需的属性，并根据 `OptionalOptions` 中定义的可选属性进行选择。

这个类型别名用于表示解析器选项在合并时的最终配置，确保所有必需的选项都存在，并选择性地包含可选选项。
   */
type MergedParserOptions = Omit<Required<ParserOptions>, OptionalOptions> &
  Pick<ParserOptions, OptionalOptions>
  /**
   * `AttributeValue` 是一个联合类型，表示属性值的可能类型。它有两个可能的取值：

1. 对象类型 `{ content: string; isQuoted: boolean; loc: SourceLocation }`，表示一个有效的属性值。它包含以下属性：
   - `content`：属性值的内容，作为字符串。
   - `isQuoted`：一个布尔值，指示属性值是否使用引号引起来。
   - `loc`：属性值在源代码中的位置信息，通常是一个包含行号和列号的对象。

2. `undefined`，表示属性没有提供值或被移除。

这个联合类型用于表示解析器解析属性值时的可能结果，可以是有效的属性值对象或未定义。
   */
type AttributeValue =
  | {
      content: string
      isQuoted: boolean
      loc: SourceLocation
    }
  | undefined

// The default decoder only provides escapes for characters reserved as part of
// the template syntax, and is only used if the custom renderer did not provide
// a platform-specific decoder.
/**
 * `decodeRE` 是一个正则表达式，用于匹配 HTML 实体编码。它包含以下内容：

- `&(gt|lt|amp|apos|quot);`：这是一个匹配模式，用于匹配 HTML 实体编码的格式。其中 `(gt|lt|amp|apos|quot)` 是一个分组，表示匹配其中任意一个实体编码，分别对应大于号、小于号、与号、单引号和双引号。`;` 表示匹配实体编码的结束分号。

- `/g`：这是正则表达式的标志，表示全局匹配模式，即在整个字符串中匹配所有符合条件的实体编码。

这个正则表达式可以用于将 HTML 实体编码转换回对应的字符，例如将 `&lt;` 转换为 `<`，`&quot;` 转换为 `"`，等等。在匹配时，可以使用相应的实体编码替换匹配到的内容。
 */
const decodeRE = /&(gt|lt|amp|apos|quot);/g
/**
 * `decodeMap` 是一个对象，用于将 HTML 实体编码映射回对应的字符。它包含以下内容：

- `gt: '>'`：将实体编码 `gt` 映射为 `>`。
- `lt: '<'`：将实体编码 `lt` 映射为 `<`。
- `amp: '&'`：将实体编码 `amp` 映射为 `&`。
- `apos: "'"`：将实体编码 `apos` 映射为 `'`。
- `quot: '"'`：将实体编码 `quot` 映射为 `"`。

当需要将 HTML 实体编码转换回对应的字符时，可以使用 `decodeMap` 对象进行映射。根据实体编码作为键，可以获取到对应的字符值。例如，通过 `decodeMap['lt']` 可以获取到 `<` 字符。
 */
const decodeMap: Record<string, string> = {
  gt: '>',
  lt: '<',
  amp: '&',
  apos: "'",
  quot: '"'
}
/**
 * `defaultParserOptions` 是一个对象，用于设置默认的解析器选项。它包含以下内容：

- `delimiters: ['{{', '}}']`：指定模板中插值表达式的定界符为 `{{` 和 `}}`。
- `getNamespace: () => Namespaces.HTML`：指定元素的命名空间为 HTML。
- `getTextMode: () => TextModes.DATA`：指定文本节点的处理模式为 `TextModes.DATA`，即普通文本模式。
- `isVoidTag: NO`：指定默认的空元素标签判断函数为 `NO`，表示所有标签都不是空元素。
- `isPreTag: NO`：指定默认的 `<pre>` 标签判断函数为 `NO`，表示不是 `<pre>` 标签。
- `isCustomElement: NO`：指定默认的自定义元素判断函数为 `NO`，表示所有元素都不是自定义元素。
- `decodeEntities: (rawText: string) => string`：指定默认的实体编码解码函数，使用 `decodeRE` 正则表达式和 `decodeMap` 对象将实体编码解码为对应的字符。
- `onError: defaultOnError`：指定默认的错误处理函数为 `defaultOnError`。
- `onWarn: defaultOnWarn`：指定默认的警告处理函数为 `defaultOnWarn`。
- `comments: __DEV__`：指定是否保留注释，默认根据 `__DEV__` 环境变量来确定，在开发环境下保留注释。

`defaultParserOptions` 对象将这些选项设置为默认值，可以根据需要进行修改或覆盖。
 */
export const defaultParserOptions: MergedParserOptions = {
  delimiters: [`{{`, `}}`],
  getNamespace: () => Namespaces.HTML,
  getTextMode: () => TextModes.DATA,
  isVoidTag: NO,
  isPreTag: NO,
  isCustomElement: NO,
  decodeEntities: (rawText: string): string =>
    rawText.replace(decodeRE, (_, p1) => decodeMap[p1]),
  onError: defaultOnError,
  onWarn: defaultOnWarn,
  comments: __DEV__
}
/**
 * `TextModes` 是一个枚举类型，定义了不同的文本节点处理模式。

- `DATA` 模式：用于处理普通文本节点。在这个模式下，可以包含元素、实体引用，并且会考虑祖先元素的结束标签。
- `RCDATA` 模式：用于处理 `<textarea>` 元素内的文本节点。在这个模式下，可以包含实体引用，并且会考虑父级元素的结束标签作为结束标志。
- `RAWTEXT` 模式：用于处理 `<style>` 和 `<script>` 元素内的文本节点。在这个模式下，不会解析元素或实体引用，只会考虑父级元素的结束标签作为结束标志。
- `CDATA` 模式：用于处理 `<![CDATA[...]]>` 包裹的文本节点。在这个模式下，不会解析元素或实体引用，只会考虑父级元素的结束标签作为结束标志。
- `ATTRIBUTE_VALUE` 模式：用于处理属性值中的文本节点。在这个模式下，可以包含元素、实体引用，但不会考虑结束标签。

这些模式描述了不同上下文中文本节点的处理方式，用于指导解析器在不同情况下的行为。
 */
export const enum TextModes {
  //          | Elements | Entities | End sign              | Inside of
  DATA, //    | ✔        | ✔        | End tags of ancestors |
  RCDATA, //  | ✘        | ✔        | End tag of the parent | <textarea>
  RAWTEXT, // | ✘        | ✘        | End tag of the parent | <style>,<script>
  CDATA,
  ATTRIBUTE_VALUE
}
/**
 * `ParserContext` 是一个解析器上下文的接口，包含了解析过程中的相关信息和状态。

- `options`：合并后的解析器选项，包括 delimiters、getNamespace、getTextMode 等配置项。
- `originalSource`：原始的待解析的源代码字符串。
- `source`：解析器当前处理的源代码字符串，会随着解析的进行而逐渐缩减。
- `offset`：当前解析位置相对于整个源代码字符串的偏移量。
- `line`：当前解析位置所在的行数。
- `column`：当前解析位置所在的列数。
- `inPre`：表示是否在 HTML 的 `<pre>` 标签内部，用于保留空白字符。
- `inVPre`：表示是否在具有 `v-pre` 指令的元素内部，用于禁用指令和插值的处理。
- `onWarn`：警告处理函数，用于处理解析过程中的警告信息。

解析器上下文提供了解析过程中的上下文信息，以便解析器根据不同的上下文状态进行正确的解析和处理。
 */
export interface ParserContext {
  options: MergedParserOptions
  readonly originalSource: string
  source: string
  offset: number
  line: number
  column: number
  inPre: boolean // HTML <pre> tag, preserve whitespaces
  inVPre: boolean // v-pre, do not process directives and interpolations
  onWarn: NonNullable<ErrorHandlingOptions['onWarn']>
}
/**
 * 
 * @param content 
 * @param options 
 * @returns 
 * `baseParse` 函数是编译器的基础解析函数，用于将源代码字符串解析为 AST（抽象语法树）表示的根节点 `RootNode`。

该函数接受两个参数：

- `content: string`：要解析的源代码字符串。
- `options: ParserOptions = {}`：解析器选项，包括各种解析相关的配置项。

函数内部首先通过 `createParserContext` 创建了解析器上下文 `context`，并通过 `getCursor` 获取了起始解析位置的游标 `start`。

接下来，调用 `parseChildren` 函数开始解析子节点，传入解析器上下文 `context`、初始的文本模式 `TextModes.DATA`，以及一个空数组 `[]` 作为初始的子节点列表。

最后，通过 `createRoot` 函数创建了根节点，将解析得到的子节点列表作为参数传入，并通过 `getSelection` 函数获取了从起始解析位置到当前解析位置的选区，并作为第二个参数传入 `createRoot` 函数。

最终，函数返回了创建的根节点 `RootNode`，表示解析得到的抽象语法树的根节点对象。

该函数是编译器解析过程的入口函数，通过调用其他的解析函数和处理函数，完成对源代码的解析和构建 AST 的过程。
 */
export function baseParse(
  content: string,
  options: ParserOptions = {}
): RootNode {
  const context = createParserContext(content, options)
  const start = getCursor(context)
  return createRoot(
    parseChildren(context, TextModes.DATA, []),
    getSelection(context, start)
  )
}
/**
 * 
 * @param content 
 * @param rawOptions 
 * @returns 
 * `createParserContext` 函数用于创建解析器的上下文对象 `ParserContext`，其中包含了解析过程中的各种状态信息和配置选项。

该函数接受两个参数：

- `content: string`：要解析的源代码字符串。
- `rawOptions: ParserOptions`：解析器选项，包括各种解析相关的配置项。

函数内部首先通过 `extend` 函数创建了一个新的选项对象 `options`，并将 `defaultParserOptions` 的属性复制到新的选项对象中。

接下来，通过 `for...in` 循环遍历 `rawOptions` 对象的属性，并将其值赋给 `options` 对象相应的属性。如果属性的值为 `undefined`，则将默认选项 `defaultParserOptions` 中对应属性的值赋给 `options` 对象。

最后，函数返回了一个新的 `ParserContext` 对象，其中包含了解析器的各种状态信息和配置选项。其中，`column`、`line`、`offset` 分别表示当前解析位置的列数、行数和偏移量；`originalSource` 和 `source` 分别表示原始源代码字符串和当前处理的源代码字符串；`inPre` 和 `inVPre` 分别表示当前是否在处理 `<pre>` 标签和 `v-pre` 指令；`onWarn` 表示警告处理函数。

该函数的作用是创建解析器的上下文对象，提供给其他的解析函数和处理函数使用，用于存储解析过程中的状态和配置信息。
 */
function createParserContext(
  content: string,
  rawOptions: ParserOptions
): ParserContext {
  const options = extend({}, defaultParserOptions)

  let key: keyof ParserOptions
  for (key in rawOptions) {
    // @ts-ignore
    options[key] =
      rawOptions[key] === undefined
        ? defaultParserOptions[key]
        : rawOptions[key]
  }
  return {
    options,
    column: 1,
    line: 1,
    offset: 0,
    originalSource: content,
    source: content,
    inPre: false,
    inVPre: false,
    onWarn: options.onWarn
  }
}
/**
 * 
 * @param context 
 * @param mode 
 * @param ancestors 
 * @returns 
 * `parseChildren` 函数用于解析模板中的子节点。它接受以下参数：

- `context: ParserContext`：解析器的上下文对象，包含解析过程中的状态信息和配置选项。
- `mode: TextModes`：当前的文本模式，指示解析器应该如何处理文本内容。
- `ancestors: ElementNode[]`：当前节点的祖先节点数组。

函数首先通过 `last` 函数获取最后一个祖先节点 `parent`，然后根据 `parent` 的 `ns` 属性确定命名空间 `ns`（默认为 `Namespaces.HTML`）。

接下来，创建一个空数组 `nodes`，用于存储解析的子节点。

在一个循环中，判断当前解析位置是否满足结束条件。如果不满足结束条件，则继续解析子节点。

在循环体内部，首先检查当前源代码字符串 `context.source` 的情况。根据不同的文本模式，采取不同的解析策略。

- 如果当前模式是 `TextModes.DATA` 或 `TextModes.RCDATA`，则进一步判断源代码字符串的内容。
  - 如果当前不处于 `v-pre` 状态并且源代码字符串以 `{{` 开头，则解析插值表达式，并将解析结果赋给 `node`。
  - 否则，如果当前模式是 `TextModes.DATA` 并且源代码字符串以 `<` 开头，则根据不同情况解析标签或注释，并将解析结果赋给 `node`。
- 如果 `node` 仍然是 `undefined`，则表示当前是文本节点，调用 `parseText` 函数解析文本节点，并将解析结果赋给 `node`。

接下来，判断 `node` 的类型：
- 如果 `node` 是数组类型，则将数组中的每个子节点依次添加到 `nodes` 数组中。
- 否则，将 `node` 直接添加到 `nodes` 数组中。

循环继续，直到满足结束条件。

在解析完子节点后，根据当前的文本模式 `mode` 和解析选项中的 `whitespace` 配置，对节点数组进行一些空白处理操作。

最后，返回节点数组 `nodes`。

该函数的作用是解析模板中的子节点，并根据文本模式和解析选项进行一些空白处理。它是解析器中的核心函数之一。
 */
function parseChildren(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  const parent = last(ancestors)
  const ns = parent ? parent.ns : Namespaces.HTML
  const nodes: TemplateChildNode[] = []

  while (!isEnd(context, mode, ancestors)) {
    __TEST__ && assert(context.source.length > 0)
    const s = context.source
    let node: TemplateChildNode | TemplateChildNode[] | undefined = undefined

    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
        // '{{'
        node = parseInterpolation(context, mode)
      } else if (mode === TextModes.DATA && s[0] === '<') {
        // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
        if (s.length === 1) {
          emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 1)
        } else if (s[1] === '!') {
          // https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
          if (startsWith(s, '<!--')) {
            node = parseComment(context)
          } else if (startsWith(s, '<!DOCTYPE')) {
            // Ignore DOCTYPE by a limitation.
            node = parseBogusComment(context)
          } else if (startsWith(s, '<![CDATA[')) {
            if (ns !== Namespaces.HTML) {
              node = parseCDATA(context, ancestors)
            } else {
              emitError(context, ErrorCodes.CDATA_IN_HTML_CONTENT)
              node = parseBogusComment(context)
            }
          } else {
            emitError(context, ErrorCodes.INCORRECTLY_OPENED_COMMENT)
            node = parseBogusComment(context)
          }
        } else if (s[1] === '/') {
          // https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
          if (s.length === 2) {
            emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 2)
          } else if (s[2] === '>') {
            emitError(context, ErrorCodes.MISSING_END_TAG_NAME, 2)
            advanceBy(context, 3)
            continue
          } else if (/[a-z]/i.test(s[2])) {
            emitError(context, ErrorCodes.X_INVALID_END_TAG)
            parseTag(context, TagType.End, parent)
            continue
          } else {
            emitError(
              context,
              ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME,
              2
            )
            node = parseBogusComment(context)
          }
        } else if (/[a-z]/i.test(s[1])) {
          node = parseElement(context, ancestors)

          // 2.x <template> with no directive compat
          if (
            __COMPAT__ &&
            isCompatEnabled(
              CompilerDeprecationTypes.COMPILER_NATIVE_TEMPLATE,
              context
            ) &&
            node &&
            node.tag === 'template' &&
            !node.props.some(
              p =>
                p.type === NodeTypes.DIRECTIVE &&
                isSpecialTemplateDirective(p.name)
            )
          ) {
            __DEV__ &&
              warnDeprecation(
                CompilerDeprecationTypes.COMPILER_NATIVE_TEMPLATE,
                context,
                node.loc
              )
            node = node.children
          }
        } else if (s[1] === '?') {
          emitError(
            context,
            ErrorCodes.UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME,
            1
          )
          node = parseBogusComment(context)
        } else {
          emitError(context, ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME, 1)
        }
      }
    }
    if (!node) {
      node = parseText(context, mode)
    }

    if (isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        pushNode(nodes, node[i])
      }
    } else {
      pushNode(nodes, node)
    }
  }

  // Whitespace handling strategy like v2
  let removedWhitespace = false
  if (mode !== TextModes.RAWTEXT && mode !== TextModes.RCDATA) {
    const shouldCondense = context.options.whitespace !== 'preserve'
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.type === NodeTypes.TEXT) {
        if (!context.inPre) {
          if (!/[^\t\r\n\f ]/.test(node.content)) {
            const prev = nodes[i - 1]
            const next = nodes[i + 1]
            // Remove if:
            // - the whitespace is the first or last node, or:
            // - (condense mode) the whitespace is between twos comments, or:
            // - (condense mode) the whitespace is between comment and element, or:
            // - (condense mode) the whitespace is between two elements AND contains newline
            if (
              !prev ||
              !next ||
              (shouldCondense &&
                ((prev.type === NodeTypes.COMMENT &&
                  next.type === NodeTypes.COMMENT) ||
                  (prev.type === NodeTypes.COMMENT &&
                    next.type === NodeTypes.ELEMENT) ||
                  (prev.type === NodeTypes.ELEMENT &&
                    next.type === NodeTypes.COMMENT) ||
                  (prev.type === NodeTypes.ELEMENT &&
                    next.type === NodeTypes.ELEMENT &&
                    /[\r\n]/.test(node.content))))
            ) {
              removedWhitespace = true
              nodes[i] = null as any
            } else {
              // Otherwise, the whitespace is condensed into a single space
              node.content = ' '
            }
          } else if (shouldCondense) {
            // in condense mode, consecutive whitespaces in text are condensed
            // down to a single space.
            node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
          }
        } else {
          // #6410 normalize windows newlines in <pre>:
          // in SSR, browsers normalize server-rendered \r\n into a single \n
          // in the DOM
          node.content = node.content.replace(/\r\n/g, '\n')
        }
      }
      // Remove comment nodes if desired by configuration.
      else if (node.type === NodeTypes.COMMENT && !context.options.comments) {
        removedWhitespace = true
        nodes[i] = null as any
      }
    }
    if (context.inPre && parent && context.options.isPreTag(parent.tag)) {
      // remove leading newline per html spec
      // https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element
      const first = nodes[0]
      if (first && first.type === NodeTypes.TEXT) {
        first.content = first.content.replace(/^\r?\n/, '')
      }
    }
  }

  return removedWhitespace ? nodes.filter(Boolean) : nodes
}
/**
 * 
 * @param nodes 
 * @param node 
 * @returns 
 * `pushNode` 函数用于将解析得到的节点 `node` 添加到节点数组 `nodes` 中。

函数首先判断节点的类型是否为文本节点（`NodeTypes.TEXT`）。如果是文本节点，则进一步判断是否可以合并到前一个文本节点中。

- 如果前一个节点存在，且前一个节点也是文本节点，并且前一个节点的结束位置和当前节点的开始位置相邻，即它们连续出现，那么将当前节点的内容追加到前一个节点的内容中，并更新前一个节点的结束位置、源代码位置和源代码字符串。
- 合并完成后，直接返回，不将当前节点添加到节点数组中。

如果无法进行合并，或者节点的类型不是文本节点，则将当前节点添加到节点数组 `nodes` 中。

该函数的作用是处理连续的文本节点，将它们合并为一个节点，以减少节点数组的长度和提高解析性能。
 */
function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes)
    // Merge if both this and the previous node are text and those are
    // consecutive. This happens for cases like "a < b".
    if (
      prev &&
      prev.type === NodeTypes.TEXT &&
      prev.loc.end.offset === node.loc.start.offset
    ) {
      prev.content += node.content
      prev.loc.end = node.loc.end
      prev.loc.source += node.loc.source
      return
    }
  }

  nodes.push(node)
}
/**
 * 
 * @param context 
 * @param ancestors 
 * @returns 
 * `parseCDATA` 函数用于解析 CDATA 节点。

函数首先进行断言验证，确保 CDATA 节点的父节点不是 HTML 命名空间，并且当前解析的源代码以 `<![CDATA[` 开头。

接下来，函数将移动解析上下文的偏移量，跳过 `<![CDATA[`，然后调用 `parseChildren` 函数解析 CDATA 节点的子节点，传入的模式为 `TextModes.CDATA`，并将当前节点的祖先节点数组传递给子节点解析函数。

如果在解析子节点后，源代码已经被完全消耗，即没有剩余的源代码，那么会发出错误，提示 CDATA 节点中存在 EOF（End of File）。
否则，函数会进行断言验证，确保剩余的源代码以 `]]>` 结尾，并移动解析上下文的偏移量，跳过 `]]>`。

最后，函数返回解析得到的子节点数组。

该函数的作用是解析 CDATA 节点的内容，它是一种特殊的文本节点，在 CDATA 节点中，不会进行标签或实体的解析，直接将内容作为文本处理。
 */
function parseCDATA(
  context: ParserContext,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  __TEST__ &&
    assert(last(ancestors) == null || last(ancestors)!.ns !== Namespaces.HTML)
  __TEST__ && assert(startsWith(context.source, '<![CDATA['))

  advanceBy(context, 9)
  const nodes = parseChildren(context, TextModes.CDATA, ancestors)
  if (context.source.length === 0) {
    emitError(context, ErrorCodes.EOF_IN_CDATA)
  } else {
    __TEST__ && assert(startsWith(context.source, ']]>'))
    advanceBy(context, 3)
  }

  return nodes
}
/**
 * 
 * @param context 
 * @returns 
 * `parseComment` 函数用于解析注释节点。

函数首先进行断言验证，确保注释节点的起始标记为 `<!--`。

接下来，函数创建一个起始位置的游标，用于记录注释节点在源代码中的位置信息。

然后，函数使用正则表达式 `/--(\!)?>/` 来匹配源代码中的注释结束标记 `-->`。如果匹配失败，说明注释节点没有正确闭合，此时将剩余的源代码作为注释节点的内容，移动解析上下文的偏移量到源代码末尾，并发出错误提示，指示在注释节点中存在 EOF（End of File）。

如果匹配成功，函数将根据匹配结果判断是否存在 `!` 字符，如果存在，则发出错误提示，指示注释节点没有正确关闭。

接着，函数根据匹配结果截取源代码中的注释内容，从索引 4（跳过 `<!--`）开始截取至匹配结束标记的索引之前的位置。

在处理嵌套注释时，函数会使用循环遍历的方式，从注释内容中查找 `<!--` 的出现位置，逐个处理嵌套的注释。在每次找到嵌套注释时，函数会移动解析上下文的偏移量，并检查嵌套注释的结尾位置是否正确，如果嵌套注释的结尾位置不正确，则发出错误提示。

最后，函数移动解析上下文的偏移量，跳过注释节点的内容和结束标记，并根据起始位置和结束位置创建注释节点对象，包含类型为 `NodeTypes.COMMENT`，内容为注释内容，位置信息为起始位置和结束位置之间的区域。

该函数的作用是解析注释节点，将注释节点的内容提取出来，并创建对应的注释节点对象。注释节点在模板中以 `<!--` 开头，以 `-->` 结尾，用于添加注释信息，不会被渲染到最终的输出中。
 */
function parseComment(context: ParserContext): CommentNode {
  __TEST__ && assert(startsWith(context.source, '<!--'))

  const start = getCursor(context)
  let content: string

  // Regular comment.
  const match = /--(\!)?>/.exec(context.source)
  if (!match) {
    content = context.source.slice(4)
    advanceBy(context, context.source.length)
    emitError(context, ErrorCodes.EOF_IN_COMMENT)
  } else {
    if (match.index <= 3) {
      emitError(context, ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
    }
    if (match[1]) {
      emitError(context, ErrorCodes.INCORRECTLY_CLOSED_COMMENT)
    }
    content = context.source.slice(4, match.index)

    // Advancing with reporting nested comments.
    const s = context.source.slice(0, match.index)
    let prevIndex = 1,
      nestedIndex = 0
    while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
      advanceBy(context, nestedIndex - prevIndex + 1)
      if (nestedIndex + 4 < s.length) {
        emitError(context, ErrorCodes.NESTED_COMMENT)
      }
      prevIndex = nestedIndex + 1
    }
    advanceBy(context, match.index + match[0].length - prevIndex + 1)
  }

  return {
    type: NodeTypes.COMMENT,
    content,
    loc: getSelection(context, start)
  }
}
/**
 * 
 * @param context 
 * @returns 
 * `parseBogusComment` 函数用于解析无效注释节点（Bogus Comment Node）。

函数首先进行断言验证，确保源代码以非小写字母开头，即源代码不是有效的注释节点或结束标记。

接下来，函数创建一个起始位置的游标，用于记录注释节点在源代码中的位置信息。

然后，函数根据源代码中第一个字符的情况确定注释内容的起始位置，如果第一个字符是 `?`，则起始位置为索引 1，否则为索引 2。

接着，函数查找源代码中的 `>` 字符的索引位置。如果找不到 `>` 字符，说明注释节点没有正确闭合，此时将剩余的源代码作为注释节点的内容，移动解析上下文的偏移量到源代码末尾。

如果找到了 `>` 字符，函数将根据起始位置和 `>` 字符的索引位置之间的区域，截取源代码中的注释内容。

最后，函数移动解析上下文的偏移量，跳过注释节点的内容和结束标记，并根据起始位置和结束位置创建注释节点对象，包含类型为 `NodeTypes.COMMENT`，内容为注释内容，位置信息为起始位置和结束位置之间的区域。

该函数的作用是解析无效注释节点，将注释节点的内容提取出来，并创建对应的注释节点对象。无效注释节点是指在模板中出现的不符合注释节点规范的内容，或者是不完整的注释节点。在解析过程中，遇到无效注释节点时，函数将尽可能地提取出注释内容，并创建注释节点对象，以保证解析的连续性。
 */
function parseBogusComment(context: ParserContext): CommentNode | undefined {
  __TEST__ && assert(/^<(?:[\!\?]|\/[^a-z>])/i.test(context.source))

  const start = getCursor(context)
  const contentStart = context.source[1] === '?' ? 1 : 2
  let content: string

  const closeIndex = context.source.indexOf('>')
  if (closeIndex === -1) {
    content = context.source.slice(contentStart)
    advanceBy(context, context.source.length)
  } else {
    content = context.source.slice(contentStart, closeIndex)
    advanceBy(context, closeIndex + 1)
  }

  return {
    type: NodeTypes.COMMENT,
    content,
    loc: getSelection(context, start)
  }
}
/**
 * 
 * @param context 
 * @param ancestors 
 * @returns 
 * `parseElement` 函数用于解析元素节点。

函数首先进行断言验证，确保源代码以字母开头，即源代码是一个起始标签。

接下来，函数保存当前的 `context.inPre` 和 `context.inVPre` 状态，并获取当前元素节点的父节点。

然后，函数调用 `parseTag` 函数解析起始标签，并传入标签类型为 `TagType.Start` 和父节点。返回的结果是一个元素节点对象。

接着，函数判断元素节点是否是自闭合标签或空标签（void tag），如果是，则根据情况更新 `context.inPre` 和 `context.inVPre` 的状态，然后直接返回元素节点对象。

如果元素节点不是自闭合标签或空标签，说明它包含子节点。函数将当前元素节点添加到祖先节点数组中，然后根据元素节点和父节点的信息，获取文本模式 `mode`。

接下来，函数调用 `parseChildren` 函数解析子节点，传入 `context`、`mode` 和祖先节点数组。返回的结果是子节点的数组。

完成子节点的解析后，函数将当前元素节点从祖先节点数组中弹出。

如果启用了 2.x 的 `inline-template` 兼容选项（`__COMPAT__`），函数将检查元素节点的属性中是否存在 `inline-template` 属性，如果存在且启用了兼容性选项，则将其转换为文本节点。

最后，函数将子节点数组赋值给元素节点的 `children` 属性。

然后，函数检查源代码中是否存在结束标签，并调用 `parseTag` 函数解析结束标签，并传入标签类型为 `TagType.End` 和父节点。

如果源代码中不存在结束标签，则发出错误提示，并根据情况处理 `context.inPre` 和 `context.inVPre` 的状态。

最后，函数根据起始位置和结束位置之间的区域创建元素节点的位置信息，并返回元素节点对象。

`parseElement` 函数的作用是解析元素节点，包括起始标签、子节点和结束标签。它还处理了特殊情况，如自闭合标签和空标签的处理，以及兼容性选项的处理。函数通过递归调用 `parseTag` 和 `parseChildren` 函数来解析元素节点的起始标签和子节点。
 */
function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode | undefined {
  __TEST__ && assert(/^<[a-z]/i.test(context.source))

  // Start tag.
  const wasInPre = context.inPre
  const wasInVPre = context.inVPre
  const parent = last(ancestors)
  const element = parseTag(context, TagType.Start, parent)
  const isPreBoundary = context.inPre && !wasInPre
  const isVPreBoundary = context.inVPre && !wasInVPre

  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    // #4030 self-closing <pre> tag
    if (isPreBoundary) {
      context.inPre = false
    }
    if (isVPreBoundary) {
      context.inVPre = false
    }
    return element
  }

  // Children.
  ancestors.push(element)
  const mode = context.options.getTextMode(element, parent)
  const children = parseChildren(context, mode, ancestors)
  ancestors.pop()

  // 2.x inline-template compat
  if (__COMPAT__) {
    const inlineTemplateProp = element.props.find(
      p => p.type === NodeTypes.ATTRIBUTE && p.name === 'inline-template'
    ) as AttributeNode
    if (
      inlineTemplateProp &&
      checkCompatEnabled(
        CompilerDeprecationTypes.COMPILER_INLINE_TEMPLATE,
        context,
        inlineTemplateProp.loc
      )
    ) {
      const loc = getSelection(context, element.loc.end)
      inlineTemplateProp.value = {
        type: NodeTypes.TEXT,
        content: loc.source,
        loc
      }
    }
  }

  element.children = children

  // End tag.
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End, parent)
  } else {
    emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
      const first = children[0]
      if (first && startsWith(first.loc.source, '<!--')) {
        emitError(context, ErrorCodes.EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT)
      }
    }
  }

  element.loc = getSelection(context, element.loc.start)

  if (isPreBoundary) {
    context.inPre = false
  }
  if (isVPreBoundary) {
    context.inVPre = false
  }
  return element
}
/**
 * `TagType` 是一个常量枚举（`const enum`），用于表示标签的类型。它包含两个成员：

1. `Start`：表示起始标签。
2. `End`：表示结束标签。

通过使用 `TagType`，可以明确标识一个标签是起始标签还是结束标签。这在解析和处理标签时非常有用，因为起始标签和结束标签有不同的语义和行为。常量枚举在编译时会被内联，因此不会在运行时创建一个对象，而是直接使用相应的数值表示。这可以提高执行效率和减少内存占用。
 */
const enum TagType {
  Start,
  End
}
/**
 * `isSpecialTemplateDirective` 是一个函数调用，用于创建一个映射表（map），用于判断给定的字符串是否是特殊的模板指令。该函数调用使用 `makeMap` 函数，将字符串 `"if,else,else-if,for,slot"` 作为参数传递进去。

`makeMap` 函数是一个用于创建映射表的实用函数。它接受一个逗号分隔的字符串参数，并返回一个函数，该函数可以判断给定的字符串是否存在于原始字符串中。在这种情况下，`isSpecialTemplateDirective` 函数将返回一个函数，该函数可以用于检查给定的字符串是否是特殊的模板指令。

例如，可以使用 `isSpecialTemplateDirective` 函数判断字符串 `"if"` 是否是特殊的模板指令，如下所示：

```javascript
const isSpecialDirective = isSpecialTemplateDirective("if");
console.log(isSpecialDirective("if")); // true
console.log(isSpecialDirective("else")); // false
```

在这个例子中，`isSpecialDirective` 函数返回的函数被赋值给 `isSpecialDirective` 变量，然后该函数被调用来检查给定的字符串是否是特殊的模板指令。
 */
const isSpecialTemplateDirective = /*#__PURE__*/ makeMap(
  `if,else,else-if,for,slot`
)

/**
 * Parse a tag (E.g. `<div id=a>`) with that type (start tag or end tag).
 * `parseTag` 函数用于解析标签，并返回相应的 `ElementNode` 对象。它根据 `type` 参数的不同，有三种重载形式。

第一种形式用于解析开始标签，其函数签名为：

```typescript
function parseTag(
  context: ParserContext,
  type: TagType.Start,
  parent: ElementNode | undefined
): ElementNode
```

第二种形式用于解析结束标签，其函数签名为：

```typescript
function parseTag(
  context: ParserContext,
  type: TagType.End,
  parent: ElementNode | undefined
): void
```

第三种形式用于解析标签，不区分开始标签和结束标签，其函数签名为：

```typescript
function parseTag(
  context: ParserContext,
  type: TagType,
  parent: ElementNode | undefined
): ElementNode | undefined
```

函数中的 `__TEST__` 和 `__COMPAT__` 是用于测试和兼容性的条件判断，可以在测试或兼容性模式下执行相应的代码块。

函数的主要逻辑如下：

1. 解析标签的开头部分，并获取标签名和命名空间。
2. 检查是否为 `<pre>` 标签，如果是，则设置 `context.inPre` 为 `true`。
3. 解析标签的属性，并存储在 `props` 变量中。
4. 如果是开始标签且不处于 `v-pre` 指令内，并且存在 `v-pre` 指令属性，则设置 `context.inVPre` 为 `true`，重新解析属性并过滤掉 `v-pre` 指令属性本身。
5. 检查标签的关闭方式，如果标签的源码长度为 0，则发出错误，否则判断是否为自闭合标签，并根据情况更新 `context`。
6. 如果是结束标签，则返回 `undefined`。
7. 如果开启了 2.x 兼容性模式且存在 `v-if` 和 `v-for` 指令同时存在于属性列表中，则发出警告。
8. 根据标签类型，确定 `tagType` 的值。
9. 返回 `ElementNode` 对象，包含标签的相关信息。

需要注意的是，上述代码片段中的函数重载和类型声明可能与实际代码的完整实现存在出入，仅提供了主要逻辑的概述。实际使用时，请参考完整的代码实现。
 */
function parseTag(
  context: ParserContext,
  type: TagType.Start,
  parent: ElementNode | undefined
): ElementNode
function parseTag(
  context: ParserContext,
  type: TagType.End,
  parent: ElementNode | undefined
): void
function parseTag(
  context: ParserContext,
  type: TagType,
  parent: ElementNode | undefined
): ElementNode | undefined {
  __TEST__ && assert(/^<\/?[a-z]/i.test(context.source))
  __TEST__ &&
    assert(
      type === (startsWith(context.source, '</') ? TagType.End : TagType.Start)
    )

  // Tag open.
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
  const tag = match[1]
  const ns = context.options.getNamespace(tag, parent)

  advanceBy(context, match[0].length)
  advanceSpaces(context)

  // save current state in case we need to re-parse attributes with v-pre
  const cursor = getCursor(context)
  const currentSource = context.source

  // check <pre> tag
  if (context.options.isPreTag(tag)) {
    context.inPre = true
  }

  // Attributes.
  let props = parseAttributes(context, type)

  // check v-pre
  if (
    type === TagType.Start &&
    !context.inVPre &&
    props.some(p => p.type === NodeTypes.DIRECTIVE && p.name === 'pre')
  ) {
    context.inVPre = true
    // reset context
    extend(context, cursor)
    context.source = currentSource
    // re-parse attrs and filter out v-pre itself
    props = parseAttributes(context, type).filter(p => p.name !== 'v-pre')
  }

  // Tag close.
  let isSelfClosing = false
  if (context.source.length === 0) {
    emitError(context, ErrorCodes.EOF_IN_TAG)
  } else {
    isSelfClosing = startsWith(context.source, '/>')
    if (type === TagType.End && isSelfClosing) {
      emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
    }
    advanceBy(context, isSelfClosing ? 2 : 1)
  }

  if (type === TagType.End) {
    return
  }

  // 2.x deprecation checks
  if (
    __COMPAT__ &&
    __DEV__ &&
    isCompatEnabled(
      CompilerDeprecationTypes.COMPILER_V_IF_V_FOR_PRECEDENCE,
      context
    )
  ) {
    let hasIf = false
    let hasFor = false
    for (let i = 0; i < props.length; i++) {
      const p = props[i]
      if (p.type === NodeTypes.DIRECTIVE) {
        if (p.name === 'if') {
          hasIf = true
        } else if (p.name === 'for') {
          hasFor = true
        }
      }
      if (hasIf && hasFor) {
        warnDeprecation(
          CompilerDeprecationTypes.COMPILER_V_IF_V_FOR_PRECEDENCE,
          context,
          getSelection(context, start)
        )
        break
      }
    }
  }

  let tagType = ElementTypes.ELEMENT
  if (!context.inVPre) {
    if (tag === 'slot') {
      tagType = ElementTypes.SLOT
    } else if (tag === 'template') {
      if (
        props.some(
          p =>
            p.type === NodeTypes.DIRECTIVE && isSpecialTemplateDirective(p.name)
        )
      ) {
        tagType = ElementTypes.TEMPLATE
      }
    } else if (isComponent(tag, props, context)) {
      tagType = ElementTypes.COMPONENT
    }
  }

  return {
    type: NodeTypes.ELEMENT,
    ns,
    tag,
    tagType,
    props,
    isSelfClosing,
    children: [],
    loc: getSelection(context, start),
    codegenNode: undefined // to be created during transform phase
  }
}
/**
 * 
 * @param tag 
 * @param props 
 * @param context 
 * @returns 
 * `isComponent` 函数用于判断给定的标签是否为组件。它接受标签名 `tag`、属性列表 `props` 和解析器上下文 `context` 作为参数，并返回一个布尔值。

函数的逻辑如下：

1. 获取解析器选项 `options`。
2. 如果标签是自定义元素，则返回 `false`。
3. 判断标签是否为特殊情况下的组件：
   - 标签名为 `'component'`。
   - 标签名以大写字母开头。
   - 标签名是核心组件之一（通过调用 `isCoreComponent` 函数判断）。
   - 标签名是内置组件，并且满足解析器选项中的 `isBuiltInComponent` 函数的条件。
   - 标签名是原生标签，并且不满足解析器选项中的 `isNativeTag` 函数的条件。
   如果以上任何条件成立，则返回 `true`，表示该标签是组件。
4. 对于可能存在的 `is` 属性，进行进一步检查：
   - 如果 `is` 属性的值以 `'vue:'` 开头，则返回 `true`。
   - 如果开启了兼容性模式，并且存在与 `COMPILER_IS_ON_ELEMENT` 相关的兼容性选项，则返回 `true`。
5. 遍历属性列表，对指令进行进一步检查：
   - 对于 `v-is` 指令，返回 `true`。
   - 如果开启了兼容性模式，并且存在与 `COMPILER_IS_ON_ELEMENT` 相关的兼容性选项，并且属性是 `bind` 指令，且其参数为静态字符串 `'is'`，则返回 `true`。
6. 如果以上条件都不成立，则返回 `false`，表示该标签不是组件。

需要注意的是，上述代码片段中的函数调用和条件判断可能依赖于其他部分的代码实现，仅提供了主要逻辑的概述。实际使用时，请参考完整的代码实现。
 */
function isComponent(
  tag: string,
  props: (AttributeNode | DirectiveNode)[],
  context: ParserContext
) {
  const options = context.options
  if (options.isCustomElement(tag)) {
    return false
  }
  if (
    tag === 'component' ||
    /^[A-Z]/.test(tag) ||
    isCoreComponent(tag) ||
    (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||
    (options.isNativeTag && !options.isNativeTag(tag))
  ) {
    return true
  }
  // at this point the tag should be a native tag, but check for potential "is"
  // casting
  for (let i = 0; i < props.length; i++) {
    const p = props[i]
    if (p.type === NodeTypes.ATTRIBUTE) {
      if (p.name === 'is' && p.value) {
        if (p.value.content.startsWith('vue:')) {
          return true
        } else if (
          __COMPAT__ &&
          checkCompatEnabled(
            CompilerDeprecationTypes.COMPILER_IS_ON_ELEMENT,
            context,
            p.loc
          )
        ) {
          return true
        }
      }
    } else {
      // directive
      // v-is (TODO: remove in 3.4)
      if (p.name === 'is') {
        return true
      } else if (
        // :is on plain element - only treat as component in compat mode
        p.name === 'bind' &&
        isStaticArgOf(p.arg, 'is') &&
        __COMPAT__ &&
        checkCompatEnabled(
          CompilerDeprecationTypes.COMPILER_IS_ON_ELEMENT,
          context,
          p.loc
        )
      ) {
        return true
      }
    }
  }
}
/**
 * 
 * @param context 
 * @param type 
 * @returns 
 * `parseAttributes` 函数用于解析标签的属性列表，并返回一个由属性节点（`AttributeNode`）或指令节点（`DirectiveNode`）组成的数组。它接受解析器上下文 `context` 和标签类型 `type` 作为参数。

函数的逻辑如下：

1. 创建一个空数组 `props`，用于存储解析得到的属性节点或指令节点。
2. 创建一个空的字符串集合 `attributeNames`，用于检查属性名的唯一性。
3. 进入循环，直到满足以下任一条件之一：
   - `context.source` 的长度为 0（已解析完所有内容）。
   - `context.source` 以 `>` 开头（标签结束）。
   - `context.source` 以 `/>` 开头（自闭合标签结束）。
4. 在循环中，首先检查是否以 `/` 开头，如果是，则发出错误并忽略该字符，然后继续循环。
5. 如果标签类型为结束标签（`TagType.End`），则发出错误（表示不应该有属性）。
6. 调用 `parseAttribute` 函数解析一个属性，并传入 `attributeNames` 参数进行属性名唯一性检查。
7. 如果解析得到的属性节点是 `class` 属性且具有值，则去除值中的多余空格，并将其内容替换为只包含一个空格的字符串。
8. 如果标签类型为开始标签（`TagType.Start`），则将属性节点或指令节点添加到 `props` 数组中。
9. 如果 `context.source` 的下一个字符不是空白字符，发出错误（表示属性之间缺少空白符）。
10. 前进并忽略空白符。
11. 返回属性节点或指令节点的数组 `props`。

需要注意的是，上述代码片段中的函数调用和条件判断可能依赖于其他部分的代码实现，仅提供了主要逻辑的概述。实际使用时，请参考完整的代码实现。
 */
function parseAttributes(
  context: ParserContext,
  type: TagType
): (AttributeNode | DirectiveNode)[] {
  const props = []
  const attributeNames = new Set<string>()
  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    if (startsWith(context.source, '/')) {
      emitError(context, ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG)
      advanceBy(context, 1)
      advanceSpaces(context)
      continue
    }
    if (type === TagType.End) {
      emitError(context, ErrorCodes.END_TAG_WITH_ATTRIBUTES)
    }

    const attr = parseAttribute(context, attributeNames)

    // Trim whitespace between class
    // https://github.com/vuejs/core/issues/4251
    if (
      attr.type === NodeTypes.ATTRIBUTE &&
      attr.value &&
      attr.name === 'class'
    ) {
      attr.value.content = attr.value.content.replace(/\s+/g, ' ').trim()
    }

    if (type === TagType.Start) {
      props.push(attr)
    }

    if (/^[^\t\r\n\f />]/.test(context.source)) {
      emitError(context, ErrorCodes.MISSING_WHITESPACE_BETWEEN_ATTRIBUTES)
    }
    advanceSpaces(context)
  }
  return props
}
/**
 * 
 * @param context 
 * @param nameSet 
 * @returns 
 *`parseAttribute` 函数用于解析属性节点或指令节点，并返回一个包含节点信息的对象。它接受解析器上下文 `context` 和一个存储属性名集合的 `nameSet` 参数。

函数的逻辑如下：

1. 检查测试标志 `__TEST__` 是否为真，并断言属性名的起始字符满足正则表达式 `/^[^\t\r\n\f />]/`。
2. 获取当前解析位置的游标 `start`。
3. 使用正则表达式 `/^[^\t\r\n\f />][^\t\r\n\f />=]` 在 `context.source` 中匹配属性名，并将匹配结果存储在 `match` 中。
4. 将匹配结果的第一个元素作为属性名存储在变量 `name` 中。
5. 如果 `nameSet` 中已经存在相同的属性名，则发出错误消息 `DUPLICATE_ATTRIBUTE`。
6. 将属性名添加到 `nameSet` 中。
7. 如果属性名以等号 `=` 开头，则发出错误消息 `UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME`。
8. 使用正则表达式 `/["'<]/g` 匹配属性名中的非法字符，并逐个发出错误消息 `UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME`。
9. 根据属性名的长度前进解析器的位置。
10. 解析属性值。
    - 如果 `context.source` 中以制表符、回车符、换行符、换页符或空格开始并紧接等号 `=` 的字符序列，则进入属性值解析逻辑。
      - 前进并忽略空白字符。
      - 前进一个字符并忽略空白字符。
      - 解析属性值，并将结果存储在变量 `value` 中。
      - 如果属性值不存在，则发出错误消息 `MISSING_ATTRIBUTE_VALUE`。
    - 否则，属性值为空。
11. 获取节点的位置信息 `loc`。
12. 如果不处于 `v-pre` 模式，并且属性名以 `v-`、`:`、`.`、`@` 或 `#` 开头，则进入指令解析逻辑。
    - 使用正则表达式 `/(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i` 匹配属性名，并将匹配结果存储在 `match` 中。
    - 判断属性名是否以 `.` 开头，如果是则表示是属性的简写形式。
    - 根据匹配结果获取指令名 `dirName`。
    - 解析指令参数。
      - 判断是否是 `slot` 指令。
      - 查找参数在属性名中的起始偏移量 `startOffset`。
      - 获取参数在源代码中的位置信息 `loc`。
      - 将参数存储在变量 `content` 中。
      - 判断参数是否是静态的。
        - 如果参数以 `[` 开头，则表示不是静态的。
          - 如果参数不以 `]` 结尾，则

发出错误消息 `X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END`。
          - 否则，去除参数的开头和结尾的方括号。
        - 否则，参数是静态的。
      - 创建参数节点 `arg`，类型为 `NodeTypes.SIMPLE_EXPRESSION`，并存储在变量 `arg` 中。
    - 如果属性值存在且是引号包裹的，则调整属性值的位置信息。
    - 解析指令的修饰符。
    - 如果是属性的简写形式，则添加 `prop` 修饰符。
    - 如果开启了兼容模式，并且指令名是 `bind`，并且存在参数，则进行特殊处理：
      - 如果修饰符中包含 `sync` 并且兼容性检查通过，则将指令名修改为 `model` 并移除 `sync` 修饰符。
      - 如果是开发环境，并且修饰符中包含 `prop`，则进行兼容性检查。
    - 创建指令节点并返回。
13. 如果不处于 `v-pre` 模式，并且属性名以 `v-` 开头，则发出错误消息 `X_MISSING_DIRECTIVE_NAME`。
14. 创建属性节点并返回。
 */
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string>
): AttributeNode | DirectiveNode {
  __TEST__ && assert(/^[^\t\r\n\f />]/.test(context.source))

  // Name.
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
  const name = match[0]

  if (nameSet.has(name)) {
    emitError(context, ErrorCodes.DUPLICATE_ATTRIBUTE)
  }
  nameSet.add(name)

  if (name[0] === '=') {
    emitError(context, ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME)
  }
  {
    const pattern = /["'<]/g
    let m: RegExpExecArray | null
    while ((m = pattern.exec(name))) {
      emitError(
        context,
        ErrorCodes.UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME,
        m.index
      )
    }
  }

  advanceBy(context, name.length)

  // Value
  let value: AttributeValue = undefined

  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
    if (!value) {
      emitError(context, ErrorCodes.MISSING_ATTRIBUTE_VALUE)
    }
  }
  const loc = getSelection(context, start)

  if (!context.inVPre && /^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    const match =
      /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(
        name
      )!

    let isPropShorthand = startsWith(name, '.')
    let dirName =
      match[1] ||
      (isPropShorthand || startsWith(name, ':')
        ? 'bind'
        : startsWith(name, '@')
        ? 'on'
        : 'slot')
    let arg: ExpressionNode | undefined

    if (match[2]) {
      const isSlot = dirName === 'slot'
      const startOffset = name.lastIndexOf(
        match[2],
        name.length - (match[3]?.length || 0)
      )
      const loc = getSelection(
        context,
        getNewPosition(context, start, startOffset),
        getNewPosition(
          context,
          start,
          startOffset + match[2].length + ((isSlot && match[3]) || '').length
        )
      )
      let content = match[2]
      let isStatic = true

      if (content.startsWith('[')) {
        isStatic = false

        if (!content.endsWith(']')) {
          emitError(
            context,
            ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END
          )
          content = content.slice(1)
        } else {
          content = content.slice(1, content.length - 1)
        }
      } else if (isSlot) {
        // #1241 special case for v-slot: vuetify relies extensively on slot
        // names containing dots. v-slot doesn't have any modifiers and Vue 2.x
        // supports such usage so we are keeping it consistent with 2.x.
        content += match[3] || ''
      }

      arg = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic,
        constType: isStatic
          ? ConstantTypes.CAN_STRINGIFY
          : ConstantTypes.NOT_CONSTANT,
        loc
      }
    }

    if (value && value.isQuoted) {
      const valueLoc = value.loc
      valueLoc.start.offset++
      valueLoc.start.column++
      valueLoc.end = advancePositionWithClone(valueLoc.start, value.content)
      valueLoc.source = valueLoc.source.slice(1, -1)
    }

    const modifiers = match[3] ? match[3].slice(1).split('.') : []
    if (isPropShorthand) modifiers.push('prop')

    // 2.x compat v-bind:foo.sync -> v-model:foo
    if (__COMPAT__ && dirName === 'bind' && arg) {
      if (
        modifiers.includes('sync') &&
        checkCompatEnabled(
          CompilerDeprecationTypes.COMPILER_V_BIND_SYNC,
          context,
          loc,
          arg.loc.source
        )
      ) {
        dirName = 'model'
        modifiers.splice(modifiers.indexOf('sync'), 1)
      }

      if (__DEV__ && modifiers.includes('prop')) {
        checkCompatEnabled(
          CompilerDeprecationTypes.COMPILER_V_BIND_PROP,
          context,
          loc
        )
      }
    }

    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content,
        isStatic: false,
        // Treat as non-constant by default. This can be potentially set to
        // other values by `transformExpression` to make it eligible for hoisting.
        constType: ConstantTypes.NOT_CONSTANT,
        loc: value.loc
      },
      arg,
      modifiers,
      loc
    }
  }

  // missing directive name or illegal directive name
  if (!context.inVPre && startsWith(name, 'v-')) {
    emitError(context, ErrorCodes.X_MISSING_DIRECTIVE_NAME)
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc
    },
    loc
  }
}
/**
 * 
 * @param context 
 * @returns 
 * `parseAttributeValue` 函数用于解析属性值，并返回一个包含属性值信息的对象。它接受解析器上下文 `context` 参数。

函数的逻辑如下：

1. 获取当前解析位置的游标 `start`。
2. 声明变量 `content`，用于存储属性值的内容。
3. 获取属性值的引号字符，存储在变量 `quote` 中。
4. 判断属性值是否被引号包裹，通过检查引号字符是否为 `"` 或 `'` 来判断，结果存储在变量 `isQuoted` 中。
5. 如果属性值被引号包裹，则进入引号包裹的属性值解析逻辑。
   - 前进一个字符，跳过引号字符。
   - 查找属性值中的引号字符结束位置 `endIndex`，使用 `indexOf` 方法查找第一个匹配的引号字符的索引。
   - 如果找不到结束位置，则将整个剩余的源代码解析为属性值，并将结果存储在 `content` 中。
   - 否则，根据结束位置将属性值的部分源代码解析为属性值，并将结果存储在 `content` 中。
   - 前进一个字符，跳过引号字符。
6. 如果属性值没有被引号包裹，则进入非引号包裹的属性值解析逻辑。
   - 使用正则表达式 `/^[^\t\r\n\f >]+/` 在 `context.source` 中匹配非空白字符和特殊符号（`>`、`=`、`'`、`"`、`<`、``）以外的字符序列，并将匹配结果存储在 `match` 中。
   - 如果匹配结果不存在，则返回 `undefined`。
   - 使用正则表达式 `/["'<=`]/g` 匹配匹配结果中的非法字符，并逐个发出错误消息 `UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE`。
   - 根据匹配结果的长度将部分源代码解析为属性值，并将结果存储在 `content` 中。
7. 获取节点的位置信息 `loc`。
8. 创建并返回一个包含属性值内容、是否引号包裹以及位置信息的对象。
 */
function parseAttributeValue(context: ParserContext): AttributeValue {
  const start = getCursor(context)
  let content: string

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  if (isQuoted) {
    // Quoted value.
    advanceBy(context, 1)

    const endIndex = context.source.indexOf(quote)
    if (endIndex === -1) {
      content = parseTextData(
        context,
        context.source.length,
        TextModes.ATTRIBUTE_VALUE
      )
    } else {
      content = parseTextData(context, endIndex, TextModes.ATTRIBUTE_VALUE)
      advanceBy(context, 1)
    }
  } else {
    // Unquoted
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    if (!match) {
      return undefined
    }
    const unexpectedChars = /["'<=`]/g
    let m: RegExpExecArray | null
    while ((m = unexpectedChars.exec(match[0]))) {
      emitError(
        context,
        ErrorCodes.UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE,
        m.index
      )
    }
    content = parseTextData(context, match[0].length, TextModes.ATTRIBUTE_VALUE)
  }

  return { content, isQuoted, loc: getSelection(context, start) }
}
/**
 * 
 * @param context 
 * @param mode 
 * @returns 
 * `parseInterpolation` 函数用于解析插值表达式，并返回一个包含插值表达式信息的对象。它接受解析器上下文 `context` 和文本模式 `mode` 作为参数。

函数的逻辑如下：

1. 获取插值表达式的开始和结束符号，存储在变量 `open` 和 `close` 中。
2. 使用 `startsWith` 函数检查 `context.source` 是否以 `open` 开始，如果不是则发出错误消息。
3. 查找插值表达式的结束位置 `closeIndex`，使用 `indexOf` 方法查找第一个匹配的 `close` 的索引。
4. 如果找不到结束位置，则发出错误消息 `X_MISSING_INTERPOLATION_END`，并返回 `undefined`。
5. 获取当前解析位置的游标 `start`。
6. 前进 `open` 的长度，跳过开始符号。
7. 获取插值表达式内容的起始游标 `innerStart` 和结束游标 `innerEnd`。
8. 计算原始内容的长度 `rawContentLength`，即结束位置减去开始符号的长度。
9. 使用 `slice` 方法截取源代码中插值表达式的原始内容，存储在变量 `rawContent` 中。
10. 解析截取的原始内容为文本数据，并存储在变量 `preTrimContent` 中。
11. 对文本数据进行修剪，得到插值表达式的内容，存储在变量 `content` 中。
12. 计算修剪后的内容在原始内容中的起始偏移量 `startOffset`，即修剪前后内容的差异。
13. 如果起始偏移量大于 0，则将起始游标 `innerStart` 根据起始偏移量进行修改。
14. 计算修剪后的内容在原始内容中的结束偏移量 `endOffset`，即原始内容长度减去修剪前后内容长度的差异。
15. 将结束游标 `innerEnd` 根据结束偏移量进行修改。
16. 前进 `close` 的长度，跳过结束符号。
17. 创建并返回一个包含插值表达式内容和位置信息的对象。

最终返回的对象包含插值表达式的类型、内容和位置信息。
 */
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined {
  const [open, close] = context.options.delimiters
  __TEST__ && assert(startsWith(context.source, open))

  const closeIndex = context.source.indexOf(close, open.length)
  if (closeIndex === -1) {
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
    return undefined
  }

  const start = getCursor(context)
  advanceBy(context, open.length)
  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  const preTrimContent = parseTextData(context, rawContentLength, mode)
  const content = preTrimContent.trim()
  const startOffset = preTrimContent.indexOf(content)
  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }
  const endOffset =
    rawContentLength - (preTrimContent.length - content.length - startOffset)
  advancePositionWithMutation(innerEnd, rawContent, endOffset)
  advanceBy(context, close.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      // Set `isConstant` to false by default and will decide in transformExpression
      constType: ConstantTypes.NOT_CONSTANT,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  }
}
/**
 * 
 * @param context 
 * @param mode 
 * @returns 
 * `parseText` 函数用于解析文本节点，并返回一个包含文本内容和位置信息的对象。它接受解析器上下文 `context` 和文本模式 `mode` 作为参数。

函数的逻辑如下：

1. 使用断言 `assert` 检查 `context.source` 的长度是否大于 0，如果不是，则发出错误消息。
2. 根据文本模式 `mode` 设置结束标记数组 `endTokens`，如果模式为 `TextModes.CDATA`，则使用 `]]>` 作为结束标记，否则使用 `<` 和选项中的起始符号。
3. 初始化变量 `endIndex` 为 `context.source` 的长度。
4. 遍历结束标记数组，查找最早出现的结束标记，并更新 `endIndex`。
5. 使用断言 `assert` 检查 `endIndex` 是否大于 0，如果不是，则发出错误消息。
6. 获取当前解析位置的游标 `start`。
7. 使用 `parseTextData` 函数解析从起始位置到 `endIndex` 的文本数据，存储在变量 `content` 中。
8. 创建并返回一个包含文本内容和位置信息的对象。

最终返回的对象包含文本节点的类型、内容和位置信息。
 */
function parseText(context: ParserContext, mode: TextModes): TextNode {
  __TEST__ && assert(context.source.length > 0)

  const endTokens =
    mode === TextModes.CDATA ? [']]>'] : ['<', context.options.delimiters[0]]

  let endIndex = context.source.length
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  __TEST__ && assert(endIndex > 0)

  const start = getCursor(context)
  const content = parseTextData(context, endIndex, mode)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start)
  }
}

/**
 * Get text data with a given length from the current location.
 * This translates HTML entities in the text data.
 * `parseTextData` 函数用于解析文本数据并返回字符串结果。它接受解析器上下文 `context`、数据长度 `length` 和文本模式 `mode` 作为参数。

函数的逻辑如下：

1. 使用 `context.source.slice(0, length)` 获取从起始位置开始的指定长度的原始文本数据，并将结果存储在 `rawText` 中。
2. 使用 `advanceBy` 函数将解析器上下文的游标向前移动 `length` 个字符。
3. 检查文本模式是否为 `TextModes.RAWTEXT`、`TextModes.CDATA` 或者原始文本数据不包含 `&` 符号。如果满足条件，直接返回 `rawText`。
4. 如果文本模式为 `TextModes.DATA` 或 `TextModes.RCDATA`，且原始文本数据包含 `&` 符号，则需要进行实体解码。
5. 调用 `context.options.decodeEntities` 函数对 `rawText` 进行实体解码，第二个参数表示是否在属性值上下文中进行解码。
6. 返回解码后的文本结果。

最终返回的是解析后的文本数据字符串。如果满足特定条件（如原始文本数据为纯文本或者不包含实体引用），则直接返回原始文本数据，否则进行实体解码后返回。
 */
function parseTextData(
  context: ParserContext,
  length: number,
  mode: TextModes
): string {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  if (
    mode === TextModes.RAWTEXT ||
    mode === TextModes.CDATA ||
    !rawText.includes('&')
  ) {
    return rawText
  } else {
    // DATA or RCDATA containing "&"". Entity decoding required.
    return context.options.decodeEntities(
      rawText,
      mode === TextModes.ATTRIBUTE_VALUE
    )
  }
}
/**
 * 
 * @param context 
 * @returns `getCursor` 函数用于获取解析器上下文的当前位置信息，并返回一个包含 `column`、`line` 和 `offset` 的对象，表示当前位置的列数、行数和字符偏移量。

函数的逻辑非常简单，它直接从解析器上下文中获取 `context.column`、`context.line` 和 `context.offset` 的值，并将它们组成一个对象返回。

返回的位置对象可以用于在语法分析期间跟踪和记录节点在源代码中的位置信息。
 */
function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}
/**
 * 
 * @param context 
 * @param start 
 * @param end 
 * @returns 
 * `getSelection` 函数用于创建源代码中的位置范围信息，表示从起始位置到结束位置的一段代码。

该函数接收三个参数：
- `context`：解析器上下文对象。
- `start`：起始位置的信息，包含 `column`、`line` 和 `offset`。
- `end`：可选参数，结束位置的信息，也包含 `column`、`line` 和 `offset`。

函数首先将 `end` 参数设置为 `end` 参数本身或者通过调用 `getCursor(context)` 获取的当前位置信息。然后，它从解析器上下文的 `originalSource` 属性中截取起始位置到结束位置之间的源代码片段，创建一个新的 `SourceLocation` 对象，包含 `start`、`end` 和 `source` 属性，并将其返回。

`SourceLocation` 对象用于表示源代码中的位置范围，其中 `start` 和 `end` 属性表示起始和结束位置的信息，而 `source` 属性表示源代码片段。

该函数主要用于在解析过程中为不同的节点创建位置信息，以便在需要时能够追踪和记录节点在源代码中的位置范围。
 */
function getSelection(
  context: ParserContext,
  start: Position,
  end?: Position
): SourceLocation {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}
/**
 * 
 * @param xs 
 * @returns 
 * `last` 函数是一个泛型函数，它接收一个类型为 `T` 的数组 `xs`，并返回该数组的最后一个元素。返回值的类型为 `T | undefined`，表示可能是数组的最后一个元素，或者数组为空时返回 `undefined`。
 */
function last<T>(xs: T[]): T | undefined {
  return xs[xs.length - 1]
}
/**
 * 
 * @param source 
 * @param searchString 
 * @returns 
 * `startsWith` 函数用于检查字符串 `source` 是否以指定的字符串 `searchString` 开头。它使用 `startsWith` 方法来执行实际的检查，并返回一个布尔值，表示检查结果。如果 `source` 以 `searchString` 开头，则返回 `true`；否则，返回 `false`。
 */
function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}
/**
 * 
 * @param context 
 * @param numberOfCharacters 
 * `advanceBy` 函数用于在解析过程中前进指定数量的字符。它接受一个 `ParserContext` 上下文对象和一个表示要前进的字符数的 `numberOfCharacters` 参数。

函数首先获取上下文对象中的 `source` 属性，该属性存储了待解析的源代码字符串。然后，它使用 `advancePositionWithMutation` 函数来更新上下文对象中的位置信息，将位置向前移动指定的字符数。

最后，函数通过将上下文对象中的 `source` 属性切割掉前进的字符数部分，更新了剩余待解析的源代码字符串。

需要注意的是，在测试模式下，函数使用 `assert` 函数来验证前进的字符数不超过源代码字符串的长度，以确保不会发生索引越界的错误。
 */
function advanceBy(context: ParserContext, numberOfCharacters: number): void {
  const { source } = context
  __TEST__ && assert(numberOfCharacters <= source.length)
  advancePositionWithMutation(context, source, numberOfCharacters)
  context.source = source.slice(numberOfCharacters)
}
/**
 * 
 * @param context 
 * `advanceSpaces` 函数用于在解析过程中前进连续的空格字符。它接受一个 `ParserContext` 上下文对象作为参数。

函数通过使用正则表达式 `/^[\t\r\n\f ]+/` 在上下文对象的 `source` 属性中匹配连续的空格字符。如果匹配成功，即找到了连续的空格字符，那么函数使用 `advanceBy` 函数前进这些空格字符的长度。

换句话说，`advanceSpaces` 函数的作用是在解析过程中将源代码字符串中的连续空格字符消耗掉，并将上下文对象的位置信息相应地更新为消耗空格后的位置。
 */
function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}
/**
 * 
 * @param context 
 * @param start 
 * @param numberOfCharacters 
 * @returns 
 * `getNewPosition` 函数用于根据给定的起始位置、字符数量以及上下文对象，计算并返回新的位置信息。它接受一个 `ParserContext` 上下文对象、起始位置 `start` 和字符数量 `numberOfCharacters` 作为参数。

函数内部使用 `advancePositionWithClone` 函数来创建一个新的位置对象，并通过切片操作 `context.originalSource.slice(start.offset, numberOfCharacters)` 获取起始位置到指定字符数量的字符串片段。然后将该字符串片段和字符数量作为参数传递给 `advancePositionWithClone` 函数，得到新的位置对象。

换句话说，`getNewPosition` 函数的作用是根据给定的起始位置和字符数量，结合上下文对象的原始源代码，计算并返回新的位置信息。这个新的位置信息表示起始位置向前移动指定字符数量后的位置。
 * 
 */
function getNewPosition(
  context: ParserContext,
  start: Position,
  numberOfCharacters: number
): Position {
  return advancePositionWithClone(
    start,
    context.originalSource.slice(start.offset, numberOfCharacters),
    numberOfCharacters
  )
}
/**
 * 
 * @param context 
 * @param code 
 * @param offset 
 * @param loc 
 * `emitError` 函数用于在解析过程中生成错误信息并将其传递给错误处理函数。它接受一个 `ParserContext` 上下文对象、错误代码 `code`、偏移量 `offset`（可选参数，默认值为 `undefined`）和位置信息 `loc`（默认为当前位置）作为参数。

函数内部首先根据传入的偏移量 `offset` 更新位置信息 `loc` 的偏移量和列数，通过将 `offset` 加到 `loc.offset` 和 `loc.column` 中实现偏移量的调整。

然后，使用 `createCompilerError` 函数创建一个编译器错误对象，该错误对象包含错误代码、起始位置和结束位置（均为 `loc`），以及空字符串作为错误的源代码。

最后，调用上下文对象的 `options.onError` 方法，将创建的编译器错误对象传递给错误处理函数，以便进行错误处理和报告。

总而言之，`emitError` 函数用于在解析过程中生成错误信息，并将其传递给错误处理函数，以便进行错误处理和报告。它在生成错误信息时考虑了偏移量，以便正确地定位错误的位置。
 */
function emitError(
  context: ParserContext,
  code: ErrorCodes,
  offset?: number,
  loc: Position = getCursor(context)
): void {
  if (offset) {
    loc.offset += offset
    loc.column += offset
  }
  context.options.onError(
    createCompilerError(code, {
      start: loc,
      end: loc,
      source: ''
    })
  )
}
/**
 * 
 * @param context 
 * @param mode 
 * @param ancestors 
 * @returns 
 * `isEnd` 函数用于检查在给定的解析上下文、文本模式和元素节点祖先的情况下，是否已经达到了结束条件。它接受一个 `ParserContext` 上下文对象、文本模式 `mode` 和元素节点祖先数组 `ancestors` 作为参数。

函数内部首先根据给定的文本模式 `mode` 执行不同的逻辑来判断是否已经达到结束条件。

- 对于文本模式 `TextModes.DATA`，它会检查当前的源代码 `s` 是否以 `'</'` 开头，如果是的话，会遍历祖先数组 `ancestors`，查找是否存在与之匹配的结束标签。如果找到匹配的结束标签，则表示已经达到结束条件，返回 `true`。

- 对于文本模式 `TextModes.RCDATA` 和 `TextModes.RAWTEXT`，它会获取祖先数组 `ancestors` 中的最后一个元素作为父级元素，然后检查当前的源代码 `s` 是否以父级元素的结束标签开头。如果是的话，表示已经达到结束条件，返回 `true`。

- 对于文本模式 `TextModes.CDATA`，它会检查当前的源代码 `s` 是否以 `'<![CDATA['` 结束。如果是的话，表示已经达到结束条件，返回 `true`。

- 如果以上情况都不满足，即当前源代码 `s` 为空字符串，则表示已经达到结束条件，返回 `true`。

如果以上判断条件都不满足，则表示还未达到结束条件，返回 `false`。

总之，`isEnd` 函数根据给定的解析上下文、文本模式和元素节点祖先的情况，判断是否已经达到了结束条件。它根据不同的文本模式执行不同的判断逻辑，用于控制解析过程的终止条件。
 */
function isEnd(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): boolean {
  const s = context.source

  switch (mode) {
    case TextModes.DATA:
      if (startsWith(s, '</')) {
        // TODO: probably bad performance
        for (let i = ancestors.length - 1; i >= 0; --i) {
          if (startsWithEndTagOpen(s, ancestors[i].tag)) {
            return true
          }
        }
      }
      break

    case TextModes.RCDATA:
    case TextModes.RAWTEXT: {
      const parent = last(ancestors)
      if (parent && startsWithEndTagOpen(s, parent.tag)) {
        return true
      }
      break
    }

    case TextModes.CDATA:
      if (startsWith(s, ']]>')) {
        return true
      }
      break
  }

  return !s
}
/**
 * 
 * @param source 
 * @param tag 
 * @returns 
 * `startsWithEndTagOpen` 函数用于检查给定的源代码 `source` 是否以结束标签开头，并且与指定的标签 `tag` 匹配。它返回一个布尔值，表示是否满足条件。

函数内部的判断逻辑如下：

- 首先使用 `startsWith` 函数检查源代码 `source` 是否以 `'</'` 开头，如果不是，则直接返回 `false`。

- 然后，获取 `source` 中结束标签的起始位置为 `2`，取从该位置开始与指定标签 `tag` 长度相等的子字符串，并将其转换为小写字母形式。

- 接下来，检查 `source` 中结束标签后的字符，即 `source[2 + tag.length]`。如果存在该字符，则判断它是否是空格、制表符、回车符、换行符、换页符、斜杠或大于号中的一个。如果是，则表示满足结束标签的格式要求，返回 `true`。

- 如果不存在结束标签后的字符，则默认为大于号 `>`，也表示满足结束标签的格式要求，返回 `true`。

如果以上条件都不满足，则表示源代码 `source` 不以结束标签开头或与指定标签 `tag` 不匹配，返回 `false`。

总之，`startsWithEndTagOpen` 函数用于检查给定的源代码 `source` 是否以结束标签开头，并且与指定的标签 `tag` 匹配。它对结束标签的格式进行了详细的检查，包括大小写敏感和后续字符的验证。该函数在解析过程中用于判断是否遇到了结束标签的起始位置。
 */
function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, '</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}
