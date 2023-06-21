import { isObject, toRawType, def } from '@vue/shared'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers
} from './baseHandlers'
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers
} from './collectionHandlers'
import type { UnwrapRefSimple, Ref, RawSymbol } from './ref'
/**
 * `ReactiveFlags` 是一个常量枚举（constant enum），用于表示响应式标识符。它包含五个枚举成员：

- `SKIP`: 在响应式转换过程中用于跳过标记的特殊标识符。
- `IS_REACTIVE`: 表示对象是否为响应式对象的标识符。
- `IS_READONLY`: 表示对象是否为只读响应式对象的标识符。
- `IS_SHALLOW`: 表示对象是否为浅响应式对象的标识符。
- `RAW`: 原始对象的属性访问标识符。

这些标识符用于在响应式系统中标记对象的属性，并在访问和修改属性时进行相应的处理。例如，`IS_REACTIVE` 标识符用于表示对象是否为响应式对象，`IS_READONLY` 标识符用于表示对象是否为只读响应式对象。这些标识符帮助系统在运行时进行属性访问和修改的控制和管理。
 */
export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw'
}
/**
 * `Target` 接口定义了一个对象类型，该对象可以包含响应式相关的标识符属性。它包含了以下属性：

- `[ReactiveFlags.SKIP]?: boolean`: 表示是否跳过响应式转换的标识符属性。
- `[ReactiveFlags.IS_REACTIVE]?: boolean`: 表示对象是否为响应式对象的标识符属性。
- `[ReactiveFlags.IS_READONLY]?: boolean`: 表示对象是否为只读响应式对象的标识符属性。
- `[ReactiveFlags.IS_SHALLOW]?: boolean`: 表示对象是否为浅响应式对象的标识符属性。
- `[ReactiveFlags.RAW]?: any`: 原始对象的属性访问标识符属性。

这些属性可以在对象上进行设置和访问，用于在响应式系统中标记和管理对象的响应式行为。
 */
export interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}
/**
 * reactiveMap 是一个 WeakMap 类型的变量，用于存储目标对象和其对应的响应式代理对象之间的映射关系。

在响应式系统中，当我们使用 reactive 函数将一个目标对象转换为响应式对象时，会创建一个新的响应式代理对象。这个代理对象会与目标对象建立映射关系，并存储在 reactiveMap 中。

WeakMap 是一种特殊的映射数据结构，它的键是弱引用的，即当目标对象被垃圾回收时，相应的映射关系也会自动被清除，以避免内存泄漏。

通过 reactiveMap，可以快速查找目标对象对应的响应式代理对象，以实现对响应式对象的访问和操作。
 */
export const reactiveMap = new WeakMap<Target, any>()
/**
 * shallowReactiveMap 是一个 WeakMap 类型的变量，用于存储目标对象和其对应的浅层响应式代理对象之间的映射关系。

在响应式系统中，浅层响应式代理对象与普通响应式代理对象相比，对于嵌套的属性只进行浅层代理，即不会对嵌套属性进行递归地转换为响应式对象。这样可以在一定程度上减少响应式转换的开销。

当我们使用 shallowReactive 函数将一个目标对象转换为浅层响应式对象时，会创建一个新的浅层响应式代理对象。这个代理对象会与目标对象建立映射关系，并存储在 shallowReactiveMap 中。

与 reactiveMap 类似，shallowReactiveMap 也是一个 WeakMap，它的键是弱引用的，当目标对象被垃圾回收时，相应的映射关系也会自动被清除，以避免内存泄漏。

通过 shallowReactiveMap，可以快速查找目标对象对应的浅层响应式代理对象，以实现对浅层响应式对象的访问和操作。
 */
