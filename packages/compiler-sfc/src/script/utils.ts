import {
  CallExpression,
  Expression,
  Identifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Node,
  StringLiteral
} from '@babel/types'
import path from 'path'
import { TS_NODE_TYPES } from '@vue/compiler-dom'
/**
 * `UNKNOWN_TYPE` 是一个导出的常量，其值为字符串 `'Unknown'`。

这个常量用于表示未知的类型。在代码中可能会遇到无法确定具体类型的情况，或者需要给某个变量或表达式指定一个默认的未知类型。通过使用 `UNKNOWN_TYPE` 常量，可以统一表示这些未知类型的情况，方便在代码中进行标识和处理。
 */
export const UNKNOWN_TYPE = 'Unknown'
/**
 * 
 * @param node 
 * @param computed 
 * @returns 
 * `resolveObjectKey` 是一个导出的函数，用于解析对象键的值。

该函数接受两个参数：`node` 和 `computed`。`node` 表示要解析的节点，`computed` 是一个布尔值，表示该键是否为计算属性。

函数根据节点的类型进行处理，有以下几种情况：

- 如果节点的类型是 `'StringLiteral'` 或 `'NumericLiteral'`，表示键是一个字符串字面量或数值字面量，直接返回该字面量的值（以字符串形式）。
- 如果节点的类型是 `'Identifier'`，并且 `computed` 参数为 `false`，表示键是一个标识符且不是计算属性，直接返回该标识符的名称。
- 对于其他情况，或者当节点的类型不满足上述条件时，返回 `undefined`，表示无法解析键的值。

通过调用 `resolveObjectKey` 函数，可以将对象字面量中的键解析为对应的值，用于后续的处理和操作。
 */
export function resolveObjectKey(node: Node, computed: boolean) {
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
      return String(node.value)
    case 'Identifier':
      if (!computed) return node.name
  }
  return undefined
}
/**
 * 
 * @param strs 
 * @returns 
 * `concatStrings` 是一个导出的函数，用于将字符串数组中的非空字符串连接起来。

该函数接受一个参数 `strs`，它是一个由字符串、`null`、`undefined` 和 `false` 组成的数组。

函数内部使用 `filter` 方法过滤掉数组中的空值（`null`、`undefined` 和 `false`），并使用类型谓词 `s is string` 确保过滤后的元素是字符串类型。

最后，使用 `join` 方法将过滤后的字符串数组连接成一个新的字符串，并使用逗号和空格作为分隔符。

通过调用 `concatStrings` 函数，可以将数组中的非空字符串连接成一个更大的字符串，方便在应用程序中进行使用或显示。
 */
export function concatStrings(strs: Array<string | null | undefined | false>) {
  return strs.filter((s): s is string => !!s).join(', ')
}
/**
 * 
 * @param node 
 * @returns 
 * `isLiteralNode` 是一个导出的函数，用于判断给定的节点 `node` 是否是字面量节点。

函数内部使用 `endsWith` 方法检查节点的类型字符串是否以 "Literal" 结尾，如果是则返回 `true`，否则返回 `false`。

通过调用 `isLiteralNode` 函数，可以方便地确定节点是否属于字面量类型，例如字符串字面量、数字字面量等。这在某些场景下可能会用于执行特定的操作或应用特定的逻辑。
 */
export function isLiteralNode(node: Node) {
  return node.type.endsWith('Literal')
}
/**
 * 
 * @param node 
 * @returns 
 * `unwrapTSNode` 是一个导出的函数，用于递归地解包 TS 节点。

函数首先检查给定节点 `node` 的类型是否属于 TS 节点类型列表 `TS_NODE_TYPES`。如果是，则将该节点视为 TS 节点，并递归地调用 `unwrapTSNode` 函数，传递 TS 节点的 `expression` 属性作为参数。这样可以继续解包嵌套的 TS 节点，直到找到非 TS 节点为止。

如果给定节点 `node` 的类型不属于 TS 节点类型列表，或者 TS 节点的 `expression` 属性不存在，则返回该节点本身，表示解包过程结束。

通过调用 `unwrapTSNode` 函数，可以解包嵌套的 TS 节点，获取到最内层的非 TS 节点。这在处理 TypeScript AST 时可能会有用，特别是在需要处理具体语义和逻辑的情况下。
 */
