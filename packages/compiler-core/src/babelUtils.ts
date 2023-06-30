// should only use types from @babel/types
// do not import runtime methods
import type {
  Identifier,
  Node,
  Function,
  ObjectProperty,
  BlockStatement,
  Program
} from '@babel/types'
import { walk } from 'estree-walker'
/**
 * 
 * @param root 
 * @param onIdentifier 
 * @param includeAll 
 * @param parentStack 
 * @param knownIds 
 * @returns 
 * `walkIdentifiers` 是一个函数，用于遍历 AST（抽象语法树）中的标识符节点，并对每个标识符节点执行回调函数 `onIdentifier`。

函数签名如下：
```typescript
function walkIdentifiers(
  root: Node,
  onIdentifier: (
    node: Identifier,
    parent: Node,
    parentStack: Node[],
    isReference: boolean,
    isLocal: boolean
  ) => void,
  includeAll = false,
  parentStack: Node[] = [],
  knownIds: Record<string, number> = Object.create(null)
): void
```

参数解释：
- `root`：要遍历的根节点。
- `onIdentifier`：当遍历到标识符节点时要执行的回调函数。回调函数接收以下参数：
  - `node`：当前的标识符节点。
  - `parent`：父节点。
  - `parentStack`：父节点的堆栈。
  - `isReference`：标识符是否被引用。
  - `isLocal`：标识符是否是局部变量。
- `includeAll`：是否包含所有标识符，默认为 `false`。如果为 `true`，则对所有标识符执行回调函数，否则只对被引用的非局部变量执行回调函数。
- `parentStack`：父节点的堆栈，默认为空数组。
- `knownIds`：已知的标识符集合，默认为空对象。

该函数会遍历 AST，对于每个标识符节点，根据参数配置决定是否执行回调函数。回调函数可以用来处理标识符节点的信息，如标识符名称、父节点信息、引用情况等。

该函数在浏览器环境下不执行任何操作，直接返回。

请注意，该代码片段中引用了 `walk`、`isReferencedIdentifier`、`isFunctionType`、`walkFunctionParams` 和 `walkBlockDeclarations` 函数，这些函数的具体实现未在提供的代码中给出。
 */
