import {
  ComponentInternalInstance,
  Data,
  SetupContext,
  ComponentInternalOptions,
  Component,
  ConcreteComponent,
  InternalRenderFunction
} from './component'
import {
  isFunction,
  extend,
  isString,
  isObject,
  isArray,
  NOOP,
  isPromise,
  LooseRequired,
  Prettify
} from '@vue/shared'
import { isRef, Ref } from '@vue/reactivity'
import { computed } from './apiComputed'
import {
  watch,
  WatchOptions,
  WatchCallback,
  createPathGetter
} from './apiWatch'
import { provide, inject } from './apiInject'
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onErrorCaptured,
  onRenderTracked,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  onRenderTriggered,
  DebuggerHook,
  ErrorCapturedHook,
  onServerPrefetch
} from './apiLifecycle'
import {
  reactive,
  ComputedGetter,
  WritableComputedOptions
} from '@vue/reactivity'
import {
  ComponentObjectPropsOptions,
  ExtractPropTypes,
  ExtractDefaultPropTypes,
  ComponentPropsOptions
} from './componentProps'
import { EmitsOptions, EmitsToProps } from './componentEmits'
import { Directive } from './directives'
import {
  CreateComponentPublicInstance,
  ComponentPublicInstance,
  isReservedPrefix,
  IntersectionMixin,
  UnwrapMixinsType
} from './componentPublicInstance'
import { warn } from './warning'
import { VNodeChild } from './vnode'
import { callWithAsyncErrorHandling } from './errorHandling'
import { deepMergeData } from './compat/data'
import { DeprecationTypes } from './compat/compatConfig'
import {
  CompatConfig,
  isCompatEnabled,
  softAssertCompatEnabled
} from './compat/compatConfig'
import { OptionMergeFunction } from './apiCreateApp'
import { LifecycleHooks } from './enums'
import { SlotsType } from './componentSlots'
import { normalizePropsOrEmits } from './apiSetupHelpers'

/**
 * Interface for declaring custom options.
 *
 * @example
 * ```ts
 * declare module '@vue/runtime-core' {
 *   interface ComponentCustomOptions {
 *     beforeRouteUpdate?(
 *       to: Route,
 *       from: Route,
 *       next: () => void
 *     ): void
 *   }
 * }
 * ```
 * `ComponentCustomOptions` 接口表示自定义组件选项的空接口。它允许开发人员在创建组件时扩展或覆盖 Vue.js 提供的默认选项。

通过实现这个接口并添加自定义属性或方法，开发人员可以为组件定义额外的选项，比如自定义生命周期钩子、组件特定的配置或任何其他自定义行为。

以下是 `ComponentCustomOptions` 如何使用的示例：

```typescript
import { ComponentCustomOptions } from 'vue';

interface MyComponentOptions extends ComponentCustomOptions {
  customOption: string;
}

const MyComponent = {
  customOption: 'Hello, world!',
  // 其他组件选项...
} as MyComponentOptions;
```

在上面的示例中，`MyComponentOptions` 接口通过扩展 `ComponentCustomOptions` 来包含一个名为 `customOption` 的自定义选项。这样，`MyComponent` 对象就可以拥有一个不属于默认组件选项的额外属性。

通过使用 `ComponentCustomOptions`，开发人员可以扩展 Vue 组件的功能，并提供针对特定需求的额外自定义选项。
 */
export interface ComponentCustomOptions {}
/**
 * `RenderFunction` 类型表示渲染函数，它是一个没有参数并返回 `VNodeChild` 类型的函数。

在 Vue.js 中，渲染函数是一种用于生成虚拟节点 (VNode) 树的函数。它可以直接编写 JavaScript 代码来描述组件的渲染逻辑，而不依赖于模板语法。渲染函数可以动态生成组件的结构、属性和事件处理程序，并可以根据数据的变化进行条件渲染、循环渲染和组合渲染等操作。

`RenderFunction` 类型的函数可以通过返回 `VNodeChild` 类型的值来描述组件的渲染结果。`VNodeChild` 类型是表示虚拟节点的数据类型，它可以是单个虚拟节点、多个虚拟节点的数组或字符串等。

以下是 `RenderFunction` 的示例用法：

```typescript
import { h, RenderFunction, VNodeChild } from 'vue';

const render: RenderFunction = (): VNodeChild => {
  // 构建组件的渲染逻辑
  return h('div', { class: 'my-component' }, 'Hello, world!');
};

export default {
  render
};
```

在上面的示例中，我们定义了一个名为 `render` 的渲染函数，它没有参数，并返回一个描述组件结构的虚拟节点。在渲染函数中，我们使用 `h` 函数来创建一个 `<div>` 元素，并设置其类名为 `'my-component'`，同时将 `'Hello, world!'` 作为其子节点。最后，我们将渲染函数作为组件的 `render` 选项导出。

通过使用渲染函数，我们可以以编程的方式创建动态和灵活的组件，实现更高级的渲染逻辑和交互行为。
 */
export type RenderFunction = () => VNodeChild
/**
 * `ComponentOptionsBase` 接口是组件选项的基本类型。它定义了组件的各种选项，并提供了灵活的泛型参数来适应不同组件的需求。

以下是 `ComponentOptionsBase` 的主要成员：

- `Props`: 组件的属性类型。
- `RawBindings`: 组件的原始绑定类型。
- `D`: 组件的数据类型。
- `C`: 组件的计算属性类型。
- `M`: 组件的方法类型。
- `Mixin`: 组件的混入类型。
- `Extends`: 组件的扩展类型。
- `E`: 组件的事件选项类型。
- `EE`: 组件的事件字符串类型。
- `Defaults`: 组件的默认值类型。
- `I`: 组件的注入选项类型。
- `II`: 组件的注入字符串类型。
- `S`: 组件的插槽类型。

`ComponentOptionsBase` 继承了其他接口，包括 `LegacyOptions`、`ComponentInternalOptions` 和 `ComponentCustomOptions`，以提供更多的组件选项。

在 `ComponentOptionsBase` 中，可以定义以下选项：

- `setup`: 组件的设置函数，用于设置组件的属性和上下文，并返回原始绑定或渲染函数等。
- `name`: 组件的名称。
- `template`: 组件的模板，可以是字符串或对象，用于描述组件的结构。
- `render`: 组件的渲染函数，用于生成组件的虚拟节点。
- `components`: 组件中使用的子组件。
- `directives`: 组件中使用的指令。
- `inheritAttrs`: 是否继承父组件的属性。
- `emits`: 组件的事件选项，用于声明组件可以触发的事件。
- `slots`: 组件的插槽选项，用于定义组件的插槽内容。
- `expose`: 公开组件的属性或方法，供父组件使用。
- `serverPrefetch`: 服务器端预取函数，用于在服务器端渲染时预取数据。

除了上述选项外，`ComponentOptionsBase` 还包含了一些内部使用的选项，用于支持特定的功能或类型推断。

`ComponentOptionsBase` 提供了一个通用的接口定义，可以根据实际组件的需求来自定义和扩展。它为组件的开发提供了灵活性和可定制性。
 */
export interface ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C extends ComputedOptions,
  M extends MethodOptions,
  Mixin extends ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin,
  E extends EmitsOptions,
  EE extends string = string,
  Defaults = {},
  I extends ComponentInjectOptions = {},
  II extends string = string,
  S extends SlotsType = {}
> extends LegacyOptions<Props, D, C, M, Mixin, Extends, I, II>,
    ComponentInternalOptions,
    ComponentCustomOptions {
  setup?: (
    this: void,
    props: LooseRequired<
      Props &
        Prettify<
          UnwrapMixinsType<
            IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
            'P'
          >
        >
    >,
    ctx: SetupContext<E, S>
  ) => Promise<RawBindings> | RawBindings | RenderFunction | void
  name?: string
  template?: string | object // can be a direct DOM node
  // Note: we are intentionally using the signature-less `Function` type here
  // since any type with signature will cause the whole inference to fail when
  // the return expression contains reference to `this`.
  // Luckily `render()` doesn't need any arguments nor does it care about return
  // type.
  render?: Function
  components?: Record<string, Component>
  directives?: Record<string, Directive>
  inheritAttrs?: boolean
  emits?: (E | EE[]) & ThisType<void>
  slots?: S
  // TODO infer public instance type based on exposed keys
  expose?: string[]
  serverPrefetch?(): void | Promise<any>

  // Runtime compiler only -----------------------------------------------------
  compilerOptions?: RuntimeCompilerOptions

  // Internal ------------------------------------------------------------------

  /**
   * SSR only. This is produced by compiler-ssr and attached in compiler-sfc
   * not user facing, so the typing is lax and for test only.
   * @internal
   */
  ssrRender?: (
    ctx: any,
    push: (item: any) => void,
    parentInstance: ComponentInternalInstance,
    attrs: Data | undefined,
    // for compiler-optimized bindings
    $props: ComponentInternalInstance['props'],
    $setup: ComponentInternalInstance['setupState'],
    $data: ComponentInternalInstance['data'],
    $options: ComponentInternalInstance['ctx']
  ) => void

  /**
   * Only generated by compiler-sfc to mark a ssr render function inlined and
   * returned from setup()
   * @internal
   */
  __ssrInlineRender?: boolean

  /**
   * marker for AsyncComponentWrapper
   * @internal
   */
  __asyncLoader?: () => Promise<ConcreteComponent>
  /**
   * the inner component resolved by the AsyncComponentWrapper
   * @internal
   */
  __asyncResolved?: ConcreteComponent

  // Type differentiators ------------------------------------------------------

  // Note these are internal but need to be exposed in d.ts for type inference
  // to work!

  // type-only differentiator to separate OptionWithoutProps from a constructor
  // type returned by defineComponent() or FunctionalComponent
  call?: (this: unknown, ...args: unknown[]) => never
  // type-only differentiators for built-in Vnode types
  __isFragment?: never
  __isTeleport?: never
  __isSuspense?: never

  __defaults?: Defaults
}

/**
 * Subset of compiler options that makes sense for the runtime.
 * `RuntimeCompilerOptions` 接口定义了运行时编译器的选项。

它包含以下属性：

- `isCustomElement`：一个函数，用于判断给定标签名是否为自定义元素。
- `whitespace`：空白字符处理方式，可以是 `'preserve'`（保留空白字符）或 `'condense'`（压缩空白字符）。
- `comments`：是否保留注释。
- `delimiters`：用于指定模板中插值表达式的分隔符，是一个包含两个字符串的数组。

这些选项可用于配置运行时编译器的行为，例如自定义元素的处理、空白字符的处理、注释的保留与否以及插值表达式的分隔符。通过提供不同的选项值，可以调整编译器的输出结果，以满足特定的需求。

请注意，`RuntimeCompilerOptions` 接口仅用于运行时编译器，并不适用于使用预编译模板的情况。在预编译模板的情况下，这些选项不会起作用，因为模板已经在构建时进行了编译和优化。
 */
