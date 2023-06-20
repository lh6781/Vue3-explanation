import {
  reactive,
  readonly,
  toRaw,
  ReactiveFlags,
  Target,
  readonlyMap,
  reactiveMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  isReadonly,
  isShallow
} from './reactive'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import {
  track,
  trigger,
  ITERATE_KEY,
  pauseTracking,
  resetTracking
} from './effect'
import {
  isObject,
  hasOwn,
  isSymbol,
  hasChanged,
  isArray,
  isIntegerKey,
  extend,
  makeMap
} from '@vue/shared'
import { isRef } from './ref'
import { warn } from './warning'

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)
/**
 * 这段代码创建了一个 Set 对象 builtInSymbols，用于存储 JavaScript 内置的符号类型。

代码逐步解释如下：

Object.getOwnPropertyNames(Symbol) 获取 Symbol 对象的所有属性名，返回一个数组。
使用 filter 方法过滤掉数组中的 'arguments' 和 'caller'，因为在某些环境中（如 iOS 10.x）访问这两个属性会导致 TypeError 错误。
使用 map 方法将属性名对应的 Symbol 值提取出来，存储到新的数组中。由于 Symbol 对象是一个严格模式函数，通过 (Symbol as any)[key] 可以访问到对应的 Symbol 值。
使用 filter 方法筛选出数组中的符号类型，将其作为有效的内置符号类型。
最后，使用 Set 构造函数将有效的内置符号类型存储到 builtInSymbols 中。
这段代码的目的是创建一个集合，其中包含 JavaScript 内置的符号类型，以便后续使用。
 */
const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

const get = /*#__PURE__*/ createGetter()
const shallowGet = /*#__PURE__*/ createGetter(false, true)
const readonlyGet = /*#__PURE__*/ createGetter(true)
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)

const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations()

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  // instrument identity-sensitive Array methods to account for possible reactive
  // values
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '')
      }
      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
  // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases (#2137)
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      pauseTracking()
      const res = (toRaw(this) as any)[key].apply(this, args)
      resetTracking()
      return res
    }
  })
  return instrumentations
}

function hasOwnProperty(this: object, key: string) {
  const obj = toRaw(this)
  track(obj, TrackOpTypes.HAS, key)
  return obj.hasOwnProperty(key)
}
/**
 * 
 * @param isReadonly 这段代码定义了一个名为 createGetter 的函数，用于创建一个获取属性值的函数。

函数接受两个可选参数 isReadonly 和 shallow，默认值分别为 false 和 false。返回一个函数，该函数用于获取目标对象的属性值。

函数内部逻辑如下：

首先判断 key 是否等于 ReactiveFlags.IS_REACTIVE，如果是，则返回 !isReadonly，表示目标对象是否是响应式的；
接着判断 key 是否等于 ReactiveFlags.IS_READONLY，如果是，则返回 isReadonly，表示目标对象是否是只读的；
再判断 key 是否等于 ReactiveFlags.IS_SHALLOW，如果是，则返回 shallow，表示获取属性时是否使用浅层代理；
然后判断 key 是否等于 ReactiveFlags.RAW，并且 receiver 是否等于对应目标对象的代理对象。如果满足条件，则返回目标对象本身，用于获取原始对象；
如果目标对象是数组，并且具有 key 对应的数组操作方法（arrayInstrumentations 中定义的方法），则使用 Reflect.get 获取该方法，并返回；
如果 key 等于 'hasOwnProperty'，则返回全局的 hasOwnProperty 方法；
如果以上条件都不满足，使用 Reflect.get 获取目标对象的属性值，并将其赋值给变量 res；
如果 key 是一个符号类型，通过 isSymbol(key) ? builtInSymbols.has(key) 判断该符号是否是内置符号，如果是则直接返回 res；
如果目标对象不是只读的，则调用 track 函数追踪目标对象的属性读取操作；
如果 shallow 为 true，则直接返回 res，表示浅层代理时不进行进一步处理；
如果 res 是一个引用类型（isRef(res) 返回 true），则判断是否为数组和整数类型的键，如果是则返回 res 本身，否则返回 res 的 value 属性；
如果 res 是一个对象，则根据 isReadonly 的值来决定是否返回只读代理或响应式代理（使用 readonly 或 reactive 函数进行处理）；
如果以上条件都不满足，则直接返回 res。
通过这个 createGetter 函数，可以根据传入的 isReadonly 和 shallow 参数创建一个特定配置的属性获取函数。
 * @param shallow 
 * @returns 
 */
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target
    }

    const targetIsArray = isArray(target)

    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }

    const res = Reflect.get(target, key, receiver)

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    if (shallow) {
      return res
    }

    if (isRef(res)) {
      // ref unwrapping - skip unwrap for Array + integer key.
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }

    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)
