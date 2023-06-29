import {
  ComponentInternalInstance,
  Data,
  getExposeProxy,
  isStatefulComponent
} from './component'
import { nextTick, queueJob } from './scheduler'
import { instanceWatch, WatchOptions, WatchStopHandle } from './apiWatch'
import {
  EMPTY_OBJ,
  hasOwn,
  isGloballyAllowed,
  NOOP,
  extend,
  isString,
  isFunction,
  UnionToIntersection,
  Prettify
} from '@vue/shared'
import {
  toRaw,
  shallowReadonly,
  track,
  TrackOpTypes,
  ShallowUnwrapRef,
  UnwrapNestedRefs
} from '@vue/reactivity'
import {
  ExtractComputedReturns,
  ComponentOptionsBase,
  ComputedOptions,
  MethodOptions,
  ComponentOptionsMixin,
  OptionTypesType,
  OptionTypesKeys,
  resolveMergedOptions,
  shouldCacheAccess,
  MergedComponentOptionsOverride,
  InjectToObject,
  ComponentInjectOptions
} from './componentOptions'
import { EmitsOptions, EmitFn } from './componentEmits'
import { SlotsType, UnwrapSlotsType } from './componentSlots'
import { markAttrsAccessed } from './componentRenderUtils'
import { currentRenderingInstance } from './componentRenderContext'
import { warn } from './warning'
import { installCompatInstanceProperties } from './compat/instance'

/**
 * Custom properties added to component instances in any way and can be accessed through `this`
 *
 * @example
 * Here is an example of adding a property `$router` to every component instance:
 * ```ts
 * import { createApp } from 'vue'
 * import { Router, createRouter } from 'vue-router'
 *
 * declare module '@vue/runtime-core' {
 *   interface ComponentCustomProperties {
 *     $router: Router
 *   }
 * }
 *
 * // effectively adding the router to every component instance
 * const app = createApp({})
 * const router = createRouter()
 * app.config.globalProperties.$router = router
 *
 * const vm = app.mount('#app')
 * // we can access the router from the instance
 * vm.$router.push('/')
 * ```
 * `ComponentCustomProperties` 是一个接口，用于扩展 Vue 组件实例的自定义属性。

在 Vue.js 中，可以通过在组件实例上定义自定义属性来扩展组件的功能。这些自定义属性可以是任意类型的值，例如方法、对象、原始值等。

`ComponentCustomProperties` 接口提供了一个空的定义，允许你在项目中根据需要扩展组件实例的属性。通过声明一个新的接口，并让它扩展 `ComponentCustomProperties`，你可以定义自己的自定义属性，以便在组件实例中使用。

例如，假设你想要在组件实例上添加一个名为 `customProperty` 的自定义属性，你可以创建一个新的接口并扩展 `ComponentCustomProperties`：

```typescript
interface MyComponentCustomProperties extends ComponentCustomProperties {
  customProperty: string;
}
```

然后，在组件中使用该自定义属性：

```typescript
export default {
  mounted() {
    console.log(this.customProperty);
  },
} as ComponentOptions<MyComponentCustomProperties>;
```

这样，你就可以在组件实例中访问和使用 `customProperty` 自定义属性了。
 */
export interface ComponentCustomProperties {}
/**
 * `IsDefaultMixinComponent<T>` 是一个类型谓词，用于检查给定类型 `T` 是否是默认的混入组件选项。

在 Vue.js 中，混入 (mixin) 是一种重用组件选项的机制。通过混入，我们可以将一组选项合并到多个组件中，以实现代码的重用和组合。

`IsDefaultMixinComponent<T>` 的类型谓词逻辑如下：

- 如果类型 `T` 是 `ComponentOptionsMixin` 的子类型，表示 `T` 是一个混入组件选项。
- 如果 `ComponentOptionsMixin` 也是 `T` 的子类型，表示 `T` 是默认的混入组件选项，即 `T` 是 `ComponentOptionsMixin` 自身。
- 如果以上两个条件都满足，返回 `true`，否则返回 `false`。

简而言之，`IsDefaultMixinComponent<T>` 用于判断给定的类型 `T` 是否是默认的混入组件选项。

以下是一个示例：

```typescript
interface MyMixin extends ComponentOptionsMixin {
  // ...
}

const mixinComponent: IsDefaultMixinComponent<typeof MyMixin> = true; // true

const customOptions: ComponentOptions = {
  mixins: [MyMixin],
  // ...
};

const isDefaultMixin: IsDefaultMixinComponent<typeof customOptions> = false; // false
```

在上述示例中，`MyMixin` 是 `ComponentOptionsMixin` 的子类型，并且 `ComponentOptionsMixin` 也是 `MyMixin` 的子类型，因此 `MyMixin` 是默认的混入组件选项。而 `customOptions` 中的 `mixins` 包含了 `MyMixin`，但它不是默认的混入组件选项，因此 `isDefaultMixin` 的结果为 `false`。
 */
type IsDefaultMixinComponent<T> = T extends ComponentOptionsMixin
  ? ComponentOptionsMixin extends T
    ? true
    : false
  : false
/**
 * `MixinToOptionTypes<T>` 是一个条件类型，用于将混入选项类型 `T` 转换为组件选项的类型。

在 Vue.js 中，混入 (mixin) 是一种重用组件选项的机制。混入选项可以包含组件选项的一部分或全部内容，并可以被多个组件共享和合并。

`MixinToOptionTypes<T>` 的逻辑如下：

- 如果类型 `T` 是 `ComponentOptionsBase` 的子类型，表示 `T` 是一个完整的组件选项类型。
- 通过使用 `infer` 关键字和泛型参数，我们提取出 `T` 中的各个部分类型，分别命名为 `P`、`B`、`D`、`C`、`M`、`Mixin` 和 `Extends`。
- 我们通过 `OptionTypesType` 类型操作符将每个部分类型转换为对应的选项类型。
- 使用交叉类型操作符 `&` 将转换后的选项类型合并为一个最终的组件选项类型。
- 通过 `IntersectionMixin` 类型操作符处理混入选项的交叉类型。
- 如果类型 `T` 不满足以上条件，返回 `never` 类型。

简而言之，`MixinToOptionTypes<T>` 用于将混入选项类型 `T` 转换为组件选项的类型，并合并混入选项中的各个部分类型。

以下是一个示例：

```typescript
interface MyMixin {
  data(): {
    count: number;
  };
  created(): void;
}

type ComponentOptions = MixinToOptionTypes<MyMixin>;

// ComponentOptions 的类型为：
// {
//   data(): { count: number };
//   created(): void;
// }
```

在上述示例中，`MyMixin` 是一个混入选项类型，包含了 `data` 和 `created` 这两个组件选项的部分内容。通过使用 `MixinToOptionTypes`，我们将 `MyMixin` 转换为了组件选项的类型 `ComponentOptions`，其中包含了 `data` 和 `created` 这两个选项的类型定义。

请注意，`MixinToOptionTypes<T>` 只能用于处理符合特定结构的混入选项类型，并不适用于所有类型的混入选项。
 */