export interface RuntimeCompilerOptions {
  isCustomElement?: (tag: string) => boolean
  whitespace?: 'preserve' | 'condense'
  comments?: boolean
  delimiters?: [string, string]
}
/**
 * `ComponentOptionsWithoutProps` 是一个用于定义组件选项的类型，它不包含 Props。

它包含以下属性：

- `Props`：Props 的类型，默认为 `{}`。
- `RawBindings`：RawBindings 的类型，默认为 `{}`。
- `D`：Data 的类型，默认为 `{}`。
- `C`：ComputedOptions 的类型，默认为 `{}`。
- `M`：MethodOptions 的类型，默认为 `{}`。
- `Mixin`：ComponentOptionsMixin 的类型，默认为 `ComponentOptionsMixin`。
- `Extends`：ComponentOptionsMixin 的类型，默认为 `ComponentOptionsMixin`。
- `E`：EmitsOptions 的类型，默认为 `EmitsOptions`。
- `EE`：字符串类型，默认为 `string`。
- `I`：ComponentInjectOptions 的类型，默认为 `{}`。
- `II`：字符串类型，默认为 `string`。
- `S`：SlotsType 的类型，默认为 `{}`。
- `PE`：Props 和 EmitsToProps<E> 的交集类型。

`ComponentOptionsWithoutProps` 继承自 `ComponentOptionsBase`，并且定义了以下属性：

- `props`：Props 属性被设置为 `undefined`，表示该组件选项没有 Props。
- `ThisType`：为 `CreateComponentPublicInstance` 提供了上下文类型，用于指定创建组件实例时的上下文类型。

该类型适用于不需要 Props 的组件选项定义。通过使用 `ComponentOptionsWithoutProps`，可以在组件选项中省略 Props 相关的定义，以简化组件选项的编写和类型推断。
 */
export type ComponentOptionsWithoutProps<
  Props = {},
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = EmitsOptions,
  EE extends string = string,
  I extends ComponentInjectOptions = {},
  II extends string = string,
  S extends SlotsType = {},
  PE = Props & EmitsToProps<E>
> = ComponentOptionsBase<
  PE,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  EE,
  {},
  I,
  II,
  S
> & {
  props?: undefined
} & ThisType<
    CreateComponentPublicInstance<
      PE,
      RawBindings,
      D,
      C,
      M,
      Mixin,
      Extends,
      E,
      PE,
      {},
      false,
      I,
      S
    >
  >
/**
 * `ComponentOptionsWithArrayProps` 是一个用于定义具有数组 Props 的组件选项的类型。

它包含以下属性：

- `PropNames`：Props 名称的类型，默认为 `string`。
- `RawBindings`：RawBindings 的类型，默认为 `{}`。
- `D`：Data 的类型，默认为 `{}`。
- `C`：ComputedOptions 的类型，默认为 `{}`。
- `M`：MethodOptions 的类型，默认为 `{}`。
- `Mixin`：ComponentOptionsMixin 的类型，默认为 `ComponentOptionsMixin`。
- `Extends`：ComponentOptionsMixin 的类型，默认为 `ComponentOptionsMixin`。
- `E`：EmitsOptions 的类型，默认为 `EmitsOptions`。
- `EE`：字符串类型，默认为 `string`。
- `I`：ComponentInjectOptions 的类型，默认为 `{}`。
- `II`：字符串类型，默认为 `string`。
- `S`：SlotsType 的类型，默认为 `{}`。
- `Props`：根据 `PropNames` 生成的 Props 类型。

`ComponentOptionsWithArrayProps` 继承自 `ComponentOptionsBase`，并且定义了以下属性：

- `props`：Props 属性被设置为 `PropNames` 的数组类型，表示该组件选项具有一组特定的 Props。
- `ThisType`：为 `CreateComponentPublicInstance` 提供了上下文类型，用于指定创建组件实例时的上下文类型。

该类型适用于具有一组特定的数组 Props 的组件选项定义。通过使用 `ComponentOptionsWithArrayProps`，可以指定 Props 的名称，并且 Props 的类型会根据名称进行推断和生成。
 */
export type ComponentOptionsWithArrayProps<
  PropNames extends string = string,
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = EmitsOptions,
  EE extends string = string,
  I extends ComponentInjectOptions = {},
  II extends string = string,
  S extends SlotsType = {},
  Props = Prettify<Readonly<{ [key in PropNames]?: any } & EmitsToProps<E>>>
> = ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  EE,
  {},
  I,
  II,
  S
> & {
  props: PropNames[]
} & ThisType<
    CreateComponentPublicInstance<
      Props,
      RawBindings,
      D,
      C,
      M,
      Mixin,
      Extends,
      E,
      Props,
      {},
      false,
      I,
      S
    >
  >
/**
 * `ComponentOptionsWithObjectProps` 是一个用于定义具有对象 Props 的组件选项的类型。

它包含以下属性：

- `PropsOptions`：Props 配置选项的类型，默认为 `ComponentObjectPropsOptions`。
- `RawBindings`：RawBindings 的类型，默认为 `{}`。
- `D`：Data 的类型，默认为 `{}`。
- `C`：ComputedOptions 的类型，默认为 `{}`。
- `M`：MethodOptions 的类型，默认为 `{}`。
- `Mixin`：ComponentOptionsMixin 的类型，默认为 `ComponentOptionsMixin`。
- `Extends`：ComponentOptionsMixin 的类型，默认为 `ComponentOptionsMixin`。
- `E`：EmitsOptions 的类型，默认为 `EmitsOptions`。
- `EE`：字符串类型，默认为 `string`。
- `I`：ComponentInjectOptions 的类型，默认为 `{}`。
- `II`：字符串类型，默认为 `string`。
- `S`：SlotsType 的类型，默认为 `{}`。
- `Props`：根据 `PropsOptions` 提取的 Props 类型，并且与 `EmitsToProps<E>` 进行合并。

`ComponentOptionsWithObjectProps` 继承自 `ComponentOptionsBase`，并且定义了以下属性：

- `props`：Props 属性被设置为 `PropsOptions` 类型，并且使用 `ThisType<void>` 来指定上下文类型。
- `ThisType`：为 `CreateComponentPublicInstance` 提供了上下文类型，用于指定创建组件实例时的上下文类型。

该类型适用于具有对象 Props 配置的组件选项定义。通过使用 `ComponentOptionsWithObjectProps`，可以指定 Props 的配置选项，包括类型、验证等，并且 Props 的类型会根据配置选项进行提取和生成。
 */
export type ComponentOptionsWithObjectProps<
  PropsOptions = ComponentObjectPropsOptions,
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = EmitsOptions,
  EE extends string = string,
  I extends ComponentInjectOptions = {},
  II extends string = string,
  S extends SlotsType = {},
  Props = Prettify<Readonly<ExtractPropTypes<PropsOptions> & EmitsToProps<E>>>,
  Defaults = ExtractDefaultPropTypes<PropsOptions>
> = ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  EE,
  Defaults,
  I,
  II,
  S
> & {
  props: PropsOptions & ThisType<void>
} & ThisType<
    CreateComponentPublicInstance<
      Props,
      RawBindings,
      D,
      C,
      M,
      Mixin,
      Extends,
      E,
      Props,
      Defaults,
      false,
      I,
      S
    >
  >
/**
 * `ComponentOptions` 是一个用于定义组件选项的类型。

它包含以下属性：

- `Props`：Props 的类型，默认为 `{}`。
- `RawBindings`：RawBindings 的类型，默认为 `any`。
- `D`：Data 的类型，默认为 `any`。
- `C`：ComputedOptions 的类型，默认为 `any`。
- `M`：MethodOptions 的类型，默认为 `any`。
- `Mixin`：ComponentOptionsMixin 的类型，默认为 `any`。
- `Extends`：ComponentOptionsMixin 的类型，默认为 `any`。
- `E`：EmitsOptions 的类型，默认为 `any`。
- `S`：SlotsType 的类型，默认为 `any`。

`ComponentOptions` 继承自 `ComponentOptionsBase`，并且定义了以下属性：

- `ThisType`：为 `CreateComponentPublicInstance` 提供了上下文类型，用于指定创建组件实例时的上下文类型。

通过使用 `ComponentOptions`，可以定义组件的各种选项，包括 Props、Data、计算属性、方法、混入等，并且可以指定创建组件实例时的上下文类型。
 */
export type ComponentOptions<
  Props = {},
  RawBindings = any,
  D = any,
  C extends ComputedOptions = any,
  M extends MethodOptions = any,
  Mixin extends ComponentOptionsMixin = any,
  Extends extends ComponentOptionsMixin = any,
  E extends EmitsOptions = any,
  S extends SlotsType = any
> = ComponentOptionsBase<
  Props,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  string,
  S
> &
  ThisType<
    CreateComponentPublicInstance<
      {},
      RawBindings,
      D,
      C,
      M,
      Mixin,
      Extends,
      E,
      Readonly<Props>
    >
  >
/**
 * `ComponentOptionsMixin` 是一个用于定义组件选项混入的类型。

它是通过将所有的类型参数设置为 `any`，然后传递给 `ComponentOptionsBase` 来定义的。

这意味着 `ComponentOptionsMixin` 可以用作组件选项的混入，它可以与其他具体类型的组件选项合并，以扩展或修改组件的行为。

通过使用 `ComponentOptionsMixin`，可以在组件选项中添加通用的属性、方法、计算属性等，以实现代码重用和组件行为的共享。
 */
export type ComponentOptionsMixin = ComponentOptionsBase<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
/**
 * `ComputedOptions` 是一个类型别名，表示一个计算属性的选项对象。它是一个由字符串键和计算属性选项值组成的记录类型（`Record<string, ComputedGetter<any> | WritableComputedOptions<any>>`）。

每个计算属性选项都是一个计算属性的定义，可以是一个只读的计算属性或一个可写的计算属性选项。

- `ComputedGetter<T>` 表示一个只读的计算属性，它是一个函数类型，接收组件实例作为上下文，返回计算属性的值 `T`。

- `WritableComputedOptions<T>` 表示一个可写的计算属性选项，它是一个包含 `get` 和 `set` 方法的对象，用于定义计算属性的读取和写入操作。其中 `get` 是一个计算属性的读取函数，接收组件实例作为上下文，返回计算属性的值 `T`；`set` 是一个计算属性的写入函数，接收组件实例作为上下文和要设置的值 `T`。

通过使用 `ComputedOptions`，可以在组件选项中定义和配置计算属性，使其具有自动响应式、缓存和依赖追踪的能力。计算属性可以基于其他响应式属性进行计算，并在其依赖的属性发生变化时自动更新。
 */