/**
 * 
 * @param shallow 这段代码定义了一个名为 createSetter 的函数，用于创建一个设置属性值的函数。

函数接受一个可选参数 shallow，默认值为 false。返回一个函数，该函数用于设置目标对象的属性值。

函数内部逻辑如下：

首先获取目标对象的旧属性值，并将其赋值给变量 oldValue；
如果旧属性值是只读的、且是引用类型的响应式对象（isRef 返回 true），同时新值不是引用类型的响应式对象，则直接返回 false，表示设置属性值失败；
如果 shallow 为 false，即非浅层代理模式：
如果新值不是浅层代理对象且不是只读对象，则将旧值和新值都转换为原始对象（使用 toRaw 函数）；
如果目标对象不是数组，并且旧值是引用类型的响应式对象且新值不是引用类型的响应式对象，则将旧值的 value 属性更新为新值，并返回 true，表示设置属性值成功；
如果 shallow 为 true，即浅层代理模式，则不对新值进行进一步处理，直接使用新值设置属性值；
判断目标对象是否具有属性 key，使用 isArray 和 isIntegerKey 判断是否为数组和整数类型的键，如果是，则将 key 转换为数值类型，并判断是否小于目标数组的长度，如果是，则表示该键存在；
调用 Reflect.set 方法设置目标对象的属性值，并将结果赋值给变量 result；
如果目标对象等于接收器对象的原始对象（toRaw(receiver)），则判断是否是新增属性（!hadKey），如果是，则触发 trigger 函数，传递触发类型为 TriggerOpTypes.ADD，键为 key，值为 value；
如果不是新增属性，判断新值和旧值是否发生变化（使用 hasChanged 函数），如果发生变化，则触发 trigger 函数，传递触发类型为 TriggerOpTypes.SET，键为 key，新值为 value，旧值为 oldValue；
返回 result，表示设置属性值的结果。
通过这个 createSetter 函数，可以根据传入的 shallow 参数创建一个特定配置的属性设置函数
 * @returns 
 */
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key]
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false
    }
    if (!shallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}
/**
 * 
 * @param target 
这段代码定义了一个名为 deleteProperty 的函数，用于删除目标对象的属性。

函数接受目标对象 target 和要删除的属性键 key，并返回一个布尔值表示删除操作的结果。

函数内部逻辑如下：

首先判断目标对象是否具有属性 key，使用 hasOwn 函数进行判断，并将结果赋值给变量 hadKey；
获取目标对象的旧属性值，并将其赋值给变量 oldValue；
调用 Reflect.deleteProperty 方法删除目标对象的属性，并将结果赋值给变量 result；
如果删除操作成功且目标对象原本具有该属性，则触发 trigger 函数，传递触发类型为 TriggerOpTypes.DELETE，键为 key，新值为 undefined，旧值为 oldValue；
返回 result，表示删除操作的结果。
通过这个 deleteProperty 函数，可以删除目标对象的指定属性，并在删除成功时触发相应的副作用。
 * @param key 
 * @returns 
 */
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}
/**
 * 
 * @param target 这段代码定义了一个名为 has 的函数，用于检查目标对象是否具有指定的属性。

函数接受目标对象 target 和要检查的属性键 key，并返回一个布尔值表示目标对象是否具有该属性。

函数内部逻辑如下：

调用 Reflect.has 方法检查目标对象是否具有属性 key，并将结果赋值给变量 result；
如果属性键 key 不是符号类型或不属于内置符号（builtInSymbols），则调用 track 函数，传递触发类型为 TrackOpTypes.HAS，键为 key，用于跟踪属性的访问；
返回 result，表示目标对象是否具有指定的属性。
通过这个 has 函数，可以判断目标对象是否包含特定的属性，并在访问属性时进行相应的依赖追踪。
 * @param key 
 * @returns 
 */
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}
/**
 * 
 * @param target 这段代码定义了一个名为 ownKeys 的函数，用于获取目标对象自身的所有属性键（包括字符串键和符号键）。

函数接受目标对象 target，并返回一个由属性键组成的数组。

函数内部逻辑如下：

如果目标对象是数组类型，则调用 track 函数，传递触发类型为 TrackOpTypes.ITERATE，键为 'length'，用于跟踪数组长度的访问；
否则，调用 track 函数，传递触发类型为 TrackOpTypes.ITERATE，键为 ITERATE_KEY（该常量未在提供的代码中定义），用于跟踪目标对象的迭代访问；
使用 Reflect.ownKeys 方法获取目标对象自身的所有属性键，并将结果作为函数的返回值。
通过这个 ownKeys 函数，可以获取目标对象自身的所有属性键，并在访问属性键时进行相应的依赖追踪。
 * @returns 
 */
function ownKeys(target: object): (string | symbol)[] {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
    }
    return true
  }
}

export const shallowReactiveHandlers = /*#__PURE__*/ extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet
  }
)

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
export const shallowReadonlyHandlers = /*#__PURE__*/ extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
)
