import { toRaw, ReactiveFlags, toReactive, toReadonly } from './reactive'
import { track, trigger, ITERATE_KEY, MAP_KEY_ITERATE_KEY } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { capitalize, hasOwn, hasChanged, toRawType, isMap } from '@vue/shared'

export type CollectionTypes = IterableCollections | WeakCollections
/**
 * 导出一个名为 CollectionTypes 的类型。它是由两个类型联合而成的：IterableCollections 和 WeakCollections。

IterableCollections 可以理解为可迭代的集合类型，它表示一组可以被迭代（遍历）的对象，例如数组、Set、Map 等。

WeakCollections 则代表弱引用的集合类型，这些集合类型不会阻止其成员对象被垃圾回收，主要包括 WeakSet 和 WeakMap。

通过将这两种类型联合在一起，CollectionTypes 提供了一个更广泛的集合类型范围，可以用于描述多种不同的集合数据结构。在 Vue 3 的源代码中，这个类型可能用于定义一些与集合相关的函数、方法或参数。
 */
type IterableCollections = Map<any, any> | Set<any>
/**
 * 这段代码定义了 WeakCollections 类型，它是由 WeakMap<any, any> 和 WeakSet<any> 两种类型联合而成的。

WeakMap 是 JavaScript 中的一种数据结构，它是一种键值对的集合，其中的键是弱引用的，这意味着当键不再被引用时，它可以被垃圾回收。WeakMap<any, any> 表示一个键和值可以是任意类型的弱引用键值对集合。

WeakSet 也是 JavaScript 中的一种数据结构，它是一组弱引用的对象的集合。与 WeakMap 类似，当对象不再被引用时，它可以被垃圾回收。WeakSet<any> 表示一个弱引用对象的集合，对象类型可以是任意类型。

通过将 WeakMap<any, any> 和 WeakSet<any> 联合在一起，WeakCollections 提供了一种描述弱引用集合类型的方式。在 Vue 3 的源代码中，这个类型可能用于表示一些需要使用弱引用的数据结构或算法。
 */
type WeakCollections = WeakMap<any, any> | WeakSet<any>
/**
 * 这段代码定义了 MapTypes 类型，它是由 Map<any, any> 和 WeakMap<any, any> 两种类型联合而成的。

Map 是 JavaScript 中的一种数据结构，它是一种键值对的集合，其中的键可以是任意类型，值也可以是任意类型。Map<any, any> 表示一个键和值可以是任意类型的键值对集合。

WeakMap 是 JavaScript 中的另一种数据结构，它也是一种键值对的集合，但是键是弱引用的。当键不再被引用时，它可以被垃圾回收。WeakMap<any, any> 表示一个键和值可以是任意类型的弱引用键值对集合。

通过将 Map<any, any> 和 WeakMap<any, any> 联合在一起，MapTypes 提供了一种描述键值对集合类型的方式。在 Vue 3 的源代码中，这个类型可能用于表示一些需要使用键值对数据结构的场景，可以是普通的 Map 或希望使用弱引用的 WeakMap。
 */
type MapTypes = Map<any, any> | WeakMap<any, any>
/**
 * 这段代码定义了 SetTypes 类型，它是由 Set<any> 和 WeakSet<any> 两种类型联合而成的。

Set 是 JavaScript 中的一种数据结构，它是一组唯一值的集合，其中的值可以是任意类型。Set<any> 表示一个值可以是任意类型的集合。

WeakSet 是 JavaScript 中的另一种数据结构，它也是一组值的集合，但是值是弱引用的。当值不再被引用时，它可以被垃圾回收。WeakSet<any> 表示一个值可以是任意类型的弱引用集合。

通过将 Set<any> 和 WeakSet<any> 联合在一起，SetTypes 提供了一种描述集合类型的方式。在 Vue 3 的源代码中，这个类型可能用于表示一些需要使用集合数据结构的场景，可以是普通的 Set 或希望使用弱引用的 WeakSet。
 */
type SetTypes = Set<any> | WeakSet<any>
/**
 * 
 * @param value 这段代码定义了一个名为 toShallow 的常量，它是一个泛型函数。该函数接受一个参数 value，并返回该参数的浅拷贝。

函数的类型签名 <T extends unknown>(value: T): T 表示 toShallow 是一个泛型函数，它可以适用于任意类型 T。参数 value 的类型为 T，并且函数返回值的类型也为 T。

函数体内部的实现非常简单，它直接将传入的参数 value 返回，实现了对传入值的浅拷贝。浅拷贝意味着返回的值是原始值的引用，而不是创建一个新的副本。因此，返回的值和原始值在内存中是共享的。

这个函数可能在某些场景下用于实现对传入值的简单拷贝操作，例如在需要创建对象或数组的浅拷贝副本时使用。
 * @returns 
 */
