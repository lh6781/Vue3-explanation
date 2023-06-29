import { ErrorCodes, callWithErrorHandling } from './errorHandling'
import { isArray, NOOP } from '@vue/shared'
import { ComponentInternalInstance, getComponentName } from './component'
import { warn } from './warning'
/**
 * 这段代码定义了一个名为 `SchedulerJob` 的接口（interface），它扩展了 `Function` 接口，并定义了一些属性。

以下是对每个属性的解释：

- `id?: number`: 作业的标识符，可选的数字类型属性。
- `pre?: boolean`: 表示作业是否是预处理作业的布尔类型属性。
- `active?: boolean`: 表示作业是否处于活动状态的布尔类型属性。
- `computed?: boolean`: 表示作业是否为计算作业的布尔类型属性。
- `allowRecurse?: boolean`: 表示作业是否允许在调度程序中递归触发自身的布尔类型属性。该属性默认为 false，因为某些内置方法调用（例如 `Array.prototype.push`）实际上会执行读取操作，可能导致混乱的无限循环。通常，组件更新函数和 watch 回调是允许递归触发的情况。组件更新函数可能会更新子组件的 props，从而触发依赖于该状态的父组件的 "pre" watch 回调（#1801）。Watch 回调不会跟踪其依赖关系，因此如果它再次触发自身，那很可能是有意为之，用户有责任执行递归的状态变更，直到最终稳定下来（#1727）。
- `ownerInstance?: ComponentInternalInstance`: 在设置组件的渲染效果时由 renderer.ts 附加。用于在报告最大递归更新时获取组件信息。仅用于开发环境。

这个接口定义了一个作业（job）的结构，作业通常由调度程序（scheduler）管理和执行。它包含了一些与作业相关的属性，以及一些用于开发环境的附加属性。

请注意，接口定义了属性的类型和可选性，并提供了对每个属性的简要注释说明。
 */
export interface SchedulerJob extends Function {
  id?: number
  pre?: boolean
  active?: boolean
  computed?: boolean
  /**
   * Indicates whether the effect is allowed to recursively trigger itself
   * when managed by the scheduler.
   *
   * By default, a job cannot trigger itself because some built-in method calls,
   * e.g. Array.prototype.push actually performs reads as well (#1740) which
   * can lead to confusing infinite loops.
   * The allowed cases are component update functions and watch callbacks.
   * Component update functions may update child component props, which in turn
   * trigger flush: "pre" watch callbacks that mutates state that the parent
   * relies on (#1801). Watch callbacks doesn't track its dependencies so if it
   * triggers itself again, it's likely intentional and it is the user's
   * responsibility to perform recursive state mutation that eventually
   * stabilizes (#1727).
   */
  allowRecurse?: boolean
  /**
   * Attached by renderer.ts when setting up a component's render effect
   * Used to obtain component information when reporting max recursive updates.
   * dev only.
   */
  ownerInstance?: ComponentInternalInstance
}
/**
 * 你提供的代码定义了一个名为`SchedulerJobs`的 TypeScript 类型，它表示一个单独的`SchedulerJob`对象或`SchedulerJob`对象的数组。

在 TypeScript 中，`export`关键字用于将类型定义导出，使其可以在其他文件或模块中使用。因此，通过使用`export`，`SchedulerJobs`类型可以在代码库的其他部分中导入和使用。

以下是代码的解释：

- `SchedulerJob`：表示调度器中的单个作业的类型。
- `SchedulerJob[]`：表示`SchedulerJob`对象的数组的类型。

`SchedulerJobs`类型是一个联合类型，使用竖线符号`|`表示。它意味着类型为`SchedulerJobs`的变量或参数可以是单个`SchedulerJob`对象，也可以是`SchedulerJob`对象的数组。

以下是一些示例，以说明如何使用`SchedulerJobs`：

```typescript
import { SchedulerJob } from './schedulerJob';

// 单个 SchedulerJob
const job1: SchedulerJobs = {
  // SchedulerJob 的属性
};

// SchedulerJobs 数组
const job2: SchedulerJobs[] = [
  {
    // SchedulerJob 的属性
  },
  {
    // 另一个 SchedulerJob 的属性
  }
];

// 使用 SchedulerJobs 类型的函数参数
function processJobs(jobs: SchedulerJobs) {
  if (Array.isArray(jobs)) {
    // 处理 SchedulerJobs 数组
    for (const job of jobs) {
      // 处理每个作业
    }
  } else {
    // 处理单个 SchedulerJob
    // 处理作业
  }
}
```

通过将`SchedulerJobs`类型定义为`SchedulerJob`和`SchedulerJob[]`的联合，你可以在代码中灵活处理单个作业和作业数组。
 */
