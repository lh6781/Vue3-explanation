import { SourceLocation } from '../ast'
import { CompilerError } from '../errors'
import { ParserContext } from '../parse'
import { TransformContext } from '../transform'
/**
 * `CompilerCompatConfig` 是一个类型别名，表示编译器的兼容性配置。它是一个部分（可选）的对象类型，包含了一组配置项来控制编译器的兼容性行为。

该类型定义了以下属性:

- `MODE`：一个可选的属性，用于指定编译器的模式。它的值可以是 2 或 3，表示编译器的版本。如果未提供该属性，则默认为 2。

除了 `MODE` 属性外，`CompilerCompatConfig` 还可以包含一组记录类型的属性，用于配置特定的编译器废弃类型的兼容性。这些属性的名称应为 `CompilerDeprecationTypes` 中定义的字符串值之一。每个属性的值可以是布尔类型（表示是否启用兼容性）或字符串类型（'suppress-warning'，表示禁止警告）。

以下是 `CompilerCompatConfig` 的示例用法：

```typescript
const config: CompilerCompatConfig = {
  MODE: 3,
  GLOBAL_MOUNT: true,
  FILTER: 'suppress-warning',
  ON_FILTER_ERROR: false
}
```

在上面的示例中，`config` 对象配置了编译器的兼容性。它指定了编译器的模式为 3，同时针对 `GLOBAL_MOUNT`、`FILTER` 和 `ON_FILTER_ERROR` 三个废弃类型进行了兼容性配置。

需要注意的是，`CompilerCompatConfig` 类型仅用于描述兼容性配置的类型结构，具体的兼容性行为取决于编译器的实现。
 */
export type CompilerCompatConfig = Partial<
  Record<CompilerDeprecationTypes, boolean | 'suppress-warning'>
> & {
  MODE?: 2 | 3
}
/**
 * `CompilerCompatOptions` 是一个接口，用于配置编译器的兼容性选项。它定义了一个可选的属性 `compatConfig`，该属性的类型为 `CompilerCompatConfig`。

通过 `CompilerCompatOptions` 接口，可以将兼容性配置传递给编译器，以控制编译器的行为。可以将 `compatConfig` 属性设置为一个 `CompilerCompatConfig` 对象，其中包含了各种兼容性配置选项。

以下是 `CompilerCompatOptions` 的示例用法：

```typescript
const options: CompilerCompatOptions = {
  compatConfig: {
    MODE: 3,
    GLOBAL_MOUNT: true,
    FILTER: 'suppress-warning',
    ON_FILTER_ERROR: false
  }
}
```

在上面的示例中，`options` 对象配置了编译器的兼容性选项，通过 `compatConfig` 属性指定了编译器的模式为 3，并对其他废弃类型进行了相应的兼容性配置。

通过使用 `CompilerCompatOptions` 接口，可以方便地传递兼容性选项给编译器，并灵活地调整编译器的行为。
 */
export interface CompilerCompatOptions {
  compatConfig?: CompilerCompatConfig
}
/**
 * `CompilerDeprecationTypes` 是一个常量枚举（`enum`），它定义了编译器的废弃类型（deprecation types）。这些废弃类型用于标识编译器中被废弃的特性或行为。

以下是 `CompilerDeprecationTypes` 中定义的废弃类型的示例：

- `COMPILER_IS_ON_ELEMENT`: 在元素上使用编译器的指令 `v-on` 被废弃。
- `COMPILER_V_BIND_SYNC`: 使用 `v-bind.sync` 指令进行双向绑定被废弃。
- `COMPILER_V_BIND_PROP`: 使用 `v-bind.prop` 指令进行属性绑定被废弃。
- `COMPILER_V_BIND_OBJECT_ORDER`: 对象属性绑定中的顺序依赖被废弃。
- `COMPILER_V_ON_NATIVE`: 使用原生事件修饰符 `v-on.native` 被废弃。
- `COMPILER_V_IF_V_FOR_PRECEDENCE`: `v-if` 和 `v-for` 优先级的使用方式被废弃。
- `COMPILER_NATIVE_TEMPLATE`: 使用原生模板被废弃。
- `COMPILER_INLINE_TEMPLATE`: 使用内联模板被废弃。
- `COMPILER_FILTERS`: 过滤器的使用被废弃。

通过使用 `CompilerDeprecationTypes`，可以清晰地识别编译器中被废弃的特性或行为，并进行相应的兼容性处理。
 */