export const shallowReactiveMap = new WeakMap<Target, any>()
/**
 * readonlyMap 是一个 WeakMap 类型的变量，用于存储目标对象和其对应的只读代理对象之间的映射关系。

在响应式系统中，只读代理对象是一种特殊类型的代理对象，它只允许对目标对象进行读取操作，而禁止进行写入操作。当我们使用 readonly 函数将一个目标对象转换为只读代理对象时，会创建一个新的只读代理对象。这个代理对象会与目标对象建立映射关系，并存储在 readonlyMap 中。

与 reactiveMap 和 shallowReactiveMap 类似，readonlyMap 也是一个 WeakMap，它的键是弱引用的，当目标对象被垃圾回收时，相应的映射关系也会自动被清除，以避免内存泄漏。

通过 readonlyMap，可以快速查找目标对象对应的只读代理对象，以实现对只读代理对象的访问和操作。只读代理对象提供了一种保护目标对象不被修改的机制，常用于确保数据的不可变性或只读访问的场景。
 */
export const readonlyMap = new WeakMap<Target, any>()
/**
 * 
shallowReadonlyMap 是一个 WeakMap 类型的变量，用于存储目标对象和其对应的浅层只读代理对象之间的映射关系。

在响应式系统中，浅层只读代理对象是一种特殊类型的代理对象，它只允许对目标对象进行读取操作，而禁止进行写入操作。与深层只读代理对象不同，浅层只读代理对象只会代理目标对象的第一层属性，而不会递归地代理嵌套属性。当我们使用 shallowReadonly 函数将一个目标对象转换为浅层只读代理对象时，会创建一个新的浅层只读代理对象。这个代理对象会与目标对象建立映射关系，并存储在 shallowReadonlyMap 中。

与 reactiveMap、shallowReactiveMap 和 readonlyMap 类似，shallowReadonlyMap 也是一个 WeakMap，它的键是弱引用的，当目标对象被垃圾回收时，相应的映射关系也会自动被清除，以避免内存泄漏。

通过 shallowReadonlyMap，可以快速查找目标对象对应的浅层只读代理对象，以实现对浅层只读代理对象的访问和操作。浅层只读代理对象提供了一种保护目标对象不被修改的机制，并仅限于对第一层属性的只读访问。这在某些情况下可以提高性能，并减少不必要的代理操作。
 */
export const shallowReadonlyMap = new WeakMap<Target, any>()
/**
 * `TargetType` 是一个 `const enum` 类型的枚举，用于表示目标对象的类型。

它包含以下枚举成员：

- `INVALID`：表示无效的目标类型，值为 `0`。
- `COMMON`：表示常规的目标类型，值为 `1`。
- `COLLECTION`：表示集合类型的目标，值为 `2`。

这些枚举成员用于在响应式系统中区分不同类型的目标对象。通过判断目标对象的类型，可以确定在触发追踪或触发效应时所采取的操作。例如，对于常规类型的目标对象，可能需要追踪属性的访问和变化；对于集合类型的目标对象，可能需要追踪集合操作（如添加、删除等）的变化。

使用 `TargetType` 枚举可以提高代码的可读性和可维护性，使得对不同类型目标对象的处理更加清晰和一致。
 */
const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}
/**
 * 
 * @param rawType 
 * @returns 
 * targetTypeMap 函数用于将原始类型 rawType 转换为相应的 TargetType 值。

根据传入的 rawType 值，函数使用 switch 语句进行匹配，将不同的类型映射到相应的 TargetType 值。具体映射规则如下：

如果 rawType 是 'Object' 或 'Array'，则返回 TargetType.COMMON，表示常规类型的目标对象。
如果 rawType 是 'Map'、'Set'、'WeakMap' 或 'WeakSet'，则返回 TargetType.COLLECTION，表示集合类型的目标对象。
对于其他情况，即无法识别的类型，返回 TargetType.INVALID，表示无效的目标类型。
通过调用 targetTypeMap 函数，可以根据原始类型来获取对应的目标类型，从而在响应式系统中进行相应的处理和操作。
 */
