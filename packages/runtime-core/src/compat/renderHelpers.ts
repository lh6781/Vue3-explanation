import {
  camelize,
  extend,
  hyphenate,
  isArray,
  isObject,
  isReservedProp,
  normalizeClass
} from '@vue/shared'
import { ComponentInternalInstance } from '../component'
import { Slot } from '../componentSlots'
import { createSlots } from '../helpers/createSlots'
import { renderSlot } from '../helpers/renderSlot'
import { toHandlers } from '../helpers/toHandlers'
import { mergeProps, VNode } from '../vnode'
/**
 * 
 * @param arr 
 * @returns 
 * `toObject` 函数用于将数组转换为对象。

函数接收一个数组 `arr` 作为输入，并通过遍历数组中的元素将其合并到一个新的对象 `res` 中。

在遍历过程中，函数会跳过数组中值为假（`null`、`undefined`、`false` 等）的元素，只处理真值元素。对于每个真值元素，函数使用 `extend` 函数将其属性合并到结果对象 `res` 中。

最后，函数返回合并后的结果对象 `res`，其中包含了数组中所有真值元素的属性。

需要注意的是，`extend` 函数在代码中并没有给出具体的实现，但可以推断其功能是将属性合并到目标对象中，类似于 `Object.assign` 方法。
 */
function toObject(arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}
/**
 * 
 * @param data 
 * @param _tag 
 * @param value 
 * @param _asProp 
 * @param isSync 
 * @returns 
 * `legacyBindObjectProps` 函数用于将对象中的属性绑定到组件的数据对象 `data` 上。

函数接收以下参数：
- `data`：组件的数据对象，用于存储属性值。
- `_tag`：组件的标签名称，暂未在函数中使用。
- `value`：需要绑定的属性值，可以是一个对象。
- `_asProp`：暂未在函数中使用。
- `isSync`：是否为同步绑定属性的标志，可选参数。

如果 `value` 是一个非空对象，函数会遍历该对象的属性，并将其绑定到 `data` 对象上。

在遍历过程中，对于每个属性：
- 如果属性名是保留的属性（如组件的内置属性），直接将属性值赋给 `data` 对象。
- 如果属性名是 `'class'`，将属性值与 `data.class` 合并为规范化的类名数组。
- 如果属性名是 `'style'`，将属性值与 `data.style` 合并为规范化的样式对象。
- 对于其他属性名，将属性值赋给 `data.attrs` 对象的相应属性，如果该属性名不存在于 `data.attrs` 中。
  - 同时，如果 `isSync` 为 `true`，还会为该属性创建一个对应的更新事件处理函数，用于在属性值变化时更新原始对象中的属性值。

最后，函数返回更新后的 `data` 对象。

需要注意的是，函数中的一些函数调用（如 `normalizeClass`、`camelize`、`hyphenate`）在代码中并没有给出具体的实现，但可以推断其功能是规范化类名、驼峰化和连字符化属性名的转换。
 */
export function legacyBindObjectProps(
  data: any,
  _tag: string,
  value: any,
  _asProp: boolean,
  isSync?: boolean
) {
  if (value && isObject(value)) {
    if (isArray(value)) {
      value = toObject(value)
    }
    for (const key in value) {
      if (isReservedProp(key)) {
        data[key] = value[key]
      } else if (key === 'class') {
        data.class = normalizeClass([data.class, value.class])
      } else if (key === 'style') {
        data.style = normalizeClass([data.style, value.style])
      } else {
        const attrs = data.attrs || (data.attrs = {})
        const camelizedKey = camelize(key)
        const hyphenatedKey = hyphenate(key)
        if (!(camelizedKey in attrs) && !(hyphenatedKey in attrs)) {
          attrs[key] = value[key]

          if (isSync) {
            const on = data.on || (data.on = {})
            on[`update:${key}`] = function ($event: any) {
              value[key] = $event
            }
          }
        }
      }
    }
  }
  return data
}
/**
 * 
 * @param props 
 * @param listeners 
 * @returns 
 * `legacyBindObjectListeners` 函数用于将对象中的监听器属性绑定到组件的 `props` 对象上，并返回合并后的结果。

函数接收两个参数：
- `props`：组件的 `props` 对象，用于存储属性值。
- `listeners`：包含监听器属性的对象。

函数的主要逻辑是通过调用 `mergeProps` 函数，将 `props` 和 `toHandlers(listeners)` 合并为一个新的对象，然后将结果返回。

- `toHandlers(listeners)` 将监听器属性转换为对应的事件处理函数。
- `mergeProps(props, toHandlers(listeners))` 将 `props` 和转换后的事件处理函数对象进行合并，生成一个新的合并后的对象。

最后，函数返回合并后的结果，即绑定了监听器属性的 `props` 对象。
 */
