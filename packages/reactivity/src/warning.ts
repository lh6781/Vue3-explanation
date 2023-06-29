/**
 * 
 * @param msg 
 * @param args
 * `warn` 函数用于在控制台显示警告信息。它接受一个字符串作为第一个参数，以及可选的额外参数，这些额外参数可以使用模板字符串 (`${...}`) 插入到警告信息中。警告信息以 `[Vue warn]` 作为前缀，表示这是一个特定于 Vue 的警告。

以下是一个示例用法：

```typescript
warn('发生了错误', error)
```

这将在控制台中显示以下消息：

```
[Vue warn] 发生了错误 Error: ...
```

额外的参数 (`...args`) 可以是任何你想在警告消息中包含的值，用于调试或提供更多信息。 
 */
export function warn(msg: string, ...args: any[]) {
  console.warn(`[Vue warn] ${msg}`, ...args)
}
