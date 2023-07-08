import { SimpleExpressionNode } from './ast'
import { TransformContext } from './transform'
import { createCompilerError, ErrorCodes } from './errors'

// these keywords should not appear inside expressions, but operators like
// 'typeof', 'instanceof', and 'in' are allowed
/**
 * `prohibitedKeywordRE` 是一个正则表达式，用于匹配JavaScript中的保留关键字（prohibited keywords）。这个正则表达式会匹配在JavaScript代码中出现的所有保留关键字，包括：

```
arguments, await, break, case, catch, class, const, continue, debugger, default,
delete, do, else, export, extends, finally, for, function, if, import, let, new,
return, super, switch, throw, try, var, void, while, with, yield
```

这些关键字在JavaScript中有特殊的含义，用于控制流程、声明变量、定义函数等。因此，它们不能用作标识符（如变量名、函数名）等命名上下文中的名称。

该正则表达式的目的是帮助识别代码中是否使用了保留关键字作为标识符，以便在需要的情况下进行处理或报错。例如，当使用其中一个保留关键字作为变量名时，编译器或工具可以发出警告或阻止使用，以确保代码的正确性和可维护性。
 */
const prohibitedKeywordRE = new RegExp(
  '\\b' +
    (
      'arguments,await,break,case,catch,class,const,continue,debugger,default,' +
      'delete,do,else,export,extends,finally,for,function,if,import,let,new,' +
      'return,super,switch,throw,try,var,void,while,with,yield'
    )
      .split(',')
      .join('\\b|\\b') +
    '\\b'
)

// strip strings in expressions
/**
 * `stripStringRE` 是一个正则表达式，用于匹配和移除字符串文字（string literals）中的内容。它可以用于从字符串文字中提取纯文本内容，去除引号和转义字符等。

该正则表达式的模式如下：

```regex
/'(?:[^'\\]|\\.)*'         # 单引号括起的字符串文字
 | "(?:[^"\\]|\\.)*"       # 双引号括起的字符串文字
 | `(?:[^`\\]|\\.)*\$\{    # 模板字符串中的开头部分（`${`之前的内容）
 | \}(?:[^`\\]|\\.)*`      # 模板字符串中的结尾部分（`}`之后的内容）
 | `(?:[^`\\]|\\.)*`       # 反引号括起的模板字符串
/g
```

这个正则表达式的作用是通过匹配字符串文字的各种形式来移除它们的内容。在字符串文字中，可能包含引号、转义字符以及模板字符串的插值部分。通过匹配这些模式，我们可以将它们从字符串中提取出来或移除它们的内容，以获得纯文本的字符串内容。

这个正则表达式通常用于编译器、解析器或其他文本处理工具中，用于处理字符串文字的相关逻辑，例如提取模板字符串的插值部分、转义字符的处理等。
 */
const stripStringRE =
  /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g

/**
 * Validate a non-prefixed expression.
 * This is only called when using the in-browser runtime compiler since it
 * doesn't prefix expressions.
 * `validateBrowserExpression` 是一个用于验证浏览器表达式（browser expression）的函数。它接收一个简单表达式节点 `node` 和一个转换上下文 `context` 作为参数，还可以选择性地指定 `asParams` 和 `asRawStatements` 参数。

函数的主要逻辑如下：

1. 首先，获取简单表达式的内容 `exp`。

2. 如果表达式为空，即没有内容或只包含空格，则返回，因为一些指令允许空表达式。

3. 尝试将表达式内容作为函数体创建一个新的 JavaScript 函数。在这里，根据 `asRawStatements` 和 `asParams` 参数的不同，会构建不同形式的函数体。

4. 如果表达式无法成功创建为函数，说明表达式存在语法错误或不合法。此时会捕获异常，并根据异常信息进行处理。

5. 如果异常信息中包含 JavaScript 的关键字（如保留字），通过正则匹配将关键字提取出来。

6. 如果存在关键字匹配结果，则将错误信息更新为避免使用 JavaScript 关键字作为属性名的提示。

7. 最后，使用 `context.onError` 方法生成一个编译错误，并传入错误码、节点位置、相关信息和错误消息。

该函数主要用于编译器或转换器的过程中，验证浏览器表达式的合法性。它会检查表达式的语法，并在发现不合法的情况下生成编译错误，以便开发者能够及时发现并修复问题。
 */
export function validateBrowserExpression(
  node: SimpleExpressionNode,
  context: TransformContext,
  asParams = false,
  asRawStatements = false
) {
  const exp = node.content

  // empty expressions are validated per-directive since some directives
  // do allow empty expressions.
  if (!exp.trim()) {
    return
  }

  try {
    new Function(
      asRawStatements
        ? ` ${exp} `
        : `return ${asParams ? `(${exp}) => {}` : `(${exp})`}`
    )
  } catch (e: any) {
    let message = e.message
    const keywordMatch = exp
      .replace(stripStringRE, '')
      .match(prohibitedKeywordRE)
    if (keywordMatch) {
      message = `avoid using JavaScript keyword as property name: "${keywordMatch[0]}"`
    }
    context.onError(
      createCompilerError(
        ErrorCodes.X_INVALID_EXPRESSION,
        node.loc,
        undefined,
        message
      )
    )
  }
}
