import { TrackOpTypes, TriggerOpTypes } from './operations'
import { extend, isArray, isIntegerKey, isMap } from '@vue/shared'
import { EffectScope, recordEffectScope } from './effectScope'
import {
  createDep,
  Dep,
  finalizeDepMarkers,
  initDepMarkers,
  newTracked,
  wasTracked
} from './dep'
import { ComputedRefImpl } from './computed'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

// The number of effects currently being tracked recursively.
let effectTrackDepth = 0

export let trackOpBit = 1

/**
 * The bitwise track markers support at most 30 levels of recursion.
 * This value is chosen to enable modern JS engines to use a SMI on all platforms.
 * When recursion depth is greater, fall back to using a full cleanup.
 * 这段注释说明了位追踪标记（bitwise track markers）支持的最大递归级别（recursion level）为30。选择这个值是为了让现代的 JavaScript 引擎在所有平台上都可以使用 SMI（Small Integer）优化。

在这里，位追踪标记用于控制依赖项的追踪和清理操作。当执行深度（recursion depth）小于等于30时，可以使用位掩码（bitmask）来追踪依赖项的变化。位掩码是一种使用二进制位的方式来表示多个状态或选项的技术。通过位运算，可以高效地设置、检查和清除每个位的状态。

位追踪标记的使用可以提高性能，因为使用位掩码进行依赖项的追踪比使用其他数据结构更高效。然而，由于位运算受限于二进制位数的限制，因此只支持最多30级的递归。

当递归深度超过30时，就会回退到使用完全清理（full cleanup）的方式来处理依赖项。完全清理是一种更慢但更通用的方法，它可以处理任意递归深度的情况。虽然完全清理可能会导致一些性能损失，但可以确保在任何递归深度下都能正确处理依赖项的变化。

这里的maxMarkerBits变量被设置为30，表示位追踪标记支持的最大递归级别。通过选择这个值，可以在性能和通用性之间取得一个平衡，以适应大多数情况下的效率和功能要求。
 */
const maxMarkerBits = 30
/**
 * EffectScheduler是一个类型别名（type alias），它表示一个效果调度器函数的类型。在这个类型定义中，EffectScheduler被定义为一个接受任意参数并返回任意类型的函数类型。

通常情况下，EffectScheduler函数用于调度执行副作用（side effect）的操作。副作用是指在响应式效果执行过程中，可能会引起与状态变化无关的操作，比如异步请求、DOM更新等。通过使用EffectScheduler函数，可以控制副作用的执行时机、顺序和方式，以确保它们按照预期进行。

在Vue.js和类似的响应式系统中，EffectScheduler函数通常与ReactiveEffect类一起使用。ReactiveEffect类表示一个具体的响应式效果，它内部包含一个执行函数和一个可选的EffectScheduler函数。当执行ReactiveEffect实例时，如果指定了EffectScheduler函数，那么会使用它来调度执行副作用。

EffectScheduler函数的参数和返回值类型可以根据具体的使用场景而定。它可以接受任意数量和类型的参数，也可以返回任意类型的值。调用EffectScheduler函数时，会将副作用执行的相关参数传递给它，并根据它的返回值来处理副作用的结果或进行进一步的操作。

通过使用EffectScheduler类型别名，可以为副作用的调度器函数提供更具可读性和可维护性的类型注解，从而增强代码的可理解性和可靠性。
 */
export type EffectScheduler = (...args: any[]) => any
/**
 * 这段代码定义了一个类型别名DebuggerEvent。该类型表示调试器事件，并包含以下成员：

effect：一个ReactiveEffect类型的属性，表示相关联的ReactiveEffect实例。
DebuggerEventExtraInfo：另一个类型，提供了额外的调试器事件信息。
通过结合这两个类型，DebuggerEvent类型提供了在调试器中使用的事件对象，其中effect属性指定了与该事件相关的ReactiveEffect实例，并且DebuggerEventExtraInfo类型提供了其他可能的附加信息。

请注意，代码中使用了&符号进行类型交叉，将effect属性与DebuggerEventExtraInfo类型合并在一起，从而创建了DebuggerEvent类型。这使得DebuggerEvent包含了ReactiveEffect的信息以及其他额外的调试信息。
 */
