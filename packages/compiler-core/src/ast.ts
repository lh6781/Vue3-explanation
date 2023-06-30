import { isString } from '@vue/shared'
import { ForParseResult } from './transforms/vFor'
import {
  RENDER_SLOT,
  CREATE_SLOTS,
  RENDER_LIST,
  OPEN_BLOCK,
  FRAGMENT,
  WITH_DIRECTIVES,
  WITH_MEMO,
  CREATE_VNODE,
  CREATE_ELEMENT_VNODE,
  CREATE_BLOCK,
  CREATE_ELEMENT_BLOCK
} from './runtimeHelpers'
import { PropsExpression } from './transforms/transformElement'
import { ImportItem, TransformContext } from './transform'

// Vue template is a platform-agnostic superset of HTML (syntax only).
// More namespaces like SVG and MathML are declared by platform specific
// compilers.
/**
 * `Namespace` 是一个类型别名，表示命名空间的类型，它是一个数字类型。

在这个上下文中，`Namespace` 可能用于表示命名空间的标识或索引。具体的含义和用法可能会依赖于具体的代码实现。
 */
export type Namespace = number
/**
 * `Namespaces` 是一个枚举类型，其中包含一个枚举常量 `HTML`。枚举常量表示不同的命名空间。

在这个特定的枚举中，`HTML` 常量表示 HTML 命名空间。命名空间是用于区分不同类型的 XML 元素或属性的逻辑容器。在处理 XML 或 HTML 文档时，命名空间可用于确定元素或属性的含义和语义。

枚举常量可通过 `Namespaces.HTML` 进行访问。例如，可以使用 `Namespaces.HTML` 来表示 HTML 命名空间。
 */
export const enum Namespaces {
  HTML
}
// 节点类型的枚举值
/**
  *ROOT：根节点
  *ELEMENT：元素节点
  TEXT：文本节点
  COMMENT：注释节点
  SIMPLE_EXPRESSION：简单表达式节点
  INTERPOLATION：插值节点
  ATTRIBUTE：属性节点
  DIRECTIVE：指令节点
  COMPOUND_EXPRESSION：复合表达式节点
  IF：条件语句节点
  IF_BRANCH：条件分支节点
  FOR：循环节点
  TEXT_CALL：文本调用节点
  VNODE_CALL：虚拟节点调用节点
  JS_CALL_EXPRESSION：JavaScript 调用表达式节点
  JS_OBJECT_EXPRESSION：JavaScript 对象表达式节点
  JS_PROPERTY：JavaScript 属性节点
  JS_ARRAY_EXPRESSION：JavaScript 数组表达式节点
  JS_FUNCTION_EXPRESSION：JavaScript 函数表达式节点
  JS_CONDITIONAL_EXPRESSION：JavaScript 条件表达式节点
  JS_CACHE_EXPRESSION：JavaScript 缓存表达式节点
  JS_BLOCK_STATEMENT：JavaScript 块语句节点
  JS_TEMPLATE_LITERAL：JavaScript 模板字符串节点
  JS_IF_STATEMENT：JavaScript 条件语句节点
  JS_ASSIGNMENT_EXPRESSION：JavaScript 赋值表达式节点
  JS_SEQUENCE_EXPRESSION：JavaScript 序列表达式节点
  JS_RETURN_STATEMENT：JavaScript 返回语句节点
 */
export const enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT
}
/**
ELEMENT：普通元素类型，表示普通的 HTML 元素。
COMPONENT：组件元素类型，表示组件元素。
SLOT：插槽元素类型，表示插槽元素。
TEMPLATE：模板元素类型，表示模板元素。
 */
export const enum ElementTypes {
  ELEMENT,
  COMPONENT,
  SLOT,
  TEMPLATE
}
/**
type: NodeTypes：表示节点的类型，是一个枚举值，用于标识不同类型的节点。
loc: SourceLocation：表示节点在源代码中的位置信息，是一个 SourceLocation 类型的对象，用于记录节点在源代码中的起始位置和结束位置。
 */
export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// The node's range. The `start` is inclusive and `end` is exclusive.
// [start, end)
/**
start: Position：表示代码片段的起始位置，是一个 Position 类型的对象。
end: Position：表示代码片段的结束位置，也是一个 Position 类型的对象。
source: string：表示源代码的路径或标识，通常是一个文件路径或模块标识符的字符串。
*/
export interface SourceLocation {
  start: Position
  end: Position
  source: string
}
/**
offset: number：表示代码中的字符偏移量。
line: number：表示代码中的行号。
column: number：表示代码中的列号。
 */
export interface Position {
  offset: number // from start of file
  line: number
  column: number
}
/**
 * 代码定义了一个类型别名 ParentNode，它表示具有子节点的节点类型。

ParentNode 可以是以下几种节点类型之一：

RootNode：根节点，表示整个代码的根节点。

ElementNode：元素节点，表示 HTML 或组件元素。

IfBranchNode：条件分支节点，表示 v-if 或 v-else-if 分支。

ForNode：v-for 循环节点，表示循环遍历的节点。

这些节点都可以拥有子节点，因此它们都属于 ParentNode 类型。在编译器或代码生成过程中，需要对具有子节点的节点进行特殊处理，例如遍历子节点、生成相应的代码等。通过定义 ParentNode 类型别名，可以在代码中明确指定具有子节点的节点类型，方便进行相关的处理和操作。
 */
export type ParentNode = RootNode | ElementNode | IfBranchNode | ForNode
/**
 * 代码定义了一个类型别名 ExpressionNode，它表示表达式节点的类型。

ExpressionNode 可以是以下两种节点类型之一：

SimpleExpressionNode：简单表达式节点，表示模板中的简单表达式，如插值表达式、属性绑定等。

CompoundExpressionNode：复合表达式节点，表示由多个子节点组成的复杂表达式，如含有运算符、函数调用等复杂逻辑的表达式。

这两种节点类型都属于 ExpressionNode，表示模板中的表达式。通过定义 ExpressionNode 类型别名，可以在代码中统一处理表达式节点，无论是简单表达式还是复合表达式，都可以使用 ExpressionNode 类型进行引用和操作。这样可以方便地对模板中的表达式进行解析、转换和生成相应的代码。
 */
export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode
/**
 * 定义了一个类型别名 TemplateChildNode，它表示模板的子节点类型。

TemplateChildNode 可以是以下几种节点类型之一：

ElementNode：元素节点，表示 HTML 或组件元素。

InterpolationNode：插值节点，表示模板中的插值表达式，如 {{ value }}。

CompoundExpressionNode：复合表达式节点，表示由多个子节点组成的复杂表达式。

TextNode：文本节点，表示模板中的纯文本内容。

CommentNode：注释节点，表示模板中的注释内容。

IfNode：条件节点，表示 v-if 条件语句。

IfBranchNode：条件分支节点，表示 v-if 或 v-else-if 分支。

ForNode：v-for 循环节点，表示循环遍历的节点。

TextCallNode：文本调用节点，表示通过 v-slot 或 v-text 指令生成的文本节点。

通过定义 TemplateChildNode 类型别名，可以在代码中明确指定模板的子节点类型，方便进行相关的处理和操作。在模板解析、编译和代码生成过程中，可以根据子节点的类型进行相应的处理，例如遍历、转换和生成相应的代码片段。
 */
export type TemplateChildNode =
  | ElementNode
  | InterpolationNode
  | CompoundExpressionNode
  | TextNode
  | CommentNode
  | IfNode
  | IfBranchNode
  | ForNode
  | TextCallNode
/**
 * 代码定义了一个接口 RootNode，它描述了模板的根节点的属性和结构。

RootNode 接口具有以下属性：

type: NodeTypes.ROOT：表示节点的类型为根节点（NodeTypes.ROOT）。

children: TemplateChildNode[]：表示根节点的子节点列表。子节点是模板中的各种节点类型，如元素节点、插值节点、文本节点等。

helpers: Set<symbol>：表示在模板中使用的帮助函数的集合。帮助函数是在编译过程中用于辅助生成代码的函数。

components: string[]：表示在模板中使用的组件的名称列表。

directives: string[]：表示在模板中使用的指令的名称列表。

hoists: (JSChildNode | null)[]：表示在编译过程中提升的节点列表。这些节点可以被提取到父级作用域以减少重复计算。

imports: ImportItem[]：表示模板中使用的导入项的列表。导入项用于引入外部模块或变量。

cached: number：表示模板中缓存的节点数量。

temps: number：表示模板中临时变量的数量。

ssrHelpers?: symbol[]：表示在服务器端渲染（SSR）中使用的帮助函数的符号列表。

codegenNode?: TemplateChildNode | JSChildNode | BlockStatement：表示根节点的代码生成节点。在代码生成阶段，根据模板的结构和属性生成相应的代码节点。

filters?: string[]：仅用于 v2 兼容性，表示在模板中使用的过滤器的名称列表。

通过这些属性，RootNode 接口描述了模板的根节点的结构和属性，用于在编译器的各个阶段对模板进行解析、转换和生成相应的代码。根节点是模板的顶层节点，包含了模板的整体信息和组成部分，是整个编译过程的入口点。
 */
export interface RootNode extends Node {
  type: NodeTypes.ROOT
  children: TemplateChildNode[]
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  cached: number
  temps: number
  ssrHelpers?: symbol[]
  codegenNode?: TemplateChildNode | JSChildNode | BlockStatement

  // v2 compat only
  filters?: string[]
}
/**
定义了一个类型别名 ElementNode，它可以是以下四种类型之一：PlainElementNode、ComponentNode、SlotOutletNode、TemplateNode。
PlainElementNode 表示普通的元素节点，即非组件、非插槽和非模板节点的元素。
ComponentNode 表示组件节点，用于表示在模板中使用的组件。
SlotOutletNode 表示插槽节点，用于表示插槽的内容。
TemplateNode 表示模板节点，用于表示模板的内容。
 */
export type ElementNode =
  | PlainElementNode
  | ComponentNode
  | SlotOutletNode
  | TemplateNode
/**
type: NodeTypes.ELEMENT：表示节点类型为元素节点。
ns: Namespace：表示节点的命名空间。
tag: string：表示元素节点的标签名称。
tagType: ElementTypes：表示元素节点的类型，可以是元素、组件或插槽。
isSelfClosing: boolean：表示元素节点是否是自闭合的。
props: Array<AttributeNode | DirectiveNode>：表示元素节点的属性列表，其中每个属性可以是属性节点（AttributeNode）或指令节点（DirectiveNode）。
children: TemplateChildNode[]：表示元素节点的子节点列表，其中每个子节点可以是模板子节点（TemplateChildNode）的任意一种类型。
 */
export interface BaseElementNode extends Node {
  type: NodeTypes.ELEMENT
  ns: Namespace
  tag: string
  tagType: ElementTypes
  isSelfClosing: boolean
  props: Array<AttributeNode | DirectiveNode>
  children: TemplateChildNode[]
}
/**
tagType: ElementTypes.ELEMENT：表示节点的标签类型为普通元素（ElementTypes.ELEMENT）。
codegenNode: VNodeCall | SimpleExpressionNode | CacheExpression | MemoExpression | undefined：表示节点在代码生成阶段的表达式节点。它可以是 VNodeCall、SimpleExpressionNode、CacheExpression、MemoExpression 或 undefined 的联合类型。在代码生成阶段，这些节点用于生成普通元素的虚拟节点调用表达式。
ssrCodegenNode?: TemplateLiteral：表示在服务器端渲染（SSR）代码生成阶段的模板字面量节点。它可以是 TemplateLiteral 类型或者可选的 undefined。在 SSR 情况下，这个属性用于生成普通元素的模板字面量。
 */
