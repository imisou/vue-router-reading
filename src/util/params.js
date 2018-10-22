/* @flow */

import { warn } from './warn'
import Regexp from 'path-to-regexp'

// $flow-disable-line
const regexpCompileCache: {
    [key: string]: Function
} = Object.create(null)


/**
 * 按照params 填充 path 形成真正的路径字符串
 * @param {string} path
 * @param {? Object} params
 * @param {string} routeMsg
 * @returns {string}
 */
export function fillParams(
    path: string,
    params: ? Object,
    routeMsg : string
): string {
    try {
        const filler =
            regexpCompileCache[path] ||
            (regexpCompileCache[path] = Regexp.compile(path))
        return filler(params || {}, { pretty: true })
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
            warn(false, `missing param for ${routeMsg}: ${e.message}`)
        }
        return ''
    }
}