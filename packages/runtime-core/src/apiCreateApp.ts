import {
  ConcreteComponent,
  Data,
  validateComponentName,
  Component,
  ComponentInternalInstance,
  getExposeProxy
} from './component'
import {
  ComponentOptions,
  MergedComponentOptions,
  RuntimeCompilerOptions
} from './componentOptions'
import {
  ComponentCustomProperties,
  ComponentPublicInstance
} from './componentPublicInstance'
import { Directive, validateDirectiveName } from './directives'
import { RootRenderFunction } from './renderer'
import { InjectionKey } from './apiInject'
import { warn } from './warning'
import { createVNode, cloneVNode, VNode } from './vnode'
import { RootHydrateFunction } from './hydration'
import { devtoolsInitApp, devtoolsUnmountApp } from './devtools'
import { isFunction, NO, isObject, extend } from '@vue/shared'
import { version } from '.'
import { installAppCompatProperties } from './compat/global'
import { NormalizedPropsOptions } from './componentProps'
import { ObjectEmitsOptions } from './componentEmits'
/**
 * `App` 接口定义了 Vue.js 应用程序的实例对象的属性和方法。

它具有以下属性：

- `version`：Vue.js 的版本号。
- `config`：应用程序的配置对象。

它具有以下方法：

- `use`：用于安装插件的方法。可以接受一个插件对象和可选的插件选项作为参数。
- `mixin`：用于混入组件选项的方法。
- `component`：用于注册和获取组件的方法。
- `directive`：用于注册和获取指令的方法。
- `mount`：用于挂载应用程序到指定的容器元素上的方法。
- `unmount`：用于卸载应用程序的方法。
- `provide`：用于提供依赖注入的方法。
- `runWithContext`：在应用程序作为活动实例时运行函数的方法。在函数内部可以使用 `inject()` 获取通过 `app.provide()` 提供的变量。

此外，还有一些内部属性用于内部实现，但在服务器渲染和开发工具中需要公开。

最后，还有一些用于兼容版本的方法，如 `filter` 和 `_createRoot`。

`App` 接口定义了 Vue.js 应用程序实例的行为和功能，是创建和管理应用程序的入口点。
 */
export interface App<HostElement = any> {
  version: string
  config: AppConfig

  use<Options extends unknown[]>(
    plugin: Plugin<Options>,
    ...options: Options
  ): this
  use<Options>(plugin: Plugin<Options>, options: Options): this

  mixin(mixin: ComponentOptions): this
  component(name: string): Component | undefined
  component(name: string, component: Component): this
  directive(name: string): Directive | undefined
  directive(name: string, directive: Directive): this
  mount(
    rootContainer: HostElement | string,
    isHydrate?: boolean,
    isSVG?: boolean
  ): ComponentPublicInstance
  unmount(): void
  provide<T>(key: InjectionKey<T> | string, value: T): this

  /**
   * Runs a function with the app as active instance. This allows using of `inject()` within the function to get access
   * to variables provided via `app.provide()`.
   *
   * @param fn - function to run with the app as active instance
   */
  runWithContext<T>(fn: () => T): T

  // internal, but we need to expose these for the server-renderer and devtools
  _uid: number
  _component: ConcreteComponent
  _props: Data | null
  _container: HostElement | null
  _context: AppContext
  _instance: ComponentInternalInstance | null

  /**
   * v2 compat only
   */
  filter?(name: string): Function | undefined
  filter?(name: string, filter: Function): this

  /**
   * @internal v3 compat only
   */
  _createRoot?(options: ComponentOptions): ComponentPublicInstance
}
/**
 * `OptionMergeFunction` 是一个类型别名，表示选项合并函数的类型。选项合并函数接受两个参数 `to` 和 `from`，并返回合并后的选项值。

在 Vue.js 中，选项合并函数用于合并组件选项和混入选项。当一个组件使用混入时，混入选项会与组件的选项进行合并，以创建最终的组件选项。选项合并函数决定了如何合并两个选项对象。

一般情况下，选项合并函数会根据特定的规则将 `from` 的属性合并到 `to` 中。这个规则可以是覆盖、合并数组、合并对象等，具体取决于选项的含义和需要。

通过定义选项合并函数，Vue.js 允许开发者自定义选项的合并行为，以满足特定的需求和逻辑。

示例使用：
```typescript
const mergeOptions: OptionMergeFunction = (to, from) => {
  // 自定义的选项合并逻辑
  // ...
  return mergedOptions;
}
```

在 Vue.js 的组件和混入选项中，可以通过指定 `mixins` 选项来使用混入。混入选项会与组件选项进行合并，使用选项合并函数来决定合并的方式。
 */
