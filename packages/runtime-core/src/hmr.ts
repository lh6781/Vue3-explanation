/* eslint-disable no-restricted-globals */
import {
  ConcreteComponent,
  ComponentInternalInstance,
  ComponentOptions,
  InternalRenderFunction,
  ClassComponent,
  isClassComponent
} from './component'
import { queueJob, queuePostFlushCb } from './scheduler'
import { extend, getGlobalThis } from '@vue/shared'
/**
 * `HMRComponent` 是一个类型别名，用于表示支持热模块替换（Hot Module Replacement）的组件类型。

它可以是 `ComponentOptions` 类型或 `ClassComponent` 类型。

- `ComponentOptions` 是 Vue 组件的选项对象类型。它包含组件的属性、生命周期钩子函数、指令、过滤器等配置信息。通过传递 `ComponentOptions` 类型的对象来定义组件。

- `ClassComponent` 是通过类定义的组件类型。它是一个类构造函数，可以通过继承 `Vue` 类或其他 Vue 组件类来创建组件。类组件通过定义实例属性和方法来描述组件的行为。

`HMRComponent` 类型的组件可以在开发过程中进行热模块替换，即在不重新加载整个应用程序的情况下，实时更新组件代码和状态。这样可以提高开发效率，无需手动刷新页面即可看到修改的结果。
 */
type HMRComponent = ComponentOptions | ClassComponent
/**
 * `isHmrUpdating` 是一个变量，用于表示当前是否正在进行热模块替换（Hot Module Replacement，HMR）更新。

它是一个布尔类型的变量，初始值为 `false`。当进行 HMR 更新时，可以将 `isHmrUpdating` 设置为 `true`，表示正在进行更新操作。在更新完成后，可以将 `isHmrUpdating` 设置回 `false`，表示更新操作已完成。

该变量通常与热模块替换的相关逻辑一起使用，以确保在更新期间不执行不必要的操作或避免重复更新的问题。
 */
export let isHmrUpdating = false
/**
 * `hmrDirtyComponents` 是一个 `Set` 类型的变量，用于存储需要进行热模块替换（Hot Module Replacement，HMR）的组件。

它用于跟踪发生变更的组件，并在进行 HMR 更新时进行处理。当一个组件发生变更时，可以将该组件添加到 `hmrDirtyComponents` 集合中。在 HMR 更新过程中，可以遍历这个集合，并执行相应的更新操作，以确保组件在更新后正常运行。

通过使用 `Set` 数据结构，可以确保集合中的组件是唯一的，避免重复处理相同的组件。

请注意，`hmrDirtyComponents` 变量是一个全局变量，用于在应用程序中共享需要进行 HMR 更新的组件信息。
 */
export const hmrDirtyComponents = new Set<ConcreteComponent>()
/**
 * `HMRRuntime` 接口定义了一组 HMR 运行时的方法，包括 `createRecord`、`rerender` 和 `reload`。

- `createRecord` 方法是一个函数，用于创建 HMR 记录。它接受一个参数，类型为 `createRecord` 方法的类型，用于创建 HMR 记录。HMR 记录用于跟踪模块的依赖关系和更新状态，并在模块发生变更时触发相应的更新操作。

- `rerender` 方法是一个函数，用于重新渲染组件。它接受一个参数，类型为 `rerender` 方法的类型，用于重新渲染组件。当组件的状态发生变更时，可以调用该方法来触发组件的重新渲染。

- `reload` 方法是一个函数，用于重新加载模块。它接受一个参数，类型为 `reload` 方法的类型，用于重新加载模块。当模块发生变更时，可以调用该方法来重新加载模块，并触发相应的更新操作。

这些方法是 HMR 运行时的核心方法，用于管理模块的热替换和更新。通过使用这些方法，可以实现在开发过程中实时更新和调试应用程序。
 */
export interface HMRRuntime {
  createRecord: typeof createRecord
  rerender: typeof rerender
  reload: typeof reload
}

// Expose the HMR runtime on the global object
// This makes it entirely tree-shakable without polluting the exports and makes
// it easier to be used in toolings like vue-loader
// Note: for a component to be eligible for HMR it also needs the __hmrId option
// to be set so that its instances can be registered / removed.
/**
 * 这段代码通过条件判断 `__DEV__`，在开发环境下创建了一个 `HMRRuntime` 对象，并将其赋值给全局对象 `__VUE_HMR_RUNTIME__`。

该 `HMRRuntime` 对象包含了三个方法：`createRecord`、`rerender` 和 `reload`。这些方法是通过调用 `tryWrap` 函数进行包装的，目的是在调用时捕获任何可能出现的错误并进行处理。

- `createRecord` 方法用于创建 HMR 记录，跟踪模块的依赖关系和更新状态。
- `rerender` 方法用于重新渲染组件，当组件的状态发生变更时调用该方法触发重新渲染。
- `reload` 方法用于重新加载模块，在模块发生变更时调用该方法重新加载并触发更新操作。

通过将这些方法赋值给全局对象 `__VUE_HMR_RUNTIME__`，可以在应用程序中使用它们来实现热替换和更新的功能。在开发过程中，当源代码发生变更时，开发服务器会通过 `HMRRuntime` 对象通知应用程序进行相应的处理，以实现实时更新和调试。
 */