export const enum CompilerDeprecationTypes {
  COMPILER_IS_ON_ELEMENT = 'COMPILER_IS_ON_ELEMENT',
  COMPILER_V_BIND_SYNC = 'COMPILER_V_BIND_SYNC',
  COMPILER_V_BIND_PROP = 'COMPILER_V_BIND_PROP',
  COMPILER_V_BIND_OBJECT_ORDER = 'COMPILER_V_BIND_OBJECT_ORDER',
  COMPILER_V_ON_NATIVE = 'COMPILER_V_ON_NATIVE',
  COMPILER_V_IF_V_FOR_PRECEDENCE = 'COMPILER_V_IF_V_FOR_PRECEDENCE',
  COMPILER_NATIVE_TEMPLATE = 'COMPILER_NATIVE_TEMPLATE',
  COMPILER_INLINE_TEMPLATE = 'COMPILER_INLINE_TEMPLATE',
  COMPILER_FILTERS = 'COMPILER_FILTER'
}
/**
 * `DeprecationData` 是一个类型，用于表示废弃信息的数据结构。它包含以下字段：

- `message`：废弃信息的内容。可以是一个字符串，也可以是一个函数，接受任意数量的参数并返回一个字符串。该字段用于描述废弃特性或行为的相关信息。
- `link`（可选）：废弃信息的链接。可以是一个URL字符串，指向更详细的文档或解释，用于提供更多关于废弃特性或行为的信息。

使用 `DeprecationData` 类型可以在代码中定义和传递废弃信息，以便在适当的时候向开发者发出警告或提供文档链接，以帮助他们了解废弃特性或行为的更多细节。
 */
type DeprecationData = {
  message: string | ((...args: any[]) => string)
  link?: string
}
/**
 * `deprecationData` 是一个对象，用于存储不同类型的废弃信息。它的键是 `CompilerDeprecationTypes` 枚举的成员，值是 `DeprecationData` 类型的对象，包含废弃信息的详细内容。

每个废弃信息对象具有以下字段：

- `message`：废弃信息的内容。可以是一个字符串，也可以是一个函数。如果是函数，则该函数接受参数并返回一个字符串，用于描述废弃特性或行为的相关信息。
- `link`（可选）：废弃信息的链接。可以是一个URL字符串，指向更详细的文档或解释，提供有关废弃特性或行为的更多信息。

通过定义 `deprecationData` 对象，可以在编译器或其他相关工具中使用这些信息，以向开发者发出警告或提供更多文档链接，以帮助他们迁移或了解废弃的特性或行为。
 */