export type OptionMergeFunction = (to: unknown, from: unknown) => any
/**
 * `AppConfig` 接口定义了应用程序的配置选项。

- `isNativeTag`：一个可选的函数，用于判断给定的标签名是否为原生标签。

- `performance`：一个布尔值，指示是否在开发模式下记录组件性能。

- `optionMergeStrategies`：一个映射对象，用于定义选项合并的策略。键是选项名，值是用于合并选项的函数。

- `globalProperties`：一个映射对象，用于定义全局的自定义属性。这些属性可以在组件中直接访问，无需导入或声明。

- `errorHandler`：一个可选的错误处理函数，用于捕获组件内部的错误。当组件发生错误时，该函数会被调用，接收错误对象、组件实例和错误信息作为参数。

- `warnHandler`：一个可选的警告处理函数，用于捕获组件内部的警告信息。当组件发出警告时，该函数会被调用，接收警告消息、组件实例和调用栈信息作为参数。

- `compilerOptions`：一个对象，用于传递给 `@vue/compiler-dom` 的选项。仅在运行时编译器构建中受支持。

- `isCustomElement`：一个可选的函数，用于判断给定的标签名是否为自定义元素。**已弃用**。请使用 `config.compilerOptions.isCustomElement` 替代。

- `unwrapInjectedRef`：一个可选的布尔值，用于控制是否解包注入的 `ref`。**已弃用**。自 3.3 版本起，始终会解包注入的 `ref`，不再需要此选项。

示例使用：
```typescript
const appConfig: AppConfig = {
  performance: true,
  optionMergeStrategies: {
    // 自定义选项合并策略
    // ...
  },
  globalProperties: {
    // 全局自定义属性
    // ...
  },
  errorHandler: (err, instance, info) => {
    // 错误处理逻辑
    // ...
  },
  warnHandler: (msg, instance, trace) => {
    // 警告处理逻辑
    // ...
  },
  compilerOptions: {
    // 编译器选项
    // ...
  }
}
```

通过配置 `AppConfig`，可以定制应用程序的行为和功能，并提供全局的配置选项。
 */
export interface AppConfig {
  // @private
  readonly isNativeTag?: (tag: string) => boolean

  performance: boolean
  optionMergeStrategies: Record<string, OptionMergeFunction>
  globalProperties: ComponentCustomProperties & Record<string, any>
  errorHandler?: (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string
  ) => void
  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string
  ) => void

  /**
   * Options to pass to `@vue/compiler-dom`.
   * Only supported in runtime compiler build.
   */
  compilerOptions: RuntimeCompilerOptions

  /**
   * @deprecated use config.compilerOptions.isCustomElement
   */
  isCustomElement?: (tag: string) => boolean

  // TODO remove in 3.4
  /**
   * Temporary config for opt-in to unwrap injected refs.
   * @deprecated this no longer has effect. 3.3 always unwraps injected refs.
   */
  unwrapInjectedRef?: boolean
}
/**
 * `AppContext` 接口定义了应用程序的上下文。

- `app`：用于开发工具的应用程序实例。

- `config`：应用程序的配置选项。

- `mixins`：应用程序中使用的混入选项数组。

- `components`：应用程序注册的组件集合，键是组件名，值是组件定义。

- `directives`：应用程序注册的指令集合，键是指令名，值是指令定义。

- `provides`：应用程序提供的依赖注入实例集合，键是注入标识符，值是注入实例。

- `optionsCache`：用于缓存合并/规范化的组件选项的 WeakMap。每个应用程序实例都有自己的缓存，因为应用程序级别的全局混入和选项合并策略会影响合并行为。

- `propsCache`：用于缓存规范化的 props 选项的 WeakMap。

- `emitsCache`：用于缓存规范化的 emits 选项的 WeakMap。

- `reload`：HMR（热模块替换）时用于重新加载应用程序的函数。

- `filters`：仅用于兼容 Vue 2.x，用于注册过滤器的集合。

示例使用：
```typescript
const appContext: AppContext = {
  app: appInstance, // 应用程序实例
  config: appConfig, // 应用程序配置
  mixins: [], // 混入选项数组
  components: {}, // 注册的组件集合
  directives: {}, // 注册的指令集合
  provides: {}, // 依赖注入实例集合
  optionsCache: new WeakMap(), // 组件选项缓存
  propsCache: new WeakMap(), // props 选项缓存
  emitsCache: new WeakMap(), // emits 选项缓存
  reload: () => {
    // HMR 重新加载应用程序逻辑
    // ...
  },
  filters: {} // 仅用于 Vue 2.x 的过滤器集合
}
```

`AppContext` 提供了应用程序在运行时的上下文信息，可以用于访问应用程序的配置、组件、指令等相关信息，并进行相应的操作和扩展。
 */
