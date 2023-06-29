import {
  toRaw,
  shallowReactive,
  trigger,
  TriggerOpTypes
} from '@vue/reactivity'
import {
  EMPTY_OBJ,
  camelize,
  hyphenate,
  capitalize,
  isString,
  isFunction,
  isArray,
  isObject,
  hasOwn,
  toRawType,
  PatchFlags,
  makeMap,
  isReservedProp,
  EMPTY_ARR,
  def,
  extend,
  isOn,
  IfAny
} from '@vue/shared'
import { warn } from './warning'
import {
  Data,
  ComponentInternalInstance,
  ComponentOptions,
  ConcreteComponent,
  setCurrentInstance,
  unsetCurrentInstance
} from './component'
import { isEmitListener } from './componentEmits'
import { InternalObjectKey } from './vnode'
import { AppContext } from './apiCreateApp'
import { createPropsDefaultThis } from './compat/props'
import { isCompatEnabled, softAssertCompatEnabled } from './compat/compatConfig'
import { DeprecationTypes } from './compat/compatConfig'
import { shouldSkipAttr } from './compat/attrsFallthrough'
/**
 * `ComponentPropsOptions` 是一个用于定义组件属性选项的类型。

它可以是以下两种类型之一：

1. `ComponentObjectPropsOptions<P>`：表示使用对象形式定义属性选项，其中 `P` 是属性的类型。这种方式可以提供更详细的属性定义，包括类型、默认值、验证等。这种定义方式适用于更复杂的属性情况。

2. `string[]`：表示使用简单形式定义属性选项，仅包含属性名称的字符串数组。这种方式适用于属性较为简单的情况，不需要提供详细的属性定义信息。

综上所述，`ComponentPropsOptions` 类型用于定义组件的属性选项，可以是对象形式的详细属性定义，也可以是简单的属性名称数组。
 */
export type ComponentPropsOptions<P = Data> =
  | ComponentObjectPropsOptions<P>
  | string[]
/**
 * `ComponentObjectPropsOptions<P>` 是一个泛型类型，用于定义组件的属性选项对象。它基于输入的泛型类型 `P`，该类型表示属性对象的类型。

属性选项对象的结构如下：

```typescript
{
  [K in keyof P]: Prop<P[K]> | null
}
```

这里使用了 TypeScript 的映射类型，通过遍历 `P` 类型的所有属性 `K`，生成一个新的对象类型。对于每个属性 `K`，它的属性值类型为 `Prop<P[K]> | null`。

`Prop<T>` 是一个用于属性定义的类型，它表示属性的类型、默认值和验证等信息。而 `null` 表示属性可以不设置默认值。

综上所述，`ComponentObjectPropsOptions<P>` 用于定义组件的属性选项对象，其中每个属性的名称和类型由泛型 `P` 决定，而属性的默认值和验证等信息由 `Prop<T>` 类型定义。
 */
export type ComponentObjectPropsOptions<P = Data> = {
  [K in keyof P]: Prop<P[K]> | null
}
/**
 * `Prop<T, D = T>` 是一个泛型类型，用于定义组件属性的类型。

它接受两个类型参数：
- `T`：表示属性的实际类型。
- `D`：表示属性的默认值类型，默认为 `T`。

`Prop<T, D>` 的值可以是以下两种类型之一：
- `PropOptions<T, D>`：属性的选项对象，包含属性的类型、默认值、验证函数等信息。
- `PropType<T>`：属性的类型，可以是基本类型、构造函数、枚举类型等。

通过使用 `Prop<T, D>` 类型，我们可以定义组件的属性并指定它们的类型和默认值。
 */
export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>
/**
 * `DefaultFactory<T>` 是一个泛型类型，用于定义默认值工厂函数的类型。

它接受一个类型参数 `T`，表示工厂函数的返回类型。

`DefaultFactory<T>` 表示一个函数类型，该函数接受一个名为 `props` 的参数，类型为 `Data`，并返回一个 `T | null | undefined` 类型的值。

在组件属性的选项对象中，可以使用 `DefaultFactory<T>` 类型来指定属性的默认值为一个工厂函数。该工厂函数在组件实例创建时会被调用，传入组件的属性对象 `props`，并返回一个默认值。

使用 `DefaultFactory<T>` 类型可以提供更动态和复杂的属性默认值设置方式，以适应不同的场景和需求。
 */
type DefaultFactory<T> = (props: Data) => T | null | undefined
/**
 * `PropOptions<T, D>` 是一个接口，用于定义属性选项的类型。

它包含以下属性：

- `type`：属性的类型，可以是 `PropType<T>` 类型、`true`、`null`。如果设置为 `true`，表示接受任意类型。如果设置为 `null`，表示没有指定类型。默认值为 `undefined`。
- `required`：一个布尔值，表示该属性是否是必需的。如果设置为 `true`，表示该属性必须提供值。默认值为 `false`。
- `default`：属性的默认值，可以是 `D` 类型的值、`DefaultFactory<D>` 类型的默认值工厂函数、`null`、`undefined` 或者对象。当属性未提供值时，会使用默认值。默认值为 `undefined`。
- `validator`：一个函数，用于验证属性的值是否有效。函数接受一个参数 `value`，表示属性的值，返回一个布尔值，表示验证结果。如果返回 `false`，则会发出警告。默认值为 `undefined`。
- `skipCheck`：一个布尔值，在内部使用，用于指示是否跳过属性值的类型检查。默认值为 `undefined`。
- `skipFactory`：一个布尔值，在内部使用，用于指示是否跳过默认值工厂函数的调用。默认值为 `undefined`。

`PropOptions<T, D>` 接口提供了属性选项的各种配置项，用于定义组件的属性及其行为。可以根据需要设置这些选项来控制属性的类型、默认值、是否必需等特性。
 */
export interface PropOptions<T = any, D = T> {
  type?: PropType<T> | true | null
  required?: boolean
  default?: D | DefaultFactory<D> | null | undefined | object
  validator?(value: unknown): boolean
  /**
   * @internal
   */
  skipCheck?: boolean
  /**
   * @internal
   */
  skipFactory?: boolean
}
/**
 * `PropType<T>` 是一个类型，用于定义属性的类型。

它可以是 `PropConstructor<T>` 类型或 `PropConstructor<T>[]` 类型。

- `PropConstructor<T>` 表示一个构造函数，用于指定属性的类型。例如，`String`、`Number`、`Boolean`、`Array` 等都是构造函数。
- `PropConstructor<T>[]` 表示属性可以接受多个类型。例如，`[String, Number]` 表示属性可以是字符串或数字类型。

使用 `PropType<T>` 可以明确指定属性的类型，限制属性接受的值的类型范围。
 */
export type PropType<T> = PropConstructor<T> | PropConstructor<T>[]

type PropConstructor<T = any> =
  | { new (...args: any[]): T & {} }
  | { (): T }
  | PropMethod<T>
/**
 * `PropConstructor<T>` 是一个类型，用于定义属性的构造函数类型。

它可以是以下三种类型之一：

1. `{ new (...args: any[]): T & {} }`：表示一个具有构造函数签名的类，可以用来创建属性的实例。`T` 是属性的类型。
2. `{ (): T }`：表示一个函数签名，用于返回属性的值。这种情况下，属性的类型为 `T`。
3. `PropMethod<T>`：表示一个函数或函数数组，用于处理属性的验证或转换逻辑。`T` 是属性的类型。

`PropConstructor<T>` 可以用于定义属性的类型或默认值的类型。它提供了灵活的选项来描述属性的构造函数或处理逻辑。
 */
