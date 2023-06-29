import {
  ComputedOptions,
  MethodOptions,
  ComponentOptionsWithoutProps,
  ComponentOptionsWithArrayProps,
  ComponentOptionsWithObjectProps,
  ComponentOptionsMixin,
  RenderFunction,
  ComponentOptionsBase,
  ComponentInjectOptions,
  ComponentOptions
} from './componentOptions'
import {
  SetupContext,
  AllowedComponentProps,
  ComponentCustomProps
} from './component'
import {
  ExtractPropTypes,
  ComponentPropsOptions,
  ExtractDefaultPropTypes,
  ComponentObjectPropsOptions
} from './componentProps'
import { EmitsOptions, EmitsToProps } from './componentEmits'
import { extend, isFunction } from '@vue/shared'
import { VNodeProps } from './vnode'
import {
  CreateComponentPublicInstance,
  ComponentPublicInstanceConstructor
} from './componentPublicInstance'
import { SlotsType } from './componentSlots'
/**
 * 这段代码定义了一个类型别名 `PublicProps`，它表示公共属性（Public Props）的类型。

`PublicProps` 类型是由三个类型的并集组成：

1. `VNodeProps`: 表示虚拟节点（VNode）的属性。这包括一些常见的属性，如`key`、`ref`、`class`、`style` 等。

2. `AllowedComponentProps`: 表示组件的允许属性。这是一个广义的类型，允许组件定义和接受特定的属性。

3. `ComponentCustomProps`: 表示组件自定义的属性。这包括组件在声明中定义的所有属性。

通过将这三个类型合并在一起，`PublicProps` 表示了组件的公共属性集合，这些属性可以在组件的使用中进行传递和访问。
 */
export type PublicProps = VNodeProps &
  AllowedComponentProps &
  ComponentCustomProps
/**
 * 这段代码定义了一个类型别名 `ResolveProps`，它表示解析属性（Resolved Props）的类型。

`ResolveProps` 类型接受两个泛型参数：
- `PropsOrPropOptions`：表示属性或属性选项的类型。
- `E extends EmitsOptions`：表示 `EmitsOptions` 类型的子类型，用于指定组件的事件选项。

`ResolveProps` 类型通过条件类型进行定义，它基于 `PropsOrPropOptions` 的类型进行解析，并结合 `EmitsOptions` 类型来生成最终的属性类型。

具体来说，`ResolveProps` 类型由以下部分组成：
1. 如果 `PropsOrPropOptions` 是 `ComponentPropsOptions` 类型（即组件的属性选项），则使用 `ExtractPropTypes<PropsOrPropOptions>` 提取该属性选项的属性定义，得到一个只读的属性对象类型。
2. 如果 `PropsOrPropOptions` 不是 `ComponentPropsOptions` 类型，直接使用 `PropsOrPropOptions` 作为属性类型。
3. 最后，通过与条件类型 `{} extends E` 进行比较，将 `EmitsToProps<E>`（表示根据事件选项生成的事件对象类型）与上述属性类型进行合并。

最终，`ResolveProps` 表示解析后的属性类型，它包含了组件的属性定义和根据事件选项生成的事件对象类型。
 */
type ResolveProps<PropsOrPropOptions, E extends EmitsOptions> = Readonly<
  PropsOrPropOptions extends ComponentPropsOptions
    ? ExtractPropTypes<PropsOrPropOptions>
    : PropsOrPropOptions
> &
  ({} extends E ? {} : EmitsToProps<E>)
/**
 * 这段代码定义了一个类型别名 `DefineComponent`，它表示组件的类型定义。

`DefineComponent` 类型接受多个泛型参数，用于指定组件的属性、绑定、数据、计算属性、方法、混入、扩展、事件、插槽等相关选项。

具体来说，`DefineComponent` 类型由以下部分组成：
1. `PropsOrPropOptions`：表示组件的属性或属性选项的类型，默认为空对象 `{}`。
2. `RawBindings`：表示组件的原始绑定的类型，默认为空对象 `{}`。
3. `D`：表示组件的数据类型，默认为空对象 `{}`。
4. `C extends ComputedOptions`：表示组件的计算属性选项的类型，默认为 `ComputedOptions` 类型。
5. `M extends MethodOptions`：表示组件的方法选项的类型，默认为 `MethodOptions` 类型。
6. `Mixin extends ComponentOptionsMixin`：表示组件的混入选项的类型，默认为 `ComponentOptionsMixin` 类型。
7. `Extends extends ComponentOptionsMixin`：表示组件的扩展选项的类型，默认为 `ComponentOptionsMixin` 类型。
8. `E extends EmitsOptions`：表示组件的事件选项的类型，默认为空对象 `{}`。
9. `EE extends string`：表示事件名的类型，默认为字符串类型。
10. `PP`：表示公共属性的类型，默认为 `PublicProps` 类型。
11. `Props`：表示解析后的属性类型，使用 `ResolveProps<PropsOrPropOptions, E>` 进行解析。
12. `Defaults`：表示属性的默认值类型，使用 `ExtractDefaultPropTypes<PropsOrPropOptions>` 提取属性选项的默认值类型。
13. `S extends SlotsType`：表示插槽的类型，默认为 `SlotsType` 类型。

最终，`DefineComponent` 表示一个组件的类型定义，它包含了组件实例构造函数、组件选项等相关信息。它继承了 `ComponentPublicInstanceConstructor` 和 `ComponentOptionsBase`，并合并了 `PP`（公共属性）类型。
 */
export type DefineComponent<
  PropsOrPropOptions = {},
  RawBindings = {},
  D = {},
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions,
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  EE extends string = string,
  PP = PublicProps,
  Props = ResolveProps<PropsOrPropOptions, E>,
  Defaults = ExtractDefaultPropTypes<PropsOrPropOptions>,
  S extends SlotsType = {}
