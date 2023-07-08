import {
  Node,
  Identifier,
  BlockStatement,
  Program,
  VariableDeclaration,
  ObjectPattern,
  Expression
} from '@babel/types'
import { walk } from 'estree-walker'
import {
  BindingTypes,
  extractIdentifiers,
  isFunctionType,
  isInDestructureAssignment,
  isReferencedIdentifier,
  isStaticProperty,
  walkFunctionParams
} from '@vue/compiler-dom'
import { genPropsAccessExp } from '@vue/shared'
import { isCallOf, resolveObjectKey, unwrapTSNode } from './utils'
import { ScriptCompileContext } from './context'
import { DEFINE_PROPS } from './defineProps'
import { warnOnce } from '../warn'
/**
 * 
 * @param ctx 
 * @param declId 
 * @returns 
 * 函数 `processPropsDestructure` 用于处理 props 解构的过程。

该函数接收两个参数：
- `ctx: ScriptCompileContext`：脚本编译上下文对象。
- `declId: ObjectPattern`：表示解构赋值的对象模式的 AST 节点。

函数的主要逻辑如下：

1. 首先判断是否启用了 props 解构或响应式转换功能，如果未启用，则直接将解构的标识符存储在 `ctx.propsIdentifier` 中，并返回。
2. 如果启用了 props 解构或响应式转换功能，则发出一条警告，提醒用户这是一个实验性的功能，可能会在未来发生重大变化或被移除。
3. 将解构的对象模式存储在 `ctx.propsDestructureDecl` 中。
4. 定义 `registerBinding` 函数，用于注册绑定关系。该函数接收三个参数：`key`（公共 prop 键名）、`local`（本地标识符，可能与键名不同）、`defaultValue`（默认值）。
5. 遍历解构的属性列表，对每个属性进行处理。
   - 如果属性类型是 `'ObjectProperty'`，表示解构的是普通属性。
     - 获取属性的键名 `propKey`。
     - 如果键名不存在，则发出错误，提示不支持使用计算属性作为键名。
     - 如果属性的值类型是 `'AssignmentPattern'`，表示存在默认值。
       - 获取左侧模式（即解构的变量标识符）和右侧默认值表达式。
       - 如果左侧模式不是标识符类型，则发出错误，提示不支持嵌套模式。
       - 调用 `registerBinding` 函数，注册绑定关系，并传入键名、左侧模式的名称、右侧默认值表达式。
     - 如果属性的值类型是 `'Identifier'`，表示解构的是简单的标识符。
       - 调用 `registerBinding` 函数，注册绑定关系，并传入键名和标识符的名称。
     - 如果属性的值类型不在上述两种情况中，则发出错误，提示不支持嵌套模式。
   - 如果属性类型不是 `'ObjectProperty'`，表示解构的是剩余属性（rest spread）。
     - 将剩余属性的参数标识符存储在 `ctx.propsDestructureRestId` 中。
     - 注册绑定关系，将剩余属性的参数标识符标记为 `SETUP_REACTIVE_CONST` 类型。

该函数的作用是处理 props 解构的过程，并将解构的标识符和绑定关系存储在相应的上下文属性中。同时，它还会发出警告提醒用户使用实验性功能。
 */
export function processPropsDestructure(
  ctx: ScriptCompileContext,
  declId: ObjectPattern
) {
  if (!ctx.options.propsDestructure && !ctx.options.reactivityTransform) {
    ctx.propsIdentifier = ctx.getString(declId)
    return
  }

  warnOnce(
    `This project is using reactive props destructure, which is an experimental ` +
      ` feature. It may receive breaking changes or be removed in the future, so ` +
      `use at your own risk.\n` +
      `To stay updated, follow the RFC at https://github.com/vuejs/rfcs/discussions/502.`
  )

  ctx.propsDestructureDecl = declId

  const registerBinding = (
    key: string,
    local: string,
    defaultValue?: Expression
  ) => {
    ctx.propsDestructuredBindings[key] = { local, default: defaultValue }
    if (local !== key) {
      ctx.bindingMetadata[local] = BindingTypes.PROPS_ALIASED
      ;(ctx.bindingMetadata.__propsAliases ||
        (ctx.bindingMetadata.__propsAliases = {}))[local] = key
    }
  }

  for (const prop of declId.properties) {
    if (prop.type === 'ObjectProperty') {
      const propKey = resolveObjectKey(prop.key, prop.computed)

      if (!propKey) {
        ctx.error(
          `${DEFINE_PROPS}() destructure cannot use computed key.`,
          prop.key
        )
      }

      if (prop.value.type === 'AssignmentPattern') {
        // default value { foo = 123 }
        const { left, right } = prop.value
        if (left.type !== 'Identifier') {
          ctx.error(
            `${DEFINE_PROPS}() destructure does not support nested patterns.`,
            left
          )
        }
        registerBinding(propKey, left.name, right)
      } else if (prop.value.type === 'Identifier') {
        // simple destructure
        registerBinding(propKey, prop.value.name)
      } else {
        ctx.error(
          `${DEFINE_PROPS}() destructure does not support nested patterns.`,
          prop.value
        )
      }
    } else {
      // rest spread
      ctx.propsDestructureRestId = (prop.argument as Identifier).name
      // register binding
      ctx.bindingMetadata[ctx.propsDestructureRestId] =
        BindingTypes.SETUP_REACTIVE_CONST
    }
  }
}

