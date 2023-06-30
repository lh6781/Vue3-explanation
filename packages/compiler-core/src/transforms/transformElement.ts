import { NodeTransform, TransformContext } from '../transform'
import {
  NodeTypes,
  ElementTypes,
  CallExpression,
  ObjectExpression,
  ElementNode,
  DirectiveNode,
  ExpressionNode,
  ArrayExpression,
  createCallExpression,
  createArrayExpression,
  createObjectProperty,
  createSimpleExpression,
  createObjectExpression,
  Property,
  ComponentNode,
  VNodeCall,
  TemplateTextChildNode,
  DirectiveArguments,
  createVNodeCall,
  ConstantTypes
} from '../ast'
import {
  PatchFlags,
  PatchFlagNames,
  isSymbol,
  isOn,
  isObject,
  isReservedProp,
  capitalize,
  camelize,
  isBuiltInDirective
} from '@vue/shared'
import { createCompilerError, ErrorCodes } from '../errors'
import {
  RESOLVE_DIRECTIVE,
  RESOLVE_COMPONENT,
  RESOLVE_DYNAMIC_COMPONENT,
  MERGE_PROPS,
  NORMALIZE_CLASS,
  NORMALIZE_STYLE,
  NORMALIZE_PROPS,
  TO_HANDLERS,
  TELEPORT,
  KEEP_ALIVE,
  SUSPENSE,
  UNREF,
  GUARD_REACTIVE_PROPS
} from '../runtimeHelpers'
import {
  getInnerRange,
  toValidAssetId,
  findProp,
  isCoreComponent,
  isStaticArgOf,
  findDir,
  isStaticExp
} from '../utils'
import { buildSlots } from './vSlot'
import { getConstantType } from './hoistStatic'
import { BindingTypes } from '../options'
import {
  checkCompatEnabled,
  CompilerDeprecationTypes,
  isCompatEnabled
} from '../compat/compatConfig'

// some directive transforms (e.g. v-model) may return a symbol for runtime
// import, which should be used instead of a resolveDirective call.
/**
 * `directiveImportMap` 是一个使用 `WeakMap` 实现的映射对象。它用于存储指令节点 (`DirectiveNode`) 和符号 (`symbol`) 之间的映射关系。

在 `directiveImportMap` 中，`DirectiveNode` 被用作键，而 `symbol` 被用作值。`WeakMap` 是一种特殊的映射数据结构，它的特点是键是弱引用的，即当键不再被引用时，对应的键值对会自动被垃圾回收。

通过使用 `WeakMap`，可以确保在指令节点不再被使用时，相关的映射关系也会被自动清除，从而避免内存泄漏和不必要的资源占用。

`directiveImportMap` 对象可以用于在编译或转换过程中存储指令节点和符号之间的关联信息，并在需要时进行查询和检索。
 */
const directiveImportMap = new WeakMap<DirectiveNode, symbol>()

// generate a JavaScript AST for this element's codegen
/**
 * 
 * @param node 
 * @param context 
 * @returns 
 * export const transformElement: NodeTransform = (node, context) => {
  // perform the work on exit, after all child expressions have been
  // processed and merged.
  return function postTransformElement() {
    node = context.currentNode!

    if (
      !(
        node.type === NodeTypes.ELEMENT &&
        (node.tagType === ElementTypes.ELEMENT ||
          node.tagType === ElementTypes.COMPONENT)
      )
    ) {
      return
    }

    const { tag, props } = node
    const isComponent = node.tagType === ElementTypes.COMPONENT

    // The goal of the transform is to create a codegenNode implementing the
    // VNodeCall interface.
    let vnodeTag = isComponent
      ? resolveComponentType(node as ComponentNode, context)
      : `"${tag}"`

    const isDynamicComponent =
      isObject(vnodeTag) && vnodeTag.callee === RESOLVE_DYNAMIC_COMPONENT

    let vnodeProps: VNodeCall['props']
    let vnodeChildren: VNodeCall['children']
    let vnodePatchFlag: VNodeCall['patchFlag']
    let patchFlag: number = 0
    let vnodeDynamicProps: VNodeCall['dynamicProps']
    let dynamicPropNames: string[] | undefined
    let vnodeDirectives: VNodeCall['directives']

    let shouldUseBlock =
      // dynamic component may resolve to plain elements
      isDynamicComponent ||
      vnodeTag === TELEPORT ||
      vnodeTag === SUSPENSE ||
      (!isComponent &&
        // <svg> and <foreignObject> must be forced into blocks so that block
        // updates inside get proper isSVG flag at runtime. (#639, #643)
        // This is technically web-specific, but splitting the logic out of core
        // leads to too much unnecessary complexity.
        (tag === 'svg' || tag === 'foreignObject'))

    // props
    if (props.length > 0) {
      const propsBuildResult = buildProps(
        node,
        context,
        undefined,
        isComponent,
        isDynamicComponent
      )
      vnodeProps = propsBuildResult.props
      patchFlag = propsBuildResult.patchFlag
      dynamicPropNames = propsBuildResult.dynamicPropNames
      const directives = propsBuildResult.directives
      vnodeDirectives =
        directives && directives.length
          ? (createArrayExpression(
              directives.map(dir => buildDirectiveArgs(dir, context))
            ) as DirectiveArguments)
          : undefined

      if (propsBuildResult.shouldUseBlock) {
        shouldUseBlock = true
      }
    }

    // children
    if (node.children.length > 0) {
      if (vnodeTag === KEEP_ALIVE) {
        // Although a built-in component, we compile KeepAlive with raw children
        // instead of slot functions so that it can be used inside Transition
        // or other Transition-wrapping HOCs.
        // To ensure correct updates with block optimizations, we need to:
        // 1. Force keep-alive into a block. This avoids its children being
        //    collected by a parent block.
        shouldUseBlock = true
        // 2. Force keep-alive to always be updated, since it uses raw children.
        patchFlag |= PatchFlags.DYNAMIC_SLOTS
        if (__DEV__ && node.children.length > 1) {
          context.onError(
            createCompilerError(ErrorCodes.X_KEEP_ALIVE_INVALID_CHILDREN, {
              start: node.children[0].loc.start,
              end: node.children[node.children.length - 1].loc.end,
              source: ''
            })
          )
        }
      }

      const shouldBuildAsSlots =
        isComponent &&
        // Teleport is not a real component and has dedicated runtime handling
        vnodeTag !== TELEPORT &&
        // explained above.
        vnodeTag !== KEEP_ALIVE

      if (shouldBuildAsSlots) {
        const { slots, hasDynamicSlots } = buildSlots(node, context)
        vnodeChildren = slots
        if (hasDynamicSlots) {
          patchFlag |= PatchFlags.DYNAMIC_SLOTS
        }
      } else if (node.children.length === 1 && vnodeTag !== TELEPORT) {
        const child = node.children[0]
        const type = child.type
        // check for dynamic text children
        const hasDynamicTextChild =
          type === NodeTypes.INTERPOLATION ||
          type === NodeTypes.COMPOUND_EXPRESSION
        if (
          hasDynamicTextChild &&
          getConstantType(child, context) === ConstantTypes.NOT_CONSTANT
        ) {
          patchFlag |= PatchFlags.TEXT
        }
        // pass directly if the only child is a text node
        // (plain / interpolation / expression)
        if (hasDynamicTextChild || type === NodeTypes.TEXT) {
          vnodeChildren = child as TemplateTextChildNode
        } else {
          vnodeChildren = node.children
        }
      } else {
        vnodeChildren = node.children
      }
    }

    // patchFlag & dynamicPropNames
    if (patchFlag !== 0) {
      if (__DEV__) {
        if (patchFlag < 0) {
          // special flags (negative and mutually exclusive)
          vnodePatchFlag =
            patchFlag + ` /* ${PatchFlagNames[patchFlag as PatchFlags]} `
        } else {
          // bitwise flags
          const flagNames = Object.keys(PatchFlagNames)
            .map(Number)
            .filter(n => n > 0 && patchFlag & n)
            .map(n => PatchFlagNames[n as PatchFlags])
            .join(`, `)
          vnodePatchFlag = patchFlag + ` /* ${flagNames} `
        }
      } else {
        vnodePatchFlag = String(patchFlag)
      }
      if (dynamicPropNames && dynamicPropNames.length) {
        vnodeDynamicProps = stringifyDynamicPropNames(dynamicPropNames)
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      vnodePatchFlag,
      vnodeDynamicProps,
      vnodeDirectives,
      !!shouldUseBlock,
      false /* disableTracking ,
      isComponent,
      node.loc
    )
  }
}
 */
