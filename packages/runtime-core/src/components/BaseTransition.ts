import {
  getCurrentInstance,
  SetupContext,
  ComponentInternalInstance,
  ComponentOptions
} from '../component'
import {
  cloneVNode,
  Comment,
  isSameVNodeType,
  VNode,
  VNodeArrayChildren,
  Fragment
} from '../vnode'
import { warn } from '../warning'
import { isKeepAlive } from './KeepAlive'
import { toRaw } from '@vue/reactivity'
import { callWithAsyncErrorHandling, ErrorCodes } from '../errorHandling'
import { ShapeFlags, PatchFlags, isArray } from '@vue/shared'
import { onBeforeUnmount, onMounted } from '../apiLifecycle'
import { RendererElement } from '../renderer'
/**
 * `Hook` 是一个类型别名，用于表示钩子函数。它可以是单个函数类型 `T`，也可以是函数类型的数组 `T[]`。

钩子函数用于在特定的时机执行一些逻辑。在 `BaseTransitionProps` 中，钩子函数被用于定义过渡动画的各个阶段的逻辑。钩子函数可以是单个函数，也可以是函数数组。

对于单个函数类型，可以直接传递一个函数作为钩子函数，例如：

```typescript
onEnter?: Hook<(el: HostElement, done: () => void) => void>
```

对于函数类型的数组，可以传递一个函数数组作为钩子函数，例如：

```typescript
onEnter?: Hook<[(el: HostElement, done: () => void) => void, (el: HostElement) => void]>
```

通过使用钩子函数，可以在过渡动画的不同阶段执行自定义的逻辑，例如在元素进入时执行一些操作，或在元素离开时执行一些操作。使用函数数组可以定义多个钩子函数，在过渡动画的不同阶段执行不同的逻辑。
 */
type Hook<T = () => void> = T | T[]
/**
 * `BaseTransitionProps` 是一个用于过渡动画的基本属性接口。它包含了以下属性：

- `mode`：过渡模式，可选值为 `'in-out'`、`'out-in'` 和 `'default'`。
- `appear`：是否在初始渲染时执行过渡动画。
- `persisted`：如果为 `true`，表示这是一个不实际插入/移除元素的过渡，而是切换显示/隐藏状态。渲染器会注入过渡钩子函数，但渲染器会跳过执行这些钩子函数。相反，可以通过调用注入的钩子函数（例如 `v-show` 指令）来控制过渡动画。
- `onBeforeEnter`、`onEnter`、`onAfterEnter`、`onEnterCancelled`：进入过渡动画的钩子函数。
- `onBeforeLeave`、`onLeave`、`onAfterLeave`、`onLeaveCancelled`：离开过渡动画的钩子函数。
- `onBeforeAppear`、`onAppear`、`onAfterAppear`、`onAppearCancelled`：初始渲染时执行过渡动画的钩子函数（`appear` 为 `true` 时生效）。

这些钩子函数可以在组件中使用，通过传入对应的函数来实现过渡动画的各个阶段的逻辑。在模板中，可以使用驼峰命名的属性名（例如 `@before-enter="xxx"`）来绑定这些钩子函数。

`BaseTransitionProps` 提供了灵活的配置选项，用于控制过渡动画的行为和效果。具体的过渡逻辑和动画效果需要在使用该接口的组件中实现相应的钩子函数逻辑。
 */
export interface BaseTransitionProps<HostElement = RendererElement> {
  mode?: 'in-out' | 'out-in' | 'default'
  appear?: boolean

  // If true, indicates this is a transition that doesn't actually insert/remove
  // the element, but toggles the show / hidden status instead.
  // The transition hooks are injected, but will be skipped by the renderer.
  // Instead, a custom directive can control the transition by calling the
  // injected hooks (e.g. v-show).
  persisted?: boolean

