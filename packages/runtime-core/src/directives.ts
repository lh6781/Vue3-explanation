/**
Runtime helper for applying directives to a vnode. Example usage:

const comp = resolveComponent('comp')
const foo = resolveDirective('foo')
const bar = resolveDirective('bar')

return withDirectives(h(comp), [
  [foo, this.x],
  [bar, this.y]
])
*/

import { VNode } from './vnode'
import { isFunction, EMPTY_OBJ, isBuiltInDirective } from '@vue/shared'
import { warn } from './warning'
import { ComponentInternalInstance, Data, getExposeProxy } from './component'
import { currentRenderingInstance } from './componentRenderContext'
import { callWithAsyncErrorHandling, ErrorCodes } from './errorHandling'
import { ComponentPublicInstance } from './componentPublicInstance'
import { mapCompatDirectiveHook } from './compat/customDirective'
import { pauseTracking, resetTracking } from '@vue/reactivity'
import { traverse } from './apiWatch'
/**
 * `DirectiveBinding` 是一个用于指令绑定的接口，定义了指令在组件中的绑定信息。

它包含以下属性：

- `instance`：指令所绑定的组件实例 (`ComponentPublicInstance`)，如果指令是全局指令，则为 `null`。
- `value`：指令的绑定值。
- `oldValue`：指令的上一个绑定值，如果没有上一个绑定值，则为 `null`。
- `arg`：指令的参数，用于在指令定义中传递额外的信息。
- `modifiers`：指令的修饰符对象，包含了指令的修饰符信息。
- `dir`：指令的完整定义对象，包含了指令的各种属性和方法。

通过使用 `DirectiveBinding`，可以在指令的钩子函数中获取到指令的绑定信息，并进行相应的处理逻辑。
 */
export interface DirectiveBinding<V = any> {
  instance: ComponentPublicInstance | null
  value: V
  oldValue: V | null
  arg?: string
  modifiers: DirectiveModifiers
  dir: ObjectDirective<any, V>
}
/**
 * `DirectiveHook` 是用于指令的钩子函数类型。它定义了指令钩子函数的参数类型和函数签名。

它接受以下参数：

- `el`：指令所绑定的元素或组件实例。
- `binding`：指令的绑定信息，类型为 `DirectiveBinding<V>`，其中 `V` 表示指令的绑定值的类型。
- `vnode`：指令所在的虚拟节点 (`VNode`)。
- `prevVNode`：上一个虚拟节点 (`VNode`)，用于在 `update` 钩子函数中比较新旧节点的变化。

指令钩子函数可以根据需要对元素或组件实例进行操作，访问指令的绑定值和其他属性，并在适当的时机执行相应的逻辑。
 */
export type DirectiveHook<T = any, Prev = VNode<any, T> | null, V = any> = (
  el: T,
  binding: DirectiveBinding<V>,
  vnode: VNode<any, T>,
  prevVNode: Prev
) => void
/**
 * `SSRDirectiveHook` 是用于服务器端渲染 (SSR) 的指令钩子函数类型。它定义了在服务器端渲染期间指令钩子函数的参数类型和函数签名。

它接受以下参数：

- `binding`：指令的绑定信息，类型为 `DirectiveBinding`。
- `vnode`：指令所在的虚拟节点 (`VNode`)。

指令钩子函数在服务器端渲染期间执行，用于生成在服务器端渲染期间需要的数据。它可以根据指令的绑定信息和虚拟节点，生成相应的数据用于服务器端渲染的输出。返回值为 `Data` 类型或 `undefined`，表示生成的数据或没有需要生成的数据。
 */
export type SSRDirectiveHook = (
  binding: DirectiveBinding,
  vnode: VNode
) => Data | undefined
/**
 * `ObjectDirective` 接口定义了对象型指令的属性和钩子函数类型。

它包含以下属性：

- `created`：在指令绑定元素的初始创建阶段调用的钩子函数。
- `beforeMount`：在指令绑定元素挂载到 DOM 之前调用的钩子函数。
- `mounted`：在指令绑定元素挂载到 DOM 后调用的钩子函数。
- `beforeUpdate`：在指令所在的组件更新之前调用的钩子函数。
- `updated`：在指令所在的组件更新之后调用的钩子函数。
- `beforeUnmount`：在指令绑定元素从 DOM 中移除之前调用的钩子函数。
- `unmounted`：在指令绑定元素从 DOM 中移除后调用的钩子函数。
- `getSSRProps`：用于服务器端渲染的钩子函数，返回一个对象，包含指令在服务器端渲染期间所需的属性。
- `deep`：一个布尔值，指定指令是否应该进行深度绑定。

钩子函数的类型是 `DirectiveHook`，它定义了钩子函数的参数类型和函数签名。

请注意，这里的 `T` 是指令绑定元素的类型，`V` 是指令的值的类型。`Prev` 是前一个虚拟节点 (`VNode`) 或 `null` 的类型。
 */
