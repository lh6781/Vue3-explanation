import { ComponentInternalInstance, currentInstance } from './component'
import {
  VNode,
  VNodeNormalizedChildren,
  normalizeVNode,
  VNodeChild,
  InternalObjectKey
} from './vnode'
import {
  isArray,
  isFunction,
  EMPTY_OBJ,
  ShapeFlags,
  extend,
  def,
  SlotFlags,
  Prettify,
  IfAny
} from '@vue/shared'
import { warn } from './warning'
import { isKeepAlive } from './components/KeepAlive'
import { ContextualRenderFn, withCtx } from './componentRenderContext'
import { isHmrUpdating } from './hmr'
import { DeprecationTypes, isCompatEnabled } from './compat/compatConfig'
import { toRaw } from '@vue/reactivity'
import { trigger } from '@vue/reactivity'
import { TriggerOpTypes } from '@vue/reactivity'
/**
 * `Slot` 是一个函数类型，用于定义插槽的类型。

该函数类型接受一个可选的泛型参数 `T`，用于指定插槽的内容类型，默认为 `any` 类型。

函数类型的定义如下：

```typescript
type Slot<T extends any = any> = (
  ...args: IfAny<T, any[], [T] | (T extends undefined ? [] : never)>
) => VNode[];
```

该函数类型接受不定数量的参数 `args`，参数类型根据泛型 `T` 的不同进行了特定的处理。当 `T` 是任意类型（`any`）时，参数类型为 `any[]`（任意类型的数组）。当 `T` 是 `undefined` 类型时，参数类型为 `[]`（空数组）。当 `T` 是其他具体类型时，参数类型为 `[T]`（只包含一个泛型类型的数组）。

函数返回值类型为 `VNode[]`，表示插槽的内容是由虚拟节点组成的数组。
 */
export type Slot<T extends any = any> = (
  ...args: IfAny<T, any[], [T] | (T extends undefined ? [] : never)>
) => VNode[]
/**
 * `InternalSlots` 是一个类型别名，用于定义内部插槽的类型。

该类型别名定义了一个索引签名，索引类型为 `string`，索引键为插槽的名称，值为 `Slot` 类型或 `undefined`。

类型别名的定义如下：

```typescript
export type InternalSlots = {
  [name: string]: Slot | undefined;
};
```

这意味着 `InternalSlots` 是一个对象类型，其中每个属性表示一个内部插槽，属性名为插槽的名称，属性值为对应插槽的函数类型 `Slot` 或 `undefined`。这样的定义允许在组件内部使用不同的插槽，并根据插槽名称进行访问和处理。
 */
export type InternalSlots = {
  [name: string]: Slot | undefined
}
/**
 * `Slots` 是一个类型别名，用于定义插槽的类型。

该类型别名是通过将 `InternalSlots` 类型转为只读（readonly）来创建的。

类型别名的定义如下：

```typescript
export type Slots = Readonly<InternalSlots>;
```

这意味着 `Slots` 是一个只读对象类型，其属性与 `InternalSlots` 完全相同，表示组件的插槽。由于是只读类型，无法对插槽进行修改，保证了插槽的不可变性。通过 `Slots` 类型，可以在组件中访问和使用插槽，而不允许对其进行修改。
 */
export type Slots = Readonly<InternalSlots>
/**
 * `SlotSymbol` 是一个独特的符号（unique symbol），用于标识插槽。

`unique symbol` 是 TypeScript 中的一种特殊的符号类型，它具有唯一性，不同于其他符号或值。通过 `unique symbol` 可以创建具有唯一标识符的变量或属性。

在这个声明中，`SlotSymbol` 被声明为一个独特的符号，用于表示插槽。它可以用作唯一的键或标识符，用于访问或处理插槽相关的内容。

由于只提供了声明而没有具体的实现或赋值语句，因此具体用途需要根据上下文进一步了解。在一些库或框架中，可能使用 `SlotSymbol` 作为插槽的标识符，用于处理插槽相关的逻辑。
 */