type MixinToOptionTypes<T> = T extends ComponentOptionsBase<
  infer P,
  infer B,
  infer D,
  infer C,
  infer M,
  infer Mixin,
  infer Extends,
  any,
  any,
  infer Defaults,
  any,
  any,
  any
>
  ? OptionTypesType<P & {}, B & {}, D & {}, C & {}, M & {}, Defaults & {}> &
      IntersectionMixin<Mixin> &
      IntersectionMixin<Extends>
  : never

// ExtractMixin(map type) is used to resolve circularly references
/**
 * 对于给定的类型 `T`，`ExtractMixin<T>` 是一个条件类型，用于提取混入选项类型。

逻辑如下：

- 首先，我们使用条件类型来检查 `T` 是否是 `ComponentOptionsMixin` 的子类型，即是否为混入选项类型。
- 如果 `T` 是混入选项类型，我们将 `T` 作为泛型参数传递给 `MixinToOptionTypes` 类型操作符，以获取混入选项类型的详细内容，并将其命名为 `Mixin`。
- 最后，我们使用索引类型查询 `{ Mixin: MixinToOptionTypes<T> }`，从中提取出键为 `'Mixin'` 的属性类型。
- 如果 `T` 不是混入选项类型，则返回 `never` 类型。

简而言之，`ExtractMixin<T>` 用于提取给定组件选项类型 `T` 中的混入选项类型。如果 `T` 不是混入选项类型，则返回 `never` 类型。

以下是一个示例：

```typescript
interface MyMixin {
  data(): {
    count: number;
  };
  created(): void;
}

type ComponentOptions = {
  mixins: MyMixin[];
};

type ExtractedMixin = ExtractMixin<ComponentOptions>;

// ExtractedMixin 的类型为：
// {
//   data(): { count: number };
//   created(): void;
// }
```

在上述示例中，`ComponentOptions` 是一个组件选项类型，其中包含了一个 `mixins` 属性，其类型为 `MyMixin[]`，表示使用了 `MyMixin` 混入选项。通过使用 `ExtractMixin`，我们从 `ComponentOptions` 中提取出了混入选项的类型，并赋值给 `ExtractedMixin`。最终，`ExtractedMixin` 的类型为混入选项的类型，包含了 `data` 和 `created` 这两个选项的类型定义。

需要注意的是，`ExtractMixin<T>` 只适用于符合特定结构的组件选项类型，而不适用于所有类型的组件选项。
 */
type ExtractMixin<T> = {
  Mixin: MixinToOptionTypes<T>
}[T extends ComponentOptionsMixin ? 'Mixin' : never]
/**
 * `IntersectionMixin<T>` 是一个条件类型，用于获取混入选项类型 `T` 中的交叉类型。

逻辑如下：

- 首先，我们使用条件类型来检查 `IsDefaultMixinComponent<T>` 是否为 `true`，即判断 `T` 是否为默认混入选项类型 `ComponentOptionsMixin`。
- 如果 `IsDefaultMixinComponent<T>` 为 `true`，则表示 `T` 是默认混入选项类型，我们直接返回 `OptionTypesType`，这是默认混入选项类型的交叉类型。
- 如果 `IsDefaultMixinComponent<T>` 不为 `true`，则表示 `T` 是自定义的混入选项类型，我们使用 `ExtractMixin<T>` 提取出混入选项类型，并使用 `UnionToIntersection` 将提取出的类型联合转换为交叉类型。

`UnionToIntersection` 是一个辅助类型，用于将联合类型转换为交叉类型。它的实现可以参考以下代码：

```typescript
type UnionToIntersection<U> = (U extends any ? (arg: U) => any : never) extends (
  arg: infer I
) => void
  ? I
  : never;
```

以下是一个示例：

```typescript
interface MixinA {
  methodA(): void;
}

interface MixinB {
  methodB(): void;
}

type MyMixin = MixinA | MixinB;

type Intersection = IntersectionMixin<MyMixin>;

// Intersection 的类型为：
// {
//   methodA(): void;
// } & {
//   methodB(): void;
// }
```

在上述示例中，`MyMixin` 是一个联合类型，表示自定义的混入选项类型。通过使用 `IntersectionMixin`，我们将联合类型 `MyMixin` 转换为交叉类型 `Intersection`，其中包含了 `methodA` 和 `methodB` 两个方法的定义。

需要注意的是，`IntersectionMixin<T>` 只适用于符合特定结构的混入选项类型，而不适用于所有类型的混入选项。
 */
export type IntersectionMixin<T> = IsDefaultMixinComponent<T> extends true
  ? OptionTypesType
  : UnionToIntersection<ExtractMixin<T>>
/**
 * `UnwrapMixinsType<T, Type>` 是一个条件类型，用于从选项类型 `T` 中解包指定 `Type` 的属性类型。

逻辑如下：

- 首先，我们使用条件类型来检查 `T` 是否为 `OptionTypesType`，即判断 `T` 是否是符合选项类型结构的类型。
- 如果 `T` 是 `OptionTypesType`，我们使用索引类型 `T[Type]` 来获取指定 `Type` 的属性类型。
- 如果 `T` 不是 `OptionTypesType`，则返回 `never`。

以下是一个示例：

```typescript
interface Options {
  propA: string;
  propB: number;
}

type UnwrappedPropA = UnwrapMixinsType<Options, 'propA'>;
// UnwrappedPropA 的类型为 string

type UnwrappedPropB = UnwrapMixinsType<Options, 'propB'>;
// UnwrappedPropB 的类型为 number

type UnwrappedPropC = UnwrapMixinsType<Options, 'propC'>;
// UnwrappedPropC 的类型为 never
```

在上述示例中，我们有一个选项类型 `Options`，其中包含了 `propA` 和 `propB` 两个属性。通过使用 `UnwrapMixinsType`，我们可以解包出指定属性的类型，例如解包出 `propA` 的类型为 `string`，解包出 `propB` 的类型为 `number`。如果尝试解包不存在的属性，例如 `propC`，则返回 `never` 类型。

需要注意的是，`UnwrapMixinsType<T, Type>` 只适用于符合特定结构的选项类型，而不适用于所有类型的选项。
 */