export type SchedulerJobs = SchedulerJob | SchedulerJob[]
/**
 * 这段代码声明了一个变量 `isFlushing`，并将其初始化为 `false`。

`isFlushing` 可能是一个用于跟踪当前是否正在执行刷新操作的布尔类型变量。根据这个变量的命名和初始值，可以推测它可能用于在刷新过程中进行状态标记，以确保在刷新操作进行期间不会重入（重新进入）刷新过程。

请注意，这段代码只是声明了变量并赋予了初始值，并没有提供关于它如何被使用或修改的上下文。因此，具体的变量用途需要在代码的其他部分进行进一步的查看和分析。
 */
let isFlushing = false
/**
 * 这段代码声明了一个变量 `isFlushPending`，并将其初始化为 `false`。

`isFlushPending` 可能是一个用于跟踪当前是否有刷新操作待处理的布尔类型变量。根据变量的命名和初始值，可以推测它可能用于在刷新操作等待处理时进行状态标记。

通常，在某些异步场景下，可能存在需要等待某个条件满足后再执行刷新操作的情况。此变量可能被用作标记，以指示是否有待处理的刷新操作。一旦满足特定条件，可能会将 `isFlushPending` 设置为 `true`，以通知系统有刷新操作需要处理。

请注意，这段代码只是声明了变量并赋予了初始值，并没有提供关于它如何被使用或修改的上下文。具体的变量用途和相关逻辑需要在代码的其他部分进行进一步的查看和分析。
 */
let isFlushPending = false
/**
 * 这段代码声明了一个常量 `queue`，它是一个 `SchedulerJob` 对象的数组，并将其初始化为空数组 `[]`。

`queue` 可能是一个用于存储调度程序作业的队列。调度程序作业是需要在适当的时间执行的任务或操作。通过将作业对象添加到队列中，可以按照它们的顺序依次执行。

在这个特定的代码片段中，`queue` 被定义为一个 `SchedulerJob` 类型的数组，这意味着它只能包含符合 `SchedulerJob` 接口定义的对象。

在其他部分的代码中，可能会使用 `queue` 数组来添加、移除或处理调度程序作业，以根据应用程序的需求进行调度和执行。
 */
const queue: SchedulerJob[] = []
/**
 * 这段代码声明了一个变量 `flushIndex`，并将其初始化为 `0`。

`flushIndex` 可能是一个用于跟踪调度程序作业的索引的数字变量。根据变量的命名，它可能被用于标记当前刷新操作中正在处理的作业的索引位置。

在调度程序执行刷新操作时，可能会遍历 `queue`（作业队列）中的作业，并按顺序执行它们。`flushIndex` 变量可以用于跟踪当前正在处理的作业的索引位置。随着作业的执行，`flushIndex` 的值可能会递增，以指示下一个要执行的作业。

 */
let flushIndex = 0
/**
 * 这段代码声明了一个常量 `pendingPostFlushCbs`，它是一个 `SchedulerJob` 对象的数组，并将其初始化为空数组 `[]`。

`pendingPostFlushCbs` 可能是一个用于存储待处理的后置刷新回调函数的队列。在刷新操作完成后，可能需要执行一些额外的回调函数或操作。这些后置刷新回调函数会被添加到 `pendingPostFlushCbs` 队列中，以便在适当的时机执行。


 */
const pendingPostFlushCbs: SchedulerJob[] = []
/**
 * 这段代码声明了一个变量 `activePostFlushCbs`，它的类型是 `SchedulerJob[] | null`，并将其初始化为 `null`。

`activePostFlushCbs` 可能是一个用于存储当前活动的后置刷新回调函数的数组，或者是一个空值（`null`）。后置刷新回调函数是在刷新操作完成后需要执行的回调函数。

在代码的其他部分，可能会将后置刷新回调函数添加到 `activePostFlushCbs` 数组中，并在适当的时机执行这些回调函数。当没有活动的后置刷新回调函数时，`activePostFlushCbs` 可能被设置为 `null`。

 */
