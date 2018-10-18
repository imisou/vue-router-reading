/* @flow */

import type VueRouter from '../index'
import { parsePath, resolvePath } from './path'
import { resolveQuery } from './query'
import { fillParams } from './params'
import { warn } from './warn'
import { extend } from './misc'


/**
 * 格式化路径

 * @param {RawLocation} raw           跳转的路由的路径
 * @param {? Route} current           当前路由的 route对象
 * @param {? boolean} append
 * @param {? VueRouter} router
 * @returns {Location}
 */
export function normalizeLocation(
    raw: RawLocation,
    current: ? Route,
    append : ? boolean,
    router : ? VueRouter
): Location {
    // 生成跳转路由的 路径对象
    let next: Location = typeof raw === 'string' ? { path: raw } : raw

    // named target
    if (next.name || next._normalized) {
        return next
    }

    // relative params
    if (!next.path && next.params && current) {
        next = extend({}, next)
        next._normalized = true
        const params: any = extend(extend({}, current.params), next.params)
        if (current.name) {
            next.name = current.name
            next.params = params
        } else if (current.matched.length) {
            const rawPath = current.matched[current.matched.length - 1].path
            next.path = fillParams(rawPath, params, `path ${current.path}`)
        } else if (process.env.NODE_ENV !== 'production') {
            warn(false, `relative params navigation requires a current route.`)
        }
        return next
    }

    // 解析路径 获取路径的query、hash 、path
    const parsedPath = parsePath(next.path || '')
    // 当前路由 的路径
    const basePath = (current && current.path) || '/'
   
    const path = parsedPath.path ?
        resolvePath(parsedPath.path, basePath, append || next.append) :
        basePath
    
        // 处理 路由中的参数  path 、 query
    const query = resolveQuery(
        parsedPath.query,
        next.query,
        router && router.options.parseQuery
    )
    
    // 处理 hash
    let hash = next.hash || parsedPath.hash
    if (hash && hash.charAt(0) !== '#') {
        hash = `#${hash}`
    }
    // 生成最终的路由处理后的 路径、参数、hash
    return {
        _normalized: true,
        path,
        query,
        hash
    }
}