const deprecationData: Record<CompilerDeprecationTypes, DeprecationData> = {
  [CompilerDeprecationTypes.COMPILER_IS_ON_ELEMENT]: {
    message:
      `Platform-native elements with "is" prop will no longer be ` +
      `treated as components in Vue 3 unless the "is" value is explicitly ` +
      `prefixed with "vue:".`,
    link: `https://v3-migration.vuejs.org/breaking-changes/custom-elements-interop.html`
  },

  [CompilerDeprecationTypes.COMPILER_V_BIND_SYNC]: {
    message: key =>
      `.sync modifier for v-bind has been removed. Use v-model with ` +
      `argument instead. \`v-bind:${key}.sync\` should be changed to ` +
      `\`v-model:${key}\`.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/v-model.html`
  },

  [CompilerDeprecationTypes.COMPILER_V_BIND_PROP]: {
    message:
      `.prop modifier for v-bind has been removed and no longer necessary. ` +
      `Vue 3 will automatically set a binding as DOM property when appropriate.`
  },

  [CompilerDeprecationTypes.COMPILER_V_BIND_OBJECT_ORDER]: {
    message:
      `v-bind="obj" usage is now order sensitive and behaves like JavaScript ` +
      `object spread: it will now overwrite an existing non-mergeable attribute ` +
      `that appears before v-bind in the case of conflict. ` +
      `To retain 2.x behavior, move v-bind to make it the first attribute. ` +
      `You can also suppress this warning if the usage is intended.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/v-bind.html`
  },

  [CompilerDeprecationTypes.COMPILER_V_ON_NATIVE]: {
    message: `.native modifier for v-on has been removed as is no longer necessary.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/v-on-native-modifier-removed.html`
  },

  [CompilerDeprecationTypes.COMPILER_V_IF_V_FOR_PRECEDENCE]: {
    message:
      `v-if / v-for precedence when used on the same element has changed ` +
      `in Vue 3: v-if now takes higher precedence and will no longer have ` +
      `access to v-for scope variables. It is best to avoid the ambiguity ` +
      `with <template> tags or use a computed property that filters v-for ` +
      `data source.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/v-if-v-for.html`
  },

  [CompilerDeprecationTypes.COMPILER_NATIVE_TEMPLATE]: {
    message:
      `<template> with no special directives will render as a native template ` +
      `element instead of its inner content in Vue 3.`
  },

  [CompilerDeprecationTypes.COMPILER_INLINE_TEMPLATE]: {
    message: `"inline-template" has been removed in Vue 3.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/inline-template-attribute.html`
  },

  [CompilerDeprecationTypes.COMPILER_FILTERS]: {
    message:
      `filters have been removed in Vue 3. ` +
      `The "|" symbol will be treated as native JavaScript bitwise OR operator. ` +
      `Use method calls or computed properties instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/filters.html`
  }
}
/**
 * 
 * @param key 
 * @param context 
 * @returns 
 * 该函数名为 `getCompatValue`，接受两个参数 `key` 和 `context`。它用于获取与兼容性配置相关的值。

函数内部逻辑如下：
1. 首先，根据 `context` 的类型（`ParserContext` 或 `TransformContext`），获取对应的兼容性配置对象。如果是 `ParserContext`，则从 `options` 字段中获取 `compatConfig`；如果是 `TransformContext`，则直接获取 `compatConfig` 字段。
2. 然后，根据给定的 `key` 获取对应的配置值 `value`。如果 `config` 存在且包含该 `key`，则返回对应的值；否则返回 `undefined`。
3. 如果 `key` 是 `'MODE'`，则检查 `value` 是否存在，如果不存在则返回默认值 `3`，表示编译器默认采用 v3 行为；否则返回 `value`。
4. 如果 `key` 不是 `'MODE'`，则直接返回 `value`。

该函数的作用是在给定的上下文中获取指定兼容性配置项的值，以便在编译器或其他相关工具中根据配置值执行相应的操作或逻辑。
 */
function getCompatValue(
  key: CompilerDeprecationTypes | 'MODE',
  context: ParserContext | TransformContext
) {
  const config = (context as ParserContext).options
    ? (context as ParserContext).options.compatConfig
    : (context as TransformContext).compatConfig
  const value = config && config[key]
  if (key === 'MODE') {
    return value || 3 // compiler defaults to v3 behavior
  } else {
    return value
  }
}
/**
 * 
 * @param key 
 * @param context 
 * @returns 
 * 该函数名为 `isCompatEnabled`，接受两个参数 `key` 和 `context`。它用于判断指定的兼容性配置项是否启用。

函数内部逻辑如下：
1. 首先，通过调用 `getCompatValue` 函数获取 `'MODE'` 配置项的值，并将其赋给变量 `mode`。
2. 接着，通过调用 `getCompatValue` 函数获取指定 `key` 配置项的值，并将其赋给变量 `value`。
3. 如果 `mode` 的值为 `3`，表示编译器处于 v3 模式下，那么只有当 `value` 显式设置为 `true` 时才启用该兼容性配置项；否则，对于任何非 `false` 的值，都会启用该兼容性配置项。
4. 如果 `mode` 的值不为 `3`，即编译器不处于 v3 模式下，则只要 `value` 不等于 `false`，就会启用该兼容性配置项。
5. 最后，根据判断结果返回布尔值，表示指定的兼容性配置项是否启用。

该函数的作用是根据兼容性配置项的值以及编译器模式来判断是否启用特定的兼容性配置。在使用编译器或其他相关工具时，可以根据该函数的返回值来确定是否执行特定的兼容性逻辑或操作。
 */
