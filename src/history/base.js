/* @flow */

import { _Vue } from '../install'
import type Router from '../index'
import { inBrowser } from '../util/dom'
import { runQueue } from '../util/async'
import { warn, isError } from '../util/warn'
import { START, isSameRoute } from '../util/route'
import {
    flatten,
    flatMapComponents,
    resolveAsyncComponents
} from '../util/resolve-components'

export class History {
    router: Router;
    base: string;
    current: Route;
    pending: ? Route;
    cb: (r: Route) => void;
    ready: boolean;
    readyCbs: Array < Function > ;
    readyErrorCbs: Array < Function > ;
    errorCbs: Array < Function > ;

    // implemented by sub-classes
    +
    go: (n: number) => void; +
    push: (loc: RawLocation) => void; +
    replace: (loc: RawLocation) => void; +
    ensureURL: (push ? : boolean) => void; +
    getCurrentLocation: () => string;

    constructor(router: Router, base: ? string) {
        this.router = router;

        // 处理 base 属性，如果没有就是 '/'
        this.base = normalizeBase(base);
        // start with a route object that stands for "nowhere"
        this.current = START
        this.pending = null
        this.ready = false
        this.readyCbs = []
        this.readyErrorCbs = []
        this.errorCbs = []
    }

    listen(cb: Function) {
        this.cb = cb
    }

    onReady(cb: Function, errorCb: ? Function) {
        if (this.ready) {
            cb()
        } else {
            this.readyCbs.push(cb)
            if (errorCb) {
                this.readyErrorCbs.push(errorCb)
            }
        }
    }

    onError(errorCb: Function) {
        this.errorCbs.push(errorCb)
    }



    /*
        路由跳转核心方法。
        this.$router.push(location, onComplete?, onAbort?)

      location :   地址路径
        1、 可以直接为一个地址的字符串，如 'base/home'
        2、 可以为一个地址对象  { 
            _normalized?: boolean;
            name?: string;
            path?: string;
            hash?: string;
            query?: Dictionary<string>;
            params?: Dictionary<string>;
            append?: boolean;
            replace?: boolean;
        }

    */

    transitionTo(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
        //生成 路由对象 
        const route = this.router.match(location, this.current)

        this.confirmTransition(route, () => {
            this.updateRoute(route);
            // 调用用户或者transitionTo中定义的 onComplete 回调函数
            onComplete && onComplete(route)
            this.ensureURL();
            // fire ready cbs once
            if (!this.ready) {
                this.ready = true
                this.readyCbs.forEach(cb => { cb(route) })
            }
        }, err => {
            // 执行用户定义的onAbort方法
            if (onAbort) {
                onAbort(err)
            }
            // 执行 onReady方法，因为可能初始化的时候就about了而不是onComplete
            if (err && !this.ready) {
                // 确保只执行一次ready方法
                this.ready = true
                this.readyErrorCbs.forEach(cb => { cb(err) })
            }
        })
    }

