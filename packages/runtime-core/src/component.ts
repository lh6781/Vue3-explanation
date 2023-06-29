import { VNode, VNodeChild, isVNode } from './vnode'
import {
  isRef,
  pauseTracking,
  resetTracking,
  shallowReadonly,
  proxyRefs,
  EffectScope,
  markRaw,
  track,
  TrackOpTypes,
  ReactiveEffect
} from '@vue/reactivity'
import {
  ComponentPublicInstance,
  PublicInstanceProxyHandlers,
  createDevRenderContext,
  exposePropsOnRenderContext,
  exposeSetupStateOnRenderContext,
  ComponentPublicInstanceConstructor,
  publicPropertiesMap,
  RuntimeCompiledPublicInstanceProxyHandlers
} from './componentPublicInstance'
import {
  ComponentPropsOptions,
  NormalizedPropsOptions,
  initProps,
  normalizePropsOptions
} from './componentProps'
import {
  initSlots,
  InternalSlots,
  Slots,
  SlotsType,
  UnwrapSlotsType
} from './componentSlots'
import { warn } from './warning'
import { ErrorCodes, callWithErrorHandling, handleError } from './errorHandling'
import { AppContext, createAppContext, AppConfig } from './apiCreateApp'
import { Directive, validateDirectiveName } from './directives'
import {
  applyOptions,
  ComponentOptions,
  ComputedOptions,
  MethodOptions,
  resolveMergedOptions
} from './componentOptions'
import {
  EmitsOptions,
  ObjectEmitsOptions,
  EmitFn,
  emit,
  normalizeEmitsOptions
} from './componentEmits'
import {
  EMPTY_OBJ,
  isArray,
  isFunction,
  NOOP,
  isObject,
  NO,
  makeMap,
  isPromise,
  ShapeFlags,
  extend,
  getGlobalThis,
  IfAny
} from '@vue/shared'
import { SuspenseBoundary } from './components/Suspense'
import { CompilerOptions } from '@vue/compiler-core'
import { markAttrsAccessed } from './componentRenderUtils'
import { currentRenderingInstance } from './componentRenderContext'
import { startMeasure, endMeasure } from './profiling'
import { convertLegacyRenderFn } from './compat/renderFn'
import {
  CompatConfig,
  globalCompatConfig,
  validateCompatConfig
} from './compat/compatConfig'
import { SchedulerJob } from './scheduler'
import { LifecycleHooks } from './enums'
/**
 * `Data` 是一个类型别名，表示一个键为字符串，值为未知类型的记录对象（`Record<string, unknown>`）。

该类型别名用于定义组件中的数据对象，其中每个键表示一个数据属性的名称，而对应的值表示该属性的类型。由于值的类型为未知类型（`unknown`），因此可以存储任意类型的值。

使用 `Data` 类型别名可以提供类型检查和推断，以确保组件的数据对象具有正确的属性和类型。这有助于在开发过程中减少错误，并提供代码补全和自动完成的支持。
 */
export type Data = Record<string, unknown>

/**
 * For extending allowed non-declared props on components in TSX
 * `ComponentCustomProps` 是一个空接口，用于表示组件的自定义属性。

该接口没有定义任何属性或方法，因此它在类型层面上不包含任何额外的信息。它的存在是为了让开发者可以在组件中自由地添加自定义属性，并确保这些属性不会与已有的组件属性冲突。

通过扩展 `ComponentCustomProps` 接口，开发者可以定义和传递自己的组件属性，以满足特定的需求。这样做可以提供更好的类型支持和类型检查，同时保持与其他组件的兼容性。
 */
export interface ComponentCustomProps {}

/**
 * Default allowed non-declared props on component in TSX
 * `AllowedComponentProps` 是一个接口，用于表示允许在组件上使用的属性。

该接口定义了两个属性：
- `class`：类型为 `unknown`，表示组件可以接受任意类型的 `class` 属性。
- `style`：类型为 `unknown`，表示组件可以接受任意类型的 `style` 属性。

通过将组件的属性类型限制为 `AllowedComponentProps`，开发者可以在组件中使用 `class` 和 `style` 属性，并且这些属性可以具有任意类型的值。

请注意，由于属性类型为 `unknown`，在使用这些属性时需要进行适当的类型检查和处理。这样做可以提供更灵活的属性定义，但也需要开发者自行确保属性的正确使用和类型安全性。
 */
export interface AllowedComponentProps {
  class?: unknown
  style?: unknown
}

// Note: can't mark this whole interface internal because some public interfaces
// extend it.
/**
 * `ComponentInternalOptions` 是组件的内部选项接口，用于表示组件的内部配置选项。

该接口定义了一些属性：
- `__scopeId`：用于设置组件的作用域 ID，通常用于处理 CSS 样式的作用域。
- `__cssModules`：用于存储 CSS 模块的数据，通常在使用 CSS 模块化时使用。
- `__hmrId`：用于热模块替换 (HMR) 的模块 ID。
- `__isBuiltIn`：仅在兼容性构建时使用，用于终止特定的兼容性行为。
- `__file`：组件所在的文件路径，用于开发工具（如开发者工具）进行使用。
- `__name`：从文件名推断出的组件名称。

这些属性都是组件的内部选项，通常不需要直接在组件代码中使用。它们提供了一些额外的配置和信息，以支持组件的开发和调试工具。
 */
export interface ComponentInternalOptions {
  /**
   * @internal
   */
  __scopeId?: string
  /**
   * @internal
   */
  __cssModules?: Data
  /**
   * @internal
   */
  __hmrId?: string
  /**
   * Compat build only, for bailing out of certain compatibility behavior
   */
  __isBuiltIn?: boolean
  /**
   * This one should be exposed so that devtools can make use of it
   */
  __file?: string
  /**
   * name inferred from filename
   */
  __name?: string
}
/**
 * `FunctionalComponent` 是一个函数式组件的接口定义。

该接口具有以下泛型参数：
- `P`：组件 props 的类型，默认为空对象 `{}`。
- `E`：组件的事件类型，用于声明组件可以触发的事件，默认为 `EmitsOptions` 类型。
- `S`：组件的状态类型，用于声明组件内部的状态，默认为 `Record<string, any>`。

`FunctionalComponent` 继承了 `ComponentInternalOptions` 接口，表示它也可以拥有组件的内部选项。

接口中定义了以下属性和方法：
- 一个函数签名，用于定义函数式组件的调用方式。接受两个参数：
  - `props`：组件的属性对象，类型为 `P`。
  - `ctx`：组件的上下文对象，类型为 `Omit<SetupContext<E, IfAny<S, {}, SlotsType<S>>>, 'expose'>`。其中 `SetupContext` 是组件设置阶段的上下文类型，`SlotsType` 是插槽类型。`Omit` 用于去除 `expose` 属性。
- `props`：组件的属性配置选项，类型为 `ComponentPropsOptions<P>`，用于声明组件的属性接口。
- `emits`：组件可以触发的事件配置选项，类型为 `E | (keyof E)[]`。可以是事件对象 `E` 或事件名称的数组。
- `slots`：插槽配置选项，类型为 `IfAny<S, Slots, SlotsType<S>>`。用于声明组件的插槽接口。
- `inheritAttrs`：是否继承父组件的属性，默认为布尔值 `true`。
- `displayName`：组件的显示名称，用于开发工具中的显示和调试。
- `compatConfig`：兼容性配置选项，用于配置兼容性行为。

`FunctionalComponent` 是用于定义函数式组件的接口，提供了组件的属性、事件、插槽等配置选项，并可以通过函数调用方式定义组件的行为。
 */
export interface FunctionalComponent<
  P = {},
  E extends EmitsOptions = {},
  S extends Record<string, any> = any
