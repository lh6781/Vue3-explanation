import { ElementNode, Namespace, TemplateChildNode, ParentNode } from './ast'
import { TextModes } from './parse'
import { CompilerError } from './errors'
import {
  NodeTransform,
  DirectiveTransform,
  TransformContext
} from './transform'
import { CompilerCompatOptions } from './compat/compatConfig'
import { ParserPlugin } from '@babel/parser'
/**
 * `ErrorHandlingOptions` 是一个接口，用于定义错误处理选项。

它包含两个可选属性：

1. `onWarn`：用于处理警告（`CompilerError`）的回调函数。当发生警告时，会调用该回调函数并将警告作为参数传递给它。警告是编译过程中的非致命性问题，可以帮助开发人员发现潜在的错误或优化建议。

2. `onError`：用于处理错误（`CompilerError`）的回调函数。当发生错误时，会调用该回调函数并将错误作为参数传递给它。错误是编译过程中的致命性问题，表示无法继续编译或生成有效的输出。

通过提供自定义的 `onWarn` 和 `onError` 回调函数，可以实现自定义的错误处理逻辑。例如，可以将警告或错误输出到控制台、记录日志或显示适当的用户界面提示。

注意：`CompilerError` 是一个通用的编译器错误接口，可以是 `CompilerError` 或 `CoreCompilerError` 类型的实例。
 */
export interface ErrorHandlingOptions {
  onWarn?: (warning: CompilerError) => void
  onError?: (error: CompilerError) => void
}

