import {
  isRef,
  isShallow,
  Ref,
  ComputedRef,
  ReactiveEffect,
  isReactive,
  ReactiveFlags,
  EffectScheduler,
  DebuggerOptions,
  getCurrentScope
} from '@vue/reactivity'
import { SchedulerJob, queueJob } from './scheduler'
import {
  EMPTY_OBJ,
  isObject,
  isArray,
  isFunction,
  isString,
  hasChanged,
  NOOP,
  remove,
  isMap,
  isSet,
  isPlainObject,
  extend
} from '@vue/shared'
import {
  currentInstance,
  ComponentInternalInstance,
  isInSSRComponentSetup,
  setCurrentInstance,
  unsetCurrentInstance
} from './component'
import {
  ErrorCodes,
  callWithErrorHandling,
  callWithAsyncErrorHandling
} from './errorHandling'
import { queuePostRenderEffect } from './renderer'
import { warn } from './warning'
import { DeprecationTypes } from './compat/compatConfig'
import { checkCompatEnabled, isCompatEnabled } from './compat/compatConfig'
import { ObjectWatchOptionItem } from './componentOptions'
import { useSSRContext } from '@vue/runtime-core'
/**
 * `WatchEffect` 是一个类型别名，表示一个函数类型。它接受一个参数 `onCleanup`，该参数是一个回调函数类型 `OnCleanup`。

函数类型 `WatchEffect` 表示一个可被观察的副作用函数。当依赖的数据发生变化时，副作用函数将被执行。该函数不接受参数，但可以在函数内部访问响应式数据和其他上下文。

参数 `onCleanup` 是一个回调函数，用于在副作用函数被停止观察时执行清理操作。清理操作可以包括取消订阅、关闭资源等。

使用 `WatchEffect` 类型可以约束函数类型，以确保其符合 Vue 3 的副作用函数的要求。
 */
export type WatchEffect = (onCleanup: OnCleanup) => void
/**
 * `WatchSource` 是一个类型别名，表示一个观察源的类型。它可以是以下三种类型之一：

1. `Ref<T>`：表示一个响应式引用，可以是任意类型 `T` 的值。
2. `ComputedRef<T>`：表示一个计算属性引用，可以是任意类型 `T` 的值。
3. `() => T`：表示一个函数，该函数返回类型为 `T` 的值。

这些类型都可以作为观察源，用于在 Vue 3 的 `watch` 函数中监听数据的变化。当观察源发生变化时，相应的回调函数将被执行。
 */
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T)
/**
 * `WatchCallback` 是一个类型别名，表示一个观察回调函数的类型。它接受两个泛型参数：

1. `V`：表示当前值（value）的类型。
2. `OV`：表示旧值（oldValue）的类型。

该回调函数接收三个参数：

1. `value`：表示观察源的当前值。
2. `oldValue`：表示观察源的旧值。
3. `onCleanup`：一个清理函数，用于在回调函数执行完成后执行清理操作。

观察回调函数可以根据当前值和旧值进行相应的逻辑处理，并且可以在需要时执行清理操作。它可以在 Vue 3 的 `watch` 函数中使用，用于响应数据的变化。
 */
export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup
) => any
/**
 * `MapSources` 是一个类型别名，用于映射观察源的类型。它接受两个泛型参数：

1. `T`：表示观察源的对象类型。
2. `Immediate`：表示是否立即执行观察的标志。

该类型别名通过遍历 `T` 的属性，将每个观察源的类型进行映射，并返回一个新的对象类型。对于每个属性 `K`：

- 如果 `T[K]` 是 `WatchSource<V>` 类型，则将 `V` 映射为对应的值类型。如果 `Immediate` 是 `true`，则返回 `V | undefined` 类型，否则返回 `V` 类型。
- 如果 `T[K]` 是对象类型，则保持不变。如果 `Immediate` 是 `true`，则返回 `T[K] | undefined` 类型，否则返回 `T[K]` 类型。
- 如果 `T[K]` 是其他类型，则将其映射为 `never` 类型。

这个类型别名可以用于在 `watch` 函数中处理观察源的类型映射，根据 `Immediate` 标志来确定是否包含未定义的值。
 */
