import { TransformOptions } from './options'
import {
  RootNode,
  NodeTypes,
  ParentNode,
  TemplateChildNode,
  ElementNode,
  DirectiveNode,
  Property,
  ExpressionNode,
  createSimpleExpression,
  JSChildNode,
  SimpleExpressionNode,
  ElementTypes,
  CacheExpression,
  createCacheExpression,
  TemplateLiteral,
  createVNodeCall,
  ConstantTypes,
  ArrayExpression,
  convertToBlock
} from './ast'
import {
  isString,
  isArray,
  NOOP,
  PatchFlags,
  PatchFlagNames,
  EMPTY_OBJ,
  capitalize,
  camelize
} from '@vue/shared'
import { defaultOnError, defaultOnWarn } from './errors'
import {
  TO_DISPLAY_STRING,
  FRAGMENT,
  helperNameMap,
  CREATE_COMMENT
} from './runtimeHelpers'
import { isVSlot } from './utils'
import { hoistStatic, isSingleElementRoot } from './transforms/hoistStatic'
import { CompilerCompatOptions } from './compat/compatConfig'

// There are two types of transforms:
//
// - NodeTransform:
//   Transforms that operate directly on a ChildNode. NodeTransforms may mutate,
//   replace or remove the node being processed.
/**
 * `NodeTransform` 是一个类型别名，表示节点转换函数的类型。

节点转换函数接受两个参数：
- `node`：要进行转换的节点，可以是根节点 (`RootNode`) 或模板子节点 (`TemplateChildNode`)。
- `context`：转换上下文 (`TransformContext`)，包含了转换过程中的相关信息和工具方法。

节点转换函数可以有三种不同的返回值：
- `void`：表示转换过程没有副作用，不需要清理。
- `() => void`：表示转换过程有副作用，并返回一个函数，用于清理这些副作用。
- `() => void[]`：表示转换过程有多个副作用，并返回一个函数数组，每个函数都用于清理一个副作用。

节点转换函数的作用是根据指定的转换规则对节点进行修改、补充或优化。在编译过程中，节点会依次经过多个节点转换函数，每个函数对节点进行特定的处理。通过使用不同的节点转换函数，可以实现对节点的多种转换操作，例如静态优化、指令解析、模板扩展等。

在类型系统中，`NodeTransform` 用于约束节点转换函数的类型，以确保转换函数具有正确的参数和返回值。
 */
export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[]

// - DirectiveTransform:
//   Transforms that handles a single directive attribute on an element.
//   It translates the raw directive into actual props for the VNode.
/**
 * `DirectiveTransform` 是一个类型别名，表示指令转换函数的类型。

指令转换函数接受四个参数：
- `dir`：要进行转换的指令节点 (`DirectiveNode`)。
- `node`：指令所在的元素节点 (`ElementNode`)。
- `context`：转换上下文 (`TransformContext`)，包含了转换过程中的相关信息和工具方法。
- `augmentor`：一个可选的函数，用于在平台特定的编译器中导入基本转换函数并进行增强。它接受一个指令转换结果 (`DirectiveTransformResult`) 作为参数，并返回经过增强的指令转换结果 (`DirectiveTransformResult`)。

指令转换函数的返回值是指令转换结果 (`DirectiveTransformResult`)，表示对指令的转换操作结果。

指令转换函数的作用是根据指定的转换规则对指令进行修改、补充或优化。在编译过程中，指令节点会经过指令转换函数进行处理，转换函数可以根据指令的不同进行不同的转换操作，例如解析指令参数、生成相应的代码等。

在类型系统中，`DirectiveTransform` 用于约束指令转换函数的类型，以确保转换函数具有正确的参数和返回值。
 */
