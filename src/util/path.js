/* @flow */


/**
 * 通过 parsePath 解析后的路径还是有好多种情况，如  '/abc' , 'abc' , ''
 * @author guzhanghua
 * @export
 * @param {string} relative
 * @param {string} base
 * @param {boolean} [append]
 * @returns {string}
 */
export function resolvePath(
    relative: string,
    base: string,
    append ? : boolean
): string {
    const firstChar = relative.charAt(0)
    // 处理第一种 parsePath 解析后的 path = '/abc'
    if (firstChar === '/') {
        return relative
    }
    // 处理第一种 parsePath 解析后的 path = '/abc'
    if (firstChar === '?' || firstChar === '#') {
        return base + relative
    }

    const stack = base.split('/')

    // remove trailing segment if:
    // - not appending
    // - appending to trailing slash (last segment is empty)
    if (!append || !stack[stack.length - 1]) {
        stack.pop()
    }

    // resolve relative path
    const segments = relative.replace(/^\//, '').split('/')
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        if (segment === '..') {
            stack.pop()
        } else if (segment !== '.') {
            stack.push(segment)
        }
    }

    // ensure leading slash
    if (stack[0] !== '') {
        stack.unshift('')
    }

    return stack.join('/')
}



/**
 * 根据URL或者传入的路径 path 解析出 路由的 hash query等数据
    对于 hashHistory ,path一般是 # 后面的字符串，所以没有hash

    如 http://localhost:8080/#/parent?id=1  此处 path = '/parent?id=1'

    http://localhost:8080/#/parent#/parent?id=1   此处 path = '/parent#/parent?id=1'

    /abc?foo=bar&baz=qux#hello        =>           { path : '/abc' , query : 'foo=bar&baz=qux' , hash : '#hello'}
    abc?foo=bar&baz=qux#hello         =>           { path : 'abc' , query : 'foo=bar&baz=qux' , hash : '#hello'}
    ?foo=bar&baz=qux#hello            =>           { path : '' , query : 'foo=bar&baz=qux' , hash : '#hello'}
    ''                                =>           { path : '' , query : '' , hash : ''}
    a                                 =>           { path : 'a' , query : '' , hash : ''}
    
 * @author guzhanghua
 * @export
 * @param {string} path
 * @returns {{
 *     path: string;                             // 路由的 路径
 *     query: string;                            // 路由的参数   'id=1&name=1231'
 *     hash: string;                             // 路由的hash值  对于History模式其还可以传递 hash 
 * }}
 */
export function parsePath(path: string): {
    path: string;                             // 路由的 路径
    query: string;
    hash: string;
} {
    let hash = ''
    let query = ''

    // 是否存在hash数据  # 如上面的第二个就存在
    const hashIndex = path.indexOf('#')
    if (hashIndex >= 0) {
        // 获取hash的值    #/parent?id=1'
        hash = path.slice(hashIndex)
        // 保存真正的路径     path = '/parent'
        path = path.slice(0, hashIndex)
    }

    // 路由的 参数 通过? 传递
    // 如上面的第二个  因为path变成了  /parent 所以就没有入参了
    const queryIndex = path.indexOf('?')
    if (queryIndex >= 0) {
        // 获取参数字符串   'id=1'
        query = path.slice(queryIndex + 1)
        // 获取真正的路径  
        path = path.slice(0, queryIndex)
    }

    return {
        path,
        query,
        hash
    }
}

/**
  清除全路径中 的 '/xxx//xx' => '/xxx/xx' 即将 // 转换成 /
 * @param {string} path
 * @returns {string}
 */
export function cleanPath(path: string): string {
    return path.replace(/\/\//g, '/')
}