function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}
/**
 * 
 * @param value 
 * @returns 
 * `getTargetType` 函数用于获取目标对象的类型，根据传入的 `value` 值进行判断。

首先，函数会检查目标对象的 `ReactiveFlags.SKIP` 属性是否存在，如果存在且为真值（truthy），则返回 `TargetType.INVALID`，表示无效的目标类型。

接着，函数会使用 `Object.isExtensible` 方法判断目标对象是否可扩展。如果目标对象不可扩展，也会返回 `TargetType.INVALID`。

最后，如果以上条件都不满足，则调用 `toRawType` 函数获取目标对象的原始类型，并将该原始类型传入 `targetTypeMap` 函数进行映射，得到相应的 `TargetType` 值。

通过调用 `getTargetType` 函数，可以根据目标对象的特性和原始类型来获取目标对象的具体类型。
 */
function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

// only unwrap nested ref
/**
 * `UnwrapNestedRefs<T>` 是一个条件类型，用于获取嵌套引用类型 `T` 的解套类型。

如果 `T` 是一个 `Ref` 类型，则直接返回 `T`，因为 `Ref` 类型本身就是一个解套类型。

否则，如果 `T` 是一个普通类型（非 `Ref` 类型），则调用 `UnwrapRefSimple<T>` 来获取其解套类型。

`UnwrapRefSimple<T>` 是一个递归类型，用于逐层解套嵌套的引用类型。它会判断 `T` 是否为一个对象类型，如果是，则会递归遍历对象的属性，并将每个属性的值解套。最终返回解套后的类型。

通过使用 `UnwrapNestedRefs<T>` 类型，可以确保对于嵌套引用类型，最终获取到的类型是其解套后的类型。
 */
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>

/**
 * Returns a reactive proxy of the object.
 *
 * The reactive conversion is "deep": it affects all nested properties. A
 * reactive object also deeply unwraps any properties that are refs while
 * maintaining reactivity.
 *
 * @example
 * ```js
 * const obj = reactive({ count: 0 })
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-core.html#reactive}
 */
/**
 * reactive 函数是一个重载函数，用于将一个对象转换为响应式对象。

第一个重载函数签名是 reactive<T extends object>(target: T): UnwrapNestedRefs<T>，表示当目标对象是一个普通对象时的情况。这个重载函数使用了类型参数 T，表示目标对象的类型。返回类型是 UnwrapNestedRefs<T>，表示对目标对象进行递归解套，获取其非嵌套的引用类型。

第二个重载函数签名是 reactive(target: object)，表示当目标对象是一个普通对象之外的其他类型（例如数组、函数等）时的情况。这个重载函数没有返回类型注解，默认返回类型是 any。

函数内部首先检查目标对象是否为只读代理对象（通过 isReadonly 函数判断）。如果是只读代理对象，则直接返回该对象，因为只读对象不需要再进行响应式转换。

如果目标对象不是只读对象，则调用 createReactiveObject 函数来创建响应式对象。该函数接受目标对象、是否浅层响应式标志（这里传入 false 表示进行深层响应式转换）、可变属性处理器（mutableHandlers）、可变集合属性处理器（mutableCollectionHandlers）和响应式对象映射表（reactiveMap）作为参数。

createReactiveObject 函数根据目标对象的类型，选择不同的处理器来处理属性访问和修改。对于普通对象和数组对象，使用 mutableHandlers 处理器，对于集合对象（Map、Set、WeakMap、WeakSet），使用 mutableCollectionHandlers 处理器。该函数会返回一个响应式代理对象。

最后，将创建的响应式对象返回作为函数的结果。在第一个重载函数中，对目标对象进行了类型限制，并通过 UnwrapNestedRefs<T> 对目标对象进行递归解套，获取其非嵌套的引用类型。
 */
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}
/**
 * ShallowReactiveMarker 是一个独特的符号（unique symbol），用于标记一个对象已经被浅层响应式化。

在 Vue.js 的响应式系统中，当调用 shallowReactive 函数将一个对象转换为浅层响应式对象时，会在该对象上添加一个属性，并使用 ShallowReactiveMarker 作为属性名。这个属性的值可以是任意值，它的存在表示对象已经被浅层响应式化。

这个符号的作用在于提供一个特殊的标记，用于判断一个对象是否已经被浅层响应式化，以避免重复处理。通过这个标记，可以在处理响应式对象时快速检查对象是否已经是浅层响应式对象，避免重复转换。

需要注意的是，ShallowReactiveMarker 只是一个符号，它本身不会对对象产生任何实际的影响，而是作为一个标记使用。
 */