export function walkIdentifiers(
  root: Node,
  onIdentifier: (
    node: Identifier,
    parent: Node,
    parentStack: Node[],
    isReference: boolean,
    isLocal: boolean
  ) => void,
  includeAll = false,
  parentStack: Node[] = [],
  knownIds: Record<string, number> = Object.create(null)
) {
  if (__BROWSER__) {
    return
  }

  const rootExp =
    root.type === 'Program' &&
    root.body[0].type === 'ExpressionStatement' &&
    root.body[0].expression

  ;(walk as any)(root, {
    enter(node: Node & { scopeIds?: Set<string> }, parent: Node | undefined) {
      parent && parentStack.push(parent)
      if (
        parent &&
        parent.type.startsWith('TS') &&
        !TS_NODE_TYPES.includes(parent.type)
      ) {
        return this.skip()
      }
      if (node.type === 'Identifier') {
        const isLocal = !!knownIds[node.name]
        const isRefed = isReferencedIdentifier(node, parent!, parentStack)
        if (includeAll || (isRefed && !isLocal)) {
          onIdentifier(node, parent!, parentStack, isRefed, isLocal)
        }
      } else if (
        node.type === 'ObjectProperty' &&
        parent!.type === 'ObjectPattern'
      ) {
        // mark property in destructure pattern
        ;(node as any).inPattern = true
      } else if (isFunctionType(node)) {
        // walk function expressions and add its arguments to known identifiers
        // so that we don't prefix them
        walkFunctionParams(node, id => markScopeIdentifier(node, id, knownIds))
      } else if (node.type === 'BlockStatement') {
        // #3445 record block-level local variables
        walkBlockDeclarations(node, id =>
          markScopeIdentifier(node, id, knownIds)
        )
      }
    },
    leave(node: Node & { scopeIds?: Set<string> }, parent: Node | undefined) {
      parent && parentStack.pop()
      if (node !== rootExp && node.scopeIds) {
        for (const id of node.scopeIds) {
          knownIds[id]--
          if (knownIds[id] === 0) {
            delete knownIds[id]
          }
        }
      }
    }
  })
}
/**
 * 
 * @param id 
 * @param parent 
 * @param parentStack 
 * @returns 
 * `isReferencedIdentifier` 是一个函数，用于判断标识符是否被引用。

函数签名如下：
```typescript
function isReferencedIdentifier(
  id: Identifier,
  parent: Node | null,
  parentStack: Node[]
): boolean
```

参数解释：
- `id`：要判断的标识符节点。
- `parent`：标识符节点的父节点。如果为 `null`，表示标识符节点没有父节点。
- `parentStack`：标识符节点的父节点堆栈。

该函数首先会检查是否处于浏览器环境（`__BROWSER__`），如果是，则直接返回 `false`。

然后，函数会根据不同的情况判断标识符是否被引用：
- 如果标识符名称是 `'arguments'`，则认为它不是被引用的。
- 如果标识符被 `isReferenced` 函数判断为被引用，则返回 `true`。
- 对于以下几种父节点类型：
  - `'AssignmentExpression'` 或 `'AssignmentPattern'`：表示标识符处于赋值表达式或赋值模式中，认为它是被引用的。
  - `'ObjectPattern'` 或 `'ArrayPattern'`：表示标识符处于解构赋值模式中，调用 `isInDestructureAssignment` 函数判断是否在解构赋值模式中，如果是，则认为它是被引用的。
  
如果以上条件都不满足，则认为标识符不是被引用的，返回 `false`。

请注意，该代码片段中引用了 `isReferenced` 和 `isInDestructureAssignment` 函数，这些函数的具体实现未在提供的代码中给出。
 */
export function isReferencedIdentifier(
  id: Identifier,
  parent: Node | null,
  parentStack: Node[]
) {
  if (__BROWSER__) {
    return false
  }

  if (!parent) {
    return true
  }

  // is a special keyword but parsed as identifier
  if (id.name === 'arguments') {
    return false
  }

  if (isReferenced(id, parent)) {
    return true
  }

  // babel's isReferenced check returns false for ids being assigned to, so we
  // need to cover those cases here
  switch (parent.type) {
    case 'AssignmentExpression':
    case 'AssignmentPattern':
      return true
    case 'ObjectPattern':
    case 'ArrayPattern':
      return isInDestructureAssignment(parent, parentStack)
  }

  return false
}
/**
 * 
 * @param parent 
 * @param parentStack 
 * @returns 
 * `isInDestructureAssignment` 是一个函数，用于判断标识符是否处于解构赋值模式中。

函数签名如下：
```typescript
function isInDestructureAssignment(
  parent: Node,
  parentStack: Node[]
): boolean
```

参数解释：
- `parent`：标识符节点的父节点。
- `parentStack`：标识符节点的父节点堆栈。

该函数首先检查 `parent` 是否存在且为 `'ObjectProperty'` 或 `'ArrayPattern'` 类型的节点，如果不是，则直接返回 `false`。

然后，函数从父节点堆栈 `parentStack` 的最后一个节点开始向前遍历，判断是否存在符合以下条件的节点：
- 节点类型为 `'AssignmentExpression'`，表示在解构赋值表达式中，返回 `true`。
- 节点类型不为 `'ObjectProperty'` 且不以 `'Pattern'` 结尾，表示已经跳出了解构赋值模式的范围，退出循环。

如果遍历结束后都没有满足条件的节点，则返回 `false`，表示标识符不处于解构赋值模式中。

请注意，该函数依赖于 `parentStack` 参数中保存的父节点信息，因此在调用该函数时，需要确保将正确的父节点堆栈传递给函数。
 */