> extends ComponentInternalOptions {
  // use of any here is intentional so it can be a valid JSX Element constructor
  (
    props: P,
    ctx: Omit<SetupContext<E, IfAny<S, {}, SlotsType<S>>>, 'expose'>
  ): any
  props?: ComponentPropsOptions<P>
  emits?: E | (keyof E)[]
  slots?: IfAny<S, Slots, SlotsType<S>>
  inheritAttrs?: boolean
  displayName?: string
  compatConfig?: CompatConfig
}
/**
 * `ClassComponent` 是一个类组件的接口定义。

该接口具有以下属性和方法：
- `new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>`：类构造函数的签名，用于创建类组件的实例。该构造函数接受任意数量的参数，并返回一个 `ComponentPublicInstance` 类型的实例。
- `__vccOpts: ComponentOptions`：组件的选项配置，类型为 `ComponentOptions`。它包含了类组件的各种配置项，如属性、事件、生命周期钩子等。

`ClassComponent` 用于定义类组件的接口，提供了构造函数和选项配置，用于创建类组件的实例并配置组件的行为。
 */
export interface ClassComponent {
  new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>
  __vccOpts: ComponentOptions
}

/**
 * Concrete component type matches its actual value: it's either an options
 * object, or a function. Use this where the code expects to work with actual
 * values, e.g. checking if its a function or not. This is mostly for internal
 * implementation code.
 * `ConcreteComponent` 是一个具体组件的类型定义。

该类型可以是两种形式之一：
- `ComponentOptions<Props, RawBindings, D, C, M>`：表示一个常规组件的选项配置。它包含了组件的属性、原始绑定、数据、计算属性和方法等信息。这种形式的具体组件可以是类组件或函数组件。
- `FunctionalComponent<Props, any>`：表示一个函数组件。函数组件是一种特殊的具体组件，它是一个函数，并且接受属性 `Props` 和上下文 `ctx` 作为参数。函数组件没有自己的选项配置，而是直接通过函数的参数来定义组件的行为。

`ConcreteComponent` 用于定义具体组件的类型，它可以是常规组件或函数组件，并提供了相应的选项配置或函数签名。这使得我们可以更灵活地定义和使用各种类型的组件。
 */
export type ConcreteComponent<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> =
  | ComponentOptions<Props, RawBindings, D, C, M>
  | FunctionalComponent<Props, any>

/**
 * A type used in public APIs where a component type is expected.
 * The constructor type is an artificial type returned by defineComponent().
 * `Component` 是一个通用组件类型的定义。

该类型可以是两种形式之一：
- `ConcreteComponent<Props, RawBindings, D, C, M>`：表示一个具体组件，可以是常规组件或函数组件。它包含了组件的选项配置或函数签名。
- `ComponentPublicInstanceConstructor<Props>`：表示一个组件实例的构造函数。它接受一个 `Props` 类型的参数，并返回一个组件实例。

`Component` 类型的定义用于描述通用组件，即可以是具体组件的选项配置或函数签名，也可以是组件实例的构造函数。这使得我们可以以更灵活的方式定义和操作各种类型的组件。
 */
export type Component<
  Props = any,
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> =
  | ConcreteComponent<Props, RawBindings, D, C, M>
  | ComponentPublicInstanceConstructor<Props>

export type { ComponentOptions }
/**
 * `LifecycleHook<TFn = Function>` 是一个类型别名的声明。它接受一个泛型参数 `TFn`，默认类型为 `Function`。

该类型别名表示生命周期钩子函数的类型。它可以是一个由 `TFn` 类型组成的数组或者 `null`。泛型参数 `TFn` 表示钩子函数的类型，可以是任意函数类型，默认为 `Function` 类型。

这个类型别名可以用于声明组件的生命周期钩子函数的类型。例如，可以将 `LifecycleHook` 应用于 `beforeCreate`、`created`、`beforeMount` 等生命周期钩子函数的类型声明上。
 */
type LifecycleHook<TFn = Function> = TFn[] | null

// use `E extends any` to force evaluating type to fix #2362
/**
 * `SetupContext<E = EmitsOptions, S extends SlotsType = {}>` 是一个类型别名的声明。它接受两个泛型参数 `E` 和 `S`，分别表示 EmitsOptions 类型和 SlotsType 类型，默认值为 `{}`。

该类型别名表示组件设置(setup)阶段的上下文类型。根据泛型参数 `E` 的类型，它可以是一个对象，具有 `attrs`、`slots`、`emit` 和 `expose` 属性；或者是 `never` 类型。

如果 `E` 的类型是任意类型(`any`)，则上下文类型包含以下属性：
- `attrs`：表示组件的属性对象。
- `slots`：表示组件的插槽对象，其类型经过解包操作后的 `UnwrapSlotsType<S>`。
- `emit`：表示用于触发自定义事件的函数，其类型是 `EmitFn<E>`。
- `expose`：表示公开(expose)一些属性或方法的函数，其类型是接受一个可选参数 `exposed`，返回 `void` 的函数。

如果 `E` 的类型不是任意类型(`any`)，则上下文类型为 `never`，即不存在上下文对象。

这个类型别名可以用于声明组件设置(setup)阶段的上下文类型，并根据需要访问属性、插槽、自定义事件等功能。
 */
export type SetupContext<
  E = EmitsOptions,
  S extends SlotsType = {}
> = E extends any
  ? {
      attrs: Data
      slots: UnwrapSlotsType<S>
      emit: EmitFn<E>
      expose: (exposed?: Record<string, any>) => void
    }
  : never

/**
 * @internal
 * `InternalRenderFunction` 是一个类型别名的声明。它表示内部渲染函数的类型。

该类型别名定义了一个函数类型，接受以下参数：
- `ctx`：组件的公共实例(ComponentPublicInstance)。
- `cache`：组件内部实例(ComponentInternalInstance)的渲染缓存(renderCache)。
- `$props`：组件内部实例的属性(props)。
- `$setup`：组件内部实例的设置(setupState)。
- `$data`：组件内部实例的数据(data)。
- `$options`：组件内部实例的上下文(ctx)。

函数返回一个 `VNodeChild` 类型的值，表示虚拟节点的子节点。

此外，类型别名还定义了以下可选属性：
- `_rc`：一个布尔值，表示是否是运行时编译的渲染函数。
- `_compatChecked`：一个布尔值，在 __COMPAT__ 模式下使用，表示是否已经检查过与 v2 兼容性。
- `_compatWrapped`：一个布尔值，在 __COMPAT__ 模式下使用，表示函数是否已经包装为 v2 兼容性。

这个类型别名描述了内部渲染函数的参数和返回值类型，以及一些与兼容性相关的属性。它用于定义组件的内部渲染函数的类型。
 */
export type InternalRenderFunction = {
  (
    ctx: ComponentPublicInstance,
    cache: ComponentInternalInstance['renderCache'],
    // for compiler-optimized bindings
    $props: ComponentInternalInstance['props'],
    $setup: ComponentInternalInstance['setupState'],
    $data: ComponentInternalInstance['data'],
    $options: ComponentInternalInstance['ctx']
  ): VNodeChild
  _rc?: boolean // isRuntimeCompiled

  // __COMPAT__ only
  _compatChecked?: boolean // v3 and already checked for v2 compat
  _compatWrapped?: boolean // is wrapped for v2 compat
}

