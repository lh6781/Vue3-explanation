import { Node } from '@babel/types'
import { isCallOf } from './utils'
import { ScriptCompileContext } from './context'
/**
 * `DEFINE_EXPOSE` 是一个常量，其值为字符串 `'defineExpose'`。它用于表示在 Vue 组件中使用的 `defineExpose` 函数或选项。`defineExpose` 的作用是暴露组件实例的方法或属性，使其可以在父组件或其他地方进行访问。通过调用 `defineExpose` 函数或在组件选项中使用 `defineExpose` 属性，可以将指定的方法或属性暴露给外部使用。

使用 `DEFINE_EXPOSE` 常量可以方便地引用和检查 `defineExpose` 函数或选项，以及处理相关的逻辑。
 */
export const DEFINE_EXPOSE = 'defineExpose'
/**
 * 
 * @param ctx 
 * @param node 
 * @returns 
 * `processDefineExpose` 是一个函数，用于处理 Vue 组件中的 `defineExpose` 函数或选项。

该函数接受两个参数：
- `ctx`：ScriptCompileContext 对象，表示脚本编译的上下文。
- `node`：Node 对象，表示要处理的节点。

函数的作用是检查给定的节点是否为 `DEFINE_EXPOSE` 函数调用，并在上下文中进行相应的处理。如果节点是 `DEFINE_EXPOSE` 函数调用，则将上下文中的 `hasDefineExposeCall` 标志设置为 `true`，表示已经存在了 `DEFINE_EXPOSE` 函数调用。如果节点不是 `DEFINE_EXPOSE` 函数调用，则函数返回 `false`。

该函数的使用可以帮助在编译过程中检测和处理 `defineExpose` 函数或选项的重复调用情况。
 */
export function processDefineExpose(
  ctx: ScriptCompileContext,
  node: Node
): boolean {
  if (isCallOf(node, DEFINE_EXPOSE)) {
    if (ctx.hasDefineExposeCall) {
      ctx.error(`duplicate ${DEFINE_EXPOSE}() call`, node)
    }
    ctx.hasDefineExposeCall = true
    return true
  }
  return false
}