export function isCompatEnabled(
  key: CompilerDeprecationTypes,
  context: ParserContext | TransformContext
) {
  const mode = getCompatValue('MODE', context)
  const value = getCompatValue(key, context)
  // in v3 mode, only enable if explicitly set to true
  // otherwise enable for any non-false value
  return mode === 3 ? value === true : value !== false
}
/**
 * 
 * @param key 
 * @param context 
 * @param loc 
 * @param args 
 * @returns 
 * 该函数名为 `checkCompatEnabled`，接受多个参数：`key`、`context`、`loc`、以及可变参数 `args`。它用于检查指定的兼容性配置项是否启用，并在开发环境下进行警告提示。

函数内部逻辑如下：
1. 首先，通过调用 `isCompatEnabled` 函数检查指定的兼容性配置项 `key` 是否启用，并将结果赋给变量 `enabled`。
2. 如果在开发环境下（`__DEV__` 为真值）且兼容性配置项启用，那么调用 `warnDeprecation` 函数发出兼容性警告，并将 `key`、`context`、`loc` 和 `args` 作为参数传递给它。
3. 最后，返回兼容性配置项是否启用的布尔值。

该函数的作用是检查兼容性配置项是否启用，并在开发环境下给出警告提示。在编译器或其他相关工具中，可以使用该函数来检查特定的兼容性配置项是否启用，并在启用时发出警告，以提醒开发者相关的变更或调整。
 */
export function checkCompatEnabled(
  key: CompilerDeprecationTypes,
  context: ParserContext | TransformContext,
  loc: SourceLocation | null,
  ...args: any[]
): boolean {
  const enabled = isCompatEnabled(key, context)
  if (__DEV__ && enabled) {
    warnDeprecation(key, context, loc, ...args)
  }
  return enabled
}
/**
 * 
 * @param key 
 * @param context 
 * @param loc 
 * @param args 
 * @returns 
 * 该函数名为 `warnDeprecation`，接受多个参数：`key`、`context`、`loc`、以及可变参数 `args`。它用于发出兼容性警告。

函数内部逻辑如下：
1. 首先，通过调用 `getCompatValue` 函数获取指定兼容性配置项 `key` 的值，并将结果赋给变量 `val`。
2. 如果兼容性配置项的值为 `'suppress-warning'`，则直接返回，不进行警告提示。
3. 获取兼容性警告的消息和链接信息，分别保存在 `message` 和 `link` 中。
4. 根据 `message` 的类型（函数或字符串），调用相应的方式生成最终的警告消息 `msg`。
5. 创建一个新的 `SyntaxError` 实例，并将警告消息作为错误消息赋值给它。同时，将兼容性配置项的键值 `key` 作为错误代码赋值给 `err.code` 属性。
6. 如果存在源代码位置信息 `loc`，则将其赋值给 `err.loc` 属性。
7. 最后，调用 `context.onWarn` 方法，并将 `err` 作为参数传递给它，以触发警告处理。

该函数的作用是根据兼容性配置项发出相应的警告。它通过获取兼容性配置项的值，并根据配置项的值确定是否发出警告。如果值为 `'suppress-warning'`，则不会发出警告；否则，根据配置项的消息和链接信息生成警告消息，并触发警告处理。警告消息将包含兼容性配置项的相关信息、详细说明以及可能的解决方法。
 */
export function warnDeprecation(
  key: CompilerDeprecationTypes,
  context: ParserContext | TransformContext,
  loc: SourceLocation | null,
  ...args: any[]
) {
  const val = getCompatValue(key, context)
  if (val === 'suppress-warning') {
    return
  }
  const { message, link } = deprecationData[key]
  const msg = `(deprecation ${key}) ${
    typeof message === 'function' ? message(...args) : message
  }${link ? `\n  Details: ${link}` : ``}`

  const err = new SyntaxError(msg) as CompilerError
  err.code = key
  if (loc) err.loc = loc
  context.onWarn(err)
}