export type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
  // a platform specific compiler can import the base transform and augment
  // it by passing in this optional argument.
  augmentor?: (ret: DirectiveTransformResult) => DirectiveTransformResult
) => DirectiveTransformResult
/**
 * `DirectiveTransformResult` 是一个接口，表示指令转换函数的结果。

它包含以下属性：
- `props`：一个 `Property` 数组，表示指令转换后生成的属性列表。
- `needRuntime`：一个可选的属性，表示是否需要在运行时处理该指令。它可以是一个布尔值或一个符号 (`symbol`)。
- `ssrTagParts`：一个可选的属性，表示在服务端渲染 (SSR) 中使用的模板字面量 (`TemplateLiteral`) 的元素 (`elements`) 数组。

`props` 属性包含指令转换后生成的属性列表，每个属性 (`Property`) 包含属性名和属性值。

`needRuntime` 属性表示是否需要在运行时处理该指令。当该属性存在且为 `true` 或一个符号时，表示指令需要在运行时进行处理，通常需要引入相应的运行时帮助函数来实现指令的功能。

`ssrTagParts` 属性用于服务端渲染 (SSR) 场景，表示在 SSR 中使用的模板字面量的元素数组。在 SSR 中，将指令转换为模板字面量的一部分，以便在服务器端进行渲染。

通过定义 `DirectiveTransformResult` 接口，可以约束指令转换函数的返回结果，使其具有一致的结构和类型。这有助于编译器在后续的处理过程中正确地处理指令转换结果。
 */
export interface DirectiveTransformResult {
  props: Property[]
  needRuntime?: boolean | symbol
  ssrTagParts?: TemplateLiteral['elements']
}

// A structural directive transform is technically also a NodeTransform;
// Only v-if and v-for fall into this category.
/**
 * `StructuralDirectiveTransform` 是一个类型别名，用于表示结构性指令（例如 `v-if` 和 `v-for`）的转换函数。

它是一个函数类型，接受以下参数：

- `node`: `ElementNode` 类型，表示包含指令的元素节点。
- `dir`: `DirectiveNode` 类型，表示要转换的指令节点。
- `context`: `TransformContext` 类型，表示转换上下文，提供了转换过程中可能需要的信息和工具。

该函数可以返回以下三种类型之一：

1. `void`: 当转换成功时，函数可以不返回任何值。
2. `() => void`: 当转换涉及到代码生成时，可以返回一个函数，在适当的时候生成代码。
3. `(() => void)[]`: 当转换需要在多个地方生成代码时，可以返回一个函数数组，每个函数对应一个代码生成部分。

总之，`StructuralDirectiveTransform` 是一个处理结构性指令转换的函数类型，它可以在转换过程中执行代码生成，并将其作为函数返回。
 */
export type StructuralDirectiveTransform = (
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext
) => void | (() => void)
/**
 * `ImportItem` 是一个接口，用于表示导入项的信息。

它具有以下属性：

- `exp`: 表示导入项的名称或表达式。可以是一个字符串或一个 `ExpressionNode` 对象，用于表示导入项的表达式节点。
- `path`: 表示导入项的路径。它是一个字符串，表示从哪个路径导入该项。

通过 `ImportItem` 接口，可以描述一个导入项的名称或表达式以及它所在的路径。这在编译器或转换过程中经常用于处理模块导入和导出的语义。
 */