type PropMethod<T, TConstructor = any> = [T] extends [
  ((...args: any) => any) | undefined
] // if is function with args, allowing non-required functions
  ? { new (): TConstructor; (): T; readonly prototype: TConstructor } // Create Function like constructor
  : never
/**
 * `RequiredKeys<T>` 是一个类型，用于获取类型 `T` 中必需的属性的键集合。

它通过遍历 `T` 的每个属性，并根据属性的类型判断是否为必需属性，从而构建了一个新的键集合类型。如果属性被标记为 `required: true` 或具有非空的 `default` 值，或者是布尔类型（但不是标记为 `default: undefined` 的布尔类型），则将其键添加到结果类型中。

换句话说，`RequiredKeys<T>` 返回一个类型，该类型包含了类型 `T` 中被标记为必需的属性的键集合。这对于对属性进行特定处理或验证时非常有用。
 */
type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends
    | { required: true }
    | { default: any }
    // don't mark Boolean props as undefined
    | BooleanConstructor
    | { type: BooleanConstructor }
    ? T[K] extends { default: undefined | (() => undefined) }
      ? never
      : K
    : never
}[keyof T]
/**
 * `OptionalKeys<T>` 是一个类型，用于获取类型 `T` 中可选的属性的键集合。

它通过 `RequiredKeys<T>` 获取到 `T` 中必需的属性的键集合，然后使用 `keyof T` 获取 `T` 的所有属性的键集合，最后使用 `Exclude<keyof T, RequiredKeys<T>>` 从所有属性的键集合中排除必需属性的键集合，得到可选属性的键集合。

换句话说，`OptionalKeys<T>` 返回一个类型，该类型包含了类型 `T` 中可选的属性的键集合。这对于在处理属性时确定哪些属性是可选的非常有用。
 */
type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>
/**
 * `DefaultKeys<T>` 是一个类型，用于获取类型 `T` 中具有默认值的属性的键集合。

它通过遍历 `T` 的属性，判断属性的类型是否具有默认值，或者是否是布尔类型（默认值为 `false`），或者是否是将属性类型指定为布尔类型，然后根据判断结果确定是否将该属性的键添加到结果集合中。

换句话说，`DefaultKeys<T>` 返回一个类型，该类型包含了类型 `T` 中具有默认值的属性的键集合。这对于在处理属性时确定哪些属性具有默认值非常有用。
 */
type DefaultKeys<T> = {
  [K in keyof T]: T[K] extends
    | { default: any }
    // Boolean implicitly defaults to false
    | BooleanConstructor
    | { type: BooleanConstructor }
    ? T[K] extends { type: BooleanConstructor; required: true } // not default if Boolean is marked as required
      ? never
      : K
    : never
}[keyof T]
/**
 * `InferPropType<T>` 是一个类型，用于根据属性类型 `T` 推断属性的实际类型。

它使用条件类型和类型推断的特性来推断属性的实际类型。它首先检查 `T` 是否为 `null`，如果是，则返回 `any` 类型。然后检查 `T` 是否具有 `{ type: null | true }` 的形式，如果是，则返回 `any` 类型。接下来，检查 `T` 是否为 `ObjectConstructor` 或 `{ type: ObjectConstructor }` 的形式，如果是，则返回 `Record<string, any>` 类型。然后检查 `T` 是否为 `BooleanConstructor` 或 `{ type: BooleanConstructor }` 的形式，如果是，则返回 `boolean` 类型。然后检查 `T` 是否为 `DateConstructor` 或 `{ type: DateConstructor }` 的形式，如果是，则返回 `Date` 类型。然后检查 `T` 是否为 `(infer U)[]` 或 `{ type: (infer U)[] }` 的形式，如果是，则递归地推断 `U` 的实际类型，并返回 `U` 类型的数组。如果 `U` 是 `DateConstructor` 类型，则返回 `Date` 或 `InferPropType<U>` 类型的数组。接下来，检查 `T` 是否为 `Prop<infer V, infer D>` 的形式，如果是，则根据 `V` 是否为 `unknown` 类型进行处理，如果是，则返回 `IfAny<V, V, D>` 类型，否则返回 `V` 类型。最后，如果上述条件都不满足，则返回 `T` 类型。

总之，`InferPropType<T>` 用于根据属性类型 `T` 推断属性的实际类型，并返回相应的类型。它是在处理组件属性类型推断时非常有用的工具。
 */
type InferPropType<T> = [T] extends [null]
  ? any // null & true would fail to infer
  : [T] extends [{ type: null | true }]
  ? any // As TS issue https://github.com/Microsoft/TypeScript/issues/14829 // somehow `ObjectConstructor` when inferred from { (): T } becomes `any` // `BooleanConstructor` when inferred from PropConstructor(with PropMethod) becomes `Boolean`
  : [T] extends [ObjectConstructor | { type: ObjectConstructor }]
  ? Record<string, any>
  : [T] extends [BooleanConstructor | { type: BooleanConstructor }]
  ? boolean
  : [T] extends [DateConstructor | { type: DateConstructor }]
  ? Date
  : [T] extends [(infer U)[] | { type: (infer U)[] }]
  ? U extends DateConstructor
    ? Date | InferPropType<U>
    : InferPropType<U>
  : [T] extends [Prop<infer V, infer D>]
  ? unknown extends V
    ? IfAny<V, V, D>
    : V
  : T

/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **internal** - i.e. the resolved props received by
 * the component.
 * - Boolean props are always present
 * - Props with default values are always present
 *
 * To extract accepted props from the parent, use {@link ExtractPublicPropTypes}.
 * `ExtractPropTypes<O>` 是一个类型，用于从属性选项类型 `O` 中提取属性的类型。

它使用了两个映射类型。第一个映射类型使用 `keyof Pick<O, RequiredKeys<O>>` 来遍历属性选项类型 `O` 中的必需属性，并为每个属性生成键值对，其中键是属性的名称，值是通过 `InferPropType<O[K]>` 推断的属性类型。这样，我们可以获得具有必需属性的类型。

第二个映射类型使用 `keyof Pick<O, OptionalKeys<O>>` 来遍历属性选项类型 `O` 中的可选属性，并为每个属性生成键值对，其中键是属性的名称，值是通过 `InferPropType<O[K]>` 推断的属性类型，并将值设置为可选的，即 `?`。

通过结合这两个映射类型的结果，我们得到了一个类型，其中包含了从属性选项类型 `O` 中提取出的属性及其类型。必需属性具有非可选的类型，而可选属性具有可选的类型。

这个类型在组件的 `props` 选项中使用，用于推断属性的类型并进行类型检查。同时，IDE（集成开发环境）也可以利用这个类型来提供属性名称和类型的自动补全和提示功能。
 */
