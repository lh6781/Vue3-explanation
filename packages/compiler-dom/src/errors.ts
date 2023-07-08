import {
  SourceLocation,
  CompilerError,
  createCompilerError,
  ErrorCodes
} from '@vue/compiler-core'
/**
 * 该代码片段定义了一个名为 `DOMCompilerError` 的接口，该接口扩展了 `CompilerError` 接口，并添加了一个 `code` 属性，用于表示 DOM 相关的错误代码。

`DOMCompilerError` 接口的定义如下：

```typescript
export interface DOMCompilerError extends CompilerError {
  code: DOMErrorCodes;
}
```

其中，`DOMErrorCodes` 是一个枚举类型，用于表示不同的 DOM 相关错误代码。该枚举类型在其他地方进行了定义，可能包含诸如 `X_V_SHOW_NO_EXPRESSION`、`X_V_TEXT_NO_EXPRESSION` 等错误代码。

通过扩展 `CompilerError` 接口并添加 `code` 属性，`DOMCompilerError` 接口可以在编译器中用于表示与 DOM 相关的错误，并提供错误代码以进行更具体的错误识别和处理。
 */
export interface DOMCompilerError extends CompilerError {
  code: DOMErrorCodes
}
/**
 * 
 * @param code 
 * @param loc 
 * @returns 
 * 该代码片段定义了一个名为 `createDOMCompilerError` 的函数，用于创建 DOM 相关的编译器错误对象。

该函数接受两个参数：
- `code`：表示错误代码的枚举值，类型为 `DOMErrorCodes`。
- `loc`（可选）：表示错误位置的对象，类型为 `SourceLocation`。

函数内部调用了 `createCompilerError` 函数，该函数用于创建通用的编译器错误对象。它接受三个参数：
- `code`：表示错误代码的枚举值。
- `loc`：表示错误位置的对象。
- `messages`：表示错误消息的对象，根据 `__DEV__` 和 `__BROWSER__` 环境变量的值决定是否传入。

最后，通过类型断言将通用的编译器错误对象转换为 DOM 相关的编译器错误对象，即 `DOMCompilerError` 类型。

这个函数的作用是方便创建 DOM 相关的编译器错误对象，并提供错误代码和位置信息。在编译过程中，如果发现与 DOM 相关的错误，可以使用该函数创建相应的错误对象。
 */
export function createDOMCompilerError(
  code: DOMErrorCodes,
  loc?: SourceLocation
) {
  return createCompilerError(
    code,
    loc,
    __DEV__ || !__BROWSER__ ? DOMErrorMessages : undefined
  ) as DOMCompilerError
}
/**
 * 这段代码定义了一个名为 `DOMErrorCodes` 的常量枚举。该枚举列出了一些与 DOM 相关的错误代码。

枚举成员的命名约定为 `X_` 开头，后跟具体的错误名称，以及可选的错误类型或修饰词。例如，`X_V_HTML_NO_EXPRESSION` 表示在 `<template v-html>` 指令中没有表达式的错误。

枚举成员的值从 `53` 开始，并依次递增。其中，`ErrorCodes.__EXTEND_POINT__` 是一个特殊的错误代码，用作扩展点。

这些错误代码可以在编译器中使用，用于标识和处理与 DOM 相关的编译错误。
 */
export const enum DOMErrorCodes {
  X_V_HTML_NO_EXPRESSION = 53 /* ErrorCodes.__EXTEND_POINT__ */,
  X_V_HTML_WITH_CHILDREN,
  X_V_TEXT_NO_EXPRESSION,
  X_V_TEXT_WITH_CHILDREN,
  X_V_MODEL_ON_INVALID_ELEMENT,
  X_V_MODEL_ARG_ON_ELEMENT,
  X_V_MODEL_ON_FILE_INPUT_ELEMENT,
  X_V_MODEL_UNNECESSARY_VALUE,
  X_V_SHOW_NO_EXPRESSION,
  X_TRANSITION_INVALID_CHILDREN,
  X_IGNORED_SIDE_EFFECT_TAG,
  __EXTEND_POINT__
}
/**
 * 这段代码是一个测试条件，用于在测试环境下检查 `DOMErrorCodes` 是否需要更新。

它首先检查 `DOMErrorCodes.X_V_HTML_NO_EXPRESSION` 是否小于 `ErrorCodes.__EXTEND_POINT__`，`ErrorCodes.__EXTEND_POINT__` 是核心 `ErrorCodes` 的扩展点。如果 `DOMErrorCodes.X_V_HTML_NO_EXPRESSION` 的值小于 `ErrorCodes.__EXTEND_POINT__`，则表示需要更新 `DOMErrorCodes`，因为它的值没有正确与扩展点保持同步。

如果检查失败，代码会抛出一个错误，其中包含一个建议的更新值，以确保 `DOMErrorCodes` 与核心 `ErrorCodes` 的扩展点匹配。
 */
if (__TEST__) {
  // esbuild cannot infer const enum increments if first value is from another
  // file, so we have to manually keep them in sync. this check ensures it
  // errors out if there are collisions.
  if (DOMErrorCodes.X_V_HTML_NO_EXPRESSION < ErrorCodes.__EXTEND_POINT__) {
    throw new Error(
      `DOMErrorCodes need to be updated to ${
        ErrorCodes.__EXTEND_POINT__ + 1
      } to match extension point from core ErrorCodes.`
    )
  }
}
/**
 * 这段代码定义了一个对象 `DOMErrorMessages`，它包含了一些错误代码和相应的错误消息。

每个错误代码对应一个错误消息，例如 `DOMErrorCodes.X_V_HTML_NO_EXPRESSION` 对应的错误消息是 `"v-html is missing expression."`。

这个对象可以在编译过程中使用，根据错误代码来获取相应的错误消息，以便在错误处理过程中提供更具体和有意义的错误信息。
 */
export const DOMErrorMessages: { [code: number]: string } = {
  [DOMErrorCodes.X_V_HTML_NO_EXPRESSION]: `v-html is missing expression.`,
  [DOMErrorCodes.X_V_HTML_WITH_CHILDREN]: `v-html will override element children.`,
  [DOMErrorCodes.X_V_TEXT_NO_EXPRESSION]: `v-text is missing expression.`,
  [DOMErrorCodes.X_V_TEXT_WITH_CHILDREN]: `v-text will override element children.`,
  [DOMErrorCodes.X_V_MODEL_ON_INVALID_ELEMENT]: `v-model can only be used on <input>, <textarea> and <select> elements.`,
  [DOMErrorCodes.X_V_MODEL_ARG_ON_ELEMENT]: `v-model argument is not supported on plain elements.`,
  [DOMErrorCodes.X_V_MODEL_ON_FILE_INPUT_ELEMENT]: `v-model cannot be used on file inputs since they are read-only. Use a v-on:change listener instead.`,
  [DOMErrorCodes.X_V_MODEL_UNNECESSARY_VALUE]: `Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior.`,
  [DOMErrorCodes.X_V_SHOW_NO_EXPRESSION]: `v-show is missing expression.`,
  [DOMErrorCodes.X_TRANSITION_INVALID_CHILDREN]: `<Transition> expects exactly one child element or component.`,
  [DOMErrorCodes.X_IGNORED_SIDE_EFFECT_TAG]: `Tags with side effect (<script> and <style>) are ignored in client component templates.`
}
