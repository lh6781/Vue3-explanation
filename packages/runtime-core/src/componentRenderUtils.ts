import {
  ComponentInternalInstance,
  FunctionalComponent,
  Data,
  getComponentName
} from './component'
import {
  VNode,
  normalizeVNode,
  createVNode,
  Comment,
  cloneVNode,
  VNodeArrayChildren,
  isVNode,
  blockStack
} from './vnode'
import { handleError, ErrorCodes } from './errorHandling'
import { PatchFlags, ShapeFlags, isOn, isModelListener } from '@vue/shared'
import { warn } from './warning'
import { isHmrUpdating } from './hmr'
import { NormalizedProps } from './componentProps'
import { isEmitListener } from './componentEmits'
import { setCurrentRenderingInstance } from './componentRenderContext'
import {
  DeprecationTypes,
  isCompatEnabled,
  warnDeprecation
} from './compat/compatConfig'

/**
 * dev only flag to track whether $attrs was used during render.
 * If $attrs was used during render then the warning for failed attrs
 * fallthrough can be suppressed.
 * `accessedAttrs` 是一个布尔变量，用于跟踪是否已经访问过属性。

它的初始值为 `false`，表示尚未访问过属性。

在代码中，`accessedAttrs` 可能会被用于记录是否已经访问过某些属性，以便在需要时进行相应的处理或发出警告。
 */
let accessedAttrs: boolean = false
/**
 * `markAttrsAccessed` 是一个函数，用于将 `accessedAttrs` 标记为已访问状态。

调用 `markAttrsAccessed` 函数会将 `accessedAttrs` 设置为 `true`，表示已经访问过属性。

在代码中，`markAttrsAccessed` 可能会在某些情况下被调用，以便在访问属性后进行标记，以便后续处理或发出相应的警告。
 */
export function markAttrsAccessed() {
  accessedAttrs = true
}
/**
 * `SetRootFn` 是一个类型别名，表示一个函数类型。它可以是一个接受一个 `root` 参数并且没有返回值的函数，或者是一个 `undefined` 值。

在类型别名中，`SetRootFn` 定义了两种可能的函数签名：

1. `(root: VNode) => void`：一个接受一个 `root` 参数并且没有返回值的函数。
2. `undefined`：表示该函数可能为 `undefined` 值，即未定义。

这个类型别名通常用于描述接受一个 `root` 参数的函数，用于设置根节点的操作。
 */
type SetRootFn = ((root: VNode) => void) | undefined
/**
 * 
 * @param instance 
 * @returns 
 * `renderComponentRoot` 是一个函数，接受一个 `instance` 参数，返回一个 `VNode`。

函数中的主要逻辑如下：

1. 从 `instance` 中解构出组件相关的属性和选项，如 `type`、`vnode`、`proxy`、`withProxy`、`props`、`propsOptions`、`slots`、`attrs`、`emit`、`render`、`renderCache`、`data`、`setupState`、`ctx` 和 `inheritAttrs`。

2. 设置当前渲染实例为 `instance`。

3. 如果处于开发模式下，将 `accessedAttrs` 标记为 `false`。

4. 在 `try` 块中执行渲染逻辑：
   - 如果组件是有状态的组件（`vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT`），则调用 `render` 函数并传入相关参数进行渲染，并通过 `normalizeVNode` 将结果标准化为 `VNode`。
   - 如果组件是函数式组件，则将 `Component` 视为渲染函数，并根据函数参数个数的不同传入相应的参数进行渲染。同样使用 `normalizeVNode` 将结果标准化为 `VNode`。
   - 在渲染过程中捕获可能出现的错误，并进行错误处理。

5. 处理属性的合并和继承：
   - 如果存在 `fallthroughAttrs` 并且 `inheritAttrs` 不等于 `false`，则进行属性合并的逻辑。
   - 根据 `root` 的 `shapeFlag` 进行判断：
     - 如果 `shapeFlag` 是 `ShapeFlags.ELEMENT` 或 `ShapeFlags.COMPONENT`，并且存在 `propsOptions` 和其中包含 `isModelListener` 的属性，则过滤掉 `fallthroughAttrs` 中的 `v-model` 相关属性，以避免冲突。
     - 如果处于开发模式下，并且没有访问过属性（`!accessedAttrs`），并且 `root.type` 不是 `Comment` 类型，则发出警告，提示用户存在额外的非属性属性。
   - 如果满足以上条件，则通过 `cloneVNode` 克隆 `root` 并将 `fallthroughAttrs` 应用到克隆的 `VNode` 上。

6. 在兼容模式下，如果启用了属性 `class` 和 `style` 的兼容性处理，并且 `vnode.shapeFlag` 是 `ShapeFlags.STATEFUL_COMPONENT`，并且 `root.shapeFlag` 是 `ShapeFlags.ELEMENT` 或 `ShapeFlags.COMPONENT`，则将 `vnode.props` 中的 `class` 和 `style` 属性应用到 `root` 上。

7. 继承指令（directives）和过渡数据（transition data）：
   - 如果 `vnode` 中存在指令（`dirs`），则将其继承到 `root` 上。
   - 如果 `vnode` 中存在过渡（`transition`），则将其继承到 `root` 上。

8. 根据情况

返回结果 `result` 或经过特殊处理后的 `root`。

9. 恢复之前的渲染实例。

10. 返回结果 `result`。

该函数的作用是渲染组件的根节点，并对属性进行合并和继承处理。如果组件是有状态组件，则执行组件的 `render` 函数进行渲染；如果组件是函数式组件，则执行组件本身作为渲染函数进行渲染。在渲染过程中，会捕获可能出现的错误，并进行错误处理。最后，返回经过处理的根节点 `result`。
 */