export interface ParserOptions extends ErrorHandlingOptions, CompilerCompatOptions {
  //用于配置模板解析的行为和规则
  /**
   * e.g. platform native elements, e.g. `<div>` for browsers
   * `isNativeTag` 是一个可选的函数，用于判断给定的标签名是否为原生标签。

该函数接受一个字符串参数 `tag`，表示要判断的标签名。函数返回一个布尔值，指示该标签名是否为原生标签。如果返回 `true`，则表示该标签是原生标签；如果返回 `false`，则表示该标签不是原生标签。

原生标签是指浏览器内置的HTML标签，如 `<div>`、`<span>`、`<p>` 等。在编译器中，可以使用 `isNativeTag` 函数来区分原生标签和自定义组件，以便在生成代码时采取不同的处理逻辑。

如果未提供 `isNativeTag` 函数，则默认情况下所有标签都被认为是自定义组件。可以通过提供自定义的 `isNativeTag` 函数来根据特定的标签命名约定或其他规则判断标签是否为原生标签。
   */
  isNativeTag?: (tag: string) => boolean //用于判断给定的标签是否是平台的原生标签
  /**
   * e.g. native elements that can self-close, e.g. `<img>`, `<br>`, `<hr>`
   * `isVoidTag` 是一个可选的函数，用于判断给定的标签名是否为自闭合标签。

该函数接受一个字符串参数 `tag`，表示要判断的标签名。函数返回一个布尔值，指示该标签名是否为自闭合标签。如果返回 `true`，则表示该标签是自闭合标签；如果返回 `false`，则表示该标签不是自闭合标签。

自闭合标签是指在HTML中不需要闭合的标签，如 `<input>`、`<br>`、`<img>` 等。在编译器中，可以使用 `isVoidTag` 函数来判断标签是否为自闭合标签，在生成代码时采取不同的处理逻辑。

如果未提供 `isVoidTag` 函数，则默认情况下所有标签都被认为是非自闭合标签。可以通过提供自定义的 `isVoidTag` 函数来根据特定的标签命名约定或其他规则判断标签是否为自闭合标签。
   */
  isVoidTag?: (tag: string) => boolean
  /**
   * e.g. elements that should preserve whitespace inside, e.g. `<pre>`
   * `isPreTag` 是一个可选的函数，用于判断给定的标签名是否为 `<pre>` 标签。

该函数接受一个字符串参数 `tag`，表示要判断的标签名。函数返回一个布尔值，指示该标签名是否为 `<pre>` 标签。如果返回 `true`，则表示该标签是 `<pre>` 标签；如果返回 `false`，则表示该标签不是 `<pre>` 标签。

`<pre>` 标签是 HTML 中用于展示预格式化文本的标签。在编译器中，可以使用 `isPreTag` 函数来判断标签是否为 `<pre>` 标签，在生成代码时采取不同的处理逻辑。例如，在处理 `<pre>` 标签中的文本内容时，可以保留空白字符和换行符的原始格式。

如果未提供 `isPreTag` 函数，则默认情况下所有标签都被认为不是 `<pre>` 标签。可以通过提供自定义的 `isPreTag` 函数来根据特定的标签命名约定或其他规则判断标签是否为 `<pre>` 标签。
   */
  isPreTag?: (tag: string) => boolean
  /**
   * Platform-specific built-in components e.g. `<Transition>`
   * `isBuiltInComponent` 是一个可选的函数，用于判断给定的标签名是否为内置组件。

该函数接受一个字符串参数 `tag`，表示要判断的标签名。函数返回一个 `symbol` 类型或 `void`，用于标识内置组件。如果返回一个 `symbol`，则表示该标签是内置组件；如果返回 `void`，则表示该标签不是内置组件。

内置组件通常是指由框架或库提供的预定义组件，具有特定的功能和行为。在编译器中，可以使用 `isBuiltInComponent` 函数来判断标签是否为内置组件，在生成代码时采取不同的处理逻辑。例如，内置组件可能具有特殊的编译规则或优化策略，需要进行特殊处理。

如果未提供 `isBuiltInComponent` 函数，则默认情况下所有标签都被认为不是内置组件。可以通过提供自定义的 `isBuiltInComponent` 函数来根据特定的组件库或框架中的内置组件列表来判断标签是否为内置组件，并返回相应的标识符。
   */
  isBuiltInComponent?: (tag: string) => symbol | void
  /**
   * Separate option for end users to extend the native elements list
   * `isCustomElement` 是一个可选的函数，用于判断给定的标签名是否为自定义元素。

该函数接受一个字符串参数 `tag`，表示要判断的标签名。函数返回一个布尔值或 `void`，用于指示标签是否为自定义元素。如果返回 `true`，则表示该标签是自定义元素；如果返回 `false`，则表示该标签不是自定义元素；如果返回 `void`，则表示无法确定该标签是否为自定义元素。

自定义元素通常是指在 HTML 中定义的非标准元素，也称为未知元素或扩展元素。在编译器中，可以使用 `isCustomElement` 函数来判断标签是否为自定义元素，在生成代码时采取不同的处理逻辑。例如，对于自定义元素，可以采用默认的元素处理逻辑，而不进行额外的编译优化或特殊处理。

如果未提供 `isCustomElement` 函数，则默认情况下所有标签都被认为是自定义元素。可以通过提供自定义的 `isCustomElement` 函数来根据特定的规则或标准来判断标签是否为自定义元素，并返回相应的布尔值。
   */
  isCustomElement?: (tag: string) => boolean | void
  /**
   * Get tag namespace
   * `getNamespace` 是一个可选函数，用于根据给定的标签名和父级元素节点来获取命名空间。

该函数接受两个参数：`tag` 表示要获取命名空间的标签名，`parent` 表示父级元素节点。函数返回一个 `Namespace` 枚举值，用于表示标签的命名空间。

命名空间是在 XML 和 HTML 文档中用于区分元素和属性的概念。不同的命名空间可以定义相同的标签名，但它们具有不同的语义和行为。在编译器中，可以使用 `getNamespace` 函数来根据标签名和父级元素节点来确定要使用的命名空间，从而在生成代码时采取不同的处理逻辑。

如果未提供 `getNamespace` 函数，则默认情况下所有标签都被认为属于 HTML 命名空间。可以通过提供自定义的 `getNamespace` 函数来根据特定的规则或标准来确定标签的命名空间，并返回相应的 `Namespace` 值。

请注意，`Namespace` 是一个枚举类型，具体的枚举值取决于编译器的实现。在 TypeScript 中，可以定义一个名为 `Namespace` 的枚举，并在 `getNamespace` 函数中返回相应的枚举值来表示命名空间。
   */
  getNamespace?: (tag: string, parent: ElementNode | undefined) => Namespace
  /**
   * Get text parsing mode for this element
   * 用于获取给定元素节点的文本解析模式。
   * `getTextMode` 是一个可选函数，用于根据给定的元素节点和父级元素节点来确定文本模式。

该函数接受两个参数：`node` 表示当前的元素节点，`parent` 表示父级元素节点。函数返回一个 `TextModes` 枚举值，用于表示文本的模式。

文本模式是指在编译器中处理文本内容的方式。不同的文本模式可以影响编译器对文本内容的解析和处理方式，例如是否对文本进行转义、是否保留空格等。

通过提供自定义的 `getTextMode` 函数，可以根据特定的规则或标准来确定文本的模式，并返回相应的 `TextModes` 值。编译器在处理文本内容时可以根据返回的文本模式采取不同的处理逻辑。

请注意，`TextModes` 是一个枚举类型，具体的枚举值取决于编译器的实现。在 TypeScript 中，可以定义一个名为 `TextModes` 的枚举，并在 `getTextMode` 函数中返回相应的枚举值来表示文本模式。
   */
  getTextMode?: (
    node: ElementNode,
    parent: ElementNode | undefined
  ) => TextModes
  /**
   * @default ['{{', '}}']
   * `delimiters` 是一个可选的数组参数，用于指定模板中插值表达式的定界符。

定界符是一对特殊字符，用于标识模板中的插值表达式。默认情况下，Vue 使用双大括号 `{{}}` 作为插值表达式的定界符，例如 `{{ message }}`。

通过提供自定义的 `delimiters` 数组，可以更改插值表达式的定界符为其他字符。数组包含两个元素，分别表示插值表达式的起始和结束定界符。

例如，如果将 `delimiters` 设置为 `['${', '}']`，则插值表达式可以使用 `${}` 作为定界符，例如 `${ message }`。

这在某些情况下可能很有用，例如避免与其他模板引擎的定界符冲突，或者需要在模板中使用 Vue 之外的插值语法。

请注意，更改定界符可能会影响模板的解析和编译过程，因此需要确保模板和相关的编译器配置正确匹配定界符的使用。
   */
  delimiters?: [string, string]
  /**
   * Whitespace handling strategy
   * `whitespace` 是一个可选的参数，用于控制模板中空白字符的处理方式。

- `'preserve'`：保留模板中的所有空白字符，包括换行符、空格等。这是默认的空白字符处理方式，模板中的空白字符将被保留，并在生成的渲染函数中被保留。

- `'condense'`：合并模板中的连续空白字符为单个空格，并移除行首和行尾的空白字符。这种处理方式用于减少生成的渲染函数的大小，并可以在一定程度上减少渲染时的内存消耗和运行时间。

选择适当的 `whitespace` 参数取决于你的具体需求。如果你希望保留模板中的所有空白字符，以保持模板的格式和布局，可以使用 `'preserve'`。如果你希望减少生成的渲染函数的大小，并优化性能，可以考虑使用 `'condense'`。

请注意，`whitespace` 参数只影响模板编译阶段对空白字符的处理方式，不会影响最终渲染的结果。
   */
  whitespace?: 'preserve' | 'condense'
  /**
   * Only needed for DOM compilers
   * `decodeEntities` 是一个可选的参数，用于解码实体字符（entity characters）。

在 HTML 中，有一些字符需要使用实体字符表示，例如 `<` 表示为 `&lt;`，`>` 表示为 `&gt;`，`&` 表示为 `&amp;` 等。在模板编译过程中，可以使用 `decodeEntities` 函数将实体字符解码回原始字符。

参数 `rawText` 是待解码的原始文本，`asAttr` 是一个布尔值，表示是否作为属性值解码。在属性值中，一些特殊字符可能需要进行额外的处理，例如双引号 `"` 需要被转义为 `&quot;`。

函数 `decodeEntities` 返回解码后的文本。

如果你需要在模板编译过程中对实体字符进行解码，可以实现 `decodeEntities` 函数，并将其传递给编译器的选项中。这样，在编译过程中遇到实体字符时，编译器将调用你提供的函数进行解码操作。这对于处理包含实体字符的模板非常有用，可以确保最终渲染的结果正确显示原始字符。

需要注意的是，如果你不提供 `decodeEntities` 函数，则编译器将默认使用内置的实体字符解码逻辑进行处理。
   */
  decodeEntities?: (rawText: string, asAttr: boolean) => string
  /**
   * Whether to keep comments in the templates AST.
   * This defaults to `true` in development and `false` in production builds.
   * `comments` 是一个可选的参数，用于指定是否保留模板中的注释。

当 `comments` 设置为 `true` 时，模板编译过程中的注释将被保留，并以注释节点的形式存在于生成的 AST（抽象语法树）中。这样，在生成代码的过程中，注释节点也会被考虑在内，可以在最终的渲染结果中包含注释内容。

当 `comments` 设置为 `false` 或未提供时，模板中的注释将被忽略，不会存在于生成的 AST 中，也不会在渲染结果中出现。

注释的处理在模板编译过程中是可选的，具体如何处理注释可以根据实际需求进行配置。在开发环境下，保留注释可以帮助开发人员进行调试和文档编写；而在生产环境下，可以将注释去除以减小最终生成的代码体积。

需要注意的是，注释节点只会出现在模板的根级别，而不会出现在元素或文本节点内部。
   */
  comments?: boolean
}
/**
 * `HoistTransform` 是一个类型别名，表示提升转换函数的类型。它接受以下参数:

- `children: TemplateChildNode[]`: 表示待处理的子节点数组，是一个模板子节点的列表。
- `context: TransformContext`: 表示转换上下文，包含了一些转换过程中的辅助方法和选项。
- `parent: ParentNode`: 表示父节点，即当前待处理子节点的父级节点。

提升转换函数的作用是将子节点数组中的一些节点进行提升，即将它们移动到更高的层级，例如将元素节点的属性提升到父级元素上。

具体的提升转换逻辑和实现方式根据实际需求而定，可以根据上下文、子节点和父节点的信息进行一些处理操作，以达到提升节点的目的。提升转换函数通常在模板编译的转换阶段使用，用于对模板结构进行调整和优化。
 */
