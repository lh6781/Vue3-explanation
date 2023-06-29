import { VNode } from './vnode'
import {
  Data,
  ComponentInternalInstance,
  ConcreteComponent,
  formatComponentName
} from './component'
import { isString, isFunction } from '@vue/shared'
import { toRaw, isRef, pauseTracking, resetTracking } from '@vue/reactivity'
import { callWithErrorHandling, ErrorCodes } from './errorHandling'
/**
 * `ComponentVNode` 是一种特殊类型的 `VNode`，它具有以下特点：

- `ComponentVNode` 继承自 `VNode` 类型。
- `ComponentVNode` 的 `type` 属性是一个具体组件类型（`ConcreteComponent`）。
- 除了继承自 `VNode` 的属性之外，`ComponentVNode` 可能还包含其他与组件相关的属性和方法。

通过定义 `ComponentVNode` 类型，可以在类型系统中标识出特定类型的 vnode，以便在组件开发过程中进行类型检查和推断。
 */
type ComponentVNode = VNode & {
  type: ConcreteComponent
}
/**
 * `stack` 是一个数组，用于存储 `VNode` 对象。它被声明为 `VNode` 类型的数组，即 `VNode[]`。可以通过向 `stack` 数组添加元素来实现堆栈（stack）的功能，例如使用 `push` 方法将元素推入堆栈，使用 `pop` 方法将元素从堆栈中弹出。
 */
const stack: VNode[] = []
/**
 * `TraceEntry` 是一个类型，表示追踪条目。它具有两个属性：

- `vnode`：表示组件 `VNode` 对象，它是一个具体的组件（`ConcreteComponent`）。
- `recurseCount`：表示递归计数，用于追踪组件在递归过程中的嵌套层级。

使用 `TraceEntry` 类型，可以创建一个对象，其中包含 `vnode` 和 `recurseCount` 属性，并将其用于追踪组件的调用堆栈或递归深度等信息。
 */
type TraceEntry = {
  vnode: ComponentVNode
  recurseCount: number
}
/**
 * `ComponentTraceStack` 是一个类型，表示组件追踪堆栈。它是由多个 `TraceEntry` 组成的数组，用于记录组件的调用堆栈或递归深度。

使用 `ComponentTraceStack` 类型，可以创建一个数组，其中每个元素都是 `TraceEntry` 类型的对象，用于跟踪组件的调用堆栈信息。可以将新的 `TraceEntry` 对象推入堆栈，或从堆栈中弹出最后一个元素，以实现堆栈的追踪和管理。
 */
type ComponentTraceStack = TraceEntry[]
/**
 * 
 * @param vnode 
 * `pushWarningContext` 是一个函数，用于将 `vnode` 推入警告上下文堆栈 `stack` 中。

函数接受一个 `vnode` 参数，表示要推入堆栈的虚拟节点。它将该 `vnode` 对象添加到 `stack` 数组的末尾，以便在警告处理过程中可以访问和引用该节点。

通过调用 `pushWarningContext` 函数，可以将当前正在处理的虚拟节点推入警告上下文堆栈，以便在警告相关的逻辑中可以获取到相应的上下文信息。
 */
export function pushWarningContext(vnode: VNode) {
  stack.push(vnode)
}
/**
 * `popWarningContext` 是一个函数，用于从警告上下文堆栈 `stack` 中弹出最近添加的虚拟节点。

该函数不接受任何参数。它通过调用 `stack.pop()` 方法将 `stack` 数组的末尾元素（即最近添加的虚拟节点）移除。

通过调用 `popWarningContext` 函数，可以在警告相关的逻辑处理完成后，将之前推入的虚拟节点从警告上下文堆栈中移除。这样可以确保在处理下一个虚拟节点时，警告上下文堆栈中始终保持最新的上下文信息。
 */
