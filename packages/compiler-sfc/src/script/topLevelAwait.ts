import { AwaitExpression } from '@babel/types'
import { ScriptCompileContext } from './context'

/**
 * Support context-persistence between top-level await expressions:
 *
 * ```js
 * const instance = getCurrentInstance()
 * await foo()
 * expect(getCurrentInstance()).toBe(instance)
 * ```
 *
 * In the future we can potentially get rid of this when Async Context
 * becomes generally available: https://github.com/tc39/proposal-async-context
 *
 * ```js
 * // input
 * await foo()
 * // output
 * ;(
 *   ([__temp,__restore] = withAsyncContext(() => foo())),
 *   await __temp,
 *   __restore()
 * )
 *
 * // input
 * const a = await foo()
 * // output
 * const a = (
 *   ([__temp, __restore] = withAsyncContext(() => foo())),
 *   __temp = await __temp,
 *   __restore(),
 *   __temp
 * )
 * ```
 * `processAwait` 函数用于处理 `await` 表达式。

函数的工作流程如下：

1. 首先确定 `node.argument` 中实际表达式的起始位置，考虑到可能存在括号包裹的情况，需要检查 `node.argument.extra.parenthesized` 是否为 `true`，如果是，则使用 `node.argument.extra.parenStart` 作为起始位置，否则使用 `node.argument.start`。
2. 获取当前脚本编译上下文中的起始偏移量 `startOffset`。
3. 根据起始位置和起始偏移量，提取出 `node.argument` 的字符串表示，即从起始位置到结束位置的源代码片段。
4. 检查提取出的 `argumentStr` 是否包含嵌套的 `await` 表达式，通过正则表达式 `/\\bawait\\b/` 进行匹配。
5. 使用 `ctx.s.overwrite` 方法替换源代码中的部分内容，将 `node.start` 到 `argumentStart` 之间的代码替换为新的字符串。
   - 如果 `needSemi` 为 `true`，则在替换的代码前添加分号 `;`。
   - 在替换的代码中，定义了两个临时变量 `__temp` 和 `__restore`，其中 `__temp` 是用于存储 `withAsyncContext` 函数返回的临时结果，`__restore` 是用于恢复执行上下文的函数调用。
   - 如果 `containsNestedAwait` 为 `true`，则在 `withAsyncContext` 函数调用中添加 `async` 关键字。
6. 使用 `ctx.s.appendLeft` 方法在 `node.end` 之后追加新的代码。
   - 在追加的代码中，关闭 `withAsyncContext` 函数调用的括号，并在后面添加逗号 `,`。
   - 如果 `isStatement` 为 `false`，表示 `await` 表达式作为表达式使用，将 `__temp` 赋值给当前位置。
   - 添加 `await __temp` 用于执行 `await` 操作。
   - 添加 `__restore()` 用于恢复执行上下文。
   - 如果 `isStatement` 为 `false`，在最后添加逗号 `,` 和 `__temp` 的返回值。
7. 完成替换和追加操作。

总结来说，`processAwait` 函数用于处理 `await` 表达式。它在源代码中对 `await` 表达式进行替换和追加操作，包括添加临时变量、调用 `withAsyncContext` 函数、添加 `await` 关键字、恢复执行上下文等操作，以确保 `await` 表达式的正确执行。
 */
export function processAwait(
  ctx: ScriptCompileContext,
  node: AwaitExpression,
  needSemi: boolean,
  isStatement: boolean
) {
  const argumentStart =
    node.argument.extra && node.argument.extra.parenthesized
      ? (node.argument.extra.parenStart as number)
      : node.argument.start!

  const startOffset = ctx.startOffset!
  const argumentStr = ctx.descriptor.source.slice(
    argumentStart + startOffset,
    node.argument.end! + startOffset
  )

  const containsNestedAwait = /\bawait\b/.test(argumentStr)

  ctx.s.overwrite(
    node.start! + startOffset,
    argumentStart + startOffset,
    `${needSemi ? `;` : ``}(\n  ([__temp,__restore] = ${ctx.helper(
      `withAsyncContext`
    )}(${containsNestedAwait ? `async ` : ``}() => `
  )
  ctx.s.appendLeft(
    node.end! + startOffset,
    `)),\n  ${isStatement ? `` : `__temp = `}await __temp,\n  __restore()${
      isStatement ? `` : `,\n  __temp`
    }\n)`
  )
}
