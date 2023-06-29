/* eslint-disable no-restricted-globals */
import { ComponentInternalInstance, formatComponentName } from './component'
import { devtoolsPerfEnd, devtoolsPerfStart } from './devtools'
/**
 * `let supported: boolean` 是一个变量声明语句，用于声明一个名为 `supported` 的变量，并指定它的类型为布尔型（boolean）。

布尔型是一种数据类型，它只有两个可能的取值：`true`（真）和 `false`（假）。在这里，`supported` 变量将被用来表示某种条件或状态的支持情况，它的值将决定程序的后续行为。

通过使用 `let` 关键字声明变量，可以在代码的后续部分对 `supported` 进行赋值操作，以根据特定的条件或逻辑来确定它的值。例如：

```javascript
let supported: boolean;

if (condition) {
  supported = true;
} else {
  supported = false;
}
```

在上述示例中，根据某个条件 `condition` 的结果，`supported` 变量将被赋值为 `true` 或 `false`，以反映条件的支持情况。然后可以根据 `supported` 变量的值来执行不同的代码逻辑。
 */
let supported: boolean
/**
 * `let perf: Performance` 是一个变量声明语句，用于声明一个名为 `perf` 的变量，并指定它的类型为 `Performance`。

在某些编程语言中，`Performance` 可能是一个预定义的类型或类，通常用于表示性能相关的信息和功能。它可能包含与测量、计时、优化和分析代码性能相关的方法和属性。

通过声明一个 `perf` 变量为 `Performance` 类型，你可以在后续代码中使用这个变量来访问和操作与性能相关的功能。具体使用方式将根据编程语言和上下文而有所不同。

下面是一个示例，展示如何使用 `perf` 变量调用某些性能测量的方法：

```javascript
let perf: Performance = new Performance();

perf.startTimer();

// 执行一些需要测量性能的代码

perf.stopTimer();

const elapsedTime = perf.getElapsedTime();

console.log(`执行时间：${elapsedTime} 毫秒`);
```

在上述示例中，我们创建了一个 `perf` 对象，调用其 `startTimer` 方法开始计时，然后执行需要测量性能的代码，之后调用 `stopTimer` 方法停止计时，最后通过 `getElapsedTime` 方法获取经过的时间。最终将结果打印在控制台上。

请注意，具体的 `Performance` 类型和其可用的方法和属性将取决于编程语言和开发环境。以上示例仅作为一种可能的使用方式。
 */
let perf: Performance
/**
 * 
 * @param instance 
 * @param type 
 * 这段代码看起来是一个导出的函数 `startMeasure`，接受两个参数 `instance` 和 `type`。下面是代码的解释：

1. 如果 `instance.appContext.config.performance` 为真且 `isSupported()` 返回真，则执行以下代码：
   - `perf.mark(`vue-${type}-${instance.uid}`)`：使用 `perf` 对象调用 `mark` 方法，用于在性能测量中标记一个时间戳。该时间戳的名称是以字符串 `'vue-'`、`type` 和 `instance.uid` 组成的。

2. 如果在开发环境下（`__DEV__` 为真）或者启用了生产环境开发者工具（`__FEATURE_PROD_DEVTOOLS__` 为真），则执行以下代码：
   - `devtoolsPerfStart(instance, type, isSupported() ? perf.now() : Date.now())`：调用 `devtoolsPerfStart` 函数，并传递 `instance`、`type` 和一个时间戳作为参数。时间戳的值取决于是否支持性能测量，如果支持则使用 `perf.now()` 方法获取当前时间戳，否则使用 `Date.now()` 获取。

这段代码的作用是在性能测量时记录标记，并在开发环境或者启用了生产环境开发者工具时启动性能测量。具体的 `perf` 对象和 `devtoolsPerfStart` 函数的定义及用途需要在代码的其他部分找到。
 */