export type UnwrapMixinsType<
  T,
  Type extends OptionTypesKeys
> = T extends OptionTypesType ? T[Type] : never
/**
 * `EnsureNonVoid<T>` 是一个条件类型，用于确保类型 `T` 不为 `void`。

逻辑如下：

- 如果 `T` 是 `void` 类型，则返回一个空对象类型 `{}`。
- 如果 `T` 不是 `void` 类型，则返回 `T` 自身。

这个类型可以用于在需要确保类型不为 `void` 的地方进行类型约束。

以下是一个示例：

```typescript
type ResultA = EnsureNonVoid<string>;
// ResultA 的类型为 string

type ResultB = EnsureNonVoid<void>;
// ResultB 的类型为 {}

type ResultC<T> = EnsureNonVoid<T>;
// 使用泛型约束，如果传入的类型为 void，则返回 {}

const valueA: ResultA = 'Hello';
const valueB: ResultB = {};
const valueC: ResultC<number> = 42;
const valueD: ResultC<void> = {};
```

在上述示例中，我们使用 `EnsureNonVoid` 来确保某个类型不为 `void`。例如，`ResultA` 的类型为 `string`，因为 `string` 不是 `void` 类型；而 `ResultB` 的类型为 `{}`，因为 `void` 类型经过 `EnsureNonVoid` 处理后变为了空对象类型。我们还可以使用泛型 `ResultC` 来动态约束传入的类型，如果传入的类型为 `void`，则返回空对象类型 `{}`。
 */
type EnsureNonVoid<T> = T extends void ? {} : T
/**
 * `ComponentPublicInstanceConstructor` 是一个类型别名，用于表示组件实例的构造函数类型。

它接受以下类型参数：

- `T`：组件实例的类型，默认为 `ComponentPublicInstance<any>`。
- `Props`：组件的 props 类型，默认为 `any`。
- `RawBindings`：组件的原始绑定类型，默认为 `any`。
- `D`：组件的数据类型，默认为 `any`。
- `C`：组件的计算属性选项类型，默认为 `ComputedOptions`。
- `M`：组件的方法选项类型，默认为 `MethodOptions`。

该类型别名定义了一个构造函数类型，通过 `new (...args: any[]): T` 表示可以接受任意参数并返回类型为 `T` 的组件实例。

在类型定义中，还使用了 `__isFragment`、`__isTeleport` 和 `__isSuspense` 属性来确保该构造函数不会被错误地用于 Fragment、Teleport 和 Suspense 组件。

以下是一个示例：

```typescript
import { ComponentPublicInstance } from 'vue'

type Props = {
  message: string
}

type MyComponentInstance = ComponentPublicInstance<Props>

const MyComponent: ComponentPublicInstanceConstructor<MyComponentInstance, Props> = class MyComponent {
  constructor(props: Props) {
    // 构造函数逻辑
  }
}

const instance = new MyComponent({ message: 'Hello' });
// instance 的类型为 MyComponentInstance
```

在上述示例中，我们定义了一个 `MyComponentInstance` 类型作为组件实例的类型。然后，我们使用 `ComponentPublicInstanceConstructor` 来定义 `MyComponent` 的构造函数类型，并将 `MyComponentInstance` 和 `Props` 作为类型参数传递。最后，我们可以使用 `new MyComponent` 来创建一个 `MyComponentInstance` 类型的组件实例。
 */
export type ComponentPublicInstanceConstructor<
  T extends ComponentPublicInstance<
    Props,
    RawBindings,
    D,
    C,
    M
  > = ComponentPublicInstance<any>,
  Props = any,
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> = {
  __isFragment?: never
  __isTeleport?: never
  __isSuspense?: never
  new (...args: any[]): T
}
/**
 * `CreateComponentPublicInstance` 是一个类型别名，用于创建组件的公共实例类型。

它接受以下类型参数：

- `P`：组件的 props 类型，默认为 `{}`。
- `B`：组件的原始绑定类型，默认为 `{}`。
- `D`：组件的数据类型，默认为 `{}`。
- `C`：组件的计算属性选项类型，默认为 `{}`。
- `M`：组件的方法选项类型，默认为 `{}`。
- `Mixin`：组件的 mixin 类型，默认为 `ComponentOptionsMixin`。
- `Extends`：组件的扩展 mixin 类型，默认为 `ComponentOptionsMixin`。
- `E`：组件的 emits 选项类型，默认为 `{}`。
- `PublicProps`：公共 props 类型，默认为 `P`。
- `Defaults`：组件的默认值类型，默认为 `{}`。
- `MakeDefaultsOptional`：是否将默认值类型设为可选，默认为 `false`。
- `I`：组件的注入选项类型，默认为 `{}`。
- `S`：组件的插槽类型，默认为 `{}`。
- `PublicMixin`：公共 mixin 类型，根据 `Mixin` 和 `Extends` 计算得出。
- `PublicP`：公共 props 类型，根据 `PublicMixin` 和 `P` 计算得出。
- `PublicB`：公共原始绑定类型，根据 `PublicMixin` 和 `B` 计算得出。
- `PublicD`：公共数据类型，根据 `PublicMixin` 和 `D` 计算得出。
- `PublicC`：公共计算属性选项类型，根据 `PublicMixin` 和 `C` 计算得出。
- `PublicM`：公共方法选项类型，根据 `PublicMixin` 和 `M` 计算得出。
- `PublicDefaults`：公共默认值类型，根据 `PublicMixin` 和 `Defaults` 计算得出。

该类型别名使用 `ComponentPublicInstance` 来定义组件的公共实例类型，并将上述计算得出的公共类型作为泛型参数传递。

以下是一个示例：

```typescript
import { ComponentPublicInstance, ComputedOptions } from 'vue'

type Props = {
  message: string
}

type Data = {
  count: number
}

const MyComponent: CreateComponentPublicInstance<
  Props,
  {},
  Data,
  ComputedOptions
> = class MyComponent {
  constructor(props: Props) {
    // 构造函数逻辑
  }
}

const instance = new MyComponent({ message: 'Hello' });
// instance 的类型为 ComponentPublicInstance<Props, {}, Data, ComputedOptions>
```

在上述示例中，我们使用 `CreateComponentPublicInstance` 来定义 `MyComponent` 的类型，并将 `Props`、`{}`、`Data` 和 `ComputedOptions` 作为类型参数传递。然后，我们可以使用 `new MyComponent` 来创建一个与定义的公共实例类型相匹配的组件实例。
 */