export interface PlainElementNode extends BaseElementNode {
  tagType: ElementTypes.ELEMENT
  codegenNode:
    | VNodeCall
    | SimpleExpressionNode // when hoisted
    | CacheExpression // when cached by v-once
    | MemoExpression // when cached by v-memo
    | undefined
  ssrCodegenNode?: TemplateLiteral
}
/**
tagType: ElementTypes.COMPONENT：表示节点的标签类型为组件（ElementTypes.COMPONENT）。
codegenNode: VNodeCall | CacheExpression | MemoExpression | undefined：表示节点在代码生成阶段的表达式节点。它可以是 VNodeCall、CacheExpression、MemoExpression 或 undefined 的联合类型。在代码生成阶段，这些节点用于生成组件的虚拟节点调用表达式。
ssrCodegenNode?: CallExpression：表示在服务器端渲染（SSR）代码生成阶段的表达式节点。它可以是 CallExpression 类型或者可选的 undefined。在 SSR 情况下，这个属性用于生成组件的调用表达式。
 */
export interface ComponentNode extends BaseElementNode {
  tagType: ElementTypes.COMPONENT
  codegenNode:
    | VNodeCall
    | CacheExpression // when cached by v-once
    | MemoExpression // when cached by v-memo
    | undefined
  ssrCodegenNode?: CallExpression
}
/**
 * 代码定义了一个接口 SlotOutletNode，它描述了插槽节点的属性和结构。

SlotOutletNode 接口具有以下属性：

tagType: ElementTypes.SLOT：表示节点的类型为插槽节点（ElementTypes.SLOT）。

codegenNode: RenderSlotCall | CacheExpression | undefined：表示在代码生成阶段生成的节点。它可以是 RenderSlotCall，用于渲染插槽内容的调用；也可以是 CacheExpression，表示该插槽节点被缓存（通过 v-once 指令）；或者是 undefined，表示没有生成相应的代码节点。

ssrCodegenNode?: CallExpression：在服务器端渲染（SSR）中生成的代码节点。

SlotOutletNode 是基于基本元素节点（BaseElementNode）的扩展，因此它继承了基本元素节点的属性和结构。插槽节点用于在组件模板中定义插槽，并根据插槽的名称和内容进行渲染。通过 SlotOutletNode 接口的定义，可以在编译过程中对插槽节点进行处理和生成相应的代码。
 */
export interface SlotOutletNode extends BaseElementNode {
  tagType: ElementTypes.SLOT
  codegenNode:
    | RenderSlotCall
    | CacheExpression // when cached by v-once
    | undefined
  ssrCodegenNode?: CallExpression
}
/**
 * 代码定义了一个接口 TemplateNode，它描述了模板节点的属性和结构。

TemplateNode 接口具有以下属性：

tagType: ElementTypes.TEMPLATE：表示节点的类型为模板节点（ElementTypes.TEMPLATE）。

codegenNode: undefined：表示在代码生成阶段不生成相应的代码节点。模板节点是一个容器类型，它在编译过程中被编译器处理，并不直接生成代码。

TemplateNode 是基于基本元素节点（BaseElementNode）的扩展，因此它继承了基本元素节点的属性和结构。模板节点用于表示模板中的模板标记，它作为一个容器节点在编译过程中被处理和解析，但不会生成具体的代码节点。模板节点可以包含其他各种节点类型，如元素节点、插值节点、条件节点等。通过定义 TemplateNode 接口，可以在编译过程中对模板节点进行识别和处理，以支持模板的组织和嵌套结构。
 */
export interface TemplateNode extends BaseElementNode {
  tagType: ElementTypes.TEMPLATE
  // TemplateNode is a container type that always gets compiled away
  codegenNode: undefined
}
/**
 * 上面的代码定义了一个接口 TextNode，它描述了文本节点的属性和结构。

TextNode 接口具有以下属性：

type: NodeTypes.TEXT：表示节点的类型为文本节点（NodeTypes.TEXT）。

content: string：表示文本节点的内容。

文本节点用于表示模板中的文本内容，例如在 HTML 中的纯文本或标签之间的文本内容。通过 TextNode 接口的定义，可以在编译过程中对文本节点进行处理和生成相应的代码。文本节点是模板中的一个基本构建块，用于呈现静态文本内容。
 */
export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}
/**
 * 定义了一个接口 CommentNode，它描述了注释节点的属性和结构。

CommentNode 接口具有以下属性：

type: NodeTypes.COMMENT：表示节点的类型为注释节点（NodeTypes.COMMENT）。

content: string：表示注释节点的内容。

注释节点用于表示模板中的注释内容，例如在 HTML 中的注释部分。通过 CommentNode 接口的定义，可以在编译过程中对注释节点进行处理和生成相应的代码。注释节点在模板中起到注释和说明的作用，不会直接渲染到最终的输出中。
 */
export interface CommentNode extends Node {
  type: NodeTypes.COMMENT
  content: string
}
/**
 * 定义了一个接口 AttributeNode，它描述了属性节点的属性和结构。

AttributeNode 接口具有以下属性：

type: NodeTypes.ATTRIBUTE：表示节点的类型为属性节点（NodeTypes.ATTRIBUTE）。

name: string：表示属性节点的名称。

value: TextNode | undefined：表示属性节点的值。它可以是一个文本节点（TextNode），表示属性的具体值；或者是 undefined，表示属性没有具体的值。

属性节点用于表示元素节点的属性，例如在 HTML 中的标签属性。通过 AttributeNode 接口的定义，可以在编译过程中对属性节点进行处理和生成相应的代码。属性节点可以包含属性的名称和值，它们用于定义元素的特性和行为。
 */
export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
}
/**
 *定义了一个接口 DirectiveNode，它描述了指令节点的属性和结构。

DirectiveNode 接口具有以下属性：

type: NodeTypes.DIRECTIVE：表示节点的类型为指令节点（NodeTypes.DIRECTIVE）。

name: string：表示指令节点的名称。

exp: ExpressionNode | undefined：表示指令节点的表达式，即指令的参数部分。它可以是一个表达式节点（ExpressionNode），表示指令的参数值；或者是 undefined，表示指令没有具体的参数。

arg: ExpressionNode | undefined：表示指令节点的修饰符，即指令的修饰部分。它可以是一个表达式节点（ExpressionNode），表示指令的修饰符值；或者是 undefined，表示指令没有具体的修饰符。

modifiers: string[]：表示指令节点的修饰符数组，包含了指令的所有修饰符。

parseResult?: ForParseResult：可选属性，用于缓存解析 v-for 指令时的解析结果。

指令节点用于表示模板中的指令，例如在 Vue 模板中的 v-bind、v-if、v-for 等指令。通过 DirectiveNode 接口的定义，可以在编译过程中对指令节点进行处理和生成相应的代码。指令节点包含了指令的名称、参数、修饰符等信息，用于指定元素的特定行为和逻辑。
 */
export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  name: string
  exp: ExpressionNode | undefined
  arg: ExpressionNode | undefined
  modifiers: string[]
  /**
   * optional property to cache the expression parse result for v-for
   */
  parseResult?: ForParseResult
}

/**
 * Static types have several levels.
 * Higher levels implies lower levels. e.g. a node that can be stringified
 * can always be hoisted and skipped for patch.
 *
 * 定义了一个常量枚举 ConstantTypes，它包含了四个常量值。

每个常量值表示了不同的常量类型，用于在编译器和代码生成器中标识和区分表达式的特征和处理方式。

以下是 ConstantTypes 中定义的常量值及其含义：

NOT_CONSTANT = 0：表示表达式不是常量，即表达式的值可能在运行时进行计算或动态变化。

CAN_SKIP_PATCH：表示表达式是常量，且在渲染过程中可以跳过更新阶段的 patch 操作。这意味着表达式的值在整个渲染过程中保持不变，不需要重新计算和更新。

CAN_HOIST：表示表达式是常量，并且可以在编译阶段进行提升（hoist）。这意味着表达式的值可以在编译阶段进行计算，并在渲染过程中重复使用，从而提高性能。

CAN_STRINGIFY：表示表达式是常量，并且可以在代码生成阶段进行字符串化（stringify）。这意味着表达式的值可以直接作为静态字符串插入生成的代码中，而不需要在运行时进行计算。

通过使用这些常量类型，编译器可以根据表达式的特征和常量类型进行不同的处理和优化，从而提高代码生成的效率和执行的性能。常量类型的定义可以帮助编译器识别和处理不同类型的表达式，并选择合适的优化策略。
 */
export const enum ConstantTypes {
  NOT_CONSTANT = 0,
  CAN_SKIP_PATCH,
  CAN_HOIST,
  CAN_STRINGIFY
}
/**
 *定义了一个接口 SimpleExpressionNode，它描述了简单表达式节点的属性和结构。

SimpleExpressionNode 接口具有以下属性：

type: NodeTypes.SIMPLE_EXPRESSION：表示节点的类型为简单表达式（NodeTypes.SIMPLE_EXPRESSION）。

content: string：表示节点的内容，即表达式的文本内容。

isStatic: boolean：表示节点是否为静态表达式。如果为 true，则表示表达式是静态的，不会在运行时进行计算。

constType: ConstantTypes：表示节点的常量类型，用于进一步标识表达式的特征。常量类型是一个枚举值，用于指示表达式的具体类型。

hoisted?: JSChildNode：表示该简单表达式节点是否为 hoist vnode 调用的标识符，并指向 hoisted 节点。

identifiers?: string[]：表示在函数体内声明的标识符列表，用于跟踪函数参数中的标识符。

isHandlerKey?: boolean：表示该简单表达式节点是否为事件处理器的键。
通过定义这些属性，SimpleExpressionNode 接口描述了简单表达式节点的特征和结构。简单表达式节点代表了模板中的一个简单的、静态的表达式，如插值表达式、属性绑定等。编译器可以使用 SimpleExpressionNode 接口来表示和操作简单表达式节点，并在编译器的代码生成阶段生成相应的代码或执行相应的逻辑。
 */
export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
  constType: ConstantTypes
  /**
   * Indicates this is an identifier for a hoist vnode call and points to the
   * hoisted node.
   */
  hoisted?: JSChildNode
  /**
   * an expression parsed as the params of a function will track
   * the identifiers declared inside the function body.
   */
  identifiers?: string[]
  isHandlerKey?: boolean
}
/**
 * 定义了一个接口 InterpolationNode，它描述了插值节点的属性和结构。

InterpolationNode 接口具有以下属性：

type: NodeTypes.INTERPOLATION：表示节点的类型为插值节点（NodeTypes.INTERPOLATION）。

content: ExpressionNode：表示插值节点的内容，即插值表达式的表达式部分。它是一个表达式节点（ExpressionNode），用于表示插值表达式的具体内容。

插值节点用于表示模板中的插值表达式，例如在 Vue 模板中的双大括号插值 {{ expression }}。通过 InterpolationNode 接口的定义，可以在编译过程中对插值节点进行处理和生成相应的代码。插值节点将表达式部分包裹在双大括号中，用于在模板中动态地展示表达式的结果。
 */
export interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: ExpressionNode
}
/**
 *定义了一个接口 CompoundExpressionNode，它描述了复合表达式节点的属性和结构。

CompoundExpressionNode 接口具有以下属性：

type: NodeTypes.COMPOUND_EXPRESSION：表示节点的类型为复合表达式节点（NodeTypes.COMPOUND_EXPRESSION）。

children: (...)[]：表示复合表达式节点的子节点数组。子节点可以是简单表达式节点（SimpleExpressionNode）、复合表达式节点（CompoundExpressionNode）、插值节点（InterpolationNode）、文本节点（TextNode）、字符串、符号等。

identifiers?: string[]：可选属性，用于跟踪函数体内声明的标识符。当一个表达式作为函数的参数解析时，可以通过 identifiers 属性记录函数体内声明的标识符。

isHandlerKey?: boolean：可选属性，用于表示复合表达式节点是否作为事件处理器的键。

复合表达式节点用于表示复杂的表达式结构，例如在模板中的动态属性、动态指令等。通过 CompoundExpressionNode 接口的定义，可以在编译过程中对复合表达式节点进行处理和生成相应的代码。复合表达式节点由多个子节点组成，可以是简单表达式、插值、文本等多种类型的节点，用于构建复杂的表达式逻辑。
 */
export interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (
    | SimpleExpressionNode
    | CompoundExpressionNode
    | InterpolationNode
    | TextNode
    | string
    | symbol
  )[]

  /**
   * an expression parsed as the params of a function will track
   * the identifiers declared inside the function body.
   */
  identifiers?: string[]
  isHandlerKey?: boolean
}
/**
 * 代码定义了一个接口 IfNode，它描述了条件语句节点（v-if）的属性和结构。

IfNode 接口具有以下属性：

type: NodeTypes.IF：表示节点的类型为条件语句节点（NodeTypes.IF）。

branches: IfBranchNode[]：表示条件语句节点的分支数组。每个分支都是一个 IfBranchNode 类型的对象，用于表示条件语句的不同分支。

codegenNode?: IfConditionalExpression | CacheExpression：可选属性，用于表示条件语句节点的代码生成节点。它可以是一个条件表达式节点（IfConditionalExpression）或一个缓存表达式节点（CacheExpression）。

条件语句节点用于表示模板中的条件判断逻辑，例如在 Vue 模板中使用 v-if 来根据条件决定元素是否渲染。通过 IfNode 接口的定义，可以在编译过程中对条件语句节点进行处理和生成相应的代码。条件语句节点由多个分支组成，每个分支表示一个条件和对应的代码块。在代码生成阶段，条件语句节点将被转换为相应的条件表达式或缓存表达式。
}
 */
export interface IfNode extends Node {
  type: NodeTypes.IF
  branches: IfBranchNode[]
  codegenNode?: IfConditionalExpression | CacheExpression // <div v-if v-once>
}
/**
 * 上面的代码定义了一个接口 IfBranchNode，它描述了条件语句节点（v-if 分支）的属性和结构。

IfBranchNode 接口具有以下属性：

type: NodeTypes.IF_BRANCH：表示节点的类型为条件语句分支节点（NodeTypes.IF_BRANCH）。

condition: ExpressionNode | undefined：表示条件语句分支的条件表达式节点。条件表达式节点可以是简单表达式节点（SimpleExpressionNode）或复合表达式节点（CompoundExpressionNode）。如果该分支是 v-else 分支，则条件表达式为 undefined。

children: TemplateChildNode[]：表示条件语句分支的子节点数组。子节点可以是元素节点、插值节点、复合表达式节点、文本节点等。

userKey?: AttributeNode | DirectiveNode：可选属性，用于表示条件语句分支的用户提供的键（v-bind:key）。它可以是属性节点（AttributeNode）或指令节点（DirectiveNode）。

isTemplateIf?: boolean：可选属性，用于表示是否为模板中的条件语句分支。如果设置为 true，表示该分支是一个 <template> 元素内部的条件语句分支。

条件语句分支节点用于表示条件语句（v-if、v-else-if、v-else）中的各个分支。每个分支都包含一个条件表达式和相应的子节点。在编译过程中，条件语句分支节点将被处理和转换为相应的代码。如果条件语句分支是 v-else 分支，则条件表达式为 undefined。用户还可以通过提供键（v-bind:key）来标识每个分支，以便在渲染时进行优化。
 */
export interface IfBranchNode extends Node {
  type: NodeTypes.IF_BRANCH
  condition: ExpressionNode | undefined // else
  children: TemplateChildNode[]
  userKey?: AttributeNode | DirectiveNode
  isTemplateIf?: boolean
}
/**
 * 定义了一个接口 ForNode，它描述了循环语句节点（v-for）的属性和结构。

ForNode 接口具有以下属性：

type: NodeTypes.FOR：表示节点的类型为循环语句节点（NodeTypes.FOR）。

source: ExpressionNode：表示循环语句的源数据表达式节点。它指定了需要进行迭代的数据源。

valueAlias: ExpressionNode | undefined：表示循环语句中的值别名表达式节点。它指定了迭代过程中当前项的别名。

keyAlias: ExpressionNode | undefined：表示循环语句中的键别名表达式节点。它指定了迭代过程中当前项的键的别名。

objectIndexAlias: ExpressionNode | undefined：表示循环语句中的对象索引别名表达式节点。它指定了迭代过程中当前项的对象索引的别名。

parseResult: ForParseResult：表示循环语句的解析结果。它包含了循环语句解析过程中的相关信息，如别名的解析结果等。

children: TemplateChildNode[]：表示循环语句节点的子节点数组。子节点可以是元素节点、插值节点、复合表达式节点、文本节点等。

codegenNode?: ForCodegenNode：可选属性，用于表示循环语句节点的代码生成节点。它指定了循环语句在代码生成阶段的表示形式。

循环语句节点用于表示模板中的循环结构，例如在 Vue 模板中使用 v-for 进行数组或对象的遍历。通过 ForNode 接口的定义，可以在编译过程中对循环语句节点进行处理和生成相应的代码。循环语句节点包含了循环的源数据表达式、别名信息以及对应的子节点。在代码生成阶段，循环语句节点将被转换为相应的代码表示形式。
 */
export interface ForNode extends Node {
  type: NodeTypes.FOR
  source: ExpressionNode
  valueAlias: ExpressionNode | undefined
  keyAlias: ExpressionNode | undefined
  objectIndexAlias: ExpressionNode | undefined
  parseResult: ForParseResult
  children: TemplateChildNode[]
  codegenNode?: ForCodegenNode
}
/**
 * 定义了一个接口 TextCallNode，它描述了文本调用节点的属性和结构。

TextCallNode 接口具有以下属性：

type: NodeTypes.TEXT_CALL：表示节点的类型为文本调用节点（NodeTypes.TEXT_CALL）。

content: TextNode | InterpolationNode | CompoundExpressionNode：表示文本调用节点的内容。它可以是文本节点、插值节点或复合表达式节点，用于表示需要被调用的文本内容。

codegenNode: CallExpression | SimpleExpressionNode：表示文本调用节点的代码生成节点。它指定了在代码生成阶段，如何生成对应的代码表示形式。代码生成节点可以是函数调用表达式（CallExpression）或简单表达式节点（SimpleExpressionNode）。

文本调用节点用于表示对文本内容的调用，例如在 Vue 模板中使用 {{ }} 进行文本插值。通过 TextCallNode 接口的定义，可以在编译过程中对文本调用节点进行处理和生成相应的代码。文本调用节点包含了被调用的文本内容以及对应的代码生成节点。在代码生成阶段，文本调用节点将被转换为相应的代码表示形式，以将文本内容插入到生成的代码中。
 */
export interface TextCallNode extends Node {
  type: NodeTypes.TEXT_CALL
  content: TextNode | InterpolationNode | CompoundExpressionNode
  codegenNode: CallExpression | SimpleExpressionNode // when hoisted
}
/**
 * TemplateTextChildNode 是一个联合类型，表示模板中的文本子节点。

它可以是以下三种类型之一：

TextNode：表示普通的文本节点，即没有插值或复合表达式的纯文本内容。

InterpolationNode：表示插值节点，即包含在双大括号 {{ }} 中的表达式，会被动态地计算并插入到文本中。

CompoundExpressionNode：表示复合表达式节点，是一个复合的表达式，包含了多个子节点，可以进行更复杂的动态计算，并将结果插入到文本中。

这些节点类型用于描述模板中的文本内容，通过使用 TemplateTextChildNode 类型，可以方便地对这些文本子节点进行处理和操作，例如在编译过程中生成相应的代码或进行静态分析。
 */
export type TemplateTextChildNode =
  | TextNode
  | InterpolationNode
  | CompoundExpressionNode
/**
 *接口VNodeCall，它描述了虚拟节点调用的属性和结构。

VNodeCall 接口具有以下属性：

type: NodeTypes.VNODE_CALL：表示节点的类型为虚拟节点调用（NodeTypes.VNODE_CALL）。

tag: string | symbol | CallExpression：表示节点的标签。它可以是一个字符串、符号（symbol）或者调用表达式（CallExpression）。标签指定了虚拟节点对应的组件、元素或者片段。

props: PropsExpression | undefined：表示节点的属性表达式。它可以是一个属性表达式（PropsExpression）或者可选的 undefined。属性表达式包含了虚拟节点的属性信息，如绑定的属性、事件等。

children: TemplateChildNode[] | TemplateTextChildNode | SlotsExpression | ForRenderListExpression | SimpleExpressionNode | undefined：表示节点的子节点。它可以是多个子节点组成的数组（TemplateChildNode[]），也可以是单个文本子节点（TemplateTextChildNode）、组件插槽（SlotsExpression）、v-for 渲染列表（ForRenderListExpression）、被 hoisted 的简单表达式（SimpleExpressionNode）或者可选的 undefined。

patchFlag: string | undefined：表示节点的 patch 标志，用于优化渲染过程。

dynamicProps: string | SimpleExpressionNode | undefined：表示节点的动态属性，可以是动态属性的字符串、简单表达式（SimpleExpressionNode）或者可选的 undefined。

directives: DirectiveArguments | undefined：表示节点的指令参数，用于处理指令相关的逻辑。

isBlock: boolean：表示节点是否是块级节点。

disableTracking: boolean：表示是否禁用节点的跟踪。

isComponent: boolean：表示节点是否是组件节点。
 */
export interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string | symbol | CallExpression
  props: PropsExpression | undefined
  children:
    | TemplateChildNode[] // multiple children
    | TemplateTextChildNode // single text child
    | SlotsExpression // component slots
    | ForRenderListExpression // v-for fragment call
    | SimpleExpressionNode // hoisted
    | undefined
  patchFlag: string | undefined
  dynamicProps: string | SimpleExpressionNode | undefined
  directives: DirectiveArguments | undefined
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean
}

// JS Node Types ---------------------------------------------------------------

// We also include a number of JavaScript AST nodes for code generation.
// The AST is an intentionally minimal subset just to meet the exact needs of
// Vue render function generation.
/**
 * 
JSChildNode 是一个联合类型，表示在 JavaScript 代码中的子节点。

它可以是以下几种类型之一：

VNodeCall：表示虚拟节点的调用表达式。

CallExpression：表示函数调用表达式。

ObjectExpression：表示对象字面量表达式。

ArrayExpression：表示数组字面量表达式。

ExpressionNode：表示表达式节点，可以是简单表达式、插值节点或复合表达式。

FunctionExpression：表示函数表达式。

ConditionalExpression：表示条件表达式。

CacheExpression：表示缓存表达式。

AssignmentExpression：表示赋值表达式。

SequenceExpression：表示序列表达式。

这些子节点类型用于在 JavaScript 代码中描述不同的语法结构和表达式。通过使用 JSChildNode 类型，可以方便地对这些子节点进行处理和操作，例如在代码生成阶段将其转换为相应的 JavaScript 代码表示形式。
 */
