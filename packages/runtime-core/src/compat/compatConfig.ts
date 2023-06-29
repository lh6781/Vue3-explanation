import { extend, hasOwn, isArray, isFunction } from '@vue/shared'
import {
  Component,
  ComponentInternalInstance,
  ComponentOptions,
  formatComponentName,
  getComponentName,
  getCurrentInstance,
  isRuntimeOnly
} from '../component'
import { warn } from '../warning'
/**
这是一个枚举类型 `DeprecationTypes`，用于表示不推荐使用的功能或选项的类型。

枚举类型包含了多个常量成员，每个成员都表示一种不推荐使用的功能或选项，并用字符串值进行标识。

以下是枚举类型 `DeprecationTypes` 的成员列表及其含义：

- `GLOBAL_MOUNT`: 全局挂载功能不推荐使用
- `GLOBAL_MOUNT_CONTAINER`: 全局挂载容器不推荐使用
- `GLOBAL_EXTEND`: 全局扩展功能不推荐使用
- `GLOBAL_PROTOTYPE`: 全局原型功能不推荐使用
- `GLOBAL_SET`: 全局设置功能不推荐使用
- `GLOBAL_DELETE`: 全局删除功能不推荐使用
- `GLOBAL_OBSERVABLE`: 全局可观察功能不推荐使用
- `GLOBAL_PRIVATE_UTIL`: 全局私有工具不推荐使用
- `CONFIG_SILENT`: 配置静默模式不推荐使用
- `CONFIG_DEVTOOLS`: 配置开发者工具不推荐使用
- `CONFIG_KEY_CODES`: 配置按键码不推荐使用
- `CONFIG_PRODUCTION_TIP`: 配置生产提示不推荐使用
- `CONFIG_IGNORED_ELEMENTS`: 配置忽略元素不推荐使用
- `CONFIG_WHITESPACE`: 配置空白处理不推荐使用
- `CONFIG_OPTION_MERGE_STRATS`: 配置选项合并策略不推荐使用
- `INSTANCE_SET`: 实例设置功能不推荐使用
- `INSTANCE_DELETE`: 实例删除功能不推荐使用
- `INSTANCE_DESTROY`: 实例销毁功能不推荐使用
- `INSTANCE_EVENT_EMITTER`: 实例事件发射器不推荐使用
- `INSTANCE_EVENT_HOOKS`: 实例事件钩子不推荐使用
- `INSTANCE_CHILDREN`: 实例子节点不推荐使用
- `INSTANCE_LISTENERS`: 实例监听器不推荐使用
- `INSTANCE_SCOPED_SLOTS`: 实例作用域插槽不推荐使用
- `INSTANCE_ATTRS_CLASS_STYLE`: 实例属性、类和样式不推荐使用
- `OPTIONS_DATA_FN`: 选项数据函数不推荐使用
- `OPTIONS_DATA_MERGE`: 选项数据合并不推荐使用
- `OPTIONS_BEFORE_DESTROY`: 选项销毁前钩子不推荐使用
- `OPTIONS_DESTROYED`: 选项已销毁钩子不推荐使用
- `WATCH_ARRAY`: 监听数组不推荐使用
- `PROPS_DEFAULT_THIS`: 属性默认值不推荐使用
- `V_ON_KEYCODE_MODIFIER`: `v-on` 按键修饰符不推荐使用
- `CUSTOM_DIR`: 自定义指令不推荐使用
- `ATTR_FALSE_VALUE`: 属性的假值不推荐使用
- `ATTR_ENUMERATED_COERCION`: 属性的枚举强制转换不推荐使用
- `TRANSITION_CLASSES`:

 过渡类名不推荐使用
- `TRANSITION_GROUP_ROOT`: 过渡组根元素不推荐使用
- `COMPONENT_ASYNC`: 异步组件不推荐使用
- `COMPONENT_FUNCTIONAL`: 函数式组件不推荐使用
- `COMPONENT_V_MODEL`: `v-model` 组件不推荐使用
- `RENDER_FUNCTION`: 渲染函数不推荐使用
- `FILTERS`: 过滤器不推荐使用
- `PRIVATE_APIS`: 私有 API 不推荐使用

这些枚举成员可用于标识不推荐使用的功能或选项，并在相应的代码逻辑中进行处理或提醒。
 */