const toShallow = <T extends unknown>(value: T): T => value
/**
 * 
 * @param  这段代码定义了一个名为 getProto 的常量，它是一个泛型函数。该函数接受一个参数 v，该参数的类型必须是 CollectionTypes 中定义的类型之一，然后通过 Reflect.getPrototypeOf() 方法获取参数 v 的原型对象，并将其返回。

函数的类型签名 <T extends CollectionTypes>(v: T): any 表示 getProto 是一个泛型函数，它可以适用于任意满足 CollectionTypes 中定义的类型之一的类型 T。参数 v 的类型为 T，函数返回值的类型为 any。

函数体内部使用了 Reflect.getPrototypeOf() 方法，该方法用于获取一个对象的原型对象。它返回指定对象的原型，即该对象被创建时所继承的对象。

通过在 getProto 函数中使用 Reflect.getPrototypeOf(v)，我们可以获取参数 v 的原型对象，并将其作为函数的返回值。这个函数可能在某些场景下用于获取对象的原型，以便进行进一步的操作或分析。
 * @returns 
 */
const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v)
/**
 * 
 * @param target 
 * @param key 
 * @param isReadonly 
 * @param isShallow 
 * @returns 
 * 
这段代码是一个名为 get 的函数。该函数接受四个参数：target、key、isReadonly 和 isShallow。下面是对该函数的解释：

首先，将 target 转换为原始对象（非响应式对象），以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 toRaw 函数将 target 和 key 转换为它们的原始值，以确保获取的是原始对象或值。
如果 isReadonly 参数为 false（默认值），执行以下操作：
如果 key 不等于 rawKey，则调用 track 函数追踪 rawTarget 的 key 属性的读取操作。
调用 track 函数追踪 rawTarget 的 rawKey 属性的读取操作。
使用 getProto 函数获取 rawTarget 的原型对象，并将 has 方法提取出来，以便后续使用。
根据 isShallow 参数的值选择不同的 wrap 函数，如果为 true，则使用 toShallow 函数，否则根据 isReadonly 的值选择使用 toReadonly 或 toReactive 函数。
如果 rawTarget 中存在 key，则返回使用 wrap 函数包装后的 target.get(key) 的值。
如果 rawTarget 中不存在 key，但存在 rawKey，则返回使用 wrap 函数包装后的 target.get(rawKey) 的值。
如果 target 和 rawTarget 不相等，则说明 target 是只读的响应式对象，为了确保嵌套的响应式 Map 能够自行进行追踪操作，调用 target.get(key)。
总体而言，这个函数用于获取 MapTypes 对象中给定键 key 对应的值。它会进行一些响应式追踪的操作，并根据参数进行相应的包装处理，以返回相应的值。
 */
function get(
  target: MapTypes,
  key: unknown,
  isReadonly = false,
  isShallow = false
) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = (target as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, TrackOpTypes.GET, key)
    }
    track(rawTarget, TrackOpTypes.GET, rawKey)
  }
  const { has } = getProto(rawTarget)
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  } else if (target !== rawTarget) {
    // #3602 readonly(reactive(Map))
    // ensure that the nested reactive `Map` can do tracking for itself
    target.get(key)
  }
}
/**
 * 
 * @param this 
 * @param key 
 * @param isReadonly 
 * @returns 
 * 这段代码是一个名为 has 的函数。该函数是在 CollectionTypes 上下文中定义的方法，它接受两个参数：key 和 isReadonly（可选参数，默认为 false）。

以下是对该函数的解释：

首先，将 this 转换为原始对象 target，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 toRaw 函数将 target 和 key 转换为它们的原始值，以确保获取的是原始对象或值。
如果 isReadonly 参数为 false（默认值），执行以下操作：
如果 key 不等于 rawKey，则调用 track 函数追踪 rawTarget 的 key 属性的 has 操作。
调用 track 函数追踪 rawTarget 的 rawKey 属性的 has 操作。
返回一个布尔值，判断 key 是否等于 rawKey。如果相等，则调用 target.has(key) 返回结果；如果不相等，则调用 target.has(key) 或 target.has(rawKey)，只要其中一个返回 true，即可返回 true。
总体而言，这个函数用于判断 CollectionTypes 对象中是否存在给定的键 key。它会进行一些响应式追踪的操作，并根据参数进行相应的处理，最终返回一个布尔值表示是否存在该键。
 */