export type DebuggerEvent = {
  effect: ReactiveEffect
} & DebuggerEventExtraInfo
/**
 * 这段代码定义了一个类型别名DebuggerEventExtraInfo。该类型表示调试器事件的额外信息，并包含以下成员：

target：一个object类型的属性，表示事件相关的目标对象。
type：一个TrackOpTypes | TriggerOpTypes类型的属性，表示事件的类型。TrackOpTypes和TriggerOpTypes是其他类型的别名，用于表示依赖追踪和触发操作的类型。
key：一个任意类型（any）的属性，表示事件相关的键值。
newValue：一个可选的属性，表示事件相关的新值。
oldValue：一个可选的属性，表示事件相关的旧值。
oldTarget：一个可选的属性，表示事件相关的旧目标对象，可以是Map<any, any>或Set<any>类型。
DebuggerEventExtraInfo类型提供了调试器事件的额外细节信息，例如事件相关的目标对象、操作类型、键值以及可能的新旧值。这些信息可以在调试过程中用于分析和跟踪事件的发生和变化。
 */
export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}
/**
 * 这段代码声明了一个名为activeEffect的变量，并将其类型定义为ReactiveEffect | undefined。这意味着activeEffect可以持有一个ReactiveEffect实例或者是undefined。

变量activeEffect用于追踪当前活动的ReactiveEffect实例。在Vue.js的响应式系统中，ReactiveEffect是负责追踪依赖和处理响应式数据变化的核心实体。通过将当前活动的ReactiveEffect实例赋值给activeEffect变量，可以在运行时追踪到正在运行的效果。

请注意，activeEffect是一个可变变量，其值可以在运行时进行修改。初始情况下，它被设置为undefined，表示没有当前活动的ReactiveEffect实例。当执行某个ReactiveEffect实例时，可以将该实例赋值给activeEffect，从而将其标记为当前活动的效果。这种机制允许Vue.js在数据变化时正确地追踪和触发相关的ReactiveEffect实例。
 */
export let activeEffect: ReactiveEffect | undefined

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

export class ReactiveEffect<T = any> {
  /**
   * 一个布尔值，表示当前ReactiveEffect实例是否处于活动状态。
   */
  active = true
  /**
   * 一个Dep类型的数组，用于存储依赖项（Dep对象）。
   */
  deps: Dep[] = []
  /**
   * 一个指向父级ReactiveEffect实例的引用。
   */
  parent: ReactiveEffect | undefined = undefined

  /**
   * Can be attached after creation
   * 一个ComputedRefImpl<T>类型的可选属性，表示与此ReactiveEffect关联的计算属性。
   * @internal
   */
  computed?: ComputedRefImpl<T>
  /**
   * @internal
   * 一个布尔值，表示是否允许递归执行。
   */
  allowRecurse?: boolean
  /**
   * @internal
   * 一个可选的布尔值，用于延迟停止（stop）ReactiveEffect的执行。
   */
  private deferStop?: boolean
  /**
   * 一个可选的回调函数，在ReactiveEffect停止时被调用。
   */
  onStop?: () => void
  // dev only
  /**
   * 一个可选的回调函数，在追踪（track）依赖项时被调用（仅用于开发环境）。
   */
  onTrack?: (event: DebuggerEvent) => void
  // dev only
  /**
   * 一个可选的回调函数，在触发（trigger）依赖项时被调用（仅用于开发环境）。
   */
  onTrigger?: (event: DebuggerEvent) => void

