import {
  createStructuralDirectiveTransform,
  TransformContext,
  traverseNode
} from '../transform'
import {
  NodeTypes,
  ElementTypes,
  ElementNode,
  DirectiveNode,
  IfBranchNode,
  SimpleExpressionNode,
  createCallExpression,
  createConditionalExpression,
  createSimpleExpression,
  createObjectProperty,
  createObjectExpression,
  IfConditionalExpression,
  BlockCodegenNode,
  IfNode,
  createVNodeCall,
  AttributeNode,
  locStub,
  CacheExpression,
  ConstantTypes,
  MemoExpression,
  convertToBlock
} from '../ast'
import { createCompilerError, ErrorCodes } from '../errors'
import { processExpression } from './transformExpression'
import { validateBrowserExpression } from '../validateExpression'
import { FRAGMENT, CREATE_COMMENT } from '../runtimeHelpers'
import {
  injectProp,
  findDir,
  findProp,
  isBuiltInType,
  getMemoedVNodeCall
} from '../utils'
import { PatchFlags, PatchFlagNames } from '@vue/shared'
/**
 * 该代码片段导出了一个名为 `transformIf` 的函数，用于处理 `v-if`、`v-else` 和 `v-else-if` 结构指令。

函数签名如下：

```typescript
const transformIf: NodeTransform
```

参数：
- `node`: 当前节点。
- `dir`: 指令节点。
- `context`: 转换上下文。

返回值：
- 一个函数，该函数在处理完 `v-if`、`v-else` 和 `v-else-if` 的条件分支后会被调用。

函数的具体实现逻辑如下：
1. 调用 `processIf` 函数处理 `v-if`、`v-else` 和 `v-else-if` 的条件分支。
2. 在处理完条件分支后，返回一个函数作为退出回调。
3. 在退出回调中，根据条件分支的类型和位置，更新 `codegenNode`。
   - 如果是根节点（即 `v-if`），则调用 `createCodegenNodeForBranch` 创建一个 `IfConditionalExpression` 类型的 `codegenNode`。
   - 如果是子节点（即 `v-else` 或 `v-else-if`），则将该分支的 `codegenNode` 作为 `alternate` 节点附加到其父节点的 `codegenNode` 上。

总体而言，`transformIf` 函数的作用是处理 `v-if`、`v-else` 和 `v-else-if` 结构指令，并在转换过程中更新节点的 `codegenNode`。
 */
export const transformIf = createStructuralDirectiveTransform(
  /^(if|else|else-if)$/,
  (node, dir, context) => {
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
      // #1587: We need to dynamically increment the key based on the current
      // node's sibling nodes, since chained v-if/else branches are
      // rendered at the same depth
      const siblings = context.parent!.children
      let i = siblings.indexOf(ifNode)
      let key = 0
      while (i-- >= 0) {
        const sibling = siblings[i]
        if (sibling && sibling.type === NodeTypes.IF) {
          key += sibling.branches.length
        }
      }

      // Exit callback. Complete the codegenNode when all children have been
      // transformed.
      return () => {
        if (isRoot) {
          ifNode.codegenNode = createCodegenNodeForBranch(
            branch,
            key,
            context
          ) as IfConditionalExpression
        } else {
          // attach this branch's codegen node to the v-if root.
          const parentCondition = getParentCondition(ifNode.codegenNode!)
          parentCondition.alternate = createCodegenNodeForBranch(
            branch,
            key + ifNode.branches.length - 1,
            context
          )
        }
      }
    })
  }
)