export type HoistTransform = (
  children: TemplateChildNode[],
  context: TransformContext,
  parent: ParentNode
) => void
/**
 * `BindingTypes` 是一个常量枚举，表示绑定类型的枚举值。它包含以下枚举项：

- `DATA`: 表示从 `data()` 返回的数据绑定。
- `PROPS`: 表示声明为属性的绑定。
- `PROPS_ALIASED`: 表示 `<script setup>` 中被解构的属性的本地别名。原始绑定存储在 `bindingMetadata` 对象的 `__propsAliases` 中。
- `SETUP_LET`: 表示 `let` 绑定（可以是 ref 或非 ref）。
- `SETUP_CONST`: 表示不可能是 ref 的常量绑定。在内联模板表达式中处理时，这些绑定不需要调用 `unref()`。
- `SETUP_REACTIVE_CONST`: 表示可能发生变化但不需要调用 `unref()` 的常量绑定。
- `SETUP_MAYBE_REF`: 表示可能是 ref 的常量绑定。
- `SETUP_REF`: 表示确保是 ref 的绑定。
- `OPTIONS`: 表示由其他选项声明的绑定，例如计算属性、注入等。
- `LITERAL_CONST`: 表示字面常量，例如 `'foo'`、`1`、`true`。

这些绑定类型用于识别和分类不同类型的绑定，在编译和运行时可以根据绑定类型进行相应的处理和优化。
 */