export function popWarningContext() {
  stack.pop()
}
/**
 * 
 * @param msg 
 * @param args 
 * @returns 
 * `warn` 是一个警告函数，用于在开发环境下输出警告信息。

该函数接受一个字符串 `msg` 和可选的其他参数 `args`。它首先会检查是否处于开发环境（`__DEV__`），如果不是，则直接返回，不执行后续的警告逻辑。

在执行警告逻辑之前，它会调用 `pauseTracking` 函数，暂停对属性的跟踪，以避免在 patch 过程中格式化属性或跟踪可能被修改的依赖项，从而导致无限递归。

接下来，它从警告上下文堆栈 `stack` 中获取最近添加的虚拟节点的实例 `instance`，以及该实例的应用程序警告处理程序 `appWarnHandler`。

如果存在 `appWarnHandler`，则调用 `callWithErrorHandling` 函数，将警告信息以及相关的实例、代理和组件追踪信息作为参数，调用 `appWarnHandler` 进行处理。

如果不存在 `appWarnHandler`，则通过 `console.warn` 方法输出警告信息。在输出警告信息时，如果存在组件追踪信息 `trace`，且不处于测试环境（`__TEST__`），则会将组件追踪信息格式化后添加到警告信息中。

最后，它调用 `resetTracking` 函数，重置属性的跟踪状态。

总而言之，`warn` 函数用于在开发环境下输出警告信息，并根据配置的应用程序警告处理程序进行处理。如果没有配置应用程序警告处理程序，则将警告信息输出到控制台。
 */