export function unwrapTSNode(node: Node): Node {
  if (TS_NODE_TYPES.includes(node.type)) {
    return unwrapTSNode((node as any).expression)
  } else {
    return node
  }
}
/**
 * 
 * @param node 
 * @param test 
 * @returns 
 * `isCallOf` 是一个导出的函数，用于检查给定节点是否是特定函数的调用表达式。

函数接受两个参数：`node` 和 `test`。`node` 表示待检查的节点，`test` 表示要匹配的函数名或用于测试函数名的回调函数。

函数首先通过一系列条件进行判断，包括：

- `node` 和 `test` 参数都存在
- `node` 的类型是 `CallExpression`，表示它是一个函数调用表达式
- `node.callee` 的类型是 `Identifier`，表示它是一个标识符

然后根据 `test` 的类型进行进一步判断。如果 `test` 是一个字符串，则检查 `node.callee.name` 是否与 `test` 相等。如果 `test` 是一个回调函数，则将 `node.callee.name` 作为参数传递给回调函数，并根据回调函数的返回值进行判断。

最终，函数返回一个布尔值，表示给定节点是否是特定函数的调用表达式。

通过调用 `isCallOf` 函数，可以方便地检查节点是否符合特定函数调用的模式，用于执行相应的处理逻辑。
 */
export function isCallOf(
  node: Node | null | undefined,
  test: string | ((id: string) => boolean) | null | undefined
): node is CallExpression {
  return !!(
    node &&
    test &&
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    (typeof test === 'string'
      ? node.callee.name === test
      : test(node.callee.name))
  )
}
/**
 * 
 * @param types 
 * @returns 
 * `toRuntimeTypeString` 是一个导出的函数，用于将类型数组转换为表示运行时类型的字符串。

该函数接受一个 `types` 参数，它是一个字符串数组，包含要表示为运行时类型的类型名称。

函数首先检查 `types` 数组的长度。如果长度大于 1，表示存在多个类型，那么函数使用方括号将这些类型括起来，并使用逗号将它们连接起来，生成一个包含多个类型的字符串。例如，如果 `types` 是 `['String', 'Number', 'Boolean']`，则返回的字符串为 `"[String, Number, Boolean]"`。

如果 `types` 数组的长度为 1，表示只有一个类型，那么函数直接返回该类型的字符串表示。例如，如果 `types` 是 `['String']`，则返回的字符串为 `"String"`。

通过调用 `toRuntimeTypeString` 函数，可以将类型数组转换为适合在运行时使用的字符串表示形式，用于打印、输出或其他需要将类型转换为字符串的场景。
 */
export function toRuntimeTypeString(types: string[]) {
  return types.length > 1 ? `[${types.join(', ')}]` : types[0]
}
/**
 * 
 * @param specifier 
 * @returns 
 * `getImportedName` 是一个导出的函数，用于获取导入语句中的导入名称。

该函数接受一个 `specifier` 参数，它可以是 `ImportSpecifier`、`ImportDefaultSpecifier` 或 `ImportNamespaceSpecifier` 类型的对象，表示导入语句中的具体导入部分。

函数首先检查 `specifier` 的类型。如果 `specifier` 是 `ImportSpecifier` 类型，则进一步判断 `imported` 字段的类型。如果 `imported` 的类型是 `Identifier`，则返回 `imported.name`，表示导入的标识符的名称。否则，返回 `imported.value`，表示导入的字符串字面量的值。

如果 `specifier` 的类型是 `ImportNamespaceSpecifier`，则返回字符串 `"*"`，表示导入的是整个命名空间。

如果 `specifier` 的类型是 `ImportDefaultSpecifier`，则返回字符串 `"default"`，表示导入的是默认导出。

通过调用 `getImportedName` 函数，可以方便地从导入语句中获取导入的名称，用于进一步处理导入的模块成员。
 */