export interface AppContext {
  app: App // for devtools
  config: AppConfig
  mixins: ComponentOptions[]
  components: Record<string, Component>
  directives: Record<string, Directive>
  provides: Record<string | symbol, any>

  /**
   * Cache for merged/normalized component options
   * Each app instance has its own cache because app-level global mixins and
   * optionMergeStrategies can affect merge behavior.
   * @internal
   */
  optionsCache: WeakMap<ComponentOptions, MergedComponentOptions>
  /**
   * Cache for normalized props options
   * @internal
   */
  propsCache: WeakMap<ConcreteComponent, NormalizedPropsOptions>
  /**
   * Cache for normalized emits options
   * @internal
   */
  emitsCache: WeakMap<ConcreteComponent, ObjectEmitsOptions | null>
  /**
   * HMR only
   * @internal
   */
  reload?: () => void
  /**
   * v2 compat only
   * @internal
   */
  filters?: Record<string, Function>
}
/**
 * `PluginInstallFunction` 是一个泛型类型，用于定义插件的安装函数。

它接受一个类型参数 `Options`，该参数可以是一个数组类型（`unknown[]`）或者一个普通类型。

如果 `Options` 是一个数组类型，则插件的安装函数接受 `app` 实例和一个可变参数列表 `...options`，类型为 `Options`，表示插件的配置选项。

如果 `Options` 是一个普通类型，则插件的安装函数接受 `app` 实例和一个参数 `options`，类型为 `Options`，表示插件的配置选项。

安装函数的返回值可以是任意类型。

示例使用：
```typescript
// 插件安装函数接受 app 实例和一个可变参数列表
const pluginWithArrayOptions: PluginInstallFunction<string[]> = (app, ...options) => {
  // 安装逻辑，options 是一个字符串数组
  // ...
}

// 插件安装函数接受 app 实例和一个参数
const pluginWithSingleOption: PluginInstallFunction<number> = (app, options) => {
  // 安装逻辑，options 是一个数字
  // ...
}

// 安装插件
app.use(pluginWithArrayOptions, 'option1', 'option2', 'option3');
app.use(pluginWithSingleOption, 42);
```

通过使用泛型类型 `PluginInstallFunction`，可以灵活地定义插件的安装函数，并在安装插件时提供相应的配置选项。
 */
type PluginInstallFunction<Options> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any
/**
 * `Plugin` 是一个泛型类型，用于定义插件。

它接受一个类型参数 `Options`，表示插件的配置选项，默认为 `any[]` 类型（即任意数组类型）。

`Plugin` 类型可以具有以下两种形式：

1. 插件可以是一个函数，即 `PluginInstallFunction<Options>` 类型，并且可以附带一个可选的 `install` 属性，该属性也是一个插件安装函数。这种形式表示插件可以直接作为安装函数使用，也可以通过 `install` 属性安装。

2. 插件可以是一个对象，该对象具有 `install` 属性，类型为 `PluginInstallFunction<Options>`，表示插件的安装函数。这种形式表示插件只能通过 `install` 属性安装。

插件的安装函数接受 `app` 实例和插件的配置选项作为参数，并返回一个任意类型的值。

示例使用：
```typescript
// 插件是一个函数
const pluginFunction: Plugin<number> = (app, options) => {
  // 安装逻辑，options 是一个数字
  // ...
}

// 插件是一个函数，并且具有 install 属性
const pluginFunctionWithInstall: Plugin<string[]> = (app, ...options) => {
  // 安装逻辑，options 是一个字符串数组
  // ...
}
pluginFunctionWithInstall.install = (app, ...options) => {
  // 安装逻辑，与上面的函数相同
  // ...
}

// 插件是一个对象，具有 install 属性
const pluginObject: Plugin<boolean> = {
  install: (app, options) => {
    // 安装逻辑，options 是一个布尔值
    // ...
  }
}

// 安装插件
app.use(pluginFunction, 42);
app.use(pluginFunctionWithInstall, 'option1', 'option2', 'option3');
app.use(pluginObject, true);
```

通过使用泛型类型 `Plugin`，可以定义具有不同形式的插件，并在安装插件时提供相应的配置选项。
 */
