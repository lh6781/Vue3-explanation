export const FRAGMENT = Symbol(__DEV__ ? `Fragment` : ``)
export const TELEPORT = Symbol(__DEV__ ? `Teleport` : ``)
export const SUSPENSE = Symbol(__DEV__ ? `Suspense` : ``)
export const KEEP_ALIVE = Symbol(__DEV__ ? `KeepAlive` : ``)
export const BASE_TRANSITION = Symbol(__DEV__ ? `BaseTransition` : ``)
export const OPEN_BLOCK = Symbol(__DEV__ ? `openBlock` : ``)
export const CREATE_BLOCK = Symbol(__DEV__ ? `createBlock` : ``)
export const CREATE_ELEMENT_BLOCK = Symbol(__DEV__ ? `createElementBlock` : ``)
export const CREATE_VNODE = Symbol(__DEV__ ? `createVNode` : ``)
export const CREATE_ELEMENT_VNODE = Symbol(__DEV__ ? `createElementVNode` : ``)
export const CREATE_COMMENT = Symbol(__DEV__ ? `createCommentVNode` : ``)
export const CREATE_TEXT = Symbol(__DEV__ ? `createTextVNode` : ``)
export const CREATE_STATIC = Symbol(__DEV__ ? `createStaticVNode` : ``)
export const RESOLVE_COMPONENT = Symbol(__DEV__ ? `resolveComponent` : ``)
export const RESOLVE_DYNAMIC_COMPONENT = Symbol(
  __DEV__ ? `resolveDynamicComponent` : ``
)
export const RESOLVE_DIRECTIVE = Symbol(__DEV__ ? `resolveDirective` : ``)
export const RESOLVE_FILTER = Symbol(__DEV__ ? `resolveFilter` : ``)
export const WITH_DIRECTIVES = Symbol(__DEV__ ? `withDirectives` : ``)
export const RENDER_LIST = Symbol(__DEV__ ? `renderList` : ``)
export const RENDER_SLOT = Symbol(__DEV__ ? `renderSlot` : ``)
export const CREATE_SLOTS = Symbol(__DEV__ ? `createSlots` : ``)
export const TO_DISPLAY_STRING = Symbol(__DEV__ ? `toDisplayString` : ``)
export const MERGE_PROPS = Symbol(__DEV__ ? `mergeProps` : ``)
export const NORMALIZE_CLASS = Symbol(__DEV__ ? `normalizeClass` : ``)
export const NORMALIZE_STYLE = Symbol(__DEV__ ? `normalizeStyle` : ``)
export const NORMALIZE_PROPS = Symbol(__DEV__ ? `normalizeProps` : ``)
export const GUARD_REACTIVE_PROPS = Symbol(__DEV__ ? `guardReactiveProps` : ``)
export const TO_HANDLERS = Symbol(__DEV__ ? `toHandlers` : ``)
export const CAMELIZE = Symbol(__DEV__ ? `camelize` : ``)
export const CAPITALIZE = Symbol(__DEV__ ? `capitalize` : ``)
export const TO_HANDLER_KEY = Symbol(__DEV__ ? `toHandlerKey` : ``)
export const SET_BLOCK_TRACKING = Symbol(__DEV__ ? `setBlockTracking` : ``)
export const PUSH_SCOPE_ID = Symbol(__DEV__ ? `pushScopeId` : ``)
export const POP_SCOPE_ID = Symbol(__DEV__ ? `popScopeId` : ``)
export const WITH_CTX = Symbol(__DEV__ ? `withCtx` : ``)
export const UNREF = Symbol(__DEV__ ? `unref` : ``)
export const IS_REF = Symbol(__DEV__ ? `isRef` : ``)
export const WITH_MEMO = Symbol(__DEV__ ? `withMemo` : ``)
export const IS_MEMO_SAME = Symbol(__DEV__ ? `isMemoSame` : ``)

