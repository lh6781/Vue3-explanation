import {
  isReactive,
  reactive,
  track,
  TrackOpTypes,
  trigger,
  TriggerOpTypes
} from '@vue/reactivity'
import {
  isFunction,
  extend,
  NOOP,
  isArray,
  isObject,
  isString,
  invokeArrayFns
} from '@vue/shared'
import { warn } from '../warning'
import { cloneVNode, createVNode } from '../vnode'
import { RootRenderFunction } from '../renderer'
import {
  App,
  AppConfig,
  AppContext,
  CreateAppFunction,
  Plugin
} from '../apiCreateApp'
import {
  Component,
  ComponentOptions,
  createComponentInstance,
  finishComponentSetup,
  isRuntimeOnly,
  setupComponent
} from '../component'
import {
  RenderFunction,
  mergeOptions,
  internalOptionMergeStrats
} from '../componentOptions'
import { ComponentPublicInstance } from '../componentPublicInstance'
import { devtoolsInitApp, devtoolsUnmountApp } from '../devtools'
import { Directive } from '../directives'
import { nextTick } from '../scheduler'
import { version } from '..'
import {
  installLegacyConfigWarnings,
  installLegacyOptionMergeStrats,
  LegacyConfig
} from './globalConfig'
import { LegacyDirective } from './customDirective'
import {
  warnDeprecation,
  DeprecationTypes,
  assertCompatEnabled,
  configureCompat,
  isCompatEnabled,
  softAssertCompatEnabled
} from './compatConfig'
import { LegacyPublicInstance } from './instance'

/**
 * @deprecated the default `Vue` export has been removed in Vue 3. The type for
 * the default export is provided only for migration purposes. Please use
 * named imports instead - e.g. `import { createApp } from 'vue'`.
 * CompatVue` 是一个类型，用于描述 Vue 兼容性库的接口。它包含了一些与 Vue 2.x 版本相似的方法和属性。

该类型具有以下属性和方法：

- `version`：Vue 的版本号。
- `component`：用于注册和获取组件的方法。
- `directive`：用于注册和获取指令的方法。
- `configureCompat`：用于配置兼容性选项的方法。
- `new`：用于创建 Vue 实例的构造函数。
- `config`：Vue 的配置对象。
- `nextTick`：用于在下一个事件循环中执行回调的方法。
- `use`：用于安装插件的方法。
- `mixin`：用于混入组件选项的方法。
- `compile`：用于编译模板字符串的方法，返回渲染函数。
- `extend`：已废弃，Vue 3 不再支持扩展构造函数。
- `set`：已废弃，用于添加新属性的方法。
- `delete`：已废弃，用于删除属性的方法。
- `observable`：已废弃，用于创建响应式对象的方法。
- `filter`：已废弃，Vue 3 不再支持过滤器。
- `cid`：用于组件 ID 的内部属性。
- `options`：组件选项的内部属性。
- `util`：Vue 的实用工具方法。
- `super`：对父级 `CompatVue` 对象的引用。

`CompatVue` 类型提供了一些用于兼容 Vue 2.x 的接口，并帮助进行迁移。注意，这些接口可能仅用于内部实现和迁移的类型检查，并不适合在实际使用中直接调用。
 */
export type CompatVue = Pick<App, 'version' | 'component' | 'directive'> & {
  configureCompat: typeof configureCompat

  // no inference here since these types are not meant for actual use - they
  // are merely here to provide type checks for internal implementation and
  // information for migration.
  new (options?: ComponentOptions): LegacyPublicInstance

  version: string
  config: AppConfig & LegacyConfig

  nextTick: typeof nextTick

  use(plugin: Plugin, ...options: any[]): CompatVue
  mixin(mixin: ComponentOptions): CompatVue

  component(name: string): Component | undefined
  component(name: string, component: Component): CompatVue
  directive(name: string): Directive | undefined
  directive(name: string, directive: Directive): CompatVue

  compile(template: string): RenderFunction

  /**
   * @deprecated Vue 3 no longer supports extending constructors.
   */
  extend: (options?: ComponentOptions) => CompatVue
  /**
   * @deprecated Vue 3 no longer needs set() for adding new properties.
   */
  set(target: any, key: string | number | symbol, value: any): void
  /**
   * @deprecated Vue 3 no longer needs delete() for property deletions.
   */
  delete(target: any, key: string | number | symbol): void
  /**
   * @deprecated use `reactive` instead.
   */
  observable: typeof reactive
  /**
   * @deprecated filters have been removed from Vue 3.
   */
  filter(name: string, arg?: any): null
  /**
   * @internal
   */
  cid: number
  /**
   * @internal
   */
  options: ComponentOptions
  /**
   * @internal
   */
  util: any
  /**
   * @internal
   */
  super: CompatVue
}
/**
 * `isCopyingConfig` 是一个变量，用于表示当前是否正在进行配置的拷贝操作。它的初始值为 `false`。

在某些情况下，可能需要对配置进行拷贝操作，例如在兼容性库中对配置进行处理或修改。为了避免出现并发的拷贝操作，可以使用 `isCopyingConfig` 变量进行标记，以确保一次只有一个拷贝操作在进行中。

通过将 `isCopyingConfig` 设置为 `true`，可以表示当前正在进行配置的拷贝操作。完成拷贝操作后，可以将 `isCopyingConfig` 设置为 `false`，表示拷贝操作已完成。

这个变量在兼容性库的内部使用，用于控制配置的拷贝操作，通常不需要在外部直接使用或修改它。
 */
