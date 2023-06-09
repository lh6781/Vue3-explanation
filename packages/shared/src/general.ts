import { makeMap } from './makeMap'
/**
 * 
这段代码定义了一个常量 EMPTY_OBJ，它是一个空对象，并且具有只读的索引签名。

首先，我们来看常量的类型定义 { readonly [key: string]: any }。它表示一个具有只读索引签名的对象类型，即可以通过任意字符串作为键来访问对象的属性，而属性的值类型为 any，可以是任意类型。而 readonly 关键字表示该对象的属性是只读的，不能进行修改。

根据代码的注释，这个空对象在开发环境中被冻结（frozen），而在非开发环境中则是一个普通的空对象 {}。

在开发环境中，Object.freeze({}) 方法被调用，它会冻结空对象，使得该对象的属性无法被修改。这是为了防止意外修改这个空对象，以确保在开发期间保持其不可变性。这样，任何试图修改 EMPTY_OBJ 的操作都将被忽略或引发错误。

而在非开发环境中，直接使用空对象字面量 {}，它并没有被冻结，所以可以正常地对其进行属性修改。

综上所述，这段代码定义了一个常量 EMPTY_OBJ，它是一个空对象，根据环境的不同可能被冻结或保持可修改的状态。通常用于表示一个不可变的空对象，并在需要一个空对象时使用。
 */
export const EMPTY_OBJ: { readonly [key: string]: any } = __DEV__
  ? Object.freeze({})
  : {}
export const EMPTY_ARR = __DEV__ ? Object.freeze([]) : []

export const NOOP = () => {}

/**
 * Always return false.
 */
export const NO = () => false

const onRE = /^on[^a-z]/
export const isOn = (key: string) => onRE.test(key)

export const isModelListener = (key: string) => key.startsWith('onUpdate:')

export const extend = Object.assign

export const remove = <T>(arr: T[], el: T) => {
  const i = arr.indexOf(el)
  if (i > -1) {
    arr.splice(i, 1)
  }
}

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)
//function isType(value: unknown): value is SomeType {
// 判断 value 的类型
// 返回一个布尔值，指示 value 是否是 SomeType 类型
//}
// 在这个语法中，value 是函数的参数，SomeType 是类型注解，它指定了 value 的期望类型。函数体内部进行了一些条件判断，根据判断结果返回一个布尔值，表示 value 是否满足某个特定类型。

// 当调用类型谓词函数时，TypeScript 将根据返回值的布尔结果来推断变量的类型。如果类型谓词函数返回 true，TypeScript 推断该变量的类型为指定的类型；如果返回 false，则推断类型为除指定类型以外的类型。

// 类型谓词函数常用于更准确地判断某个值的类型，并利用类型推断提供更好的类型安全性和代码提示。它们可以用于条件语句、类型保护和类型细化等场景。
export const isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'

export const isDate = (val: unknown): val is Date =>
  toTypeString(val) === '[object Date]'
export const isRegExp = (val: unknown): val is RegExp =>
  toTypeString(val) === '[object RegExp]'
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1)
}

export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'

export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key

export const isReservedProp = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,ref_for,ref_key,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
)

export const isBuiltInDirective = /*#__PURE__*/ makeMap(
  'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo'
)
/**
 * 
 * 这段代码定义了一个 cacheStringFunction 函数，它接受一个函数 fn 作为参数，并返回一个经过缓存的版本的该函数。

函数签名 <T extends (str: string) => string>(fn: T): T 使用了泛型，表示传入的 fn 参数是一个接受一个字符串参数并返回字符串的函数。返回值类型 T 也是函数类型。

在函数体内部，定义了一个 cache 对象，用于缓存计算结果。cache 对象使用 Object.create(null) 创建，以确保它没有原型链上的任何属性。

然后，返回了一个函数 (str: string) => string，它接受一个字符串参数 str。在这个函数内部，首先检查缓存中是否存在对应的计算结果。如果存在缓存命中（即 hit 不为 undefined），则直接返回缓存中的结果。如果缓存中没有对应的计算结果，则调用原始的函数 fn 进行计算，并将结果存入缓存中，然后返回该结果。

最后，通过类型断言 (str: string) => string，将返回的函数类型 T 与原始的函数类型保持一致，以满足返回类型的要求。

这个函数的作用是在调用原始函数时，将计算结果缓存起来，避免重复计算相同的输入，提高执行效率。
 * @returns 
 */
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as T
}
// replace参数说明：