export const transformElement: NodeTransform = (node, context) => {
  // perform the work on exit, after all child expressions have been
  // processed and merged.
  return function postTransformElement() {
    node = context.currentNode!

    if (
      !(
        node.type === NodeTypes.ELEMENT &&
        (node.tagType === ElementTypes.ELEMENT ||
          node.tagType === ElementTypes.COMPONENT)
      )
    ) {
      return
    }

    const { tag, props } = node
    const isComponent = node.tagType === ElementTypes.COMPONENT

    // The goal of the transform is to create a codegenNode implementing the
    // VNodeCall interface.
    let vnodeTag = isComponent
      ? resolveComponentType(node as ComponentNode, context)
      : `"${tag}"`

    const isDynamicComponent =
      isObject(vnodeTag) && vnodeTag.callee === RESOLVE_DYNAMIC_COMPONENT

    let vnodeProps: VNodeCall['props']
    let vnodeChildren: VNodeCall['children']
    let vnodePatchFlag: VNodeCall['patchFlag']
    let patchFlag: number = 0
    let vnodeDynamicProps: VNodeCall['dynamicProps']
    let dynamicPropNames: string[] | undefined
    let vnodeDirectives: VNodeCall['directives']

    let shouldUseBlock =
      // dynamic component may resolve to plain elements
      isDynamicComponent ||
      vnodeTag === TELEPORT ||
      vnodeTag === SUSPENSE ||
      (!isComponent &&
        // <svg> and <foreignObject> must be forced into blocks so that block
        // updates inside get proper isSVG flag at runtime. (#639, #643)
        // This is technically web-specific, but splitting the logic out of core
        // leads to too much unnecessary complexity.
        (tag === 'svg' || tag === 'foreignObject'))

    // props
    if (props.length > 0) {
      const propsBuildResult = buildProps(
        node,
        context,
        undefined,
        isComponent,
        isDynamicComponent
      )
      vnodeProps = propsBuildResult.props
      patchFlag = propsBuildResult.patchFlag
      dynamicPropNames = propsBuildResult.dynamicPropNames
      const directives = propsBuildResult.directives
      vnodeDirectives =
        directives && directives.length
          ? (createArrayExpression(
              directives.map(dir => buildDirectiveArgs(dir, context))
            ) as DirectiveArguments)
          : undefined

      if (propsBuildResult.shouldUseBlock) {
        shouldUseBlock = true
      }
    }

    // children
    if (node.children.length > 0) {
      if (vnodeTag === KEEP_ALIVE) {
        // Although a built-in component, we compile KeepAlive with raw children
        // instead of slot functions so that it can be used inside Transition
        // or other Transition-wrapping HOCs.
        // To ensure correct updates with block optimizations, we need to:
        // 1. Force keep-alive into a block. This avoids its children being
        //    collected by a parent block.
        shouldUseBlock = true
        // 2. Force keep-alive to always be updated, since it uses raw children.
        patchFlag |= PatchFlags.DYNAMIC_SLOTS
        if (__DEV__ && node.children.length > 1) {
          context.onError(
            createCompilerError(ErrorCodes.X_KEEP_ALIVE_INVALID_CHILDREN, {
              start: node.children[0].loc.start,
              end: node.children[node.children.length - 1].loc.end,
              source: ''
            })
          )
        }
      }

      const shouldBuildAsSlots =
        isComponent &&
        // Teleport is not a real component and has dedicated runtime handling
        vnodeTag !== TELEPORT &&
        // explained above.
        vnodeTag !== KEEP_ALIVE

      if (shouldBuildAsSlots) {
        const { slots, hasDynamicSlots } = buildSlots(node, context)
        vnodeChildren = slots
        if (hasDynamicSlots) {
          patchFlag |= PatchFlags.DYNAMIC_SLOTS
        }
      } else if (node.children.length === 1 && vnodeTag !== TELEPORT) {
        const child = node.children[0]
        const type = child.type
        // check for dynamic text children
        const hasDynamicTextChild =
          type === NodeTypes.INTERPOLATION ||
          type === NodeTypes.COMPOUND_EXPRESSION
        if (
          hasDynamicTextChild &&
          getConstantType(child, context) === ConstantTypes.NOT_CONSTANT
        ) {
          patchFlag |= PatchFlags.TEXT
        }
        // pass directly if the only child is a text node
        // (plain / interpolation / expression)
        if (hasDynamicTextChild || type === NodeTypes.TEXT) {
          vnodeChildren = child as TemplateTextChildNode
        } else {
          vnodeChildren = node.children
        }
      } else {
        vnodeChildren = node.children
      }
    }

    // patchFlag & dynamicPropNames
    if (patchFlag !== 0) {
      if (__DEV__) {
        if (patchFlag < 0) {
          // special flags (negative and mutually exclusive)
          vnodePatchFlag =
            patchFlag + ` /* ${PatchFlagNames[patchFlag as PatchFlags]} */`
        } else {
          // bitwise flags
          const flagNames = Object.keys(PatchFlagNames)
            .map(Number)
            .filter(n => n > 0 && patchFlag & n)
            .map(n => PatchFlagNames[n as PatchFlags])
            .join(`, `)
          vnodePatchFlag = patchFlag + ` /* ${flagNames} */`
        }
      } else {
        vnodePatchFlag = String(patchFlag)
      }
      if (dynamicPropNames && dynamicPropNames.length) {
        vnodeDynamicProps = stringifyDynamicPropNames(dynamicPropNames)
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      vnodePatchFlag,
      vnodeDynamicProps,
      vnodeDirectives,
      !!shouldUseBlock,
      false /* disableTracking */,
      isComponent,
      node.loc
    )
  }
}
/**
 * 
 * @param node 
 * @param context 
 * @param ssr 
 * @returns 
 * 这是一个用于解析组件类型的函数 `resolveComponentType`。它接收一个组件节点 `node`、转换上下文 `context` 和一个布尔值 `ssr`，用于指示是否在服务端渲染模式下。

函数的主要逻辑如下：

1. 首先检查是否存在动态组件的情况。如果存在 `is` 属性，则根据是否为显式动态组件或兼容模式进行处理。如果是显式动态组件，创建一个调用表达式，调用 `RESOLVE_DYNAMIC_COMPONENT` 辅助函数，并传入 `is` 属性的值作为参数。如果是兼容模式，根据 `is` 属性的类型创建一个简单表达式，并同样使用 `RESOLVE_DYNAMIC_COMPONENT` 辅助函数进行处理。

2. 如果不存在动态组件，则检查是否存在 `is` 指令。如果存在，并且具有表达式，则创建一个调用表达式，调用 `RESOLVE_DYNAMIC_COMPONENT` 辅助函数，并传入 `is` 指令的表达式作为参数。这部分代码的作用是处理过时的 `v-is` 指令。

3. 如果既不存在动态组件，也不存在 `is` 指令，则检查是否为内置组件（如 Teleport、Transition、KeepAlive、Suspense 等）。如果是内置组件，则根据 `ssr` 参数决定是否需要引入其运行时等效组件。

4. 在非浏览器环境下，检查组件是否来源于 setup 绑定。如果是，则返回解析得到的组件。

5. 在非浏览器环境下，检查组件是否为自引用组件（根据文件名推断）。如果是，则进行特殊处理，返回合法的组件标识符。

6. 如果以上条件都不满足，则假定组件为用户自定义组件，通过调用 `RESOLVE_COMPONENT` 辅助函数进行解析，并返回合法的组件标识符。

在解析过程中，根据需要，在转换上下文中添加相关的辅助函数和组件标识符。
 */
export function resolveComponentType(
  node: ComponentNode,
  context: TransformContext,
  ssr = false
) {
  let { tag } = node

  // 1. dynamic component
  const isExplicitDynamic = isComponentTag(tag)
  const isProp = findProp(node, 'is')
  if (isProp) {
    if (
      isExplicitDynamic ||
      (__COMPAT__ &&
        isCompatEnabled(
          CompilerDeprecationTypes.COMPILER_IS_ON_ELEMENT,
          context
        ))
    ) {
      const exp =
        isProp.type === NodeTypes.ATTRIBUTE
          ? isProp.value && createSimpleExpression(isProp.value.content, true)
          : isProp.exp
      if (exp) {
        return createCallExpression(context.helper(RESOLVE_DYNAMIC_COMPONENT), [
          exp
        ])
      }
    } else if (
      isProp.type === NodeTypes.ATTRIBUTE &&
      isProp.value!.content.startsWith('vue:')
    ) {
      // <button is="vue:xxx">
      // if not <component>, only is value that starts with "vue:" will be
      // treated as component by the parse phase and reach here, unless it's
      // compat mode where all is values are considered components
      tag = isProp.value!.content.slice(4)
    }
  }

  // 1.5 v-is (TODO: remove in 3.4)
  const isDir = !isExplicitDynamic && findDir(node, 'is')
  if (isDir && isDir.exp) {
    if (__DEV__) {
      context.onWarn(
        createCompilerError(ErrorCodes.DEPRECATION_V_IS, isDir.loc)
      )
    }
    return createCallExpression(context.helper(RESOLVE_DYNAMIC_COMPONENT), [
      isDir.exp
    ])
  }

  // 2. built-in components (Teleport, Transition, KeepAlive, Suspense...)
  const builtIn = isCoreComponent(tag) || context.isBuiltInComponent(tag)
  if (builtIn) {
    // built-ins are simply fallthroughs / have special handling during ssr
    // so we don't need to import their runtime equivalents
    if (!ssr) context.helper(builtIn)
    return builtIn
  }

  // 3. user component (from setup bindings)
  // this is skipped in browser build since browser builds do not perform
  // binding analysis.
  if (!__BROWSER__) {
    const fromSetup = resolveSetupReference(tag, context)
    if (fromSetup) {
      return fromSetup
    }
    const dotIndex = tag.indexOf('.')
    if (dotIndex > 0) {
      const ns = resolveSetupReference(tag.slice(0, dotIndex), context)
      if (ns) {
        return ns + tag.slice(dotIndex)
      }
    }
  }

  // 4. Self referencing component (inferred from filename)
  if (
    !__BROWSER__ &&
    context.selfName &&
    capitalize(camelize(tag)) === context.selfName
  ) {
    context.helper(RESOLVE_COMPONENT)
    // codegen.ts has special check for __self postfix when generating
    // component imports, which will pass additional `maybeSelfReference` flag
    // to `resolveComponent`.
    context.components.add(tag + `__self`)
    return toValidAssetId(tag, `component`)
  }

  // 5. user component (resolve)
  context.helper(RESOLVE_COMPONENT)
  context.components.add(tag)
  return toValidAssetId(tag, `component`)
}
/**
 * 
 * @param name 
 * @param context 
 * @returns 
 * 这是一个用于解析 setup 绑定引用的函数 `resolveSetupReference`。它接收一个名称字符串 `name` 和转换上下文 `context`，并返回解析得到的引用。

函数的主要逻辑如下：

1. 首先检查转换上下文中的绑定元数据 `bindingMetadata` 是否存在，以及是否为脚本的 setup 组织形式（`__isScriptSetup` 为 `true`）。

2. 将名称字符串转换为驼峰命名法和帕斯卡命名法的变量 `camelName` 和 `PascalName`。

3. 定义一个辅助函数 `checkType`，用于检查绑定类型是否匹配。根据名称和其驼峰命名法、帕斯卡命名法的变量在绑定元数据中进行查找，如果匹配则返回对应的名称。

4. 依次检查常量类型的绑定（`SETUP_CONST`、`SETUP_REACTIVE_CONST`、`LITERAL_CONST`）。如果存在匹配的绑定类型，则根据 `context.inline` 的值决定返回的结果。在内联模式下，常量 setup 绑定（例如导入）可以直接使用，因此返回对应的名称。否则，在非内联模式下，将返回 `$setup[name]` 形式的字符串。

5. 接着检查可能是引用类型的绑定（`SETUP_LET`、`SETUP_REF`、`SETUP_MAYBE_REF`）。如果存在匹配的绑定类型，则根据 `context.inline` 的值决定返回的结果。在内联模式下，需要对可能是引用类型的 setup 绑定进行解引用，因此返回 `${context.helperString(UNREF)}(fromMaybeRef)` 形式的字符串。否则，在非内联模式下，将返回 `$setup[fromMaybeRef]` 形式的字符串。

在解析过程中，根据需要，使用转换上下文中的辅助函数 `UNREF` 和 `helperString`。
 */
function resolveSetupReference(name: string, context: TransformContext) {
  const bindings = context.bindingMetadata
  if (!bindings || bindings.__isScriptSetup === false) {
    return
  }

  const camelName = camelize(name)
  const PascalName = capitalize(camelName)
  const checkType = (type: BindingTypes) => {
    if (bindings[name] === type) {
      return name
    }
    if (bindings[camelName] === type) {
      return camelName
    }
    if (bindings[PascalName] === type) {
      return PascalName
    }
  }

  const fromConst =
    checkType(BindingTypes.SETUP_CONST) ||
    checkType(BindingTypes.SETUP_REACTIVE_CONST) ||
    checkType(BindingTypes.LITERAL_CONST)
  if (fromConst) {
    return context.inline
      ? // in inline mode, const setup bindings (e.g. imports) can be used as-is
        fromConst
      : `$setup[${JSON.stringify(fromConst)}]`
  }

  const fromMaybeRef =
    checkType(BindingTypes.SETUP_LET) ||
    checkType(BindingTypes.SETUP_REF) ||
    checkType(BindingTypes.SETUP_MAYBE_REF)
  if (fromMaybeRef) {
    return context.inline
      ? // setup scope bindings that may be refs need to be unrefed
        `${context.helperString(UNREF)}(${fromMaybeRef})`
      : `$setup[${JSON.stringify(fromMaybeRef)}]`
  }
}
/**
 * `PropsExpression` 是一个类型别名，可以表示以下类型之一：`ObjectExpression`、`CallExpression` 或 `ExpressionNode`。

- `ObjectExpression` 表示一个对象表达式，用于表示组件的 props 对象。
- `CallExpression` 表示一个函数调用表达式，用于表示计算得到的 props 对象。
- `ExpressionNode` 是一个泛型类型，表示任意表达式的节点。

该类型别名用于表示在组件节点中可能出现的 props 表达式的类型。
 */
export type PropsExpression = ObjectExpression | CallExpression | ExpressionNode
/**
 * 
 */
export function buildProps(
  node: ElementNode,
  context: TransformContext,
  props: ElementNode['props'] = node.props,
  isComponent: boolean,
  isDynamicComponent: boolean,
  ssr = false
): {
  props: PropsExpression | undefined
  directives: DirectiveNode[]
  patchFlag: number
  dynamicPropNames: string[]
  shouldUseBlock: boolean
} {
  const { tag, loc: elementLoc, children } = node
  let properties: ObjectExpression['properties'] = []
  const mergeArgs: PropsExpression[] = []
  const runtimeDirectives: DirectiveNode[] = []
  const hasChildren = children.length > 0
  let shouldUseBlock = false

  // patchFlag analysis
  let patchFlag = 0
  let hasRef = false
  let hasClassBinding = false
  let hasStyleBinding = false
  let hasHydrationEventBinding = false
  let hasDynamicKeys = false
  let hasVnodeHook = false
  const dynamicPropNames: string[] = []

  const pushMergeArg = (arg?: PropsExpression) => {
    if (properties.length) {
      mergeArgs.push(
        createObjectExpression(dedupeProperties(properties), elementLoc)
      )
      properties = []
    }
    if (arg) mergeArgs.push(arg)
  }

  const analyzePatchFlag = ({ key, value }: Property) => {
    if (isStaticExp(key)) {
      const name = key.content
      const isEventHandler = isOn(name)
      if (
        isEventHandler &&
        (!isComponent || isDynamicComponent) &&
        // omit the flag for click handlers because hydration gives click
        // dedicated fast path.
        name.toLowerCase() !== 'onclick' &&
        // omit v-model handlers
        name !== 'onUpdate:modelValue' &&
        // omit onVnodeXXX hooks
        !isReservedProp(name)
      ) {
        hasHydrationEventBinding = true
      }

      if (isEventHandler && isReservedProp(name)) {
        hasVnodeHook = true
      }

      if (
        value.type === NodeTypes.JS_CACHE_EXPRESSION ||
        ((value.type === NodeTypes.SIMPLE_EXPRESSION ||
          value.type === NodeTypes.COMPOUND_EXPRESSION) &&
          getConstantType(value, context) > 0)
      ) {
        // skip if the prop is a cached handler or has constant value
        return
      }

      if (name === 'ref') {
        hasRef = true
      } else if (name === 'class') {
        hasClassBinding = true
      } else if (name === 'style') {
        hasStyleBinding = true
      } else if (name !== 'key' && !dynamicPropNames.includes(name)) {
        dynamicPropNames.push(name)
      }

      // treat the dynamic class and style binding of the component as dynamic props
      if (
        isComponent &&
        (name === 'class' || name === 'style') &&
        !dynamicPropNames.includes(name)
      ) {
        dynamicPropNames.push(name)
      }
    } else {
      hasDynamicKeys = true
    }
  }

  for (let i = 0; i < props.length; i++) {
    // static attribute
    const prop = props[i]
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const { loc, name, value } = prop
      let isStatic = true
      if (name === 'ref') {
        hasRef = true
        if (context.scopes.vFor > 0) {
          properties.push(
            createObjectProperty(
              createSimpleExpression('ref_for', true),
              createSimpleExpression('true')
            )
          )
        }
        // in inline mode there is no setupState object, so we can't use string
        // keys to set the ref. Instead, we need to transform it to pass the
        // actual ref instead.
        if (!__BROWSER__ && value && context.inline) {
          const binding = context.bindingMetadata[value.content]
          if (
            binding === BindingTypes.SETUP_LET ||
            binding === BindingTypes.SETUP_REF ||
            binding === BindingTypes.SETUP_MAYBE_REF
          ) {
            isStatic = false
            properties.push(
              createObjectProperty(
                createSimpleExpression('ref_key', true),
                createSimpleExpression(value.content, true, value.loc)
              )
            )
          }
        }
      }
      // skip is on <component>, or is="vue:xxx"
      if (
        name === 'is' &&
        (isComponentTag(tag) ||
          (value && value.content.startsWith('vue:')) ||
          (__COMPAT__ &&
            isCompatEnabled(
              CompilerDeprecationTypes.COMPILER_IS_ON_ELEMENT,
              context
            )))
      ) {
        continue
      }
      properties.push(
        createObjectProperty(
          createSimpleExpression(
            name,
            true,
            getInnerRange(loc, 0, name.length)
          ),
          createSimpleExpression(
            value ? value.content : '',
            isStatic,
            value ? value.loc : loc
          )
        )
      )
    } else {
      // directives
      const { name, arg, exp, loc } = prop
      const isVBind = name === 'bind'
      const isVOn = name === 'on'

      // skip v-slot - it is handled by its dedicated transform.
      if (name === 'slot') {
        if (!isComponent) {
          context.onError(
            createCompilerError(ErrorCodes.X_V_SLOT_MISPLACED, loc)
          )
        }
        continue
      }
      // skip v-once/v-memo - they are handled by dedicated transforms.
      if (name === 'once' || name === 'memo') {
        continue
      }
      // skip v-is and :is on <component>
      if (
        name === 'is' ||
        (isVBind &&
          isStaticArgOf(arg, 'is') &&
          (isComponentTag(tag) ||
            (__COMPAT__ &&
              isCompatEnabled(
                CompilerDeprecationTypes.COMPILER_IS_ON_ELEMENT,
                context
              ))))
      ) {
        continue
      }
      // skip v-on in SSR compilation
      if (isVOn && ssr) {
        continue
      }

      if (
        // #938: elements with dynamic keys should be forced into blocks
        (isVBind && isStaticArgOf(arg, 'key')) ||
        // inline before-update hooks need to force block so that it is invoked
        // before children
        (isVOn && hasChildren && isStaticArgOf(arg, 'vue:before-update'))
      ) {
        shouldUseBlock = true
      }

      if (isVBind && isStaticArgOf(arg, 'ref') && context.scopes.vFor > 0) {
        properties.push(
          createObjectProperty(
            createSimpleExpression('ref_for', true),
            createSimpleExpression('true')
          )
        )
      }

      // special case for v-bind and v-on with no argument
      if (!arg && (isVBind || isVOn)) {
        hasDynamicKeys = true
        if (exp) {
          if (isVBind) {
            // have to merge early for compat build check
            pushMergeArg()
            if (__COMPAT__) {
              // 2.x v-bind object order compat
              if (__DEV__) {
                const hasOverridableKeys = mergeArgs.some(arg => {
                  if (arg.type === NodeTypes.JS_OBJECT_EXPRESSION) {
                    return arg.properties.some(({ key }) => {
                      if (
                        key.type !== NodeTypes.SIMPLE_EXPRESSION ||
                        !key.isStatic
                      ) {
                        return true
                      }
                      return (
                        key.content !== 'class' &&
                        key.content !== 'style' &&
                        !isOn(key.content)
                      )
                    })
                  } else {
                    // dynamic expression
                    return true
                  }
                })
                if (hasOverridableKeys) {
                  checkCompatEnabled(
                    CompilerDeprecationTypes.COMPILER_V_BIND_OBJECT_ORDER,
                    context,
                    loc
                  )
                }
              }

              if (
                isCompatEnabled(
                  CompilerDeprecationTypes.COMPILER_V_BIND_OBJECT_ORDER,
                  context
                )
              ) {
                mergeArgs.unshift(exp)
                continue
              }
            }

            mergeArgs.push(exp)
          } else {
            // v-on="obj" -> toHandlers(obj)
            pushMergeArg({
              type: NodeTypes.JS_CALL_EXPRESSION,
              loc,
              callee: context.helper(TO_HANDLERS),
              arguments: isComponent ? [exp] : [exp, `true`]
            })
          }
        } else {
          context.onError(
            createCompilerError(
              isVBind
                ? ErrorCodes.X_V_BIND_NO_EXPRESSION
                : ErrorCodes.X_V_ON_NO_EXPRESSION,
              loc
            )
          )
        }
        continue
      }

      const directiveTransform = context.directiveTransforms[name]
      if (directiveTransform) {
        // has built-in directive transform.
        const { props, needRuntime } = directiveTransform(prop, node, context)
        !ssr && props.forEach(analyzePatchFlag)
        if (isVOn && arg && !isStaticExp(arg)) {
          pushMergeArg(createObjectExpression(props, elementLoc))
        } else {
          properties.push(...props)
        }
        if (needRuntime) {
          runtimeDirectives.push(prop)
          if (isSymbol(needRuntime)) {
            directiveImportMap.set(prop, needRuntime)
          }
        }
      } else if (!isBuiltInDirective(name)) {
        // no built-in transform, this is a user custom directive.
        runtimeDirectives.push(prop)
        // custom dirs may use beforeUpdate so they need to force blocks
        // to ensure before-update gets called before children update
        if (hasChildren) {
          shouldUseBlock = true
        }
      }
    }
  }

  let propsExpression: PropsExpression | undefined = undefined

  // has v-bind="object" or v-on="object", wrap with mergeProps
  if (mergeArgs.length) {
    // close up any not-yet-merged props
    pushMergeArg()
    if (mergeArgs.length > 1) {
      propsExpression = createCallExpression(
        context.helper(MERGE_PROPS),
        mergeArgs,
        elementLoc
      )
    } else {
      // single v-bind with nothing else - no need for a mergeProps call
      propsExpression = mergeArgs[0]
    }
  } else if (properties.length) {
    propsExpression = createObjectExpression(
      dedupeProperties(properties),
      elementLoc
    )
  }

  // patchFlag analysis
  if (hasDynamicKeys) {
    patchFlag |= PatchFlags.FULL_PROPS
  } else {
    if (hasClassBinding && !isComponent) {
      patchFlag |= PatchFlags.CLASS
    }
    if (hasStyleBinding && !isComponent) {
      patchFlag |= PatchFlags.STYLE
    }
    if (dynamicPropNames.length) {
      patchFlag |= PatchFlags.PROPS
    }
    if (hasHydrationEventBinding) {
      patchFlag |= PatchFlags.HYDRATE_EVENTS
    }
  }
  if (
    !shouldUseBlock &&
    (patchFlag === 0 || patchFlag === PatchFlags.HYDRATE_EVENTS) &&
    (hasRef || hasVnodeHook || runtimeDirectives.length > 0)
  ) {
    patchFlag |= PatchFlags.NEED_PATCH
  }

  // pre-normalize props, SSR is skipped for now
  if (!context.inSSR && propsExpression) {
    switch (propsExpression.type) {
      case NodeTypes.JS_OBJECT_EXPRESSION:
        // means that there is no v-bind,
        // but still need to deal with dynamic key binding
        let classKeyIndex = -1
        let styleKeyIndex = -1
        let hasDynamicKey = false

        for (let i = 0; i < propsExpression.properties.length; i++) {
          const key = propsExpression.properties[i].key
          if (isStaticExp(key)) {
            if (key.content === 'class') {
              classKeyIndex = i
            } else if (key.content === 'style') {
              styleKeyIndex = i
            }
          } else if (!key.isHandlerKey) {
            hasDynamicKey = true
          }
        }

        const classProp = propsExpression.properties[classKeyIndex]
        const styleProp = propsExpression.properties[styleKeyIndex]

        // no dynamic key
        if (!hasDynamicKey) {
          if (classProp && !isStaticExp(classProp.value)) {
            classProp.value = createCallExpression(
              context.helper(NORMALIZE_CLASS),
              [classProp.value]
            )
          }
          if (
            styleProp &&
            // the static style is compiled into an object,
            // so use `hasStyleBinding` to ensure that it is a dynamic style binding
            (hasStyleBinding ||
              (styleProp.value.type === NodeTypes.SIMPLE_EXPRESSION &&
                styleProp.value.content.trim()[0] === `[`) ||
              // v-bind:style and style both exist,
              // v-bind:style with static literal object
              styleProp.value.type === NodeTypes.JS_ARRAY_EXPRESSION)
          ) {
            styleProp.value = createCallExpression(
              context.helper(NORMALIZE_STYLE),
              [styleProp.value]
            )
          }
        } else {
          // dynamic key binding, wrap with `normalizeProps`
          propsExpression = createCallExpression(
            context.helper(NORMALIZE_PROPS),
            [propsExpression]
          )
        }
        break
      case NodeTypes.JS_CALL_EXPRESSION:
        // mergeProps call, do nothing
        break
      default:
        // single v-bind
        propsExpression = createCallExpression(
          context.helper(NORMALIZE_PROPS),
          [
            createCallExpression(context.helper(GUARD_REACTIVE_PROPS), [
              propsExpression
            ])
          ]
        )
        break
    }
  }

  return {
    props: propsExpression,
    directives: runtimeDirectives,
    patchFlag,
    dynamicPropNames,
    shouldUseBlock
  }
}

