import {
  Component,
  ConcreteComponent,
  currentInstance,
  ComponentInternalInstance,
  isInSSRComponentSetup,
  ComponentOptions
} from './component'
import { isFunction, isObject } from '@vue/shared'
import { ComponentPublicInstance } from './componentPublicInstance'
import { createVNode, VNode } from './vnode'
import { defineComponent } from './apiDefineComponent'
import { warn } from './warning'
import { ref } from '@vue/reactivity'
import { handleError, ErrorCodes } from './errorHandling'
import { isKeepAlive } from './components/KeepAlive'
import { queueJob } from './scheduler'
/**
 * `AsyncComponentResolveResult` 类型是用于表示异步组件的解析结果的类型。它可以是组件本身或一个具有 `default` 属性的对象，该属性的值是组件。

在 Vue.js 中，异步组件是指在需要时按需加载的组件。它们通常用于优化应用程序的性能，延迟加载较大的组件或按需加载与特定路由相关的组件。

`AsyncComponentResolveResult` 类型的定义允许异步组件在解析完成后以两种形式之一呈现：

1. 如果组件已经被完全解析，那么可以直接作为类型 `T` 的实例使用。
2. 如果组件在解析时被封装在一个对象中，那么可以通过 `default` 属性来访问组件实例。

以下是使用 `AsyncComponentResolveResult` 的示例：

```typescript
import { AsyncComponentResolveResult } from 'vue'

// 异步组件已经解析完整
const componentA: AsyncComponentResolveResult<MyComponent> = new MyComponent()

// 异步组件在解析时封装在对象中
const componentB: AsyncComponentResolveResult<MyComponent> = { default: new MyComponent() }
```

在这个示例中，`AsyncComponentResolveResult` 用于声明两个不同形式的异步组件 `componentA` 和 `componentB`，具体取决于组件是否已经完全解析。
 */
export type AsyncComponentResolveResult<T = Component> = T | { default: T } // es modules
/**
 * `AsyncComponentLoader` 类型是一个函数类型，用于异步加载组件的定义。它是一个不带参数的函数，返回一个 `Promise` 对象，该 `Promise` 对象解析为 `AsyncComponentResolveResult<T>` 类型的值。

在 Vue.js 中，异步组件的加载通常使用动态导入（dynamic import）来实现。`AsyncComponentLoader` 就是用于定义异步加载组件的函数类型，它返回一个 `Promise` 对象，该对象在异步加载完成后解析为 `AsyncComponentResolveResult<T>` 类型的值。

以下是使用 `AsyncComponentLoader` 的示例：

```typescript
import { AsyncComponentLoader } from 'vue'

// 定义一个异步加载组件的函数
const loadComponent: AsyncComponentLoader<MyComponent> = () => {
  return import('./MyComponent.vue')
}

// 使用异步加载组件的函数
loadComponent().then((component) => {
  // 处理异步加载完成后的组件
})
```

在这个示例中，`loadComponent` 是一个异步加载组件的函数，它返回一个 `Promise` 对象，在加载完成后解析为 `AsyncComponentResolveResult<MyComponent>` 类型的值。通过调用 `loadComponent` 函数并处理返回的 `Promise` 对象，可以在异步加载完成后获取到组件并进行进一步处理。
 */
export type AsyncComponentLoader<T = any> = () => Promise<
  AsyncComponentResolveResult<T>
>
/**
 * `AsyncComponentOptions` 接口定义了异步组件的选项。它包含以下属性：

- `loader`：异步组件的加载器，是一个 `AsyncComponentLoader<T>` 类型的函数，用于异步加载组件。
- `loadingComponent`：可选，加载中显示的组件。
- `errorComponent`：可选，加载出错时显示的组件。
- `delay`：可选，延迟加载的时间，单位是毫秒。
- `timeout`：可选，加载超时的时间，单位是毫秒。
- `suspensible`：可选，是否支持挂起（suspense）模式。
- `onError`：可选，加载出错时的错误处理函数，接收 `error`（加载出错的错误对象）、`retry`（重新加载组件的函数）、`fail`（加载失败的函数）、`attempts`（加载尝试次数）作为参数。

通过使用 `AsyncComponentOptions`，可以配置异步组件的加载行为，包括加载过程中的状态显示、错误处理以及加载超时等。

以下是使用 `AsyncComponentOptions` 的示例：

```typescript
import { AsyncComponentOptions, AsyncComponentLoader } from 'vue'

// 定义异步加载组件的选项
const asyncComponentOptions: AsyncComponentOptions<MyComponent> = {
  loader: () => import('./MyComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 5000,
  suspensible: true,
  onError: (error, retry, fail, attempts) => {
    // 处理加载出错的情况
  }
}
```

在这个示例中，`asyncComponentOptions` 是一个异步加载组件的选项对象，它指定了异步加载组件的相关配置，包括加载器、加载中组件、错误组件、延迟加载时间、加载超时时间、是否支持挂起以及错误处理函数。可以根据具体需求配置相应的属性。
 */