type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true
      ? V | undefined
      : V
    : T[K] extends object
    ? Immediate extends true
      ? T[K] | undefined
      : T[K]
    : never
}
/**
 * `OnCleanup` 是一个类型别名，表示清理函数的类型。它接受一个参数 `cleanupFn`，该参数是一个无参函数类型，用于执行清理操作。

`OnCleanup` 类型别名定义了一个函数类型，该函数接受一个 `cleanupFn` 参数，并返回 `void`。在函数体内部，可以使用 `cleanupFn` 执行清理操作，例如取消订阅、解绑事件等。

在实际使用中，通常会将清理函数作为参数传递给 `OnCleanup` 类型的函数，以便在需要时执行相应的清理操作。
 */
type OnCleanup = (cleanupFn: () => void) => void
/**
 * `WatchOptionsBase` 是一个接口，定义了用于监视器选项的基本属性。

属性包括：

- `flush`：用于控制监视器回调的触发时机。它可以取以下值之一：
  - `'pre'`：在依赖更新之前立即触发回调。
  - `'post'`：在依赖更新之后立即触发回调。
  - `'sync'`：在同一事件循环中触发回调，且在组件更新之前。
- 继承自 `DebuggerOptions`：包含调试器选项，用于设置监视器的调试行为。

通过指定这些选项，可以对监视器的触发时机和调试行为进行定制。
 */
export interface WatchOptionsBase extends DebuggerOptions {
  flush?: 'pre' | 'post' | 'sync'
}
/**
 * `WatchOptions` 是一个泛型接口，继承自 `WatchOptionsBase`，用于定义监视器的选项。

属性包括：

- `immediate`：一个布尔值，用于指定监视器是否在初始值被设置后立即执行回调函数。默认值为 `false`。
- `deep`：一个布尔值，用于指定监视器是否深度观察被监视属性的变化。当被监视的属性是一个对象或数组时，设置为 `true` 可以触发深度观察。默认值为 `false`。
- 继承自 `WatchOptionsBase`：包含基本的监视器选项，如 `flush`。

通过指定这些选项，可以对监视器的行为进行更细粒度的控制，如是否立即执行回调、是否进行深度观察等。
 */
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate
  deep?: boolean
}
/**
 * `WatchStopHandle` 是一个函数类型，用于停止或取消监视器的执行。

当创建一个监视器时，监视器函数会返回一个 `WatchStopHandle` 类型的值，通过调用该函数，可以停止监视器的执行。这在某些情况下是很有用的，例如当组件被销毁或不再需要监视器时，可以调用 `WatchStopHandle` 来取消监视器的执行，以避免不必要的计算和资源消耗。

调用 `WatchStopHandle` 函数将会停止与该监视器相关的所有操作，并且不再调用监视器的回调函数。
 */
export type WatchStopHandle = () => void

// Simple effect.
/**
 * 
 * @param effect 
 * @param options 
 * @returns 
 * `watchEffect` 是一个函数，用于创建一个仅关注副作用的监视器。

它接收两个参数：
- `effect`：一个回调函数，表示监视器的副作用。该回调函数会在监视器的依赖项发生变化时被触发执行。
- `options`：一个可选的配置对象，用于指定监视器的选项，如刷新策略和调试选项。

`watchEffect` 函数会返回一个 `WatchStopHandle` 类型的值，通过调用该函数，可以停止监视器的执行。

注意，`watchEffect` 监视器仅关注副作用的执行，而不会跟踪具体的依赖项。因此，如果你需要精确地追踪依赖项的变化并执行相应的回调函数，可以考虑使用 `watch` 函数。

以下是 `watchEffect` 函数的示例用法:

```javascript
import { watchEffect } from 'vue'

watchEffect(() => {
  // 副作用逻辑
  console.log('副作用触发')
})
```

在上面的示例中，当监视器的依赖项发生变化时，副作用逻辑将被触发执行，并输出 `'副作用触发'`。
 */