let activePostFlushCbs: SchedulerJob[] | null = null
/**
 * 这段代码声明了一个变量 `postFlushIndex`，并将其初始化为 `0`。

`postFlushIndex` 可能是一个用于跟踪后置刷新回调函数的索引的数字变量。根据变量的命名，它可能被用于标记当前正在处理的后置刷新回调函数的索引位置。

在执行后置刷新回调函数时，可能会遍历 `activePostFlushCbs`（活动的后置刷新回调函数数组）中的回调函数，并按顺序执行它们。`postFlushIndex` 变量可以用于跟踪当前正在处理的后置刷新回调函数的索引位置。随着回调函数的执行，`postFlushIndex` 的值可能会递增，以指示下一个要执行的后置刷新回调函数。

 */
let postFlushIndex = 0
/**
 * 这段代码声明了一个常量 `resolvedPromise`，它是一个已经被解决（resolved）的 Promise 对象，并将其类型断言为 `Promise<any>`。

`resolvedPromise` 可能是一个用于表示已经被解决的 Promise 对象的变量。Promise 是 JavaScript 中用于处理异步操作的一种机制，它可以在未来的某个时间点提供异步操作的结果。

通过将 `Promise.resolve()` 调用的返回结果进行类型断言，将其断言为 `Promise<any>` 类型，这样可以将其赋值给 `resolvedPromise` 常量。这样做的目的可能是为了在后续的代码中使用该常量，并且可以使用 Promise 的相关方法或进行链式操作。

 */
const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>
/**
 * 这段代码声明了一个变量 `currentFlushPromise`，它的类型是 `Promise<void> | null`，并将其初始化为 `null`。

`currentFlushPromise` 可能是一个用于表示当前刷新操作的 Promise 对象，或者是一个空值（`null`）。Promise 是 JavaScript 中用于处理异步操作的一种机制，它可以在未来的某个时间点提供异步操作的结果。

在代码的其他部分，可能会创建一个新的 Promise 对象，用于表示当前的刷新操作，并将其赋值给 `currentFlushPromise` 变量。当刷新操作完成时，该 Promise 对象可能会被解决（resolved）。如果没有正在进行的刷新操作，则 `currentFlushPromise` 可能会被设置为 `null`。

 */
let currentFlushPromise: Promise<void> | null = null
/**
 * 这段代码声明了一个常量 `RECURSION_LIMIT`，并将其初始化为 `100`。

`RECURSION_LIMIT` 可能是一个用于限制递归深度的数值常量。递归是一种在函数内部调用自身的技术，它可以用于解决某些问题或执行特定的操作。

在这个特定的代码片段中，`RECURSION_LIMIT` 被定义为 `100`，这意味着递归调用应该在达到 100 层之后停止。当递归深度达到或超过限制时，可能需要采取适当的处理措施，例如中断递归、引发异常或执行其他逻辑。

 */
const RECURSION_LIMIT = 100
/**
 * 这段代码定义了一个类型别名 `CountMap`，它是一个 `Map` 类的实例，其键类型为 `SchedulerJob`，值类型为 `number`。

`CountMap` 可能是用于记录每个 `SchedulerJob` 对象的计数值的数据结构。`Map` 是 JavaScript 中的一种数据结构，它允许将值与特定的键相关联。在这种情况下，`SchedulerJob` 对象被用作键，而相应的计数值（`number` 类型）被用作与键相关联的值。

通过使用 `CountMap`，可以轻松地跟踪每个 `SchedulerJob` 对象的计数。这在某些场景下可能很有用，例如统计作业的执行次数、检查作业的重复性等。

 */
