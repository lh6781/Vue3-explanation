import { Dep } from './dep'
import { ReactiveEffect } from './effect'
import { ComputedGetter, ComputedRef } from './computed'
import { ReactiveFlags, toRaw } from './reactive'
import { trackRefValue, triggerRefValue } from './ref'
/**
 * 这段代码创建了一个立即可用的 Promise 实例 tick，它被用作下一个微任务的触发器。通过使用 Promise.resolve()，tick 变成了一个已完成状态的 Promise，这意味着它的 then 方法会立即被调用，并且对应的回调函数会在当前微任务队列的末尾被执行。

这样，当需要在当前微任务队列执行完毕后执行某个操作时，可以通过在 tick 的 then 方法中注册回调函数来实现。这种方式可以确保回调函数在下一个微任务中被执行，而不是立即执行。

需要注意的是，tick 只是一个命名约定，并没有特殊的语义或功能。它的作用是提供一个易于理解和使用的方式来表示在当前微任务队列执行完毕后执行某个操作。
 */
const tick = /*#__PURE__*/ Promise.resolve()
const queue: any[] = []
let queued = false
/**
 * 
 * @param fn 
 * 这段代码定义了一个 scheduler 函数，它接受一个函数 fn 作为参数，并将该函数添加到一个队列 queue 中。然后，它检查是否已经有任务被排队执行，如果没有，则将 queued 标志设置为 true，并使用 tick.then(flush) 来触发下一个微任务。

这样做的目的是延迟执行添加到队列中的函数，并确保它们在下一个微任务中被调用。通过将函数添加到队列中，可以按照添加的顺序依次执行这些函数，避免并发执行导致的竞态条件。

整个过程可以总结为以下步骤：

将函数 fn 添加到队列 queue 中。
检查是否已经有任务被排队执行，如果没有，则将 queued 标志设置为 true。
使用 tick.then(flush) 触发下一个微任务，以确保在当前微任务队列执行完毕后执行队列中的函数。
这样就实现了一个简单的调度器，可以将需要延迟执行的任务添加到队列中，并在适当的时机执行它们。
 */
const scheduler = (fn: any) => {
  queue.push(fn)
  if (!queued) {
    queued = true
    tick.then(flush)
  }
}
/**
 * 这段代码定义了 flush 函数，它的作用是执行队列中的函数，并在执行完毕后清空队列。

具体的执行步骤如下：

使用 for 循环遍历队列中的每个函数，并依次执行它们。
执行完所有函数后，将队列长度 queue.length 设置为 0，即清空队列。
将 queued 标志设置为 false，表示当前没有任务排队执行。
通过调用 flush 函数，可以触发队列中的函数按照添加的顺序执行，并在执行完毕后清空队列。这样可以保证函数的顺序性和一致性，避免并发执行导致的竞态条件。
 */
const flush = () => {
  for (let i = 0; i < queue.length; i++) {
    queue[i]()
  }
  queue.length = 0
  queued = false
}
/**
 * 这是一个 DeferredComputedRefImpl 类的定义，它是一个延迟计算的计算属性实现。

该类具有以下主要特点：

通过传入的 getter 函数创建了一个 ReactiveEffect 实例，用于实现计算属性的响应式依赖追踪和计算逻辑。
通过 _value 属性存储计算属性的计算结果，初始值为 undefined。
通过 _dirty 属性表示计算属性的值是否为脏值，初始值为 true。
通过 _get 方法实现对计算属性值的获取，如果计算属性的值为脏值，则执行计算逻辑并更新 _value 属性。
通过 value 访问器属性获取计算属性的值，同时进行依赖追踪，并通过 toRaw 函数获取原始的 DeferredComputedRefImpl 对象，调用其 _get 方法获取最新的计算结果。
该类的实例用于表示延迟计算的计算属性，它的计算逻辑将在第一次访问 value 属性时触发，并在依赖项发生变化时重新计算。与普通的计算属性不同，该延迟计算的计算属性会等待主任务队列执行完毕后再进行计算，以避免同步触发多次计算，提高性能。
 */
class DeferredComputedRefImpl<T> {
  public dep?: Dep = undefined

  private _value!: T
  private _dirty = true
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY] = true

  constructor(getter: ComputedGetter<T>) {
    let compareTarget: any
    let hasCompareTarget = false
    let scheduled = false
    this.effect = new ReactiveEffect(getter, (computedTrigger?: boolean) => {
      if (this.dep) {
        if (computedTrigger) {
          compareTarget = this._value
          hasCompareTarget = true
        } else if (!scheduled) {
          const valueToCompare = hasCompareTarget ? compareTarget : this._value
          scheduled = true
          hasCompareTarget = false
          scheduler(() => {
            if (this.effect.active && this._get() !== valueToCompare) {
              triggerRefValue(this)
            }
            scheduled = false
          })
        }
        // chained upstream computeds are notified synchronously to ensure
        // value invalidation in case of sync access; normal effects are
        // deferred to be triggered in scheduler.
        for (const e of this.dep) {
          if (e.computed instanceof DeferredComputedRefImpl) {
            e.scheduler!(true /* computedTrigger */)
          }
        }
      }
      this._dirty = true
    })
    this.effect.computed = this as any
  }

  private _get() {
    if (this._dirty) {
      this._dirty = false
      return (this._value = this.effect.run()!)
    }
    return this._value
  }

  get value() {
    trackRefValue(this)
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    return toRaw(this)._get()
  }
}
/**
 * 
 * @param getter 
 * 这是一个名为 deferredComputed 的函数，用于创建一个延迟计算的计算属性。

该函数接受一个 getter 函数作为参数，该函数用于计算计算属性的值。它返回一个 ComputedRef<T> 类型的对象，表示延迟计算的计算属性。

在函数内部，它通过实例化 DeferredComputedRefImpl 类并传入 getter 函数来创建延迟计算的计算属性对象。然后将其转换为 any 类型返回。

这样，通过调用 deferredComputed 函数并传入相应的 getter 函数，即可创建一个延迟计算的计算属性，并使用返回的 ComputedRef<T> 对象访问计算属性的值。
 */
export function deferredComputed<T>(getter: () => T): ComputedRef<T> {
  return new DeferredComputedRefImpl(getter) as any
}