declare const SlotSymbol: unique symbol
/**
 * `SlotsType` 是一个泛型类型，用于定义插槽的类型。

在该类型中，使用了 `[SlotSymbol]`，它是一个唯一符号（unique symbol），用于表示插槽的键。通过将 `[SlotSymbol]` 与一个泛型类型 `T` 相关联，可以创建一个具有插槽键和对应类型的类型定义。

该类型定义的含义是：`SlotsType` 是一个对象类型，具有一个键为 `[SlotSymbol]` 的可选属性，该属性的值类型为泛型类型 `T`。通过使用 `[SlotSymbol]` 作为插槽的键，可以将插槽与特定类型相关联。

示例用法：
```typescript
type MySlots = SlotsType<{
  foo: Slot<number>;
  bar?: Slot<string>;
}>;

const slots: MySlots = {
  [SlotSymbol]: {
    foo: () => [createVNode('div', null, 'Hello')],
    bar: (text: string) => [createVNode('span', null, text)]
  }
};
```

在上面的示例中，`MySlots` 表示一个具有两个插槽的类型定义，其中 `foo` 插槽接受一个 `number` 类型的参数，`bar` 插槽是可选的，并接受一个 `string` 类型的参数。通过使用 `[SlotSymbol]` 作为键，将具体的插槽函数与 `MySlots` 相关联。

请注意，`[SlotSymbol]` 是一个独特的符号，用于标识插槽键。这样可以确保插槽键的唯一性，并避免与其他属性或键冲突。
 */
export type SlotsType<T extends Record<string, any> = Record<string, any>> = {
  [SlotSymbol]?: T
}
/**
 * `StrictUnwrapSlotsType` 是一个泛型类型，用于解包严格插槽类型。

在该类型中，使用了 `S` 作为泛型参数，表示输入的插槽类型。通过查找 `S` 中 `[SlotSymbol]` 的属性值类型，即 `S[typeof SlotSymbol]`，来确定解包后的插槽类型。

类型 `StrictUnwrapSlotsType` 的含义是：如果输入的插槽类型 `S` 中存在 `[SlotSymbol]` 属性，那么解包后的类型为 `NonNullable<S[typeof SlotSymbol]>`，即去除可能的 `null` 或 `undefined`。否则，如果 `S` 中不存在 `[SlotSymbol]` 属性，表示没有定义具体的插槽类型，那么解包后的类型为 `Slots`，即默认的插槽类型。

示例用法：
```typescript
type MySlots = SlotsType<{
  [SlotSymbol]: {
    foo: Slot<number>;
    bar?: Slot<string>;
  };
}>;

type UnwrappedSlots = StrictUnwrapSlotsType<MySlots>; // { foo: Slot<number>; bar?: Slot<string> }

type EmptySlots = StrictUnwrapSlotsType<SlotsType>; // Slots
```

在上面的示例中，`MySlots` 是一个具有插槽类型的对象类型，通过使用 `[SlotSymbol]` 将插槽与具体的类型相关联。`UnwrappedSlots` 表示解包后的插槽类型，它的类型为 `{ foo: Slot<number>; bar?: Slot<string> }`，因为 `MySlots` 中存在 `[SlotSymbol]` 属性。

另外，`EmptySlots` 表示没有定义具体插槽类型时的解包后类型，它的类型为 `Slots`，即默认的插槽类型。

总结来说，`StrictUnwrapSlotsType` 用于解包严格插槽类型，并根据是否定义了 `[SlotSymbol]` 属性来确定解包后的类型。
 */
export type StrictUnwrapSlotsType<
  S extends SlotsType,
  T = NonNullable<S[typeof SlotSymbol]>