  // Hooks. Using camel case for easier usage in render functions & JSX.
  // In templates these can be written as @before-enter="xxx" as prop names
  // are camelized.
  onBeforeEnter?: Hook<(el: HostElement) => void>
  onEnter?: Hook<(el: HostElement, done: () => void) => void>
  onAfterEnter?: Hook<(el: HostElement) => void>
  onEnterCancelled?: Hook<(el: HostElement) => void>
  // leave
  onBeforeLeave?: Hook<(el: HostElement) => void>
  onLeave?: Hook<(el: HostElement, done: () => void) => void>
  onAfterLeave?: Hook<(el: HostElement) => void>
  onLeaveCancelled?: Hook<(el: HostElement) => void> // only fired in persisted mode
  // appear
  onBeforeAppear?: Hook<(el: HostElement) => void>
  onAppear?: Hook<(el: HostElement, done: () => void) => void>
  onAfterAppear?: Hook<(el: HostElement) => void>
  onAppearCancelled?: Hook<(el: HostElement) => void>
}
/**
 * `TransitionHooks` 是一个接口，用于定义过渡动画的钩子函数集合。它包含了在过渡动画的不同阶段执行的函数。

该接口定义了以下属性和方法：

- `mode: BaseTransitionProps['mode']`：过渡模式，取自 `BaseTransitionProps` 的 `mode` 属性。
- `persisted: boolean`：指示过渡是否是持久的（persisted）。
- `beforeEnter(el: HostElement): void`：在元素进入之前调用的钩子函数。
- `enter(el: HostElement): void`：元素进入时调用的钩子函数。
- `leave(el: HostElement, remove: () => void): void`：元素离开时调用的钩子函数。`remove` 参数是一个函数，用于在钩子函数执行完毕后移除元素。
- `clone(vnode: VNode): TransitionHooks<HostElement>`：克隆当前的过渡钩子函数集合，并返回新的 `TransitionHooks` 实例。
- `afterLeave?(): void`：可选的钩子函数，在元素离开后调用。
- `delayLeave?(el: HostElement, earlyRemove: () => void, delayedLeave: () => void): void`：可选的延迟离开钩子函数。`earlyRemove` 是一个函数，在早期移除元素时调用，`delayedLeave` 是一个函数，在延迟离开时调用。
- `delayedLeave?(): void`：可选的延迟离开钩子函数。

通过实现 `TransitionHooks` 接口，可以定义过渡动画的不同阶段的钩子函数，从而实现自定义的过渡效果和逻辑。
 */
export interface TransitionHooks<HostElement = RendererElement> {
  mode: BaseTransitionProps['mode']
  persisted: boolean
  beforeEnter(el: HostElement): void
  enter(el: HostElement): void
  leave(el: HostElement, remove: () => void): void
  clone(vnode: VNode): TransitionHooks<HostElement>
  // optional
  afterLeave?(): void
  delayLeave?(
    el: HostElement,
    earlyRemove: () => void,
    delayedLeave: () => void
  ): void
  delayedLeave?(): void
}
/**
 * `TransitionHookCaller` 是一个类型别名，用于调用过渡钩子函数的函数签名。它接受以下参数：

- `hook: Hook<(...args: T) => void> | undefined`：过渡钩子函数，可以是单个函数或函数数组。如果为 `undefined`，表示没有过渡钩子函数需要调用。
- `args?: T`：过渡钩子函数的参数数组。这是一个可选参数，用于向过渡钩子函数传递参数。

该函数签名表示可以根据传入的过渡钩子函数和参数，调用对应的过渡钩子函数。它提供了一种通用的调用方式，适用于各种过渡钩子函数的调用场景。
 */
export type TransitionHookCaller = <T extends any[] = [el: any]>(
  hook: Hook<(...args: T) => void> | undefined,
  args?: T
) => void
/**
 * `PendingCallback` 是一个类型别名，表示一个待处理的回调函数。它是一个函数签名，接受一个可选的布尔参数 `cancelled`，并且没有返回值。

该回调函数通常用于异步操作的处理，例如过渡的进入和离开动画。在动画过程中，可以调用该回调函数来指示异步操作的完成状态。如果 `cancelled` 参数为 `true`，表示操作被取消。

通过定义 `PendingCallback` 类型别名，可以更清晰地表示这种回调函数的约定和使用方式。
 */
export type PendingCallback = (cancelled?: boolean) => void
/**
 * `TransitionState` 是一个接口，用于描述过渡的状态。它包含以下属性：

- `isMounted`：表示过渡是否已挂载到 DOM 中。
- `isLeaving`：表示过渡是否处于离开状态，即正在执行离开动画。
- `isUnmounting`：表示过渡是否正在卸载，即将从 DOM 中移除。
- `leavingVNodes`：用于跟踪具有相同键的子节点的待处理离开回调。在新的子节点进入时，可以强制移除正在离开的子节点。

通过定义 `TransitionState` 接口，可以在过渡的生命周期中记录和管理相关的状态信息。这些状态属性可以帮助实现过渡的控制逻辑和动画效果。
 */