function has(this: CollectionTypes, key: unknown, isReadonly = false): boolean {
  const target = (this as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, TrackOpTypes.HAS, key)
    }
    track(rawTarget, TrackOpTypes.HAS, rawKey)
  }
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey)
}
/**
 * 
 * @param target 
 * @param isReadonly 
 * @returns 
 * 这段代码是一个名为 size 的函数。该函数接受两个参数：target 和 isReadonly（可选参数，默认为 false）。

以下是对该函数的解释：

首先，将 target 转换为原始对象（非响应式对象），以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
如果 isReadonly 参数为 false，执行以下操作：
使用 toRaw 函数将 target 转换为它的原始值，并调用 track 函数追踪 target 的迭代操作（TrackOpTypes.ITERATE）。
使用 Reflect.get 方法获取 target 对象的 size 属性值，并将其作为函数的返回值。
总体而言，这个函数用于获取 IterableCollections 对象的大小（元素的数量）。它会进行一些响应式追踪的操作，并返回目标对象的 size 属性值。注意，这里使用了 Reflect.get 方法来获取属性值，以确保能够正确处理目标对象的代理情况。
 */
function size(target: IterableCollections, isReadonly = false) {
  target = (target as any)[ReactiveFlags.RAW]
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.get(target, 'size', target)
}
/**
 * 
 * @param this 
 * @param value 
 * @returns 
 * 这段代码是一个名为 add 的函数。该函数是在 SetTypes 上下文中定义的方法，它接受一个参数 value。

以下是对该函数的解释：

首先，使用 toRaw 函数将 value 转换为它的原始值，以确保获取的是原始对象或值。
使用 toRaw 函数将 this（SetTypes 对象）转换为原始对象 target，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 getProto 函数获取 target 的原型对象 proto。
使用 proto.has.call(target, value) 检查 target 中是否已存在 value，并将结果保存在 hadKey 变量中。
如果 hadKey 为 false，表示 target 中不存在 value，执行以下操作：
调用 target.add(value) 将 value 添加到 target 中。
调用 trigger 函数触发 target 的触发操作（TriggerOpTypes.ADD），通知相关依赖更新。
最后，返回 this（即 SetTypes 对象）。
总体而言，这个函数用于向 SetTypes 对象中添加元素 value。它会进行一些响应式操作，将 value 添加到原始对象中，并触发相关依赖的更新。最后，返回 SetTypes 对象本身。
 */
function add(this: SetTypes, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const proto = getProto(target)
  const hadKey = proto.has.call(target, value)
  if (!hadKey) {
    target.add(value)
    trigger(target, TriggerOpTypes.ADD, value, value)
  }
  return this
}
/**
 * 
 * @param this 
 * @param key 
 * @param value 
 * @returns 
 * 这段代码是一个名为 set 的函数。该函数是在 MapTypes 上下文中定义的方法，它接受两个参数 key 和 value。

以下是对该函数的解释：

首先，使用 toRaw 函数将 value 转换为它的原始值，以确保获取的是原始对象或值。
使用 toRaw 函数将 this（MapTypes 对象）转换为原始对象 target，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 getProto 函数获取 target 的原型对象，并将 has 和 get 方法提取出来，以便后续使用。
使用 has.call(target, key) 检查 target 中是否已存在 key，并将结果保存在 hadKey 变量中。
如果 hadKey 为 false，表示 target 中不存在 key，执行以下操作：
使用 toRaw 函数将 key 转换为它的原始值，以确保获取的是原始对象或值。
再次使用 has.call(target, key) 检查 target 中是否已存在 key，并将结果保存在 hadKey 变量中。
如果处于开发环境下（__DEV__），则调用 checkIdentityKeys 函数检查 target 中是否存在具有相同标识的键，以避免潜在的错误。
使用 get.call(target, key) 获取 target 中键 key 对应的旧值，并将其保存在 oldValue 变量中。
调用 target.set(key, value) 将新的键值对添加或更新到 target 中。
根据之前的判断情况，执行以下操作：
如果 hadKey 为 false，表示新键值对是新增的，调用 trigger 函数触发 target 的触发操作（TriggerOpTypes.ADD），通知相关依赖更新。
否则，如果 value 和 oldValue 发生了改变，调用 trigger 函数触发 target 的触发操作（TriggerOpTypes.SET），通知相关依赖更新。
最后，返回 this（即 MapTypes 对象）。
总体而言，这个函数用于向 MapTypes 对象中添加或更新键值对。它会进行一些响应式操作，根据情况触发相关依赖的更新，并返回 MapTypes 对象本身。
 */