export interface ImportItem {
  exp: string | ExpressionNode
  path: string
}
/**
 * `TransformContext` 是一个接口，用于描述转换上下文的信息。

它继承了 `TransformOptions` 接口中除了 `filename` 和 `CompilerCompatOptions` 属性之外的所有属性，并添加了一些额外的属性。

`TransformContext` 接口具有以下属性：

- `selfName`: 表示当前上下文的名称。可以是一个字符串或 `null`。
- `root`: 表示 AST 的根节点。
- `helpers`: 表示转换过程中使用的辅助函数的映射。它是一个 `Map` 对象，用于存储辅助函数的符号和编号。
- `components`: 表示使用的组件集合。它是一个 `Set` 对象，存储组件的名称。
- `directives`: 表示使用的指令集合。它是一个 `Set` 对象，存储指令的名称。
- `hoists`: 表示提升的节点数组。每个节点可以是 `JSChildNode` 或 `null`。
- `imports`: 表示导入项的数组。每个导入项是一个 `ImportItem` 对象，包含导入项的名称或表达式以及导入路径的信息。
- `temps`: 表示临时变量的数量。
- `cached`: 表示缓存的数量。
- `identifiers`: 表示标识符的映射。每个标识符是一个字符串，对应的值是该标识符的编号。
- `scopes`: 表示作用域的计数器。它包含以下属性：
  - `vFor`: 表示 `v-for` 作用域的计数器。
  - `vSlot`: 表示 `v-slot` 作用域的计数器。
  - `vPre`: 表示 `v-pre` 作用域的计数器。
  - `vOnce`: 表示 `v-once` 作用域的计数器。
- `parent`: 表示当前节点的父节点，可以是 `ParentNode` 或 `null`。
- `childIndex`: 表示当前节点在父节点中的索引。
- `currentNode`: 表示当前处理的节点，可以是根节点、模板子节点或 `null`。
- `inVOnce`: 表示当前是否在 `v-once` 指令内部。
- `helper(name)`: 获取辅助函数的符号。
- `removeHelper(name)`: 移除指定名称的辅助函数。
- `helperString(name)`: 获取辅助函数的字符串表示。
- `replaceNode(node)`: 替换当前节点为指定节点。
- `removeNode(node)`: 移除当前节点或指定节点。
- `onNodeRemoved()`: 当节点被移除时触发的回调函数。
- `addIdentifiers(exp)`: 添加标识符的映射。
- `removeIdentifiers(exp)`: 移除标识符的映射。
- `hoist(exp)`: 将表达式或节点提升为简单表达式节点。
- `cache(exp,

 isVNode?)`: 缓存表达式或节点。如果 `isVNode` 为 `true`，则缓存为 `CacheExpression`，否则直接返回原表达式或节点。
- `constantCache`: 表示常量的缓存映射。每个键是模板子节点，对应的值是常量类型。

除了上述属性之外，`TransformContext` 还包含一些供 2.x 兼容性使用的属性。

通过使用 `TransformContext`，可以在转换过程中获取和操作相关的上下文信息，包括 AST 节点、辅助函数、导入项、作用域计数器等。
 */
export interface TransformContext
  extends Required<
      Omit<TransformOptions, 'filename' | keyof CompilerCompatOptions>
    >,
    CompilerCompatOptions {
  selfName: string | null
  root: RootNode
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  temps: number
  cached: number
  identifiers: { [name: string]: number | undefined }
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
  parent: ParentNode | null
  childIndex: number
  currentNode: RootNode | TemplateChildNode | null
  inVOnce: boolean
  helper<T extends symbol>(name: T): T
  removeHelper<T extends symbol>(name: T): void
  helperString(name: symbol): string
  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved(): void
  addIdentifiers(exp: ExpressionNode | string): void
  removeIdentifiers(exp: ExpressionNode | string): void
  hoist(exp: string | JSChildNode | ArrayExpression): SimpleExpressionNode
  cache<T extends JSChildNode>(exp: T, isVNode?: boolean): CacheExpression | T
  constantCache: Map<TemplateChildNode, ConstantTypes>

  // 2.x Compat only
  filters?: Set<string>
}
/**
 * 
 * @param root 
 * @param param1 
 * @returns 
 * `createTransformContext` 是一个函数，用于创建转换上下文对象。

它接受两个参数：`root` 和 `options`。其中，`root` 是 AST 的根节点，`options` 是一系列的选项和配置项。

`createTransformContext` 函数返回一个 `TransformContext` 对象，它包含了转换过程中的各种状态、选项和方法。

`TransformContext` 对象的属性和方法如下：

- `options`：包括了一系列的选项和配置项，如 `filename`、`prefixIdentifiers`、`hoistStatic` 等。
- `state`：包含了转换过程中的各种状态，如 `root`、`helpers`、`components`、`directives` 等。
- `methods`：包含了一些用于处理转换过程中的操作和逻辑的方法，如 `helper`、`removeHelper`、`helperString`、`replaceNode`、`removeNode` 等。

在创建 `TransformContext` 对象时，会根据传入的 `options` 进行初始化，包括设置选项的值、创建状态的初始值，并定义一些辅助方法和回调函数。

通过调用 `createTransformContext` 函数，可以创建一个转换上下文对象，用于在转换过程中存储和操作相关的信息和状态。
 */
