/* @flow */

import { warn } from './warn'

const encodeReserveRE = /[!'()*]/g
const encodeReserveReplacer = c => '%' + c.charCodeAt(0).toString(16)
const commaRE = /%2C/g

// fixed encodeURIComponent which is more conformant to RFC3986:
// - escapes [!'()*]
// - preserve commas
const encode = str => encodeURIComponent(str)
    .replace(encodeReserveRE, encodeReserveReplacer)
    .replace(commaRE, ',')

const decode = decodeURIComponent

/**
 * 处理  path ，query 多个地方定义的 参数合并成一个参数对象
  
    :to="{ path: '/parent?zap=3&id=1', query: { zap: 2,name : 'axz' }}"
    =》{zap: 2, id: "1", name: "axz"}
 * @author guzhanghua
 * @export
 * @param {? string} query
 * @param {Dictionary < string >} [extraQuery={}]
 * @param {? Function} _parseQuery
 * @returns {Dictionary < string >}
 */
export function resolveQuery(
    query: ? string,
    extraQuery : Dictionary < string > = {},
    _parseQuery: ? Function
): Dictionary < string > {
    const parse = _parseQuery || parseQuery
    let parsedQuery
    try {
        parsedQuery = parse(query || '')
    } catch (e) {
        process.env.NODE_ENV !== 'production' && warn(false, e.message)
        parsedQuery = {}
    }
    //   :to="{ path: '/parent?zap=3&id=1', query: { zapId: 2,name : 'axz' }}"
    //  parsedQuery 是path中解析的参数   {zap: "3", id: "1"}
    //  extraQuery 则是 query属性的值  { zapId: 2,name : 'axz' }
    // 此处将两个地方传入的参数 合并(以query属性的值为结果)
    for (const key in extraQuery) {
        parsedQuery[key] = extraQuery[key]
    }
    return parsedQuery
}

/**
 * 将 query 字符串解析成对象
 * foo=bar&baz=qux&id=1&id=1     =>       { 'foo' : 'bar', 'baz': 'qux',id:[1,1]}
 * 
 * @author guzhanghua
 * @param {string} query
 * @returns {Dictionary < string >}
 */
function parseQuery(query: string): Dictionary < string > {
    const res = {}
    // 先移除字符串开头的 ?|#|&
    query = query.trim().replace(/^(\?|#|&)/, '')

    if (!query) {
        return res
    }
    // 以& 分割字符串   foo=bar&baz=qux  => foo=bar and baz=qux 
    query.split('&').forEach(param => {
        // 再以=分割字符串  获取key value  
        const parts = param.replace(/\+/g, ' ').split('=')
        // 获取第一个值为 key,并解码  中文情况
        const key = decode(parts.shift())
        // 将value 保存为 'bar'
        const val = parts.length > 0 ?
            decode(parts.join('=')) :           //为什么用 'parts.join('=')  ，因为处理这种情况 'id=1=2'用户id的值为'1=2'但是此时上面parts以=分割成3个
            null
        // 如果是单个就直接是 字符串
        if (res[key] === undefined) {
            res[key] = val
        } else if (Array.isArray(res[key])) {
          // 多个相同的key 就保存为数组
            res[key].push(val)
        } else {
            res[key] = [res[key], val]
        }
    })

    return res
}

export function stringifyQuery(obj: Dictionary < string > ): string {
    const res = obj ? Object.keys(obj).map(key => {
        const val = obj[key]

        if (val === undefined) {
            return ''
        }

        if (val === null) {
            return encode(key)
        }

        if (Array.isArray(val)) {
            const result = []
            val.forEach(val2 => {
                if (val2 === undefined) {
                    return
                }
                if (val2 === null) {
                    result.push(encode(key))
                } else {
                    result.push(encode(key) + '=' + encode(val2))
                }
            })
            return result.join('&')
        }

        return encode(key) + '=' + encode(val)
    }).filter(x => x.length > 0).join('&') : null
    return res ? `?${res}` : ''
}