> = [keyof S] extends [never] ? Slots : Readonly<T>
/**
 * `UnwrapSlotsType` 是一个泛型类型，用于解包插槽类型。

在该类型中，使用了 `S` 作为泛型参数，表示输入的插槽类型。通过查找 `S` 中 `[SlotSymbol]` 的属性值类型，即 `S[typeof SlotSymbol]`，来确定解包后的插槽类型。

类型 `UnwrapSlotsType` 的含义是：如果输入的插槽类型 `S` 中不存在 `[SlotSymbol]` 属性，表示没有定义具体的插槽类型，那么解包后的类型为 `Slots`，即默认的插槽类型。否则，如果 `S` 中存在 `[SlotSymbol]` 属性，表示定义了具体的插槽类型，那么解包后的类型为一个只读的对象类型。

解包后的对象类型中的属性将根据具体的插槽类型进行转换。如果插槽类型是一个函数类型，则保持不变；如果插槽类型不是函数类型，则将其包装为 `Slot` 类型。

示例用法：
```typescript
type MySlots = SlotsType<{
  [SlotSymbol]: {
    foo: Slot<number>;
    bar?: Slot<string>;
  };
}>;

type UnwrappedSlots = UnwrapSlotsType<MySlots>;
// {
//   foo: Slot<number>;
//   bar?: Slot<string>;
// }

type EmptySlots = UnwrapSlotsType<SlotsType>;
// Slots
```

在上面的示例中，`MySlots` 是一个具有插槽类型的对象类型，通过使用 `[SlotSymbol]` 将插槽与具体的类型相关联。`UnwrappedSlots` 表示解包后的插槽类型，它的类型为 `{ foo: Slot<number>; bar?: Slot<string> }`，因为 `MySlots` 中存在 `[SlotSymbol]` 属性。

另外，`EmptySlots` 表示没有定义具体插槽类型时的解包后类型，它的类型为 `Slots`，即默认的插槽类型。

总结来说，`UnwrapSlotsType` 用于解包插槽类型，并根据是否定义了 `[SlotSymbol]` 属性来确定解包后的类型。解包后的类型将根据具体的插槽类型进行转换，并保持只读性。
 */
export type UnwrapSlotsType<
  S extends SlotsType,
  T = NonNullable<S[typeof SlotSymbol]>
> = [keyof S] extends [never]
  ? Slots
  : Readonly<
      Prettify<{
        [K in keyof T]: NonNullable<T[K]> extends (...args: any[]) => any
          ? T[K]
          : Slot<T[K]>
      }>
    >
/**
 * `RawSlots` 是一个类型，用于表示插槽的原始定义。

该类型具有以下属性：

- `[name: string]: unknown`：表示插槽的名称，以字符串为键，对应的值类型为 `unknown`，即未知类型。
- `$stable?: boolean`：可选属性，用于指示插槽的内容是否稳定不变，用于跳过强制更新子节点。
- `_ctx?: ComponentInternalInstance | null`：内部使用的属性，用于跟踪插槽所属的组件实例。在创建组件 vnode 时，通过 `normalizeChildren` 函数将该属性附加到插槽对象上。
- `_?: SlotFlags`：内部使用的属性，指示编译器生成的插槽。这个属性是一个保留属性，用于表示插槽对象是由编译器生成的，并且需要保留优化提示信息。

总结来说，`RawSlots` 是表示插槽的原始定义的类型，包含了插槽的名称和相关属性。这些属性在插槽的编译和处理过程中起到不同的作用，用于控制插槽的行为和优化。
 */
export type RawSlots = {
  [name: string]: unknown
  // manual render fn hint to skip forced children updates
  $stable?: boolean
  /**
   * for tracking slot owner instance. This is attached during
   * normalizeChildren when the component vnode is created.
   * @internal
   */
  _ctx?: ComponentInternalInstance | null
  /**
   * indicates compiler generated slots
   * we use a reserved property instead of a vnode patchFlag because the slots
   * object may be directly passed down to a child component in a manual
   * render function, and the optimization hint need to be on the slot object
   * itself to be preserved.
   * @internal
   */
  _?: SlotFlags
}
/**
 * 
 * @param key 
 * @returns 
 * `isInternalKey` 函数用于判断给定的键名是否是与插槽相关的内部键。它接受一个 `key` 参数，类型为 `string`，并返回一个布尔值，指示该键名是否是内部键。

在这个函数中，它检查键名的第一个字符是否为下划线 (`_`)，或者键名是否为 `'$stable'`。如果这些条件中的任何一个为真，那么说明该键名是内部键，函数返回 `true`。否则，返回 `false`，表示该键名不是内部键。

在插槽的上下文中，内部键通常用于保留属性或标志，用于提供关于插槽行为的附加信息或控制。
 */
