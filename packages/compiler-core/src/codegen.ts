import { CodegenOptions } from './options'
import {
  RootNode,
  TemplateChildNode,
  TextNode,
  CommentNode,
  ExpressionNode,
  NodeTypes,
  JSChildNode,
  CallExpression,
  ArrayExpression,
  ObjectExpression,
  Position,
  InterpolationNode,
  CompoundExpressionNode,
  SimpleExpressionNode,
  FunctionExpression,
  ConditionalExpression,
  CacheExpression,
  locStub,
  SSRCodegenNode,
  TemplateLiteral,
  IfStatement,
  AssignmentExpression,
  ReturnStatement,
  VNodeCall,
  SequenceExpression,
  getVNodeBlockHelper,
  getVNodeHelper
} from './ast'
import { SourceMapGenerator, RawSourceMap } from 'source-map-js'
import {
  advancePositionWithMutation,
  assert,
  isSimpleIdentifier,
  toValidAssetId
} from './utils'
import { isString, isArray, isSymbol } from '@vue/shared'
import {
  helperNameMap,
  TO_DISPLAY_STRING,
  CREATE_VNODE,
  RESOLVE_COMPONENT,
  RESOLVE_DIRECTIVE,
  SET_BLOCK_TRACKING,
  CREATE_COMMENT,
  CREATE_TEXT,
  PUSH_SCOPE_ID,
  POP_SCOPE_ID,
  WITH_DIRECTIVES,
  CREATE_ELEMENT_VNODE,
  OPEN_BLOCK,
  CREATE_STATIC,
  WITH_CTX,
  RESOLVE_FILTER
} from './runtimeHelpers'
import { ImportItem } from './transform'
/**
 * `PURE_ANNOTATION` 是一个包含纯函数注释的常量字符串。它的值为 `/*#__PURE__`。

纯函数注释（Pure annotation）是一种在 JavaScript 代码中使用的注释形式，用于指示某个函数是纯函数，即函数的输出只依赖于输入，没有副作用。在某些情况下，工具链或优化器可以使用这个注释来进行代码优化，例如在消除未使用的函数或进行函数内联时。

示例用法：
```javascript
const result = PURE_ANNOTATION + 'function add(a, b) { return a + b; }';
```

上述示例中，通过使用 `PURE_ANNOTATION` 将纯函数注释添加到函数定义中，可以向工具链或优化器提供关于函数纯度的信息。这样的注释可以帮助工具链做出更好的优化决策，以提高代码的性能和效率。

请注意，`PURE_ANNOTATION` 只是一个字符串常量，具体如何使用它取决于开发人员和工具链的需求。
 */
const PURE_ANNOTATION = `/*#__PURE__*/`
/**
 * 
 * @param s 
 * @returns 
 * `aliasHelper` 是一个函数，接受一个 `symbol` 类型的参数 `s`，并返回一个字符串，格式为 `${helperNameMap[s]}: _${helperNameMap[s]}`。

这个函数的作用是根据给定的 `symbol` 值 `s` 在 `helperNameMap` 中查找对应的名称，并将该名称作为键，以 `_` 为前缀的名称作为值，构建一个字符串返回。

示例用法：
```javascript
const helperNameMap = {
  symbol1: 'foo',
  symbol2: 'bar'
};

const result = aliasHelper(symbol1);
console.log(result); // 输出: "foo: _foo"
```

上述示例中，假设 `helperNameMap` 是一个映射对象，将某些 `symbol` 值映射到对应的名称。通过调用 `aliasHelper` 函数，并传入 `symbol1` 作为参数，会在 `helperNameMap` 中查找到 `'foo'` 这个名称，并构建一个字符串 `"foo: _foo"` 返回。

请注意，以上只是一个示例，实际使用时需要根据具体的 `helperNameMap` 对象和 `symbol` 值进行调整。
 */
const aliasHelper = (s: symbol) => `${helperNameMap[s]}: _${helperNameMap[s]}`
/**
 * `CodegenNode` 是一个类型别名，它可以是 `TemplateChildNode`、`JSChildNode` 或 `SSRCodegenNode` 这三者之一。

`TemplateChildNode` 表示模板中的子节点，`JSChildNode` 表示 JavaScript 代码中的子节点，而 `SSRCodegenNode` 表示在服务器端渲染 (SSR) 时用于代码生成的节点。

通过使用 `CodegenNode` 类型别名，可以将这三种类型的节点统一表示，并在相关的函数或数据结构中使用该类型，以便处理不同类型的节点。
 */
type CodegenNode = TemplateChildNode | JSChildNode | SSRCodegenNode
/**
 * `CodegenResult` 是一个接口，用于表示代码生成的结果。它具有以下属性：

- `code: string`：生成的代码字符串。
- `preamble: string`：代码的前导部分，通常是一些引入或声明的内容。
- `ast: RootNode`：生成的代码的抽象语法树 (AST) 表示。`RootNode` 是一个特定的类型，表示整个代码的根节点。
- `map?: RawSourceMap`：可选的源映射 (Source Map) 对象，用于将生成的代码映射回源代码。

通过使用 `CodegenResult` 接口，可以将代码生成的结果以一种结构化的方式表示，并方便地访问生成的代码、AST 和源映射等相关信息。
 */
export interface CodegenResult {
  code: string
  preamble: string
  ast: RootNode
  map?: RawSourceMap
}
/**
 * `CodegenContext` 是一个接口，用于表示代码生成过程中的上下文信息。它继承了 `CodegenOptions` 接口的所有必需属性，并添加了其他属性和方法，包括：

- `source: string`：源代码字符串，用于生成源映射。
- `code: string`：当前生成的代码字符串。
- `line: number`：当前代码的行数。
- `column: number`：当前代码的列数。
- `offset: number`：当前代码相对于整个代码的偏移量。
- `indentLevel: number`：当前代码的缩进级别。
- `pure: boolean`：指示当前代码是否为纯函数的标志。
- `map?: SourceMapGenerator`：可选的源映射生成器对象，用于生成源映射。
- `helper(key: symbol): string`：根据给定的符号 `key` 返回对应的辅助函数的名称。
- `push(code: string, node?: CodegenNode): void`：将生成的代码字符串 `code` 添加到当前代码，并可选择关联生成代码的节点 `node`。
- `indent(): void`：增加当前代码的缩进级别。
- `deindent(withoutNewLine?: boolean): void`：减少当前代码的缩进级别。可选的 `withoutNewLine` 参数指示是否在减少缩进级别时省略换行符。
- `newline(): void`：在当前代码中添加一个换行符。

通过使用 `CodegenContext` 接口，可以在代码生成过程中跟踪和管理生成的代码以及与之相关的上下文信息，如行号、列号、缩进级别等。它还提供了一些辅助方法和属性，用于操作和修改生成的代码。
 */
export interface CodegenContext
  extends Omit<Required<CodegenOptions>, 'bindingMetadata' | 'inline'> {
  source: string
  code: string
  line: number
  column: number
  offset: number
  indentLevel: number
  pure: boolean
  map?: SourceMapGenerator
  helper(key: symbol): string
  push(code: string, node?: CodegenNode): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
  newline(): void
}
/**
 * 
 * @param ast 
 * @param param1 
 * @returns 
 * `createCodegenContext` 是一个函数，用于创建代码生成过程中的上下文对象 `CodegenContext`。它接受一个 `ast` 参数作为根节点，以及一系列的配置选项 `CodegenOptions`。

函数首先定义了一个名为 `context` 的上下文对象，并初始化了该对象的属性和方法。其中包括配置选项的解构赋值，以及一些默认的属性和方法实现。这些属性和方法包括：

- `mode`：代码生成模式，可以是 `'function'` 或 `'module'`。
- `prefixIdentifiers`：标识符前缀的配置，如果 `mode` 是 `'module'`，则为 `true`。
- `sourceMap`：是否生成源映射的配置。
- `filename`：生成的文件名，默认为 `template.vue.html`。
- `scopeId`：作用域 ID，默认为 `null`。
- `optimizeImports`：是否优化导入的配置，默认为 `false`。
- `runtimeGlobalName`：运行时全局名称，默认为 `Vue`。
- `runtimeModuleName`：运行时模块名称，默认为 `vue`。
- `ssrRuntimeModuleName`：SSR 运行时模块名称，默认为 `vue/server-renderer`。
- `ssr`：是否为 SSR 的配置，默认为 `false`。
- `isTS`：是否为 TypeScript 的配置，默认为 `false`。
- `inSSR`：是否在 SSR 中的配置，默认为 `false`。
- `source`：源代码字符串，根据 `ast.loc.source` 初始化。
- `code`：当前生成的代码字符串，默认为空字符串。
- `column`：当前代码的列数，默认为 1。
- `line`：当前代码的行数，默认为 1。
- `offset`：当前代码相对于整个代码的偏移量，默认为 0。
- `indentLevel`：当前代码的缩进级别，默认为 0。
- `pure`：当前代码是否为纯函数的标志，默认为 `false`。
- `map`：可选的源映射生成器对象，默认为 `undefined`。
- `helper(key)`：根据给定的符号 `key` 返回对应的辅助函数的名称。
- `push(code, node)`：将生成的代码字符串 `code` 添加到当前代码，并可选择关联生成代码的节点 `node`。
- `indent()`：增加当前代码的缩进级别。
- `deindent(withoutNewLine)`：减少当前代码的缩进级别，可选择是否省略换行符。
- `newline()`：在当前代码中添加一个换行符。

函数还定义了内部函数 `newline` 和 `addMapping`。`newline` 函数用于在当前代码中添加指定级别的缩进和换行符，而 `addMapping` 函数用于向源映射中添加映射关系。

最后，如果 `sourceMap` 为 `true`，则创建了一个 `SourceMapGenerator` 对象，并将其赋值给 `context.map`。

函数最后返回创建的 `context` 对象作为代码生成过程中的上下文对象。

通过调用 `create

CodegenContext` 函数，可以创建一个用于代码生成的上下文对象，该对象包含了配置选项、源代码信息以及生成代码时的辅助方法和属性。该上下文对象可以用于在代码生成过程中跟踪和管理生成的代码以及与之相关的上下文信息。
 */