    confirmTransition(route: Route, onComplete: Function, onAbort ? : Function) {
        const current = this.current

        // 定义了 路由跳转失败的回调方法
        const abort = err => {
            // 如果 路由中间截止了 且abort(‘Error’) 那么就执行全局定义的router.onError()回调方法
            if (isError(err)) {
                if (this.errorCbs.length) {
                    // 执行error回调方法
                    this.errorCbs.forEach(cb => { cb(err) })
                } else {
                    // 否则只是警告而已
                    warn(false, 'uncaught error during route navigation:')
                    console.error(err)
                }
            }
            // 调用this.confirmTransition(xx , xx , err)
            onAbort && onAbort(err)
        }
        if (
            isSameRoute(route, current) &&
            // in the case the route map has been dynamically appended to
            route.matched.length === current.matched.length
        ) {
            // 修改当前的历史状态，不产生新的历史状态
            this.ensureURL()
            return abort()
        }
        // 获取当前路由跳转操作下 需要更新、激活、卸载的 RouteRecord对象
        const {
            updated,
            deactivated,
            activated
        } = resolveQueue(this.current.matched, route.matched)
        const queue: Array << ? NavigationGuard > = [].concat(
            // in-component leave guards
            // 处理组件内的路由离开守卫 beforeRouteLeave
            extractLeaveGuards(deactivated),
            // global before hooks
            // 处理 全局配置
            this.router.beforeHooks,
            // in-component update hooks
            // 处理组件内的路由离开守卫 beforeRouteUpdate
            extractUpdateHooks(updated),
            // in-config enter guards
            // 配置文件中的 beforeEnter
            activated.map(m => m.beforeEnter),
            // async components
            // 加载异步组件
            resolveAsyncComponents(activated)
        )
        this.pending = route

        /**
         * 
         * @param {*} hook    当前执行的钩子函数
         * @param {*} next    runQueue中定义的 () => { step(index+1) }用来执行下一个钩子函数
         */
        const iterator = (hook: NavigationGuard, next) => {
            {
                return abort()
            }
            try {
                //执行 钩子函数  to, from , next
                hook(route, current, (to: any) => {
                    // 如果我们在钩子函数中 next(false) 或者 next('xxx Error')。
                    // 这种情况没有调用next()  所以不会继续执行下面的钩子函数，整个跳转就会停止
                    if (to === false || isError(to)) {
                        // next(false) -> abort navigation, ensure current URL
                        this.ensureURL(true)
                        abort(to)
                    } else if (
                        typeof to === 'string' ||
                        (typeof to === 'object' && (
                            typeof to.path === 'string' ||
                            typeof to.name === 'string'
                        ))
                    ) {
                        // next('/') or next({ path: '/' }) -> redirect
                        abort()
                        if (typeof to === 'object' && to.replace) {
                            this.replace(to)
                        } else {
                            this.push(to)
                        }
                    } else {
                        // confirm transition and pass on the value
                        // 这时候to 没有啥屁用。
                        next(to)
                    }
                })
            } catch (e) {
                abort(e)
            }
        }



        runQueue(queue, iterator, () => {

            /*
                下面处理导航解析流程 的 7 -> 最后步骤
            */
            const postEnterCbs = []
            const isValid = () => this.current === route;
            // wait until async components are resolved before
            // extracting in-component enter guards
            // 获取到 组件中定义的 beforeRouteEnter钩子函数 (第7步)
            const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid);
            // 将 调用全局的 beforeResolve 添加到 队列中  (第8步)
            const queue = enterGuards.concat(this.router.resolveHooks);
            // 执行钩子函数队列
            runQueue(queue, iterator, () => {
                if (this.pending !== route) {
                    return abort()
                }
                this.pending = null
                onComplete(route)
                    // 用创建好的实例调用 beforeRouteEnter 守卫中传给 next 的回调函数。 (第12步)
                if (this.router.app) {
                    this.router.app.$nextTick(() => {
                        postEnterCbs.forEach(cb => { cb() })
                    })
                }
            })
        })
    }
    updateRoute(route: Route) {
        const prev = this.current;
        // 将跳转的路径routeRecord赋给current。
        this.current = route;

        // 执行 this.listen定义的路由的监听回调函数
        this.cb && this.cb(route)
            // 调用全局的 afterEach 钩子函数 (第10步)
        this.router.afterHooks.forEach(hook => {
            // 执行全局的 afterEach 钩子函数，这时候就咩有第三个参数 next 了
            hook && hook(route, prev)
        })
    }
}

/**
 * 处理base 属性
 * 如果存在 base  
 *    ‘base’ => '/base'
 *    '/base/'  => '/base'
 * 如果不存在base 属性
 *     base = '/'
 * 
 * @param {? string} base
 * @returns {string}
 */
function normalizeBase(base: ? string): string {
    if (!base) {
        if (inBrowser) {
            // respect <base> tag
            const baseEl = document.querySelector('base')
            base = (baseEl && baseEl.getAttribute('href')) || '/'
                // strip full URL origin
            base = base.replace(/^https?:\/\/[^\/]+/, '')
        } else {
            base = '/'
        }
    }
    // make sure there's the starting slash
    // 确保base属性 以‘/’开头, '/base'
    if (base.charAt(0) !== '/') {
        base = '/' + base
    }
    // remove trailing slash
    // 移除base属性末尾的 '/';  '/base/'  => '/base'
    return base.replace(/\/$/, '')
}


/**
 * 当前路由匹配的 路径record 数组与 新的路由路径record进行比较，判断那些是需要更新的，还是激活，还是卸载
    current  : [{ path : '/parent' }, { path : '/parent/qux/:quxId'}]
    next  : [{ path : '/parent' }, { path : '/parent/quy/:quyId'}]

    那么  
    {
        updated:      [{ path : '/parent' }],             //都存在的 就更新
        activated:    [{ path : '/parent/quy/:quyId'}],   // next存在 current不存在的 激活
        deactivated:  [{ path : '/parent/qux/:quxId'}]    // next不存在 current存在的 卸载
    }
 * @param {Array < RouteRecord >} current
 * @param {Array < RouteRecord >} next
 * @returns {{
 *     updated: Array < RouteRecord > ,
 *     activated: Array < RouteRecord > ,
 *     deactivated: Array < RouteRecord >
 * }}
 */
function resolveQueue(
    current: Array < RouteRecord > ,
    next: Array < RouteRecord >
): {
    updated: Array < RouteRecord > ,
    activated: Array < RouteRecord > ,
    deactivated: Array < RouteRecord >
} {
    let i
    const max = Math.max(current.length, next.length)
    for (i = 0; i < max; i++) {
        if (current[i] !== next[i]) {
            break
        }
    }
    return {
        updated: next.slice(0, i),
        activated: next.slice(i),
        deactivated: current.slice(i)
    }
}

