import { NodeTransform, TransformContext } from '../transform'
import {
  NodeTypes,
  CallExpression,
  createCallExpression,
  ExpressionNode,
  SlotOutletNode,
  createFunctionExpression
} from '../ast'
import { isSlotOutlet, isStaticArgOf, isStaticExp } from '../utils'
import { buildProps, PropsExpression } from './transformElement'
import { createCompilerError, ErrorCodes } from '../errors'
import { RENDER_SLOT } from '../runtimeHelpers'
import { camelize } from '@vue/shared'
/**
 * 
 * @param node 
 * @param context 
 * 这是一个名为 `transformSlotOutlet` 的函数，用于转换 `slot` 插槽节点。

函数接受两个参数 `node` 和 `context`，分别表示要转换的节点和转换上下文。

函数的逻辑如下：

- 检查节点是否为 `slot` 插槽节点，即调用 `isSlotOutlet` 函数进行判断。
- 如果是 `slot` 插槽节点，则通过调用 `processSlotOutlet` 函数处理插槽节点，获取插槽的名称和插槽属性。
- 创建一个 `slotArgs` 数组，用于存储生成代码中的参数。
- 将插槽的名称、插槽属性、插槽内容函数等作为参数添加到 `slotArgs` 数组中。
- 根据上下文中的条件，调整 `expectedLen` 变量的值，用于控制参数的数量。
- 使用 `slotArgs` 数组创建一个 `createCallExpression` 节点，表示调用渲染插槽的函数。
- 将生成的 `createCallExpression` 节点赋值给节点的 `codegenNode` 属性，表示转换后的代码。

该函数用于将 `slot` 插槽节点转换为相应的代码，以实现插槽的渲染和内容传递。
 */
export const transformSlotOutlet: NodeTransform = (node, context) => {
  if (isSlotOutlet(node)) {
    const { children, loc } = node
    const { slotName, slotProps } = processSlotOutlet(node, context)

    const slotArgs: CallExpression['arguments'] = [
      context.prefixIdentifiers ? `_ctx.$slots` : `$slots`,
      slotName,
      '{}',
      'undefined',
      'true'
    ]
    let expectedLen = 2

    if (slotProps) {
      slotArgs[2] = slotProps
      expectedLen = 3
    }

    if (children.length) {
      slotArgs[3] = createFunctionExpression([], children, false, false, loc)
      expectedLen = 4
    }

    if (context.scopeId && !context.slotted) {
      expectedLen = 5
    }
    slotArgs.splice(expectedLen) // remove unused arguments

    node.codegenNode = createCallExpression(
      context.helper(RENDER_SLOT),
      slotArgs,
      loc
    )
  }
}
/**
 * `SlotOutletProcessResult` 是一个接口，用于描述 `transformSlotOutlet` 函数处理插槽节点后的结果。

该接口包含以下属性：

- `slotName: string | ExpressionNode`：表示插槽的名称。可以是一个字符串字面量，也可以是一个表达式节点。
- `slotProps: PropsExpression | undefined`：表示插槽的属性。是一个 PropsExpression 类型或 undefined，用于传递给插槽的属性。

`transformSlotOutlet` 函数在处理插槽节点时会调用 `processSlotOutlet` 函数，并从中获取插槽的名称和属性，并将其作为返回结果的属性填充到 `SlotOutletProcessResult` 对象中。
 */
interface SlotOutletProcessResult {
  slotName: string | ExpressionNode
  slotProps: PropsExpression | undefined
}
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * `processSlotOutlet` 是一个函数，用于处理插槽节点并返回 `SlotOutletProcessResult` 对象，其中包含插槽的名称和属性。

该函数接受两个参数：
- `node: SlotOutletNode`：要处理的插槽节点。
- `context: TransformContext`：转换上下文对象，包含有关转换环境的信息。

函数内部首先初始化了 `slotName` 和 `slotProps` 变量，分别用于存储插槽的名称和属性。默认情况下，`slotName` 初始化为字符串字面量 `"default"`，`slotProps` 初始化为 `undefined`。

然后，函数遍历插槽节点的属性列表，并根据属性的类型和名称进行处理。如果属性是一个 `ATTRIBUTE` 类型，并且具有值，则根据属性的名称进行判断，如果名称为 `"name"`，则将属性值作为插槽的名称；否则，将属性名称转换为驼峰命名，并将该属性添加到 `nonNameProps` 数组中。

如果属性不是 `ATTRIBUTE` 类型，则进一步判断属性的名称和参数。如果属性的名称为 `"bind"`，并且参数是静态参数且参数内容为 `"name"`，则将属性表达式作为插槽的名称；否则，将属性的参数名称转换为驼峰命名，并将该属性添加到 `nonNameProps` 数组中。

接下来，如果存在非名称属性，则调用 `buildProps` 函数构建属性和指令，并将构建的属性存储在 `slotProps` 中。如果存在指令，则通过 `context.onError` 报告编译错误。

最后，函数返回一个包含 `slotName` 和 `slotProps` 的对象，表示插槽处理的结果。

总结来说，`processSlotOutlet` 函数通过解析插槽节点的属性，获取插槽的名称和属性，并返回一个包含这些信息的对象。
 */
export function processSlotOutlet(
  node: SlotOutletNode,
  context: TransformContext
): SlotOutletProcessResult {
  let slotName: string | ExpressionNode = `"default"`
  let slotProps: PropsExpression | undefined = undefined

  const nonNameProps = []
  for (let i = 0; i < node.props.length; i++) {
    const p = node.props[i]
    if (p.type === NodeTypes.ATTRIBUTE) {
      if (p.value) {
        if (p.name === 'name') {
          slotName = JSON.stringify(p.value.content)
        } else {
          p.name = camelize(p.name)
          nonNameProps.push(p)
        }
      }
    } else {
      if (p.name === 'bind' && isStaticArgOf(p.arg, 'name')) {
        if (p.exp) slotName = p.exp
      } else {
        if (p.name === 'bind' && p.arg && isStaticExp(p.arg)) {
          p.arg.content = camelize(p.arg.content)
        }
        nonNameProps.push(p)
      }
    }
  }

  if (nonNameProps.length > 0) {
    const { props, directives } = buildProps(
      node,
      context,
      nonNameProps,
      false,
      false
    )
    slotProps = props

    if (directives.length) {
      context.onError(
        createCompilerError(
          ErrorCodes.X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET,
          directives[0].loc
        )
      )
    }
  }

  return {
    slotName,
    slotProps
  }
}
