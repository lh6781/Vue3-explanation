import { SourceLocation } from './ast'
/**
 * 这是一个名为 `CompilerError` 的接口，用于表示编译器的错误信息。

该接口继承了 `SyntaxError` 接口，并添加了以下属性：

- `code: number | string`：表示错误的代码。可以是一个数字或字符串类型的错误代码，用于标识不同的错误类型。
- `loc?: SourceLocation`：表示错误发生的位置信息。是一个可选的属性，包含错误所在的源代码位置。

通过使用 `CompilerError` 接口，可以在编译过程中捕获和处理编译器产生的错误，并获取错误的代码和位置信息进行相关处理。
 */
export interface CompilerError extends SyntaxError {
  code: number | string
  loc?: SourceLocation
}
/**
 * 这是一个名为 `CoreCompilerError` 的接口，它是 `CompilerError` 接口的扩展，用于表示核心编译器的错误信息。

该接口添加了一个属性：

- `code: ErrorCodes`：表示错误的代码，它是一个枚举类型 `ErrorCodes` 的值，用于标识不同的错误类型。

通过使用 `CoreCompilerError` 接口，可以更具体地标识核心编译器产生的错误，并使用预定义的错误代码进行错误处理和识别。
 */
export interface CoreCompilerError extends CompilerError {
  code: ErrorCodes
}
/**
 * 
 * @param error 
 * `defaultOnError` 是一个函数，用于处理编译器错误。它接受一个 `CompilerError` 对象作为参数，并抛出该错误。

当编译器遇到错误时，如果没有提供自定义的错误处理函数，将会调用 `defaultOnError` 函数来处理错误。该函数简单地将错误对象抛出，以便在调用编译器的代码中捕获并进行适当的处理。

你可以根据自己的需求定义和使用自定义的错误处理函数，以便在编译器出现错误时采取特定的行为或提供自定义的错误处理逻辑。
 */
export function defaultOnError(error: CompilerError) {
  throw error
}
/**
 * 
 * @param msg 
 * `defaultOnWarn` 是一个函数，用于处理编译器的警告信息。它接受一个 `CompilerError` 对象作为参数，并在开发环境下通过 `console.warn` 输出警告信息。

当编译器遇到警告时，如果没有提供自定义的警告处理函数，将会调用 `defaultOnWarn` 函数来处理警告。该函数会将警告信息打印到控制台，以便开发者可以及时注意和处理这些警告信息。

请注意，`defaultOnWarn` 函数仅在开发环境下才会执行，并且需要确保全局变量 `__DEV__` 的值为 `true`。如果在生产环境中使用编译器，建议提供自定义的警告处理函数，并根据实际需求进行适当的处理和记录。
 */
export function defaultOnWarn(msg: CompilerError) {
  __DEV__ && console.warn(`[Vue warn] ${msg.message}`)
}
/**
 * `InferCompilerError<T>` 是一个条件类型。它接受一个类型参数 `T`，如果 `T` 是 `ErrorCodes` 类型，则返回 `CoreCompilerError` 类型；否则返回 `CompilerError` 类型。

这个类型可以用来推断编译器错误的类型。如果 `T` 是 `ErrorCodes`，意味着它是一个已定义的错误代码，因此返回 `CoreCompilerError` 类型，其中 `code` 属性被限定为 `ErrorCodes` 类型。否则，返回的类型是一般的 `CompilerError`，其中 `code` 属性可以是数字或字符串类型。

这个类型可以用于编译器相关的函数或方法中，以根据错误代码的类型提供更具体的错误处理或错误信息。
 */
type InferCompilerError<T> = T extends ErrorCodes
  ? CoreCompilerError
  : CompilerError