export type CreateComponentPublicInstance<
  P = {},
  B = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  I extends ComponentInjectOptions = {},
  S extends SlotsType = {},
  PublicMixin = IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
  PublicP = UnwrapMixinsType<PublicMixin, 'P'> & EnsureNonVoid<P>,
  PublicB = UnwrapMixinsType<PublicMixin, 'B'> & EnsureNonVoid<B>,
  PublicD = UnwrapMixinsType<PublicMixin, 'D'> & EnsureNonVoid<D>,
  PublicC extends ComputedOptions = UnwrapMixinsType<PublicMixin, 'C'> &
    EnsureNonVoid<C>,
  PublicM extends MethodOptions = UnwrapMixinsType<PublicMixin, 'M'> &
    EnsureNonVoid<M>,
  PublicDefaults = UnwrapMixinsType<PublicMixin, 'Defaults'> &
    EnsureNonVoid<Defaults>
> = ComponentPublicInstance<
  PublicP,
  PublicB,
  PublicD,
  PublicC,
  PublicM,
  E,
  PublicProps,
  PublicDefaults,
  MakeDefaultsOptional,
  ComponentOptionsBase<
    P,
    B,
    D,
    C,
    M,
    Mixin,
    Extends,
    E,
    string,
    Defaults,
    {},
    string,
    S
  >,
  I,
  S
>

// public properties exposed on the proxy, which is used as the render context
// in templates (as `this` in the render option)
/**
 * `ComponentPublicInstance` 是一个类型别名，用于定义组件的公共实例类型。

它接受以下类型参数：

- `P`：从 `props` 选项中提取的 props 类型，默认为 `{}`。
- `B`：从 `setup()` 返回的原始绑定类型，默认为 `{}`。
- `D`：从 `data()` 返回的数据类型，默认为 `{}`。
- `C`：计算属性选项类型，默认为 `ComputedOptions`。
- `M`：方法选项类型，默认为 `MethodOptions`。
- `E`：`emits` 选项类型，默认为 `{}`。
- `PublicProps`：公共 props 类型，默认为 `P`。
- `Defaults`：默认值类型，默认为 `{}`。
- `MakeDefaultsOptional`：是否将默认值类型设为可选，默认为 `false`。
- `Options`：组件选项类型，默认为 `ComponentOptionsBase<any, any, any, any, any, any, any, any, any>`。
- `I`：组件注入选项类型，默认为 `{}`。
- `S`：插槽类型，默认为 `{}`。

该类型别名定义了组件实例的公共属性和方法，并通过交叉类型将其他相关类型合并到了实例类型中。以下是一些重要的属性和方法：

- `$`：组件的内部实例。
- `$data`：组件的数据。
- `$props`：组件的 props。
- `$attrs`：组件的 attribute。
- `$refs`：组件的引用。
- `$slots`：组件的插槽。
- `$root`：组件的根实例。
- `$parent`：组件的父实例。
- `$emit`：触发事件的方法。
- `$el`：组件的 DOM 元素。
- `$options`：组件的选项。
- `$forceUpdate`：强制更新组件的方法。
- `$nextTick`：下一个更新周期时执行回调的方法。
- `$watch`：观察一个数据源，并在其变化时执行回调的方法。

除了上述属性和方法之外，还将 `P`、`B`、`D`、`C`、`M`、`ComponentCustomProperties`、`I` 等类型的属性合并到了组件实例中。

以下是一个示例：

```typescript
import { ComponentPublicInstance, ComputedOptions } from 'vue'

type Props = {
  message: string
}

type Data = {
  count: number
}

const instance: ComponentPublicInstance<Props, {}, Data, ComputedOptions> = {
  $: {}, // 内部实例
  $data: { count: 0 }, // 数据
  $props: { message: 'Hello' }, // props
  $attrs: {}, // 属性
  $refs: {}, // 引用
  $slots: {}, // 插槽
  $root: null, // 根实例
  $parent: null, // 父实例
  $emit: () => {}, // 触发事件方法
  $el: null, // DOM 元素
  $options: {}, // 选项
  $forceUpdate: () => {}, // 强制更新方法
  $nextTick: ()

 => {}, // 下一个更新周期方法
  $watch: () => {}, // 观察方法
  message: 'Hello', // props 属性
  count: 0, // 数据属性
  computedValue: 0, // 计算属性
  method: () => {}, // 方法
  // 其他自定义属性
}
```

在上述示例中，我们使用 `ComponentPublicInstance` 定义了一个组件实例，并为其提供了类型注解。根据提供的类型参数，实例的类型会相应地包含定义的属性和方法。
 */
export type ComponentPublicInstance<
  P = {}, // props type extracted from props option
  B = {}, // raw bindings returned from setup()
  D = {}, // return from data()
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>,
  I extends ComponentInjectOptions = {},
  S extends SlotsType = {}
> = {
  $: ComponentInternalInstance
  $data: D
  $props: Prettify<
    MakeDefaultsOptional extends true
      ? Partial<Defaults> & Omit<P & PublicProps, keyof Defaults>
      : P & PublicProps
  >
  $attrs: Data
  $refs: Data
  $slots: UnwrapSlotsType<S>
  $root: ComponentPublicInstance | null
  $parent: ComponentPublicInstance | null
  $emit: EmitFn<E>
  $el: any
  $options: Options & MergedComponentOptionsOverride
  $forceUpdate: () => void
  $nextTick: typeof nextTick
  $watch<T extends string | ((...args: any) => any)>(
    source: T,
    cb: T extends (...args: any) => infer R
      ? (...args: [R, R]) => any
      : (...args: any) => any,
    options?: WatchOptions
  ): WatchStopHandle
} & P &
  ShallowUnwrapRef<B> &
  UnwrapNestedRefs<D> &
  ExtractComputedReturns<C> &
  M &
  ComponentCustomProperties &
  InjectToObject<I>