export type JSChildNode =
  | VNodeCall
  | CallExpression
  | ObjectExpression
  | ArrayExpression
  | ExpressionNode
  | FunctionExpression
  | ConditionalExpression
  | CacheExpression
  | AssignmentExpression
  | SequenceExpression
/**
 * 定义了一个接口 CallExpression，它描述了调用表达式的属性和结构。

CallExpression 接口具有以下属性：

type: NodeTypes.JS_CALL_EXPRESSION：表示节点的类型为调用表达式（NodeTypes.JS_CALL_EXPRESSION）。

callee: string | symbol：表示调用表达式的调用者，可以是一个字符串或符号（symbol）。调用者指定了被调用的函数、方法或对象。

arguments: (string | symbol | JSChildNode | SSRCodegenNode | TemplateChildNode | TemplateChildNode[])[]：表示调用表达式的参数列表。参数列表是一个数组，包含了调用时传递给函数或方法的参数。参数可以是字符串、符号、子节点（JSChildNode）、SSR 代码生成节点（SSRCodegenNode）或者模板子节点（TemplateChildNode）。

通过这些属性，CallExpression 接口描述了调用表达式的结构和属性，用于在编译器的代码生成阶段生成相应的调用表达式，并在代码执行过程中进行函数调用或方法调用。调用表达式用于表示代码中的函数调用、方法调用、对象调用等操作，通过传递参数来执行相应的逻辑。
 */
export interface CallExpression extends Node {
  type: NodeTypes.JS_CALL_EXPRESSION
  callee: string | symbol
  arguments: (
    | string
    | symbol
    | JSChildNode
    | SSRCodegenNode
    | TemplateChildNode
    | TemplateChildNode[]
  )[]
}
/**
 * ObjectExpression 是一个表示 JavaScript 对象字面量表达式的节点类型。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_OBJECT_EXPRESSION。

properties：表示对象的属性列表，是一个由 Property 对象组成的数组。每个 Property 对象表示一个对象的属性，包含属性的键和值。

通过 ObjectExpression 节点，可以在 AST（抽象语法树）中表示 JavaScript 代码中的对象字面量表达式，例如 { key1: value1, key2: value2 }。在编译器或代码生成过程中，可以遍历和操作 ObjectExpression 节点的属性列表，对每个属性进行相应的处理和转换。
 */
export interface ObjectExpression extends Node {
  type: NodeTypes.JS_OBJECT_EXPRESSION
  properties: Array<Property>
}
/**
 * Property 是一个表示 JavaScript 对象属性的节点类型。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_PROPERTY。

key：表示属性的键，是一个 ExpressionNode 类型的节点，表示属性的名称或键名。

value：表示属性的值，是一个 JSChildNode 类型的节点，表示属性对应的值。

通过 Property 节点，可以在 AST（抽象语法树）中表示 JavaScript 对象的属性。每个属性由键和值组成，键可以是一个表达式节点，值可以是各种类型的子节点，如 VNodeCall、CallExpression、ObjectExpression 等。

在编译器或代码生成过程中，可以遍历和操作 Property 节点，访问和修改属性的键和值，以便进行相应的处理和转换。
 */
export interface Property extends Node {
  type: NodeTypes.JS_PROPERTY
  key: ExpressionNode
  value: JSChildNode
}
/**
 * ArrayExpression 是一个表示 JavaScript 数组字面量表达式的节点类型。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_ARRAY_EXPRESSION。

elements：表示数组的元素列表，是一个由字符串和节点对象组成的数组。每个元素可以是字面值字符串或其他节点类型。

通过 ArrayExpression 节点，可以在 AST（抽象语法树）中表示 JavaScript 代码中的数组字面量表达式，例如 [1, 2, 3]。在编译器或代码生成过程中，可以遍历和操作 ArrayExpression 节点的元素列表，对每个元素进行相应的处理和转换。

注意，ArrayExpression 中的元素可以是字符串或其他节点类型，因此可以表示包含多种类型元素的混合数组。
 */
export interface ArrayExpression extends Node {
  type: NodeTypes.JS_ARRAY_EXPRESSION
  elements: Array<string | Node>
}
/**
 * FunctionExpression 是一个表示 JavaScript 函数表达式的节点类型。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_FUNCTION_EXPRESSION。

params：表示函数的参数列表。它可以是单个表达式节点或字符串，也可以是由表达式节点和字符串组成的数组。

returns：表示函数的返回值。它可以是单个模板子节点、模板子节点数组或 JavaScript 子节点。

body：表示函数的函数体。它可以是块语句（BlockStatement）或 if 语句（IfStatement）。

newline：表示是否在函数表达式之前添加换行符。

isSlot：表示是否为插槽函数。

isNonScopedSlot：仅适用于 __COMPAT__，表示一个应该在旧版 $scopedSlots 实例属性中排除的插槽函数。

通过 FunctionExpression 节点，可以在 AST（抽象语法树）中表示 JavaScript 代码中的函数表达式，例如 (param1, param2) => { // 函数体 }。在编译器或代码生成过程中，可以遍历和操作 FunctionExpression 节点的属性，对函数参数、返回值、函数体等进行相应的处理和转换。

注意，FunctionExpression 用于表示匿名函数表达式，而不是函数声明。函数声明使用 FunctionDeclaration 节点来表示。
 */
export interface FunctionExpression extends Node {
  type: NodeTypes.JS_FUNCTION_EXPRESSION
  params: ExpressionNode | string | (ExpressionNode | string)[] | undefined
  returns?: TemplateChildNode | TemplateChildNode[] | JSChildNode
  body?: BlockStatement | IfStatement
  newline: boolean
  /**
   * This flag is for codegen to determine whether it needs to generate the
   * withScopeId() wrapper
   */
  isSlot: boolean
  /**
   * __COMPAT__ only, indicates a slot function that should be excluded from
   * the legacy $scopedSlots instance property.
   */
  isNonScopedSlot?: boolean
}
/**
 * ConditionalExpression 是一个表示 JavaScript 条件表达式的节点类型，也称为三元表达式（Ternary Expression）。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_CONDITIONAL_EXPRESSION。

test：表示条件的测试部分，即要进行判断的表达式。

consequent：表示条件为真时的结果。

alternate：表示条件为假时的结果。

newline：表示是否在条件表达式之前添加换行符。

通过 ConditionalExpression 节点，可以在 AST（抽象语法树）中表示 JavaScript 代码中的条件表达式，例如 condition ? consequent : alternate。在编译器或代码生成过程中，可以遍历和操作 ConditionalExpression 节点的属性，对条件表达式的测试部分、结果部分等进行相应的处理和转换。

注意，ConditionalExpression 用于表示三元条件表达式，而不是 if-else 语句。if-else 语句使用 IfStatement 节点来表示。
 */
export interface ConditionalExpression extends Node {
  type: NodeTypes.JS_CONDITIONAL_EXPRESSION
  test: JSChildNode
  consequent: JSChildNode
  alternate: JSChildNode
  newline: boolean
}
/**
 *CacheExpression 是一个表示缓存表达式的节点类型。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_CACHE_EXPRESSION。

index：表示缓存表达式的索引。在生成的代码中，缓存表达式会被存储在一个临时变量中，索引用于唯一标识不同的缓存表达式。

value：表示要缓存的表达式，它可以是一个 JSChildNode 类型的节点，即一个 JavaScript 表达式。

isVNode：表示被缓存的表达式是否是一个 VNode（Virtual Node），用于在生成的代码中标识缓存的内容。

通过 CacheExpression 节点，可以在 AST（抽象语法树）中表示需要缓存的表达式。在编译器或代码生成过程中，可以根据 CacheExpression 节点的属性，生成相应的缓存代码，以提高性能并避免重复计算。

注意，缓存表达式主要用于 Vue 模板编译过程中的优化，用于缓存动态生成的 VNode 节点或其他需要计算的表达式，以减少重复计算的开销。
 */
export interface CacheExpression extends Node {
  type: NodeTypes.JS_CACHE_EXPRESSION
  index: number
  value: JSChildNode
  isVNode: boolean
}
/**
 * MemoExpression 是一种特殊的 CallExpression 节点，表示使用 withMemo 函数进行记忆化的表达式。

它具有以下属性：

type：表示节点的类型，这里是 NodeTypes.JS_CALL_EXPRESSION。

callee：表示调用的函数，这里是 WITH_MEMO，它是 withMemo 函数的标识符。

arguments：表示函数调用的参数。在 MemoExpression 中，参数是一个数组，包含以下四个元素：

ExpressionNode：表示需要进行记忆化的表达式。
MemoFactory：表示用于创建记忆化函数的工厂函数。
string：表示记忆化函数的唯一标识符。
string：表示记忆化函数的名字。
通过 MemoExpression 节点，可以在 AST（抽象语法树）中表示使用 withMemo 函数进行记忆化的表达式。在编译器或代码生成过程中，可以根据 MemoExpression 节点的属性，生成相应的代码，以实现记忆化功能，提高性能并避免重复计算。

withMemo 函数是 Vue 框架中的一个辅助函数，用于将一个表达式进行记忆化处理。记忆化函数会缓存表达式的计算结果，并在相同的输入条件下直接返回缓存的结果，避免重复计算。这在一些计算密集型或依赖相同输入的重复计算场景下非常有用。
 */
export interface MemoExpression extends CallExpression {
  callee: typeof WITH_MEMO
  arguments: [ExpressionNode, MemoFactory, string, string]
}
/**
 * MemoFactory 是一种特殊的 FunctionExpression 接口，表示用于创建记忆化函数的工厂函数。

它继承了 FunctionExpression 接口的属性，并添加了一个额外的属性：

returns：表示工厂函数的返回值，这里是一个 BlockCodegenNode 节点，用于生成代码块。
通过 MemoFactory 接口，可以在 AST（抽象语法树）中表示用于创建记忆化函数的工厂函数。工厂函数可以接收参数并返回一个记忆化函数，该记忆化函数用于缓存表达式的计算结果并提供记忆化功能。

在编译器或代码生成过程中，可以根据 MemoFactory 节点的属性，生成相应的代码，以创建记忆化函数的工厂函数并将其应用于表达式的记忆化处理。这样可以实现在需要的地方创建记忆化函数，以提高性能并避免重复计算。
 */
interface MemoFactory extends FunctionExpression {
  returns: BlockCodegenNode
}

// SSR-specific Node Types -----------------------------------------------------
/**
 * SSRCodegenNode 是用于服务器端渲染（SSR）代码生成的节点类型。它可以表示以下类型的节点：

BlockStatement：表示一个代码块，包含多个语句。
TemplateLiteral：表示一个模板字面量，用于生成字符串模板。
IfStatement：表示一个条件语句，包含条件表达式、分支语句和可选的else语句。
AssignmentExpression：表示一个赋值表达式，用于给变量赋值。
ReturnStatement：表示一个返回语句，用于返回函数的结果。
SequenceExpression：表示一个序列表达式，按顺序执行多个子表达式，并返回最后一个表达式的结果。
这些节点类型用于在服务器端渲染过程中生成相应的代码。它们可以通过组合和嵌套来构建复杂的代码逻辑，最终生成用于服务器端渲染的代码字符串。服务器端渲染的代码生成过程通常涉及处理模板、条件语句、循环语句等，并最终生成可执行的 JavaScript 代码，用于在服务器上生成 HTML 页面或片段。
 */
