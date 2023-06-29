import {
  isArray,
  isPromise,
  isFunction,
  Prettify,
  UnionToIntersection,
  extend
} from '@vue/shared'
import {
  getCurrentInstance,
  setCurrentInstance,
  SetupContext,
  createSetupContext,
  unsetCurrentInstance
} from './component'
import { EmitFn, EmitsOptions, ObjectEmitsOptions } from './componentEmits'
import {
  ComponentOptionsMixin,
  ComponentOptionsWithoutProps,
  ComputedOptions,
  MethodOptions
} from './componentOptions'
import {
  ComponentPropsOptions,
  ComponentObjectPropsOptions,
  ExtractPropTypes,
  NormalizedProps,
  PropOptions
} from './componentProps'
import { warn } from './warning'
import { SlotsType, StrictUnwrapSlotsType } from './componentSlots'
import { Ref, ref } from '@vue/reactivity'
import { watch } from './apiWatch'

// dev only
const warnRuntimeUsage = (method: string) =>
  warn(
    `${method}() is a compiler-hint helper that is only usable inside ` +
      `<script setup> of a single file component. Its arguments should be ` +
      `compiled away and passing it at runtime has no effect.`
  )

/**
 * Vue `<script setup>` compiler macro for declaring component props. The
 * expected argument is the same as the component `props` option.
 *
 * Example runtime declaration:
 * ```js
 * // using Array syntax
 * const props = defineProps(['foo', 'bar'])
 * // using Object syntax
 * const props = defineProps({
 *   foo: String,
 *   bar: {
 *     type: Number,
 *     required: true
 *   }
 * })
 * ```
 *
 * Equivalent type-based declaration:
 * ```ts
 * // will be compiled into equivalent runtime declarations
 * const props = defineProps<{
 *   foo?: string
 *   bar: number
 * }>()
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits}
 * ```
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 * `defineProps` 是一个函数，用于定义组件的 props 属性。

`defineProps` 支持多种重载形式：

1. `defineProps(props: PropNames[]): Prettify<Readonly<{ [key in PropNames]?: any }>>`：
   接受一个字符串数组 `props`，表示 prop 的名称集合。返回一个类型为 `Readonly<{ [key in PropNames]?: any }> ` 的 props 对象。

2. `defineProps<PP extends ComponentObjectPropsOptions>(props: PP): Prettify<Readonly<ExtractPropTypes<PP>>>`：
   接受一个 ComponentObjectPropsOptions 对象 `props`，表示以对象方式定义的 props。返回一个类型为 `Readonly<ExtractPropTypes<PP>>` 的 props 对象。

3. `defineProps<TypeProps>(): DefineProps<TypeProps, BooleanKey<TypeProps>>`：
   不传入任何参数，通过类型推断得到组件的 props 类型，并返回一个 `DefineProps` 类型的对象。

在实现上，`defineProps` 函数内部会根据开发环境进行警告提示，并返回 `null`。实际上，在 Vue 3 中，这个函数的返回值并不会被使用，而是通过编译器进行 props 类型的推断和验证。
 */
// overload 1: runtime props w/ array
export function defineProps<PropNames extends string = string>(
  props: PropNames[]
): Prettify<Readonly<{ [key in PropNames]?: any }>>
// overload 2: runtime props w/ object
export function defineProps<
  PP extends ComponentObjectPropsOptions = ComponentObjectPropsOptions
>(props: PP): Prettify<Readonly<ExtractPropTypes<PP>>>
// overload 3: typed-based declaration
export function defineProps<TypeProps>(): DefineProps<
  TypeProps,
  BooleanKey<TypeProps>
>
// implementation
export function defineProps() {
  if (__DEV__) {
    warnRuntimeUsage(`defineProps`)
  }
  return null as any
}
/**
 * `DefineProps` 是一个类型别名，用于定义组件的 props 类型。

`DefineProps<T, BKeys extends keyof T>` 接受两个泛型参数：

- `T` 表示组件的 props 类型，可以是一个对象类型。
- `BKeys` 是 `T` 中的属性键的子集，用于表示哪些属性是布尔类型的。

`DefineProps` 的结果是一个由 `T` 构建的只读对象类型，同时该对象类型中的 `BKeys` 属性会被强制转换为布尔类型。也就是说，除了继承 `T` 中的所有属性并保持只读外，`BKeys` 属性会被定义为必选的布尔类型。

这个类型别名的作用是为组件的 props 提供一个更具体和严格的类型定义，以便在编写组件时能够更好地推断和验证 props 的类型。
 */
type DefineProps<T, BKeys extends keyof T> = Readonly<T> & {
  readonly [K in BKeys]-?: boolean
}
/**
 * `BooleanKey<T, K extends keyof T = keyof T>` 是一个类型别名，用于从对象类型 `T` 中提取布尔属性键。

该类型别名接受两个泛型参数：

- `T` 表示对象类型，用于提取布尔属性键。
- `K` 是 `T` 中属性键的子集，默认为 `keyof T`，表示所有属性键。

`BooleanKey` 的结果是一个联合类型，其中包含了 `T` 中所有值为布尔类型或未定义的属性键。具体来说，对于 `T` 中的每个属性键 `K`，如果其对应的属性值是布尔类型或未定义，则将 `K` 添加到联合类型中；否则，将其排除。

这个类型别名的作用是帮助从对象类型中筛选出布尔属性键，以便在需要对布尔类型的属性进行特殊处理时使用。
 */
type BooleanKey<T, K extends keyof T = keyof T> = K extends any
  ? [T[K]] extends [boolean | undefined]
    ? K
    : never
  : never