function createCodegenContext(
  ast: RootNode,
  {
    mode = 'function',
    prefixIdentifiers = mode === 'module',
    sourceMap = false,
    filename = `template.vue.html`,
    scopeId = null,
    optimizeImports = false,
    runtimeGlobalName = `Vue`,
    runtimeModuleName = `vue`,
    ssrRuntimeModuleName = 'vue/server-renderer',
    ssr = false,
    isTS = false,
    inSSR = false
  }: CodegenOptions
): CodegenContext {
  const context: CodegenContext = {
    mode,
    prefixIdentifiers,
    sourceMap,
    filename,
    scopeId,
    optimizeImports,
    runtimeGlobalName,
    runtimeModuleName,
    ssrRuntimeModuleName,
    ssr,
    isTS,
    inSSR,
    source: ast.loc.source,
    code: ``,
    column: 1,
    line: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,
    map: undefined,
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code, node) {
      context.code += code
      if (!__BROWSER__ && context.map) {
        if (node) {
          let name
          if (node.type === NodeTypes.SIMPLE_EXPRESSION && !node.isStatic) {
            const content = node.content.replace(/^_ctx\./, '')
            if (content !== node.content && isSimpleIdentifier(content)) {
              name = content
            }
          }
          addMapping(node.loc.start, name)
        }
        advancePositionWithMutation(context, code)
        if (node && node.loc !== locStub) {
          addMapping(node.loc.end)
        }
      }
    },
    indent() {
      newline(++context.indentLevel)
    },
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
        --context.indentLevel
      } else {
        newline(--context.indentLevel)
      }
    },
    newline() {
      newline(context.indentLevel)
    }
  }
  /**
 * 
 * @param n 
 * `newline` 是 `CodegenContext` 对象的一个方法，用于在生成的代码中添加指定级别的缩进和换行符。

该方法接受一个数字参数 `n`，表示缩进级别。它会将一个换行符 `\n` 以及 `n` 个缩进字符串 `'  '` 添加到 `context.code` 中，即生成的代码字符串中。

例如，如果 `n` 的值为 2，那么 `newline` 方法将会向生成的代码字符串中添加两个缩进字符串，即表示两个缩进级别，并在最后添加一个换行符，用于实现代码的换行和缩进效果。
 */
  function newline(n: number) {
    context.push('\n' + `  `.repeat(n))
  }
  /**
 * 
 * @param loc 
 * @param name 
 * `addMapping` 是 `CodegenContext` 对象的一个方法，用于向源代码映射表中添加一个映射关系。

该方法接受一个 `loc` 参数，表示源代码中的位置信息，以及一个可选的 `name` 参数，表示映射的名称。它使用这些信息构建一个映射对象，并将其添加到源代码映射表中。

映射对象包含以下属性：
- `name`：映射的名称。
- `source`：源文件的名称，即 `context.filename`。
- `original`：原始代码的位置信息，包括行号和列号。`loc.line` 表示原始代码的行号，`loc.column - 1` 表示原始代码的列号（注意：源代码映射中的列号是从 0 开始的，而不是从 1 开始的）。
- `generated`：生成代码的位置信息，包括行号和列号。`context.line` 表示生成代码的行号，`context.column - 1` 表示生成代码的列号。

通过调用 `context.map!.addMapping()` 方法将构建好的映射对象添加到源代码映射表中，以便在生成的代码和源代码之间建立正确的映射关系，用于调试和错误追踪。
 */
  function addMapping(loc: Position, name?: string) {
    context.map!.addMapping({
      name,
      source: context.filename,
      original: {
        line: loc.line,
        column: loc.column - 1 // source-map column is 0 based
      },
      generated: {
        line: context.line,
        column: context.column - 1
      }
    })
  }
  /**
 * 这部分代码用于在非浏览器环境下，当需要生成源代码映射时，延迟加载并初始化源代码映射生成器。

首先，它会检查 `__BROWSER__` 是否为假（即非浏览器环境），以及 `sourceMap` 是否为真（即需要生成源代码映射）。只有在这两个条件都满足时，才会执行源代码映射的相关逻辑。

接下来，它通过延迟加载（`lazy require`）的方式引入 `SourceMapGenerator` 实现。这是一个用于生成源代码映射的库或工具。延迟加载的好处是只有在需要时才会加载该库，以减少不必要的性能开销。

然后，它创建一个新的 `SourceMapGenerator` 实例，将其赋值给 `context.map` 属性。这样，`context.map` 就成为了源代码映射生成器的一个实例。

最后，通过调用 `context.map!.setSourceContent(filename, context.source)` 方法，将源文件的内容 `context.source` 设置为源代码映射的源内容。这是为了在生成的源代码映射中提供源文件的原始内容，以便在调试和错误追踪时能够查看和对应源文件的内容。

总之，这段代码负责在非浏览器环境下，当需要生成源代码映射时，延迟加载并初始化源代码映射生成器，并设置源文件的内容。这样就为生成的代码和源代码之间建立了正确的映射关系，以便进行调试和错误追踪。
 */
  if (!__BROWSER__ && sourceMap) {
    // lazy require source-map implementation, only in non-browser builds
    context.map = new SourceMapGenerator()
    context.map!.setSourceContent(filename, context.source)
  }

  return context
}
/**
 * 
 * @param ast 
 * @param options 
 * @returns 
 * 这是一个名为 `generate` 的导出函数，用于生成代码。

该函数接受两个参数：`ast`（抽象语法树）和 `options`（代码生成选项）。`options` 参数还可以包含一个可选的 `onContextCreated` 回调函数。

函数内部首先调用 `createCodegenContext` 函数创建一个代码生成上下文 `context`，并将 `ast` 和 `options` 作为参数传递给它。如果存在 `onContextCreated` 回调函数，则调用该函数并传递生成的上下文对象 `context`。

接下来，函数从上下文对象 `context` 中提取一些属性和方法，包括 `mode`、`push`、`prefixIdentifiers`、`indent`、`deindent`、`newline`、`scopeId` 和 `ssr` 等。

函数还会获取抽象语法树中的助手函数列表 `helpers`，并判断是否存在助手函数。

接下来，根据不同的模式和条件生成预导语部分（preambles）。在 `setup()` 内联模式下，预导语会在一个子上下文中生成并单独返回。

然后，函数进入渲染函数的代码块。根据是否是服务端渲染（SSR），函数确定渲染函数的名称和参数列表。如果开启了绑定优化且不是内联模式，则会添加绑定优化相关的参数。

接下来是函数体的开始部分。根据使用 `with` 块的条件，可能会生成 `with` 块来包裹函数体内的代码。如果存在助手函数，则会生成相应的变量声明，并确保变量名不会与用户的属性发生冲突。

紧接着是生成资源解析语句（asset resolution statements）。如果抽象语法树中存在组件、指令或过滤器，则会生成相应的资源解析代码。

然后是临时变量的声明部分。如果抽象语法树中存在临时变量，则会生成相应的 `let` 声明语句。

接下来是生成 VNode 树表达式的部分。如果不是服务端渲染，则会添加 `return` 语句，并根据抽象语法树的 `codegenNode` 生成相应的节点代码。

最后，函数结束部分的代码生成，包括对 `with` 块的收尾和函数体的收尾。

最后，函数返回一个包含生成结果的对象，包括抽象语法树 `ast`、生成的代码 `code`、预导语部分的代码 `preamble`，以及可能存在的源代码映射 `map`。

总体而言，该函数根据抽象语法树和代码生成选项生成相应的代码，并提供了一些可定制的扩展点，如回调函数和预导语生成。生成的代码可以用于执行模板的渲染操作。
 */
