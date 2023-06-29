import {
  activeEffect,
  getDepFromReactive,
  shouldTrack,
  trackEffects,
  triggerEffects
} from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { isArray, hasChanged, IfAny, isFunction, isObject } from '@vue/shared'
import {
  isProxy,
  toRaw,
  isReactive,
  toReactive,
  isReadonly,
  isShallow
} from './reactive'
import type { ShallowReactiveMarker } from './reactive'
import { CollectionTypes } from './collectionHandlers'
import { createDep, Dep } from './dep'

declare const RefSymbol: unique symbol
export declare const RawSymbol: unique symbol
/**
 * Ref 是一个接口，用于定义一个具有 value 属性的引用对象。它接受一个泛型参数 T，表示引用对象中存储的值的类型。

Ref 接口定义了以下属性：

value：引用对象中存储的值。可以通过访问 ref.value 来读取或修改该值。
此外，Ref 接口还使用了一个私有符号 [RefSymbol]，用作类型区分器。这个符号只是用于在公共声明文件（.d.ts）中使用，但不会在 IDE 的自动补全中显示。

引用对象通常用于在响应式系统中包装可变的数据，并对其进行追踪和观察。通过将数据包装在引用对象中，可以在修改数据时自动触发相应的响应式更新。
 */
export interface Ref<T = any> {
  value: T
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
}
/**
 * RefBase 是一个类型别名，用于定义一个具有 dep 和 value 属性的引用对象的基础类型。它接受一个泛型参数 T，表示引用对象中存储的值的类型。

RefBase 类型别名定义了以下属性：

dep（可选）：一个 Dep 对象，用于追踪引用对象的依赖关系。在响应式系统中，当引用对象的值发生变化时，可以通知依赖项进行更新。
value：引用对象中存储的值。可以通过访问 ref.value 来读取或修改该值。
引用对象的基础类型 RefBase 提供了引用对象的通用属性，可以用作其他引用对象类型的基础。它不包含具体的响应式逻辑，而是提供了基本的属性结构。实际的响应式逻辑通常通过混入其他对象或使用特定的包装函数来实现。
 */
type RefBase<T> = {
  dep?: Dep
  value: T
}
/**
 * 
 * @param ref 
 * trackRefValue 函数用于追踪引用对象的值的变化。它接受一个 RefBase 类型的参数 ref，表示要追踪的引用对象。

函数首先会检查当前是否需要进行依赖追踪（shouldTrack）且存在活跃的效果函数（activeEffect）。如果满足这两个条件，就会执行依赖追踪逻辑。

在依赖追踪逻辑中，首先会将 ref 转换为原始值（toRaw(ref)），确保追踪的是引用对象的实际值而不是包装后的响应式代理对象。

然后，根据开发环境是否为开发模式，执行不同的追踪效果函数。

在开发模式下（__DEV__），会通过 trackEffects 函数追踪引用对象的依赖关系。如果引用对象的 dep 属性不存在，则会创建一个新的依赖对象（createDep()），并将其赋值给 ref.dep。然后，使用 trackEffects 函数追踪引用对象的依赖项，传递的参数包括目标对象 ref、操作类型为 GET，以及键名为 'value'，表示对值的访问。
在非开发模式下，只执行依赖追踪逻辑，使用 trackEffects 函数追踪引用对象的依赖项，传递的参数只包括依赖对象 ref.dep。
这样，在引用对象的值发生变化时，就能够通知依赖项进行相应的更新操作。
 */
export function trackRefValue(ref: RefBase<any>) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    if (__DEV__) {
      trackEffects(ref.dep || (ref.dep = createDep()), {
        target: ref,
        type: TrackOpTypes.GET,
        key: 'value'
      })
    } else {
      trackEffects(ref.dep || (ref.dep = createDep()))
    }
  }
}
/**
 * 
 * @param ref 
 * @param newVal
 * triggerRefValue 函数用于触发引用对象的值的更新。它接受一个 RefBase 类型的参数 ref，表示要触发更新的引用对象，以及可选的新值 newVal。

函数首先将 ref 转换为原始值（toRaw(ref)），以确保触发更新的是引用对象的实际值而不是包装后的响应式代理对象。

然后，获取引用对象的依赖对象（dep）。如果 dep 存在，则执行触发更新的逻辑。

在开发模式下（__DEV__），通过 triggerEffects 函数触发依赖项的更新。它接受两个参数，依赖对象 dep 和一个包含触发更新相关信息的对象。这个对象包括目标对象 ref、操作类型为 SET，以及键名为 'value'，表示对值的设置操作，同时还可以包含新值 newVal。

在非开发模式下，只执行触发更新的逻辑，通过 triggerEffects 函数触发依赖项的更新，传递的参数只有依赖对象 dep。

通过触发更新，依赖项会被通知进行相应的更新操作，从而保持响应式数据的一致性。
 */
export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
  ref = toRaw(ref)
  const dep = ref.dep
  if (dep) {
    if (__DEV__) {
      triggerEffects(dep, {
        target: ref,
        type: TriggerOpTypes.SET,
        key: 'value',
        newValue: newVal
      })
    } else {
      triggerEffects(dep)
    }
  }
}

/**
 * Checks if a value is a ref object.
 *
 * @param r - The value to inspect.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isref}
 * isRef 函数用于判断给定的值是否是 Ref 类型。

函数重载的第一个版本接受一个参数 r，表示要进行判断的值，并使用泛型 T 指定了 Ref 的值类型。

函数重载的第二个版本接受一个参数 r，表示要进行判断的值，类型为 any，不指定具体的值类型。

函数的实现通过判断 r 是否存在且具有 __v_isRef 属性，如果存在且值为 true，则表示 r 是 Ref 类型，返回 true。否则返回 false。

这两个重载的目的是为了兼容不同版本的使用方式，可以根据实际情况选择使用其中一个重载函数进行判断。
 */
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}

