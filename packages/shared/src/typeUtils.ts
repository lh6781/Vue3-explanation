/**
 * 这段代码定义了一个泛型类型Prettify<T>，用于对给定类型T的属性进行格式化。
该类型使用了映射类型和交叉类型的组合。对于给定类型T的每个属性K，映射类型[K in keyof T]: T[K] 将保留属性的原始类型。然后，使用交叉类型& {} 将每个属性类型与一个空对象类型交叉，实际上不会改变属性类型。

这种方式实际上是一种类型转换的技巧，它可以用于优化类型推断和提供更好的类型提示。通过应用Prettify<T>，可以确保每个属性在类型系统中保持不变，同时也保留了与空对象类型交叉的特殊标记。

总而言之，Prettify<T>类型用于对给定类型的属性进行格式化，保持属性类型不变，并与一个空对象类型进行交叉。这种类型的应用可以在某些情况下提供更好的类型推断和类型提示。
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

// make keys required but keep undefined values
/**
 * 这段代码定义了一个泛型类型LooseRequired<T>，用于使给定类型T的所有属性成为必需属性。

类型定义如下：
该类型使用了映射类型和交叉类型的组合。对于给定类型T的每个属性P，映射类型[P in keyof (T & Required<T>)]: T[P] 将属性P的类型保持不变。

在这里，(T & Required<T>)表示将类型T与Required<T>交叉，其中Required<T>是一个内置的 TypeScript 类型工具，它将类型T的所有可选属性转换为必需属性。通过与交叉操作符&进行交叉，我们确保了所有属性都成为必需属性。

总而言之，LooseRequired<T>类型用于将给定类型的所有属性都转换为必需属性。通过使用交叉类型，我们保留了原始属性的类型，并且确保所有属性都必须存在。这可以在某些情况下强制属性的必需性要求，并提供更严格的类型检查。
 */
export type LooseRequired<T> = { [P in keyof (T & Required<T>)]: T[P] }

// If the type T accepts type "any", output type Y, otherwise output type N.
// https://stackoverflow.com/questions/49927523/disallow-call-with-any/49928360#49928360
/**
 * 这段代码定义了一个条件类型 IfAny<T, Y, N>，根据类型 T 是否为 any 类型来选择返回类型 Y 还是类型 N。
类型定义如下：
条件类型使用了条件表达式 0 extends 1 & T 来检查类型 T 是否为 any 类型。当类型 T 为 any 类型时，表达式 0 extends 1 & T 的结果为 true，则返回类型 Y。否则，表达式的结果为 false，则返回类型 N。

这种类型的应用可以在类型系统中根据类型是否为 any 类型来进行条件分支处理。当需要根据类型是否为 any 进行不同的类型操作时，可以使用 IfAny 条件类型来实现相应的逻辑分支。
 */
export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