  constructor(
    /**
     * 一个接受无参数并返回泛型类型T的函数，表示ReactiveEffect的执行逻辑。
     */
    public fn: () => T,
    /**
     * 一个可选的EffectScheduler类型或null，表示调度器函数，用于控制ReactiveEffect的执行时机。
     */
    public scheduler: EffectScheduler | null = null,
    /**
     * 一个可选的EffectScope类型，表示作用域对象。
     */
    scope?: EffectScope
  ) {
    recordEffectScope(this, scope)
  }
  /**
   *
   *  这段代码是 ReactiveEffect 类中的 run 方法的实现。

该方法用于执行 ReactiveEffect 实例的函数体，并处理依赖追踪、父级效果的迭代以及相关的标记位操作。

首先，方法检查当前的 ReactiveEffect 实例是否处于活动状态（active 属性为 true），如果不活动，则直接执行函数体并返回结果。

接下来，方法通过迭代父级效果的方式检查是否存在循环依赖。它使用一个 while 循环来迭代 parent 变量，初始值为当前 ReactiveEffect 实例的父级效果（parent = parent.parent）。在每次迭代中，方法检查 parent 是否等于当前的 ReactiveEffect 实例，如果相等，则表示已经迭代到了自身，直接返回，避免出现循环依赖。

接下来，方法开始执行函数体。在执行函数体之前，它会设置一些状态，包括将当前 ReactiveEffect 实例设置为活动效果，将 shouldTrack 设置为 true，以及设置一个标记位 trackOpBit，用于标识当前的追踪操作。

如果当前的追踪深度 effectTrackDepth 小于等于最大标记位数 maxMarkerBits，则调用 initDepMarkers(this) 初始化依赖追踪集合的标记位。否则，调用 cleanupEffect(this) 清理该效果。

然后，方法执行函数体，并返回其结果。

在 try 块的 finally 子句中，方法进行一系列清理操作。首先，如果当前的追踪深度仍然小于等于最大标记位数，调用 finalizeDepMarkers(this) 完成依赖追踪集合的标记处理。

接下来，将 trackOpBit 还原为之前的状态，将 activeEffect 设置为父级效果，将 shouldTrack 设置为之前的状态，清除 this.parent 的引用。

最后，如果 this.deferStop 为 true，调用 this.stop() 方法停止当前 ReactiveEffect 实例的执行。

总结起来，run 方法执行 ReactiveEffect 实例的函数体，并处理相关的依赖追踪、迭代、标记位等操作。它通过迭代父级效果来检查循环依赖，并在执行函数体前后设置和恢复相关状态。
   */
  run() {
    if (!this.active) {
      return this.fn()
    }
    let parent: ReactiveEffect | undefined = activeEffect
    let lastShouldTrack = shouldTrack
    /**
     * while循环用于迭代parent变量，其初始值为当前ReactiveEffect实例的父级效果（parent = parent.parent）。在每次迭代中，会检查parent是否等于当前的ReactiveEffect实例，如果相等，则表示已经迭代到了自身，直接返回，否则继续迭代父级效果。
     */
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true

      trackOpBit = 1 << ++effectTrackDepth

      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this)
      } else {
        cleanupEffect(this)
      }
      return this.fn()
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this)
      }

      trackOpBit = 1 << --effectTrackDepth

      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined

      if (this.deferStop) {
        this.stop()
      }
    }
  }
  /**
   * 这段代码是 ReactiveEffect 类中的 stop 方法的实现。

该方法用于停止 ReactiveEffect 实例的执行，并执行一些清理操作。

首先，方法检查当前的 ReactiveEffect 实例是否正在执行中（activeEffect === this）。如果是，则将 this.deferStop 设置为 true，表示需要延迟清理操作。

如果当前的 ReactiveEffect 实例不是正在执行中，并且处于活动状态（active 属性为 true），则执行以下操作：

调用 cleanupEffect(this) 清理该效果。
如果存在 this.onStop 回调函数，则调用它。
将 active 属性设置为 false，表示停止该效果的执行。
总结起来，stop 方法用于停止 ReactiveEffect 实例的执行，并在必要时执行清理操作和回调函数。如果当前实例正在执行中，则将清理操作延迟执行。
   */
  stop() {
    // stopped while running itself - defer the cleanup
    if (activeEffect === this) {
      this.deferStop = true
    } else if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}
/**
 * 
 * @param effect 
 * 这是一个辅助函数 cleanupEffect 的实现，用于清理 ReactiveEffect 实例中的依赖关系。

函数首先获取 effect 对象中的依赖数组 deps。然后，它遍历依赖数组，逐个从依赖中删除当前的 effect。

在遍历完成后，将依赖数组的长度 deps.length 设置为 0，以清空依赖数组。

简而言之，cleanupEffect 函数用于清理 ReactiveEffect 实例中的依赖关系，将其从相应的依赖中删除，并将依赖数组重置为空。
 */
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}
/**
 * DebuggerOptions 是一个接口，用于配置调试器选项。它具有两个可选的属性：

onTrack：当响应式对象被访问时触发的回调函数。回调函数接收一个 DebuggerEvent 参数，用于提供有关访问事件的信息。
onTrigger：当响应式对象被触发更新时触发的回调函数。回调函数接收一个 DebuggerEvent 参数，用于提供有关触发事件的信息。
通过配置这些选项，可以在访问和触发更新响应式对象时执行自定义的调试逻辑。
 */
