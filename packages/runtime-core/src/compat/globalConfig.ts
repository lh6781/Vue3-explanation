import { AppConfig } from '../apiCreateApp'
import {
  DeprecationTypes,
  softAssertCompatEnabled,
  warnDeprecation
} from './compatConfig'
import { isCopyingConfig } from './global'
import { internalOptionMergeStrats } from '../componentOptions'

// legacy config warnings
/**
 * `LegacyConfig` 是一个类型定义，用于描述 Vue.js 中的旧版配置选项。这些选项已被标记为废弃，在 Vue 3 中不再推荐使用。

`LegacyConfig` 类型包含以下属性：

- `silent`：（已废弃）一个布尔值，表示是否禁止 Vue 的日志和警告输出。这个选项在 Vue 3 中已被移除，不再可用。
- `devtools`：（已废弃）一个布尔值，表示是否启用 Vue Devtools。不推荐使用此选项，而是建议使用 `__VUE_PROD_DEVTOOLS__` 编译时特性标记来控制 Devtools 的启用与禁用。
- `ignoredElements`：（已废弃）一个数组，包含应被忽略的元素的标签名或正则表达式。在 Vue 3 中，建议使用 `config.isCustomElement` 选项来替代此选项。
- `keyCodes`：（已废弃）一个对象，包含自定义按键别名和对应的按键码。在 Vue 3 中，不再推荐使用此选项。
- `productionTip`：（已废弃）一个布尔值，表示是否显示生产环境的提示信息。在 Vue 3 中，此选项已被移除。
 */
export type LegacyConfig = {
  /**
   * @deprecated `config.silent` option has been removed
   */
  silent?: boolean
  /**
   * @deprecated use __VUE_PROD_DEVTOOLS__ compile-time feature flag instead
   * https://github.com/vuejs/core/tree/main/packages/vue#bundler-build-feature-flags
   */
  devtools?: boolean
  /**
   * @deprecated use `config.isCustomElement` instead
   * https://v3-migration.vuejs.org/breaking-changes/global-api.html#config-ignoredelements-is-now-config-iscustomelement
   */
  ignoredElements?: (string | RegExp)[]
  /**
   * @deprecated
   * https://v3-migration.vuejs.org/breaking-changes/keycode-modifiers.html
   */
  keyCodes?: Record<string, number | number[]>
  /**
   * @deprecated
   * https://v3-migration.vuejs.org/breaking-changes/global-api.html#config-productiontip-removed
   */
  productionTip?: boolean
}

// dev only
/**
 * 
 * @param config 
 * `installLegacyConfigWarnings` 是一个函数，用于安装旧版配置选项的警告。

该函数接收一个 `config` 参数，表示应用的配置对象（类型为 `AppConfig`）。

函数内部定义了一个名为 `legacyConfigOptions` 的对象，用于将旧版配置选项与对应的废弃类型进行映射。

然后，通过遍历 `legacyConfigOptions` 对象的键，对每个配置选项进行处理。在处理过程中，使用 `Object.defineProperty` 方法重新定义配置选项的访问器属性。通过定义 `get` 和 `set` 方法，可以拦截对配置选项的读取和设置操作。

在 `get` 方法中，返回配置选项的当前值。

在 `set` 方法中，如果不是正在复制配置的过程中，则发出废弃警告。废弃警告的类型根据 `legacyConfigOptions` 对象中的映射进行确定。然后，将新的值赋给配置选项的变量。

通过这种方式，当访问或修改旧版配置选项时，会触发警告，提醒开发者该选项已被废弃，并建议采用新的配置方式。
 */
export function installLegacyConfigWarnings(config: AppConfig) {
  const legacyConfigOptions: Record<string, DeprecationTypes> = {
    silent: DeprecationTypes.CONFIG_SILENT,
    devtools: DeprecationTypes.CONFIG_DEVTOOLS,
    ignoredElements: DeprecationTypes.CONFIG_IGNORED_ELEMENTS,
    keyCodes: DeprecationTypes.CONFIG_KEY_CODES,
    productionTip: DeprecationTypes.CONFIG_PRODUCTION_TIP
  }

  Object.keys(legacyConfigOptions).forEach(key => {
    let val = (config as any)[key]
    Object.defineProperty(config, key, {
      enumerable: true,
      get() {
        return val
      },
      set(newVal) {
        if (!isCopyingConfig) {
          warnDeprecation(legacyConfigOptions[key], null)
        }
        val = newVal
      }
    })
  })
}
/**
 * 
 * @param config 
 * `installLegacyOptionMergeStrats` 是一个函数，用于安装旧版选项合并策略。

该函数接收一个 `config` 参数，表示应用的配置对象（类型为 `AppConfig`）。

函数内部创建了一个代理对象 `Proxy`，作为新的 `optionMergeStrategies` 属性。代理对象会拦截对属性的访问操作。

在代理对象的 `get` 方法中，首先检查目标对象是否存在该属性。如果存在，则直接返回该属性的值。

如果目标对象中不存在该属性，那么会检查 `internalOptionMergeStrats` 中是否存在该属性，并且通过 `softAssertCompatEnabled` 方法检查相关的兼容性是否启用。如果兼容性启用，那么返回 `internalOptionMergeStrats` 对象中对应属性的值。

通过这种方式，当访问旧版选项合并策略时，会首先检查新版选项合并策略是否存在，如果不存在，则回退到旧版选项合并策略，并且在兼容性启用的情况下发出软警告，提醒开发者该选项已被废弃，并建议采用新的选项合并策略。
 */
export function installLegacyOptionMergeStrats(config: AppConfig) {
  config.optionMergeStrategies = new Proxy({} as any, {
    get(target, key) {
      if (key in target) {
        return target[key]
      }
      if (
        key in internalOptionMergeStrats &&
        softAssertCompatEnabled(
          DeprecationTypes.CONFIG_OPTION_MERGE_STRATS,
          null
        )
      ) {
        return internalOptionMergeStrats[
          key as keyof typeof internalOptionMergeStrats
        ]
      }
    }
  })
}