type CountMap = Map<SchedulerJob, number>
/**
 * 
 * @param this 
 * @param fn 
 * @returns 
 * 这段代码导出了一个名为 `nextTick` 的函数，它接受一个可选的函数参数 `fn`，并返回一个 `Promise<void>`。

`nextTick` 函数可能用于在下一个事件循环迭代中执行一个回调函数。它基于 Promise 的机制，允许在下一个事件循环迭代中异步执行回调函数。

函数的具体逻辑如下：
1. 首先，它定义了一个常量 `p`，它的值为 `currentFlushPromise`（当前刷新操作的 Promise）或 `resolvedPromise`（已经被解决的 Promise）。
2. 接下来，根据传入的参数 `fn` 是否存在，决定返回值是执行回调函数的 Promise 还是 `p`。
   - 如果 `fn` 存在，则使用 `p.then()` 方法创建一个新的 Promise，并将回调函数绑定到指定的 `this` 上（如果 `this` 存在）。
   - 如果 `fn` 不存在，则直接返回 `p`。
3. 最后，函数返回一个 Promise 对象，该对象将在下一个事件循环迭代中执行回调函数或解析为 `undefined`。

通过使用 `nextTick` 函数，可以将一个回调函数推迟到下一个事件循环中执行，以便在异步操作完成后执行相应的逻辑。

 */
export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}

// #2768
// Use binary-search to find a suitable position in the queue,
// so that the queue maintains the increasing order of job's id,
// which can prevent the job from being skipped and also can avoid repeated patching.
/**
 * 
 * @param id 
 * @returns 
 * 这段代码定义了一个名为 `findInsertionIndex` 的函数，它接受一个参数 `id`，并返回一个表示插入位置的索引值。

`findInsertionIndex` 函数可能用于在 `queue` 数组中查找一个适当的插入位置，以便按照一定的顺序插入具有给定 `id` 的作业。

函数的具体逻辑如下：
1. 首先，它声明了两个变量 `start` 和 `end`，它们分别被初始化为 `flushIndex + 1` 和 `queue.length`。这里的 `flushIndex` 可能是之前声明的一个变量，表示当前刷新操作中正在处理的作业的索引位置。
2. 接下来，使用一个循环（可能是二分查找算法），在 `start` 和 `end` 之间进行迭代。
3. 在每次循环迭代中，计算出中间索引 `middle`，通过右移运算符 `>>>` 将 `(start + end)` 的结果除以 2。
4. 然后，获取 `queue[middle]` 对应作业的 `id`，并将其存储在 `middleJobId` 变量中。
5. 检查 `middleJobId` 是否小于给定的 `id`，如果是，则将 `start` 更新为 `middle + 1`，否则将 `end` 更新为 `middle`。
6. 循环直到 `start` 不小于 `end`，表示找到了插入位置。
7. 最后，返回 `start` 作为插入位置的索引值。

通过调用 `findInsertionIndex` 函数，并传入相应的 `id`，可以确定将具有该 `id` 的作业插入到 `queue` 数组中的适当位置。

请注意，这段代码只是函数的声明和实现，并没有提供关于如何调用和使用 `findInsertionIndex` 函数的具体上下文。具体的调用方式和相关逻辑需要在代码的其他部分进行进一步的查看和分析。
 */
function findInsertionIndex(id: number) {
  // the start index should be `flushIndex + 1`
  let start = flushIndex + 1
  let end = queue.length

  while (start < end) {
    const middle = (start + end) >>> 1
    const middleJobId = getId(queue[middle])
    middleJobId < id ? (start = middle + 1) : (end = middle)
  }

  return start
}
/**
 * 
 * @param job 
 * 这段代码导出了一个名为 `queueJob` 的函数，它接受一个参数 `job`，用于将作业添加到队列中进行调度。

`queueJob` 函数可能用于将作业添加到调度器的作业队列中，并触发队列的刷新。

函数的具体逻辑如下：
1. 首先，它进行了一系列的条件检查，以确定是否应将作业添加到队列中。
   - 如果队列为空，则直接将作业添加到队列中。
   - 否则，通过调用 `Array.includes()` 方法检查队列中是否已经包含了相同的作业。
     - 如果当前正在执行刷新操作（`isFlushing` 为 `true`）且作业允许递归触发（`job.allowRecurse` 为 `true`），则搜索索引从 `flushIndex + 1` 开始，以允许作业递归触发自身。这可能适用于 Watch 回调函数，用户需要负责确保不会进入无限循环。
     - 如果作业不在队列中，则可以将其添加到队列中进行调度。
2. 如果作业的 `id` 为 `null`，则将作业直接推入队列的末尾。
3. 否则，通过调用 `findInsertionIndex(job.id)` 找到作业在队列中的插入位置，并使用 `splice` 方法在该位置插入作业。
4. 最后，调用 `queueFlush()` 函数触发队列的刷新。

通过调用 `queueJob` 函数，并传入相应的作业，可以将作业添加到调度器的作业队列中，并触发队列的刷新。

请注意，这段代码只是函数的声明和实现，并没有提供关于如何调用和使用 `queueJob` 函数的具体上下文。具体的调用方式和相关逻辑需要在代码的其他部分进行进一步的查看和分析。
 */
