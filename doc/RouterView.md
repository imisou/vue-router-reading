<h1 style="text-align:center">RouterView详解</h1>

> <router-view> 组件是一个 functional 组件，渲染路径匹配到的视图组件。<router-view> 渲染的组件还可以内嵌自己的 <router-view>，根据嵌套路径，渲染嵌套组件。

##### 其关键点：

1. 命名视图
2. 组件的解耦
3. 匹配深度


## 源码阅读

```js
import { warn } from '../util/warn'
import { extend } from '../util/misc'

export default {
    name: 'RouterView',
    functional: true,
    props: {
        // 支持命名视图
        name: {
            type: String,
            default: 'default'
        }
    },
    render(_, { props, children, parent, data }) {
        // used by devtools to display a router-view badge
        data.routerView = true

        // directly use parent context's createElement() function
        // so that components rendered by router-view can resolve named slots
        // 直接使用父上下文的createElement()函数, 这样，router-view呈现的组件就可以解析指定的插槽
        // 获取父上下文的h
        const h = parent.$createElement
        // 获取name属性
        const name = props.name
        // 获取当前的路由对象
        const route = parent.$route
        const cache = parent._routerViewCache || (parent._routerViewCache = {})

        // determine current view depth, also check to see if the tree
        // has been toggled inactive but kept-alive.
        /* 
            确定当前视图的深度，也要检查树是否已切换为非活动但已激活。
            view-router 最主要的是  如何在嵌套路由和命名视图的时候 知道自己应该渲染哪一个视图？

            因为Vue的组件是以树的形式保存的，所以其向上进行遍历，如果遇到一个 祖先组件 其 parent.$vnode.data.routerView === true 
            那么说明此 祖先组件 也是一个 router-view 视图插槽，那么这时候 depth++ 就应该渲染当前route.matched 的第二个。
            然后继续向上直到找到 parent._routerRoot === parent 即 路由根组件

            route.matched 保存了当前路由匹配的路由对象，其顺序为 父在前子在后。  所以depth 其实就可以认为是 matched的下标

            inactive 的作用？

            在一个组件中可以存在多个视图插槽，如果某一个视图插槽的 组件节点 使用了 v-if 且为false 但是设置 keep-alive。 那么这时候其子孙节点应该不加载，
            所以这时候就是保存了其祖先节点是否是激活的状态。如果有一个不是激活的状态那么他就不应该渲染
         */
        let depth = 0
        let inactive = false
        while (parent && parent._routerRoot !== parent) {
            if (parent.$vnode && parent.$vnode.data.routerView) {
                depth++
            }
            // 组件节点存在不激活的状态  即 v-if='false' 
            // 那么这时候 这个视图插槽也不应该渲染
            if (parent._inactive) {
                inactive = true
            }
            parent = parent.$parent
        }
        // 保存 视图插槽的 深度
        data.routerViewDepth = depth

        // render previous view if the tree is inactive and kept-alive
        // 如果树为非活动的且kept-alive，则呈现前一个视图
        if (inactive) {
            return h(cache[name], data, children)
        }

        // 获取当前路由匹配路由 指定深度的 路由对象
        const matched = route.matched[depth];

        // render empty node if no matched route
        if (!matched) {
            cache[name] = null
            return h()
        }

        // 获取指定路由的 组件，并缓存到父组件的 parent._routerViewCache[name] 
        const component = cache[name] = matched.components[name]

        /*
            下面就是 将当前 view-router 占位符节点 渲染成指定的 component 组件
        
        */


        // attach instance registration hook
        // this will be called in the instance's injected lifecycle hooks
        //  附加实例注册钩子这将在实例注入的生命周期钩子中调用
        data.registerRouteInstance = (vm, val) => {
            // val could be undefined for unregistration
            const current = matched.instances[name]
            if (
                (val && current !== vm) ||
                (!val && current === vm)
            ) {
                matched.instances[name] = val
            }
        }

        // also register instance in prepatch hook
        // in case the same component instance is reused across different routes
        //  还可以在prepatch hook中注册实例，以防相同的组件实例在不同的路由中被重用
        ;
        (data.hook || (data.hook = {})).prepatch = (_, vnode) => {
            matched.instances[name] = vnode.componentInstance
        }

        // resolve props

        /*
            使用 props 将组件和路由解耦。

            我们获取 动态路由的参数是   this.$router.params.xxx;
            但是我们可以通过 props属性将其跟组件解耦，或变成组件的 props属性  props: ['xxx']

            如果设置成 true object function 那么这时候其将会作为 data.props
        */
        let propsToPass = data.props = resolveProps(route, matched.props && matched.props[name])
        if (propsToPass) {
            // clone to prevent mutation
            propsToPass = data.props = extend({}, propsToPass);

            // pass non-declared props as attrs
            const attrs = data.attrs = data.attrs || {}
            // 将matched.props 通过 attrs属性传递给子组件那样子组件就可以通过 props['id'...] 获取
            for (const key in propsToPass) {
                if (!component.props || !(key in component.props)) {
                    attrs[key] = propsToPass[key]
                    delete propsToPass[key]
                }
            }
        }

        return h(component, data, children)
    }
}


/**
 * 处理 view-router中 parmas 与组件进行解耦
 * 
    {
        path: '/user/:id',
        components: { default: User, sidebar: Sidebar },
        props: { default: true, sidebar: false }
    }

    props : Object   那么  User组件中  { props : ['id'] },   Sidebar组件 ： { this.$route.params.id}
    props : function 那么 
        props: { default: true, sidebar: (route) => {({ orderId : route.params.id })) } 那么 Sidebar组件 ：  { props : ['orderId'] }
    props : Boolean  
        props: true ;   这时候不区分命名视图，当前路由所有的视图都使用 { props : ['id'] }
            
 * @param {*} route
 * @param {*} config
 * @returns
 */
function resolveProps(route, config) {
    switch (typeof config) {
        case 'undefined':
            return
        case 'object':
            return config
        case 'function':
            return config(route)
        case 'boolean':
            return config ? route.params : undefined
        default:
            if (process.env.NODE_ENV !== 'production') {
                warn(
                    false,
                    `props in "${route.path}" is a ${typeof config}, ` +
                    `expecting an object, function or boolean.`
                )
            }
    }
}
```