/**
 * Takes an inner value and returns a reactive and mutable ref object, which
 * has a single property `.value` that points to the inner value.
 *
 * @param value - The object to wrap in the ref.
 * @see {@link https://vuejs.org/api/reactivity-core.html#ref}
 * ref 函数用于创建一个 Ref 对象。

函数的第一个重载版本接受一个参数 value，表示初始值，并且该值本身就是一个 Ref 对象。在这种情况下，直接返回该值。

函数的第二个重载版本接受一个参数 value，表示初始值，并且该值不是 Ref 对象。在这种情况下，创建一个新的 Ref 对象，将初始值作为其内部 value 属性的值，并返回该 Ref 对象。

函数的第三个重载版本没有参数，用于创建一个没有初始值的 Ref 对象，其内部 value 属性的值为 undefined。

最后，函数调用了 createRef 函数来创建 Ref 对象，并将参数传递给它进行处理。createRef 函数的具体实现未在提供的代码片段中给出。
 */
export function ref<T extends Ref>(value: T): T
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value, false)
}
/**
 * ShallowRefMarker 是一个独特的符号（unique symbol），用于表示浅层 Ref 对象。它用于在 Ref 对象的类型中标记是否为浅层 Ref。

在代码中的声明 declare const ShallowRefMarker: unique symbol 表示该符号是一个声明，并被声明为一个独特的符号。
 */
declare const ShallowRefMarker: unique symbol
/**
 * ShallowRef<T> 是一种类型，表示一个浅层 Ref 对象。它扩展了 Ref<T> 类型，并可选地具有一个独特的符号属性 [ShallowRefMarker]。

浅层 Ref 对象是一种特殊类型的 Ref，它在引用类型的情况下只追踪对象的引用变化，而不深入观察对象内部的属性变化。这意味着当浅层 Ref 引用的对象的属性发生变化时，不会触发依赖更新。

使用 ShallowRef<T> 类型可以标识一个对象是浅层 Ref，并在类型系统中进行区分。
 */
export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true }

/**
 * Shallow version of {@link ref()}.
 *
 * @example
 * ```js
 * const state = shallowRef({ count: 1 })
 *
 * // does NOT trigger change
 * state.value.count = 2
 *
 * // does trigger change
 * state.value = { count: 2 }
 * ```
 *
 * @param value - The "inner value" for the shallow ref.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowref}
 * shallowRef 是一个函数，用于创建一个浅层 Ref 对象。它具有以下重载：

shallowRef(value: T): T extends Ref ? T : ShallowRef<T>：

当传入的 value 已经是 Ref 类型时，直接返回该值。
当传入的 value 不是 Ref 类型时，创建一个对应类型的浅层 Ref 对象，并返回该对象。
shallowRef<T = any>(): ShallowRef<T | undefined>：

当不传入任何值时，创建一个初始值为 undefined 的浅层 Ref 对象，并返回该对象。
shallowRef 函数会根据传入的值的类型自动推断返回的对象类型。如果传入的值已经是 Ref 类型，则返回该值本身，否则返回一个新的浅层 Ref 对象。

浅层 Ref 对象在引用类型的情况下只追踪对象的引用变化，不深入观察对象内部的属性变化。这意味着当浅层 Ref 引用的对象的属性发生变化时，不会触发依赖更新。
 */
export function shallowRef<T extends object>(
  value: T
): T extends Ref ? T : ShallowRef<T>
export function shallowRef<T>(value: T): ShallowRef<T>
export function shallowRef<T = any>(): ShallowRef<T | undefined>
export function shallowRef(value?: unknown) {
  return createRef(value, true)
}
/**
 * 
 * @param rawValue 
 * @param shallow 
 * @returns 
 * createRef 是一个函数，用于根据传入的值和浅层标志创建一个 Ref 对象。

函数的实现逻辑如下：

首先，检查传入的值是否已经是 Ref 类型，如果是，则直接返回该值，不进行任何处理。

如果传入的值不是 Ref 类型，则创建一个新的 RefImpl 对象，传入原始值和浅层标志，并返回该对象作为结果。

createRef 函数的作用是根据传入的值的类型和浅层标志，创建一个对应类型的 Ref 对象，并返回该对象。如果传入的值已经是 Ref 类型，则直接返回该值本身，否则创建一个新的 RefImpl 对象。
 */
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
/**
 * RefImpl 是一个泛型类，用于实现 Ref 接口。

类的成员如下：

_value：保存被包装的值。
_rawValue：保存原始的未经处理的值。
dep：依赖对象，用于追踪和触发效应函数。
__v_isRef：标识该对象为 Ref 类型的标志。
__v_isShallow：表示是否使用浅层模式。
构造函数：接受一个值和浅层标志，根据浅层标志初始化 _rawValue 和 _value。
value 访问器属性：在获取 _value 时调用 trackRefValue 函数进行依赖追踪，然后返回 _value。
value 访问器属性的 setter：根据浅层标志和新的值，决定是否直接使用新值或转换为原始值。如果新值与 _rawValue 发生改变，则更新 _rawValue 和 _value，并调用 triggerRefValue 函数触发相关的效应函数。
RefImpl 类用于实现 Ref 接口的行为，包括值的访问和更新，并在适当的时候进行依赖追踪和触发效应函数。
 */
class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, newVal)
    }
  }
}