export function isInDestructureAssignment(
  parent: Node,
  parentStack: Node[]
): boolean {
  if (
    parent &&
    (parent.type === 'ObjectProperty' || parent.type === 'ArrayPattern')
  ) {
    let i = parentStack.length
    while (i--) {
      const p = parentStack[i]
      if (p.type === 'AssignmentExpression') {
        return true
      } else if (p.type !== 'ObjectProperty' && !p.type.endsWith('Pattern')) {
        break
      }
    }
  }
  return false
}
/**
 * 
 * @param node 
 * @param onIdent 
 * `walkFunctionParams` 是一个函数，用于遍历函数参数并执行指定的回调函数。

函数签名如下：
```typescript
function walkFunctionParams(
  node: Function,
  onIdent: (id: Identifier) => void
): void
```

参数解释：
- `node`：函数节点，可以是函数声明、函数表达式等。
- `onIdent`：回调函数，接受一个标识符节点作为参数，在遍历函数参数时将对每个标识符节点调用该回调函数。

该函数通过遍历函数节点的参数列表 `node.params`，对于每个参数节点 `p`，提取其中的标识符节点并调用 `onIdent` 回调函数进行处理。

在提取标识符节点时，可以使用 `extractIdentifiers` 函数。该函数可以根据参数节点的类型，提取其中的标识符节点并返回一个标识符节点数组。遍历标识符节点数组，并对每个标识符节点调用 `onIdent` 回调函数。

示例用法：
```typescript
function handleIdentifier(id: Identifier) {
  // 处理标识符节点
  console.log(id.name);
}

const functionNode = // 函数节点

walkFunctionParams(functionNode, handleIdentifier);
```

上述示例中，定义了一个名为 `handleIdentifier` 的回调函数，用于处理标识符节点。然后创建一个函数节点 `functionNode`，调用 `walkFunctionParams` 函数，并传递函数节点和回调函数作为参数。函数将遍历函数参数并对每个标识符节点调用 `handleIdentifier` 进行处理。
 */
export function walkFunctionParams(
  node: Function,
  onIdent: (id: Identifier) => void
) {
  for (const p of node.params) {
    for (const id of extractIdentifiers(p)) {
      onIdent(id)
    }
  }
}
/**
 * 
 * @param block 
 * @param onIdent 
 * `walkBlockDeclarations` 是一个函数，用于遍历块级作用域（`BlockStatement`）或程序体（`Program`）中的声明语句，并执行指定的回调函数。

函数签名如下：
```typescript
function walkBlockDeclarations(
  block: BlockStatement | Program,
  onIdent: (node: Identifier) => void
): void
```

参数解释：
- `block`：块级作用域节点（`BlockStatement`）或程序体节点（`Program`）。
- `onIdent`：回调函数，接受一个标识符节点作为参数，在遍历声明语句时将对每个标识符节点调用该回调函数。

该函数通过遍历块级作用域或程序体节点的 `body` 属性，对于每个语句节点 `stmt`，判断其类型，并根据类型进行相应的处理：

- 如果语句节点类型为 `VariableDeclaration`，表示是变量声明语句，则进一步遍历其声明列表 `stmt.declarations`，对于每个声明节点 `decl`，提取其中的标识符节点并调用 `onIdent` 回调函数进行处理。
- 如果语句节点类型为 `FunctionDeclaration` 或 `ClassDeclaration`，表示是函数声明或类声明语句，则判断是否有声明关键字 `declare` 或者是否存在标识符节点 `stmt.id`。若满足条件，则调用 `onIdent` 回调函数处理该标识符节点。

在提取标识符节点时，可以使用 `extractIdentifiers` 函数。该函数可以根据节点的类型，提取其中的标识符节点并返回一个标识符节点数组。遍历标识符节点数组，并对每个标识符节点调用 `onIdent` 回调函数。

示例用法：
```typescript
function handleIdentifier(id: Identifier) {
  // 处理标识符节点
  console.log(id.name);
}

const blockNode = // 块级作用域节点或程序体节点

walkBlockDeclarations(blockNode, handleIdentifier);
```

上述示例中，定义了一个名为 `handleIdentifier` 的回调函数，用于处理标识符节点。然后创建一个块级作用域节点或程序体节点 `blockNode`，调用 `walkBlockDeclarations` 函数，并传递节点和回调函数作为参数。函数将遍历声明语句并对每个标识符节点调用 `handleIdentifier` 进行处理。
 */