export type SSRCodegenNode =
  | BlockStatement
  | TemplateLiteral
  | IfStatement
  | AssignmentExpression
  | ReturnStatement
  | SequenceExpression
/**
 * BlockStatement 是一个表示代码块的节点类型。它用于表示一系列的语句组成的代码块。代码块是多个语句的集合，可以包含任意数量的语句。

BlockStatement 节点具有以下属性：

type: NodeTypes.JS_BLOCK_STATEMENT：表示节点类型为代码块。
body: (JSChildNode | IfStatement)[]：表示代码块中的语句数组。每个语句可以是 JSChildNode 类型的节点，或者是 IfStatement 类型的条件语句。
通过组合多个语句节点，可以构建复杂的代码逻辑。例如，可以在 body 数组中添加多个赋值语句、函数调用语句、条件语句等，以形成一个完整的代码块。

代码块通常用于表示函数体、循环体、条件分支体等，它们可以包含一系列的语句，并按顺序执行这些语句。在代码生成过程中，代码块的内容将被转换为相应的 JavaScript 代码字符串。
 */
export interface BlockStatement extends Node {
  type: NodeTypes.JS_BLOCK_STATEMENT
  body: (JSChildNode | IfStatement)[]
}
/**
 * TemplateLiteral 是一个表示模板字面量的节点类型。模板字面量是一种包含静态文本和插值表达式的字符串。它可以用于构建动态生成的字符串。

TemplateLiteral 节点具有以下属性：

type: NodeTypes.JS_TEMPLATE_LITERAL：表示节点类型为模板字面量。
elements: (string | JSChildNode)[]：表示模板字面量中的元素数组。每个元素可以是字符串或 JSChildNode 类型的节点。字符串元素表示静态文本部分，而 JSChildNode 类型的节点表示插值表达式或动态生成的代码。
通过组合静态文本和动态生成的代码，模板字面量可以生成动态的字符串内容。在代码生成过程中，模板字面量的内容将被转换为相应的 JavaScript 代码字符串，其中插值部分会被正确地替换为对应的表达式结果。
 */
export interface TemplateLiteral extends Node {
  type: NodeTypes.JS_TEMPLATE_LITERAL
  elements: (string | JSChildNode)[]
}
/**
 * IfStatement 是一个表示条件语句的节点类型，用于表示 JavaScript 中的 if 语句。

IfStatement 节点具有以下属性：

type: NodeTypes.JS_IF_STATEMENT：表示节点类型为条件语句。
test: ExpressionNode：表示条件语句的条件部分，即判断条件的表达式。
consequent: BlockStatement：表示条件为真时执行的代码块，是一个 BlockStatement 类型的节点。
alternate: IfStatement | BlockStatement | ReturnStatement | undefined：表示条件为假时执行的代码块。可以是另一个 IfStatement 节点，表示嵌套的 else if 分支；也可以是一个 BlockStatement 节点，表示 else 分支；或者是一个 ReturnStatement 节点，表示条件为假时的返回语句；如果没有 else 分支，则为 undefined。
通过组合 IfStatement 节点可以构建复杂的条件语句，包括多个条件分支和嵌套的分支结构。在代码生成过程中，条件语句会被转换为相应的 JavaScript 代码，根据条件的真假执行相应的代码块。
 */
export interface IfStatement extends Node {
  type: NodeTypes.JS_IF_STATEMENT
  test: ExpressionNode
  consequent: BlockStatement
  alternate: IfStatement | BlockStatement | ReturnStatement | undefined
}
/**
 * AssignmentExpression 是一个表示赋值表达式的节点类型，用于表示 JavaScript 中的赋值语句。

AssignmentExpression 节点具有以下属性：

type: NodeTypes.JS_ASSIGNMENT_EXPRESSION：表示节点类型为赋值表达式。
left: SimpleExpressionNode：表示赋值的左侧，即被赋值的变量或属性。
right: JSChildNode：表示赋值的右侧，即赋给变量或属性的值。
赋值表达式用于将右侧的值赋给左侧的变量或属性。在代码生成过程中，赋值表达式会被转换为相应的 JavaScript 代码，执行赋值操作。
 */
export interface AssignmentExpression extends Node {
  type: NodeTypes.JS_ASSIGNMENT_EXPRESSION
  left: SimpleExpressionNode
  right: JSChildNode
}
/**
 * SequenceExpression 是一个表示序列表达式的节点类型，用于表示 JavaScript 中的逗号操作符表达式。

SequenceExpression 节点具有以下属性：

type: NodeTypes.JS_SEQUENCE_EXPRESSION：表示节点类型为序列表达式。
expressions: JSChildNode[]：表示由逗号分隔的表达式列表。
序列表达式中的每个表达式将按顺序执行，最终返回最后一个表达式的结果。这在某些情况下可以用于在单个表达式中执行多个操作，例如执行多个副作用或计算多个值并返回最后一个值。在代码生成过程中，序列表达式会被转换为相应的 JavaScript 代码，以确保表达式按顺序执行，并返回最后一个表达式的结果。
 */
export interface SequenceExpression extends Node {
  type: NodeTypes.JS_SEQUENCE_EXPRESSION
  expressions: JSChildNode[]
}
/**
 * ReturnStatement 是一个表示返回语句的节点类型，用于表示 JavaScript 中的 return 语句。

ReturnStatement 节点具有以下属性：

type: NodeTypes.JS_RETURN_STATEMENT：表示节点类型为返回语句。
returns: TemplateChildNode | TemplateChildNode[] | JSChildNode：表示要返回的值。可以是单个模板子节点、多个模板子节点的数组，或者是 JavaScript 子节点。
ReturnStatement 用于表示函数体内的返回语句。在代码生成过程中，该节点会被转换为相应的 JavaScript 代码，以确保函数在执行到该语句时返回指定的值。
 */
export interface ReturnStatement extends Node {
  type: NodeTypes.JS_RETURN_STATEMENT
  returns: TemplateChildNode | TemplateChildNode[] | JSChildNode
}

// Codegen Node Types ----------------------------------------------------------
/**
 * DirectiveArguments 是一个继承自 ArrayExpression 的接口，用于表示指令的参数列表。

DirectiveArguments 包含一个 elements 属性，它是一个数组，其中的每个元素都是 DirectiveArgumentNode 类型的节点。这些节点表示指令的参数。

DirectiveArguments 用于在代码生成过程中传递指令的参数列表。它允许将多个参数作为数组传递给指令的处理函数。
 */
export interface DirectiveArguments extends ArrayExpression {
  elements: DirectiveArgumentNode[]
}
/**
 * DirectiveArgumentNode 是一个继承自 ArrayExpression 的接口，用于表示指令的参数。

DirectiveArgumentNode 包含一个 elements 属性，它是一个数组，用于存储指令参数的具体内容。

根据 elements 数组的长度，可以确定指令参数的不同形式：

如果 elements 数组长度为 1，表示指令参数只有一个字符串，即指令的名称。
如果 elements 数组长度为 2，表示指令参数包含两个元素：
第一个元素为指令的名称。
第二个元素为表达式节点 (ExpressionNode)，表示指令的表达式参数。
如果 elements 数组长度为 3，表示指令参数包含三个元素：
第一个元素为指令的名称。
第二个元素为表达式节点 (ExpressionNode)，表示指令的表达式参数。
第三个元素为表达式节点 (ExpressionNode)，表示指令的修饰符参数。
如果 elements 数组长度为 4，表示指令参数包含四个元素：
第一个元素为指令的名称。
第二个元素为表达式节点 (ExpressionNode)，表示指令的表达式参数。
第三个元素为表达式节点 (ExpressionNode)，表示指令的修饰符参数。
第四个元素为对象表达式 (ObjectExpression)，表示指令的动态参数，即使用对象字面量形式传递的参数。
通过 DirectiveArgumentNode 可以灵活地表示不同形式的指令参数，包括指令名称、表达式参数、修饰符参数以及动态参数。
 */
export interface DirectiveArgumentNode extends ArrayExpression {
  elements: // dir, exp, arg, modifiers
  | [string]
    | [string, ExpressionNode]
    | [string, ExpressionNode, ExpressionNode]
    | [string, ExpressionNode, ExpressionNode, ObjectExpression]
}

// renderSlot(...)
/**
 * RenderSlotCall 是继承自 CallExpression 的接口，用于表示渲染插槽的调用。

RenderSlotCall 包含两个属性：callee 和 arguments。

callee 表示渲染插槽的调用者，其值为 typeof RENDER_SLOT，指示调用的是渲染插槽。

arguments 表示调用渲染插槽时传递的参数。根据 arguments 的不同形式，可以确定渲染插槽的不同使用方式：

如果 arguments 是一个长度为 2 的数组，表示调用渲染插槽时传递了两个参数：
第一个参数为 $slots，表示插槽的名称或作用域插槽的对象。
第二个参数为插槽的名称或表达式节点 (ExpressionNode)。
如果 arguments 是一个长度为 3 的数组，表示调用渲染插槽时传递了三个参数：
第一个参数为 $slots，表示插槽的名称或作用域插槽的对象。
第二个参数为插槽的名称或表达式节点 (ExpressionNode)。
第三个参数为插槽的属性表达式 (PropsExpression)。
如果 arguments 是一个长度为 4 的数组，表示调用渲染插槽时传递了四个参数：
第一个参数为 $slots，表示插槽的名称或作用域插槽的对象。
第二个参数为插槽的名称或表达式节点 (ExpressionNode)。
第三个参数为插槽的属性表达式 (PropsExpression) 或一个空的对象字面量 ('{}')。
第四个参数为插槽的后备内容，即一个包含模板子节点 (TemplateChildNode) 的数组。
通过 RenderSlotCall 可以表示不同形式的渲染插槽调用，包括插槽名称、表达式参数、属性表达式和后备内容。
 */
export interface RenderSlotCall extends CallExpression {
  callee: typeof RENDER_SLOT
  arguments: // $slots, name, props, fallback
  | [string, string | ExpressionNode]
    | [string, string | ExpressionNode, PropsExpression]
    | [
        string,
        string | ExpressionNode,
        PropsExpression | '{}',
        TemplateChildNode[]
      ]
}
/**
 * SlotsExpression 是一个联合类型，表示插槽表达式的类型。它可以是 SlotsObjectExpression 或 DynamicSlotsExpression。

SlotsObjectExpression 表示静态插槽表达式，它是一个对象表达式，用于描述静态插槽的名称和对应的渲染函数。它的类型是 SlotsObjectExpression。
DynamicSlotsExpression 表示动态插槽表达式，它是一个函数调用表达式，用于描述动态插槽的名称和对应的渲染函数。它的类型是 DynamicSlotsExpression。
通过使用 SlotsExpression，可以灵活地表示静态插槽和动态插槽，并根据具体的情况选择合适的表达式类型来描述插槽的内容。
 */
export type SlotsExpression = SlotsObjectExpression | DynamicSlotsExpression

// { foo: () => [...] }
/**
 * SlotsObjectExpression 是一个接口，扩展自 ObjectExpression 接口。它用于表示静态插槽的对象表达式，其中包含了插槽名称和对应的渲染函数。

SlotsObjectExpression 接口具有一个属性 properties，它是一个数组，包含了多个 SlotsObjectProperty 对象，每个对象表示一个插槽属性。

通过使用 SlotsObjectExpression，可以创建一个对象表达式来描述静态插槽的名称和渲染函数。每个插槽属性都由 SlotsObjectProperty 对象表示，它包含了插槽名称和对应的渲染函数。
 */