/**
 * Force trigger effects that depends on a shallow ref. This is typically used
 * after making deep mutations to the inner value of a shallow ref.
 *
 * @example
 * ```js
 * const shallow = shallowRef({
 *   greet: 'Hello, world'
 * })
 *
 * // Logs "Hello, world" once for the first run-through
 * watchEffect(() => {
 *   console.log(shallow.value.greet)
 * })
 *
 * // This won't trigger the effect because the ref is shallow
 * shallow.value.greet = 'Hello, universe'
 *
 * // Logs "Hello, universe"
 * triggerRef(shallow)
 * ```
 *
 * @param ref - The ref whose tied effects shall be executed.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#triggerref}
 * triggerRef 函数用于触发 Ref 对象的更新。

函数的参数 ref 是一个 Ref 对象。它调用 triggerRefValue 函数，并传递 ref 对象和可选的新值作为参数。

在触发更新时，如果是开发环境（__DEV__ 为真），则传递 ref.value 作为新值；否则传递 undefined。这样做是为了在开发环境中提供更多的调试信息，而在生产环境中减少不必要的计算。

triggerRefValue 函数会根据新值来触发相关的效应函数，包括依赖追踪和触发效应函数。
 */
export function triggerRef(ref: Ref) {
  triggerRefValue(ref, __DEV__ ? ref.value : void 0)
}
/**
 * `MaybeRef` 类型用于表示一个值，它可以是普通值 `T`，也可以是 `Ref<T>` 对象。

这个类型的定义允许我们在某些情况下使用普通值或 `Ref` 对象作为参数或返回值。如果传入的值是 `Ref` 对象，我们可以对其进行 `.value` 的访问，或者在需要时将其转换为普通值进行处理。

例如，假设我们有一个函数 `getValue`，它接受一个 `MaybeRef<number>` 类型的参数，并返回参数的平方值。在函数内部，我们可以通过访问 `.value` 属性来获取普通值，或者直接使用参数作为普通值进行计算。

```typescript
function getValue(value: MaybeRef<number>): number {
  const num = isRef(value) ? value.value : value;
  return num * num;
}
```
使用 `MaybeRef` 类型可以提高代码的灵活性，使得函数可以接受普通值或 `Ref` 对象，并根据需要进行处理。
 */
export type MaybeRef<T = any> = T | Ref<T>
/**
 * `MaybeRefOrGetter` 类型用于表示一个值，它可以是普通值 `T`，也可以是 `Ref<T>` 对象，或者是一个返回值为 `T` 的函数。

这个类型的定义允许我们在某些情况下接受普通值、`Ref` 对象或者一个返回值为 `T` 的函数作为参数或返回值。如果传入的值是 `Ref` 对象，我们可以对其进行 `.value` 的访问，或者在需要时将其转换为普通值进行处理。如果传入的值是函数，我们可以调用该函数获取返回的值。

例如，假设我们有一个函数 `getValue`，它接受一个 `MaybeRefOrGetter<number>` 类型的参数，并返回参数的平方值。在函数内部，我们需要处理三种情况：如果参数是普通值，直接计算平方；如果参数是 `Ref` 对象，获取其 `.value` 并计算平方；如果参数是函数，调用该函数获取返回值并计算平方。

```typescript
function getValue(value: MaybeRefOrGetter<number>): number {
  if (isRef(value)) {
    value = value.value;
  } else if (typeof value === 'function') {
    value = value();
  }
  return value * value;
}
```

使用 `MaybeRefOrGetter` 类型可以处理更多的值类型，使得函数更加灵活，可以接受普通值、`Ref` 对象或函数作为参数，并根据需要进行处理。
 */
export type MaybeRefOrGetter<T = any> = MaybeRef<T> | (() => T)

/**
 * Returns the inner value if the argument is a ref, otherwise return the
 * argument itself. This is a sugar function for
 * `val = isRef(val) ? val.value : val`.
 *
 * @example
 * ```js
 * function useFoo(x: number | Ref<number>) {
 *   const unwrapped = unref(x)
 *   // unwrapped is guaranteed to be number now
 * }
 * ```
 *
 * @param ref - Ref or plain value to be converted into the plain value.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#unref}
 * `unref` 函数用于获取 `MaybeRef` 对象的原始值。

如果传入的值是 `Ref` 对象，`unref` 函数将返回该对象的 `.value` 属性，即获取其原始值。

如果传入的值不是 `Ref` 对象，`unref` 函数将直接返回该值本身。

这个函数非常有用，因为有时我们需要处理一个可能是 `Ref` 对象的值，但我们只关心它的原始值。通过使用 `unref` 函数，我们可以确保获得原始值，而无需关心值的类型是 `Ref` 还是普通值。

下面是 `unref` 函数的实现示例：

```typescript
export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? ref.value : ref;
}
```

在上述实现中，我们使用 `isRef` 函数来检查传入的值是否是 `Ref` 对象。如果是，我们返回其 `.value` 属性；否则，直接返回传入的值。

使用 `unref` 函数，我们可以轻松地获取 `MaybeRef` 对象的原始值，并在需要时进行处理。
 */
export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? ref.value : ref
}

/**
 * Normalizes values / refs / getters to values.
 * This is similar to {@link unref()}, except that it also normalizes getters.
 * If the argument is a getter, it will be invoked and its return value will
 * be returned.
 *
 * @example
 * ```js
 * toValue(1) // 1
 * toValue(ref(1)) // 1
 * toValue(() => 1) // 1
 * ```
 *
 * @param source - A getter, an existing ref, or a non-function value.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#tovalue}
 * `toValue` 函数用于获取 `MaybeRefOrGetter` 对象的最终值。

如果传入的值是一个函数，`toValue` 函数将调用该函数并返回其返回值作为最终值。

如果传入的值是 `MaybeRef` 对象，`toValue` 函数将使用 `unref` 函数获取其原始值作为最终值。

这个函数非常实用，因为有时我们需要处理一个可能是 `MaybeRef` 对象或一个函数的值，并希望获取最终的值。通过使用 `toValue` 函数，我们可以方便地处理这两种情况，并获取到最终的值。

下面是 `toValue` 函数的实现示例：

```typescript
export function toValue<T>(source: MaybeRefOrGetter<T>): T {
  return isFunction(source) ? source() : unref(source);
}
```

在上述实现中，我们首先使用 `isFunction` 函数来检查传入的值是否是一个函数。如果是，我们调用该函数并返回其返回值作为最终值。如果不是函数，则将传入的值作为 `MaybeRef` 对象传递给 `unref` 函数来获取其原始值作为最终值。

使用 `toValue` 函数，我们可以轻松地获取 `MaybeRefOrGetter` 对象的最终值，并在需要时进行处理。无论传入的值是一个 `MaybeRef` 对象还是一个函数，我们都可以获得最终的值进行后续操作。
 */