export function getImportedName(
  specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
) {
  if (specifier.type === 'ImportSpecifier')
    return specifier.imported.type === 'Identifier'
      ? specifier.imported.name
      : specifier.imported.value
  else if (specifier.type === 'ImportNamespaceSpecifier') return '*'
  return 'default'
}
/**
 * 
 * @param node 
 * `getId` 是一个函数重载（function overloading），根据参数的不同类型，它会返回不同的结果。

1. 第一个重载：
   - 参数类型：`Identifier` 或 `StringLiteral`
   - 返回类型：字符串（string）

2. 第二个重载：
   - 参数类型：`Expression` 类型的对象
   - 返回类型：字符串（string）或空值（null）

在函数内部，通过使用条件表达式（ternary operator）检查参数 `node` 的类型。如果是 `Identifier` 类型，则返回 `node.name`，如果是 `StringLiteral` 类型，则返回 `node.value`。如果不是这两种类型，则返回 `null`。

通过这种方式，函数可以接受不同类型的参数，并根据参数的类型来返回对应的值或空值。这样的函数重载提高了函数的灵活性和通用性。
 * 
 */
export function getId(node: Identifier | StringLiteral): string
export function getId(node: Expression): string | null
export function getId(node: Expression) {
  return node.type === 'Identifier'
    ? node.name
    : node.type === 'StringLiteral'
    ? node.value
    : null
}
/**
 * 
 * @param str 
 * @returns 
 * `identity` 是一个函数，它接受一个字符串参数 `str`，并返回该字符串本身。

函数定义如下：
```typescript
const identity = (str: string) => str;
```

这个函数被称为 "identity" 函数，因为它在输入和输出之间没有进行任何转换或处理，只是简单地返回输入的字符串。这在某些情况下很有用，例如当需要传递一个函数作为参数，但又不需要对输入进行任何操作时。
 */
const identity = (str: string) => str
/**
 * `fileNameLowerCaseRegExp` 是一个正则表达式，用于匹配文件名中的非小写字母、数字和一些特殊字符。它的目的是帮助规范化文件名，将非小写字母和特殊字符替换为空格或移除它们。

正则表达式模式为 `/[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g`。

解释每个部分的含义：
- `[^...]`：表示取反，匹配不在方括号内的字符。
- `\u0130`：表示土耳其大写字母 "İ"。
- `\u0131`：表示土耳其小写字母 "ı"。
- `\u00DF`：表示德语小写字母 "ß"。
- `a-z`：表示小写字母范围。
- `0-9`：表示数字范围。
- `\\/:\-_\. `：表示特殊字符，包括斜杠、冒号、连字符、下划线、句点和空格。
- `+`：表示匹配前面的模式一次或多次。
- `g`：表示全局匹配，匹配所有符合条件的字符。

使用该正则表达式可以对文件名进行规范化处理，删除非小写字母和特殊字符，以便更好地管理和比较文件名。
 */
const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g
/**
 * 
 * @param str 
 * @returns 
 * `toLowerCase` 是一个函数，用于将字符串转换为小写形式。它接受一个字符串参数 `str`，并返回将该字符串转换为小写的结果。

在函数体内部，使用 `str.toLowerCase()` 方法将字符串转换为小写形式。该方法会返回一个新的字符串，其中所有的大写字母都被转换为相应的小写字母，而不会修改原始的字符串。

通过调用 `toLowerCase` 函数，可以将任意字符串转换为小写形式，以便进行大小写不敏感的比较或处理。
 */
