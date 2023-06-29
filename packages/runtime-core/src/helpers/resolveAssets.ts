import {
  currentInstance,
  ConcreteComponent,
  ComponentOptions,
  getComponentName
} from '../component'
import { currentRenderingInstance } from '../componentRenderContext'
import { Directive } from '../directives'
import { camelize, capitalize, isString } from '@vue/shared'
import { warn } from '../warning'
import { VNodeTypes } from '../vnode'

export const COMPONENTS = 'components'
export const DIRECTIVES = 'directives'
export const FILTERS = 'filters'

export type AssetTypes = typeof COMPONENTS | typeof DIRECTIVES | typeof FILTERS

/**
 * @private
 * `resolveComponent` 函数用于解析组件名称，并返回对应的具体组件对象或字符串表示。

该函数接受两个参数：
- `name`：要解析的组件名称。
- `maybeSelfReference`（可选）：一个布尔值，指示是否允许组件名称与自身引用相匹配。

函数的主要逻辑如下：
- 调用 `resolveAsset` 函数，传递 `COMPONENTS`（组件资产）作为查找的资源集合，并设置 `name` 为要解析的名称。
- 通过第三个参数 `true`，确保解析的结果为具体组件。
- 如果解析成功，则返回解析得到的具体组件对象。
- 如果解析失败，则返回原始的组件名称 `name`。

这样，调用 `resolveComponent` 函数可以根据组件名称获取对应的具体组件对象，或者在解析失败时返回原始的组件名称。
 */
export function resolveComponent(
  name: string,
  maybeSelfReference?: boolean
): ConcreteComponent | string {
  return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name
}
/**
 * `NULL_DYNAMIC_COMPONENT` 是一个用于表示空动态组件的特殊符号（Symbol）。它的作用是在动态组件解析过程中标识一个空的动态组件。

在 Vue.js 中，动态组件是通过在模板中使用 `<component>` 元素并动态绑定 `is` 属性来实现的。当动态组件的 `is` 值无法解析为有效的组件时，就会使用空动态组件来进行占位。

`NULL_DYNAMIC_COMPONENT` 符号被用作一个唯一的标识，用于表示一个空的动态组件。它在解析过程中可以被检测到，并且用于区分真实的组件对象和空组件的情况。

通过使用 `Symbol.for('v-ndc')` 创建的符号，可以确保在整个应用程序中始终使用相同的符号实例，从而保证其唯一性和可识别性。
 */
export const NULL_DYNAMIC_COMPONENT = Symbol.for('v-ndc')

/**
 * @private
 * `resolveDynamicComponent` 函数用于解析动态组件，并返回对应的组件类型（`VNodeTypes`）。

函数接受一个 `component` 参数，它可以是字符串或其他类型的值。

- 如果 `component` 是一个字符串，表示动态组件的名称，函数会尝试从已注册的组件列表中解析对应的组件。如果找到了匹配的组件，就返回该组件的类型；如果没有找到匹配的组件，就直接返回该字符串作为组件类型。

- 如果 `component` 不是字符串，则会判断其类型：
  - 如果 `component` 是一个有效的值（非空），则将其作为组件类型返回。
  - 如果 `component` 是一个无效的值（空），则将 `NULL_DYNAMIC_COMPONENT` 作为组件类型返回。

注意，如果 `component` 参数是一个无效的类型，例如 `undefined` 或 `null`，在调用 `createVNode` 时会发出警告。

总之，`resolveDynamicComponent` 函数根据传入的 `component` 参数，解析并返回对应的组件类型，以便在创建虚拟节点时使用。如果无法解析或传入的组件类型无效，则返回特殊的 `NULL_DYNAMIC_COMPONENT` 符号作为占位符。
 */
export function resolveDynamicComponent(component: unknown): VNodeTypes {
  if (isString(component)) {
    return resolveAsset(COMPONENTS, component, false) || component
  } else {
    // invalid types will fallthrough to createVNode and raise warning
    return (component || NULL_DYNAMIC_COMPONENT) as any
  }
}

/**
 * @private
 * `resolveDirective` 函数用于解析指令，并返回对应的指令对象（`Directive`）。

函数接受一个 `name` 参数，表示指令的名称。

函数会尝试从已注册的指令列表中解析对应的指令对象。如果找到了匹配的指令，就返回该指令对象；如果没有找到匹配的指令，就返回 `undefined`。

总之，`resolveDirective` 函数根据传入的 `name` 参数，解析并返回对应的指令对象，以便在组件中使用指令时进行相关操作。如果无法解析指令，则返回 `undefined`。
 */
export function resolveDirective(name: string): Directive | undefined {
  return resolveAsset(DIRECTIVES, name)
}