function set(this: MapTypes, key: unknown, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const { has, get } = getProto(target)

  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  } else if (__DEV__) {
    checkIdentityKeys(target, has, key)
  }

  const oldValue = get.call(target, key)
  target.set(key, value)
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return this
}
/**
 * 
 * @param this 
 * @param key 
 * @returns 
 * 这段代码是一个名为 deleteEntry 的函数。该函数是在 CollectionTypes 上下文中定义的方法，它接受一个参数 key。

以下是对该函数的解释：

首先，使用 toRaw 函数将 this（CollectionTypes 对象）转换为原始对象 target，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 getProto 函数获取 target 的原型对象，并将 has 和 get 方法提取出来，以便后续使用。
使用 has.call(target, key) 检查 target 中是否存在 key，并将结果保存在 hadKey 变量中。
如果 hadKey 为 false，表示 target 中不存在 key，执行以下操作：
使用 toRaw 函数将 key 转换为它的原始值，以确保获取的是原始对象或值。
再次使用 has.call(target, key) 检查 target 中是否存在 key，并将结果保存在 hadKey 变量中。
如果处于开发环境下（__DEV__），则调用 checkIdentityKeys 函数检查 target 中是否存在具有相同标识的键，以避免潜在的错误。
使用 get 方法获取 target 中键 key 对应的旧值，并将其保存在 oldValue 变量中。如果 get 不存在，则将 oldValue 设置为 undefined。
调用 target.delete(key) 从 target 中删除键 key 对应的条目，并将结果保存在 result 变量中。
如果 hadKey 为 true，表示删除了存在的条目，调用 trigger 函数触发 target 的触发操作（TriggerOpTypes.DELETE），通知相关依赖更新。
返回 result，即删除操作的结果。
总体而言，这个函数用于从 CollectionTypes 对象中删除指定的键值对条目。它会进行一些响应式操作，根据情况触发相关依赖的更新，并返回删除操作的结果。
 */
function deleteEntry(this: CollectionTypes, key: unknown) {
  const target = toRaw(this)
  const { has, get } = getProto(target)
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  } else if (__DEV__) {
    checkIdentityKeys(target, has, key)
  }

  const oldValue = get ? get.call(target, key) : undefined
  // forward the operation before queueing reactions
  const result = target.delete(key)
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}
/**
 * 
 * @param this 
 * @returns 
 * 这段代码是一个名为 clear 的函数。该函数是在 IterableCollections 上下文中定义的方法，它不接受任何参数。

以下是对该函数的解释：

首先，使用 toRaw 函数将 this（IterableCollections 对象）转换为原始对象 target，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 target.size !== 0 检查 target 是否包含元素，将结果保存在 hadItems 变量中。
如果处于开发环境下（__DEV__），则根据 target 的类型（isMap(target)）创建一个旧的目标对象 oldTarget，以备将来的触发操作使用。如果不处于开发环境下，则将 oldTarget 设置为 undefined。
调用 target.clear() 清空 target 中的元素，并将结果保存在 result 变量中。
如果 hadItems 为 true，表示在清空操作前 target 中存在元素，调用 trigger 函数触发 target 的触发操作（TriggerOpTypes.CLEAR），通知相关依赖更新。并且将 undefined、undefined 和 oldTarget 作为触发操作的参数传递给 trigger 函数。
返回 result，即清空操作的结果。
总体而言，这个函数用于清空 IterableCollections 对象中的所有元素。它会进行一些响应式操作，根据情况触发相关依赖的更新，并返回清空操作的结果。在开发环境下，它还会创建一个旧的目标对象，以备将来的触发操作使用。
 */
function clear(this: IterableCollections) {
  const target = toRaw(this)
  const hadItems = target.size !== 0
  const oldTarget = __DEV__
    ? isMap(target)
      ? new Map(target)
      : new Set(target)
    : undefined
  // forward the operation before queueing reactions
  const result = target.clear()
  if (hadItems) {
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget)
  }
  return result
}
/**
 * 
 * @param isReadonly 
 * @param isShallow 
 * @returns 
 * 这段代码定义了一个名为 createForEach 的函数。该函数接受两个参数 isReadonly 和 isShallow，并返回一个新的函数 forEach。

以下是对该函数的解释：

createForEach 函数根据传入的 isReadonly 和 isShallow 参数返回一个新的函数 forEach。
forEach 函数被定义在 IterableCollections 上下文中，并接受两个参数 callback 和 thisArg。
在函数内部，将 this（IterableCollections 对象）赋值给 observed 变量。
使用 observed[ReactiveFlags.RAW] 获取原始对象 target。
使用 toRaw 函数将 target 转换为原始对象 rawTarget，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
根据 isShallow 的值选择要应用的转换函数 wrap。如果 isShallow 为 true，则使用 toShallow 函数；如果 isReadonly 为 true，则使用 toReadonly 函数；否则，使用 toReactive 函数。
如果 isReadonly 为 false，调用 track 函数追踪 rawTarget 的迭代操作（TrackOpTypes.ITERATE），并传递迭代操作的键值（ITERATE_KEY）。
调用 target.forEach 方法遍历 target 的每个键值对，并执行回调函数：
回调函数中，使用 wrap(value) 和 wrap(key) 对值和键进行转换，确保传递给回调函数的是对应的响应式/只读对象。
使用 callback.call(thisArg, wrap(value), wrap(key), observed) 调用回调函数，确保回调函数在响应式映射上以及第三个参数的形式被调用。
返回 target.forEach 的结果。
总体而言，createForEach 函数返回一个新的 forEach 函数，用于在 IterableCollections 对象上执行遍历操作，并在每次迭代时执行回调函数。根据传入的参数，它会应用不同的转换函数，并在必要时追踪迭代操作。
 */