export function queueJob(job: SchedulerJob) {
  // the dedupe search uses the startIndex argument of Array.includes()
  // by default the search index includes the current job that is being run
  // so it cannot recursively trigger itself again.
  // if the job is a watch() callback, the search will start with a +1 index to
  // allow it recursively trigger itself - it is the user's responsibility to
  // ensure it doesn't end up in an infinite loop.
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {
    if (job.id == null) {
      queue.push(job)
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    queueFlush()
  }
}
/**
 * 这段代码定义了一个名为 `queueFlush` 的函数，用于触发作业队列的刷新操作。

`queueFlush` 函数可能用于确保只有在当前没有正在进行刷新操作且没有挂起的刷新操作时，才触发队列的刷新。

函数的具体逻辑如下：
1. 首先，通过条件检查判断当前是否有正在进行的刷新操作和挂起的刷新操作。
   - 如果 `isFlushing` 为 `false`（表示当前没有正在进行的刷新操作）且 `isFlushPending` 为 `false`（表示当前没有挂起的刷新操作），则继续执行刷新操作。
2. 如果上述条件满足，将 `isFlushPending` 设置为 `true`，表示有一个刷新操作即将进行。
3. 然后，使用 `resolvedPromise.then(flushJobs)` 创建一个新的 Promise 对象，并将其赋值给 `currentFlushPromise`，表示当前的刷新操作。
   - `resolvedPromise` 是之前声明的一个已经被解决的 Promise 对象，可能用于确保刷新操作始终是一个 Promise。
   - `flushJobs` 可能是一个用于执行实际刷新作业的函数。
4. 最后，刷新操作被触发。

通过调用 `queueFlush` 函数，可以确保只在适当的时机触发作业队列的刷新操作，并使用 Promise 机制进行异步处理。

请注意，这段代码只是函数的声明和实现，并没有提供关于如何调用和使用 `queueFlush` 函数的具体上下文。具体的调用方式和相关逻辑需要在代码的其他部分进行进一步的查看和分析。
 */
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
/**
 * 
 * @param job 
 * 这段代码导出了一个名为 `invalidateJob` 的函数，它接受一个参数 `job`，用于使作业无效化。

`invalidateJob` 函数可能用于在作业队列中找到指定的作业，并将其从队列中移除。

函数的具体逻辑如下：
1. 首先，使用 `queue.indexOf(job)` 查找作业在队列中的索引位置，并将结果存储在变量 `i` 中。
2. 检查索引位置 `i` 是否大于 `flushIndex`，即作业的索引是否位于当前正在刷新的作业之后。
   - 如果是，则通过 `queue.splice(i, 1)` 将作业从队列中移除。
     - `i` 表示要删除的元素的起始索引位置，`1` 表示要删除的元素数量。
3. 如果作业的索引位于或在当前正在刷新的作业之前，则不执行任何操作。

通过调用 `invalidateJob` 函数，并传入指定的作业，可以使该作业在作业队列中无效化并被移除。

 */
export function invalidateJob(job: SchedulerJob) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {
    queue.splice(i, 1)
  }
}
/**
 * 
 * @param cb 
 * 这段代码导出了一个名为 `queuePostFlushCb` 的函数，它用于将后置刷新回调函数添加到后置刷新回调队列中。

`queuePostFlushCb` 函数可能用于将后置刷新回调函数添加到队列中，并在适当的时机触发后置刷新。

函数的具体逻辑如下：
1. 首先，通过一系列条件检查确定是否应将回调函数添加到队列中。
   - 如果回调函数 `cb` 不是数组类型，则进行进一步检查。
     - 如果 `activePostFlushCbs` 为 `null` 或者回调函数不在 `activePostFlushCbs` 中（使用 `Array.includes()` 进行检查）。
       - 如果回调函数允许递归触发（`cb.allowRecurse` 为 `true`），则将搜索索引从 `postFlushIndex + 1` 开始。
       - 将回调函数添加到 `pendingPostFlushCbs` 数组中。
   - 否则，如果回调函数是数组类型，则表示它是组件的生命周期钩子，由作业触发，因此不需要进行重复检查。
     - 将数组中的回调函数全部添加到 `pendingPostFlushCbs` 数组中。
2. 最后，调用 `queueFlush()` 函数触发队列的刷新操作。

通过调用 `queuePostFlushCb` 函数，并传入后置刷新回调函数或回调函数数组，可以将它们添加到后置刷新回调队列中，并在适当的时机触发后置刷新。
 */