export function toValue<T>(source: MaybeRefOrGetter<T>): T {
  return isFunction(source) ? source() : unref(source)
}
/**
 * `shallowUnwrapHandlers` 是一个代理处理程序（ProxyHandler），用于在访问和设置属性时对目标对象进行处理。

在 `get` 处理程序中，它使用 `Reflect.get` 方法来获取目标对象上的属性值，并通过 `unref` 函数将其解包成原始值。这样可以确保在访问属性时始终获取到原始值，而不是 `Ref` 对象。

在 `set` 处理程序中，它首先获取目标对象上的旧值 `oldValue`。如果旧值是一个 `Ref` 对象并且新值不是 `Ref` 对象，则将新值赋值给 `oldValue.value`，以实现对 `Ref` 对象的修改。如果旧值不是 `Ref` 对象或新值也是 `Ref` 对象，则通过 `Reflect.set` 方法将新值设置到目标对象上。

这个处理程序在处理属性访问和设置时会自动解包 `Ref` 对象，并且只在需要修改 `Ref` 对象的值时才进行赋值操作。其他情况下，它会将访问和设置操作委托给原始的 `Reflect.get` 和 `Reflect.set` 方法。

以下是 `shallowUnwrapHandlers` 的示例实现：

```typescript
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  }
};
```

注意，这个处理程序只对目标对象的直接属性进行解包和修改，而不会递归到嵌套对象。如果需要对嵌套对象进行浅解包和修改，可以考虑使用递归或其他方法来处理。
 */
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}

/**
 * Returns a reactive proxy for the given object.
 *
 * If the object already is reactive, it's returned as-is. If not, a new
 * reactive proxy is created. Direct child properties that are refs are properly
 * handled, as well.
 *
 * @param objectWithRefs - Either an already-reactive object or a simple object
 * that contains refs.
 * `proxyRefs` 函数接受一个带有 `Ref` 的对象 `objectWithRefs`，并返回一个代理对象 `ShallowUnwrapRef<T>`。如果 `objectWithRefs` 已经是一个响应式对象，则直接返回该对象；否则，使用 `new Proxy` 创建一个代理对象，代理对象使用 `shallowUnwrapHandlers` 处理程序来处理属性的访问和设置。

代理对象的作用是在访问属性时自动解包 `Ref` 对象，以便获取到原始值。这样可以使开发者在使用代理对象时无需手动调用 `unref` 函数来解包 `Ref`，从而简化代码的书写。

以下是 `proxyRefs` 的示例实现：

```typescript
export function proxyRefs<T extends object>(objectWithRefs: T): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
```

注意，`proxyRefs` 函数只会浅层地对属性进行解包，如果需要对嵌套属性进行解包，可以考虑使用递归或其他方法来处理。
 */
export function proxyRefs<T extends object>(
  objectWithRefs: T
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}
/**
 * `CustomRefFactory` 是一个类型别名，用于定义自定义的 `Ref` 工厂函数。它接受两个参数 `track` 和 `trigger`，这两个参数是函数类型，用于追踪和触发依赖更新。

工厂函数返回一个对象，包含 `get` 和 `set` 方法。`get` 方法用于获取 `Ref` 的值，`set` 方法用于设置 `Ref` 的值。

以下是 `CustomRefFactory` 的示例使用方式：

```typescript
const myRefFactory: CustomRefFactory<number> = (track, trigger) => {
  let value = 0;

  return {
    get() {
      track(); // 追踪依赖
      return value;
    },
    set(newValue) {
      value = newValue;
      trigger(); // 触发依赖更新
    }
  };
};

const myRef = myRefFactory(() => {
  // 自定义的 track 函数
  console.log('Tracking dependency...');
}, () => {
  // 自定义的 trigger 函数
  console.log('Triggering dependency update...');
});

console.log(myRef.get()); // 输出: 0
myRef.set(10); // 输出: Triggering dependency update...
console.log(myRef.get()); // 输出: 10
```

在上述示例中，`myRefFactory` 是一个自定义的 `Ref` 工厂函数，它创建了一个简单的 `Ref` 对象。`get` 方法用于获取值并追踪依赖，`set` 方法用于设置值并触发依赖更新。`myRef` 是由 `myRefFactory` 创建的 `Ref` 对象。

注意，在实际使用中，`track` 和 `trigger` 函数通常会与响应式系统的内部机制进行关联，以实现依赖追踪和触发更新。上述示例中的 `console.log` 只是为了演示目的，实际实现中需要根据具体的情况进行处理。
 */
