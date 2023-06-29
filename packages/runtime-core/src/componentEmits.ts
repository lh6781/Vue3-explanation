import {
  camelize,
  EMPTY_OBJ,
  toHandlerKey,
  extend,
  hasOwn,
  hyphenate,
  isArray,
  isFunction,
  isObject,
  isString,
  isOn,
  UnionToIntersection,
  looseToNumber
} from '@vue/shared'
import {
  ComponentInternalInstance,
  ComponentOptions,
  ConcreteComponent,
  formatComponentName
} from './component'
import { callWithAsyncErrorHandling, ErrorCodes } from './errorHandling'
import { warn } from './warning'
import { devtoolsComponentEmit } from './devtools'
import { AppContext } from './apiCreateApp'
import { emit as compatInstanceEmit } from './compat/instanceEventEmitter'
import {
  compatModelEventPrefix,
  compatModelEmit
} from './compat/componentVModel'
/**
 * `ObjectEmitsOptions` 是一个类型别名，用于定义一个对象类型，其中键是字符串，值是一个函数或 `null`。

具体来说，`ObjectEmitsOptions` 是一个记录类型（`Record`），它将字符串作为键，将函数类型（接受任意参数并返回任意类型）或 `null` 作为值。这个对象表示组件的事件定义，每个键对应一个事件名称，值为处理该事件的函数或 `null`。

使用 `ObjectEmitsOptions` 类型，可以明确指定组件的事件定义，使其具有清晰的类型结构，并在开发过程中提供类型检查和自动补全的支持。
 */
export type ObjectEmitsOptions = Record<
  string,
  ((...args: any[]) => any) | null
>
/**
 * `EmitsOptions` 是一个类型别名，它可以是 `ObjectEmitsOptions` 或 `string` 数组类型。

具体来说，`EmitsOptions` 表示组件的事件定义选项。它可以是一个 `ObjectEmitsOptions` 对象，其中键是事件名称，值是处理该事件的函数或 `null`。也可以是一个字符串数组，每个字符串表示一个事件名称。

通过使用 `EmitsOptions` 类型，可以在组件定义中指定组件的事件选项，并对事件名称进行类型检查和自动补全。可以使用 `ObjectEmitsOptions` 提供详细的事件处理函数定义，或者使用简单的字符串数组表示事件名称列表。
 */
export type EmitsOptions = ObjectEmitsOptions | string[]
/**
 * `EmitsToProps` 是一个泛型类型，用于将 `EmitsOptions` 转换为组件的事件处理函数属性。

根据 `EmitsOptions` 的不同类型，`EmitsToProps` 会生成不同的属性定义。

如果 `EmitsOptions` 是一个字符串数组类型，即表示简单的事件名称列表，那么 `EmitsToProps` 会生成一个对象类型，其中属性名以 `on` 开头，后跟大写的事件名称，并且属性值为事件处理函数。每个事件名称都会生成一个对应的属性。

如果 `EmitsOptions` 是一个 `ObjectEmitsOptions` 对象类型，即表示详细的事件处理函数定义，那么 `EmitsToProps` 会生成一个对象类型，其中属性名以 `on` 开头，后跟大写的事件名称，并且属性值为根据事件处理函数定义生成的具体函数类型。每个事件名称都会生成一个对应的属性。

通过使用 `EmitsToProps` 类型，可以对组件的事件处理函数进行类型检查和自动补全，并将其作为组件的属性。
 */
export type EmitsToProps<T extends EmitsOptions> = T extends string[]
  ? {
      [K in string & `on${Capitalize<T[number]>}`]?: (...args: any[]) => any
    }
  : T extends ObjectEmitsOptions
  ? {
      [K in string &
        `on${Capitalize<string & keyof T>}`]?: K extends `on${infer C}`
        ? T[Uncapitalize<C>] extends null
          ? (...args: any[]) => any
          : (
              ...args: T[Uncapitalize<C>] extends (...args: infer P) => any
                ? P
                : never
            ) => any
        : never
    }
  : {}
/**
 * `EmitFn` 是一个泛型类型，用于生成组件的事件触发函数类型。

根据 `Options` 的不同类型，`EmitFn` 会生成不同的函数类型。

如果 `Options` 是一个字符串数组类型，即表示简单的事件名称列表，那么 `EmitFn` 会生成一个函数类型，该函数接受一个 `event` 参数和任意数量的其他参数，并且没有返回值。

如果 `Options` 是一个空对象类型，即表示没有具体的事件处理函数定义，那么 `EmitFn` 会生成一个函数类型，该函数接受一个 `event` 参数和任意数量的其他参数，并且没有返回值。

如果 `Options` 是一个 `ObjectEmitsOptions` 对象类型，即表示具体的事件处理函数定义，那么 `EmitFn` 会根据每个事件名称生成相应的函数类型。该函数类型接受一个 `event` 参数和根据事件处理函数定义生成的参数列表，并且没有返回值。

通过使用 `EmitFn` 类型，可以对组件的事件触发函数进行类型检查和自动补全，并将其作为组件的方法。
 */