export function walkBlockDeclarations(
  block: BlockStatement | Program,
  onIdent: (node: Identifier) => void
) {
  for (const stmt of block.body) {
    if (stmt.type === 'VariableDeclaration') {
      if (stmt.declare) continue
      for (const decl of stmt.declarations) {
        for (const id of extractIdentifiers(decl.id)) {
          onIdent(id)
        }
      }
    } else if (
      stmt.type === 'FunctionDeclaration' ||
      stmt.type === 'ClassDeclaration'
    ) {
      if (stmt.declare || !stmt.id) continue
      onIdent(stmt.id)
    }
  }
}
/**
 * 
 * @param param 
 * @param nodes 
 * @returns 
 * `extractIdentifiers` 是一个函数，用于从给定的节点中提取标识符节点（`Identifier`）并返回一个标识符节点数组。

函数签名如下：
```typescript
function extractIdentifiers(
  param: Node,
  nodes: Identifier[] = []
): Identifier[]
```

参数解释：
- `param`：要提取标识符节点的节点。
- `nodes`：用于存储提取的标识符节点的数组。该参数是可选的，默认为空数组。

函数通过使用 `switch` 语句根据节点的类型进行不同的处理：

- 如果节点类型为 `Identifier`，表示是标识符节点，将其添加到 `nodes` 数组中。
- 如果节点类型为 `MemberExpression`，表示是成员表达式节点，通过循环遍历成员表达式的对象部分，直到找到最内层的标识符节点，将其添加到 `nodes` 数组中。
- 如果节点类型为 `ObjectPattern`，表示是对象解构模式节点，遍历对象模式的属性列表，对于每个属性节点 `prop`，如果是 `RestElement` 类型，则递归调用 `extractIdentifiers` 提取其参数节点；否则，递归调用 `extractIdentifiers` 提取属性值节点。
- 如果节点类型为 `ArrayPattern`，表示是数组解构模式节点，遍历数组模式的元素列表，对于每个非空元素节点 `element`，递归调用 `extractIdentifiers` 提取其节点。
- 如果节点类型为 `RestElement`，表示是剩余元素节点，递归调用 `extractIdentifiers` 提取其参数节点。
- 如果节点类型为 `AssignmentPattern`，表示是赋值模式节点，递归调用 `extractIdentifiers` 提取其左侧节点。

最后，函数返回存储提取的标识符节点的 `nodes` 数组。

示例用法：
```typescript
const node = // 节点

const identifiers = extractIdentifiers(node);
identifiers.forEach(id => {
  // 处理标识符节点
  console.log(id.name);
});
```

上述示例中，创建一个节点 `node`，然后调用 `extractIdentifiers` 函数并传入该节点。函数将提取节点中的标识符节点，并返回一个标识符节点数组。通过遍历标识符节点数组，可以对每个标识符节点进行处理。
 */