/**
 * Vue `<script setup>` compiler macro for declaring a component's emitted
 * events. The expected argument is the same as the component `emits` option.
 *
 * Example runtime declaration:
 * ```js
 * const emit = defineEmits(['change', 'update'])
 * ```
 *
 * Example type-based declaration:
 * ```ts
 * const emit = defineEmits<{
 *   (event: 'change'): void
 *   (event: 'update', id: number): void
 * }>()
 *
 * emit('change')
 * emit('update', 1)
 * ```
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits}
 * `defineEmits` 是一个函数，用于定义组件的事件类型和事件触发函数。

函数的签名如下：

```typescript
function defineEmits<EE extends string = string>(
  emitOptions: EE[]
): EmitFn<EE[]>
function defineEmits<E extends EmitsOptions = EmitsOptions>(
  emitOptions: E
): EmitFn<E>
function defineEmits<
  T extends ((...args: any[]) => any) | Record<string, any[]>
>(): T extends (...args: any[]) => any ? T : ShortEmits<T>
```

该函数有多个重载，根据传入的参数类型来确定返回类型。

- 第一个重载接受一个字符串数组 `emitOptions`，表示组件支持的事件名称列表。返回类型为 `EmitFn<EE[]>`，表示一个事件触发函数，可以触发指定的事件并传递参数。

- 第二个重载接受一个 `EmitsOptions` 类型的对象 `emitOptions`，表示组件的事件类型。`EmitsOptions` 是一个映射类型，其中键是事件名称，值是事件触发时接受的参数类型。返回类型为 `EmitFn<E>`，表示一个事件触发函数，可以触发指定的事件并传递相应的参数。

- 第三个重载是一个类型声明，根据传入的参数类型 `T` 来确定返回类型。如果 `T` 是一个函数类型，则返回 `T`；否则，返回 `ShortEmits<T>`。`ShortEmits<T>` 是一个条件类型，用于从传入的类型中提取事件触发函数类型。

在实现中，如果函数被调用，会发出一个警告提示，告知开发者在运行时使用了 `defineEmits`。然后返回 `null`，类型为 `any`。
 */
// overload 1: runtime emits w/ array
export function defineEmits<EE extends string = string>(
  emitOptions: EE[]
): EmitFn<EE[]>
export function defineEmits<E extends EmitsOptions = EmitsOptions>(
  emitOptions: E
): EmitFn<E>
export function defineEmits<
  T extends ((...args: any[]) => any) | Record<string, any[]>
>(): T extends (...args: any[]) => any ? T : ShortEmits<T>
// implementation
export function defineEmits() {
  if (__DEV__) {
    warnRuntimeUsage(`defineEmits`)
  }
  return null as any
}
/**
 * `RecordToUnion` 是一个类型别名，用于将具有字符串键的记录类型转换为联合类型。

类型签名如下：

```typescript
type RecordToUnion<T extends Record<string, any>> = T[keyof T];
```

给定一个具有字符串键的记录类型 `T`，`RecordToUnion<T>` 将返回 `T` 中所有值的联合类型。它使用了索引类型查询 `keyof T` 来获取 `T` 中的所有键，并通过 `T[keyof T]` 来获取对应键的值。这样就将所有值组合为一个联合类型。

例如，如果有以下记录类型：

```typescript
type Colors = {
  red: string;
  blue: string;
  green: string;
};

type ColorUnion = RecordToUnion<Colors>;
```

则 `ColorUnion` 的类型将为 `"red" | "blue" | "green"`，表示该记录类型中所有值的联合类型。
 */
type RecordToUnion<T extends Record<string, any>> = T[keyof T]
/**
 * `ShortEmits` 是一个类型别名，用于将具有字符串键的记录类型中的值转换为函数类型，并将这些函数类型合并为一个交叉类型。

类型签名如下：

```typescript
type ShortEmits<T extends Record<string, any>> = UnionToIntersection<
  RecordToUnion<{
    [K in keyof T]: (evt: K, ...args: T[K]) => void
  }>
>;
```

给定一个具有字符串键的记录类型 `T`，`ShortEmits<T>` 将遍历 `T` 中的每个键，并将其作为事件名称，并将对应的值转换为一个函数类型 `(evt: K, ...args: T[K]) => void`。然后，使用 `RecordToUnion` 将所有函数类型的值合并为一个联合类型。最后，使用 `UnionToIntersection` 将联合类型转换为交叉类型。

这样做的目的是将事件名称和函数类型合并为一个交叉类型，以便可以同时处理多个事件和对应的处理函数。

例如，如果有以下记录类型：

```typescript
type Events = {
  click: [MouseEvent];
  keydown: [KeyboardEvent];
  resize: [];
};

type EventHandlers = ShortEmits<Events>;
```

则 `EventHandlers` 的类型将为 `(evt: "click", ...args: [MouseEvent]) => void & (evt: "keydown", ...args: [KeyboardEvent]) => void & (evt: "resize", ...args: []) => void`，表示该记录类型中所有事件和对应的处理函数的交叉类型。
 */
type ShortEmits<T extends Record<string, any>> = UnionToIntersection<
  RecordToUnion<{
    [K in keyof T]: (evt: K, ...args: T[K]) => void
  }>
>

