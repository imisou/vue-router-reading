/* @flow */

import { inBrowser } from './dom'
import { saveScrollPosition } from './scroll'

/*
  判断是否支持 history 模式
 */
export const supportsPushState = inBrowser && (function() {
    const ua = window.navigator.userAgent

    if (
        (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
        ua.indexOf('Mobile Safari') !== -1 &&
        ua.indexOf('Chrome') === -1 &&
        ua.indexOf('Windows Phone') === -1
    ) {
        return false
    }

    return window.history && 'pushState' in window.history
})()

// use User Timing api (if present) for more accurate key precision
const Time = inBrowser && window.performance && window.performance.now ?
    window.performance :
    Date

let _key: string = genKey()

function genKey(): string {
    return Time.now().toFixed(3)
}

export function getStateKey() {
    return _key
}

export function setStateKey(key: string) {
    _key = key
}

/**
 * @通用的 修改浏览器状态的方法
 * @param {string} [url]              新的URL地址
 * @param {boolean} [replace]         是否参数历史记录
 */
export function pushState(url ? : string, replace ? : boolean) {
    saveScrollPosition();
    // try...catch the pushState call to get around Safari
    // DOM Exception 18 where it limits to 100 pushState calls
    const history = window.history
    try {

        if (replace) {
            // 只是替换当前的记录 而不会产生新的历史记录
            history.replaceState({ key: _key }, '', url)
        } else {
            // pushState  参数新的历史记录。
            _key = genKey()
            history.pushState({ key: _key }, '', url)
        }
    } catch (e) {
        window.location[replace ? 'replace' : 'assign'](url)
    }
}

/**
 * 通用的 修改浏览器状态的replaceState方法，并且不产生历史记录
 * @param {string} [url]
 */
export function replaceState(url ? : string) {
    pushState(url, true)
}