export function legacyBindObjectListeners(props: any, listeners: any) {
  return mergeProps(props, toHandlers(listeners))
}
/**
 * 
 * @param instance 
 * @param name 
 * @param fallback 
 * @param props 
 * @param bindObject 
 * @returns 
 * `legacyRenderSlot` 函数用于渲染旧版本的插槽内容。

函数接收以下参数：
- `instance`：组件实例对象。
- `name`：插槽名称。
- `fallback`：可选参数，当插槽内容为空时的回退内容。
- `props`：可选参数，传递给插槽内容的属性。
- `bindObject`：可选参数，需要绑定到 `props` 的对象。

函数的主要逻辑如下：
1. 如果存在 `bindObject`，则将其与 `props` 进行合并，生成一个新的属性对象。
2. 调用 `renderSlot` 函数，传入组件实例的插槽对象、插槽名称、属性对象和可能的回退函数，来渲染插槽内容。
3. 返回渲染结果。

`renderSlot` 函数根据插槽名称从组件实例的插槽对象中获取对应的插槽内容，并传入属性对象和回退函数进行渲染。如果插槽内容为空且存在回退函数，则调用回退函数以生成回退内容。最终，返回渲染结果。
 */
export function legacyRenderSlot(
  instance: ComponentInternalInstance,
  name: string,
  fallback?: VNode[],
  props?: any,
  bindObject?: any
) {
  if (bindObject) {
    props = mergeProps(props, bindObject)
  }
  return renderSlot(instance.slots, name, props, fallback && (() => fallback))
}
/**
 * `LegacyScopedSlotsData` 是一个数组类型，用于表示旧版本的作用域插槽数据。

数组的每个元素可以是以下两种类型之一：
1. 对象类型 `{ key: string, fn: Function }`：表示一个作用域插槽项，其中：
   - `key` 是作用域插槽的键名，用于标识该插槽。
   - `fn` 是一个函数，用于渲染作用域插槽的内容。
2. `LegacyScopedSlotsData`：表示一个嵌套的作用域插槽数据，允许在作用域插槽中嵌套其他作用域插槽。

这种数据结构允许在旧版本的组件中使用作用域插槽，并以递归的方式支持嵌套的作用域插槽结构。每个作用域插槽项包含一个键名和对应的渲染函数，用于渲染作用域插槽的内容。
 */
type LegacyScopedSlotsData = Array<
  | {
      key: string
      fn: Function
    }
  | LegacyScopedSlotsData