/**
 * Vue `<script setup>` compiler macro for declaring a component's exposed
 * instance properties when it is accessed by a parent component via template
 * refs.
 *
 * `<script setup>` components are closed by default - i.e. variables inside
 * the `<script setup>` scope is not exposed to parent unless explicitly exposed
 * via `defineExpose`.
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineexpose}
 * `defineExpose` 是一个函数，用于在组件实例中公开一组属性或方法。

类型签名如下：

```typescript
export function defineExpose<Exposed extends Record<string, any> = Record<string, any>>(
  exposed?: Exposed
): void;
```

该函数接受一个可选的 `exposed` 参数，该参数是一个具有字符串键的记录类型，用于定义要公开的属性或方法。

在函数的实现中，如果处于开发环境 (`__DEV__` 为真)，则会发出一个警告提示，提醒开发者在运行时使用了 `defineExpose`。

这个函数的作用是让开发者有选择地将一些属性或方法暴露给父组件或外部使用。通过调用 `defineExpose` 并传入相应的属性或方法，这些属性或方法就可以被父组件或外部通过组件实例访问到。

例如：

```typescript
import { defineExpose } from 'vue';

export default {
  setup() {
    const data = 'Hello, world!';
    const method = () => {
      console.log('Method called');
    };

    defineExpose({
      data,
      method,
    });

    // ...
  },
};
```

在上述代码中，通过调用 `defineExpose` 并传入一个具有 `data` 和 `method` 属性的对象，这些属性就可以被父组件或外部访问到。
 */
export function defineExpose<
  Exposed extends Record<string, any> = Record<string, any>
>(exposed?: Exposed) {
  if (__DEV__) {
    warnRuntimeUsage(`defineExpose`)
  }
}

/**
 * Vue `<script setup>` compiler macro for declaring a component's additional
 * options. This should be used only for options that cannot be expressed via
 * Composition API - e.g. `inheritAttrs`.
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineoptions}
 * `defineOptions` 是一个函数，用于定义组件的选项。

类型签名如下：

```typescript
export function defineOptions<
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin
>(
  options?: ComponentOptionsWithoutProps<
    {},
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends
  > & { emits?: undefined; expose?: undefined; slots?: undefined }
): void;
```

该函数接受一个可选的 `options` 参数，用于定义组件的选项。`options` 参数是一个对象，可以包含多个属性，用于配置组件的行为和特性。具体的选项属性可以参考 Vue.js 的官方文档。

在函数的实现中，如果处于开发环境 (`__DEV__` 为真)，则会发出一个警告提示，提醒开发者在运行时使用了 `defineOptions`。

这个函数的作用是让开发者有选择地定义组件的选项。通过调用 `defineOptions` 并传入相应的选项，可以在组件的定义过程中灵活地配置组件的行为和特性。

例如：

```typescript
import { defineOptions } from 'vue';

export default defineOptions({
  name: 'MyComponent',
  props: {
    // ...
  },
  data() {
    return {
      // ...
    };
  },
  methods: {
    // ...
  },
  // ...
});
```

在上述代码中，通过调用 `defineOptions` 并传入一个包含组件选项的对象，可以定义组件的名称、属性、数据、方法等。这样就可以在组件的定义过程中灵活地配置组件的各种选项。
 */
export function defineOptions<
  RawBindings = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin
>(
  options?: ComponentOptionsWithoutProps<
    {},
    RawBindings,
    D,
    C,
    M,
    Mixin,
    Extends
  > & { emits?: undefined; expose?: undefined; slots?: undefined }
): void {
  if (__DEV__) {
    warnRuntimeUsage(`defineOptions`)
  }
}
/**
 * 
 * @returns 
 * `defineSlots` 是一个函数，用于定义组件的插槽。

类型签名如下：

```typescript
export function defineSlots<
  S extends Record<string, any> = Record<string, any>
>(): StrictUnwrapSlotsType<SlotsType<S>>;
```

该函数没有参数，它返回一个严格解包的插槽类型 `StrictUnwrapSlotsType<SlotsType<S>>`。

在函数的实现中，如果处于开发环境 (`__DEV__` 为真)，则会发出一个警告提示，提醒开发者在运行时使用了 `defineSlots`。

这个函数的作用是让开发者有选择地定义组件的插槽。通过调用 `defineSlots`，可以在组件的定义过程中明确声明组件的插槽结构和类型。

例如：

```typescript
import { defineSlots } from 'vue';

export default defineSlots<{}>();
```

在上述代码中，通过调用 `defineSlots` 并传入一个空对象作为类型参数，表示该组件没有具体的插槽定义。然后，通过返回的插槽类型 `StrictUnwrapSlotsType<SlotsType<{}>>`，可以在组件的模板中使用插槽。

通过 `defineSlots` 的使用，可以在组件的定义过程中明确插槽的结构，以便在组件的使用方正确使用和传递插槽内容。
 */
export function defineSlots<
  S extends Record<string, any> = Record<string, any>
>(): StrictUnwrapSlotsType<SlotsType<S>> {
  if (__DEV__) {
    warnRuntimeUsage(`defineSlots`)
  }
  return null as any
}