export const enum DeprecationTypes {
  GLOBAL_MOUNT = 'GLOBAL_MOUNT',
  GLOBAL_MOUNT_CONTAINER = 'GLOBAL_MOUNT_CONTAINER',
  GLOBAL_EXTEND = 'GLOBAL_EXTEND',
  GLOBAL_PROTOTYPE = 'GLOBAL_PROTOTYPE',
  GLOBAL_SET = 'GLOBAL_SET',
  GLOBAL_DELETE = 'GLOBAL_DELETE',
  GLOBAL_OBSERVABLE = 'GLOBAL_OBSERVABLE',
  GLOBAL_PRIVATE_UTIL = 'GLOBAL_PRIVATE_UTIL',

  CONFIG_SILENT = 'CONFIG_SILENT',
  CONFIG_DEVTOOLS = 'CONFIG_DEVTOOLS',
  CONFIG_KEY_CODES = 'CONFIG_KEY_CODES',
  CONFIG_PRODUCTION_TIP = 'CONFIG_PRODUCTION_TIP',
  CONFIG_IGNORED_ELEMENTS = 'CONFIG_IGNORED_ELEMENTS',
  CONFIG_WHITESPACE = 'CONFIG_WHITESPACE',
  CONFIG_OPTION_MERGE_STRATS = 'CONFIG_OPTION_MERGE_STRATS',

  INSTANCE_SET = 'INSTANCE_SET',
  INSTANCE_DELETE = 'INSTANCE_DELETE',
  INSTANCE_DESTROY = 'INSTANCE_DESTROY',
  INSTANCE_EVENT_EMITTER = 'INSTANCE_EVENT_EMITTER',
  INSTANCE_EVENT_HOOKS = 'INSTANCE_EVENT_HOOKS',
  INSTANCE_CHILDREN = 'INSTANCE_CHILDREN',
  INSTANCE_LISTENERS = 'INSTANCE_LISTENERS',
  INSTANCE_SCOPED_SLOTS = 'INSTANCE_SCOPED_SLOTS',
  INSTANCE_ATTRS_CLASS_STYLE = 'INSTANCE_ATTRS_CLASS_STYLE',

  OPTIONS_DATA_FN = 'OPTIONS_DATA_FN',
  OPTIONS_DATA_MERGE = 'OPTIONS_DATA_MERGE',
  OPTIONS_BEFORE_DESTROY = 'OPTIONS_BEFORE_DESTROY',
  OPTIONS_DESTROYED = 'OPTIONS_DESTROYED',

  WATCH_ARRAY = 'WATCH_ARRAY',
  PROPS_DEFAULT_THIS = 'PROPS_DEFAULT_THIS',

  V_ON_KEYCODE_MODIFIER = 'V_ON_KEYCODE_MODIFIER',
  CUSTOM_DIR = 'CUSTOM_DIR',

  ATTR_FALSE_VALUE = 'ATTR_FALSE_VALUE',
  ATTR_ENUMERATED_COERCION = 'ATTR_ENUMERATED_COERCION',

  TRANSITION_CLASSES = 'TRANSITION_CLASSES',
  TRANSITION_GROUP_ROOT = 'TRANSITION_GROUP_ROOT',

  COMPONENT_ASYNC = 'COMPONENT_ASYNC',
  COMPONENT_FUNCTIONAL = 'COMPONENT_FUNCTIONAL',
  COMPONENT_V_MODEL = 'COMPONENT_V_MODEL',

  RENDER_FUNCTION = 'RENDER_FUNCTION',

  FILTERS = 'FILTERS',

  PRIVATE_APIS = 'PRIVATE_APIS'
}
/**
 * 这是一个类型别名 `DeprecationData`，用于表示关于不推荐使用的特性的信息。

它包含以下属性:

- `message`：一个字符串或函数，用于描述不推荐使用的特性的信息。可以是静态字符串，也可以是一个函数，该函数可以接受参数并返回描述信息的字符串。
- `link`：一个可选的字符串，表示与该不推荐特性相关的链接。可以是文档、文章或其他资源的链接，提供更多关于该特性的详细信息。

使用 `DeprecationData` 类型可以在代码中存储和传递关于不推荐特性的信息，以便开发人员在使用这些特性时能够得到相应的警告或建议。
 */
type DeprecationData = {
  message: string | ((...args: any[]) => string)
  link?: string
}
/**
 * 这段代码是一个Vue.js应用中的常量`deprecationData`，它是一个记录类型的对象，用于存储一系列不推荐使用的功能和相应的解释信息。

每个不推荐使用的功能都被定义为`DeprecationTypes`枚举类型的键，对应的值是一个包含相关信息的`DeprecationData`对象。

`DeprecationData`对象包含两个属性：

- `message`：一个字符串或函数，用于解释为什么该功能不再推荐使用。字符串可以直接提供解释信息，而函数可以动态生成解释信息。函数接收一些参数，可以根据需要生成相应的解释。
- `link`：一个可选的链接，提供了更详细的文档或参考信息，以帮助开发者了解有关不推荐使用功能的更多信息。

通过这种方式，开发者可以根据具体的不推荐使用的功能类型，在`deprecationData`对象中查找相应的解释信息和链接。这些信息可以用于向开发者发出警告或提供帮助，以便他们了解并适应Vue.js的新版本。
 */