export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
/**
 * 
 * @param seen 
 * @param i 
 * 这段代码导出了一个名为 `flushPreFlushCbs` 的函数，用于刷新预刷新回调函数。

`flushPreFlushCbs` 函数可能用于在队列中循环遍历，找到并执行预刷新回调函数。

函数的具体逻辑如下：
1. 如果处于开发环境 (`__DEV__` 为真)，则在初始调用时创建一个计数映射表 `seen`，用于检测递归更新。
2. 循环遍历作业队列，从索引 `i` 开始，直到队列的末尾。
   - 如果当前正在进行刷新操作（`isFlushing` 为真），则跳过当前作业本身，将索引从 `flushIndex + 1` 开始。
   - 获取队列中的作业回调函数 `cb`。
   - 如果回调函数存在且具有 `pre` 属性（表示预刷新回调函数）。
     - 如果处于开发环境，并且通过 `checkRecursiveUpdates` 检测到递归更新，则跳过当前回调函数。
     - 通过 `queue.splice(i, 1)` 将回调函数从队列中移除，并将索引 `i` 减1，以确保正确遍历。
     - 调用回调函数 `cb()` 执行预刷新操作。
3. 遍历结束。

通过调用 `flushPreFlushCbs` 函数，可以触发队列中的预刷新回调函数，并执行相应的操作。
 */
export function flushPreFlushCbs(
  seen?: CountMap,
  // if currently flushing, skip the current job itself
  i = isFlushing ? flushIndex + 1 : 0
) {
  if (__DEV__) {
    seen = seen || new Map()
  }
  for (; i < queue.length; i++) {
    const cb = queue[i]
    if (cb && cb.pre) {
      if (__DEV__ && checkRecursiveUpdates(seen!, cb)) {
        continue
      }
      queue.splice(i, 1)
      i--
      cb()
    }
  }
}
/**
 * 
 * @param seen 
 * @returns 
 * 这段代码导出了一个名为 `flushPostFlushCbs` 的函数，用于刷新后置刷新回调函数。

`flushPostFlushCbs` 函数可能用于执行后置刷新回调函数的操作，包括处理重复项、排序和逐个执行。

函数的具体逻辑如下：
1. 如果存在挂起的后置刷新回调函数（`pendingPostFlushCbs.length` 大于0），则继续执行刷新操作；否则，直接返回。
2. 使用 `new Set(pendingPostFlushCbs)` 创建一个新的 Set 对象 `deduped`，用于去重。
3. 将 `pendingPostFlushCbs.length` 设置为0，清空原始的挂起后置刷新回调函数数组。
4. 检查是否已存在活动的后置刷新回调函数队列（`activePostFlushCbs`）。
   - 如果已存在活动的后置刷新回调函数队列，则将去重后的回调函数数组 `deduped` 添加到队列中，并直接返回。
5. 将去重后的回调函数数组 `deduped` 赋值给 `activePostFlushCbs`，表示当前为活动的后置刷新回调函数队列。
6. 如果处于开发环境 (`__DEV__` 为真)，则在初始调用时创建一个计数映射表 `seen`，用于检测递归更新。
7. 将 `activePostFlushCbs` 数组按照回调函数的 ID 进行排序，以确保执行顺序的稳定性。
8. 循环遍历 `activePostFlushCbs` 数组，从索引 `0` 开始，直到数组的末尾。
   - 如果处于开发环境，并且通过 `checkRecursiveUpdates` 检测到递归更新，则跳过当前回调函数。
   - 调用 `activePostFlushCbs[postFlushIndex]()` 执行后置刷新操作。
9. 执行完所有后置刷新回调函数后，将 `activePostFlushCbs` 设置为 `null`，表示活动的后置刷新回调函数队列已清空。
10. 将 `postFlushIndex` 设置为 `0`，以备下次执行时从头开始遍历。

通过调用 `flushPostFlushCbs` 函数，可以触发队列中的后置刷新回调函数，并执行相应的操作。

请注意，这段代码只是函数的声明和实现，并没有提供关于如何调用和使用 `flushPostFlushCbs` 函数的具体上下文。具体的调用方式和相关逻辑需要在代码的其他部分进行进一步的查看和分析。
 */