export interface TransitionState {
  isMounted: boolean
  isLeaving: boolean
  isUnmounting: boolean
  // Track pending leave callbacks for children of the same key.
  // This is used to force remove leaving a child when a new copy is entering.
  leavingVNodes: Map<any, Record<string, VNode>>
}
/**
 * `TransitionElement` 是一个接口，用于描述参与过渡的元素。它包含以下属性：

- `_enterCb`：在持久化模式下（例如 `v-show`），同一个元素会被切换显示或隐藏，因此如果状态在动画完成之前被切换，需要取消待处理的进入回调。
- `_leaveCb`：在持久化模式下（例如 `v-show`），同一个元素会被切换显示或隐藏，因此如果状态在动画完成之前被切换，需要取消待处理的离开回调。

通过定义 `TransitionElement` 接口，可以将这些属性添加到参与过渡的元素上，以跟踪和管理元素的进入和离开回调。这些回调函数可以用于执行过渡的动画或触发其他相关操作。
 */
export interface TransitionElement {
  // in persisted mode (e.g. v-show), the same element is toggled, so the
  // pending enter/leave callbacks may need to be cancelled if the state is toggled
  // before it finishes.
  _enterCb?: PendingCallback
  _leaveCb?: PendingCallback
}
/**
 * 
 * @returns 
 * `useTransitionState` 是一个自定义的 Vue 组合式函数，用于创建并返回一个过渡状态对象 `TransitionState`。该函数执行以下操作：

1. 创建一个名为 `state` 的过渡状态对象，并初始化属性：
   - `isMounted`：表示元素是否已挂载，默认为 `false`。
   - `isLeaving`：表示元素是否正在离开，默认为 `false`。
   - `isUnmounting`：表示元素是否正在卸载，默认为 `false`。
   - `leavingVNodes`：用于跟踪具有相同 key 的子元素的离开状态，以便在新元素进入时强制删除正在离开的子元素。

2. 使用 `onMounted` 生命周期钩子，在组件挂载时将 `state.isMounted` 设置为 `true`。

3. 使用 `onBeforeUnmount` 生命周期钩子，在组件即将卸载时将 `state.isUnmounting` 设置为 `true`。

4. 返回 `state` 对象作为过渡状态。

通过调用 `useTransitionState` 函数，可以在组件中获取一个用于管理过渡状态的对象，以便在过渡期间跟踪元素的状态和执行相应的操作。
 */
export function useTransitionState(): TransitionState {
  const state: TransitionState = {
    isMounted: false,
    isLeaving: false,
    isUnmounting: false,
    leavingVNodes: new Map()
  }
  onMounted(() => {
    state.isMounted = true
  })
  onBeforeUnmount(() => {
    state.isUnmounting = true
  })
  return state
}
/**
 * `TransitionHookValidator` 是一个类型定义，表示过渡钩子的验证器。它是一个数组，其中包含两种可能的类型：

1. `Function`：表示单个过渡钩子函数。
2. `Array`：表示过渡钩子函数的数组。

该验证器用于验证过渡钩子的类型，以确保它们符合预期的函数格式。在使用过渡钩子时，可以将其传递给需要过渡钩子的地方，并使用 `TransitionHookValidator` 进行类型验证，以确保传入的钩子函数或钩子函数数组符合要求。
 */