export let isCopyingConfig = false

// exported only for test
/**
 * `singletonApp` 是一个变量，用于存储应用程序实例。它的初始值为 `undefined`。

在某些情况下，可能需要在代码中引用应用程序实例。为了方便起见，可以将应用程序实例赋值给 `singletonApp` 变量，以便在需要时直接引用该实例。

请注意，`singletonApp` 变量的赋值应在创建应用程序实例后进行。例如，可以使用如下方式将应用程序实例赋值给 `singletonApp` 变量：

```javascript
const app = createApp(...)
singletonApp = app
```

之后，可以通过引用 `singletonApp` 变量来访问应用程序实例，例如：

```javascript
singletonApp.directive(...)
singletonApp.component(...)
```

需要注意的是，`singletonApp` 是一个可变的变量，可以在代码中对其进行重新赋值。因此，使用该变量时应确保在合适的时机进行赋值，并避免对其进行不必要的修改。
 */
export let singletonApp: App
/**
 * `singletonCtor` 是一个变量，用于存储 `CompatVue` 构造函数。它的初始值为 `undefined`。

在某些情况下，可能需要在代码中引用 `CompatVue` 构造函数。为了方便起见，可以将 `CompatVue` 构造函数赋值给 `singletonCtor` 变量，以便在需要时直接引用该构造函数。

请注意，`singletonCtor` 变量的赋值应在 `CompatVue` 构造函数可用时进行。例如，可以使用如下方式将 `CompatVue` 构造函数赋值给 `singletonCtor` 变量：

```javascript
singletonCtor = CompatVue
```

之后，可以通过引用 `singletonCtor` 变量来访问 `CompatVue` 构造函数，例如：

```javascript
const app = new singletonCtor(...)
```

需要注意的是，`singletonCtor` 是一个可变的变量，可以在代码中对其进行重新赋值。因此，使用该变量时应确保在合适的时机进行赋值，并避免对其进行不必要的修改。
 */
let singletonCtor: CompatVue

// Legacy global Vue constructor
/**
 * 
 * @param createApp 
 * @param createSingletonApp 
 * @returns 
 * `createCompatVue` 是一个函数，用于创建一个兼容的 `Vue` 实例。

它接受两个参数：
- `createApp`：用于创建普通的 `Vue` 应用程序实例的函数。
- `createSingletonApp`：用于创建单例模式的 `Vue` 应用程序实例的函数。

在函数内部，它执行以下操作：
1. 使用 `createSingletonApp` 创建一个单例模式的 `Vue` 应用程序实例，并将其赋值给 `singletonApp` 变量。
2. 创建一个名为 `Vue` 的函数，并将其赋值给 `singletonCtor` 变量和 `Vue` 变量。
3. 定义 `createCompatApp` 函数，用于创建兼容的应用程序实例。
4. 设置 `Vue` 对象的属性和方法，包括 `version`、`config`、`use`、`mixin`、`component`、`directive`、`options`、`cid`、`nextTick`、`extend`、`set`、`delete`、`observable`、`filter` 等。
5. 返回 `Vue` 对象。

通过调用 `createCompatVue` 函数，可以创建一个兼容的 `Vue` 实例，该实例具有与 Vue 2 相似的 API 和行为。这样，可以在 Vue 3 的项目中使用部分 Vue 2 的功能和插件，以实现平滑的迁移和兼容性。
 */
