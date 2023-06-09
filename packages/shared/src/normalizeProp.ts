import { isArray, isString, isObject, hyphenate } from './general'

export type NormalizedStyle = Record<string, string | number>
/**
这段代码定义了一个名为 normalizeStyle 的函数，用于规范化处理样式。

函数接受一个参数 value，表示要处理的样式值。

在函数的实现中，通过一系列的条件判断来处理不同类型的样式值。

如果 value 是数组类型，则遍历数组中的每一项。对于每一项，如果是字符串类型，则调用 parseStringStyle 函数解析字符串为样式对象，如果是其他类型，则递归调用 normalizeStyle 函数对其进行规范化处理。如果规范化结果存在，则将其合并到一个新的样式对象 res 中，并返回该对象。
如果 value 是字符串类型，则直接返回该字符串。
如果 value 是对象类型，则直接返回该对象。
最后，如果样式值不符合上述条件，则函数将返回 undefined。

这个函数的作用是对输入的样式值进行规范化处理，以使其符合特定的样式对象格式。可以处理数组、字符串和对象类型的样式值，并根据不同类型进行相应的解析和合并。通过这个函数，可以方便地处理和组合多个样式值，确保生成的样式对象符合规范并能正确应用于元素。
 */
export function normalizeStyle(
  value: unknown
): NormalizedStyle | string | undefined {
  if (isArray(value)) {
    const res: NormalizedStyle = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const normalized = isString(item)
        ? parseStringStyle(item)
        : (normalizeStyle(item) as NormalizedStyle)
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res
  } else if (isString(value)) {
    return value
  } else if (isObject(value)) {
    return value
  }
}
/**
 * 用于匹配 CSS 样式中的列表分隔符。
 */
const listDelimiterRE = /;(?![^(]*\))/g
/**
 * 用于匹配 CSS 样式中的属性分隔符。
 */
const propertyDelimiterRE = /:([^]+)/
/**
 * 用于匹配 CSS 样式中的注释。
 */
const styleCommentRE = /\/\*[^]*?\*\//g
/**
 * 
 * 这段代码定义了一个名为 parseStringStyle 的函数，用于解析字符串形式的 CSS 样式。

函数接受一个参数 cssText，表示要解析的 CSS 样式文本。

在函数的实现中，首先创建一个空对象 ret，用于存储解析后的样式键值对。

然后，通过调用 replace 方法，使用 styleCommentRE 正则表达式将样式文本中的注释部分替换为空字符串，以去除注释。

接下来，使用 split 方法和 listDelimiterRE 正则表达式对样式文本进行拆分，得到样式声明的数组。

对于每一个样式声明 item，如果不为空，则使用 split 方法和 propertyDelimiterRE 正则表达式对其进行进一步拆分。

如果拆分后的数组 tmp 的长度大于 1，表示拆分成功，将拆分后的键值对存储到 ret 对象中。其中，tmp[0] 是属性名，tmp[1] 是属性值，通过调用 trim 方法去除首尾空格。

最后，返回存储了解析结果的 ret 对象，即解析后的样式对象。

这个函数可以将字符串形式的 CSS 样式解析为键值对的样式对象表示，方便在代码中进行样式的处理和操作。
 * @returns 
 */
export function parseStringStyle(cssText: string): NormalizedStyle {
  const ret: NormalizedStyle = {}
  cssText
    .replace(styleCommentRE, '')
    .split(listDelimiterRE)
    .forEach(item => {
      if (item) {
        const tmp = item.split(propertyDelimiterRE)
        tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
      }
    })
  return ret
}
/**
 * 
 *这段代码定义了一个名为 stringifyStyle 的函数，用于将样式对象转换为字符串形式的 CSS 样式。

函数接受一个参数 styles，表示要转换的样式对象，可以是 NormalizedStyle 类型、字符串类型或 undefined。

在函数的实现中，首先创建一个空字符串 ret，用于存储转换后的 CSS 样式。

然后，通过条件判断来处理不同情况的输入：

如果 styles 为 undefined 或字符串类型，即表示没有样式或已经是字符串形式的样式，直接返回空字符串 ret。
对于样式对象 styles，通过 for...in 循环遍历其中的键值对。对于每个键值对，将键名存储在变量 key 中，键值存储在变量 value 中。

接下来，使用条件判断来过滤掉无效的值，只处理字符串类型或数字类型的有效值。通过 isString(value) || typeof value === 'number' 条件判断，只有当 value 的类型是字符串或数字时，才进行处理。

在满足条件的情况下，将键名 key 进行规范化处理，如果以 -- 开头，则保持原样，否则将其转换为连字符形式，调用 hyphenate 函数进行转换，得到规范化后的键名 normalizedKey。

然后，将规范化后的键名和值拼接成样式声明的形式，并添加到结果字符串 ret 中，使用冒号分隔键名和值，分号作为声明的结束符号，形成完整的样式声明。

最后，循环结束后，返回拼接好的样式字符串 ret。

这个函数可以将样式对象转换为字符串形式的 CSS 样式，方便在代码中进行样式的输出和使用。只有满足一定条件的有效键值对会被转换为样式声明，无效的或不支持的值会被过滤掉。
 * @returns 
 */