export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}
/**
 * ReactiveEffectOptions 是一个接口，用于配置响应式效果（ReactiveEffect）的选项。它继承了 DebuggerOptions 接口的属性，并添加了以下额外的选项：

lazy：指示响应式效果是否是延迟执行的。如果设置为 true，则在初始运行之前不会执行响应式效果函数，默认为 false。
scheduler：用于调度响应式效果函数执行的调度程序。它是一个函数，接收一个回调函数作为参数，并在适当的时机执行该回调函数。
scope：用于指定响应式效果函数的作用域。这是一个 EffectScope 对象，可以将多个响应式效果函数分组到同一个作用域中，从而实现一起启用和停用的能力。
allowRecurse：指示是否允许响应式效果函数递归调用自身。如果设置为 true，则在响应式效果函数内部调用自身时不会引发警告，默认为 false。
onStop：当响应式效果被停用时触发的回调函数。
通过配置这些选项，可以自定义响应式效果的行为，并实现惰性求值、调度执行、作用域控制等功能。
 */
export interface ReactiveEffectOptions extends DebuggerOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  scope?: EffectScope
  allowRecurse?: boolean
  onStop?: () => void
}
/**
 * ReactiveEffectRunner 是一个接口，它描述了一个具有以下特征的函数：

是一个无参函数，即不接收任何参数。
返回类型为 T，可以是任意类型。
具有一个名为 effect 的属性，该属性的类型为 ReactiveEffect，表示与该函数关联的响应式效果。
该接口可以用于描述一个包装了响应式效果函数的函数，通过调用该函数可以执行响应式效果，并且可以通过 effect 属性访问到关联的响应式效果对象。
 */
export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

/**
 * Registers the given function to track reactive updates.
 *
 * The given function will be run once immediately. Every time any reactive
 * property that's accessed within it gets updated, the function will run again.
 *
 * @param fn - The function that will track reactive updates.
 * @param options - Allows to control the effect's behaviour.
 * @returns A runner that can be used to control the effect after creation.
 * effect 函数是用于创建响应式效果的工具函数。它接受一个函数 fn 和一个可选的 options 参数，并返回一个 ReactiveEffectRunner 类型的函数。
 * fn: () => T：一个无参函数，表示要创建响应式效果的函数体。
options?: ReactiveEffectOptions：一个可选的配置对象，用于指定响应式效果的选项，包括调试器选项、惰性执行、调度器、作用域、是否允许递归以及停止回调函数等。
函数内部实现逻辑：

首先，检查传入的函数 fn 是否已经是一个 ReactiveEffectRunner，如果是，则获取其关联的原始函数。
创建一个 ReactiveEffect 实例 _effect，并将传入的函数 fn 作为其构造函数的参数。
如果传入了 options，则将其属性扩展到 _effect 对象上，并检查是否提供了作用域选项，如果有，则记录效果作用域。
如果未提供 options 或 options.lazy 为 false，则立即执行 _effect.run()，即运行响应式效果。
创建一个名为 runner 的函数，其实际调用是绑定到 _effect.run 方法上的。将 _effect 赋值给 runner.effect 属性。
返回 runner 函数作为 ReactiveEffectRunner 类型的函数。
总结起来，effect 函数的作用是创建一个响应式效果，将传入的函数包装成一个可以执行和管理的响应式效果对象，并返回一个函数，通过该函数可以执行响应式效果，并且可以通过 effect 属性访问到关联的响应式效果对象。
 */
export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner {
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  const _effect = new ReactiveEffect(fn)
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }
  if (!options || !options.lazy) {
    _effect.run()
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  runner.effect = _effect
  return runner
}

/**
 * Stops the effect associated with the given runner.
 *
 * @param runner - Association with the effect to stop tracking.
 * stop 函数用于停止一个响应式效果，它接受一个 runner 参数，该参数是 ReactiveEffectRunner 类型的函数。函数内部调用了 runner.effect.stop() 方法来停止与该 runner 相关联的响应式效果。
 * unner: ReactiveEffectRunner：一个 ReactiveEffectRunner 类型的函数，该函数包含一个名为 effect 的属性，该属性是与之关联的响应式效果对象。
函数内部实现逻辑：

调用 runner.effect.stop() 方法来停止与 runner 相关联的响应式效果。
总结起来，stop 函数用于停止一个响应式效果，通过传入一个 ReactiveEffectRunner 类型的函数来操作相应的响应式效果对象。
 */