export function createCompatVue(
  createApp: CreateAppFunction<Element>,
  createSingletonApp: CreateAppFunction<Element>
): CompatVue {
  singletonApp = createSingletonApp({})

  const Vue: CompatVue = (singletonCtor = function Vue(
    options: ComponentOptions = {}
  ) {
    return createCompatApp(options, Vue)
  } as any)

  function createCompatApp(options: ComponentOptions = {}, Ctor: any) {
    assertCompatEnabled(DeprecationTypes.GLOBAL_MOUNT, null)

    const { data } = options
    if (
      data &&
      !isFunction(data) &&
      softAssertCompatEnabled(DeprecationTypes.OPTIONS_DATA_FN, null)
    ) {
      options.data = () => data
    }

    const app = createApp(options)

    if (Ctor !== Vue) {
      applySingletonPrototype(app, Ctor)
    }

    const vm = app._createRoot!(options)
    if (options.el) {
      return (vm as any).$mount(options.el)
    } else {
      return vm
    }
  }

  Vue.version = `2.6.14-compat:${__VERSION__}`
  Vue.config = singletonApp.config

  Vue.use = (p, ...options) => {
    if (p && isFunction(p.install)) {
      p.install(Vue as any, ...options)
    } else if (isFunction(p)) {
      p(Vue as any, ...options)
    }
    return Vue
  }

  Vue.mixin = m => {
    singletonApp.mixin(m)
    return Vue
  }

  Vue.component = ((name: string, comp: Component) => {
    if (comp) {
      singletonApp.component(name, comp)
      return Vue
    } else {
      return singletonApp.component(name)
    }
  }) as any

  Vue.directive = ((name: string, dir: Directive | LegacyDirective) => {
    if (dir) {
      singletonApp.directive(name, dir as Directive)
      return Vue
    } else {
      return singletonApp.directive(name)
    }
  }) as any

  Vue.options = { _base: Vue }

  let cid = 1
  Vue.cid = cid

  Vue.nextTick = nextTick

  const extendCache = new WeakMap()

  function extendCtor(this: any, extendOptions: ComponentOptions = {}) {
    assertCompatEnabled(DeprecationTypes.GLOBAL_EXTEND, null)
    if (isFunction(extendOptions)) {
      extendOptions = extendOptions.options
    }

    if (extendCache.has(extendOptions)) {
      return extendCache.get(extendOptions)
    }

    const Super = this
    function SubVue(inlineOptions?: ComponentOptions) {
      if (!inlineOptions) {
        return createCompatApp(SubVue.options, SubVue)
      } else {
        return createCompatApp(
          mergeOptions(
            extend({}, SubVue.options),
            inlineOptions,
            internalOptionMergeStrats as any
          ),
          SubVue
        )
      }
    }
    SubVue.super = Super
    SubVue.prototype = Object.create(Vue.prototype)
    SubVue.prototype.constructor = SubVue

    // clone non-primitive base option values for edge case of mutating
    // extended options
    const mergeBase: any = {}
    for (const key in Super.options) {
      const superValue = Super.options[key]
      mergeBase[key] = isArray(superValue)
        ? superValue.slice()
        : isObject(superValue)
        ? extend(Object.create(null), superValue)
        : superValue
    }

    SubVue.options = mergeOptions(
      mergeBase,
      extendOptions,
      internalOptionMergeStrats as any
    )

    SubVue.options._base = SubVue
    SubVue.extend = extendCtor.bind(SubVue)
    SubVue.mixin = Super.mixin
    SubVue.use = Super.use
    SubVue.cid = ++cid

    extendCache.set(extendOptions, SubVue)
    return SubVue
  }

  Vue.extend = extendCtor.bind(Vue) as any

  Vue.set = (target, key, value) => {
    assertCompatEnabled(DeprecationTypes.GLOBAL_SET, null)
    target[key] = value
  }

  Vue.delete = (target, key) => {
    assertCompatEnabled(DeprecationTypes.GLOBAL_DELETE, null)
    delete target[key]
  }

  Vue.observable = (target: any) => {
    assertCompatEnabled(DeprecationTypes.GLOBAL_OBSERVABLE, null)
    return reactive(target)
  }

  Vue.filter = ((name: string, filter?: any) => {
    if (filter) {
      singletonApp.filter!(name, filter)
      return Vue
    } else {
      return singletonApp.filter!(name)
    }
  }) as any

  // internal utils - these are technically internal but some plugins use it.
  const util = {
    warn: __DEV__ ? warn : NOOP,
    extend,
    mergeOptions: (parent: any, child: any, vm?: ComponentPublicInstance) =>
      mergeOptions(
        parent,
        child,
        vm ? undefined : (internalOptionMergeStrats as any)
      ),
    defineReactive
  }
  Object.defineProperty(Vue, 'util', {
    get() {
      assertCompatEnabled(DeprecationTypes.GLOBAL_PRIVATE_UTIL, null)
      return util
    }
  })

  Vue.configureCompat = configureCompat

  return Vue
}
/**
 * 
 * @param app 
 * @param context 
 * @param render 
 * @returns 
 * `installAppCompatProperties` 是一个函数，用于安装应用程序的兼容属性和方法。

它接受三个参数：
- `app`：应用程序实例。
- `context`：应用程序上下文。
- `render`：根渲染函数。

在函数内部，它执行以下操作：
1. 调用 `installFilterMethod` 函数，安装兼容的过滤器方法。
2. 调用 `installLegacyOptionMergeStrats` 函数，安装兼容的选项合并策略。
3. 检查 `singletonApp` 是否存在，如果不存在则直接返回，因为接下来的操作都是针对单例应用程序的。
4. 调用 `installCompatMount` 函数，安装兼容的挂载方法。
5. 调用 `installLegacyAPIs` 函数，安装兼容的旧 API 方法。
6. 调用 `applySingletonAppMutations` 函数，应用单例应用程序的变更。
7. 如果处于开发环境 (`__DEV__`)，则调用 `installLegacyConfigWarnings` 函数，安装兼容的配置警告。

通过调用 `installAppCompatProperties` 函数，可以在应用程序中安装兼容的属性和方法，以确保 Vue 2 相关的功能和插件能够在 Vue 3 中正常工作。这有助于实现平滑的迁移和兼容性。
 */
