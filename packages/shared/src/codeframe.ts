const range: number = 2
/**
 * 
 * 这段代码定义了一个名为generateCodeFrame的函数，用于生成带有代码框架和高亮标记的源代码片段。

函数的参数如下：

source：源代码字符串。
start：要高亮显示的代码片段的起始位置。默认为0，表示从源代码的开头开始。
end：要高亮显示的代码片段的结束位置。默认为源代码的长度，表示到源代码的末尾。
函数的实现逻辑如下：

首先，将源代码字符串按照换行符拆分成行数组，并将换行符序列保存在newlineSequences数组中。这样做是为了后续能够正确计算每行代码的长度，包括换行符的长度。
然后，定义一个变量count来记录已经处理的字符数，初始化为0。
定义一个空数组res，用于存储生成的代码框架和高亮标记。
使用一个for循环遍历每一行代码。
在循环中，先计算当前行的字符数和换行符序列长度之和，并将结果累加到count中。这样可以得到当前行的结束位置。
检查是否已经到达或超过了要高亮显示的代码片段的起始位置。如果是，则开始生成代码框架和高亮标记。
使用另一个for循环，从当前行向上下范围内遍历行数。范围由range确定。
在内部循环中，首先检查行数j是否超出了有效范围（小于0或大于等于行数组的长度），如果是，则继续下一次循环。
计算当前行的行号line，即j + 1。
将当前行的行号、适当的空格填充、竖线和代码内容拼接成一行字符串，并将其添加到res数组中。
获取当前行的长度lineLength和换行符序列的长度newLineSeqLength。
如果当前行是要高亮显示的代码片段所在的行（即j等于i），则生成高亮标记的下划线部分。
首先计算高亮标记前面需要填充的空格数pad，即start - (count - (lineLength + newLineSeqLength))。
计算高亮标记的长度length，取最大值为1和end > count ? lineLength - pad : end - start。
将高亮标记的行添加到res数组中，包括适当的空格填充和重复的^字符。
如果当前行在要高亮显示的代码片段之后（即j大于i），则生成高亮标记的行。
 */
export function generateCodeFrame(
  source: string,
  start = 0,
  end = source.length
): string {
  // Split the content into individual lines but capture the newline sequence
  // that separated each line. This is important because the actual sequence is
  // needed to properly take into account the full line length for offset
  // comparison
  let lines = source.split(/(\r?\n)/)

  // Separate the lines and newline sequences into separate arrays for easier referencing
  const newlineSequences = lines.filter((_, idx) => idx % 2 === 1)
  lines = lines.filter((_, idx) => idx % 2 === 0)

  let count = 0
  const res: string[] = []
  for (let i = 0; i < lines.length; i++) {
    count +=
      lines[i].length +
      ((newlineSequences[i] && newlineSequences[i].length) || 0)
    if (count >= start) {
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        const line = j + 1
        res.push(
          `${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${
            lines[j]
          }`
        )
        const lineLength = lines[j].length
        const newLineSeqLength =
          (newlineSequences[j] && newlineSequences[j].length) || 0

        if (j === i) {
          // push underline
          const pad = start - (count - (lineLength + newLineSeqLength))
          const length = Math.max(
            1,
            end > count ? lineLength - pad : end - start
          )
          res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length))
        } else if (j > i) {
          if (end > count) {
            const length = Math.max(Math.min(end - count, lineLength), 1)
            res.push(`   |  ` + '^'.repeat(length))
          }

          count += lineLength + newLineSeqLength
        }
      }
      break
    }
  }
  return res.join('\n')
}