if (__DEV__) {
  getGlobalThis().__VUE_HMR_RUNTIME__ = {
    createRecord: tryWrap(createRecord),
    rerender: tryWrap(rerender),
    reload: tryWrap(reload)
  } as HMRRuntime
}
/**
 * 这段代码定义了一个 `Map` 对象 `map`，它的键是字符串类型，值是一个对象。该对象包含两个属性：

- `initialDef`：记录了组件的初始定义，即在导入时记录的组件选项。这样即使没有活动的实例，也可以将热更新应用到组件上。
- `instances`：存储了使用该组件定义创建的实例的集合。它是一个 `Set` 对象，用于追踪当前使用该组件定义创建的所有实例。

通过使用 `new Map()` 创建了一个空的 `Map` 对象，将其赋值给变量 `map`。

这个 `Map` 对象的作用是在热更新过程中存储组件的定义和实例，以便能够在更新时重新应用组件的定义并更新相关的实例。
 */
const map: Map<
  string,
  {
    // the initial component definition is recorded on import - this allows us
    // to apply hot updates to the component even when there are no actively
    // rendered instance.
    initialDef: ComponentOptions
    instances: Set<ComponentInternalInstance>
  }
> = new Map()
/**
 * 
 * @param instance 
 * 这段代码定义了一个名为 `registerHMR` 的函数，用于注册热模块替换（HMR）相关的信息。

函数接受一个 `ComponentInternalInstance` 类型的参数 `instance`，表示要注册的组件实例。

首先，从 `instance.type` 中获取 `__hmrId` 属性，这个属性表示组件的唯一标识符。

然后，通过 `map.get(id)` 尝试从 `map` 中获取与当前组件标识符对应的记录（record）。

如果 `record` 不存在，则调用 `createRecord` 函数来创建该组件的记录，并将其添加到 `map` 中。`createRecord` 函数接受组件的标识符和类型作为参数，并在 `map` 中创建对应的记录。

最后，将当前组件实例 `instance` 添加到 `record.instances` 集合中，用于追踪该组件的实例。

通过这个函数，可以在组件创建时将其实例注册到热模块替换系统中，以便在热更新时能够重新应用组件定义并更新相关实例。
 */
export function registerHMR(instance: ComponentInternalInstance) {
  const id = instance.type.__hmrId!
  let record = map.get(id)
  if (!record) {
    createRecord(id, instance.type as HMRComponent)
    record = map.get(id)!
  }
  record.instances.add(instance)
}
/**
 * 
 * @param instance 
 * 这段代码定义了一个名为 `unregisterHMR` 的函数，用于取消注册热模块替换（HMR）相关的信息。

函数接受一个 `ComponentInternalInstance` 类型的参数 `instance`，表示要取消注册的组件实例。

首先，从 `instance.type` 中获取 `__hmrId` 属性，这个属性表示组件的唯一标识符。

然后，通过 `map.get(id)` 获取与当前组件标识符对应的记录（record）。

接下来，从 `record.instances` 集合中删除当前组件实例 `instance`。

通过这个函数，可以在组件销毁时将其实例从热模块替换系统中取消注册，以防止不再需要的组件实例持续存在于记录中。
 */
export function unregisterHMR(instance: ComponentInternalInstance) {
  map.get(instance.type.__hmrId!)!.instances.delete(instance)
}
/**
 * 
 * @param id 
 * @param initialDef 
 * @returns 
 * 这段代码定义了一个名为 `createRecord` 的函数，用于创建热模块替换（HMR）相关的记录。

函数接受两个参数：
- `id` 表示组件的唯一标识符。
- `initialDef` 表示初始的组件定义，可以是 `ComponentOptions` 或 `ClassComponent` 类型。

函数首先通过 `map.has(id)` 检查是否已经存在与当前组件标识符对应的记录。如果已经存在记录，则直接返回 `false`，表示创建记录失败。

如果不存在对应的记录，则使用 `normalizeClassComponent` 函数对 `initialDef` 进行规范化处理，确保其为 `ComponentOptions` 类型。

然后，将组件的初始定义 `initialDef` 和一个新建的空的 `Set` 实例作为值，存储到 `map` 中，以 `id` 为键。

最后，返回 `true`，表示创建记录成功。

通过这个函数，可以在组件加载时创建与组件相关的记录，用于记录组件的初始定义和实例集合。这些记录将在热模块替换过程中用于更新组件的定义和重新渲染组件实例。
 */