export function installAppCompatProperties(
  app: App,
  context: AppContext,
  render: RootRenderFunction<any>
) {
  installFilterMethod(app, context)
  installLegacyOptionMergeStrats(app.config)

  if (!singletonApp) {
    // this is the call of creating the singleton itself so the rest is
    // unnecessary
    return
  }

  installCompatMount(app, context, render)
  installLegacyAPIs(app)
  applySingletonAppMutations(app)
  if (__DEV__) installLegacyConfigWarnings(app.config)
}
/**
 * 
 * @param app 
 * @param context 
 * `installFilterMethod` 是一个函数，用于安装兼容的过滤器方法。

它接受两个参数：
- `app`：应用程序实例。
- `context`：应用程序上下文。

在函数内部，它执行以下操作：
1. 初始化 `context.filters` 为空对象。
2. 将一个函数赋值给 `app.filter` 属性，该函数用于注册和获取过滤器。
   - 函数接受两个参数：`name`（过滤器名称）和 `filter`（过滤器函数）。
   - 如果只传递了 `name` 参数，则返回 `context.filters[name]`，即获取该名称对应的过滤器函数。
   - 如果同时传递了 `name` 和 `filter` 参数：
     - 如果处于开发环境 (`__DEV__`)，并且已经存在同名的过滤器函数，会发出警告。
     - 将过滤器函数赋值给 `context.filters[name]`，即注册该过滤器函数。
   - 最后返回 `app`，以支持链式调用。

通过调用 `installFilterMethod` 函数，可以在应用程序中安装兼容的过滤器方法，以实现在 Vue 3 中使用 Vue 2 的过滤器功能。这样可以确保现有的过滤器在迁移过程中能够继续正常工作。
 */
function installFilterMethod(app: App, context: AppContext) {
  context.filters = {}
  app.filter = (name: string, filter?: Function): any => {
    assertCompatEnabled(DeprecationTypes.FILTERS, null)
    if (!filter) {
      return context.filters![name]
    }
    if (__DEV__ && context.filters![name]) {
      warn(`Filter "${name}" has already been registered.`)
    }
    context.filters![name] = filter
    return app
  }
}
/**
 * 
 * @param app 
 * `installLegacyAPIs` 是一个函数，用于在应用程序实例上安装兼容的旧版 API。

它接受一个参数：
- `app`：应用程序实例。

在函数内部，它执行以下操作：
1. 使用 `Object.defineProperties` 方法定义应用程序实例的属性。
2. `prototype` 属性：
   - 通过 `get` 方法获取该属性的值。
   - 在开发环境下，发出关于该属性的弃用警告。
   - 返回 `app.config.globalProperties`，即全局属性对象。
3. `nextTick` 属性：
   - 将 `nextTick` 函数赋值给该属性。
4. `extend` 属性：
   - 将 `singletonCtor.extend` 函数赋值给该属性。
5. `set` 属性：
   - 将 `singletonCtor.set` 函数赋值给该属性。
6. `delete` 属性：
   - 将 `singletonCtor.delete` 函数赋值给该属性。
7. `observable` 属性：
   - 将 `singletonCtor.observable` 函数赋值给该属性。
8. `util` 属性：
   - 通过 `get` 方法获取该属性的值。
   - 返回 `singletonCtor.util`。

通过调用 `installLegacyAPIs` 函数，可以在应用程序实例上安装兼容的旧版 API，以支持使用 Vue 2 的插件和功能。这样，Vue 3 应用程序可以继续使用旧版 API，并保持向后兼容性。
 */