export interface SlotsObjectExpression extends ObjectExpression {
  properties: SlotsObjectProperty[]
}
/**
 *SlotsObjectProperty 是一个接口，扩展自 Property 接口。它用于表示静态插槽对象中的插槽属性，包含了插槽的名称和对应的渲染函数。

SlotsObjectProperty 接口具有一个属性 value，它是一个 SlotFunctionExpression 对象，表示插槽的渲染函数。

通过使用 SlotsObjectProperty，可以创建一个静态插槽对象的属性，其中包含了插槽的名称和对应的渲染函数。这样的属性可以用于构建静态插槽的对象表达式，
 */
export interface SlotsObjectProperty extends Property {
  value: SlotFunctionExpression
}
/**
 * SlotFunctionExpression 是一个接口，扩展自 FunctionExpression 接口。它用于表示插槽的渲染函数表达式。

SlotFunctionExpression 接口具有一个属性 returns，它是一个 TemplateChildNode 数组，表示插槽的渲染函数返回的子节点。

通过使用 SlotFunctionExpression，可以创建一个插槽的渲染函数表达式，其中包含了插槽函数的参数、函数体以及返回的子节点.
注意，插槽函数的返回值应该是一个包含了插槽内容的子节点数组。这些子节点可以是文本、元素、插值等等，用于定义插槽的具体内容。
 */
export interface SlotFunctionExpression extends FunctionExpression {
  returns: TemplateChildNode[]
}

// createSlots({ ... }, [
//    foo ? () => [] : undefined,
//    renderList(list, i => () => [i])
// ])
/**
 * DynamicSlotsExpression 是一个接口，扩展自 CallExpression 接口。它用于表示动态插槽的渲染函数表达式。

DynamicSlotsExpression 接口具有两个属性：

callee：表示函数调用的目标，它是一个常量 CREATE_SLOTS，用于标识创建动态插槽的函数。

arguments：表示函数调用的参数，它是一个元组类型，包含两个元素：

第一个元素是一个 SlotsObjectExpression，用于表示静态插槽对象的表达式。

第二个元素是一个 DynamicSlotEntries，用于表示动态插槽的条目。

通过使用 DynamicSlotsExpression，可以创建一个动态插槽的渲染函数表达式，其中包含了静态插槽对象和动态插槽的条目。
 */
export interface DynamicSlotsExpression extends CallExpression {
  callee: typeof CREATE_SLOTS
  arguments: [SlotsObjectExpression, DynamicSlotEntries]
}
/**
 * DynamicSlotEntries 是一个接口，扩展自 ArrayExpression 接口。它用于表示动态插槽的条目列表。

DynamicSlotEntries 接口具有一个属性：

elements：表示动态插槽条目的数组，其中每个元素可以是 ConditionalDynamicSlotNode 或 ListDynamicSlotNode 类型。
DynamicSlotEntries 用于将多个动态插槽的条目组合在一起。每个条目可以是条件动态插槽或列表动态插槽。
通过使用 DynamicSlotEntries，可以将多个动态插槽条目组合在一起，并传递给动态插槽的渲染函数进行处理。
 */
export interface DynamicSlotEntries extends ArrayExpression {
  elements: (ConditionalDynamicSlotNode | ListDynamicSlotNode)[]
}
/**
 * ConditionalDynamicSlotNode 是一个接口，扩展自 ConditionalExpression 接口。它用于表示条件动态插槽节点。

ConditionalDynamicSlotNode 接口具有以下属性：

test：表示条件表达式的测试部分，用于确定插槽是否应该被渲染。
consequent：表示条件为真时应该渲染的动态插槽节点。
alternate：表示条件为假时应该渲染的动态插槽节点或简单表达式节点。
条件动态插槽节点用于在满足特定条件时渲染相应的动态插槽内容。根据条件的结果，可以选择渲染 consequent 中的动态插槽节点或 alternate 中的动态插槽节点或简单表达式节点。
 */
export interface ConditionalDynamicSlotNode extends ConditionalExpression {
  consequent: DynamicSlotNode
  alternate: DynamicSlotNode | SimpleExpressionNode
}
/**
 * ListDynamicSlotNode 是一个接口，扩展自 CallExpression 接口。它用于表示列表动态插槽节点。

ListDynamicSlotNode 接口具有以下属性：

callee：表示调用的函数或方法的标识符，指定为 RENDER_LIST。
arguments：表示函数调用的参数列表。在列表动态插槽节点中，参数列表包含两个元素：
第一个参数是一个表达式节点，表示列表的源数据。
第二个参数是一个 ListDynamicSlotIterator 对象，表示列表动态插槽的迭代器。
列表动态插槽节点用于根据列表的源数据动态生成插槽内容。通过迭代器定义了如何处理每个列表项并生成相应的插槽内容。
 */
export interface ListDynamicSlotNode extends CallExpression {
  callee: typeof RENDER_LIST
  arguments: [ExpressionNode, ListDynamicSlotIterator]
}
/**
 * ListDynamicSlotIterator 是一个接口，扩展自 FunctionExpression 接口。它用于表示列表动态插槽的迭代器。

ListDynamicSlotIterator 接口具有以下属性：

returns：表示迭代器函数的返回值。在列表动态插槽的迭代器中，返回值应该是一个 DynamicSlotNode 对象，表示每个列表项对应的插槽内容。
列表动态插槽的迭代器函数定义了如何处理列表的每个项并生成相应的插槽内容。通过返回一个 DynamicSlotNode 对象，可以指定每个列表项对应的插槽内容。
 */
export interface ListDynamicSlotIterator extends FunctionExpression {
  returns: DynamicSlotNode
}
/**
 * DynamicSlotNode 是一个接口，扩展自 ObjectExpression 接口。它用于表示动态插槽的内容。

DynamicSlotNode 接口具有以下属性：

properties：表示动态插槽的属性列表，包括 Property 和 DynamicSlotFnProperty。
在动态插槽中，DynamicSlotNode 表示动态插槽的内容，其中包括插槽的静态属性和插槽函数属性。
 */
export interface DynamicSlotNode extends ObjectExpression {
  properties: [Property, DynamicSlotFnProperty]
}
/**
 * DynamicSlotFnProperty 是一个接口，扩展自 Property 接口。它用于表示动态插槽的函数属性。

DynamicSlotFnProperty 接口具有以下属性：

value：表示动态插槽的函数属性值，类型为 SlotFunctionExpression。
在动态插槽中，DynamicSlotFnProperty 用于定义插槽函数属性，其中包括函数的参数、返回值和函数体等信息。
 */
export interface DynamicSlotFnProperty extends Property {
  value: SlotFunctionExpression
}
/**
 * BlockCodegenNode 是一个联合类型，可以是 VNodeCall 或 RenderSlotCall。

VNodeCall 表示一个普通的 VNode 节点的调用，用于创建和渲染虚拟 DOM 元素。
RenderSlotCall 表示一个插槽节点的调用，用于渲染插槽内容。
这两种节点都是用于代码生成阶段，用于生成渲染函数的代码。

请注意，BlockCodegenNode 表示一个代码生成阶段的节点，具体使用哪种类型取决于上下文和具体的渲染逻辑。
 */
export type BlockCodegenNode = VNodeCall | RenderSlotCall
/**
 * IfConditionalExpression 是一个扩展自 ConditionalExpression 的接口，表示条件表达式在代码生成阶段的使用情况。

它具有以下属性：

test: 条件表达式的测试部分，表示条件判断的值。
consequent: 如果条件为真，则执行的代码块。它可以是 BlockCodegenNode，表示普通的代码块；或者是 MemoExpression，表示使用了记忆化的表达式。
alternate: 如果条件为假，则执行的代码块。它可以是 BlockCodegenNode，表示普通的代码块；或者是 IfConditionalExpression，表示嵌套的条件表达式；或者是 MemoExpression，表示使用了记忆化的表达式。
这个接口主要用于处理条件语句（如 v-if、v-else-if、v-else）在代码生成阶段的逻辑。根据条件的真假不同，选择执行不同的代码块或条件表达式。
 */
export interface IfConditionalExpression extends ConditionalExpression {
  consequent: BlockCodegenNode | MemoExpression
  alternate: BlockCodegenNode | IfConditionalExpression | MemoExpression
}
/**
 * ForCodegenNode 是一个扩展自 VNodeCall 的接口，用于在代码生成阶段表示 v-for 指令生成的代码块。

它具有以下属性：

isBlock: true：表示这是一个块级代码块。
tag: typeof FRAGMENT：表示代码块的标签是 FRAGMENT，即片段标签。
props: undefined：没有属性传递给代码块。
children: ForRenderListExpression：表示代码块的子节点，通常是一个渲染列表表达式。
patchFlag: string：表示代码块的 patch 标记，用于优化渲染过程。
disableTracking: boolean：表示代码块是否禁用追踪。
这个接口主要用于处理 v-for 指令在代码生成阶段的逻辑，将渲染列表表达式作为代码块的子节点，生成相应的代码用于渲染列表。由于 v-for 生成的代码块是一个块级元素，所以使用了 isBlock: true 和 tag: typeof FRAGMENT 来表示。
 */
export interface ForCodegenNode extends VNodeCall {
  isBlock: true
  tag: typeof FRAGMENT
  props: undefined
  children: ForRenderListExpression
  patchFlag: string
  disableTracking: boolean
}
/**
 * ForRenderListExpression 是一个扩展自 CallExpression 的接口，用于表示在 v-for 指令的代码生成阶段中的渲染列表表达式。

它具有以下属性：

callee: typeof RENDER_LIST：表示调用的函数为 RENDER_LIST，用于渲染列表。
arguments: [ExpressionNode, ForIteratorExpression]：表示函数调用的参数列表。第一个参数是表示列表的表达式节点，第二个参数是表示迭代器的表达式节点。
这个接口主要用于在代码生成阶段生成用于渲染列表的代码。它调用 RENDER_LIST 函数，并将列表表达式和迭代器表达式作为参数传递给该函数。通过这样的方式，可以生成用于渲染列表的代码。
 */
export interface ForRenderListExpression extends CallExpression {
  callee: typeof RENDER_LIST
  arguments: [ExpressionNode, ForIteratorExpression]
}
/**
 * ForIteratorExpression 是一个扩展自 FunctionExpression 的接口，用于表示在 v-for 指令的代码生成阶段中的迭代器表达式。

它具有以下属性：

returns: BlockCodegenNode：表示迭代器函数的返回值，可以是 VNodeCall 或 RenderSlotCall，用于生成迭代器的代码块。
这个接口主要用于定义迭代器函数，并在代码生成阶段生成用于迭代的代码块。通过定义迭代器函数，可以实现对列表中的每个元素进行迭代，并生成相应的代码块进行渲染或处理。
 */
export interface ForIteratorExpression extends FunctionExpression {
  returns: BlockCodegenNode
}

// AST Utilities ---------------------------------------------------------------

// Some expressions, e.g. sequence and conditional expressions, are never
// associated with template nodes, so their source locations are just a stub.
// Container types like CompoundExpression also don't need a real location.
/**
 *locStub 是一个 SourceLocation 类型的常量，用于表示代码中的位置信息。

它具有以下属性：

source: string：代码所在的源文件路径或标识符。
start: Position：表示代码片段的起始位置。
line: number：起始行号。
column: number：起始列号。
offset: number：从文件起始位置开始的偏移量。
end: Position：表示代码片段的结束位置。
line: number：结束行号。
column: number：结束列号。
offset: number：从文件起始位置开始的偏移量。
这个常量用于提供一个默认的空位置信息，通常在某些情况下，需要创建一个占位的位置信息，以便在处理代码时，确保位置信息的存在。
 */