function createRecord(id: string, initialDef: HMRComponent): boolean {
  if (map.has(id)) {
    return false
  }
  map.set(id, {
    initialDef: normalizeClassComponent(initialDef),
    instances: new Set()
  })
  return true
}
/**
 * 
 * @param component 
 * @returns 
 * `normalizeClassComponent` 是一个函数，用于规范化类组件的定义。

函数接受一个参数 `component`，表示要规范化的组件定义，类型为 `HMRComponent`。

函数首先通过 `isClassComponent` 函数判断 `component` 是否为类组件。如果是类组件，则返回 `component.__vccOpts`，即类组件的 `__vccOpts` 属性，该属性是在组件定义时创建的选项对象。

如果 `component` 不是类组件，则直接返回 `component`，表示不需要进行规范化处理。

通过这个函数，可以确保类组件的定义被规范化为 `ComponentOptions` 类型，以便在热模块替换过程中正确处理组件的更新和重新渲染。
 */
function normalizeClassComponent(component: HMRComponent): ComponentOptions {
  return isClassComponent(component) ? component.__vccOpts : component
}
/**
 * 
 * @param id 
 * @param newRender 
 * @returns 
 * `rerender` 是一个用于重新渲染组件的函数。

函数接受两个参数，`id` 表示要重新渲染的组件的唯一标识符，`newRender` 是一个可选的新的渲染函数。

函数首先通过 `map.get(id)` 获取与给定 `id` 相关联的记录 `record`。如果找不到记录，则直接返回。

接下来，函数更新初始记录 `record.initialDef` 的 `render` 属性为 `newRender`，这样对于尚未渲染的组件，将使用新的渲染函数进行渲染。

然后，函数遍历 `record.instances` 中的每个实例，执行以下操作：

1. 如果 `newRender` 存在，将实例的 `render` 属性和类型组件的 `render` 属性都更新为 `newRender`。
2. 清空实例的 `renderCache`，这是用于缓存渲染结果的数组。
3. 将 `isHmrUpdating` 标志设置为 `true`，表示正在进行热模块替换的更新过程。
4. 调用实例的 `update` 方法进行更新，这将触发组件的重新渲染。
5. 将 `isHmrUpdating` 标志恢复为 `false`，表示热模块替换的更新过程已结束。

通过这些步骤，函数能够重新渲染指定组件并更新其子组件，确保组件在热模块替换过程中能够正确更新和重新渲染。
 */
function rerender(id: string, newRender?: Function) {
  const record = map.get(id)
  if (!record) {
    return
  }

  // update initial record (for not-yet-rendered component)
  record.initialDef.render = newRender

  // Create a snapshot which avoids the set being mutated during updates
  ;[...record.instances].forEach(instance => {
    if (newRender) {
      instance.render = newRender as InternalRenderFunction
      normalizeClassComponent(instance.type as HMRComponent).render = newRender
    }
    instance.renderCache = []
    // this flag forces child components with slot content to update
    isHmrUpdating = true
    instance.update()
    isHmrUpdating = false
  })
}
/**
 * 
 * @param id 
 * @param newComp 
 * @returns 
 * `reload` 函数用于重新加载组件。

函数接受两个参数，`id` 表示要重新加载的组件的唯一标识符，`newComp` 是一个新的组件定义。

首先，函数通过 `map.get(id)` 获取与给定 `id` 相关联的记录 `record`。如果找不到记录，则直接返回。

接下来，函数对 `newComp` 进行规范化处理，将其转换为标准的组件定义。然后，函数更新初始记录 `record.initialDef`，使其与新的组件定义 `newComp` 保持一致。

然后，函数遍历 `record.instances` 中的每个实例，执行以下操作：

1. 将实例的类型组件转换为规范化的类组件，存储在变量 `oldComp` 中。
2. 如果 `oldComp` 不在 `hmrDirtyComponents` 集合中，执行以下操作：
   - 更新现有的组件定义 `oldComp`，使其与新的组件定义 `newComp` 保持一致。
   - 将 `oldComp` 添加到 `hmrDirtyComponents` 集合中，标记其为脏组件，这将强制渲染器在补丁过程中替换组件。
3. 使选项解析缓存无效，通过删除实例的应用上下文中与类型组件相关的缓存。
4. 根据不同的情况执行实际的更新操作：
   - 如果实例是自定义元素（custom element），则调用其 `ceReload` 方法重新加载（传递新组件的样式）。
   - 如果实例有父级（parent），则强制父级实例重新渲染。这将导致所有更新的组件被卸载并重新挂载。通过将更新操作排队，以避免多次强制父级重新渲染。
   - 如果实例的应用上下文中有 `reload` 方法，则调用该方法（适用于通过 `createApp()` 创建的根实例）。
   - 如果在浏览器环境下，执行完整的页面重载。
   - 否则，显示警告信息，指示需要进行完整的页面重载。
5. 在更新后的回调队列中，确保清除脏组件。遍历实例列表，将规范化的类型组件从 `hmrDirtyComponents` 集合中删除。

通过这些步骤，`reload` 函数能够重新加载组件并触发相应的更新操作，包括更新组件定义、强制重新渲染父级实例以及执行完整页面重载（如果适用）。同时，它还管理着脏组件的状态，以确保在更新后正确清除脏标记。
 */