export function createTransformContext(
  root: RootNode,
  {
    filename = '',
    prefixIdentifiers = false,
    hoistStatic = false,
    cacheHandlers = false,
    nodeTransforms = [],
    directiveTransforms = {},
    transformHoist = null,
    isBuiltInComponent = NOOP,
    isCustomElement = NOOP,
    expressionPlugins = [],
    scopeId = null,
    slotted = true,
    ssr = false,
    inSSR = false,
    ssrCssVars = ``,
    bindingMetadata = EMPTY_OBJ,
    inline = false,
    isTS = false,
    onError = defaultOnError,
    onWarn = defaultOnWarn,
    compatConfig
  }: TransformOptions
): TransformContext {
  const nameMatch = filename.replace(/\?.*$/, '').match(/([^/\\]+)\.\w+$/)
  const context: TransformContext = {
    // options
    selfName: nameMatch && capitalize(camelize(nameMatch[1])),
    prefixIdentifiers,
    hoistStatic,
    cacheHandlers,
    nodeTransforms,
    directiveTransforms,
    transformHoist,
    isBuiltInComponent,
    isCustomElement,
    expressionPlugins,
    scopeId,
    slotted,
    ssr,
    inSSR,
    ssrCssVars,
    bindingMetadata,
    inline,
    isTS,
    onError,
    onWarn,
    compatConfig,

    // state
    root,
    helpers: new Map(),
    components: new Set(),
    directives: new Set(),
    hoists: [],
    imports: [],
    constantCache: new Map(),
    temps: 0,
    cached: 0,
    identifiers: Object.create(null),
    scopes: {
      vFor: 0,
      vSlot: 0,
      vPre: 0,
      vOnce: 0
    },
    parent: null,
    currentNode: root,
    childIndex: 0,
    inVOnce: false,

    // methods
    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },
    removeHelper(name) {
      const count = context.helpers.get(name)
      if (count) {
        const currentCount = count - 1
        if (!currentCount) {
          context.helpers.delete(name)
        } else {
          context.helpers.set(name, currentCount)
        }
      }
    },
    helperString(name) {
      return `_${helperNameMap[context.helper(name)]}`
    },
    replaceNode(node) {
      /* istanbul ignore if */
      if (__DEV__) {
        if (!context.currentNode) {
          throw new Error(`Node being replaced is already removed.`)
        }
        if (!context.parent) {
          throw new Error(`Cannot replace root node.`)
        }
      }
      context.parent!.children[context.childIndex] = context.currentNode = node
    },
    removeNode(node) {
      if (__DEV__ && !context.parent) {
        throw new Error(`Cannot remove root node.`)
      }
      const list = context.parent!.children
      const removalIndex = node
        ? list.indexOf(node)
        : context.currentNode
        ? context.childIndex
        : -1
      /* istanbul ignore if */
      if (__DEV__ && removalIndex < 0) {
        throw new Error(`node being removed is not a child of current parent`)
      }
      if (!node || node === context.currentNode) {
        // current node removed
        context.currentNode = null
        context.onNodeRemoved()
      } else {
        // sibling node removed
        if (context.childIndex > removalIndex) {
          context.childIndex--
          context.onNodeRemoved()
        }
      }
      context.parent!.children.splice(removalIndex, 1)
    },
    onNodeRemoved: () => {},
    addIdentifiers(exp) {
      // identifier tracking only happens in non-browser builds.
      if (!__BROWSER__) {
        if (isString(exp)) {
          addId(exp)
        } else if (exp.identifiers) {
          exp.identifiers.forEach(addId)
        } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
          addId(exp.content)
        }
      }
    },
    removeIdentifiers(exp) {
      if (!__BROWSER__) {
        if (isString(exp)) {
          removeId(exp)
        } else if (exp.identifiers) {
          exp.identifiers.forEach(removeId)
        } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
          removeId(exp.content)
        }
      }
    },
    hoist(exp) {
      if (isString(exp)) exp = createSimpleExpression(exp)
      context.hoists.push(exp)
      const identifier = createSimpleExpression(
        `_hoisted_${context.hoists.length}`,
        false,
        exp.loc,
        ConstantTypes.CAN_HOIST
      )
      identifier.hoisted = exp
      return identifier
    },
    cache(exp, isVNode = false) {
      return createCacheExpression(context.cached++, exp, isVNode)
    }
  }
  /**
 * 在代码中的这个部分是在兼容模式下执行的条件语句。如果代码在兼容模式下运行（`__COMPAT__` 为真），则会为 `context` 对象添加一个名为 `filters` 的属性，并将其初始化为一个空的 Set。

这段代码的目的可能是为了在兼容模式下追踪和记录使用的过滤器。兼容模式可能与旧版本的 Vue.js 相关，其中过滤器是一种被废弃的功能。通过创建一个空的 Set，可以在遍历和解析 AST 节点时，将使用的过滤器添加到该 Set 中，以便后续进行一些特定的处理或警告。

请注意，兼容模式的具体含义和行为可能与所使用的具体版本和上下文相关。
 */
  if (__COMPAT__) {
    context.filters = new Set()
  }
  /**
 * 
 * @param id 
 * 这个函数用于向 `context.identifiers` 添加标识符（identifier）的计数。它接受一个字符串类型的 `id` 参数，将其作为标识符添加到 `context.identifiers` 对象中，并增加相应标识符的计数值。

具体的操作步骤如下：
- 首先，从 `context` 对象中解构出 `identifiers` 属性。
- 接着，检查 `identifiers` 对象中是否已存在 `id` 对应的属性，如果不存在（即 `identifiers[id]` 为 `undefined`），则将其初始化为 `0`。
- 最后，将 `id` 对应的计数值递增。

这个函数的目的可能是在 AST 转换过程中跟踪使用的标识符，并记录每个标识符的使用次数。这对于后续的处理或分析过程可能是有用的。
 */
  function addId(id: string) {
    const { identifiers } = context
    if (identifiers[id] === undefined) {
      identifiers[id] = 0
    }
    identifiers[id]!++
  }
  /**
 * 
 * @param id 
 * 这个函数用于从 `context.identifiers` 中移除标识符（identifier）的计数。它接受一个字符串类型的 `id` 参数，将其作为要移除的标识符。

具体的操作步骤如下：
- 首先，从 `context` 对象中获取 `identifiers` 属性。
- 然后，通过 `context.identifiers[id]--` 的方式将 `id` 对应的计数值减少1。

这个函数的目的可能是在 AST 转换过程中更新标识符的计数，当不再需要某个标识符时，可以通过调用该函数将其计数减少。这可能是为了在后续的处理或分析过程中准确跟踪标识符的使用情况。
 */
  function removeId(id: string) {
    context.identifiers[id]!--
  }

  return context
}
/**
 * 
 * @param root 
 * @param options 
 * 这是一个 AST 转换的函数 `transform`，它接受一个 AST 根节点 `root` 和一个 `options` 对象作为参数。

函数的主要流程如下：
1. 创建转换上下文 `context`，通过调用 `createTransformContext` 函数，并传入 `root` 和 `options`。
2. 对 AST 进行遍历，调用 `traverseNode` 函数，并传入 `root` 和 `context`，对节点进行转换。
3. 如果 `options.hoistStatic` 为 `true`，则调用 `hoistStatic` 函数，对静态节点进行提升。
4. 如果 `options.ssr` 不为 `true`，则调用 `createRootCodegen` 函数，生成根节点的代码生成。
5. 完成元信息的收集和整理，将相关信息存储在 `root` 对象的对应属性中。
6. 如果 `__COMPAT__` 为真，则将 `context.filters` 转换为数组，并存储在 `root.filters` 中。

这个函数的作用是对 AST 进行转换和处理，并最终生成一个可执行的代码表示。
 */