// target-agnostic transform used for both Client and SSR
/**
 * 
 * @param node 
 * @param dir 
 * @param context 
 * @param processCodegen 
 * @returns 
 * 该代码片段定义了 `processIf` 函数，用于处理 `v-if`、`v-else` 和 `v-else-if` 结构指令。

函数签名如下：

```typescript
function processIf(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext,
  processCodegen?: (
    node: IfNode,
    branch: IfBranchNode,
    isRoot: boolean
  ) => (() => void) | undefined
): void | (() => void)
```

参数：
- `node`: 当前节点。
- `dir`: 指令节点。
- `context`: 转换上下文。
- `processCodegen`: 可选参数，用于在处理完条件分支后执行代码生成的回调函数。

函数的具体实现逻辑如下：
1. 检查指令名称是否为 `'else'`，以及表达式是否存在且不为空。如果不满足条件，报告编译错误，并将表达式设置为 `true`。
2. 如果非浏览器环境且启用了前缀标识符功能，对指令的表达式进行表达式转换。
3. 如果是开发环境且在浏览器中，验证浏览器表达式。
4. 如果指令名称为 `'if'`：
   - 创建一个 `IfBranchNode`，表示 `v-if` 的条件分支。
   - 创建一个 `IfNode`，表示整个 `v-if` 结构。
   - 用新创建的 `IfNode` 替换当前节点。
   - 如果提供了 `processCodegen` 回调函数，则调用该函数并传递 `IfNode`、`IfBranchNode` 和 `true`（表示根节点）。
5. 如果指令名称不是 `'if'`：
   - 定位相邻的 `v-if` 节点。
   - 移除当前节点。
   - 创建一个 `IfBranchNode`，表示 `v-else` 或 `v-else-if` 的条件分支。
   - 如果存在注释节点，则将注释节点添加到条件分支的子节点中。
   - 检查用户是否在不同分支上强制使用相同的键值（仅限开发环境和非浏览器环境）。
   - 将条件分支添加到相邻 `v-if` 节点的分支列表中。
   - 如果提供了 `processCodegen` 回调函数，则调用该函数并传递相邻的 `v-if` 节点、条件分支和 `false`（表示子节点）。
   - 遍历条件分支的节点。
   - 调用退出回调函数（如果存在）。
   - 将当前节点设置为 `null`，表示已删除该节点。

总体而言，`processIf` 函数用于处理 `v-if`、`v-else` 和 `v-else-if` 结构指令，并在转换过程中更新节点和分支的数据结构。
 */
export function processIf(
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext,
  processCodegen?: (
    node: IfNode,
    branch: IfBranchNode,
    isRoot: boolean
  ) => (() => void) | undefined
) {
  if (
    dir.name !== 'else' &&
    (!dir.exp || !(dir.exp as SimpleExpressionNode).content.trim())
  ) {
    const loc = dir.exp ? dir.exp.loc : node.loc
    context.onError(
      createCompilerError(ErrorCodes.X_V_IF_NO_EXPRESSION, dir.loc)
    )
    dir.exp = createSimpleExpression(`true`, false, loc)
  }

  if (!__BROWSER__ && context.prefixIdentifiers && dir.exp) {
    // dir.exp can only be simple expression because vIf transform is applied
    // before expression transform.
    dir.exp = processExpression(dir.exp as SimpleExpressionNode, context)
  }

  if (__DEV__ && __BROWSER__ && dir.exp) {
    validateBrowserExpression(dir.exp as SimpleExpressionNode, context)
  }

  if (dir.name === 'if') {
    const branch = createIfBranch(node, dir)
    const ifNode: IfNode = {
      type: NodeTypes.IF,
      loc: node.loc,
      branches: [branch]
    }
    context.replaceNode(ifNode)
    if (processCodegen) {
      return processCodegen(ifNode, branch, true)
    }
  } else {
    // locate the adjacent v-if
    const siblings = context.parent!.children
    const comments = []
    let i = siblings.indexOf(node)
    while (i-- >= -1) {
      const sibling = siblings[i]
      if (sibling && sibling.type === NodeTypes.COMMENT) {
        context.removeNode(sibling)
        __DEV__ && comments.unshift(sibling)
        continue
      }

      if (
        sibling &&
        sibling.type === NodeTypes.TEXT &&
        !sibling.content.trim().length
      ) {
        context.removeNode(sibling)
        continue
      }

      if (sibling && sibling.type === NodeTypes.IF) {
        // Check if v-else was followed by v-else-if
        if (
          dir.name === 'else-if' &&
          sibling.branches[sibling.branches.length - 1].condition === undefined
        ) {
          context.onError(
            createCompilerError(ErrorCodes.X_V_ELSE_NO_ADJACENT_IF, node.loc)
          )
        }

        // move the node to the if node's branches
        context.removeNode()
        const branch = createIfBranch(node, dir)
        if (
          __DEV__ &&
          comments.length &&
          // #3619 ignore comments if the v-if is direct child of <transition>
          !(
            context.parent &&
            context.parent.type === NodeTypes.ELEMENT &&
            isBuiltInType(context.parent.tag, 'transition')
          )
        ) {
          branch.children = [...comments, ...branch.children]
        }

        // check if user is forcing same key on different branches
        if (__DEV__ || !__BROWSER__) {
          const key = branch.userKey
          if (key) {
            sibling.branches.forEach(({ userKey }) => {
              if (isSameKey(userKey, key)) {
                context.onError(
                  createCompilerError(
                    ErrorCodes.X_V_IF_SAME_KEY,
                    branch.userKey!.loc
                  )
                )
              }
            })
          }
        }

        sibling.branches.push(branch)
        const onExit = processCodegen && processCodegen(sibling, branch, false)
        // since the branch was removed, it will not be traversed.
        // make sure to traverse here.
        traverseNode(branch, context)
        // call on exit
        if (onExit) onExit()
        // make sure to reset currentNode after traversal to indicate this
        // node has been removed.
        context.currentNode = null
      } else {
        context.onError(
          createCompilerError(ErrorCodes.X_V_ELSE_NO_ADJACENT_IF, node.loc)
        )
      }
      break
    }
  }
}
/**
 * 
 * @param node 
 * @param dir 
 * @returns 
 * 该代码片段定义了 `createIfBranch` 函数，用于创建 `v-if`、`v-else` 和 `v-else-if` 结构的条件分支节点。

函数签名如下：

```typescript
function createIfBranch(node: ElementNode, dir: DirectiveNode): IfBranchNode
```

参数：
- `node`: 当前节点。
- `dir`: 指令节点。

函数的具体实现逻辑如下：
1. 检查节点的标签类型是否为模板类型。
2. 创建一个 `IfBranchNode` 对象，表示条件分支。
3. 设置 `type` 字段为 `NodeTypes.IF_BRANCH`，表示该节点类型为条件分支。
4. 设置 `loc` 字段为节点的位置信息。
5. 如果指令名称为 `'else'`，则将 `condition` 字段设置为 `undefined`，否则将其设置为指令的表达式。
6. 如果节点是模板类型且没有包含 `v-for` 指令，则将 `children` 字段设置为节点的子节点，否则将其设置为单个元素节点的数组。
7. 使用 `findProp` 函数查找节点的 `key` 属性，并将其赋值给 `userKey` 字段。
8. 设置 `isTemplateIf` 字段为节点的标签类型是否为模板类型。

总体而言，`createIfBranch` 函数用于创建 `v-if`、`v-else` 和 `v-else-if` 结构的条件分支节点，并设置相应的字段值。
 */
