import {
  ArrayExpression,
  Node,
  ObjectExpression,
  Statement
} from '@babel/types'
import { BindingMetadata, BindingTypes } from '@vue/compiler-dom'
import { resolveObjectKey } from './utils'

/**
 * Analyze bindings in normal `<script>`
 * Note that `compileScriptSetup` already analyzes bindings as part of its
 * compilation process so this should only be used on single `<script>` SFCs.
 * `analyzeScriptBindings` 是一个函数，用于分析脚本中的绑定元数据（binding metadata）。

该函数接受一个表示脚本的抽象语法树（AST）的参数 `ast`，并遍历 AST 中的每个语句（`Statement`）。在遍历过程中，它寻找导出默认声明（`ExportDefaultDeclaration`）且声明类型为对象表达式（`ObjectExpression`）的节点。

如果找到符合条件的节点，它会将该节点传递给 `analyzeBindingsFromOptions` 函数进行进一步分析，以提取绑定元数据。`analyzeBindingsFromOptions` 函数可能会解析对象表达式中的属性，检测和提取其中的绑定信息。

如果在遍历完所有语句后没有找到符合条件的节点，函数会返回一个空的绑定元数据对象 `{}`。

绑定元数据用于描述模板中的绑定关系，比如数据绑定、事件绑定等。通过分析脚本中的绑定元数据，可以得到关于模板中绑定的一些信息，以便在后续的编译或渲染过程中进行相应的处理。
 */
export function analyzeScriptBindings(ast: Statement[]): BindingMetadata {
  for (const node of ast) {
    if (
      node.type === 'ExportDefaultDeclaration' &&
      node.declaration.type === 'ObjectExpression'
    ) {
      return analyzeBindingsFromOptions(node.declaration)
    }
  }
  return {}
}
/**
 * 
 * @param node 
 * @returns 
 * `analyzeBindingsFromOptions` 是一个函数，用于从选项对象（`ObjectExpression`）中分析绑定元数据（binding metadata）。

该函数接受一个表示选项对象的参数 `node`，并在选项对象的属性列表中遍历每个属性（`ObjectProperty` 或 `ObjectMethod`）。

在遍历过程中，函数根据属性的类型和名称进行不同的处理：

- 对于属性类型为 `ObjectProperty` 且键名为 `'props'` 的属性，表示是 props 属性。函数会获取该属性值中的所有键（通过 `getObjectOrArrayExpressionKeys` 函数），并将这些键作为绑定的属性名，将绑定类型标记为 `BindingTypes.PROPS`。

- 对于属性类型为 `ObjectProperty` 且键名为 `'inject'` 的属性，表示是 inject 属性。函数会获取该属性值中的所有键（通过 `getObjectOrArrayExpressionKeys` 函数），并将这些键作为绑定的属性名，将绑定类型标记为 `BindingTypes.OPTIONS`。

- 对于属性类型为 `ObjectProperty` 且键名为 `'computed'` 或 `'methods'` 的属性，表示是计算属性或方法。函数会获取该属性值中的所有键（通过 `getObjectExpressionKeys` 函数），并将这些键作为绑定的属性名，将绑定类型标记为 `BindingTypes.OPTIONS`。

- 对于属性类型为 `ObjectMethod` 且键名为 `'setup'` 或 `'data'` 的属性，表示是 setup 函数或 data 函数。函数会遍历该属性的函数体（`body.body`），找到 `ReturnStatement` 类型的语句，且该语句的 `argument` 是 `ObjectExpression` 类型。然后，函数会获取该 `ObjectExpression` 中的所有键（通过 `getObjectExpressionKeys` 函数），并将这些键作为绑定的属性名，根据属性的键名确定绑定类型，如果是 setup 函数，则标记为 `BindingTypes.SETUP_MAYBE_REF`，如果是 data 函数，则标记为 `BindingTypes.DATA`。

最后，函数会返回包含绑定元数据的对象 `bindings`。

绑定元数据用于描述模板中的绑定关系，比如数据绑定、事件绑定等。通过分析选项对象中的绑定元数据，可以了解到组件在模板中使用的 props、计算属性、方法等信息，以便在编译或渲染过程中进行相应的处理。
 */