const isInternalKey = (key: string) => key[0] === '_' || key === '$stable'
/**
 * 
 * @param value 
 * @returns 
 * `normalizeSlotValue` 函数用于将插槽的值规范化为 `VNode` 数组。它接受一个 `value` 参数，类型为 `unknown`，表示插槽的值，然后返回一个 `VNode` 数组。

该函数首先检查 `value` 是否为数组，如果是，则遍历数组中的每个元素，并通过调用 `normalizeVNode` 函数对每个元素进行规范化，将其转换为 `VNode`。最终，返回规范化后的 `VNode` 数组。

如果 `value` 不是数组，则将其作为单个值传递给 `normalizeVNode` 函数进行规范化，并将结果包装在一个包含单个元素的数组中。

通过这个函数，我们可以确保插槽的值始终以规范化的 `VNode` 数组形式使用，无论是单个值还是数组。这有助于统一处理插槽的值，并在渲染过程中进行统一的处理和操作。
 */
const normalizeSlotValue = (value: unknown): VNode[] =>
  isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value as VNodeChild)]
/**
 * 
 * @param key 
 * @param rawSlot 
 * @param ctx 
 * @returns 
 * `normalizeSlot` 函数用于规范化插槽。它接受三个参数：`key` 表示插槽的名称，`rawSlot` 表示原始的插槽函数，`ctx` 表示组件实例的上下文。

首先，函数会检查 `rawSlot` 是否已经被规范化过，通过检查 `_n` 属性是否存在来判断。如果已经规范化过，则直接将 `rawSlot` 转换为 `Slot` 类型并返回。

如果 `rawSlot` 尚未规范化，则创建一个新的规范化函数。这个规范化函数接受任意数量的参数，并在执行时进行一些额外的检查。例如，如果在非渲染函数之外调用了插槽函数，则会发出警告，因为这样的调用不会跟踪插槽中使用的依赖项。然后，将调用 `rawSlot(...args)` 获取插槽的原始值，并通过调用 `normalizeSlotValue` 函数将其规范化为 `VNode` 数组。

接下来，设置规范化函数的 `_c` 属性为 `false`，表示这不是一个编译过的插槽。

最后，返回规范化后的插槽函数。

通过这个函数，我们可以确保插槽在使用之前都被正确地规范化，以便在渲染过程中使用，并且能够跟踪插槽中使用的依赖项。如果插槽函数在非渲染函数之外被调用，函数会发出警告，提醒开发者应该在渲染函数内调用插槽函数。这样可以确保依赖项的正确跟踪和更新。
 */
const normalizeSlot = (
  key: string,
  rawSlot: Function,
  ctx: ComponentInternalInstance | null | undefined
): Slot => {
  if ((rawSlot as any)._n) {
    // already normalized - #5353
    return rawSlot as Slot
  }
  const normalized = withCtx((...args: any[]) => {
    if (__DEV__ && currentInstance) {
      warn(
        `Slot "${key}" invoked outside of the render function: ` +
          `this will not track dependencies used in the slot. ` +
          `Invoke the slot function inside the render function instead.`
      )
    }
    return normalizeSlotValue(rawSlot(...args))
  }, ctx) as Slot
  // NOT a compiled slot
  ;(normalized as ContextualRenderFn)._c = false
  return normalized
}
/**
 * 
 * @param rawSlots 
 * @param slots 
 * @param instance 
 * `normalizeObjectSlots` 函数用于规范化对象类型的插槽。它接受三个参数：`rawSlots` 表示原始的插槽对象，`slots` 表示用于存储规范化后插槽的目标对象，`instance` 表示组件实例。

首先，从 `rawSlots` 中获取 `_ctx` 属性作为插槽的上下文。

然后，对 `rawSlots` 对象进行迭代，处理每个插槽。如果遇到以 `_` 开头的属性（如 `_ctx` 和 `$stable`），则跳过该属性。

对于非函数类型的属性值，会发出警告提示开发者使用函数类型的插槽以获得更好的性能。然后，将属性值通过调用 `normalizeSlotValue` 函数进行规范化，并将规范化后的结果作为返回函数。

对于函数类型的属性值，调用 `normalizeSlot` 函数对插槽进行规范化，并将规范化后的插槽函数赋值给 `slots` 对象的对应属性。

通过这个函数，我们可以将对象类型的插槽规范化为统一的函数类型插槽，并存储到 `slots` 对象中，以便在渲染过程中使用。如果插槽的属性值不是函数类型，则发出警告提示开发者使用函数类型的插槽以获得更好的性能。
 */
