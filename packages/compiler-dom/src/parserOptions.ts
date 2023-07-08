import {
  TextModes,
  ParserOptions,
  ElementNode,
  NodeTypes,
  isBuiltInType
} from '@vue/compiler-core'
import { makeMap, isVoidTag, isHTMLTag, isSVGTag } from '@vue/shared'
import { TRANSITION, TRANSITION_GROUP } from './runtimeHelpers'
import { decodeHtml } from './decodeHtml'
import { decodeHtmlBrowser } from './decodeHtmlBrowser'
/**
 * `isRawTextContainer` 是一个函数，用于检查给定的标签名是否属于原始文本容器。原始文本容器是指那些在其中文本内容不会被解析或转义的特定标签。

该函数使用了 `makeMap` 函数，它接受一个逗号分隔的字符串和一个布尔值 `true`，并返回一个函数。返回的函数可以接受一个字符串参数，并检查该字符串是否在逗号分隔的字符串中。

在这里，传递给 `makeMap` 的逗号分隔的字符串是 `'style,iframe,script,noscript'`，这表示这些标签名是原始文本容器。函数返回的结果赋值给了 `isRawTextContainer`。

使用 `isRawTextContainer` 函数可以判断给定的标签名是否为原始文本容器。如果标签名在列表中，则返回 `true`，否则返回 `false`。
 */
const isRawTextContainer = /*#__PURE__*/ makeMap(
  'style,iframe,script,noscript',
  true
)
/**
 * `DOMNamespaces` 是一个枚举，用于表示 DOM 的命名空间。

该枚举包含以下常量：

- `HTML`：表示 HTML 命名空间，值为 `0`，对应于 `Namespaces.HTML`。
- `SVG`：表示 SVG 命名空间，值为下一个整数值，默认为 `1`。
- `MATH_ML`：表示 MathML 命名空间，值为下一个整数值，默认为 `2`。

这些常量用于标识 DOM 元素和属性所属的命名空间。
 */
export const enum DOMNamespaces {
  HTML = 0 /* Namespaces.HTML */,
  SVG,
  MATH_ML
}
/**
 * `parserOptions` 是用于解析器的选项对象，其中包含了一些配置项和函数。

该对象具有以下属性和函数：

- `isVoidTag`：一个函数，用于判断给定标签是否是无内容标签（void tag）。
- `isNativeTag`：一个函数，用于判断给定标签是否是原生标签（native tag），即 HTML 标签或 SVG 标签。
- `isPreTag`：一个函数，用于判断给定标签是否是 `<pre>` 标签。
- `decodeEntities`：一个函数，用于解码 HTML 实体，将实体字符转换为对应的 Unicode 字符。在浏览器环境下使用 `decodeHtmlBrowser` 函数，否则使用 `decodeHtml` 函数。
- `isBuiltInComponent`：一个函数，用于判断给定标签是否是内置组件。如果是内置组件，则返回该组件的符号（symbol），否则返回 `undefined`。
- `getNamespace`：一个函数，用于获取给定标签在父元素中的命名空间（namespace）。根据 HTML 规范进行命名空间的推断。
- `getTextMode`：一个函数，用于获取给定元素节点的文本模式（text mode）。根据 HTML 规范进行文本模式的推断。

这些选项和函数用于在解析器中进行相关的判断和处理，以支持正确的语法解析和语义推断。
 */
export const parserOptions: ParserOptions = {
  isVoidTag,
  isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag),
  isPreTag: tag => tag === 'pre',
  decodeEntities: __BROWSER__ ? decodeHtmlBrowser : decodeHtml,

  isBuiltInComponent: (tag: string): symbol | undefined => {
    if (isBuiltInType(tag, `Transition`)) {
      return TRANSITION
    } else if (isBuiltInType(tag, `TransitionGroup`)) {
      return TRANSITION_GROUP
    }
  },

  // https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
  getNamespace(tag: string, parent: ElementNode | undefined): DOMNamespaces {
    let ns = parent ? parent.ns : DOMNamespaces.HTML

    if (parent && ns === DOMNamespaces.MATH_ML) {
      if (parent.tag === 'annotation-xml') {
        if (tag === 'svg') {
          return DOMNamespaces.SVG
        }
        if (
          parent.props.some(
            a =>
              a.type === NodeTypes.ATTRIBUTE &&
              a.name === 'encoding' &&
              a.value != null &&
              (a.value.content === 'text/html' ||
                a.value.content === 'application/xhtml+xml')
          )
        ) {
          ns = DOMNamespaces.HTML
        }
      } else if (
        /^m(?:[ions]|text)$/.test(parent.tag) &&
        tag !== 'mglyph' &&
        tag !== 'malignmark'
      ) {
        ns = DOMNamespaces.HTML
      }
    } else if (parent && ns === DOMNamespaces.SVG) {
      if (
        parent.tag === 'foreignObject' ||
        parent.tag === 'desc' ||
        parent.tag === 'title'
      ) {
        ns = DOMNamespaces.HTML
      }
    }

    if (ns === DOMNamespaces.HTML) {
      if (tag === 'svg') {
        return DOMNamespaces.SVG
      }
      if (tag === 'math') {
        return DOMNamespaces.MATH_ML
      }
    }
    return ns
  },

  // https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
  getTextMode({ tag, ns }: ElementNode): TextModes {
    if (ns === DOMNamespaces.HTML) {
      if (tag === 'textarea' || tag === 'title') {
        return TextModes.RCDATA
      }
      if (isRawTextContainer(tag)) {
        return TextModes.RAWTEXT
      }
    }
    return TextModes.DATA
  }
}