export interface ObjectDirective<T = any, V = any> {
  created?: DirectiveHook<T, null, V>
  beforeMount?: DirectiveHook<T, null, V>
  mounted?: DirectiveHook<T, null, V>
  beforeUpdate?: DirectiveHook<T, VNode<any, T>, V>
  updated?: DirectiveHook<T, VNode<any, T>, V>
  beforeUnmount?: DirectiveHook<T, null, V>
  unmounted?: DirectiveHook<T, null, V>
  getSSRProps?: SSRDirectiveHook
  deep?: boolean
}
/**
 * `FunctionDirective` 是一种特殊类型的指令，它是指令钩子函数的简化版本。

它的类型定义为 `DirectiveHook<T, any, V>`，其中 `T` 是指令绑定元素的类型，`V` 是指令的值的类型。

与 `ObjectDirective` 不同，`FunctionDirective` 没有钩子函数之间的明确阶段，只包含一个钩子函数，它会在指令被绑定到元素上时立即执行。

该钩子函数的参数类型为 `(el: T, binding: DirectiveBinding<V>, vnode: VNode<any, T>, prevVNode: any) => void`，它接收绑定元素、指令绑定对象、虚拟节点和前一个虚拟节点作为参数，并在执行时执行指令的逻辑操作。

函数指令通常用于简单的逻辑或行为，而对象指令提供了更多的生命周期钩子函数和配置选项。
 */
export type FunctionDirective<T = any, V = any> = DirectiveHook<T, any, V>
/**
 * `Directive` 是一个联合类型，可以是 `ObjectDirective<T, V>` 或 `FunctionDirective<T, V>`。

这意味着一个指令可以是一个对象指令或一个函数指令。对象指令提供了更多的生命周期钩子函数和配置选项，而函数指令则是针对简单逻辑的指令操作的简化版本。

使用 `Directive<T, V>` 类型可以同时支持对象指令和函数指令，使得指令的定义更加灵活。
 */
export type Directive<T = any, V = any> =
  | ObjectDirective<T, V>
  | FunctionDirective<T, V>
/**
 * `DirectiveModifiers` 是一个类型别名，表示一个由字符串键和布尔值组成的对象。这个对象用于表示指令的修饰符。指令修饰符是在指令使用时添加的额外标记，用于修改指令的行为或提供额外的选项。

例如，对于以下指令使用：

```html
<div v-custom-directive.modifier1.modifier2="value"></div>
```

指令名是 `v-custom-directive`，而 `modifier1` 和 `modifier2` 是指令的修饰符。

`DirectiveModifiers` 类型的对象将修饰符作为键，并将其值设置为布尔值，表示修饰符是否存在。例如：

```typescript
const modifiers: DirectiveModifiers = {
  modifier1: true,
  modifier2: true
};
```

在指令的钩子函数中，可以使用 `binding.modifiers` 来访问指令的修饰符对象。
 */
export type DirectiveModifiers = Record<string, boolean>
/**
 * 
 * @param name 
 * `validateDirectiveName` 函数用于验证自定义指令的名称。它接受一个 `name` 参数，表示要验证的指令名称。

该函数首先通过调用 `isBuiltInDirective` 函数检查 `name` 是否对应于内置指令。如果是内置指令，它会使用 `warn` 函数生成一个警告消息，提示不要将内置指令 ID 用作自定义指令 ID。

该函数的目的是防止在使用与内置指令匹配的自定义指令名称时出现冲突或意外行为。建议为自定义指令使用唯一的名称，以避免与内置指令命名冲突。
 */
export function validateDirectiveName(name: string) {
  if (isBuiltInDirective(name)) {
    warn('Do not use built-in directive ids as custom directive id: ' + name)
  }
}

// Directive, value, argument, modifiers
/**
 * `DirectiveArguments` 是一个类型别名，表示指令的参数数组。每个数组元素都是一个参数组合，可以有不同的形式：

1. `[Directive]`：只包含指令本身。
2. `[Directive, any]`：包含指令和一个额外的参数。
3. `[Directive, any, string]`：包含指令、额外参数和一个修饰符字符串。
4. `[Directive, any, string, DirectiveModifiers]`：包含指令、额外参数、修饰符字符串和指令修饰符对象。

这种参数数组的设计允许指令在使用时具有不同的参数组合方式。根据指令的定义和使用方式，可以选择相应的参数组合来传递给指令。
 */