export type PublicPropertiesMap = Record<
  string,
  (i: ComponentInternalInstance) => any
>

/**
 * #2437 In Vue 3, functional components do not have a public instance proxy but
 * they exist in the internal parent chain. For code that relies on traversing
 * public $parent chains, skip functional ones and go to the parent instead.
 * `getPublicInstance` 是一个函数，它接受一个 `ComponentInternalInstance` 或 `null` 参数，并返回一个 `ComponentPublicInstance`、`ComponentInternalInstance['exposed']` 或 `null`。

该函数的作用是获取组件实例的公共实例。它通过递归遍历组件实例的父级实例，直到找到最顶层的组件实例或根实例。如果传入的组件实例是有状态组件，它会首先尝试获取公开的代理实例 (`exposed`)，如果不存在则返回原始的代理实例 (`proxy`)。如果传入的组件实例是无状态组件，则会继续获取其父级实例的公共实例，直到找到最顶层的组件实例或根实例。

以下是一个示例：

```typescript
import { ComponentInternalInstance, ComponentPublicInstance } from 'vue'

const instance: ComponentInternalInstance = {
  // ...组件实例的其他属性和方法
  parent: {
    // ...父级实例的属性和方法
    proxy: {
      // 公共实例的属性和方法
      message: 'Hello',
      handleClick: () => {
        console.log('Button clicked')
      }
    }
  }
}

const publicInstance = getPublicInstance(instance)
console.log(publicInstance) // 输出: { message: 'Hello', handleClick: [Function] }
```

在上述示例中，我们传入一个组件实例 `instance` 给 `getPublicInstance` 函数。根据 `instance` 的父级实例的 `proxy` 对象，函数返回了公共实例对象，该对象包含了 `message` 属性和 `handleClick` 方法。这样我们就可以通过 `publicInstance` 来访问公共实例的属性和方法。
 */
const getPublicInstance = (
  i: ComponentInternalInstance | null
): ComponentPublicInstance | ComponentInternalInstance['exposed'] | null => {
  if (!i) return null
  if (isStatefulComponent(i)) return getExposeProxy(i) || i.proxy
  return getPublicInstance(i.parent)
}
/**
 * `publicPropertiesMap` 是一个对象，它定义了组件实例的公共属性映射。这个映射将属性名称映射到相应的获取函数。

该对象中的每个属性都是一个函数，该函数接受一个 `ComponentInternalInstance` 实例作为参数，并返回相应属性的值。这些属性可以通过访问公共实例 (`$`) 来获取。

以下是一些在 `publicPropertiesMap` 中定义的常见属性：

- `$`: 返回传入的 `ComponentInternalInstance` 实例本身。
- `$el`: 返回组件实例对应的 DOM 元素。
- `$data`: 返回组件实例的数据对象。
- `$props`: 返回组件实例的 props 对象。在开发模式下，返回的对象可能是一个只读对象。
- `$attrs`: 返回组件实例的 attrs 对象。在开发模式下，返回的对象可能是一个只读对象。
- `$slots`: 返回组件实例的 slots 对象。在开发模式下，返回的对象可能是一个只读对象。
- `$refs`: 返回组件实例的 refs 对象。在开发模式下，返回的对象可能是一个只读对象。
- `$parent`: 返回组件实例的父级公共实例。
- `$root`: 返回组件实例的根级公共实例。
- `$emit`: 返回组件实例的 emit 方法，用于触发事件。
- `$options`: 返回组件实例的选项对象。在使用选项 API 时，返回合并后的选项对象；否则，返回组件的类型。
- `$forceUpdate`: 返回一个函数，用于强制更新组件实例。
- `$nextTick`: 返回一个函数，用于在下一个 tick 执行回调函数。
- `$watch`: 返回一个函数，用于监听组件实例上的属性变化。

这些属性和方法可以通过公共实例访问，例如 `publicInstance.$el`、`publicInstance.$data` 等。

在 `publicPropertiesMap` 中的每个函数中，我们使用了一些辅助函数和变量，如 `shallowReadonly`、`getPublicInstance`、`resolveMergedOptions`、`queueJob`、`nextTick` 等，这些函数和变量用于获取相应的属性值或执行相应的操作。

注意：上述代码中的注释 `#__PURE__` 是一个特殊的标记，它用于告诉编译器保留该行代码，并防止被优化或删除。
 */
export const publicPropertiesMap: PublicPropertiesMap =
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /*#__PURE__*/ extend(Object.create(null), {
    $: i => i,
    $el: i => i.vnode.el,
    $data: i => i.data,
    $props: i => (__DEV__ ? shallowReadonly(i.props) : i.props),
    $attrs: i => (__DEV__ ? shallowReadonly(i.attrs) : i.attrs),
    $slots: i => (__DEV__ ? shallowReadonly(i.slots) : i.slots),
    $refs: i => (__DEV__ ? shallowReadonly(i.refs) : i.refs),
    $parent: i => getPublicInstance(i.parent),
    $root: i => getPublicInstance(i.root),
    $emit: i => i.emit,
    $options: i => (__FEATURE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type),
    $forceUpdate: i => i.f || (i.f = () => queueJob(i.update)),
    $nextTick: i => i.n || (i.n = nextTick.bind(i.proxy!)),
    $watch: i => (__FEATURE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP)
  } as PublicPropertiesMap)
/**
 * 如果代码中定义了 `__COMPAT__` 变量为真值（true），则会调用 `installCompatInstanceProperties` 函数，并将 `publicPropertiesMap` 作为参数传递给该函数。

`installCompatInstanceProperties` 函数的作用是在兼容模式下安装实例属性。在这个特定的代码段中，它被用来处理兼容性相关的逻辑，以确保代码在不同的环境或版本中正常运行。

具体的 `installCompatInstanceProperties` 函数的实现细节在代码中并没有给出，但它可能会进行一些处理，例如检查环境特性、注册兼容性属性、修复特定的兼容性问题等。根据代码的上下文和相关的兼容性需求，可以在函数内部找到更多的兼容性处理逻辑。

请注意，`__COMPAT__` 变量的值和 `installCompatInstanceProperties` 函数的实现细节在这里没有提供，因此无法给出更具体的解释。
 */
