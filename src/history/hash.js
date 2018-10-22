/* @flow */

import type Router from '../index'
import { History } from './base'
import { cleanPath } from '../util/path'
import { getLocation } from './html5'
import { setupScroll, handleScroll } from '../util/scroll'
import { pushState, replaceState, supportsPushState } from '../util/push-state'

export class HashHistory extends History {
    constructor(router: Router, base: ? string, fallback : boolean) {
        super(router, base)
            // check history fallback deeplinking
        if (fallback && checkFallback(this.base)) {
            return
        }
        ensureSlash()
    }

    // this is delayed until the app mounts
    // to avoid the hashchange listener being fired too early
    // 为了避免hashchange侦听器过早被触发，这将延迟到应用程序加载时才进行
    setupListeners() {
        const router = this.router
        const expectScroll = router.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll) {
            setupScroll()
        }

        window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', () => {
            const current = this.current
            // 确保hash的路径正确
            if (!ensureSlash()) {
                return
            }
            // 调用路由跳转方法
            this.transitionTo(getHash(), route => {
                if (supportsScroll) {
                    handleScroll(this.router, route, current, true)
                }
                if (!supportsPushState) {
                    replaceHash(route.fullPath)
                }
            })
        })
    }

    push(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
        const { current: fromRoute } = this
        this.transitionTo(location, route => {
            pushHash(route.fullPath)
            handleScroll(this.router, route, fromRoute, false)
            onComplete && onComplete(route)
        }, onAbort)
    }

    replace(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
        const { current: fromRoute } = this
        this.transitionTo(location, route => {
            replaceHash(route.fullPath)
            handleScroll(this.router, route, fromRoute, false)
            onComplete && onComplete(route)
        }, onAbort)
    }

    go(n: number) {
        window.history.go(n)
    }

    /**
     * 不管是 路由跳转成功还是被截止了，其都会执行以下 this.ensureURL()去操作以下浏览器的历史记录
     * 
     * @param {boolean} [push]      // 是 pushState 还是 replaceState 。即是否会产生历史记录
     * @memberof HashHistory
     */
    ensureURL(push ? : boolean) {
        // 获取当前路由对象的全路径
        const current = this.current.fullPath
            // 获取当前 URL 上的 路径如果不同 则参数了改变
            //  为什么不同的时候还要区分 是否会产生历史记录？
        if (getHash() !== current) {
            // this.ensureURL(true) // pushState去修改浏览器的历史状态
            push ? pushHash(current) : replaceHash(current)
        }
    }

    getCurrentLocation() {
        return getHash()
    }
}

function checkFallback(base) {
    const location = getLocation(base)
    if (!/^\/#/.test(location)) {
        window.location.replace(
            cleanPath(base + '/#' + location)
        )
        return true
    }
}

function ensureSlash(): boolean {
    // 获取当前hash上的路径
    const path = getHash()
        // 如果以 '/' 那么就是正确的
    if (path.charAt(0) === '/') {
        return true
    }
    replaceHash('/' + path)
    return false
}

/**
 * 获取当前URL上 hash的路径
    url : http://localhost:8080/bar#/parent
    return   '/parent' 
 * @author guzhanghua
 * @export
 * @returns {string}
 */
export function getHash(): string {
    // We can't use window.location.hash here because it's not
    // consistent across browsers - Firefox will pre-decode it!
    // 获取当前URL的全路径 http://localhost:8080/bar#/parent
    const href = window.location.href
        // 获取 #
    const index = href.indexOf('#')
        // 如果存在 # ,那么就返回 # 后的 字符串
    return index === -1 ? '' : href.slice(index + 1)
}

/**
 * 根据 path 生成hash的url路径
 *    
 * @author guzhanghua
 * @param {*} path
 * @returns
 */
function getUrl(path) {
    // 获取当前URL的全路径 http://localhost:8080/bar#parent
    const href = window.location.href
        // 获取 # 的下标
    const i = href.indexOf('#')
        // 如果存在 # 则 base = 'http://localhost:8080/bar' ; 如果没有 则是 全url路径
    const base = i >= 0 ? href.slice(0, i) : href
        // 生成带hash的 url路径   http://localhost:8080/bar#/parent
    return `${base}#${path}`
}

/**
 * 通过 pushState 去修改当前浏览器的状态，并产生新的历史记录
 * @param {*} path
 */
function pushHash(path) {
    // 判断是否执行 HTML5历史状态管理history 的 pushState
    if (supportsPushState) {
        // 支持就通过 getUrl生成新的地址，然后通过pushState去修改当前浏览器的状态，并产生新的历史记录
        pushState(getUrl(path))
    } else {
        // 不支持
        window.location.hash = path
    }
}
/**
 * 通过 replaceState 去修改当前浏览器的状态，并不产生新的历史记录
 * @param {*} path
 */
function replaceHash(path) {
    // 如果支持 pushState
    if (supportsPushState) {
         // 支持就通过 getUrl生成新的地址，然后通过replaceState去修改当前浏览器的状态，并不产生新的历史记录
        replaceState(getUrl(path))
    } else {
        window.location.replace(getUrl(path))
    }
}