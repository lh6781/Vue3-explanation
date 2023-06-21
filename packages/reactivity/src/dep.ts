import { ReactiveEffect, trackOpBit } from './effect'

export type Dep = Set<ReactiveEffect> & TrackedMarkers

/**
 * wasTracked and newTracked maintain the status for several levels of effect
 * tracking recursion. One bit per level is used to define whether the dependency
 * was/is tracked.
 * TrackedMarkers是一个类型别名，它表示一个对象类型，其中包含两个属性：w和n。

w属性是一个number类型，用于表示"wasTracked"（曾经被追踪）的数量。
n属性也是一个number类型，用于表示"newTracked"（新追踪）的数量。
 */
type TrackedMarkers = {
  /**
   * wasTracked
   */
  w: number
  /**
   * newTracked
   */
  n: number
}
/**
 * 
 * @param effects 
 * 这段代码导出了一个名为 createDep 的函数，用于创建一个 Dep 对象，即依赖追踪集合。

函数接受一个可选的 effects 参数，它是一个 ReactiveEffect 对象的数组，表示初始时要添加到 Dep 中的依赖项。如果未提供 effects 参数，则创建一个空的 Dep 对象。

函数内部首先通过 new Set<ReactiveEffect>(effects) 创建一个 Set 集合，并将其断言为 Dep 类型。这样就创建了一个具备 Dep 类型的依赖追踪集合。

接下来，函数为 dep 对象添加了两个属性：

w 属性用于表示该依赖追踪集合当前正在进行的响应式效果的数量（即正在追踪的副作用的数量）。
n 属性用于表示该依赖追踪集合的版本号。
最后，函数返回创建的 dep 对象作为结果。

总结起来，createDep 函数用于创建一个 Dep 对象，并可选择性地初始化其初始依赖项。该函数在创建 dep 对象后为其添加了一些属性，并返回创建的 dep 对象。
 */
export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  dep.w = 0
  dep.n = 0
  return dep
}
/**
 * 
 * @param dep 
 * @returns 
 * 这段代码导出了一个名为 wasTracked 的函数，用于检查给定的依赖追踪集合 dep 是否被追踪过。

函数首先通过按位与操作符 & 将 dep.w（依赖追踪集合的 w 属性）与 trackOpBit 进行按位与运算。trackOpBit 是一个位掩码，用于表示追踪操作的比特位。如果结果大于 0，则表示 dep 曾经被追踪过。

最后，函数返回一个布尔值，表示 dep 是否曾经被追踪过。

总结起来，wasTracked 函数用于检查给定的依赖追踪集合是否曾经被追踪过。它通过检查 dep.w 属性与特定比特位的按位与运算结果来判断。如果结果大于 0，则表示该依赖追踪集合曾经被追踪过。
 */
export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0
/**
 * 
 * @param dep 
 * @returns 
 * 这段代码导出了一个名为 newTracked 的函数，用于检查给定的依赖追踪集合 dep 是否为新追踪。

函数首先通过按位与操作符 & 将 dep.n（依赖追踪集合的 n 属性）与 trackOpBit 进行按位与运算。trackOpBit 是一个位掩码，用于表示追踪操作的比特位。如果结果大于 0，则表示 dep 是新追踪的。

最后，函数返回一个布尔值，表示 dep 是否为新追踪。

总结起来，newTracked 函数用于检查给定的依赖追踪集合是否为新追踪。它通过检查 dep.n 属性与特定比特位的按位与运算结果来判断。如果结果大于 0，则表示该依赖追踪集合是新追踪的。
 */
export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0
/**
 * 
 * @param param0 
 * 这段代码导出了一个名为 initDepMarkers 的函数，用于初始化依赖追踪集合的标记。

函数接受一个包含 deps 属性的对象作为参数，其中 deps 是一个包含依赖追踪集合的数组。

函数首先检查 deps 数组的长度是否大于 0，如果是，则进入循环遍历 deps 数组。

在循环中，函数对每个依赖追踪集合执行按位或运算 |=，将 trackOpBit（表示追踪操作的比特位）设置为 deps[i].w 属性的新值。这样可以将标记设置为指示该依赖追踪集合已被追踪过。

总结起来，initDepMarkers 函数用于初始化依赖追踪集合的标记。它遍历传入的依赖追踪集合数组，并将每个集合的 w 属性与 trackOpBit 进行按位或运算，将标记设置为已被追踪过。
 */
export const initDepMarkers = ({ deps }: ReactiveEffect) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit // set was tracked
    }
  }
}
/**
 * 
 * @param effect 
 * 段代码导出了一个名为 finalizeDepMarkers 的函数，用于完成依赖追踪集合的标记处理。

函数接受一个名为 effect 的 ReactiveEffect 对象作为参数。

函数首先获取 effect 对象的 deps 属性，这是一个包含依赖追踪集合的数组。

接下来，函数检查 deps 数组的长度是否大于 0，如果是，则进入循环遍历 deps 数组。

在循环中，函数首先获取当前索引 i 处的依赖追踪集合 dep。

函数通过调用 wasTracked(dep) 检查该依赖追踪集合是否曾经被追踪过，并通过调用 newTracked(dep) 检查该依赖追踪集合是否在当前运行中被追踪。

如果该依赖追踪集合曾经被追踪过且在当前运行中没有被追踪，表示该依赖已经失效，函数通过调用 dep.delete(effect) 将当前 effect 从该依赖追踪集合中删除。

如果该依赖追踪集合仍然有效，函数将其存储在 deps 数组的指针位置 ptr 处，并将 ptr 值递增。

在处理完所有依赖追踪集合后，函数将 deps 数组的长度截断为 ptr，以移除失效的依赖追踪集合。

最后，函数通过按位与运算 &= 将每个依赖追踪集合的 w 和 n 属性的对应比特位清零，以清除标记位。

总结起来，finalizeDepMarkers 函数用于完成依赖追踪集合的标记处理。它遍历传入的依赖追踪集合数组，并根据追踪状态对每个集合进行处理，删除失效的依赖追踪集合并清除标记位。最终，函数将更新后的依赖追踪集合数组返回。
 */
export const finalizeDepMarkers = (effect: ReactiveEffect) => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // clear bits
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}