/**
 * (**Experimental**) Vue `<script setup>` compiler macro for declaring a
 * two-way binding prop that can be consumed via `v-model` from the parent
 * component. This will declare a prop with the same name and a corresponding
 * `update:propName` event.
 *
 * If the first argument is a string, it will be used as the prop name;
 * Otherwise the prop name will default to "modelValue". In both cases, you
 * can also pass an additional object which will be used as the prop's options.
 *
 * The options object can also specify an additional option, `local`. When set
 * to `true`, the ref can be locally mutated even if the parent did not pass
 * the matching `v-model`.
 *
 * @example
 * ```ts
 * // default model (consumed via `v-model`)
 * const modelValue = defineModel<string>()
 * modelValue.value = "hello"
 *
 * // default model with options
 * const modelValue = defineModel<string>({ required: true })
 *
 * // with specified name (consumed via `v-model:count`)
 * const count = defineModel<number>('count')
 * count.value++
 *
 * // with specified name and default value
 * const count = defineModel<number>('count', { default: 0 })
 *
 * // local mutable model, can be mutated locally
 * // even if the parent did not pass the matching `v-model`.
 * const count = defineModel<number>('count', { local: true, default: 0 })
 * ```
 * `defineModel` 是一个函数，用于定义组件的 v-model。

类型签名如下：

```typescript
export function defineModel<T>(
  options: { required: true } & PropOptions<T> & DefineModelOptions
): Ref<T>;
export function defineModel<T>(
  options: { default: any } & PropOptions<T> & DefineModelOptions
): Ref<T>;
export function defineModel<T>(
  options?: PropOptions<T> & DefineModelOptions
): Ref<T | undefined>;
export function defineModel<T>(
  name: string,
  options: { required: true } & PropOptions<T> & DefineModelOptions
): Ref<T>;
export function defineModel<T>(
  name: string,
  options: { default: any } & PropOptions<T> & DefineModelOptions
): Ref<T>;
export function defineModel<T>(
  name: string,
  options?: PropOptions<T> & DefineModelOptions
): Ref<T | undefined>;
export function defineModel(): any;
```

根据不同的重载，`defineModel` 函数可以接受不同的参数来定义组件的 v-model。

在函数的实现中，如果处于开发环境 (`__DEV__` 为真)，则会发出一个警告提示，提醒开发者在运行时使用了 `defineModel`。

`defineModel` 函数的作用是定义一个 v-model，使组件能够支持双向数据绑定。通过调用 `defineModel`，可以明确指定 v-model 的属性名称、类型以及其他选项。

例如：

```typescript
import { defineModel } from 'vue';

export default defineModel<number>({ default: 0 });
```

在上述代码中，通过调用 `defineModel` 并传入一个选项对象 `{ default: 0 }`，表示定义一个类型为 `number` 的 v-model，并设置默认值为 `0`。然后，通过返回的 `Ref<T>` 类型的值，可以在组件中使用 v-model。

通过 `defineModel` 的使用，可以在组件的定义过程中明确指定 v-model 的属性名称、类型和其他选项，以便在组件的使用方正确使用和绑定 v-model 数据。
 */
export function defineModel<T>(
  options: { required: true } & PropOptions<T> & DefineModelOptions
): Ref<T>
export function defineModel<T>(
  options: { default: any } & PropOptions<T> & DefineModelOptions
): Ref<T>
export function defineModel<T>(
  options?: PropOptions<T> & DefineModelOptions
): Ref<T | undefined>
export function defineModel<T>(
  name: string,
  options: { required: true } & PropOptions<T> & DefineModelOptions
): Ref<T>
export function defineModel<T>(
  name: string,
  options: { default: any } & PropOptions<T> & DefineModelOptions
): Ref<T>
export function defineModel<T>(
  name: string,
  options?: PropOptions<T> & DefineModelOptions
): Ref<T | undefined>
export function defineModel(): any {
  if (__DEV__) {
    warnRuntimeUsage('defineModel')
  }
}
/**
 * `DefineModelOptions` 是一个接口，用于定义 `defineModel` 函数的选项。

它具有一个可选属性：

- `local?: boolean`: 指示 v-model 是否是局部的。如果设置为 `true`，则 v-model 是组件内部的局部状态；如果设置为 `false` 或未提供，则 v-model 是由父组件传递给子组件的。

通过在 `defineModel` 函数调用时传递一个包含 `local` 属性的选项对象，可以控制 v-model 的作用范围。如果 `local` 属性设置为 `true`，则 v-model 是组件的局部状态，只在组件内部使用；如果未提供 `local` 属性或设置为 `false`，则 v-model 是通过父组件传递给子组件的属性。

例如：

```typescript
import { defineModel } from 'vue';

// 定义一个局部的 v-model
defineModel({ default: '', local: true });
```

在上述代码中，通过传递一个选项对象 `{ default: '', local: true }` 给 `defineModel` 函数，定义了一个局部的 v-model，类型为字符串，并设置默认值为空字符串。这意味着 v-model 只在组件内部使用，并且是组件的局部状态。

通过使用 `DefineModelOptions` 中的 `local` 属性，可以更灵活地控制 v-model 的作用范围，以满足组件的特定需求。
 */
interface DefineModelOptions {
  local?: boolean
}
/**
 * `NotUndefined<T>` 是一个条件类型，用于过滤掉 `undefined` 类型。

它的定义如下：

```typescript
type NotUndefined<T> = T extends undefined ? never : T;
```

该类型接受一个类型参数 `T`，并检查 `T` 是否为 `undefined` 类型。如果 `T` 是 `undefined` 类型，则返回 `never` 类型，否则返回 `T` 类型。

这个类型的作用是将 `undefined` 类型排除在类型参数的候选类型之外。在类型系统中，有时希望某个类型参数不包含 `undefined` 类型，通过使用 `NotUndefined<T>` 可以实现这个目的。

例如，假设有一个类型 `Person` 包含 `name` 和 `age` 属性，但这些属性可能为可选的：

```typescript
type Person = {
  name?: string;
  age?: number;
};
```

如果我们想获取 `Person` 类型中所有不为 `undefined` 的属性类型，可以使用 `NotUndefined<T>`：

```typescript
type DefinedPerson = {
  [K in keyof Person]: NotUndefined<Person[K]>;
};
```

在上述代码中，`DefinedPerson` 类型使用了 `NotUndefined<T>` 来过滤掉 `Person` 类型中的 `undefined` 属性类型，只保留不为 `undefined` 的属性类型。

通过使用 `NotUndefined<T>` 类型，我们可以更精确地描述和操作类型，排除掉不需要的 `undefined` 类型。
 */
