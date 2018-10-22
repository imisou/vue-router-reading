import View from './components/view'
import Link from './components/link'

export let _Vue

/**
    1. Vue.use(VueRouter)的执行流程(VueRouter的注册流程)
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

    // 定义了全局混合方法，使得每一个组件都能获取到  this._routerRoot
    Vue.mixin({
        beforeCreate() {
            // 只有根组件才会 new Vue({ router })
            if (isDef(this.$options.router)) {
                this._routerRoot = this
                this._router = this.$options.router
                // 调用 router.init方法
                this._router.init(this)
                // 使得this.$route变成响应式的。 不然初始化以后 修改current即 当前的routeRecord this.$route不会修改
                Vue.util.defineReactive(this, '_route', this._router.history.current)
            } else {
                // 子组件通过 $parent去获取根组件上的 this._routerRoot
                this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
            }
            registerInstance(this, this)
        },
        destroyed() {
            registerInstance(this)
        }
    })

    // 注册两个组件中的变量 this.$router this.$route
    Object.defineProperty(Vue.prototype, '$router', {
        get() { return this._routerRoot._router }
    })

    Object.defineProperty(Vue.prototype, '$route', {
        get() { return this._routerRoot._route }
    })

    // 注册两个公共组件 
    Vue.component('RouterView', View)
    Vue.component('RouterLink', Link)

    const strats = Vue.config.optionMergeStrategies
    // use the same hook merging strategy for route hooks
    strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}