export function startMeasure(
  instance: ComponentInternalInstance,
  type: string
) {
  if (instance.appContext.config.performance && isSupported()) {
    perf.mark(`vue-${type}-${instance.uid}`)
  }

  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsPerfStart(instance, type, isSupported() ? perf.now() : Date.now())
  }
}
/**
 * 
 * @param instance 
 * @param type 
 * 这段代码是一个导出的函数 `endMeasure`，接受两个参数 `instance` 和 `type`。下面是代码的解释：

1. 如果 `instance.appContext.config.performance` 为真且 `isSupported()` 返回真，则执行以下代码：
   - 创建一个 `startTag` 字符串，其值为 `vue-${type}-${instance.uid}`。
   - 创建一个 `endTag` 字符串，其值为 `startTag` 加上 `:end`。
   - `perf.mark(endTag)`：使用 `perf` 对象调用 `mark` 方法，在性能测量中标记一个结束时间戳。
   - `perf.measure(`<${formatComponentName(instance, instance.type)}> ${type}`, startTag, endTag)`：使用 `perf` 对象调用 `measure` 方法，测量两个标记之间的时间差，并给这个时间差命名。时间差的名称是一个字符串，由组件名称和类型组成。
   - `perf.clearMarks(startTag)` 和 `perf.clearMarks(endTag)`：使用 `perf` 对象分别调用 `clearMarks` 方法，清除之前标记的起始时间戳和结束时间戳。

2. 如果在开发环境下（`__DEV__` 为真）或者启用了生产环境开发者工具（`__FEATURE_PROD_DEVTOOLS__` 为真），则执行以下代码：
   - `devtoolsPerfEnd(instance, type, isSupported() ? perf.now() : Date.now())`：调用 `devtoolsPerfEnd` 函数，并传递 `instance`、`type` 和一个时间戳作为参数。时间戳的值取决于是否支持性能测量，如果支持则使用 `perf.now()` 方法获取当前时间戳，否则使用 `Date.now()` 获取。

这段代码的作用是结束性能测量，并计算测量结果的时间差。在开发环境或者启用了生产环境开发者工具时，还会调用相关函数记录性能数据。具体的 `perf` 对象、`formatComponentName` 函数和 `devtoolsPerfEnd` 函数的定义及用途需要在代码的其他部分找到。
 */
export function endMeasure(instance: ComponentInternalInstance, type: string) {
  if (instance.appContext.config.performance && isSupported()) {
    const startTag = `vue-${type}-${instance.uid}`
    const endTag = startTag + `:end`
    perf.mark(endTag)
    perf.measure(
      `<${formatComponentName(instance, instance.type)}> ${type}`,
      startTag,
      endTag
    )
    perf.clearMarks(startTag)
    perf.clearMarks(endTag)
  }

  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsPerfEnd(instance, type, isSupported() ? perf.now() : Date.now())
  }
}
/**
 * 
 * @returns 
 * 这段代码定义了一个名为 `isSupported()` 的函数。下面是代码的解释：

1. 如果 `supported` 不是 `undefined`，则返回 `supported` 的值。这意味着如果 `supported` 已经被定义过，函数直接返回其值。

2. 如果 `window` 对象存在且具有 `performance` 属性（即浏览器支持性能测量），则执行以下代码：
   - 将 `supported` 的值设置为 `true`，表示浏览器支持性能测量。
   - 将 `perf` 的值设置为 `window.performance`，即使用浏览器提供的性能测量功能。

3. 如果不满足上述条件，则执行以下代码：
   - 将 `supported` 的值设置为 `false`，表示浏览器不支持性能测量。

4. 最后，返回 `supported` 的值，表示当前浏览器是否支持性能测量。

这个函数的作用是检测浏览器是否支持性能测量功能。它首先检查全局变量 `supported` 是否已经定义，如果已定义则直接返回其值。如果 `supported` 未定义，则通过检查浏览器环境是否存在 `window.performance` 属性来确定是否支持性能测量。如果支持，将 `supported` 设置为 `true`，并将全局变量 `perf` 设置为 `window.performance`。如果不支持，将 `supported` 设置为 `false`。最后返回 `supported` 的值，表示支持性能测量的结果。
 */
function isSupported() {
  if (supported !== undefined) {
    return supported
  }
  if (typeof window !== 'undefined' && window.performance) {
    supported = true
    perf = window.performance
  } else {
    supported = false
  }
  return supported
}