export const deprecationData: Record<DeprecationTypes, DeprecationData> = {
  [DeprecationTypes.GLOBAL_MOUNT]: {
    message:
      `The global app bootstrapping API has changed: vm.$mount() and the "el" ` +
      `option have been removed. Use createApp(RootComponent).mount() instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/global-api.html#mounting-app-instance`
  },

  [DeprecationTypes.GLOBAL_MOUNT_CONTAINER]: {
    message:
      `Vue detected directives on the mount container. ` +
      `In Vue 3, the container is no longer considered part of the template ` +
      `and will not be processed/replaced.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/mount-changes.html`
  },

  [DeprecationTypes.GLOBAL_EXTEND]: {
    message:
      `Vue.extend() has been removed in Vue 3. ` +
      `Use defineComponent() instead.`,
    link: `https://vuejs.org/api/general.html#definecomponent`
  },

  [DeprecationTypes.GLOBAL_PROTOTYPE]: {
    message:
      `Vue.prototype is no longer available in Vue 3. ` +
      `Use app.config.globalProperties instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/global-api.html#vue-prototype-replaced-by-config-globalproperties`
  },

  [DeprecationTypes.GLOBAL_SET]: {
    message:
      `Vue.set() has been removed as it is no longer needed in Vue 3. ` +
      `Simply use native JavaScript mutations.`
  },

  [DeprecationTypes.GLOBAL_DELETE]: {
    message:
      `Vue.delete() has been removed as it is no longer needed in Vue 3. ` +
      `Simply use native JavaScript mutations.`
  },

  [DeprecationTypes.GLOBAL_OBSERVABLE]: {
    message:
      `Vue.observable() has been removed. ` +
      `Use \`import { reactive } from "vue"\` from Composition API instead.`,
    link: `https://vuejs.org/api/reactivity-core.html#reactive`
  },

  [DeprecationTypes.GLOBAL_PRIVATE_UTIL]: {
    message:
      `Vue.util has been removed. Please refactor to avoid its usage ` +
      `since it was an internal API even in Vue 2.`
  },

  [DeprecationTypes.CONFIG_SILENT]: {
    message:
      `config.silent has been removed because it is not good practice to ` +
      `intentionally suppress warnings. You can use your browser console's ` +
      `filter features to focus on relevant messages.`
  },

  [DeprecationTypes.CONFIG_DEVTOOLS]: {
    message:
      `config.devtools has been removed. To enable devtools for ` +
      `production, configure the __VUE_PROD_DEVTOOLS__ compile-time flag.`,
    link: `https://github.com/vuejs/core/tree/main/packages/vue#bundler-build-feature-flags`
  },

  [DeprecationTypes.CONFIG_KEY_CODES]: {
    message:
      `config.keyCodes has been removed. ` +
      `In Vue 3, you can directly use the kebab-case key names as v-on modifiers.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/keycode-modifiers.html`
  },

  [DeprecationTypes.CONFIG_PRODUCTION_TIP]: {
    message: `config.productionTip has been removed.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/global-api.html#config-productiontip-removed`
  },

  [DeprecationTypes.CONFIG_IGNORED_ELEMENTS]: {
    message: () => {
      let msg = `config.ignoredElements has been removed.`
      if (isRuntimeOnly()) {
        msg += ` Pass the "isCustomElement" option to @vue/compiler-dom instead.`
      } else {
        msg += ` Use config.isCustomElement instead.`
      }
      return msg
    },
    link: `https://v3-migration.vuejs.org/breaking-changes/global-api.html#config-ignoredelements-is-now-config-iscustomelement`
  },

  [DeprecationTypes.CONFIG_WHITESPACE]: {
    // this warning is only relevant in the full build when using runtime
    // compilation, so it's put in the runtime compatConfig list.
    message:
      `Vue 3 compiler's whitespace option will default to "condense" instead of ` +
      `"preserve". To suppress this warning, provide an explicit value for ` +
      `\`config.compilerOptions.whitespace\`.`
  },

  [DeprecationTypes.CONFIG_OPTION_MERGE_STRATS]: {
    message:
      `config.optionMergeStrategies no longer exposes internal strategies. ` +
      `Use custom merge functions instead.`
  },

  [DeprecationTypes.INSTANCE_SET]: {
    message:
      `vm.$set() has been removed as it is no longer needed in Vue 3. ` +
      `Simply use native JavaScript mutations.`
  },

  [DeprecationTypes.INSTANCE_DELETE]: {
    message:
      `vm.$delete() has been removed as it is no longer needed in Vue 3. ` +
      `Simply use native JavaScript mutations.`
  },

  [DeprecationTypes.INSTANCE_DESTROY]: {
    message: `vm.$destroy() has been removed. Use app.unmount() instead.`,
    link: `https://vuejs.org/api/application.html#app-unmount`
  },

  [DeprecationTypes.INSTANCE_EVENT_EMITTER]: {
    message:
      `vm.$on/$once/$off() have been removed. ` +
      `Use an external event emitter library instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/events-api.html`
  },

  [DeprecationTypes.INSTANCE_EVENT_HOOKS]: {
    message: event =>
      `"${event}" lifecycle events are no longer supported. From templates, ` +
      `use the "vue:" prefix instead of "hook:". For example, @${event} ` +
      `should be changed to @vue:${event.slice(5)}. ` +
      `From JavaScript, use Composition API to dynamically register lifecycle ` +
      `hooks.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/vnode-lifecycle-events.html`
  },

  [DeprecationTypes.INSTANCE_CHILDREN]: {
    message:
      `vm.$children has been removed. Consider refactoring your logic ` +
      `to avoid relying on direct access to child components.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/children.html`
  },

  [DeprecationTypes.INSTANCE_LISTENERS]: {
    message:
      `vm.$listeners has been removed. In Vue 3, parent v-on listeners are ` +
      `included in vm.$attrs and it is no longer necessary to separately use ` +
      `v-on="$listeners" if you are already using v-bind="$attrs". ` +
      `(Note: the Vue 3 behavior only applies if this compat config is disabled)`,
    link: `https://v3-migration.vuejs.org/breaking-changes/listeners-removed.html`
  },

  [DeprecationTypes.INSTANCE_SCOPED_SLOTS]: {
    message: `vm.$scopedSlots has been removed. Use vm.$slots instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/slots-unification.html`
  },

  [DeprecationTypes.INSTANCE_ATTRS_CLASS_STYLE]: {
    message: componentName =>
      `Component <${
        componentName || 'Anonymous'
      }> has \`inheritAttrs: false\` but is ` +
      `relying on class/style fallthrough from parent. In Vue 3, class/style ` +
      `are now included in $attrs and will no longer fallthrough when ` +
      `inheritAttrs is false. If you are already using v-bind="$attrs" on ` +
      `component root it should render the same end result. ` +
      `If you are binding $attrs to a non-root element and expecting ` +
      `class/style to fallthrough on root, you will need to now manually bind ` +
      `them on root via :class="$attrs.class".`,
    link: `https://v3-migration.vuejs.org/breaking-changes/attrs-includes-class-style.html`
  },

  [DeprecationTypes.OPTIONS_DATA_FN]: {
    message:
      `The "data" option can no longer be a plain object. ` +
      `Always use a function.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/data-option.html`
  },

  [DeprecationTypes.OPTIONS_DATA_MERGE]: {
    message: (key: string) =>
      `Detected conflicting key "${key}" when merging data option values. ` +
      `In Vue 3, data keys are merged shallowly and will override one another.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/data-option.html#mixin-merge-behavior-change`
  },

  [DeprecationTypes.OPTIONS_BEFORE_DESTROY]: {
    message: `\`beforeDestroy\` has been renamed to \`beforeUnmount\`.`
  },

  [DeprecationTypes.OPTIONS_DESTROYED]: {
    message: `\`destroyed\` has been renamed to \`unmounted\`.`
  },

  [DeprecationTypes.WATCH_ARRAY]: {
    message:
      `"watch" option or vm.$watch on an array value will no longer ` +
      `trigger on array mutation unless the "deep" option is specified. ` +
      `If current usage is intended, you can disable the compat behavior and ` +
      `suppress this warning with:` +
      `\n\n  configureCompat({ ${DeprecationTypes.WATCH_ARRAY}: false })\n`,
    link: `https://v3-migration.vuejs.org/breaking-changes/watch.html`
  },

  [DeprecationTypes.PROPS_DEFAULT_THIS]: {
    message: (key: string) =>
      `props default value function no longer has access to "this". The compat ` +
      `build only offers access to this.$options.` +
      `(found in prop "${key}")`,
    link: `https://v3-migration.vuejs.org/breaking-changes/props-default-this.html`
  },

  [DeprecationTypes.CUSTOM_DIR]: {
    message: (legacyHook: string, newHook: string) =>
      `Custom directive hook "${legacyHook}" has been removed. ` +
      `Use "${newHook}" instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/custom-directives.html`
  },

  [DeprecationTypes.V_ON_KEYCODE_MODIFIER]: {
    message:
      `Using keyCode as v-on modifier is no longer supported. ` +
      `Use kebab-case key name modifiers instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/keycode-modifiers.html`
  },

  [DeprecationTypes.ATTR_FALSE_VALUE]: {
    message: (name: string) =>
      `Attribute "${name}" with v-bind value \`false\` will render ` +
      `${name}="false" instead of removing it in Vue 3. To remove the attribute, ` +
      `use \`null\` or \`undefined\` instead. If the usage is intended, ` +
      `you can disable the compat behavior and suppress this warning with:` +
      `\n\n  configureCompat({ ${DeprecationTypes.ATTR_FALSE_VALUE}: false })\n`,
    link: `https://v3-migration.vuejs.org/breaking-changes/attribute-coercion.html`
  },

  [DeprecationTypes.ATTR_ENUMERATED_COERCION]: {
    message: (name: string, value: any, coerced: string) =>
      `Enumerated attribute "${name}" with v-bind value \`${value}\` will ` +
      `${
        value === null ? `be removed` : `render the value as-is`
      } instead of coercing the value to "${coerced}" in Vue 3. ` +
      `Always use explicit "true" or "false" values for enumerated attributes. ` +
      `If the usage is intended, ` +
      `you can disable the compat behavior and suppress this warning with:` +
      `\n\n  configureCompat({ ${DeprecationTypes.ATTR_ENUMERATED_COERCION}: false })\n`,
    link: `https://v3-migration.vuejs.org/breaking-changes/attribute-coercion.html`
  },

  [DeprecationTypes.TRANSITION_CLASSES]: {
    message: `` // this feature cannot be runtime-detected
  },

  [DeprecationTypes.TRANSITION_GROUP_ROOT]: {
    message:
      `<TransitionGroup> no longer renders a root <span> element by ` +
      `default if no "tag" prop is specified. If you do not rely on the span ` +
      `for styling, you can disable the compat behavior and suppress this ` +
      `warning with:` +
      `\n\n  configureCompat({ ${DeprecationTypes.TRANSITION_GROUP_ROOT}: false })\n`,
    link: `https://v3-migration.vuejs.org/breaking-changes/transition-group.html`
  },

  [DeprecationTypes.COMPONENT_ASYNC]: {
    message: (comp: any) => {
      const name = getComponentName(comp)
      return (
        `Async component${
          name ? ` <${name}>` : `s`
        } should be explicitly created via \`defineAsyncComponent()\` ` +
        `in Vue 3. Plain functions will be treated as functional components in ` +
        `non-compat build. If you have already migrated all async component ` +
        `usage and intend to use plain functions for functional components, ` +
        `you can disable the compat behavior and suppress this ` +
        `warning with:` +
        `\n\n  configureCompat({ ${DeprecationTypes.COMPONENT_ASYNC}: false })\n`
      )
    },
    link: `https://v3-migration.vuejs.org/breaking-changes/async-components.html`
  },

  [DeprecationTypes.COMPONENT_FUNCTIONAL]: {
    message: (comp: any) => {
      const name = getComponentName(comp)
      return (
        `Functional component${
          name ? ` <${name}>` : `s`
        } should be defined as a plain function in Vue 3. The "functional" ` +
        `option has been removed. NOTE: Before migrating to use plain ` +
        `functions for functional components, first make sure that all async ` +
        `components usage have been migrated and its compat behavior has ` +
        `been disabled.`
      )
    },
    link: `https://v3-migration.vuejs.org/breaking-changes/functional-components.html`
  },

  [DeprecationTypes.COMPONENT_V_MODEL]: {
    message: (comp: ComponentOptions) => {
      const configMsg =
        `opt-in to ` +
        `Vue 3 behavior on a per-component basis with \`compatConfig: { ${DeprecationTypes.COMPONENT_V_MODEL}: false }\`.`
      if (
        comp.props &&
        (isArray(comp.props)
          ? comp.props.includes('modelValue')
          : hasOwn(comp.props, 'modelValue'))
      ) {
        return (
          `Component declares "modelValue" prop, which is Vue 3 usage, but ` +
          `is running under Vue 2 compat v-model behavior. You can ${configMsg}`
        )
      }
      return (
        `v-model usage on component has changed in Vue 3. Component that expects ` +
        `to work with v-model should now use the "modelValue" prop and emit the ` +
        `"update:modelValue" event. You can update the usage and then ${configMsg}`
      )
    },
    link: `https://v3-migration.vuejs.org/breaking-changes/v-model.html`
  },

  [DeprecationTypes.RENDER_FUNCTION]: {
    message:
      `Vue 3's render function API has changed. ` +
      `You can opt-in to the new API with:` +
      `\n\n  configureCompat({ ${DeprecationTypes.RENDER_FUNCTION}: false })\n` +
      `\n  (This can also be done per-component via the "compatConfig" option.)`,
    link: `https://v3-migration.vuejs.org/breaking-changes/render-function-api.html`
  },

  [DeprecationTypes.FILTERS]: {
    message:
      `filters have been removed in Vue 3. ` +
      `The "|" symbol will be treated as native JavaScript bitwise OR operator. ` +
      `Use method calls or computed properties instead.`,
    link: `https://v3-migration.vuejs.org/breaking-changes/filters.html`
  },

  [DeprecationTypes.PRIVATE_APIS]: {
    message: name =>
      `"${name}" is a Vue 2 private API that no longer exists in Vue 3. ` +
      `If you are seeing this warning only due to a dependency, you can ` +
      `suppress this warning via { PRIVATE_APIS: 'suppress-warning' }.`
  }
}
/**
 * 这段代码定义了一个名为`instanceWarned`的常量，它是一个空对象，没有原型链（通过`Object.create(null)`创建）。

它的类型注解是`Record<string, true>`，表示`instanceWarned`是一个键为字符串类型、值为布尔类型（都是`true`）的记录对象。

在这个上下文中，`instanceWarned`被用作一个存储器，用于跟踪已经发出警告的实例。每当需要发出一个警告时，可以将相应的实例的标识（通常是一个字符串）作为键添加到`instanceWarned`对象中，并将值设置为`true`，表示该实例已经被警告过。

这种方式可以帮助避免对同一个实例多次发出相同的警告，因为如果实例已经在`instanceWarned`对象中存在，再次尝试添加相同的键将不会产生任何效果。

请注意，`instanceWarned`对象是一个浅拷贝的空对象，没有继承任何属性和方法。这样做是为了确保`instanceWarned`对象的干净性，并防止可能的属性冲突或继承关系带来的意外行为。
 */
