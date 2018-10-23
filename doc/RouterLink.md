# view-link详解

> <router-link> 组件支持用户在具有路由功能的应用中 (点击) 导航。 通过 to 属性指定目标地址，默认渲染成带有正确链接的 <a> 标签，可以通过配置 tag 属性生成别的标签.。另外，当目标路由成功激活时，链接元素自动设置一个表示激活的 CSS 类名。

##### <router-link> 比起写死的 \<a href="..."\> 会好一些，理由如下：

- 无论是 HTML5 history 模式还是 hash 模式，它的表现行为一致，所以，当你要切换路由模式，或者在 IE9 降级使用 hash 模式，无须作任何变动。
- 在 HTML5 history 模式下，router-link 会守卫点击事件，让浏览器不再重新加载页面。
- 当你在 HTML5 history 模式下使用 base 选项之后，所有的 to 属性都不需要写 (基路径) 了。

## 源码详解

```js
/* @flow */

import { createRoute, isSameRoute, isIncludedRoute } from '../util/route'
import { extend } from '../util/misc'

// work around weird flow bug
const toTypes: Array < Function > = [String, Object]
const eventTypes: Array < Function > = [String, Array]

export default {
    name: 'RouterLink',
    props: {
        // 表示目标路由的链接 可以为字符串或者 location对象
        to: {
            type: toTypes,
            required: true
        },
        // router-link 渲染成标签名
        tag: {
            type: String,
            default: 'a'
        },
        exact: Boolean,
        // 在 当前路径前添加基路径 append 的时候 to="/a/b" => '/base/a/b'
        append: Boolean,
        // 是否调用router.replace 而不是 router.push()
        replace: Boolean,
        // 设置 链接激活时使用的 CSS 类名。
        activeClass: String,
        // 配置当链接被精确匹配的时候应该激活的 clas
        exactActiveClass: String,
        // 用来触发导航的事件。可以是一个字符串或是一个包含字符串的数组
        event: {
            type: eventTypes,
            default: 'click'
        }
    },
    render(h: Function) {
        // 获取路由上的 router
        const router = this.$router
        const current = this.$route

        // 根据当前的 to 的路径，解析出目标路由的路由信息
        const { location, route, href } = router.resolve(this.to, current, this.append)

        // 激活的样式 处理
        const classes = {};
        // 获取全局配置的 向下匹配激活class
        const globalActiveClass = router.options.linkActiveClass;
        // 获取全局配置的 精确匹配激活class
        const globalExactActiveClass = router.options.linkExactActiveClass;
        // Support global empty active class 如果没有设置  就默认为 router-link-active
        const activeClassFallback = globalActiveClass == null ?
            'router-link-active' :
            globalActiveClass;
        const exactActiveClassFallback = globalExactActiveClass == null ?
            'router-link-exact-active' :
            globalExactActiveClass
        const activeClass = this.activeClass == null ?
            activeClassFallback :
            this.activeClass
        const exactActiveClass = this.exactActiveClass == null ?
            exactActiveClassFallback :
            this.exactActiveClass;

        //将当前的位置对象 转换成route 路由对象
        const compareTarget = location.path ?
            createRoute(null, location, null, router) :
            route;

        // 判断当前路由与 link 的路由对象是否相同
        classes[exactActiveClass] = isSameRoute(current, compareTarget);

        // 如果设置了 exact 那么 activeClass 也是exactActiveClass，否则用路由包含判断
        classes[activeClass] = this.exact ?
            classes[exactActiveClass] :
            isIncludedRoute(current, compareTarget);


        /*
            处理 event 属性
        */
        const handler = e => {
            if (guardEvent(e)) {
                // 如果 设置了replace 则使用 replace 
                if (this.replace) {
                    router.replace(location)
                } else {
                    router.push(location)
                }
            }
        }

        const on = { click: guardEvent }
        if (Array.isArray(this.event)) {
            this.event.forEach(e => { on[e] = handler })
        } else {
            on[this.event] = handler
        }

        /*
            处理 tag 属性
        */
        const data: any = {
            class: classes
        }
        // 如果tag为 a标签 则 事件和 属性全放在a标签上
        if (this.tag === 'a') {
            data.on = on
            data.attrs = { href }
        } else {
            // 如果是其他的标签 tag = 'div' 那么去寻找第一个后代 a标签将 事件、href 放在a标签上
            // find the first <a> child and apply listener and href
            const a = findAnchor(this.$slots.default)
            if (a) {
                // in case the <a> is a static node
                a.isStatic = false
                const aData = a.data = extend({}, a.data)
                aData.on = on
                const aAttrs = a.data.attrs = extend({}, a.data.attrs)
                aAttrs.href = href
            } else {
                // doesn't have <a> child, apply listener to self
                data.on = on
            }
        }

        return h(this.tag, data, this.$slots.default)
    }
}

function guardEvent(e) {
    // don't redirect with control keys 
    // 不要使用控制键重定向
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
    // don't redirect when preventDefault called
    // 防止 默认事件触发 
    if (e.defaultPrevented) return;
    // don't redirect on right click
    // 防止右键触发
    if (e.button !== undefined && e.button !== 0) return
        // don't redirect if `target="_blank"`
        // 如果 设置了 target="_blank"
    if (e.currentTarget && e.currentTarget.getAttribute) {
        const target = e.currentTarget.getAttribute('target')
        if (/\b_blank\b/i.test(target)) return
    }
    // this may be a Weex event which doesn't have this method
    if (e.preventDefault) {
        e.preventDefault()
    }
    return true
}


/*
    找寻到 RouterLink下第一个 a标签
*/
function findAnchor(children) {
    if (children) {
        let child
        for (let i = 0; i < children.length; i++) {
            child = children[i]
            if (child.tag === 'a') {
                return child
            }
            if (child.children && (child = findAnchor(child.children))) {
                return child
            }
        }
    }
}
```