export type ComputedOptions = Record<
  string,
  ComputedGetter<any> | WritableComputedOptions<any>
>
/**
 * `MethodOptions` 是一个接口，用于定义组件的方法选项。它是一个键值对的对象类型，其中键是方法名，值是对应的函数。

在组件的 `methods` 选项中，可以使用 `MethodOptions` 来定义组件的方法。每个方法都是一个函数，可以在组件内部进行调用和处理。

例如，下面是一个使用 `MethodOptions` 定义了两个方法的组件示例：

```typescript
import { MethodOptions } from 'vue';

const methods: MethodOptions = {
  handleClick() {
    // 处理点击事件
  },
  handleInput() {
    // 处理输入事件
  }
};

export default {
  methods
};
```

在上面的示例中，我们使用 `MethodOptions` 定义了两个方法 `handleClick` 和 `handleInput`。这些方法可以在组件的模板或其他方法中进行调用和使用。

使用 `MethodOptions` 可以帮助我们在组件中定义和管理各种方法，并提供了类型检查和代码提示的支持。
 */
export interface MethodOptions {
  [key: string]: Function
}
/**
 * `ExtractComputedReturns` 是一个泛型类型，用于从给定对象类型 `T` 中提取计算属性的返回值类型。

计算属性是在组件中定义的具有缓存功能的属性，其值是根据其他属性计算得出的。在 Vue 组件中，计算属性通过 `computed` 选项定义。

`ExtractComputedReturns` 的作用是从一个对象类型 `T` 中提取出所有计算属性的返回值类型，并将其以相同的属性名构建一个新的对象类型。

下面是 `ExtractComputedReturns` 的类型定义：

```typescript
export type ExtractComputedReturns<T extends any> = {
  [key in keyof T]: T[key] extends { get: (...args: any[]) => infer TReturn }
    ? TReturn
    : T[key] extends (...args: any[]) => infer TReturn
    ? TReturn
    : never
};
```

例如，假设我们有一个对象类型 `MyComponentOptions`，其中包含了一些计算属性：

```typescript
type MyComponentOptions = {
  computed: {
    fullName: () => string;
    doubleValue: {
      get: () => number;
      set: (value: number) => void;
    };
  };
};
```

我们可以使用 `ExtractComputedReturns` 来提取计算属性的返回值类型：

```typescript
type ComputedReturns = ExtractComputedReturns<MyComponentOptions['computed']>;
```

`ComputedReturns` 的类型将会是：

```typescript
{
  fullName: string;
  doubleValue: number;
}
```

通过使用 `ExtractComputedReturns`，我们可以轻松地获取计算属性的返回值类型，并将其用于类型检查和代码提示。
 */
export type ExtractComputedReturns<T extends any> = {
  [key in keyof T]: T[key] extends { get: (...args: any[]) => infer TReturn }
    ? TReturn
    : T[key] extends (...args: any[]) => infer TReturn
    ? TReturn
    : never
}
/**
 * `ObjectWatchOptionItem` 是一个类型别名，用于描述对象形式的 Watch 配置项。

Watch 是 Vue 组件中用于观察和响应数据变化的功能。通过 Watch，我们可以在数据发生变化时执行相应的操作。

`ObjectWatchOptionItem` 的定义如下：

```typescript
export type ObjectWatchOptionItem = {
  handler: WatchCallback | string
} & WatchOptions;
```

该类型别名包含了 `handler` 属性和 `WatchOptions` 属性。其中：

- `handler` 属性可以是一个函数类型 `WatchCallback` 或一个字符串类型，用于指定要执行的回调函数。
- `WatchOptions` 属性用于配置 Watch 的其他选项，例如 `deep`、`immediate` 等。

通过将这两个属性结合在一起，`ObjectWatchOptionItem` 描述了一个完整的 Watch 配置项。

使用 `ObjectWatchOptionItem` 类型，我们可以定义对象形式的 Watch 配置项，如下所示：

```typescript
const watchOptions: ObjectWatchOptionItem = {
  handler: 'handleDataChange',
  deep: true,
  immediate: true
};
```

在上述示例中，`watchOptions` 是一个对象，包含了 `handler` 属性指定的字符串值 `'handleDataChange'`，以及其他 Watch 配置项 `deep` 和 `immediate`。

这样，我们可以在 Vue 组件中使用这种对象形式的 Watch 配置项来监听数据的变化并执行相应的操作。
 */
export type ObjectWatchOptionItem = {
  handler: WatchCallback | string
} & WatchOptions
/**
 * `WatchOptionItem` 是一个联合类型，用于描述 Watch 配置项的多种可能类型。

在 Vue 组件中，我们可以通过 Watch 来观察和响应数据的变化。`WatchOptionItem` 描述了 Watch 配置项的三种可能类型：

1. 字符串类型 (`string`): Watch 配置项可以直接是一个字符串，用于指定要观察的数据属性名称。
2. 函数类型 (`WatchCallback`): Watch 配置项可以是一个函数，作为数据变化时要执行的回调函数。
3. 对象类型 (`ObjectWatchOptionItem`): Watch 配置项可以是一个对象，其中包含了 `handler` 属性和其他 Watch 选项，用于配置 Watch 的更多行为。

通过联合类型的定义，我们可以将不同类型的 Watch 配置项放在一个统一的类型中，方便在组件中使用。

示例用法：

```typescript
const watchOptions: WatchOptionItem = 'dataProperty'; // 字符串类型的 Watch 配置项

const watchOptions: WatchOptionItem = (newValue, oldValue) => {
  // 函数类型的 Watch 配置项
  // 执行回调函数的逻辑
};

const watchOptions: WatchOptionItem = {
  // 对象类型的 Watch 配置项
  handler: 'handleDataChange',
  deep: true,
  immediate: true
};
```

在上述示例中，我们可以看到不同类型的 Watch 配置项都被赋值给了 `watchOptions` 变量，而该变量的类型为 `WatchOptionItem`，即联合类型。根据实际需要，我们可以选择不同类型的 Watch 配置项来实现对数据变化的观察和响应。
 */
type WatchOptionItem = string | WatchCallback | ObjectWatchOptionItem
/**
 * `ComponentWatchOptionItem` 是一个联合类型，用于描述组件中的 Watch 配置项的多种可能类型。

在 Vue 组件中，我们可以通过 Watch 来观察和响应数据的变化。`ComponentWatchOptionItem` 描述了组件中 Watch 配置项的两种可能类型：

1. `WatchOptionItem` 类型: 表示单个的 Watch 配置项。可以是字符串类型、函数类型或对象类型的 Watch 配置项。
2. `WatchOptionItem[]` 类型: 表示一个 Watch 配置项数组。可以包含多个 Watch 配置项。

通过联合类型的定义，我们可以将不同类型的 Watch 配置项以及多个 Watch 配置项放在一个统一的类型中，方便在组件中使用。

示例用法：

```typescript
const watchOptions: ComponentWatchOptionItem = 'dataProperty'; // 字符串类型的 Watch 配置项

const watchOptions: ComponentWatchOptionItem = (newValue, oldValue) => {
  // 函数类型的 Watch 配置项
  // 执行回调函数的逻辑
};

const watchOptions: ComponentWatchOptionItem = [
  'dataProperty1', 'dataProperty2', 'dataProperty3'
];

const watchOptions: ComponentWatchOptionItem = [
  {
    handler: 'handleDataChange',
    deep: true
  },
  (newValue, oldValue) => {
    // 函数类型的 Watch 配置项
    // 执行回调函数的逻辑
  }
];
```

在上述示例中，我们可以看到不同类型的 Watch 配置项被赋值给了 `watchOptions` 变量，而该变量的类型为 `ComponentWatchOptionItem`，即联合类型。根据实际需要，我们可以选择不同类型的 Watch 配置项来实现对数据变化的观察和响应，也可以组合多个 Watch 配置项来监听多个数据的变化。
 */
type ComponentWatchOptionItem = WatchOptionItem | WatchOptionItem[]
/**
 * `ComponentWatchOptions` 是一个类型，用于描述组件中的 Watch 配置项的集合。

在 Vue 组件中，我们可以通过 Watch 来观察和响应数据的变化。`ComponentWatchOptions` 类型是一个对象类型，其中键（key）表示要观察的属性或表达式，值（value）表示相应的 Watch 配置项。

示例用法：

```typescript
const watchOptions: ComponentWatchOptions = {
  dataProperty1: 'handleDataChange', // 字符串类型的 Watch 配置项
  dataProperty2: (newValue, oldValue) => {
    // 函数类型的 Watch 配置项
    // 执行回调函数的逻辑
  },
  dataProperty3: [
    'handleDataChange1',
    'handleDataChange2',
    (newValue, oldValue) => {
      // 函数类型的 Watch 配置项
      // 执行回调函数的逻辑
    }
  ]
};
```

在上述示例中，我们定义了一个 `watchOptions` 对象，其中包含了多个 Watch 配置项。每个 Watch 配置项都以属性名（如 `dataProperty1`、`dataProperty2`、`dataProperty3`）作为键，对应的值可以是字符串类型、函数类型或数组类型。通过这样的方式，我们可以定义多个 Watch 配置项来观察多个属性或表达式的变化，并指定相应的处理逻辑。

使用 `ComponentWatchOptions` 类型可以确保在组件中正确定义和使用 Watch 配置项，并提供类型检查和自动补全的支持。
 */
type ComponentWatchOptions = Record<string, ComponentWatchOptionItem>
/**
 * `ComponentProvideOptions` 是一个类型，用于描述组件中提供数据的选项。

在 Vue 组件中，我们可以使用 `provide` 选项来向子组件提供数据。`ComponentProvideOptions` 类型是一个联合类型，它可以是 `ObjectProvideOptions` 或 `Function` 类型。

- `ObjectProvideOptions` 表示以对象形式提供数据，它是一个普通的 JavaScript 对象，其中键（key）表示要提供的数据的名称，值（value）表示要提供的数据的内容。例如：

  ```typescript
  const provideOptions: ObjectProvideOptions = {
    foo: 'bar', // 提供名为 "foo" 的数据，值为 "bar"
    baz: 42 // 提供名为 "baz" 的数据，值为 42
  };
  ```

- `Function` 表示通过函数动态提供数据。这个函数会在组件创建时被调用，并返回要提供的数据。例如：

  ```typescript
  const provideOptions: Function = () => {
    return {
      currentDate: new Date() // 提供当前日期
    };
  };
  ```

通过使用 `ComponentProvideOptions` 类型，我们可以在组件中正确定义和使用 `provide` 选项，并为提供的数据提供类型检查和自动补全的支持。
 */