export const enum BindingTypes {
  /**
   * returned from data()
   */
  DATA = 'data',
  /**
   * declared as a prop
   */
  PROPS = 'props',
  /**
   * a local alias of a `<script setup>` destructured prop.
   * the original is stored in __propsAliases of the bindingMetadata object.
   */
  PROPS_ALIASED = 'props-aliased',
  /**
   * a let binding (may or may not be a ref)
   */
  SETUP_LET = 'setup-let',
  /**
   * a const binding that can never be a ref.
   * these bindings don't need `unref()` calls when processed in inlined
   * template expressions.
   */
  SETUP_CONST = 'setup-const',
  /**
   * a const binding that does not need `unref()`, but may be mutated.
   */
  SETUP_REACTIVE_CONST = 'setup-reactive-const',
  /**
   * a const binding that may be a ref.
   */
  SETUP_MAYBE_REF = 'setup-maybe-ref',
  /**
   * bindings that are guaranteed to be refs
   */
  SETUP_REF = 'setup-ref',
  /**
   * declared by other options, e.g. computed, inject
   */
  OPTIONS = 'options',
  /**
   * a literal constant, e.g. 'foo', 1, true
   */
  LITERAL_CONST = 'literal-const'
}
/**
 * `BindingMetadata` 是一个类型别名，表示绑定的元数据信息。它是一个对象类型，具有以下属性：

- `[key: string]: BindingTypes | undefined`：表示任意属性名的值可以是 `BindingTypes` 枚举项或 `undefined`。
- `__isScriptSetup?: boolean`：一个可选的布尔类型属性，表示是否处于 `<script setup>` 环境中。
- `__propsAliases?: Record<string, string>`：一个可选的字符串索引签名对象，表示属性的别名映射关系。每个属性名都可以对应一个字符串值，表示属性的别名。

`BindingMetadata` 用于存储和传递与绑定相关的元数据信息，例如绑定类型、`<script setup>` 环境标识以及属性别名映射。这些信息可以在编译器和运行时中使用，以便正确处理和优化绑定的操作。
 */