export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }
  if (!options.ssr) {
    createRootCodegen(root, context)
  }
  // finalize meta information
  root.helpers = new Set([...context.helpers.keys()])
  root.components = [...context.components]
  root.directives = [...context.directives]
  root.imports = context.imports
  root.hoists = context.hoists
  root.temps = context.temps
  root.cached = context.cached

  if (__COMPAT__) {
    root.filters = [...context.filters!]
  }
}
/**
 * 
 * @param root 
 * @param context 
 * 这是一个用于生成根节点的代码生成器函数 `createRootCodegen`，它接受根节点 `root` 和转换上下文 `context` 作为参数。

函数的主要流程如下：
1. 获取上下文中的 `helper` 函数。
2. 获取根节点的子节点数组 `children`。
3. 如果根节点只有一个子节点，并且该子节点是一个元素节点且具有 `codegenNode` 属性，则将其转换为块级节点。
4. 如果根节点有多个子节点，则生成一个片段块级节点。
5. 如果根节点没有子节点，则代码生成结果为 null。

函数的详细流程如下：
1. 如果根节点只有一个子节点，进入条件判断。
   - 如果子节点是单个元素节点，并且具有 `codegenNode` 属性，表示它可以生成代码，则将其转换为块级节点。
   - 如果子节点不满足上述条件，表示它是单个 `<slot>`、`IfNode` 或 `ForNode`，或者是单个文本节点，这些情况下子节点已经是块级节点或需要被修补，因此将子节点直接赋值给根节点的 `codegenNode` 属性。
2. 如果根节点有多个子节点，进入条件判断。
   - 生成一个片段块级节点，使用 `createVNodeCall` 函数创建一个 `block` 类型的 VNode 调用节点，并传入根节点的子节点数组作为参数。
   - 设置相应的补丁标记（`patchFlag`）和补丁标记文本（`patchFlagText`）。
   - 如果开发模式下，且片段只包含一个有效子节点和其他节点都是注释节点，则添加开发模式的补丁标记。
   - 将生成的片段块级节点赋值给根节点的 `codegenNode` 属性。
3. 如果根节点没有子节点，则不做任何处理，代码生成结果为 null。

这个函数的作用是根据根节点的情况生成相应的代码表示，用于表示根节点的渲染结果。
 */