const instanceWarned: Record<string, true> = Object.create(null)
/**
 * 这段代码定义了一个名为`warnCount`的常量，它也是一个空对象，没有原型链（通过`Object.create(null)`创建）。

它的类型注解是`Record<string, number>`，表示`warnCount`是一个键为字符串类型、值为数字类型的记录对象。

在这个上下文中，`warnCount`被用作一个存储器，用于跟踪警告的计数。每当需要记录一个警告的次数时，可以将相应的标识（通常是一个字符串）作为键添加到`warnCount`对象中，并将值设置为对应的警告次数。

这种方式可以帮助统计每个标识（字符串）被警告的次数，以便在需要时进行进一步分析或处理。

与前面提到的`instanceWarned`对象类似，`warnCount`对象也是一个浅拷贝的空对象，没有继承任何属性和方法，以确保它的干净性和避免可能的属性冲突或继承关系带来的意外行为。
 */
const warnCount: Record<string, number> = Object.create(null)

// test only
/**
 * 这行代码声明了一个名为`warningEnabled`的变量，并将其初始值设置为`true`。

这个变量通常用于控制警告的开关。当`warningEnabled`的值为`true`时，警告被启用，可以产生警告消息。当`warningEnabled`的值为`false`时，警告被禁用，不会产生任何警告消息。

在代码的其他部分，可以使用`warningEnabled`的值来判断是否应该触发警告逻辑，例如：

```javascript
if (warningEnabled) {
  // 执行警告逻辑
  console.warn('This is a warning message.');
}
```

通过控制`warningEnabled`的值，可以方便地在不同的上下文或环境中开启或关闭警告功能，以满足特定需求或调试要求。
 */