/**
 * We expose a subset of properties on the internal instance as they are
 * useful for advanced external libraries and tools.
 * `ComponentInternalInstance` 是组件的内部实例的接口定义。

它包含以下属性：

- `uid`：组件实例的唯一标识符。
- `type`：组件的具体类型，可以是 `ConcreteComponent` 类型。
- `parent`：父级组件的内部实例，如果没有父级组件则为 `null`。
- `root`：根组件的内部实例。
- `appContext`：应用程序上下文对象。
- `vnode`：表示此组件在其父组件的虚拟节点树中的节点。
- `next`：来自父级更新的待处理的新虚拟节点。
- `subTree`：该组件自身虚拟节点树的根节点。
- `effect`：渲染效果实例。
- `update`：用于调度器的绑定效果函数。
- `render`：返回虚拟节点树的渲染函数。
- `ssrRender`：SSR 渲染函数。
- `provides`：提供给其后代组件的值的对象。
- `scope`：与该组件关联的响应式效果（如观察者）的追踪。
- `accessCache`：用于缓存代理访问类型的对象。
- `renderCache`：用于缓存依赖于 `_ctx` 的渲染函数值的数组。

接下来是一些只适用于有状态组件的属性：

- `proxy`：作为公共实例的主要代理 (`this`)。
- `exposed`：通过 `expose` 方法公开的属性对象。
- `exposeProxy`：用于公开属性的代理对象。
- `withProxy`：仅用于运行时编译的渲染函数的替代代理。
- `ctx`：作为公共实例代理的目标对象。它还包含用户选项注入的属性（如计算属性、方法等）和用户附加的自定义属性（通过 `this.x = ...`）。

还有一些其他属性用于组件的生命周期、状态和辅助功能。

该接口定义了组件的内部实例的属性，描述了组件在运行时的状态和行为。
 */
export interface ComponentInternalInstance {
  uid: number
  type: ConcreteComponent
  parent: ComponentInternalInstance | null
  root: ComponentInternalInstance
  appContext: AppContext
  /**
   * Vnode representing this component in its parent's vdom tree
   */
  vnode: VNode
  /**
   * The pending new vnode from parent updates
   * @internal
   */
  next: VNode | null
  /**
   * Root vnode of this component's own vdom tree
   */
  subTree: VNode
  /**
   * Render effect instance
   */
  effect: ReactiveEffect
  /**
   * Bound effect runner to be passed to schedulers
   */
  update: SchedulerJob
  /**
   * The render function that returns vdom tree.
   * @internal
   */
  render: InternalRenderFunction | null
  /**
   * SSR render function
   * @internal
   */
  ssrRender?: Function | null
  /**
   * Object containing values this component provides for its descendents
   * @internal
   */
  provides: Data
  /**
   * Tracking reactive effects (e.g. watchers) associated with this component
   * so that they can be automatically stopped on component unmount
   * @internal
   */
  scope: EffectScope
  /**
   * cache for proxy access type to avoid hasOwnProperty calls
   * @internal
   */
  accessCache: Data | null
  /**
   * cache for render function values that rely on _ctx but won't need updates
   * after initialized (e.g. inline handlers)
   * @internal
   */
  renderCache: (Function | VNode)[]

  /**
   * Resolved component registry, only for components with mixins or extends
   * @internal
   */
  components: Record<string, ConcreteComponent> | null
  /**
   * Resolved directive registry, only for components with mixins or extends
   * @internal
   */
  directives: Record<string, Directive> | null
  /**
   * Resolved filters registry, v2 compat only
   * @internal
   */
  filters?: Record<string, Function>
  /**
   * resolved props options
   * @internal
   */
  propsOptions: NormalizedPropsOptions
  /**
   * resolved emits options
   * @internal
   */
  emitsOptions: ObjectEmitsOptions | null
  /**
   * resolved inheritAttrs options
   * @internal
   */
  inheritAttrs?: boolean
  /**
   * is custom element?
   * @internal
   */
  isCE?: boolean
  /**
   * custom element specific HMR method
   * @internal
   */
  ceReload?: (newStyles?: string[]) => void

  // the rest are only for stateful components ---------------------------------

  // main proxy that serves as the public instance (`this`)
  proxy: ComponentPublicInstance | null

  // exposed properties via expose()
  exposed: Record<string, any> | null
  exposeProxy: Record<string, any> | null

  /**
   * alternative proxy used only for runtime-compiled render functions using
   * `with` block
   * @internal
   */
  withProxy: ComponentPublicInstance | null
  /**
   * This is the target for the public instance proxy. It also holds properties
   * injected by user options (computed, methods etc.) and user-attached
   * custom properties (via `this.x = ...`)
   * @internal
   */
  ctx: Data

  // state
  data: Data
  props: Data
  attrs: Data
  slots: InternalSlots
  refs: Data
  emit: EmitFn

  attrsProxy: Data | null
  slotsProxy: Slots | null

  /**
   * used for keeping track of .once event handlers on components
   * @internal
   */
  emitted: Record<string, boolean> | null
  /**
   * used for caching the value returned from props default factory functions to
   * avoid unnecessary watcher trigger
   * @internal
   */
  propsDefaults: Data
  /**
   * setup related
   * @internal
   */
  setupState: Data
  /**
   * devtools access to additional info
   * @internal
   */
  devtoolsRawSetupState?: any
  /**
   * @internal
   */
  setupContext: SetupContext | null

  /**
   * suspense related
   * @internal
   */
  suspense: SuspenseBoundary | null
  /**
   * suspense pending batch id
   * @internal
   */
  suspenseId: number
  /**
   * @internal
   */
  asyncDep: Promise<any> | null
  /**
   * @internal
   */
  asyncResolved: boolean

  // lifecycle
  isMounted: boolean
  isUnmounted: boolean
  isDeactivated: boolean
  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_CREATE]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.CREATED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.MOUNTED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.UPDATED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.UNMOUNTED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.RENDER_TRACKED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.RENDER_TRIGGERED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.ACTIVATED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.DEACTIVATED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.ERROR_CAPTURED]: LifecycleHook
  /**
   * @internal
   */
  [LifecycleHooks.SERVER_PREFETCH]: LifecycleHook<() => Promise<unknown>>

  /**
   * For caching bound $forceUpdate on public proxy access
   * @internal
   */
  f?: () => void
  /**
   * For caching bound $nextTick on public proxy access
   * @internal
   */
  n?: () => Promise<void>
  /**
   * `updateTeleportCssVars`
   * For updating css vars on contained teleports
   * @internal
   */
  ut?: (vars?: Record<string, string>) => void
}

const emptyAppContext = createAppContext()

let uid = 0
/**
 * 
 * @param vnode 
 * @param parent 
 * @param suspense 
 * @returns 
 * `createComponentInstance` 是用于创建组件实例的函数。

该函数接收三个参数：

- `vnode`：组件的虚拟节点。
- `parent`：父级组件的内部实例，如果没有父级组件则为 `null`。
- `suspense`：悬挂节点的边界实例，如果没有悬挂节点则为 `null`。

函数内部首先从虚拟节点中获取组件的类型，并获取父级组件的应用程序上下文（`appContext`）。然后创建一个空的组件实例对象 `instance`，并初始化其中的各个属性。

接下来根据开发环境是否为开发模式，设置 `instance.ctx`，这是一个渲染上下文对象，用于开发工具的访问。在非开发模式下，`instance.ctx` 设置为 `{ _: instance }`。

然后设置 `instance.root`，如果有父级组件则使用父级组件的 `root`，否则使用自身作为根组件。

接着设置 `instance.emit`，这是一个绑定了组件实例的 `emit` 方法，用于触发组件的自定义事件。

最后，如果虚拟节点有自定义元素特殊处理的函数 `vnode.ce`，则调用该函数，并传入组件实例。

最终返回创建的组件实例对象 `instance`。
 */
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
) {
  const type = vnode.type as ConcreteComponent
  // inherit parent app context - or - if root, adopt from root vnode
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null!, // to be immediately set
    next: null,
    subTree: null!, // will be set synchronously right after creation
    effect: null!,
    update: null!, // will be set synchronously right after creation
    scope: new EffectScope(true /* detached */),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    accessCache: null!,
    renderCache: [],

    // local resolved assets
    components: null,
    directives: null,

    // resolved props and emits options
    propsOptions: normalizePropsOptions(type, appContext),
    emitsOptions: normalizeEmitsOptions(type, appContext),

    // emit
    emit: null!, // to be set immediately
    emitted: null,

    // props default value
    propsDefaults: EMPTY_OBJ,

    // inheritAttrs
    inheritAttrs: type.inheritAttrs,

    // state
    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    setupContext: null,

    attrsProxy: null,
    slotsProxy: null,

    // suspense related
    suspense,
    suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,

    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  }
  if (__DEV__) {
    instance.ctx = createDevRenderContext(instance)
  } else {
    instance.ctx = { _: instance }
  }
  instance.root = parent ? parent.root : instance
  instance.emit = emit.bind(null, instance)

  // apply custom element special handling
  if (vnode.ce) {
    vnode.ce(instance)
  }

  return instance
}
/**
 * 代码片段`export let currentInstance: ComponentInternalInstance | null = null` 导出一个可变的变量 `currentInstance`，类型为 `ComponentInternalInstance | null`。

这个变量用于跟踪当前活动的组件实例，在组件的生命周期中进行记录。它最初被设置为 `null`，表示当前没有活动的组件实例。

通过导出这个变量，其他模块或组件可以导入并访问它，以在需要时检索或操作当前的组件实例。
 */