const normalizeObjectSlots = (
  rawSlots: RawSlots,
  slots: InternalSlots,
  instance: ComponentInternalInstance
) => {
  const ctx = rawSlots._ctx
  for (const key in rawSlots) {
    if (isInternalKey(key)) continue
    const value = rawSlots[key]
    if (isFunction(value)) {
      slots[key] = normalizeSlot(key, value, ctx)
    } else if (value != null) {
      if (
        __DEV__ &&
        !(
          __COMPAT__ &&
          isCompatEnabled(DeprecationTypes.RENDER_FUNCTION, instance)
        )
      ) {
        warn(
          `Non-function value encountered for slot "${key}". ` +
            `Prefer function slots for better performance.`
        )
      }
      const normalized = normalizeSlotValue(value)
      slots[key] = () => normalized
    }
  }
}
/**
 * 
 * @param instance 
 * @param children 
 * `normalizeVNodeSlots` 函数用于规范化默认插槽（default slot）。它接受两个参数：`instance` 表示组件实例，`children` 表示默认插槽的子节点。

首先，如果当前组件实例的虚拟节点不是 `KeepAlive` 组件，并且未启用渲染函数的兼容模式，则发出警告提示开发者使用函数类型的默认插槽以获得更好的性能。

然后，调用 `normalizeSlotValue` 函数对默认插槽的子节点进行规范化，并将规范化后的结果赋值给变量 `normalized`。

最后，将默认插槽的函数定义为一个返回 `normalized` 的函数，并将该函数赋值给组件实例的 `slots.default` 属性。

通过这个函数，我们可以将默认插槽的子节点规范化为一个函数类型的插槽，并将其存储在组件实例的 `slots` 对象的 `default` 属性中，以便在渲染过程中使用。如果默认插槽的子节点不是函数类型，则发出警告提示开发者使用函数类型的默认插槽以获得更好的性能。
 */
const normalizeVNodeSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (
    __DEV__ &&
    !isKeepAlive(instance.vnode) &&
    !(__COMPAT__ && isCompatEnabled(DeprecationTypes.RENDER_FUNCTION, instance))
  ) {
    warn(
      `Non-function value encountered for default slot. ` +
        `Prefer function slots for better performance.`
    )
  }
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}
/**
 * 
 * @param instance 
 * @param children 
 * `initSlots` 函数用于初始化组件实例的插槽（slots）。它接受两个参数：`instance` 表示组件实例，`children` 表示插槽的子节点。

首先，检查组件实例的虚拟节点的 `shapeFlag` 是否包含 `ShapeFlags.SLOTS_CHILDREN` 标记，以确定是否存在插槽。

如果存在插槽，则检查子节点 `children` 的类型 `type` 是否存在。如果存在类型 `type`，则表示用户已经提供了原始的插槽对象，我们将该插槽对象赋值给组件实例的 `slots` 属性，并使用 `def` 函数将 `_` 属性定义为 `type` 的值，同时确保 `_` 属性不可枚举。

如果不存在类型 `type`，则调用 `normalizeObjectSlots` 函数对 `children` 进行规范化，将规范化后的插槽存储在组件实例的 `slots` 对象中。

如果虚拟节点的 `shapeFlag` 不包含 `ShapeFlags.SLOTS_CHILDREN` 标记，则表示不存在插槽，将组件实例的 `slots` 对象初始化为空对象。

接下来，如果 `children` 存在，则调用 `normalizeVNodeSlots` 函数对默认插槽进行规范化，将规范化后的结果存储在组件实例的 `slots.default` 属性中。

最后，使用 `def` 函数将组件实例的 `slots` 对象的 `InternalObjectKey` 属性定义为 `1`，用于标记该对象是一个内部对象。

通过这个函数，我们可以初始化组件实例的插槽，并根据子节点的类型进行不同的处理，包括规范化原始插槽对象、规范化默认插槽子节点等。同时，还会添加一些标记属性用于内部标识和控制插槽对象的行为。
 */
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const type = (children as RawSlots)._
    if (type) {
      // users can get the shallow readonly version of the slots object through `this.$slots`,
      // we should avoid the proxy object polluting the slots of the internal instance
      instance.slots = toRaw(children as InternalSlots)
      // make compiler marker non-enumerable
      def(children as InternalSlots, '_', type)
    } else {
      normalizeObjectSlots(
        children as RawSlots,
        (instance.slots = {}),
        instance
      )
    }
  } else {
    instance.slots = {}
    if (children) {
      normalizeVNodeSlots(instance, children)
    }
  }
  def(instance.slots, InternalObjectKey, 1)
}
/**
 * 
 * @param instance 
 * @param children 
 * @param optimized
 *`updateSlots` 函数用于更新组件实例的插槽（slots）。它接受三个参数：`instance` 表示组件实例，`children` 表示插槽的子节点，`optimized` 表示是否启用优化。

首先，获取组件实例的虚拟节点 `vnode` 和插槽对象 `slots`。

然后，初始化一些变量，包括 `needDeletionCheck`（是否需要进行删除检查）和 `deletionComparisonTarget`（删除比较的目标对象）。这些变量将用于后续的删除操作。

接下来，检查虚拟节点的 `shapeFlag` 是否包含 `ShapeFlags.SLOTS_CHILDREN` 标记，以确定是否存在插槽。

如果存在插槽，则检查子节点 `children` 的类型 `type` 是否存在。如果存在类型 `type`，表示存在编译后的插槽对象。根据不同的情况进行处理：

- 如果处于 HMR 更新状态，将编译后的插槽对象直接扩展到 `slots` 中，并触发组件实例的 `$slots` 的更新。
- 如果启用了优化且类型 `type` 为 `SlotFlags.STABLE`，表示编译后的插槽对象是稳定的，无需更新，并且跳过删除过期插槽的步骤。
- 否则，将编译后的插槽对象扩展到 `slots` 中，并根据优化的情况删除 `slots._` 属性。

如果类型 `type` 不存在，表示存在原始的插槽对象。设置 `needDeletionCheck` 为 `!(children as RawSlots).$stable`，表示需要进行删除检查。然后调用 `normalizeObjectSlots` 函数对原始插槽对象进行规范化，并将规范化后的插槽存储在 `slots` 中。

如果虚拟节点的 `shapeFlag` 不包含 `ShapeFlags.SLOTS_CHILDREN` 标记，则表示不存在插槽。将组件实例的 `slots` 对象初始化为空对象，并调用 `normalizeVNodeSlots` 函数对默认插槽进行规范化。

接下来，如果需要进行删除检查，遍历 `slots` 中的属性，删除不是内部属性且不在 `deletionComparisonTarget` 中的插槽。

通过这个函数，我们可以根据传入的子节点更新组件实例的插槽，并根据优化的情况进行不同的处理，包括扩展编译后的插槽对象、规范化原始插槽对象、规范化默认插槽子节点等。同时，还会进行删除过期插槽的操作，确保插槽对象与最新的子节点保持同步。
 */
export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren,
  optimized: boolean
) => {
  const { vnode, slots } = instance
  let needDeletionCheck = true
  let deletionComparisonTarget = EMPTY_OBJ
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const type = (children as RawSlots)._
    if (type) {
      // compiled slots.
      if (__DEV__ && isHmrUpdating) {
        // Parent was HMR updated so slot content may have changed.
        // force update slots and mark instance for hmr as well
        extend(slots, children as Slots)
        trigger(instance, TriggerOpTypes.SET, '$slots')
      } else if (optimized && type === SlotFlags.STABLE) {
        // compiled AND stable.
        // no need to update, and skip stale slots removal.
        needDeletionCheck = false
      } else {
        // compiled but dynamic (v-if/v-for on slots) - update slots, but skip
        // normalization.
        extend(slots, children as Slots)
        // #2893
        // when rendering the optimized slots by manually written render function,
        // we need to delete the `slots._` flag if necessary to make subsequent updates reliable,
        // i.e. let the `renderSlot` create the bailed Fragment
        if (!optimized && type === SlotFlags.STABLE) {
          delete slots._
        }
      }
    } else {
      needDeletionCheck = !(children as RawSlots).$stable
      normalizeObjectSlots(children as RawSlots, slots, instance)
    }
    deletionComparisonTarget = children as RawSlots
  } else if (children) {
    // non slot object children (direct value) passed to a component
    normalizeVNodeSlots(instance, children)
    deletionComparisonTarget = { default: 1 }
  }

  // delete stale slots
  if (needDeletionCheck) {
    for (const key in slots) {
      if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
        delete slots[key]
      }
    }
  }
}