export type ExtractPropTypes<O> = {
  // use `keyof Pick<O, RequiredKeys<O>>` instead of `RequiredKeys<O>` to
  // support IDE features
  [K in keyof Pick<O, RequiredKeys<O>>]: InferPropType<O[K]>
} & {
  // use `keyof Pick<O, OptionalKeys<O>>` instead of `OptionalKeys<O>` to
  // support IDE features
  [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>
}
/**
 * `PublicRequiredKeys<T>` 是一个类型，用于从类型 `T` 中提取具有 `required: true` 的属性的键。

它使用了一个映射类型，遍历类型 `T` 的每个属性，并根据属性的值是否具有 `required: true` 来决定是否将该属性的键作为结果的一部分。如果属性的值具有 `required: true`，则将该属性的键保留下来，否则将其标记为 `never`。最后，通过 `[keyof T]` 获取所有保留下来的键。

这个类型可以帮助我们从类型 `T` 中提取具有 `required: true` 的属性的键，以便在需要对这些属性进行特殊处理时使用。例如，在组件的 `props` 选项中，我们可以根据 `PublicRequiredKeys<T>` 来确定哪些属性是必需的，并在类型定义中进行相应的标记或处理。
 */
type PublicRequiredKeys<T> = {
  [K in keyof T]: T[K] extends { required: true } ? K : never
}[keyof T]
/**
 * `PublicOptionalKeys<T>` 是一个类型，用于从类型 `T` 中提取非必需属性的键。

它使用了 `PublicRequiredKeys<T>` 类型来获取具有 `required: true` 的属性的键，并使用 `Exclude` 类型来从类型 `T` 的所有键中排除这些必需属性的键，从而得到非必需属性的键。

这个类型可以帮助我们从类型 `T` 中提取非必需属性的键，以便在需要对这些属性进行特殊处理时使用。例如，在组件的 `props` 选项中，我们可以根据 `PublicOptionalKeys<T>` 来确定哪些属性是非必需的，并在类型定义中进行相应的标记或处理。
 */
type PublicOptionalKeys<T> = Exclude<keyof T, PublicRequiredKeys<T>>

/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **public** - i.e. the expected props that can be
 * passed to component.
 * `ExtractPublicPropTypes<O>` 是一个类型，用于从类型 `O` 中提取公共属性的类型。

它使用了 `PublicRequiredKeys<O>` 类型来获取具有 `required: true` 的属性的键，并使用 `Pick<O, PublicRequiredKeys<O>>` 来从类型 `O` 中选择这些必需属性的子集。然后，使用 `InferPropType<O[K]>` 来获取这些必需属性的推断类型。

类似地，它使用了 `PublicOptionalKeys<O>` 类型来获取非必需属性的键，并使用 `Pick<O, PublicOptionalKeys<O>>` 来从类型 `O` 中选择这些非必需属性的子集。然后，使用 `InferPropType<O[K]>` 来获取这些非必需属性的推断类型，并将它们标记为可选的。

通过使用 `ExtractPublicPropTypes<O>`，我们可以从类型 `O` 中提取公共属性的类型，并在需要时进行相应的类型标记或处理。这对于组件的公共属性类型推断和类型检查非常有用。
 */
export type ExtractPublicPropTypes<O> = {
  [K in keyof Pick<O, PublicRequiredKeys<O>>]: InferPropType<O[K]>
} & {
  [K in keyof Pick<O, PublicOptionalKeys<O>>]?: InferPropType<O[K]>
}
/**
 * `BooleanFlags` 是一个使用 `const enum` 关键字定义的枚举类型。`const enum` 是 TypeScript 中的一种编译时机制，用于在编译过程中直接将枚举值替换为相应的字面量。这意味着在生成的 JavaScript 代码中，不会包含对枚举类型的引用，而是直接使用了相应的数值。

在这个枚举类型中，定义了两个枚举成员：

1. `shouldCast`：表示应该进行类型转换的标志。
2. `shouldCastTrue`：表示应该将布尔值强制转换为 `true` 的标志。

使用 `const enum` 定义枚举类型可以提供更高的性能和更小的代码体积，因为在编译过程中直接替换为字面量，避免了运行时的枚举查找和引用。
 */
const enum BooleanFlags {
  shouldCast,
  shouldCastTrue
}

// extract props which defined with default from prop options
/**
 * `ExtractDefaultPropTypes<O>` 是一个类型定义，用于从给定对象类型 `O` 中提取具有默认值的属性的类型。

如果输入的类型 `O` 是一个对象类型（即 `O extends object`），则会使用 `keyof Pick<O, DefaultKeys<O>>` 来选择 `O` 中具有默认值的属性，并为这些属性创建一个新的类型，其中属性名为键，属性值为相应属性的推断类型（使用 `InferPropType<O[K]>`）。

如果输入的类型 `O` 不是对象类型（即 `O` 不满足 `O extends object`），则返回一个空对象类型 `{}`。

这个类型定义可以用于提取给定对象类型中具有默认值的属性的类型，以便进行类型检查和推断。
 */
export type ExtractDefaultPropTypes<O> = O extends object
  ? // use `keyof Pick<O, DefaultKeys<O>>` instead of `DefaultKeys<O>` to support IDE features
    { [K in keyof Pick<O, DefaultKeys<O>>]: InferPropType<O[K]> }
  : {}
/**
 * `NormalizedProp` 是一个联合类型，表示规范化后的属性选项。

它可以是 `null`，表示属性没有规范化选项。

或者它可以是一个包含以下属性的对象类型：

- `type`：属性的类型。可以是 `PropType`、`true` 或 `null`。
- `required`：属性是否是必需的，一个布尔值。
- `default`：属性的默认值，可以是任意类型。
- `validator`：属性的验证函数，接受一个值并返回一个布尔值。
- `shouldCast`：一个布尔值，表示是否对属性进行类型转换。
- `shouldCastTrue`：一个布尔值，表示是否将属性转换为 `true`。

这个类型定义用于描述规范化后的属性选项，其中包含了常见的属性选项以及一些额外的属性用于进一步处理属性。
 */
type NormalizedProp =
  | null
  | (PropOptions & {
      [BooleanFlags.shouldCast]?: boolean
      [BooleanFlags.shouldCastTrue]?: boolean
    })

// normalized value is a tuple of the actual normalized options
// and an array of prop keys that need value casting (booleans and defaults)
/**
 * `NormalizedProps` 是一个类型别名，表示属性名到规范化属性选项的映射。

它是一个对象类型，每个属性名都映射到一个 `NormalizedProp` 类型的值，用于描述该属性的规范化选项。属性名是字符串类型。

`NormalizedProps` 用于描述一组属性的规范化选项，其中每个属性名都与其对应的规范化属性选项相关联。它可以用于表示组件的属性定义，以及在属性规范化过程中存储和处理属性选项。
 */
export type NormalizedProps = Record<string, NormalizedProp>
/**
 * `NormalizedPropsOptions` 是一个类型别名，表示规范化属性选项的组合。

它是一个元组类型，可以具有两个元素：
1. 第一个元素是 `NormalizedProps` 类型的值，表示属性名到规范化属性选项的映射。
2. 第二个元素是一个字符串数组，表示所有属性名的列表。

如果没有属性定义，则 `NormalizedPropsOptions` 可以是一个空数组 `[]`。

`NormalizedPropsOptions` 用于表示组件的规范化属性选项，其中属性名与其对应的规范化属性选项相关联，并提供属性名列表以进行快速访问。它在属性规范化过程中存储和处理规范化属性选项。
 */
export type NormalizedPropsOptions = [NormalizedProps, string[]] | []
/**
 * 
 * @param instance 
 * @param rawProps 
 * @param isStateful 
 * @param isSSR 
 * 函数 `initProps` 用于初始化组件实例的属性。

它接受以下参数：
- `instance: ComponentInternalInstance`：组件的内部实例对象。
- `rawProps: Data | null`：原始的属性数据对象。
- `isStateful: number`：一个通过位运算进行比较的标志结果，表示组件是否具有状态。
- `isSSR = false`：一个布尔值，表示组件是否在服务器端渲染环境中。

在函数中，首先创建了两个空对象 `props` 和 `attrs`，分别用于存储属性和特性。然后，通过调用 `def` 函数向 `attrs` 对象中添加了一个内部标识符。

接下来，通过调用 `setFullProps` 函数，将原始的属性数据对象 `rawProps` 进行处理，将其解析为规范化的属性并分别存储在 `props` 和 `attrs` 对象中。

然后，使用 `Object.create(null)` 创建了一个空对象 `instance.propsDefaults`，用于存储属性的默认值。

接下来，通过遍历 `instance.propsOptions[0]` 对象中的所有属性键，确保所有声明的属性键都存在于 `props` 对象中，如果不存在，则将其设置为 `undefined`。

在开发环境下，通过调用 `validateProps` 函数对原始属性数据对象 `rawProps` 和规范化的属性对象 `props` 进行验证。

根据 `isStateful` 的值，决定将 `props` 设置为响应式的还是浅响应式的。如果 `isStateful` 为真，则表示组件具有状态，将 `props` 设置为响应式的（或者在服务器端渲染时保持不变），否则根据组件是否具有声明的属性来决定将 `props` 设置为 `attrs` 或 `props`。

最后，将 `attrs` 赋值给 `instance.attrs`，将 `props` 赋值给 `instance.props`，完成属性的初始化过程。
 */
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number, // result of bitwise flag comparison
  isSSR = false
) {
  const props: Data = {}
  const attrs: Data = {}
  def(attrs, InternalObjectKey, 1)

  instance.propsDefaults = Object.create(null)

  setFullProps(instance, rawProps, props, attrs)

  // ensure all declared prop keys are present
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined
    }
  }

  // validation
  if (__DEV__) {
    validateProps(rawProps || {}, props, instance)
  }

  if (isStateful) {
    // stateful
    instance.props = isSSR ? props : shallowReactive(props)
  } else {
    if (!instance.type.props) {
      // functional w/ optional props, props === attrs
      instance.props = attrs
    } else {
      // functional w/ declared props
      instance.props = props
    }
  }
  instance.attrs = attrs
}
/**
 * 
 * @param instance 
 * @returns 
 * 函数 `isInHmrContext` 用于判断组件实例是否处于 HMR（Hot Module Replacement）上下文中。

它接受一个参数 `instance: ComponentInternalInstance | null`，表示要检查的组件实例。

在函数中，使用一个循环来逐级向上遍历组件实例的父级，直到达到顶级组件实例或者找到具有 `__hmrId` 属性的组件类型。

如果找到具有 `__hmrId` 属性的组件类型，则说明该组件实例处于 HMR 上下文中，函数返回 `true`。

如果遍历到顶级组件实例仍然没有找到具有 `__hmrId` 属性的组件类型，则说明该组件实例不处于 HMR 上下文中，函数返回 `false`。
 */