export function stringifyStyle(
  styles: NormalizedStyle | string | undefined
): string {
  let ret = ''
  if (!styles || isString(styles)) {
    return ret
  }
  for (const key in styles) {
    const value = styles[key]
    const normalizedKey = key.startsWith(`--`) ? key : hyphenate(key)
    if (isString(value) || typeof value === 'number') {
      // only render valid values
      ret += `${normalizedKey}:${value};`
    }
  }
  return ret
}
/**
 *
 * 这段代码定义了一个名为 normalizeClass 的函数，用于规范化处理 CSS 类名。

函数接受一个参数 value，表示要处理的值。

在函数的实现中，首先初始化一个空字符串 res，用于存储最终的规范化结果。

然后通过一系列的条件判断来处理不同类型的值。

如果 value 是字符串类型，则直接将其赋值给 res。
如果 value 是数组类型，则遍历数组中的每一项，并递归调用 normalizeClass 函数对每一项进行规范化处理。如果规范化结果不为空，则将其添加到 res 中，并以空格分隔多个类名。
如果 value 是对象类型，则遍历对象的每个属性，如果属性值为真值（非空、非零、非假），则将属性名添加到 res 中，并以空格分隔多个类名。
最后，返回经过处理的 res，并使用 trim 方法去除首尾的空格。

这个函数的作用是将输入的值规范化为一个字符串，用于表示 CSS 类名。可以接受字符串、数组和对象类型的值，并根据不同类型进行相应的处理和组合。通过这个函数，可以方便地处理和拼接多个类名，确保生成的 CSS 类名符合规范并能正确应用于元素。
 * @returns 
 */
export function normalizeClass(value: unknown): string {
  let res = ''
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + ' '
      }
    }
  }
  return res.trim()
}
/**
 * 
 * 这段代码定义了一个名为 normalizeProps 的函数，用于规范化 props 对象。

函数接受一个参数 props，表示要规范化的 props 对象，类型为 Record<string, any> | null。

首先进行判断，如果 props 为 null，则直接返回 null，表示没有 props 需要规范化。

接下来，声明变量 klass 和 style，并从 props 中解构出对应的属性值。注意，这里使用了解构赋值，将 props 对象中的 class 属性赋值给 klass 变量，style 属性赋值给 style 变量。

然后，对 klass 进行判断，如果存在且类型不是字符串，则说明需要对其进行规范化。调用 isString 函数判断 klass 的类型，如果不是字符串类型，则执行规范化操作。

调用 normalizeClass 函数对 klass 进行规范化，并将规范化后的结果重新赋值给 props.class。

接着，对 style 进行判断，如果存在，则说明需要对其进行规范化。调用 normalizeStyle 函数对 style 进行规范化，并将规范化后的结果重新赋值给 props.style。

最后，返回规范化后的 props 对象。

这个函数用于对传入的 props 对象进行规范化操作，主要针对 class 和 style 进行处理。如果 class 属性存在且不是字符串类型，则将其规范化为字符串形式的 class 值；如果 style 属性存在，则将其规范化为样式对象。规范化后的结果会重新赋值给对应的属性，最终返回规范化后的 props 对象。
 *
 * @returns 
 */
export function normalizeProps(props: Record<string, any> | null) {
  if (!props) return null
  let { class: klass, style } = props
  if (klass && !isString(klass)) {
    props.class = normalizeClass(klass)
  }
  if (style) {
    props.style = normalizeStyle(style)
  }
  return props
}