type NotUndefined<T> = T extends undefined ? never : T
/**
 * `InferDefaults<T>` 是一个用于推断对象类型 `T` 属性的默认值的类型。

它的定义如下：

```typescript
type InferDefaults<T> = {
  [K in keyof T]?: InferDefault<T, T[K]>
};
```

该类型通过遍历 `T` 的属性，为每个属性生成一个可选属性，并使用 `InferDefault<T, T[K]>` 推断属性的默认值类型。

`InferDefault<T, V>` 是一个条件类型，用于推断类型 `V` 的默认值。它根据 `V` 的类型进行推断，如果 `V` 是原始类型（如 `number`、`string`、`boolean` 等），则默认值为 `V` 类型的默认值（例如 `0`、`''`、`false`）。如果 `V` 是对象类型，则默认值为 `null`。

通过使用 `InferDefaults<T>`，我们可以创建一个类型，该类型与原始对象类型 `T` 相似，但所有属性都是可选的，并使用推断的默认值。

以下是一个示例，假设我们有一个 `User` 类型，其中包含 `name`、`age` 和 `email` 属性：

```typescript
type User = {
  name: string;
  age: number;
  email: string;
};
```

我们可以使用 `InferDefaults<T>` 来推断 `User` 类型的属性默认值：

```typescript
type UserWithDefaults = InferDefaults<User>;
```

`UserWithDefaults` 类型将具有与 `User` 类型相同的属性，但所有属性都是可选的，并且根据属性类型推断了默认值类型。

例如，如果 `User` 类型的属性类型如下：

```typescript
type User = {
  name: string;
  age: number;
  email: string;
};
```

那么 `UserWithDefaults` 类型将被推断为：

```typescript
type UserWithDefaults = {
  name?: string;
  age?: number;
  email?: string;
};
```

注意，所有属性都变成了可选的，并且根据属性类型推断了默认值类型。
 */
type InferDefaults<T> = {
  [K in keyof T]?: InferDefault<T, T[K]>
}
/**
 * `NativeType` 是一个类型别名，用于表示原生的数据类型。它包括了以下几种类型：

- `null`: 表示空值。
- `number`: 表示数字类型。
- `string`: 表示字符串类型。
- `boolean`: 表示布尔类型。
- `symbol`: 表示符号类型。
- `Function`: 表示函数类型。

通过将这些类型列在一起，`NativeType` 提供了一种表示原生数据类型的方式。可以在需要引用原生数据类型的地方使用该类型别名，以提高代码的可读性和可维护性。
 */
type NativeType = null | number | string | boolean | symbol | Function
/**
 * `InferDefault<P, T>` 是一个条件类型，用于推断属性的默认值类型。它有两个可能的结果类型：

1. 如果属性的默认值是一个函数，则返回类型为 `(props: P) => T & {}`。这意味着默认值函数接收一个参数 `props`，并返回类型为 `T` 的结果。`T & {}` 表示将结果类型与空对象类型进行交叉，以确保类型的兼容性。

2. 如果属性的默认值是原生类型 (`NativeType`)，则返回类型为 `T`。这表示默认值类型为原生类型。

通过使用 `InferDefault`，我们可以根据属性的默认值类型来推断出属性的最终类型。如果默认值是一个函数，则可以将该函数应用于属性的参数 `props`，从而得到属性的实际值类型。如果默认值是原生类型，则直接使用原生类型作为属性的值类型。
 */
type InferDefault<P, T> =
  | ((props: P) => T & {})
  | (T extends NativeType ? T : never)
/**
 * `PropsWithDefaults<T, Defaults, BKeys>` 是一个类型，用于根据属性的默认值推断属性的最终类型。它具有以下特征：

1. 通过 `InferDefaults<T>` 推断属性的默认值类型，并将结果存储在 `Defaults` 中。

2. 使用 `Omit<T, keyof Defaults>` 排除具有默认值的属性，从而获得剩余属性的类型。

3. 对于具有默认值的属性，根据以下规则确定其最终类型：
   - 如果默认值为 `undefined`，则属性类型保持不变。
   - 如果默认值不为 `undefined`，则属性类型为 `NotUndefined<T[K]>`，即将 `T[K]` 中的 `undefined` 移除。

4. 使用 `{ readonly [K in BKeys]-?: boolean }` 添加布尔类型的属性，其中 `BKeys` 是属性名称的子集。

通过使用 `PropsWithDefaults`，我们可以在类型级别上根据属性的默认值推断属性的最终类型。这有助于确保属性在使用时具有正确的类型，并提供类型安全性和自动补全支持。
 */
type PropsWithDefaults<
  T,
  Defaults extends InferDefaults<T>,
  BKeys extends keyof T
> = Omit<T, keyof Defaults> & {
  [K in keyof Defaults]-?: K extends keyof T
    ? Defaults[K] extends undefined
      ? T[K]
      : NotUndefined<T[K]>
    : never
} & { readonly [K in BKeys]-?: boolean }