export const locStub: SourceLocation = {
  source: '',
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 }
}
/**
 createRoot 是一个用于创建 RootNode 的函数。它接收两个参数：

children: TemplateChildNode[]：表示根节点下的子节点列表。
loc = locStub：表示根节点的位置信息，默认为一个空的位置信息对象。
函数内部会创建一个 RootNode 对象，并将参数传递给对应的属性。返回的对象包含以下属性：

type: NodeTypes.ROOT：节点类型为 ROOT，表示根节点。
children: TemplateChildNode[]：根节点下的子节点列表。
helpers: Set<symbol>：帮助函数的集合。
components: string[]：组件列表。
directives: string[]：指令列表。
hoists: (JSChildNode | null)[]：提升节点列表。
imports: ImportItem[]：导入项列表。
cached: number：缓存的数量。
temps: number：临时变量的数量。
codegenNode: TemplateChildNode | JSChildNode | BlockStatement：代码生成节点。
loc: SourceLocation：节点的位置信息。
最后，函数返回创建的 RootNode 对象。
 */
export function createRoot(
  children: TemplateChildNode[],
  loc = locStub
): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: undefined,
    loc
  }
}
/**
 *createVNodeCall 是一个用于创建 VNodeCall 对象的函数。它接收多个参数用于设置 VNodeCall 的属性：
 * @param context 转换上下文对象，可以为 null。
 * @param tag VNodeCall 的标签。
 * @param props VNodeCall 的属性
 * @param children VNodeCall 的子节点
 * @param patchFlag VNodeCall 的补丁标志
 * @param dynamicProps VNodeCall 的动态属性
 * @param directives VNodeCall 的指令
 * @param isBlock 表示是否是块级节点，默认为 false
 * @param disableTracking 表示是否禁用追踪，默认为 false。
 * @param isComponent 表示是否是组件，默认为 false。
 * @param loc 表示节点的位置信息，默认为一个空的位置信息对象。
 *
 在函数内部，根据传入的上下文对象，根据需要添加相应的帮助函数。然后，创建一个 VNodeCall 对象，并将参数传递给对应的属性。返回的对象包含以下属性：
type: NodeTypes.VNODE_CALL：节点类型为 VNODE_CALL，表示虚拟节点。
tag: VNodeCall['tag']：虚拟节点的标签。
props: VNodeCall['props']：虚拟节点的属性。
children: VNodeCall['children']：虚拟节点的子节点。
patchFlag: VNodeCall['patchFlag']：虚拟节点的补丁标志。
dynamicProps: VNodeCall['dynamicProps']：虚拟节点的动态属性。
directives: VNodeCall['directives']：虚拟节点的指令。
isBlock: VNodeCall['isBlock']：表示是否是块级节点。
disableTracking: VNodeCall['disableTracking']：表示是否禁用追踪。
isComponent: VNodeCall['isComponent']：表示是否是组件。
loc: SourceLocation：节点的位置信息。
 */
export function createVNodeCall(
  context: TransformContext | null,
  tag: VNodeCall['tag'],
  props?: VNodeCall['props'],
  children?: VNodeCall['children'],
  patchFlag?: VNodeCall['patchFlag'],
  dynamicProps?: VNodeCall['dynamicProps'],
  directives?: VNodeCall['directives'],
  isBlock: VNodeCall['isBlock'] = false,
  disableTracking: VNodeCall['disableTracking'] = false,
  isComponent: VNodeCall['isComponent'] = false,
  loc = locStub
): VNodeCall {
  if (context) {
    if (isBlock) {
      context.helper(OPEN_BLOCK)
      context.helper(getVNodeBlockHelper(context.inSSR, isComponent))
    } else {
      context.helper(getVNodeHelper(context.inSSR, isComponent))
    }
    if (directives) {
      context.helper(WITH_DIRECTIVES)
    }
  }

  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent,
    loc
  }
}
/**
 *
 * @param elements ArrayExpression['elements']：数组表达式的元素列表。
 * @param loc SourceLocation = locStub：节点的位置信息，默认为一个空的位置信息对象。
 * @returns
 * 在函数内部，使用提供的参数创建一个 ArrayExpression 对象，并设置对象的属性：

type: NodeTypes.JS_ARRAY_EXPRESSION：节点类型为 JS_ARRAY_EXPRESSION，表示 JavaScript 数组表达式。
loc: SourceLocation：节点的位置信息。
elements: ArrayExpression['elements']：数组表达式的元素列表。
最后，函数返回创建的 ArrayExpression 对象。
 */
export function createArrayExpression(
  elements: ArrayExpression['elements'],
  loc: SourceLocation = locStub
): ArrayExpression {
  return {
    type: NodeTypes.JS_ARRAY_EXPRESSION,
    loc,
    elements
  }
}
/**
 *
 * @param properties 对象表达式的属性列表。
 * @param loc 节点的位置信息，默认为一个空的位置信息对象。
 * @returns
 * 
 * 在函数内部，使用提供的参数创建一个 ObjectExpression 对象，并设置对象的属性：

type: NodeTypes.JS_OBJECT_EXPRESSION：节点类型为 JS_OBJECT_EXPRESSION，表示 JavaScript 对象表达式。
loc: SourceLocation：节点的位置信息。
properties: ObjectExpression['properties']：对象表达式的属性列表。
最后，函数返回创建的 ObjectExpression 对象。
 */
export function createObjectExpression(
  properties: ObjectExpression['properties'],
  loc: SourceLocation = locStub
): ObjectExpression {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    loc,
    properties
  }
}
/**
 *createObjectProperty 是一个用于创建 Property 对象的函数。
 * @param key  Property['key'] | string：属性的键。可以是 Property['key'] 类型的值，也可以是字符串。
 * @param value Property['value']：属性的值。
 * @returns
 * 在函数内部，根据参数的类型来确定属性的键：

如果 key 是字符串，则调用 createSimpleExpression 创建一个简单表达式，并将其作为键。
如果 key 是 Property['key'] 类型的值，则直接使用它作为键。
然后，使用参数中的键和值创建一个 Property 对象：

type: NodeTypes.JS_PROPERTY：节点类型为 JS_PROPERTY，表示 JavaScript 对象的属性。
loc: locStub：节点的位置信息。
key: Property['key']：属性的键。
value: Property['value']：属性的值。
最后，函数返回创建的 Property 对象。
 */
export function createObjectProperty(
  key: Property['key'] | string,
  value: Property['value']
): Property {
  return {
    type: NodeTypes.JS_PROPERTY,
    loc: locStub,
    key: isString(key) ? createSimpleExpression(key, true) : key,
    value
  }
}
/**
 * createSimpleExpression 是一个用于创建 SimpleExpressionNode 对象的函数。它接收四个参数：
 * @param content 表达式的内容
 * @param isStatic 一个布尔值，表示表达式是否是静态的，默认为 false。
 * @param loc 节点的位置信息，默认为 locStub。
 * @param constType 常量类型，表示表达式的求值是否是常量。默认为 ConstantTypes.NOT_CONSTANT。
 * @returns
 * 在函数内部，使用参数的值创建一个 SimpleExpressionNode 对象：

type: NodeTypes.SIMPLE_EXPRESSION：节点类型为 SIMPLE_EXPRESSION，表示一个简单的表达式节点。
loc: loc：节点的位置信息。
content: content：表达式的内容。
isStatic: isStatic：表达式是否是静态的。
constType: isStatic ? ConstantTypes.CAN_STRINGIFY : constType：根据 isStatic 的值确定常量类型，如果表达式是静态的，则常量类型为 ConstantTypes.CAN_STRINGIFY，否则使用传入的 constType 值。
最后，函数返回创建的 SimpleExpressionNode 对象。
 */
export function createSimpleExpression(
  content: SimpleExpressionNode['content'],
  isStatic: SimpleExpressionNode['isStatic'] = false,
  loc: SourceLocation = locStub,
  constType: ConstantTypes = ConstantTypes.NOT_CONSTANT
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    loc,
    content,
    isStatic,
    constType: isStatic ? ConstantTypes.CAN_STRINGIFY : constType
  }
}
/**
 * createInterpolation 是一个用于创建 InterpolationNode 对象的函数。它接收两个参数：
 * @param content 插值的内容，可以是一个 InterpolationNode['content'] 对象或一个字符串。
 * @param loc 节点的位置信息。
 * @returns
 * 在函数内部，根据 content 的类型，创建一个 InterpolationNode 对象：

type: NodeTypes.INTERPOLATION：节点类型为 INTERPOLATION，表示一个插值节点。
loc: loc：节点的位置信息。
content: isString(content) ? createSimpleExpression(content, false, loc) : content：如果 content 是字符串，则使用 createSimpleExpression 函数创建一个简单表达式节点作为插值的内容，否则直接使用传入的 content 值。
最后，函数返回创建的 InterpolationNode 对象。
 */
export function createInterpolation(
  content: InterpolationNode['content'] | string,
  loc: SourceLocation
): InterpolationNode {
  return {
    type: NodeTypes.INTERPOLATION,
    loc,
    content: isString(content)
      ? createSimpleExpression(content, false, loc)
      : content
  }
}
/**
 *createCompoundExpression 是一个用于创建 CompoundExpressionNode 对象的函数。它接收两个参数：
 * @param children 一个数组，包含了 CompoundExpressionNode 的子节点。
 * @param loc 节点的位置信息，默认为 locStub。
 * @returns
 * 在函数内部，创建一个 CompoundExpressionNode 对象：

type: NodeTypes.COMPOUND_EXPRESSION：节点类型为 COMPOUND_EXPRESSION，表示一个复合表达式节点。
loc: loc：节点的位置信息。
children: children：将传入的 children 参数赋值给节点的 children 属性。
最后，函数返回创建的 CompoundExpressionNode 对象。
 */
export function createCompoundExpression(
  children: CompoundExpressionNode['children'],
  loc: SourceLocation = locStub
): CompoundExpressionNode {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    loc,
    children
  }
}
/**
 * InferCodegenNodeType 是一个泛型类型，根据给定的类型 T 推断出对应的节点类型。

它使用了条件类型（conditional type）进行判断：

如果 T 是 typeof RENDER_SLOT 类型，则返回 RenderSlotCall 类型。
否则，返回 CallExpression 类型。
这个类型可以用于根据不同的类型选择不同的节点类型。例如，如果 T 是 typeof RENDER_SLOT，那么返回的节点类型就是 RenderSlotCall；否则，返回的节点类型就是 CallExpression。
 */
type InferCodegenNodeType<T> = T extends typeof RENDER_SLOT
  ? RenderSlotCall
  : CallExpression
/**
 * createCallExpression 是一个泛型函数，根据给定的 callee 类型推断出返回的节点类型。
 * @param callee 表示调用表达式的调用对象，类型为 T。
 * @param args 表示调用表达式的参数列表，默认为空数组。
 * @param loc 表示调用表达式的位置信息，默认为 locStub。
 * @returns
 * 函数根据 T 的类型创建一个调用表达式节点，并根据 T 的类型推断出节点的具体类型，然后将节点类型断言为 InferCodegenNodeType<T>。

使用这个函数可以根据 callee 的类型自动推断出节点的类型。例如，如果 callee 是 typeof RENDER_SLOT，则返回的节点类型就是 RenderSlotCall；否则，返回的节点类型就是 CallExpression。
 */