export type Plugin<Options = any[]> =
  | (PluginInstallFunction<Options> & {
      install?: PluginInstallFunction<Options>
    })
  | {
      install: PluginInstallFunction<Options>
    }
/**
 * 
 * @returns 
 * `createAppContext` 是一个函数，用于创建一个应用程序上下文对象 `AppContext`。

它没有接受任何参数，返回一个新的 `AppContext` 对象，该对象具有以下属性：

- `app`：一个占位符，用于在开发工具中引用应用程序实例。
- `config`：应用程序的配置对象，包含了一些配置选项，如是否使用原生标签、性能设置、全局属性等。
  - `isNativeTag`：一个函数，用于判断给定的标签名是否为原生标签。
  - `performance`：一个布尔值，表示是否开启性能监测。
  - `globalProperties`：一个对象，包含了全局的自定义属性和方法。
  - `optionMergeStrategies`：一个记录了选项合并策略的对象。
  - `errorHandler`：一个用于处理错误的回调函数。
  - `warnHandler`：一个用于处理警告的回调函数。
  - `compilerOptions`：传递给 `@vue/compiler-dom` 的选项对象，仅在运行时编译器构建中支持。
- `mixins`：一个数组，存储应用程序中使用的混入选项。
- `components`：一个记录了应用程序中注册的组件的对象。
- `directives`：一个记录了应用程序中注册的指令的对象。
- `provides`：一个记录了应用程序中提供的数据的对象。
- `optionsCache`：一个 `WeakMap` 实例，用于缓存合并和规范化的组件选项。
- `propsCache`：一个 `WeakMap` 实例，用于缓存规范化的 props 选项。
- `emitsCache`：一个 `WeakMap` 实例，用于缓存规范化的 emits 选项。

示例用法：
```typescript
const appContext = createAppContext();
```

通过调用 `createAppContext` 函数，可以创建一个新的应用程序上下文对象，该对象包含了应用程序的配置、组件、指令等相关信息，并可在应用程序的生命周期中使用。
 */
export function createAppContext(): AppContext {
  return {
    app: null as any,
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap()
  }
}
/**
 * `CreateAppFunction` 是一个泛型函数类型，用于创建应用程序实例对象 `App` 的函数。

它接受两个参数：

- `rootComponent`：根组件，作为应用程序的入口组件。
- `rootProps`：根组件的属性，可选参数。

函数返回一个 `App` 对象，该对象具有以下属性和方法：

- `version`：Vue 的版本号。
- `config`：应用程序的配置对象。
- `use`：用于安装插件的方法。
- `mixin`：用于全局混入组件选项的方法。
- `component`：用于注册和获取组件的方法。
- `directive`：用于注册和获取指令的方法。
- `mount`：将应用程序挂载到指定的根容器上。
- `unmount`：卸载应用程序。
- `provide`：向应用程序中的组件提供数据。
- `runWithContext`：在应用程序作为活动实例时运行一个函数。
- `_uid`：应用程序的唯一标识符。
- `_component`：根组件的实际构造函数。
- `_props`：根组件的属性。
- `_container`：根容器。
- `_context`：应用程序的上下文对象。
- `_instance`：根组件的实例对象。
- `filter`：用于注册和获取过滤器的方法（v2 兼容）。
- `_createRoot`：创建根组件实例对象（v3 兼容）。

示例用法：
```typescript
const createApp: CreateAppFunction<Element> = (rootComponent, rootProps) => {
  // 创建应用程序实例
  const app: App<Element> = {
    version: '2.6.14',
    config: { ... },
    use: (plugin, options) => { ... },
    mixin: (mixin) => { ... },
    component: (name, component) => { ... },
    directive: (name, directive) => { ... },
    mount: (rootContainer, isHydrate, isSVG) => { ... },
    unmount: () => { ... },
    provide: (key, value) => { ... },
    runWithContext: (fn) => { ... },
    _uid: 1,
    _component: rootComponent,
    _props: rootProps || null,
    _container: null,
    _context: null,
    _instance: null,
    filter: (name, filter) => { ... },
    _createRoot: (options) => { ... }
  };

  return app;
};
```

通过调用 `createApp` 函数并传入根组件和根组件的属性，可以创建一个应用程序实例对象，用于配置和管理应用程序的生命周期、组件、指令等相关功能。
 */