export type ComponentProvideOptions = ObjectProvideOptions | Function
/**
 * `ObjectProvideOptions` 是一个类型，用于描述以对象形式提供数据的选项。

在 Vue 组件中，我们可以使用 `provide` 选项向子组件提供数据。`ObjectProvideOptions` 类型是一个对象类型，其中键（key）表示要提供的数据的名称，值（value）表示要提供的数据的内容。键可以是字符串（string）或符号（symbol），值可以是任意类型。

例如：

```typescript
const provideOptions: ObjectProvideOptions = {
  foo: 'bar', // 提供名为 "foo" 的数据，值为 "bar"
  baz: 42 // 提供名为 "baz" 的数据，值为 42
};
```

通过使用 `ObjectProvideOptions` 类型，我们可以在组件中定义和使用 `provide` 选项，并为提供的数据提供类型检查和自动补全的支持。
 */
type ObjectProvideOptions = Record<string | symbol, unknown>
/**
 * `ComponentInjectOptions` 是一个类型，用于描述组件中的注入选项。

在 Vue 组件中，我们可以使用 `inject` 选项从父组件或祖先组件中注入数据。`ComponentInjectOptions` 类型可以是字符串数组（`string[]`）或 `ObjectInjectOptions` 类型。

如果 `ComponentInjectOptions` 是一个字符串数组，数组中的每个元素表示要注入的数据的名称。

如果 `ComponentInjectOptions` 是 `ObjectInjectOptions` 类型，它表示一个对象，其中键（key）表示要注入的数据的名称，值（value）表示在注入时的配置选项。

例如：

```typescript
const injectOptions: ComponentInjectOptions = ['foo', 'bar']; // 注入名为 "foo" 和 "bar" 的数据

const injectOptions: ComponentInjectOptions = {
  foo: { from: 'otherComponent' }, // 从名称为 "otherComponent" 的组件注入名为 "foo" 的数据
  bar: { default: 'baz' } // 如果没有找到名为 "bar" 的注入数据，则使用默认值 "baz"
};
```

通过使用 `ComponentInjectOptions` 类型，我们可以在组件中定义和使用 `inject` 选项，并为注入的数据提供类型检查和自动补全的支持。
 */
export type ComponentInjectOptions = string[] | ObjectInjectOptions
/**
 * `ObjectInjectOptions` 是一个类型，用于描述注入选项中的对象形式的配置。

在 Vue 组件中，可以使用 `inject` 选项从父组件或祖先组件中注入数据。`ObjectInjectOptions` 类型是一个记录类型，其中键（key）表示要注入的数据的名称，值（value）表示注入时的配置选项。

配置选项可以是以下三种形式之一：

1. 字符串或符号（`string` | `symbol`）：表示要从哪个组件注入数据。这是最简单的形式，只需要指定要注入的组件的名称或符号。

2. 对象（`{ from?: string | symbol; default?: unknown }`）：可以通过以下两个属性进行更详细的配置：

   - `from`：表示要从哪个组件注入数据。可以是组件的名称或符号。
   - `default`：表示在找不到注入数据时使用的默认值。

以下是 `ObjectInjectOptions` 的示例：

```typescript
const injectOptions: ObjectInjectOptions = {
  foo: 'otherComponent', // 从名称为 "otherComponent" 的组件注入名为 "foo" 的数据
  bar: { from: 'anotherComponent', default: 'baz' } // 从名称为 "anotherComponent" 的组件注入名为 "bar" 的数据，并设置默认值为 "baz"
};
```

通过使用 `ObjectInjectOptions` 类型，我们可以为注入选项提供更灵活的配置，并在组件中进行类型检查和自动补全。
 */
type ObjectInjectOptions = Record<
  string | symbol,
  string | symbol | { from?: string | symbol; default?: unknown }
>
/**
 * `InjectToObject<T>` 是一个条件类型，用于将 `ComponentInjectOptions` 转换为对应的注入对象类型。

如果 `T` 是一个字符串数组（`string[]`），则表示注入选项是一个字符串数组，每个字符串表示要注入的属性名称。在这种情况下，`InjectToObject<T>` 将生成一个对象类型，其中属性名称为字符串数组中的每个元素，属性值为 `unknown` 类型。

如果 `T` 是 `ObjectInjectOptions` 类型，则表示注入选项是一个对象，其中键（key）为要注入的属性名称，值（value）为注入选项的配置。在这种情况下，`InjectToObject<T>` 将生成一个对象类型，其中属性名称和属性值的类型与 `ObjectInjectOptions` 对应的键值对保持一致。

如果 `T` 不是字符串数组也不是 `ObjectInjectOptions` 类型，则返回 `never` 类型，表示不支持的注入选项类型。

以下是 `InjectToObject<T>` 的示例：

```typescript
type InjectOptions1 = ['foo', 'bar'];
type InjectOptions2 = { foo: string; bar: number };

type Result1 = InjectToObject<InjectOptions1>;
// Result1: { foo?: unknown; bar?: unknown }

type Result2 = InjectToObject<InjectOptions2>;
// Result2: { foo?: unknown; bar?: unknown }
```

通过使用 `InjectToObject<T>` 类型，我们可以将注入选项转换为对应的注入对象类型，从而实现类型检查和自动补全。
 */
export type InjectToObject<T extends ComponentInjectOptions> =
  T extends string[]
    ? {
        [K in T[number]]?: unknown
      }
    : T extends ObjectInjectOptions
    ? {
        [K in keyof T]?: unknown
      }
    : never
/**
 * `LegacyOptions` 是一个接口，用于定义组件的选项和配置。

该接口具有以下属性：

- `compatConfig`：兼容性配置项，用于配置兼容性相关的选项。
- `[key: string]: any`：允许任意自定义选项，可以添加额外的属性。
- `data`：数据选项，用于定义组件的数据。它是一个函数，函数的上下文为组件实例，接受一个参数 `vm` 表示组件实例。
- `computed`：计算属性选项，用于定义组件的计算属性。
- `methods`：方法选项，用于定义组件的方法。
- `watch`：监视选项，用于定义组件的监视器。
- `provide`：提供选项，用于定义组件的依赖注入。
- `inject`：注入选项，用于定义组件的注入依赖。
- `filters`：过滤器选项，用于定义组件的过滤器。
- `mixins`：混入选项，用于混入其他组件的选项。
- `extends`：扩展选项，用于扩展其他组件的选项。
- 生命周期钩子函数：包括 `beforeCreate`、`created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`activated`、`deactivated`、`beforeDestroy`（已废弃，请使用 `beforeUnmount` 替代）、`beforeUnmount`、`destroyed`（已废弃，请使用 `unmounted` 替代）和 `unmounted`。
- `renderTracked`：渲染跟踪钩子函数，用于在渲染过程中跟踪依赖项的变化。
- `renderTriggered`：渲染触发钩子函数，用于在渲染过程中跟踪触发的事件。
- `errorCaptured`：错误捕获钩子函数，用于捕获组件内部的错误。
- `delimiters`：分隔符选项，仅在运行时编译时使用，用于指定模板中的分隔符。
- `__differentiator`：类型辅助选项，用于帮助类型推断，在混入（Mixin）的类型推断中起到区分不同选项的作用。

`LegacyOptions` 接口可以用于定义组件的选项和配置，在 Vue.js 的旧版本中使用。它是一种过时的选项，为了兼容性和向后兼容性，更推荐使用新的组件选项定义方式。
 */
interface LegacyOptions<
  Props,
  D,
  C extends ComputedOptions,
  M extends MethodOptions,
  Mixin extends ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin,
  I extends ComponentInjectOptions,
  II extends string
> {
  compatConfig?: CompatConfig

  // allow any custom options
  [key: string]: any

  // state
  // Limitation: we cannot expose RawBindings on the `this` context for data
  // since that leads to some sort of circular inference and breaks ThisType
  // for the entire component.
  data?: (
    this: CreateComponentPublicInstance<
      Props,
      {},
      {},
      {},
      MethodOptions,
      Mixin,
      Extends
    >,
    vm: CreateComponentPublicInstance<
      Props,
      {},
      {},
      {},
      MethodOptions,
      Mixin,
      Extends
    >
  ) => D
  computed?: C
  methods?: M
  watch?: ComponentWatchOptions
  provide?: ComponentProvideOptions
  inject?: I | II[]

  // assets
  filters?: Record<string, Function>

  // composition
  mixins?: Mixin[]
  extends?: Extends

  // lifecycle
  beforeCreate?(): void
  created?(): void
  beforeMount?(): void
  mounted?(): void
  beforeUpdate?(): void
  updated?(): void
  activated?(): void
  deactivated?(): void
  /** @deprecated use `beforeUnmount` instead */
  beforeDestroy?(): void
  beforeUnmount?(): void
  /** @deprecated use `unmounted` instead */
  destroyed?(): void
  unmounted?(): void
  renderTracked?: DebuggerHook
  renderTriggered?: DebuggerHook
  errorCaptured?: ErrorCapturedHook

  /**
   * runtime compile only
   * @deprecated use `compilerOptions.delimiters` instead.
   */
  delimiters?: [string, string]

  /**
   * #3468
   *
   * type-only, used to assist Mixin's type inference,
   * typescript will try to simplify the inferred `Mixin` type,
   * with the `__differentiator`, typescript won't be able to combine different mixins,
   * because the `__differentiator` will be different
   */
  __differentiator?: keyof D | keyof C | keyof M
}
/**
 * `MergedHook` 是一个类型别名，用于表示合并后的钩子函数。

该类型别名接受一个泛型 `T`，默认为 `() => void`，表示钩子函数的类型。

`MergedHook` 可以是单个钩子函数或钩子函数数组，用于表示合并后的钩子函数。当多个钩子函数需要合并时，可以使用该类型别名。例如，可以将多个生命周期钩子函数合并为一个数组，以便在组件选项中统一处理。
 */
