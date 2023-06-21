import { ReactiveEffect } from './effect'
import { warn } from './warning'

let activeEffectScope: EffectScope | undefined

export class EffectScope {
  /**
   * @internal
   */
  private _active = true
  /**
   * @internal
   */
  effects: ReactiveEffect[] = []
  /**
   * @internal
   */
  cleanups: (() => void)[] = []

  /**
   * only assigned by undetached scope
   * @internal
   */
  parent: EffectScope | undefined
  /**
   * record undetached scopes
   * @internal
   */
  scopes: EffectScope[] | undefined
  /**
   * track a child scope's index in its parent's scopes array for optimized
   * removal
   * @internal
   */
  private index: number | undefined
  /**
 * 
 * @param detached 
 * 这段代码是一个构造函数，它接受一个名为 detached 的参数，并且使用 public 访问修饰符将其声明为公共成员变量。构造函数还包含一些逻辑来设置对象的其他属性。

首先，构造函数将 this.parent 设置为 activeEffectScope，这可能是指向父级效果范围的引用。

然后，它检查 detached 的值。如果 detached 为 false 且 activeEffectScope 存在，则执行以下逻辑：

访问 activeEffectScope.scopes，如果不存在，则将其初始化为空数组。
使用 push 方法将当前对象（this）添加到 activeEffectScope.scopes 中，并将返回的索引赋值给 this.index。
这意味着当前对象被添加到 activeEffectScope.scopes 数组的末尾，并且 this.index 存储了该对象在数组中的索引位置。
最终，构造函数完成了对象的初始化，并根据条件设置了 detached、parent 和 index 属性。
当对象的 detached 属性为 true 时，构造函数不会执行添加到 activeEffectScope.scopes 的逻辑，而是保持 this.index 为 undefined。这表示对象被标记为"分离"状态，不会被添加到活动效果范围的作用域数组中。

如果对象的 detached 属性为 false，并且存在 activeEffectScope，则会将当前对象添加到 activeEffectScope.scopes 数组中，并将返回的索引赋值给 this.index。这意味着对象被加入到活动效果范围的作用域数组中，并且可以通过 this.index 来跟踪对象在数组中的位置。

通过将对象添加到活动效果范围的作用域数组中，可以对其进行更好的管理和跟踪。这在处理多个嵌套的效果范围时非常有用，可以按照添加的顺序对它们进行遍历和执行。
 */
  constructor(public detached = false) {
    this.parent = activeEffectScope
    if (!detached && activeEffectScope) {
      this.index =
        (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
          this
        ) - 1
    }
  }

  get active() {
    return this._active
  }
  /**
 * 
 * @param fn 
 * @returns 
 * run 方法用于在当前效果范围内执行给定的函数 fn。它会检查效果范围的 _active 属性，如果为 true，则将当前的 activeEffectScope 保存到 currentEffectScope 中，并将当前效果范围设置为 this，然后执行传入的函数 fn 并返回其结果。最后，将 activeEffectScope 恢复为之前的值。

如果效果范围的 _active 属性为 false，并且开发环境为 __DEV__，则会发出警告，表示无法运行一个处于非活动状态的效果范围。

这个方法的目的是在特定的效果范围内运行函数，并确保在执行期间使用正确的活动效果范围。
 */
  run<T>(fn: () => T): T | undefined {
    if (this._active) {
      const currentEffectScope = activeEffectScope
      try {
        activeEffectScope = this
        return fn()
      } finally {
        activeEffectScope = currentEffectScope
      }
    } else if (__DEV__) {
      warn(`cannot run an inactive effect scope.`)
    }
  }

  /**
   * This should only be called on non-detached scopes
   * @internal
   * on 方法用于将当前效果范围 (this) 设置为活动效果范围 (activeEffectScope)。通过将 activeEffectScope 设置为当前效果范围，可以确保在当前范围内创建的效果 (effect) 正确地关联到该范围。

这个方法通常与 run 方法一起使用，在 run 方法内部执行具有副作用的代码，并确保该代码与正确的活动效果范围关联。例如，可以在 run 方法内部调用 on 方法将当前效果范围设置为活动效果范围，然后执行一些会触发副作用的操作，最后在 run 方法结束时恢复活动效果范围。

请注意，on 方法仅仅是将当前效果范围设置为活动效果范围，它并不执行具体的操作或副作用。它只是确保在当前范围内的后续代码能够正确地关联到该范围。
   */
  on() {
    activeEffectScope = this
  }