let warningEnabled = true
/**
 * 
 * @param flag 
 * 这段代码定义了一个名为`toggleDeprecationWarning`的导出函数，该函数接受一个布尔类型的参数`flag`。

函数的作用是用于切换警告的启用状态。根据传入的`flag`参数的值，可以动态地控制警告的开关。

当调用`toggleDeprecationWarning(true)`时，`warningEnabled`的值将被设置为`true`，从而启用警告。

当调用`toggleDeprecationWarning(false)`时，`warningEnabled`的值将被设置为`false`，从而禁用警告。

这个函数可以在需要时根据特定条件或需求，通过传入不同的参数值来开启或关闭警告功能。例如：

```javascript
toggleDeprecationWarning(true); // 启用警告
// 执行一些代码，可能会触发警告

toggleDeprecationWarning(false); // 禁用警告
// 执行一些代码，不会触发警告
```
 */
export function toggleDeprecationWarning(flag: boolean) {
  warningEnabled = flag
}
/**
 * 
 * @param key 
 * @param instance 
 * @param args 
 * @returns 
 * 这段代码定义了一个名为`warnDeprecation`的导出函数，它接受三个参数：`key`、`instance`和`...args`。

函数的作用是用于发出警告。它包含了一些条件判断和警告处理逻辑。

首先，如果代码不在开发环境(`__DEV__`为假)，则函数直接返回，不执行后续逻辑。

接下来，如果代码在测试环境(`__TEST__`为真)且警告功能被禁用(`warningEnabled`为假)，则函数直接返回，不执行后续逻辑。

然后，函数会根据传入的`instance`参数，获取当前组件实例(`ComponentInternalInstance`)。如果`instance`为`null`，则调用`getCurrentInstance`函数获取当前实例。

接下来，函数会检查用户的配置项(`getCompatConfigForKey`)，如果配置为`suppress-warning`，则函数直接返回，不执行后续逻辑。

然后，函数会生成一个唯一的警告键(`dupKey`)，该键由`key`和`args`拼接而成，用于标识相同类型的警告。

接着，函数会生成一个组件标识符(`compId`)，用于标识组件的名称或唯一标识符。如果组件是匿名组件且存在实例，则将实例的唯一标识符作为组件标识符。

然后，函数会检查是否已经发出了相同类型的警告，以及相同组件类型的警告。如果在正式环境(`__TEST__`为假)且`componentDupKey`存在于`instanceWarned`对象中，则函数直接返回，不执行后续逻辑。

接着，函数会将`componentDupKey`添加到`instanceWarned`对象中，表示该组件已经发出了相同类型的警告。

然后，函数会检查是否已经发出过相同类型的警告，但是组件类型不同。如果在正式环境(`__TEST__`为假)且`dupKey`存在于`warnCount`对象中，则函数会发出简短的警告信息，表示相同类型的警告已经发出，并返回，不执行后续逻辑。

接着，函数会将`dupKey`添加到`warnCount`对象中，并将计数重置为0。

最后，函数会根据警告类型(`key`)获取相应的警告信息和链接。如果警告信息是一个函数，则调用该函数并传入`args`参数，否则直接使用警告信息。然后，函数会通过`warn`函数发出警告，包含警告类型、警告信息和相关链接。

如果该警告类型的兼容性被禁用(`isCompatEnabled`)，则会在控制台输出一个错误信息，提示开发者该警告的兼容性行为被禁用，可能会导

致运行时错误。

总的来说，这个函数用于在开发或测试环境下发出警告信息，提醒开发者有关某些功能、API或行为的废弃或不推荐使用，以及可能的兼容性问题。警告信息会显示警告类型、具体信息和相关链接，并根据一定条件进行控制和重复判断，避免重复发出相同类型的警告。

请注意，这段代码中的一些函数和变量的定义未提供，需要根据具体上下文进行补充。
 */