/**
 * true -> prop binding
 * false -> local binding
 * `Scope` 是一个类型别名（type alias），表示一个记录类型，用于表示作用域（scope）。它是一个字符串类型的记录，每个键（key）都是一个作用域中的标识符，对应的值（value）是一个布尔值，表示该标识符是否在当前作用域中。

例如，假设存在以下作用域：

```typescript
const scope: Scope = {
  foo: true,
  bar: false,
  baz: true,
};
```

在上述代码中，`scope` 是一个类型为 `Scope` 的变量，其中：
- `foo` 和 `baz` 是在当前作用域中的标识符，对应的值为 `true`。
- `bar` 是不在当前作用域中的标识符，对应的值为 `false`。

通过使用 `Scope` 类型别名，可以在类型声明中明确指定作用域中标识符的存在与否，便于类型检查和类型推断。
 */
type Scope = Record<string, boolean>
/**
 * 
 * @param ctx 
 * @param vueImportAliases 
 * @returns 
 * 这段代码是一个用于转换解构的属性（props）的函数。它接受一个 `ScriptCompileContext` 对象和一个 `vueImportAliases` 对象作为参数。

函数首先检查是否启用了 `propsDestructure` 或 `reactivityTransform` 选项。如果没有启用，则直接返回。

接下来，函数定义了一些辅助函数和变量来处理作用域和标识符。它使用了 `Scope` 类型别名来表示作用域，使用了 `WeakSet` 来存储要排除的标识符，并创建了一个空的对象 `propsLocalToPublicMap`。

然后，函数遍历 `ctx.propsDestructuredBindings` 中的每个属性，并将其添加到 `rootScope` 和 `propsLocalToPublicMap` 中。

函数继续定义了一些用于处理作用域和标识符的辅助函数，例如 `pushScope`、`popScope`、`registerLocalBinding` 和 `walkScope`。

在 `rewriteId` 函数中，它重写了标识符，将其替换为 `propsLocalToPublicMap` 中对应的公共属性名称。

函数还定义了 `checkUsage` 函数，用于检查特定函数调用的使用情况，并在需要时发出警告。

接下来，函数从根作用域开始遍历整个 AST，并在遍历过程中处理作用域和标识符。它使用 `walkScope` 函数来遍历变量声明、函数声明等作用域中的语句，并使用 `rewriteId` 函数来重写需要替换的标识符。

最后，函数返回。这段代码的主要作用是对解构的属性进行转换和处理，包括重写标识符、检查函数调用的使用情况等。
 */
