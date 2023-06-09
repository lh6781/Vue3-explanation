import { Data } from '../component'
import { Slots, RawSlots } from '../componentSlots'
import {
  ContextualRenderFn,
  currentRenderingInstance
} from '../componentRenderContext'
import {
  Comment,
  isVNode,
  VNodeArrayChildren,
  openBlock,
  createBlock,
  Fragment,
  VNode
} from '../vnode'
import { PatchFlags, SlotFlags } from '@vue/shared'
import { warn } from '../warning'
import { createVNode } from '@vue/runtime-core'
import { isAsyncWrapper } from '../apiAsyncComponent'

/**
 * Compiler runtime helper for rendering `<slot/>`
 * @private
 * `renderSlot` 函数用于渲染插槽内容。

函数接收五个参数：
- `slots: Slots`：插槽对象，包含了组件模板中定义的插槽函数。
- `name: string`：插槽名称。
- `props: Data = {}`：插槽的 props 数据，默认为空对象。
- `fallback?: () => VNodeArrayChildren`：可选参数，用于指定插槽内容为空时的回退函数，默认为 `undefined`。
- `noSlotted?: boolean`：可选参数，用于指定是否禁用插槽内容的作用域插槽，默认为 `false`。

函数的逻辑如下：
- 首先，函数会判断当前的渲染实例是否是自定义元素或异步包裹组件的子组件，如果是，则会创建一个 `slot` 的 `VNode`，并将 props 和回退函数的结果作为其子节点，然后返回该 `VNode`。
- 如果不是上述情况，则会获取对应名称的插槽函数，并进行一些检查和设置：
  - 如果插槽函数存在且长度大于 1，会在开发环境下发出警告，并将插槽函数重置为空数组的函数。
  - 如果插槽函数是编译生成的函数，会强制启用块跟踪，以避免手动调用干扰基于模板的块跟踪。
- 然后，函数会创建一个块（block）并调用插槽函数来生成插槽内容，并确保生成的插槽内容是有效的 `VNode`。
- 接下来，函数会创建一个 `Fragment` 的块，并将插槽内容或回退函数的结果作为子节点，并根据插槽内容的稳定性设置相应的 `PatchFlag`。
- 如果 `noSlotted` 参数为 `false`，并且生成的 `VNode` 存在作用域 ID，则将作用域 ID 添加到 `VNode` 的 `slotScopeIds` 属性中。
- 最后，如果插槽函数是编译生成的函数，会将块跟踪重新设置为默认值。
- 函数返回生成的 `VNode`。

通过调用 `renderSlot` 函数，可以在组件的模板中渲染插槽内容。根据不同的情况，函数会根据插槽函数的返回值或回退函数的结果来生成相应的 `VNode`。同时，函数会处理作用域插槽、块跟踪等相关逻辑，确保插槽内容的正确渲染。
 */
export function renderSlot(
  slots: Slots,
  name: string,
  props: Data = {},
  // this is not a user-facing function, so the fallback is always generated by
  // the compiler and guaranteed to be a function returning an array
  fallback?: () => VNodeArrayChildren,
  noSlotted?: boolean
): VNode {
  if (
    currentRenderingInstance!.isCE ||
    (currentRenderingInstance!.parent &&
      isAsyncWrapper(currentRenderingInstance!.parent) &&
      currentRenderingInstance!.parent.isCE)
  ) {
    if (name !== 'default') props.name = name
    return createVNode('slot', props, fallback && fallback())
  }

  let slot = slots[name]

  if (__DEV__ && slot && slot.length > 1) {
    warn(
      `SSR-optimized slot function detected in a non-SSR-optimized render ` +
        `function. You need to mark this component with $dynamic-slots in the ` +
        `parent template.`
    )
    slot = () => []
  }

  // a compiled slot disables block tracking by default to avoid manual
  // invocation interfering with template-based block tracking, but in
  // `renderSlot` we can be sure that it's template-based so we can force
  // enable it.
  if (slot && (slot as ContextualRenderFn)._c) {
    ;(slot as ContextualRenderFn)._d = false
  }
  openBlock()
  const validSlotContent = slot && ensureValidVNode(slot(props))
  const rendered = createBlock(
    Fragment,
    {
      key:
        props.key ||
        // slot content array of a dynamic conditional slot may have a branch
        // key attached in the `createSlots` helper, respect that
        (validSlotContent && (validSlotContent as any).key) ||
        `_${name}`
    },
    validSlotContent || (fallback ? fallback() : []),
    validSlotContent && (slots as RawSlots)._ === SlotFlags.STABLE
      ? PatchFlags.STABLE_FRAGMENT
      : PatchFlags.BAIL
  )
  if (!noSlotted && rendered.scopeId) {
    rendered.slotScopeIds = [rendered.scopeId + '-s']
  }
  if (slot && (slot as ContextualRenderFn)._c) {
    ;(slot as ContextualRenderFn)._d = true
  }
  return rendered
}
/**
 * 
 * @param vnodes 
 * @returns 
 * `ensureValidVNode` 函数用于确保一组 VNode 是有效的，并且至少包含一个有效的 VNode。

该函数接受一个 VNode 数组 `vnodes` 作为输入，并执行以下检查：
- 遍历 `vnodes` 数组中的每个子节点。
- 如果子节点不是有效的 VNode（即不是具有所需 VNode 属性的对象），则返回 `true`，表示存在无效的节点。

如果存在至少一个有效的 VNode，则返回 `vnodes` 数组；否则返回 `null`。
 */
function ensureValidVNode(vnodes: VNodeArrayChildren) {
  return vnodes.some(child => {
    if (!isVNode(child)) return true
    if (child.type === Comment) return false
    if (
      child.type === Fragment &&
      !ensureValidVNode(child.children as VNodeArrayChildren)
    )
      return false
    return true
  })
    ? vnodes
    : null
}
