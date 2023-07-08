/* eslint-disable no-restricted-globals */
/**
 * 这段代码声明了一个变量 `decoder`，类型为 `HTMLDivElement`。`HTMLDivElement` 是 HTML DOM 中的一种元素类型，表示 `<div>` 元素。

这个变量 `decoder` 可以用于引用或操作一个 `<div>` 元素。你可以通过这个变量来获取该元素的属性、样式或进行其他操作。

需要注意的是，这段代码只声明了 `decoder` 变量，并没有对它进行初始化或赋值。如果要使用 `decoder` 变量，需要在后续的代码中为它赋予实际的元素对象。
 */
let decoder: HTMLDivElement
/**
 * 
 * @param raw 
 * @param asAttr 
 * @returns 
 * 这是一个用于在浏览器中解码 HTML 的函数 `decodeHtmlBrowser`。该函数接受一个原始的 HTML 字符串 `raw`，以及一个可选的参数 `asAttr`，默认为 `false`。

函数首先检查变量 `decoder` 是否已经存在，如果不存在，则创建一个 `div` 元素，并将其赋值给 `decoder` 变量。这个 `div` 元素将用于解码 HTML。

如果 `asAttr` 参数为 `true`，则函数将将 `raw` 字符串作为属性值进行解码。具体操作是将 `raw` 字符串嵌入到一个带有属性的 `div` 元素中，并通过 `getAttribute` 方法获取该属性值。解码后的属性值将作为字符串返回。

如果 `asAttr` 参数为 `false`，则函数将直接将 `raw` 字符串解码为纯文本内容。具体操作是将 `raw` 字符串赋值给 `decoder` 元素的 `innerHTML` 属性，然后通过 `textContent` 属性获取解码后的纯文本内容，并作为字符串返回。

需要注意的是，该函数假设在浏览器环境中执行，并且依赖全局的 `document` 对象来创建和操作 DOM 元素。
 */
export function decodeHtmlBrowser(raw: string, asAttr = false): string {
  if (!decoder) {
    decoder = document.createElement('div')
  }
  if (asAttr) {
    decoder.innerHTML = `<div foo="${raw.replace(/"/g, '&quot;')}">`
    return decoder.children[0].getAttribute('foo') as string
  } else {
    decoder.innerHTML = raw
    return decoder.textContent as string
  }
}