export function warn(msg: string, ...args: any[]) {
  if (!__DEV__) return

  // avoid props formatting or warn handler tracking deps that might be mutated
  // during patch, leading to infinite recursion.
  pauseTracking()

  const instance = stack.length ? stack[stack.length - 1].component : null
  const appWarnHandler = instance && instance.appContext.config.warnHandler
  const trace = getComponentTrace()

  if (appWarnHandler) {
    callWithErrorHandling(
      appWarnHandler,
      instance,
      ErrorCodes.APP_WARN_HANDLER,
      [
        msg + args.join(''),
        instance && instance.proxy,
        trace
          .map(
            ({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`
          )
          .join('\n'),
        trace
      ]
    )
  } else {
    const warnArgs = [`[Vue warn]: ${msg}`, ...args]
    /* istanbul ignore if */
    if (
      trace.length &&
      // avoid spamming console during tests
      !__TEST__
    ) {
      warnArgs.push(`\n`, ...formatTrace(trace))
    }
    console.warn(...warnArgs)
  }

  resetTracking()
}
/**
 * 
 * @returns 
 * `getComponentTrace` 函数用于获取组件的追踪信息，返回一个组件追踪堆栈 `ComponentTraceStack`。

该函数首先获取 `stack` 数组中最近添加的虚拟节点 `currentVNode`。如果 `currentVNode` 不存在，则直接返回空数组，表示没有组件追踪信息。

接下来，使用实例的父级指针重新构建父级链条，因为在没有从根组件开始的更新过程中，`stack` 数组可能是不完整的。

通过循环遍历父级链条，将每个父级节点的追踪信息添加到 `normalizedStack` 数组中。如果当前节点已存在于 `normalizedStack` 中，则递增该节点的 `recurseCount` 属性，表示重复出现的次数。否则，将当前节点的追踪信息添加到 `normalizedStack` 数组中。

最后，更新当前节点为父级实例的虚拟节点，以继续迭代父级链条，直到达到根节点为止。

最终，返回组件的追踪信息 `normalizedStack`，其中包含了每个组件节点的追踪信息和重复出现的次数。

总结起来，`getComponentTrace` 函数用于获取组件的追踪信息，通过遍历父级链条并记录节点的重复出现次数，返回一个组件追踪堆栈。这对于识别组件嵌套层级和重复渲染很有用。
 */
export function getComponentTrace(): ComponentTraceStack {
  let currentVNode: VNode | null = stack[stack.length - 1]
  if (!currentVNode) {
    return []
  }

  // we can't just use the stack because it will be incomplete during updates
  // that did not start from the root. Re-construct the parent chain using
  // instance parent pointers.
  const normalizedStack: ComponentTraceStack = []

  while (currentVNode) {
    const last = normalizedStack[0]
    if (last && last.vnode === currentVNode) {
      last.recurseCount++
    } else {
      normalizedStack.push({
        vnode: currentVNode as ComponentVNode,
        recurseCount: 0
      })
    }
    const parentInstance: ComponentInternalInstance | null =
      currentVNode.component && currentVNode.component.parent
    currentVNode = parentInstance && parentInstance.vnode
  }

  return normalizedStack
}

/* istanbul ignore next */
/**
 * 
 * @param trace 
 * @returns 
 * `formatTrace` 函数用于格式化组件追踪堆栈，将其转换为可打印的日志数组。

该函数接受一个 `ComponentTraceStack` 类型的参数 `trace`，表示组件追踪堆栈。它使用 `forEach` 方法遍历 `trace` 数组中的每个追踪项 `entry`，并将格式化后的日志信息添加到 `logs` 数组中。

在遍历过程中，对于每个追踪项，如果是第一个追踪项（即 `i === 0`），则不添加换行符；否则，添加一个换行符，以分隔不同的追踪项。然后，调用 `formatTraceEntry` 函数对追踪项进行格式化，并将格式化后的日志信息添加到 `logs` 数组中。

最后，返回包含格式化日志的 `logs` 数组。

总结起来，`formatTrace` 函数用于将组件追踪堆栈转换为可打印的日志数组，通过遍历追踪堆栈中的每个追踪项，并将其格式化后的日志信息添加到数组中。这样可以方便地打印组件追踪信息，用于调试和错误报告。
 */
function formatTrace(trace: ComponentTraceStack): any[] {
  const logs: any[] = []
  trace.forEach((entry, i) => {
    logs.push(...(i === 0 ? [] : [`\n`]), ...formatTraceEntry(entry))
  })
  return logs
}
/**
 * 
 * @param param0 
 * @returns 
 * `formatTraceEntry` 函数用于格式化追踪项，将其转换为可打印的日志数组。

该函数接受一个 `TraceEntry` 类型的参数，包含了追踪项的 `vnode` 和 `recurseCount` 属性。根据 `recurseCount` 的值，生成一个后缀字符串 `postfix`，用于指示迭代调用的次数。

接下来，通过判断 `vnode` 是否具有组件属性，确定是否为根组件。如果 `vnode.component` 存在且 `vnode.component.parent` 为 `null`，则表示该 `vnode` 是根组件。

然后，构建包含组件名的开头字符串 `open`，使用 `formatComponentName` 函数对组件名进行格式化，同时根据是否为根组件添加相应的标识。

最后，构建结尾字符串 `close`，添加 `>` 符号，并根据 `recurseCount` 的值添加后缀字符串。

根据 `vnode.props` 的情况，如果存在，则将开头字符串 `open`、属性格式化后的日志数组以及结尾字符串 `close` 组合成一个数组返回；否则，只返回包含开头字符串 `open` 和结尾字符串 `close` 的数组。

总结起来，`formatTraceEntry` 函数用于将追踪项转换为可打印的日志数组。通过格式化组件名、迭代调用的次数和属性信息，构建开头字符串、结尾字符串以及属性格式化后的日志数组，最终返回包含这些信息的数组。这样可以方便地打印追踪项的相关信息，用于调试和错误报告。
 */
function formatTraceEntry({ vnode, recurseCount }: TraceEntry): any[] {
  const postfix =
    recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``
  const isRoot = vnode.component ? vnode.component.parent == null : false
  const open = ` at <${formatComponentName(
    vnode.component,
    vnode.type,
    isRoot
  )}`
  const close = `>` + postfix
  return vnode.props
    ? [open, ...formatProps(vnode.props), close]
    : [open + close]
}

/* istanbul ignore next */
/**
 * 
 * @param props 
 * @returns 
 * `formatProps` 函数用于格式化组件属性，将其转换为可打印的日志数组。

该函数接受一个 `props` 对象作为参数，包含组件的属性信息。首先，通过 `Object.keys` 获取属性对象的所有键，并将其存储在 `keys` 数组中。

接下来，使用 `keys.slice(0, 3)` 获取前三个属性键，遍历这些键，并通过 `formatProp` 函数对每个属性进行格式化。将格式化后的结果添加到 `res` 数组中。

如果属性的键的数量大于三个，则在 `res` 数组末尾添加一个省略符号 `...`，表示还有更多的属性。

最后，返回 `res` 数组作为格式化后的属性日志数组。

总结起来，`formatProps` 函数用于将组件的属性对象转换为可打印的日志数组。通过遍历属性键并调用 `formatProp` 函数对每个属性进行格式化，最终生成包含属性信息的数组。如果属性的数量超过三个，则在数组末尾添加省略符号。这样可以方便地打印组件的属性信息，用于调试和错误报告。
 */
function formatProps(props: Data): any[] {
  const res: any[] = []
  const keys = Object.keys(props)
  keys.slice(0, 3).forEach(key => {
    res.push(...formatProp(key, props[key]))
  })
  if (keys.length > 3) {
    res.push(` ...`)
  }
  return res
}
/**
 * 
 * @param key 
 * @param value
 *formatProp 函数是用于格式化组件属性的键和值的函数。它有三个重载形式，根据传入的参数类型进行匹配。

第一个重载形式是 function formatProp(key: string, value: unknown): any[]，它接收属性的键和值，并返回一个包含格式化后的键值对的数组。

第二个重载形式是 function formatProp(key: string, value: unknown, raw: true): any，它接收属性的键和值，并返回原始形式的属性值。

第三个重载形式是 /* istanbul ignore next  function formatProp(key: string, value: unknown, raw?: boolean): any，这是一个被忽略测试覆盖率的函数重载。它接收属性的键、值和一个可选的 raw 参数，根据 raw 参数的值来决定是否返回原始形式的属性值。

在函数内部，它根据属性值的类型进行不同的处理逻辑：

如果属性值是字符串类型，将其转换为 JSON 字符串形式，并根据 raw 参数的值返回结果。
如果属性值是数字、布尔值或 null，根据 raw 参数的值返回结果。
如果属性值是 Ref 引用类型，将其转换为原始值后再次调用 formatProp 函数，并根据 raw 参数的值返回结果。
如果属性值是函数类型，根据函数的名称生成格式化字符串。
对于其他类型的属性值，将其转换为原始值后返回结果。
最后，根据 raw 参数的值决定返回结果是一个包含格式化后的键值对的数组，还是返回原始形式的属性值。

需要注意的是，第三个重载形式的函数在测试覆盖率时被忽略，因为它是为特殊需求而设计的，并不常用。
 */
function formatProp(key: string, value: unknown): any[]
function formatProp(key: string, value: unknown, raw: true): any
/* istanbul ignore next */
function formatProp(key: string, value: unknown, raw?: boolean): any {
  if (isString(value)) {
    value = JSON.stringify(value)
    return raw ? value : [`${key}=${value}`]
  } else if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value == null
  ) {
    return raw ? value : [`${key}=${value}`]
  } else if (isRef(value)) {
    value = formatProp(key, toRaw(value.value), true)
    return raw ? value : [`${key}=Ref<`, value, `>`]
  } else if (isFunction(value)) {
    return [`${key}=fn${value.name ? `<${value.name}>` : ``}`]
  } else {
    value = toRaw(value)
    return raw ? value : [`${key}=`, value]
  }
}

/**
 * @internal
 * 这段代码是一个名为`assertNumber`的 TypeScript 函数。让我们逐步解释它的功能：

1. 该函数接受两个参数：`val` 和 `type`。`val` 是要进行检查的值，`type` 是表示值类型的字符串。

2. 函数首先检查 `__DEV__` 是否为假值。如果是，函数将立即返回，不执行后续代码。

3. 如果 `val` 的值是 `undefined`，函数也会立即返回，不执行后续代码。

4. 接下来，函数检查 `val` 的类型是否为 `'number'`。如果不是，它会调用 `warn` 函数，将一条警告信息打印到控制台，内容为 `${type} is not a valid number - got ${JSON.stringify(val)}.`。该警告信息表示给定的值不是一个有效的数字。

5. 如果 `val` 的类型是 `'number'`，函数会进一步检查它是否是 `NaN`。如果是，它会调用 `warn` 函数，将一条警告信息打印到控制台，内容为 `${type} is NaN - the duration expression might be incorrect.`。该警告信息表示给定的值是 `NaN`，可能表示持续时间表达式不正确。

总结：`assertNumber` 函数用于在开发环境中检查一个值是否为有效的数字。它会根据检查结果打印相应的警告信息到控制台。
 */
export function assertNumber(val: unknown, type: string) {
  if (!__DEV__) return
  if (val === undefined) {
    return
  } else if (typeof val !== 'number') {
    warn(`${type} is not a valid number - ` + `got ${JSON.stringify(val)}.`)
  } else if (isNaN(val)) {
    warn(`${type} is NaN - ` + 'the duration expression might be incorrect.')
  }
}