/**
 * Vue `<script setup>` compiler macro for providing props default values when
 * using type-based `defineProps` declaration.
 *
 * Example usage:
 * ```ts
 * withDefaults(defineProps<{
 *   size?: number
 *   labels?: string[]
 * }>(), {
 *   size: 3,
 *   labels: () => ['default label']
 * })
 * ```
 *
 * This is only usable inside `<script setup>`, is compiled away in the output
 * and should **not** be actually called at runtime.
 *
 * @see {@link https://vuejs.org/guide/typescript/composition-api.html#typing-component-props}
 * `withDefaults` 函数是一个辅助函数，用于将属性的默认值与属性值合并，从而生成具有默认值的属性的最终类型。

它具有以下参数和返回值：

- `T`：属性对象的类型。
- `BKeys`：属性名称的子集。
- `Defaults`：根据属性的默认值推断出的类型。

参数：
- `props`：属性对象，类型为 `DefineProps<T, BKeys>`，其中 `DefineProps` 是一个泛型类型，表示具有默认值和布尔属性的属性类型。
- `defaults`：默认值对象，类型为 `Defaults`，其中 `Defaults` 是根据属性的默认值推断出的类型。

返回值：
- `PropsWithDefaults<T, Defaults, BKeys>`：根据属性的默认值和属性值合并生成的具有默认值的属性的最终类型。

`withDefaults` 函数的实现中使用了 `warnRuntimeUsage` 函数来在开发模式下发出警告，该函数提醒开发人员在运行时使用了 `withDefaults`。

需要注意的是，此实现中的返回值为 `null as any`，这仅是为了类型推断，并没有实际的运行时逻辑。
 */
export function withDefaults<
  T,
  BKeys extends keyof T,
  Defaults extends InferDefaults<T>
>(
  props: DefineProps<T, BKeys>,
  defaults: Defaults
): PropsWithDefaults<T, Defaults, BKeys> {
  if (__DEV__) {
    warnRuntimeUsage(`withDefaults`)
  }
  return null as any
}
/**
 * 
 * @returns 
 * `useSlots` 函数是一个自定义的 Vue 组合式函数，用于在组件的 `setup` 函数中获取插槽内容。

该函数返回 `SetupContext` 对象中的 `slots` 属性，表示当前组件的插槽内容。它使用了 `getContext` 函数来获取当前的上下文对象，并从中获取 `slots` 属性。

需要注意的是，`useSlots` 函数必须在组件的 `setup` 函数中使用，因为它依赖于组件的上下文对象。在其他地方使用该函数可能无法获取正确的插槽内容。

以下是 `useSlots` 函数的实现：

```typescript
export function useSlots(): SetupContext['slots'] {
  return getContext().slots;
}
```

该函数直接返回当前上下文对象的 `slots` 属性。
 */
export function useSlots(): SetupContext['slots'] {
  return getContext().slots
}
/**
 * 
 * @returns 
 * `useAttrs` 函数是一个自定义的 Vue 组合式函数，用于在组件的 `setup` 函数中获取组件的属性集合。

该函数返回 `SetupContext` 对象中的 `attrs` 属性，表示当前组件的属性集合。它使用了 `getContext` 函数来获取当前的上下文对象，并从中获取 `attrs` 属性。

需要注意的是，`useAttrs` 函数必须在组件的 `setup` 函数中使用，因为它依赖于组件的上下文对象。在其他地方使用该函数可能无法获取正确的属性集合。

以下是 `useAttrs` 函数的实现：

```typescript
export function useAttrs(): SetupContext['attrs'] {
  return getContext().attrs;
}
```

该函数直接返回当前上下文对象的 `attrs` 属性。
 */
export function useAttrs(): SetupContext['attrs'] {
  return getContext().attrs
}
/**
 * 
 * @param props 
 * @param name 
 * @param options
 * `useModel` 函数是一个自定义的 Vue 组合式函数，用于在组件的 `setup` 函数中处理双向绑定的属性。

该函数可以根据传入的属性名和选项，返回一个 `Ref` 对象，用于获取和设置属性的值。当属性值发生变化时，`useModel` 函数会触发相应的事件，以便更新属性的值。

`useModel` 函数有两种重载形式：

1. 接受泛型参数 `T` 和 `K` 的重载形式：
```typescript
export function useModel<T extends Record<string, any>, K extends keyof T>(
  props: T,
  name: K,
  options?: { local?: boolean }
): Ref<T[K]>
```

2. 接受普通对象和字符串属性名的重载形式：
```typescript
export function useModel(
  props: Record<string, any>,
  name: string,
  options?: { local?: boolean }
): Ref
```

以下是 `useModel` 函数的实现：

1. 当选项 `local` 为 `true` 时，创建一个本地的 `Ref` 对象，并在属性值变化时触发更新事件：
```typescript
const proxy = ref<any>(props[name])

watch(
  () => props[name],
  v => (proxy.value = v)
)

watch(proxy, value => {
  if (value !== props[name]) {
    i.emit(`update:${name}`, value)
  }
})

return proxy
```

2. 当选项 `local` 未提供或为 `false` 时，直接返回一个带有 `get` 和 `set` 方法的对象：
```typescript
return {
  __v_isRef: true,
  get value() {
    return props[name]
  },
  set value(value) {
    i.emit(`update:${name}`, value)
  }
} as any
```

需要注意的是，`useModel` 函数必须在组件的 `setup` 函数中使用，因为它依赖于当前的组件实例对象。在其他地方使用该函数可能无法正常工作。

此外，`useModel` 函数还包含了一些开发时的警告逻辑，用于提示错误的使用情况，例如在没有活动实例或未声明的属性上调用函数。

请注意，在返回的 `Ref` 对象上可以使用 `.value` 属性访问和修改属性的值。例如，`const myProp = useModel(props, 'myProp')` 可以通过 `myProp.value` 访问和修改 `myProp` 的值。 
 */