// Dedupe props in an object literal.
// Literal duplicated attributes would have been warned during the parse phase,
// however, it's possible to encounter duplicated `onXXX` handlers with different
// modifiers. We also need to merge static and dynamic class / style attributes.
// - onXXX handlers / style: merge into array
// - class: merge into single expression with concatenation
/**
 * 
 * @param properties 
 * @returns 
 * `dedupeProperties` 函数用于从属性数组中移除重复的属性。以下是它的工作原理的中文解释：

```javascript
function dedupeProperties(properties: Property[]): Property[] {
  const knownProps: Map<string, Property> = new Map()
  const deduped: Property[] = []

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]

    // 动态键名始终是允许的
    if (prop.key.type === NodeTypes.COMPOUND_EXPRESSION || !prop.key.isStatic) {
      deduped.push(prop)
      continue
    }

    const name = prop.key.content
    const existing = knownProps.get(name)

    if (existing) {
      if (name === 'style' || name === 'class' || isOn(name)) {
        mergeAsArray(existing, prop)
      }
      // 意外的重复属性，在解析过程中应该已经发出了错误
    } else {
      knownProps.set(name, prop)
      deduped.push(prop)
    }
  }

  return deduped
}
```

下面是该函数的执行过程解释：

1. `knownProps` 是一个 `Map` 对象，用于根据属性的名称来跟踪属性。
2. `deduped` 是一个数组，用于存储去重后的属性。
3. 函数遍历 `properties` 数组中的每个属性。
4. 如果属性具有动态键名（由复合表达式表示）或键名不是静态的，则认为它是唯一的，并直接将其添加到 `deduped` 数组中。
5. 如果属性具有静态键名，将提取其名称。
6. 如果 `knownProps` 中已经存在相同名称的属性，则表示找到了重复的属性。
   - 如果名称为 `'style'`、`'class'` 或事件监听器（通过 `isOn` 函数检测），则将现有属性和新属性合并为一个数组，使用 `mergeAsArray` 函数进行合并。
   - 如果名称不是上述特殊情况之一，则表示出现了意外的重复属性，在解析阶段应该已经发出了错误。
7. 如果 `knownProps` 中不存在相同名称的属性，则将该属性添加到 `knownProps` 中，并将属性添加到 `deduped` 数组中。
8. 处理完所有属性后，返回 `deduped` 数组，其中只包含唯一的属性。

注意：你提供的代码片段中没有给出 `mergeAsArray` 函数的实现，因此无法提供该函数的详细解释。它很可能是一个单独的函数，用于将属性合并为数组。
 */