function reload(id: string, newComp: HMRComponent) {
  const record = map.get(id)
  if (!record) return

  newComp = normalizeClassComponent(newComp)
  // update initial def (for not-yet-rendered components)
  updateComponentDef(record.initialDef, newComp)

  // create a snapshot which avoids the set being mutated during updates
  const instances = [...record.instances]

  for (const instance of instances) {
    const oldComp = normalizeClassComponent(instance.type as HMRComponent)

    if (!hmrDirtyComponents.has(oldComp)) {
      // 1. Update existing comp definition to match new one
      if (oldComp !== record.initialDef) {
        updateComponentDef(oldComp, newComp)
      }
      // 2. mark definition dirty. This forces the renderer to replace the
      // component on patch.
      hmrDirtyComponents.add(oldComp)
    }

    // 3. invalidate options resolution cache
    instance.appContext.propsCache.delete(instance.type as any)
    instance.appContext.emitsCache.delete(instance.type as any)
    instance.appContext.optionsCache.delete(instance.type as any)

    // 4. actually update
    if (instance.ceReload) {
      // custom element
      hmrDirtyComponents.add(oldComp)
      instance.ceReload((newComp as any).styles)
      hmrDirtyComponents.delete(oldComp)
    } else if (instance.parent) {
      // 4. Force the parent instance to re-render. This will cause all updated
      // components to be unmounted and re-mounted. Queue the update so that we
      // don't end up forcing the same parent to re-render multiple times.
      queueJob(instance.parent.update)
    } else if (instance.appContext.reload) {
      // root instance mounted via createApp() has a reload method
      instance.appContext.reload()
    } else if (typeof window !== 'undefined') {
      // root instance inside tree created via raw render(). Force reload.
      window.location.reload()
    } else {
      console.warn(
        '[HMR] Root or manually mounted instance modified. Full reload required.'
      )
    }
  }

  // 5. make sure to cleanup dirty hmr components after update
  queuePostFlushCb(() => {
    for (const instance of instances) {
      hmrDirtyComponents.delete(
        normalizeClassComponent(instance.type as HMRComponent)
      )
    }
  })
}
/**
 * 
 * @param oldComp 
 * @param newComp 
 * `updateComponentDef` 函数用于更新组件定义。

函数接受两个参数，`oldComp` 表示要更新的旧组件定义，`newComp` 表示新的组件定义。

函数首先使用 `extend` 方法将新组件定义的属性合并到旧组件定义中，实现属性的更新和扩展。

然后，函数遍历旧组件定义中的每个属性，如果该属性不是 `__file`，且不在新组件定义中，就将其从旧组件定义中删除。

通过这些步骤，`updateComponentDef` 函数能够更新组件定义，将新组件定义中的属性合并到旧组件定义中，并移除旧组件定义中不存在的属性。这样可以确保组件定义保持最新的状态。
 */
function updateComponentDef(
  oldComp: ComponentOptions,
  newComp: ComponentOptions
) {
  extend(oldComp, newComp)
  for (const key in oldComp) {
    if (key !== '__file' && !(key in newComp)) {
      delete oldComp[key]
    }
  }
}
/**
 * 
 * @param fn 
 * @returns 
 * `tryWrap` 函数用于包装一个函数，并在函数执行时捕获可能发生的错误。

函数接受一个函数 `fn` 作为参数，该函数接受 `id` 和 `arg` 作为参数并返回一个值。

`tryWrap` 函数返回一个新的函数，该函数也接受 `id` 和 `arg` 作为参数，并在执行 `fn` 函数时尝试捕获错误。

如果执行 `fn` 函数期间发生了错误，捕获到的错误会被打印到控制台，并显示警告信息 `[HMR] Something went wrong during Vue component hot-reload. Full reload required.`。

通过使用 `tryWrap` 函数包装原始函数，可以确保在出现错误时进行适当的错误处理，以避免应用程序崩溃，并提供适当的提示信息。
 */
function tryWrap(fn: (id: string, arg: any) => any): Function {
  return (id: string, arg: any) => {
    try {
      return fn(id, arg)
    } catch (e: any) {
      console.error(e)
      console.warn(
        `[HMR] Something went wrong during Vue component hot-reload. ` +
          `Full reload required.`
      )
    }
  }
}