export type BindingMetadata = {
  [key: string]: BindingTypes | undefined
} & {
  __isScriptSetup?: boolean
  __propsAliases?: Record<string, string>
}

interface SharedTransformCodegenOptions {
  /**
   * Transform expressions like {{ foo }} to `_ctx.foo`.
   * If this option is false, the generated code will be wrapped in a
   * `with (this) { ... }` block.
   * - This is force-enabled in module mode, since modules are by default strict
   * and cannot use `with`
   * @default mode === 'module'
   * `prefixIdentifiers` 是一个布尔类型的选项，用于控制编译器是否在生成的代码中为标识符添加前缀。当 `prefixIdentifiers` 设置为 `true` 时，编译器会在生成的代码中为所有标识符添加前缀，以避免命名冲突。

该选项通常在编译器的转换阶段使用，用于处理模板中的标识符。当模板中存在局部变量、函数名或组件引用等标识符时，如果 `prefixIdentifiers` 设置为 `true`，编译器将为这些标识符添加前缀，以确保它们在生成的代码中的命名唯一性。

例如，如果有一个模板中使用了一个名为 `value` 的变量，并且 `prefixIdentifiers` 设置为 `true`，编译器将在生成的代码中将其转换为一个唯一的标识符，例如 `_ctx.value`，以避免与其他可能存在的变量冲突。

使用 `prefixIdentifiers` 可以提高生成的代码的可靠性和可维护性，尤其是在处理复杂的模板和作用域嵌套时。默认情况下，`prefixIdentifiers` 的值为 `false`，即不添加前缀。
   */
  prefixIdentifiers?: boolean
  /**
   * Control whether generate SSR-optimized render functions instead.
   * The resulting function must be attached to the component via the
   * `ssrRender` option instead of `render`.
   *
   * When compiler generates code for SSR's fallback branch, we need to set it to false:
   *  - context.ssr = false
   *
   * see `subTransform` in `ssrTransformComponent.ts`
   * `ssr` 是一个布尔类型的选项，用于指示编译器是否针对服务器端渲染 (Server-Side Rendering, SSR) 进行代码生成。

当 `ssr` 设置为 `true` 时，编译器会生成适用于服务器端渲染的代码。这意味着生成的代码会考虑到服务器端环境的特殊需求，例如处理服务器端特定的 API 或上下文。

通过设置 `ssr` 选项，编译器可以优化生成的代码，使其适用于服务器端渲染的场景。这包括处理服务器端渲染特定的标记、数据获取和状态管理等方面的逻辑。

需要注意的是，`ssr` 选项的设置通常与构建工具和服务器端框架的配置相结合。在进行服务器端渲染时，确保将 `ssr` 设置为 `true`，以便编译器生成适用于服务器端渲染的代码。

默认情况下，`ssr` 的值为 `false`，即不针对服务器端渲染进行代码生成。
   */
  ssr?: boolean
  /**
   * Indicates whether the compiler generates code for SSR,
   * it is always true when generating code for SSR,
   * regardless of whether we are generating code for SSR's fallback branch,
   * this means that when the compiler generates code for SSR's fallback branch:
   *  - context.ssr = false
   *  - context.inSSR = true
   * `inSSR` 是一个布尔类型的选项，用于指示当前代码是否在服务器端渲染 (Server-Side Rendering, SSR) 的环境中执行。

当 `inSSR` 设置为 `true` 时，表示当前代码正在服务器端渲染的环境中执行。这可以用于在编译期间或运行时区分服务器端和客户端的逻辑，以便根据环境的不同采取相应的处理方式。

通过设置 `inSSR` 选项，可以在编译期间或运行时根据执行环境的类型执行不同的逻辑，例如只在服务器端渲染时执行特定的代码块，或者针对服务器端和客户端分别进行不同的优化和处理。

需要注意的是，`inSSR` 选项通常由服务器端渲染框架或构建工具提供，并且在执行过程中自动设置。在编写自定义逻辑时，可以根据该选项的值来决定适当的处理方式。

默认情况下，`inSSR` 的值为 `false`，即默认不在服务器端渲染环境中执行。
   */
  inSSR?: boolean
  /**
   * Optional binding metadata analyzed from script - used to optimize
   * binding access when `prefixIdentifiers` is enabled.
   * `bindingMetadata` 是一个对象，用于存储与绑定相关的元数据信息。它的类型为 `BindingMetadata`。

`BindingMetadata` 是一个包含绑定名称和绑定类型的映射对象。每个绑定名称作为键，对应的绑定类型作为值。绑定类型使用 `BindingTypes` 枚举中的值。

此外，`bindingMetadata` 对象还可以包含其他属性，如 `__isScriptSetup` 和 `__propsAliases`。

- `__isScriptSetup` 是一个布尔值，用于指示当前代码是否在 `<script setup>` 区块中。该区块是用于编写组件逻辑的特殊语法区域。
- `__propsAliases` 是一个记录了 `<script setup>` 区块中解构的 prop 的原始名称和别名之间关系的对象。键是别名，值是原始名称。

通过使用 `bindingMetadata`，可以在编译和转换过程中收集和传递绑定相关的信息，以便在后续的处理中使用。这对于处理模板中的指令、属性和变量绑定非常有用，并且可以在组件的编译过程中进行优化和检查。

需要注意的是，`bindingMetadata` 属性通常由编译器或相关工具在编译期间生成，并在编译后的组件代码中使用。在自定义编译器或相关工具中，可以使用 `bindingMetadata` 来访问和处理绑定的元数据信息。
   */
  bindingMetadata?: BindingMetadata
  /**
   * Compile the function for inlining inside setup().
   * This allows the function to directly access setup() local bindings.
   * `inline` 是一个布尔值，用于指示是否将编译后的模板代码内联到组件的生成代码中。

当 `inline` 设置为 `true` 时，编译器将会将生成的模板代码直接内联到组件的生成代码中，而不是生成一个单独的模块。这样做可以减少组件加载时的额外网络请求，但会增加生成的代码的体积。

相反，当 `inline` 设置为 `false` 时，编译器将会生成一个单独的模块，该模块包含编译后的模板代码。在组件加载时，需要通过网络请求获取该模块并动态加载。

`inline` 的选择通常取决于具体的项目需求和优化策略。如果项目更注重减少网络请求和文件体积，可以将 `inline` 设置为 `true`。如果项目更注重代码分离和模块化，可以将 `inline` 设置为 `false`。

需要注意的是，`inline` 属性通常由编译器或相关工具在编译期间处理，并在生成的组件代码中使用。在自定义编译器或相关工具中，可以根据具体需求来决定是否将编译后的模板代码内联。
   */
  inline?: boolean
  /**
   * Indicates that transforms and codegen should try to output valid TS code
   * `isTS` 是一个布尔值，用于指示组件是否使用 TypeScript 进行编写。

当 `isTS` 设置为 `true` 时，表示组件是使用 TypeScript 编写的，编译器会相应地解析和处理 TypeScript 语法和类型注解。

当 `isTS` 设置为 `false` 时，表示组件是使用 JavaScript 编写的，编译器将仅解析和处理 JavaScript 语法，而不会考虑 TypeScript 的语法和类型注解。

`isTS` 的设置通常由项目的配置或构建工具进行指定。如果项目中的组件文件使用 TypeScript 编写，那么需要将 `isTS` 设置为 `true`，以便编译器正确地处理 TypeScript 语法和类型信息。如果项目中的组件文件使用 JavaScript 编写，那么可以将 `isTS` 设置为 `false`，以避免编译器处理 TypeScript 相关的内容。

需要注意的是，编译器会根据 `isTS` 的值来选择相应的语法解析和类型检查策略。因此，在设置 `isTS` 时，确保与组件文件的实际编写方式相符，以获得正确的编译结果。
   */
  isTS?: boolean
  /**
   * Filename for source map generation.
   * Also used for self-recursive reference in templates
   * @default 'template.vue.html'
   * `filename` 是一个可选的字符串，用于指定组件的文件名。

该选项可用于在编译过程中生成有关组件源文件的相关信息，例如错误提示、源映射等。如果提供了 `filename`，编译器将使用该信息来增强编译过程中的错误追踪和调试体验。

通常，`filename` 可以是组件文件的绝对路径或相对路径，或者是一个简单的文件名。具体取决于项目的文件结构和构建工具的配置。

请注意，`filename` 选项对于编译过程的正确性并不是必需的，但它可以提供有用的上下文信息，以帮助开发人员更好地理解和调试编译器生成的错误和警告。

如果不提供 `filename`，编译器仍然可以正常工作，但可能会在错误提示和调试信息中缺少一些有用的上下文信息。
   */
  filename?: string
}
/**
 * `TransformOptions` 是用于编译器转换过程的选项配置的接口。它继承了 `SharedTransformCodegenOptions`、`ErrorHandlingOptions` 和 `CompilerCompatOptions` 接口的属性，同时定义了其他用于转换过程的属性。

以下是 `TransformOptions` 接口的属性说明：

- `nodeTransforms`：一个应用于每个 AST 节点的节点转换器函数数组。
- `directiveTransforms`：一个对象，包含要应用于每个元素节点上的指令属性节点的转换器函数。
- `transformHoist`：一个可选的用于转换提升节点的钩子函数。在编译器-dom中，它用于将提升的节点转换为字符串化的 HTML vnodes。默认值为 `null`。
- `isBuiltInComponent`：一个函数，用于将配对的运行时提供的附加内置元素标记为内置组件，以便编译器为其生成组件 vnodes。
- `isCustomElement`：一个函数，用于判断给定的标签是否为自定义元素。
- `prefixIdentifiers`：一个布尔值，用于控制是否将表达式转换为 `_ctx.foo` 的形式。如果设置为 `false`，则生成的代码将被包装在 `with (this) { ... }` 块中。默认值为根据模式自动判断。
- `hoistStatic`：一个布尔值，用于控制是否提升静态 VNode 和 props 对象为 `_hoisted_x` 常量。默认值为 `false`。
- `cacheHandlers`：一个布尔值，用于缓存 `v-on` 事件处理程序，避免在每次渲染时创建新的内联函数，并避免通过包装来动态修补处理程序。默认值为 `false`。
- `expressionPlugins`：一个用于启用 `@babel/parser` 的解析器插件列表，用于解析绑定和插值中的表达式。
- `scopeId`：SFC 的作用域样式 ID。
- `slotted`：指示 SFC 模板是否在样式中使用了 `:slotted` 的布尔值。默认为 `true`，用于向后兼容。SFC 工具应在 `<style>` 中未检测到 `:slotted` 使用时将其设置为 `false`。
- `ssrCssVars`：SFC `<style vars>` 注入字符串，应为一个对象表达式，例如 `{ 'xxxx-color': color }`，用于在组件根元素上呈现内联 CSS 变量。

这些选项用于自定义编译器的转换过程，以控制生成的代码和处理过程。根据具体的需求和场景，可以配置适当的选项来满足特定的编译需求。
 */
