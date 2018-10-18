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
    setupListeners() {
        const router = this.router
        const expectScroll = router.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll) {
            setupScroll()
        }

        window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', () => {
            const current = this.current
            if (!ensureSlash()) {
                return
            }
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

    ensureURL(push ? : boolean) {
        const current = this.current.fullPath
        if (getHash() !== current) {
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

function pushHash(path) {
    if (supportsPushState) {
        pushState(getUrl(path))
    } else {
        window.location.hash = path
    }
}

function replaceHash(path) {
    // 如果支持 pushState
    if (supportsPushState) {
        replaceState(getUrl(path))
    } else {
        window.location.replace(getUrl(path))
    }
}