const TransitionHookValidator = [Function, Array]
/**
 * `BaseTransitionPropsValidators` 是一个对象，包含了基本过渡属性的验证器。它定义了每个过渡属性的预期类型，以便在使用这些属性时进行类型验证。

具体属性及其验证器如下：

- `mode`：预期为字符串类型。
- `appear`：预期为布尔类型。
- `persisted`：预期为布尔类型。
- `onBeforeEnter`：预期为过渡钩子函数或过渡钩子函数数组。
- `onEnter`：预期为过渡钩子函数或过渡钩子函数数组。
- `onAfterEnter`：预期为过渡钩子函数或过渡钩子函数数组。
- `onEnterCancelled`：预期为过渡钩子函数或过渡钩子函数数组。
- `onBeforeLeave`：预期为过渡钩子函数或过渡钩子函数数组。
- `onLeave`：预期为过渡钩子函数或过渡钩子函数数组。
- `onAfterLeave`：预期为过渡钩子函数或过渡钩子函数数组。
- `onLeaveCancelled`：预期为过渡钩子函数或过渡钩子函数数组。
- `onBeforeAppear`：预期为过渡钩子函数或过渡钩子函数数组。
- `onAppear`：预期为过渡钩子函数或过渡钩子函数数组。
- `onAfterAppear`：预期为过渡钩子函数或过渡钩子函数数组。
- `onAppearCancelled`：预期为过渡钩子函数或过渡钩子函数数组。

使用这些验证器可以确保在使用过渡属性时传入正确的类型，并避免类型错误导致的问题。
 */
export const BaseTransitionPropsValidators = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: TransitionHookValidator,
  onEnter: TransitionHookValidator,
  onAfterEnter: TransitionHookValidator,
  onEnterCancelled: TransitionHookValidator,
  // leave
  onBeforeLeave: TransitionHookValidator,
  onLeave: TransitionHookValidator,
  onAfterLeave: TransitionHookValidator,
  onLeaveCancelled: TransitionHookValidator,
  // appear
  onBeforeAppear: TransitionHookValidator,
  onAppear: TransitionHookValidator,
  onAfterAppear: TransitionHookValidator,
  onAppearCancelled: TransitionHookValidator
}
/**
 * `BaseTransitionImpl` 是一个基本过渡组件的实现对象，它包含了组件的名称、属性验证器、设置函数等。

具体内容如下：

- `name`：组件的名称，设为 `"BaseTransition"`。
- `props`：组件的属性验证器，使用了 `BaseTransitionPropsValidators` 对象。
- `setup`：组件的设置函数，接受 `props` 和 `slots` 参数，并返回一个渲染函数。
  - 在设置函数中，首先获取当前组件实例和过渡状态。
  - 然后，根据插槽内容获取子节点，并进行相关的处理。
  - 根据过渡状态判断是否处于离开状态，如果是，则返回一个空占位节点。
  - 获取子节点中的保活子节点，并进行相关处理。
  - 解析进入过渡钩子函数，并设置到保活子节点中。
  - 判断是否存在旧的子节点，并与当前保活子节点进行比较，根据过渡模式和子节点类型的不同进行相应的处理。
  - 最后，返回子节点进行渲染。

该对象描述了基本过渡组件的实现细节，包括属性验证、子节点处理、过渡钩子函数解析和不同过渡模式下的处理逻辑。
 */