export type CreateAppFunction<HostElement> = (
  rootComponent: Component,
  rootProps?: Data | null
) => App<HostElement>

let uid = 0
/**
 * 
 * @param render 
 * @param hydrate 
 * @returns 
 * 当调用 `createAppAPI` 函数时，会返回一个 `createApp` 函数。`createApp` 函数用于创建 Vue 应用程序实例。

首先，检查 `rootComponent` 是否为函数类型。如果不是函数类型，将其克隆为一个对象。

然后，创建一个应用程序上下文（`context`）对象，通过调用 `createAppContext` 函数来实现。应用程序上下文包含了应用程序的配置、组件、指令等信息。

接下来，创建一个 `installedPlugins` 集合，用于跟踪已安装的插件。

然后，定义了一个 `app` 对象，它表示应用程序实例。`app` 对象具有一系列属性和方法，用于配置应用程序、安装插件、注册组件和指令、挂载应用程序到 DOM 元素以及卸载应用程序。

其中一些重要的属性和方法包括：

- `_uid`：应用程序实例的唯一标识符。
- `_component`：根组件的具体组件定义。
- `_props`：传递给根组件的 props。
- `_container`：应用程序挂载的 DOM 元素容器。
- `_context`：应用程序的上下文对象。
- `_instance`：根组件的实例。
- `version`：Vue 的版本号。
- `config`：应用程序的配置对象，包含全局配置选项。
- `use`：安装插件的方法，可以接受一个插件函数或对象，并调用其 `install` 方法来安装插件。
- `mixin`：混入（mixin）一个组件选项对象，用于添加全局的组件选项。
- `component`：注册一个组件，可以通过指定名称和组件定义来注册。
- `directive`：注册一个指令，可以通过指定名称和指令对象来注册。
- `mount`：将应用程序挂载到指定的 DOM 元素上。
- `unmount`：卸载应用程序，从 DOM 元素中移除。
- `provide`：在应用程序的上下文中提供一个属性，可以在组件中使用。
- `runWithContext`：在指定上下文中运行一个函数。

最后，根据是否为兼容模式，可能会调用 `installAppCompatProperties` 函数来安装兼容性的属性和方法。

通过调用 `createApp` 函数，我们可以创建 Vue 应用程序实例，并使用返回的 `app` 对象进行相关的配置、操作和管理。
 */
