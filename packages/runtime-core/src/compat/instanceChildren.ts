import { ShapeFlags } from '@vue/shared'
import { ComponentInternalInstance } from '../component'
import { ComponentPublicInstance } from '../componentPublicInstance'
import { VNode } from '../vnode'
import { assertCompatEnabled, DeprecationTypes } from './compatConfig'
/**
 * 
 * @param instance 
 * @returns 
 * `getCompatChildren` 函数用于获取旧版组件实例的子组件数组。

函数接收一个 `instance` 参数，表示组件实例。它会首先通过 `assertCompatEnabled` 函数检查是否启用了 `DeprecationTypes.INSTANCE_CHILDREN` 兼容性选项。

接下来，函数获取组件实例的 `subTree` 属性作为根节点，并创建一个空数组 `children` 来存储子组件。

然后，函数调用 `walk` 方法遍历根节点，将遍历过程中遇到的子组件添加到 `children` 数组中。

最后，函数返回 `children` 数组，其中包含了所有子组件的公共实例对象。

该函数的作用是在兼容模式下获取旧版组件实例的子组件数组。
 */
export function getCompatChildren(
  instance: ComponentInternalInstance
): ComponentPublicInstance[] {
  assertCompatEnabled(DeprecationTypes.INSTANCE_CHILDREN, instance)
  const root = instance.subTree
  const children: ComponentPublicInstance[] = []
  if (root) {
    walk(root, children)
  }
  return children
}
/**
 * 
 * @param vnode 
 * @param children 
 * `walk` 函数用于递归遍历虚拟节点树，并将其中的组件节点添加到 `children` 数组中。

函数接收两个参数：`vnode` 表示当前的虚拟节点，`children` 是存储组件节点的数组。

首先，函数检查当前虚拟节点是否有 `component` 属性，如果有，则表示该节点是一个组件节点，将其对应的公共实例对象（`vnode.component.proxy`）添加到 `children` 数组中。

如果当前节点没有 `component` 属性，而是一个包含子节点的数组节点（通过检查 `shapeFlag & ShapeFlags.ARRAY_CHILDREN` 判断），则函数会对其子节点进行递归遍历。遍历过程中，对每个子节点调用 `walk` 函数，将子节点和 `children` 数组作为参数传入，实现递归遍历。

这样，通过递归遍历整个虚拟节点树，将其中的组件节点添加到 `children` 数组中。

该函数的作用是从虚拟节点树中提取组件节点，并将其存储在 `children` 数组中，以供后续使用。
 */
function walk(vnode: VNode, children: ComponentPublicInstance[]) {
  if (vnode.component) {
    children.push(vnode.component.proxy!)
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    const vnodes = vnode.children as VNode[]
    for (let i = 0; i < vnodes.length; i++) {
      walk(vnodes[i], children)
    }
  }
}
