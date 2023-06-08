/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * IMPORTANT: all calls of this function must be prefixed with
 * \/\*#\_\_PURE\_\_\*\/
 * So that rollup can tree-shake them if necessary.
 * 这段代码定义了一个名为makeMap的函数，它接收一个字符串参数str和一个可选的布尔类型参数expectsLowerCase。函数的作用是创建一个映射表，用于快速判断给定的键是否存在于该映射表中。

函数内部首先创建了一个空对象map作为映射表，然后将字符串str通过逗号分隔转换成数组list。接下来，使用一个for循环遍历list数组，将数组中的每个元素作为键，并将其对应的值设置为true，即将其添加到映射表map中。

最后，函数根据expectsLowerCase参数的值返回一个函数。如果expectsLowerCase为true，则返回一个函数，该函数将给定的键转换为小写后再在映射表中进行查找，返回对应键的布尔值。如果expectsLowerCase为false或未提供，返回的函数直接在映射表中查找给定的键，并返回对应键的布尔值。

简而言之，makeMap函数用于创建一个映射表，提供一种高效的方式来检查给定的键是否存在于该映射表中。
 */
export function makeMap(
  str: string,
  expectsLowerCase?: boolean
): (key: string) => boolean {
  const map: Record<string, boolean> = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val]
}
// const fruits = makeMap('apple,banana,orange', true);
// console.log(fruits('apple')); // true
// console.log(fruits('pear')); // false
// console.log(fruits('Banana')); // true