if (__COMPAT__) {
  installCompatInstanceProperties(publicPropertiesMap)
}
/**
 * 这段代码定义了一个常量枚举 `AccessTypes`，它包含了以下几个枚举成员：

- `OTHER`: 表示其他类型的访问。在特定的上下文中没有明确的访问类型。
- `SETUP`: 表示访问的类型是组件的 `setup` 函数。
- `DATA`: 表示访问的类型是组件的数据（data）。
- `PROPS`: 表示访问的类型是组件的属性（props）。
- `CONTEXT`: 表示访问的类型是组件的上下文（context）。

这些枚举成员可以用作访问类型的标识符，在代码的其他地方可以使用这些标识符来表示不同的访问类型。使用枚举成员而不是硬编码的数字或字符串可以提高代码的可读性和可维护性，因为它们提供了更具有描述性的标识符。
 */
const enum AccessTypes {
  OTHER,
  SETUP,
  DATA,
  PROPS,
  CONTEXT
}
/**
 * 这段代码定义了一个接口 `ComponentRenderContext`，它表示组件的渲染上下文。该接口具有以下特性：

- 索引签名：`[key: string]: any` 表示可以使用任意字符串作为属性名，并且属性值可以是任意类型。
- `_` 属性：`_: ComponentInternalInstance` 表示一个特殊属性 `_`，其类型为 `ComponentInternalInstance`，用于存储组件的内部实例。

该接口的作用是提供一个通用的上下文对象，在组件渲染过程中可以根据需要添加任意的属性和值。这样可以将额外的信息或功能传递给组件的子组件或其他相关的组件。
 */
export interface ComponentRenderContext {
  [key: string]: any
  _: ComponentInternalInstance
}
/**
 * 
 * @param key 
 * @returns 
 * 这段代码定义了一个名为 `isReservedPrefix` 的常量箭头函数。该函数用于判断给定的字符串 `key` 是否是保留前缀。

- 如果 `key` 的值为 `'_'` 或 `'$'`，则返回 `true`，表示该字符串是保留前缀。
- 否则，返回 `false`，表示该字符串不是保留前缀。

该函数可以用于检查字符串是否具有保留前缀，以便在需要时采取相应的操作或逻辑。
 */
export const isReservedPrefix = (key: string) => key === '_' || key === '$'
/**
 * 
 * @param state 
 * @param key 
 * @returns 
 * 这段代码定义了一个名为 `hasSetupBinding` 的常量箭头函数。该函数用于判断给定的 `state` 对象是否具有指定的 `key` 绑定。

函数的逻辑如下：

- 首先检查 `state` 对象是否不等于 `EMPTY_OBJ`（空对象）且不是脚本设置对象 `__isScriptSetup`，这是为了排除空对象和脚本设置对象。
- 然后使用 `hasOwn` 函数检查 `state` 对象是否具有指定的 `key`，即判断该键是否存在于 `state` 对象中。
- 如果以上两个条件都满足，则说明 `state` 对象具有指定的 `key` 绑定，函数返回 `true`。
- 否则，函数返回 `false`，表示 `state` 对象不具有指定的 `key` 绑定。

该函数主要用于在组件的设置阶段（setup）中判断状态对象是否具有指定的绑定，以便在需要时执行相应的逻辑。
 */
const hasSetupBinding = (state: Data, key: string) =>
  state !== EMPTY_OBJ && !state.__isScriptSetup && hasOwn(state, key)