export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void
) => {
  get: () => T
  set: (value: T) => void
}
/**
 * `CustomRefImpl` 是一个自定义的 `Ref` 实现类。它接受一个 `CustomRefFactory` 工厂函数作为参数，并通过该工厂函数创建了 `get` 和 `set` 方法。

`CustomRefImpl` 类具有以下属性和方法：

- `dep`：用于存储依赖关系的 `Dep` 对象。
- `__v_isRef`：标识该对象是一个 `Ref` 对象。
- 构造函数：接受一个 `CustomRefFactory` 工厂函数作为参数，并通过该工厂函数创建了 `get` 和 `set` 方法。
- `value` 属性的 `get` 访问器：通过调用内部 `_get` 方法获取 `Ref` 的值。
- `value` 属性的 `set` 访问器：通过调用内部 `_set` 方法设置 `Ref` 的值。

以下是 `CustomRefImpl` 的示例使用方式：

```typescript
const myRefFactory: CustomRefFactory<number> = (track, trigger) => {
  let value = 0;

  return {
    get() {
      track(); // 追踪依赖
      return value;
    },
    set(newValue) {
      value = newValue;
      trigger(); // 触发依赖更新
    }
  };
};

const myRef = new CustomRefImpl(myRefFactory);

console.log(myRef.value); // 输出: 0
myRef.value = 10;
console.log(myRef.value); // 输出: 10
```

在上述示例中，`myRefFactory` 是一个自定义的 `CustomRefFactory` 工厂函数，用于创建一个自定义的 `Ref` 对象。`CustomRefImpl` 类通过传入 `myRefFactory` 创建了 `myRef` 对象。`myRef` 可以像普通的 `Ref` 对象一样访问和设置值。

请注意，`CustomRefFactory` 工厂函数的实现应该符合依赖追踪和触发更新的要求，以确保在响应式系统中正常工作。
 */
class CustomRefImpl<T> {
  public dep?: Dep = undefined

  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']

  public readonly __v_isRef = true

  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this)
    )
    this._get = get
    this._set = set
  }

  get value() {
    return this._get()
  }

  set value(newVal) {
    this._set(newVal)
  }
}

/**
 * Creates a customized ref with explicit control over its dependency tracking
 * and updates triggering.
 *
 * @param factory - The function that receives the `track` and `trigger` callbacks.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#customref}
 * `customRef` 是一个工厂函数，用于创建自定义的 `Ref` 对象。它接受一个 `CustomRefFactory` 工厂函数作为参数，并通过该工厂函数创建了一个 `CustomRefImpl` 实例。

`customRef` 函数返回的对象具有 `Ref` 接口的属性和方法。它包装了 `CustomRefImpl` 实例，并将其类型断言为 `any`，以避免 TypeScript 的类型检查错误。

以下是 `customRef` 的示例使用方式：

```typescript
const myRefFactory: CustomRefFactory<number> = (track, trigger) => {
  let value = 0;

  return {
    get() {
      track(); // 追踪依赖
      return value;
    },
    set(newValue) {
      value = newValue;
      trigger(); // 触发依赖更新
    }
  };
};

const myRef = customRef(myRefFactory);

console.log(myRef.value); // 输出: 0
myRef.value = 10;
console.log(myRef.value); // 输出: 10
```

在上述示例中，`myRefFactory` 是一个自定义的 `CustomRefFactory` 工厂函数，用于创建一个自定义的 `Ref` 对象。通过调用 `customRef` 函数并传入 `myRefFactory`，可以创建一个 `Ref` 对象 `myRef`。`myRef` 可以像普通的 `Ref` 对象一样访问和设置值。
 */
export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any
}
/**
 * `ToRefs` 是一个泛型类型，用于将一个对象的每个属性转换为对应的 `Ref` 对象。它接受一个泛型参数 `T`，表示要转换的对象类型。

`ToRefs` 的定义中使用了映射类型，通过 `keyof T` 遍历 `T` 的属性，并将每个属性转换为对应的 `ToRef<T[K]>` 类型。这里的 `ToRef<T[K]>` 表示将属性类型 `T[K]` 转换为 `Ref` 类型。

例如，假设有一个对象 `data` 如下所示：

```typescript
const data = {
  name: 'John',
  age: 25,
};
```

使用 `ToRefs<typeof data>` 将其转换为 `ToRefs` 类型后，将会得到以下类型：

```typescript
{
  name: Ref<string>,
  age: Ref<number>,
}
```

其中，`name` 属性的类型为 `Ref<string>`，`age` 属性的类型为 `Ref<number>`。这样转换后的对象中的每个属性都成为了 `Ref` 对象，可以使用 `value` 属性访问其值。

这个类型可以在需要将对象的属性转换为 `Ref` 对象时使用，例如在 Vue 3 的模板中使用 `toRefs` 函数将响应式对象转换为模板中可访问的 `Ref` 对象。

以下是使用 `ToRefs` 的示例：

```typescript
import { reactive, toRefs } from 'vue';

const data = reactive({
  name: 'John',
  age: 25,
});

const refs = toRefs(data);

console.log(refs.name.value); // 输出: John
console.log(refs.age.value); // 输出: 25
```

在上述示例中，`toRefs` 函数将响应式对象 `data` 转换为 `ToRefs` 类型，并将转换后的结果赋值给 `refs`。`refs` 中的每个属性都成为了 `Ref` 对象，可以通过 `.value` 属性访问其值。
 */
export type ToRefs<T = any> = {
  [K in keyof T]: ToRef<T[K]>
}