>
/**
 * 
 * @param fns 
 * @param raw 
 * @param hasDynamicKeys 
 * @returns 
 * `legacyResolveScopedSlots` 函数用于解析旧版本的作用域插槽数据。

函数接收以下参数：
- `fns: LegacyScopedSlotsData`：旧版本的作用域插槽数据，即 `LegacyScopedSlotsData` 类型的数组。
- `raw?: Record<string, Slot>`：可选参数，表示原始的插槽对象，其中每个插槽都是一个函数。默认为 `undefined`。
- `hasDynamicKeys?: boolean`：可选参数，表示作用域插槽是否包含动态键名。默认为 `undefined`。

函数的作用是根据旧版本的作用域插槽数据，生成新版本的插槽对象。

函数内部通过调用 `createSlots` 函数来创建插槽对象，该函数接收两个参数：
- 第一个参数是原始的插槽对象，即 `raw` 参数。
- 第二个参数是将旧版本作用域插槽的键名映射为新版本插槽的名称，即 `mapKeyToName(fns)`。

`mapKeyToName` 函数用于将旧版本作用域插槽的键名转换为新版本插槽的名称。该函数根据键名的类型进行判断：
- 如果键名是字符串，则直接使用键名作为新版本插槽的名称。
- 如果键名是对象，则递归调用 `mapKeyToName` 函数处理嵌套的作用域插槽数据。

最终，`legacyResolveScopedSlots` 函数返回生成的新版本插槽对象。该对象可以用于在新版本的组件中渲染作用域插槽的内容。
 */
export function legacyresolveScopedSlots(
  fns: LegacyScopedSlotsData,
  raw?: Record<string, Slot>,
  // the following are added in 2.6
  hasDynamicKeys?: boolean
) {
  // v2 default slot doesn't have name
  return createSlots(
    raw || ({ $stable: !hasDynamicKeys } as any),
    mapKeyToName(fns)
  )
}
/**
 * 
 * @param slots 
 * @returns 
 * `mapKeyToName` 函数用于将旧版本的作用域插槽数据中的键名映射为新版本插槽的名称。

函数接收一个参数 `slots`，表示旧版本的作用域插槽数据，类型为 `LegacyScopedSlotsData`。

函数的作用是遍历作用域插槽数据，并对每个插槽进行处理。如果插槽是一个数组，则递归调用 `mapKeyToName` 函数处理嵌套的作用域插槽数据。如果插槽是一个对象，则将其 `key` 属性的值作为新版本插槽的名称，如果 `key` 属性不存在，则使用 `'default'` 作为新版本插槽的名称。

最后，`mapKeyToName` 函数返回处理后的作用域插槽数据，类型为 `LegacyScopedSlotsData`。
 */
function mapKeyToName(slots: LegacyScopedSlotsData) {
  for (let i = 0; i < slots.length; i++) {
    const fn = slots[i]
    if (fn) {
      if (isArray(fn)) {
        mapKeyToName(fn)
      } else {
        ;(fn as any).name = fn.key || 'default'
      }
    }
  }
  return slots as any
}
/**
 * `staticCacheMap` 是一个弱映射（WeakMap），用于缓存静态节点的数组。

`staticCacheMap` 的键是组件的内部实例（`ComponentInternalInstance`），值是一个数组，用于存储与该组件相关的静态节点。

通过使用弱映射，可以确保在组件实例被垃圾回收时，对应的静态节点数组也会被释放，避免内存泄漏。

该缓存的目的是提高渲染性能，对于不会变化的静态节点，可以直接复用之前的节点，而无需重新创建和渲染。
 */
const staticCacheMap = /*#__PURE__*/ new WeakMap<
  ComponentInternalInstance,
  any[]
>()
/**
 * 
 * @param instance 
 * @param index 
 * @returns 
 * `legacyRenderStatic` 函数用于渲染静态节点。

函数接收两个参数：
- `instance`：组件的内部实例（`ComponentInternalInstance`）。
- `index`：静态节点的索引。

首先，函数从 `staticCacheMap` 中获取与 `instance` 相关联的静态节点缓存数组 `cache`。如果缓存数组不存在，则创建一个新的空数组并将其关联到 `instance` 上。

接着，函数检查缓存数组中是否已经存在索引为 `index` 的静态节点，如果存在，则直接返回该节点。

如果缓存数组中不存在索引为 `index` 的静态节点，则通过 `instance.type.staticRenderFns[index]` 获取对应的静态渲染函数 `fn`。然后，使用组件实例的代理对象 `instance.proxy` 作为上下文，调用静态渲染函数 `fn` 并传入 `null` 和上下文对象，得到渲染结果。

最后，将渲染结果保存到缓存数组 `cache` 的索引为 `index` 的位置，并返回该渲染结果。

通过缓存静态节点的渲染结果，可以避免在每次渲染时都重新执行静态渲染函数，提高渲染性能。
 */