function createRootCodegen(root: RootNode, context: TransformContext) {
  const { helper } = context
  const { children } = root
  if (children.length === 1) {
    const child = children[0]
    // if the single child is an element, turn it into a block.
    if (isSingleElementRoot(root, child) && child.codegenNode) {
      // single element root is never hoisted so codegenNode will never be
      // SimpleExpressionNode
      const codegenNode = child.codegenNode
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        convertToBlock(codegenNode, context)
      }
      root.codegenNode = codegenNode
    } else {
      // - single <slot/>, IfNode, ForNode: already blocks.
      // - single text node: always patched.
      // root codegen falls through via genNode()
      root.codegenNode = child
    }
  } else if (children.length > 1) {
    // root has multiple nodes - return a fragment block.
    let patchFlag = PatchFlags.STABLE_FRAGMENT
    let patchFlagText = PatchFlagNames[PatchFlags.STABLE_FRAGMENT]
    // check if the fragment actually contains a single valid child with
    // the rest being comments
    if (
      __DEV__ &&
      children.filter(c => c.type !== NodeTypes.COMMENT).length === 1
    ) {
      patchFlag |= PatchFlags.DEV_ROOT_FRAGMENT
      patchFlagText += `, ${PatchFlagNames[PatchFlags.DEV_ROOT_FRAGMENT]}`
    }
    root.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      root.children,
      patchFlag + (__DEV__ ? ` /* ${patchFlagText} */` : ``),
      undefined,
      undefined,
      true,
      undefined,
      false /* isComponent */
    )
  } else {
    // no children = noop. codegen will return null.
  }
}
/**
 * 
 * @param parent 
 * @param context 
 * 这是一个用于遍历父节点的子节点的函数 `traverseChildren`，它接受父节点 `parent` 和转换上下文 `context` 作为参数。

函数的主要流程如下：
1. 定义一个变量 `i` 并初始化为 0，用于追踪当前遍历到的子节点索引。
2. 定义一个函数 `nodeRemoved`，用于在节点被移除时更新索引 `i`。
3. 使用 `for` 循环遍历父节点的子节点数组。
4. 获取当前遍历到的子节点 `child`。
5. 如果子节点是字符串类型，则继续下一次循环，不对其进行处理。
6. 将当前子节点的父节点和索引保存到上下文中，以便在子节点的遍历过程中使用。
7. 将 `nodeRemoved` 函数设置为上下文中的 `onNodeRemoved` 属性，以便在子节点被移除时更新索引 `i`。
8. 调用 `traverseNode` 函数遍历当前子节点，并传入上下文 `context`。
9. 循环结束后，所有子节点都被遍历处理完毕。

这个函数的作用是遍历父节点的子节点，并对每个子节点调用 `traverseNode` 函数进行进一步的遍历处理。函数还处理了子节点被移除时更新索引的逻辑。
 */
