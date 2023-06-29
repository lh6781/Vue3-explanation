import { hasChanged } from '@vue/shared'
import { currentBlock, isBlockTreeEnabled, VNode } from '../vnode'
/**
 * 
 * @param memo 
 * @param render 
 * @param cache 
 * @param index 
 * @returns 
 * `withMemo` 是一个用于优化渲染性能的辅助函数。它接受以下参数：

- `memo`：一个数组，包含需要进行浅比较的依赖项。
- `render`：一个函数，用于生成需要渲染的 VNode。
- `cache`：一个缓存数组，用于存储已经渲染过的 VNode。
- `index`：当前渲染的索引。

函数的主要逻辑如下：

1. 首先，从缓存数组 `cache` 中取出对应索引 `index` 处的缓存 VNode，并将其赋值给变量 `cached`。
2. 如果 `cached` 存在且与当前的依赖项 `memo` 相同（通过浅比较判断），则直接返回 `cached`，表示可复用缓存的 VNode。
3. 否则，调用 `render` 函数生成新的 VNode，并将生成的 VNode 赋值给变量 `ret`。
4. 将 `memo` 数组进行浅克隆，赋值给 `ret.memo` 属性，以便在下次渲染时进行比较。
5. 将新生成的 VNode `ret` 存入缓存数组 `cache` 的索引 `index` 处，以便下次渲染时可以复用。
6. 返回新生成的 VNode `ret`。

通过使用 `withMemo`，可以避免不必要的渲染，只有当依赖项 `memo` 发生变化时，才会重新执行渲染函数 `render`，否则会直接复用之前生成的 VNode。这种优化可以提高组件的性能和响应性。
 */
export function withMemo(
  memo: any[],
  render: () => VNode<any, any>,
  cache: any[],
  index: number
) {
  const cached = cache[index] as VNode | undefined
  if (cached && isMemoSame(cached, memo)) {
    return cached
  }
  const ret = render()

  // shallow clone
  ret.memo = memo.slice()
  return (cache[index] = ret)
}
/**
 * 
 * @param cached 
 * @param memo 
 * @returns 
 * `isMemoSame` 是一个用于判断两个依赖项数组是否相同的函数。它接受两个参数：

- `cached`：缓存的 VNode 对象，其中包含之前渲染时的依赖项数组。
- `memo`：当前渲染时的依赖项数组。

函数的主要逻辑如下：

1. 首先，从 `cached` 的 `memo` 属性中获取之前渲染时的依赖项数组，并将其赋值给变量 `prev`。
2. 检查 `prev` 数组和 `memo` 数组的长度是否相同，如果不相同则说明依赖项数组发生了变化，直接返回 `false`。
3. 遍历 `prev` 数组的每个元素，通过调用 `hasChanged` 函数判断对应位置的依赖项是否发生了变化，如果发生了变化，则返回 `false`。
4. 如果当前处于块级更新跟踪模式（`isBlockTreeEnabled > 0`）并且存在当前块（`currentBlock`），则将缓存的 VNode `cached` 添加到当前块中，以便进行块级更新的跟踪。
5. 如果以上条件都满足，说明依赖项数组相同，返回 `true`，表示可以复用缓存的 VNode。
6. 如果依赖项数组不同，则返回 `false`，表示需要重新执行渲染逻辑。

`isMemoSame` 的作用是用于判断当前渲染时的依赖项数组 `memo` 是否与之前的缓存相同，从而确定是否可以复用缓存的 VNode。如果依赖项数组相同，可以避免不必要的重新渲染，提高组件的性能和效率。
 */
export function isMemoSame(cached: VNode, memo: any[]) {
  const prev: any[] = cached.memo!
  if (prev.length != memo.length) {
    return false
  }

  for (let i = 0; i < prev.length; i++) {
    if (hasChanged(prev[i], memo[i])) {
      return false
    }
  }

  // make sure to let parent block track it when returning cached
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(cached)
  }
  return true
}