export function extractIdentifiers(
  param: Node,
  nodes: Identifier[] = []
): Identifier[] {
  switch (param.type) {
    case 'Identifier':
      nodes.push(param)
      break

    case 'MemberExpression':
      let object: any = param
      while (object.type === 'MemberExpression') {
        object = object.object
      }
      nodes.push(object)
      break

    case 'ObjectPattern':
      for (const prop of param.properties) {
        if (prop.type === 'RestElement') {
          extractIdentifiers(prop.argument, nodes)
        } else {
          extractIdentifiers(prop.value, nodes)
        }
      }
      break

    case 'ArrayPattern':
      param.elements.forEach(element => {
        if (element) extractIdentifiers(element, nodes)
      })
      break

    case 'RestElement':
      extractIdentifiers(param.argument, nodes)
      break

    case 'AssignmentPattern':
      extractIdentifiers(param.left, nodes)
      break
  }

  return nodes
}
/**
 * 
 * @param node 
 * @param child 
 * @param knownIds 
 * @returns 
 * `markScopeIdentifier` 是一个函数，用于标记作用域中的标识符。它将给定的标识符节点添加到作用域标识符集合中，并更新已知标识符的计数。

函数签名如下：
```typescript
function markScopeIdentifier(
  node: Node & { scopeIds?: Set<string> },
  child: Identifier,
  knownIds: Record<string, number>
): void
```

参数解释：
- `node`：包含作用域标识符集合的节点。节点类型必须具有 `scopeIds` 属性或者支持扩展属性。
- `child`：要标记的标识符节点。
- `knownIds`：已知标识符的记录，其中键是标识符的名称，值是标识符的计数。

函数的主要逻辑如下：
- 首先，从标识符节点 `child` 中获取名称 `name`。
- 然后，检查如果 `node` 已经具有作用域标识符集合 `scopeIds`，并且该集合已经包含了名称 `name`，则直接返回，不进行重复标记。
- 否则，如果名称 `name` 已经存在于 `knownIds` 中，则增加其计数。
- 否则，将名称 `name` 添加到 `knownIds` 中，并初始化计数为 1。
- 最后，将名称 `name` 添加到 `node` 的作用域标识符集合 `scopeIds` 中。

函数没有返回值。

这个函数的目的是跟踪作用域中的标识符，并对已知标识符进行计数。它可以在 AST（抽象语法树）遍历过程中使用，用于分析和处理标识符的作用域信息。

示例用法：
```typescript
const node = // 包含作用域标识符集合的节点
const child = // 要标记的标识符节点
const knownIds = // 已知标识符的记录

markScopeIdentifier(node, child, knownIds);
```

上述示例中，调用 `markScopeIdentifier` 函数，将节点 `node`、标识符节点 `child` 和已知标识符的记录 `knownIds` 作为参数传递给函数。函数将会更新作用域标识符集合，并更新已知标识符的计数。
 */
function markScopeIdentifier(
  node: Node & { scopeIds?: Set<string> },
  child: Identifier,
  knownIds: Record<string, number>
) {
  const { name } = child
  if (node.scopeIds && node.scopeIds.has(name)) {
    return
  }
  if (name in knownIds) {
    knownIds[name]++
  } else {
    knownIds[name] = 1
  }
  ;(node.scopeIds || (node.scopeIds = new Set())).add(name)
}
/**
 * 
 * @param node 
 * @returns 
 * `isFunctionType` 是一个函数，用于检查节点是否表示函数类型。它通过匹配节点的类型来判断节点是否是函数类型。

函数签名如下：
```typescript
const isFunctionType = (node: Node): node is Function => {
  return /Function(?:Expression|Declaration)$|Method$/.test(node.type)
}
```

参数解释：
- `node`：要检查的节点。

函数的主要逻辑如下：
- 使用正则表达式 `/Function(?:Expression|Declaration)$|Method$/` 对节点的类型进行匹配。
- 如果节点的类型与正则表达式匹配成功，则返回 `true`，表示节点是函数类型。
- 否则，返回 `false`，表示节点不是函数类型。

这个函数可以用于判断 AST（抽象语法树）中的节点是否表示函数类型。它适用于函数表达式、函数声明和方法等节点。

示例用法：
```typescript
const node = // 要检查的节点

if (isFunctionType(node)) {
  // 节点表示函数类型
} else {
  // 节点不表示函数类型
}
```

上述示例中，根据节点的类型使用 `isFunctionType` 函数进行判断。如果返回值为 `true`，则表示节点是函数类型；如果返回值为 `false`，则表示节点不是函数类型。根据返回值可以执行相应的逻辑处理。
 */