export declare const ShallowReactiveMarker: unique symbol
/**
 * ShallowReactive<T> 是一个类型别名，用于表示一个浅层响应式对象。

在 Vue.js 的响应式系统中，当调用 shallowReactive 函数将一个对象转换为浅层响应式对象时，会使用 ShallowReactive<T> 类型别名来定义返回值的类型。它表示一个类型 T 的对象，并额外具有一个可选的属性 [ShallowReactiveMarker]，其值为 true。这个额外的属性用于标记对象已经被浅层响应式化。

通过 ShallowReactive<T> 类型别名，可以在 TypeScript 中对浅层响应式对象进行类型推断和静态类型检查。它保留了原始对象的类型信息，并添加了标记属性，以表示对象的响应式特性。

需要注意的是，ShallowReactive<T> 只是一个类型别名，它本身不会对对象产生任何实际的影响，而是作为一个类型约束使用。在编写代码时，可以使用 ShallowReactive<T> 来声明变量、函数参数或函数返回类型，以明确表达对象是一个浅层响应式对象。
 */
export type ShallowReactive<T> = T & { [ShallowReactiveMarker]?: true }

/**
 * Shallow version of {@link reactive()}.
 *
 * Unlike {@link reactive()}, there is no deep conversion: only root-level
 * properties are reactive for a shallow reactive object. Property values are
 * stored and exposed as-is - this also means properties with ref values will
 * not be automatically unwrapped.
 *
 * @example
 * ```js
 * const state = shallowReactive({
 *   foo: 1,
 *   nested: {
 *     bar: 2
 *   }
 * })
 *
 * // mutating state's own properties is reactive
 * state.foo++
 *
 * // ...but does not convert nested objects
 * isReactive(state.nested) // false
 *
 * // NOT reactive
 * state.nested.bar++
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowreactive}
 */
/**
 * shallowReactive 函数是用于将一个对象转换为浅层响应式对象的工具函数。它接受一个类型为 T 的目标对象 target，并返回一个 ShallowReactive<T> 类型的对象，即浅层响应式对象。

在实现中，shallowReactive 函数调用了 createReactiveObject 函数，传递了适当的参数来创建浅层响应式对象。具体而言，它使用 shallowReactiveHandlers 和 shallowCollectionHandlers 作为处理程序，以及 shallowReactiveMap 作为 WeakMap 对象，用于跟踪对象的代理和原始对象之间的映射关系。

shallowReactive 函数的作用是创建一个浅层响应式对象，它只会对目标对象的第一层属性进行响应式转换，而不会递归地对嵌套对象进行转换。这意味着嵌套对象的属性不会被代理为响应式属性，而是保留了原始的引用关系。

通过使用 shallowReactive 函数，可以在 Vue.js 的响应式系统中创建浅层响应式对象，从而实现对目标对象的浅层响应式监听和变更跟踪。
 */
export function shallowReactive<T extends object>(
  target: T
): ShallowReactive<T> {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}
/**
 * Primitive 是一个 TypeScript 类型别名，用于表示原始类型。它包含以下几种类型：

string: 字符串类型
number: 数字类型
boolean: 布尔类型
bigint: 大整数类型
symbol: 符号类型
undefined: 未定义类型
null: 空值类型
这些类型都是 JavaScript 中的原始数据类型，它们是不可变的，并且在比较时是按值进行比较。在 TypeScript 中，可以使用 Primitive 类型来约束变量或函数参数，以表示它们只能是这些原始类型中的一种。
 */
type Primitive = string | number | boolean | bigint | symbol | undefined | null
/**
 * `Builtin` 是一个 TypeScript 类型别名，用于表示内置类型。它包含以下几种类型：

- `Primitive`: 原始类型，包括 `string`、`number`、`boolean`、`bigint`、`symbol`、`undefined` 和 `null`。
- `Function`: 函数类型。
- `Date`: 日期类型。
- `Error`: 错误类型。
- `RegExp`: 正则表达式类型。

这些类型都是 JavaScript 中的内置类型，用于表示常见的数据结构和值。在 TypeScript 中，可以使用 `Builtin` 类型来约束变量或函数参数，以表示它们只能是这些内置类型中的一种。
 */