export function createCallExpression<T extends CallExpression['callee']>(
  callee: T,
  args: CallExpression['arguments'] = [],
  loc: SourceLocation = locStub
): InferCodegenNodeType<T> {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    loc,
    callee,
    arguments: args
  } as InferCodegenNodeType<T>
}
/**
 * createFunctionExpression 函数用于创建函数表达式节点。

它接受以下参数：
 * @param params  表示函数的参数列表，类型为 FunctionExpression['params']，默认为 undefined。
 * @param returns  表示函数的返回值，类型为 FunctionExpression['returns']，默认为 undefined。
 * @param newline  表示是否在函数表达式后添加换行符，类型为 boolean，默认为 false。
 * @param isSlot  表示函数是否是插槽函数，类型为 boolean，默认为 false。
 * @param loc  表示函数表达式的位置信息，类型为 SourceLocation，默认为 locStub。
 * @returns 
 * 函数根据参数值创建一个函数表达式节点，并返回该节点。

这个函数可以方便地创建函数表达式节点，并设置相关的属性。
 */
export function createFunctionExpression(
  params: FunctionExpression['params'],
  returns: FunctionExpression['returns'] = undefined,
  newline: boolean = false,
  isSlot: boolean = false,
  loc: SourceLocation = locStub
): FunctionExpression {
  return {
    type: NodeTypes.JS_FUNCTION_EXPRESSION,
    params,
    returns,
    newline,
    isSlot,
    loc
  }
}
/**
 * createConditionalExpression 函数用于创建条件表达式节点。

它接受以下参数：
 * @param test 表示条件表达式的测试部分，类型为 ConditionalExpression['test']。
 * @param consequent 表示条件表达式的成立部分，类型为 ConditionalExpression['consequent']。
 * @param alternate 表示条件表达式的不成立部分，类型为 ConditionalExpression['alternate']。
 * @param newline 表示是否在条件表达式后添加换行符，类型为 boolean，默认为 true。
 * @returns 
 * 数根据参数值创建一个条件表达式节点，并返回该节点。

这个函数可以方便地创建条件表达式节点，并设置相关的属性。
 */
export function createConditionalExpression(
  test: ConditionalExpression['test'],
  consequent: ConditionalExpression['consequent'],
  alternate: ConditionalExpression['alternate'],
  newline = true
): ConditionalExpression {
  return {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
    test,
    consequent,
    alternate,
    newline,
    loc: locStub
  }
}
/**
 * createCacheExpression 函数用于创建缓存表达式节点。

它接受以下参数：
 * @param index 表示缓存表达式的索引值，类型为 number。
 * @param value 表示需要缓存的表达式节点，类型为 JSChildNode。
 * @param isVNode 表示缓存的值是否为虚拟节点，类型为 boolean，默认为 false。
 * @returns 
 * 函数根据参数值创建一个缓存表达式节点，并返回该节点。

这个函数可以方便地创建缓存表达式节点，并设置相关的属性。
 */
export function createCacheExpression(
  index: number,
  value: JSChildNode,
  isVNode: boolean = false
): CacheExpression {
  return {
    type: NodeTypes.JS_CACHE_EXPRESSION,
    index,
    value,
    isVNode,
    loc: locStub
  }
}
/**
 * createBlockStatement 函数用于创建块级语句节点。

它接受以下参数：
 * @param body 表示块级语句的主体部分，类型为 (JSChildNode | IfStatement)[]。
 * @returns 
 * 函数根据参数值创建一个块级语句节点，并返回该节点。

这个函数可以方便地创建块级语句节点，并设置相关的属性。块级语句节点表示由大括号包裹的语句块，可以包含多个语句或者条件语句。
 */
export function createBlockStatement(
  body: BlockStatement['body']
): BlockStatement {
  return {
    type: NodeTypes.JS_BLOCK_STATEMENT,
    body,
    loc: locStub
  }
}
/**
 *createTemplateLiteral 函数用于创建模板字面量节点。
 * @param elements 表示模板字面量的元素列表，类型为 (string | JSChildNode)[]。
 * @returns
 * 函数根据参数值创建一个模板字面量节点，并返回该节点。

模板字面量节点表示模板字符串的表达式，可以包含字符串文本和嵌入的表达式。通过将字符串文本和表达式的节点组合在一起，可以构建复杂的模板字符串。
 */
export function createTemplateLiteral(
  elements: TemplateLiteral['elements']
): TemplateLiteral {
  return {
    type: NodeTypes.JS_TEMPLATE_LITERAL,
    elements,
    loc: locStub
  }
}
/**
 * createIfStatement 函数用于创建条件语句节点。
 * @param test 表示条件判断的表达式节点。
 * @param consequent 表示条件为真时执行的语句块节点。
 * @param alternate 表示条件为假时执行的语句块节点（可选）。
 * @returns
 * 条件语句节点表示一个条件判断，根据判断结果选择执行不同的语句块。当条件为真时，执行 consequent 中的语句块；当条件为假时，执行 alternate 中的语句块（如果提供了 alternate）。

注意：alternate 可以是另一个条件语句节点，从而实现嵌套的条件判断。
 */
export function createIfStatement(
  test: IfStatement['test'],
  consequent: IfStatement['consequent'],
  alternate?: IfStatement['alternate']
): IfStatement {
  return {
    type: NodeTypes.JS_IF_STATEMENT,
    test,
    consequent,
    alternate,
    loc: locStub
  }
}
/**
 * createAssignmentExpression 函数用于创建赋值表达式节点。
 * @param left left：表示赋值操作的左侧表达式节点，即要被赋值的目标。
 * @param right right：表示赋值操作的右侧表达式节点，即赋给目标的值。
 * @returns
 * 函数根据参数值创建一个赋值表达式节点，并返回该节点。

赋值表达式节点表示将右侧的值赋给左侧的目标。例如，a = b，其中 a 是左侧的目标，b 是右侧的值。

注意：赋值表达式节点可以嵌套，例如 a = b = c，其中 b = c 是一个赋值表达式节点，其值再被赋给 a。在 AST 中，赋值表达式节点的结构是从右到左结合的。
 */
export function createAssignmentExpression(
  left: AssignmentExpression['left'],
  right: AssignmentExpression['right']
): AssignmentExpression {
  return {
    type: NodeTypes.JS_ASSIGNMENT_EXPRESSION,
    left,
    right,
    loc: locStub
  }
}
/**
 * createSequenceExpression 函数用于创建序列表达式节点。
 * @param expressions expressions：表示序列表达式中的表达式节点数组。

 * @returns
函数根据参数值创建一个序列表达式节点，并返回该节点。

序列表达式节点表示按顺序执行多个表达式，并返回最后一个表达式的值作为整个序列表达式的值。例如，a = 1, b = 2, c = a + b，其中 a = 1、b = 2 和 c = a + b 都是序列表达式中的表达式节点。

注意：序列表达式节点的值是最后一个表达式的值。在 AST 中，序列表达式节点的结构是从左到右结合的。
 */
export function createSequenceExpression(
  expressions: SequenceExpression['expressions']
): SequenceExpression {
  return {
    type: NodeTypes.JS_SEQUENCE_EXPRESSION,
    expressions,
    loc: locStub
  }
}
/**
 * createReturnStatement 函数用于创建返回语句节点。
 * @param returns 表示返回语句中的返回值，可以是模板子节点、模板子节点数组或 JavaScript 子节点。
 * @returns
 * 函数根据参数值创建一个返回语句节点，并返回该节点。

返回语句节点表示从当前函数中返回一个值。它包含一个返回值，可以是单个模板子节点、模板子节点数组或 JavaScript 子节点。例如，return 42 或 return [1, 2, 3]。

注意：返回语句节点用于表示函数的返回值，它位于函数体内部。在 AST 中，返回语句节点的结构类似于其他语句节点，但它包含一个额外的 returns 属性，用于表示返回值。
 */
export function createReturnStatement(
  returns: ReturnStatement['returns']
): ReturnStatement {
  return {
    type: NodeTypes.JS_RETURN_STATEMENT,
    returns,
    loc: locStub
  }
}
/**
 * getVNodeHelper 函数根据给定的参数返回相应的虚拟节点创建助手函数。
 * @param ssr 一个布尔值，表示是否在服务器端渲染 (SSR) 上下文中。
 * @param isComponent 一个布尔值，表示是否在组件上下文中。
 * @returns
 * 根据 ssr 和 isComponent 的值，函数返回相应的虚拟节点创建助手函数。

如果 ssr 为 true，或者 isComponent 为 true，则返回 CREATE_VNODE。这是在服务器端渲染或组件上下文中创建虚拟节点的助手函数。
否则，返回 CREATE_ELEMENT_VNODE。这是在普通的非组件上下文中创建虚拟节点的助手函数。
虚拟节点创建助手函数用于在代码生成阶段创建虚拟节点。它们是 Vue 框架或编译器生成的辅助函数，用于将模板转换为相应的虚拟节点表示。根据不同的上下文和需求，可能会选择不同的助手函数来创建虚拟节点。
 */
export function getVNodeHelper(ssr: boolean, isComponent: boolean) {
  return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}
/**
 * 函数根据给定的参数返回相应的块级虚拟节点创建助手函数。
 * @param ssr 一个布尔值，表示是否在服务器端渲染 (SSR) 上下文中。
 * @param isComponent 一个布尔值，表示是否在组件上下文中。
 * @returns
 * 根据 ssr 和 isComponent 的值，函数返回相应的块级虚拟节点创建助手函数。

如果 ssr 为 true，或者 isComponent 为 true，则返回 CREATE_BLOCK。这是在服务器端渲染或组件上下文中创建块级虚拟节点的助手函数。
否则，返回 CREATE_ELEMENT_BLOCK。这是在普通的非组件上下文中创建块级虚拟节点的助手函数。
块级虚拟节点创建助手函数用于在代码生成阶段创建块级虚拟节点。块级虚拟节点是指具有动态内容的节点，例如带有条件语句或循环的节点。块级虚拟节点由 v-if、v-for 等指令生成，并且与普通虚拟节点的创建方式略有不同。因此，根据不同的上下文和需求，可能会选择不同的助手函数来创建块级虚拟节点。
 */
export function getVNodeBlockHelper(ssr: boolean, isComponent: boolean) {
  return ssr || isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
}
/**
 * 用于将给定的 VNodeCall 节点转换为块级节点。
 * @param node 要转换的 VNodeCall 节点。
 * @param param1 转换上下文，包含了一些转换过程中需要使用的助手函数。
 * 函数的主要逻辑如下：

检查节点的 isBlock 属性是否为 false。如果是，则表示该节点尚未被转换为块级节点，需要进行转换。
将节点的 isBlock 属性设置为 true，表示节点已经被转换为块级节点。
从转换上下文的助手函数中移除普通虚拟节点的创建助手函数，即移除 getVNodeHelper 返回的助手函数。
添加块级虚拟节点的创建助手函数到转换上下文的助手函数中，即添加 getVNodeBlockHelper 返回的助手函数。
通过执行以上步骤，convertToBlock 函数将节点转换为块级节点，并确保在代码生成阶段使用正确的助手函数创建块级虚拟节点。
 */
export function convertToBlock(
  node: VNodeCall,
  { helper, removeHelper, inSSR }: TransformContext
) {
  if (!node.isBlock) {
    node.isBlock = true
    removeHelper(getVNodeHelper(inSSR, node.isComponent))
    helper(OPEN_BLOCK)
    helper(getVNodeBlockHelper(inSSR, node.isComponent))
  }
}