const BaseTransitionImpl: ComponentOptions = {
  name: `BaseTransition`,

  props: BaseTransitionPropsValidators,

  setup(props: BaseTransitionProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const state = useTransitionState()

    let prevTransitionKey: any

    return () => {
      const children =
        slots.default && getTransitionRawChildren(slots.default(), true)
      if (!children || !children.length) {
        return
      }

      let child: VNode = children[0]
      if (children.length > 1) {
        let hasFound = false
        // locate first non-comment child
        for (const c of children) {
          if (c.type !== Comment) {
            if (__DEV__ && hasFound) {
              // warn more than one non-comment child
              warn(
                '<transition> can only be used on a single element or component. ' +
                  'Use <transition-group> for lists.'
              )
              break
            }
            child = c
            hasFound = true
            if (!__DEV__) break
          }
        }
      }

      // there's no need to track reactivity for these props so use the raw
      // props for a bit better perf
      const rawProps = toRaw(props)
      const { mode } = rawProps
      // check mode
      if (
        __DEV__ &&
        mode &&
        mode !== 'in-out' &&
        mode !== 'out-in' &&
        mode !== 'default'
      ) {
        warn(`invalid <transition> mode: ${mode}`)
      }

      if (state.isLeaving) {
        return emptyPlaceholder(child)
      }

      // in the case of <transition><keep-alive/></transition>, we need to
      // compare the type of the kept-alive children.
      const innerChild = getKeepAliveChild(child)
      if (!innerChild) {
        return emptyPlaceholder(child)
      }

      const enterHooks = resolveTransitionHooks(
        innerChild,
        rawProps,
        state,
        instance
      )
      setTransitionHooks(innerChild, enterHooks)

      const oldChild = instance.subTree
      const oldInnerChild = oldChild && getKeepAliveChild(oldChild)

      let transitionKeyChanged = false
      const { getTransitionKey } = innerChild.type as any
      if (getTransitionKey) {
        const key = getTransitionKey()
        if (prevTransitionKey === undefined) {
          prevTransitionKey = key
        } else if (key !== prevTransitionKey) {
          prevTransitionKey = key
          transitionKeyChanged = true
        }
      }

      // handle mode
      if (
        oldInnerChild &&
        oldInnerChild.type !== Comment &&
        (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)
      ) {
        const leavingHooks = resolveTransitionHooks(
          oldInnerChild,
          rawProps,
          state,
          instance
        )
        // update old tree's hooks in case of dynamic transition
        setTransitionHooks(oldInnerChild, leavingHooks)
        // switching between different views
        if (mode === 'out-in') {
          state.isLeaving = true
          // return placeholder node and queue update when leave finishes
          leavingHooks.afterLeave = () => {
            state.isLeaving = false
            // #6835
            // it also needs to be updated when active is undefined
            if (instance.update.active !== false) {
              instance.update()
            }
          }
          return emptyPlaceholder(child)
        } else if (mode === 'in-out' && innerChild.type !== Comment) {
          leavingHooks.delayLeave = (
            el: TransitionElement,
            earlyRemove,
            delayedLeave
          ) => {
            const leavingVNodesCache = getLeavingNodesForType(
              state,
              oldInnerChild
            )
            leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild
            // early removal callback
            el._leaveCb = () => {
              earlyRemove()
              el._leaveCb = undefined
              delete enterHooks.delayedLeave
            }
            enterHooks.delayedLeave = delayedLeave
          }
        }
      }

      return child
    }
  }
}
/**
 * 如果代码运行在 Vue 3 的兼容模式下（`__COMPAT__` 为真），则给 `BaseTransitionImpl` 对象添加一个名为 `__isBuiltIn` 的属性，将其值设为 `true`。

这个操作可能是为了标记 `BaseTransitionImpl` 为内置的组件，以便在一些特定的处理逻辑中使用。具体的用途和逻辑需要结合代码的上下文进行分析。
 */
if (__COMPAT__) {
  BaseTransitionImpl.__isBuiltIn = true
}

// export the public type for h/tsx inference
// also to avoid inline import() in generated d.ts files
/**
 * `BaseTransition` 是一个类型断言，将 `BaseTransitionImpl` 强制转换为一个新的类型。

根据断言的逻辑，`BaseTransitionImpl` 被断言为一个具有特定成员的构造函数。具体而言，它被断言为一个没有参数的构造函数，且实例具有 `$props` 属性和 `$slots` 对象，其中 `$props` 的类型是 `BaseTransitionProps<any>`，`$slots` 的 `default` 属性是一个返回 `VNode[]` 数组的函数。

这种类型断言可能是为了在使用 `BaseTransition` 的地方提供类型推断，以便在编辑器中获得正确的类型检查和代码补全支持。
 */
export const BaseTransition = BaseTransitionImpl as unknown as {
  new (): {
    $props: BaseTransitionProps<any>
    $slots: {
      default(): VNode[]
    }
  }
}
/**
 * 
 * @param state 
 * @param vnode 
 * @returns 
 * 该函数 `getLeavingNodesForType` 接受两个参数：`state` 和 `vnode`。它用于获取指定 `vnode` 类型的正在离开的节点的缓存。

函数首先从 `state` 对象中获取 `leavingVNodes` 属性，该属性是一个 `Map` 对象，用于存储不同类型的正在离开的节点的缓存。然后，它尝试从 `leavingVNodes` 中获取与给定 `vnode` 类型相对应的缓存 `leavingVNodesCache`。

如果 `leavingVNodesCache` 不存在，即还没有为该 `vnode` 类型创建缓存，那么函数会创建一个新的空对象 `leavingVNodesCache`，并将其设置为 `leavingVNodes` 的属性值，以便下次可以直接获取到。最后，函数返回 `leavingVNodesCache` 对象。

这个函数的作用是为了管理不同类型的正在离开的节点的缓存，以便在过渡动画期间能够正确处理节点的离开操作。
 */