/**
 * Converts a reactive object to a plain object where each property of the
 * resulting object is a ref pointing to the corresponding property of the
 * original object. Each individual ref is created using {@link toRef()}.
 *
 * @param object - Reactive object to be made into an object of linked refs.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#torefs}
 * `toRefs` 是一个函数，用于将一个响应式对象转换为具有相同属性的 `Ref` 对象。

函数定义中使用了泛型类型 `T`，表示要转换的对象类型。返回类型为 `ToRefs<T>`，表示转换后的对象类型，其中每个属性都是 `Ref` 对象。

函数逻辑如下：

1. 首先，通过 `isArray` 函数判断传入的对象是否为数组，如果是，则创建一个具有相同长度的空数组 `ret`，否则创建一个空对象 `ret`。
2. 使用 `for...in` 循环遍历对象的每个属性 `key`。
3. 对于每个属性 `key`，调用 `propertyToRef` 函数将属性转换为 `Ref` 对象，并将其赋值给 `ret[key]`。
4. 循环结束后，返回转换后的对象 `ret`。

`toRefs` 函数还包含一个条件判断，如果传入的对象不是一个响应式对象（即非 Proxy 对象），在开发环境下会发出警告。

以下是使用 `toRefs` 的示例：

```typescript
import { reactive, toRefs } from 'vue';

const data = reactive({
  name: 'John',
  age: 25,
});

const refs = toRefs(data);

console.log(refs.name.value); // 输出: John
console.log(refs.age.value); // 输出: 25
```

在上述示例中，`toRefs` 函数将响应式对象 `data` 转换为具有相同属性的 `Ref` 对象，并将转换后的结果赋值给 `refs`。`refs` 中的每个属性都是 `Ref` 对象，可以通过 `.value` 属性访问其值。
 */
export function toRefs<T extends object>(object: T): ToRefs<T> {
  if (__DEV__ && !isProxy(object)) {
    console.warn(`toRefs() expects a reactive object but received a plain one.`)
  }
  const ret: any = isArray(object) ? new Array(object.length) : {}
  for (const key in object) {
    ret[key] = propertyToRef(object, key)
  }
  return ret
}
/**
 * `ObjectRefImpl` 是一个泛型类，用于实现对对象属性的引用（Ref）。

类的泛型参数 `T` 表示对象的类型，`K` 表示对象的属性名。类具有一个公共属性 `__v_isRef`，用于标识该对象是一个引用（Ref）。

类的构造函数接受三个参数：
- `_object`：要引用的对象。
- `_key`：要引用的属性名。
- `_defaultValue`（可选）：默认值，如果引用的属性值为 `undefined`，则使用该默认值。

类具有 `value` 属性，用于获取引用的属性值。如果引用的属性值为 `undefined`，则返回 `_defaultValue`。

类还具有 `value` 属性的 setter 方法，用于设置引用的属性值。

类还具有 `dep` 属性，用于获取与引用的属性关联的依赖（Dep）对象。

以下是使用 `ObjectRefImpl` 的示例：

```typescript
const obj = reactive({ name: 'John', age: 25 });
const ref = new ObjectRefImpl(obj, 'name');

console.log(ref.value); // 输出: John

ref.value = 'Alice';
console.log(obj.name); // 输出: Alice
```

在上述示例中，我们通过 `reactive` 将一个对象 `obj` 变为响应式对象，然后使用 `ObjectRefImpl` 创建一个对 `obj.name` 属性的引用。通过 `ref.value` 可以获取属性的值，并且可以通过 `ref.value = ...` 修改属性的值。修改引用的属性值会同时修改原始对象的对应属性值。
 */
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true

  constructor(
    private readonly _object: T,
    private readonly _key: K,
    private readonly _defaultValue?: T[K]
  ) {}

  get value() {
    const val = this._object[this._key]
    return val === undefined ? (this._defaultValue as T[K]) : val
  }

  set value(newVal) {
    this._object[this._key] = newVal
  }

  get dep(): Dep | undefined {
    return getDepFromReactive(toRaw(this._object), this._key)
  }
}
/**
 * `GetterRefImpl` 是一个泛型类，用于实现只读的计算属性引用（Ref）。

类具有两个公共属性 `__v_isRef` 和 `__v_isReadonly`，用于标识该对象是一个引用（Ref）和只读引用。

类的构造函数接受一个参数 `_getter`，表示计算属性的 getter 函数。

类具有 `value` 属性，用于获取计算属性的值。通过调用 `_getter` 函数获取计算属性的值。

以下是使用 `GetterRefImpl` 的示例：

```typescript
const obj = reactive({ x: 5, y: 10 });
const ref = new GetterRefImpl(() => obj.x + obj.y);

console.log(ref.value); // 输出: 15

obj.x = 7;
console.log(ref.value); // 输出: 17
```

在上述示例中，我们通过 `reactive` 将一个对象 `obj` 变为响应式对象，并创建一个计算属性引用 `ref`，它的值是 `obj.x + obj.y`。通过 `ref.value` 可以获取计算属性的值，当依赖的响应式数据发生变化时，计算属性的值也会相应更新。
 */
class GetterRefImpl<T> {
  public readonly __v_isRef = true
  public readonly __v_isReadonly = true
  constructor(private readonly _getter: () => T) {}
  get value() {
    return this._getter()
  }
}

export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref] ? T : Ref<T>>