function isInHmrContext(instance: ComponentInternalInstance | null) {
  while (instance) {
    if (instance.type.__hmrId) return true
    instance = instance.parent
  }
}
/**
 * 
 * @param instance 
 * @param rawProps 
 * @param rawPrevProps 
 * @param optimized
 * 函数 `updateProps` 用于更新组件实例的属性。

它接受以下参数：
- `instance: ComponentInternalInstance`：组件实例对象。
- `rawProps: Data | null`：新的原始属性对象。
- `rawPrevProps: Data | null`：先前的原始属性对象。
- `optimized: boolean`：是否进行了优化。

在函数中，首先获取组件实例的属性对象 `props`、属性集合对象 `attrs` 和虚拟节点的 `patchFlag`。

接下来，对于需要进行优化或者存在属性差异的情况，进行增量更新属性。

如果属性的 `patchFlag` 标记为 `PatchFlags.PROPS`，表示需要更新的是编译器生成的属性且属性键没有变化，此时只需设置更新后的属性值。

在更新属性过程中，会判断属性键是否为声明的事件监听器，如果是，则跳过该属性的更新。

如果存在属性选项 `options`，表示组件具有声明的属性，根据属性键的存在与否，分别更新 `attrs` 对象和 `props` 对象。

如果不存在属性选项 `options`，表示组件没有声明的属性，直接更新 `attrs` 对象。

如果属性需要进行完整的更新，调用 `setFullProps` 函数，将新的原始属性对象转换为属性对象和属性集合对象，并返回是否有属性发生变化。

在动态属性的情况下，还会检查是否需要从属性对象中删除属性键。

最后，如果属性集合对象 `attrs` 与先前的属性对象不相等，则触发 `$attrs` 的更新。

如果处于开发环境，会对属性进行验证。

总结来说，`updateProps` 函数根据不同的情况对组件实例的属性进行增量更新或完整更新，并触发相应的更新操作。 
 */