export function stop(runner: ReactiveEffectRunner) {
  runner.effect.stop()
}
/**
 * 这段代码声明了一个名为shouldTrack的变量，并将其初始值设置为true。

shouldTrack变量在Vue.js的响应式系统中起到重要的作用。它用于控制是否应该进行依赖追踪。当shouldTrack为true时，表示当前环境应该进行依赖追踪；当shouldTrack为false时，表示当前环境不需要进行依赖追踪。

在Vue.js的响应式系统中，当响应式数据发生变化时，会触发与之相关联的ReactiveEffect实例的执行，以更新相关的依赖。而shouldTrack变量的值可以在执行过程中被动态修改，从而在某些情况下控制是否进行依赖追踪。这种机制可以提高性能，在某些场景下避免不必要的依赖追踪和更新操作。

通过将shouldTrack设置为true或false，可以在特定的上下文中控制依赖追踪的行为。在某些情况下，可能会将shouldTrack设置为false以暂时禁用依赖追踪，从而提高性能或避免无关的依赖更新。
 */
export let shouldTrack = true
/**
 * trackStack 是一个布尔类型的数组，用于跟踪追踪依赖的状态。它用于记录当前是否正在进行依赖追踪，以解决嵌套追踪的问题。

在响应式系统中，当访问响应式数据时，需要追踪依赖关系，以便在数据发生变化时能够触发相应的响应。trackStack 数组可以记录当前的追踪状态，确保在嵌套的情况下不会重复追踪相同的依赖。

 */
const trackStack: boolean[] = []

/**
 * Temporarily pauses tracking.
 * pauseTracking 函数用于暂时中断依赖追踪。它将当前的 shouldTrack 状态保存到 trackStack 数组中，并将 shouldTrack 设置为 false，以阻止进一步的依赖追踪。
 * 在调用 pauseTracking 函数后，可以执行一些操作而不会触发依赖追踪。这在某些场景下很有用，例如在特定的代码块中暂时禁止依赖追踪。
 */
export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

/**
 * Re-enables effect tracking (if it was paused).
 * enableTracking 函数用于启用依赖追踪。它将当前的 shouldTrack 状态保存到 trackStack 数组中，并将 shouldTrack 设置为 true，以允许进一步的依赖追踪。
 */
export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

/**
 * Resets the previous global effect tracking state.
 * resetTracking 函数用于重置依赖追踪状态。它会从 trackStack 数组中取出最后一个保存的 shouldTrack 状态，并将其赋值给 shouldTrack。如果 trackStack 数组为空，则将 shouldTrack 设置为 true。
 * 通过调用 resetTracking 函数，可以将依赖追踪状态重置为之前保存的状态。这在某些情况下很有用，例如在特定代码段执行完毕后，恢复到之前的依赖追踪状态。

请注意，在使用 resetTracking 函数前，必须先使用 pauseTracking 或 enableTracking 函数将相应的状态保存到 trackStack 数组中。否则，调用 resetTracking 函数可能会导致不正确的行为。
 */
export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

/**
 * Tracks access to a reactive property.
 *
 * This will check which effect is running at the moment and record it as dep
 * which records all effects that depend on the reactive property.
 *
 * @param target - Object holding the reactive property.
 * @param type - Defines the type of access to the reactive property.
 * @param key - Identifier of the reactive property to track.
 * track 函数用于追踪依赖关系。它在满足以下条件时执行：

shouldTrack 为 true，表示当前可以追踪依赖。
activeEffect 不为空，表示存在当前正在运行的副作用函数。
该函数的作用是将当前的副作用函数 activeEffect 添加到依赖图中。它首先检查 targetMap 中是否存在与目标对象 target 相关联的依赖映射 depsMap，如果不存在则创建一个新的映射。然后检查该映射中是否存在与属性 key 相关联的依赖 dep，如果不存在则创建一个新的依赖。最后，将当前的副作用函数添加到依赖中，同时传递了一些事件信息。

在开发环境中，可以通过 eventInfo 对象传递更多的调试信息，如当前的副作用函数、目标对象、操作类型和属性。而在非开发环境中，eventInfo 为 undefined。

请注意，在调用 track 函数之前，必须确保已经设置了正确的 shouldTrack 和 activeEffect 状态，以确保依赖关系能够正确地被追踪和记录。
 */