export let currentInstance: ComponentInternalInstance | null = null
/**
 * 
 * @returns 
 * 代码片段`export const getCurrentInstance: () => ComponentInternalInstance | null = () => currentInstance || currentRenderingInstance` 导出了一个名为 `getCurrentInstance` 的常量。它是一个函数，该函数没有参数，并返回类型为 `ComponentInternalInstance | null` 的值。

该函数用于获取当前的组件实例。它首先检查 `currentInstance` 是否存在，如果存在则返回该实例。如果 `currentInstance` 为 `null`，则返回 `currentRenderingInstance`，它是用于渲染的当前实例。

通过导出这个函数，其他模块或组件可以导入并调用它，以获取当前活动的组件实例。这对于在组件定义之外的地方访问组件实例非常有用，例如在自定义的逻辑或工具函数中。
 */
export const getCurrentInstance: () => ComponentInternalInstance | null = () =>
  currentInstance || currentRenderingInstance
/**
 * `GlobalInstanceSetter` 是一个类型别名，它定义了一个函数签名。这个函数接受一个参数 `instance`，类型为 `ComponentInternalInstance | null`，并且没有返回值。

除了函数签名之外，`GlobalInstanceSetter` 还具有一个属性 `version`，类型为字符串。这个属性是可选的。

该类型别名的作用是定义一个全局函数，用于设置全局的组件实例。通过调用这个函数并传入一个组件实例，可以在全局范围内设置当前的组件实例。这对于某些特定场景下的组件实例管理非常有用。

需要注意的是，`GlobalInstanceSetter` 是一个函数类型，同时具有一个额外的属性 `version`，用于存储版本信息或其他相关的元数据。
 */
type GlobalInstanceSetter = ((
  instance: ComponentInternalInstance | null
) => void) & { version?: string }

let internalSetCurrentInstance: GlobalInstanceSetter
let globalCurrentInstanceSetters: GlobalInstanceSetter[]
let settersKey = '__VUE_INSTANCE_SETTERS__'

/**
 * The following makes getCurrentInstance() usage across multiple copies of Vue
 * work. Some cases of how this can happen are summarized in #7590. In principle
 * the duplication should be avoided, but in practice there are often cases
 * where the user is unable to resolve on their own, especially in complicated
 * SSR setups.
 *
 * Note this fix is technically incomplete, as we still rely on other singletons
 * for effectScope and global reactive dependency maps. However, it does make
 * some of the most common cases work. It also warns if the duplication is
 * found during browser execution.
 * 这段代码主要是为了在服务器端渲染（SSR）和非服务器端渲染的情况下设置当前组件实例的全局变量。

首先，在服务器端渲染的情况下，通过判断 `__SSR__` 变量是否为真来确定是否处于服务器端渲染环境。如果是，则执行以下逻辑：

1. 检查全局对象中是否存在 `settersKey` 对应的属性（`globalCurrentInstanceSetters`）。
2. 如果不存在，将 `globalCurrentInstanceSetters` 初始化为空数组，并将其赋值给全局对象的 `settersKey` 属性。
3. 将一个函数推入 `globalCurrentInstanceSetters` 数组中，该函数用于设置当前组件实例。
4. 定义 `internalSetCurrentInstance` 函数，接受一个参数 `instance`，用于设置当前组件实例。
5. 如果 `globalCurrentInstanceSetters` 数组的长度大于 1，遍历数组中的每个函数，并将 `instance` 作为参数调用每个函数。
6. 如果 `globalCurrentInstanceSetters` 数组的长度为 1，直接将 `instance` 作为参数调用第一个函数。

在非服务器端渲染的情况下，直接定义 `internalSetCurrentInstance` 函数，接受一个参数 `i`，将 `currentInstance` 设置为 `i`。

通过这样的设置，无论是在服务器端渲染还是非服务器端渲染，都可以通过调用 `internalSetCurrentInstance` 函数来设置当前的组件实例。
 */
if (__SSR__) {
  if (!(globalCurrentInstanceSetters = getGlobalThis()[settersKey])) {
    globalCurrentInstanceSetters = getGlobalThis()[settersKey] = []
  }
  globalCurrentInstanceSetters.push(i => (currentInstance = i))
  internalSetCurrentInstance = instance => {
    if (globalCurrentInstanceSetters.length > 1) {
      globalCurrentInstanceSetters.forEach(s => s(instance))
    } else {
      globalCurrentInstanceSetters[0](instance)
    }
  }
} else {
  internalSetCurrentInstance = i => {
    currentInstance = i
  }
}
/**
 * 
 * @param instance 
 * `setCurrentInstance` 函数用于设置当前的组件实例，并调用该实例的 `scope.on()` 方法。

函数接受一个参数 `instance`，表示要设置的组件实例。它会调用内部的 `internalSetCurrentInstance` 函数，将 `instance` 作为参数，从而设置当前的组件实例。

接着，它调用 `instance.scope.on()` 方法，该方法用于激活组件实例的作用域。通过调用 `on` 方法，组件实例的相关响应式效果（如观察者）会被启用，以便在组件更新时能够正确追踪依赖和执行相应的操作。

总结起来，`setCurrentInstance` 函数设置当前的组件实例，并激活该实例的作用域，以便进行响应式追踪和更新操作。
 */
export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  internalSetCurrentInstance(instance)
  instance.scope.on()
}
/**
 * `unsetCurrentInstance` 函数用于取消当前的组件实例，并执行相应的清理操作。

函数首先通过条件判断 `currentInstance && currentInstance.scope.off()` 确保当前存在有效的组件实例。如果存在，则调用当前实例的 `scope.off()` 方法。这个方法用于停用组件实例的作用域，即取消响应式追踪和更新操作。

接着，它调用 `internalSetCurrentInstance(null)` 将当前组件实例设置为 `null`，即取消当前组件实例的引用。

通过执行以上步骤，`unsetCurrentInstance` 函数清除了当前组件实例的相关设置，包括取消作用域的激活并将当前组件实例引用设置为 `null`。这样可以确保在组件实例被卸载或切换时，相关的响应式追踪和更新操作被正确地停用和清理。
 */
export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()
  internalSetCurrentInstance(null)
}

const isBuiltInTag = /*#__PURE__*/ makeMap('slot,component')
/**
 * 
 * @param name 
 * @param config 
 * `validateComponentName` 函数用于验证组件的名称是否有效。它接收两个参数：`name` 表示要验证的组件名称，`config` 是应用程序的配置对象。

函数首先通过 `config.isNativeTag` 或默认值 `NO` 获取一个函数 `appIsNativeTag`，用于判断给定的标签名是否是原生 HTML 元素。

接着，函数调用 `isBuiltInTag(name)` 来检查给定的组件名称是否是内置标签（例如，`div`、`span` 等）。如果组件名称是内置标签，或者满足 `appIsNativeTag(name)` 的条件，即属于原生 HTML 元素，则发出警告。

警告信息指示不要使用内置或保留的 HTML 元素作为组件的标识符。

通过执行以上步骤，`validateComponentName` 函数用于验证组件的名称是否有效，并在组件名称无效时发出相应的警告。这有助于避免与内置或原生 HTML 元素冲突的组件名称的使用。
 */