export function traverseChildren(
  parent: ParentNode,
  context: TransformContext
) {
  let i = 0
  const nodeRemoved = () => {
    i--
  }
  for (; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (isString(child)) continue
    context.parent = parent
    context.childIndex = i
    context.onNodeRemoved = nodeRemoved
    traverseNode(child, context)
  }
}
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * 这是一个用于遍历节点的函数 `traverseNode`，它接受节点 `node` 和转换上下文 `context` 作为参数。

函数的主要流程如下：
1. 将当前遍历的节点 `node` 赋值给上下文的 `currentNode` 属性，以便在后续的处理中可以获取到当前节点。
2. 遍历转换插件数组 `nodeTransforms`，对每个插件调用并获取可能的退出函数 `onExit`。
3. 如果 `onExit` 存在，则将其添加到 `exitFns` 数组中。如果 `onExit` 是数组，则将其展开后添加到 `exitFns`。
4. 检查当前节点是否被移除，如果是，则直接返回，结束节点的遍历。
5. 如果当前节点发生了替换，则将替换后的节点更新为当前节点，以便在后续的处理中使用。
6. 根据节点类型执行相应的处理逻辑：
   - 对于注释节点 (NodeTypes.COMMENT)，如果不是在服务端渲染模式下，则注入 `CREATE_COMMENT` 辅助函数的导入。
   - 对于插值节点 (NodeTypes.INTERPOLATION)，如果不是在服务端渲染模式下，则注入 `TO_DISPLAY_STRING` 辅助函数的导入。
   - 对于容器类型的节点 (NodeTypes.IF、NodeTypes.IF_BRANCH、NodeTypes.FOR、NodeTypes.ELEMENT、NodeTypes.ROOT)，继续向下遍历其子节点，调用 `traverseChildren` 函数。
7. 执行退出函数 `exitFns`，倒序调用每个退出函数。

该函数的作用是遍历节点并执行相应的转换插件，处理节点的不同类型以及子节点。它还负责维护和更新上下文中的 `currentNode` 属性，以及执行退出函数。
 */