export type DirectiveArguments = Array<
  | [Directive | undefined]
  | [Directive | undefined, any]
  | [Directive | undefined, any, string]
  | [Directive | undefined, any, string, DirectiveModifiers]
>

/**
 * Adds directives to a VNode.
 * `withDirectives` 是一个函数，用于在渲染函数中应用指令到虚拟节点。它接收两个参数：

1. `vnode`：要应用指令的虚拟节点。
2. `directives`：指令参数数组，包含要应用的指令及其参数。

函数会遍历 `directives` 数组，对每个指令进行处理。对于每个指令，它会创建一个 `DirectiveBinding` 对象，并将其添加到虚拟节点的 `dirs` 属性中。`DirectiveBinding` 对象包含指令的相关信息，如指令对象、实例、值、旧值、参数和修饰符。

如果在非渲染函数中调用了 `withDirectives`，函数会发出警告并直接返回原始的虚拟节点。

最后，函数返回更新后的虚拟节点。

通过使用 `withDirectives`，可以在渲染函数中方便地应用指令到虚拟节点，以实现自定义行为和交互效果。
 */
export function withDirectives<T extends VNode>(
  vnode: T,
  directives: DirectiveArguments
): T {
  const internalInstance = currentRenderingInstance
  if (internalInstance === null) {
    __DEV__ && warn(`withDirectives can only be used inside render functions.`)
    return vnode
  }
  const instance =
    (getExposeProxy(internalInstance) as ComponentPublicInstance) ||
    internalInstance.proxy
  const bindings: DirectiveBinding[] = vnode.dirs || (vnode.dirs = [])
  for (let i = 0; i < directives.length; i++) {
    let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i]
    if (dir) {
      if (isFunction(dir)) {
        dir = {
          mounted: dir,
          updated: dir
        } as ObjectDirective
      }
      if (dir.deep) {
        traverse(value)
      }
      bindings.push({
        dir,
        instance,
        value,
        oldValue: void 0,
        arg,
        modifiers
      })
    }
  }
  return vnode
}
/**
 * 
 * @param vnode 
 * @param prevVNode 
 * @param instance 
 * @param name 
 * `invokeDirectiveHook` 是一个函数，用于调用指令的生命周期钩子函数。它接收以下参数：

1. `vnode`：当前的虚拟节点。
2. `prevVNode`：前一个虚拟节点。
3. `instance`：组件的内部实例。
4. `name`：生命周期钩子函数的名称。

函数首先获取当前虚拟节点的指令数组 `bindings`，以及前一个虚拟节点的指令数组 `oldBindings`（如果有）。然后，它遍历 `bindings` 数组，并为每个指令执行以下操作：

1. 如果存在 `oldBindings`，将前一个虚拟节点的指令值赋给当前指令的 `oldValue` 属性。
2. 获取指令的生命周期钩子函数 `hook`，可能是单个函数或函数数组。
3. 如果处于向后兼容模式 `__COMPAT__` 并且没有找到指令的对应钩子函数，通过 `mapCompatDirectiveHook` 方法进行兼容性处理，得到对应的钩子函数。
4. 如果存在钩子函数 `hook`，则执行以下步骤：
   - 在调用钩子函数之前暂停依赖追踪，以避免在钩子函数执行期间出现不必要的追踪。
   - 使用 `callWithAsyncErrorHandling` 方法调用钩子函数，传递参数 `vnode.el`（元素）、`binding`（指令绑定对象）、`vnode`（当前虚拟节点）和 `prevVNode`（前一个虚拟节点）。
   - 在钩子函数执行完成后重置依赖追踪。

通过调用 `invokeDirectiveHook`，可以触发指令的生命周期钩子函数，并在适当的时机执行相应的逻辑和操作。这样可以与指令相关的行为和交互实现更加灵活和可扩展的功能。
 */
export function invokeDirectiveHook(
  vnode: VNode,
  prevVNode: VNode | null,
  instance: ComponentInternalInstance | null,
  name: keyof ObjectDirective
) {
  const bindings = vnode.dirs!
  const oldBindings = prevVNode && prevVNode.dirs!
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i]
    if (oldBindings) {
      binding.oldValue = oldBindings[i].value
    }
    let hook = binding.dir[name] as DirectiveHook | DirectiveHook[] | undefined
    if (__COMPAT__ && !hook) {
      hook = mapCompatDirectiveHook(name, binding.dir, instance)
    }
    if (hook) {
      // disable tracking inside all lifecycle hooks
      // since they can potentially be called inside effects.
      pauseTracking()
      callWithAsyncErrorHandling(hook, instance, ErrorCodes.DIRECTIVE_HOOK, [
        vnode.el,
        binding,
        vnode,
        prevVNode
      ])
      resetTracking()
    }
  }
}