export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase
): WatchStopHandle {
  return doWatch(effect, null, options)
}
/**
 * 
 * @param effect 
 * @param options 
 * @returns 
 * `watchPostEffect` 是一个函数，用于创建一个在更新周期结束后执行的监视器副作用。

它接收两个参数：
- `effect`：一个回调函数，表示监视器的副作用。该回调函数会在更新周期结束后被触发执行。
- `options`：一个可选的配置对象，用于指定监视器的选项，如调试选项。

`watchPostEffect` 函数会返回一个 `WatchStopHandle` 类型的值，通过调用该函数，可以停止监视器的执行。

与 `watchEffect` 不同，`watchPostEffect` 会在更新周期结束后执行副作用逻辑，确保在所有的组件更新都已完成之后再执行。这在某些场景下很有用，例如在依赖于 DOM 更新后的操作或动画效果。

以下是 `watchPostEffect` 函数的示例用法:

```javascript
import { watchPostEffect } from 'vue'

watchPostEffect(() => {
  // 副作用逻辑
  console.log('副作用触发（在更新周期结束后）')
})
```

在上面的示例中，当更新周期结束后，副作用逻辑将被触发执行，并输出 `'副作用触发（在更新周期结束后）'`。
 */
export function watchPostEffect(
  effect: WatchEffect,
  options?: DebuggerOptions
) {
  return doWatch(
    effect,
    null,
    __DEV__ ? extend({}, options as any, { flush: 'post' }) : { flush: 'post' }
  )
}
/**
 * 
 * @param effect 
 * @param options 
 * @returns 
 * `watchSyncEffect` 是一个函数，用于创建一个同步执行的监视器副作用。

它接收两个参数：
- `effect`：一个回调函数，表示监视器的副作用。该回调函数会在组件更新时同步执行。
- `options`：一个可选的配置对象，用于指定监视器的选项，如调试选项。

`watchSyncEffect` 函数会返回一个 `WatchStopHandle` 类型的值，通过调用该函数，可以停止监视器的执行。

与 `watchEffect` 和 `watchPostEffect` 不同，`watchSyncEffect` 会在组件更新时立即同步执行副作用逻辑，而不会等待更新周期结束。这在需要在组件更新时立即执行某些操作的情况下非常有用，例如直接操作 DOM 元素。

以下是 `watchSyncEffect` 函数的示例用法:

```javascript
import { watchSyncEffect } from 'vue'

watchSyncEffect(() => {
  // 副作用逻辑
  console.log('副作用触发（同步执行）')
})
```

在上面的示例中，每当组件更新时，副作用逻辑都会立即触发执行，并输出 `'副作用触发（同步执行）'`。
 */
export function watchSyncEffect(
  effect: WatchEffect,
  options?: DebuggerOptions
) {
  return doWatch(
    effect,
    null,
    __DEV__ ? extend({}, options as any, { flush: 'sync' }) : { flush: 'sync' }
  )
}

// initial value for watchers to trigger on undefined initial values
/**
 * `INITIAL_WATCHER_VALUE` 是一个常量，它表示监视器的初始值。

在 Vue 的响应式系统中，当创建一个监视器时，初始值会被设置为 `INITIAL_WATCHER_VALUE`。这个初始值在监视器的初始化阶段被用作占位符，并在实际的依赖追踪开始之前进行判断。

请注意，`INITIAL_WATCHER_VALUE` 只是一个占位符，并没有特定的含义或值。它的作用是用于初始状态的标识，以便在实际的依赖追踪开始之前进行区分。

在实际的监视器实现中，`INITIAL_WATCHER_VALUE` 可以是任何适合作为初始值的值。在不同的响应式系统中可能有不同的实现方式。
 */
