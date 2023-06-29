import { VNode, VNodeChild } from '../vnode'
import { isArray, isString, isObject } from '@vue/shared'
import { warn } from '../warning'

/**
 * v-for string
 * @private
 * `renderList` 是一个函数，用于将源数据列表渲染为一个包含 `VNodeChild` 的数组。它接收两个参数：

- `source: string`：源数据列表，通常是一个字符串数组。
- `renderItem: (value: string, index: number) => VNodeChild`：一个函数，用于将源数据列表中的每个元素渲染为 `VNodeChild`。

函数会遍历源数据列表 `source`，对于每个元素，调用 `renderItem` 函数将其转换为 `VNodeChild`。`renderItem` 函数接收两个参数：元素的值 `value` 和索引 `index`，并返回一个 `VNodeChild`。

最后，函数返回一个包含所有渲染结果的 `VNodeChild` 数组。这个数组可以用于在组件的模板中渲染列表内容。
 */
export function renderList(
  source: string,
  renderItem: (value: string, index: number) => VNodeChild
): VNodeChild[]

/**
 * v-for number
 * `renderList` 函数接收两个参数：`source` 和 `renderItem`。它用于将一个数字作为源数据列表，并将每个数字元素渲染为 `VNodeChild` 的数组。

参数说明：
- `source: number`：源数据列表，通常是一个数字，表示列表的长度或次数。
- `renderItem: (value: number, index: number) => VNodeChild`：一个函数，用于将源数据列表中的每个数字元素渲染为 `VNodeChild`。

函数的逻辑是遍历从 0 到 `source` 的数字范围，并根据每个数字调用 `renderItem` 函数生成对应的 `VNodeChild`。`renderItem` 函数接收两个参数：元素的值 `value` 和索引 `index`，并返回一个 `VNodeChild`。

最后，函数返回一个包含所有渲染结果的 `VNodeChild` 数组，可以在组件的模板中使用该数组来渲染列表内容。
 */
export function renderList(
  source: number,
  renderItem: (value: number, index: number) => VNodeChild
): VNodeChild[]

/**
 * v-for array
 * `renderList` 函数接收两个参数：`source` 和 `renderItem`。它用于将一个数组作为源数据列表，并将每个数组元素渲染为 `VNodeChild` 的数组。

参数说明：
- `source: T[]`：源数据列表，通常是一个数组。
- `renderItem: (value: T, index: number) => VNodeChild`：一个函数，用于将源数据列表中的每个数组元素渲染为 `VNodeChild`。

函数的逻辑是遍历源数据列表中的每个元素，并根据每个元素调用 `renderItem` 函数生成对应的 `VNodeChild`。`renderItem` 函数接收两个参数：元素的值 `value` 和索引 `index`，并返回一个 `VNodeChild`。

最后，函数返回一个包含所有渲染结果的 `VNodeChild` 数组，可以在组件的模板中使用该数组来渲染列表内容。这种方式可以在组件中动态地生成列表，根据源数据的变化进行自动更新。
 */
export function renderList<T>(
  source: T[],
  renderItem: (value: T, index: number) => VNodeChild
): VNodeChild[]

/**
 * v-for iterable
 * `renderList` 函数接收两个参数：`source` 和 `renderItem`。它用于将一个可迭代对象（`Iterable`）作为源数据，并将每个元素渲染为 `VNodeChild` 的数组。

参数说明：
- `source: Iterable<T>`：可迭代对象，通常是一个数组或类数组对象。
- `renderItem: (value: T, index: number) => VNodeChild`：一个函数，用于将源数据中的每个元素渲染为 `VNodeChild`。

函数的逻辑是遍历源数据中的每个元素，并根据每个元素调用 `renderItem` 函数生成对应的 `VNodeChild`。`renderItem` 函数接收两个参数：元素的值 `value` 和索引 `index`，并返回一个 `VNodeChild`。

最后，函数返回一个包含所有渲染结果的 `VNodeChild` 数组，可以在组件的模板中使用该数组来渲染列表内容。这种方式可以在组件中动态地生成列表，根据源数据的变化进行自动更新。
 */
export function renderList<T>(
  source: Iterable<T>,
  renderItem: (value: T, index: number) => VNodeChild
): VNodeChild[]