const toLowerCase = (str: string) => str.toLowerCase()
/**
 * 
 * @param x 
 * @returns 
 * `toFileNameLowerCase` 是一个函数，用于将文件名转换为小写形式。它接受一个字符串参数 `x`，表示文件名，然后返回转换后的文件名。

在函数体内部，首先使用正则表达式 `fileNameLowerCaseRegExp` 对文件名进行测试，判断是否包含需要转换的字符。如果文件名匹配正则表达式，则调用 `x.replace(fileNameLowerCaseRegExp, toLowerCase)` 方法，将匹配到的字符替换为小写形式。这里的 `toLowerCase` 是一个回调函数，用于将每个匹配到的字符转换为小写形式。

最终，函数返回转换后的文件名。

通过调用 `toFileNameLowerCase` 函数，可以将文件名转换为小写形式，以满足特定的文件命名约定或处理需求。
 */
function toFileNameLowerCase(x: string) {
  return fileNameLowerCaseRegExp.test(x)
    ? x.replace(fileNameLowerCaseRegExp, toLowerCase)
    : x
}

/**
 * We need `getCanonicalFileName` when creating ts module resolution cache,
 * but TS does not expose it directly. This implementation is repllicated from
 * the TS source code.
 * `createGetCanonicalFileName` 是一个函数，用于创建获取规范化文件名的函数。它接受一个布尔类型的参数 `useCaseSensitiveFileNames`，表示是否区分文件名的大小写。根据 `useCaseSensitiveFileNames` 的值，函数返回一个合适的规范化文件名的函数。

如果 `useCaseSensitiveFileNames` 为 `true`，则返回 `identity` 函数，该函数接受一个字符串参数并原样返回该字符串，即不进行任何规范化处理。

如果 `useCaseSensitiveFileNames` 为 `false`，则返回 `toFileNameLowerCase` 函数，该函数接受一个字符串参数，并将该字符串转换为小写形式，以便进行大小写不敏感的比较和处理。

通过调用 `createGetCanonicalFileName` 函数，并根据实际的需求传入 `useCaseSensitiveFileNames` 参数，可以获取一个适合的规范化文件名的函数。这个规范化函数可以用于文件系统操作、文件名比较或其他需要规范化文件名的场景。
 */
export function createGetCanonicalFileName(useCaseSensitiveFileNames: boolean) {
  return useCaseSensitiveFileNames ? identity : toFileNameLowerCase
}

// in the browser build, the polyfill doesn't expose posix, but defaults to
// posix behavior.
/**
 * `normalize` 是一个函数，用于规范化文件路径。在给定的代码中，它使用了 `path.posix.normalize` 或 `path.normalize` 方法来执行规范化操作。

`path.posix.normalize` 是 Node.js 中的一个方法，用于规范化 POSIX 风格的文件路径。它将路径中的冗余部分、多余的斜杠以及特殊符号进行处理，返回规范化后的路径。

`path.normalize` 是 Node.js 中的另一个方法，用于规范化文件路径。它根据操作系统的不同，在 Windows 上使用反斜杠 `\`，在 POSIX 系统上使用正斜杠 `/` 来进行路径规范化。

给定的代码使用 `path.posix.normalize` 或 `path.normalize` 方法来执行路径规范化，具体使用哪个方法取决于 `path.posix` 是否存在。如果 `path.posix` 存在，则使用 `path.posix.normalize` 方法进行规范化；否则，使用 `path.normalize` 方法进行规范化。

通过调用 `normalize` 函数，可以将给定的文件路径规范化，以确保路径的一致性和正确性。
 */
const normalize = (path.posix || path).normalize
/**
 * `windowsSlashRE` 是一个正则表达式，用于匹配 Windows 系统中的反斜杠 `\`。

在给定的代码中，`windowsSlashRE` 被定义为 `/\\/g`，其中：
- `/` 是正则表达式的开始和结束符号，用于表示正则表达式的模式的开始和结束。
- `\\` 是用于匹配反斜杠 `\` 的转义序列。由于反斜杠 `\` 在正则表达式中具有特殊意义，所以需要使用 `\\` 来匹配实际的反斜杠字符。
- `g` 是正则表达式的标志，表示全局匹配，即匹配字符串中的所有符合条件的子字符串。

通过使用 `windowsSlashRE` 正则表达式，可以在字符串中找到并替换所有的反斜杠 `\`，从而在处理 Windows 文件路径时进行转换或规范化操作。
 */