export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const {
    type: Component,
    vnode,
    proxy,
    withProxy,
    props,
    propsOptions: [propsOptions],
    slots,
    attrs,
    emit,
    render,
    renderCache,
    data,
    setupState,
    ctx,
    inheritAttrs
  } = instance

  let result
  let fallthroughAttrs
  const prev = setCurrentRenderingInstance(instance)
  if (__DEV__) {
    accessedAttrs = false
  }

  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // withProxy is a proxy with a different `has` trap only for
      // runtime-compiled render functions using `with` block.
      const proxyToUse = withProxy || proxy
      result = normalizeVNode(
        render!.call(
          proxyToUse,
          proxyToUse!,
          renderCache,
          props,
          setupState,
          data,
          ctx
        )
      )
      fallthroughAttrs = attrs
    } else {
      // functional
      const render = Component as FunctionalComponent
      // in dev, mark attrs accessed if optional props (attrs === props)
      if (__DEV__ && attrs === props) {
        markAttrsAccessed()
      }
      result = normalizeVNode(
        render.length > 1
          ? render(
              props,
              __DEV__
                ? {
                    get attrs() {
                      markAttrsAccessed()
                      return attrs
                    },
                    slots,
                    emit
                  }
                : { attrs, slots, emit }
            )
          : render(props, null as any /* we know it doesn't need it */)
      )
      fallthroughAttrs = Component.props
        ? attrs
        : getFunctionalFallthrough(attrs)
    }
  } catch (err) {
    blockStack.length = 0
    handleError(err, instance, ErrorCodes.RENDER_FUNCTION)
    result = createVNode(Comment)
  }

  // attr merging
  // in dev mode, comments are preserved, and it's possible for a template
  // to have comments along side the root element which makes it a fragment
  let root = result
  let setRoot: SetRootFn = undefined
  if (
    __DEV__ &&
    result.patchFlag > 0 &&
    result.patchFlag & PatchFlags.DEV_ROOT_FRAGMENT
  ) {
    ;[root, setRoot] = getChildRoot(result)
  }

  if (fallthroughAttrs && inheritAttrs !== false) {
    const keys = Object.keys(fallthroughAttrs)
    const { shapeFlag } = root
    if (keys.length) {
      if (shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.COMPONENT)) {
        if (propsOptions && keys.some(isModelListener)) {
          // If a v-model listener (onUpdate:xxx) has a corresponding declared
          // prop, it indicates this component expects to handle v-model and
          // it should not fallthrough.
          // related: #1543, #1643, #1989
          fallthroughAttrs = filterModelListeners(
            fallthroughAttrs,
            propsOptions
          )
        }
        root = cloneVNode(root, fallthroughAttrs)
      } else if (__DEV__ && !accessedAttrs && root.type !== Comment) {
        const allAttrs = Object.keys(attrs)
        const eventAttrs: string[] = []
        const extraAttrs: string[] = []
        for (let i = 0, l = allAttrs.length; i < l; i++) {
          const key = allAttrs[i]
          if (isOn(key)) {
            // ignore v-model handlers when they fail to fallthrough
            if (!isModelListener(key)) {
              // remove `on`, lowercase first letter to reflect event casing
              // accurately
              eventAttrs.push(key[2].toLowerCase() + key.slice(3))
            }
          } else {
            extraAttrs.push(key)
          }
        }
        if (extraAttrs.length) {
          warn(
            `Extraneous non-props attributes (` +
              `${extraAttrs.join(', ')}) ` +
              `were passed to component but could not be automatically inherited ` +
              `because component renders fragment or text root nodes.`
          )
        }
        if (eventAttrs.length) {
          warn(
            `Extraneous non-emits event listeners (` +
              `${eventAttrs.join(', ')}) ` +
              `were passed to component but could not be automatically inherited ` +
              `because component renders fragment or text root nodes. ` +
              `If the listener is intended to be a component custom event listener only, ` +
              `declare it using the "emits" option.`
          )
        }
      }
    }
  }

  if (
    __COMPAT__ &&
    isCompatEnabled(DeprecationTypes.INSTANCE_ATTRS_CLASS_STYLE, instance) &&
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT &&
    root.shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.COMPONENT)
  ) {
    const { class: cls, style } = vnode.props || {}
    if (cls || style) {
      if (__DEV__ && inheritAttrs === false) {
        warnDeprecation(
          DeprecationTypes.INSTANCE_ATTRS_CLASS_STYLE,
          instance,
          getComponentName(instance.type)
        )
      }
      root = cloneVNode(root, {
        class: cls,
        style: style
      })
    }
  }

  // inherit directives
  if (vnode.dirs) {
    if (__DEV__ && !isElementRoot(root)) {
      warn(
        `Runtime directive used on component with non-element root node. ` +
          `The directives will not function as intended.`
      )
    }
    // clone before mutating since the root may be a hoisted vnode
    root = cloneVNode(root)
    root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs
  }
  // inherit transition data
  if (vnode.transition) {
    if (__DEV__ && !isElementRoot(root)) {
      warn(
        `Component inside <Transition> renders non-element root node ` +
          `that cannot be animated.`
      )
    }
    root.transition = vnode.transition
  }

  if (__DEV__ && setRoot) {
    setRoot(root)
  } else {
    result = root
  }

  setCurrentRenderingInstance(prev)
  return result
}