export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)]
    pendingPostFlushCbs.length = 0

    // #1947 already has active queue, nested flushPostFlushCbs call
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped)
      return
    }

    activePostFlushCbs = deduped
    if (__DEV__) {
      seen = seen || new Map()
    }

    activePostFlushCbs.sort((a, b) => getId(a) - getId(b))

    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      if (
        __DEV__ &&
        checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
      ) {
        continue
      }
      activePostFlushCbs[postFlushIndex]()
    }
    activePostFlushCbs = null
    postFlushIndex = 0
  }
}
/**
 * 
 * @param job 
 * @returns 
 * 这段代码定义了一个名为 `getId` 的函数，该函数用于获取作业（`SchedulerJob`）的 ID。

函数的具体逻辑如下：
1. 接收一个作业对象 `job` 作为参数。
2. 检查作业对象的 `id` 属性是否为 `null`。
   - 如果 `id` 属性为 `null`，则返回无穷大（Infinity）作为作业的 ID。
   - 如果 `id` 属性不为 `null`，则返回 `id` 属性的值作为作业的 ID。

通过调用 `getId` 函数，并传入作业对象作为参数，可以获取作业的 ID。
 */
const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id
/**
 * 
 * @param a 
 * @param b 
 * @returns 
 * 这段代码定义了一个名为 `comparator` 的函数，用于比较两个作业对象的优先级。

函数的具体逻辑如下：
1. 接收两个作业对象 `a` 和 `b` 作为参数。
2. 通过调用 `getId` 函数获取作业对象的 ID，并计算它们的差值 `diff`。
3. 如果 `diff` 的值为 0，表示两个作业的 ID 相等，需要进一步比较它们的预刷新属性。
   - 如果作业 `a` 的 `pre` 属性为真而作业 `b` 的 `pre` 属性为假，则作业 `a` 的优先级更高，返回 -1。
   - 如果作业 `b` 的 `pre` 属性为真而作业 `a` 的 `pre` 属性为假，则作业 `b` 的优先级更高，返回 1。
4. 如果两个作业的 ID 不相等，则直接返回它们的差值 `diff` 作为优先级比较结果。

通过调用 `comparator` 函数，并传入两个作业对象作为参数，可以进行作业的优先级比较。

 */
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {
    if (a.pre && !b.pre) return -1
    if (b.pre && !a.pre) return 1
  }
  return diff
}
/**
 * 
 * @param seen 
 * 这段代码定义了一个名为 `flushJobs` 的函数，用于执行作业队列中的作业。

函数的具体逻辑如下：
1. 将 `isFlushPending` 设置为 `false`，表示当前不再处于刷新挂起状态。
2. 将 `isFlushing` 设置为 `true`，表示当前正在进行刷新作业。
3. 如果处于开发环境（`__DEV__` 为真），则创建一个空的 `Map` 对象 `seen` 用于跟踪递归更新。
4. 对作业队列 `queue` 进行排序，使用 `comparator` 函数进行比较，以确保按优先级顺序执行作业。
5. 根据是否处于开发环境，确定是否需要执行 `checkRecursiveUpdates` 函数进行递归更新的检查。
6. 开始遍历作业队列 `queue`，从索引 0 开始到队列的长度。
   - 获取当前作业 `job`。
   - 如果作业存在且其 `active` 属性不等于 `false`，则执行作业。
     - 如果处于开发环境并且需要进行递归更新的检查，执行 `check` 函数进行检查。
     - 使用 `callWithErrorHandling` 函数调用作业，并传入 `null` 作为上下文和错误代码 `ErrorCodes.SCHEDULER`。
7. 最后，在 `finally` 块中进行清理和后续处理：
   - 将 `flushIndex` 重置为 0。
   - 清空作业队列 `queue`。
   - 执行 `flushPostFlushCbs` 函数来处理后置刷新回调。
   - 将 `isFlushing` 设置为 `false`，表示刷新作业结束。
   - 将 `currentFlushPromise` 设置为 `null`。
   - 如果作业队列 `queue` 或待处理的后置刷新回调 `pendingPostFlushCbs` 不为空，则继续进行刷新作业的递归调用。

通过调用 `flushJobs` 函数，可以触发作业队列的刷新过程，依次执行队列中的作业。
 */