// Name mapping for runtime helpers that need to be imported from 'vue' in
// generated code. Make sure these are correctly exported in the runtime!
/**
 * `helperNameMap` 是一个导出的常量，它是一个由符号（symbol）作为键和字符串作为值的记录（Record）。该记录用于将符号映射到相应的助手函数名称。

助手函数在编译过程中用于生成特定的代码片段或执行特定的操作。每个助手函数都有一个唯一的符号作为标识，而对应的字符串值则是该助手函数的名称。

以下是 `helperNameMap` 中一些常见助手函数及其对应的名称：

- `FRAGMENT`: `Fragment`，用于创建片段（Fragment）。
- `TELEPORT`: `Teleport`，用于传送（Teleport）组件。
- `SUSPENSE`: `Suspense`，用于悬挂（Suspense）组件。
- `KEEP_ALIVE`: `KeepAlive`，用于缓存（KeepAlive）组件。
- `CREATE_VNODE`: `createVNode`，用于创建虚拟节点（VNode）。
- `CREATE_ELEMENT_VNODE`: `createElementVNode`，用于创建元素节点的虚拟节点。
- `CREATE_COMMENT`: `createCommentVNode`，用于创建注释节点的虚拟节点。
- `CREATE_TEXT`: `createTextVNode`，用于创建文本节点的虚拟节点。
- `RENDER_LIST`: `renderList`，用于渲染列表。
- `RENDER_SLOT`: `renderSlot`，用于渲染插槽。
- `MERGE_PROPS`: `mergeProps`，用于合并属性。
- `TO_DISPLAY_STRING`: `toDisplayString`，用于将值转换为显示字符串。
- `NORMALIZE_CLASS`: `normalizeClass`，用于规范化类名。
- `NORMALIZE_STYLE`: `normalizeStyle`，用于规范化样式。
- `UNREF`: `unref`，用于获取响应式数据的非响应式副本。
- `IS_REF`: `isRef`，用于检查一个值是否为响应式引用。
- 等等。

通过使用 `helperNameMap`，可以根据给定的符号查找相应的助手函数名称，以便在编译过程中使用正确的助手函数。
 */
export const helperNameMap: Record<symbol, string> = {
  [FRAGMENT]: `Fragment`,
  [TELEPORT]: `Teleport`,
  [SUSPENSE]: `Suspense`,
  [KEEP_ALIVE]: `KeepAlive`,
  [BASE_TRANSITION]: `BaseTransition`,
  [OPEN_BLOCK]: `openBlock`,
  [CREATE_BLOCK]: `createBlock`,
  [CREATE_ELEMENT_BLOCK]: `createElementBlock`,
  [CREATE_VNODE]: `createVNode`,
  [CREATE_ELEMENT_VNODE]: `createElementVNode`,
  [CREATE_COMMENT]: `createCommentVNode`,
  [CREATE_TEXT]: `createTextVNode`,
  [CREATE_STATIC]: `createStaticVNode`,
  [RESOLVE_COMPONENT]: `resolveComponent`,
  [RESOLVE_DYNAMIC_COMPONENT]: `resolveDynamicComponent`,
  [RESOLVE_DIRECTIVE]: `resolveDirective`,
  [RESOLVE_FILTER]: `resolveFilter`,
  [WITH_DIRECTIVES]: `withDirectives`,
  [RENDER_LIST]: `renderList`,
  [RENDER_SLOT]: `renderSlot`,
  [CREATE_SLOTS]: `createSlots`,
  [TO_DISPLAY_STRING]: `toDisplayString`,
  [MERGE_PROPS]: `mergeProps`,
  [NORMALIZE_CLASS]: `normalizeClass`,
  [NORMALIZE_STYLE]: `normalizeStyle`,
  [NORMALIZE_PROPS]: `normalizeProps`,
  [GUARD_REACTIVE_PROPS]: `guardReactiveProps`,
  [TO_HANDLERS]: `toHandlers`,
  [CAMELIZE]: `camelize`,
  [CAPITALIZE]: `capitalize`,
  [TO_HANDLER_KEY]: `toHandlerKey`,
  [SET_BLOCK_TRACKING]: `setBlockTracking`,
  [PUSH_SCOPE_ID]: `pushScopeId`,
  [POP_SCOPE_ID]: `popScopeId`,
  [WITH_CTX]: `withCtx`,
  [UNREF]: `unref`,
  [IS_REF]: `isRef`,
  [WITH_MEMO]: `withMemo`,
  [IS_MEMO_SAME]: `isMemoSame`
}
/**
 * 
 * @param helpers 
 * `registerRuntimeHelpers` 是一个导出的函数，用于注册运行时助手函数。

该函数接受一个包含符号和字符串键值对的对象 `helpers`，其中符号作为键，字符串作为值，表示要注册的助手函数及其对应的名称。

函数内部通过使用 `Object.getOwnPropertySymbols` 获取 `helpers` 对象中的符号键，然后遍历每个符号键，将其对应的值赋给 `helperNameMap` 中相应的键。这样就更新了 `helperNameMap` 中的助手函数名称，以便后续在编译过程中使用正确的助手函数名称。

通过调用 `registerRuntimeHelpers`，可以将自定义的运行时助手函数注册到 `helperNameMap` 中，以便在编译过程中使用这些助手函数。
 */
export function registerRuntimeHelpers(helpers: Record<symbol, string>) {
  Object.getOwnPropertySymbols(helpers).forEach(s => {
    helperNameMap[s] = helpers[s]
  })
}