export function updateProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  rawPrevProps: Data | null,
  optimized: boolean
) {
  const {
    props,
    attrs,
    vnode: { patchFlag }
  } = instance
  const rawCurrentProps = toRaw(props)
  const [options] = instance.propsOptions
  let hasAttrsChanged = false

  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(__DEV__ && isInHmrContext(instance)) &&
    (optimized || patchFlag > 0) &&
    !(patchFlag & PatchFlags.FULL_PROPS)
  ) {
    if (patchFlag & PatchFlags.PROPS) {
      // Compiler-generated props & no keys change, just set the updated
      // the props.
      const propsToUpdate = instance.vnode.dynamicProps!
      for (let i = 0; i < propsToUpdate.length; i++) {
        let key = propsToUpdate[i]
        // skip if the prop key is a declared emit event listener
        if (isEmitListener(instance.emitsOptions, key)) {
          continue
        }
        // PROPS flag guarantees rawProps to be non-null
        const value = rawProps![key]
        if (options) {
          // attr / props separation was done on init and will be consistent
          // in this code path, so just check if attrs have it.
          if (hasOwn(attrs, key)) {
            if (value !== attrs[key]) {
              attrs[key] = value
              hasAttrsChanged = true
            }
          } else {
            const camelizedKey = camelize(key)
            props[camelizedKey] = resolvePropValue(
              options,
              rawCurrentProps,
              camelizedKey,
              value,
              instance,
              false /* isAbsent */
            )
          }
        } else {
          if (__COMPAT__) {
            if (isOn(key) && key.endsWith('Native')) {
              key = key.slice(0, -6) // remove Native postfix
            } else if (shouldSkipAttr(key, instance)) {
              continue
            }
          }
          if (value !== attrs[key]) {
            attrs[key] = value
            hasAttrsChanged = true
          }
        }
      }
    }
  } else {
    // full props update.
    if (setFullProps(instance, rawProps, props, attrs)) {
      hasAttrsChanged = true
    }
    // in case of dynamic props, check if we need to delete keys from
    // the props object
    let kebabKey: string
    for (const key in rawCurrentProps) {
      if (
        !rawProps ||
        // for camelCase
        (!hasOwn(rawProps, key) &&
          // it's possible the original props was passed in as kebab-case
          // and converted to camelCase (#955)
          ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))
      ) {
        if (options) {
          if (
            rawPrevProps &&
            // for camelCase
            (rawPrevProps[key] !== undefined ||
              // for kebab-case
              rawPrevProps[kebabKey!] !== undefined)
          ) {
            props[key] = resolvePropValue(
              options,
              rawCurrentProps,
              key,
              undefined,
              instance,
              true /* isAbsent */
            )
          }
        } else {
          delete props[key]
        }
      }
    }
    // in the case of functional component w/o props declaration, props and
    // attrs point to the same object so it should already have been updated.
    if (attrs !== rawCurrentProps) {
      for (const key in attrs) {
        if (
          !rawProps ||
          (!hasOwn(rawProps, key) &&
            (!__COMPAT__ || !hasOwn(rawProps, key + 'Native')))
        ) {
          delete attrs[key]
          hasAttrsChanged = true
        }
      }
    }
  }

  // trigger updates for $attrs in case it's used in component slots
  if (hasAttrsChanged) {
    trigger(instance, TriggerOpTypes.SET, '$attrs')
  }

  if (__DEV__) {
    validateProps(rawProps || {}, props, instance)
  }
}
/**
 * 
 * @param instance 
 * @param rawProps 
 * @param props 
 * @param attrs 
 * @returns 
 * 函数 `setFullProps` 用于进行完整的属性更新。

它接受以下参数：
- `instance: ComponentInternalInstance`：组件实例对象。
- `rawProps: Data | null`：新的原始属性对象。
- `props: Data`：属性对象。
- `attrs: Data`：属性集合对象。

在函数中，首先从组件实例的属性选项中获取属性选项对象 `options` 和需要进行类型转换的属性键数组 `needCastKeys`。

然后定义变量 `hasAttrsChanged` 表示属性集合对象 `attrs` 是否发生变化，以及变量 `rawCastValues` 存储需要进行类型转换的原始属性值。

接下来，对于新的原始属性对象 `rawProps`，遍历其属性键，判断是否为保留属性，如果是，则跳过该属性的处理。

在兼容模式下，如果属性键以 `'onHook:'` 开头，表示是已废弃的实例事件钩子，发出相应的兼容性警告。

如果属性键为 `'inline-template'`，表示内联模板属性，在处理时直接跳过。

然后获取属性键对应的属性值 `value`。

如果存在属性选项 `options`，并且属性选项对象中包含以驼峰形式表示的属性键 `camelKey`，则判断是否需要进行类型转换。
- 如果不需要进行类型转换，则直接将属性值赋值给属性对象 `props` 的相应属性键 `camelKey`。
- 如果需要进行类型转换，则将属性值存储在 `rawCastValues` 对象的相应属性键 `camelKey` 上。

如果属性键不是已声明的属性或已声明的事件，将该属性存储在属性集合对象 `attrs` 中，确保保留属性键的原始大小写，并判断属性值是否发生变化。

在需要进行类型转换的情况下，遍历需要进行类型转换的属性键数组 `needCastKeys`，根据属性选项 `options`、当前属性对象 `rawCurrentProps`、属性键和对应的原始属性值，调用 `resolvePropValue` 函数进行类型转换，并将转换后的值赋值给属性对象 `props` 的相应属性键。

最后，返回标识属性集合对象 `attrs` 是否发生变化的布尔值 `hasAttrsChanged`。

总结来说，`setFullProps` 函数根据新的原始属性对象，对组件实例的属性对象和属性集合对象进行完整的更新，包括处理保留属性、类型转换和判断属性值的变化。
 */
function setFullProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const [options, needCastKeys] = instance.propsOptions
  let hasAttrsChanged = false
  let rawCastValues: Data | undefined
  if (rawProps) {
    for (let key in rawProps) {
      // key, ref are reserved and never passed down
      if (isReservedProp(key)) {
        continue
      }

      if (__COMPAT__) {
        if (key.startsWith('onHook:')) {
          softAssertCompatEnabled(
            DeprecationTypes.INSTANCE_EVENT_HOOKS,
            instance,
            key.slice(2).toLowerCase()
          )
        }
        if (key === 'inline-template') {
          continue
        }
      }

      const value = rawProps[key]
      // prop option names are camelized during normalization, so to support
      // kebab -> camel conversion here we need to camelize the key.
      let camelKey
      if (options && hasOwn(options, (camelKey = camelize(key)))) {
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value
        } else {
          ;(rawCastValues || (rawCastValues = {}))[camelKey] = value
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        // Any non-declared (either as a prop or an emitted event) props are put
        // into a separate `attrs` object for spreading. Make sure to preserve
        // original key casing
        if (__COMPAT__) {
          if (isOn(key) && key.endsWith('Native')) {
            key = key.slice(0, -6) // remove Native postfix
          } else if (shouldSkipAttr(key, instance)) {
            continue
          }
        }
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value
          hasAttrsChanged = true
        }
      }
    }
  }

  if (needCastKeys) {
    const rawCurrentProps = toRaw(props)
    const castValues = rawCastValues || EMPTY_OBJ
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i]
      props[key] = resolvePropValue(
        options!,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      )
    }
  }

  return hasAttrsChanged
}/**
 * 
 * @param options 
 * @param props 
 * @param key 
 * @param value 
 * @param instance 
 * @param isAbsent 
 * @returns 
 * 函数 `resolvePropValue` 用于解析属性值，并根据属性选项进行默认值设置和布尔类型转换。

它接受以下参数：
- `options: NormalizedProps`：规范化的属性选项对象。
- `props: Data`：属性对象。
- `key: string`：属性键。
- `value: unknown`：属性值。
- `instance: ComponentInternalInstance`：组件实例对象。
- `isAbsent: boolean`：属性值是否缺失的标志。

在函数中，首先从属性选项对象 `options` 中获取属性键 `key` 对应的属性选项 `opt`。

如果属性选项 `opt` 不为 `null`，则判断属性选项中是否存在默认值 `default`。
- 如果存在默认值，并且属性值 `value` 为 `undefined`，则获取默认值 `defaultValue`。
  - 如果属性选项的类型 `type` 不是函数，并且属性选项中未设置 `skipFactory`，并且默认值 `defaultValue` 是一个函数，则执行以下操作：
    - 获取组件实例对象的 `propsDefaults` 属性，该属性存储了属性的默认值。
    - 判断属性键 `key` 是否已存在于 `propsDefaults` 中，如果是，则将默认值赋值给 `value`。
    - 否则，设置当前的组件实例对象为活动实例，并执行以下操作：
      - 将属性默认值添加到 `propsDefaults` 中，并将默认值赋值给 `value`。
      - 如果处于兼容模式，并且启用了 `DeprecationTypes.PROPS_DEFAULT_THIS` 类型的兼容性检查，创建属性默认值的上下文对象 `createPropsDefaultThis`。
      - 调用默认值函数 `defaultValue`，传递上下文对象和属性对象 `props`，并将返回的结果赋值给 `value`。
      - 恢复当前的组件实例对象为原先的活动实例。
  - 否则，将默认值 `defaultValue` 赋值给 `value`。

如果属性选项中存在布尔类型转换的标志 `BooleanFlags.shouldCast`，执行以下操作：
- 如果属性值缺失（`isAbsent` 为 `true`）且没有设置默认值，则将属性值 `value` 设置为 `false`。
- 否则，如果属性选项中存在布尔类型转换为 `true` 的标志 `BooleanFlags.shouldCastTrue`，并且属性值 `value` 为 `''` 或与属性键 `key` 的连字符形式相等，则将属性值 `value` 设置为 `true`。

最后，返回处理后的属性值 `value`。

总结来说，`resolvePropValue` 函数根据属性选项对象 `options`，对属性值进行解析，包括设置默认值和进行布尔类型转换。它在设置默认值时会考虑属性选项中的类型、默认值函数和兼容性设置，并根据布尔类型转换的标志进行相应的转换操作。
 */