export function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  // apply transform plugins
  const { nodeTransforms } = context
  const exitFns = []
  for (let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (!context.currentNode) {
      // node was removed
      return
    } else {
      // node may have been replaced
      node = context.currentNode
    }
  }

  switch (node.type) {
    case NodeTypes.COMMENT:
      if (!context.ssr) {
        // inject import for the Comment symbol, which is needed for creating
        // comment nodes with `createVNode`
        context.helper(CREATE_COMMENT)
      }
      break
    case NodeTypes.INTERPOLATION:
      // no need to traverse, but we need to inject toString helper
      if (!context.ssr) {
        context.helper(TO_DISPLAY_STRING)
      }
      break

    // for container types, further traverse downwards
    case NodeTypes.IF:
      for (let i = 0; i < node.branches.length; i++) {
        traverseNode(node.branches[i], context)
      }
      break
    case NodeTypes.IF_BRANCH:
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }

  // exit transforms
  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
/**
 * 
 * @param name 
 * @param fn 
 * @returns 
 * 这是一个用于创建结构指令转换的函数 `createStructuralDirectiveTransform`，它接受指令名称或正则表达式 `name` 和结构指令转换函数 `fn` 作为参数，并返回一个节点转换函数 `NodeTransform`。

函数的主要流程如下：
1. 根据 `name` 的类型创建匹配函数 `matches`。如果 `name` 是字符串，则匹配函数检查节点的名称是否与 `name` 相等；如果 `name` 是正则表达式，则匹配函数通过正则表达式测试节点的名称是否匹配。
2. 返回一个节点转换函数，该函数接受节点 `node` 和转换上下文 `context` 作为参数。
3. 如果节点类型是元素节点 (NodeTypes.ELEMENT)：
   - 获取节点的属性列表 `props`。
   - 如果节点是模板元素 (ElementTypes.TEMPLATE) 并且存在具名插槽属性 (isVSlot)，则直接返回，不处理结构指令。因为插槽的处理在单独的文件 vSlot.ts 中进行。
   - 初始化退出函数数组 `exitFns`。
   - 遍历属性列表，对每个属性执行以下逻辑：
     - 如果属性是指令节点 (NodeTypes.DIRECTIVE) 并且与 `name` 匹配，则执行以下操作：
       - 移除当前属性，避免无限递归。为了能够在属性移动节点后继续遍历自身，需要在应用转换之前移除属性。
       - 将索引 `i` 减一，以便在下一次遍历中继续处理下一个属性。
       - 调用结构指令转换函数 `fn`，并将节点、属性和上下文作为参数传递。
       - 如果返回了退出函数 `onExit`，则将其添加到 `exitFns` 数组中。
   - 返回退出函数数组 `exitFns`。

该函数的作用是创建一个结构指令转换函数，用于在节点转换过程中查找并处理匹配的结构指令。它会遍历元素节点的属性列表，找到匹配的结构指令属性并将其移除，然后调用结构指令转换函数对节点进行进一步的处理。最后，返回一个包含退出函数的数组，这些函数将在节点的转换过程结束后执行。
 */
export function createStructuralDirectiveTransform(
  name: string | RegExp,
  fn: StructuralDirectiveTransform
): NodeTransform {
  const matches = isString(name)
    ? (n: string) => n === name
    : (n: string) => name.test(n)

  return (node, context) => {
    if (node.type === NodeTypes.ELEMENT) {
      const { props } = node
      // structural directive transforms are not concerned with slots
      // as they are handled separately in vSlot.ts
      if (node.tagType === ElementTypes.TEMPLATE && props.some(isVSlot)) {
        return
      }
      const exitFns = []
      for (let i = 0; i < props.length; i++) {
        const prop = props[i]
        if (prop.type === NodeTypes.DIRECTIVE && matches(prop.name)) {
          // structural directives are removed to avoid infinite recursion
          // also we remove them *before* applying so that it can further
          // traverse itself in case it moves the node around
          props.splice(i, 1)
          i--
          const onExit = fn(node, prop, context)
          if (onExit) exitFns.push(onExit)
        }
      }
      return exitFns
    }
  }
}