/**
 * dev only
 * In dev mode, template root level comments are rendered, which turns the
 * template into a fragment root, but we need to locate the single element
 * root for attrs and scope id processing.
 * `getChildRoot` 是一个函数，接受一个 `vnode` 参数，返回一个包含两个元素的数组 `[VNode, SetRootFn]`。

函数中的主要逻辑如下：

1. 将 `vnode.children` 强制转换为 `VNodeArrayChildren` 类型，并将 `vnode.dynamicChildren` 赋值给 `dynamicChildren`。

2. 通过 `filterSingleRoot` 函数过滤出 `rawChildren` 中的单个根节点，将结果赋值给 `childRoot`。

3. 如果 `childRoot` 不存在，则返回 `[vnode, undefined]`。

4. 查找 `childRoot` 在 `rawChildren` 中的索引，并将结果赋值给 `index`，如果 `dynamicChildren` 存在，则查找 `childRoot` 在 `dynamicChildren` 中的索引，并将结果赋值给 `dynamicIndex`，否则将 `dynamicIndex` 设置为 `-1`。

5. 定义 `setRoot` 函数，用于设置更新后的根节点。该函数接受一个参数 `updatedRoot`，将 `rawChildren[index]` 更新为 `updatedRoot`。如果 `dynamicChildren` 存在，则根据 `dynamicIndex` 的值进行更新：如果 `dynamicIndex` 大于 `-1`，则将 `dynamicChildren[dynamicIndex]` 更新为 `updatedRoot`；否则，如果 `updatedRoot.patchFlag > 0`，将 `updatedRoot` 添加到 `dynamicChildren` 中。

6. 返回标准化后的 `childRoot`（通过 `normalizeVNode` 函数处理）和 `setRoot` 函数。

该函数的作用是从 `vnode` 的子节点中获取单个根节点，并返回标准化后的根节点以及一个用于设置更新后根节点的函数 `setRoot`。如果 `vnode` 的子节点不满足单个根节点的条件，则返回原始的 `vnode` 和 `undefined`。
 */