type Builtin = Primitive | Function | Date | Error | RegExp
/**
 * DeepReadonly<T> 是一个 TypeScript 类型别名，用于将给定类型 T 转换为深度只读（deep readonly）类型。它会递归地将对象及其嵌套属性都设为只读。

该类型别名使用了条件类型和映射类型，对不同类型进行了不同的处理:

如果 T 是基本类型（Builtin），则直接返回 T，因为基本类型已经是只读的。
如果 T 是 Map 类型，将其转换为 ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>，其中 K 和 V 是 Map 的键和值的类型，并且它们都递归地应用了 DeepReadonly。
如果 T 是 ReadonlyMap 类型，同样转换为 ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>。
如果 T 是 WeakMap 类型，转换为 WeakMap<DeepReadonly<K>, DeepReadonly<V>>。
如果 T 是 Set 类型，转换为 ReadonlySet<DeepReadonly<U>>，其中 U 是 Set 的元素类型，并且递归地应用了 DeepReadonly。
如果 T 是 ReadonlySet 类型，同样转换为 ReadonlySet<DeepReadonly<U>>。
如果 T 是 WeakSet 类型，转换为 WeakSet<DeepReadonly<U>>。
如果 T 是 Promise 类型，转换为 Promise<DeepReadonly<U>>，其中 U 是 Promise 的泛型参数，并且递归地应用了 DeepReadonly。
如果 T 是 Ref 类型，转换为 Readonly<Ref<DeepReadonly<U>>>，其中 U 是 Ref 的泛型参数，并且递归地应用了 DeepReadonly。
如果 T 是一个对象字面量类型，将对象的每个属性设为只读，并且递归地应用了 DeepReadonly。
否则，将 T 设为只读类型 Readonly<T>。
通过使用 DeepReadonly<T> 类型别名，可以确保将给定类型及其嵌套属性都设为只读，从而实现深度只读的效果。
 */
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepReadonly<U>>
  : T extends Promise<infer U>
  ? Promise<DeepReadonly<U>>
  : T extends Ref<infer U>
  ? Readonly<Ref<DeepReadonly<U>>>
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>

/**
 * Takes an object (reactive or plain) or a ref and returns a readonly proxy to
 * the original.
 *
 * A readonly proxy is deep: any nested property accessed will be readonly as
 * well. It also has the same ref-unwrapping behavior as {@link reactive()},
 * except the unwrapped values will also be made readonly.
 *
 * @example
 * ```js
 * const original = reactive({ count: 0 })
 *
 * const copy = readonly(original)
 *
 * watchEffect(() => {
 *   // works for reactivity tracking
 *   console.log(copy.count)
 * })
 *
 * // mutating original will trigger watchers relying on the copy
 * original.count++
 *
 * // mutating the copy will fail and result in a warning
 * copy.count++ // warning!
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-core.html#readonly}
 * readonly 函数是一个工具函数，用于将给定的目标对象转换为深度只读（deep readonly）对象。它使用了 createReactiveObject 函数来创建只读对象。
 * 函数接受一个目标对象 target，并返回一个深度只读对象。

在函数内部，它使用了 createReactiveObject 函数，并传入了 readonlyHandlers、readonlyCollectionHandlers 和 readonlyMap 作为参数。这些参数指定了只读对象的处理程序和映射。

最终，函数返回的结果类型是 DeepReadonly<UnwrapNestedRefs<T>>，即目标对象的深度只读类型。UnwrapNestedRefs<T> 用于解包嵌套的引用类型，确保目标对象的引用属性也是只读的。

通过调用 readonly 函数，可以将目标对象转换为深度只读对象，从而保护对象的属性不被修改。
 */
export function readonly<T extends object>(
  target: T
): DeepReadonly<UnwrapNestedRefs<T>> {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  )
}