/**
 * Used to normalize values / refs / getters into refs.
 *
 * @example
 * ```js
 * // returns existing refs as-is
 * toRef(existingRef)
 *
 * // creates a ref that calls the getter on .value access
 * toRef(() => props.foo)
 *
 * // creates normal refs from non-function values
 * // equivalent to ref(1)
 * toRef(1)
 * ```
 *
 * Can also be used to create a ref for a property on a source reactive object.
 * The created ref is synced with its source property: mutating the source
 * property will update the ref, and vice-versa.
 *
 * @example
 * ```js
 * const state = reactive({
 *   foo: 1,
 *   bar: 2
 * })
 *
 * const fooRef = toRef(state, 'foo')
 *
 * // mutating the ref updates the original
 * fooRef.value++
 * console.log(state.foo) // 2
 *
 * // mutating the original also updates the ref
 * state.foo++
 * console.log(fooRef.value) // 3
 * ```
 *
 * @param source - A getter, an existing ref, a non-function value, or a
 *                 reactive object to create a property ref from.
 * @param [key] - (optional) Name of the property in the reactive object.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#toref}
 * `toRef` 函数用于将值转换为引用类型（Ref）。

- 如果传入的 `value` 是一个函数类型，则返回一个只读的引用类型 `Readonly<Ref<R>>`，其中 `R` 是函数返回值的类型。
- 如果传入的 `value` 已经是一个引用类型（Ref），则直接返回该引用类型。
- 如果传入的 `value` 是一个对象类型，并提供了 `key` 参数，则返回该对象属性的引用类型 `ToRef<T[K]>`。
- 如果传入的 `value` 是一个对象类型，并提供了 `key` 和 `defaultValue` 参数，则返回该对象属性的引用类型，且将 `undefined` 排除在外 `ToRef<Exclude<T[K], undefined>>`。
- 如果传入的 `value` 不符合上述条件，则将其转换为引用类型 `Ref<UnwrapRef<T>>`。

以下是 `toRef` 函数的示例用法：

```typescript
const obj = reactive({ x: 5 });
const refX = toRef(obj, 'x');
console.log(refX.value); // 输出: 5

const refNum = toRef(10);
console.log(refNum.value); // 输出: 10

const refObj = toRef(() => ({ x: 5 }));
console.log(refObj.value); // 输出: { x: 5 }
```

在上述示例中，我们使用 `toRef` 函数将普通值、对象属性和函数转换为对应的引用类型，以便在响应式系统中使用。
 */
export function toRef<T>(
  value: T
): T extends () => infer R
  ? Readonly<Ref<R>>
  : T extends Ref
  ? T
  : Ref<UnwrapRef<T>>
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): ToRef<T[K]>
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
  defaultValue: T[K]
): ToRef<Exclude<T[K], undefined>>
export function toRef(
  source: Record<string, any> | MaybeRef,
  key?: string,
  defaultValue?: unknown
): Ref {
  if (isRef(source)) {
    return source
  } else if (isFunction(source)) {
    return new GetterRefImpl(source) as any
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key!, defaultValue)
  } else {
    return ref(source)
  }
}
/**
 * 
 * @param source 
 * @param key 
 * @param defaultValue 
 * @returns 
 * `propertyToRef` 函数是 `toRef` 函数的辅助函数，用于为对象中的特定键创建属性引用（ObjectRefImpl）。

它接受以下参数：
- `source`：要从中创建属性引用的源对象。
- `key`：要创建引用的属性键。
- `defaultValue`（可选）：如果属性值为 `undefined` 时要使用的默认值。

该函数会检查属性值是否已经是一个引用（`isRef(val)`）。如果是引用，则直接返回该值。否则，它会使用源对象、属性键和默认值（如果提供）创建一个新的 `ObjectRefImpl` 实例。

以下是 `propertyToRef` 函数的示例用法：

```typescript
const obj = { x: 5 };
const refX = propertyToRef(obj, 'x');
console.log(refX.value); // 输出：5

const refY = propertyToRef(obj, 'y', 10);
console.log(refY.value); // 输出：10
```

在示例中，我们使用 `propertyToRef` 为 `obj` 对象的 `x` 属性创建了一个属性引用（`refX`）。我们可以通过 `value` 属性访问引用的值。如果属性不存在或为 `undefined`，我们可以在创建引用时提供一个默认值（`10`）（如 `refY` 的创建）。
 */
function propertyToRef(
  source: Record<string, any>,
  key: string,
  defaultValue?: unknown
) {
  const val = source[key]
  return isRef(val)
    ? val
    : (new ObjectRefImpl(source, key, defaultValue) as any)
}

// corner case when use narrows type
// Ex. type RelativePath = string & { __brand: unknown }
// RelativePath extends object -> true
/**
 * `BaseTypes` 是一个类型别名，用于表示基本类型。它包括 `string`、`number` 和 `boolean` 这三种基本类型。

在 TypeScript 中，可以使用 `BaseTypes` 来限制一个变量或参数的类型，以确保它只能是这三种基本类型之一。例如：

```typescript
function processValue(value: BaseTypes) {
  // 在这里可以安全地处理基本类型的值
}

processValue("Hello"); // 正确
processValue(42); // 正确
processValue(true); // 正确
processValue([1, 2, 3]); // 错误，不是基本类型
processValue({ name: "John" }); // 错误，不是基本类型
```

在上面的示例中，`processValue` 函数的参数 `value` 的类型被限制为 `BaseTypes`，因此只能接受 `string`、`number` 和 `boolean` 类型的值。传递其他类型的值会导致编译错误。
 */
type BaseTypes = string | number | boolean

/**
 * This is a special exported interface for other packages to declare
 * additional types that should bail out for ref unwrapping. For example
 * \@vue/runtime-dom can declare it like so in its d.ts:
 *
 * ``` ts
 * declare module '@vue/reactivity' {
 *   export interface RefUnwrapBailTypes {
 *     runtimeDOMBailTypes: Node | Window
 *   }
 * }
 * ```
 * `RefUnwrapBailTypes` 是一个空接口，用于定义在解包（unwrap）引用类型时可能引发错误的类型。

在 Vue 3 中，`Ref` 类型可以包装任何类型的值，包括对象、数组、函数等。但是在某些情况下，尝试解包某些特定类型的引用可能会引发错误。为了处理这种情况，可以通过扩展 `RefUnwrapBailTypes` 接口并定义特定类型来排除它们的解包。

例如，如果你想排除解包函数类型的引用，可以将 `RefUnwrapBailTypes` 扩展为 `{ __unrefTypes: Function }`：

```typescript
interface RefUnwrapBailTypes {
  __unrefTypes: Function;
}
```

然后，在解包引用类型时，可以使用 `RefUnwrapBailTypes` 来排除某些类型的解包操作，以避免潜在的错误。

```typescript
function unwrapRef<T>(ref: T): T extends Ref<any> ? UnwrapRef<T> : T {
  if (isRef(ref)) {
    // 排除解包函数类型的引用
    if (typeof ref.value === 'function') {
      throw new Error('Cannot unwrap ref of function type');
    }
    return ref.value as UnwrapRef<T>;
  }
  return ref;
}
```

通过扩展 `RefUnwrapBailTypes` 接口并在解包时进行类型检查，可以增加代码的健壮性，避免解包引发不可预料的错误。
 */