const getChildRoot = (vnode: VNode): [VNode, SetRootFn] => {
  const rawChildren = vnode.children as VNodeArrayChildren
  const dynamicChildren = vnode.dynamicChildren
  const childRoot = filterSingleRoot(rawChildren)
  if (!childRoot) {
    return [vnode, undefined]
  }
  const index = rawChildren.indexOf(childRoot)
  const dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1
  const setRoot: SetRootFn = (updatedRoot: VNode) => {
    rawChildren[index] = updatedRoot
    if (dynamicChildren) {
      if (dynamicIndex > -1) {
        dynamicChildren[dynamicIndex] = updatedRoot
      } else if (updatedRoot.patchFlag > 0) {
        vnode.dynamicChildren = [...dynamicChildren, updatedRoot]
      }
    }
  }
  return [normalizeVNode(childRoot), setRoot]
}
/**
 * 
 * @param children 
 * @returns 
 * `filterSingleRoot` 是一个函数，接受一个 `children` 参数，类型为 `VNodeArrayChildren`，并返回一个 `VNode` 或 `undefined`。

函数中的逻辑如下：

1. 声明一个变量 `singleRoot`，用于保存找到的单个根节点。

2. 遍历 `children` 数组，对于每个元素 `child`，执行以下操作：

   - 如果 `child` 是一个 `VNode`，并且它的类型不是注释节点或者注释节点的内容为 'v-if'，则执行以下操作：
   
     - 如果已经存在 `singleRoot`，说明已经找到了多个非注释节点的子节点，直接返回 `undefined`。
     
     - 否则，将当前的 `child` 赋值给 `singleRoot`。
   
   - 如果 `child` 不是 `VNode`，直接返回 `undefined`。

3. 遍历完成后，如果 `singleRoot` 存在，则返回它作为结果，否则返回 `undefined`。

该函数的作用是从 `children` 中过滤出单个的根节点，并返回该节点。如果 `children` 中存在多个非注释节点的子节点，则返回 `undefined`。
 */
export function filterSingleRoot(
  children: VNodeArrayChildren
): VNode | undefined {
  let singleRoot
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isVNode(child)) {
      // ignore user comment
      if (child.type !== Comment || child.children === 'v-if') {
        if (singleRoot) {
          // has more than 1 non-comment child, return now
          return
        } else {
          singleRoot = child
        }
      }
    } else {
      return
    }
  }
  return singleRoot
}
/**
 * 
 * @param attrs 
 * @returns 
 * `getFunctionalFallthrough` 是一个函数，接受一个 `attrs` 参数，类型为 `Data`，并返回一个 `Data` 或 `undefined`。

函数中的逻辑如下：

1. 声明一个变量 `res`，用于保存过滤后的属性。

2. 遍历 `attrs` 对象的每个属性 `key`，执行以下操作：

   - 如果 `key` 是 'class'、'style'，或者是一个事件绑定属性（以 'on' 开头），则执行以下操作：
   
     - 如果 `res` 不存在，创建一个空对象并赋值给 `res`。
     
     - 将当前属性 `key` 的值赋值给 `res[key]`。
   
3. 遍历完成后，如果 `res` 存在，则返回它作为结果，否则返回 `undefined`。

该函数的作用是从 `attrs` 对象中提取出 'class'、'style' 和事件绑定属性，并返回一个新的对象。如果 `attrs` 中不存在这些属性，则返回 `undefined`。
 */
const getFunctionalFallthrough = (attrs: Data): Data | undefined => {
  let res: Data | undefined
  for (const key in attrs) {
    if (key === 'class' || key === 'style' || isOn(key)) {
      ;(res || (res = {}))[key] = attrs[key]
    }
  }
  return res
}
/**
 * 
 * @param attrs 
 * @param props 
 * @returns 
 * `filterModelListeners` 是一个函数，接受两个参数：`attrs` 和 `props`，它们的类型分别为 `Data` 和 `NormalizedProps`。函数返回一个 `Data` 对象。

函数中的逻辑如下：

1. 声明一个空对象 `res`，用于保存过滤后的属性。

2. 遍历 `attrs` 对象的每个属性 `key`，执行以下操作：

   - 如果当前属性 `key` 不是一个模型监听器（即不是以 'onUpdate:' 开头的属性），或者对应的模型属性不存在于 `props` 中，则执行以下操作：
   
     - 将当前属性 `key` 和它的值 `attrs[key]` 添加到 `res` 对象中。
   
3. 遍历完成后，返回 `res` 对象作为结果。

该函数的作用是从 `attrs` 对象中过滤掉模型监听器属性，并返回一个新的对象，该对象包含了剩余的属性。它会检查属性名是否以 'onUpdate:' 开头，并且对应的模型属性是否存在于 `props` 中，如果不满足条件，则将该属性添加到 `res` 对象中。
 */