function installLegacyAPIs(app: App) {
  // expose global API on app instance for legacy plugins
  Object.defineProperties(app, {
    // so that app.use() can work with legacy plugins that extend prototypes
    prototype: {
      get() {
        __DEV__ && warnDeprecation(DeprecationTypes.GLOBAL_PROTOTYPE, null)
        return app.config.globalProperties
      }
    },
    nextTick: { value: nextTick },
    extend: { value: singletonCtor.extend },
    set: { value: singletonCtor.set },
    delete: { value: singletonCtor.delete },
    observable: { value: singletonCtor.observable },
    util: {
      get() {
        return singletonCtor.util
      }
    }
  })
}
/**
 * 
 * @param app 
 * `applySingletonAppMutations` 是一个函数，用于应用单例应用程序的变更。

它接受一个参数：
- `app`：应用程序实例。

在函数内部，它执行以下操作：
1. 复制资产注册表和 deopt 标志：
   - 将 `singletonApp._context.mixins` 数组复制到 `app._context.mixins` 数组中。
   - 遍历 `['components', 'directives', 'filters']` 数组，分别执行以下操作：
     - 将 `singletonApp._context[key]` 对象的原型创建为 `app._context[key]` 对象。
2. 复制全局配置的变更：
   - 将 `isCopyingConfig` 标志设置为 `true`。
   - 遍历 `singletonApp.config` 中的每个键，执行以下操作：
     - 如果键是 'isNativeTag'，则跳过。
     - 如果是运行时版本，并且键是 'isCustomElement' 或 'compilerOptions'，则跳过。
     - 获取 `singletonApp.config` 中相应键的值。
     - 将值赋给 `app.config` 对应的键。
     - 如果键是 'ignoredElements'，并且兼容性开启了 `CONFIG_IGNORED_ELEMENTS` 的警告，并且不是运行时版本，并且值是数组类型，则执行以下操作：
       - 将 `app.config.compilerOptions.isCustomElement` 设置为一个函数，该函数接受一个标签名作为参数，并返回布尔值。
       - 函数内部会检查 `val` 数组中是否存在与标签名相等的值，如果存在则返回 `true`，否则返回 `false`。
   - 将 `isCopyingConfig` 标志设置为 `false`。
3. 应用单例构造函数的原型到应用程序实例：
   - 调用 `applySingletonPrototype` 函数，将单例构造函数 `singletonCtor` 的原型应用到应用程序实例 `app` 上。

通过调用 `applySingletonAppMutations` 函数，可以应用单例应用程序的变更到应用程序实例，确保应用程序实例与单例应用程序保持一致，并正确处理全局配置和其他相关属性。
 */
function applySingletonAppMutations(app: App) {
  // copy over asset registries and deopt flag
  app._context.mixins = [...singletonApp._context.mixins]
  ;['components', 'directives', 'filters'].forEach(key => {
    // @ts-ignore
    app._context[key] = Object.create(singletonApp._context[key])
  })

  // copy over global config mutations
  isCopyingConfig = true
  for (const key in singletonApp.config) {
    if (key === 'isNativeTag') continue
    if (
      isRuntimeOnly() &&
      (key === 'isCustomElement' || key === 'compilerOptions')
    ) {
      continue
    }
    const val = singletonApp.config[key as keyof AppConfig]
    // @ts-ignore
    app.config[key] = isObject(val) ? Object.create(val) : val

    // compat for runtime ignoredElements -> isCustomElement
    if (
      key === 'ignoredElements' &&
      isCompatEnabled(DeprecationTypes.CONFIG_IGNORED_ELEMENTS, null) &&
      !isRuntimeOnly() &&
      isArray(val)
    ) {
      app.config.compilerOptions.isCustomElement = tag => {
        return val.some(v => (isString(v) ? v === tag : v.test(tag)))
      }
    }
  }
  isCopyingConfig = false
  applySingletonPrototype(app, singletonCtor)
}
/**
 * 
 * @param app 
 * @param Ctor 
 * `applySingletonPrototype` 是一个函数，用于将单例构造函数的原型应用到应用程序实例的配置属性 `config.globalProperties` 上。

它接受两个参数：
- `app`：应用程序实例。
- `Ctor`：单例构造函数。

在函数内部，它执行以下操作：
1. 检查是否允许全局原型扩展（根据 `GLOBAL_PROTOTYPE` 兼容性选项的开启状态）。
2. 如果允许全局原型扩展，则将 `app.config.globalProperties` 设置为 `Ctor.prototype` 的原型创建的对象。
3. 遍历 `Ctor.prototype` 的属性描述符，并执行以下操作：
   - 如果属性名不是 'constructor'，则说明存在原型扩展。
   - 将 `hasPrototypeAugmentations` 标志设置为 `true`。
   - 如果允许全局原型扩展，则将属性描述符添加到 `app.config.globalProperties` 上对应的键中。
4. 如果是开发模式并且存在原型扩展，则发出 `GLOBAL_PROTOTYPE` 的警告。

通过调用 `applySingletonPrototype` 函数，可以将单例构造函数的原型属性应用到应用程序实例的全局属性配置中。这样做可以使应用程序实例继承单例构造函数的原型方法和属性，并在应用程序中使用全局 API 和原型扩展。
 */