/**
 * 这段代码定义了一个名为 `PublicInstanceProxyHandlers` 的常量，它是一个 ProxyHandler 对象。该对象包含用于代理公共实例的各种操作的处理程序。

处理程序的功能如下：

- `get`: 在获取属性值时被调用。它首先从实例的 `ctx`、`setupState`、`data`、`props`、`accessCache`、`type`、`appContext` 等属性中检索相关值。如果属性名以 `$` 开头，会从 `publicPropertiesMap` 中获取相应的公共属性。如果是其他属性，则检查是否为 CSS 模块，并返回相应的值。如果都没有匹配，则检查是否有全局属性并返回相应的值。最后，如果是开发环境且满足特定条件，则输出警告信息。
- `set`: 在设置属性值时被调用。它首先检查是否为 `setupState` 的绑定属性，如果是，则直接设置对应的值。如果是 `__isScriptSetup` 绑定属性，则输出警告信息并返回 false。接下来，如果存在 `data` 对象且属性存在于 `data` 中，则设置对应的值。如果属性存在于 `props` 中，则输出警告信息并返回 false。如果属性名以 `$` 开头且在实例中存在，则输出警告信息并返回 false。否则，设置属性值到 `ctx` 中。
- `has`: 在检查属性是否存在时被调用。它会检查属性是否存在于 `accessCache`、`data`、`setupState`、`propsOptions`、`ctx`、`publicPropertiesMap` 和 `appContext.config.globalProperties` 中。
- `defineProperty`: 在定义属性时被调用。如果属性具有 getter，则将属性名从 `accessCache` 中移除。如果属性具有值，则调用 `set` 方法设置属性值。

这些处理程序用于拦截和处理对公共实例的属性访问、属性设置、属性存在性检查和属性定义等操作。
 */
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key: string) {
    const { ctx, setupState, data, props, accessCache, type, appContext } =
      instance

    // for internal formatters to know that this is a Vue instance
    if (__DEV__ && key === '__isVue') {
      return true
    }

    // data / props / ctx
    // This getter gets called for every property access on the render context
    // during render and is a major hotspot. The most expensive part of this
    // is the multiple hasOwn() calls. It's much faster to do a simple property
    // access on a plain object, so we use an accessCache object (with null
    // prototype) to memoize what access type a key corresponds to.
    let normalizedProps
    if (key[0] !== '$') {
      const n = accessCache![key]
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.SETUP:
            return setupState[key]
          case AccessTypes.DATA:
            return data[key]
          case AccessTypes.CONTEXT:
            return ctx[key]
          case AccessTypes.PROPS:
            return props![key]
          // default: just fallthrough
        }
      } else if (hasSetupBinding(setupState, key)) {
        accessCache![key] = AccessTypes.SETUP
        return setupState[key]
      } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        accessCache![key] = AccessTypes.DATA
        return data[key]
      } else if (
        // only cache other properties when instance has declared (thus stable)
        // props
        (normalizedProps = instance.propsOptions[0]) &&
        hasOwn(normalizedProps, key)
      ) {
        accessCache![key] = AccessTypes.PROPS
        return props![key]
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache![key] = AccessTypes.CONTEXT
        return ctx[key]
      } else if (!__FEATURE_OPTIONS_API__ || shouldCacheAccess) {
        accessCache![key] = AccessTypes.OTHER
      }
    }

    const publicGetter = publicPropertiesMap[key]
    let cssModule, globalProperties
    // public $xxx properties
    if (publicGetter) {
      if (key === '$attrs') {
        track(instance, TrackOpTypes.GET, key)
        __DEV__ && markAttrsAccessed()
      } else if (__DEV__ && key === '$slots') {
        track(instance, TrackOpTypes.GET, key)
      }
      return publicGetter(instance)
    } else if (
      // css module (injected by vue-loader)
      (cssModule = type.__cssModules) &&
      (cssModule = cssModule[key])
    ) {
      return cssModule
    } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
      // user may set custom properties to `this` that start with `$`
      accessCache![key] = AccessTypes.CONTEXT
      return ctx[key]
    } else if (
      // global properties
      ((globalProperties = appContext.config.globalProperties),
      hasOwn(globalProperties, key))
    ) {
      if (__COMPAT__) {
        const desc = Object.getOwnPropertyDescriptor(globalProperties, key)!
        if (desc.get) {
          return desc.get.call(instance.proxy)
        } else {
          const val = globalProperties[key]
          return isFunction(val)
            ? Object.assign(val.bind(instance.proxy), val)
            : val
        }
      } else {
        return globalProperties[key]
      }
    } else if (
      __DEV__ &&
      currentRenderingInstance &&
      (!isString(key) ||
        // #1091 avoid internal isRef/isVNode checks on component instance leading
        // to infinite warning loop
        key.indexOf('__v') !== 0)
    ) {
      if (data !== EMPTY_OBJ && isReservedPrefix(key[0]) && hasOwn(data, key)) {
        warn(
          `Property ${JSON.stringify(
            key
          )} must be accessed via $data because it starts with a reserved ` +
            `character ("$" or "_") and is not proxied on the render context.`
        )
      } else if (instance === currentRenderingInstance) {
        warn(
          `Property ${JSON.stringify(key)} was accessed during render ` +
            `but is not defined on instance.`
        )
      }
    }
  },

  set(
    { _: instance }: ComponentRenderContext,
    key: string,
    value: any
  ): boolean {
    const { data, setupState, ctx } = instance
    if (hasSetupBinding(setupState, key)) {
      setupState[key] = value
      return true
    } else if (
      __DEV__ &&
      setupState.__isScriptSetup &&
      hasOwn(setupState, key)
    ) {
      warn(`Cannot mutate <script setup> binding "${key}" from Options API.`)
      return false
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = value
      return true
    } else if (hasOwn(instance.props, key)) {
      __DEV__ && warn(`Attempting to mutate prop "${key}". Props are readonly.`)
      return false
    }
    if (key[0] === '$' && key.slice(1) in instance) {
      __DEV__ &&
        warn(
          `Attempting to mutate public property "${key}". ` +
            `Properties starting with $ are reserved and readonly.`
        )
      return false
    } else {
      if (__DEV__ && key in instance.appContext.config.globalProperties) {
        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          value
        })
      } else {
        ctx[key] = value
      }
    }
    return true
  },

  has(
    {
      _: { data, setupState, accessCache, ctx, appContext, propsOptions }
    }: ComponentRenderContext,
    key: string
  ) {
    let normalizedProps
    return (
      !!accessCache![key] ||
      (data !== EMPTY_OBJ && hasOwn(data, key)) ||
      hasSetupBinding(setupState, key) ||
      ((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
      hasOwn(ctx, key) ||
      hasOwn(publicPropertiesMap, key) ||
      hasOwn(appContext.config.globalProperties, key)
    )
  },

  defineProperty(
    target: ComponentRenderContext,
    key: string,
    descriptor: PropertyDescriptor
  ) {
    if (descriptor.get != null) {
      // invalidate key cache of a getter based property #5417
      target._.accessCache![key] = 0
    } else if (hasOwn(descriptor, 'value')) {
      this.set!(target, key, descriptor.value, null)
    }
    return Reflect.defineProperty(target, key, descriptor)
  }
}
/**
 * 这段代码在开发环境且不是测试环境下，给 `PublicInstanceProxyHandlers` 添加了一个 `ownKeys` 的处理程序。这个处理程序在尝试枚举组件实例的属性键时被调用。

在处理程序中，首先会输出一个警告信息，提醒开发人员避免在应用逻辑中依赖于枚举组件实例的属性键。然后，通过 `Reflect.ownKeys(target)` 返回目标对象的所有属性键。

这个处理程序的目的是在生产模式下避免性能开销，因为在生产模式下，为了优化性能，枚举属性键是被禁止的。所以开发人员被建议不要在应用逻辑中依赖于枚举组件实例的属性键。
 */
if (__DEV__ && !__TEST__) {
  PublicInstanceProxyHandlers.ownKeys = (target: ComponentRenderContext) => {
    warn(
      `Avoid app logic that relies on enumerating keys on a component instance. ` +
        `The keys will be empty in production mode to avoid performance overhead.`
    )
    return Reflect.ownKeys(target)
  }
}
/**
 * 这段代码定义了一个名为 `RuntimeCompiledPublicInstanceProxyHandlers` 的对象，它继承了 `PublicInstanceProxyHandlers` 的所有属性，并覆盖了其中的 `get` 和 `has` 方法。

在 `get` 方法中，首先检查属性键是否为 `Symbol.unscopables`，如果是，则返回 `undefined`。否则，调用 `PublicInstanceProxyHandlers.get` 方法来获取属性值。

在 `has` 方法中，首先判断属性键的第一个字符是否为 `_`，以及该属性键是否被全局允许。如果不满足这两个条件，则返回 `true`，表示属性存在。如果在开发模式下且属性以 `_` 开头且被 `PublicInstanceProxyHandlers.has` 方法判断为存在，则会输出一个警告信息，提醒开发人员不要以 `_` 开头，因为这是 Vue 内部保留的前缀。

通过定义 `RuntimeCompiledPublicInstanceProxyHandlers`，可以为运行时编译的组件实例创建一个特定的代理处理程序，以处理属性的访问和存在性检查。
 */
export const RuntimeCompiledPublicInstanceProxyHandlers = /*#__PURE__*/ extend(
  {},
  PublicInstanceProxyHandlers,
  {
    get(target: ComponentRenderContext, key: string) {
      // fast path for unscopables when using `with` block
      if ((key as any) === Symbol.unscopables) {
        return
      }
      return PublicInstanceProxyHandlers.get!(target, key, target)
    },
    has(_: ComponentRenderContext, key: string) {
      const has = key[0] !== '_' && !isGloballyAllowed(key)
      if (__DEV__ && !has && PublicInstanceProxyHandlers.has!(_, key)) {
        warn(
          `Property ${JSON.stringify(
            key
          )} should not start with _ which is a reserved prefix for Vue internals.`
        )
      }
      return has
    }
  }
)

// dev only
// In dev mode, the proxy target exposes the same properties as seen on `this`
// for easier console inspection. In prod mode it will be an empty object so
// these properties definitions can be skipped.
/**
 * 
 * @param instance 
 * @returns 
 * `createDevRenderContext` 函数用于创建开发环境下的渲染上下文对象，它接收一个组件内部实例 `instance` 作为参数。

函数首先创建一个名为 `target` 的空对象，用于存储渲染上下文的属性。

然后，通过 `Object.defineProperty` 方法将内部实例 `instance` 添加到 `target` 对象中。这样做是为了在代理处理程序中能够访问到内部实例。

接下来，通过遍历 `publicPropertiesMap` 对象的属性键，将每个属性键对应的公共属性添加到 `target` 对象中。对于每个属性键，使用 `Object.defineProperty` 方法将其添加到 `target` 对象中，并定义 `get` 方法来获取相应的公共属性值。需要注意的是，由于这些属性将由代理处理程序拦截，因此不需要为 `set` 方法提供具体实现，但需要定义一个空函数 `NOOP` 来防止设置错误。

最后，将 `target` 对象转换为 `ComponentRenderContext` 类型，并将其返回作为渲染上下文对象。

这样，通过调用 `createDevRenderContext` 函数，可以为开发环境下的组件创建一个包含内部实例和公共属性的渲染上下文对象。
 */
export function createDevRenderContext(instance: ComponentInternalInstance) {
  const target: Record<string, any> = {}

  // expose internal instance for proxy handlers
  Object.defineProperty(target, `_`, {
    configurable: true,
    enumerable: false,
    get: () => instance
  })

  // expose public properties
  Object.keys(publicPropertiesMap).forEach(key => {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      get: () => publicPropertiesMap[key](instance),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: NOOP
    })
  })

  return target as ComponentRenderContext
}