function dedupeProperties(properties: Property[]): Property[] {
  const knownProps: Map<string, Property> = new Map()
  const deduped: Property[] = []
  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i]
    // dynamic keys are always allowed
    if (prop.key.type === NodeTypes.COMPOUND_EXPRESSION || !prop.key.isStatic) {
      deduped.push(prop)
      continue
    }
    const name = prop.key.content
    const existing = knownProps.get(name)
    if (existing) {
      if (name === 'style' || name === 'class' || isOn(name)) {
        mergeAsArray(existing, prop)
      }
      // unexpected duplicate, should have emitted error during parse
    } else {
      knownProps.set(name, prop)
      deduped.push(prop)
    }
  }
  return deduped
}
/**
 * 
 * @param existing 
 * @param incoming 
 * `mergeAsArray` 函数用于将两个属性合并为数组形式。以下是该函数的工作原理：

```javascript
function mergeAsArray(existing: Property, incoming: Property) {
  if (existing.value.type === NodeTypes.JS_ARRAY_EXPRESSION) {
    // 如果现有属性的值已经是一个数组表达式，则将新属性的值追加到该数组中
    existing.value.elements.push(incoming.value);
  } else {
    // 如果现有属性的值不是数组表达式，则创建一个新的数组表达式，将现有属性和新属性的值作为元素
    existing.value = createArrayExpression(
      [existing.value, incoming.value],
      existing.loc
    );
  }
}
```

函数的参数 `existing` 表示已存在的属性，而 `incoming` 表示要合并的新属性。

函数执行的逻辑如下：
- 首先，检查 `existing` 属性的值的类型是否为 `NodeTypes.JS_ARRAY_EXPRESSION`，即判断它是否已经是一个数组表达式。
- 如果是，则将 `incoming` 属性的值追加到 `existing` 属性值的 `elements` 数组中，实现属性值的合并。
- 如果 `existing` 属性的值不是数组表达式，则创建一个新的数组表达式，其中包含 `existing` 属性的值和 `incoming` 属性的值作为元素。
- 最后，更新 `existing` 属性的值为新的数组表达式。

这样，通过调用 `mergeAsArray` 函数，可以将具有相同名称的属性合并为一个数组，以确保这些属性都被保留下来。
 */