export function generate(
  ast: RootNode,
  options: CodegenOptions & {
    onContextCreated?: (context: CodegenContext) => void
  } = {}
): CodegenResult {
  const context = createCodegenContext(ast, options)
  if (options.onContextCreated) options.onContextCreated(context)
  const {
    mode,
    push,
    prefixIdentifiers,
    indent,
    deindent,
    newline,
    scopeId,
    ssr
  } = context

  const helpers = Array.from(ast.helpers)
  const hasHelpers = helpers.length > 0
  const useWithBlock = !prefixIdentifiers && mode !== 'module'
  const genScopeId = !__BROWSER__ && scopeId != null && mode === 'module'
  const isSetupInlined = !__BROWSER__ && !!options.inline

  // preambles
  // in setup() inline mode, the preamble is generated in a sub context
  // and returned separately.
  const preambleContext = isSetupInlined
    ? createCodegenContext(ast, options)
    : context
  if (!__BROWSER__ && mode === 'module') {
    genModulePreamble(ast, preambleContext, genScopeId, isSetupInlined)
  } else {
    genFunctionPreamble(ast, preambleContext)
  }
  // enter render function
  const functionName = ssr ? `ssrRender` : `render`
  const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache']
  if (!__BROWSER__ && options.bindingMetadata && !options.inline) {
    // binding optimization args
    args.push('$props', '$setup', '$data', '$options')
  }
  const signature =
    !__BROWSER__ && options.isTS
      ? args.map(arg => `${arg}: any`).join(',')
      : args.join(', ')

  if (isSetupInlined) {
    push(`(${signature}) => {`)
  } else {
    push(`function ${functionName}(${signature}) {`)
  }
  indent()

  if (useWithBlock) {
    push(`with (_ctx) {`)
    indent()
    // function mode const declarations should be inside with block
    // also they should be renamed to avoid collision with user properties
    if (hasHelpers) {
      push(`const { ${helpers.map(aliasHelper).join(', ')} } = _Vue`)
      push(`\n`)
      newline()
    }
  }

  // generate asset resolution statements
  if (ast.components.length) {
    genAssets(ast.components, 'component', context)
    if (ast.directives.length || ast.temps > 0) {
      newline()
    }
  }
  if (ast.directives.length) {
    genAssets(ast.directives, 'directive', context)
    if (ast.temps > 0) {
      newline()
    }
  }
  if (__COMPAT__ && ast.filters && ast.filters.length) {
    newline()
    genAssets(ast.filters, 'filter', context)
    newline()
  }

  if (ast.temps > 0) {
    push(`let `)
    for (let i = 0; i < ast.temps; i++) {
      push(`${i > 0 ? `, ` : ``}_temp${i}`)
    }
  }
  if (ast.components.length || ast.directives.length || ast.temps) {
    push(`\n`)
    newline()
  }

  // generate the VNode tree expression
  if (!ssr) {
    push(`return `)
  }
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  if (useWithBlock) {
    deindent()
    push(`}`)
  }

  deindent()
  push(`}`)

  return {
    ast,
    code: context.code,
    preamble: isSetupInlined ? preambleContext.code : ``,
    // SourceMapGenerator does have toJSON() method but it's not in the types
    map: context.map ? (context.map as any).toJSON() : undefined
  }
}
/**
 * 
 * @param ast 
 * @param context
 * 这是一个名为 `genFunctionPreamble` 的函数，用于生成函数预导语部分的代码。

该函数接受两个参数：`ast`（抽象语法树）和 `context`（代码生成上下文）。

函数首先从上下文对象 `context` 中提取一些属性和方法，包括 `ssr`、`prefixIdentifiers`、`push`、`newline`、`runtimeModuleName`、`runtimeGlobalName` 和 `ssrRuntimeModuleName` 等。

接下来，函数生成用于引入 Vue 的声明语句。如果不是在浏览器环境下并且开启了服务端渲染，则使用 `require` 函数引入 Vue 模块，否则使用 `runtimeGlobalName`。

然后，函数根据抽象语法树中的助手函数列表生成相应的变量声明语句。如果助手函数列表不为空，则生成对应的声明语句。如果是在非浏览器环境下且开启了前缀模式，则将声明语句放置在顶部，只执行一次；否则，将声明语句放置在 `with` 块内部，以避免在每次访问助手函数时进行 `in` 检查。

接下来，如果抽象语法树中存在提升的节点（hoists），则生成相应的变量声明语句。

然后，如果不在浏览器环境下且抽象语法树中存在服务端渲染的助手函数，则生成相应的变量声明语句。

最后，函数生成一个换行符，并添加 `return` 关键字作为函数体的开头。

总体而言，该函数负责生成函数预导语部分的代码，包括引入 Vue、助手函数的变量声明以及服务端渲染的助手函数的引入和变量声明。生成的代码将在函数体中使用。
 */
function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const {
    ssr,
    prefixIdentifiers,
    push,
    newline,
    runtimeModuleName,
    runtimeGlobalName,
    ssrRuntimeModuleName
  } = context
  const VueBinding =
    !__BROWSER__ && ssr
      ? `require(${JSON.stringify(runtimeModuleName)})`
      : runtimeGlobalName
  // Generate const declaration for helpers
  // In prefix mode, we place the const declaration at top so it's done
  // only once; But if we not prefixing, we place the declaration inside the
  // with block so it doesn't incur the `in` check cost for every helper access.
  const helpers = Array.from(ast.helpers)
  if (helpers.length > 0) {
    if (!__BROWSER__ && prefixIdentifiers) {
      push(`const { ${helpers.map(aliasHelper).join(', ')} } = ${VueBinding}\n`)
    } else {
      // "with" mode.
      // save Vue in a separate variable to avoid collision
      push(`const _Vue = ${VueBinding}\n`)
      // in "with" mode, helpers are declared inside the with block to avoid
      // has check cost, but hoists are lifted out of the function - we need
      // to provide the helper here.
      if (ast.hoists.length) {
        const staticHelpers = [
          CREATE_VNODE,
          CREATE_ELEMENT_VNODE,
          CREATE_COMMENT,
          CREATE_TEXT,
          CREATE_STATIC
        ]
          .filter(helper => helpers.includes(helper))
          .map(aliasHelper)
          .join(', ')
        push(`const { ${staticHelpers} } = _Vue\n`)
      }
    }
  }
  // generate variables for ssr helpers
  if (!__BROWSER__ && ast.ssrHelpers && ast.ssrHelpers.length) {
    // ssr guarantees prefixIdentifier: true
    push(
      `const { ${ast.ssrHelpers
        .map(aliasHelper)
        .join(', ')} } = require("${ssrRuntimeModuleName}")\n`
    )
  }
  genHoists(ast.hoists, context)
  newline()
  push(`return `)
}
/**
 * 
 * @param ast 
 * @param context 
 * @param genScopeId 
 * @param inline 
 * 这是一个名为 `genModulePreamble` 的函数，用于生成模块预导语部分的代码。

该函数接受四个参数：`ast`（抽象语法树）、`context`（代码生成上下文）、`genScopeId`（是否生成作用域 ID 相关的代码）、`inline`（是否将代码内联）。

函数首先从上下文对象 `context` 中提取一些属性和方法，包括 `push`、`newline`、`optimizeImports`、`runtimeModuleName` 和 `ssrRuntimeModuleName` 等。

接下来，如果需要生成作用域 ID 相关的代码并且抽象语法树中存在提升的节点，则向助手函数列表中添加 `PUSH_SCOPE_ID` 和 `POP_SCOPE_ID`。

然后，函数根据抽象语法树中的助手函数列表生成相应的导入语句。如果助手函数列表不为空，并且开启了优化导入选项，则将助手函数作为变量导入，以减小代码体积。否则，将助手函数直接导入。

接下来，如果抽象语法树中存在服务端渲染的助手函数，则生成相应的导入语句。

然后，如果抽象语法树中存在其他模块的导入语句，则生成相应的导入语句。

接着，生成抽象语法树中提升的节点（hoists）的代码。

最后，如果不是将代码内联，则生成 `export` 关键字作为模块的开头。

总体而言，该函数负责生成模块预导语部分的代码，包括助手函数的导入、作用域 ID 相关的代码、其他模块的导入以及提升的节点的代码。生成的代码将作为模块的开头部分。
 */
function genModulePreamble(
  ast: RootNode,
  context: CodegenContext,
  genScopeId: boolean,
  inline?: boolean
) {
  const {
    push,
    newline,
    optimizeImports,
    runtimeModuleName,
    ssrRuntimeModuleName
  } = context

  if (genScopeId && ast.hoists.length) {
    ast.helpers.add(PUSH_SCOPE_ID)
    ast.helpers.add(POP_SCOPE_ID)
  }

  // generate import statements for helpers
  if (ast.helpers.size) {
    const helpers = Array.from(ast.helpers)
    if (optimizeImports) {
      // when bundled with webpack with code-split, calling an import binding
      // as a function leads to it being wrapped with `Object(a.b)` or `(0,a.b)`,
      // incurring both payload size increase and potential perf overhead.
      // therefore we assign the imports to variables (which is a constant ~50b
      // cost per-component instead of scaling with template size)
      push(
        `import { ${helpers
          .map(s => helperNameMap[s])
          .join(', ')} } from ${JSON.stringify(runtimeModuleName)}\n`
      )
      push(
        `\n// Binding optimization for webpack code-split\nconst ${helpers
          .map(s => `_${helperNameMap[s]} = ${helperNameMap[s]}`)
          .join(', ')}\n`
      )
    } else {
      push(
        `import { ${helpers
          .map(s => `${helperNameMap[s]} as _${helperNameMap[s]}`)
          .join(', ')} } from ${JSON.stringify(runtimeModuleName)}\n`
      )
    }
  }

  if (ast.ssrHelpers && ast.ssrHelpers.length) {
    push(
      `import { ${ast.ssrHelpers
        .map(s => `${helperNameMap[s]} as _${helperNameMap[s]}`)
        .join(', ')} } from "${ssrRuntimeModuleName}"\n`
    )
  }

  if (ast.imports.length) {
    genImports(ast.imports, context)
    newline()
  }

  genHoists(ast.hoists, context)
  newline()

  if (!inline) {
    push(`export `)
  }
}
/**
 * 
 * @param assets 
 * @param type 
 * @param param2 
 * 这是一个名为 `genAssets` 的函数，用于生成组件、指令或过滤器的资产代码。

该函数接受四个参数：`assets`（资产列表）、`type`（资产类型，可以是 `'component'`、`'directive'` 或 `'filter'`）、`helper`、`push`、`newline` 和 `isTS` 等属性。

函数首先根据 `type` 参数确定要使用的助手函数，例如在兼容模式下且类型为过滤器时使用 `RESOLVE_FILTER` 助手函数。

然后，使用循环遍历资产列表，并为每个资产生成相应的代码。首先，检查资产是否可能是组件的隐式自引用（通过 SFC 文件名推断）。如果是，则将资产 ID 去除 `__self` 后缀。接下来，生成资产的代码，使用助手函数解析资产，并将资产 ID 作为参数传递给解析函数。如果资产是可能的自引用，则传递额外的参数 `true`。最后，根据是否是 TypeScript 代码，添加 `!` 运算符。

在循环过程中，如果不是最后一个资产，则插入一个换行符。

总体而言，该函数负责生成组件、指令或过滤器的资产代码。它使用相应的助手函数解析资产，并根据是否是自引用添加额外的参数。生成的代码将被推入到代码生成上下文的 `push` 函数中。
 */