export function createAppAPI<HostElement>(
  render: RootRenderFunction<HostElement>,
  hydrate?: RootHydrateFunction
): CreateAppFunction<HostElement> {
  return function createApp(rootComponent, rootProps = null) {
    if (!isFunction(rootComponent)) {
      rootComponent = extend({}, rootComponent)
    }

    if (rootProps != null && !isObject(rootProps)) {
      __DEV__ && warn(`root props passed to app.mount() must be an object.`)
      rootProps = null
    }

    const context = createAppContext()

    // TODO remove in 3.4
    if (__DEV__) {
      Object.defineProperty(context.config, 'unwrapInjectedRef', {
        get() {
          return true
        },
        set() {
          warn(
            `app.config.unwrapInjectedRef has been deprecated. ` +
              `3.3 now alawys unwraps injected refs in Options API.`
          )
        }
      })
    }

    const installedPlugins = new Set()

    let isMounted = false

    const app: App = (context.app = {
      _uid: uid++,
      _component: rootComponent as ConcreteComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      _instance: null,

      version,

      get config() {
        return context.config
      },

      set config(v) {
        if (__DEV__) {
          warn(
            `app.config cannot be replaced. Modify individual options instead.`
          )
        }
      },

      use(plugin: Plugin, ...options: any[]) {
        if (installedPlugins.has(plugin)) {
          __DEV__ && warn(`Plugin has already been applied to target app.`)
        } else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin)
          plugin.install(app, ...options)
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin)
          plugin(app, ...options)
        } else if (__DEV__) {
          warn(
            `A plugin must either be a function or an object with an "install" ` +
              `function.`
          )
        }
        return app
      },

      mixin(mixin: ComponentOptions) {
        if (__FEATURE_OPTIONS_API__) {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin)
          } else if (__DEV__) {
            warn(
              'Mixin has already been applied to target app' +
                (mixin.name ? `: ${mixin.name}` : '')
            )
          }
        } else if (__DEV__) {
          warn('Mixins are only available in builds supporting Options API')
        }
        return app
      },

      component(name: string, component?: Component): any {
        if (__DEV__) {
          validateComponentName(name, context.config)
        }
        if (!component) {
          return context.components[name]
        }
        if (__DEV__ && context.components[name]) {
          warn(`Component "${name}" has already been registered in target app.`)
        }
        context.components[name] = component
        return app
      },

      directive(name: string, directive?: Directive) {
        if (__DEV__) {
          validateDirectiveName(name)
        }

        if (!directive) {
          return context.directives[name] as any
        }
        if (__DEV__ && context.directives[name]) {
          warn(`Directive "${name}" has already been registered in target app.`)
        }
        context.directives[name] = directive
        return app
      },

      mount(
        rootContainer: HostElement,
        isHydrate?: boolean,
        isSVG?: boolean
      ): any {
        if (!isMounted) {
          // #5571
          if (__DEV__ && (rootContainer as any).__vue_app__) {
            warn(
              `There is already an app instance mounted on the host container.\n` +
                ` If you want to mount another app on the same host container,` +
                ` you need to unmount the previous app by calling \`app.unmount()\` first.`
            )
          }
          const vnode = createVNode(rootComponent, rootProps)
          // store app context on the root VNode.
          // this will be set on the root instance on initial mount.
          vnode.appContext = context

          // HMR root reload
          if (__DEV__) {
            context.reload = () => {
              render(cloneVNode(vnode), rootContainer, isSVG)
            }
          }

          if (isHydrate && hydrate) {
            hydrate(vnode as VNode<Node, Element>, rootContainer as any)
          } else {
            render(vnode, rootContainer, isSVG)
          }
          isMounted = true
          app._container = rootContainer
          // for devtools and telemetry
          ;(rootContainer as any).__vue_app__ = app

          if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
            app._instance = vnode.component
            devtoolsInitApp(app, version)
          }

          return getExposeProxy(vnode.component!) || vnode.component!.proxy
        } else if (__DEV__) {
          warn(
            `App has already been mounted.\n` +
              `If you want to remount the same app, move your app creation logic ` +
              `into a factory function and create fresh app instances for each ` +
              `mount - e.g. \`const createMyApp = () => createApp(App)\``
          )
        }
      },

      unmount() {
        if (isMounted) {
          render(null, app._container)
          if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
            app._instance = null
            devtoolsUnmountApp(app)
          }
          delete app._container.__vue_app__
        } else if (__DEV__) {
          warn(`Cannot unmount an app that is not mounted.`)
        }
      },

      provide(key, value) {
        if (__DEV__ && (key as string | symbol) in context.provides) {
          warn(
            `App already provides property with key "${String(key)}". ` +
              `It will be overwritten with the new value.`
          )
        }

        context.provides[key as string | symbol] = value

        return app
      },

      runWithContext(fn) {
        currentApp = app
        try {
          return fn()
        } finally {
          currentApp = null
        }
      }
    })

    if (__COMPAT__) {
      installAppCompatProperties(app, context, render)
    }

    return app
  }
}

/**
 * @internal Used to identify the current app when using `inject()` within
 * `app.runWithContext()`.
 * 这行代码导出了一个名为 `currentApp` 的变量，并初始化为 `null`。它是一个全局变量，用于存储当前的 Vue 应用程序实例。

变量的类型是 `App<unknown> | null`，表示它可以存储一个 `App` 类型的实例，或者是 `null` 值。

通过在不同的应用程序实例之间更新 `currentApp` 变量，我们可以跟踪当前活动的应用程序实例，以便在需要时进行访问或操作。
 */
export let currentApp: App<unknown> | null = null
