import { isReactive, isReadonly, isRef, Ref, toRaw } from '@vue/reactivity'
import { EMPTY_OBJ, extend, isArray, isFunction, isObject } from '@vue/shared'
import { isShallow } from '../../reactivity/src/reactive'
import { ComponentInternalInstance, ComponentOptions } from './component'
import { ComponentPublicInstance } from './componentPublicInstance'
/**
 * 
 * @returns 
 * `initCustomFormatter` 函数用于初始化自定义的 DevTools 格式化程序，用于在浏览器的开发者工具中格式化 Vue 实例对象。

首先，检查当前环境是否处于开发模式 (`__DEV__`) 并且是否在浏览器中运行。如果不满足条件，则直接返回，不进行初始化。

接下来，定义了一些样式对象，用于在 DevTools 中显示不同类型的数据。

然后，定义了一个 `formatter` 对象，包含了自定义的格式化方法。这些方法用于根据对象的类型和属性来生成对应的格式化内容。主要包括以下方法：

- `header(obj: unknown)`: 根据对象生成格式化的标题部分。
- `hasBody(obj: unknown)`: 判断对象是否有展开的内容。
- `body(obj: unknown)`: 根据对象生成格式化的展开内容部分。

在 `header` 方法中，根据对象的类型进行判断，并返回对应的格式化标题内容。其中，判断对象是否为 Vue 实例，是否为响应式对象等。

在 `hasBody` 方法中，判断对象是否为 Vue 实例，并返回相应的结果。

在 `body` 方法中，根据对象是否为 Vue 实例，生成相应的格式化内容。

接下来，定义了 `formatInstance` 方法，用于生成 Vue 实例的格式化内容。根据实例的不同属性（props、setupState、data、computed、injected），生成相应的展示块。

然后，定义了 `createInstanceBlock` 方法，用于生成每个属性的展示块。根据属性名和属性值生成相应的格式化内容。

接着，定义了 `formatValue` 方法，用于根据值的类型生成相应的格式化内容。

接下来，定义了 `extractKeys` 方法，用于从实例的 `ctx` 中提取指定类型的属性。遍历实例的 `ctx`，判断属性是否属于指定类型，如果是则将属性和值存储到一个新的对象中并返回。

然后，定义了 `isKeyOfType` 方法，用于判断属性是否属于指定类型。根据组件的选项对象以及继承的组件和混入的组件判断属性是否存在于指定类型中。

接下来，定义了 `genRefFlag` 方法，根据 `Ref` 对象的类型生成标识字符串。

最后，在符合条件的情况下，将自定义的格式化程序对象 `formatter` 推入 `window.devtoolsFormatters` 数组中，将其注册为 DevTools 的自定义格式化程序。

通过调用 `initCustomFormatter` 函数，可以在浏览器的开发者工具中更好地查看和调试 Vue 实例对象的属性和状态。
 */