### 1. 命名视图

> 什么是命名视图？ 

命名视图： 有时候想同时 (同级) 展示多个视图，而不是嵌套展示。这时候就可以通过命名视图在同级展示多个视图组件。

栗子：

```html
<!-- UserSettings.vue -->
<div>
  <h1>User Settings</h1>
  <NavBar/>
  <router-view/>
  <router-view name="helper"/>
</div>
```

```js
{
  path: '/settings',
  // 你也可以在顶级路由就配置命名视图
  component: UserSettings,
  children: [{
    path: 'emails',
    component: UserEmailsSubscriptions
  }, {
    path: 'profile',
    components: {
      default: UserProfile,
      helper: UserProfilePreview
    }
  }]
}
```
那么这时候 \<router-view/\>渲染的就是 UserProfile;\<router-view name="helper"/>渲染的是UserProfilePreview。

在阅读VueRouter的源码的时候知道对于视图其都存放在 route.components属性上，虽然我们常用component属性去加载一个组件，但是其还是作为route.components['default'] 上的 一个视图组件。

##### 那么\<router-view/\>如何知道自己渲染哪一个视图？

其实就是借助了name属性，其默认属性为default。

```js
// 获取name属性
const name = props.name
        
// 获取指定路由的 组件，并缓存到父组件的 parent._routerViewCache[name] 
const component = cache[name] = matched.components[name]
```
然后渲染组件。

### 2. 组件解耦

组件解耦，这是什么意思？ 其实这个意思很简单，就是让我们获取动态路由数据的时候不需要在组件中通过this.$route.params.xxx去获取属性的值，而是作为组件的一个props属性 { props: ['xxx']}。那么我们就可以直接 this.xxx 去获取这个值了。