function createForEach(isReadonly: boolean, isShallow: boolean) {
  return function forEach(
    this: IterableCollections,
    callback: Function,
    thisArg?: unknown
  ) {
    const observed = this as any
    const target = observed[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
    return target.forEach((value: unknown, key: unknown) => {
      // important: make sure the callback is
      // 1. invoked with the reactive map as `this` and 3rd arg
      // 2. the value received should be a corresponding reactive/readonly.
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    })
  }
}
/**
 * 这段代码定义了一个名为 Iterable 的接口。该接口表示可迭代对象，它包含一个 [Symbol.iterator] 方法，用于返回一个迭代器（Iterator）。

以下是对该接口的解释：

Iterable 接口定义了一个 [Symbol.iterator] 方法，该方法没有参数。
[Symbol.iterator] 方法使用 ES6 中的符号类型 Symbol.iterator 来定义，它表示对象是可迭代的。
[Symbol.iterator] 方法返回一个迭代器对象（Iterator），该迭代器对象用于遍历可迭代对象的元素。
通过实现 Iterable 接口并提供 [Symbol.iterator] 方法的对象，可以使用 for...of 循环或其他支持迭代协议的语法来迭代该对象的元素。
 */
interface Iterable {
  [Symbol.iterator](): Iterator
}
/**
 * 这段代码定义了一个名为 Iterator 的接口。该接口表示迭代器，它包含一个 next 方法，用于返回迭代结果（IterationResult）。

以下是对该接口的解释：

Iterator 接口定义了一个 next 方法，该方法可以带有一个可选参数 value。
next 方法用于获取迭代器的下一个值。
next 方法在调用时可以传入一个参数 value，该参数用于向迭代器发送值，供迭代器在下一次迭代中使用。
next 方法返回一个迭代结果对象（IterationResult），该对象包含两个属性：
value：表示当前迭代步骤的值。
done：表示迭代是否已完成的布尔值。若为 true，表示迭代已结束；若为 false，表示还有更多的值可供迭代。
通过实现 Iterator 接口并提供 next 方法的对象，可以自定义迭代器的行为，控制迭代过程中的值的生成和迭代的完成状态。
 */
interface Iterator {
  next(value?: any): IterationResult
}
/**
 * 这段代码定义了一个名为 IterationResult 的接口。该接口表示迭代结果，它包含两个属性：value 和 done。

以下是对该接口的解释：

IterationResult 接口定义了两个属性：
value：表示当前迭代步骤的值。
done：表示迭代是否已完成的布尔值。若为 true，表示迭代已结束；若为 false，表示还有更多的值可供迭代。
迭代器在每次迭代时会返回一个迭代结果对象，该对象包含当前迭代步骤的值以及表示迭代是否已完成的标识。通过检查迭代结果对象的 done 属性，可以确定迭代是否已结束，从而控制迭代的终止条件。

这个 IterationResult 接口定义了迭代器返回结果的结构，使得可以使用统一的形式来处理迭代器的返回值。
 */
interface IterationResult {
  value: any
  done: boolean
}
/**
 * 
 * @param method 
 * @param isReadonly 
 * @param isShallow 
 * @returns 
 * 这段代码定义了一个名为 createIterableMethod 的函数。该函数用于创建可迭代方法（Iterable Method），根据传入的参数返回一个新的函数。

以下是对该函数的解释：

createIterableMethod 函数接受三个参数：method（方法名）、isReadonly（是否只读）和 isShallow（是否浅层处理）。
函数返回一个新的函数，该函数接受剩余参数 args，并在 IterableCollections 上下文中执行。
在函数内部，将 this（IterableCollections 对象）赋值给 target。
使用 (this as any)[ReactiveFlags.RAW] 获取原始对象 target。
使用 toRaw 函数将 target 转换为原始对象 rawTarget，以确保在进行进一步操作时不会影响到代理对象的响应式追踪。
使用 isMap 函数检查 rawTarget 是否为 Map 类型，并将结果赋值给 targetIsMap。
根据 method 的值判断当前方法是键值对（entries 方法或 Symbol.iterator 方法且 targetIsMap 为真）还是仅键（keys 方法且 targetIsMap 为真）。
调用 target[method](...args) 执行相应的迭代方法，返回一个内部迭代器对象 innerIterator。
根据 isShallow 的值选择要应用的转换函数 wrap。如果 isShallow 为 true，则使用 toShallow 函数；如果 isReadonly 为 true，则使用 toReadonly 函数；否则，使用 toReactive 函数。
如果 isReadonly 为 false，调用 track 函数追踪 rawTarget 的迭代操作（TrackOpTypes.ITERATE），并根据是仅键操作还是通用迭代操作选择相应的键（MAP_KEY_ITERATE_KEY 或 ITERATE_KEY）。
返回一个包装过的迭代器对象，该对象同时遵循迭代器协议和可迭代协议：
next 方法根据 innerIterator 的返回结果进行包装，将值进行转换后返回，并在迭代完成时返回原始的 value 和 done。
[Symbol.iterator] 方法返回迭代器对象本身，以使迭代器对象可以直接用于迭代协议。
通过调用 createIterableMethod 函数，并传入方法名、只读标志和浅层处理标志，可以创建一个可迭代方法，该方法返回一个经过包装的迭代器对象，用于遍历原始对象并返回经过转换的值。
 */
function createIterableMethod(
  method: string | symbol,
  isReadonly: boolean,
  isShallow: boolean
) {
  return function (
    this: IterableCollections,
    ...args: unknown[]
  ): Iterable & Iterator {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const targetIsMap = isMap(rawTarget)
    const isPair =
      method === 'entries' || (method === Symbol.iterator && targetIsMap)
    const isKeyOnly = method === 'keys' && targetIsMap
    const innerIterator = target[method](...args)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly &&
      track(
        rawTarget,
        TrackOpTypes.ITERATE,
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
      )
    // return a wrapped iterator which returns observed versions of the
    // values emitted from the real iterator
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this
      }
    }
  }
}
/**
 * 
 * @param type 
 * @returns 
 * 这段代码定义了一个名为 createReadonlyMethod 的函数。该函数用于创建只读方法（Readonly Method），根据传入的参数返回一个新的函数。

以下是对该函数的解释：

createReadonlyMethod 函数接受一个参数 type（触发操作类型）。
函数返回一个新的函数，该函数接受剩余参数 args，并在 CollectionTypes 上下文中执行。
在函数内部，如果在开发环境中（__DEV__ 为真），则获取参数数组 args 中的第一个参数作为键值的提示信息 key，否则为空字符串。
在开发环境中，使用 console.warn 输出警告信息，提示用户当前操作失败，因为目标对象是只读的。警告信息包含触发操作类型的大写形式、键值的提示信息以及原始对象的信息（使用 toRaw(this) 转换为原始对象）。
如果触发操作类型为 TriggerOpTypes.DELETE，则返回 false，表示删除操作失败；否则，返回当前对象 this。
通过调用 createReadonlyMethod 函数，并传入触发操作类型，可以创建一个只读方法，该方法在开发环境中输出警告信息，并返回适当的值来表示只读操作的结果。
 */