function getLeavingNodesForType(
  state: TransitionState,
  vnode: VNode
): Record<string, VNode> {
  const { leavingVNodes } = state
  let leavingVNodesCache = leavingVNodes.get(vnode.type)!
  if (!leavingVNodesCache) {
    leavingVNodesCache = Object.create(null)
    leavingVNodes.set(vnode.type, leavingVNodesCache)
  }
  return leavingVNodesCache
}

// The transition hooks are attached to the vnode as vnode.transition
// and will be called at appropriate timing in the renderer.
/**
 * 
 * @param vnode 
 * @param props 
 * @param state 
 * @param instance 
 * @returns 
 * 这是一个名为 `resolveTransitionHooks` 的函数。它接受四个参数：`vnode`、`props`、`state` 和 `instance`，用于解析过渡钩子函数并返回一个包含钩子函数的对象。

首先，它从 `props` 中解构出各个过渡钩子函数，如 `onBeforeEnter`、`onEnter`、`onAfterEnter` 等等。然后，它获取当前 `vnode` 的 `key` 并将其转换为字符串。

接下来，它调用 `getLeavingNodesForType` 函数获取正在离开的节点的缓存对象 `leavingVNodesCache`，该缓存对象是根据当前 `vnode` 的类型存储的。

在接下来的代码中，定义了两个辅助函数 `callHook` 和 `callAsyncHook`，用于调用过渡钩子函数并处理异步钩子的情况。

最后，函数返回一个包含各个过渡钩子函数的对象 `hooks`。这个对象包括了 `beforeEnter`、`enter`、`leave` 和 `clone` 四个钩子函数。其中，`beforeEnter` 用于进入前的钩子，`enter` 用于进入时的钩子，`leave` 用于离开时的钩子，`clone` 用于克隆钩子函数。这些钩子函数会在过渡过程中被调用，执行相应的操作。

总的来说，`resolveTransitionHooks` 函数的作用是解析过渡钩子函数，并返回一个包含钩子函数的对象，以便在过渡过程中进行相应的处理和触发。
 */
export function resolveTransitionHooks(
  vnode: VNode,
  props: BaseTransitionProps<any>,
  state: TransitionState,
  instance: ComponentInternalInstance
): TransitionHooks {
  const {
    appear,
    mode,
    persisted = false,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onEnterCancelled,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
    onLeaveCancelled,
    onBeforeAppear,
    onAppear,
    onAfterAppear,
    onAppearCancelled
  } = props
  const key = String(vnode.key)
  const leavingVNodesCache = getLeavingNodesForType(state, vnode)

  const callHook: TransitionHookCaller = (hook, args) => {
    hook &&
      callWithAsyncErrorHandling(
        hook,
        instance,
        ErrorCodes.TRANSITION_HOOK,
        args
      )
  }

  const callAsyncHook = (
    hook: Hook<(el: any, done: () => void) => void>,
    args: [TransitionElement, () => void]
  ) => {
    const done = args[1]
    callHook(hook, args)
    if (isArray(hook)) {
      if (hook.every(hook => hook.length <= 1)) done()
    } else if (hook.length <= 1) {
      done()
    }
  }

  const hooks: TransitionHooks<TransitionElement> = {
    mode,
    persisted,
    beforeEnter(el) {
      let hook = onBeforeEnter
      if (!state.isMounted) {
        if (appear) {
          hook = onBeforeAppear || onBeforeEnter
        } else {
          return
        }
      }
      // for same element (v-show)
      if (el._leaveCb) {
        el._leaveCb(true /* cancelled */)
      }
      // for toggled element with same key (v-if)
      const leavingVNode = leavingVNodesCache[key]
      if (
        leavingVNode &&
        isSameVNodeType(vnode, leavingVNode) &&
        leavingVNode.el!._leaveCb
      ) {
        // force early removal (not cancelled)
        leavingVNode.el!._leaveCb()
      }
      callHook(hook, [el])
    },

    enter(el) {
      let hook = onEnter
      let afterHook = onAfterEnter
      let cancelHook = onEnterCancelled
      if (!state.isMounted) {
        if (appear) {
          hook = onAppear || onEnter
          afterHook = onAfterAppear || onAfterEnter
          cancelHook = onAppearCancelled || onEnterCancelled
        } else {
          return
        }
      }
      let called = false
      const done = (el._enterCb = (cancelled?) => {
        if (called) return
        called = true
        if (cancelled) {
          callHook(cancelHook, [el])
        } else {
          callHook(afterHook, [el])
        }
        if (hooks.delayedLeave) {
          hooks.delayedLeave()
        }
        el._enterCb = undefined
      })
      if (hook) {
        callAsyncHook(hook, [el, done])
      } else {
        done()
      }
    },

    leave(el, remove) {
      const key = String(vnode.key)
      if (el._enterCb) {
        el._enterCb(true /* cancelled */)
      }
      if (state.isUnmounting) {
        return remove()
      }
      callHook(onBeforeLeave, [el])
      let called = false
      const done = (el._leaveCb = (cancelled?) => {
        if (called) return
        called = true
        remove()
        if (cancelled) {
          callHook(onLeaveCancelled, [el])
        } else {
          callHook(onAfterLeave, [el])
        }
        el._leaveCb = undefined
        if (leavingVNodesCache[key] === vnode) {
          delete leavingVNodesCache[key]
        }
      })
      leavingVNodesCache[key] = vnode
      if (onLeave) {
        callAsyncHook(onLeave, [el, done])
      } else {
        done()
      }
    },

    clone(vnode) {
      return resolveTransitionHooks(vnode, props, state, instance)
    }
  }

  return hooks
}