[路由组件传参](https://router.vuejs.org/zh/guide/essentials/passing-props.html)

其实是否解耦不是在组件上设置，而是在路由上设置 props

```js
const User = {
  props: ['id'],
  template: '<div>User {{ id }}</div>'
}
const router = new VueRouter({
  routes: [
    { path: '/user/:id', component: User, props: true },

    // 对于包含命名视图的路由，你必须分别为每个命名视图添加 `props` 选项：
    {
      path: '/user/:id',
      components: { default: User, sidebar: Sidebar , menu : Menu },
      props: { default: true, sidebar: false , menu :   route => { route.params.id} }
    }
  ]
})
```
路由的props属性可以为undefined, Boolean,Object,Function中的一种。

下面看源码。

```js
// resolve props
/*
    使用 props 将组件和路由解耦。
    我们获取 动态路由的参数是   this.$router.params.xxx;
    但是我们可以通过 props属性将其跟组件解耦，或变成组件的 props属性  props: ['xxx']
    如果设置成 true object function 那么这时候其将会作为 data.props
*/
let propsToPass = data.props = resolveProps(route, matched.props && matched.props[name])
if (propsToPass) {
    // clone to prevent mutation
    propsToPass = data.props = extend({}, propsToPass);
    // pass non-declared props as attrs
    const attrs = data.attrs = data.attrs || {}
    // 将matched.props 通过 attrs属性传递给子组件那样子组件就可以通过 props['id'...] 获取
    for (const key in propsToPass) {
        // 如果组件上props没有定义此属性，那么就不需要传递 
        if (!component.props || !(key in component.props)) {
            // 存放在 data.attrs属性上，同时也可以覆盖 router-view id='xx'时定义的属性
            attrs[key] = propsToPass[key]
            delete propsToPass[key]
        }
    }
}
```

其第一步 使用 resolveProps 去解析路由上的此视图的 props值

```js
/**
 * 处理 view-router中 parmas 与组件进行解耦
 * 
    {
        path: '/user/:id',
        components: { default: User, sidebar: Sidebar },
        props: { default: true, sidebar: false }
    }

    props : Object   那么  User组件中  { props : ['id'] },   Sidebar组件 ： { this.$route.params.id}
    props : function 那么 
        props: { default: true, sidebar: (route) => {({ orderId : route.params.id })) } 那么 Sidebar组件 ：  { props : ['orderId'] }
    props : Boolean  
        props: true ;   这时候不区分命名视图，当前路由所有的视图都使用 { props : ['id'] }
            
 * @param {*} route
 * @param {*} config
 * @returns
 */
function resolveProps(route, config) {
    switch (typeof config) {
        case 'undefined':
            return
        case 'object':
            return config
        case 'function':
            return config(route)
        case 'boolean':
            return config ? route.params : undefined
        default:
            if (process.env.NODE_ENV !== 'production') {
                warn(
                    false,
                    `props in "${route.path}" is a ${typeof config}, ` +
                    `expecting an object, function or boolean.`
                )
            }
    }
}
```
然后生成propsToPass对象。

然后我们知道此时我们通过props传递路由动态props参数。父子组件也可以通过属性的方式传递。

```html
<router-view id='123'></router-view>
```
还有就是props属性从占位符到组件上是通过 data.attrs进行传递了。

所以其先获取routerView上原来的 attrs属性。 然后

```js
if (propsToPass) {
    // clone to prevent mutation
    propsToPass = data.props = extend({}, propsToPass);
    // pass non-declared props as attrs
    const attrs = data.attrs = data.attrs || {}
    // 将matched.props 通过 attrs属性传递给子组件那样子组件就可以通过 props['id'...] 获取
    for (const key in propsToPass) {
        // 如果组件上props没有定义此属性，那么就不需要传递 
        if (!component.props || !(key in component.props)) {
            // 存放在 data.attrs属性上，同时也可以覆盖 router-view id='xx'时定义的属性
            attrs[key] = propsToPass[key]
            delete propsToPass[key]
        }
    }
}
```

### 3. 匹配深度

什么是匹配深度？

```js
render(_, { props, children, parent, data }) {
    // used by devtools to display a router-view badge
    data.routerView = true

    // determine current view depth, also check to see if the tree
    // has been toggled inactive but kept-alive.
    /* 
        确定当前视图的深度，也要检查树是否已切换为非活动但已激活。
        view-router 最主要的是  如何在嵌套路由和命名视图的时候 知道自己应该渲染哪一个视图？
        因为Vue的组件是以树的形式保存的，所以其向上进行遍历，如果遇到一个 祖先组件 其 parent.$vnode.data.routerView === true 
        那么说明此 祖先组件 也是一个 router-view 视图插槽，那么这时候 depth++ 就应该渲染当前route.matched 的第二个。
        然后继续向上直到找到 parent._routerRoot === parent 即 路由根组件
        route.matched 保存了当前路由匹配的路由对象，其顺序为 父在前子在后。  所以depth 其实就可以认为是 matched的下标
        inactive 的作用？
        在一个组件中可以存在多个视图插槽，如果某一个视图插槽的 组件节点 使用了 v-if 且为false 但是设置 keep-alive。 那么这时候其子孙节点应该不加载，
        所以这时候就是保存了其祖先节点是否是激活的状态。如果有一个不是激活的状态那么他就不应该渲染
     */
    let depth = 0
    let inactive = false
    while (parent && parent._routerRoot !== parent) {
        if (parent.$vnode && parent.$vnode.data.routerView) {
            depth++
        }
        // 组件节点存在不激活的状态  即 v-if='false' 
        // 那么这时候 这个视图插槽也不应该渲染
        if (parent._inactive) {
            inactive = true
        }
        parent = parent.$parent
    }
    // 保存 视图插槽的 深度
    data.routerViewDepth = depth
    // render previous view if the tree is inactive and kept-alive
    // 如果树为非活动的且kept-alive，则呈现前一个视图
    if (inactive) {
        return h(cache[name], data, children)
    }
    // 获取当前路由匹配路由 指定深度的 路由对象
    const matched = route.matched[depth];
    // render empty node if no matched route
    if (!matched) {
        cache[name] = null
        return h()
    }

    return h(component, data, children)
}
```

其通过data.routerView = true 标记当前组件为 routerView组件，然后通过向上遍历查找，如果遇到parent.$vnode.data.routerView 那么说明其存在 父RouterView ，继续向上直到找到 parent._routerRoot === parent 即 路由根组件。

这样depth 就标记出当前RouterView的深度。

然后 route.matched 保存了当前路由匹配的路由对象，其顺序为 父在前子在后。  所以depth 其实就可以认为是 matched的下标。

我们我们就知道 depth 就可以作为 matched的下标，从而获取到当前深度的组件对象