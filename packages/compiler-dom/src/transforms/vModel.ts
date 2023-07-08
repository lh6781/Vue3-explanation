import {
  transformModel as baseTransform,
  DirectiveTransform,
  ElementTypes,
  findProp,
  NodeTypes,
  hasDynamicKeyVBind
} from '@vue/compiler-core'
import { createDOMCompilerError, DOMErrorCodes } from '../errors'
import {
  V_MODEL_CHECKBOX,
  V_MODEL_RADIO,
  V_MODEL_SELECT,
  V_MODEL_TEXT,
  V_MODEL_DYNAMIC
} from '../runtimeHelpers'
/**
 * 
 * @param dir 
 * @param node 
 * @param context 
 * @returns 
 * `transformModel` 是用于处理 `v-model` 指令的转换函数。

该函数接受三个参数：`dir` 表示指令对象，`node` 表示当前节点，`context` 表示转换上下文。

函数的主要逻辑如下：

1. 首先，通过调用 `baseTransform` 函数对指令进行基本的转换处理，并将结果保存在 `baseResult` 变量中。

2. 检查基本转换结果中是否存在属性节点，如果不存在或当前节点是组件节点，则直接返回基本转换结果。

3. 如果指令对象存在参数 `arg`，则表示在元素节点上使用了 `v-model` 指令的参数形式，此时会通过调用 `context.onError` 方法发出错误，错误类型为 `DOMErrorCodes.X_V_MODEL_ARG_ON_ELEMENT`。

4. 定义 `checkDuplicatedValue` 函数，用于检查是否存在重复的 `value` 属性。如果存在，则通过调用 `context.onError` 方法发出错误，错误类型为 `DOMErrorCodes.X_V_MODEL_UNNECESSARY_VALUE`。

5. 根据当前节点的标签类型和属性进行判断，确定使用哪种类型的 `v-model` 指令。常见的情况包括 `<input>`、`<textarea>`、`<select>` 以及自定义元素。对于不支持的标签类型，会通过调用 `context.onError` 方法发出错误，错误类型为 `DOMErrorCodes.X_V_MODEL_ON_INVALID_ELEMENT`。

6. 对于支持的标签类型，根据具体情况确定要使用的 `v-model` 指令的类型。如果存在无效的输入类型（例如 `<input type="file">`），则会设置 `isInvalidType` 为 `true`，并通过调用 `context.onError` 方法发出错误，错误类型为 `DOMErrorCodes.X_V_MODEL_ON_FILE_INPUT_ELEMENT`。

7. 在支持的标签类型下，将指令类型转换为相应的运行时指令，并将其赋值给 `baseResult.needRuntime`。此处通过调用 `context.helper` 方法生成运行时指令的辅助符号。

8. 根据指令类型的不同，可能需要移除基本转换结果中的特定属性。例如，对于本地的 `v-model` 指令，不需要将 `modelValue` 作为属性传递给运行时，因此会将其从属性列表中过滤掉。

9. 返回处理后的转换结果。

该转换函数的作用是处理 `v-model` 指令，并根据当前节点的类型和属性确定要使用的具体指令类型。同时，还会进行一些额外的校验和错误处理，例如检查是否存在重复的属性、是否在不支持的元素上使用了 `v-model` 等。
 */
export const transformModel: DirectiveTransform = (dir, node, context) => {
  const baseResult = baseTransform(dir, node, context)
  // base transform has errors OR component v-model (only need props)
  if (!baseResult.props.length || node.tagType === ElementTypes.COMPONENT) {
    return baseResult
  }

  if (dir.arg) {
    context.onError(
      createDOMCompilerError(
        DOMErrorCodes.X_V_MODEL_ARG_ON_ELEMENT,
        dir.arg.loc
      )
    )
  }

  function checkDuplicatedValue() {
    const value = findProp(node, 'value')
    if (value) {
      context.onError(
        createDOMCompilerError(
          DOMErrorCodes.X_V_MODEL_UNNECESSARY_VALUE,
          value.loc
        )
      )
    }
  }

  const { tag } = node
  const isCustomElement = context.isCustomElement(tag)
  if (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    isCustomElement
  ) {
    let directiveToUse = V_MODEL_TEXT
    let isInvalidType = false
    if (tag === 'input' || isCustomElement) {
      const type = findProp(node, `type`)
      if (type) {
        if (type.type === NodeTypes.DIRECTIVE) {
          // :type="foo"
          directiveToUse = V_MODEL_DYNAMIC
        } else if (type.value) {
          switch (type.value.content) {
            case 'radio':
              directiveToUse = V_MODEL_RADIO
              break
            case 'checkbox':
              directiveToUse = V_MODEL_CHECKBOX
              break
            case 'file':
              isInvalidType = true
              context.onError(
                createDOMCompilerError(
                  DOMErrorCodes.X_V_MODEL_ON_FILE_INPUT_ELEMENT,
                  dir.loc
                )
              )
              break
            default:
              // text type
              __DEV__ && checkDuplicatedValue()
              break
          }
        }
      } else if (hasDynamicKeyVBind(node)) {
        // element has bindings with dynamic keys, which can possibly contain
        // "type".
        directiveToUse = V_MODEL_DYNAMIC
      } else {
        // text type
        __DEV__ && checkDuplicatedValue()
      }
    } else if (tag === 'select') {
      directiveToUse = V_MODEL_SELECT
    } else {
      // textarea
      __DEV__ && checkDuplicatedValue()
    }
    // inject runtime directive
    // by returning the helper symbol via needRuntime
    // the import will replaced a resolveDirective call.
    if (!isInvalidType) {
      baseResult.needRuntime = context.helper(directiveToUse)
    }
  } else {
    context.onError(
      createDOMCompilerError(
        DOMErrorCodes.X_V_MODEL_ON_INVALID_ELEMENT,
        dir.loc
      )
    )
  }

  // native vmodel doesn't need the `modelValue` props since they are also
  // passed to the runtime as `binding.value`. removing it reduces code size.
  baseResult.props = baseResult.props.filter(
    p =>
      !(
        p.key.type === NodeTypes.SIMPLE_EXPRESSION &&
        p.key.content === 'modelValue'
      )
  )

  return baseResult
}
