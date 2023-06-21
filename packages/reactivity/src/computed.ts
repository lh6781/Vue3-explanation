import { DebuggerOptions, ReactiveEffect } from './effect'
import { Ref, trackRefValue, triggerRefValue } from './ref'
import { isFunction, NOOP } from '@vue/shared'
import { ReactiveFlags, toRaw } from './reactive'
import { Dep } from './dep'
/**
 * ComputedRefSymbol 是一个独特的符号（unique symbol）。它可以用于创建唯一的符号标识符，通常用于在编程中指定特定的用途或上下文。

在声明中使用 unique symbol 可以确保该符号在程序中是唯一的，即使它们的名称相同，也不会导致冲突。这对于在类型系统中引入独特的标识符非常有用。

在这个特定的声明中，ComputedRefSymbol 可能被用作某种特殊用途，例如用于标识计算属性的类型或标记计算属性相关的内容。具体使用方式需要查看代码的上下文和实际的使用情况。
 */
declare const ComputedRefSymbol: unique symbol
/**
 * 上面的代码声明了一个接口 ComputedRef，它扩展了 WritableComputedRef<T> 接口，并添加了额外的成员。

ComputedRef 接口具有以下成员:

value：一个只读属性，表示计算属性的值的类型为 T。
[ComputedRefSymbol]：一个特殊的符号属性，用于标记该对象是一个计算属性（ComputedRef）。
通过将 ComputedRefSymbol 作为唯一的符号属性，可以在类型系统中识别出这个对象是一个计算属性，并进行相应的类型推断或处理。这有助于在代码中对计算属性进行特定的操作或处理。

请注意，具体的实现和用途可能取决于使用该接口的代码。
 */
export interface ComputedRef<T = any> extends WritableComputedRef<T> {
  readonly value: T
  [ComputedRefSymbol]: true
}
/**
 * 上面的代码声明了一个接口 WritableComputedRef<T>，它扩展了 Ref<T> 接口，并添加了额外的成员。

WritableComputedRef 接口具有以下成员:

effect：一个只读属性，表示计算属性的响应式效果（ReactiveEffect<T>）。它可以用于追踪计算属性的依赖关系和执行相应的副作用。
通过扩展 Ref<T> 接口，WritableComputedRef 继承了 Ref 接口的特性，包括对计算属性值的读取和写入。

综合起来，WritableComputedRef 接口定义了一个可写的计算属性，它具有读取和写入值的能力，并且可以追踪依赖关系和执行副作用。
 */
export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>
}
/**
 * 上面的代码声明了一个类型别名 ComputedGetter<T>，它表示一个计算属性的 getter 函数。

ComputedGetter<T> 是一个函数类型，它接受任意数量的参数，并返回类型为 T 的值。在计算属性中，getter 函数用于计算和返回属性的值。

通过使用 ComputedGetter<T> 类型别名，可以定义计算属性的 getter 函数，以便在计算属性的实现中使用。
 */
export type ComputedGetter<T> = (...args: any[]) => T
/**
 * 上面的代码声明了一个类型别名 ComputedSetter<T>，它表示一个计算属性的 setter 函数。

ComputedSetter<T> 是一个函数类型，它接受一个类型为 T 的值作为参数，并没有返回值。在计算属性中，setter 函数用于更新属性的值。

通过使用 ComputedSetter<T> 类型别名，可以定义计算属性的 setter 函数，以便在计算属性的实现中使用。
 */
export type ComputedSetter<T> = (v: T) => void
/**
 * WritableComputedOptions<T> 是一个接口，用于描述可写计算属性的选项。

它包含两个属性：

get：类型为 ComputedGetter<T>，表示计算属性的 getter 函数。这个函数用于获取计算属性的值。
set：类型为 ComputedSetter<T>，表示计算属性的 setter 函数。这个函数用于设置计算属性的值。
通过使用 WritableComputedOptions<T> 接口，可以定义可写计算属性的选项对象，在创建可写计算属性时使用这些选项进行配置。
 */