export const isFunctionType = (node: Node): node is Function => {
  return /Function(?:Expression|Declaration)$|Method$/.test(node.type)
}
/**
 * 
 * @param node 
 * @returns 
 * `isStaticProperty` 是一个函数，用于检查节点是否表示静态属性。它通过匹配节点的类型和计算属性标志来判断节点是否是静态属性。

函数签名如下：
```typescript
const isStaticProperty = (node: Node): node is ObjectProperty =>
  node &&
  (node.type === 'ObjectProperty' || node.type === 'ObjectMethod') &&
  !node.computed
```

参数解释：
- `node`：要检查的节点。

函数的主要逻辑如下：
- 首先，判断节点是否存在（非 `null` 或 `undefined`）。
- 然后，判断节点的类型是否为 `'ObjectProperty'` 或 `'ObjectMethod'`。
- 最后，判断节点的计算属性标志 `computed` 是否为 `false`。

如果节点存在、类型为 `'ObjectProperty'` 或 `'ObjectMethod'`，且计算属性标志为 `false`，则认为节点表示静态属性，并返回 `true`。否则，返回 `false`。

这个函数可以用于判断 AST（抽象语法树）中的节点是否表示静态属性。静态属性是对象字面量中的非计算属性，可以是对象属性或对象方法。

示例用法：
```typescript
const node = // 要检查的节点

if (isStaticProperty(node)) {
  // 节点表示静态属性
} else {
  // 节点不表示静态属性
}
```

上述示例中，根据节点的类型和计算属性标志使用 `isStaticProperty` 函数进行判断。如果返回值为 `true`，则表示节点是静态属性；如果返回值为 `false`，则表示节点不是静态属性。根据返回值可以执行相应的逻辑处理。
 */
export const isStaticProperty = (node: Node): node is ObjectProperty =>
  node &&
  (node.type === 'ObjectProperty' || node.type === 'ObjectMethod') &&
  !node.computed
/**
 * 
 * @param node 
 * @param parent 
 * @returns 
 * `isStaticPropertyKey` 是一个函数，用于检查给定的节点是否是静态属性的键。它通过验证父节点是否是静态属性且父节点的键与给定的节点匹配来判断。

函数签名如下：
```typescript
const isStaticPropertyKey = (node: Node, parent: Node) =>
  isStaticProperty(parent) && parent.key === node
```

参数解释：
- `node`：要检查的节点。
- `parent`：节点的父节点。

函数的主要逻辑如下：
- 首先，通过调用 `isStaticProperty` 函数检查父节点是否是静态属性。
- 然后，判断父节点的键是否与给定的节点相同。

如果父节点是静态属性且父节点的键与给定的节点相同，则返回 `true`，表示给定的节点是静态属性的键。否则，返回 `false`。

这个函数通常与 AST（抽象语法树）遍历和分析相关的代码一起使用，用于确定特定节点是否是静态属性的键。静态属性的键是指静态属性的名称或表达式。

示例用法：
```typescript
const node = // 要检查的节点
const parent = // 节点的父节点

if (isStaticPropertyKey(node, parent)) {
  // 节点是静态属性的键
} else {
  // 节点不是静态属性的键
}
```

上述示例中，通过调用 `isStaticPropertyKey` 函数并传入要检查的节点和其父节点，可以确定给定的节点是否是静态属性的键。根据返回值可以执行相应的逻辑处理。如果返回值为 `true`，则表示节点是静态属性的键；如果返回值为 `false`，则表示节点不是静态属性的键。
 */
export const isStaticPropertyKey = (node: Node, parent: Node) =>
  isStaticProperty(parent) && parent.key === node