function createReadonlyMethod(type: TriggerOpTypes): Function {
  return function (this: CollectionTypes, ...args: unknown[]) {
    if (__DEV__) {
      const key = args[0] ? `on key "${args[0]}" ` : ``
      console.warn(
        `${capitalize(type)} operation ${key}failed: target is readonly.`,
        toRaw(this)
      )
    }
    return type === TriggerOpTypes.DELETE ? false : this
  }
}
/**
 * 
 * @returns 
 * 这段代码定义了一个名为 createInstrumentations 的函数，用于创建数据结构的操作方法（instrumentations）。

以下是对该函数的解释：

createInstrumentations 函数内部定义了四个对象：mutableInstrumentations、readonlyInstrumentations、shallowInstrumentations 和 shallowReadonlyInstrumentations，它们分别代表可变方法、只读方法、浅层可变方法和浅层只读方法的集合。
mutableInstrumentations 对象包含了一组可变的操作方法，其中包括 get、size、has、add、set、delete、clear 和 forEach。
shallowInstrumentations 对象包含了一组浅层可变的操作方法，它们与 mutableInstrumentations 中的方法功能类似，但在获取操作时会使用浅层转换（toShallow）。
readonlyInstrumentations 对象包含了一组只读的操作方法，其中包括 get、size、has、add、set、delete、clear 和 forEach。这些方法在执行操作之前会检查目标对象是否为只读，如果是只读对象，则输出警告信息并返回适当的结果。
shallowReadonlyInstrumentations 对象包含了一组浅层只读的操作方法，它们与 readonlyInstrumentations 中的方法功能类似，但在获取操作时会使用浅层转换（toShallow）。
iteratorMethods 是一个包含迭代器方法名称的数组，包括 'keys'、'values'、'entries' 和 Symbol.iterator。
使用 iteratorMethods.forEach 循环遍历 iteratorMethods 数组，并为每个迭代器方法创建对应的操作方法，并将它们添加到 mutableInstrumentations、readonlyInstrumentations、shallowInstrumentations 和 shallowReadonlyInstrumentations 对象中。
最后，将四个操作方法的集合作为数组返回。
通过调用 createInstrumentations 函数，可以获取包含不同类型（可变、只读、浅层可变、浅层只读）操作方法的对象集合，以用于对数据结构进行相应的操作。
 */
