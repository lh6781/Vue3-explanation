const escapeRE = /["'&<>]/
/**
 * 
 * 
这段代码定义了一个名为escapeHtml的函数，用于将字符串中的特殊字符进行 HTML 转义。

代码中使用了一个正则表达式escapeRE来匹配需要转义的特殊字符：["'&<>]，即双引号、单引号、&符号、小于号和大于号。

函数接受一个参数string，表示要进行转义的字符串。

函数的逻辑如下：

首先，将参数string转换为字符串类型，并保存在变量str中。
使用正则表达式escapeRE对str进行匹配，查找是否存在需要转义的特殊字符。将匹配结果保存在变量match中。
如果没有匹配到特殊字符，则直接返回原始的字符串str，无需进行转义。
如果匹配到特殊字符，继续执行后续的转义逻辑。
初始化变量html，用于保存转义后的字符串。
使用循环遍历字符串str，从匹配到的特殊字符的位置开始。
根据当前字符的 ASCII 码值，判断特殊字符的类型，然后将其替换为对应的转义字符串。
如果当前字符的位置不等于上一个特殊字符的位置，则将其之前的普通字符部分追加到html中。
更新上一个特殊字符的位置为当前位置加1，即lastIndex = index + 1。
将转义后的字符串追加到html中。
循环结束后，检查是否还有未处理的普通字符，如果有，则将其追加到html的末尾。
返回最终的转义结果字符串html。
 */
export function escapeHtml(string: unknown) {
  const str = '' + string
  const match = escapeRE.exec(str)

  if (!match) {
    return str
  }

  let html = ''
  let escaped: string
  let index: number
  let lastIndex = 0
  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escaped = '&quot;'
        break
      case 38: // &
        escaped = '&amp;'
        break
      case 39: // '
        escaped = '&#39;'
        break
      case 60: // <
        escaped = '&lt;'
        break
      case 62: // >
        escaped = '&gt;'
        break
      default:
        continue
    }

    if (lastIndex !== index) {
      html += str.slice(lastIndex, index)
    }

    lastIndex = index + 1
    html += escaped
  }

  return lastIndex !== index ? html + str.slice(lastIndex, index) : html
}

// https://www.w3.org/TR/html52/syntax.html#comments

const commentStripRE = /^-?>|<!--|-->|--!>|<!-$/g
/**
 * 这段代码定义了一个名为escapeHtmlComment的函数，用于移除 HTML 注释中的内容。

代码中使用了一个正则表达式commentStripRE来匹配 HTML 注释的起始和结束标记，即^->、<!--、-->、--!>、<!-。并使用全局修饰符g表示匹配所有的注释。

函数接受一个参数src，表示要处理的字符串。

函数的逻辑如下：

使用src.replace(commentStripRE, '')的方式，将字符串src中匹配到的注释内容替换为空字符串，从而移除注释。
返回处理后的字符串作为结果。
总结起来，该函数的作用是从输入的字符串中移除 HTML 注释的内容，返回移除注释后的字符串。
 */
export function escapeHtmlComment(src: string): string {
  return src.replace(commentStripRE, '')
}
