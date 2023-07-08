import { ParserOptions } from '@vue/compiler-core'
import namedCharacterReferences from './namedChars.json'

// lazy compute this to make this file tree-shakable for browser
/**
 * `maxCRNameLength` 是一个变量，它声明了一个名为 `maxCRNameLength` 的变量，并将其类型注解为 `number`。类型注解指示该变量应该存储数字类型的值。

请注意，变量声明时没有给出初始值，因此变量的初始值将为 `undefined`。如果需要将其初始化为特定的值，可以在声明后使用赋值操作符进行赋值，例如：

```typescript
let maxCRNameLength: number = 10;
```

这将将 `maxCRNameLength` 初始化为 `10`。
 */
let maxCRNameLength: number
/**
 * 
 * @param rawText 
 * @param asAttr 
 * @returns 
 * 这段代码导出了一个名为 `decodeHtml` 的函数。该函数接受两个参数 `rawText` 和 `asAttr`，并返回解码后的文本。

函数中使用了循环来遍历 `rawText` 中的每个字符，并根据 HTML 实体引用的格式进行解码。在解码过程中，会根据不同的情况进行处理，包括命名字符引用和数字字符引用。

函数内部定义了一些辅助函数和变量，如 `advance` 函数用于更新偏移量和切割原始文本，`decodedText` 用于存储解码后的文本。在处理命名字符引用时，会根据命名字符引用的长度动态查找对应的字符值，并将解码后的字符值追加到 `decodedText` 中。在处理数字字符引用时，会根据不同的情况进行处理，最终将解码后的字符值追加到 `decodedText` 中。

最后，函数返回解码后的文本。

请注意，代码中使用了一些未定义的变量和常量，如 `maxCRNameLength` 和 `namedCharacterReferences`。如果需要正确运行该函数，需要提供这些变量和常量的定义和赋值。
 */
export const decodeHtml: ParserOptions['decodeEntities'] = (
  rawText,
  asAttr
) => {
  let offset = 0
  const end = rawText.length
  let decodedText = ''

  function advance(length: number) {
    offset += length
    rawText = rawText.slice(length)
  }

  while (offset < end) {
    const head = /&(?:#x?)?/i.exec(rawText)
    if (!head || offset + head.index >= end) {
      const remaining = end - offset
      decodedText += rawText.slice(0, remaining)
      advance(remaining)
      break
    }

    // Advance to the "&".
    decodedText += rawText.slice(0, head.index)
    advance(head.index)

    if (head[0] === '&') {
      // Named character reference.
      let name = ''
      let value: string | undefined = undefined
      if (/[0-9a-z]/i.test(rawText[1])) {
        if (!maxCRNameLength) {
          maxCRNameLength = Object.keys(namedCharacterReferences).reduce(
            (max, name) => Math.max(max, name.length),
            0
          )
        }
        for (let length = maxCRNameLength; !value && length > 0; --length) {
          name = rawText.slice(1, 1 + length)
          value = (namedCharacterReferences as Record<string, string>)[name]
        }
        if (value) {
          const semi = name.endsWith(';')
          if (
            asAttr &&
            !semi &&
            /[=a-z0-9]/i.test(rawText[name.length + 1] || '')
          ) {
            decodedText += '&' + name
            advance(1 + name.length)
          } else {
            decodedText += value
            advance(1 + name.length)
          }
        } else {
          decodedText += '&' + name
          advance(1 + name.length)
        }
      } else {
        decodedText += '&'
        advance(1)
      }
    } else {
      // Numeric character reference.
      const hex = head[0] === '&#x'
      const pattern = hex ? /^&#x([0-9a-f]+);?/i : /^&#([0-9]+);?/
      const body = pattern.exec(rawText)
      if (!body) {
        decodedText += head[0]
        advance(head[0].length)
      } else {
        // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
        let cp = Number.parseInt(body[1], hex ? 16 : 10)
        if (cp === 0) {
          cp = 0xfffd
        } else if (cp > 0x10ffff) {
          cp = 0xfffd
        } else if (cp >= 0xd800 && cp <= 0xdfff) {
          cp = 0xfffd
        } else if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) {
          // noop
        } else if (
          (cp >= 0x01 && cp <= 0x08) ||
          cp === 0x0b ||
          (cp >= 0x0d && cp <= 0x1f) ||
          (cp >= 0x7f && cp <= 0x9f)
        ) {
          cp = CCR_REPLACEMENTS[cp] || cp
        }
        decodedText += String.fromCodePoint(cp)
        advance(body[0].length)
      }
    }
  }
  return decodedText
}

// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
/**
 * 这段代码定义了一个名为 `CCR_REPLACEMENTS` 的常量，它是一个记录类型的对象。该对象存储了一些 Unicode 码点与替换值之间的映射关系。

每个键值对表示一个字符的替换关系，其中键是 Unicode 码点，值是对应的替换字符的 Unicode 码点。如果某个键没有对应的值，则值为 `undefined`。

这些替换关系用于处理特殊的控制字符和非法字符，将它们替换为合适的字符，以确保解码后的文本是有效的。

请注意，这段代码只提供了 `CCR_REPLACEMENTS` 的定义，但没有被其他代码使用。如果需要使用该常量，需要将其与其他相关的代码进行结合使用。
 */
const CCR_REPLACEMENTS: Record<number, number | undefined> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178
}