/**
 * 
 * @param code 
 * @param loc 
 * @param messages 
 * @param additionalMessage 
 * @returns 
 * `createCompilerError` 是一个泛型函数，用于创建编译器错误。它接受一个 `code` 参数，表示错误代码，类型为 `T`，并可选地接受 `loc`、`messages` 和 `additionalMessage` 参数。

函数根据当前环境和错误代码获取相应的错误消息，创建一个新的 `SyntaxError` 对象，并将其断言为 `InferCompilerError<T>` 类型，然后将错误代码和位置信息赋值给错误对象的 `code` 和 `loc` 属性，最后返回错误对象。

在开发环境或非浏览器环境下，函数会根据错误代码从 `messages` 或 `errorMessages` 中获取相应的错误消息，并可以附加额外的错误信息。在生产环境且是浏览器环境下，函数直接将错误代码作为错误消息。

`InferCompilerError<T>` 用于根据错误代码的类型推断错误对象的具体类型，如果 `T` 是已定义的错误代码类型 `ErrorCodes`，则返回 `CoreCompilerError` 类型；否则返回一般的 `CompilerError` 类型。这样可以确保在使用 `createCompilerError` 函数时，根据错误代码的类型提供更具体的错误对象类型，以便进行更精确的错误处理或错误信息的访问。
 */
export function createCompilerError<T extends number>(
  code: T,
  loc?: SourceLocation,
  messages?: { [code: number]: string },
  additionalMessage?: string
): InferCompilerError<T> {
  const msg =
    __DEV__ || !__BROWSER__
      ? (messages || errorMessages)[code] + (additionalMessage || ``)
      : code
  const error = new SyntaxError(String(msg)) as InferCompilerError<T>
  error.code = code
  error.loc = loc
  return error
}
/**
 * `ErrorCodes` 是一个包含各种错误代码的枚举常量。它定义了在编译过程中可能出现的各种错误情况，以便进行错误识别和处理。

这些错误代码包括了解析错误（parse errors）、Vue 特定的解析错误（Vue-specific parse errors）、转换错误（transform errors）、通用错误（generic errors）以及废弃警告（deprecations）等。

每个错误代码都对应一个唯一的枚举值，例如 `ABRUPT_CLOSING_OF_EMPTY_COMMENT`、`CDATA_IN_HTML_CONTENT`、`DUPLICATE_ATTRIBUTE` 等。枚举值采用大写字母和下划线的命名方式。

在枚举中还有一个特殊的值 `__EXTEND_POINT__`，它被用作高阶编译器的扩展点，以避免错误代码之间的冲突。

通过使用这些错误代码，可以在编译过程中标识和处理不同类型的错误，提供更详细的错误信息和错误处理逻辑。
 */
export const enum ErrorCodes {
  // parse errors
  ABRUPT_CLOSING_OF_EMPTY_COMMENT,
  CDATA_IN_HTML_CONTENT,
  DUPLICATE_ATTRIBUTE,
  END_TAG_WITH_ATTRIBUTES,
  END_TAG_WITH_TRAILING_SOLIDUS,
  EOF_BEFORE_TAG_NAME,
  EOF_IN_CDATA,
  EOF_IN_COMMENT,
  EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT,
  EOF_IN_TAG,
  INCORRECTLY_CLOSED_COMMENT,
  INCORRECTLY_OPENED_COMMENT,
  INVALID_FIRST_CHARACTER_OF_TAG_NAME,
  MISSING_ATTRIBUTE_VALUE,
  MISSING_END_TAG_NAME,
  MISSING_WHITESPACE_BETWEEN_ATTRIBUTES,
  NESTED_COMMENT,
  UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME,
  UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE,
  UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME,
  UNEXPECTED_NULL_CHARACTER,
  UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME,
  UNEXPECTED_SOLIDUS_IN_TAG,

  // Vue-specific parse errors
  X_INVALID_END_TAG,
  X_MISSING_END_TAG,
  X_MISSING_INTERPOLATION_END,
  X_MISSING_DIRECTIVE_NAME,
  X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END,

  // transform errors
  X_V_IF_NO_EXPRESSION,
  X_V_IF_SAME_KEY,
  X_V_ELSE_NO_ADJACENT_IF,
  X_V_FOR_NO_EXPRESSION,
  X_V_FOR_MALFORMED_EXPRESSION,
  X_V_FOR_TEMPLATE_KEY_PLACEMENT,
  X_V_BIND_NO_EXPRESSION,
  X_V_ON_NO_EXPRESSION,
  X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET,
  X_V_SLOT_MIXED_SLOT_USAGE,
  X_V_SLOT_DUPLICATE_SLOT_NAMES,
  X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN,
  X_V_SLOT_MISPLACED,
  X_V_MODEL_NO_EXPRESSION,
  X_V_MODEL_MALFORMED_EXPRESSION,
  X_V_MODEL_ON_SCOPE_VARIABLE,
  X_V_MODEL_ON_PROPS,
  X_INVALID_EXPRESSION,
  X_KEEP_ALIVE_INVALID_CHILDREN,

  // generic errors
  X_PREFIX_ID_NOT_SUPPORTED,
  X_MODULE_MODE_NOT_SUPPORTED,
  X_CACHE_HANDLER_NOT_SUPPORTED,
  X_SCOPE_ID_NOT_SUPPORTED,

  // deprecations
  DEPRECATION_VNODE_HOOKS,
  DEPRECATION_V_IS,

  // Special value for higher-order compilers to pick up the last code
  // to avoid collision of error codes. This should always be kept as the last
  // item.
  __EXTEND_POINT__
}
/**
 * `errorMessages` 是一个映射表，将错误代码（`ErrorCodes`）与对应的错误消息字符串进行关联。

它定义了在编译过程中可能出现的各种错误情况的错误消息，以便提供更具体和有意义的错误信息。每个错误代码都对应一个错误消息字符串。

例如，对于错误代码 `ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT`，对应的错误消息字符串是 `'Illegal comment.'`。而对于错误代码 `ErrorCodes.CDATA_IN_HTML_CONTENT`，对应的错误消息字符串是 `'CDATA section is allowed only in XML context.'`。

使用这个映射表，可以根据错误代码快速获取相应的错误消息，从而向开发人员提供准确的错误描述，帮助他们理解和解决编译过程中的问题。
 */