function applySingletonPrototype(app: App, Ctor: Function) {
  // copy prototype augmentations as config.globalProperties
  const enabled = isCompatEnabled(DeprecationTypes.GLOBAL_PROTOTYPE, null)
  if (enabled) {
    app.config.globalProperties = Object.create(Ctor.prototype)
  }
  let hasPrototypeAugmentations = false
  const descriptors = Object.getOwnPropertyDescriptors(Ctor.prototype)
  for (const key in descriptors) {
    if (key !== 'constructor') {
      hasPrototypeAugmentations = true
      if (enabled) {
        Object.defineProperty(
          app.config.globalProperties,
          key,
          descriptors[key]
        )
      }
    }
  }
  if (__DEV__ && hasPrototypeAugmentations) {
    warnDeprecation(DeprecationTypes.GLOBAL_PROTOTYPE, null)
  }
}
/**
 * 
 * @param app 
 * @param context 
 * @param render 
 * `installCompatMount` 是一个函数，用于在应用程序实例上安装兼容的 `$mount` 方法。

它接受三个参数：
- `app`：应用程序实例。
- `context`：应用程序上下文。
- `render`：根渲染函数。

在函数内部，它执行以下操作：
1. 定义一个 `isMounted` 变量，用于追踪应用程序实例是否已挂载。
2. 定义 `app._createRoot` 函数，该函数模拟了 Vue 2 中创建组件实例但不挂载的行为。
3. 在 `app._createRoot` 函数内部，执行以下操作：
   - 获取组件和选项参数，创建根虚拟节点。
   - 将应用程序上下文赋值给虚拟节点的 `appContext` 属性。
   - 检查组件是否没有提供渲染函数，并且不是函数和模板字符串形式的组件。
   - 如果是没有提供渲染函数的组件，则将 `instance.render` 设置为一个空函数，用于抑制“缺少渲染函数”的警告。
   - 创建组件实例，并进行组件实例的设置。
   - 将虚拟节点的 `component` 属性设置为组件实例，并标记为兼容的根节点（`isCompatRoot`）。
   - 定义 `instance.ctx._compat_mount` 方法，用于将根实例挂载到指定的选择器或元素上。
   - 在 `instance.ctx._compat_mount` 方法内部，执行以下操作：
     - 检查是否已经挂载了根实例，如果是则发出警告并返回。
     - 根据传入的选择器或元素参数获取容器元素。
     - 如果选择器未找到对应的元素，则发出警告并返回。
     - 创建根实例的虚拟节点，并根据传入的选择器或元素参数设置容器元素。
     - 清空容器内容。
     - 调用 `render` 函数将虚拟节点渲染到容器中。
     - 如果容器是元素节点，则移除 'v-cloak' 属性，并添加 'data-v-app' 属性。
     - 标记应用程序已挂载，并将容器元素赋值给 `app._container`。
     - 为开发工具和遥测初始化应用程序（如果是开发模式）。
     - 返回实例的代理对象。
   - 定义 `instance.ctx._compat_destroy` 方法，用于销毁根实例。
   - 在 `instance.ctx._compat_destroy` 方法内部，执行以下操作：
     - 如果应用程序已挂载，则调用 `render` 函数将虚拟节点从容器中卸载。
     - 如果是开发模式，则为开发工具卸载应用程序。
     - 删除容器元素上的 '__vue_app__' 属性。
     - 如果应用程序未挂载，则执行以下操作：
      
 */
