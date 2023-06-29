import { extend, ShapeFlags } from '@vue/shared'
import { ComponentInternalInstance, ComponentOptions } from '../component'
import { callWithErrorHandling, ErrorCodes } from '../errorHandling'
import { VNode } from '../vnode'
import { popWarningContext, pushWarningContext } from '../warning'
import {
  DeprecationTypes,
  warnDeprecation,
  isCompatEnabled
} from './compatConfig'
/**
 * `compatModelEventPrefix` 是一个常量，其值为字符串 `'onModelCompat:'`。

该常量用于在兼容模式下，为旧版的双向绑定事件添加前缀，以与新版的单向数据流事件进行区分。在兼容模式下，双向绑定事件的命名约定是以 `'onModelCompat:'` 开头的事件名称。

通过添加前缀，可以确保在兼容模式下旧版的双向绑定事件与新版的单向数据流事件不会冲突，从而避免潜在的命名冲突和错误行为。
 */
export const compatModelEventPrefix = `onModelCompat:`
/**
 * `warnedTypes` 是一个 `WeakSet` 对象，用于存储已经发出警告的类型。

`WeakSet` 是 JavaScript 中的一种集合类型，它允许存储对象的弱引用。与 `Set` 不同，`WeakSet` 中存储的对象引用是弱引用，意味着如果对象没有被其他地方引用，它们可能会被垃圾回收器回收，即使它们存在于 `WeakSet` 中。

在这个特定的情况下，`warnedTypes` 用于跟踪已经发出警告的类型。它的目的是确保相同类型的警告只会被发出一次，避免重复的警告信息。通过使用 `WeakSet` 来存储类型对象的弱引用，可以确保即使 `warnedTypes` 中的对象没有其他引用，它们也不会阻止对象被垃圾回收。这样可以避免内存泄漏问题。

在代码中，当发出某个类型的警告时，可以使用 `warnedTypes` 来检查该类型是否已经发出过警告，如果已经发出过，则无需再次发出。这样可以提高警告的效率并避免重复的警告信息。
 */
const warnedTypes = new WeakSet()
/**
 * 
 * @param vnode 
 * @returns 
 * `convertLegacyVModelProps` 函数用于将旧版本的 `v-model` 相关的属性转换为兼容的属性。

函数接受一个 `vnode` 参数，表示要转换的虚拟节点。函数首先从虚拟节点中获取类型、形状标记、属性和动态属性等信息。

然后，函数判断虚拟节点是否为组件，并且是否具有 `modelValue` 属性。如果满足这两个条件，则表示该组件使用了旧版本的 `v-model`。

接下来，函数通过调用 `isCompatEnabled` 函数来检查是否启用了 `COMPONENT_V_MODEL` 的兼容模式。如果未启用兼容模式，则函数直接返回，不进行转换。

如果启用了兼容模式，函数将进行属性转换。首先，函数判断是否已经发出过关于该组件类型的警告。如果没有发出过警告，则在开发环境下发出警告，提醒用户使用了已被废弃的 `v-model`。

接下来，函数根据组件的 `model` 属性（如果存在）获取要转换的属性名称和事件名称。默认情况下，旧版本的 `v-model` 使用 `modelValue` 属性和 `input` 事件。然后，函数将 `modelValue` 属性转换为新的属性名称，并更新动态属性。

最后，函数将 `onUpdate:modelValue` 事件转换为新的事件名称，并更新属性对象。转换后的属性名称为 `compatModelEventPrefix + event`，例如 `onModelCompat:input`。

通过这样的转换，旧版本的 `v-model` 相关的属性将被转换为新的兼容属性，以适应新版本的使用方式。
 */