const INITIAL_WATCHER_VALUE = {}
/**
 * `MultiWatchSources` 是一个类型别名，用于表示多个监视源的集合。

它是一个由 `WatchSource<unknown>` 或 `object` 类型的数组组成的类型。每个监视源可以是一个引用（`Ref`）、计算属性引用（`ComputedRef`）或返回值为特定类型的函数。

这个类型别名的作用是方便在编程中声明和使用多个监视源。通过将多个监视源放入数组中，可以同时监视它们的变化，并在回调函数中获取它们的新值和旧值。

以下是一个示例使用 `MultiWatchSources` 的情况：

```typescript
import { watch } from 'vue'

const refValue = ref(0)
const computedValue = computed(() => refValue.value + 1)
const objValue = reactive({ name: 'John', age: 25 })

watch(
  [refValue, computedValue, objValue],
  ([newRefValue, newComputedValue, newObjValue], [oldRefValue, oldComputedValue, oldObjValue]) => {
    console.log('New ref value:', newRefValue)
    console.log('New computed value:', newComputedValue)
    console.log('New obj value:', newObjValue)
    console.log('Old ref value:', oldRefValue)
    console.log('Old computed value:', oldComputedValue)
    console.log('Old obj value:', oldObjValue)
  }
)
```

在上面的示例中，我们监视了 `refValue`、`computedValue` 和 `objValue` 的变化。当其中任何一个值发生变化时，回调函数就会被触发，并且我们可以在回调函数中访问到新值和旧值。

注意，`MultiWatchSources` 可以包含任意数量的监视源，从而实现对多个数据源的同时监视。
 */
type MultiWatchSources = (WatchSource<unknown> | object)[]

// overload: array of multiple sources + cb
/**
 * 
 * @param sources 
 * @param cb 
 * @param options 
 * `watch` 函数是 Vue 3 中用于监视数据变化并执行回调函数的函数。它有多个重载形式，可以根据不同的使用情况进行调用。

以下是 `watch` 函数的各个重载形式及其作用：

1. `watch(sources: [...T], cb, options?)`: 用于同时监视多个源的变化。`sources` 参数是一个由多个监视源组成的数组，每个监视源可以是引用（`Ref`）、计算属性引用（`ComputedRef`）或返回值为特定类型的函数。`cb` 是一个回调函数，用于处理源的变化。`options` 是可选的选项对象。
2. `watch(source: T, cb, options?)`: 用于监视单个源的变化。`source` 参数可以是单个监视源，例如引用、计算属性引用或普通对象。`cb` 是一个回调函数，用于处理源的变化。`options` 是可选的选项对象。
3. `watch(source: WatchSource<T>, cb, options?)`: 用于监视单个源的变化。`source` 参数是一个监视源，例如引用、计算属性引用或返回值为特定类型的函数。`cb` 是一个回调函数，用于处理源的变化。`options` 是可选的选项对象。
4. `watch(source: T, cb, options?)`: 用于监视单个响应式对象的变化。`source` 参数是一个响应式对象，例如由 `reactive` 创建的对象。`cb` 是一个回调函数，用于处理源的变化。`options` 是可选的选项对象。

在以上重载形式中，`cb` 回调函数接收两个参数：`value` 和 `oldValue`。`value` 是源的新值，`oldValue` 是源的旧值。`options` 对象可以用于配置监视行为，例如设置初始时是否立即执行回调函数、是否进行深度监视等。

`watch` 函数返回一个 `WatchStopHandle`，用于停止监视并取消回调函数的执行。

注意，在实际使用时，根据传递的参数类型，编译器会自动推断出适合的重载形式进行调用。
 */
export function watch<
  T extends MultiWatchSources,
  Immediate extends Readonly<boolean> = false