> = ComponentPublicInstanceConstructor<
  CreateComponentPublicInstance<
    Props,
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends,
    E,
    PP & Props,
    Defaults,
    true,
    {},
    S
  > &
    Props
> &
  ComponentOptionsBase<
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
    {},
    string,
    S
  > &
  PP

// defineComponent is a utility that is primarily used for type inference
// when declaring components. Type inference is provided in the component
// options (provided as the argument). The returned value has artificial types
// for TSX / manual render function / IDE support.

// overload 1: direct setup function
// (uses user defined props interface)
/**
 * 
 * @param setup 
 * @param options
 * 这段代码定义了一个函数 `defineComponent`，用于定义组件。

`defineComponent` 函数有多个重载形式，根据不同的参数类型可以生成不同类型的组件。

在第一个重载形式中，参数 `setup` 是一个函数，接受 `props` 和 `ctx` 作为参数，并返回一个 `RenderFunction` 或 `Promise<RenderFunction>`。参数 `options` 是一个对象，可以包含组件选项的一些配置，如 `name`、`inheritAttrs`、`props` 和 `emits` 等。返回值是一个函数，接受 `props` 和 `EmitsToProps<E>` 并返回任意类型。

在第二个重载形式中，参数 `options` 是一个组件选项对象，用于描述组件的各种选项配置。返回值是一个 `DefineComponent` 类型，表示组件的类型定义。

第三个和第四个重载形式类似，都是使用不同的组件选项对象来描述组件的配置，并返回相应的 `DefineComponent` 类型。

最后，函数 `defineComponent` 的实现部分是一个几乎无操作的实现，根据传入的参数类型来返回相应的结果。如果参数是一个函数，则将其包装在一个纯函数内，并通过 `extend` 方法将 `name` 和 `setup` 选项合并到额外的选项对象中。如果参数是一个对象，则直接返回该对象。

总之，`defineComponent` 函数是用于定义组件的工具函数，根据不同的参数类型来生成不同类型的组件。 
 */
export function defineComponent<
  Props extends Record<string, any>,
  E extends EmitsOptions = {},
  EE extends string = string,
  S extends SlotsType = {}
>(
  setup: (
    props: Props,
    ctx: SetupContext<E, S>
  ) => RenderFunction | Promise<RenderFunction>,
  options?: Pick<ComponentOptions, 'name' | 'inheritAttrs'> & {
    props?: (keyof Props)[]
    emits?: E | EE[]
    slots?: S
  }
): (props: Props & EmitsToProps<E>) => any
export function defineComponent<
  Props extends Record<string, any>,
  E extends EmitsOptions = {},
  EE extends string = string,
  S extends SlotsType = {}
>(
  setup: (
    props: Props,
    ctx: SetupContext<E, S>
  ) => RenderFunction | Promise<RenderFunction>,
  options?: Pick<ComponentOptions, 'name' | 'inheritAttrs'> & {
    props?: ComponentObjectPropsOptions<Props>
    emits?: E | EE[]
    slots?: S
  }
): (props: Props & EmitsToProps<E>) => any

// overload 2: object format with no props
// (uses user defined props interface)
// return type is for Vetur and TSX support
export function defineComponent<
  Props = {},
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  EE extends string = string,
  S extends SlotsType = {},
  I extends ComponentInjectOptions = {},
  II extends string = string
>(
  options: ComponentOptionsWithoutProps<
    Props,
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends,
    E,
    EE,
    I,
    II,
    S
  >
): DefineComponent<
  Props,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  EE,
  PublicProps,
  ResolveProps<Props, E>,
  ExtractDefaultPropTypes<Props>,
  S
>

// overload 3: object format with array props declaration
// props inferred as { [key in PropNames]?: any }
// return type is for Vetur and TSX support
export function defineComponent<
  PropNames extends string,
  RawBindings,
  D,
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  EE extends string = string,
  S extends SlotsType = {},
  I extends ComponentInjectOptions = {},
  II extends string = string,
  Props = Readonly<{ [key in PropNames]?: any }>
>(
  options: ComponentOptionsWithArrayProps<
    PropNames,
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends,
    E,
    EE,
    I,
    II,
    S
  >
): DefineComponent<
  Props,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  EE,
  PublicProps,
  ResolveProps<Props, E>,
  ExtractDefaultPropTypes<Props>,
  S
>

// overload 4: object format with object props declaration
// see `ExtractPropTypes` in ./componentProps.ts
export function defineComponent<
  // the Readonly constraint allows TS to treat the type of { required: true }
  // as constant instead of boolean.
  PropsOptions extends Readonly<ComponentPropsOptions>,
  RawBindings,
  D,
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  EE extends string = string,
  S extends SlotsType = {},
  I extends ComponentInjectOptions = {},
  II extends string = string
>(
  options: ComponentOptionsWithObjectProps<
    PropsOptions,
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends,
    E,
    EE,
    I,
    II,
    S
  >
): DefineComponent<
  PropsOptions,
  RawBindings,
  D,
  C,
  M,
  Mixin,
  Extends,
  E,
  EE,
  PublicProps,
  ResolveProps<PropsOptions, E>,
  ExtractDefaultPropTypes<PropsOptions>,
  S
>

// implementation, close to no-op
export function defineComponent(
  options: unknown,
  extraOptions?: ComponentOptions
) {
  return isFunction(options)
    ? // #8326: extend call and options.name access are considered side-effects
      // by Rollup, so we have to wrap it in a pure-annotated IIFE.
      /*#__PURE__*/ (() =>
        extend({ name: options.name }, extraOptions, { setup: options }))()
    : options
}