export function legacyRenderStatic(
  instance: ComponentInternalInstance,
  index: number
) {
  let cache = staticCacheMap.get(instance)
  if (!cache) {
    staticCacheMap.set(instance, (cache = []))
  }
  if (cache[index]) {
    return cache[index]
  }
  const fn = (instance.type as any).staticRenderFns[index]
  const ctx = instance.proxy
  return (cache[index] = fn.call(ctx, null, ctx))
}
/**
 * 
 * @param instance 
 * @param eventKeyCode 
 * @param key 
 * @param builtInKeyCode 
 * @param eventKeyName 
 * @param builtInKeyName 
 * @returns 
 * `legacyCheckKeyCodes` 函数用于检查按键代码和按键名称是否匹配。它接收多个参数，并根据配置的按键代码和内置按键代码进行比较。

函数中使用了 `isKeyNotMatch` 和 `hyphenate` 两个函数，这些函数在你提供的代码片段中未给出定义。这些函数可能包含用于比较按键代码和名称的逻辑。

使用 `legacyCheckKeyCodes` 函数时，你需要确保 `isKeyNotMatch` 和 `hyphenate` 函数在相同的作用域中定义并可访问。

一旦你有了 `isKeyNotMatch` 和 `hyphenate` 的实现，你可以按如下方式使用 `legacyCheckKeyCodes` 函数：

```typescript
const instance: ComponentInternalInstance = // 提供组件实例
const eventKeyCode: number = // 提供事件的按键代码
const key: string = // 提供按键名称
const builtInKeyCode: number | number[] = // 可选，内置按键代码
const eventKeyName: string = // 可选，事件的按键名称
const builtInKeyName: string | string[] = // 可选，内置按键名称

const isMatch = legacyCheckKeyCodes(
  instance,
  eventKeyCode,
  key,
  builtInKeyCode,
  eventKeyName,
  builtInKeyName
)

// 根据返回值 isMatch 进行相应的处理逻辑
```

请确保提供正确的参数，并根据返回值 `isMatch` 进行相应的处理。
 */
export function legacyCheckKeyCodes(
  instance: ComponentInternalInstance,
  eventKeyCode: number,
  key: string,
  builtInKeyCode?: number | number[],
  eventKeyName?: string,
  builtInKeyName?: string | string[]
) {
  const config = instance.appContext.config as any
  const configKeyCodes = config.keyCodes || {}
  const mappedKeyCode = configKeyCodes[key] || builtInKeyCode
  if (builtInKeyName && eventKeyName && !configKeyCodes[key]) {
    return isKeyNotMatch(builtInKeyName, eventKeyName)
  } else if (mappedKeyCode) {
    return isKeyNotMatch(mappedKeyCode, eventKeyCode)
  } else if (eventKeyName) {
    return hyphenate(eventKeyName) !== key
  }
}
/**
 * 
 * @param expect 
 * @param actual 
 * @returns 
 * `isKeyNotMatch` 函数用于比较期望的按键代码或按键名称与实际的按键代码或按键名称是否不匹配。该函数接收两个参数：`expect` 表示期望的按键代码或按键名称，`actual` 表示实际的按键代码或按键名称。

如果 `expect` 是一个数组，则函数会检查 `actual` 是否不在该数组中，如果不在，则返回 `true`，表示不匹配。如果 `expect` 不是数组，则函数会直接比较 `expect` 和 `actual` 是否相等，如果不相等，则返回 `true`，表示不匹配。

这个函数的泛型类型 `T` 表示按键代码或按键名称的类型。

你可以按照以下方式使用 `isKeyNotMatch` 函数：

```typescript
const expect: number | number[] = // 提供期望的按键代码或按键名称，可以是单个值或数组
const actual: number = // 提供实际的按键代码或按键名称

const isNotMatch = isKeyNotMatch(expect, actual)

// 根据返回值 isNotMatch 进行相应的处理逻辑
```

请确保提供正确的参数，并根据返回值 `isNotMatch` 进行相应的处理。
 */