export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}
/**
 * 这是一个 ComputedRefImpl<T> 类的实现。它用于实现计算属性的引用。

该类具有以下属性和方法：

dep：类型为 Dep，用于跟踪计算属性的依赖关系。
_value：表示计算属性的值。
effect：类型为 ReactiveEffect<T>，表示计算属性的响应式效果。
__v_isRef：布尔值，表示该对象是一个引用。
[ReactiveFlags.IS_READONLY]：布尔值，表示计算属性是否是只读的。
_dirty：布尔值，表示计算属性是否需要重新计算。
_cacheable：布尔值，表示计算属性是否可以被缓存。
getter：类型为 ComputedGetter<T>，表示计算属性的 getter 函数。
_setter：类型为 ComputedSetter<T>，表示计算属性的 setter 函数。
isReadonly：布尔值，表示计算属性是否是只读的。
isSSR：布尔值，表示是否在服务器端渲染环境中。
该类的构造函数接受 getter、_setter、isReadonly 和 isSSR 参数，用于初始化计算属性的相关属性。
value 访问器用于获取计算属性的值，并在需要时触发计算属性的重新计算。
value 的 setter 方法用于设置计算属性的值。
 */
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined

  private _value!: T
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY]: boolean = false

  public _dirty = true
  public _cacheable: boolean

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
    this.effect.active = this._cacheable = !isSSR
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  get value() {
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this)
    trackRefValue(self)
    if (self._dirty || !self._cacheable) {
      self._dirty = false
      self._value = self.effect.run()!
    }
    return self._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}

/**
 * Takes a getter function and returns a readonly reactive ref object for the
 * returned value from the getter. It can also take an object with get and set
 * functions to create a writable ref object.
 *
 * @example
 * ```js
 * // Creating a readonly computed ref:
 * const count = ref(1)
 * const plusOne = computed(() => count.value + 1)
 *
 * console.log(plusOne.value) // 2
 * plusOne.value++ // error
 * ```
 *
 * ```js
 * // Creating a writable computed ref:
 * const count = ref(1)
 * const plusOne = computed({
 *   get: () => count.value + 1,
 *   set: (val) => {
 *     count.value = val - 1
 *   }
 * })
 *
 * plusOne.value = 1
 * console.log(count.value) // 0
 * ```
 *
 * @param getter - Function that produces the next value.
 * @param debugOptions - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
 * @see {@link https://vuejs.org/api/reactivity-core.html#computed}
 * 

这是一个重载的声明，用于 computed 函数的多态使用。

第一个重载函数接受一个 getter 函数和可选的 debugOptions 参数，并返回一个 ComputedRef<T> 类型的计算属性引用。这个重载适用于只读的计算属性，即计算属性的值只能读取，不能修改。

第二个重载函数接受一个 options 对象和可选的 debugOptions 参数，并返回一个 WritableComputedRef<T> 类型的可写计算属性引用。这个重载适用于可写的计算属性，即计算属性的值既可以读取，也可以修改。

参数说明：

getter：类型为 ComputedGetter<T>，表示计算属性的 getter 函数，用于计算属性的值。
options：类型为 WritableComputedOptions<T>，表示可写计算属性的选项对象，包含 get 和 set 属性，分别对应计算属性的 getter 和 setter 函数。
debugOptions：类型为 DebuggerOptions，可选参数，用于调试选项。

这段代码展示了 computed 函数的完整实现，包括上述提到的两个重载以及额外的参数处理。

函数的实现逻辑如下：

首先，根据传入的参数类型判断是使用只读的计算属性还是可写的计算属性。如果是只传入 getter 函数，则说明是只读的计算属性，需要创建一个只读的计算属性，并将 setter 函数设置为一个警告提示的函数。如果传入的是包含 get 和 set 函数的 options 对象，则说明是可写的计算属性，需要使用传入的 getter 和 setter 函数。

创建一个 ComputedRefImpl 实例，并传入 getter、setter、是否只有 getter（即只读）、是否运行在服务器端的标志。

如果开启了调试选项，并且不是运行在服务器端，则将调试选项中的 onTrack 和 onTrigger 回调函数分别赋值给计算属性的 effect 实例的 onTrack 和 onTrigger 属性。

返回创建的计算属性实例。

这个实现允许我们根据不同的参数类型使用不同的重载，灵活地创建只读或可写的计算属性，并提供调试选项以便于跟踪和触发计算属性的变化。
 */
export function computed<T>(
  getter: ComputedGetter<T>,
  debugOptions?: DebuggerOptions
): ComputedRef<T>
export function computed<T>(
  options: WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions
): WritableComputedRef<T>
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly')
        }
      : NOOP
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)

  if (__DEV__ && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack
    cRef.effect.onTrigger = debugOptions.onTrigger
  }

  return cRef as any
}