function createInstrumentations() {
  const mutableInstrumentations: Record<string, Function | number> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key)
    },
    get size() {
      return size(this as unknown as IterableCollections)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, false)
  }

  const shallowInstrumentations: Record<string, Function | number> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key, false, true)
    },
    get size() {
      return size(this as unknown as IterableCollections)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, true)
  }

  const readonlyInstrumentations: Record<string, Function | number> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key, true)
    },
    get size() {
      return size(this as unknown as IterableCollections, true)
    },
    has(this: MapTypes, key: unknown) {
      return has.call(this, key, true)
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, false)
  }

  const shallowReadonlyInstrumentations: Record<string, Function | number> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key, true, true)
    },
    get size() {
      return size(this as unknown as IterableCollections, true)
    },
    has(this: MapTypes, key: unknown) {
      return has.call(this, key, true)
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, true)
  }

  const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]
  iteratorMethods.forEach(method => {
    mutableInstrumentations[method as string] = createIterableMethod(
      method,
      false,
      false
    )
    readonlyInstrumentations[method as string] = createIterableMethod(
      method,
      true,
      false
    )
    shallowInstrumentations[method as string] = createIterableMethod(
      method,
      false,
      true
    )
    shallowReadonlyInstrumentations[method as string] = createIterableMethod(
      method,
      true,
      true
    )
  })

  return [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrumentations,
    shallowReadonlyInstrumentations
  ]
}
/**
 * 这段代码使用了解构赋值语法，将 createInstrumentations 函数返回的数组解构为四个变量：mutableInstrumentations、readonlyInstrumentations、shallowInstrumentations 和 shallowReadonlyInstrumentations。

通过调用 createInstrumentations 函数并将其结果赋值给解构赋值语句的右侧，可以将返回的四个操作方法集合分别赋值给这四个变量，以便在后续的代码中使用。
 */
const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations
] = /* #__PURE__*/ createInstrumentations()
/**
 * 
 * @param isReadonly 
 * @param shallow 
 * @returns 
 * 这段代码定义了一个 createInstrumentationGetter 函数，用于创建属性的 getter 函数。该函数根据传入的 isReadonly 和 shallow 参数选择相应的操作方法集合 instrumentations。

如果 shallow 参数为 true，则根据 isReadonly 参数选择浅层的操作方法集合，即 shallowReadonlyInstrumentations（如果 isReadonly 为 true）或 shallowInstrumentations（如果 isReadonly 为 false）。

如果 shallow 参数为 false，则根据 isReadonly 参数选择相应的操作方法集合，即 readonlyInstrumentations（如果 isReadonly 为 true）或 mutableInstrumentations（如果 isReadonly 为 false）。

返回的 getter 函数接受 target、key 和 receiver 参数，并根据不同的 key 值进行处理。如果 key 为 ReactiveFlags.IS_REACTIVE，则返回 !isReadonly；如果 key 为 ReactiveFlags.IS_READONLY，则返回 isReadonly；如果 key 为 ReactiveFlags.RAW，则返回 target。

对于其他的 key 值，使用 Reflect.get 方法获取属性值。如果 instrumentations 中存在该属性，并且 key 在 target 中存在，则从 instrumentations 对象中获取属性值；否则，从 target 对象中获取属性值。最后返回获取到的属性值。
 */
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations

  return (
    target: CollectionTypes,
    key: string | symbol,
    receiver: CollectionTypes
  ) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}