export interface AsyncComponentOptions<T = any> {
  loader: AsyncComponentLoader<T>
  loadingComponent?: Component
  errorComponent?: Component
  delay?: number
  timeout?: number
  suspensible?: boolean
  onError?: (
    error: Error,
    retry: () => void,
    fail: () => void,
    attempts: number
  ) => any
}
/**
 * 
 * @param i 
 * @returns 
 * `isAsyncWrapper` 是一个函数，用于判断给定的组件实例或虚拟节点是否是异步组件的包装器。它通过检查组件选项对象中是否存在 `__asyncLoader` 属性来确定组件是否为异步组件。

以下是 `isAsyncWrapper` 函数的使用示例：

```typescript
import { isAsyncWrapper, ComponentInternalInstance, VNode } from 'vue'

const instance: ComponentInternalInstance = // 组件实例
const vnode: VNode =  // 虚拟节点

const isInstanceAsync = isAsyncWrapper(instance)
const isVNodeAsync = isAsyncWrapper(vnode)

console.log(isInstanceAsync) // true 或 false，表示组件实例是否为异步组件
console.log(isVNodeAsync) // true 或 false，表示虚拟节点是否为异步组件
```

在上面的示例中，我们调用 `isAsyncWrapper` 函数，并传入一个组件实例 `instance` 和一个虚拟节点 `vnode`，它会返回一个布尔值，表示给定的组件实例或虚拟节点是否是异步组件的包装器。如果返回值为 `true`，则表示是异步组件；如果返回值为 `false`，则表示不是异步组件。
 */
export const isAsyncWrapper = (i: ComponentInternalInstance | VNode): boolean =>
  !!(i.type as ComponentOptions).__asyncLoader
/**
 * 
 * @param source 
 * @returns 
 * `defineAsyncComponent` 是一个函数，用于定义异步组件。它接受一个异步组件加载器或异步组件选项对象作为参数，并返回一个组件。

异步组件可以延迟加载，这在处理大型组件或需要异步加载的组件时非常有用。`defineAsyncComponent` 函数的工作是根据提供的加载器或选项来创建一个异步组件，并处理加载过程中的各种情况，例如加载中、加载错误和加载超时等。

以下是 `defineAsyncComponent` 函数的使用示例：

```typescript
import { defineAsyncComponent, Component, ComponentOptions } from 'vue'

// 通过加载器定义异步组件
const asyncComponent1 = defineAsyncComponent(() =>
  import('./MyComponent.vue')
)

// 通过选项对象定义异步组件
const asyncComponent2 = defineAsyncComponent({
  loader: () => import('./MyComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 5000,
  suspensible: true,
  onError: (error, retry, fail, attempts) => {
    console.error(error)
    if (attempts <= 3) {
      retry() // 重试加载组件
    } else {
      fail() // 加载失败
    }
  }
})

// 使用异步组件
const App: Component = {
  components: {
    AsyncComponent1: asyncComponent1,
    AsyncComponent2: asyncComponent2
  },
  template: `
    <div>
      <AsyncComponent1 />
      <AsyncComponent2 />
    </div>
  `
}
```

在上面的示例中，我们通过 `defineAsyncComponent` 函数定义了两个异步组件 `asyncComponent1` 和 `asyncComponent2`。其中，`asyncComponent1` 使用了简单的加载器，而 `asyncComponent2` 使用了详细的选项对象。

然后，我们在组件 `App` 中使用了这两个异步组件。在模板中，我们可以像使用普通组件一样使用异步组件，它们会根据加载状态显示不同的内容，例如加载中的组件、加载错误的组件或已加载完成的组件。

需要注意的是，异步组件的加载是异步进行的，因此在加载过程中可能会出现加载中的状态或加载错误的状态。通过 `loadingComponent` 和 `errorComponent` 选项，我们可以指定在加载中和加载错误时显示的占位组件，提供更好的用户体验。

此外，`delay` 选项可以用于延迟显示加载中的组件，以避免闪烁。`timeout` 选项可以设置加载超时时间，超过指定时间后仍未加载完成则视为加载失败。

最后，`onError` 回调函数可以用于处理加载错误的情况。在回调函数中，我们可以选择重试加载组件或标记加载失败，以及根据加载的尝试次数采取不同的处理策略。
 */
export function defineAsyncComponent<
  T extends Component = { new (): ComponentPublicInstance }