type MergedHook<T = () => void> = T | T[]
/**
 * `MergedComponentOptions` 是一个类型别名，用于表示合并后的组件选项。

它结合了 `ComponentOptions` 和 `MergedComponentOptionsOverride` 两个类型，实现了组件选项的合并。

`ComponentOptions` 是组件的基本选项类型，包含了组件的各种配置项，如 props、computed、methods、watch 等。

`MergedComponentOptionsOverride` 是一个额外的类型，用于表示对组件选项的覆盖或扩展。通过将两个类型合并，我们可以在组件定义中对组件选项进行自定义或修改，从而实现对组件行为的定制化。

综合起来，`MergedComponentOptions` 表示了经过合并处理后的组件选项类型，包含了基本选项和额外的定制化选项。
 */
export type MergedComponentOptions = ComponentOptions &
  MergedComponentOptionsOverride
/**
 * `MergedComponentOptionsOverride` 是一个类型，用于表示对组件选项的覆盖或扩展。

它包含了一系列的属性，每个属性对应着组件的生命周期钩子函数或其他的钩子函数。这些钩子函数可以是单个函数或函数数组，即 `MergedHook` 类型。

通过在 `MergedComponentOptionsOverride` 中定义这些钩子函数，我们可以对组件的生命周期进行定制化的操作。例如，在 `beforeCreate` 钩子中添加一些自定义的逻辑，在 `mounted` 钩子中执行一些额外的操作等。

注意，一些属性在注释中被标记为 `@deprecated`，表示它们已被废弃，推荐使用其他属性替代。这是为了向后兼容性和一致性考虑而保留的，建议尽量使用推荐的属性。

综上所述，`MergedComponentOptionsOverride` 提供了一种扩展和定制组件选项的方式，使开发人员能够根据需要对组件的行为进行修改和增强。
 */
export type MergedComponentOptionsOverride = {
  beforeCreate?: MergedHook
  created?: MergedHook
  beforeMount?: MergedHook
  mounted?: MergedHook
  beforeUpdate?: MergedHook
  updated?: MergedHook
  activated?: MergedHook
  deactivated?: MergedHook
  /** @deprecated use `beforeUnmount` instead */
  beforeDestroy?: MergedHook
  beforeUnmount?: MergedHook
  /** @deprecated use `unmounted` instead */
  destroyed?: MergedHook
  unmounted?: MergedHook
  renderTracked?: MergedHook<DebuggerHook>
  renderTriggered?: MergedHook<DebuggerHook>
  errorCaptured?: MergedHook<ErrorCapturedHook>
}
/**
 * `OptionTypesKeys` 是一个类型，用于表示组件选项的不同类型的键。

它包含了以下键值：
- `'P'`：表示组件选项中的 `Props` 类型的键。
- `'B'`：表示组件选项中的 `RawBindings` 类型的键。
- `'D'`：表示组件选项中的 `D` 类型的键。
- `'C'`：表示组件选项中的 `C` 类型的键。
- `'M'`：表示组件选项中的 `M` 类型的键。
- `'Defaults'`：表示组件选项中的 `Defaults` 类型的键。

通过使用 `OptionTypesKeys` 类型，我们可以在组件选项中根据需要选择和访问特定类型的键，以进行类型推导和操作。这有助于在开发过程中针对不同类型的选项进行类型安全的编程。

总结来说，`OptionTypesKeys` 提供了一种机制来识别和操作组件选项中不同类型的键，以支持类型安全的开发。
 */
export type OptionTypesKeys = 'P' | 'B' | 'D' | 'C' | 'M' | 'Defaults'

export type OptionTypesType<
  P = {},
  B = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Defaults = {}
> = {
  P: P
  B: B
  D: D
  C: C
  M: M
  Defaults: Defaults
}
/**
 * `OptionTypesType` 是一个类型，用于表示组件选项中不同类型的键对应的类型。

它接受以下泛型参数：
- `P`：表示组件选项中的 `Props` 类型。
- `B`：表示组件选项中的 `RawBindings` 类型。
- `D`：表示组件选项中的 `D` 类型。
- `C`：表示组件选项中的 `C` 类型。
- `M`：表示组件选项中的 `M` 类型。
- `Defaults`：表示组件选项中的 `Defaults` 类型。

该类型以键值对的形式定义了不同类型的键与对应的类型，其中键为字符串类型，包括 `'P'`、`'B'`、`'D'`、`'C'`、`'M'` 和 `'Defaults'`。值则分别对应于传入的泛型参数。

通过使用 `OptionTypesType` 类型，我们可以在组件选项中根据不同类型的键，获取对应的类型，并进行类型推导和操作。这有助于在开发过程中根据选项类型进行类型安全的编程。

总结来说，`OptionTypesType` 提供了一种将不同类型的键映射到其对应类型的机制，以支持类型安全的开发。
 */
const enum OptionTypes {
  PROPS = 'Props',
  DATA = 'Data',
  COMPUTED = 'Computed',
  METHODS = 'Methods',
  INJECT = 'Inject'
}
/**
 * 
 * @returns 
 * 这是一个用于创建重复检查器的函数 `createDuplicateChecker`。

该函数内部维护了一个 `cache` 对象，使用 `Object.create(null)` 创建一个空对象作为缓存。

函数返回一个回调函数，接受两个参数：
- `type`：表示选项的类型。
- `key`：表示选项的键名。

该回调函数的作用是检查给定的选项类型和键名是否已经在缓存中存在。如果存在重复的键名，则会输出警告信息。

首先，通过 `cache[key]` 来检查缓存中是否已存在该键名。如果存在，则通过 `warn` 函数输出警告信息，指示重复定义的选项类型和在哪个组件中定义的。

如果缓存中不存在该键名，则将该键名与对应的选项类型保存到缓存中，以便后续进行重复检查。

该重复检查器可以在组件选项的不同阶段使用，以确保相同类型的选项不会被重复定义。
 */
function createDuplicateChecker() {
  const cache = Object.create(null)
  return (type: OptionTypes, key: string) => {
    if (cache[key]) {
      warn(`${type} property "${key}" is already defined in ${cache[key]}.`)
    } else {
      cache[key] = type
    }
  }
}
/**
 * 这是一个变量 `shouldCacheAccess`，初始值为 `true`。

根据变量名来看，它可能用于控制是否缓存访问。在某些情况下，为了提高性能，可以缓存对某些属性或数据的访问结果，以避免重复计算或重复访问。

在上下文中，该变量被声明为 `export`，这意味着它可以在模块外部被引用和修改。

具体如何使用和修改该变量取决于代码的其他部分和上下文。可以在其他代码中通过导入该变量来访问和修改它。
 */
export let shouldCacheAccess = true
/**
 * 
 * @param instance 
 * 这是一个名为 `applyOptions` 的函数，用于应用组件选项。

函数的参数 `instance` 是一个组件内部实例对象。

函数的主要目的是根据组件实例的选项，对实例进行初始化和设置。具体的逻辑如下：

1. 通过调用 `resolveMergedOptions` 函数获取合并后的选项对象 `options`。
2. 获取实例的 `proxy` 属性，并将其赋值给 `publicThis` 变量。
3. 获取实例的 `ctx` 属性，并将其赋值给 `ctx` 变量。
4. 将 `shouldCacheAccess` 变量设置为 `false`，禁用在初始化状态期间对公共代理进行属性访问的缓存。
5. 如果存在 `beforeCreate` 钩子函数，通过调用 `callHook` 函数触发该钩子函数的执行。
6. 根据选项对象中的不同类型的选项进行相应的处理：
   - 处理状态相关的选项：`data`、`computed`、`methods`、`watch`、`provide`、`inject`。
   - 处理生命周期相关的选项：`created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`activated`、`deactivated`、`beforeDestroy`、`beforeUnmount`、`destroyed`、`unmounted`、`renderTracked`、`renderTriggered`、`errorCaptured`、`serverPrefetch`。
   - 处理公共 API 相关的选项：`expose`、`inheritAttrs`。
   - 处理资源相关的选项：`components`、`directives`、`filters`。
7. 根据 `__DEV__` 条件判断是否创建重复属性检查器，并在需要检查属性重复的情况下进行检查。
8. 对选项进行初始化的顺序（与 Vue 2 保持一致）：
   - 处理属性选项（已在函数外部处理）。
   - 处理注入选项。
   - 处理方法选项。
   - 处理数据选项。
   - 处理计算属性选项。
   - 处理观察选项。
9. 如果存在 `injectOptions`，通过调用 `resolveInjections` 函数解析注入的依赖。
10. 如果存在 `methods`，遍历处理每个方法，并将方法绑定到 `ctx` 上。
11. 如果存在 `dataOptions`，根据是否为函数类型进行处理，如果是函数类型，则调用该函数获取数据对象，并将数据对象转为响应式对象；如果不是函数类型，则发出警告提示。
12. 根据是否存在 `computedOptions`，遍历处理每个计算属性，并定义响应式的计算属性对象，并将其定义到 `ctx` 上。
13. 如果存在 `watchOptions`，遍历处理每个观察者，并创建观察者。
14. 如果存在 `provideOptions`，根据是否为函数类型进行处理，如果是函数类型，则调用该函数获取提供的数据对象；如果

不是函数类型，则直接使用该对象。
15. 如果存在 `created`，通过调用 `callHook` 函数触发 `created` 钩子函数的执行。
16. 根据不同的生命周期钩子类型，通过调用 `registerLifecycleHook` 函数注册相应的生命周期钩子函数。
17. 如果存在 `expose`，遍历处理每个要暴露的属性，并定义到 `instance.exposed` 对象上。
18. 如果存在 `render`，且实例的 `render` 属性为 `NOOP`（空函数），则将 `render` 赋值给 `instance.render`。
19. 如果存在 `inheritAttrs`，则将其赋值给 `instance.inheritAttrs`。
20. 如果存在 `components`，将其赋值给 `instance.components`。
21. 如果存在 `directives`，将其赋值给 `instance.directives`。
22. 如果 `__COMPAT__` 为真且存在 `filters`，且满足兼容性要求，则将其赋值给 `instance.filters`。

函数的作用是在组件实例化时根据选项进行相应的初始化和设置，包括状态、生命周期、公共 API 和资源等方面的处理。
 */
