import { DirectiveTransform } from '@vue/compiler-core'
import { createDOMCompilerError, DOMErrorCodes } from '../errors'
import { V_SHOW } from '../runtimeHelpers'
/**
 * 
 * @param dir 
 * @param node 
 * @param context 
 * @returns 
 * `transformShow` 是一个指令转换函数，用于转换 `v-show` 指令。

函数的参数包括 `dir`（指令对象）、`node`（节点对象）和 `context`（转换上下文）。

函数首先从指令对象中提取表达式 `exp` 和位置信息 `loc`。如果表达式为空，则通过 `context.onError` 抛出一个编译错误，指示缺少 `v-show` 表达式。

然后，函数返回一个包含空属性数组和 `V_SHOW` 运行时助手的对象。`V_SHOW` 运行时助手用于在运行时处理 `v-show` 指令。

这个函数的作用是根据 `v-show` 指令的表达式，生成对应的转换结果。转换结果包含一个空的属性数组，表示没有额外的属性需要添加，以及一个指定了 `V_SHOW` 运行时助手的 `needRuntime` 字段，用于在运行时处理 `v-show` 指令的显示逻辑。
 */
export const transformShow: DirectiveTransform = (dir, node, context) => {
  const { exp, loc } = dir
  if (!exp) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_V_SHOW_NO_EXPRESSION, loc)
    )
  }

  return {
    props: [],
    needRuntime: context.helper(V_SHOW)
  }
}