export function validateComponentName(name: string, config: AppConfig) {
  const appIsNativeTag = config.isNativeTag || NO
  if (isBuiltInTag(name) || appIsNativeTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component id: ' + name
    )
  }
}
/**
 * 
 * @param instance 
 * @returns 
 * `isStatefulComponent` 函数用于判断给定的组件实例是否是有状态的组件。

函数接收一个 `instance` 参数，表示要检查的组件实例。

函数通过检查组件实例的 `vnode` 的 `shapeFlag` 属性与 `ShapeFlags.STATEFUL_COMPONENT` 进行位运算来判断组件是否是有状态的。如果结果不为 0，则表示组件是有状态的，否则表示组件是无状态的。

函数返回一个布尔值，表示组件是否是有状态的。

这个函数可以帮助判断组件的类型，根据组件的状态类型执行相应的逻辑。
 */
export function isStatefulComponent(instance: ComponentInternalInstance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}

export let isInSSRComponentSetup = false
/**
 * 
 * @param instance 
 * @param isSSR 
 * @returns 
 * `setupComponent` 函数用于设置组件实例的初始状态。

函数接收两个参数：
- `instance`：要设置的组件实例。
- `isSSR`：一个布尔值，表示是否在服务器端渲染环境下进行组件设置。默认为 `false`。

函数首先根据 `instance.vnode` 的 `props` 和 `children` 属性初始化组件的属性和插槽。然后根据组件的类型（有状态或无状态）调用相应的设置函数来进行组件的初始设置。如果是有状态组件，会调用 `setupStatefulComponent` 函数进行设置，并将返回的结果存储在 `setupResult` 中。

在进行服务器端渲染组件设置时，会将全局变量 `isInSSRComponentSetup` 设置为 `true`，以便在设置过程中进行适当的处理。完成组件设置后，会将 `isInSSRComponentSetup` 重置为 `false`。

最后，函数返回 `setupResult`，即组件设置的结果。

这个函数的作用是对组件进行初始化设置，包括处理属性和插槽，并执行相应的组件设置函数。它在组件的创建和初始化阶段被调用，用于准备组件的初始状态。
 */
export function setupComponent(
  instance: ComponentInternalInstance,
  isSSR = false
) {
  isInSSRComponentSetup = isSSR

  const { props, children } = instance.vnode
  const isStateful = isStatefulComponent(instance)
  initProps(instance, props, isStateful, isSSR)
  initSlots(instance, children)

  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined
  isInSSRComponentSetup = false
  return setupResult
}
/**
 * 
 * @param instance 
 * @param isSSR 
 * @returns 
 * `setupStatefulComponent` 函数用于设置有状态组件的初始状态。

函数接收两个参数：
- `instance`：要设置的组件实例。
- `isSSR`：一个布尔值，表示是否在服务器端渲染环境下进行组件设置。

首先，函数获取组件的选项对象 `Component`，并在开发环境下进行一些验证和警告的处理。包括验证组件名称、组件中使用的组件名称、指令名称，以及验证运行时版本是否支持编译器选项。

接下来的步骤包括：
1. 创建渲染代理的属性访问缓存对象 `accessCache`。
2. 创建组件实例的公共实例/渲染代理 `proxy`，并将其标记为 `raw`，以避免被观察。
3. 在开发环境下，将组件的 props 暴露在渲染上下文中，方便开发者调试和访问。
4. 调用组件的 `setup` 函数。
   - 如果 `setup` 存在，则根据 `setup` 函数的参数个数确定是否创建 `setupContext`。
   - 在调用 `setup` 函数之前，设置当前组件实例为当前实例，同时暂停追踪响应式依赖。
   - 使用 `callWithErrorHandling` 函数调用 `setup` 函数，并传递相应的参数。
   - 在 `setup` 函数执行期间，捕获并处理可能出现的错误。
   - 在 `setup` 函数执行完成后，重置追踪状态，并将当前实例恢复为先前的值。
   - 如果 `setup` 返回一个 Promise 对象，则将其处理为异步设置，并在服务器端渲染时返回该 Promise 对象以等待结果。
   - 如果 `setup` 返回一个非 Promise 对象，则将其作为设置结果进行处理。
5. 如果组件的 `setup` 函数不存在，则直接调用 `finishComponentSetup` 函数进行组件的设置。

`setupStatefulComponent` 函数的作用是根据组件的选项进行有状态组件的初始设置，包括创建渲染代理、调用 `setup` 函数等。它在组件的创建和初始化阶段被调用，用于准备有状态组件的初始状态。
 */
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions

  if (__DEV__) {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config)
    }
    if (Component.components) {
      const names = Object.keys(Component.components)
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config)
      }
    }
    if (Component.directives) {
      const names = Object.keys(Component.directives)
      for (let i = 0; i < names.length; i++) {
        validateDirectiveName(names[i])
      }
    }
    if (Component.compilerOptions && isRuntimeOnly()) {
      warn(
        `"compilerOptions" is only supported when using a build of Vue that ` +
          `includes the runtime compiler. Since you are using a runtime-only ` +
          `build, the options should be passed via your build tool config instead.`
      )
    }
  }
  // 0. create render proxy property access cache
  instance.accessCache = Object.create(null)
  // 1. create public instance / render proxy
  // also mark it raw so it's never observed
  instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))
  if (__DEV__) {
    exposePropsOnRenderContext(instance)
  }
  // 2. call setup()
  const { setup } = Component
  if (setup) {
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)

    setCurrentInstance(instance)
    pauseTracking()
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
    )
    resetTracking()
    unsetCurrentInstance()

    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
      if (isSSR) {
        // return the promise so server-renderer can wait on it
        return setupResult
          .then((resolvedResult: unknown) => {
            handleSetupResult(instance, resolvedResult, isSSR)
          })
          .catch(e => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
          })
      } else if (__FEATURE_SUSPENSE__) {
        // async setup returned Promise.
        // bail here and wait for re-entry.
        instance.asyncDep = setupResult
        if (__DEV__ && !instance.suspense) {
          const name = Component.name ?? 'Anonymous'
          warn(
            `Component <${name}>: setup function returned a promise, but no ` +
              `<Suspense> boundary was found in the parent component tree. ` +
              `A component with async setup() must be nested in a <Suspense> ` +
              `in order to be rendered.`
          )
        }
      } else if (__DEV__) {
        warn(
          `setup() returned a Promise, but the version of Vue you are using ` +
            `does not support it yet.`
        )
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {
    finishComponentSetup(instance, isSSR)
  }
}
/**
 * 
 * @param instance 
 * @param setupResult 
 * @param isSSR 
 * `handleSetupResult` 函数用于处理组件 `setup` 函数的返回结果。

函数接收三个参数：
- `instance`：组件实例。
- `setupResult`：`setup` 函数的返回结果。
- `isSSR`：一个布尔值，表示是否在服务器端渲染环境下进行组件设置。

函数的主要逻辑如下：
1. 如果 `setupResult` 是一个函数，则将其设置为组件实例的 `render` 函数。
   - 如果在服务器端渲染环境下，并且组件的类型是通过 SFC 的内联模式编译生成的，则将函数名为 `ssrRender` 的函数设置为 `ssrRender` 属性。
2. 如果 `setupResult` 是一个对象，则假设其是从模板编译生成的渲染函数的绑定结果。
   - 在开发环境下，将原始的 `setupResult` 存储在组件实例的 `devtoolsRawSetupState` 属性中，以便开发者工具使用。
   - 使用 `proxyRefs` 函数将 `setupResult` 转换为响应式代理对象，并将其设置为组件实例的 `setupState` 属性。
   - 在开发环境下，将 `setupState` 暴露在渲染上下文中，方便开发者调试和访问。
3. 如果 `setupResult` 不是函数也不是对象，并且不为 `undefined`，在开发环境下发出警告，提示 `setup` 函数应该返回一个对象。
4. 最后，调用 `finishComponentSetup` 函数完成组件的设置。

`handleSetupResult` 函数根据 `setup` 函数的返回结果进行处理，将返回结果作为组件实例的 `render` 函数或响应式状态，并在开发环境下提供额外的调试支持。这个函数在组件的创建和初始化阶段被调用，用于处理 `setup` 函数的返回结果。
 */