// dev only
/**
 * 
 * @param instance 
 * `exposePropsOnRenderContext` 函数用于将组件实例的 props 暴露在渲染上下文中，以便在模板中可以直接访问 props。

函数接收一个组件内部实例 `instance` 作为参数。

首先，从 `instance` 中获取上下文对象 `ctx` 和 props 配置选项 `propsOptions`。

然后，判断 `propsOptions` 是否存在。如果存在，则遍历 `propsOptions` 的属性键，并通过 `Object.defineProperty` 方法将每个属性键添加到上下文对象 `ctx` 中。对于每个属性键，定义 `get` 方法来获取相应的 props 值，这里使用 `instance.props[key]` 获取 props 值。需要注意的是，由于这些属性将在模板中使用，而不允许直接修改，因此设置一个空函数 `NOOP` 作为 `set` 方法的实现，以防止设置错误。

通过调用 `exposePropsOnRenderContext` 函数，可以将组件实例的 props 暴露在渲染上下文中，以便在模板中可以直接访问它们。
 */
export function exposePropsOnRenderContext(
  instance: ComponentInternalInstance
) {
  const {
    ctx,
    propsOptions: [propsOptions]
  } = instance
  if (propsOptions) {
    Object.keys(propsOptions).forEach(key => {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => instance.props[key],
        set: NOOP
      })
    })
  }
}

// dev only
/**
 * 
 * @param instance 
 * `exposeSetupStateOnRenderContext` 函数用于将组件实例的 `setupState` 暴露在渲染上下文中，以便在模板中可以直接访问 `setupState`。

函数接收一个组件内部实例 `instance` 作为参数。

首先，从 `instance` 中获取上下文对象 `ctx` 和 `setupState`。

然后，通过 `Object.keys(toRaw(setupState))` 获取 `setupState` 的属性键数组，并进行遍历。需要注意的是，这里使用了 `toRaw` 函数将 `setupState` 转换为原始对象，以确保代理对象不会被传递到渲染上下文中。

在遍历属性键时，首先判断 `setupState` 是否为 `__isScriptSetup`，如果是，则跳过当前属性键的处理。这是为了避免将使用 `script setup` 语法定义的属性键暴露在渲染上下文中。

接下来，判断当前属性键的第一个字符是否是保留前缀（"$" 或 "_"），如果是，则发出警告并跳过当前属性键的处理。

最后，通过 `Object.defineProperty` 方法将每个属性键添加到上下文对象 `ctx` 中。对于每个属性键，定义 `get` 方法来获取相应的 `setupState` 值，这里使用 `setupState[key]` 获取值。与前面的函数一样，由于这些属性将在模板中使用，而不允许直接修改，因此设置一个空函数 `NOOP` 作为 `set` 方法的实现。

通过调用 `exposeSetupStateOnRenderContext` 函数，可以将组件实例的 `setupState` 暴露在渲染上下文中，以便在模板中可以直接访问它们。
 */
export function exposeSetupStateOnRenderContext(
  instance: ComponentInternalInstance
) {
  const { ctx, setupState } = instance
  Object.keys(toRaw(setupState)).forEach(key => {
    if (!setupState.__isScriptSetup) {
      if (isReservedPrefix(key[0])) {
        warn(
          `setup() return property ${JSON.stringify(
            key
          )} should not start with "$" or "_" ` +
            `which are reserved prefixes for Vue internals.`
        )
        return
      }
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => setupState[key],
        set: NOOP
      })
    }
  })
}