const windowsSlashRE = /\\/g
/**
 * 
 * @param p 
 * @returns 
 * `normalizePath` 函数用于规范化文件路径。它接受一个字符串参数 `p`，表示要规范化的文件路径。

首先，函数使用 `p.replace(windowsSlashRE, '/')` 将路径中的所有反斜杠 `\` 替换为正斜杠 `/`。这是通过使用正则表达式 `windowsSlashRE` 来匹配所有的反斜杠，并使用 `/` 进行替换。这一步是为了确保路径中使用的是正斜杠作为路径分隔符。

然后，函数使用 `normalize` 函数对路径进行规范化操作。`normalize` 函数是 Node.js 中的一个方法，用于规范化路径字符串。它将处理路径中的重复分隔符、相对路径、`.` 和 `..` 等，并返回一个规范化后的路径。

最后，函数返回经过替换和规范化后的路径。这样可以确保文件路径在不同操作系统和环境中具有一致的格式和表示。
 */
export function normalizePath(p: string) {
  return normalize(p.replace(windowsSlashRE, '/'))
}
/**
 * `joinPaths` 函数用于连接多个路径片段，形成一个完整的路径。它接受多个字符串参数，表示要连接的路径片段。

首先，函数使用 `(path.posix || path)` 来确定使用哪个路径模块进行路径连接。在此代码中，它首先尝试使用 `path.posix` 模块，如果该模块不存在，则使用默认的 `path` 模块。

然后，函数使用 `join` 方法来连接路径片段。`join` 方法将路径片段按照操作系统的规则进行连接，并返回连接后的完整路径。它会处理路径分隔符、相对路径和多余的分隔符等情况，确保生成的路径是正确的。

最后，函数返回连接后的完整路径。这样可以方便地将多个路径片段连接成一个路径，用于文件操作或路径处理。
 */
export const joinPaths = (path.posix || path).join

/**
 * key may contain symbols
 * e.g. onUpdate:modelValue -> "onUpdate:modelValue"
 * `escapeSymbolsRE` 是一个正则表达式，用于匹配需要进行转义的符号字符。该正则表达式包含了一些常见的符号字符，例如空格、引号、括号、逗号、斜杠等等。

在正则表达式中，方括号 `[ ]` 表示一个字符集，其中列出的字符都可以匹配。在该正则表达式中，字符集中的符号字符都需要进行转义，以便在某些上下文中使用。

`g` 是正则表达式的修饰符，表示全局匹配，即在整个字符串中查找所有匹配项。

该正则表达式可以用于对符号字符进行转义或处理，例如在字符串中插入转义符或进行字符替换等操作。
 */
export const escapeSymbolsRE = /[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g
/**
 * 
 * @param key 
 * @returns 
 * `getEscapedKey` 是一个函数，用于获取转义后的键值（key）。该函数接受一个字符串参数 `key`，表示原始的键值。

函数内部使用正则表达式 `escapeSymbolsRE` 来测试 `key` 是否包含需要转义的符号字符。如果 `key` 中包含需要转义的符号字符，即正则表达式匹配成功，那么函数会使用 `JSON.stringify(key)` 对 `key` 进行转义处理，并返回转义后的结果。否则，如果 `key` 中不包含需要转义的符号字符，函数会直接返回原始的 `key`。

该函数可以用于在处理键值时，确保包含特殊字符的键值能够正确地被转义，以避免潜在的语法错误或数据损失。
 */
export function getEscapedKey(key: string) {
  return escapeSymbolsRE.test(key) ? JSON.stringify(key) : key
}