export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }

    const eventInfo = __DEV__
      ? { effect: activeEffect, target, type, key }
      : undefined

    trackEffects(dep, eventInfo)
  }
}
/**
 * 
 * @param dep 
 * @param debuggerEventExtraInfo 
 * trackEffects 函数用于在依赖（dep）中追踪当前的副作用函数（activeEffect）。它接受两个参数：dep 表示依赖对象，debuggerEventExtraInfo 是一个可选的调试信息对象。
 * 函数首先根据 effectTrackDepth 的值判断当前的追踪模式。如果 effectTrackDepth 小于等于 maxMarkerBits，表示采用部分清理模式。在该模式下，函数会判断是否是新追踪的依赖（!newTracked(dep)），如果是，则将 dep.n 标记为 trackOpBit，表示该依赖是新追踪的，并将 shouldTrack 设置为之前未被追踪过的依赖（!wasTracked(dep)）。

如果 effectTrackDepth 大于 maxMarkerBits，表示采用完全清理模式。在该模式下，函数会判断依赖 dep 是否包含当前的副作用函数 activeEffect，如果不包含，则将 shouldTrack 设置为 true。

最后，如果 shouldTrack 为 true，表示需要追踪该依赖，函数会将当前的副作用函数添加到依赖中（dep.add(activeEffect!)），并将依赖对象添加到当前副作用函数的依赖列表中（activeEffect!.deps.push(dep)）。在开发环境中，如果当前副作用函数定义了 onTrack 回调函数，会调用该回调函数，并传递一些调试信息。

请注意，在调用 trackEffects 函数之前，必须确保已经设置了正确的 activeEffect 和相关的状态，以确保正确地追踪副作用函数和依赖关系。
 */
export function trackEffects(
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  let shouldTrack = false
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit // set newly tracked
      shouldTrack = !wasTracked(dep)
    }
  } else {
    // Full cleanup mode.
    shouldTrack = !dep.has(activeEffect!)
  }

  if (shouldTrack) {
    dep.add(activeEffect!)
    activeEffect!.deps.push(dep)
    if (__DEV__ && activeEffect!.onTrack) {
      activeEffect!.onTrack(
        extend(
          {
            effect: activeEffect!
          },
          debuggerEventExtraInfo!
        )
      )
    }
  }
}