export function applyOptions(instance: ComponentInternalInstance) {
  const options = resolveMergedOptions(instance)
  const publicThis = instance.proxy! as any
  const ctx = instance.ctx

  // do not cache property access on public proxy during state initialization
  shouldCacheAccess = false

  // call beforeCreate first before accessing other options since
  // the hook may mutate resolved options (#2791)
  if (options.beforeCreate) {
    callHook(options.beforeCreate, instance, LifecycleHooks.BEFORE_CREATE)
  }

  const {
    // state
    data: dataOptions,
    computed: computedOptions,
    methods,
    watch: watchOptions,
    provide: provideOptions,
    inject: injectOptions,
    // lifecycle
    created,
    beforeMount,
    mounted,
    beforeUpdate,
    updated,
    activated,
    deactivated,
    beforeDestroy,
    beforeUnmount,
    destroyed,
    unmounted,
    render,
    renderTracked,
    renderTriggered,
    errorCaptured,
    serverPrefetch,
    // public API
    expose,
    inheritAttrs,
    // assets
    components,
    directives,
    filters
  } = options

  const checkDuplicateProperties = __DEV__ ? createDuplicateChecker() : null

  if (__DEV__) {
    const [propsOptions] = instance.propsOptions
    if (propsOptions) {
      for (const key in propsOptions) {
        checkDuplicateProperties!(OptionTypes.PROPS, key)
      }
    }
  }

  // options initialization order (to be consistent with Vue 2):
  // - props (already done outside of this function)
  // - inject
  // - methods
  // - data (deferred since it relies on `this` access)
  // - computed
  // - watch (deferred since it relies on `this` access)

  if (injectOptions) {
    resolveInjections(injectOptions, ctx, checkDuplicateProperties)
  }

  if (methods) {
    for (const key in methods) {
      const methodHandler = (methods as MethodOptions)[key]
      if (isFunction(methodHandler)) {
        // In dev mode, we use the `createRenderContext` function to define
        // methods to the proxy target, and those are read-only but
        // reconfigurable, so it needs to be redefined here
        if (__DEV__) {
          Object.defineProperty(ctx, key, {
            value: methodHandler.bind(publicThis),
            configurable: true,
            enumerable: true,
            writable: true
          })
        } else {
          ctx[key] = methodHandler.bind(publicThis)
        }
        if (__DEV__) {
          checkDuplicateProperties!(OptionTypes.METHODS, key)
        }
      } else if (__DEV__) {
        warn(
          `Method "${key}" has type "${typeof methodHandler}" in the component definition. ` +
            `Did you reference the function correctly?`
        )
      }
    }
  }

  if (dataOptions) {
    if (__DEV__ && !isFunction(dataOptions)) {
      warn(
        `The data option must be a function. ` +
          `Plain object usage is no longer supported.`
      )
    }
    const data = dataOptions.call(publicThis, publicThis)
    if (__DEV__ && isPromise(data)) {
      warn(
        `data() returned a Promise - note data() cannot be async; If you ` +
          `intend to perform data fetching before component renders, use ` +
          `async setup() + <Suspense>.`
      )
    }
    if (!isObject(data)) {
      __DEV__ && warn(`data() should return an object.`)
    } else {
      instance.data = reactive(data)
      if (__DEV__) {
        for (const key in data) {
          checkDuplicateProperties!(OptionTypes.DATA, key)
          // expose data on ctx during dev
          if (!isReservedPrefix(key[0])) {
            Object.defineProperty(ctx, key, {
              configurable: true,
              enumerable: true,
              get: () => data[key],
              set: NOOP
            })
          }
        }
      }
    }
  }

  // state initialization complete at this point - start caching access
  shouldCacheAccess = true

  if (computedOptions) {
    for (const key in computedOptions) {
      const opt = (computedOptions as ComputedOptions)[key]
      const get = isFunction(opt)
        ? opt.bind(publicThis, publicThis)
        : isFunction(opt.get)
        ? opt.get.bind(publicThis, publicThis)
        : NOOP
      if (__DEV__ && get === NOOP) {
        warn(`Computed property "${key}" has no getter.`)
      }
      const set =
        !isFunction(opt) && isFunction(opt.set)
          ? opt.set.bind(publicThis)
          : __DEV__
          ? () => {
              warn(
                `Write operation failed: computed property "${key}" is readonly.`
              )
            }
          : NOOP
      const c = computed({
        get,
        set
      })
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => c.value,
        set: v => (c.value = v)
      })
      if (__DEV__) {
        checkDuplicateProperties!(OptionTypes.COMPUTED, key)
      }
    }
  }

  if (watchOptions) {
    for (const key in watchOptions) {
      createWatcher(watchOptions[key], ctx, publicThis, key)
    }
  }

  if (provideOptions) {
    const provides = isFunction(provideOptions)
      ? provideOptions.call(publicThis)
      : provideOptions
    Reflect.ownKeys(provides).forEach(key => {
      provide(key, provides[key])
    })
  }

  if (created) {
    callHook(created, instance, LifecycleHooks.CREATED)
  }

  function registerLifecycleHook(
    register: Function,
    hook?: Function | Function[]
  ) {
    if (isArray(hook)) {
      hook.forEach(_hook => register(_hook.bind(publicThis)))
    } else if (hook) {
      register(hook.bind(publicThis))
    }
  }

  registerLifecycleHook(onBeforeMount, beforeMount)
  registerLifecycleHook(onMounted, mounted)
  registerLifecycleHook(onBeforeUpdate, beforeUpdate)
  registerLifecycleHook(onUpdated, updated)
  registerLifecycleHook(onActivated, activated)
  registerLifecycleHook(onDeactivated, deactivated)
  registerLifecycleHook(onErrorCaptured, errorCaptured)
  registerLifecycleHook(onRenderTracked, renderTracked)
  registerLifecycleHook(onRenderTriggered, renderTriggered)
  registerLifecycleHook(onBeforeUnmount, beforeUnmount)
  registerLifecycleHook(onUnmounted, unmounted)
  registerLifecycleHook(onServerPrefetch, serverPrefetch)

  if (__COMPAT__) {
    if (
      beforeDestroy &&
      softAssertCompatEnabled(DeprecationTypes.OPTIONS_BEFORE_DESTROY, instance)
    ) {
      registerLifecycleHook(onBeforeUnmount, beforeDestroy)
    }
    if (
      destroyed &&
      softAssertCompatEnabled(DeprecationTypes.OPTIONS_DESTROYED, instance)
    ) {
      registerLifecycleHook(onUnmounted, destroyed)
    }
  }

  if (isArray(expose)) {
    if (expose.length) {
      const exposed = instance.exposed || (instance.exposed = {})
      expose.forEach(key => {
        Object.defineProperty(exposed, key, {
          get: () => publicThis[key],
          set: val => (publicThis[key] = val)
        })
      })
    } else if (!instance.exposed) {
      instance.exposed = {}
    }
  }

  // options that are handled when creating the instance but also need to be
  // applied from mixins
  if (render && instance.render === NOOP) {
    instance.render = render as InternalRenderFunction
  }
  if (inheritAttrs != null) {
    instance.inheritAttrs = inheritAttrs
  }

  // asset options.
  if (components) instance.components = components as any
  if (directives) instance.directives = directives
  if (
    __COMPAT__ &&
    filters &&
    isCompatEnabled(DeprecationTypes.FILTERS, instance)
  ) {
    instance.filters = filters
  }
}
/**
 * 
 * @param injectOptions 
 * @param ctx 
 * @param checkDuplicateProperties
 * 这是一个名为 `resolveInjections` 的函数，用于解析组件的注入选项。

函数接受三个参数：
- `injectOptions`：注入选项对象。
- `ctx`：组件实例的上下文对象。
- `checkDuplicateProperties`：用于检查重复属性的函数，默认为 `NOOP`（空函数）。

函数的主要逻辑如下：

1. 如果 `injectOptions` 是数组类型，则通过调用 `normalizeInject` 函数对其进行标准化处理。
2. 遍历 `injectOptions` 对象的属性，对每个属性进行处理。
3. 根据属性值的类型进行不同的处理：
   - 如果属性值是对象类型，判断是否有 `default` 属性：
     - 如果有 `default` 属性，则通过调用 `inject` 函数进行注入，并将 `default` 属性值作为默认值传入，将函数类型的默认值视为工厂函数。
     - 如果没有 `default` 属性，则通过调用 `inject` 函数进行注入，并使用属性名作为注入的键名。
   - 如果属性值不是对象类型，则直接通过调用 `inject` 函数进行注入，使用属性值作为注入的键名。
4. 如果注入的值是一个引用类型（`Ref`），则通过 `Object.defineProperty` 定义属性的访问器，使得在访问该属性时返回引用的值。
5. 如果注入的值不是引用类型，则直接将其赋值给 `ctx` 对象的相应属性。
6. 如果是开发环境（`__DEV__` 为真），则调用 `checkDuplicateProperties` 函数检查是否存在重复属性。

该函数的作用是根据注入选项将相应的值注入到组件实例的上下文对象中，支持处理引用类型的注入，并在开发环境下检查是否存在重复属性。 
 */
export function resolveInjections(
  injectOptions: ComponentInjectOptions,
  ctx: any,
  checkDuplicateProperties = NOOP as any
) {
  if (isArray(injectOptions)) {
    injectOptions = normalizeInject(injectOptions)!
  }
  for (const key in injectOptions) {
    const opt = injectOptions[key]
    let injected: unknown
    if (isObject(opt)) {
      if ('default' in opt) {
        injected = inject(
          opt.from || key,
          opt.default,
          true /* treat default function as factory */
        )
      } else {
        injected = inject(opt.from || key)
      }
    } else {
      injected = inject(opt)
    }
    if (isRef(injected)) {
      // unwrap injected refs (ref #4196)
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => (injected as Ref).value,
        set: v => ((injected as Ref).value = v)
      })
    } else {
      ctx[key] = injected
    }
    if (__DEV__) {
      checkDuplicateProperties!(OptionTypes.INJECT, key)
    }
  }
}
/**
 * 
 * @param hook 
 * @param instance 
 * @param type 
 * 这是一个名为 `callHook` 的函数，用于调用组件生命周期钩子函数。

函数接受三个参数：
- `hook`：钩子函数或钩子函数数组。
- `instance`：组件实例对象。
- `type`：生命周期钩子类型。

函数的主要逻辑如下：

1. 判断 `hook` 是否为数组类型：
   - 如果是数组类型，则遍历数组中的每个钩子函数，并使用 `bind` 方法绑定到组件实例的代理对象上，返回一个新的数组。
   - 如果不是数组类型，则直接将钩子函数使用 `bind` 方法绑定到组件实例的代理对象上。
2. 调用 `callWithAsyncErrorHandling` 函数，将绑定后的钩子函数作为第一个参数传入。
3. 将组件实例对象和生命周期钩子类型作为参数传入 `callWithAsyncErrorHandling` 函数，以便在出现错误时进行异步错误处理。

该函数的作用是根据生命周期钩子类型调用相应的钩子函数，并将组件实例对象和钩子函数绑定到正确的上下文中，同时处理可能出现的异步错误。
 */