/**
 * 处理路由组件上的钩子函数
 * 我们知道 路由route上支持命名视图，其定义在components属性上
 components : {
    default : App,
    b : threeComponent
 }

 * @param {Array < RouteRecord >} records              // 路由对象数组  [ route1, route2]
 * @param {string} name                                // 当前处理的卫士类型,如 beforeLeave
 * @param {Function} bind                              
 * @param {boolean} [reverse]                          // 是否反转
 * @returns {Array}
 */
function extractGuards(
    records: Array < RouteRecord > ,
    name: string,
    bind: Function,
    reverse ? : boolean
): Array << ? Function > {
    /*
        如 栗子中的 three12组件 其有两个命名视图 default 与 b ()
        default 没有定义 beforeRouteLeave 钩子
        b 中定义了 beforeRouteLeave 且为一个数组。

        那么 guards = [ parentdefault , default , [bind1, bind2]]

        即 [父component1 , 父component2 , 子component1 , 子component2[bind1, bind2] ]
    */
    const guards = flatMapComponents(records, (def, instance, match, key) => {
            // 获取组件上指定name的导航守卫钩子函数，如beforeRouteLeave,beforeRouteEnter,beforeRouteUpdate
            const guard = extractGuard(def, name)
                // 如果定义了此钩子函数
            if (guard) {
                // 说明钩子函数可以是数组类型
                return Array.isArray(guard) ?
                    guard.map(guard => bind(guard, instance, match, key)) :
                    bind(guard, instance, match, key)
            }
        })
        // 如果 是beforeRouteLeave  =》 [子component2-bind1, 子component2-bind2  , 子component1 , 父component2 , 父component1 ]
        // 其他 [父component1 , 父component2 , 子component1 , 子component2-bind1, 子component2-bind2]
    return flatten(reverse ? guards.reverse() : guards)
}

function extractGuard(
    def: Object | Function,
    key: string
): NavigationGuard | Array < NavigationGuard > {
    if (typeof def !== 'function') {
        // extend now so that global mixins are applied.
        def = _Vue.extend(def)
    }
    return def.options[key]
}

function extractLeaveGuards(deactivated: Array < RouteRecord > ): Array << ? Function > {
    return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
}

function extractUpdateHooks(updated: Array < RouteRecord > ): Array << ? Function > {
    return extractGuards(updated, 'beforeRouteUpdate', bindGuard)
}

/**
 * @description
 * @author guzhanghua
 * @param {NavigationGuard} guard                // 组件的钩子函数   如beforeRouteLeave,beforeRouteEnter,beforeRouteUpdate
 * @param {? _Vue} instance                      // 组件instance属性  m.instances[key]
 * @returns {? NavigationGuard}
 */
function bindGuard(guard: NavigationGuard, instance: ? _Vue): ? NavigationGuard {
    if (instance) {
        return function boundRouteGuard() {
            return guard.apply(instance, arguments)
        }
    }
}


/**
 * 定义处理组件 beforeRouteEnter的钩子函数
    beforeRouteEnter (to, from, next) {
        next(vm => {
            // 通过 `vm` 访问组件实例
        })
    }

 * @param {Array < RouteRecord >} activated
 * @param {Array < Function >} cbs
 * @param {() => boolean} isValid
 * @returns {Array}
 */
function extractEnterGuards(
    activated: Array < RouteRecord > ,
    cbs: Array < Function > , //用户自定义的beforeRouteEnter 钩子函数的回调函数
    isValid: () => boolean
) : Array << ? Function > {
    return extractGuards(activated, 'beforeRouteEnter', (guard, _, match, key) => {
        return bindEnterGuard(guard, match, key, cbs, isValid)
    })
}

function bindEnterGuard(
    guard: NavigationGuard,
    match: RouteRecord,
    key: string,
    cbs: Array < Function > ,
    isValid: () => boolean
): NavigationGuard {
    return function routeEnterGuard(to, from, next) {
        return guard(to, from, cb => {
            next(cb)
            if (typeof cb === 'function') {
                // 将 回调给 next来访问组件实例 的next(cbs) 缓存起来，将来在this.router.app.$nextTick(() => {})去统一执行
                cbs.push(() => {
                    // #750
                    // if a router-view is wrapped with an out-in transition,
                    // the instance may not have been registered at this time.
                    // we will need to poll for registration until current route
                    // is no longer valid.
                    poll(cb, match.instances, key, isValid)
                })
            }
        })
    }
}

function poll(
    cb: any, // somehow flow cannot infer this is a function
    instances: Object,
    key: string,
    isValid: () => boolean
) {
    if (
        instances[key] &&
        !instances[key]._isBeingDestroyed // do not reuse being destroyed instance
    ) {
        cb(instances[key])
    } else if (isValid()) {
        setTimeout(() => {
            poll(cb, instances, key, isValid)
        }, 16)
    }
}