// the placeholder really only handles one special case: KeepAlive
// in the case of a KeepAlive in a leave phase we need to return a KeepAlive
// placeholder with empty content to avoid the KeepAlive instance from being
// unmounted.
/**
 * 
 * @param vnode 
 * @returns 
 * 这是一个名为 `emptyPlaceholder` 的函数，它接受一个 `vnode` 参数，并返回一个经过处理的 `VNode` 对象或 `undefined`。

函数首先检查传入的 `vnode` 是否是 `KeepAlive` 组件，如果是，则通过 `cloneVNode` 函数克隆一个新的 `vnode` 对象，并将其子节点 `children` 设置为 `null`。最后返回这个新的 `vnode` 对象。

该函数的作用是生成一个空的占位符 `VNode` 对象，用于在特定情况下作为过渡元素的占位节点。在这个函数中，它主要用于处理 `KeepAlive` 组件的情况，将 `KeepAlive` 组件的子节点置为空。
 */
function emptyPlaceholder(vnode: VNode): VNode | undefined {
  if (isKeepAlive(vnode)) {
    vnode = cloneVNode(vnode)
    vnode.children = null
    return vnode
  }
}
/**
 * 
 * @param vnode 
 * @returns 
 * 这是一个名为 `getKeepAliveChild` 的函数，它接受一个 `vnode` 参数，并返回一个经过处理的 `VNode` 对象或 `undefined`。

函数首先检查传入的 `vnode` 是否是 `KeepAlive` 组件，如果是，则进一步检查 `vnode` 的子节点 `children` 是否存在。如果子节点存在，则返回子节点数组的第一个元素作为 `VNode` 对象；如果子节点不存在，则返回 `undefined`。如果传入的 `vnode` 不是 `KeepAlive` 组件，则直接返回传入的 `vnode`。

该函数的作用是获取 `KeepAlive` 组件的子节点。如果传入的 `vnode` 是 `KeepAlive` 组件，则返回其第一个子节点作为实际渲染的 `VNode` 对象；如果传入的 `vnode` 不是 `KeepAlive` 组件，则直接返回传入的 `vnode`。这在处理过渡组件时非常有用，因为过渡通常只针对实际渲染的子节点进行操作。
 */