function flushJobs(seen?: CountMap) {
  isFlushPending = false
  isFlushing = true
  if (__DEV__) {
    seen = seen || new Map()
  }

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child so its render effect will have smaller
  //    priority number)
  // 2. If a component is unmounted during a parent component's update,
  //    its update can be skipped.
  queue.sort(comparator)

  // conditional usage of checkRecursiveUpdate must be determined out of
  // try ... catch block since Rollup by default de-optimizes treeshaking
  // inside try-catch. This can leave all warning code unshaked. Although
  // they would get eventually shaken by a minifier like terser, some minifiers
  // would fail to do that (e.g. https://github.com/evanw/esbuild/issues/1610)
  const check = __DEV__
    ? (job: SchedulerJob) => checkRecursiveUpdates(seen!, job)
    : NOOP

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        if (__DEV__ && check(job)) {
          continue
        }
        // console.log(`running:`, job.id)
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    flushIndex = 0
    queue.length = 0

    flushPostFlushCbs(seen)

    isFlushing = false
    currentFlushPromise = null
    // some postFlushCb queued jobs!
    // keep flushing until it drains.
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
/**
 * 
 * @param seen 
 * @param fn 
 * @returns 
 * 这段代码定义了一个名为 `checkRecursiveUpdates` 的函数，用于检查递归更新的次数是否超过限制。

函数的具体逻辑如下：
1. 如果 `seen`（一个 `CountMap` 类型的对象）中不存在当前作业 `fn` 的记录，将其添加到 `seen` 中，并将计数器设置为 1。
2. 否则，如果 `seen` 中已存在当前作业 `fn` 的记录，获取当前计数器的值。
   - 如果计数器的值超过了 `RECURSION_LIMIT`（递归限制的最大次数），则表示发生了递归更新。
     - 获取作业的 `ownerInstance`，即拥有该作业的组件实例。
     - 获取组件名称，如果存在组件实例，则通过 `getComponentName` 函数获取组件的名称。
     - 发出警告，指示递归更新超过了最大次数，并提供可能引发递归更新的源信息。
     - 返回 `true`，表示发生了递归更新。
   - 否则，将计数器的值加 1，并更新 `seen` 中的记录。

通过调用 `checkRecursiveUpdates` 函数，可以检查特定作业的递归更新次数是否超过了限制。如果超过了限制，则发出警告，并返回 `true` 表示发生了递归更新。
 */
function checkRecursiveUpdates(seen: CountMap, fn: SchedulerJob) {
  if (!seen.has(fn)) {
    seen.set(fn, 1)
  } else {
    const count = seen.get(fn)!
    if (count > RECURSION_LIMIT) {
      const instance = fn.ownerInstance
      const componentName = instance && getComponentName(instance.type)
      warn(
        `Maximum recursive updates exceeded${
          componentName ? ` in component <${componentName}>` : ``
        }. ` +
          `This means you have a reactive effect that is mutating its own ` +
          `dependencies and thus recursively triggering itself. Possible sources ` +
          `include component template, render function, updated hook or ` +
          `watcher source function.`
      )
      return true
    } else {
      seen.set(fn, count + 1)
    }
  }
}