export function convertLegacyVModelProps(vnode: VNode) {
  const { type, shapeFlag, props, dynamicProps } = vnode
  const comp = type as ComponentOptions
  if (shapeFlag & ShapeFlags.COMPONENT && props && 'modelValue' in props) {
    if (
      !isCompatEnabled(
        DeprecationTypes.COMPONENT_V_MODEL,
        // this is a special case where we want to use the vnode component's
        // compat config instead of the current rendering instance (which is the
        // parent of the component that exposes v-model)
        { type } as any
      )
    ) {
      return
    }

    if (__DEV__ && !warnedTypes.has(comp)) {
      pushWarningContext(vnode)
      warnDeprecation(DeprecationTypes.COMPONENT_V_MODEL, { type } as any, comp)
      popWarningContext()
      warnedTypes.add(comp)
    }

    // v3 compiled model code -> v2 compat props
    // modelValue -> value
    // onUpdate:modelValue -> onModelCompat:input
    const model = comp.model || {}
    applyModelFromMixins(model, comp.mixins)
    const { prop = 'value', event = 'input' } = model
    if (prop !== 'modelValue') {
      props[prop] = props.modelValue
      delete props.modelValue
    }
    // important: update dynamic props
    if (dynamicProps) {
      dynamicProps[dynamicProps.indexOf('modelValue')] = prop
    }
    props[compatModelEventPrefix + event] = props['onUpdate:modelValue']
    delete props['onUpdate:modelValue']
  }
}
/**
 * 
 * @param model 
 * @param mixins 
 * `applyModelFromMixins` 函数用于从混入对象中应用模型配置到目标模型对象。

函数接受两个参数，`model` 表示目标模型对象，`mixins` 表示混入对象数组。

函数首先判断是否传入了混入对象数组 `mixins`，如果存在，则遍历每个混入对象 `m`。

对于每个混入对象 `m`，函数检查是否存在 `m.model` 属性，如果存在，则使用 `extend` 函数将其合并到目标模型对象 `model` 中。

接下来，函数检查是否存在 `m.mixins` 属性，如果存在，则递归调用 `applyModelFromMixins` 函数，将目标模型对象 `model` 和 `m.mixins` 作为参数继续应用混入。

通过这样的递归过程，函数能够将混入对象中的模型配置应用到目标模型对象中，以实现模型的合并和继承。
 */
function applyModelFromMixins(model: any, mixins?: ComponentOptions[]) {
  if (mixins) {
    mixins.forEach(m => {
      if (m.model) extend(model, m.model)
      if (m.mixins) applyModelFromMixins(model, m.mixins)
    })
  }
}
/**
 * 
 * @param instance 
 * @param event 
 * @param args 
 * @returns 
 * `compatModelEmit` 函数用于在兼容模式下触发组件的模型事件。

函数接受三个参数，`instance` 表示组件的内部实例，`event` 表示要触发的模型事件名称，`args` 表示传递给模型事件处理函数的参数数组。

函数首先通过调用 `isCompatEnabled` 函数检查是否启用了组件的 V-model 兼容模式，如果未启用，则直接返回。

接下来，函数获取组件实例对应的 VNode 的 `props` 属性，然后构建模型事件处理函数的名称，使用 `compatModelEventPrefix + event` 来获取模型事件处理函数。

如果存在模型事件处理函数 `modelHandler`，则通过调用 `callWithErrorHandling` 函数来执行该处理函数，并传递组件实例 `instance`、错误代码 `ErrorCodes.COMPONENT_EVENT_HANDLER` 和参数数组 `args`。

通过这样的方式，函数能够在兼容模式下触发组件的模型事件，并确保在执行模型事件处理函数时进行错误处理。
 */
export function compatModelEmit(
  instance: ComponentInternalInstance,
  event: string,
  args: any[]
) {
  if (!isCompatEnabled(DeprecationTypes.COMPONENT_V_MODEL, instance)) {
    return
  }
  const props = instance.vnode.props
  const modelHandler = props && props[compatModelEventPrefix + event]
  if (modelHandler) {
    callWithErrorHandling(
      modelHandler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    )
  }
}