/**
 * 这段代码导出了一个名为 mutableCollectionHandlers 的常量，它是一个 ProxyHandler<CollectionTypes> 类型的对象。该对象用于定义针对可变集合的代理行为。

其中，get 属性的值是调用 createInstrumentationGetter(false, false) 函数生成的 getter 函数。这个 getter 函数根据传入的参数 false 和 false，选择了可变集合的完整操作方法集合 mutableInstrumentations。在代理对象的属性访问时，会调用这个 getter 函数来获取属性值，并进行相应的处理。

通过将 mutableCollectionHandlers 应用到 Proxy 对象上，可以拦截并处理针对可变集合的属性访问操作。
 */
export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false)
}
/**
 * 这段代码导出了一个名为 shallowCollectionHandlers 的常量，它是一个 ProxyHandler<CollectionTypes> 类型的对象。该对象用于定义针对可变集合的浅层代理行为。

其中，get 属性的值是调用 createInstrumentationGetter(false, true) 函数生成的 getter 函数。这个 getter 函数根据传入的参数 false 和 true，选择了可变集合的浅层操作方法集合 shallowInstrumentations。在代理对象的属性访问时，会调用这个 getter 函数来获取属性值，并进行相应的处理。

通过将 shallowCollectionHandlers 应用到 Proxy 对象上，可以拦截并处理针对可变集合的属性访问操作，同时对集合内部的对象进行浅层代理处理。
 */
export const shallowCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, true)
}
/**
 * 这段代码导出了一个名为 readonlyCollectionHandlers 的常量，它是一个 ProxyHandler<CollectionTypes> 类型的对象。该对象用于定义针对只读集合的代理行为。

其中，get 属性的值是调用 createInstrumentationGetter(true, false) 函数生成的 getter 函数。这个 getter 函数根据传入的参数 true 和 false，选择了只读集合的操作方法集合 readonlyInstrumentations。在代理对象的属性访问时，会调用这个 getter 函数来获取属性值，并进行相应的处理。

通过将 readonlyCollectionHandlers 应用到 Proxy 对象上，可以拦截并处理针对只读集合的属性访问操作，并保持集合的只读状态。
 */
export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(true, false)
}
/**
 * 这段代码导出了一个名为 shallowReadonlyCollectionHandlers 的常量，它是一个 ProxyHandler<CollectionTypes> 类型的对象。该对象用于定义针对浅层只读集合的代理行为。

其中，get 属性的值是调用 createInstrumentationGetter(true, true) 函数生成的 getter 函数。这个 getter 函数根据传入的参数 true 和 true，选择了浅层只读集合的操作方法集合 shallowReadonlyInstrumentations。在代理对象的属性访问时，会调用这个 getter 函数来获取属性值，并进行相应的处理。

通过将 shallowReadonlyCollectionHandlers 应用到 Proxy 对象上，可以拦截并处理针对浅层只读集合的属性访问操作，并保持集合的浅层只读状态。
 */
export const shallowReadonlyCollectionHandlers: ProxyHandler<CollectionTypes> =
  {
    get: /*#__PURE__*/ createInstrumentationGetter(true, true)
  }
/**
 * 
 * @param target 
 * @param has 
 * @param key 
 * 这是一个名为 checkIdentityKeys 的函数。该函数用于检查集合对象中是否同时包含了原始版本和响应式版本的相同对象作为键，以避免可能的不一致性。

函数接受三个参数：

target：要检查的集合对象。
has：一个函数，用于检查集合对象是否包含指定的键。
key：要检查的键。
函数首先通过 toRaw 函数获取键的原始版本 rawKey。然后，它判断 rawKey 是否与原始的键 key 不相等，并且集合对象中存在 rawKey。如果满足这两个条件，则会发出警告，提示开发者集合对象中同时包含原始版本和响应式版本的相同对象，这可能会导致不一致性。警告信息还建议在可能的情况下，避免区分对象的原始版本和响应式版本，只使用响应式版本。

这个函数通常在执行 set 操作时用于检查集合对象中是否存在原始版本和响应式版本的相同对象作为键，以确保数据的一致性和正确性。
 */
function checkIdentityKeys(
  target: CollectionTypes,
  has: (key: unknown) => boolean,
  key: unknown
) {
  const rawKey = toRaw(key)
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = toRawType(target)
    console.warn(
      `Reactive ${type} contains both the raw and reactive ` +
        `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
        `which can lead to inconsistencies. ` +
        `Avoid differentiating between the raw and reactive versions ` +
        `of an object and only use the reactive version if possible.`
    )
  }
}
