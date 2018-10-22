/* @flow */

import Regexp from 'path-to-regexp'
import { cleanPath } from './util/path'
import { assert, warn } from './util/warn'



/**
 * 创建路由的3个对象  pathMap、 pathList 、nameMap
 * @param {Array < RouteConfig >} routes
 * @param {Array < string >} [oldPathList]
 * @param {Dictionary < RouteRecord >} [oldPathMap]
 * @param {Dictionary < RouteRecord >} [oldNameMap]
 * @returns {{
 *     pathList: Array < string > ;
 *     pathMap: Dictionary < RouteRecord > ;
 *     nameMap: Dictionary < RouteRecord > ;
 * }}
 */
export function createRouteMap(
    routes: Array < RouteConfig > ,
    oldPathList ? : Array < string > ,
    oldPathMap ? : Dictionary < RouteRecord > ,
    oldNameMap ? : Dictionary < RouteRecord >
): {
    pathList: Array < string > ;
    pathMap: Dictionary < RouteRecord > ;
    nameMap: Dictionary < RouteRecord > ;
} {
    // the path list is used to control path matching priority
    const pathList: Array < string > = oldPathList || [];
    // $flow-disable-line
    const pathMap: Dictionary < RouteRecord > = oldPathMap || Object.create(null);
    // $flow-disable-line
    const nameMap: Dictionary < RouteRecord > = oldNameMap || Object.create(null);

    routes.forEach(route => {
        // 深度遍历路由配置属性，将其转换成 routeRecord 树
        addRouteRecord(pathList, pathMap, nameMap, route)
    })

    // ensure wildcard routes are always at the end
    for (let i = 0, l = pathList.length; i < l; i++) {
        if (pathList[i] === '*') {
            pathList.push(pathList.splice(i, 1)[0])
            l--
            i--
        }
    }

    return {
        pathList,
        pathMap,
        nameMap
    }
}


/**
 * xxx
  route : {
    path: string;
    component?: Component;
    name?: string; // 命名路由
    components?: { [name: string]: Component }; // 命名视图组件
    redirect?: string | Location | Function;
    props?: boolean | string | Function;
    alias?: string | Array<string>;
    children?: Array<RouteConfig>; // 嵌套路由
    beforeEnter?: (to: Route, from: Route, next: Function) => void;
    meta?: any;

    // 2.6.0+
    caseSensitive?: boolean; // 匹配规则是否大小写敏感？(默认值：false)
    pathToRegexpOptions?: Object; // 编译正则的选项
  }

  通过深度遍历的方式 将routes属性对象转换成
  pathList : ["", "/parent/", "/parent/foo", "/baz", "/parent/qux/:quxId/quux", "/parent/qux/:quxId", "/parent/quy/:quyId", "/parent/zap/:zapId?", "/parent"]
  pathMap : {      // 按照全路径为key 保存所有的路由对象
     "" : {
       path:'',  regex: '/^(?:\/(?=$))?$/i',...
     }
  }
  nameMap:{        // 按照route的name为key 保存所有的路由对象
    'name1':{ xxxx}
  }

 * @param {Array < string >} pathList
 * @param {Dictionary < RouteRecord >} pathMap
 * @param {Dictionary < RouteRecord >} nameMap
 * @param {RouteConfig} route
 * @param {RouteRecord} [parent]
 * @param {string} [matchAs]
 */
