import { LVal, Node } from '@babel/types'
import { isCallOf } from './utils'
import { ScriptCompileContext } from './context'
/**
 * 这行代码定义了一个常量 `DEFINE_SLOTS`，其值为字符串 `'defineSlots'`。该常量用于表示一个名为 `defineSlots` 的函数。常量的目的是在代码中引用函数名时提供一致性和可读性。通过使用常量，可以避免在多个地方使用字符串字面量，并且在需要修改函数名时只需修改常量的值即可，而不必在代码中的每个引用处进行修改。
 */
export const DEFINE_SLOTS = 'defineSlots'
/**
 * 
 * @param ctx 
 * @param node 
 * @param declId 
 * @returns 
 * 这段代码定义了一个名为 `processDefineSlots` 的函数，它用于处理 `DEFINE_SLOTS` 函数调用。函数接受三个参数：`ctx`（ScriptCompileContext 类型）、`node`（Node 类型）和可选的 `declId`（LVal 类型）。

函数首先检查 `node` 是否为 `DEFINE_SLOTS` 函数调用，如果不是，则返回 `false`。接下来，函数检查是否已经存在 `DEFINE_SLOTS` 函数调用，如果已经存在，则在 `ctx` 上报告错误，指示存在重复的调用。然后，将 `ctx` 的 `hasDefineSlotsCall` 属性设置为 `true`，表示已经存在 `DEFINE_SLOTS` 函数调用。

函数进一步检查 `node` 的参数个数是否大于 0，如果是，则在 `ctx` 上报告错误，指示 `DEFINE_SLOTS` 函数不接受任何参数。

最后，如果传入了 `declId` 参数，函数使用 `ctx.s.overwrite` 方法将 `node` 的代码替换为 `${ctx.helper('useSlots')}()`，这里使用了 `ctx` 的辅助函数 `helper` 来生成对 `useSlots` 函数的调用。

函数返回 `true`，表示成功处理了 `DEFINE_SLOTS` 函数调用。
 */
export function processDefineSlots(
  ctx: ScriptCompileContext,
  node: Node,
  declId?: LVal
): boolean {
  if (!isCallOf(node, DEFINE_SLOTS)) {
    return false
  }
  if (ctx.hasDefineSlotsCall) {
    ctx.error(`duplicate ${DEFINE_SLOTS}() call`, node)
  }
  ctx.hasDefineSlotsCall = true

  if (node.arguments.length > 0) {
    ctx.error(`${DEFINE_SLOTS}() cannot accept arguments`, node)
  }

  if (declId) {
    ctx.s.overwrite(
      ctx.startOffset! + node.start!,
      ctx.startOffset! + node.end!,
      `${ctx.helper('useSlots')}()`
    )
  }

  return true
}