export const errorMessages: Record<ErrorCodes, string> = {
  // parse errors
  [ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT]: 'Illegal comment.',
  [ErrorCodes.CDATA_IN_HTML_CONTENT]:
    'CDATA section is allowed only in XML context.',
  [ErrorCodes.DUPLICATE_ATTRIBUTE]: 'Duplicate attribute.',
  [ErrorCodes.END_TAG_WITH_ATTRIBUTES]: 'End tag cannot have attributes.',
  [ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS]: "Illegal '/' in tags.",
  [ErrorCodes.EOF_BEFORE_TAG_NAME]: 'Unexpected EOF in tag.',
  [ErrorCodes.EOF_IN_CDATA]: 'Unexpected EOF in CDATA section.',
  [ErrorCodes.EOF_IN_COMMENT]: 'Unexpected EOF in comment.',
  [ErrorCodes.EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT]:
    'Unexpected EOF in script.',
  [ErrorCodes.EOF_IN_TAG]: 'Unexpected EOF in tag.',
  [ErrorCodes.INCORRECTLY_CLOSED_COMMENT]: 'Incorrectly closed comment.',
  [ErrorCodes.INCORRECTLY_OPENED_COMMENT]: 'Incorrectly opened comment.',
  [ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME]:
    "Illegal tag name. Use '&lt;' to print '<'.",
  [ErrorCodes.MISSING_ATTRIBUTE_VALUE]: 'Attribute value was expected.',
  [ErrorCodes.MISSING_END_TAG_NAME]: 'End tag name was expected.',
  [ErrorCodes.MISSING_WHITESPACE_BETWEEN_ATTRIBUTES]:
    'Whitespace was expected.',
  [ErrorCodes.NESTED_COMMENT]: "Unexpected '<!--' in comment.",
  [ErrorCodes.UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME]:
    'Attribute name cannot contain U+0022 ("), U+0027 (\'), and U+003C (<).',
  [ErrorCodes.UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE]:
    'Unquoted attribute value cannot contain U+0022 ("), U+0027 (\'), U+003C (<), U+003D (=), and U+0060 (`).',
  [ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME]:
    "Attribute name cannot start with '='.",
  [ErrorCodes.UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME]:
    "'<?' is allowed only in XML context.",
  [ErrorCodes.UNEXPECTED_NULL_CHARACTER]: `Unexpected null character.`,
  [ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG]: "Illegal '/' in tags.",

  // Vue-specific parse errors
  [ErrorCodes.X_INVALID_END_TAG]: 'Invalid end tag.',
  [ErrorCodes.X_MISSING_END_TAG]: 'Element is missing end tag.',
  [ErrorCodes.X_MISSING_INTERPOLATION_END]:
    'Interpolation end sign was not found.',
  [ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END]:
    'End bracket for dynamic directive argument was not found. ' +
    'Note that dynamic directive argument cannot contain spaces.',
  [ErrorCodes.X_MISSING_DIRECTIVE_NAME]: 'Legal directive name was expected.',

  // transform errors
  [ErrorCodes.X_V_IF_NO_EXPRESSION]: `v-if/v-else-if is missing expression.`,
  [ErrorCodes.X_V_IF_SAME_KEY]: `v-if/else branches must use unique keys.`,
  [ErrorCodes.X_V_ELSE_NO_ADJACENT_IF]: `v-else/v-else-if has no adjacent v-if or v-else-if.`,
  [ErrorCodes.X_V_FOR_NO_EXPRESSION]: `v-for is missing expression.`,
  [ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION]: `v-for has invalid expression.`,
  [ErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT]: `<template v-for> key should be placed on the <template> tag.`,
  [ErrorCodes.X_V_BIND_NO_EXPRESSION]: `v-bind is missing expression.`,
  [ErrorCodes.X_V_ON_NO_EXPRESSION]: `v-on is missing expression.`,
  [ErrorCodes.X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET]: `Unexpected custom directive on <slot> outlet.`,
  [ErrorCodes.X_V_SLOT_MIXED_SLOT_USAGE]:
    `Mixed v-slot usage on both the component and nested <template>. ` +
    `When there are multiple named slots, all slots should use <template> ` +
    `syntax to avoid scope ambiguity.`,
  [ErrorCodes.X_V_SLOT_DUPLICATE_SLOT_NAMES]: `Duplicate slot names found. `,
  [ErrorCodes.X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN]:
    `Extraneous children found when component already has explicitly named ` +
    `default slot. These children will be ignored.`,
  [ErrorCodes.X_V_SLOT_MISPLACED]: `v-slot can only be used on components or <template> tags.`,
  [ErrorCodes.X_V_MODEL_NO_EXPRESSION]: `v-model is missing expression.`,
  [ErrorCodes.X_V_MODEL_MALFORMED_EXPRESSION]: `v-model value must be a valid JavaScript member expression.`,
  [ErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE]: `v-model cannot be used on v-for or v-slot scope variables because they are not writable.`,
  [ErrorCodes.X_V_MODEL_ON_PROPS]: `v-model cannot be used on a prop, because local prop bindings are not writable.\nUse a v-bind binding combined with a v-on listener that emits update:x event instead.`,
  [ErrorCodes.X_INVALID_EXPRESSION]: `Error parsing JavaScript expression: `,
  [ErrorCodes.X_KEEP_ALIVE_INVALID_CHILDREN]: `<KeepAlive> expects exactly one child component.`,

  // generic errors
  [ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED]: `"prefixIdentifiers" option is not supported in this build of compiler.`,
  [ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED]: `ES module mode is not supported in this build of compiler.`,
  [ErrorCodes.X_CACHE_HANDLER_NOT_SUPPORTED]: `"cacheHandlers" option is only supported when the "prefixIdentifiers" option is enabled.`,
  [ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED]: `"scopeId" option is only supported in module mode.`,

  // deprecations
  [ErrorCodes.DEPRECATION_VNODE_HOOKS]: `@vnode-* hooks in templates are deprecated. Use the vue: prefix instead. For example, @vnode-mounted should be changed to @vue:mounted. @vnode-* hooks support will be removed in 3.4.`,
  [ErrorCodes.DEPRECATION_V_IS]: `v-is="component-name" has been deprecated. Use is="vue:component-name" instead. v-is support will be removed in 3.4.`,

  // just to fulfill types
  [ErrorCodes.__EXTEND_POINT__]: ``
}