export function transformDestructuredProps(
  ctx: ScriptCompileContext,
  vueImportAliases: Record<string, string>
) {
  if (!ctx.options.propsDestructure && !ctx.options.reactivityTransform) {
    return
  }

  const rootScope: Scope = {}
  const scopeStack: Scope[] = [rootScope]
  let currentScope: Scope = rootScope
  const excludedIds = new WeakSet<Identifier>()
  const parentStack: Node[] = []
  const propsLocalToPublicMap: Record<string, string> = Object.create(null)

  for (const key in ctx.propsDestructuredBindings) {
    const { local } = ctx.propsDestructuredBindings[key]
    rootScope[local] = true
    propsLocalToPublicMap[local] = key
  }

  function pushScope() {
    scopeStack.push((currentScope = Object.create(currentScope)))
  }

  function popScope() {
    scopeStack.pop()
    currentScope = scopeStack[scopeStack.length - 1] || null
  }

  function registerLocalBinding(id: Identifier) {
    excludedIds.add(id)
    if (currentScope) {
      currentScope[id.name] = false
    } else {
      ctx.error(
        'registerBinding called without active scope, something is wrong.',
        id
      )
    }
  }

  function walkScope(node: Program | BlockStatement, isRoot = false) {
    for (const stmt of node.body) {
      if (stmt.type === 'VariableDeclaration') {
        walkVariableDeclaration(stmt, isRoot)
      } else if (
        stmt.type === 'FunctionDeclaration' ||
        stmt.type === 'ClassDeclaration'
      ) {
        if (stmt.declare || !stmt.id) continue
        registerLocalBinding(stmt.id)
      } else if (
        (stmt.type === 'ForOfStatement' || stmt.type === 'ForInStatement') &&
        stmt.left.type === 'VariableDeclaration'
      ) {
        walkVariableDeclaration(stmt.left)
      } else if (
        stmt.type === 'ExportNamedDeclaration' &&
        stmt.declaration &&
        stmt.declaration.type === 'VariableDeclaration'
      ) {
        walkVariableDeclaration(stmt.declaration, isRoot)
      } else if (
        stmt.type === 'LabeledStatement' &&
        stmt.body.type === 'VariableDeclaration'
      ) {
        walkVariableDeclaration(stmt.body, isRoot)
      }
    }
  }

  function walkVariableDeclaration(stmt: VariableDeclaration, isRoot = false) {
    if (stmt.declare) {
      return
    }
    for (const decl of stmt.declarations) {
      const isDefineProps =
        isRoot && decl.init && isCallOf(unwrapTSNode(decl.init), 'defineProps')
      for (const id of extractIdentifiers(decl.id)) {
        if (isDefineProps) {
          // for defineProps destructure, only exclude them since they
          // are already passed in as knownProps
          excludedIds.add(id)
        } else {
          registerLocalBinding(id)
        }
      }
    }
  }

  function rewriteId(id: Identifier, parent: Node, parentStack: Node[]) {
    if (
      (parent.type === 'AssignmentExpression' && id === parent.left) ||
      parent.type === 'UpdateExpression'
    ) {
      ctx.error(`Cannot assign to destructured props as they are readonly.`, id)
    }

    if (isStaticProperty(parent) && parent.shorthand) {
      // let binding used in a property shorthand
      // skip for destructure patterns
      if (
        !(parent as any).inPattern ||
        isInDestructureAssignment(parent, parentStack)
      ) {
        // { prop } -> { prop: __props.prop }
        ctx.s.appendLeft(
          id.end! + ctx.startOffset!,
          `: ${genPropsAccessExp(propsLocalToPublicMap[id.name])}`
        )
      }
    } else {
      // x --> __props.x
      ctx.s.overwrite(
        id.start! + ctx.startOffset!,
        id.end! + ctx.startOffset!,
        genPropsAccessExp(propsLocalToPublicMap[id.name])
      )
    }
  }

  function checkUsage(node: Node, method: string, alias = method) {
    if (isCallOf(node, alias)) {
      const arg = unwrapTSNode(node.arguments[0])
      if (arg.type === 'Identifier' && currentScope[arg.name]) {
        ctx.error(
          `"${arg.name}" is a destructured prop and should not be passed directly to ${method}(). ` +
            `Pass a getter () => ${arg.name} instead.`,
          arg
        )
      }
    }
  }

  // check root scope first
  const ast = ctx.scriptSetupAst!
  walkScope(ast, true)
  ;(walk as any)(ast, {
    enter(node: Node, parent?: Node) {
      parent && parentStack.push(parent)

      // skip type nodes
      if (
        parent &&
        parent.type.startsWith('TS') &&
        parent.type !== 'TSAsExpression' &&
        parent.type !== 'TSNonNullExpression' &&
        parent.type !== 'TSTypeAssertion'
      ) {
        return this.skip()
      }

      checkUsage(node, 'watch', vueImportAliases.watch)
      checkUsage(node, 'toRef', vueImportAliases.toRef)

      // function scopes
      if (isFunctionType(node)) {
        pushScope()
        walkFunctionParams(node, registerLocalBinding)
        if (node.body.type === 'BlockStatement') {
          walkScope(node.body)
        }
        return
      }

      // catch param
      if (node.type === 'CatchClause') {
        pushScope()
        if (node.param && node.param.type === 'Identifier') {
          registerLocalBinding(node.param)
        }
        walkScope(node.body)
        return
      }

      // non-function block scopes
      if (node.type === 'BlockStatement' && !isFunctionType(parent!)) {
        pushScope()
        walkScope(node)
        return
      }

      if (node.type === 'Identifier') {
        if (
          isReferencedIdentifier(node, parent!, parentStack) &&
          !excludedIds.has(node)
        ) {
          if (currentScope[node.name]) {
            rewriteId(node, parent!, parentStack)
          }
        }
      }
    },
    leave(node: Node, parent?: Node) {
      parent && parentStack.pop()
      if (
        (node.type === 'BlockStatement' && !isFunctionType(parent!)) ||
        isFunctionType(node)
      ) {
        popScope()
      }
    }
  })
}