function createIfBranch(node: ElementNode, dir: DirectiveNode): IfBranchNode {
  const isTemplateIf = node.tagType === ElementTypes.TEMPLATE
  return {
    type: NodeTypes.IF_BRANCH,
    loc: node.loc,
    condition: dir.name === 'else' ? undefined : dir.exp,
    children: isTemplateIf && !findDir(node, 'for') ? node.children : [node],
    userKey: findProp(node, `key`),
    isTemplateIf
  }
}
/**
 * 
 * @param branch 
 * @param keyIndex 
 * @param context 
 * @returns 
 * 该代码片段定义了 `createCodegenNodeForBranch` 函数，用于为条件分支创建相应的代码生成节点。

函数签名如下：

```typescript
function createCodegenNodeForBranch(
  branch: IfBranchNode,
  keyIndex: number,
  context: TransformContext
): IfConditionalExpression | BlockCodegenNode | MemoExpression
```

参数：
- `branch`: 条件分支节点。
- `keyIndex`: 分支的键索引。
- `context`: 转换上下文。

函数的具体实现逻辑如下：
1. 检查分支节点是否具有条件。
2. 如果有条件，创建一个 `IfConditionalExpression` 代码生成节点。
   - 使用 `createConditionalExpression` 函数创建条件表达式节点，其中：
     - `branch.condition` 作为条件表达式的条件。
     - 调用 `createChildrenCodegenNode` 函数创建分支节点的子节点代码生成节点。
     - 使用 `createCallExpression` 函数创建一个调用 `CREATE_COMMENT` 辅助函数的节点，作为条件表达式的 `alternate` 分支。
3. 如果没有条件，直接调用 `createChildrenCodegenNode` 函数创建分支节点的子节点代码生成节点。
4. 返回相应的代码生成节点。

总体而言，`createCodegenNodeForBranch` 函数根据条件分支的情况创建相应的代码生成节点，并返回生成的节点。如果条件分支有条件，则创建一个条件表达式节点，否则直接返回子节点的代码生成节点。
 */