function callHook(
  hook: Function,
  instance: ComponentInternalInstance,
  type: LifecycleHooks
) {
  callWithAsyncErrorHandling(
    isArray(hook)
      ? hook.map(h => h.bind(instance.proxy!))
      : hook.bind(instance.proxy!),
    instance,
    type
  )
}
/**
 * 
 * @param raw 
 * @param ctx 
 * @param publicThis 
 * @param key 
 * 这是一个名为 `createWatcher` 的函数，用于创建组件的观察者（Watcher）。

函数接受四个参数：
- `raw`：观察者选项，可以是字符串、函数或对象。
- `ctx`：组件的数据对象。
- `publicThis`：组件的公共实例对象。
- `key`：要观察的属性键名。

函数的主要逻辑如下：

1. 根据 `key` 判断要观察的属性是否包含点号（.）：
   - 如果包含点号，则创建一个路径获取器函数 `createPathGetter`，用于从 `publicThis` 中获取深层嵌套的属性值。
   - 如果不包含点号，则创建一个获取器函数，用于直接从 `publicThis` 中获取属性值。
2. 根据 `raw` 的类型进行不同的处理：
   - 如果 `raw` 是字符串类型，则尝试从 `ctx` 中获取相应的处理函数 `handler`。如果 `handler` 是函数类型，则使用 `watch` 函数观察属性的变化，并将 `handler` 作为回调函数传入。
   - 如果 `raw` 是函数类型，则直接使用 `watch` 函数观察属性的变化，并将 `raw` 函数绑定到 `publicThis` 上下文。
   - 如果 `raw` 是对象类型：
     - 如果 `raw` 是数组类型，则遍历数组中的每个元素，递归调用 `createWatcher` 函数进行处理。
     - 如果 `raw` 是对象类型，则尝试从 `ctx` 中获取相应的处理函数 `handler`。如果 `handler` 是函数类型，则使用 `watch` 函数观察属性的变化，并将 `handler` 和 `raw` 作为参数传入。
3. 如果 `raw` 的类型不属于上述情况，则在开发环境下发出警告。

该函数的作用是根据观察者选项创建组件的观察者，通过监听指定属性的变化来执行相应的处理函数。它支持处理函数的绑定和处理函数的嵌套观察。在处理过程中，会根据不同的情况进行类型判断和错误处理。
 */
export function createWatcher(
  raw: ComponentWatchOptionItem,
  ctx: Data,
  publicThis: ComponentPublicInstance,
  key: string
) {
  const getter = key.includes('.')
    ? createPathGetter(publicThis, key)
    : () => (publicThis as any)[key]
  if (isString(raw)) {
    const handler = ctx[raw]
    if (isFunction(handler)) {
      watch(getter, handler as WatchCallback)
    } else if (__DEV__) {
      warn(`Invalid watch handler specified by key "${raw}"`, handler)
    }
  } else if (isFunction(raw)) {
    watch(getter, raw.bind(publicThis))
  } else if (isObject(raw)) {
    if (isArray(raw)) {
      raw.forEach(r => createWatcher(r, ctx, publicThis, key))
    } else {
      const handler = isFunction(raw.handler)
        ? raw.handler.bind(publicThis)
        : (ctx[raw.handler] as WatchCallback)
      if (isFunction(handler)) {
        watch(getter, handler, raw)
      } else if (__DEV__) {
        warn(`Invalid watch handler specified by key "${raw.handler}"`, handler)
      }
    }
  } else if (__DEV__) {
    warn(`Invalid watch option: "${key}"`, raw)
  }
}

/**
 * Resolve merged options and cache it on the component.
 * This is done only once per-component since the merging does not involve
 * instances.
 * 这是一个名为 `resolveMergedOptions` 的函数，用于解析组件的合并选项。

函数接受一个参数 `instance`，表示组件的内部实例。

函数的主要逻辑如下：

1. 获取组件的基本选项 `base`，这是组件的类型。
2. 从应用程序上下文中获取全局混入选项 `globalMixins`、选项缓存对象 `cache` 和选项合并策略 `optionMergeStrategies`。
3. 检查缓存中是否存在组件的解析结果，如果存在，则直接使用缓存中的解析结果。
4. 如果全局混入选项、组件的混入选项和继承选项都不存在，则将 `base` 视为已经是合并后的选项，直接使用。
5. 否则，创建一个空的 `resolved` 对象作为最终解析的合并选项。
6. 如果存在全局混入选项，则遍历全局混入选项，并使用 `mergeOptions` 函数将每个混入选项合并到 `resolved` 中。
7. 使用 `mergeOptions` 函数将组件的基本选项 `base` 合并到 `resolved` 中。
8. 如果 `base` 是对象类型，则将解析结果 `resolved` 缓存起来，以便下次使用。
9. 返回最终的解析结果 `resolved`。

该函数的作用是解析组件的合并选项，将全局混入选项、组件的混入选项和基本选项进行合并，得到最终的组件选项。在合并过程中，会使用选项合并策略来处理冲突。解析结果可以被缓存，以提高性能。
 */
export function resolveMergedOptions(
  instance: ComponentInternalInstance
): MergedComponentOptions {
  const base = instance.type as ComponentOptions
  const { mixins, extends: extendsOptions } = base
  const {
    mixins: globalMixins,
    optionsCache: cache,
    config: { optionMergeStrategies }
  } = instance.appContext
  const cached = cache.get(base)

  let resolved: MergedComponentOptions

  if (cached) {
    resolved = cached
  } else if (!globalMixins.length && !mixins && !extendsOptions) {
    if (
      __COMPAT__ &&
      isCompatEnabled(DeprecationTypes.PRIVATE_APIS, instance)
    ) {
      resolved = extend({}, base) as MergedComponentOptions
      resolved.parent = instance.parent && instance.parent.proxy
      resolved.propsData = instance.vnode.props
    } else {
      resolved = base as MergedComponentOptions
    }
  } else {
    resolved = {}
    if (globalMixins.length) {
      globalMixins.forEach(m =>
        mergeOptions(resolved, m, optionMergeStrategies, true)
      )
    }
    mergeOptions(resolved, base, optionMergeStrategies)
  }
  if (isObject(base)) {
    cache.set(base, resolved)
  }
  return resolved
}
/**
 * 
 * @param to 
 * @param from 
 * @param strats 
 * @param asMixin 
 * @returns 
 * 这是一个名为 `mergeOptions` 的函数，用于合并选项对象。

函数接受以下参数：

- `to`：目标选项对象，合并后的选项将被写入到该对象中。
- `from`：源选项对象，需要合并的选项将从该对象中获取。
- `strats`：选项合并策略，一个记录了选项合并函数的对象。
- `asMixin`：一个布尔值，表示是否将源选项视为混入选项。

函数的主要逻辑如下：

1. 如果 `from` 是一个函数，且兼容模式开启且 `from` 是一个组件的构造函数，则将 `from` 重新赋值为 `from.options`，以获取该组件的选项对象。
2. 从 `from` 中获取混入选项 `mixins` 和继承选项 `extendsOptions`。
3. 如果存在继承选项，则递归调用 `mergeOptions` 函数将继承选项合并到目标选项 `to` 中。
4. 如果存在混入选项，则遍历混入选项数组，递归调用 `mergeOptions` 函数将每个混入选项合并到目标选项 `to` 中。
5. 遍历 `from` 对象的每个属性：
   - 如果 `asMixin` 为 `true`，且当前属性名为 `'expose'`，则发出警告，说明在混入选项或继承选项中声明的 `'expose'` 选项会被忽略，应该只在组件本身中声明。
   - 否则，获取当前属性的合并策略函数 `strat`，如果不存在则使用默认的合并策略函数。
   - 使用合并策略函数 `strat` 将 `to` 对象的当前属性值和 `from` 对象的当前属性值进行合并，并将结果写入到 `to` 对象中。
6. 返回合并后的目标选项 `to`。

该函数的作用是将源选项对象中的选项合并到目标选项对象中，采用递归合并的方式，同时根据选项合并策略处理冲突。函数还支持将源选项对象视为混入选项进行合并，且在特定情况下会发出警告。
 */
export function mergeOptions(
  to: any,
  from: any,
  strats: Record<string, OptionMergeFunction>,
  asMixin = false
) {
  if (__COMPAT__ && isFunction(from)) {
    from = from.options
  }

  const { mixins, extends: extendsOptions } = from

  if (extendsOptions) {
    mergeOptions(to, extendsOptions, strats, true)
  }
  if (mixins) {
    mixins.forEach((m: ComponentOptionsMixin) =>
      mergeOptions(to, m, strats, true)
    )
  }

  for (const key in from) {
    if (asMixin && key === 'expose') {
      __DEV__ &&
        warn(
          `"expose" option is ignored when declared in mixins or extends. ` +
            `It should only be declared in the base component itself.`
        )
    } else {
      const strat = internalOptionMergeStrats[key] || (strats && strats[key])
      to[key] = strat ? strat(to[key], from[key]) : from[key]
    }
  }
  return to
}
/**
 * 这是一个名为 `internalOptionMergeStrats` 的对象，记录了不同选项的合并策略函数。

该对象包含了一些选项的合并策略函数，用于在合并选项时处理不同类型的选项。具体的合并策略函数如下：

- `data`、`props` 和 `emits`：使用 `mergeDataFn` 或 `mergeEmitsOrPropsOptions` 进行合并。
- `methods` 和 `computed`：使用 `mergeObjectOptions` 进行合并。
- 生命周期钩子函数（如 `beforeCreate`、`created` 等）：使用 `mergeAsArray` 进行合并，将多个钩子函数合并为一个数组。
- 资源选项（如 `components` 和 `directives`）：使用 `mergeObjectOptions` 进行合并。
- `watch`：使用 `mergeWatchOptions` 进行合并。
- `provide`：使用 `mergeDataFn` 进行合并。
- `inject`：使用 `mergeInject` 进行合并。

这些合并策略函数在合并选项时会根据不同的选项类型执行相应的合并逻辑，以确保选项能够正确地合并到目标选项中。
 */