  /**
   * This should only be called on non-detached scopes
   * off 方法用于将当前效果范围 (this) 的父级效果范围 (parent) 设置为活动效果范围 (activeEffectScope)。通过将 activeEffectScope 设置为父级效果范围，可以恢复到上一级的效果范围。

这个方法通常与 run 方法一起使用，在执行具有副作用的代码之后恢复到上一级的效果范围。例如，可以在 run 方法内部调用 off 方法将父级效果范围设置为活动效果范围，这样在执行副作用后，活动效果范围将回到之前的状态。

请注意，off 方法仅仅是将父级效果范围设置为活动效果范围，它并不执行具体的操作或副作用。它只是用于在执行完具有副作用的代码后恢复到上一级的效果范围。
   * @internal
   */
  off() {
    activeEffectScope = this.parent
  }
  /**
 * 
 * @param fromParent 
 * stop 方法用于停止当前效果范围 (this) 的所有效果和清理函数。它会遍历所有的效果和清理函数，并逐个调用它们的 stop 方法或执行清理函数。

在停止当前效果范围之前，stop 方法还会处理嵌套的效果范围（scopes）。它会递归地调用每个嵌套的效果范围的 stop 方法，以停止它们的效果和清理函数。

如果当前效果范围是嵌套的范围，并且没有设置 detached 选项为 true，那么在停止当前效果范围后，还会从父级效果范围中将其移除，以避免内存泄漏。

最后，stop 方法会将当前效果范围的父级 (parent) 设置为 undefined，将 _active 标志设置为 false，表示当前效果范围已停止。

注意：stop 方法并不会立即执行效果和清理函数的停止操作，而是通过调用它们的 stop 方法来触发停止操作。停止操作的具体逻辑需要在效果和清理函数的 stop 方法中实现。
 */
  stop(fromParent?: boolean) {
    if (this._active) {
      let i, l
      for (i = 0, l = this.effects.length; i < l; i++) {
        this.effects[i].stop()
      }
      for (i = 0, l = this.cleanups.length; i < l; i++) {
        this.cleanups[i]()
      }
      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].stop(true)
        }
      }
      // nested scope, dereference from parent to avoid memory leaks
      if (!this.detached && this.parent && !fromParent) {
        // optimized O(1) removal
        const last = this.parent.scopes!.pop()
        if (last && last !== this) {
          this.parent.scopes![this.index!] = last
          last.index = this.index!
        }
      }
      this.parent = undefined
      this._active = false
    }
  }
}

/**
 * Creates an effect scope object which can capture the reactive effects (i.e.
 * computed and watchers) created within it so that these effects can be
 * disposed together. For detailed use cases of this API, please consult its
 * corresponding {@link https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md | RFC}.
 *
 * @param detached - Can be used to create a "detached" effect scope.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#effectscope}
 * 这是一个创建效果作用域（EffectScope）的函数。它接受一个布尔值参数detached，用于指示效果作用域是否为独立的（detached）。返回一个新的效果作用域实例。

效果作用域用于管理和跟踪相关的响应式效果（ReactiveEffect）。在创建效果作用域时，它会将当前活动的效果作用域设置为父级效果作用域（activeEffectScope），并将自身添加到父级效果作用域的作用域列表中。

效果作用域提供了几个方法来管理和控制效果作用域及其相关的效果：

run<T>(fn: () => T): T | undefined：在当前效果作用域下运行给定的函数，并返回其结果。该方法会临时将当前活动的效果作用域设置为自身，以确保函数在正确的作用域中执行。如果当前效果作用域不处于活动状态，则会在开发环境下发出警告。

on()：void：将当前效果作用域设置为活动效果作用域。可以使用on()和off()方法来手动控制效果作用域的激活状态。

off()：void：将当前效果作用域设置为其父级效果作用域，即取消激活当前效果作用域。

stop(fromParent?: boolean)：void：停止当前效果作用域及其所有关联的效果。该方法会递归停止所有子效果作用域，并执行清理函数。如果fromParent参数为true，则表示停止操作是由父级效果作用域触发的，这样可以避免重复处理。

通过使用效果作用域，可以更好地组织和管理相关的响应式效果，并在需要时进行激活、停止或重置。
 */
export function effectScope(detached?: boolean) {
  return new EffectScope(detached)
}
/**
 * 
 * @param effect 
 * @param scope 
 * 这是一个用于记录效果作用域（EffectScope）的函数。它接受两个参数：

effect: ReactiveEffect：要记录的响应式效果。
scope: EffectScope | undefined：要将效果记录到的效果作用域。默认为当前活动的效果作用域（activeEffectScope）。
函数会首先检查传入的效果作用域是否存在且处于活动状态。如果是，则将传入的效果（effect）添加到该效果作用域的效果列表（effects）中。

通过记录效果作用域，可以建立响应式效果和其关联的效果作用域之间的关联关系。这样可以在需要时对效果作用域进行管理，并在停止效果时统一处理相关的效果。
 */
export function recordEffectScope(
  effect: ReactiveEffect,
  scope: EffectScope | undefined = activeEffectScope
) {
  if (scope && scope.active) {
    scope.effects.push(effect)
  }
}

/**
 * Returns the current active effect scope if there is one.
 *
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#getcurrentscope}
 * getCurrentScope 函数用于获取当前活动的效果作用域（activeEffectScope）。

该函数简单地返回 activeEffectScope 的值，即当前活动的效果作用域对象。

通过调用 getCurrentScope 函数，您可以获取当前正在运行的代码所属的效果作用域，以便在需要时进行进一步的操作或管理。
 */
export function getCurrentScope() {
  return activeEffectScope
}

/**
 * Registers a dispose callback on the current active effect scope. The
 * callback will be invoked when the associated effect scope is stopped.
 *
 * @param fn - The callback function to attach to the scope's cleanup.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#onscopedispose}
 * onScopeDispose 函数用于在当前活动的效果作用域（activeEffectScope）被销毁时注册一个清理函数。

该函数会将传入的清理函数 fn 添加到当前活动的效果作用域的 cleanups 数组中，以便在作用域被销毁时执行清理操作。

如果当前没有活动的效果作用域（activeEffectScope 为 undefined），并且处于开发模式下，将会发出警告提示。

通过调用 onScopeDispose 函数，您可以在需要时注册一些清理操作，以确保在效果作用域被销毁时执行相应的清理逻辑。这对于释放资源、取消订阅或执行其他清理任务非常有用。
 */
export function onScopeDispose(fn: () => void) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else if (__DEV__) {
    warn(
      `onScopeDispose() is called when there is no active effect scope` +
        ` to be associated with.`
    )
  }
}