>(source: AsyncComponentLoader<T> | AsyncComponentOptions<T>): T {
  if (isFunction(source)) {
    source = { loader: source }
  }

  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout, // undefined = never times out
    suspensible = true,
    onError: userOnError
  } = source

  let pendingRequest: Promise<ConcreteComponent> | null = null
  let resolvedComp: ConcreteComponent | undefined

  let retries = 0
  const retry = () => {
    retries++
    pendingRequest = null
    return load()
  }

  const load = (): Promise<ConcreteComponent> => {
    let thisRequest: Promise<ConcreteComponent>
    return (
      pendingRequest ||
      (thisRequest = pendingRequest =
        loader()
          .catch(err => {
            err = err instanceof Error ? err : new Error(String(err))
            if (userOnError) {
              return new Promise((resolve, reject) => {
                const userRetry = () => resolve(retry())
                const userFail = () => reject(err)
                userOnError(err, userRetry, userFail, retries + 1)
              })
            } else {
              throw err
            }
          })
          .then((comp: any) => {
            if (thisRequest !== pendingRequest && pendingRequest) {
              return pendingRequest
            }
            if (__DEV__ && !comp) {
              warn(
                `Async component loader resolved to undefined. ` +
                  `If you are using retry(), make sure to return its return value.`
              )
            }
            // interop module default
            if (
              comp &&
              (comp.__esModule || comp[Symbol.toStringTag] === 'Module')
            ) {
              comp = comp.default
            }
            if (__DEV__ && comp && !isObject(comp) && !isFunction(comp)) {
              throw new Error(`Invalid async component load result: ${comp}`)
            }
            resolvedComp = comp
            return comp
          }))
    )
  }

  return defineComponent({
    name: 'AsyncComponentWrapper',

    __asyncLoader: load,

    get __asyncResolved() {
      return resolvedComp
    },

    setup() {
      const instance = currentInstance!

      // already resolved
      if (resolvedComp) {
        return () => createInnerComp(resolvedComp!, instance)
      }

      const onError = (err: Error) => {
        pendingRequest = null
        handleError(
          err,
          instance,
          ErrorCodes.ASYNC_COMPONENT_LOADER,
          !errorComponent /* do not throw in dev if user provided error component */
        )
      }

      // suspense-controlled or SSR.
      if (
        (__FEATURE_SUSPENSE__ && suspensible && instance.suspense) ||
        (__SSR__ && isInSSRComponentSetup)
      ) {
        return load()
          .then(comp => {
            return () => createInnerComp(comp, instance)
          })
          .catch(err => {
            onError(err)
            return () =>
              errorComponent
                ? createVNode(errorComponent as ConcreteComponent, {
                    error: err
                  })
                : null
          })
      }

      const loaded = ref(false)
      const error = ref()
      const delayed = ref(!!delay)

      if (delay) {
        setTimeout(() => {
          delayed.value = false
        }, delay)
      }

      if (timeout != null) {
        setTimeout(() => {
          if (!loaded.value && !error.value) {
            const err = new Error(
              `Async component timed out after ${timeout}ms.`
            )
            onError(err)
            error.value = err
          }
        }, timeout)
      }

      load()
        .then(() => {
          loaded.value = true
          if (instance.parent && isKeepAlive(instance.parent.vnode)) {
            // parent is keep-alive, force update so the loaded component's
            // name is taken into account
            queueJob(instance.parent.update)
          }
        })
        .catch(err => {
          onError(err)
          error.value = err
        })

      return () => {
        if (loaded.value && resolvedComp) {
          return createInnerComp(resolvedComp, instance)
        } else if (error.value && errorComponent) {
          return createVNode(errorComponent, {
            error: error.value
          })
        } else if (loadingComponent && !delayed.value) {
          return createVNode(loadingComponent)
        }
      }
    }
  }) as T
}
/**
 * 
 * @param comp 
 * @param parent 
 * @returns 
 * `createInnerComp` 是一个函数，用于创建内部组件。它接受两个参数，`comp` 表示具体的组件实例，`parent` 表示父组件的内部实例。

该函数的主要作用是创建一个新的虚拟节点（VNode）来表示内部组件，并进行一些额外的配置。

具体步骤如下：

1. 从父组件的虚拟节点中获取 `ref`、`props` 和 `children`。
2. 使用 `createVNode` 函数创建一个新的虚拟节点，并传入 `comp`、`props` 和 `children`。
3. 确保内部组件继承异步包装器的 `ref` 所有者，将父组件的 `ref` 赋值给新创建的虚拟节点的 `ref` 属性。
4. 将自定义元素回调传递给内部组件，并从异步包装器的虚拟节点中删除该属性。
5. 返回新创建的虚拟节点。

通过这个函数，我们可以在异步组件加载完成后，将具体的组件实例包装成一个新的虚拟节点，并进行必要的配置。这样可以确保内部组件在渲染时具有正确的属性和父子关系。

这个函数通常在异步组件加载完成后的回调函数中被调用，用于处理内部组件的创建和配置过程。
 */
function createInnerComp(
  comp: ConcreteComponent,
  parent: ComponentInternalInstance
) {
  const { ref, props, children, ce } = parent.vnode
  const vnode = createVNode(comp, props, children)
  // ensure inner component inherits the async wrapper's ref owner
  vnode.ref = ref
  // pass the custom element callback on to the inner comp
  // and remove it from the async wrapper
  vnode.ce = ce
  delete parent.vnode.ce

  return vnode
}