export function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean
) {
  if (isFunction(setupResult)) {
    // setup returned an inline render function
    if (__SSR__ && (instance.type as ComponentOptions).__ssrInlineRender) {
      // when the function's name is `ssrRender` (compiled by SFC inline mode),
      // set it as ssrRender instead.
      instance.ssrRender = setupResult
    } else {
      instance.render = setupResult as InternalRenderFunction
    }
  } else if (isObject(setupResult)) {
    if (__DEV__ && isVNode(setupResult)) {
      warn(
        `setup() should not return VNodes directly - ` +
          `return a render function instead.`
      )
    }
    // setup returned bindings.
    // assuming a render function compiled from template is present.
    if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
      instance.devtoolsRawSetupState = setupResult
    }
    instance.setupState = proxyRefs(setupResult)
    if (__DEV__) {
      exposeSetupStateOnRenderContext(instance)
    }
  } else if (__DEV__ && setupResult !== undefined) {
    warn(
      `setup() should return an object. Received: ${
        setupResult === null ? 'null' : typeof setupResult
      }`
    )
  }
  finishComponentSetup(instance, isSSR)
}
/**
 * `CompileFunction` 是一个类型别名，表示编译函数的类型。

编译函数接受两个参数：
- `template`：模板字符串或模板对象，用于编译成渲染函数。
- `options`：编译选项，可选参数。

编译函数返回一个 `InternalRenderFunction` 类型的函数，用于渲染组件。

`InternalRenderFunction` 是一个函数类型，用于执行渲染逻辑并返回一个 `VNode` 对象。

编译函数的作用是将模板转换为渲染函数，以便在组件的渲染过程中执行。它可以将模板字符串或模板对象编译成可执行的渲染函数，用于生成虚拟节点。编译函数的实现通常依赖于特定的模板编译器或编译工具。

编译函数可以根据需要接受编译选项，用于配置编译过程中的行为，例如模板语法解析、静态优化、作用域处理等。编译选项的具体配置取决于使用的编译工具或框架。

总之，`CompileFunction` 是一个用于将模板编译成渲染函数的函数类型。它接受模板和编译选项作为参数，并返回一个可执行的渲染函数，用于生成组件的虚拟节点。
 */
type CompileFunction = (
  template: string | object,
  options?: CompilerOptions
) => InternalRenderFunction

let compile: CompileFunction | undefined
let installWithProxy: (i: ComponentInternalInstance) => void

/**
 * For runtime-dom to register the compiler.
 * Note the exported method uses any to avoid d.ts relying on the compiler types.
 * `registerRuntimeCompiler` 是一个函数，用于注册运行时编译器。

它接受一个 `_compile` 参数，该参数表示运行时编译器的编译函数。在函数内部，将 `_compile` 赋值给全局变量 `compile`。

另外，`registerRuntimeCompiler` 还定义了一个函数 `installWithProxy`，它接受一个参数 `i`，表示组件实例。该函数的作用是在组件实例上安装代理。

在 `installWithProxy` 函数中，首先判断组件实例的 `render` 方法是否存在 `_rc` 属性。如果存在，说明该 `render` 方法是由运行时编译器编译生成的。然后，将 `i.ctx` 对象使用 `RuntimeCompiledPublicInstanceProxyHandlers` 代理处理，赋值给 `i.withProxy`。

通过调用 `registerRuntimeCompiler` 函数，可以注册运行时编译器，并在组件实例上安装代理，以支持运行时编译的功能。
 */
export function registerRuntimeCompiler(_compile: any) {
  compile = _compile
  installWithProxy = i => {
    if (i.render!._rc) {
      i.withProxy = new Proxy(i.ctx, RuntimeCompiledPublicInstanceProxyHandlers)
    }
  }
}

// dev only
export const isRuntimeOnly = () => !compile
/**
 * 
 * @param instance 
 * @param isSSR 
 * @param skipOptions
 * `finishComponentSetup` 是一个函数，用于完成组件的设置过程。

它接受三个参数：
- `instance`：组件的内部实例。
- `isSSR`：一个布尔值，表示是否在服务端渲染环境下。
- `skipOptions`：一个可选的布尔值，表示是否跳过选项的处理。

在函数内部，首先将 `instance.type` 强制转换为 `ComponentOptions` 类型，以获取组件的配置信息。

接下来的代码逻辑主要是对模板或渲染函数进行标准化处理。如果 `instance.render` 不存在，且不在服务端渲染环境下，并且存在运行时编译器 `compile`，则尝试进行模板的编译。

如果满足条件，会根据组件的配置信息获取模板，然后使用运行时编译器 `compile` 进行编译，生成渲染函数，并将其赋值给 `Component.render`。同时，将 `Component.render` 强制转换为 `InternalRenderFunction` 类型，并赋值给 `instance.render`。

如果安装了代理函数 `installWithProxy`，则会调用该函数对组件实例进行代理处理。

接下来的代码主要是支持 2.x 版本的选项配置。如果支持选项 API，并且不是兼容模式（`__COMPAT__` 为 `false`），且没有设置 `skipOptions` 参数为 `true`，则会应用选项配置。

最后的代码逻辑是发出警告，如果组件的 `render` 方法和 `instance.render` 都是 `NOOP`，且不是在服务端渲染环境下。如果不存在运行时编译器 `compile`，但组件配置中存在模板，则会发出关于运行时编译器不支持的警告。否则，发出组件缺少模板或渲染函数的警告。

通过调用 `finishComponentSetup` 函数，可以完成组件的设置过程，包括模板编译、选项应用和发出相应的警告。 
 */