export function initCustomFormatter() {
  /* eslint-disable no-restricted-globals */
  if (!__DEV__ || typeof window === 'undefined') {
    return
  }

  const vueStyle = { style: 'color:#3ba776' }
  const numberStyle = { style: 'color:#0b1bc9' }
  const stringStyle = { style: 'color:#b62e24' }
  const keywordStyle = { style: 'color:#9d288c' }

  // custom formatter for Chrome
  // https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
  const formatter = {
    header(obj: unknown) {
      // TODO also format ComponentPublicInstance & ctx.slots/attrs in setup
      if (!isObject(obj)) {
        return null
      }

      if (obj.__isVue) {
        return ['div', vueStyle, `VueInstance`]
      } else if (isRef(obj)) {
        return [
          'div',
          {},
          ['span', vueStyle, genRefFlag(obj)],
          '<',
          formatValue(obj.value),
          `>`
        ]
      } else if (isReactive(obj)) {
        return [
          'div',
          {},
          ['span', vueStyle, isShallow(obj) ? 'ShallowReactive' : 'Reactive'],
          '<',
          formatValue(obj),
          `>${isReadonly(obj) ? ` (readonly)` : ``}`
        ]
      } else if (isReadonly(obj)) {
        return [
          'div',
          {},
          ['span', vueStyle, isShallow(obj) ? 'ShallowReadonly' : 'Readonly'],
          '<',
          formatValue(obj),
          '>'
        ]
      }
      return null
    },
    hasBody(obj: unknown) {
      return obj && (obj as any).__isVue
    },
    body(obj: unknown) {
      if (obj && (obj as any).__isVue) {
        return [
          'div',
          {},
          ...formatInstance((obj as ComponentPublicInstance).$)
        ]
      }
    }
  }

  function formatInstance(instance: ComponentInternalInstance) {
    const blocks = []
    if (instance.type.props && instance.props) {
      blocks.push(createInstanceBlock('props', toRaw(instance.props)))
    }
    if (instance.setupState !== EMPTY_OBJ) {
      blocks.push(createInstanceBlock('setup', instance.setupState))
    }
    if (instance.data !== EMPTY_OBJ) {
      blocks.push(createInstanceBlock('data', toRaw(instance.data)))
    }
    const computed = extractKeys(instance, 'computed')
    if (computed) {
      blocks.push(createInstanceBlock('computed', computed))
    }
    const injected = extractKeys(instance, 'inject')
    if (injected) {
      blocks.push(createInstanceBlock('injected', injected))
    }

    blocks.push([
      'div',
      {},
      [
        'span',
        {
          style: keywordStyle.style + ';opacity:0.66'
        },
        '$ (internal): '
      ],
      ['object', { object: instance }]
    ])
    return blocks
  }

  function createInstanceBlock(type: string, target: any) {
    target = extend({}, target)
    if (!Object.keys(target).length) {
      return ['span', {}]
    }
    return [
      'div',
      { style: 'line-height:1.25em;margin-bottom:0.6em' },
      [
        'div',
        {
          style: 'color:#476582'
        },
        type
      ],
      [
        'div',
        {
          style: 'padding-left:1.25em'
        },
        ...Object.keys(target).map(key => {
          return [
            'div',
            {},
            ['span', keywordStyle, key + ': '],
            formatValue(target[key], false)
          ]
        })
      ]
    ]
  }

  function formatValue(v: unknown, asRaw = true) {
    if (typeof v === 'number') {
      return ['span', numberStyle, v]
    } else if (typeof v === 'string') {
      return ['span', stringStyle, JSON.stringify(v)]
    } else if (typeof v === 'boolean') {
      return ['span', keywordStyle, v]
    } else if (isObject(v)) {
      return ['object', { object: asRaw ? toRaw(v) : v }]
    } else {
      return ['span', stringStyle, String(v)]
    }
  }

  function extractKeys(instance: ComponentInternalInstance, type: string) {
    const Comp = instance.type
    if (isFunction(Comp)) {
      return
    }
    const extracted: Record<string, any> = {}
    for (const key in instance.ctx) {
      if (isKeyOfType(Comp, key, type)) {
        extracted[key] = instance.ctx[key]
      }
    }
    return extracted
  }

  function isKeyOfType(Comp: ComponentOptions, key: string, type: string) {
    const opts = Comp[type]
    if (
      (isArray(opts) && opts.includes(key)) ||
      (isObject(opts) && key in opts)
    ) {
      return true
    }
    if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
      return true
    }
    if (Comp.mixins && Comp.mixins.some(m => isKeyOfType(m, key, type))) {
      return true
    }
  }

  function genRefFlag(v: Ref) {
    if (isShallow(v)) {
      return `ShallowRef`
    }
    if ((v as any).effect) {
      return `ComputedRef`
    }
    return `Ref`
  }

  if ((window as any).devtoolsFormatters) {
    ;(window as any).devtoolsFormatters.push(formatter)
  } else {
    ;(window as any).devtoolsFormatters = [formatter]
  }
}