export function warnDeprecation(
  key: DeprecationTypes,
  instance: ComponentInternalInstance | null,
  ...args: any[]
) {
  if (!__DEV__) {
    return
  }
  if (__TEST__ && !warningEnabled) {
    return
  }

  instance = instance || getCurrentInstance()

  // check user config
  const config = getCompatConfigForKey(key, instance)
  if (config === 'suppress-warning') {
    return
  }

  const dupKey = key + args.join('')
  let compId: string | number | null =
    instance && formatComponentName(instance, instance.type)
  if (compId === 'Anonymous' && instance) {
    compId = instance.uid
  }

  // skip if the same warning is emitted for the same component type
  const componentDupKey = dupKey + compId
  if (!__TEST__ && componentDupKey in instanceWarned) {
    return
  }
  instanceWarned[componentDupKey] = true

  // same warning, but different component. skip the long message and just
  // log the key and count.
  if (!__TEST__ && dupKey in warnCount) {
    warn(`(deprecation ${key}) (${++warnCount[dupKey] + 1})`)
    return
  }

  warnCount[dupKey] = 0

  const { message, link } = deprecationData[key]
  warn(
    `(deprecation ${key}) ${
      typeof message === 'function' ? message(...args) : message
    }${link ? `\n  Details: ${link}` : ``}`
  )
  if (!isCompatEnabled(key, instance, true)) {
    console.error(
      `^ The above deprecation's compat behavior is disabled and will likely ` +
        `lead to runtime errors.`
    )
  }
}
/**
 * 这段代码定义了一个名为`CompatConfig`的类型别名。

`CompatConfig`类型是一个部分键值为`boolean`或`'suppress-warning'`的记录类型，它包含了一些键值对，用于配置不同类型的废弃警告的兼容性行为。每个键代表一个废弃警告类型(`DeprecationTypes`)，值表示该警告类型的兼容性配置，可以是布尔值(`boolean`)或字符串`'suppress-warning'`。

此外，`CompatConfig`类型还包含一个可选的`MODE`键，它的值可以是数字`2`或`3`，或者是一个接受一个组件(`Component`)或`null`作为参数并返回数字`2`或`3`的函数。

总的来说，`CompatConfig`类型用于定义废弃警告的兼容性配置，可以针对不同的警告类型进行灵活的配置，以及定义全局的兼容模式(`MODE`)。
 */
export type CompatConfig = Partial<
  Record<DeprecationTypes, boolean | 'suppress-warning'>
> & {
  MODE?: 2 | 3 | ((comp: Component | null) => 2 | 3)
}
/**
 * 这段代码定义了一个名为`globalCompatConfig`的常量，并将其类型设置为`CompatConfig`。

`globalCompatConfig`是一个全局的兼容性配置对象，其类型遵循`CompatConfig`定义的规范。在这个配置对象中，使用了一个键值对`MODE: 2`，表示全局的兼容模式为`2`。这意味着在整个应用程序中，废弃警告将以兼容模式`2`进行处理。

通过将这个全局兼容性配置对象导出，其他模块可以访问和使用这个配置对象，以便根据需要进行废弃警告的兼容性配置。
 */
export const globalCompatConfig: CompatConfig = {
  MODE: 2
}
/**
 * 
 * @param config 
 * 这段代码定义了一个名为`configureCompat`的导出函数，它接受一个参数`config`，类型为`CompatConfig`。

函数首先通过条件判断`__DEV__`来判断当前是否处于开发环境。如果是开发环境，会调用`validateCompatConfig`函数来验证传入的兼容性配置对象`config`的有效性。

然后，函数使用`extend`函数将传入的兼容性配置对象`config`与`globalCompatConfig`进行合并，将`config`中的配置覆盖到`globalCompatConfig`中。这样做的目的是在全局范围内配置应用程序的兼容性。

通过调用`configureCompat`函数，可以根据需要更新全局的兼容性配置，从而影响整个应用程序中的废弃警告处理行为。
 */
export function configureCompat(config: CompatConfig) {
  if (__DEV__) {
    validateCompatConfig(config)
  }
  extend(globalCompatConfig, config)
}
/**
 * 这段代码定义了一个名为`seenConfigObjects`的常量，它是一个`WeakSet`对象，用于存储已经被处理过的兼容性配置对象。

`WeakSet`是一种集合数据结构，它只能存储对象类型，并且存储的对象是弱引用。这意味着当存储的对象在其他地方没有被引用时，它们可以被垃圾回收。

在这里，`seenConfigObjects`被用来存储已经处理过的兼容性配置对象，以避免重复处理相同的配置对象。通过使用`WeakSet`来存储对象，可以确保当配置对象不再被引用时，它们可以被垃圾回收，不会造成内存泄漏。

`/*#__PURE__` 是一种用于标记纯粹函数（Pure Function）的优化注释。它告诉工具链忽略这一行代码的副作用，并将其视为纯粹函数。在这里，这个注释可能是为了告诉工具链不要考虑`new WeakSet()`这个表达式会产生副作用，从而进行更好的优化。
 */