export function finishComponentSetup(
  instance: ComponentInternalInstance,
  isSSR: boolean,
  skipOptions?: boolean
) {
  const Component = instance.type as ComponentOptions

  if (__COMPAT__) {
    convertLegacyRenderFn(instance)

    if (__DEV__ && Component.compatConfig) {
      validateCompatConfig(Component.compatConfig)
    }
  }

  // template / render function normalization
  // could be already set when returned from setup()
  if (!instance.render) {
    // only do on-the-fly compile if not in SSR - SSR on-the-fly compilation
    // is done by server-renderer
    if (!isSSR && compile && !Component.render) {
      const template =
        (__COMPAT__ &&
          instance.vnode.props &&
          instance.vnode.props['inline-template']) ||
        Component.template ||
        resolveMergedOptions(instance).template
      if (template) {
        if (__DEV__) {
          startMeasure(instance, `compile`)
        }
        const { isCustomElement, compilerOptions } = instance.appContext.config
        const { delimiters, compilerOptions: componentCompilerOptions } =
          Component
        const finalCompilerOptions: CompilerOptions = extend(
          extend(
            {
              isCustomElement,
              delimiters
            },
            compilerOptions
          ),
          componentCompilerOptions
        )
        if (__COMPAT__) {
          // pass runtime compat config into the compiler
          finalCompilerOptions.compatConfig = Object.create(globalCompatConfig)
          if (Component.compatConfig) {
            // @ts-expect-error types are not compatible
            extend(finalCompilerOptions.compatConfig, Component.compatConfig)
          }
        }
        Component.render = compile(template, finalCompilerOptions)
        if (__DEV__) {
          endMeasure(instance, `compile`)
        }
      }
    }

    instance.render = (Component.render || NOOP) as InternalRenderFunction

    // for runtime-compiled render functions using `with` blocks, the render
    // proxy used needs a different `has` handler which is more performant and
    // also only allows a whitelist of globals to fallthrough.
    if (installWithProxy) {
      installWithProxy(instance)
    }
  }

  // support for 2.x options
  if (__FEATURE_OPTIONS_API__ && !(__COMPAT__ && skipOptions)) {
    setCurrentInstance(instance)
    pauseTracking()
    try {
      applyOptions(instance)
    } finally {
      resetTracking()
      unsetCurrentInstance()
    }
  }

  // warn missing template/render
  // the runtime compilation of template in SSR is done by server-render
  if (__DEV__ && !Component.render && instance.render === NOOP && !isSSR) {
    /* istanbul ignore if */
    if (!compile && Component.template) {
      warn(
        `Component provided template option but ` +
          `runtime compilation is not supported in this build of Vue.` +
          (__ESM_BUNDLER__
            ? ` Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".`
            : __ESM_BROWSER__
            ? ` Use "vue.esm-browser.js" instead.`
            : __GLOBAL__
            ? ` Use "vue.global.js" instead.`
            : ``) /* should not happen */
      )
    } else {
      warn(`Component is missing template or render function.`)
    }
  }
}
/**
 * 
 * @param instance 
 * @returns 
 * `getAttrsProxy` 是一个函数，用于获取代理属性 `$attrs` 的处理逻辑。

它接受一个参数 `instance`，表示组件的内部实例。

在函数内部，首先判断 `instance.attrsProxy` 是否存在，如果存在则直接返回该代理属性。

如果 `instance.attrsProxy` 不存在，则创建一个新的代理属性。该代理属性使用 `Proxy` 对 `instance.attrs` 进行代理处理。

在代理处理的逻辑中，如果是开发环境（`__DEV__` 为真），则定义了 `get`、`set` 和 `deleteProperty` 三个钩子函数。在 `get` 钩子函数中，会调用 `markAttrsAccessed` 方法标记属性访问。然后，使用 `track` 方法追踪属性的读取操作，并返回对应的属性值。在 `set` 和 `deleteProperty` 钩子函数中，会发出警告，提示用户无法修改或删除 `setupContext.attrs` 属性，并返回 `false`。

如果不是开发环境，则只定义了 `get` 钩子函数。在 `get` 钩子函数中，同样使用 `track` 方法追踪属性的读取操作，并返回对应的属性值。

最后，将创建的代理属性赋值给 `instance.attrsProxy`，并返回该代理属性。

通过调用 `getAttrsProxy` 函数，可以获取组件内部实例的 `$attrs` 属性的代理处理逻辑。这样，在访问 `$attrs` 属性时，可以进行相应的操作，例如标记访问、追踪操作和发出警告。
 */
function getAttrsProxy(instance: ComponentInternalInstance): Data {
  return (
    instance.attrsProxy ||
    (instance.attrsProxy = new Proxy(
      instance.attrs,
      __DEV__
        ? {
            get(target, key: string) {
              markAttrsAccessed()
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            },
            set() {
              warn(`setupContext.attrs is readonly.`)
              return false
            },
            deleteProperty() {
              warn(`setupContext.attrs is readonly.`)
              return false
            }
          }
        : {
            get(target, key: string) {
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            }
          }
    ))
  )
}

/**
 * Dev-only
 * `getSlotsProxy` 是一个函数，用于获取代理属性 `$slots` 的处理逻辑。

它接受一个参数 `instance`，表示组件的内部实例。

在函数内部，首先判断 `instance.slotsProxy` 是否存在，如果存在则直接返回该代理属性。

如果 `instance.slotsProxy` 不存在，则创建一个新的代理属性。该代理属性使用 `Proxy` 对 `instance.slots` 进行代理处理。

在代理处理的逻辑中，定义了 `get` 钩子函数。在 `get` 钩子函数中，使用 `track` 方法追踪属性的读取操作，并返回对应的属性值。

最后，将创建的代理属性赋值给 `instance.slotsProxy`，并返回该代理属性。

通过调用 `getSlotsProxy` 函数，可以获取组件内部实例的 `$slots` 属性的代理处理逻辑。这样，在访问 `$slots` 属性时，可以进行相应的操作，例如追踪操作。
 */
function getSlotsProxy(instance: ComponentInternalInstance): Slots {
  return (
    instance.slotsProxy ||
    (instance.slotsProxy = new Proxy(instance.slots, {
      get(target, key: string) {
        track(instance, TrackOpTypes.GET, '$slots')
        return target[key]
      }
    }))
  )
}
/**
 * 
 * @param instance 
 * @returns 
 * `createSetupContext` 是一个函数，用于创建组件的设置上下文对象 `SetupContext`。

它接受一个参数 `instance`，表示组件的内部实例。

在函数内部，首先定义了一个 `expose` 函数，作为 `SetupContext` 对象的属性。`expose` 函数用于将指定的属性暴露给父组件。

在 `expose` 函数内部，进行了一系列的校验和警告。例如，检查是否多次调用 `expose` 函数，检查传入的暴露属性的类型是否为对象。然后，将传入的属性赋值给 `instance.exposed` 属性，用于记录已暴露的属性。

接下来，根据开发环境进行条件判断，返回不同的 `SetupContext` 对象。

在开发环境下，使用 `Object.freeze` 方法冻结 `SetupContext` 对象，同时使用 `get` 访问器属性来获取 `attrs`、`slots` 和 `emit` 属性的值。其中，`attrs` 属性通过调用 `getAttrsProxy` 函数获取代理处理后的属性值，`slots` 属性通过调用 `getSlotsProxy` 函数获取代理处理后的属性值，`emit` 属性是一个函数，用于触发事件。最后，将 `expose` 函数作为属性添加到 `SetupContext` 对象中。

在非开发环境下，直接返回一个普通的 `SetupContext` 对象，其中 `attrs` 属性通过调用 `getAttrsProxy` 函数获取代理处理后的属性值，`slots` 属性为 `instance.slots`，`emit` 属性为 `instance.emit`，并将 `expose` 函数作为属性添加到 `SetupContext` 对象中。

通过调用 `createSetupContext` 函数，可以创建组件的设置上下文对象 `SetupContext`，该对象包含了 `attrs`、`slots`、`emit` 和 `expose` 四个属性，用于在组件中进行相关操作，如获取属性、访问插槽、触发事件和暴露属性给父组件。
 */
export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    if (__DEV__) {
      if (instance.exposed) {
        warn(`expose() should be called only once per setup().`)
      }
      if (exposed != null) {
        let exposedType: string = typeof exposed
        if (exposedType === 'object') {
          if (isArray(exposed)) {
            exposedType = 'array'
          } else if (isRef(exposed)) {
            exposedType = 'ref'
          }
        }
        if (exposedType !== 'object') {
          warn(
            `expose() should be passed a plain object, received ${exposedType}.`
          )
        }
      }
    }
    instance.exposed = exposed || {}
  }

  if (__DEV__) {
    // We use getters in dev in case libs like test-utils overwrite instance
    // properties (overwrites should not be done in prod)
    return Object.freeze({
      get attrs() {
        return getAttrsProxy(instance)
      },
      get slots() {
        return getSlotsProxy(instance)
      },
      get emit() {
        return (event: string, ...args: any[]) => instance.emit(event, ...args)
      },
      expose
    })
  } else {
    return {
      get attrs() {
        return getAttrsProxy(instance)
      },
      slots: instance.slots,
      emit: instance.emit,
      expose
    }
  }
}
/**
 * 
 * @param instance 
 * @returns 
 * `getExposeProxy` 是一个函数，用于获取组件暴露属性的代理对象。

它接受一个参数 `instance`，表示组件的内部实例。

在函数内部，首先检查 `instance.exposed` 是否存在。如果存在，说明组件已经调用过 `expose` 函数暴露属性。

然后判断 `instance.exposeProxy` 是否已存在，如果存在则直接返回该代理对象。如果不存在，则创建一个新的代理对象。

新的代理对象使用 `Proxy` 构造函数创建，接受两个参数：被代理的对象和一个处理程序对象。

被代理的对象是通过 `proxyRefs` 函数将 `instance.exposed` 包装成响应式对象后使用 `markRaw` 函数标记为非响应式对象。这样做是为了确保暴露的属性不会被响应式系统跟踪。

处理程序对象定义了两个处理方法：`get` 和 `has`。

- `get` 方法用于获取属性的值。首先检查属性是否存在于被代理的对象中，如果存在则返回属性的值。如果属性不存在于被代理的对象中，再检查属性是否存在于 `publicPropertiesMap` 中。`publicPropertiesMap` 是一个包含公共属性的映射表，根据属性名返回相应的值。这样做是为了支持在模板中访问一些特殊属性，例如 `$attrs` 和 `$slots`。

- `has` 方法用于检查属性是否存在。首先检查属性是否存在于被代理的对象中，如果存在则返回 `true`。如果属性不存在于被代理的对象中，再检查属性是否存在于 `publicPropertiesMap` 中。

最后，将创建的代理对象赋值给 `instance.exposeProxy` 并返回。

通过调用 `getExposeProxy` 函数，可以获取组件暴露属性的代理对象，该代理对象支持访问已暴露的属性和特殊属性。这样可以在组件内部或模板中以更便捷的方式访问这些属性。
 */
