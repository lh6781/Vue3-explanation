/**
 * ShapeFlags 是一个常量枚举，用于表示虚拟节点的不同形态。

它定义了以下常量值：

ELEMENT：表示虚拟节点是一个普通元素节点。
FUNCTIONAL_COMPONENT：表示虚拟节点是一个函数式组件。
STATEFUL_COMPONENT：表示虚拟节点是一个有状态组件。
TEXT_CHILDREN：表示虚拟节点具有文本子节点。
ARRAY_CHILDREN：表示虚拟节点具有数组类型的子节点。
SLOTS_CHILDREN：表示虚拟节点具有插槽类型的子节点。
TELEPORT：表示虚拟节点是一个传送门（Teleport）节点。
SUSPENSE：表示虚拟节点是一个悬挂（Suspense）节点。
COMPONENT_SHOULD_KEEP_ALIVE：表示组件应该保持活跃。
COMPONENT_KEPT_ALIVE：表示组件被保持活跃。
COMPONENT：表示虚拟节点是一个组件，可以是函数式组件或有状态组件。
这些常量值通过位运算进行组合和判断，以便表示虚拟节点的不同特征和类型。通过组合不同的标志位，可以轻松地表示虚拟节点的复杂形态和特征。

例如，如果一个虚拟节点同时具有 ELEMENT 和 ARRAY_CHILDREN 标志，可以通过将这两个标志的值进行按位或运算来表示：ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN。

这样的设计可以在虚拟节点的创建、渲染和更新等过程中进行快速的判断和优化，以提高性能和效率。
 */
export const enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