/**
 * v-for object
 * `renderList` 函数接收两个参数：`source` 和 `renderItem`。它用于将一个对象作为源数据，并将对象的每个键值对渲染为 `VNodeChild` 的数组。

参数说明：
- `source: T`：一个对象，作为源数据。
- `renderItem: <K extends keyof T>(value: T[K], key: K, index: number) => VNodeChild`：一个函数，用于将对象的每个键值对渲染为 `VNodeChild`。

函数的逻辑是遍历源数据对象的每个键值对，并根据每个键值对调用 `renderItem` 函数生成对应的 `VNodeChild`。`renderItem` 函数接收三个参数：键值对的值 `value`，键名 `key` 和索引 `index`，并返回一个 `VNodeChild`。

最后，函数返回一个包含所有渲染结果的 `VNodeChild` 数组，可以在组件的模板中使用该数组来渲染列表内容。这种方式可以在组件中动态地生成列表，根据源数据的变化进行自动更新。
 */
export function renderList<T>(
  source: T,
  renderItem: <K extends keyof T>(
    value: T[K],
    key: K,
    index: number
  ) => VNodeChild
): VNodeChild[]

/**
 * Actual implementation
 * `renderList` 函数用于根据源数据生成一个 `VNodeChild` 数组，用于渲染列表。

函数接收四个参数：
- `source: any`：源数据，可以是数组、字符串、数字或对象。
- `renderItem: (...args: any[]) => VNodeChild`：一个函数，用于将源数据的每个项渲染为 `VNodeChild`。
- `cache?: any[]`：可选参数，用于缓存渲染结果的数组。
- `index?: number`：可选参数，用于指定缓存结果的索引。

函数的逻辑如下：
- 首先，函数会根据源数据的类型进行判断，并创建一个空的 `ret` 数组用于存储渲染结果。
- 如果源数据是数组或字符串，函数会遍历源数据的每一项，调用 `renderItem` 函数生成对应的 `VNodeChild`，并将其存储在 `ret` 数组中。
- 如果源数据是数字，函数会根据数字的大小创建一个长度为该数字的数组，并遍历数组的索引，调用 `renderItem` 函数生成对应的 `VNodeChild`，并将其存储在 `ret` 数组中。
- 如果源数据是对象，函数会根据对象是否具有迭代器 `Symbol.iterator` 进行判断：
  - 如果具有迭代器，函数会使用 `Array.from` 将源数据转换为数组，并遍历数组的每一项，调用 `renderItem` 函数生成对应的 `VNodeChild`，并将其存储在 `ret` 数组中。
  - 如果没有迭代器，函数会遍历对象的键，调用 `renderItem` 函数生成对应的 `VNodeChild`，并将其存储在 `ret` 数组中。
- 如果提供了缓存数组 `cache` 和索引 `index`，函数会将生成的 `ret` 数组存储在缓存数组的相应索引处。
- 最后，函数返回生成的 `ret` 数组。

通过调用 `renderList` 函数，可以根据不同类型的源数据生成对应的 `VNodeChild` 数组，用于在组件的模板中渲染列表内容。
 */
export function renderList(
  source: any,
  renderItem: (...args: any[]) => VNodeChild,
  cache?: any[],
  index?: number
): VNodeChild[] {
  let ret: VNodeChild[]
  const cached = (cache && cache[index!]) as VNode[] | undefined

  if (isArray(source) || isString(source)) {
    ret = new Array(source.length)
    for (let i = 0, l = source.length; i < l; i++) {
      ret[i] = renderItem(source[i], i, undefined, cached && cached[i])
    }
  } else if (typeof source === 'number') {
    if (__DEV__ && !Number.isInteger(source)) {
      warn(`The v-for range expect an integer value but got ${source}.`)
    }
    ret = new Array(source)
    for (let i = 0; i < source; i++) {
      ret[i] = renderItem(i + 1, i, undefined, cached && cached[i])
    }
  } else if (isObject(source)) {
    if (source[Symbol.iterator as any]) {
      ret = Array.from(source as Iterable<any>, (item, i) =>
        renderItem(item, i, undefined, cached && cached[i])
      )
    } else {
      const keys = Object.keys(source)
      ret = new Array(keys.length)
      for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i]
        ret[i] = renderItem(source[key], key, i, cached && cached[i])
      }
    }
  } else {
    ret = []
  }

  if (cache) {
    cache[index!] = ret
  }
  return ret
}
