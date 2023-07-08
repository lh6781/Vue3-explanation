import { Node } from '@babel/types'
import { ScriptCompileContext } from './context'
import { isCallOf, unwrapTSNode } from './utils'
import { DEFINE_PROPS } from './defineProps'
import { DEFINE_EMITS } from './defineEmits'
import { DEFINE_EXPOSE } from './defineExpose'
import { DEFINE_SLOTS } from './defineSlots'
/**
 * `DEFINE_OPTIONS` 是一个常量，表示 `defineOptions`。

`defineOptions` 是一个函数，用于处理选项定义。在 Vue 组件中，可以使用 `defineOptions` 来定义组件的选项。

由于你只提供了常量的定义而没有提供函数的实现，我无法提供函数的详细解释。但是，一般来说，`defineOptions` 函数可能会接受多个参数，用于定义组件的各种选项，例如组件的名称、props、computed、methods、watchers 等等。通过使用 `defineOptions`，开发者可以以编程方式定义组件的选项，而不是在组件对象上直接编写选项。

需要注意的是，由于你没有提供 `defineOptions` 的实现，上述内容只是一般情况下的描述，并不能准确反映 `defineOptions` 函数的具体行为。如果你需要更详细的解释，请提供完整的代码实现。
 */
export const DEFINE_OPTIONS = 'defineOptions'
/**
 * 
 * @param ctx 
 * @param node 
 * @returns 
 * `processDefineOptions` 是一个函数，用于处理 `defineOptions` 的调用。

在函数内部，它首先检查传入的 `node` 是否是 `defineOptions` 的调用。如果不是，则返回 `false`，表示未处理该调用。

如果是 `defineOptions` 的调用，并且之前已经有过 `defineOptions` 的调用，则会报错，因为重复调用 `defineOptions` 是不允许的。

函数还会检查 `defineOptions` 是否接受类型参数，如果有类型参数，则报错，因为 `defineOptions` 不接受类型参数。

如果传入的 `node` 中有参数，表示有传递选项对象，则会进行进一步处理。

在处理选项对象时，函数会检查选项对象中是否包含 `props`、`emits`、`expose`、`slots` 属性。如果出现了这些属性，则报错，因为应该使用相应的 `defineProps`、`defineEmits`、`defineExpose`、`defineSlots` 函数来声明这些选项。

最后，函数会将 `ctx.hasDefineOptionsCall` 设置为 `true`，表示已经处理了 `defineOptions` 的调用。

总的来说，`processDefineOptions` 函数用于验证和处理 `defineOptions` 的调用情况，并进行相应的报错和处理。
 */
export function processDefineOptions(
  ctx: ScriptCompileContext,
  node: Node
): boolean {
  if (!isCallOf(node, DEFINE_OPTIONS)) {
    return false
  }
  if (ctx.hasDefineOptionsCall) {
    ctx.error(`duplicate ${DEFINE_OPTIONS}() call`, node)
  }
  if (node.typeParameters) {
    ctx.error(`${DEFINE_OPTIONS}() cannot accept type arguments`, node)
  }
  if (!node.arguments[0]) return true

  ctx.hasDefineOptionsCall = true
  ctx.optionsRuntimeDecl = unwrapTSNode(node.arguments[0])

  let propsOption = undefined
  let emitsOption = undefined
  let exposeOption = undefined
  let slotsOption = undefined
  if (ctx.optionsRuntimeDecl.type === 'ObjectExpression') {
    for (const prop of ctx.optionsRuntimeDecl.properties) {
      if (
        (prop.type === 'ObjectProperty' || prop.type === 'ObjectMethod') &&
        prop.key.type === 'Identifier'
      ) {
        if (prop.key.name === 'props') propsOption = prop
        if (prop.key.name === 'emits') emitsOption = prop
        if (prop.key.name === 'expose') exposeOption = prop
        if (prop.key.name === 'slots') slotsOption = prop
      }
    }
  }

  if (propsOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare props. Use ${DEFINE_PROPS}() instead.`,
      propsOption
    )
  }
  if (emitsOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare emits. Use ${DEFINE_EMITS}() instead.`,
      emitsOption
    )
  }
  if (exposeOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare expose. Use ${DEFINE_EXPOSE}() instead.`,
      exposeOption
    )
  }
  if (slotsOption) {
    ctx.error(
      `${DEFINE_OPTIONS}() cannot be used to declare slots. Use ${DEFINE_SLOTS}() instead.`,
      slotsOption
    )
  }

  return true
}