function addRouteRecord(
    pathList: Array < string > ,
    pathMap: Dictionary < RouteRecord > ,
    nameMap: Dictionary < RouteRecord > ,
    route: RouteConfig,
    parent ? : RouteRecord,
    matchAs ? : string
) {
    // 获取 route 的 path 和 name属性
    const { path, name } = route
    if (process.env.NODE_ENV !== 'production') {
        assert(path != null, `"path" is required in a route configuration.`)
        assert(
            typeof route.component !== 'string',
            `route config "component" for path: ${String(path || name)} cannot be a ` +
            `string id. Use an actual component instead.`
        )
    }

    const pathToRegexpOptions: PathToRegexpOptions = route.pathToRegexpOptions || {}

    // 获取当前路由的 全路径
    const normalizedPath = normalizePath(
        path,
        parent,
        pathToRegexpOptions.strict
    )

    if (typeof route.caseSensitive === 'boolean') {
        pathToRegexpOptions.sensitive = route.caseSensitive
    }

    const record: RouteRecord = {
        path: normalizedPath,
        regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
        components: route.components || { default: route.component },
        instances: {},
        name,
        parent,                             // 当前路由RouteRecord的父路由RouteRecord对象
        matchAs,
        redirect: route.redirect,
        beforeEnter: route.beforeEnter,
        meta: route.meta || {},
        props: route.props == null ? {} : route.components ?
            route.props : { default: route.props }
    }

    if (route.children) {
        // Warn if route is named, does not redirect and has a default child route.
        // If users navigate to this route by name, the default child will
        // not be rendered (GH Issue #629)
        if (process.env.NODE_ENV !== 'production') {
            if (route.name && !route.redirect && route.children.some(child => /^\/?$/.test(child.path))) {
                warn(
                    false,
                    `Named Route '${route.name}' has a default child route. ` +
                    `When navigating to this named route (:to="{name: '${route.name}'"), ` +
                    `the default child route will not be rendered. Remove the name from ` +
                    `this route and use the name of the default child route for named ` +
                    `links instead.`
                )
            }
        }
        route.children.forEach(child => {
            const childMatchAs = matchAs ?
                cleanPath(`${matchAs}/${child.path}`) :
                undefined
            addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
        })
    }

    if (route.alias !== undefined) {
        const aliases = Array.isArray(route.alias) ?
            route.alias : [route.alias]

        aliases.forEach(alias => {
            const aliasRoute = {
                path: alias,
                children: route.children
            }
            addRouteRecord(
                pathList,
                pathMap,
                nameMap,
                aliasRoute,
                parent,
                record.path || '/' // matchAs
            )
        })
    }

    if (!pathMap[record.path]) {
        pathList.push(record.path)
        pathMap[record.path] = record
    }

    if (name) {
        if (!nameMap[name]) {
            nameMap[name] = record
        } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
            warn(
                false,
                `Duplicate named routes definition: ` +
                `{ name: "${name}", path: "${record.path}" }`
            )
        }
    }
}

function compileRouteRegex(path: string, pathToRegexpOptions: PathToRegexpOptions): RouteRegExp {
    const regex = Regexp(path, [], pathToRegexpOptions)
    if (process.env.NODE_ENV !== 'production') {
        const keys: any = Object.create(null)
        regex.keys.forEach(key => {
            warn(!keys[key.name], `Duplicate param keys in route with path: "${path}"`)
            keys[key.name] = true
        })
    }
    return regex
}

/**
 * 生成路由的路径
  path : '/abz'   => '/abz'
  path : 'abz'，无父路由 => 'abz'
  path : 'aba'， 父路由path='p1'  =>    'p1/aba'
  
  特殊情况处理:
  path : '/abz/'   => '/abz'
  path : '/abz' , 父路由path='p1'  => '/abz' 变成根路径
  
 * @param {string} path
 * @param {RouteRecord} [parent]
 * @param {boolean} [strict]
 * @returns {string}
 */
function normalizePath(path: string, parent ? : RouteRecord, strict ? : boolean): string {
    // 移除路径末尾的/  即 '/abr/' => '/abr'
    if (!strict) path = path.replace(/\/$/, '');
    // 以 / 开头的嵌套路径会被当作根路径。 这让你充分的使用嵌套组件而无须设置嵌套的路径。
    // 如果path以/开头说明是 绝对路径
    if (path[0] === '/') return path;
    // 如果没有父路径，那么说明这是第一层路径 直接以此为路径
    if (parent == null) return path;
    // 处理其他的 嵌套路由
    // cleanPath 是将路由中 // 替换成 /
    return cleanPath(`${parent.path}/${path}`)
}