function createCodegenNodeForBranch(
  branch: IfBranchNode,
  keyIndex: number,
  context: TransformContext
): IfConditionalExpression | BlockCodegenNode | MemoExpression {
  if (branch.condition) {
    return createConditionalExpression(
      branch.condition,
      createChildrenCodegenNode(branch, keyIndex, context),
      // make sure to pass in asBlock: true so that the comment node call
      // closes the current block.
      createCallExpression(context.helper(CREATE_COMMENT), [
        __DEV__ ? '"v-if"' : '""',
        'true'
      ])
    ) as IfConditionalExpression
  } else {
    return createChildrenCodegenNode(branch, keyIndex, context)
  }
}
/**
 * 
 * @param branch 
 * @param keyIndex 
 * @param context 
 * @returns 
 * 该代码片段定义了 `createChildrenCodegenNode` 函数，用于创建条件分支的子节点的代码生成节点。

函数签名如下：

```typescript
function createChildrenCodegenNode(
  branch: IfBranchNode,
  keyIndex: number,
  context: TransformContext
): BlockCodegenNode | MemoExpression
```

参数：
- `branch`: 条件分支节点。
- `keyIndex`: 分支的键索引。
- `context`: 转换上下文。

函数的具体实现逻辑如下：
1. 获取转换上下文中的 `helper` 函数。
2. 创建一个表示分支键的对象属性，该属性名为 `'key'`，属性值为对应的键索引的简单表达式。
3. 获取分支的子节点数组 `children` 和第一个子节点 `firstChild`。
4. 判断是否需要使用片段包装器：
   - 如果子节点数组长度不为1，或者第一个子节点的类型不是元素节点，则需要使用片段包装器。
5. 如果需要片段包装器：
   - 如果子节点数组长度为1，并且第一个子节点的类型是 `FOR`，则优化掉嵌套的片段，直接返回子节点的代码生成节点。
   - 否则，根据是否满足一定条件创建片段节点的代码生成节点。
     - 创建一个调用 `helper(FRAGMENT)` 的节点作为片段节点的类型。
     - 创建一个包含键属性的对象表达式。
     - 将子节点数组作为片段节点的子节点。
     - 设置相应的补丁标记。
     - 返回片段节点的代码生成节点。
6. 如果不需要片段包装器：
   - 获取第一个子节点的代码生成节点。
   - 如果代码生成节点类型为 `VNODE_CALL`，则将其转换为 `BLOCK`。
   - 将键属性注入到代码生成节点中。
   - 返回第一个子节点的代码生成节点。

总体而言，`createChildrenCodegenNode` 函数根据条件判断是否需要创建片段包装器，然后相应地创建片段节点或直接返回子节点的代码生成节点。最后将键属性注入到代码生成节点中并返回生成的节点。
 */
function createChildrenCodegenNode(
  branch: IfBranchNode,
  keyIndex: number,
  context: TransformContext
): BlockCodegenNode | MemoExpression {
  const { helper } = context
  const keyProperty = createObjectProperty(
    `key`,
    createSimpleExpression(
      `${keyIndex}`,
      false,
      locStub,
      ConstantTypes.CAN_HOIST
    )
  )
  const { children } = branch
  const firstChild = children[0]
  const needFragmentWrapper =
    children.length !== 1 || firstChild.type !== NodeTypes.ELEMENT
  if (needFragmentWrapper) {
    if (children.length === 1 && firstChild.type === NodeTypes.FOR) {
      // optimize away nested fragments when child is a ForNode
      const vnodeCall = firstChild.codegenNode!
      injectProp(vnodeCall, keyProperty, context)
      return vnodeCall
    } else {
      let patchFlag = PatchFlags.STABLE_FRAGMENT
      let patchFlagText = PatchFlagNames[PatchFlags.STABLE_FRAGMENT]
      // check if the fragment actually contains a single valid child with
      // the rest being comments
      if (
        __DEV__ &&
        !branch.isTemplateIf &&
        children.filter(c => c.type !== NodeTypes.COMMENT).length === 1
      ) {
        patchFlag |= PatchFlags.DEV_ROOT_FRAGMENT
        patchFlagText += `, ${PatchFlagNames[PatchFlags.DEV_ROOT_FRAGMENT]}`
      }

      return createVNodeCall(
        context,
        helper(FRAGMENT),
        createObjectExpression([keyProperty]),
        children,
        patchFlag + (__DEV__ ? ` /* ${patchFlagText} */` : ``),
        undefined,
        undefined,
        true,
        false,
        false /* isComponent */,
        branch.loc
      )
    }
  } else {
    const ret = (firstChild as ElementNode).codegenNode as
      | BlockCodegenNode
      | MemoExpression
    const vnodeCall = getMemoedVNodeCall(ret)
    // Change createVNode to createBlock.
    if (vnodeCall.type === NodeTypes.VNODE_CALL) {
      convertToBlock(vnodeCall, context)
    }
    // inject branch key
    injectProp(vnodeCall, keyProperty, context)
    return ret
  }
}
/**
 * 
 * @param a 
 * @param b 
 * @returns 
 * 该代码片段定义了 `isSameKey` 函数，用于比较两个属性节点或指令节点的键是否相同。

函数签名如下：

```typescript
function isSameKey(
  a: AttributeNode | DirectiveNode | undefined,
  b: AttributeNode | DirectiveNode
): boolean
```

参数：
- `a`: 第一个属性节点或指令节点。
- `b`: 第二个属性节点或指令节点。

函数的具体实现逻辑如下：
1. 如果 `a` 不存在，或者 `a` 的类型与 `b` 的类型不相同，则返回 `false`。
2. 如果 `a` 的类型是属性节点（`ATTRIBUTE`）：
   - 比较 `a` 的值的内容与 `b` 的值的内容是否相同，如果不相同则返回 `false`。
3. 如果 `a` 的类型是指令节点（`DIRECTIVE`）：
   - 获取 `a` 的表达式 `exp` 和 `b` 的表达式 `branchExp`。
   - 比较 `exp` 和 `branchExp` 的类型是否相同，如果不相同则返回 `false`。
   - 如果 `exp` 的类型是简单表达式节点（`SIMPLE_EXPRESSION`）：
     - 比较 `exp` 和 `branchExp` 的静态属性和内容是否相同，如果不相同则返回 `false`。
4. 如果上述条件都满足，则返回 `true`。

`isSameKey` 函数用于比较两个属性节点或指令节点的键是否相同。具体比较的逻辑根据节点的类型进行不同的处理，包括比较属性节点的值内容和比较指令节点的表达式的类型、静态属性和内容。如果两个节点的键相同，则返回 `true`，否则返回 `false`。
 */