export interface RefUnwrapBailTypes {}
/**
 * `ShallowUnwrapRef<T>` 是一个用于浅层解包（unwrap）`Ref` 类型的工具类型。它会遍历 `T` 的每个属性，并根据属性的类型进行解包操作。

- 如果属性类型是 `Ref<V>`，则将其解包为 `V`。
- 如果属性类型是 `Ref<V> | undefined`，则根据 `V` 的类型进行判断：
  - 如果 `V` 是 `unknown`，表示它不是 `Ref` 类型，因此将返回 `undefined`。
  - 如果 `V` 不是 `unknown`，则返回 `V` 或 `undefined`。
- 如果属性类型不是 `Ref` 类型，则保持原样。

这样，`ShallowUnwrapRef<T>` 可以将对象类型 `T` 中的 `Ref` 类型进行浅层解包，获取其值的类型，并保留其他属性的类型。

例如，对于以下类型：

```typescript
interface Person {
  name: Ref<string>;
  age: Ref<number> | undefined;
  isActive: boolean;
}
```

`ShallowUnwrapRef<Person>` 将返回：

```typescript
{
  name: string;
  age: number | undefined;
  isActive: boolean;
}
```

通过使用 `ShallowUnwrapRef<T>`，可以方便地获取对象中 `Ref` 类型属性的解包值类型，并保留其他属性的原始类型。
 */
export type ShallowUnwrapRef<T> = {
  [K in keyof T]: T[K] extends Ref<infer V>
    ? V // if `V` is `unknown` that means it does not extend `Ref` and is undefined
    : T[K] extends Ref<infer V> | undefined
    ? unknown extends V
      ? undefined
      : V | undefined
    : T[K]
}
/**
 * `UnwrapRef<T>` 是一个用于完全解包（unwrap）`Ref` 类型的工具类型。它会根据 `T` 的类型进行判断，并执行相应的解包操作。

- 如果 `T` 是 `ShallowRef<V>` 类型，那么返回 `V`，即进行浅层解包。
- 如果 `T` 是 `Ref<V>` 类型，那么会继续递归地对 `V` 进行解包，直到解包到基本类型为止。
- 如果 `T` 不是 `Ref` 类型，那么直接返回 `T`。

这样，`UnwrapRef<T>` 可以递归地解包 `Ref` 类型，直到获取到最终的基本类型。

例如，对于以下类型：

```typescript
type PersonRef = {
  name: Ref<string>;
  age: Ref<number>;
};

type UnwrappedPerson = UnwrapRef<PersonRef>;
```

`UnwrappedPerson` 将返回：

```typescript
type UnwrappedPerson = {
  name: string;
  age: number;
};
```

通过使用 `UnwrapRef<T>`，可以方便地获取 `Ref` 类型的完全解包值类型，并将其转换为原始类型。
 */
export type UnwrapRef<T> = T extends ShallowRef<infer V>
  ? V
  : T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>
/**
 * `UnwrapRefSimple<T>` 是一个用于简单解包（unwrap）`Ref` 类型的工具类型。它会根据 `T` 的类型进行判断，并执行相应的解包操作。

- 如果 `T` 是函数类型、`CollectionTypes`（集合类型）、`BaseTypes`（基本类型）、`Ref` 类型、`RefUnwrapBailTypes` 中的某个键对应的类型、或者包含 `{ [RawSymbol]?: true }` 属性的对象类型，那么直接返回 `T`，不进行解包操作。
- 如果 `T` 是只读数组类型（`ReadonlyArray<any>`），那么递归地对数组元素进行解包，返回解包后的数组类型。
- 如果 `T` 是一个对象类型，并且不包含 `{ [ShallowReactiveMarker]?: never }` 属性，那么递归地对对象的属性进行解包，返回解包后的对象类型。如果属性是符号类型（symbol），则保持原样，否则对属性值进行解包操作。
- 如果 `T` 不满足以上条件，直接返回 `T`。

这样，`UnwrapRefSimple<T>` 可以对包含 `Ref` 类型的对象进行简单解包，但不会递归地解包集合类型和深层嵌套的对象类型。

请注意，`UnwrapRefSimple<T>` 是 `UnwrapRef<T>` 的一部分，用于处理一些特定的类型，而 `UnwrapRef<T>` 则提供了更全面的解包能力。

例子：

```typescript
type PersonRef = {
  name: Ref<string>;
  age: Ref<number>;
  friends: ReadonlyArray<Ref<string>>;
};

type UnwrappedPerson = UnwrapRefSimple<PersonRef>;
```

`UnwrappedPerson` 将返回：

```typescript
type UnwrappedPerson = {
  name: string;
  age: number;
  friends: string[];
};
```

通过使用 `UnwrapRefSimple<T>`，可以对包含 `Ref` 类型的对象进行简单解包操作，得到包含原始类型的对象类型。
 */
export type UnwrapRefSimple<T> = T extends
  | Function
  | CollectionTypes
  | BaseTypes
  | Ref
  | RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
  | { [RawSymbol]?: true }
  ? T
  : T extends ReadonlyArray<any>
  ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
  : T extends object & { [ShallowReactiveMarker]?: never }
  ? {
      [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>
    }
  : T