/**
 * Finds all deps associated with the target (or a specific property) and
 * triggers the effects stored within.
 *
 * @param target - The reactive object.
 * @param type - Defines the type of the operation that needs to trigger effects.
 * @param key - Can be used to target a specific reactive property in the target object.
 * trigger 函数用于触发目标对象的变更操作（target），并通知相应的副作用函数进行更新。它接受多个参数，包括 type 表示变更类型（例如 SET、ADD、DELETE、CLEAR 等），key 表示变更的键值（可选），newValue 表示新值（可选），oldValue 表示旧值（可选），oldTarget 表示旧的目标对象（可选）。
 * 函数首先通过 targetMap 获取目标对象的依赖映射（depsMap）。如果不存在依赖映射，则表示该对象从未被追踪过，直接返回。

接下来，根据不同的变更类型进行处理。当变更类型为 CLEAR 时，表示集合被清空，会触发目标对象所有的副作用函数，因此将所有依赖对象添加到 deps 数组中。

当变更类型为 SET 时，会将对应键值的依赖对象添加到 deps 数组中。

当变更类型为 ADD 或 DELETE 时，除了将对应键值的依赖对象添加到 deps 数组中外，还会根据对象的类型进行额外的处理。如果目标对象不是数组，会将迭代依赖 ITERATE_KEY 和映射迭代依赖 MAP_KEY_ITERATE_KEY 添加到 deps 数组中。如果目标对象是数组并且键值为整数索引，还会将长度依赖 'length' 添加到 deps 数组中。

接下来，根据 deps 数组的长度进行处理。如果长度为 1，表示只有一个依赖对象，直接触发该依赖对象的副作用函数。如果长度大于 1，表示有多个依赖对象，将它们的副作用函数合并到一个新的依赖对象中，并触发该依赖对象的副作用函数。

最后，在开发环境中，如果提供了调试信息 eventInfo，会将它传递给触发副作用函数的 triggerEffects 函数，用于调试目的。

请注意，在调用 trigger 函数之前，必须确保已经设置了正确的目标对象和相关的状态，以便正确地触发副作用函数和依赖关系的更新。
 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  let deps: (Dep | undefined)[] = []
  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    deps = [...depsMap.values()]
  } else if (key === 'length' && isArray(target)) {
    const newLength = Number(newValue)
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= newLength) {
        deps.push(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          deps.push(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  const eventInfo = __DEV__
    ? { target, type, key, newValue, oldValue, oldTarget }
    : undefined

  if (deps.length === 1) {
    if (deps[0]) {
      if (__DEV__) {
        triggerEffects(deps[0], eventInfo)
      } else {
        triggerEffects(deps[0])
      }
    }
  } else {
    const effects: ReactiveEffect[] = []
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep)
      }
    }
    if (__DEV__) {
      triggerEffects(createDep(effects), eventInfo)
    } else {
      triggerEffects(createDep(effects))
    }
  }
}
/**
 * 
 * @param dep 
 * @param debuggerEventExtraInfo 
 * 
 * triggerEffects 函数用于触发一组副作用函数的执行。它接收两个参数，dep 表示依赖对象或副作用函数数组，debuggerEventExtraInfo 表示调试信息的额外信息（可选）。
 * 函数首先将 dep 转换为副作用函数数组 effects。如果 dep 是数组，则直接使用它作为 effects，否则将其转换为数组形式。

然后，遍历 effects 数组，先触发所有计算属性的副作用函数，再触发其他非计算属性的副作用函数。这样做是为了确保计算属性的依赖项先于其他副作用函数进行更新，以维持计算属性的正确性。

在遍历过程中，通过调用 triggerEffect 函数触发每个副作用函数的执行，并传递调试信息的额外信息（如果提供）。

请注意，在调用 triggerEffects 函数之前，必须确保已经设置了正确的依赖对象或副作用函数数组，并且按照计算属性和非计算属性的顺序排列副作用函数。这样才能保证依赖项的正确更新顺序和副作用函数的正确执行顺序。
 */
export function triggerEffects(
  dep: Dep | ReactiveEffect[],
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  // spread into array for stabilization
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
}
/**
 * 
 * @param effect 
 * @param debuggerEventExtraInfo 
 * triggerEffect 函数用于触发单个副作用函数的执行。它接收两个参数，effect 表示要触发的副作用函数，debuggerEventExtraInfo 表示调试信息的额外信息（可选）。
 * 首先，通过检查 effect !== activeEffect || effect.allowRecurse 的条件判断是否需要触发副作用函数的执行。其中，effect !== activeEffect 确保当前副作用函数不是正在运行的副作用函数，避免出现无限递归的情况。effect.allowRecurse 则允许在副作用函数中进行递归调用。

如果满足触发条件，那么会执行以下操作：

如果副作用函数定义了 onTrigger 方法（在开发环境下），则调用 effect.onTrigger 并传递副作用函数和调试信息的额外信息。

如果副作用函数定义了 scheduler 方法，则调用 effect.scheduler，该方法用于自定义副作用函数的调度逻辑。

如果副作用函数没有定义 scheduler 方法，则直接调用 effect.run() 执行副作用函数的逻辑。

请注意，在调用 triggerEffect 函数之前，必须确保 effect 参数是有效的副作用函数，并且满足触发条件。
 */
function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (__DEV__ && effect.onTrigger) {
      effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
    }
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
/**
 * 
 * @param object 
 * @param key 
 * @returns 
 * getDepFromReactive 函数用于从反应性对象中获取与指定属性关联的依赖项集合（Dep）。它接收两个参数，object 表示反应性对象，key 表示属性的键。
 * 该函数通过 targetMap.get(object) 获取 object 对应的依赖项映射（depsMap），然后通过 depsMap.get(key) 获取与指定键关联的依赖项集合（Dep）。如果不存在对应的依赖项映射或指定键的依赖项集合，则返回 undefined。

请注意，在使用 getDepFromReactive 函数之前，需要确保 object 是经过反应性处理的对象，并且已经建立了相应的依赖项映射关系。
 */
export function getDepFromReactive(object: any, key: string | number | symbol) {
  return targetMap.get(object)?.get(key)
}