function isSameKey(
  a: AttributeNode | DirectiveNode | undefined,
  b: AttributeNode | DirectiveNode
): boolean {
  if (!a || a.type !== b.type) {
    return false
  }
  if (a.type === NodeTypes.ATTRIBUTE) {
    if (a.value!.content !== (b as AttributeNode).value!.content) {
      return false
    }
  } else {
    // directive
    const exp = a.exp!
    const branchExp = (b as DirectiveNode).exp!
    if (exp.type !== branchExp.type) {
      return false
    }
    if (
      exp.type !== NodeTypes.SIMPLE_EXPRESSION ||
      exp.isStatic !== (branchExp as SimpleExpressionNode).isStatic ||
      exp.content !== (branchExp as SimpleExpressionNode).content
    ) {
      return false
    }
  }
  return true
}
/**
 * 
 * @param node 
 * @returns 
 * 该函数 `getParentCondition` 用于获取父级的条件表达式节点（`IfConditionalExpression`）。

函数签名如下：

```typescript
function getParentCondition(
  node: IfConditionalExpression | CacheExpression
): IfConditionalExpression
```

参数：
- `node`: 要获取其父级条件表达式节点的节点，可以是条件表达式节点或缓存表达式节点。

函数的具体实现逻辑如下：
1. 使用一个无限循环，不断遍历节点的父级，直到找到父级条件表达式节点为止。
2. 如果当前节点的类型是条件表达式节点（`JS_CONDITIONAL_EXPRESSION`）：
   - 检查当前节点的 `alternate` 属性是否也是条件表达式节点。
     - 如果是条件表达式节点，则将当前节点更新为 `alternate` 属性，并继续循环。
     - 如果不是条件表达式节点，则返回当前节点作为父级条件表达式节点。
3. 如果当前节点的类型是缓存表达式节点（`JS_CACHE_EXPRESSION`）：
   - 将当前节点的值（`value`）强制转换为条件表达式节点，并将当前节点更新为转换后的节点。
4. 回到步骤 1，继续下一次循环。

函数的目的是找到给定节点的父级条件表达式节点。它通过检查节点的类型和属性来遍历节点的父级，直到找到条件表达式节点为止。最终，它将返回找到的父级条件表达式节点。
 */
function getParentCondition(
  node: IfConditionalExpression | CacheExpression
): IfConditionalExpression {
  while (true) {
    if (node.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      if (node.alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
        node = node.alternate
      } else {
        return node
      }
    } else if (node.type === NodeTypes.JS_CACHE_EXPRESSION) {
      node = node.value as IfConditionalExpression
    }
  }
}