export const internalOptionMergeStrats: Record<string, Function> = {
  data: mergeDataFn,
  props: mergeEmitsOrPropsOptions,
  emits: mergeEmitsOrPropsOptions,
  // objects
  methods: mergeObjectOptions,
  computed: mergeObjectOptions,
  // lifecycle
  beforeCreate: mergeAsArray,
  created: mergeAsArray,
  beforeMount: mergeAsArray,
  mounted: mergeAsArray,
  beforeUpdate: mergeAsArray,
  updated: mergeAsArray,
  beforeDestroy: mergeAsArray,
  beforeUnmount: mergeAsArray,
  destroyed: mergeAsArray,
  unmounted: mergeAsArray,
  activated: mergeAsArray,
  deactivated: mergeAsArray,
  errorCaptured: mergeAsArray,
  serverPrefetch: mergeAsArray,
  // assets
  components: mergeObjectOptions,
  directives: mergeObjectOptions,
  // watch
  watch: mergeWatchOptions,
  // provide / inject
  provide: mergeDataFn,
  inject: mergeInject
}
/**
 * 如果 `__COMPAT__` 为真（true），则会将 `filters` 选项的合并策略函数设置为 `mergeObjectOptions`。

这段代码的作用是在兼容模式下扩展了 `internalOptionMergeStrats` 对象，添加了一个名为 `filters` 的选项，并使用 `mergeObjectOptions` 作为其合并策略函数。这样，在合并选项时就会使用 `mergeObjectOptions` 来处理 `filters` 选项的合并逻辑。
 */
if (__COMPAT__) {
  internalOptionMergeStrats.filters = mergeObjectOptions
}
/**
 * 
 * @param to 
 * @param from 
 * @returns 
 * `mergeDataFn` 函数用于合并 `data` 选项的值。

函数接受两个参数 `to` 和 `from`，分别表示目标值和源值。函数的逻辑如下：

- 如果 `from` 不存在，则直接返回 `to`。
- 如果 `to` 不存在，则直接返回 `from`。
- 否则，返回一个合并后的函数 `mergedDataFn`。

`mergedDataFn` 函数是一个闭包函数，内部定义了一个逻辑判断。如果处于兼容模式且启用了 `OPTIONS_DATA_MERGE` 的兼容选项，则使用 `deepMergeData` 函数进行深度合并，否则使用 `extend` 函数进行浅合并。

最后，`mergedDataFn` 函数在执行时会根据 `to` 和 `from` 的类型，分别调用它们作为函数并传入当前组件实例 `this`，获取最终的合并结果。

总结起来，`mergeDataFn` 函数用于处理 `data` 选项的合并逻辑，根据兼容模式和选项设置的不同，可以选择使用深度合并或浅合并来合并 `data` 的值。
 */
function mergeDataFn(to: any, from: any) {
  if (!from) {
    return to
  }
  if (!to) {
    return from
  }
  return function mergedDataFn(this: ComponentPublicInstance) {
    return (
      __COMPAT__ && isCompatEnabled(DeprecationTypes.OPTIONS_DATA_MERGE, null)
        ? deepMergeData
        : extend
    )(
      isFunction(to) ? to.call(this, this) : to,
      isFunction(from) ? from.call(this, this) : from
    )
  }
}
/**
 * 
 * @param to 
 * @param from 
 * @returns 
 * `mergeInject` 函数用于合并 `inject` 选项的值。

函数接受两个参数 `to` 和 `from`，分别表示目标值和源值。函数的逻辑如下：

首先，通过调用 `normalizeInject` 函数对 `to` 和 `from` 进行规范化处理，确保它们都是符合规范的 `inject` 选项对象。

然后，调用 `mergeObjectOptions` 函数来合并规范化后的 `to` 和 `from` 对象。`mergeObjectOptions` 函数是一个通用的对象合并函数，用于合并对象的各个属性。

最后，将合并后的结果返回。

总结起来，`mergeInject` 函数用于处理 `inject` 选项的合并逻辑，将目标值和源值进行规范化处理后，通过 `mergeObjectOptions` 函数进行合并，并返回合并后的结果。
 */
function mergeInject(
  to: ComponentInjectOptions | undefined,
  from: ComponentInjectOptions
) {
  return mergeObjectOptions(normalizeInject(to), normalizeInject(from))
}
/**
 * 
 * @param raw 
 * @returns 
 * `normalizeInject` 函数用于规范化 `inject` 选项的值。

函数接受一个参数 `raw`，表示待规范化的 `inject` 选项值。

函数的逻辑如下：

首先，检查 `raw` 是否为数组类型，如果是，则表示 `inject` 选项值为数组形式。在这种情况下，函数会创建一个空对象 `res`，然后遍历数组 `raw`，将每个数组元素作为属性名和属性值添加到 `res` 对象中，即 `res[raw[i]] = raw[i]`。

如果 `raw` 不是数组类型，则直接返回 `raw`，表示 `inject` 选项值已经符合规范，无需进行进一步处理。

最后，函数返回规范化后的结果。

总结起来，`normalizeInject` 函数用于将 `inject` 选项的值规范化，确保它符合规范的对象格式。如果 `raw` 是数组类型，则将其转换为对象形式，以数组元素作为属性名和属性值；如果 `raw` 不是数组类型，则直接返回 `raw`。
 */
function normalizeInject(
  raw: ComponentInjectOptions | undefined
): ObjectInjectOptions | undefined {
  if (isArray(raw)) {
    const res: ObjectInjectOptions = {}
    for (let i = 0; i < raw.length; i++) {
      res[raw[i]] = raw[i]
    }
    return res
  }
  return raw
}
/**
 * 
 * @param to 
 * @param from 
 * @returns 
 * `mergeAsArray` 函数用于将两个值合并为数组形式。

函数接受两个参数 `to` 和 `from`，分别表示目标值和来源值。

函数的逻辑如下：

首先，检查目标值 `to` 是否存在。如果存在，将其转换为数组形式，使用 `concat` 方法将来源值 `from` 与目标值 `to` 进行合并，并使用 `new Set` 去重。最后，将合并后的数组返回。

如果目标值 `to` 不存在，则直接返回来源值 `from`。

总结起来，`mergeAsArray` 函数用于将目标值和来源值合并为数组形式，并去重。如果目标值存在，则将目标值和来源值合并为一个新数组并去重；如果目标值不存在，则直接返回来源值。
 */
function mergeAsArray<T = Function>(to: T[] | T | undefined, from: T | T[]) {
  return to ? [...new Set([].concat(to as any, from as any))] : from
}
/**
 * 
 * @param to 
 * @param from 
 * @returns 
 * `mergeObjectOptions` 函数用于将两个对象进行合并。

函数接受两个参数 `to` 和 `from`，分别表示目标对象和来源对象。

函数的逻辑如下：

首先，检查目标对象 `to` 是否存在。如果存在，创建一个新的空对象 `Object.create(null)`，然后使用 `extend` 函数将目标对象 `to` 和来源对象 `from` 的属性合并到新对象中。这样可以确保新对象是一个干净的、没有原型链的纯粹对象。

如果目标对象 `to` 不存在，则直接返回来源对象 `from`。

总结起来，`mergeObjectOptions` 函数用于将目标对象和来源对象进行合并，生成一个新的对象。如果目标对象存在，则将目标对象和来源对象的属性合并到新对象中；如果目标对象不存在，则直接返回来源对象。
 */
function mergeObjectOptions(to: Object | undefined, from: Object | undefined) {
  return to ? extend(Object.create(null), to, from) : from
}
/**
 * 
 * @param to 
 * @param from
 * `mergeEmitsOrPropsOptions` 函数用于合并 emits 或 props 选项。

函数有多个重载形式，根据参数的类型进行不同的处理。

第一个重载形式处理 `EmitsOptions` 类型的参数，用于合并 emits 选项。
第二个重载形式处理 `ComponentPropsOptions` 类型的参数，用于合并 props 选项。
第三个重载形式处理既包含 `ComponentPropsOptions` 又包含 `EmitsOptions` 类型的参数，用于合并 props 和 emits 选项。

函数的逻辑如下：

首先，检查目标对象 `to` 是否存在。如果存在，则进行以下判断：

- 如果 `to` 和 `from` 都是数组类型（针对 emits 选项），则将两个数组进行合并，并通过 `Set` 和数组展开运算符去重。
- 否则，创建一个新的空对象 `Object.create(null)`，然后使用 `normalizePropsOrEmits` 函数对目标对象 `to` 和来源对象 `from` 进行规范化处理，将它们的属性合并到新对象中。

如果目标对象 `to` 不存在，则直接返回来源对象 `from`。

最后，返回合并后的对象作为结果。

总结起来，`mergeEmitsOrPropsOptions` 函数用于合并 emits 或 props 选项。根据不同的参数类型，进行不同的处理，包括数组合并、去重和对象属性合并。最终返回合并后的结果。 
 */
function mergeEmitsOrPropsOptions(
  to: EmitsOptions | undefined,
  from: EmitsOptions | undefined
): EmitsOptions | undefined
function mergeEmitsOrPropsOptions(
  to: ComponentPropsOptions | undefined,
  from: ComponentPropsOptions | undefined
): ComponentPropsOptions | undefined
function mergeEmitsOrPropsOptions(
  to: ComponentPropsOptions | EmitsOptions | undefined,
  from: ComponentPropsOptions | EmitsOptions | undefined
) {
  if (to) {
    if (isArray(to) && isArray(from)) {
      return [...new Set([...to, ...from])]
    }
    return extend(
      Object.create(null),
      normalizePropsOrEmits(to),
      normalizePropsOrEmits(from ?? {})
    )
  } else {
    return from
  }
}
/**
 * 
 * @param to 
 * @param from 
 * @returns 
 * `mergeWatchOptions` 函数用于合并 watch 选项。

函数接受两个参数 `to` 和 `from`，分别表示目标对象和来源对象的 watch 选项。

函数的逻辑如下：

首先，检查目标对象 `to` 是否存在，如果不存在，则直接返回来源对象 `from`。

然后，检查来源对象 `from` 是否存在，如果不存在，则直接返回目标对象 `to`。

接下来，创建一个空对象 `merged`，通过 `Object.create(null)` 创建一个没有原型链的纯净对象，并将目标对象 `to` 的属性浅拷贝到 `merged` 中。

然后，遍历来源对象 `from` 的属性，并将每个属性的值合并为数组，使用 `mergeAsArray` 函数进行合并。将合并后的数组赋值给 `merged` 对应的属性。

最后，返回合并后的对象 `merged` 作为结果。

总结起来，`mergeWatchOptions` 函数用于合并 watch 选项。通过浅拷贝目标对象的属性，并将来源对象的属性合并为数组，最终返回合并后的结果对象。
 */
function mergeWatchOptions(
  to: ComponentWatchOptions | undefined,
  from: ComponentWatchOptions | undefined
) {
  if (!to) return from
  if (!from) return to
  const merged = extend(Object.create(null), to)
  for (const key in from) {
    merged[key] = mergeAsArray(to[key], from[key])
  }
  return merged
}
