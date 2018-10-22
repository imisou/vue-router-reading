/* @flow */

import type VueRouter from '../index'
import { parsePath, resolvePath } from './path'
import { resolveQuery } from './query'
import { fillParams } from './params'
import { warn } from './warn'
import { extend } from './misc'


/**
 * 格式化路径

 * @param {RawLocation} raw           跳转的路由的路径,其可以直接为一个路径字符串，也可以为一个路径对象location
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
    // 处理只修改动态路由上的动态参数的情况， 这时候只传params 而没有 path name等属性
    if (!next.path && next.params && current) {
        // 复制一份
        next = extend({}, next)
        next._normalized = true;

        // 处理当存在多个动态参数的时候，只传递了一个，而其他的参数不修改
        //  如 /order/:order/:orderType      /order/12/1 => { params : { orderType : 2}}
        const params: any = extend(extend({}, current.params), next.params)
            // 如果当前的是明码路由，那么也保持原来的命名
        if (current.name) {
            next.name = current.name
                // 目标路由对象params 修改成 完整的 参数
            next.params = params
        } else if (current.matched.length) {
            // 如果存在 匹配的 路由对象，那么就获取 最后一个路由(完整路由)的路径配置属性 
            const rawPath = current.matched[current.matched.length - 1].path;
            // 将当前的参数 填充到 路径配置属性rawPath中，形成真正的路径
            next.path = fillParams(rawPath, params, `path ${current.path}`)
        } else if (process.env.NODE_ENV !== 'production') {
            warn(false, `relative params navigation requires a current route.`)
        }
        return next
    }

    // 解析路径 获取路径的query、hash 、path
    const parsedPath = parsePath(next.path || '');
    // 当前路由 的路径
    const basePath = (current && current.path) || '/'

    const path = parsedPath.path ?
        resolvePath(parsedPath.path, basePath, append || next.append) :
        basePath;

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