function genAssets(
  assets: string[],
  type: 'component' | 'directive' | 'filter',
  { helper, push, newline, isTS }: CodegenContext
) {
  const resolver = helper(
    __COMPAT__ && type === 'filter'
      ? RESOLVE_FILTER
      : type === 'component'
      ? RESOLVE_COMPONENT
      : RESOLVE_DIRECTIVE
  )
  for (let i = 0; i < assets.length; i++) {
    let id = assets[i]
    // potential component implicit self-reference inferred from SFC filename
    const maybeSelfReference = id.endsWith('__self')
    if (maybeSelfReference) {
      id = id.slice(0, -6)
    }
    push(
      `const ${toValidAssetId(id, type)} = ${resolver}(${JSON.stringify(id)}${
        maybeSelfReference ? `, true` : ``
      })${isTS ? `!` : ``}`
    )
    if (i < assets.length - 1) {
      newline()
    }
  }
}
/**
 * 
 * @param hoists 
 * @param context 
 * @returns 
 * 这是一个名为 `genHoists` 的函数，用于生成提升的代码。

该函数接受两个参数：`hoists`（提升的节点列表）和 `context`（代码生成上下文）。

函数首先检查提升的节点列表是否为空，如果为空，则直接返回。

接下来，函数设置代码生成上下文的 `pure` 属性为 `true`，表示当前生成的代码是纯函数。

然后，函数根据代码生成上下文的一些属性，如 `push`、`newline`、`helper`、`scopeId` 和 `mode` 等，生成相应的代码。如果满足生成作用域 ID 的条件，函数会生成一个内联的 `withScopeId` 辅助函数。

接下来，函数使用循环遍历提升的节点列表，并为每个节点生成相应的代码。如果节点存在，则生成一个以 `_hoisted_${i + 1}` 为名称的常量，并将节点代码放入其中。如果需要使用作用域 ID 包装节点，则在节点代码前后添加相应的代码。最后，插入一个换行符。

最后，函数将代码生成上下文的 `pure` 属性恢复为 `false`，表示当前生成的代码不再是纯函数。

总体而言，该函数负责生成提升的代码。它遍历提升的节点列表，并根据需要生成作用域 ID 包装的代码。生成的代码将被推入到代码生成上下文的 `push` 函数中。生成的代码将在运行时执行，并具有一定的性能优化。
 */
function genHoists(hoists: (JSChildNode | null)[], context: CodegenContext) {
  if (!hoists.length) {
    return
  }
  context.pure = true
  const { push, newline, helper, scopeId, mode } = context
  const genScopeId = !__BROWSER__ && scopeId != null && mode !== 'function'
  newline()

  // generate inlined withScopeId helper
  if (genScopeId) {
    push(
      `const _withScopeId = n => (${helper(
        PUSH_SCOPE_ID
      )}("${scopeId}"),n=n(),${helper(POP_SCOPE_ID)}(),n)`
    )
    newline()
  }

  for (let i = 0; i < hoists.length; i++) {
    const exp = hoists[i]
    if (exp) {
      const needScopeIdWrapper = genScopeId && exp.type === NodeTypes.VNODE_CALL
      push(
        `const _hoisted_${i + 1} = ${
          needScopeIdWrapper ? `${PURE_ANNOTATION} _withScopeId(() => ` : ``
        }`
      )
      genNode(exp, context)
      if (needScopeIdWrapper) {
        push(`)`)
      }
      newline()
    }
  }

  context.pure = false
}
/**
 * 
 * @param importsOptions 
 * @param context 
 * @returns 
 * 这是一个名为 `genImports` 的函数，用于生成导入语句。

该函数接受两个参数：`importsOptions`（导入项的选项列表）和 `context`（代码生成上下文）。

函数首先检查导入项的选项列表是否为空，如果为空，则直接返回。

接下来，函数使用 `forEach` 方法遍历导入项的选项列表。对于每个导入项，函数会生成相应的导入语句。

在生成导入语句时，函数首先通过代码生成上下文的 `push` 函数插入 `import` 关键字。然后，使用 `genNode` 函数生成导入项的表达式部分，并将其插入到代码生成上下文中。接下来，函数使用 `push` 函数插入 `from` 关键字和导入路径，并通过导入项的 `path` 属性获取导入路径。最后，函数通过代码生成上下文的 `newline` 函数插入一个换行符。

总体而言，该函数负责生成导入语句。它遍历导入项的选项列表，并生成相应的导入语句，包括导入表达式和导入路径。生成的导入语句将被推入到代码生成上下文的 `push` 函数中，并在运行时执行。
 */
function genImports(importsOptions: ImportItem[], context: CodegenContext) {
  if (!importsOptions.length) {
    return
  }
  importsOptions.forEach(imports => {
    context.push(`import `)
    genNode(imports.exp, context)
    context.push(` from '${imports.path}'`)
    context.newline()
  })
}
/**
 * 
 * @param n 
 * @returns 
 * 这是一个名为 `isText` 的函数，用于检查给定的节点是否表示文本内容。

该函数接受一个参数 `n`，可以是字符串或代码生成节点。函数返回一个布尔值，表示给定节点是否为文本。

函数的实现逻辑如下：

1. 首先，函数检查节点是否为字符串类型，如果是，则直接返回 `true`，因为字符串是文本类型。
2. 否则，函数继续检查节点的类型是否为以下之一：
   - `NodeTypes.SIMPLE_EXPRESSION`：简单表达式节点，可以包含文本内容。
   - `NodeTypes.TEXT`：纯文本节点，表示纯文本内容。
   - `NodeTypes.INTERPOLATION`：插值表达式节点，表示包含变量插值的文本内容。
   - `NodeTypes.COMPOUND_EXPRESSION`：复合表达式节点，表示包含多个子表达式的文本内容。
3. 如果节点的类型是上述之一，函数返回 `true`，表示该节点是文本类型。
4. 如果节点的类型不是上述之一，函数返回 `false`，表示该节点不是文本类型。

总体而言，该函数用于判断给定的节点是否表示文本内容。它考虑了多种节点类型，包括字符串、简单表达式、纯文本、插值表达式和复合表达式。根据节点的类型，函数确定节点是否为文本类型，并返回相应的布尔值。
 */
function isText(n: string | CodegenNode) {
  return (
    isString(n) ||
    n.type === NodeTypes.SIMPLE_EXPRESSION ||
    n.type === NodeTypes.TEXT ||
    n.type === NodeTypes.INTERPOLATION ||
    n.type === NodeTypes.COMPOUND_EXPRESSION
  )
}
/**
 * 
 * @param nodes 
 * @param context
 * 这是一个名为 `genNodeListAsArray` 的函数，用于生成节点列表的数组表示。

该函数接受两个参数：

1. `nodes`：节点列表，可以包含字符串、代码生成节点或子节点数组。
2. `context`：代码生成上下文。

函数的目的是将节点列表转换为数组表示，并将生成的代码推入到代码生成上下文中。

函数的实现逻辑如下：

1. 首先，函数确定是否需要将节点列表表示为多行数组。如果节点列表长度大于3，或者节点列表中包含数组或非文本节点，则认为需要多行数组表示。
2. 在代码生成上下文中推入开启数组表示的字符 `[`。
3. 如果需要多行数组表示，对代码生成上下文进行缩进。
4. 调用 `genNodeList` 函数生成节点列表的代码，将节点列表、代码生成上下文和是否多行数组作为参数传递。
5. 如果需要多行数组表示，对代码生成上下文进行取消缩进。
6. 在代码生成上下文中推入结束数组表示的字符 `]`。

总体而言，该函数用于将节点列表转换为数组表示，并将生成的代码推入到代码生成上下文中。函数根据节点列表的长度和内容，确定是否需要多行数组表示，并生成相应的代码。 
 */
function genNodeListAsArray(
  nodes: (string | CodegenNode | TemplateChildNode[])[],
  context: CodegenContext
) {
  const multilines =
    nodes.length > 3 ||
    ((!__BROWSER__ || __DEV__) && nodes.some(n => isArray(n) || !isText(n)))
  context.push(`[`)
  multilines && context.indent()
  genNodeList(nodes, context, multilines)
  multilines && context.deindent()
  context.push(`]`)
}
/**
 * 
 * @param nodes 
 * @param context 
 * @param multilines 
 * @param comma 
 * 这是一个名为 `genNodeList` 的函数，用于生成节点列表的代码表示。

该函数接受四个参数：

1. `nodes`：节点列表，可以包含字符串、符号、代码生成节点或子节点数组。
2. `context`：代码生成上下文。
3. `multilines`：是否生成多行代码表示，默认为 `false`。
4. `comma`：是否在节点之间添加逗号，默认为 `true`。

函数的目的是根据节点列表生成相应的代码，并将生成的代码推入到代码生成上下文中。

函数的实现逻辑如下：

1. 在代码生成上下文中获取 `push` 和 `newline` 方法。
2. 遍历节点列表，处理每个节点：
   - 如果节点是字符串，直接将其推入代码生成上下文中。
   - 如果节点是数组，调用 `genNodeListAsArray` 函数生成节点列表的数组表示。
   - 否则，调用 `genNode` 函数生成节点的代码表示。
3. 如果不是最后一个节点：
   - 如果需要多行代码表示，在节点之间添加逗号，并插入换行符。
   - 如果不需要多行代码表示，在节点之间添加逗号和空格。

总体而言，该函数用于遍历节点列表，并根据节点的类型调用相应的函数生成代码表示。根据参数设置的多行代码表示和逗号选项，在生成的代码中添加适当的换行符、逗号和空格。生成的代码将推入代码生成上下文中。
 */
function genNodeList(
  nodes: (string | symbol | CodegenNode | TemplateChildNode[])[],
  context: CodegenContext,
  multilines: boolean = false,
  comma: boolean = true
) {
  const { push, newline } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      if (multilines) {
        comma && push(',')
        newline()
      } else {
        comma && push(', ')
      }
    }
  }
}
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这是一个名为 `genNode` 的函数，用于生成节点的代码表示。