function isKeyNotMatch<T>(expect: T | T[], actual: T): boolean {
  if (isArray(expect)) {
    return !expect.includes(actual)
  } else {
    return expect !== actual
  }
}
/**
 * 
 * @param tree
 * @returns 
 * `legacyMarkOnce` 函数接收一个 VNode 树作为参数，并将该树标记为 "once"，表示它是一个只渲染一次的节点。

该函数直接返回传入的 VNode 树，没有进行实际的标记操作。

你可以使用 `legacyMarkOnce` 函数来标记一个 VNode 树为 "once"，示例如下：

```typescript
const vnode: VNode = // 创建一个 VNode

const markedVNode = legacyMarkOnce(vnode)

// 标记完成后，可以使用 markedVNode 进行后续的渲染操作
```

请注意，`legacyMarkOnce` 函数只是将传入的 VNode 树标记为 "once"，实际的渲染行为和逻辑可能需要在其他地方进行处理。
 */
export function legacyMarkOnce(tree: VNode) {
  return tree
}
/**
 * 
 * @param props 
 * @param values 
 * @returns 
 * `legacyBindDynamicKeys` 函数用于将动态的属性键值对绑定到 props 对象上。

该函数接收两个参数：props 和 values。props 是一个对象，而 values 是一个数组，其中包含了一组交替出现的属性键和属性值。

函数通过遍历 values 数组，每次取出两个元素，第一个元素作为属性键，第二个元素作为属性值，然后将它们绑定到 props 对象上。

需要注意的是，属性键必须是非空的字符串，才会进行绑定。

以下是使用 `legacyBindDynamicKeys` 函数的示例：

```typescript
const props = {}
const values = ['color', 'red', 'size', 'large']

const boundProps = legacyBindDynamicKeys(props, values)

console.log(boundProps)
// 输出: { color: 'red', size: 'large' }
```

在上面的示例中，通过调用 `legacyBindDynamicKeys` 函数，将 values 数组中的属性键值对绑定到 props 对象上，最终得到了包含绑定属性的 boundProps 对象。
 */
export function legacyBindDynamicKeys(props: any, values: any[]) {
  for (let i = 0; i < values.length; i += 2) {
    const key = values[i]
    if (typeof key === 'string' && key) {
      props[values[i]] = values[i + 1]
    }
  }
  return props
}
/**
 * 
 * @param value 
 * @param symbol 
 * @returns 
 * `legacyPrependModifier` 函数用于在给定的值前添加修饰符。

该函数接收两个参数：value 和 symbol。value 是要添加修饰符的值，symbol 是修饰符的符号或前缀。

函数首先判断 value 的类型是否为字符串，如果是字符串类型，则在其前面添加 symbol；否则，直接返回原始值。

以下是使用 `legacyPrependModifier` 函数的示例：

```typescript
const value = 'click'
const symbol = '~'

const modifiedValue = legacyPrependModifier(value, symbol)

console.log(modifiedValue)
// 输出: '~click'
```

在上面的示例中，通过调用 `legacyPrependModifier` 函数，将修饰符符号 '~' 添加到字符串值 'click' 的前面，得到了修改后的值 '~click'。如果值不是字符串类型，则直接返回原始值。

该函数通常用于处理事件修饰符或指令修饰符等情况，将修饰符添加到对应的值上。
 */
export function legacyPrependModifier(value: any, symbol: string) {
  return typeof value === 'string' ? symbol + value : value
}