// searchValue：要查找和替换的内容。可以是一个字符串或正则表达式。
// replaceValue：用于替换匹配内容的新内容。可以是一个字符串或一个函数。
// replace 方法的工作流程如下：

// 在原始字符串中搜索 searchValue。
// 如果找到匹配项，则将其替换为 replaceValue。
// 返回替换后的新字符串，原始字符串不会受到修改。
// 如果 searchValue 是一个字符串，replace 方法将只替换第一个匹配项。如果想要替换所有匹配项，可以使用正则表达式，并使用全局匹配模式 /g。

// 如果 replaceValue 是一个字符串，replace 方法将直接用该字符串替换匹配项。

// 如果 replaceValue 是一个函数，函数会被调用来生成替换的内容。函数接收多个参数：

// match：匹配到的内容。
// p1, p2, ...：如果 searchValue 是正则表达式并具有捕获组，则是捕获组的值。
// offset：匹配项在原始字符串中的索引。
// string：原始字符串。
//函数应该返回替换的内容，将其作为替换结果。
/**
 * 定义了一个正则表达式 camelizeRE，用于将连字符分隔的字符串转换为驼峰式命名的字符串。
 * 正则表达式 /-(\w)/g 匹配一个连字符后面的单词字符（字母、数字、下划线），并且全局匹配所有符合条件的结果。
具体来说，正则表达式的含义如下：
-：匹配连字符 - 字符。
(\w)：使用圆括号捕获匹配的单词字符，\w 表示任意单词字符（字母、数字、下划线）。
/g：全局匹配模式，表示在整个字符串中匹配所有符合条件的结果。
 */
const camelizeRE = /-(\w)/g
/**
 * @private
 */
export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})
/**
 * 这段代码定义了一个正则表达式 hyphenateRE，用于将驼峰式命名的字符串转换为连字符分隔的字符串。

正则表达式 /\\B([A-Z])/g 匹配在大写字母前的边界（非单词边界），并将大写字母替换为连字符加上小写字母。其中：

\B 表示非单词边界。它匹配在一个单词内部的位置，即不在单词的开头或结尾。
([A-Z]) 使用圆括号捕获匹配的大写字母。
/g 是全局匹配模式，表示在整个字符串中匹配所有符合条件的结果。
 */
const hyphenateRE = /\B([A-Z])/g
/**
 * @private
 */
export const hyphenate = cacheStringFunction((str: string) =>
  str.replace(hyphenateRE, '-$1').toLowerCase()
)

/**
 * @private
 * 这段代码定义了一个名为 capitalize 的函数，它使用了 cacheStringFunction 函数来进行字符串的缓存处理。

函数 (str: string) => str.charAt(0).toUpperCase() + str.slice(1) 接受一个字符串作为参数，并返回将字符串首字母大写后的结果。

具体实现如下：

str.charAt(0) 获取字符串的第一个字符。
toUpperCase() 将第一个字符转换为大写。
str.slice(1) 截取字符串的第二个字符及之后的部分。
将第一个字符的大写形式和剩余部分拼接起来，得到首字母大写的字符串。
由于 cacheStringFunction 的缓存机制，如果多次调用 capitalize 函数使用相同的字符串作为参数，它会直接返回缓存的结果，而不会再次进行计算。这样可以提高性能，避免重复的字符串处理。
 */
export const capitalize = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)

/**
 * @private
 * 函数 (str: string) => str ? 'on' + capitalize(str) : '' 接受一个字符串作为参数，并返回一个以 'on' 开头并且首字母大写的字符串。
 */
