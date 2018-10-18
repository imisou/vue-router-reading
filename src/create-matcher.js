/* @flow */

import type VueRouter from './index'
import { resolvePath } from './util/path'
import { assert, warn } from './util/warn'
import { createRoute } from './util/route'
import { fillParams } from './util/params'
import { createRouteMap } from './create-route-map'
import { normalizeLocation } from './util/location'

export type Matcher = {
    match: (raw: RawLocation, current ? : Route, redirectedFrom ? : Location) => Route;
    addRoutes: (routes: Array < RouteConfig > ) => void;
};

export function createMatcher(
    routes: Array < RouteConfig > ,
    router: VueRouter
): Matcher {
    const { pathList, pathMap, nameMap } = createRouteMap(routes)

    function addRoutes(routes) {
        createRouteMap(routes, pathList, pathMap, nameMap)
    }



    /**
     * 根据路径匹配路由
     * @param {RawLocation} raw                当前URL上路由路径  '/parent'
     * @param {Route} [currentRoute]           当前路由route对象  默认为  createRoute(null,{path:"/"})
     * @param {Location} [redirectedFrom]
     * @returns {Route}
     */
    function match(
        raw: RawLocation,
        currentRoute ? : Route,
        redirectedFrom ? : Location
    ): Route {
        // 处理 路径，生成路径对象的 path query hash
        const location = normalizeLocation(raw, currentRoute, false, router)
        // 获取name属性
        const { name } = location
        // 如果跳转以name为路径
        if (name) {
            // 获取 record对象
            const record = nameMap[name]
            if (process.env.NODE_ENV !== 'production') {
                warn(record, `Route with name '${name}' does not exist`)
            }
            // 如果不存在 此命名路由 则创建一个 基础路由
            if (!record) return _createRoute(null, location)

            // 动态路由参数 处理 如  'quy/:quyId'  params = ['quyId']
            const paramNames = record.regex.keys
                .filter(key => !key.optional)
                .map(key => key.name)

            if (typeof location.params !== 'object') {
                location.params = {}
            }

            if (currentRoute && typeof currentRoute.params === 'object') {
                for (const key in currentRoute.params) {
                    if (!(key in location.params) && paramNames.indexOf(key) > -1) {
                        location.params[key] = currentRoute.params[key]
                    }
                }
            }

            if (record) {
                // 将动态路由解析成真正的路径   'quy/:quyId'  => '/parent/quy/123'
                location.path = fillParams(record.path, location.params, `named route "${name}"`)
                return _createRoute(record, location, redirectedFrom)
            }
        } else if (location.path) {
            // 如果不是按照命名路由 而是通过路径的方式跳转
            location.params = {}
            for (let i = 0; i < pathList.length; i++) {
                // 
                const path = pathList[i]
                const record = pathMap[path]
                if (matchRoute(record.regex, location.path, location.params)) {
                    return _createRoute(record, location, redirectedFrom)
                }
            }
        }
        // no match
        return _createRoute(null, location)
    }

    function redirect(
        record: RouteRecord,
        location: Location
    ): Route {
        const originalRedirect = record.redirect
        let redirect = typeof originalRedirect === 'function' ?
            originalRedirect(createRoute(record, location, null, router)) :
            originalRedirect

        if (typeof redirect === 'string') {
            redirect = { path: redirect }
        }

        if (!redirect || typeof redirect !== 'object') {
            if (process.env.NODE_ENV !== 'production') {
                warn(
                    false, `invalid redirect option: ${JSON.stringify(redirect)}`
                )
            }
            return _createRoute(null, location)
        }

        const re: Object = redirect
        const { name, path } = re
        let { query, hash, params } = location
        query = re.hasOwnProperty('query') ? re.query : query
        hash = re.hasOwnProperty('hash') ? re.hash : hash
        params = re.hasOwnProperty('params') ? re.params : params

        if (name) {
            // resolved named direct
            const targetRecord = nameMap[name]
            if (process.env.NODE_ENV !== 'production') {
                assert(targetRecord, `redirect failed: named route "${name}" not found.`)
            }
            return match({
                _normalized: true,
                name,
                query,
                hash,
                params
            }, undefined, location)
        } else if (path) {
            // 1. resolve relative redirect
            const rawPath = resolveRecordPath(path, record)
                // 2. resolve params
            const resolvedPath = fillParams(rawPath, params, `redirect route with path "${rawPath}"`)
                // 3. rematch with existing query and hash
            return match({
                _normalized: true,
                path: resolvedPath,
                query,
                hash
            }, undefined, location)
        } else {
            if (process.env.NODE_ENV !== 'production') {
                warn(false, `invalid redirect option: ${JSON.stringify(redirect)}`)
            }
            return _createRoute(null, location)
        }
    }

    function alias(
        record: RouteRecord,
        location: Location,
        matchAs: string
    ): Route {
        const aliasedPath = fillParams(matchAs, location.params, `aliased route with path "${matchAs}"`)
        const aliasedMatch = match({
            _normalized: true,
            path: aliasedPath
        })
        if (aliasedMatch) {
            const matched = aliasedMatch.matched
            const aliasedRecord = matched[matched.length - 1]
            location.params = aliasedMatch.params
            return _createRoute(aliasedRecord, location)
        }
        return _createRoute(null, location)
    }

    function _createRoute(
        record: ? RouteRecord,
        location : Location,
        redirectedFrom ? : Location
    ): Route {
        if (record && record.redirect) {
            return redirect(record, redirectedFrom || location)
        }
        if (record && record.matchAs) {
            return alias(record, location, record.matchAs)
        }
        return createRoute(record, location, redirectedFrom, router)
    }

    return {
        match,
        addRoutes
    }
}



/**
 * 用当前跳转的路径去 匹配pathMap中存储的所有的路径record
 
 * @param {RouteRegExp} regex         // 路径的正则
 * @param {string} path               // 当前跳转的路径
 * @param {Object} params             // 当前跳转的路径的动态参数
 * @returns {boolean}
 */
function matchRoute(
    regex: RouteRegExp,
    path: string,
    params: Object
): boolean {
    // 每一个路由recode的正则去匹配当前的路径
    const m = path.match(regex)
    // 如果为null 说明匹配失败
    if (!m) {
        return false
    } else if (!params) {
        return true
    }

    // 将路由匹配到的动态路由参数 存入到params中去
    for (let i = 1, len = m.length; i < len; ++i) {
        const key = regex.keys[i - 1]
        const val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i]
        if (key) {
            // Fix #1994: using * with props: true generates a param named 0
            params[key.name || 'pathMatch'] = val
        }
    }

    return true
}

function resolveRecordPath(path: string, record: RouteRecord): string {
    return resolvePath(path, record.parent ? record.parent.path : '/', true)
}