function analyzeBindingsFromOptions(node: ObjectExpression): BindingMetadata {
  const bindings: BindingMetadata = {}
  // #3270, #3275
  // mark non-script-setup so we don't resolve components/directives from these
  Object.defineProperty(bindings, '__isScriptSetup', {
    enumerable: false,
    value: false
  })
  for (const property of node.properties) {
    if (
      property.type === 'ObjectProperty' &&
      !property.computed &&
      property.key.type === 'Identifier'
    ) {
      // props
      if (property.key.name === 'props') {
        // props: ['foo']
        // props: { foo: ... }
        for (const key of getObjectOrArrayExpressionKeys(property.value)) {
          bindings[key] = BindingTypes.PROPS
        }
      }

      // inject
      else if (property.key.name === 'inject') {
        // inject: ['foo']
        // inject: { foo: {} }
        for (const key of getObjectOrArrayExpressionKeys(property.value)) {
          bindings[key] = BindingTypes.OPTIONS
        }
      }

      // computed & methods
      else if (
        property.value.type === 'ObjectExpression' &&
        (property.key.name === 'computed' || property.key.name === 'methods')
      ) {
        // methods: { foo() {} }
        // computed: { foo() {} }
        for (const key of getObjectExpressionKeys(property.value)) {
          bindings[key] = BindingTypes.OPTIONS
        }
      }
    }

    // setup & data
    else if (
      property.type === 'ObjectMethod' &&
      property.key.type === 'Identifier' &&
      (property.key.name === 'setup' || property.key.name === 'data')
    ) {
      for (const bodyItem of property.body.body) {
        // setup() {
        //   return {
        //     foo: null
        //   }
        // }
        if (
          bodyItem.type === 'ReturnStatement' &&
          bodyItem.argument &&
          bodyItem.argument.type === 'ObjectExpression'
        ) {
          for (const key of getObjectExpressionKeys(bodyItem.argument)) {
            bindings[key] =
              property.key.name === 'setup'
                ? BindingTypes.SETUP_MAYBE_REF
                : BindingTypes.DATA
          }
        }
      }
    }
  }

  return bindings
}
/**
 * 
 * @param node 
 * @returns 
 * `getObjectExpressionKeys` 是一个函数，用于从 `ObjectExpression` 类型的节点中获取对象的键名。

该函数接受一个表示 `ObjectExpression` 的参数 `node`，并遍历该节点的属性列表（`node.properties`）。在遍历过程中，函数会根据属性的类型和键名的计算情况进行处理。

- 对于类型为 `SpreadElement` 的属性，表示是对象展开语法，函数会跳过该属性的处理。

- 对于其他类型的属性，函数会通过 `resolveObjectKey` 函数解析属性的键名，并根据键名是否存在进行判断。如果键名存在，函数会将键名转换为字符串类型，并将其添加到 `keys` 数组中。

最后，函数返回包含对象键名的数组 `keys`。

该函数的作用是提取对象字面量中的键名，这在分析绑定元数据时非常有用，可以获取对象字面量中的属性名，用于进一步处理和分析。
 */
function getObjectExpressionKeys(node: ObjectExpression): string[] {
  const keys = []
  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement') continue
    const key = resolveObjectKey(prop.key, prop.computed)
    if (key) keys.push(String(key))
  }
  return keys
}
/**
 * 
 * @param node 
 * @returns 
 * `getArrayExpressionKeys` 是一个函数，用于从 `ArrayExpression` 类型的节点中获取字符串字面量的值。

该函数接受一个表示 `ArrayExpression` 的参数 `node`，并遍历该节点的元素列表（`node.elements`）。在遍历过程中，函数会判断元素是否存在且类型为 `StringLiteral`，如果满足条件，就将字符串字面量的值添加到 `keys` 数组中。

最后，函数返回包含字符串字面量值的数组 `keys`。

该函数的作用是提取数组字面量中的字符串值，常用于获取一组字符串的集合，例如在分析绑定元数据时，可以获取 `props` 或 `inject` 的数组中的字符串值。
 */
function getArrayExpressionKeys(node: ArrayExpression): string[] {
  const keys = []
  for (const element of node.elements) {
    if (element && element.type === 'StringLiteral') {
      keys.push(element.value)
    }
  }
  return keys
}
/**
 * 
 * @param value 
 * @returns 
 * `getObjectOrArrayExpressionKeys` 是一个函数，用于从 `ArrayExpression` 或 `ObjectExpression` 类型的节点中获取键的集合。

该函数接受一个表示节点的参数 `value`，并根据节点的类型调用相应的函数来获取键的集合。

- 如果 `value` 的类型是 `ArrayExpression`，则调用 `getArrayExpressionKeys` 函数来获取数组字面量中的键的集合。
- 如果 `value` 的类型是 `ObjectExpression`，则调用 `getObjectExpressionKeys` 函数来获取对象字面量中的键的集合。
- 如果 `value` 的类型既不是 `ArrayExpression` 也不是 `ObjectExpression`，则返回一个空数组 `[]`。

最后，函数返回键的集合。

该函数的作用是根据节点的类型获取相应的键集合。这在分析绑定元数据时，可以方便地处理 `props`、`inject` 等可能是数组或对象的情况。
 */
export function getObjectOrArrayExpressionKeys(value: Node): string[] {
  if (value.type === 'ArrayExpression') {
    return getArrayExpressionKeys(value)
  }
  if (value.type === 'ObjectExpression') {
    return getObjectExpressionKeys(value)
  }
  return []
}
