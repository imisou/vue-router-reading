/* @flow */

import { _Vue } from '../install'
import { warn, isError } from './warn'




/**
 * 解决异步组件


 {
   component : (resolve) => require(['../views/404.vue'], resolve)
 }
 * @param {Array < RouteRecord >} matched
 * @returns {Function}
 */
export function resolveAsyncComponents(matched: Array < RouteRecord > ): Function {
    return (to, from, next) => {
        let hasAsync = false
        let pending = 0
        let error = null

        /*
          遍历处理 父子组件、组件中命名视图 等多个地方加载异步组件的方法

          def : 组件构造函数
          _   : 组件的 实例对象 instance
          match  父子组件中路由routeRecord对象
          key : 当前处理的路由中的 命名视图 的命名(默认的default)

        */
        flatMapComponents(matched, (def, _, match, key) => {
            // if it's a function and doesn't have cid attached,
            // assume it's an async component resolve function.
            // we are not using Vue's default async resolving mechanism because
            // we want to halt the navigation until the incoming component has been
            // resolved.
            if (typeof def === 'function' && def.cid === undefined) {
                hasAsync = true
                pending++

                // 定义异步组件 resolve 加载完成方法
                const resolve = once(resolvedDef => {
                    // 是否是通过ES5的 import方法加载组件，这时候组件内容存放在default属性上
                    if (isESModule(resolvedDef)) {
                        resolvedDef = resolvedDef.default
                    }
                    // save resolved on async factory in case it's used elsewhere
                    def.resolved = typeof resolvedDef === 'function' ?
                        resolvedDef :
                        _Vue.extend(resolvedDef);

                    // 将路由routeRecord对象中的此命名视图组件赋值成真正的组件实例对象
                    match.components[key] = resolvedDef


                    // pending的作用
                    /*
                      当所有的异步组件都加载完成 才执行next() 进行下一步
                    */
                    pending--
                    if (pending <= 0) {
                        next()
                    }
                });
                // 定义异步组件 reject 加载失败的处理方法
                const reject = once(reason => {
                    const msg = `Failed to resolve async component ${key}: ${reason}`
                    process.env.NODE_ENV !== 'production' && warn(false, msg)
                    if (!error) {
                        error = isError(reason) ?
                            reason :
                            new Error(msg)
                        next(error)
                    }
                })

                let res
                try {
                    // 调用异步组件的执行函数  (resolve) => require(['../views/404.vue'], resolve)
                    res = def(resolve, reject)
                } catch (e) {
                    reject(e)
                }
                if (res) {
                    if (typeof res.then === 'function') {
                        res.then(resolve, reject)
                    } else {
                        // new syntax in Vue 2.3
                        const comp = res.component
                        if (comp && typeof comp.then === 'function') {
                            comp.then(resolve, reject)
                        }
                    }
                }
            }
        })

        // 如果没有异步组件 手动调用next() 执行下一个
        if (!hasAsync) next()
    }
}


/**
 * 根据命名视图组件，获取
 * 
  我们知道配置路由的数据的时候可以
  {
    component : App,

    components:{
      default : App,
      helper: UserProfilePreview
    }
  }
  这些都在createRouteMap的时候 转换为 routeRecord.components属性上
 * @param {Array < RouteRecord >} matched
 * @param {Function} fn
 * @returns {Array}
 */
export function flatMapComponents(
    matched: Array < RouteRecord > ,
    fn: Function
): Array << ? Function > {
    // 处理匹配到的路由 routeRecord 
    return flatten(matched.map(m => {
        // 处理routeRecord 上的 components属性，即命名视图
        // 如上面的   m.components = { default : App实例对象 ，  helper : UserProfilePreview}
        return Object.keys(m.components).map(key => fn(
            m.components[key],
            m.instances[key],
            m, key
        ))
    }))
}

/**
 * 将二维数组转换成一位数组
 * guards = [ undefined , [bind1, bind2]]   => [undefined , bind1, bind2 ]
 * @param {Array < any >} arr
 * @returns {Array < any >}
 */
export function flatten(arr: Array < any > ): Array < any > {
    return Array.prototype.concat.apply([], arr)
}

const hasSymbol =
    typeof Symbol === 'function' &&
    typeof Symbol.toStringTag === 'symbol'

function isESModule(obj) {
    return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
}

// in Webpack 2, require.ensure now also returns a Promise
// so the resolve/reject functions may get called an extra time
// if the user uses an arrow function shorthand that happens to
// return that Promise.
function once(fn) {
    let called = false
    return function(...args) {
        if (called) return
        called = true
        return fn.apply(this, args)
    }
}