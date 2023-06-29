import { isArray } from '@vue/shared'
import { ComponentInternalInstance } from '../component'
import { ObjectDirective, DirectiveHook } from '../directives'
import { softAssertCompatEnabled, DeprecationTypes } from './compatConfig'
/**
 * 
 * `LegacyDirective` 接口表示 Vue 2.x 中的遗留指令。它定义了指令的各个生命周期钩子：

- `bind`：在指令首次绑定到元素时调用一次。
- `inserted`：在绑定的元素插入到 DOM 中时调用。
- `update`：当包含指令的组件更新时调用，但指令的值可能已经改变或未改变。
- `componentUpdated`：当包含指令的组件更新且指令的值已经改变时调用。
- `unbind`：在指令从元素上解绑时调用。
 */
export interface LegacyDirective {
  bind?: DirectiveHook
  inserted?: DirectiveHook
  update?: DirectiveHook
  componentUpdated?: DirectiveHook
  unbind?: DirectiveHook
}
/**
 * `legacyDirectiveHookMap` 是一个对象，用于将 Vue 3.x 的对象指令生命周期钩子映射到对应的 Vue 2.x 遗留指令生命周期钩子。

具体映射关系如下：

- `beforeMount` 映射到 Vue 2.x 的 `bind` 钩子。
- `mounted` 映射到 Vue 2.x 的 `inserted` 钩子。
- `updated` 映射到 Vue 2.x 的 `update` 和 `componentUpdated` 钩子。
- `unmounted` 映射到 Vue 2.x 的 `unbind` 钩子。

这个映射关系可以帮助在迁移过程中将 Vue 3.x 的对象指令适配到 Vue 2.x 的遗留指令上，以保持相同的生命周期行为。
 */
const legacyDirectiveHookMap: Partial<
  Record<
    keyof ObjectDirective,
    keyof LegacyDirective | (keyof LegacyDirective)[]
  >
> = {
  beforeMount: 'bind',
  mounted: 'inserted',
  updated: ['update', 'componentUpdated'],
  unmounted: 'unbind'
}
/**
 * 
 * @param name 
 * @param dir 
 * @param instance 
 * @returns 
 * `mapCompatDirectiveHook` 是一个函数，用于将 Vue 3.x 的对象指令生命周期钩子映射到对应的 Vue 2.x 遗留指令生命周期钩子。

函数的参数如下：

- `name`：Vue 3.x 的对象指令生命周期钩子的名称。
- `dir`：包含 Vue 3.x 对象指令生命周期钩子的对象，同时也包含 Vue 2.x 遗留指令生命周期钩子。
- `instance`：当前组件实例的引用。

函数的返回值是一个 Vue 2.x 的遗留指令生命周期钩子或钩子数组，对应于给定的 Vue 3.x 的对象指令生命周期钩子。

在函数内部，首先根据 `name` 在 `legacyDirectiveHookMap` 中找到对应的映射名称 `mappedName`。如果 `mappedName` 存在，则根据它的类型进行不同的处理：

- 如果 `mappedName` 是一个数组，表示需要将 Vue 3.x 的对象指令生命周期钩子映射到多个 Vue 2.x 遗留指令生命周期钩子上。在遍历数组的过程中，将每个映射名称对应的钩子添加到一个数组 `hook` 中，并进行兼容性检查。最后，如果 `hook` 数组不为空，则返回 `hook` 数组；否则返回 `undefined`。
- 如果 `mappedName` 不是数组，表示只需将 Vue 3.x 的对象指令生命周期钩子映射到一个 Vue 2.x 遗留指令生命周期钩子上。在此情况下，进行兼容性检查，并返回对应的钩子。

该函数可以帮助在迁移过程中将 Vue 3.x 的对象指令适配到 Vue 2.x 的遗留指令上，并保持相同的生命周期行为。
 */
export function mapCompatDirectiveHook(
  name: keyof ObjectDirective,
  dir: ObjectDirective & LegacyDirective,
  instance: ComponentInternalInstance | null
): DirectiveHook | DirectiveHook[] | undefined {
  const mappedName = legacyDirectiveHookMap[name]
  if (mappedName) {
    if (isArray(mappedName)) {
      const hook: DirectiveHook[] = []
      mappedName.forEach(mapped => {
        const mappedHook = dir[mapped]
        if (mappedHook) {
          softAssertCompatEnabled(
            DeprecationTypes.CUSTOM_DIR,
            instance,
            mapped,
            name
          )
          hook.push(mappedHook)
        }
      })
      return hook.length ? hook : undefined
    } else {
      if (dir[mappedName]) {
        softAssertCompatEnabled(
          DeprecationTypes.CUSTOM_DIR,
          instance,
          mappedName,
          name
        )
      }
      return dir[mappedName]
    }
  }
}
