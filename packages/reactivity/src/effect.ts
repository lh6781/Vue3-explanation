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
   *  运行ReactiveEffect的逻辑。如果active为false，直接调用fn()并返回结果；否则，执行依赖追踪和fn()的调用，并返回结果。
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
   * 运行ReactiveEffect的逻辑。如果active为false，直接调用fn()并返回结果；否则，执行依赖追踪和fn()的调用，并返回结果。
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

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface ReactiveEffectOptions extends DebuggerOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  scope?: EffectScope
  allowRecurse?: boolean
  onStop?: () => void
}

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
const trackStack: boolean[] = []

/**
 * Temporarily pauses tracking.
 */
export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

/**
 * Re-enables effect tracking (if it was paused).
 */
export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

/**
 * Resets the previous global effect tracking state.
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

export function getDepFromReactive(object: any, key: string | number | symbol) {
  return targetMap.get(object)?.get(key)
}