/**
 * Copied from https://github.com/babel/babel/blob/main/packages/babel-types/src/validators/isReferenced.ts
 * To avoid runtime dependency on @babel/types (which includes process references)
 * This file should not change very often in babel but we may need to keep it
 * up-to-date from time to time.
 *
 * https://github.com/babel/babel/blob/main/LICENSE
 *
 * `isReferenced` 是一个函数，用于判断给定的节点是否被引用。它通过检查节点的类型以及其在 AST 中的父节点、祖父节点等上下文信息来确定节点是否被引用。

函数签名如下：
```typescript
function isReferenced(node: Node, parent: Node, grandparent?: Node): boolean
```

参数解释：
- `node`：要检查的节点。
- `parent`：节点的父节点。
- `grandparent`：节点的祖父节点（可选）。

函数的主要逻辑如下：
- 根据父节点的类型和节点的类型，判断节点是否被引用。
- 函数通过多个 `case` 语句处理各种情况，包括成员表达式、变量声明、箭头函数、类属性、赋值表达式、函数声明等等。
- 对于每种情况，根据节点的位置关系和语义判断节点是否被引用，返回相应的布尔值。

函数返回值为布尔值，表示节点是否被引用。如果返回 `true`，则表示节点被引用；如果返回 `false`，则表示节点未被引用。

这个函数通常与 AST（抽象语法树）遍历和分析相关的代码一起使用，用于确定特定节点是否被引用。根据返回值可以执行相应的逻辑处理。如果返回值为 `true`，则表示节点被引用；如果返回值为 `false`，则表示节点未被引用。

示例用法：
```typescript
const node = // 要检查的节点
const parent = // 节点的父节点
const grandparent = // 节点的祖父节点（可选）

if (isReferenced(node, parent, grandparent)) {
  // 节点被引用
} else {
  // 节点未被引用
}
```

上述示例中，通过调用 `isReferenced` 函数并传入要检查的节点、其父节点和祖父节点（如果有），可以确定给定的节点是否被引用。根据返回值可以执行相应的逻辑处理。如果返回值为 `true`，则表示节点被引用；如果返回值为 `false`，则表示节点未被引用。
 */
