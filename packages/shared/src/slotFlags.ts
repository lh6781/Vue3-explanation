/**
 * 这段代码定义了一个名为SlotFlags的常量枚举。它包含了三个枚举成员：STABLE、DYNAMIC和FORWARDED。

STABLE表示稳定的插槽，仅引用插槽属性或上下文状态。该插槽能够完全捕获自身的依赖关系，因此当向下传递时，父级不需要强制子级更新。
DYNAMIC表示动态的插槽，引用了作用域变量（如v-for或外部插槽属性），或具有条件结构（如v-if、v-for）。父级将需要强制子级更新，因为该插槽没有完全捕获其依赖关系。
FORWARDED表示被转发到子组件的<slot/>。父级是否需要更新子级取决于父级本身接收到的插槽类型。这需要在运行时，在创建子级的虚拟节点时（在normalizeChildren中）进行细化。
通过使用常量枚举，可以在代码中使用这些枚举成员来表示不同的插槽类型，并增加代码的可读性和可维护性。常量枚举成员在编译时会被内联，不会在运行时产生额外的开销。
 */
export const enum SlotFlags {
  /**
   * Stable slots that only reference slot props or context state. The slot
   * can fully capture its own dependencies so when passed down the parent won't
   * need to force the child to update.
   */
  STABLE = 1,
  /**
   * Slots that reference scope variables (v-for or an outer slot prop), or
   * has conditional structure (v-if, v-for). The parent will need to force
   * the child to update because the slot does not fully capture its dependencies.
   */
  DYNAMIC = 2,
  /**
   * `<slot/>` being forwarded into a child component. Whether the parent needs
   * to update the child is dependent on what kind of slots the parent itself
   * received. This has to be refined at runtime, when the child's vnode
   * is being created (in `normalizeChildren`)
   */
  FORWARDED = 3
}

/**
 * Dev only
 */
export const slotFlagsText = {
  [SlotFlags.STABLE]: 'STABLE',
  [SlotFlags.DYNAMIC]: 'DYNAMIC',
  [SlotFlags.FORWARDED]: 'FORWARDED'
}