function resolvePropValue(
  options: NormalizedProps,
  props: Data,
  key: string,
  value: unknown,
  instance: ComponentInternalInstance,
  isAbsent: boolean
) {
  const opt = options[key]
  if (opt != null) {
    const hasDefault = hasOwn(opt, 'default')
    // default values
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default
      if (
        opt.type !== Function &&
        !opt.skipFactory &&
        isFunction(defaultValue)
      ) {
        const { propsDefaults } = instance
        if (key in propsDefaults) {
          value = propsDefaults[key]
        } else {
          setCurrentInstance(instance)
          value = propsDefaults[key] = defaultValue.call(
            __COMPAT__ &&
              isCompatEnabled(DeprecationTypes.PROPS_DEFAULT_THIS, instance)
              ? createPropsDefaultThis(instance, props, key)
              : null,
            props
          )
          unsetCurrentInstance()
        }
      } else {
        value = defaultValue
      }
    }
    // boolean casting
    if (opt[BooleanFlags.shouldCast]) {
      if (isAbsent && !hasDefault) {
        value = false
      } else if (
        opt[BooleanFlags.shouldCastTrue] &&
        (value === '' || value === hyphenate(key))
      ) {
        value = true
      }
    }
  }
  return value
}
/**
 * 
 * @param comp 
 * @param appContext 
 * @param asMixin 
 * @returns 
 * 函数 `normalizePropsOptions` 用于规范化组件的属性选项。

它接受以下参数：
- `comp: ConcreteComponent`：具体的组件对象。
- `appContext: AppContext`：应用程序上下文对象。
- `asMixin: boolean`：是否作为混入属性选项。

在函数内部，首先从应用程序上下文的属性缓存 `propsCache` 中获取组件 `comp` 的缓存结果 `cached`。如果缓存存在，则直接返回缓存结果。

如果缓存不存在，则获取组件的原始属性选项 `raw`，并初始化规范化的属性选项对象 `normalized` 和需要进行类型转换的属性键数组 `needCastKeys`。

接下来，根据不同情况应用混入属性选项或扩展属性选项：
- 如果支持选项 API（`__FEATURE_OPTIONS_API__` 为真值）且组件 `comp` 不是函数（即不是函数式组件），则执行以下操作：
  - 定义一个函数 `extendProps`，用于将原始属性选项 `raw` 规范化并应用到 `normalized` 和 `needCastKeys` 中。
  - 如果 `asMixin` 为假值且应用程序上下文中存在混入选项 `mixins`，则遍历每个混入选项，并调用 `extendProps` 函数。
  - 如果组件 `comp` 存在扩展选项 `extends`，则调用 `extendProps` 函数。
  - 如果组件 `comp` 存在混入选项 `mixins`，则遍历每个混入选项，并调用 `extendProps` 函数。
- 如果原始属性选项 `raw` 不存在且不存在扩展选项，即组件 `comp` 既不是数组也不是对象，则将组件 `comp` 缓存为空数组并返回。

然后，根据原始属性选项 `raw` 的类型进行处理：
- 如果 `raw` 是数组，则遍历数组元素，并将每个元素转为驼峰命名的字符串作为规范化后的属性键，添加到 `normalized` 中。
- 如果 `raw` 是对象，则遍历对象的键，并将每个键转为驼峰命名的字符串作为规范化后的属性键，添加到 `normalized` 中。同时，对于每个属性键，将其对应的属性选项 `opt` 进行处理：
  - 如果 `opt` 是数组或函数，则将其作为类型属性 `type` 创建一个规范化的属性对象 `prop`。
  - 否则，将 `opt` 复制到 `prop` 中，并将其作为规范化的属性对象。
  - 如果 `prop` 存在，则根据属性选项的类型，判断是否需要进行布尔类型转换，并将转换的标志设置到属性对象的 `BooleanFlags.shouldCast` 和 `BooleanFlags.shouldCastTrue` 中。如果属性选项具有布尔类型转换或默认值，则将属性键添加到 `needCastKeys` 中。

最后，将规

范化的属性选项 `normalized` 和需要进行类型转换的属性键数组 `needCastKeys` 组成结果数组 `res`。如果组件 `comp` 是对象，则将结果数组缓存到属性缓存 `propsCache` 中，并返回结果数组。否则，直接返回结果数组。

总结来说，`normalizePropsOptions` 函数用于规范化组件的属性选项。它根据组件的原始属性选项，将属性键转为驼峰命名形式，并处理属性选项的类型转换和默认值设置。它还支持应用混入属性选项和扩展属性选项，并通过缓存提高性能。
 */
export function normalizePropsOptions(
  comp: ConcreteComponent,
  appContext: AppContext,
  asMixin = false
): NormalizedPropsOptions {
  const cache = appContext.propsCache
  const cached = cache.get(comp)
  if (cached) {
    return cached
  }

  const raw = comp.props
  const normalized: NormalizedPropsOptions[0] = {}
  const needCastKeys: NormalizedPropsOptions[1] = []

  // apply mixin/extends props
  let hasExtends = false
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendProps = (raw: ComponentOptions) => {
      if (__COMPAT__ && isFunction(raw)) {
        raw = raw.options
      }
      hasExtends = true
      const [props, keys] = normalizePropsOptions(raw, appContext, true)
      extend(normalized, props)
      if (keys) needCastKeys.push(...keys)
    }
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendProps)
    }
    if (comp.extends) {
      extendProps(comp.extends)
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendProps)
    }
  }

  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, EMPTY_ARR as any)
    }
    return EMPTY_ARR as any
  }

  if (isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      if (__DEV__ && !isString(raw[i])) {
        warn(`props must be strings when using array syntax.`, raw[i])
      }
      const normalizedKey = camelize(raw[i])
      if (validatePropName(normalizedKey)) {
        normalized[normalizedKey] = EMPTY_OBJ
      }
    }
  } else if (raw) {
    if (__DEV__ && !isObject(raw)) {
      warn(`invalid props options`, raw)
    }
    for (const key in raw) {
      const normalizedKey = camelize(key)
      if (validatePropName(normalizedKey)) {
        const opt = raw[key]
        const prop: NormalizedProp = (normalized[normalizedKey] =
          isArray(opt) || isFunction(opt) ? { type: opt } : extend({}, opt))
        if (prop) {
          const booleanIndex = getTypeIndex(Boolean, prop.type)
          const stringIndex = getTypeIndex(String, prop.type)
          prop[BooleanFlags.shouldCast] = booleanIndex > -1
          prop[BooleanFlags.shouldCastTrue] =
            stringIndex < 0 || booleanIndex < stringIndex
          // if the prop needs boolean casting or default value
          if (booleanIndex > -1 || hasOwn(prop, 'default')) {
            needCastKeys.push(normalizedKey)
          }
        }
      }
    }
  }

  const res: NormalizedPropsOptions = [normalized, needCastKeys]
  if (isObject(comp)) {
    cache.set(comp, res)
  }
  return res
}
/**
 * 
 * @param key 
 * @returns 
 * 函数 `validatePropName` 用于验证属性名称是否有效。

它接受一个参数 `key`，表示待验证的属性名称。

函数首先检查属性名称 `key` 的第一个字符是否为 `$`，如果不是，则说明属性名称有效，直接返回 `true`。

如果属性名称的第一个字符为 `$`，则根据开发环境是否为开发模式（`__DEV__` 的值）进行不同的处理：
- 如果是开发模式，则使用 `warn` 函数发出警告，提示属性名称是一个保留属性。
- 如果不是开发模式，则直接返回 `false`，表示属性名称无效。

综上所述，`validatePropName` 函数用于验证属性名称是否有效。如果属性名称的第一个字符不是 `$`，则认为属性名称有效。如果属性名称的第一个字符是 `$`，且处于开发模式下，则发出警告，否则认为属性名称无效。
 */