该函数接受两个参数：

1. `node`：代码生成节点、符号或字符串。
2. `context`：代码生成上下文。

函数的目的是根据节点的类型调用相应的函数生成节点的代码表示，并将生成的代码推入到代码生成上下文中。

函数的实现逻辑如下：

1. 检查节点的类型：
   - 如果节点是字符串，直接将其推入代码生成上下文中。
   - 如果节点是符号，调用代码生成上下文中的 `helper` 方法获取相应的助手函数，并将其推入代码生成上下文中。
   - 根据节点的类型调用相应的处理函数：
     - `ELEMENT`、`IF`、`FOR`：生成节点的代码生成节点，并调用 `genNode` 函数处理该代码生成节点。
     - `TEXT`：调用 `genText` 函数生成文本节点的代码表示。
     - `SIMPLE_EXPRESSION`：调用 `genExpression` 函数生成简单表达式节点的代码表示。
     - `INTERPOLATION`：调用 `genInterpolation` 函数生成插值节点的代码表示。
     - `TEXT_CALL`：调用 `genNode` 函数处理代码生成节点。
     - `COMPOUND_EXPRESSION`：调用 `genCompoundExpression` 函数生成复合表达式节点的代码表示。
     - `COMMENT`：调用 `genComment` 函数生成注释节点的代码表示。
     - `VNODE_CALL`：调用 `genVNodeCall` 函数生成虚拟节点的代码表示。
     - `JS_CALL_EXPRESSION`：调用 `genCallExpression` 函数生成函数调用表达式的代码表示。
     - `JS_OBJECT_EXPRESSION`：调用 `genObjectExpression` 函数生成对象表达式的代码表示。
     - `JS_ARRAY_EXPRESSION`：调用 `genArrayExpression` 函数生成数组表达式的代码表示。
     - `JS_FUNCTION_EXPRESSION`：调用 `genFunctionExpression` 函数生成函数表达式的代码表示。
     - `JS_CONDITIONAL_EXPRESSION`：调用 `genConditionalExpression` 函数生成条件表达式的代码表示。
     - `JS_CACHE_EXPRESSION`：调用 `genCacheExpression` 函数生成缓存表达式的代码表示。
     - `JS_BLOCK_STATEMENT`：调用 `genNodeList` 函数生成代码块的代码表示。
     - `JS_TEMPLATE_LITERAL`（仅限 SSR）：调用 `genTemplateLiteral` 函数生成模板字面量的代码表示。
     - `JS_IF_STATEMENT`（仅限 SSR）：调用 `genIfStatement` 函数生成条件语句的代码表示。
     - `JS_ASSIGNMENT_EXPRESSION`（仅限 SSR）：调用 `genAssignmentExpression` 函数生成赋值表达式的代码表示。
     - `JS_SEQUENCE_EXPRESSION`（仅限 SSR）：调用 `genSequenceExpression` 函数生成序列表达式的代码表示。
     - `JS_RETURN_STATEMENT`（仅限 SSR）：调用 `genReturnStatement` 函数生成返回语句的代码表示。
2. 如果节点类型未被处理：
   - 如果在

开发模式下，抛出错误，指示未处理的代码生成节点类型。
   - 否则，忽略该节点。
   - 这是为了确保代码生成器涵盖了所有可能的节点类型。

总体而言，该函数是一个调度函数，根据节点的类型调用相应的处理函数生成代码表示。代码生成过程中将使用代码生成上下文来推入生成的代码。
 */