function mergeAsArray(existing: Property, incoming: Property) {
  if (existing.value.type === NodeTypes.JS_ARRAY_EXPRESSION) {
    existing.value.elements.push(incoming.value)
  } else {
    existing.value = createArrayExpression(
      [existing.value, incoming.value],
      existing.loc
    )
  }
}
/**
 * 
 * @param dir 
 * @param context 
 * @returns 
 * `buildDirectiveArgs` 函数是一个用于构建指令参数的函数。以下是该函数的解释：

```javascript
export function buildDirectiveArgs(
  dir: DirectiveNode,
  context: TransformContext
): ArrayExpression {
  const dirArgs: ArrayExpression['elements'] = []
  const runtime = directiveImportMap.get(dir)
  if (runtime) {
    // 内置指令与运行时
    dirArgs.push(context.helperString(runtime))
  } else {
    // 用户自定义指令
    // 查看是否通过 <script setup> 暴露指令
    const fromSetup =
      !__BROWSER__ && resolveSetupReference('v-' + dir.name, context)
    if (fromSetup) {
      dirArgs.push(fromSetup)
    } else {
      // 用于解析指令的注入语句
      context.helper(RESOLVE_DIRECTIVE)
      context.directives.add(dir.name)
      dirArgs.push(toValidAssetId(dir.name, `directive`))
    }
  }
  const { loc } = dir
  if (dir.exp) dirArgs.push(dir.exp)
  if (dir.arg) {
    if (!dir.exp) {
      dirArgs.push(`void 0`)
    }
    dirArgs.push(dir.arg)
  }
  if (Object.keys(dir.modifiers).length) {
    if (!dir.arg) {
      if (!dir.exp) {
        dirArgs.push(`void 0`)
      }
      dirArgs.push(`void 0`)
    }
    const trueExpression = createSimpleExpression(`true`, false, loc)
    dirArgs.push(
      createObjectExpression(
        dir.modifiers.map(modifier =>
          createObjectProperty(modifier, trueExpression)
        ),
        loc
      )
    )
  }
  return createArrayExpression(dirArgs, dir.loc)
}
```

函数的参数 `dir` 是一个指令节点，而 `context` 是一个转换上下文对象。

函数的作用是根据指令节点构建指令参数的数组表达式，并返回该数组表达式。

函数的执行逻辑如下：
- 首先，创建一个空数组 `dirArgs`，用于存储指令参数的元素。
- 接下来，尝试从 `directiveImportMap` 中获取指令的运行时。如果存在运行时，则表示是内置指令，将其添加到 `dirArgs` 数组中。
- 如果不存在运行时，则表示是用户自定义指令。首先，检查是否通过 `<script setup>` 暴露了指令，如果是，则将其添加到 `dirArgs` 数组中。
- 如果没有通过 `<script setup>` 暴露指令，则需要注入语句来解析指令。在转换上下文中使用 `context.helper(RESOLVE_DIRECTIVE)` 添加注入语句，将指令名称添加到 `context.directives` 集合中，并将指令的合法资源 ID 添加到 `dirArgs` 数组中。
- 然后，根据指令节点的属性进行处理。首先，如果指令节点具有 `exp` 属性，则将其添加到 `dirArgs` 数组中。
- 接下来，如果指令节点具有 `arg` 属性，则将其添加到 `dirArgs` 数组中。如果指

令节点没有 `exp` 属性，则将 `void 0` 添加到 `dirArgs` 数组中。
- 最后，如果指令节点具有修饰符，则创建一个对象表达式，其中包含修饰符作为键，对应的值为 `true`，并将该对象表达式添加到 `dirArgs` 数组中。
- 返回使用 `dirArgs` 数组元素创建的数组表达式。

这样，通过调用 `buildDirectiveArgs` 函数，可以根据指令节点构建出对应的指令参数的数组表达式。
 */