export interface TransformOptions
  extends SharedTransformCodegenOptions,
    ErrorHandlingOptions,
    CompilerCompatOptions {
  /**
   * An array of node transforms to be applied to every AST node.
   */
  nodeTransforms?: NodeTransform[]
  /**
   * An object of { name: transform } to be applied to every directive attribute
   * node found on element nodes.
   */
  directiveTransforms?: Record<string, DirectiveTransform | undefined>
  /**
   * An optional hook to transform a node being hoisted.
   * used by compiler-dom to turn hoisted nodes into stringified HTML vnodes.
   * @default null
   */
  transformHoist?: HoistTransform | null
  /**
   * If the pairing runtime provides additional built-in elements, use this to
   * mark them as built-in so the compiler will generate component vnodes
   * for them.
   */
  isBuiltInComponent?: (tag: string) => symbol | void
  /**
   * Used by some transforms that expects only native elements
   */
  isCustomElement?: (tag: string) => boolean | void
  /**
   * Transform expressions like {{ foo }} to `_ctx.foo`.
   * If this option is false, the generated code will be wrapped in a
   * `with (this) { ... }` block.
   * - This is force-enabled in module mode, since modules are by default strict
   * and cannot use `with`
   * @default mode === 'module'
   */
  prefixIdentifiers?: boolean
  /**
   * Hoist static VNodes and props objects to `_hoisted_x` constants
   * @default false
   */
  hoistStatic?: boolean
  /**
   * Cache v-on handlers to avoid creating new inline functions on each render,
   * also avoids the need for dynamically patching the handlers by wrapping it.
   * e.g `@click="foo"` by default is compiled to `{ onClick: foo }`. With this
   * option it's compiled to:
   * ```js
   * { onClick: _cache[0] || (_cache[0] = e => _ctx.foo(e)) }
   * ```
   * - Requires "prefixIdentifiers" to be enabled because it relies on scope
   * analysis to determine if a handler is safe to cache.
   * @default false
   */
  cacheHandlers?: boolean
  /**
   * A list of parser plugins to enable for `@babel/parser`, which is used to
   * parse expressions in bindings and interpolations.
   * https://babeljs.io/docs/en/next/babel-parser#plugins
   */
  expressionPlugins?: ParserPlugin[]
  /**
   * SFC scoped styles ID
   */
  scopeId?: string | null
  /**
   * Indicates this SFC template has used :slotted in its styles
   * Defaults to `true` for backwards compatibility - SFC tooling should set it
   * to `false` if no `:slotted` usage is detected in `<style>`
   */
  slotted?: boolean
  /**
   * SFC `<style vars>` injection string
   * Should already be an object expression, e.g. `{ 'xxxx-color': color }`
   * needed to render inline CSS variables on component root
   */
  ssrCssVars?: string
}
/**
 * `CodegenOptions` 是用于代码生成过程的选项配置的接口。它继承了 `SharedTransformCodegenOptions` 接口的属性，并定义了其他用于代码生成过程的属性。

以下是 `CodegenOptions` 接口的属性说明：

- `mode`：代码生成模式，可选值为 `'module'` 和 `'function'`。在 `'module'` 模式下，将为辅助函数生成 ES 模块导入语句，并将渲染函数作为默认导出。在 `'function'` 模式下，将生成一个单独的 `const { helpers... } = Vue` 语句，并返回渲染函数。它期望全局可用 `Vue`（或通过将代码包装在 IIFE 中传递）用于运行时生成渲染函数。默认值为 `'function'`。
- `sourceMap`：是否生成源映射文件的布尔值。默认为 `false`。
- `scopeId`：SFC 的作用域样式 ID。
- `optimizeImports`：是否通过变量赋值来优化辅助函数的导入绑定（仅在 webpack 代码拆分中使用）。默认为 `false`。
- `runtimeModuleName`：自定义运行时辅助函数的导入模块名称。默认为 `'vue'`。
- `ssrRuntimeModuleName`：自定义在 SSR 情况下导入的运行时辅助函数的模块名称。默认为 `'vue/server-renderer'`。
- `runtimeGlobalName`：在函数模式下，自定义从中获取辅助函数的 `Vue` 全局变量名称。默认为 `'Vue'`。

这些选项用于自定义代码生成的方式和生成结果的格式。可以根据具体需求配置适当的选项来生成符合要求的代码，并根据需要进行性能优化和定制化的调整。
 */