function isReferenced(node: Node, parent: Node, grandparent?: Node): boolean {
  switch (parent.type) {
    // yes: PARENT[NODE]
    // yes: NODE.child
    // no: parent.NODE
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      if (parent.property === node) {
        return !!parent.computed
      }
      return parent.object === node

    case 'JSXMemberExpression':
      return parent.object === node
    // no: let NODE = init;
    // yes: let id = NODE;
    case 'VariableDeclarator':
      return parent.init === node

    // yes: () => NODE
    // no: (NODE) => {}
    case 'ArrowFunctionExpression':
      return parent.body === node

    // no: class { #NODE; }
    // no: class { get #NODE() {} }
    // no: class { #NODE() {} }
    // no: class { fn() { return this.#NODE; } }
    case 'PrivateName':
      return false

    // no: class { NODE() {} }
    // yes: class { [NODE]() {} }
    // no: class { foo(NODE) {} }
    case 'ClassMethod':
    case 'ClassPrivateMethod':
    case 'ObjectMethod':
      if (parent.key === node) {
        return !!parent.computed
      }
      return false

    // yes: { [NODE]: "" }
    // no: { NODE: "" }
    // depends: { NODE }
    // depends: { key: NODE }
    case 'ObjectProperty':
      if (parent.key === node) {
        return !!parent.computed
      }
      // parent.value === node
      return !grandparent || grandparent.type !== 'ObjectPattern'
    // no: class { NODE = value; }
    // yes: class { [NODE] = value; }
    // yes: class { key = NODE; }
    case 'ClassProperty':
      if (parent.key === node) {
        return !!parent.computed
      }
      return true
    case 'ClassPrivateProperty':
      return parent.key !== node

    // no: class NODE {}
    // yes: class Foo extends NODE {}
    case 'ClassDeclaration':
    case 'ClassExpression':
      return parent.superClass === node

    // yes: left = NODE;
    // no: NODE = right;
    case 'AssignmentExpression':
      return parent.right === node

    // no: [NODE = foo] = [];
    // yes: [foo = NODE] = [];
    case 'AssignmentPattern':
      return parent.right === node

    // no: NODE: for (;;) {}
    case 'LabeledStatement':
      return false

    // no: try {} catch (NODE) {}
    case 'CatchClause':
      return false

    // no: function foo(...NODE) {}
    case 'RestElement':
      return false

    case 'BreakStatement':
    case 'ContinueStatement':
      return false

    // no: function NODE() {}
    // no: function foo(NODE) {}
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      return false

    // no: export NODE from "foo";
    // no: export * as NODE from "foo";
    case 'ExportNamespaceSpecifier':
    case 'ExportDefaultSpecifier':
      return false

    // no: export { foo as NODE };
    // yes: export { NODE as foo };
    // no: export { NODE as foo } from "foo";
    case 'ExportSpecifier':
      // @ts-expect-error
      if (grandparent?.source) {
        return false
      }
      return parent.local === node

    // no: import NODE from "foo";
    // no: import * as NODE from "foo";
    // no: import { NODE as foo } from "foo";
    // no: import { foo as NODE } from "foo";
    // no: import NODE from "bar";
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ImportSpecifier':
      return false

    // no: import "foo" assert { NODE: "json" }
    case 'ImportAttribute':
      return false

    // no: <div NODE="foo" />
    case 'JSXAttribute':
      return false

    // no: [NODE] = [];
    // no: ({ NODE }) = [];
    case 'ObjectPattern':
    case 'ArrayPattern':
      return false

    // no: new.NODE
    // no: NODE.target
    case 'MetaProperty':
      return false

    // yes: type X = { someProperty: NODE }
    // no: type X = { NODE: OtherType }
    case 'ObjectTypeProperty':
      return parent.key !== node

    // yes: enum X { Foo = NODE }
    // no: enum X { NODE }
    case 'TSEnumMember':
      return parent.id !== node

    // yes: { [NODE]: value }
    // no: { NODE: value }
    case 'TSPropertySignature':
      if (parent.key === node) {
        return !!parent.computed
      }

      return true
  }

  return true
}
/**
 * `TS_NODE_TYPES` 是一个包含多个 TypeScript AST 节点类型的常量数组。这些节点类型用于表示 TypeScript 中特定的语法结构。

以下是 `TS_NODE_TYPES` 数组中的节点类型：

1. `TSAsExpression`：类型断言表达式，形如 `foo as number`。
2. `TSTypeAssertion`：类型断言表达式，形如 `(<number>foo)`。
3. `TSNonNullExpression`：非空断言表达式，形如 `foo!`。
4. `TSInstantiationExpression`：泛型实例化表达式，形如 `foo<string>`。
5. `TSSatisfiesExpression`：类型满足表达式，形如 `foo satisfies T`。

这些节点类型用于描述 TypeScript 代码中特定的语法结构，例如类型断言、非空断言、泛型实例化等。通过检查节点的类型是否包含在 `TS_NODE_TYPES` 数组中，可以确定节点是否属于 TypeScript 相关的语法结构。

示例用法：
```typescript
const node = // 要检查的节点

if (TS_NODE_TYPES.includes(node.type)) {
  // 节点类型属于 TypeScript 相关的语法结构
} else {
  // 节点类型不属于 TypeScript 相关的语法结构
}
```

上述示例中，通过检查节点的类型是否包含在 `TS_NODE_TYPES` 数组中，可以确定节点是否属于 TypeScript 相关的语法结构。如果节点类型属于 TypeScript 相关的语法结构，则执行相应的逻辑处理；否则，执行其他逻辑处理。
 */
export const TS_NODE_TYPES = [
  'TSAsExpression', // foo as number
  'TSTypeAssertion', // (<number>foo)
  'TSNonNullExpression', // foo!
  'TSInstantiationExpression', // foo<string>
  'TSSatisfiesExpression' // foo satisfies T
]
