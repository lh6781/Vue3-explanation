// using literal strings instead of numbers so that it's easier to inspect
// debugger events
/**
 * TrackOpTypes 是一个常量枚举（constant enum），用于表示追踪操作的类型。它包含三个枚举成员：

GET: 表示属性的获取操作，例如对象属性的读取或数组元素的访问。
HAS: 表示属性的存在性检查操作，例如使用 in 运算符检查对象是否具有某个属性。
ITERATE: 表示迭代操作，例如使用 for...of 循环遍历对象或数组。
这些枚举成员可用于在响应式系统中追踪和记录对对象属性或数组元素的操作，以便进行依赖收集和触发相应的效果。
 */
export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}
/**
 * TriggerOpTypes 是一个常量枚举（constant enum），用于表示触发操作的类型。它包含四个枚举成员：

SET: 表示属性的设置操作，例如对象属性的赋值或数组元素的修改。
ADD: 表示属性的添加操作，例如向对象添加新属性或向数组添加新元素。
DELETE: 表示属性的删除操作，例如删除对象的属性或从数组中删除元素。
CLEAR: 表示清空操作，例如清空对象或数组的所有属性或元素。
这些枚举成员可用于在响应式系统中触发相应的效果，以更新依赖于被修改对象的视图或状态。触发操作通常由应用程序中的某个逻辑触发，如用户交互、数据变更等。
 */
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