function genNode(node: CodegenNode | symbol | string, context: CodegenContext) {
  if (isString(node)) {
    context.push(node)
    return
  }
  if (isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  switch (node.type) {
    case NodeTypes.ELEMENT:
    case NodeTypes.IF:
    case NodeTypes.FOR:
      __DEV__ &&
        assert(
          node.codegenNode != null,
          `Codegen node is missing for element/if/for node. ` +
            `Apply appropriate transforms first.`
        )
      genNode(node.codegenNode!, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.TEXT_CALL:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    case NodeTypes.COMMENT:
      genComment(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break

    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    case NodeTypes.JS_ARRAY_EXPRESSION:
      genArrayExpression(node, context)
      break
    case NodeTypes.JS_FUNCTION_EXPRESSION:
      genFunctionExpression(node, context)
      break
    case NodeTypes.JS_CONDITIONAL_EXPRESSION:
      genConditionalExpression(node, context)
      break
    case NodeTypes.JS_CACHE_EXPRESSION:
      genCacheExpression(node, context)
      break
    case NodeTypes.JS_BLOCK_STATEMENT:
      genNodeList(node.body, context, true, false)
      break

    // SSR only types
    case NodeTypes.JS_TEMPLATE_LITERAL:
      !__BROWSER__ && genTemplateLiteral(node, context)
      break
    case NodeTypes.JS_IF_STATEMENT:
      !__BROWSER__ && genIfStatement(node, context)
      break
    case NodeTypes.JS_ASSIGNMENT_EXPRESSION:
      !__BROWSER__ && genAssignmentExpression(node, context)
      break
    case NodeTypes.JS_SEQUENCE_EXPRESSION:
      !__BROWSER__ && genSequenceExpression(node, context)
      break
    case NodeTypes.JS_RETURN_STATEMENT:
      !__BROWSER__ && genReturnStatement(node, context)
      break

    /* istanbul ignore next */
    case NodeTypes.IF_BRANCH:
      // noop
      break
    default:
      if (__DEV__) {
        assert(false, `unhandled codegen node type: ${(node as any).type}`)
        // make sure we exhaust all possible types
        const exhaustiveCheck: never = node
        return exhaustiveCheck
      }
  }
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genText` 的函数，用于生成文本节点的代码表示。

该函数接受两个参数：

1. `node`：文本节点或简单表达式节点。
2. `context`：代码生成上下文。

函数的目的是将文本节点的内容转换为字符串，并将其推入代码生成上下文中。

函数的实现逻辑如下：

1. 将节点的内容使用 `JSON.stringify` 方法转换为字符串形式。
2. 将转换后的字符串推入代码生成上下文中，并附带节点对象作为源代码位置信息。

该函数的作用是生成文本节点的代码表示，将文本内容以字符串形式呈现，并将其推入到代码生成上下文中。
 */
function genText(
  node: TextNode | SimpleExpressionNode,
  context: CodegenContext
) {
  context.push(JSON.stringify(node.content), node)
}
/**
 * 
 * @param node 
 * @param context
 * 这是一个名为 `genExpression` 的函数，用于生成简单表达式节点的代码表示。

该函数接受两个参数：

1. `node`：简单表达式节点。
2. `context`：代码生成上下文。

函数的目的是根据节点的静态属性生成相应的代码。

函数的实现逻辑如下：

1. 从节点中获取 `content`（表达式内容）和 `isStatic`（是否为静态表达式）属性。
2. 如果 `isStatic` 为 `true`，则将 `content` 使用 `JSON.stringify` 方法转换为字符串形式，并将其推入代码生成上下文中，附带节点对象作为源代码位置信息。
3. 如果 `isStatic` 为 `false`，则直接将 `content` 推入代码生成上下文中，附带节点对象作为源代码位置信息。

该函数的作用是生成简单表达式节点的代码表示。如果表达式是静态的，将其内容作为字符串推入代码生成上下文中；如果表达式是动态的，则直接将内容推入代码生成上下文中。 
 */
function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
  const { content, isStatic } = node
  context.push(isStatic ? JSON.stringify(content) : content, node)
}
/**
 * 
 * @param node 
 * @param context
 * 这是一个名为 `genInterpolation` 的函数，用于生成插值节点的代码表示。

该函数接受两个参数：

1. `node`：插值节点。
2. `context`：代码生成上下文。

函数的目的是根据插值节点生成相应的代码。

函数的实现逻辑如下：

1. 从代码生成上下文中获取 `push`、`helper` 和 `pure` 属性。
2. 如果 `pure` 为真，则调用 `push` 方法将 `PURE_ANNOTATION`（纯注解）推入代码生成上下文中。
3. 调用 `push` 方法将 `${helper(TO_DISPLAY_STRING)}(` 推入代码生成上下文中。
4. 调用 `genNode` 方法生成插值节点的内容，并将生成的代码推入代码生成上下文中。
5. 调用 `push` 方法将 `)` 推入代码生成上下文中。

该函数的作用是生成插值节点的代码表示。它会调用相应的辅助函数，并将插值节点的内容作为参数传递给辅助函数，然后将生成的代码推入代码生成上下文中。如果在生成代码时需要保持纯粹性，会添加纯注解。 
 */
function genInterpolation(node: InterpolationNode, context: CodegenContext) {
  const { push, helper, pure } = context
  if (pure) push(PURE_ANNOTATION)
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genCompoundExpression` 的函数，用于生成复合表达式节点的代码表示。

该函数接受两个参数：

1. `node`：复合表达式节点。
2. `context`：代码生成上下文。

函数的目的是根据复合表达式节点生成相应的代码。

函数的实现逻辑如下：

1. 使用 `for` 循环遍历复合表达式节点的子节点。
2. 对于每个子节点，如果它是一个字符串，则直接将其推入代码生成上下文中。
3. 如果子节点不是字符串，则调用 `genNode` 方法生成其代码表示，并将生成的代码推入代码生成上下文中。

该函数的作用是将复合表达式节点拆解为多个子节点，并根据每个子节点的类型生成相应的代码。如果子节点是字符串，则直接推入代码生成上下文中；如果子节点不是字符串，则调用递归的 `genNode` 方法生成其代码表示。这样可以保证复合表达式节点的所有子节点都被正确地转换为代码。
 */
function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext
) {
  for (let i = 0; i < node.children!.length; i++) {
    const child = node.children![i]
    if (isString(child)) {
      context.push(child)
    } else {
      genNode(child, context)
    }
  }
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genExpressionAsPropertyKey` 的函数，用于将表达式节点作为属性键生成代码表示。

该函数接受两个参数：

1. `node`：表达式节点。
2. `context`：代码生成上下文。

函数的目的是根据表达式节点生成相应的属性键的代码。

函数的实现逻辑如下：

1. 获取代码生成上下文中的 `push` 方法。
2. 如果节点的类型是复合表达式节点（`NodeTypes.COMPOUND_EXPRESSION`），则生成一个包含复合表达式节点的代码块。代码块以 `[` 开始，调用 `genCompoundExpression` 方法生成复合表达式节点的代码表示，然后以 `]` 结束。这样可以确保复合表达式节点作为属性键时能够正确地解析。
3. 如果节点是静态的（`isStatic` 为 `true`），则判断节点的内容是否是简单标识符（simple identifier），如果是，则直接将内容推入代码生成上下文中；如果不是，则使用 `JSON.stringify` 方法将内容转换为字符串，并将字符串推入代码生成上下文中。这样可以保证只在必要时对属性键进行引号包裹。
4. 如果节点不是静态的，则将节点的内容使用 `[` 和 `]` 包裹起来，并将结果推入代码生成上下文中。这样可以确保非静态的属性键能够正确解析。

该函数的作用是根据表达式节点生成对应的属性键的代码表示。根据节点的类型和属性键的特性，生成的代码可能是简单的标识符、带引号的字符串，或复合表达式。这样可以确保在生成对象字面量时，属性键能够正确地表示各种类型的表达式。
 */
function genExpressionAsPropertyKey(
  node: ExpressionNode,
  context: CodegenContext
) {
  const { push } = context
  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    push(`[`)
    genCompoundExpression(node, context)
    push(`]`)
  } else if (node.isStatic) {
    // only quote keys if necessary
    const text = isSimpleIdentifier(node.content)
      ? node.content
      : JSON.stringify(node.content)
    push(text, node)
  } else {
    push(`[${node.content}]`, node)
  }
}
/**
 * 这是一个名为 `genComment` 的函数，用于生成注释节点的代码表示。

该函数接受两个参数：

1. `node`：注释节点。
2. `context`：代码生成上下文。

函数的目的是根据注释节点生成相应的代码表示。

函数的实现逻辑如下：

1. 获取代码生成上下文中的 `push` 和 `helper` 方法。
2. 如果代码生成上下文中的 `pure` 属性为 `true`，则在代码生成上下文中推入纯函数的注释标识。
3. 使用 `CREATE_COMMENT` 辅助函数生成注释节点的代码表示。调用 `helper` 方法获取 `CREATE_COMMENT` 辅助函数的名称，并传入注释节点的内容作为参数，并将生成的代码推入代码生成上下文中。

该函数的作用是生成注释节点的代码表示。使用 `CREATE_COMMENT` 辅助函数将注释节点的内容作为参数，生成对应的注释代码。在纯函数上下文中，会添加纯函数的注释标识，以便进行优化处理。
 */
function genComment(node: CommentNode, context: CodegenContext) {
  const { push, helper, pure } = context
  if (pure) {
    push(PURE_ANNOTATION)
  }
  push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, node)
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genVNodeCall` 的函数，用于生成虚拟节点（VNode）的代码表示。

该函数接受两个参数：

1. `node`：虚拟节点。
2. `context`：代码生成上下文。

函数的目的是根据虚拟节点生成相应的代码表示。

函数的实现逻辑如下：

1. 获取代码生成上下文中的 `push`、`helper` 和 `pure` 方法，以及虚拟节点的各种属性。
2. 如果虚拟节点具有指令（directives），则在代码生成上下文中推入 `WITH_DIRECTIVES` 辅助函数的调用代码。
3. 如果虚拟节点是块级节点（isBlock），则在代码生成上下文中推入打开块级节点的代码。
4. 如果代码生成上下文中的 `pure` 属性为 `true`，则在代码生成上下文中推入纯函数的注释标识。
5. 根据虚拟节点的类型和是否是块级节点，选择相应的辅助函数（`getVNodeHelper` 或 `getVNodeBlockHelper`）生成虚拟节点的调用代码。调用 `helper` 方法获取辅助函数的名称，并将生成的代码推入代码生成上下文中。
6. 调用 `genNodeList` 函数生成虚拟节点的参数列表的代码表示。使用 `genNullableArgs` 函数处理参数列表中的可选项，生成参数列表的数组，并将其传入 `genNodeList` 函数中。生成的代码将推入代码生成上下文中。
7. 推入虚拟节点调用的结束括号。
8. 如果虚拟节点是块级节点，则在代码生成上下文中推入关闭块级节点的代码。
9. 如果虚拟节点具有指令（directives），则在代码生成上下文中推入指令的代码表示。

该函数的作用是生成虚拟节点的代码表示。根据虚拟节点的属性和类型选择相应的辅助函数，并生成虚拟节点的调用代码。同时，处理虚拟节点的参数列表和可选项，并生成相应的代码表示。在纯函数上下文中，会添加纯函数的注释标识，以便进行优化处理。如果虚拟节点具有指令，会生成指令相关的代码。如果虚拟节点是块级节点，会生成打开和关闭块级节点的代码。
 */
function genVNodeCall(node: VNodeCall, context: CodegenContext) {
  const { push, helper, pure } = context
  const {
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent
  } = node
  if (directives) {
    push(helper(WITH_DIRECTIVES) + `(`)
  }
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `)
  }
  if (pure) {
    push(PURE_ANNOTATION)
  }
  const callHelper: symbol = isBlock
    ? getVNodeBlockHelper(context.inSSR, isComponent)
    : getVNodeHelper(context.inSSR, isComponent)
  push(helper(callHelper) + `(`, node)
  genNodeList(
    genNullableArgs([tag, props, children, patchFlag, dynamicProps]),
    context
  )
  push(`)`)
  if (isBlock) {
    push(`)`)
  }
  if (directives) {
    push(`, `)
    genNode(directives, context)
    push(`)`)
  }
}
/**
 * 
 * @param args 
 * @returns 
 * 这是一个名为 `genNullableArgs` 的函数，用于处理参数列表中的可选项。

该函数接受一个参数 `args`，它是一个包含多个参数的数组。

函数的目的是从参数列表中找到最后一个非空（非null和非undefined）的参数，并返回从数组开头到该参数的子数组。同时，将子数组中的空值（null或undefined）替换为字符串 `"null"`。

函数的实现逻辑如下：

1. 初始化变量 `i` 为参数数组的长度减1。
2. 从后往前遍历参数数组，如果找到第一个非空的参数，则终止遍历。
3. 使用 `slice` 方法从参数数组的开头截取到第一个非空参数的位置，得到一个子数组。
4. 使用 `map` 方法遍历子数组中的每个参数，并将空值替换为字符串 `"null"`。
5. 返回处理后的结果，即替换空值后的参数数组子数组。

该函数的作用是处理参数列表中的可选项。它从参数数组的末尾开始，找到第一个非空的参数，并返回从数组开头到该参数的子数组。同时，将子数组中的空值替换为字符串 `"null"`。这样可以确保生成的代码中不会包含连续的逗号，同时对于空值的处理也符合 JavaScript 代码的语法要求。
 */
function genNullableArgs(args: any[]): CallExpression['arguments'] {
  let i = args.length
  while (i--) {
    if (args[i] != null) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}

// JavaScript
/**
 * 
 * @param node 
 * @param context
 * 这是一个名为 `genCallExpression` 的函数，用于生成函数调用表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `CallExpression` 类型的对象，表示函数调用表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的主要逻辑如下：

1. 从 `context` 中获取 `push`、`helper` 和 `pure` 方法，用于代码生成和辅助函数的处理。
2. 根据 `node.callee` 的类型，确定函数调用的被调用函数名称。如果 `node.callee` 是字符串，则直接使用该字符串作为被调用函数的名称；否则，通过 `helper` 方法获取辅助函数的名称。
3. 如果 `pure` 为真，则在生成的代码中添加纯函数的注解。
4. 使用 `push` 方法将被调用函数的名称和左括号添加到代码中，并传入 `node` 作为附加信息。
5. 调用 `genNodeList` 方法生成函数调用的参数列表的代码，并传入参数列表和 `context`。
6. 使用 `push` 方法将右括号添加到代码中，结束函数调用的代码生成。

该函数的作用是生成函数调用表达式的代码。它处理函数调用的被调用函数名称、纯函数注解以及参数列表的生成，以便在最终的代码中正确呈现函数调用的语法。 
 */
function genCallExpression(node: CallExpression, context: CodegenContext) {
  const { push, helper, pure } = context
  const callee = isString(node.callee) ? node.callee : helper(node.callee)
  if (pure) {
    push(PURE_ANNOTATION)
  }
  push(callee + `(`, node)
  genNodeList(node.arguments, context)
  push(`)`)
}
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这是一个名为 `genObjectExpression` 的函数，用于生成对象表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `ObjectExpression` 类型的对象，表示对象表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的主要逻辑如下：

1. 从 `context` 中获取 `push`、`indent`、`deindent` 和 `newline` 方法，用于代码生成和缩进处理。
2. 从 `node` 中获取对象的属性列表 `properties`。
3. 如果属性列表为空，则生成空对象的代码，即直接使用 `{}`。
4. 判断是否需要使用多行格式生成代码，条件是属性列表长度大于 1 或者存在复杂表达式的属性值。
5. 使用 `push` 方法将左大括号添加到代码中，如果是多行格式，则在 `{` 前面添加一个空格。
6. 如果是多行格式，则使用 `indent` 方法增加缩进。
7. 遍历属性列表，对于每个属性，生成键和值的代码。
   - 生成键的代码调用 `genExpressionAsPropertyKey` 方法，传入键和上下文。
   - 添加冒号和空格。
   - 生成值的代码调用 `genNode` 方法，传入值和上下文。
   - 如果不是最后一个属性，则添加逗号并换行。
8. 如果是多行格式，则使用 `deindent` 方法减少缩进。
9. 使用 `push` 方法将右大括号添加到代码中，如果是多行格式，则在 `}` 前面添加一个空格。

该函数的作用是生成对象表达式的代码。它处理对象的属性列表，包括键和值的生成以及多行格式的处理，以便在最终的代码中正确呈现对象的语法。
 */
function genObjectExpression(node: ObjectExpression, context: CodegenContext) {
  const { push, indent, deindent, newline } = context
  const { properties } = node
  if (!properties.length) {
    push(`{}`, node)
    return
  }
  const multilines =
    properties.length > 1 ||
    ((!__BROWSER__ || __DEV__) &&
      properties.some(p => p.value.type !== NodeTypes.SIMPLE_EXPRESSION))
  push(multilines ? `{` : `{ `)
  multilines && indent()
  for (let i = 0; i < properties.length; i++) {
    const { key, value } = properties[i]
    // key
    genExpressionAsPropertyKey(key, context)
    push(`: `)
    // value
    genNode(value, context)
    if (i < properties.length - 1) {
      // will only reach this if it's multilines
      push(`,`)
      newline()
    }
  }
  multilines && deindent()
  push(multilines ? `}` : ` }`)
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genArrayExpression` 的函数，用于生成数组表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `ArrayExpression` 类型的对象，表示数组表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑非常简单，它调用了 `genNodeListAsArray` 函数，并将 `node.elements` 作为参数传递给它。`node.elements` 是一个表示数组元素的节点数组。

`genNodeListAsArray` 函数负责生成节点数组的代码表示形式，它会在最终的代码中以数组的形式呈现这些节点。该函数会考虑多行格式的情况，并在需要时进行缩进处理。

因此，`genArrayExpression` 函数的作用是生成数组表达式的代码，它会将数组元素节点数组传递给 `genNodeListAsArray` 函数进行处理，并最终生成正确的代码表示形式。
 */
function genArrayExpression(node: ArrayExpression, context: CodegenContext) {
  genNodeListAsArray(node.elements as CodegenNode[], context)
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genFunctionExpression` 的函数，用于生成函数表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `FunctionExpression` 类型的对象，表示函数表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑如下：

1. 如果函数是一个插槽函数（slot function），则在代码中将其包装在拥有者上下文中。
2. 生成函数的参数部分的代码表示形式。如果参数是一个数组，则调用 `genNodeList` 函数来处理参数数组的每个节点；否则，直接调用 `genNode` 函数生成单个参数节点的代码表示形式。
3. 添加 `=>` 符号作为函数参数部分和函数体部分的分隔符。
4. 如果函数体需要换行或存在函数体语句，则添加大括号 `{}`。如果存在返回值 `returns`，则生成返回值的代码表示形式；否则，生成函数体 `body` 的代码表示形式。
5. 如果存在换行或函数体语句，则进行适当的缩进和反缩进处理。
6. 如果函数是一个插槽函数，并且在兼容模式下，添加额外的参数和标志。
7. 如果函数是一个插槽函数，则在代码中关闭括号。

因此，`genFunctionExpression` 函数的作用是生成函数表达式的代码。它会根据函数节点的属性生成正确的代码表示形式，并考虑到参数、函数体、返回值等情况。
 */
function genFunctionExpression(
  node: FunctionExpression,
  context: CodegenContext
) {
  const { push, indent, deindent } = context
  const { params, returns, body, newline, isSlot } = node
  if (isSlot) {
    // wrap slot functions with owner context
    push(`_${helperNameMap[WITH_CTX]}(`)
  }
  push(`(`, node)
  if (isArray(params)) {
    genNodeList(params, context)
  } else if (params) {
    genNode(params, context)
  }
  push(`) => `)
  if (newline || body) {
    push(`{`)
    indent()
  }
  if (returns) {
    if (newline) {
      push(`return `)
    }
    if (isArray(returns)) {
      genNodeListAsArray(returns, context)
    } else {
      genNode(returns, context)
    }
  } else if (body) {
    genNode(body, context)
  }
  if (newline || body) {
    deindent()
    push(`}`)
  }
  if (isSlot) {
    if (__COMPAT__ && node.isNonScopedSlot) {
      push(`, undefined, true`)
    }
    push(`)`)
  }
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genConditionalExpression` 的函数，用于生成条件表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `ConditionalExpression` 类型的对象，表示条件表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑如下：

1. 提取条件表达式的测试条件 `test`、真值分支 `consequent` 和假值分支 `alternate`。
2. 生成测试条件部分的代码表示形式。如果测试条件是一个简单表达式，则直接调用 `genExpression` 函数生成其代码表示形式；否则，调用 `genNode` 函数生成其代码表示形式。
3. 如果需要换行，则进行适当的缩进。
4. 生成真值分支部分的代码表示形式。
5. 根据是否存在嵌套的条件表达式来确定是否需要递增/递减缩进级别。
6. 生成假值分支部分的代码表示形式。
7. 如果存在嵌套的条件表达式，则进行适当的缩进。
8. 如果需要换行，则进行适当的反缩进处理。

因此，`genConditionalExpression` 函数的作用是生成条件表达式的代码。它会根据条件表达式的属性生成正确的代码表示形式，并考虑到测试条件、真值分支和假值分支的处理。
 */
function genConditionalExpression(
  node: ConditionalExpression,
  context: CodegenContext
) {
  const { test, consequent, alternate, newline: needNewline } = node
  const { push, indent, deindent, newline } = context
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) {
    const needsParens = !isSimpleIdentifier(test.content)
    needsParens && push(`(`)
    genExpression(test, context)
    needsParens && push(`)`)
  } else {
    push(`(`)
    genNode(test, context)
    push(`)`)
  }
  needNewline && indent()
  context.indentLevel++
  needNewline || push(` `)
  push(`? `)
  genNode(consequent, context)
  context.indentLevel--
  needNewline && newline()
  needNewline || push(` `)
  push(`: `)
  const isNested = alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
  if (!isNested) {
    context.indentLevel++
  }
  genNode(alternate, context)
  if (!isNested) {
    context.indentLevel--
  }
  needNewline && deindent(true /* without newline */)
}
/**
 * 
 * @param node 
 * @param context
 * 这是一个名为 `genCacheExpression` 的函数，用于生成缓存表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `CacheExpression` 类型的对象，表示缓存表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑如下：

1. 获取缓存表达式的索引 `node.index` 和值 `node.value`。
2. 在代码中输出 `_cache[${node.index}] || (`，表示如果缓存中不存在对应的值，则执行后续的表达式。
3. 如果缓存表达式是一个 VNode（虚拟节点），则进行以下处理：
   - 调用 `helper(SET_BLOCK_TRACKING)` 函数将跟踪块设置为 -1，表示进入缓存模式。
   - 输出适当的缩进和换行。
4. 输出 `_cache[${node.index}] = `，表示将计算结果赋值给缓存。
5. 生成值部分的代码表示形式，调用 `genNode` 函数生成其代码表示形式。
6. 如果缓存表达式是一个 VNode，进行以下处理：
   - 输出逗号和换行。
   - 调用 `helper(SET_BLOCK_TRACKING)` 函数将跟踪块设置为 1，表示退出缓存模式。
   - 输出 `_cache[${node.index}]`，表示返回缓存的值。
   - 进行适当的反缩进处理。
7. 输出 `)`，表示缓存表达式的结束。

因此，`genCacheExpression` 函数的作用是生成缓存表达式的代码。它会根据缓存表达式的属性生成正确的代码表示形式，并考虑到是否是 VNode 的情况以及缓存值的设置和返回。
 */
function genCacheExpression(node: CacheExpression, context: CodegenContext) {
  const { push, helper, indent, deindent, newline } = context
  push(`_cache[${node.index}] || (`)
  if (node.isVNode) {
    indent()
    push(`${helper(SET_BLOCK_TRACKING)}(-1),`)
    newline()
  }
  push(`_cache[${node.index}] = `)
  genNode(node.value, context)
  if (node.isVNode) {
    push(`,`)
    newline()
    push(`${helper(SET_BLOCK_TRACKING)}(1),`)
    newline()
    push(`_cache[${node.index}]`)
    deindent()
  }
  push(`)`)
}
/**
 * 
 * @param node 
 * @param context
 * 这是一个名为 `genTemplateLiteral` 的函数，用于生成模板字面量表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `TemplateLiteral` 类型的对象，表示模板字面量的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑如下：

1. 输出模板字面量的起始标记字符 '`'。
2. 获取模板字面量的元素列表 `node.elements` 的长度。
3. 判断是否需要多行输出，如果元素数量超过 3 个，则设置 `multilines` 为 `true`。
4. 遍历元素列表，处理每个元素：
   - 如果元素是字符串，则输出其转义后的内容，使用正则表达式将字符 '`'、'$' 和 '\' 进行转义。
   - 如果元素不是字符串，则输出占位符 '${'。
     - 如果需要多行输出，进行适当的缩进。
     - 调用 `genNode` 函数生成占位符表达式的代码表示形式。
     - 如果需要多行输出，进行适当的反缩进。
     - 输出占位符结束标记 '}'。
5. 输出模板字面量的结束标记字符 '`'。

因此，`genTemplateLiteral` 函数的作用是生成模板字面量表达式的代码。它会根据模板字面量的元素列表生成正确的代码表示形式，并对字符串元素进行转义处理，以及对占位符进行适当的缩进处理。
 */
function genTemplateLiteral(node: TemplateLiteral, context: CodegenContext) {
  const { push, indent, deindent } = context
  push('`')
  const l = node.elements.length
  const multilines = l > 3
  for (let i = 0; i < l; i++) {
    const e = node.elements[i]
    if (isString(e)) {
      push(e.replace(/(`|\$|\\)/g, '\\$1'))
    } else {
      push('${')
      if (multilines) indent()
      genNode(e, context)
      if (multilines) deindent()
      push('}')
    }
  }
  push('`')
}
/**
 * 
 * @param node 
 * @param context
 * 这是一个名为 `genIfStatement` 的函数，用于生成条件语句（if语句）的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `IfStatement` 类型的对象，表示条件语句的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑如下：

1. 输出 `if (`，表示条件语句的起始部分。
2. 调用 `genNode` 函数生成条件表达式 `test` 的代码表示形式。
3. 输出 `) {`，表示条件语句的开始块。
4. 进行适当的缩进。
5. 调用 `genNode` 函数生成条件为真时执行的语句 `consequent` 的代码表示形式。
6. 进行适当的反缩进。
7. 输出 `}`，表示条件语句的结束块。
8. 如果存在 `alternate`（即有 `else` 分支）：
   - 输出 ` else `，表示 `else` 分支的开始部分。
   - 如果 `alternate` 是另一个条件语句（`JS_IF_STATEMENT` 类型），则递归调用 `genIfStatement` 处理该条件语句。
   - 否则，输出 `{`，表示 `else` 分支的开始块。
   - 进行适当的缩进。
   - 调用 `genNode` 函数生成 `alternate` 分支的代码表示形式。
   - 进行适当的反缩进。
   - 输出 `}`，表示 `else` 分支的结束块。

因此，`genIfStatement` 函数的作用是生成条件语句的代码。它会根据条件表达式、条件为真时的执行语句和可能存在的 `else` 分支生成正确的代码表示形式，并进行适当的缩进处理。如果 `else` 分支也是一个条件语句，则递归调用自身处理该条件语句。
 */
function genIfStatement(node: IfStatement, context: CodegenContext) {
  const { push, indent, deindent } = context
  const { test, consequent, alternate } = node
  push(`if (`)
  genNode(test, context)
  push(`) {`)
  indent()
  genNode(consequent, context)
  deindent()
  push(`}`)
  if (alternate) {
    push(` else `)
    if (alternate.type === NodeTypes.JS_IF_STATEMENT) {
      genIfStatement(alternate, context)
    } else {
      push(`{`)
      indent()
      genNode(alternate, context)
      deindent()
      push(`}`)
    }
  }
}
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `genAssignmentExpression` 的函数，用于生成赋值表达式的代码。

该函数接受两个参数 `node` 和 `context`，其中 `node` 是一个 `AssignmentExpression` 类型的对象，表示赋值表达式的节点，而 `context` 则是代码生成的上下文对象。

函数的逻辑如下：

1. 调用 `genNode` 函数生成赋值表达式左侧 `left` 的代码表示形式。
2. 在上下文中添加 ` = `，表示赋值操作符。
3. 调用 `genNode` 函数生成赋值表达式右侧 `right` 的代码表示形式。

因此，`genAssignmentExpression` 函数的作用是生成赋值表达式的代码。它会生成左侧表达式、赋值操作符和右侧表达式的代码表示形式，并将其添加到代码生成的上下文中。
 */
function genAssignmentExpression(
  node: AssignmentExpression,
  context: CodegenContext
) {
  genNode(node.left, context)
  context.push(` = `)
  genNode(node.right, context)
}
/**
 * 
 * @param node 
 * @param context
 * 该函数名为 `genSequenceExpression`，用于生成序列表达式的代码。

该函数接收两个参数 `node` 和 `context`，其中 `node` 是一个 `SequenceExpression` 类型的对象，表示序列表达式的节点，而 `context` 是代码生成的上下文对象。

函数的逻辑如下：

1. 在上下文中添加 `(`，表示序列表达式的开始。
2. 调用 `genNodeList` 函数生成序列表达式中各个子表达式的代码表示形式。
3. 在上下文中添加 `)`，表示序列表达式的结束。

因此，`genSequenceExpression` 函数的作用是生成序列表达式的代码。它会生成包裹在括号中的多个子表达式的代码表示形式，并将其添加到代码生成的上下文中。
 */
function genSequenceExpression(
  node: SequenceExpression,
  context: CodegenContext
) {
  context.push(`(`)
  genNodeList(node.expressions, context)
  context.push(`)`)
}
/**
 * 
 * @param param0 
 * @param context
 * 该函数名为 `genReturnStatement`，用于生成返回语句的代码。

该函数接收两个参数 `node` 和 `context`，其中 `node` 是一个 `ReturnStatement` 类型的对象，表示返回语句的节点，而 `context` 是代码生成的上下文对象。

函数的逻辑如下：

1. 在上下文中添加 `return `，表示返回语句的开始。
2. 判断 `returns` 是否为数组类型，如果是数组类型，则调用 `genNodeListAsArray` 函数生成多个返回值的代码表示形式；否则，调用 `genNode` 函数生成单个返回值的代码表示形式。
3. 将生成的返回值代码添加到代码生成的上下文中。

因此，`genReturnStatement` 函数的作用是生成返回语句的代码。它会生成带有 `return` 关键字和相应返回值的代码，并将其添加到代码生成的上下文中。
 */
function genReturnStatement(
  { returns }: ReturnStatement,
  context: CodegenContext
) {
  context.push(`return `)
  if (isArray(returns)) {
    genNodeListAsArray(returns, context)
  } else {
    genNode(returns, context)
  }
}