/**
 * Shallow version of {@link readonly()}.
 *
 * Unlike {@link readonly()}, there is no deep conversion: only root-level
 * properties are made readonly. Property values are stored and exposed as-is -
 * this also means properties with ref values will not be automatically
 * unwrapped.
 *
 * @example
 * ```js
 * const state = shallowReadonly({
 *   foo: 1,
 *   nested: {
 *     bar: 2
 *   }
 * })
 *
 * // mutating state's own properties will fail
 * state.foo++
 *
 * // ...but works on nested objects
 * isReadonly(state.nested) // false
 *
 * // works
 * state.nested.bar++
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowreadonly}
 * shallowReadonly 函数是一个工具函数，用于将给定的目标对象转换为浅只读（shallow readonly）对象。它使用了 createReactiveObject 函数来创建只读对象。
 * 函数接受一个目标对象 target，并返回一个浅只读对象，该对象的属性是只读的。

在函数内部，它使用了 createReactiveObject 函数，并传入了 shallowReadonlyHandlers、shallowReadonlyCollectionHandlers 和 shallowReadonlyMap 作为参数。这些参数指定了浅只读对象的处理程序和映射。

最终，函数返回的结果类型是 Readonly<T>，即目标对象的只读类型。

通过调用 shallowReadonly 函数，可以将目标对象转换为浅只读对象，从而保护对象的属性不被修改。需要注意的是，浅只读对象只保护对象的一级属性，而不会递归地保护嵌套对象的属性。
 */
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  )
}
/**
 * 
 * @param target 
 * @param isReadonly 
 * @param baseHandlers 
 * @param collectionHandlers 
 * @param proxyMap 
 * @returns 
 * createReactiveObject 函数是一个辅助函数，用于创建响应式对象。它接受多个参数，包括目标对象 target、是否只读 isReadonly、基础处理程序 baseHandlers、集合处理程序 collectionHandlers 和代理映射 proxyMap。

函数的作用是根据不同的情况创建代理对象，实现对象的响应式。下面是函数的主要逻辑：

首先，判断目标对象是否为非对象类型，如果是，则直接返回目标对象。如果开发模式下，会输出警告信息。

然后，判断目标对象是否已经是一个代理对象，并且不是只读的响应式对象。如果是，则直接返回目标对象。

接下来，检查是否已经存在对应的代理对象，如果存在，则直接返回该代理对象。

根据目标对象的类型，获取目标对象的类型标识。如果目标对象的类型无效，则直接返回目标对象。

创建代理对象，使用 Proxy 构造函数，并根据目标对象的类型选择相应的处理程序（基础处理程序或集合处理程序）。

将目标对象和代理对象存储到代理映射 proxyMap 中。

返回代理对象。

通过调用 createReactiveObject 函数，可以将目标对象转换为相应的代理对象，实现对象的响应式。代理对象会拦截对目标对象的读取、修改等操作，并触发相应的响应式效果。
 */
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  // target already has corresponding Proxy
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  // only specific value types can be observed.
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
}

/**
 * Checks if an object is a proxy created by {@link reactive()} or
 * {@link shallowReactive()} (or {@link ref()} in some cases).
 *
 * @example
 * ```js
 * isReactive(reactive({}))            // => true
 * isReactive(readonly(reactive({})))  // => true
 * isReactive(ref({}).value)           // => true
 * isReactive(readonly(ref({})).value) // => true
 * isReactive(ref(true))               // => false
 * isReactive(shallowRef({}).value)    // => false
 * isReactive(shallowReactive({}))     // => true
 * ```
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreactive}
 * `isReactive` 函数用于判断一个值是否为响应式对象。函数接受一个参数 `value`，表示要判断的值。

函数的主要逻辑如下：

1. 首先，通过调用 `isReadonly` 函数检查值是否为只读的响应式对象。如果是只读的响应式对象，则递归调用 `isReactive` 函数，并传入原始的非只读值（`value[ReactiveFlags.RAW]`）进行判断。

2. 如果值存在，并且具有 `ReactiveFlags.IS_REACTIVE` 标志，则返回 `true`，表示该值是一个响应式对象。

3. 如果以上条件都不满足，则返回 `false`，表示该值不是一个响应式对象。

通过调用 `isReactive` 函数，可以判断一个值是否为响应式对象。如果值是只读的响应式对象，则会判断其原始的非只读值。
 */
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