export function getExposeProxy(instance: ComponentInternalInstance) {
  if (instance.exposed) {
    return (
      instance.exposeProxy ||
      (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key: string) {
          if (key in target) {
            return target[key]
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance)
          }
        },
        has(target, key: string) {
          return key in target || key in publicPropertiesMap
        }
      }))
    )
  }
}

const classifyRE = /(?:^|[-_])(\w)/g
/**
 * 
 * @param str 
 * @returns 
 * 你提供的代码定义了一个正则表达式`classifyRE`和一个名为`classify`的函数。

`classifyRE`正则表达式用于匹配字符串中连字符（`-`）或下划线（`_`）后面的第一个字符。该正则表达式使用`RegExp`构造函数定义，并且使用模式`(?:^|[-_])(\w)`。下面是模式的解释：

- `(?:^|[-_])`：一个非捕获组 `(?: ... )`，用于匹配字符串的开头 `^` 或连字符或下划线 `[-_]`。
- `(\w)`：一个捕获组 `(...)`，用于匹配一个单词字符。

`classify`函数接受一个字符串 `str` 作为输入，并返回修改后的字符串。它将连字符或下划线分隔的字符串转换为驼峰命名的字符串。

`classify`函数的工作原理如下：

1. 使用`classifyRE`正则表达式替换`str`中的字符。正则表达式会匹配连字符或下划线后的第一个字符，并将其转换为大写字母。
2. 使用正则表达式`/[-_]/g`全局匹配连字符或下划线，并将其从字符串中移除。

这样，`classify`函数将字符串转换为驼峰命名形式。
 */
const classify = (str: string): string =>
  str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '')
/**
 * 
 * @param Component 
 * @param includeInferred 
 * @returns 
 * 该代码定义了一个名为`getComponentName`的函数，用于获取组件的名称。

函数接受两个参数：

1. `Component`：要获取名称的组件。它可以是一个具体组件的构造函数（`ConcreteComponent`）或一个函数。
2. `includeInferred`（可选）：一个布尔值，表示是否包括推断的组件名称。默认为`true`。

函数的返回值为字符串、`false`或`undefined`，表示组件的名称。

函数的实现如下：

1. 首先，判断`Component`是否是一个函数（函数组件或类组件）。
   - 如果是函数组件或类组件，首先尝试获取组件的`displayName`属性，如果存在则返回该值作为组件名称。
   - 如果`displayName`属性不存在，则尝试获取组件的`name`属性，如果存在则返回该值作为组件名称。
2. 如果`Component`不是一个函数，或者以上步骤未返回有效的名称，则检查`includeInferred`参数。
   - 如果`includeInferred`为`true`，则尝试获取组件的`__name`属性作为推断的组件名称。
   - 如果`includeInferred`为`false`，或者`__name`属性不存在，则返回`undefined`表示无法获取组件名称。

因此，`getComponentName`函数根据不同的情况返回组件的名称，可以用于在开发过程中识别组件。
 */
export function getComponentName(
  Component: ConcreteComponent,
  includeInferred = true
): string | false | undefined {
  return isFunction(Component)
    ? Component.displayName || Component.name
    : Component.name || (includeInferred && Component.__name)
}

/* istanbul ignore next */
/**
 * 
 * @param instance 
 * @param Component 
 * @param isRoot 
 * @returns 
 * 该代码定义了一个名为`formatComponentName`的函数，用于格式化组件的名称。

函数接受三个参数：

1. `instance`：组件的实例对象（`ComponentInternalInstance`）或`null`。
2. `Component`：要格式化名称的组件。它可以是一个具体组件的构造函数（`ConcreteComponent`）。
3. `isRoot`（可选）：一个布尔值，表示组件是否是根组件。默认为`false`。

函数的返回值为格式化后的组件名称（字符串）。

函数的实现如下：

1. 首先，调用`getComponentName`函数获取组件的名称。
   - 如果名称存在，则将其赋值给`name`变量。
   - 如果名称不存在，并且组件有`__file`属性，则尝试从`__file`属性中提取文件名作为名称。
2. 如果名称仍然不存在，并且`instance`存在并且具有父级组件：
   - 尝试从父级组件的`components`对象或应用程序上下文的`components`对象中通过反向解析来推断名称。
   - 如果找到匹配的组件构造函数，则将其键名作为名称。
3. 最后，根据名称是否存在进行处理：
   - 如果名称存在，则调用`classify`函数对名称进行格式化（大写驼峰命名）。
   - 如果名称不存在，并且`isRoot`为`true`，则返回`'App'`表示根组件。
   - 如果名称不存在，并且`isRoot`为`false`，则返回`'Anonymous'`表示匿名组件。

因此，`formatComponentName`函数根据不同的情况对组件名称进行格式化，并返回格式化后的名称字符串。它用于在错误消息和警告中提供更友好的组件名称显示。
 */
export function formatComponentName(
  instance: ComponentInternalInstance | null,
  Component: ConcreteComponent,
  isRoot = false
): string {
  let name = getComponentName(Component)
  if (!name && Component.__file) {
    const match = Component.__file.match(/([^/\\]+)\.\w+$/)
    if (match) {
      name = match[1]
    }
  }

  if (!name && instance && instance.parent) {
    // try to infer the name based on reverse resolution
    const inferFromRegistry = (registry: Record<string, any> | undefined) => {
      for (const key in registry) {
        if (registry[key] === Component) {
          return key
        }
      }
    }
    name =
      inferFromRegistry(
        instance.components ||
          (instance.parent.type as ComponentOptions).components
      ) || inferFromRegistry(instance.appContext.components)
  }

  return name ? classify(name) : isRoot ? `App` : `Anonymous`
}
/**
 * 
 * @param value 
 * @returns 
 * 该代码定义了一个名为`isClassComponent`的函数，用于检测给定的值是否为类组件（Class Component）。

函数接受一个参数：

1. `value`：要检测的值。

函数的返回值为布尔值，表示给定的值是否为类组件。

函数的实现如下：

1. 首先，调用`isFunction`函数检测`value`是否为函数类型。
2. 如果`value`是函数类型，则进一步检查`value`是否具有`__vccOpts`属性。
3. 如果`value`具有`__vccOpts`属性，则将其判断为类组件，并返回`true`。
4. 如果`value`不是函数类型或者不具有`__vccOpts`属性，则判断为非类组件，并返回`false`。

因此，`isClassComponent`函数通过检查给定值是否为函数且具有`__vccOpts`属性来判断其是否为类组件。该函数在组件类型检测和相关逻辑中使用，用于区分类组件和函数式组件。
 */
export function isClassComponent(value: unknown): value is ClassComponent {
  return isFunction(value) && '__vccOpts' in value
}