function validatePropName(key: string) {
  if (key[0] !== '$') {
    return true
  } else if (__DEV__) {
    warn(`Invalid prop name: "${key}" is a reserved property.`)
  }
  return false
}

// use function string name to check type constructors
// so that it works across vms / iframes.
/**
 * 
 * @param ctor 
 * @returns 
 * 函数 `getType` 用于获取属性类型的名称。

它接受一个参数 `ctor`，表示属性类型的构造函数。

函数首先使用正则表达式匹配构造函数的字符串表示，提取其中的类型名称。具体而言，它使用正则表达式 `/^\s*(function|class) (\w+)/` 对构造函数的字符串进行匹配。

- 如果匹配成功（即 `match` 不为 `null`），则返回匹配结果的第二个捕获组，即类型名称。
- 如果匹配不成功，且构造函数为 `null`，则返回字符串 `'null'`。
- 如果匹配不成功且构造函数不为 `null`，则返回空字符串 `''`。

综上所述，`getType` 函数用于从构造函数中获取属性类型的名称，如果无法获取，则返回空字符串或 `'null'`。
 */
function getType(ctor: Prop<any>): string {
  const match = ctor && ctor.toString().match(/^\s*(function|class) (\w+)/)
  return match ? match[2] : ctor === null ? 'null' : ''
}
/**
 * 
 * @param a 
 * @param b 
 * @returns 
 * 函数 `isSameType` 用于比较两个属性的类型是否相同。

它接受两个参数 `a` 和 `b`，分别表示要比较的两个属性。

函数首先使用 `getType` 函数获取属性 `a` 的类型名称，并将其与属性 `b` 的类型名称进行比较。

- 如果两个类型名称相同，则返回 `true`，表示两个属性的类型相同。
- 如果类型名称不同，则返回 `false`，表示两个属性的类型不同。

因此，`isSameType` 函数用于判断两个属性的类型是否相同。
 */
function isSameType(a: Prop<any>, b: Prop<any>): boolean {
  return getType(a) === getType(b)
}
/**
 * 
 * @param type 
 * @param expectedTypes 
 * @returns 
 * 函数 `getTypeIndex` 用于获取属性类型在期望类型数组中的索引。

它接受两个参数 `type` 和 `expectedTypes`，分别表示要查找的属性类型和期望类型数组。

函数首先检查 `expectedTypes` 是否为数组类型，如果是，则使用 `findIndex` 方法遍历数组，查找与 `type` 相同的属性类型。如果找到匹配的类型，则返回该类型在数组中的索引值。

如果 `expectedTypes` 不是数组类型，那么它可能是函数类型或其他无效值。在这种情况下，函数会使用 `isSameType` 函数比较 `type` 和 `expectedTypes` 是否相同。如果两者相同，则返回索引值 0，表示匹配成功，否则返回 -1，表示匹配失败。

因此，`getTypeIndex` 函数可用于确定属性类型在期望类型数组中的位置索引。如果返回值为 -1，则表示属性类型与期望类型数组中的任何类型都不匹配。如果返回值为非负数，则表示属性类型与期望类型数组中的某个类型匹配，并返回该类型在数组中的索引。
 */
function getTypeIndex(
  type: Prop<any>,
  expectedTypes: PropType<any> | void | null | true
): number {
  if (isArray(expectedTypes)) {
    return expectedTypes.findIndex(t => isSameType(t, type))
  } else if (isFunction(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }
  return -1
}

/**
 * dev only
 * `validateProps` 函数用于根据定义的选项验证组件的 props。

它接受三个参数：`rawProps`、`props` 和 `instance`。`rawProps` 表示传递给组件的原始 props，`props` 表示组件的解析后的 props，`instance` 是组件的内部实例。

该函数首先通过在 `props` 对象上使用 `toRaw` 函数获取解析后的 props 的值。`toRaw` 函数返回原始的、没有任何响应性或代理行为的对象。

接下来，它从 `instance.propsOptions` 数组中获取 props 的选项。选项包含每个 prop 的定义和约束。

然后，函数使用 `for...in` 循环迭代每个 prop 选项。对于每个 prop 选项，它从 `resolvedValues` 对象中获取相应的解析值。

对于每个 prop 选项，调用 `validateProp` 函数，传递 prop 键、解析值、prop 选项以及一个布尔值，指示 `rawProps` 中是否缺少该 prop。`validateProp` 函数执行实际的验证，如果 prop 值不满足指定的要求，则可能抛出错误或发出警告。

总体而言，`validateProps` 函数用于验证组件的 props 是否符合其定义的选项。
 */
function validateProps(
  rawProps: Data,
  props: Data,
  instance: ComponentInternalInstance
) {
  const resolvedValues = toRaw(props)
  const options = instance.propsOptions[0]
  for (const key in options) {
    let opt = options[key]
    if (opt == null) continue
    validateProp(
      key,
      resolvedValues[key],
      opt,
      !hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key))
    )
  }
}

/**
 * dev only
 * `validateProp` 函数用于验证单个 prop 的值是否符合其定义的选项。

它接受四个参数：`name` 表示 prop 的名称，`value` 表示 prop 的值，`prop` 表示 prop 的选项，`isAbsent` 是一个布尔值，指示 prop 在传递的原始 props 中是否缺失。

函数首先从 prop 的选项中解构出 `type`、`required`、`validator` 和 `skipCheck`。

接下来，它处理两种情况：`required` 为 `true` 且 prop 缺失，以及 prop 值为 `null` 或 `undefined` 但不是必需的。

如果 `required` 为 `true` 且 prop 缺失，则发出警告，指示缺少必需的 prop。

如果 prop 值为 `null` 或 `undefined` 但不是必需的，则直接返回，表示通过验证。

然后，函数执行类型检查。如果 `type` 存在且不为 `true`，并且没有设置 `skipCheck`，则执行类型检查。

首先，它确定要检查的类型数组，如果 `type` 是数组，则直接使用它，否则将 `type` 放入一个数组中。

接下来，函数迭代类型数组中的每个类型，调用 `assertType` 函数进行类型断言。`assertType` 函数将 prop 值和当前类型作为参数，并返回一个对象，其中包含 `valid` 字段表示类型是否匹配，以及 `expectedType` 字段表示预期的类型。

如果存在至少一个类型与 prop 值匹配，那么将 `isValid` 设置为 `true`，表示通过类型检查。

如果没有找到匹配的类型，则发出警告，指示 prop 的类型不正确，并提供预期的类型列表。

最后，如果定义了 `validator` 函数，并且该函数返回 `false`，则发出警告，指示自定义验证器检查失败。

总体而言，`validateProp` 函数用于验证单个 prop 的值是否符合其定义的选项，包括必需性、类型检查和自定义验证器。
 */