const filterModelListeners = (attrs: Data, props: NormalizedProps): Data => {
  const res: Data = {}
  for (const key in attrs) {
    if (!isModelListener(key) || !(key.slice(9) in props)) {
      res[key] = attrs[key]
    }
  }
  return res
}
/**
 * 
 * @param vnode 
 * @returns 
 * `isElementRoot` 是一个函数，接受一个参数 `vnode`，其类型为 `VNode`，函数返回一个布尔值。

函数的逻辑如下：

1. 检查 `vnode` 的 `shapeFlag` 是否包含 `ShapeFlags.COMPONENT` 或 `ShapeFlags.ELEMENT` 标志位，或者 `vnode` 的类型是否为 `Comment`。

2. 如果满足上述任一条件，则返回 `true`，表示 `vnode` 是一个元素根节点。

3. 如果不满足上述条件，则返回 `false`，表示 `vnode` 不是一个元素根节点。

该函数的作用是判断一个 `vnode` 是否是一个元素根节点。它会检查 `vnode` 的 `shapeFlag` 是否包含组件或元素的标志位，或者 `vnode` 的类型是否为 `Comment`，如果满足任一条件，则认为 `vnode` 是一个元素根节点。
 */
const isElementRoot = (vnode: VNode) => {
  return (
    vnode.shapeFlag & (ShapeFlags.COMPONENT | ShapeFlags.ELEMENT) ||
    vnode.type === Comment // potential v-if branch switch
  )
}
/**
 * 
 * @param prevVNode 
 * @param nextVNode 
 * @param optimized 
 * @returns 
 * `shouldUpdateComponent` 是一个函数，用于确定组件是否需要更新。它接受三个参数：`prevVNode`（上一个虚拟节点）、`nextVNode`（下一个虚拟节点）和 `optimized`（是否启用优化，默认为 `undefined`）。

函数的逻辑如下：

1. 从 `prevVNode` 中获取 `props`、`children` 和 `component`。
2. 从 `nextVNode` 中获取 `props`、`children` 和 `patchFlag`。
3. 获取组件的 `emitsOptions`。
4. 如果开发环境下正在进行热更新，并且存在前一个虚拟节点的 `children` 或后一个虚拟节点的 `children`，则强制更新组件，并返回 `true`。
5. 如果后一个虚拟节点具有指令 (`dirs`) 或过渡 (`transition`)，则强制更新组件，并返回 `true`。
6. 如果启用了优化，并且 `patchFlag` 大于等于 0，根据 `patchFlag` 的不同情况判断是否需要更新：
   - 如果 `patchFlag` 包含 `PatchFlags.DYNAMIC_SLOTS` 标志位，表示插槽内容引用了可能已更改的值（例如在 `v-for` 中），需要更新组件，并返回 `true`。
   - 如果 `patchFlag` 包含 `PatchFlags.FULL_PROPS` 标志位，表示需要对比所有的 `props` 是否发生变化。如果前一个 `props` 不存在，则返回后一个 `props` 是否存在；否则，调用 `hasPropsChanged` 函数比较前后 `props` 的差异，同时考虑事件侦听器 (`emits`)，并返回结果。
   - 如果 `patchFlag` 包含 `PatchFlags.PROPS` 标志位，表示只有部分 `props` 需要对比。遍历 `nextVNode.dynamicProps` 数组，比较前后 `props` 中对应的动态属性的值是否发生变化，并且不是事件侦听器（`emits`）的情况下返回 `true`。
7. 如果没有启用优化，即手动编写的渲染函数，根据不同情况判断是否需要更新：
   - 如果存在前一个虚拟节点的 `children` 或后一个虚拟节点的 `children`，并且后一个虚拟节点的 `children` 不是稳定的（`$stable` 属性），则强制更新组件，并返回 `true`。
   - 如果前一个 `props` 与后一个 `props` 相同，表示没有变化，返回 `false`。
   - 如果前一个 `props` 不存在，则返回后一个 `props` 是否存在。
   - 如果后一个 `props` 不存在，则需要更新组件，返回 `true`。
   - 调用 `hasPropsChanged` 函数比较前后 `props` 的差异，同时考虑事件侦听器 (`emits`)，并返回结果。
8. 如果以上条件都不满足，则表示不需要更新组件，
 */