export function buildDirectiveArgs(
  dir: DirectiveNode,
  context: TransformContext
): ArrayExpression {
  const dirArgs: ArrayExpression['elements'] = []
  const runtime = directiveImportMap.get(dir)
  if (runtime) {
    // built-in directive with runtime
    dirArgs.push(context.helperString(runtime))
  } else {
    // user directive.
    // see if we have directives exposed via <script setup>
    const fromSetup =
      !__BROWSER__ && resolveSetupReference('v-' + dir.name, context)
    if (fromSetup) {
      dirArgs.push(fromSetup)
    } else {
      // inject statement for resolving directive
      context.helper(RESOLVE_DIRECTIVE)
      context.directives.add(dir.name)
      dirArgs.push(toValidAssetId(dir.name, `directive`))
    }
  }
  const { loc } = dir
  if (dir.exp) dirArgs.push(dir.exp)
  if (dir.arg) {
    if (!dir.exp) {
      dirArgs.push(`void 0`)
    }
    dirArgs.push(dir.arg)
  }
  if (Object.keys(dir.modifiers).length) {
    if (!dir.arg) {
      if (!dir.exp) {
        dirArgs.push(`void 0`)
      }
      dirArgs.push(`void 0`)
    }
    const trueExpression = createSimpleExpression(`true`, false, loc)
    dirArgs.push(
      createObjectExpression(
        dir.modifiers.map(modifier =>
          createObjectProperty(modifier, trueExpression)
        ),
        loc
      )
    )
  }
  return createArrayExpression(dirArgs, dir.loc)
}
/**
 * 
 * @param props 
 * @returns 
 * `stringifyDynamicPropNames` 函数的作用是将动态属性名称的字符串数组转换为字符串表示形式。以下是该函数的解释：

```javascript
function stringifyDynamicPropNames(props: string[]): string {
  let propsNamesString = `[`
  for (let i = 0, l = props.length; i < l; i++) {
    propsNamesString += JSON.stringify(props[i])
    if (i < l - 1) propsNamesString += ', '
  }
  return propsNamesString + `]`
}
```

函数的参数 `props` 是一个字符串数组，表示动态属性的名称。

函数的执行逻辑如下：
- 首先，定义一个变量 `propsNamesString`，初始化为 `[`，表示字符串的起始部分。
- 接下来，使用 `for` 循环遍历 `props` 数组中的每个元素：
  - 将当前属性名称使用 `JSON.stringify` 方法转换为字符串，并追加到 `propsNamesString` 变量中。
  - 如果当前元素不是数组的最后一个元素，则在属性名称之后添加 `, ` 分隔符。
- 循环结束后，返回 `propsNamesString` 变量加上 `]`，表示字符串的结束部分。

这样，通过调用 `stringifyDynamicPropNames` 函数，可以将动态属性名称的字符串数组转换为字符串表示形式，其中属性名称被包裹在方括号中，并使用逗号分隔。
 */
function stringifyDynamicPropNames(props: string[]): string {
  let propsNamesString = `[`
  for (let i = 0, l = props.length; i < l; i++) {
    propsNamesString += JSON.stringify(props[i])
    if (i < l - 1) propsNamesString += ', '
  }
  return propsNamesString + `]`
}
/**
 * 
 * @param tag 
 * @returns 
 * `isComponentTag` 函数的作用是检查给定的标签字符串是否表示组件。以下是该函数的解释：

```javascript
function isComponentTag(tag: string) {
  return tag === 'component' || tag === 'Component'
}
```

函数的参数 `tag` 是一个表示标签的字符串。

函数的执行逻辑很简单：
- 它将给定的标签字符串与字符串 `'component'` 和 `'Component'` 进行比较。
- 如果标签字符串等于 `'component'` 或 `'Component'` 中的任何一个，函数返回 `true`，表示该标签是一个组件标签。
- 否则，函数返回 `false`，表示该标签不是一个组件标签。

通过调用 `isComponentTag` 函数，可以确定给定的标签字符串是否表示一个组件。
 */
function isComponentTag(tag: string) {
  return tag === 'component' || tag === 'Component'
}