function getKeepAliveChild(vnode: VNode): VNode | undefined {
  return isKeepAlive(vnode)
    ? vnode.children
      ? ((vnode.children as VNodeArrayChildren)[0] as VNode)
      : undefined
    : vnode
}
/**
 * 
 * @param vnode 
 * @param hooks 
 * 这是一个名为 `setTransitionHooks` 的函数，它用于设置过渡钩子（transition hooks）到给定的 `VNode` 上。

函数接受两个参数：`vnode` 和 `hooks`。如果 `vnode` 是一个组件类型的节点且具有有效的 `component` 属性，则递归调用 `setTransitionHooks` 函数，将 `hooks` 设置到组件的子树（`subTree`）上。如果 `vnode` 是一个悬停（suspense）类型的节点且具有有效的 `ssContent` 和 `ssFallback` 属性（这是 Vue 的内部特性），则分别将 `hooks` 的克隆设置到 `ssContent` 和 `ssFallback` 的 `transition` 属性上。否则，直接将 `hooks` 设置到 `vnode` 的 `transition` 属性上。

该函数的作用是根据 `VNode` 的类型将过渡钩子应用于正确的节点上。对于组件节点，它会递归向下应用过渡钩子；对于悬停节点，它会将过渡钩子的克隆应用于内容和回退节点；对于其他类型的节点，直接将过渡钩子应用于节点本身。这样可以确保在过渡期间正确地触发和处理钩子函数。
 */
export function setTransitionHooks(vnode: VNode, hooks: TransitionHooks) {
  if (vnode.shapeFlag & ShapeFlags.COMPONENT && vnode.component) {
    setTransitionHooks(vnode.component.subTree, hooks)
  } else if (__FEATURE_SUSPENSE__ && vnode.shapeFlag & ShapeFlags.SUSPENSE) {
    vnode.ssContent!.transition = hooks.clone(vnode.ssContent!)
    vnode.ssFallback!.transition = hooks.clone(vnode.ssFallback!)
  } else {
    vnode.transition = hooks
  }
}
/**
 * 
 * @param children 
 * @param keepComment 
 * @param parentKey 
 * @returns 
 * 这是一个名为 `getTransitionRawChildren` 的函数，用于获取过渡效果中的原始子节点数组。

函数接受三个参数：`children`、`keepComment` 和 `parentKey`。`children` 是要处理的子节点数组，`keepComment` 是一个布尔值，用于指示是否保留注释节点，默认为 `false`，`parentKey` 是父节点的键（key）值，可选。

函数通过遍历子节点数组 `children`，处理每个子节点。如果子节点是一个片段（Fragment）类型的节点，则递归调用 `getTransitionRawChildren` 函数获取其内部的原始子节点，并将其拼接到结果数组 `ret` 中。对于其他类型的节点，如果 `keepComment` 为 `true` 或者子节点不是注释节点，则将其添加到结果数组 `ret` 中。

在遍历完所有子节点后，函数会检查结果数组 `ret` 中是否包含多个子片段（keyed fragment）。如果是，则将每个子节点的 `patchFlag` 设置为 `PatchFlags.BAIL`，以确保进行完整的差异更新，以保证正确的行为。

最后，函数返回结果数组 `ret`，其中包含了过渡效果中的原始子节点。

该函数的作用是在过渡效果中获取原始的子节点数组，并且处理了片段节点（v-for 等）和注释节点的情况。它确保只保留有效的子节点，并在需要时处理子片段的合并和键的生成。这对于正确应用过渡效果非常重要。
 */
export function getTransitionRawChildren(
  children: VNode[],
  keepComment: boolean = false,
  parentKey?: VNode['key']
): VNode[] {
  let ret: VNode[] = []
  let keyedFragmentCount = 0
  for (let i = 0; i < children.length; i++) {
    let child = children[i]
    // #5360 inherit parent key in case of <template v-for>
    const key =
      parentKey == null
        ? child.key
        : String(parentKey) + String(child.key != null ? child.key : i)
    // handle fragment children case, e.g. v-for
    if (child.type === Fragment) {
      if (child.patchFlag & PatchFlags.KEYED_FRAGMENT) keyedFragmentCount++
      ret = ret.concat(
        getTransitionRawChildren(child.children as VNode[], keepComment, key)
      )
    }
    // comment placeholders should be skipped, e.g. v-if
    else if (keepComment || child.type !== Comment) {
      ret.push(key != null ? cloneVNode(child, { key }) : child)
    }
  }
  // #1126 if a transition children list contains multiple sub fragments, these
  // fragments will be merged into a flat children array. Since each v-for
  // fragment may contain different static bindings inside, we need to de-op
  // these children to force full diffs to ensure correct behavior.
  if (keyedFragmentCount > 1) {
    for (let i = 0; i < ret.length; i++) {
      ret[i].patchFlag = PatchFlags.BAIL
    }
  }
  return ret
}