export interface CodegenOptions extends SharedTransformCodegenOptions {
  /**
   * - `module` mode will generate ES module import statements for helpers
   * and export the render function as the default export.
   * - `function` mode will generate a single `const { helpers... } = Vue`
   * statement and return the render function. It expects `Vue` to be globally
   * available (or passed by wrapping the code with an IIFE). It is meant to be
   * used with `new Function(code)()` to generate a render function at runtime.
   * @default 'function'
   */
  mode?: 'module' | 'function'
  /**
   * Generate source map?
   * @default false
   */
  sourceMap?: boolean
  /**
   * SFC scoped styles ID
   */
  scopeId?: string | null
  /**
   * Option to optimize helper import bindings via variable assignment
   * (only used for webpack code-split)
   * @default false
   */
  optimizeImports?: boolean
  /**
   * Customize where to import runtime helpers from.
   * @default 'vue'
   */
  runtimeModuleName?: string
  /**
   * Customize where to import ssr runtime helpers from/**
   * @default 'vue/server-renderer'
   */
  ssrRuntimeModuleName?: string
  /**
   * Customize the global variable name of `Vue` to get helpers from
   * in function mode
   * @default 'Vue'
   */
  runtimeGlobalName?: string
}
/**
 * CompilerOptions，它是由 ParserOptions、TransformOptions 和 CodegenOptions 三个类型的并集组成。
 * ParserOptions、TransformOptions 和 CodegenOptions 是在编译器选项中使用的不同配置项类型。
 *ParserOptions 包含了解析器选项，用于指定模板解析的行为和规则。
 *TransformOptions 包含了转换器选项，用于指定模板转换的行为和规则。
 *CodegenOptions 包含了代码生成选项，用于指定代码生成的行为和规则。
 *通过使用交叉类型(&)，将这三个选项类型合并为一个新的类型 CompilerOptions，这样在编译器的配置中可以同时使用这三个类型的选项。
 *这个类型别名的定义让我们能够更方便地引用这个复合类型，并在编译器的相关代码中使用它来指定和处理编译选项的配置。
 */

export type CompilerOptions = ParserOptions & TransformOptions & CodegenOptions