export type EmitFn<
  Options = ObjectEmitsOptions,
  Event extends keyof Options = keyof Options
> = Options extends Array<infer V>
  ? (event: V, ...args: any[]) => void
  : {} extends Options // if the emit is empty object (usually the default value for emit) should be converted to function
  ? (event: string, ...args: any[]) => void
  : UnionToIntersection<
      {
        [key in Event]: Options[key] extends (...args: infer Args) => any
          ? (event: key, ...args: Args) => void
          : (event: key, ...args: any[]) => void
      }[Event]
    >
/**
 * 
 * @param instance 
 * @param event 
 * @param rawArgs 
 * @returns 
 * 这是一个名为 `emit` 的函数，用于在组件实例中触发事件。

函数接受以下参数：
- `instance`：组件的内部实例对象。
- `event`：要触发的事件名称。
- `...rawArgs`：事件的参数列表。

首先，函数会检查组件是否已卸载，如果已卸载，则直接返回。

然后，函数获取组件的属性对象 `props`。

在开发模式下，函数会进行一些额外的检查和警告。它会检查是否定义了 `emitsOptions`（事件选项），并根据选项对事件进行验证。如果事件未在选项中声明，并且不属于兼容模式下的特殊事件，函数会发出警告。如果事件在选项中声明，并且对应的验证函数存在，则会对事件的参数进行验证，如果验证失败，函数会发出警告。

接下来，函数会根据事件名称进行处理。如果事件是以 `update:` 开头的 v-model 事件，函数会应用修饰符（modifiers）到参数列表。修饰符可以是 `number`（将参数转换为数字类型）和 `trim`（将参数的首尾空格去除）。函数会根据修饰符对参数列表进行处理。

在开发模式下或启用了生产环境的开发工具时，函数会将事件及其参数传递给开发工具进行记录和追踪。

如果事件名称不区分大小写，在开发模式下，函数会发出警告，提示在模板中使用连字符（kebab-case）形式的事件名称。

接下来，函数会尝试获取事件对应的处理函数。首先会尝试使用事件名称作为键从 `props` 中获取处理函数，如果不存在，则会尝试使用事件名称的驼峰形式作为键获取处理函数。如果是 v-model 的 `update:` 事件，还会尝试使用事件名称的连字符形式获取处理函数。

如果找到了处理函数，则使用 `callWithAsyncErrorHandling` 函数调用处理函数，并将组件实例、错误代码和参数列表作为参数传递进去。

接着，函数会检查是否存在与处理函数对应的 `handlerName + 'Once'` 属性，如果存在，则表示该处理函数只能触发一次。函数会将该处理函数存储在 `instance.emitted` 对象中，并在处理函数已经触发过一次时返回，以避免重复触发。

最后，如果开启了兼容模式，则会调用兼容模式下的事件触发函数。

总的来说，`emit` 函数用于在组件实例中触发事件，并根据不同情况调用相应的处理函数，并进行错误处理和警告提示。
 */
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  if (instance.isUnmounted) return
  const props = instance.vnode.props || EMPTY_OBJ

  if (__DEV__) {
    const {
      emitsOptions,
      propsOptions: [propsOptions]
    } = instance
    if (emitsOptions) {
      if (
        !(event in emitsOptions) &&
        !(
          __COMPAT__ &&
          (event.startsWith('hook:') ||
            event.startsWith(compatModelEventPrefix))
        )
      ) {
        if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
          warn(
            `Component emitted event "${event}" but it is neither declared in ` +
              `the emits option nor as an "${toHandlerKey(event)}" prop.`
          )
        }
      } else {
        const validator = emitsOptions[event]
        if (isFunction(validator)) {
          const isValid = validator(...rawArgs)
          if (!isValid) {
            warn(
              `Invalid event arguments: event validation failed for event "${event}".`
            )
          }
        }
      }
    }
  }

  let args = rawArgs
  const isModelListener = event.startsWith('update:')

  // for v-model update:xxx events, apply modifiers on args
  const modelArg = isModelListener && event.slice(7)
  if (modelArg && modelArg in props) {
    const modifiersKey = `${
      modelArg === 'modelValue' ? 'model' : modelArg
    }Modifiers`
    const { number, trim } = props[modifiersKey] || EMPTY_OBJ
    if (trim) {
      args = rawArgs.map(a => (isString(a) ? a.trim() : a))
    }
    if (number) {
      args = rawArgs.map(looseToNumber)
    }
  }

  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentEmit(instance, event, args)
  }

  if (__DEV__) {
    const lowerCaseEvent = event.toLowerCase()
    if (lowerCaseEvent !== event && props[toHandlerKey(lowerCaseEvent)]) {
      warn(
        `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(
            instance,
            instance.type
          )} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
      )
    }
  }

  let handlerName
  let handler =
    props[(handlerName = toHandlerKey(event))] ||
    // also try camelCase event handler (#2249)
    props[(handlerName = toHandlerKey(camelize(event)))]
  // for v-model update:xxx events, also trigger kebab-case equivalent
  // for props passed via kebab-case
  if (!handler && isModelListener) {
    handler = props[(handlerName = toHandlerKey(hyphenate(event)))]
  }

  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }

  const onceHandler = props[handlerName + `Once`]
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {}
    } else if (instance.emitted[handlerName]) {
      return
    }
    instance.emitted[handlerName] = true
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }

  if (__COMPAT__) {
    compatModelEmit(instance, event, args)
    return compatInstanceEmit(instance, event, args)
  }
}
/**
 * 
 * @param comp 
 * @param appContext 
 * @param asMixin 
 * @returns 
 * 这段代码包含两个函数：`normalizeEmitsOptions` 和 `normalizeEmitsOptions`。

函数 `normalizeEmitsOptions` 用于规范化组件的 emits 选项，并返回一个规范化后的对象。它接受以下参数：
- `comp`：具体的组件对象。
- `appContext`：应用程序上下文对象。
- `asMixin`：一个布尔值，表示当前组件是否作为 mixin 使用，默认为 `false`。

函数首先通过访问 `appContext.emitsCache` 来获取缓存的 emits 选项。如果在缓存中找到了与组件对应的 emits 选项，就直接返回缓存的结果。

接下来，函数获取组件的原始 emits 选项，并创建一个空对象 `normalized` 用于存储规范化后的 emits 选项。

如果开启了 Options API 并且组件不是函数组件，则函数会应用 mixin 和 extends 的 emits 选项。它会递归调用 `normalizeEmitsOptions` 函数来规范化 mixin 和 extends 的 emits 选项，并将结果与当前组件的 emits 选项合并到 `normalized` 对象中。

如果原始 emits 选项为空且没有应用 mixin 和 extends 的 emits 选项，函数会将组件对象存入缓存并返回 `null`。

如果原始 emits 选项是数组，则将数组中的每个元素作为键添加到 `normalized` 对象，并将值设置为 `null`。

如果原始 emits 选项是对象，则将其与 `normalized` 对象合并。

最后，如果组件对象是一个普通对象，则将其与 `normalized` 对象一起存入缓存，并返回规范化后的 emits 选项。

这样，函数 `normalizeEmitsOptions` 可以将组件的 emits 选项进行规范化，并提供一个缓存机制来提高性能。

请注意，这段代码中存在一个重复的函数定义。
 */
export function normalizeEmitsOptions(
  comp: ConcreteComponent,
  appContext: AppContext,
  asMixin = false
): ObjectEmitsOptions | null {
  const cache = appContext.emitsCache
  const cached = cache.get(comp)
  if (cached !== undefined) {
    return cached
  }

  const raw = comp.emits
  let normalized: ObjectEmitsOptions = {}

  // apply mixin/extends props
  let hasExtends = false
  if (__FEATURE_OPTIONS_API__ && !isFunction(comp)) {
    const extendEmits = (raw: ComponentOptions) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true)
      if (normalizedFromExtend) {
        hasExtends = true
        extend(normalized, normalizedFromExtend)
      }
    }
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendEmits)
    }
    if (comp.extends) {
      extendEmits(comp.extends)
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendEmits)
    }
  }

  if (!raw && !hasExtends) {
    if (isObject(comp)) {
      cache.set(comp, null)
    }
    return null
  }

  if (isArray(raw)) {
    raw.forEach(key => (normalized[key] = null))
  } else {
    extend(normalized, raw)
  }

  if (isObject(comp)) {
    cache.set(comp, normalized)
  }
  return normalized
}

// Check if an incoming prop key is a declared emit event listener.
// e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
// both considered matched listeners.
/**
 * 
 * @param options 
 * @param key 
 * @returns 
 * 函数 `isEmitListener` 用于判断给定的事件 `key` 是否在给定的 emits 选项 `options` 中声明为事件侦听器。它接受以下参数：
- `options`：规范化后的 emits 选项对象，可以为 `null`。
- `key`：事件名称。

函数的主要逻辑如下：

首先，如果 `options` 为空或 `key` 不是以 "on" 开头的事件名（不是一个有效的事件名），则直接返回 `false`。

接下来，如果是在兼容模式下，并且 `key` 以 `compatModelEventPrefix` 开头（兼容模式事件的前缀），则将其视为有效的事件侦听器，返回 `true`。

然后，函数会修剪 `key`，将其去除前面的 "on"，并删除末尾的 "Once"（如果有）。

最后，函数会检查修剪后的 `key` 是否存在于 `options` 对象中。它会分别检查驼峰式命名、连字符式命名和原始命名的属性是否存在于 `options` 对象中，如果存在则返回 `true`，表示该事件在 `options` 中声明为事件侦听器；否则返回 `false`。

通过调用 `isEmitListener` 函数，可以检查给定的事件是否在 emits 选项中声明为事件侦听器。
 */
export function isEmitListener(
  options: ObjectEmitsOptions | null,
  key: string
): boolean {
  if (!options || !isOn(key)) {
    return false
  }

  if (__COMPAT__ && key.startsWith(compatModelEventPrefix)) {
    return true
  }

  key = key.slice(2).replace(/Once$/, '')
  return (
    hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
    hasOwn(options, hyphenate(key)) ||
    hasOwn(options, key)
  )
}