/**
 * v2 compat only
 * `resolveFilter` 函数用于解析过滤器，并返回对应的过滤器函数。

函数接受一个 `name` 参数，表示过滤器的名称。

函数会尝试从已注册的过滤器列表中解析对应的过滤器函数。如果找到了匹配的过滤器，就返回该过滤器函数；如果没有找到匹配的过滤器，就返回 `undefined`。

总之，`resolveFilter` 函数根据传入的 `name` 参数，解析并返回对应的过滤器函数，以便在模板中使用过滤器进行数据处理。如果无法解析过滤器，则返回 `undefined`。
 * @internal
 */
export function resolveFilter(name: string): Function | undefined {
  return resolveAsset(FILTERS, name)
}

/**
 * @private
 * overload 1: components
 * `resolveAsset` 函数用于解析组件、指令或过滤器，并返回对应的定义。

函数有多个重载形式，用于解析不同类型的资源。具体重载形式如下：

1. `resolveAsset(type: typeof COMPONENTS, name: string, warnMissing?: boolean, maybeSelfReference?: boolean): ConcreteComponent | undefined`：用于解析组件。
2. `resolveAsset(type: typeof DIRECTIVES, name: string): Directive | undefined`：用于解析指令。
3. `resolveAsset(type: typeof FILTERS, name: string): Function | undefined`：用于解析过滤器（仅兼容目的）。

具体实现如下：

1. 首先，函数会获取当前正在渲染的组件实例，如果不存在，则发出警告并返回 `undefined`。
2. 接下来，函数会检查是否存在组件实例。如果存在组件实例，则尝试从组件实例的选项中解析资源。
   - 针对组件类型（`type === COMPONENTS`），函数会先尝试使用组件实例的名称进行匹配，如果匹配成功，则返回该组件实例。
   - 然后，函数会检查组件实例的选项中是否包含对应类型的注册对象，如果存在，则尝试从注册对象中解析资源。
3. 如果无法从组件实例中解析到资源，则尝试从应用程序上下文中全局注册的资源中解析。
4. 如果 `maybeSelfReference` 参数为 `true`，且无法解析到资源，则返回组件实例本身作为资源的隐式自引用。
5. 如果 `warnMissing` 参数为 `true`，且无法解析到资源，则发出警告。
6. 返回解析到的资源。

`resolve` 函数是 `resolveAsset` 的辅助函数，用于从注册对象中解析具体的资源。函数会依次尝试使用原始名称、驼峰化后的名称以及首字母大写的驼峰化名称进行匹配，返回第一个匹配到的资源定义。如果无法匹配到任何资源，则返回 `undefined`。

总之，`resolveAsset` 函数用于解析组件、指令或过滤器，并返回对应的定义。它会优先从当前组件实例的选项中进行解析，然后再从应用程序上下文中全局注册的资源中进行解析。如果无法解析到资源，则可以选择返回组件实例本身作为隐式自引用。
 */
function resolveAsset(
  type: typeof COMPONENTS,
  name: string,
  warnMissing?: boolean,
  maybeSelfReference?: boolean
): ConcreteComponent | undefined
// overload 2: directives
function resolveAsset(
  type: typeof DIRECTIVES,
  name: string
): Directive | undefined
// implementation
// overload 3: filters (compat only)
function resolveAsset(type: typeof FILTERS, name: string): Function | undefined
// implementation
function resolveAsset(
  type: AssetTypes,
  name: string,
  warnMissing = true,
  maybeSelfReference = false
) {
  const instance = currentRenderingInstance || currentInstance
  if (instance) {
    const Component = instance.type

    // explicit self name has highest priority
    if (type === COMPONENTS) {
      const selfName = getComponentName(
        Component,
        false /* do not include inferred name to avoid breaking existing code */
      )
      if (
        selfName &&
        (selfName === name ||
          selfName === camelize(name) ||
          selfName === capitalize(camelize(name)))
      ) {
        return Component
      }
    }

    const res =
      // local registration
      // check instance[type] first which is resolved for options API
      resolve(instance[type] || (Component as ComponentOptions)[type], name) ||
      // global registration
      resolve(instance.appContext[type], name)

    if (!res && maybeSelfReference) {
      // fallback to implicit self-reference
      return Component
    }

    if (__DEV__ && warnMissing && !res) {
      const extra =
        type === COMPONENTS
          ? `\nIf this is a native custom element, make sure to exclude it from ` +
            `component resolution via compilerOptions.isCustomElement.`
          : ``
      warn(`Failed to resolve ${type.slice(0, -1)}: ${name}${extra}`)
    }

    return res
  } else if (__DEV__) {
    warn(
      `resolve${capitalize(type.slice(0, -1))} ` +
        `can only be used in render() or setup().`
    )
  }
}

function resolve(registry: Record<string, any> | undefined, name: string) {
  return (
    registry &&
    (registry[name] ||
      registry[camelize(name)] ||
      registry[capitalize(camelize(name))])
  )
}