export function useModel<T extends Record<string, any>, K extends keyof T>(
  props: T,
  name: K,
  options?: { local?: boolean }
): Ref<T[K]>
export function useModel(
  props: Record<string, any>,
  name: string,
  options?: { local?: boolean }
): Ref {
  const i = getCurrentInstance()!
  if (__DEV__ && !i) {
    warn(`useModel() called without active instance.`)
    return ref() as any
  }

  if (__DEV__ && !(i.propsOptions[0] as NormalizedProps)[name]) {
    warn(`useModel() called with prop "${name}" which is not declared.`)
    return ref() as any
  }

  if (options && options.local) {
    const proxy = ref<any>(props[name])

    watch(
      () => props[name],
      v => (proxy.value = v)
    )

    watch(proxy, value => {
      if (value !== props[name]) {
        i.emit(`update:${name}`, value)
      }
    })

    return proxy
  } else {
    return {
      __v_isRef: true,
      get value() {
        return props[name]
      },
      set value(value) {
        i.emit(`update:${name}`, value)
      }
    } as any
  }
}
/**
 * 
 * @returns 
 * `getContext` 函数是一个辅助函数，用于获取当前组件实例的 `SetupContext` 对象。

该函数首先通过 `getCurrentInstance` 函数获取当前的组件实例对象 `i`。然后，它进行了一些错误处理和验证：

- 如果开发环境下没有找到有效的组件实例对象 `i`，会通过 `warn` 函数输出警告信息提示开发者在没有活动实例的情况下调用了 `useContext` 函数。
- 如果 `i` 是一个有效的组件实例对象，但其 `setupContext` 属性为 `undefined`，则会通过 `createSetupContext` 函数创建一个新的 `SetupContext` 对象，并将其赋值给 `i` 的 `setupContext` 属性。

最后，函数返回 `i` 的 `setupContext` 属性。

需要注意的是，`getContext` 函数应该在组件的 `setup` 函数内部使用，以确保能够获取到正确的组件实例对象。在其他地方使用该函数可能无法正常工作。

`SetupContext` 是 Vue 3 中用于组件间通信的上下文对象，它提供了一些属性和方法，例如 `attrs`、`emit`、`slots` 等，用于在组件之间传递数据和触发事件。通过 `getContext` 函数获取到的 `SetupContext` 对象可以用于访问和操作这些属性和方法。
 */
function getContext(): SetupContext {
  const i = getCurrentInstance()!
  if (__DEV__ && !i) {
    warn(`useContext() called without active instance.`)
  }
  return i.setupContext || (i.setupContext = createSetupContext(i))
}

/**
 * @internal
 * `normalizePropsOrEmits` 函数用于规范化组件的 `props` 或 `emits` 选项。

该函数接受一个参数 `props`，可以是 `ComponentPropsOptions` 类型或 `EmitsOptions` 类型。函数内部通过判断 `props` 是否为数组来确定其类型。

- 如果 `props` 是数组类型，表示是组件的 `props` 选项。函数会遍历数组，将每个数组元素作为属性名，初始化为 `null`，并添加到一个新的对象 `normalized` 中。最后将 `normalized` 返回。
- 如果 `props` 不是数组类型，表示是组件的 `emits` 选项，直接将其返回。

函数的作用是将传入的 `props` 数组规范化为一个对象，其中每个数组元素作为属性名，并初始化为 `null`。这样做的目的是为了在使用 `props` 或 `emits` 时，能够正确地访问和操作对应的属性或事件。
 */
export function normalizePropsOrEmits(
  props: ComponentPropsOptions | EmitsOptions
) {
  return isArray(props)
    ? props.reduce(
        (normalized, p) => ((normalized[p] = null), normalized),
        {} as ComponentObjectPropsOptions | ObjectEmitsOptions
      )
    : props
}

/**
 * Runtime helper for merging default declarations. Imported by compiled code
 * only.
 * @internal
 * `mergeDefaults` 函数用于将默认值对象与组件的 `props` 选项合并，生成最终的 `ComponentObjectPropsOptions` 对象。

该函数接受两个参数：
- `raw`：组件的原始 `props` 选项，类型为 `ComponentPropsOptions`。
- `defaults`：包含默认值的对象，类型为 `Record<string, any>`。

函数首先通过调用 `normalizePropsOrEmits` 函数将 `raw` 规范化为 `props` 对象。

然后遍历 `defaults` 对象的每个属性，对于每个属性进行以下处理：
- 如果属性名以 `__skip` 开头，则跳过该属性的处理。
- 获取 `props` 对象中对应属性名的值，赋给变量 `opt`。
- 如果 `opt` 存在，则说明该属性在 `props` 中有声明。根据 `opt` 的类型进行不同的处理：
  - 如果 `opt` 是数组或函数类型，将其转换为对象形式，并设置 `default` 属性为对应的默认值。
  - 如果 `opt` 是普通对象类型，则直接设置 `default` 属性为对应的默认值。
- 如果 `opt` 为 `null`，说明该属性在 `props` 中没有声明，则将其设置为一个包含 `default` 属性的对象，`default` 属性值为对应的默认值。
- 如果处于开发环境并且 `opt` 为 `undefined`，说明默认值对应的属性在 `props` 中没有声明，会输出警告信息。
- 如果 `defaults` 对象中存在属性名为 `__skip_${key}` 的属性，则设置 `opt` 对象的 `skipFactory` 属性为 `true`。

最后，返回经过合并后的 `props` 对象。

函数的作用是将默认值对象与组件的 `props` 选项合并，生成最终的 `ComponentObjectPropsOptions` 对象。在合并过程中，会根据默认值对象的属性，对已声明的 `props` 属性进行补充或修改，并处理特殊标识。
 */