>(
  sources: [...T],
  cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// overload: multiple sources w/ `as const`
// watch([foo, bar] as const, () => {})
// somehow [...T] breaks when the type is readonly
export function watch<
  T extends Readonly<MultiWatchSources>,
  Immediate extends Readonly<boolean> = false
>(
  source: T,
  cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// overload: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// overload: watching reactive object w/ cb
export function watch<
  T extends object,
  Immediate extends Readonly<boolean> = false
>(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchOptions<Immediate>
): WatchStopHandle

// implementation
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>
): WatchStopHandle {
  if (__DEV__ && !isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
        `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
        `supports \`watch(source, cb, options?) signature.`
    )
  }
  return doWatch(source as any, cb, options)
}
/**
 * 
 * @param source 
 * @param cb 
 * @param param2 
 * @returns 
 * `doWatch` 函数是 `watch` 函数的内部实现函数，用于创建和管理监视器。

它接收以下参数：

- `source`：监视源，可以是单个监视源、监视源数组、监视效果函数或普通对象。
- `cb`：回调函数，在监视源变化时执行。
- `immediate`：一个布尔值，表示是否在初始时立即执行回调函数。
- `deep`：一个布尔值，表示是否进行深度监视。
- `flush`：一个字符串，表示刷新时机，可以是 `'pre'`、`'post'` 或 `'sync'`。
- `onTrack`：追踪函数，用于在追踪依赖时执行。
- `onTrigger`：触发函数，用于在触发依赖时执行。

首先，函数会根据传入的参数进行一些校验和准备工作。然后，根据监视源的类型，设置不同的 `getter` 函数和一些标志变量。

接下来，函数会根据不同的情况对 `getter` 函数进行处理，以适应不同的监视源类型。如果监视源是引用类型（`Ref`），则将 `getter` 函数设置为返回引用的值，并根据浅层监视设置 `forceTrigger` 标志。如果监视源是响应式对象，则将 `getter` 函数设置为返回响应式对象本身，并将 `deep` 标志设置为 `true`。如果监视源是数组，则将 `isMultiSource` 标志设置为 `true`，并根据数组中的每个元素设置相应的 `getter` 函数。如果监视源是函数，则将 `getter` 函数设置为该函数的调用结果。

在处理完监视源后，函数会创建一个 `cleanup` 函数和一个 `onCleanup` 函数。`cleanup` 函数用于在监视器停止时执行清理操作，`onCleanup` 函数用于注册清理函数。如果是服务端渲染（SSR）环境，`ssrCleanup` 数组会被用于存储 `cleanup` 函数。

接下来，函数定义了一个 `job` 函数，该函数会在监视源变化时执行。如果存在回调函数 `cb`，则执行回调函数，并根据不同的情况判断是否需要触发回调函数。如果不存在回调函数，则执行监视效果函数。

根据传入的 `flush` 参数，选择不同的调度器函数。如果 `flush` 是 `'sync'`，则直接调用 `job` 函数；如果 `flush` 是 `'post'`，则使用 `queuePostRenderEffect` 函数进行调度；否则，默认为 `'pre'`，将 `job` 函数添加到任务队列中。

在创建完调度器函数后，创建一个 `ReactiveEffect` 实例，并根据需要设置 `onTrack` 和 `onTrigger` 函数。

最后，执行初始运行阶段。如果存在回调函数 `cb`，
 */
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {
  if (__DEV__ && !cb) {
    if (immediate !== undefined) {
      warn(
        `watch() "immediate" option is only respected when using the ` +
          `watch(source, callback, options?) signature.`
      )
    }
    if (deep !== undefined) {
      warn(
        `watch() "deep" option is only respected when using the ` +
          `watch(source, callback, options?) signature.`
      )
    }
  }

  const warnInvalidSource = (s: unknown) => {
    warn(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, ` +
        `a reactive object, or an array of these types.`
    )
  }

  const instance =
    getCurrentScope() === currentInstance?.scope ? currentInstance : null
  // const instance = currentInstance
  let getter: () => any
  let forceTrigger = false
  let isMultiSource = false

  if (isRef(source)) {
    getter = () => source.value
    forceTrigger = isShallow(source)
  } else if (isReactive(source)) {
    getter = () => source
    deep = true
  } else if (isArray(source)) {
    isMultiSource = true
    forceTrigger = source.some(s => isReactive(s) || isShallow(s))
    getter = () =>
      source.map(s => {
        if (isRef(s)) {
          return s.value
        } else if (isReactive(s)) {
          return traverse(s)
        } else if (isFunction(s)) {
          return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER)
        } else {
          __DEV__ && warnInvalidSource(s)
        }
      })
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = () =>
        callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
    } else {
      // no cb -> simple effect
      getter = () => {
        if (instance && instance.isUnmounted) {
          return
        }
        if (cleanup) {
          cleanup()
        }
        return callWithAsyncErrorHandling(
          source,
          instance,
          ErrorCodes.WATCH_CALLBACK,
          [onCleanup]
        )
      }
    }
  } else {
    getter = NOOP
    __DEV__ && warnInvalidSource(source)
  }

  // 2.x array mutation watch compat
  if (__COMPAT__ && cb && !deep) {
    const baseGetter = getter
    getter = () => {
      const val = baseGetter()
      if (
        isArray(val) &&
        checkCompatEnabled(DeprecationTypes.WATCH_ARRAY, instance)
      ) {
        traverse(val)
      }
      return val
    }
  }

  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let cleanup: () => void
  let onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {
      callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
    }
  }

  // in SSR there is no need to setup an actual effect, and it should be noop
  // unless it's eager or sync flush
  let ssrCleanup: (() => void)[] | undefined
  if (__SSR__ && isInSSRComponentSetup) {
    // we will also not call the invalidate callback (+ runner is not set up)
    onCleanup = NOOP
    if (!cb) {
      getter()
    } else if (immediate) {
      callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
        getter(),
        isMultiSource ? [] : undefined,
        onCleanup
      ])
    }
    if (flush === 'sync') {
      const ctx = useSSRContext()!
      ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = [])
    } else {
      return NOOP
    }
  }

  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE
  const job: SchedulerJob = () => {
    if (!effect.active) {
      return
    }
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run()
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) => hasChanged(v, oldValue[i]))
          : hasChanged(newValue, oldValue)) ||
        (__COMPAT__ &&
          isArray(newValue) &&
          isCompatEnabled(DeprecationTypes.WATCH_ARRAY, instance))
      ) {
        // cleanup before running cb again
        if (cleanup) {
          cleanup()
        }
        callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
          newValue,
          // pass undefined as the old value when it's changed for the first time
          oldValue === INITIAL_WATCHER_VALUE
            ? undefined
            : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
            ? []
            : oldValue,
          onCleanup
        ])
        oldValue = newValue
      }
    } else {
      // watchEffect
      effect.run()
    }
  }

  // important: mark the job as a watcher callback so that scheduler knows
  // it is allowed to self-trigger (#1727)
  job.allowRecurse = !!cb

  let scheduler: EffectScheduler
  if (flush === 'sync') {
    scheduler = job as any // the scheduler function gets called directly
  } else if (flush === 'post') {
    scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
  } else {
    // default: 'pre'
    job.pre = true
    if (instance) job.id = instance.uid
    scheduler = () => queueJob(job)
  }

  const effect = new ReactiveEffect(getter, scheduler)

  if (__DEV__) {
    effect.onTrack = onTrack
    effect.onTrigger = onTrigger
  }

  // initial run
  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else if (flush === 'post') {
    queuePostRenderEffect(
      effect.run.bind(effect),
      instance && instance.suspense
    )
  } else {
    effect.run()
  }

  const unwatch = () => {
    effect.stop()
    if (instance && instance.scope) {
      remove(instance.scope.effects!, effect)
    }
  }

  if (__SSR__ && ssrCleanup) ssrCleanup.push(unwatch)
  return unwatch
}

// this.$watch
/**
 * 
 * @param this 
 * @param source 
 * @param value 
 * @param options 
 * @returns 
 * `instanceWatch` 函数是组件实例的方法，用于创建和管理组件实例的观察者（watcher）。

它接受以下参数：

- `source`：观察者的来源，可以是字符串或函数。
- `value`：回调函数或选项对象。
- `options`：观察者的选项。

该函数首先获取组件实例的 `proxy` 对象，并根据 `source` 的类型创建相应的 `getter` 函数。如果 `source` 是一个字符串并且包含点号（`.`），则使用 `createPathGetter` 创建一个用于访问嵌套属性的 `getter` 函数；否则，创建一个简单的 `getter` 函数来获取 `publicThis[source]` 的值。如果 `source` 是一个函数，则将其绑定到 `publicThis` 对象。

接下来，根据 `value` 的类型来确定回调函数 `cb` 和选项 `options`。

如果 `value` 是一个函数，将其赋值给 `cb` 变量。否则，假设 `value` 是一个选项对象，将对象中的 `handler` 属性作为回调函数，并将整个对象作为选项。

在设置观察者之前，函数会保存当前的组件实例 `cur`，然后将当前实例设置为当前执行的实例。接着调用 `doWatch` 函数来创建观察者，并传递 `getter`、`cb` 和 `options`。

在设置观察者完成后，会恢复之前保存的当前实例，并返回观察者的句柄 `res`。

总体而言，`instanceWatch` 函数用于在组件实例中创建和管理观察者，并提供了便捷的方式来监视数据的变化并执行相应的回调函数。
 */
export function instanceWatch(
  this: ComponentInternalInstance,
  source: string | Function,
  value: WatchCallback | ObjectWatchOptionItem,
  options?: WatchOptions
): WatchStopHandle {
  const publicThis = this.proxy as any
  const getter = isString(source)
    ? source.includes('.')
      ? createPathGetter(publicThis, source)
      : () => publicThis[source]
    : source.bind(publicThis, publicThis)
  let cb
  if (isFunction(value)) {
    cb = value
  } else {
    cb = value.handler as Function
    options = value
  }
  const cur = currentInstance
  setCurrentInstance(this)
  const res = doWatch(getter, cb.bind(publicThis), options)
  if (cur) {
    setCurrentInstance(cur)
  } else {
    unsetCurrentInstance()
  }
  return res
}
/**
 * 
 * @param ctx 
 * @param path 
 * @returns 
 * `createPathGetter` 函数用于创建一个路径获取器函数，该函数可以根据给定的上下文 `ctx` 和路径 `path` 获取路径对应的值。

首先，将路径 `path` 使用点号 `.` 进行分割，得到一个字符串数组 `segments`，每个元素表示路径的一部分。

然后，返回一个函数，该函数在调用时会遍历 `segments` 数组，并依次访问 `ctx` 对象的属性，直到达到路径的最后一部分或无法继续访问属性为止。最后，返回路径的最终值。

这样，通过调用 `createPathGetter(ctx, path)` 可以得到一个函数，该函数可以根据给定的上下文和路径获取相应的值。这在处理嵌套对象的路径访问时非常有用，可以方便地获取深层嵌套属性的值。
 */
export function createPathGetter(ctx: any, path: string) {
  const segments = path.split('.')
  return () => {
    let cur = ctx
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]]
    }
    return cur
  }
}
/**
 * 
 * @param value 
 * @param seen 
 * @returns 
 * `traverse` 函数用于递归遍历一个值的结构，确保所有嵌套的响应式数据都被触发依赖收集，以实现响应式系统的正常工作。

该函数接受一个值 `value` 和一个可选的 `seen` 集合作为参数。`value` 表示要遍历的值，`seen` 是一个 Set 集合，用于追踪已经遍历过的值，避免无限递归。

函数首先检查 `value` 是否为对象或数组，并且不具有特殊标记 `ReactiveFlags.SKIP`。如果不满足这些条件，函数直接返回 `value`。

然后，函数检查 `seen` 是否存在，如果不存在，则创建一个新的 Set 集合。

接下来，函数检查 `value` 是否已经存在于 `seen` 集合中，如果存在，则表示该值已经遍历过，避免重复遍历，函数直接返回 `value`。

如果 `value` 是一个引用类型（Ref），则递归遍历其 `value` 属性。

如果 `value` 是一个数组，函数会遍历数组的每个元素，并递归调用 `traverse` 函数进行遍历。

如果 `value` 是一个 Set 或 Map，函数会遍历其中的每个元素，并递归调用 `traverse` 函数进行遍历。

如果 `value` 是一个普通对象，函数会遍历对象的每个属性，并递归调用 `traverse` 函数进行遍历。

最后，函数返回 `value`。

通过调用 `traverse` 函数，可以确保所有嵌套的响应式数据都被遍历和依赖收集，以便在数据发生变化时能够正确地触发更新和重新渲染。
 */
export function traverse(value: unknown, seen?: Set<unknown>) {
  if (!isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }
  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  if (isRef(value)) {
    traverse(value.value, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], seen)
    }
  }
  return value
}