export function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode,
  optimized?: boolean
): boolean {
  const { props: prevProps, children: prevChildren, component } = prevVNode
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode
  const emits = component!.emitsOptions

  // Parent component's render function was hot-updated. Since this may have
  // caused the child component's slots content to have changed, we need to
  // force the child to update as well.
  if (__DEV__ && (prevChildren || nextChildren) && isHmrUpdating) {
    return true
  }

  // force child update for runtime directive or transition on component vnode.
  if (nextVNode.dirs || nextVNode.transition) {
    return true
  }

  if (optimized && patchFlag >= 0) {
    if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
      // slot content that references values that might have changed,
      // e.g. in a v-for
      return true
    }
    if (patchFlag & PatchFlags.FULL_PROPS) {
      if (!prevProps) {
        return !!nextProps
      }
      // presence of this flag indicates props are always non-null
      return hasPropsChanged(prevProps, nextProps!, emits)
    } else if (patchFlag & PatchFlags.PROPS) {
      const dynamicProps = nextVNode.dynamicProps!
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i]
        if (
          nextProps![key] !== prevProps![key] &&
          !isEmitListener(emits, key)
        ) {
          return true
        }
      }
    }
  } else {
    // this path is only taken by manually written render functions
    // so presence of any children leads to a forced update
    if (prevChildren || nextChildren) {
      if (!nextChildren || !(nextChildren as any).$stable) {
        return true
      }
    }
    if (prevProps === nextProps) {
      return false
    }
    if (!prevProps) {
      return !!nextProps
    }
    if (!nextProps) {
      return true
    }
    return hasPropsChanged(prevProps, nextProps, emits)
  }

  return false
}
/**
 * 
 * @param prevProps 
 * @param nextProps 
 * @param emitsOptions 
 * @returns 
 * `hasPropsChanged` 是一个函数，用于检查前后两个 `props` 对象是否存在差异。它接受三个参数：`prevProps`（前一个 `props` 对象）、`nextProps`（后一个 `props` 对象）和 `emitsOptions`（组件的事件侦听器选项）。

函数的逻辑如下：

1. 获取后一个 `props` 对象的所有键，并存储在 `nextKeys` 数组中。
2. 如果 `nextKeys` 的长度与前一个 `props` 对象的键的数量不相等，则表示 `props` 对象发生了变化，返回 `true`。
3. 遍历 `nextKeys` 数组，对比前后两个 `props` 对象中相同键对应的值是否相等，同时排除是事件侦听器的情况：
   - 如果前后两个值不相等，并且键不是事件侦听器（`emitsOptions`）中的键，则表示 `props` 对象发生了变化，返回 `true`。
4. 如果以上条件都不满足，则表示前后两个 `props` 对象没有差异，返回 `false`。
 */
function hasPropsChanged(
  prevProps: Data,
  nextProps: Data,
  emitsOptions: ComponentInternalInstance['emitsOptions']
): boolean {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (
      nextProps[key] !== prevProps[key] &&
      !isEmitListener(emitsOptions, key)
    ) {
      return true
    }
  }
  return false
}
/**
 * 
 * @param param0 
 * @param el 
 * `updateHOCHostEl` 是一个函数，用于更新高阶组件（Higher Order Component，HOC）的宿主元素（host element）引用。

函数接受两个参数： `{ vnode, parent }` 是组件实例对象的解构，`vnode` 是当前组件实例的虚拟节点（VNode），`parent` 是当前组件实例的父级组件实例。

函数的逻辑如下：

1. 使用 `while` 循环迭代，直到找到一个不是高阶组件的父级组件，或者父级组件的 `subTree` 不等于当前组件实例的虚拟节点（表示当前组件实例是父级组件的插槽内容）。
2. 在循环中，将当前组件实例的虚拟节点的 `el` 属性更新为传入的 `el`，即更新宿主元素的引用。
3. 更新完成后，将父级组件实例赋值给 `parent`，继续下一轮循环，直到找到符合条件的父级组件或循环结束。
 */
export function updateHOCHostEl(
  { vnode, parent }: ComponentInternalInstance,
  el: typeof vnode.el // HostNode
) {
  while (parent && parent.subTree === vnode) {
    ;(vnode = parent.vnode).el = el
    parent = parent.parent
  }
}