export function mergeDefaults(
  raw: ComponentPropsOptions,
  defaults: Record<string, any>
): ComponentObjectPropsOptions {
  const props = normalizePropsOrEmits(raw)
  for (const key in defaults) {
    if (key.startsWith('__skip')) continue
    let opt = props[key]
    if (opt) {
      if (isArray(opt) || isFunction(opt)) {
        opt = props[key] = { type: opt, default: defaults[key] }
      } else {
        opt.default = defaults[key]
      }
    } else if (opt === null) {
      opt = props[key] = { default: defaults[key] }
    } else if (__DEV__) {
      warn(`props default key "${key}" has no corresponding declaration.`)
    }
    if (opt && defaults[`__skip_${key}`]) {
      opt.skipFactory = true
    }
  }
  return props
}

/**
 * Runtime helper for merging model declarations.
 * Imported by compiled code only.
 * @internal
 * `mergeModels` 函数用于合并两个模型定义对象，包括 `props` 或 `emits`。

该函数接受两个参数：
- `a`：第一个模型定义对象，类型为 `ComponentPropsOptions` 或 `EmitsOptions`。
- `b`：第二个模型定义对象，类型为 `ComponentPropsOptions` 或 `EmitsOptions`。

函数首先进行一些简单的判断，如果其中一个模型定义对象为空，则直接返回另一个非空的对象。

接下来根据 `a` 和 `b` 的类型进行不同的处理：
- 如果 `a` 和 `b` 都是数组类型，则使用 `concat` 方法将它们合并为一个新的数组。
- 否则，使用 `extend` 函数将 `a` 和 `b` 的属性合并到一个新的对象中。在合并过程中，会调用 `normalizePropsOrEmits` 函数对属性进行规范化处理。

最后返回合并后的模型定义对象。

函数的作用是合并两个模型定义对象，可以用于合并 `props` 或 `emits` 对象。根据参数的类型不同，会执行不同的合并策略。
 */
export function mergeModels(
  a: ComponentPropsOptions | EmitsOptions,
  b: ComponentPropsOptions | EmitsOptions
) {
  if (!a || !b) return a || b
  if (isArray(a) && isArray(b)) return a.concat(b)
  return extend({}, normalizePropsOrEmits(a), normalizePropsOrEmits(b))
}

/**
 * Used to create a proxy for the rest element when destructuring props with
 * defineProps().
 * @internal
 * `createPropsRestProxy` 函数用于创建一个代理对象，将原始的 `props` 对象中排除指定键的属性进行代理。

该函数接受两个参数：
- `props`：原始的 `props` 对象，类型为 `any`。
- `excludedKeys`：要排除的属性键的数组，类型为 `string[]`。

函数首先创建一个空对象 `ret`，用于存储代理后的属性。
然后遍历 `props` 对象的属性，在排除指定键的情况下，为每个属性定义一个新的属性描述符，并将其添加到 `ret` 对象中。新的属性描述符具有以下特点：
- `enumerable` 属性设置为 `true`，以确保属性在枚举时可见。
- `get` 方法返回原始 `props` 对应属性键的值。

最后返回代理对象 `ret`。

该函数的作用是创建一个代理对象，用于访问原始 `props` 对象中除了指定键之外的属性。通过使用代理对象，可以在组件中方便地访问和操作 `props`，并排除不需要的属性。
 */
export function createPropsRestProxy(
  props: any,
  excludedKeys: string[]
): Record<string, any> {
  const ret: Record<string, any> = {}
  for (const key in props) {
    if (!excludedKeys.includes(key)) {
      Object.defineProperty(ret, key, {
        enumerable: true,
        get: () => props[key]
      })
    }
  }
  return ret
}

/**
 * `<script setup>` helper for persisting the current instance context over
 * async/await flows.
 *
 * `@vue/compiler-sfc` converts the following:
 *
 * ```ts
 * const x = await foo()
 * ```
 *
 * into:
 *
 * ```ts
 * let __temp, __restore
 * const x = (([__temp, __restore] = withAsyncContext(() => foo())),__temp=await __temp,__restore(),__temp)
 * ```
 * @internal
 * `withAsyncContext` 函数用于在异步上下文中执行代码。

该函数接受一个参数：
- `getAwaitable`：一个函数，用于获取一个可等待的对象，即可能是一个 Promise 或其他可等待对象。

函数的执行步骤如下：
1. 获取当前的组件实例 `ctx`。
2. 检查是否存在当前的组件实例 `ctx`，如果不存在则发出警告。
3. 调用 `getAwaitable` 函数获取可等待对象 `awaitable`。
4. 取消当前的组件实例，即将当前的组件实例设置为 `null`。
5. 检查 `awaitable` 是否是一个 Promise，如果是，则通过 `catch` 方法捕获异常，并在异常处理完成后恢复当前的组件实例，并重新抛出异常。
6. 返回一个数组，包含 `awaitable` 和一个函数，该函数用于在异步代码执行完成后恢复当前的组件实例。

该函数的作用是在异步代码中临时取消当前的组件实例，并在异步操作完成后恢复当前的组件实例。这样可以确保在异步操作期间不会发生不正确的上下文访问。
 */
export function withAsyncContext(getAwaitable: () => any) {
  const ctx = getCurrentInstance()!
  if (__DEV__ && !ctx) {
    warn(
      `withAsyncContext called without active current instance. ` +
        `This is likely a bug.`
    )
  }
  let awaitable = getAwaitable()
  unsetCurrentInstance()
  if (isPromise(awaitable)) {
    awaitable = awaitable.catch(e => {
      setCurrentInstance(ctx)
      throw e
    })
  }
  return [awaitable, () => setCurrentInstance(ctx)]
}