export const toHandlerKey = cacheStringFunction((str: string) =>
  str ? `on${capitalize(str)}` : ``
)

// compare whether a value has changed, accounting for NaN.
// 这段代码定义了一个名为 hasChanged 的函数，用于比较两个值是否发生了变化。

// 函数接受两个参数 value 和 oldValue，分别表示当前值和旧值。它使用了 JavaScript 中的内置函数 Object.is() 来进行值的比较。

// Object.is(value, oldValue) 方法会根据以下规则来判断两个值是否相同：

// 如果 value 和 oldValue 是同一个对象引用，或者都是 NaN，则返回 true。
// 如果 value 和 oldValue 是相同的非零数字值（包括正负零），则返回 true。
// 对于其他情况，返回 false。
// 在 hasChanged 函数中，!Object.is(value, oldValue) 表达式的含义是判断 value 和 oldValue 是否不相同。如果它们不相同，则返回 true，表示值发生了变化。否则，返回 false，表示值没有发生变化。
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)
/**
 * 
 *  用于依次调用一个函数数组中的函数，并传递一个可选参数 arg。
 */
export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}
/**
 * 
 * 用于向对象定义一个新的属性，并设置属性的值。
 */
export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value
  })
}

/**
 * "123-foo" will be parsed to 123
 * This is used for the .number modifier in v-model
 */
export const looseToNumber = (val: any): any => {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Only conerces number-like strings
 * "123-foo" will be returned as-is
 */
export const toNumber = (val: any): any => {
  const n = isString(val) ? Number(val) : NaN
  return isNaN(n) ? val : n
}
/**
 * 这段代码定义了一个名为 getGlobalThis 的函数，用于获取全局对象 globalThis。

在函数的实现中，首先声明了一个 _globalThis 变量，用于缓存全局对象。

然后通过多个条件判断来确定全局对象的值。首先检查 globalThis 是否已定义，如果是，则将其赋值给 _globalThis 并返回。

如果 globalThis 未定义，则继续检查其他全局对象，按照以下顺序检查并赋值给 _globalThis：

self: 用于浏览器环境中的全局对象。
window: 用于浏览器环境中的全局对象。
global: 用于 Node.js 环境中的全局对象。
如果以上全局对象都未定义，则返回一个空对象 {}。
 */
let _globalThis: any
export const getGlobalThis = (): any => {
  return (
    _globalThis ||
    (_globalThis =
      typeof globalThis !== 'undefined'
        ? globalThis
        : typeof self !== 'undefined'
        ? self
        : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
        ? global
        : {})
  )
}
/**
 * 用于生成访问组件 props 的表达式。
 * 在函数的实现中，首先使用正则表达式 identRE 来测试 name 是否符合标识符命名规则。identRE 正则表达式用于验证一个字符串是否是有效的标识符，即是否由字母、数字、下划线和 Unicode 字符（范围为 \u00A0-\uFFFF）组成，并且以字母、下划线或 Unicode 字符开头。

如果 name 符合标识符命名规则，则使用 __props.${name} 的方式访问组件的 props。这里假设 __props 是一个存储组件 props 的对象，通过点号访问属性。

如果 name 不符合标识符命名规则，则使用 __props[${JSON.stringify(name)}] 的方式访问组件的 props。这里假设 __props 是一个存储组件 props 的对象，通过方括号访问属性，并使用 JSON.stringify 方法将 name 转换为字符串。

最后，函数返回生成的访问组件 props 的表达式。

这个函数的作用是根据 props 的名称生成对应的访问表达式。根据名称是否符合标识符命名规则，选择使用点号访问属性或方括号访问属性的方式来访问组件的 props。这样可以确保在不同的命名情况下都能正确访问到相应的 props。
 */
const identRE = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/

export function genPropsAccessExp(name: string) {
  return identRE.test(name)
    ? `__props.${name}`
    : `__props[${JSON.stringify(name)}]`
}