function validateProp(
  name: string,
  value: unknown,
  prop: PropOptions,
  isAbsent: boolean
) {
  const { type, required, validator, skipCheck } = prop
  // required!
  if (required && isAbsent) {
    warn('Missing required prop: "' + name + '"')
    return
  }
  // missing but optional
  if (value == null && !required) {
    return
  }
  // type check
  if (type != null && type !== true && !skipCheck) {
    let isValid = false
    const types = isArray(type) ? type : [type]
    const expectedTypes = []
    // value is valid as long as one of the specified types match
    for (let i = 0; i < types.length && !isValid; i++) {
      const { valid, expectedType } = assertType(value, types[i])
      expectedTypes.push(expectedType || '')
      isValid = valid
    }
    if (!isValid) {
      warn(getInvalidTypeMessage(name, value, expectedTypes))
      return
    }
  }
  // custom validator
  if (validator && !validator(value)) {
    warn('Invalid prop: custom validator check failed for prop "' + name + '".')
  }
}

const isSimpleType = /*#__PURE__*/ makeMap(
  'String,Number,Boolean,Function,Symbol,BigInt'
)
/**
 * `AssertionResult` 是一个类型，表示类型断言的结果。

它具有两个属性：

- `valid`：表示类型断言是否成功，是一个布尔值。如果为 `true`，则表示 prop 的值符合预期的类型；如果为 `false`，则表示 prop 的值不符合预期的类型。
- `expectedType`：表示预期的类型，是一个字符串。如果类型断言失败，该属性将提供预期的类型信息，以便在警告中使用。

通过检查 `valid` 属性可以确定类型断言是否成功，而通过访问 `expectedType` 属性可以获取预期的类型信息，用于生成警告或错误消息。
 */
type AssertionResult = {
  valid: boolean
  expectedType: string
}

/**
 * dev only
 * `assertType` 函数用于执行类型断言，判断给定的值 `value` 是否符合预期的类型 `type`。

它首先通过调用 `getType` 函数获取预期类型的字符串表示，并将其存储在 `expectedType` 变量中。然后，根据预期类型的不同，执行相应的类型检查。

- 如果预期类型是简单类型（例如 string、number、boolean），则使用 `typeof` 运算符检查值的类型与预期类型是否匹配。如果匹配，则将 `valid` 设置为 `true`。对于原始包装对象（如 String、Number、Boolean），如果值是该包装对象的实例，则也将 `valid` 设置为 `true`。
- 如果预期类型是 `'Object'`，则使用 `isObject` 函数检查值是否为对象类型。
- 如果预期类型是 `'Array'`，则使用 `isArray` 函数检查值是否为数组类型。
- 如果预期类型是 `'null'`，则直接检查值是否为 `null`。
- 否则，通过使用 `instanceof` 运算符检查值是否是预期类型的实例。

最后，将结果封装为一个对象，包含 `valid` 和 `expectedType` 属性，并返回该对象作为类型断言的结果。`valid` 表示类型断言的结果是否有效，`expectedType` 存储预期的类型信息。
 */
function assertType(value: unknown, type: PropConstructor): AssertionResult {
  let valid
  const expectedType = getType(type)
  if (isSimpleType(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isObject(value)
  } else if (expectedType === 'Array') {
    valid = isArray(value)
  } else if (expectedType === 'null') {
    valid = value === null
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * dev only
 * `getInvalidTypeMessage` 函数用于生成类型不匹配的错误消息。它接收以下参数：

- `name`：属性的名称。
- `value`：属性的实际值。
- `expectedTypes`：属性的预期类型数组。

函数首先构建一个基本的错误消息字符串，包含属性名称和预期类型的信息。通过使用 `Array.map` 将预期类型的每个元素转换为大写字母开头的形式，并使用 `|` 分隔符连接它们。

然后，函数比较预期类型数组的长度。如果只有一个预期类型，并且该类型是可以解释的，并且实际类型不是布尔类型，则将预期值添加到错误消息中。它使用 `styleValue` 函数对预期值和实际值进行格式化，以便更好地呈现。

接下来，函数将实际类型添加到错误消息中，使用 `toRawType` 函数获取实际值的类型，并将其连接到错误消息字符串中。

最后，函数检查实际值的类型是否可以解释，如果是，则将实际值添加到错误消息中。

最终，函数返回生成的错误消息字符串。该错误消息指示了属性名称、预期类型以及实际值的类型和值。
 */
function getInvalidTypeMessage(
  name: string,
  value: unknown,
  expectedTypes: string[]
): string {
  let message =
    `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(' | ')}`
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  const expectedValue = styleValue(value, expectedType)
  const receivedValue = styleValue(value, receivedType)
  // check if we need to specify expected value
  if (
    expectedTypes.length === 1 &&
    isExplicable(expectedType) &&
    !isBoolean(expectedType, receivedType)
  ) {
    message += ` with value ${expectedValue}`
  }
  message += `, got ${receivedType} `
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`
  }
  return message
}

/**
 * dev only
 * `styleValue` 函数用于对属性值进行格式化，以便在错误消息中更好地呈现。它接收以下参数：

- `value`：属性的实际值。
- `type`：属性的类型。

函数根据属性的类型来格式化属性值。如果类型为字符串（`String`），则将属性值用双引号括起来返回。如果类型为数字（`Number`），则将属性值转换为数字，并返回字符串形式的数字。对于其他类型，函数直接返回属性值的字符串表示。

这样，`styleValue` 函数根据属性的类型对属性值进行格式化，以便在错误消息中以适当的方式呈现属性值。
 */
function styleValue(value: unknown, type: string): string {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

/**
 * dev only
 * `isExplicable` 函数用于确定属性类型是否属于可解释的类型。它接收以下参数：

- `type`：属性的类型。

函数会将属性类型转换为小写，并将其与预定义的可解释类型（字符串、数字、布尔值）进行比较。如果属性类型与可解释类型之一匹配，则返回 `true`，否则返回 `false`。

这样，`isExplicable` 函数可以判断属性类型是否属于可解释的类型，用于在错误消息中决定是否需要指定属性值。
 */
function isExplicable(type: string): boolean {
  const explicitTypes = ['string', 'number', 'boolean']
  return explicitTypes.some(elem => type.toLowerCase() === elem)
}

/**
 * dev only
 * `isBoolean` 函数用于确定传入的参数是否包含布尔类型。它接收以下参数：

- `...args`：一个或多个参数。

函数会将每个参数转换为小写，并将其与字符串 "boolean" 进行比较。如果其中任何一个参数与 "boolean" 匹配，则返回 `true`，否则返回 `false`。

这样，`isBoolean` 函数可以判断参数列表中是否包含布尔类型，用于在错误消息中决定是否需要指定接收到的值。
 */
function isBoolean(...args: string[]): boolean {
  return args.some(elem => elem.toLowerCase() === 'boolean')
}