function installCompatMount(
  app: App,
  context: AppContext,
  render: RootRenderFunction
) {
  let isMounted = false

  /**
   * Vue 2 supports the behavior of creating a component instance but not
   * mounting it, which is no longer possible in Vue 3 - this internal
   * function simulates that behavior.
   */
  app._createRoot = options => {
    const component = app._component
    const vnode = createVNode(component, options.propsData || null)
    vnode.appContext = context

    const hasNoRender =
      !isFunction(component) && !component.render && !component.template
    const emptyRender = () => {}

    // create root instance
    const instance = createComponentInstance(vnode, null, null)
    // suppress "missing render fn" warning since it can't be determined
    // until $mount is called
    if (hasNoRender) {
      instance.render = emptyRender
    }
    setupComponent(instance)
    vnode.component = instance
    vnode.isCompatRoot = true

    // $mount & $destroy
    // these are defined on ctx and picked up by the $mount/$destroy
    // public property getters on the instance proxy.
    // Note: the following assumes DOM environment since the compat build
    // only targets web. It essentially includes logic for app.mount from
    // both runtime-core AND runtime-dom.
    instance.ctx._compat_mount = (selectorOrEl?: string | Element) => {
      if (isMounted) {
        __DEV__ && warn(`Root instance is already mounted.`)
        return
      }

      let container: Element
      if (typeof selectorOrEl === 'string') {
        // eslint-disable-next-line
        const result = document.querySelector(selectorOrEl)
        if (!result) {
          __DEV__ &&
            warn(
              `Failed to mount root instance: selector "${selectorOrEl}" returned null.`
            )
          return
        }
        container = result
      } else {
        // eslint-disable-next-line
        container = selectorOrEl || document.createElement('div')
      }

      const isSVG = container instanceof SVGElement

      // HMR root reload
      if (__DEV__) {
        context.reload = () => {
          const cloned = cloneVNode(vnode)
          // compat mode will use instance if not reset to null
          cloned.component = null
          render(cloned, container, isSVG)
        }
      }

      // resolve in-DOM template if component did not provide render
      // and no setup/mixin render functions are provided (by checking
      // that the instance is still using the placeholder render fn)
      if (hasNoRender && instance.render === emptyRender) {
        // root directives check
        if (__DEV__) {
          for (let i = 0; i < container.attributes.length; i++) {
            const attr = container.attributes[i]
            if (attr.name !== 'v-cloak' && /^(v-|:|@)/.test(attr.name)) {
              warnDeprecation(DeprecationTypes.GLOBAL_MOUNT_CONTAINER, null)
              break
            }
          }
        }
        instance.render = null
        ;(component as ComponentOptions).template = container.innerHTML
        finishComponentSetup(instance, false, true /* skip options */)
      }

      // clear content before mounting
      container.innerHTML = ''

      // TODO hydration
      render(vnode, container, isSVG)

      if (container instanceof Element) {
        container.removeAttribute('v-cloak')
        container.setAttribute('data-v-app', '')
      }

      isMounted = true
      app._container = container
      // for devtools and telemetry
      ;(container as any).__vue_app__ = app
      if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
        devtoolsInitApp(app, version)
      }

      return instance.proxy!
    }

    instance.ctx._compat_destroy = () => {
      if (isMounted) {
        render(null, app._container)
        if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
          devtoolsUnmountApp(app)
        }
        delete app._container.__vue_app__
      } else {
        const { bum, scope, um } = instance
        // beforeDestroy hooks
        if (bum) {
          invokeArrayFns(bum)
        }
        if (isCompatEnabled(DeprecationTypes.INSTANCE_EVENT_HOOKS, instance)) {
          instance.emit('hook:beforeDestroy')
        }
        // stop effects
        if (scope) {
          scope.stop()
        }
        // unmounted hook
        if (um) {
          invokeArrayFns(um)
        }
        if (isCompatEnabled(DeprecationTypes.INSTANCE_EVENT_HOOKS, instance)) {
          instance.emit('hook:destroyed')
        }
      }
    }

    return instance.proxy!
  }
}
/**
 * `methodsToPatch` 是一个包含需要进行补丁的方法名称的数组。这些方法用于在 Vue 3 兼容模式下修改数组。数组的这些方法会被拦截并转换为对应的 Vue 3 兼容方法，以确保在兼容模式下数组操作的正确性。以下是数组的这些方法的解释：

- `push`: 向数组末尾添加一个或多个元素，并返回新的长度。
- `pop`: 删除并返回数组的最后一个元素。
- `shift`: 删除并返回数组的第一个元素。
- `unshift`: 向数组开头添加一个或多个元素，并返回新的长度。
- `splice`: 从数组中添加/删除项目，然后返回被删除的项目。
- `sort`: 对数组进行排序。
- `reverse`: 颠倒数组中元素的顺序。

在 Vue 3 兼容模式下，这些方法会被修改以触发相应的响应式更新。
 */
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
/**
 * `patched` 是一个 `WeakSet`，用于存储已经进行过补丁的对象。它的作用是避免对同一个对象进行重复的补丁操作。

`WeakSet` 是 JavaScript 的一种集合数据结构，它可以存储对象类型的弱引用。`WeakSet` 中存储的对象是弱引用，不会阻止这些对象被垃圾回收。当一个对象在其他地方没有被引用时，它可以被垃圾回收，而不会受到 `WeakSet` 的影响。

在这个特定的情况下，`patched` 用于存储已经进行过补丁的对象，以确保不会对同一个对象进行重复的补丁操作。
 */