对于RouterLink我们需要了解的其实主要是两个问题。

### 1. 如何实现链接的跳转？

这个其实很简单，还是使用了 this.$router.push() replace()两个方法，然后通过 to、replace、append3个属性来生成跳转需要的数据。

如
```js
// 根据当前的 to 的路径，解析出目标路由的路由信息
const { location, route, href } = router.resolve(this.to, current, this.append)
```
先通过this.to、this.append 生成跳转路径的location对象数据。

然后通过 事件绑定的方法
```js
/*
    处理 event 属性
*/
const handler = e => {
    if (guardEvent(e)) {
        // 如果 设置了replace 则使用 replace 
        if (this.replace) {
            router.replace(location)
        } else {
            router.push(location)
        }
    }
}
const on = { click: guardEvent }
if (Array.isArray(this.event)) {
    this.event.forEach(e => { on[e] = handler })
} else {
    on[this.event] = handler
}
```
将  router.replace(location)、router.push(location)生成事件处理函数。

### 2. activeClass、exactActiveClass 激活状态的判断

链接激活属性的判断主要涉及到 exact、activeClass、exactActiveClass这3个属性。

同样在一开始的时候就可以通过 to属性、append属性生成目标路径的路由信息
```js
// 根据当前的 to 的路径，解析出目标路由的路由信息
const { location, route, href } = router.resolve(this.to, current, this.append)
```
然后通过 isSameRoute(current, compareTarget) 、 isIncludedRoute(current, compareTarget)来判断目标路径是当前路由的关系：精确匹配还是包含。

其中激活状态class 的配置分为3个地方。
- 一个系统默认的 'router-link-active' 、'router-link-exact-active'
- 全局配置的 router.options.linkActiveClass、router.options.linkExactActiveClass

```js
var router = new VueRouter({
    mode:"hash",
    linkActiveClass : 'router-active-link-class',
    linkExactActiveClass : 'router-exact-active-link-class',
})
```
- 当前组件定义的 active-class="current-link-active" exact-active-class="current-exact-active-link-class"

```html
<router-link to="home" active-class="current-link-active" exact-active-class="current-exact-active-link-class">Home</router-link>
```
