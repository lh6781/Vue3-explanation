import { DirectiveTransform } from '../transform'
import {
  createSimpleExpression,
  createObjectProperty,
  createCompoundExpression,
  NodeTypes,
  Property,
  ElementTypes,
  ExpressionNode,
  ConstantTypes
} from '../ast'
import { createCompilerError, ErrorCodes } from '../errors'
import {
  isMemberExpression,
  isSimpleIdentifier,
  hasScopeRef,
  isStaticExp
} from '../utils'
import { IS_REF } from '../runtimeHelpers'
import { BindingTypes } from '../options'
import { camelize } from '@vue/shared'

export const transformModel: DirectiveTransform = (dir, node, context) => {
  const { exp, arg } = dir
  if (!exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_NO_EXPRESSION, dir.loc)
    )
    return createTransformProps()
  }

  const rawExp = exp.loc.source
  const expString =
    exp.type === NodeTypes.SIMPLE_EXPRESSION ? exp.content : rawExp

  // im SFC <script setup> inline mode, the exp may have been transformed into
  // _unref(exp)
  const bindingType = context.bindingMetadata[rawExp]

  // check props
  if (
    bindingType === BindingTypes.PROPS ||
    bindingType === BindingTypes.PROPS_ALIASED
  ) {
    context.onError(createCompilerError(ErrorCodes.X_V_MODEL_ON_PROPS, exp.loc))
    return createTransformProps()
  }

  const maybeRef =
    !__BROWSER__ &&
    context.inline &&
    (bindingType === BindingTypes.SETUP_LET ||
      bindingType === BindingTypes.SETUP_REF ||
      bindingType === BindingTypes.SETUP_MAYBE_REF)

  if (
    !expString.trim() ||
    (!isMemberExpression(expString, context) && !maybeRef)
  ) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_MALFORMED_EXPRESSION, exp.loc)
    )
    return createTransformProps()
  }

  if (
    !__BROWSER__ &&
    context.prefixIdentifiers &&
    isSimpleIdentifier(expString) &&
    context.identifiers[expString]
  ) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE, exp.loc)
    )
    return createTransformProps()
  }

  const propName = arg ? arg : createSimpleExpression('modelValue', true)
  const eventName = arg
    ? isStaticExp(arg)
      ? `onUpdate:${camelize(arg.content)}`
      : createCompoundExpression(['"onUpdate:" + ', arg])
    : `onUpdate:modelValue`

  let assignmentExp: ExpressionNode
  const eventArg = context.isTS ? `($event: any)` : `$event`
  if (maybeRef) {
    if (bindingType === BindingTypes.SETUP_REF) {
      // v-model used on known ref.
      assignmentExp = createCompoundExpression([
        `${eventArg} => ((`,
        createSimpleExpression(rawExp, false, exp.loc),
        `).value = $event)`
      ])
    } else {
      // v-model used on a potentially ref binding in <script setup> inline mode.
      // the assignment needs to check whether the binding is actually a ref.
      const altAssignment =
        bindingType === BindingTypes.SETUP_LET ? `${rawExp} = $event` : `null`
      assignmentExp = createCompoundExpression([
        `${eventArg} => (${context.helperString(IS_REF)}(${rawExp}) ? (`,
        createSimpleExpression(rawExp, false, exp.loc),
        `).value = $event : ${altAssignment})`
      ])
    }
  } else {
    assignmentExp = createCompoundExpression([
      `${eventArg} => ((`,
      exp,
      `) = $event)`
    ])
  }

  const props = [
    // modelValue: foo
    createObjectProperty(propName, dir.exp!),
    // "onUpdate:modelValue": $event => (foo = $event)
    createObjectProperty(eventName, assignmentExp)
  ]

  // cache v-model handler if applicable (when it doesn't refer any scope vars)
  if (
    !__BROWSER__ &&
    context.prefixIdentifiers &&
    !context.inVOnce &&
    context.cacheHandlers &&
    !hasScopeRef(exp, context.identifiers)
  ) {
    props[1].value = context.cache(props[1].value)
  }

  // modelModifiers: { foo: true, "bar-baz": true }
  if (dir.modifiers.length && node.tagType === ElementTypes.COMPONENT) {
    const modifiers = dir.modifiers
      .map(m => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + `: true`)
      .join(`, `)
    const modifiersKey = arg
      ? isStaticExp(arg)
        ? `${arg.content}Modifiers`
        : createCompoundExpression([arg, ' + "Modifiers"'])
      : `modelModifiers`
    props.push(
      createObjectProperty(
        modifiersKey,
        createSimpleExpression(
          `{ ${modifiers} }`,
          false,
          dir.loc,
          ConstantTypes.CAN_HOIST
        )
      )
    )
  }

  return createTransformProps(props)
}
/**
 * 
 * @param props 
 * @returns 
 * 这段代码定义了一个名为 `transformModel` 的 `DirectiveTransform`，用于处理 `v-model` 指令的转换操作。

该转换操作接收指令节点 `dir`、元素节点 `node` 和上下文 `context` 作为参数。

首先，它从指令中提取出表达式 `exp` 和参数 `arg`。如果表达式不存在，则会抛出编译错误，并返回 `createTransformProps()`。

然后，它根据表达式的类型和上下文的绑定元数据确定绑定类型。如果绑定类型是 `PROPS` 或 `PROPS_ALIASED`，则会抛出编译错误，并返回 `createTransformProps()`。

接下来，它检查表达式字符串是否为空或是否为简单成员表达式（通过 `isMemberExpression` 函数判断）。如果不满足条件，会抛出编译错误，并返回 `createTransformProps()`。

在一些特定的情况下（非浏览器环境且处于 `<script setup>` 内联模式且绑定类型是 `SETUP_LET`、`SETUP_REF` 或 `SETUP_MAYBE_REF`），`maybeRef` 变量会被设置为 `true`。

如果在满足以上条件的情况下，表达式字符串是一个简单的标识符且在上下文的标识符列表中存在该标识符，则会抛出编译错误，并返回 `createTransformProps()`。

接下来，根据参数 `arg` 的存在与否，创建属性名 `propName` 和事件名 `eventName`。如果存在参数 `arg`，则根据参数是否是静态表达式，创建相应的属性名；否则，使用复合表达式生成。

然后，根据不同情况创建赋值表达式 `assignmentExp`。如果 `maybeRef` 为真，根据绑定类型的不同创建不同的赋值表达式；否则，直接赋值给表达式本身。

接下来，创建属性数组 `props`，包括 `modelValue` 属性和 `onUpdate:modelValue` 事件属性。

如果在非浏览器环境下，且满足一定条件（例如前缀标识符、非 `v-once` 且启用了事件处理程序缓存且表达式没有引用任何作用域变量），则将事件处理程序进行缓存，并将缓存后的表达式赋值给 `props[1].value`。

最后，如果指令具有修饰符且元素节点类型是组件，则创建 `modelModifiers` 属性，包含修饰符的键值对。该属性用于传递给组件的 `v-model`。

最终，返回 `createTransformProps(props)`，将创建的属性数组作为参数传递给 `createTransformProps` 函数。
 */
function createTransformProps(props: Property[] = []) {
  return { props }
}