const seenConfigObjects = /*#__PURE__*/ new WeakSet<CompatConfig>()
/**
 * 这段代码定义了一个名为`warnedInvalidKeys`的常量，它是一个记录无效键的记录对象。

`Record<string, boolean>`表示`warnedInvalidKeys`是一个以字符串为键，布尔值为值的记录对象。它用于记录已经发出警告的无效键，以避免重复发出相同的警告。

在这里，`warnedInvalidKeys`被用于存储已经发出警告的无效键，以确保同一个无效键不会被重复发出警告。当发现无效键时，可以将其添加到`warnedInvalidKeys`中，并在需要时检查键是否已经存在，以决定是否发出警告。

这种记录对象的使用可以帮助程序在处理无效键时保持一致性和准确性，同时避免重复的警告信息。
 */
const warnedInvalidKeys: Record<string, boolean> = {}

// dev only
/**
 * 
 * @param config 
 * @param instance 
 * @returns 
 * 这段代码定义了一个名为`validateCompatConfig`的函数，用于验证兼容性配置对象`config`的有效性。

函数的参数包括`config`和可选的`instance`，用于传递要验证的兼容性配置对象和相关的组件实例。

首先，函数使用`seenConfigObjects`来检查是否已经验证过该配置对象，如果已经验证过，则直接返回。

然后，函数遍历`config`对象的所有键，并进行以下验证：

- 如果键不是`MODE`，并且既不在`deprecationData`中，也不在`warnedInvalidKeys`中，表示该键是无效的。
  - 如果键以`COMPILER_`开头，说明该键是特定于编译器的配置，并且当前运行的是仅运行时构建的Vue版本。函数会发出相应的警告，建议将该配置放在构建设置中的编译器选项中配置。
  - 否则，函数会发出无效的兼容性配置警告。
  - 将该键添加到`warnedInvalidKeys`中，表示已经发出了对该键的警告。
  
如果传入了`instance`参数，并且配置对象中存在`DeprecationTypes.OPTIONS_DATA_MERGE`键，则发出相应的警告，说明该键只能在全局范围内配置。

最后，如果所有的验证通过，将该配置对象添加到`seenConfigObjects`中，表示已经验证过该配置对象。

该函数的作用是验证兼容性配置对象中的键的有效性，并在发现无效键时发出警告。它有助于确保兼容性配置的正确性和一致性，并提供有用的警告信息。
 */
export function validateCompatConfig(
  config: CompatConfig,
  instance?: ComponentInternalInstance
) {
  if (seenConfigObjects.has(config)) {
    return
  }
  seenConfigObjects.add(config)

  for (const key of Object.keys(config)) {
    if (
      key !== 'MODE' &&
      !(key in deprecationData) &&
      !(key in warnedInvalidKeys)
    ) {
      if (key.startsWith('COMPILER_')) {
        if (isRuntimeOnly()) {
          warn(
            `Deprecation config "${key}" is compiler-specific and you are ` +
              `running a runtime-only build of Vue. This deprecation should be ` +
              `configured via compiler options in your build setup instead.\n` +
              `Details: https://v3-migration.vuejs.org/breaking-changes/migration-build.html`
          )
        }
      } else {
        warn(`Invalid deprecation config "${key}".`)
      }
      warnedInvalidKeys[key] = true
    }
  }

  if (instance && config[DeprecationTypes.OPTIONS_DATA_MERGE] != null) {
    warn(
      `Deprecation config "${DeprecationTypes.OPTIONS_DATA_MERGE}" can only be configured globally.`
    )
  }
}
/**
 * 
 * @param key 
 * @param instance 
 * @returns 
 * 这段代码定义了一个名为`getCompatConfigForKey`的函数，用于获取给定键的兼容性配置。

函数的参数包括`key`和`instance`，用于指定要获取兼容性配置的键和相关的组件实例。

首先，函数通过检查`instance`是否存在，并且实例的类型具有`compatConfig`属性，来获取组件实例的兼容性配置对象`instanceConfig`。如果`instanceConfig`存在，并且`key`是`instanceConfig`的键之一，则返回对应的兼容性配置。

如果`instanceConfig`不存在或者`key`不在`instanceConfig`中，则返回全局的兼容性配置对象`globalCompatConfig`中对应键的配置。

该函数的作用是根据给定的键和组件实例，获取相应的兼容性配置。它首先检查组件实例的配置，然后再回退到全局配置，以确保配置的优先级和覆盖。
 */
export function getCompatConfigForKey(
  key: DeprecationTypes | 'MODE',
  instance: ComponentInternalInstance | null
) {
  const instanceConfig =
    instance && (instance.type as ComponentOptions).compatConfig
  if (instanceConfig && key in instanceConfig) {
    return instanceConfig[key]
  }
  return globalCompatConfig[key]
}
/**
 * 
 * @param key 
 * @param instance 
 * @param enableForBuiltIn 
 * @returns 
 * 这段代码定义了一个名为`isCompatEnabled`的函数，用于判断给定键的兼容性配置是否启用。

函数的参数包括`key`、`instance`、`enableForBuiltIn`，用于指定要判断的键、相关的组件实例以及是否对内置组件启用兼容性配置。

首先，函数检查是否禁用了内置组件的兼容性配置。如果`enableForBuiltIn`为`false`并且`instance`存在且`instance.type.__isBuiltIn`为`true`，则表示当前组件是内置组件，直接返回`false`，即不启用兼容性配置。

接下来，函数通过调用`getCompatConfigForKey`函数获取键`'MODE'`对应的兼容性配置，即兼容模式。如果未配置兼容模式，默认为`2`。然后，通过调用`getCompatConfigForKey`函数获取给定键`key`对应的兼容性配置。

根据获取到的兼容模式和兼容性配置的值，判断兼容性配置是否启用。如果兼容模式为`2`，则只要兼容性配置的值不等于`false`，就表示启用兼容性配置。如果兼容模式为`3`，则兼容性配置的值必须为`true`或者`'suppress-warning'`，才表示启用兼容性配置。

最终，函数返回一个布尔值，表示给定键的兼容性配置是否启用。

该函数的作用是根据给定的键、组件实例和内置组件配置，判断兼容性配置是否启用。它首先检查是否禁用了内置组件的兼容性配置，然后根据兼容模式和兼容性配置的值进行判断，以确定是否启用兼容性配置。
 */