const patched = new WeakSet<object>()
/**
 * 
 * @param obj 
 * @param key 
 * @param val 
 * 该函数 `defineReactive` 用于定义对象的响应式属性。

函数的参数如下：
- `obj`：要定义属性的对象。
- `key`：属性的键名。
- `val`：属性的初始值。

函数的主要逻辑如下：
1. 首先判断 `val` 是否是对象类型且不是已经被定义为响应式的对象，也不是已经进行过补丁操作的对象。如果满足条件，将 `val` 转换为响应式对象，并进行进一步处理。
2. 如果 `val` 是数组类型，通过遍历 `methodsToPatch` 数组，对数组的可变方法进行补丁。补丁的逻辑是将调用方法的操作委托给相应的响应式数组。
3. 如果 `val` 是普通对象类型，遍历对象的属性，对每个属性调用 `defineReactiveSimple` 函数，递归定义属性的响应式。
4. 如果 `obj` 是一个 Vue 实例，并且 `obj` 与 `obj.$` 的 `proxy` 属性相同，说明 `obj` 是一个 Vue 实例的代理对象。在这种情况下，将属性定义在 `obj.$` 的 `ctx` 上，并清空 `obj.$` 的 `accessCache`。
5. 如果 `obj` 是一个已经定义为响应式的对象，则直接给属性赋值。
6. 如果 `obj` 不是响应式对象，则调用 `defineReactiveSimple` 函数，定义属性的响应式。

总结来说，`defineReactive` 函数会根据传入的对象类型和属性值，对对象的属性进行响应式定义，使其能够在变化时触发相应的更新。如果属性值是对象或数组类型，会递归地将其转换为响应式对象，并对数组的可变方法进行补丁操作。
 */
function defineReactive(obj: any, key: string, val: any) {
  // it's possible for the original object to be mutated after being defined
  // and expecting reactivity... we are covering it here because this seems to
  // be a bit more common.
  if (isObject(val) && !isReactive(val) && !patched.has(val)) {
    const reactiveVal = reactive(val)
    if (isArray(val)) {
      methodsToPatch.forEach(m => {
        // @ts-ignore
        val[m] = (...args: any[]) => {
          // @ts-ignore
          Array.prototype[m].call(reactiveVal, ...args)
        }
      })
    } else {
      Object.keys(val).forEach(key => {
        try {
          defineReactiveSimple(val, key, val[key])
        } catch (e: any) {}
      })
    }
  }

  const i = obj.$
  if (i && obj === i.proxy) {
    // target is a Vue instance - define on instance.ctx
    defineReactiveSimple(i.ctx, key, val)
    i.accessCache = Object.create(null)
  } else if (isReactive(obj)) {
    obj[key] = val
  } else {
    defineReactiveSimple(obj, key, val)
  }
}
/**
 * 
 * @param obj 
 * @param key 
 * @param val 
 * `defineReactiveSimple` 函数用于定义对象的简单响应式属性。

函数的参数如下：
- `obj`：要定义属性的对象。
- `key`：属性的键名。
- `val`：属性的初始值。

函数的主要逻辑如下：
1. 首先判断 `val` 是否是对象类型，如果是，则将 `val` 转换为响应式对象。
2. 使用 `Object.defineProperty` 方法定义属性 `key` 在对象 `obj` 上的访问器属性。
   - `enumerable` 和 `configurable` 设置为 `true`，使属性可枚举和可配置。
   - `get` 函数在属性获取时被调用，会进行依赖追踪（`track`）并返回属性的值 `val`。
   - `set` 函数在属性被赋新值时被调用，会将新值 `newVal` 转换为响应式对象（如果是对象类型），并触发相应的依赖更新（`trigger`）。

总结来说，`defineReactiveSimple` 函数会对对象的指定属性进行简单的响应式定义，通过 `Object.defineProperty` 方法定义属性的访问器属性，并在属性的获取和设置时触发相应的依赖追踪和更新操作。如果属性的值是对象类型，会将其转换为响应式对象。
 */
function defineReactiveSimple(obj: any, key: string, val: any) {
  val = isObject(val) ? reactive(val) : val
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      track(obj, TrackOpTypes.GET, key)
      return val
    },
    set(newVal) {
      val = isObject(newVal) ? reactive(newVal) : newVal
      trigger(obj, TriggerOpTypes.SET, key, newVal)
    }
  })
}
