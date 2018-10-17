import View from './components/view'
import Link from './components/link'

export let _Vue

/**
    Vue.use(VueRouter)的执行流程(VueRouter的注册流程)
 * @param {*} Vue
 * @returns
 */
export function install(Vue) {
    // 如果已经执行过Vue.use(VueRouter) return
    if (install.installed && _Vue === Vue) return

    install.installed = true
    // 缓存 Vue
    _Vue = Vue

    const isDef = v => v !== undefined

    const registerInstance = (vm, callVal) => {
        let i = vm.$options._parentVnode
        if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
            i(vm, callVal)
        }
    }

    Vue.mixin({
        beforeCreate() {
            if (isDef(this.$options.router)) {
                this._routerRoot = this
                this._router = this.$options.router
                this._router.init(this)
                Vue.util.defineReactive(this, '_route', this._router.history.current)
            } else {
                this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
            }
            registerInstance(this, this)
        },
        destroyed() {
            registerInstance(this)
        }
    })

    Object.defineProperty(Vue.prototype, '$router', {
        get() { return this._routerRoot._router }
    })

    Object.defineProperty(Vue.prototype, '$route', {
        get() { return this._routerRoot._route }
    })

    Vue.component('RouterView', View)
    Vue.component('RouterLink', Link)

    const strats = Vue.config.optionMergeStrategies
    // use the same hook merging strategy for route hooks
    strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}