export function isCompatEnabled(
  key: DeprecationTypes,
  instance: ComponentInternalInstance | null,
  enableForBuiltIn = false
): boolean {
  // skip compat for built-in components
  if (!enableForBuiltIn && instance && instance.type.__isBuiltIn) {
    return false
  }

  const rawMode = getCompatConfigForKey('MODE', instance) || 2
  const val = getCompatConfigForKey(key, instance)

  const mode = isFunction(rawMode)
    ? rawMode(instance && instance.type)
    : rawMode

  if (mode === 2) {
    return val !== false
  } else {
    return val === true || val === 'suppress-warning'
  }
}

/**
 * Use this for features that are completely removed in non-compat build.
 * 这段代码定义了一个名为`assertCompatEnabled`的函数，用于断言给定键的兼容性配置是否启用。

函数的参数包括`key`、`instance`以及`...args`，用于指定要断言的键、相关的组件实例以及可选的其他参数。

函数首先通过调用`isCompatEnabled`函数检查给定键的兼容性配置是否启用。如果兼容性配置未启用，则抛出一个错误，错误消息为`${key} compat has been disabled.`，表示该兼容性配置已被禁用。

如果兼容性配置启用且处于开发环境(`__DEV__`为`true`)，则通过调用`warnDeprecation`函数发出相应的警告。`warnDeprecation`函数用于发出关于兼容性配置的警告，其中包括键、组件实例以及其他参数。

该函数的作用是在需要确保兼容性配置启用的情况下，进行断言和警告。如果兼容性配置未启用，将抛出一个错误；如果兼容性配置已启用且处于开发环境，将发出相应的警告。
 */
export function assertCompatEnabled(
  key: DeprecationTypes,
  instance: ComponentInternalInstance | null,
  ...args: any[]
) {
  if (!isCompatEnabled(key, instance)) {
    throw new Error(`${key} compat has been disabled.`)
  } else if (__DEV__) {
    warnDeprecation(key, instance, ...args)
  }
}

/**
 * Use this for features where legacy usage is still possible, but will likely
 * lead to runtime error if compat is disabled. (warn in all cases)
 * 这段代码定义了一个名为`softAssertCompatEnabled`的函数，用于软断言给定键的兼容性配置是否启用。

函数的参数包括`key`、`instance`以及`...args`，用于指定要断言的键、相关的组件实例以及可选的其他参数。

函数首先通过判断是否处于开发环境(`__DEV__`为`true`)，如果是，则通过调用`warnDeprecation`函数发出关于兼容性配置的警告，其中包括键、组件实例以及其他参数。

然后，函数调用`isCompatEnabled`函数检查给定键的兼容性配置是否启用，并返回结果。

该函数的作用是在开发环境下发出兼容性配置的警告，并返回兼容性配置是否启用的结果。与`assertCompatEnabled`函数不同的是，该函数不会抛出错误，而是返回一个布尔值表示兼容性配置是否启用。
 */
export function softAssertCompatEnabled(
  key: DeprecationTypes,
  instance: ComponentInternalInstance | null,
  ...args: any[]
) {
  if (__DEV__) {
    warnDeprecation(key, instance, ...args)
  }
  return isCompatEnabled(key, instance)
}

/**
 * Use this for features with the same syntax but with mutually exclusive
 * behavior in 2 vs 3. Only warn if compat is enabled.
 * e.g. render function
 * 这段代码定义了一个名为`checkCompatEnabled`的函数，用于检查给定键的兼容性配置是否启用，并在开发环境下发出相关警告。

函数的参数包括`key`、`instance`以及`...args`，用于指定要检查的键、相关的组件实例以及可选的其他参数。

函数首先调用`isCompatEnabled`函数来判断给定键的兼容性配置是否启用，并将结果保存在变量`enabled`中。

然后，通过判断是否处于开发环境(`__DEV__`为`true`)以及`enabled`的值是否为`true`，如果是，则通过调用`warnDeprecation`函数发出关于兼容性配置的警告，其中包括键、组件实例以及其他参数。

最后，函数返回`enabled`的值，表示给定键的兼容性配置是否启用。

该函数的作用是检查给定键的兼容性配置是否启用，并在开发环境下发出相关警告。函数返回一个布尔值，表示兼容性配置是否启用。
 */
export function checkCompatEnabled(
  key: DeprecationTypes,
  instance: ComponentInternalInstance | null,
  ...args: any[]
) {
  const enabled = isCompatEnabled(key, instance)
  if (__DEV__ && enabled) {
    warnDeprecation(key, instance, ...args)
  }
  return enabled
}

// run tests in v3 mode by default
/**
 * 这段代码是一个条件语句，用于在测试环境下配置兼容性。

如果当前环境变量`__TEST__`为`true`，则会执行以下代码块：

调用`configureCompat`函数，并传递一个对象作为参数。该对象具有一个属性`MODE`，其值为`3`。这样就将兼容性配置的模式设置为`3`，表示启用特定的兼容性行为。

通过这段代码，在测试环境下可以针对不同的兼容性模式进行配置，以确保在测试过程中兼容性的正确性。
 */
if (__TEST__) {
  configureCompat({
    MODE: 3
  })
}