/**
 * Checks whether the passed value is a readonly object. The properties of a
 * readonly object can change, but they can't be assigned directly via the
 * passed object.
 *
 * The proxies created by {@link readonly()} and {@link shallowReadonly()} are
 * both considered readonly, as is a computed ref without a set function.
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreadonly}
 * isReadonly 函数用于判断一个值是否为只读的响应式对象。函数接受一个参数 value，表示要判断的值。

函数的逻辑很简单：

首先，检查值是否存在，并且具有 ReactiveFlags.IS_READONLY 标志。

如果以上条件满足，则返回 true，表示该值是一个只读的响应式对象。

如果以上条件不满足，则返回 false，表示该值不是一个只读的响应式对象。

通过调用 isReadonly 函数，可以判断一个值是否为只读的响应式对象。
 */
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}
/**
 * 
 * @param value isShallow 函数用于判断一个值是否为浅层响应式对象。函数接受一个参数 value，表示要判断的值。

函数的逻辑也很简单：

首先，检查值是否存在，并且具有 ReactiveFlags.IS_SHALLOW 标志。

如果以上条件满足，则返回 true，表示该值是一个浅层响应式对象。

如果以上条件不满足，则返回 false，表示该值不是一个浅层响应式对象。

通过调用 isShallow 函数，可以判断一个值是否为浅层响应式对象。
 * @returns 
 */
export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

/**
 * Checks if an object is a proxy created by {@link reactive},
 * {@link readonly}, {@link shallowReactive} or {@link shallowReadonly()}.
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isproxy}
 */
export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}

/**
 * Returns the raw, original object of a Vue-created proxy.
 *
 * `toRaw()` can return the original object from proxies created by
 * {@link reactive()}, {@link readonly()}, {@link shallowReactive()} or
 * {@link shallowReadonly()}.
 *
 * This is an escape hatch that can be used to temporarily read without
 * incurring proxy access / tracking overhead or write without triggering
 * changes. It is **not** recommended to hold a persistent reference to the
 * original object. Use with caution.
 *
 * @example
 * ```js
 * const foo = {}
 * const reactiveFoo = reactive(foo)
 *
 * console.log(toRaw(reactiveFoo) === foo) // true
 * ```
 *
 * @param observed - The object for which the "raw" value is requested.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#toraw}
 */
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}

export type Raw<T> = T & { [RawSymbol]?: true }

/**
 * Marks an object so that it will never be converted to a proxy. Returns the
 * object itself.
 *
 * @example
 * ```js
 * const foo = markRaw({})
 * console.log(isReactive(reactive(foo))) // false
 *
 * // also works when nested inside other reactive objects
 * const bar = reactive({ foo })
 * console.log(isReactive(bar.foo)) // false
 * ```
 *
 * **Warning:** `markRaw()` together with the shallow APIs such as
 * {@link shallowReactive()} allow you to selectively opt-out of the default
 * deep reactive/readonly conversion and embed raw, non-proxied objects in your
 * state graph.
 *
 * @param value - The object to be marked as "raw".
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#markraw}
 */
export function markRaw<T extends object>(value: T): Raw<T> {
  def(value, ReactiveFlags.SKIP, true)
  return value
}

/**
 * Returns a reactive proxy of the given value (if possible).
 *
 * If the given value is not an object, the original value itself is returned.
 *
 * @param value - The value for which a reactive proxy shall be created.
 */
export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value

/**
 * Returns a readonly proxy of the given value (if possible).
 *
 * If the given value is not an object, the original value itself is returned.
 *
 * @param value - The value for which a readonly proxy shall be created.
 */
export const toReadonly = <T extends unknown>(value: T): T =>
  isObject(value) ? readonly(value) : value
