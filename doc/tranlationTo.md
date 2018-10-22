# transitionTo(核心)

在VueRouter经常使用的是路由的切换，即this.$router.push('/xx',onComputed,onAbout)。其核心代码就是调用的this.transitionTo()

###### 栗子代码

```js
const router = new VueRouter({
  mode: 'hash',
  base: "az",
  routes: [
    {
      path: '/two1',
      component: (resolve) => require(['./components/Second1.vue'], resolve),
      beforeEnter: (to, from, next) => {
        console.log('/Second1 beforeEnter');
        next();
      },
      children: [
        {
          path: 'three11',
          beforeEnter: (to, from, next) => {
            console.log('/Second1 three11 beforeEnter');
            next();
          },
          components: {
            default: (resolve) => require(['./components/three11.vue'], resolve),
            b: (resolve) => require(['./components/three12.vue'], resolve)
          }
        },
        {
          path: 'three12',
          components: {
            default: Default,
            b: (resolve) => require(['./components/three12.vue'], resolve)
          },
          beforeEnter: (to, from, next) => {
            console.log('/Second1 three11 beforeEnter');
            next();
          },
        }
      ]
    },
    {
      path: '/two2',
      component: (resolve) => require(['./components/Second2.vue'], resolve),
      beforeEnter: (to, from, next) => {
        console.log('/Second2 beforeEnter');
        next();
      },
      children: [
        {
          path: 'three21',
          components: {
            default: (resolve) => require(['./components/three21.vue'], resolve),
          },
          beforeEnter: (to, from, next) => {
            console.log('/Second2 three21 beforeEnter');
            next();
          },
        },
        {
          path: 'three22',
          components: {
            default: Default,

          },
          beforeEnter: (to, from, next) => {
            console.log('/Second2 three21 beforeEnter');
            next();
          },
        },
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  console.log('global beforeEach');
  next();
})
router.beforeResolve((to, from, next) => {
  console.log('global beforeResolve----------');
  next();
})

router.afterEach((to, from) => {
  console.log('global afterEach----------');
})
```

###### second1.vue
```html
<template>
  <div class="hello">
    <h1>this is second1</h1>
    <router-view class="view three" name="b"></router-view>
    <h5>this is second1 default</h5>
    <router-view class="view three"></router-view>
  </div>
</template>
<script>
export default {
  name: 'Second1',
  beforeRouteEnter(to, from, next) {
    // 在渲染该组件的对应路由被 confirm 前调用
    // 不！能！获取组件实例 `this`
    // 因为当守卫执行前，组件实例还没被创建
    console.log("Second1 is execute  beforeRouteEnter")
    next();
  },
  beforeRouteUpdate(to, from, next) {
    // 在当前路由改变，但是该组件被复用时调用
    // 举例来说，对于一个带有动态参数的路径 /foo/:id，在 /foo/1 和 /foo/2 之间跳转的时候，
    // 由于会渲染同样的 Foo 组件，因此组件实例会被复用。而这个钩子就会在这个情况下被调用。
    // 可以访问组件实例 `this`
    console.log("Second1 is execute  beforeRouteUpdate")
    next();
  },
  beforeRouteLeave(to, from, next) {
    // 导航离开该组件的对应路由时调用
    // 可以访问组件实例 `this`
    console.log("Second1 is execute  beforeRouteLeave")
    next();
  },
  data() {
    return {
      msg: 'Welcome to Your Vue.js App',

    }
  }
}

</script>

```

###### three1.vue
```html
<template>
  <div class="hello">
    <div>this is three11</div>
  </div>
</template>
<script>
export default {
  name: 'three11',
  beforeRouteEnter(to, from, next) {
    // 在渲染该组件的对应路由被 confirm 前调用
    // 不！能！获取组件实例 `this`
    // 因为当守卫执行前，组件实例还没被创建
    console.log("three11 is execute  beforeRouteEnter")
    next();
  },
  beforeRouteUpdate(to, from, next) {
    // 在当前路由改变，但是该组件被复用时调用
    // 举例来说，对于一个带有动态参数的路径 /foo/:id，在 /foo/1 和 /foo/2 之间跳转的时候，
    // 由于会渲染同样的 Foo 组件，因此组件实例会被复用。而这个钩子就会在这个情况下被调用。
    // 可以访问组件实例 `this`
    console.log("three11 is execute  beforeRouteUpdate")
    next();
  },
  beforeRouteLeave(to, from, next) {
    // 导航离开该组件的对应路由时调用
    // 可以访问组件实例 `this`
    console.log("three11 is execute  beforeRouteLeave")
    next();
  },
  data() {
    return {
      msg: 'Welcome to Your Vue.js App',

    }
  }
}
</script>
```

## 源码说明

当我们从 /two1/three11 切换到 /two1/three12 的时候，其调用方式可以为
```
<router-link to="/two1/three12">/two1/three12</router-link>
// ------
<router-link to="{path : '/two1/three12'}">/two1/three12</router-link>
```
在源码中可以看出 location就是 上面to的值，

所以location可以是一个字符串(路径)，或者一个对象 {path | name}去代表路径

```js
transitionTo(location: RawLocation, onComplete ? : Function, onAbort ? : Function) {
    //生成 路由对象 
    const route = this.router.match(location, this.current)
    
    this.confirmTransition(route, () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()
        // fire ready cbs once
        if (!this.ready) {
            this.ready = true
            this.readyCbs.forEach(cb => { cb(route) })
        }
    }, err => {
        if (onAbort) {
            onAbort(err)
        }
        if (err && !this.ready) {
            this.ready = true
            this.readyErrorCbs.forEach(cb => { cb(err) })
        }
    })
}
```
然后通过 this.router.match(location, this.current) 去处理路径。

对于Hash模式来说 this.router 是 new HashHistory(this, options.base, this.fallback)去传入的this 即VueRouter实例对象

###### src\index.js
```js
 match(
    raw: RawLocation,
    current ? : Route,
    redirectedFrom ? : Location
): Route {
    return this.matcher.match(raw, current, redirectedFrom)
}
```

this.matcher是通过createMatcher去生成的

###### src\create-matcher.js

```js
export function createMatcher(
    routes: Array < RouteConfig > ,
    router: VueRouter
): Matcher {
    const { pathList, pathMap, nameMap } = createRouteMap(routes)
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
    return {
        match,
        addRoutes
    }
}
```

match的过程

1. 通过normalizeLocation() 处理location ，将路径 path、name、query、params合并处理成一个{ _normalized: true,path,query,hash}对象。

2. 获取name属性，如果存在则以name去寻找路径匹配的； 没有name则以path去寻找匹配的路由对象。

3.  matchRoute() 将this.router.pathList中所有的路径的正则表达式去匹配当前的路径

```js
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
```

在栗子中pathList的值主要为
```
["", 
    "/two1/", 
    "/two1/three11", 
    "/two1/three12", 
    "/two1/three12/:id", 
    "/two1/bar", 
    "/baz",
    "/two1/qux/:quxId/quux", .......
]
```
我们跳转的路径为 '/two1/three12/123'。

然后通过每一个pathMap[path]获取到每一个路由的record对象，通过record.regxp去匹配'/two1/three12/123'，如果成功则说明当前切换跳转的路径就是此路径。

##### 那么父路由怎么处理？

我们知道在createMap的时候，将每一个子路由通过route.parent形成路径的树结构。那么这时候获取到匹配的路径record，然后通过 _createRoute()去处理当前获取的匹配路由。

如处理路由中的redirect alias等属性。

```js
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
```
然后createRoute(record, location, redirectedFrom, router)去真正的创建路径的routeRecord对象。

```js
export function createRoute(
    record: ? RouteRecord,
    location : Location,
    redirectedFrom ? : ? Location,
    router ? : VueRouter
): Route {
    const stringifyQuery = router && router.options.stringifyQuery

    let query: any = location.query || {}
    try {
        query = clone(query)
    } catch (e) {}

    const route: Route = {
        name: location.name || (record && record.name),
        meta: (record && record.meta) || {},
        path: location.path || '/',
        hash: location.hash || '',
        query,
        params: location.params || {},
        fullPath: getFullPath(location, stringifyQuery),
        matched: record ? formatMatch(record) : []
    }
    if (redirectedFrom) {
        route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
    }
    return Object.freeze(route)
}
```

其中最重要的 route.matched属性。其通过formatMatch(record)去进行处理

```js
function formatMatch(record: ? RouteRecord): Array < RouteRecord > {
    const res = []
    while (record) {
        res.unshift(record)
        record = record.parent
    }
    return res
}
```

通过formatMatch()我们就知道如何去获取父路由信息了。即循环处理record.parent。然后生成一个 父路由在前,子路由在后的数组对象

![image](https://note.youdao.com/yws/public/resource/63abdfdd5a66cd92841486eb258ffebc/xmlnote/EB3FE0D7F35D47BAB93BE30185287191/10987)

上面我们知道如果通过 const route = this.router.match(location, this.current) 去获取路由的routeRecord对象，和route.matched中的父子路由信息。下面我们说明confirmTransition()

## confirmTransition()

> 确定跳转，这就是真正的路由跳转，其设计到路由的导航卫士功能，所以需要结合其进行说明。

#### 导航卫士

我们知道VueRouter中可以在3个地方去定义路由的导航钩子函数。

1. 全局导航钩子。(在router上定义)
    1. router.beforeEach()。
    2. router.beforeResolve()。
    3. router.afterEach()。
2. 配置文件中的 
    1. beforeEnter: (to, from, next) => {}
3. 组件中的导航钩子
    1. beforeRouteEnter (to, from, next) {}
    2. beforeRouteUpdate (to, from, next) {}
    3. beforeRouteLeave (to, from, next) {}

#### 完整的导航解析流程

1. 导航被触发。
2. 在失活的组件里调用离开守卫。
3. 调用全局的 beforeEach 守卫。
4. 在重用的组件里调用 beforeRouteUpdate 守卫 (2.2+)。
5. 在路由配置里调用 beforeEnter。
6. 解析异步路由组件。
7. 在被激活的组件里调用 beforeRouteEnter。
8. 调用全局的 beforeResolve 守卫 (2.5+)。
9. 导航被确认。
10. 调用全局的 afterEach 钩子。
11. 触发 DOM 更新。
12. 用创建好的实例调用 beforeRouteEnter 守卫中传给 next 的回调函数。

我们就用上面的从 /two1/three11 跳转到 /two1/three12 进行说明

```js
confirmTransition(route: Route, onComplete: Function, onAbort ? : Function) {
    const current = this.current
    const abort = err => {
        ...
    }
    // 路由没修改
    ...
    // 获取当前路由跳转操作下 需要更新、激活、卸载的 RouteRecord对象
    const {
        updated,
        deactivated,
        activated
    } = resolveQueue(this.current.matched, route.matched)
    const queue: Array << ? NavigationGuard > = [].concat(
        // in-component leave guards
        // 处理组件内的路由离开守卫 beforeRouteLeave
        extractLeaveGuards(deactivated),
        // global before hooks
        // 处理 全局配置
        this.router.beforeHooks,
        // in-component update hooks
        // 处理组件内的路由离开守卫 beforeRouteUpdate
        extractUpdateHooks(updated),
        // in-config enter guards
        // 配置文件中的 beforeEnter
        activated.map(m => m.beforeEnter),
        // async components
        // 加载异步组件
        resolveAsyncComponents(activated)
    )
    this.pending = route
    const iterator = (hook: NavigationGuard, next) => {
        ...
    }
    runQueue(queue, iterator, () => {
        ...
    })
}
```

首先不看 定义的 about 、onComplete、onAbort等，和对路径没有修改情况的下的处理。

然后是
#### 1. 第一步: 获取当前路由跳转操作下 需要更新、激活、卸载的 RouteRecord对象

```js
const {
    updated,
    deactivated,
    activated
} = resolveQueue(this.current.matched, route.matched)

// ----------------    resolveQueue   ---------------------

/**
 * 当前路由匹配的 路径record 数组与 新的路由路径record进行比较，判断那些是需要更新的，还是激活，还是卸载
    current  : [{ path : '/parent' }, { path : '/parent/qux/:quxId'}]
    next  : [{ path : '/parent' }, { path : '/parent/quy/:quyId'}]

    那么  
    {
        updated:      [{ path : '/parent' }],             //都存在的 就更新
        activated:    [{ path : '/parent/quy/:quyId'}],   // next存在 current不存在的 激活
        deactivated:  [{ path : '/parent/qux/:quxId'}]    // next不存在 current存在的 卸载
    }
 * @param {Array < RouteRecord >} current
 * @param {Array < RouteRecord >} next
 * @returns {{
 *     updated: Array < RouteRecord > ,
 *     activated: Array < RouteRecord > ,
 *     deactivated: Array < RouteRecord >
 * }}
 */
function resolveQueue(
    current: Array < RouteRecord > ,
    next: Array < RouteRecord >
): {
    updated: Array < RouteRecord > ,
    activated: Array < RouteRecord > ,
    deactivated: Array < RouteRecord >
} {
    let i
    const max = Math.max(current.length, next.length)
    for (i = 0; i < max; i++) {
        if (current[i] !== next[i]) {
            break
        }
    }
    return {
        updated: next.slice(0, i),
        activated: next.slice(i),
        deactivated: current.slice(i)
    }
}
```
可见resolveQueue是将 this.current当前的路由对象、 next(即将跳转的路由对象)的matched进行比较。

即：![image](https://note.youdao.com/yws/public/resource/63abdfdd5a66cd92841486eb258ffebc/xmlnote/EB3FE0D7F35D47BAB93BE30185287191/10987)

发现如果相同的就是需要 updated，如果 current存在而next不存在的就是 activated；如果current不存在而next存在的就是 deactivated。从而生成一个需要更新、卸载、激活的对象。

#### 第二步： 生成组件卸载、更新、加载之前的钩子函数数组队列。

生成一个数组。其值的先后顺序分别是：(即完整的导航解析流程中的 2 -> 6)

1. 组件内的路由离开守卫 beforeRouteLeave
2. 全局配置router.beforeHooks
3. 组件内的路由离开守卫 beforeRouteUpdate
4. 配置文件中的 beforeEnter
5. 加载异步组件

```js
const queue: Array << ? NavigationGuard > = [].concat(
    // in-component leave guards
    // 处理组件内的路由离开守卫 beforeRouteLeave
    extractLeaveGuards(deactivated),
    // global before hooks
    // 处理 全局配置
    this.router.beforeHooks,
    // in-component update hooks
    // 处理组件内的路由离开守卫 beforeRouteUpdate
    extractUpdateHooks(updated),
    // in-config enter guards
    // 配置文件中的 beforeEnter
    activated.map(m => m.beforeEnter),
    // async components
    // 加载异步组件
    resolveAsyncComponents(activated)
)
```

##### 1. 组件内守卫钩子函数的处理(以extractLeaveGuards(deactivated)为例)

```js

// ----------------------  extractLeaveGuards  ----------------------------
function extractLeaveGuards(deactivated: Array < RouteRecord > ): Array << ? Function > {
    return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
}


// ----------------------  extractGuards  ----------------------------
/**
 * @description

 * @param {Array < RouteRecord >} records              // 路由对象数组  [ route1, route2]
 * @param {string} name                                // 当前处理的卫士类型,如 beforeLeave
 * @param {Function} bind                              
 * @param {boolean} [reverse]                          // 是否反转
 * @returns {Array}
 */
function extractGuards(
    records: Array < RouteRecord > ,   
    name: string,
    bind: Function,
    reverse ? : boolean
): Array << ? Function > {
    const guards = flatMapComponents(records, (def, instance, match, key) => {
        // 获取组件上指定name的导航守卫钩子函数，如beforeRouteLeave,beforeRouteEnter,beforeRouteUpdate
        const guard = extractGuard(def, name)
        // 如果定义了此钩子函数
        if (guard) {
            // 说明钩子函数可以是数组类型
            return Array.isArray(guard) ?
                guard.map(guard => bind(guard, instance, match, key)) :
                bind(guard, instance, match, key)
        }
    })
    return flatten(reverse ? guards.reverse() : guards)
}

// ----------------------  flatMapComponents  ----------------------------
/**
 * 根据命名视图组件，获取
 * 
  我们知道配置路由的数据的时候可以
  {
    component : App,

    components:{
      default : App,
      helper: UserProfilePreview
    }
  }
  这些都在createRouteMap的时候 转换为 routeRecord.components属性上
 * @param {Array < RouteRecord >} matched
 * @param {Function} fn
 * @returns {Array}
 */
export function flatMapComponents(
    matched: Array < RouteRecord > ,
    fn: Function
): Array << ? Function > {
    // 处理匹配到的路由 routeRecord 
    return flatten(matched.map(m => {
        // 处理routeRecord 上的 components属性，即命名视图
        // 如上面的   m.components = { default : App实例对象 ，  helper : UserProfilePreview}
        return Object.keys(m.components).map(key => fn(
            m.components[key],
            m.instances[key],
            m, key
        ))
    }))
}

// ----------------------  flatten  ----------------------------
export function flatten(arr: Array < any > ): Array < any > {
    return Array.prototype.concat.apply([], arr)
}
```

这一步比较绕。但是我们首先明白一点。我们怎么去定义组件内导航卫士钩子函数的。

```js
export default {
  name: 'three12',
  beforeRouteEnter: [(to, from, next) => {
    // 在渲染该组件的对应路由被 confirm 前调用
    // 不！能！获取组件实例 `this`
    // 因为当守卫执行前，组件实例还没被创建
    console.log("three1---2 ---arr1 is execute  beforeRouteEnter")
    next();
  }, (to, from, next) => {
    console.log("three1---2 --- arr2 --is execute  beforeRouteEnter")
    next();
  }],
  beforeRouteUpdate(to, from, next) {
    // 在当前路由改变，但是该组件被复用时调用
    // 举例来说，对于一个带有动态参数的路径 /foo/:id，在 /foo/1 和 /foo/2 之间跳转的时候，
    // 由于会渲染同样的 Foo 组件，因此组件实例会被复用。而这个钩子就会在这个情况下被调用。
    // 可以访问组件实例 `this`
    console.log("three1---2 is execute  beforeRouteUpdate")
    next();
  },
  beforeRouteLeave(to, from, next) {
    // 导航离开该组件的对应路由时调用
    // 可以访问组件实例 `this`
    console.log("three1---2 is execute  beforeRouteLeave")
    next();
  }
}
```
所以知道导航卫士钩子函数：
1. 可以为函数、也可以为数组。
2. 其入参为 to, from, next。
3. 在beforeRouteLeave、beforeRouteUpdate中可以访问组件的实例`this`。

看源码知道VueRouter通过extractLeaveGuards、extractUpdateHooks、extractEnterGuards去分别处理不同的钩子函数，然后通过extractGuards去统一处理。

我们知道命名视图，这个使得在同一个routeRecord上保存了多个组件Component对象,如
```js
 components : {
    default : App,
    b : threeComponent
 }
```
然后在 Object.keys(m.components).map(key => fn()}去遍历处理。但是组件钩子函数支持数组和函数两种方式，且父子路由。那么这些钩子函数是如何处理的？

其先通过 Object.keys(m.components)去遍历routeRecord上所有的组件，然后将每一个命名视图的beforeRouteLeave钩子函数转换成 bind数组

如 栗子中的 three12组件 其有两个命名视图 default 与 b ()
- default 没有定义 beforeRouteLeave 钩子
- b 中定义了 beforeRouteLeave 且为一个数组。

那么 guards = [ undefined , [bind1, bind2]]。

然后通过flatten(reverse ? guards.reverse() : guards)将二维数组转换成一维数组，且对于beforeRouteLeave进行数组的翻转。

##### 路由中父子组件的执行顺序。

我们知道完整的导航解析流程中组件执行顺序为 beforeRouteLeave  -> beforeRouteUpdate -> beforeRouteEnter 。

在route.matched中组件的顺序为 父组件在前子组件在后。所以在resolveQueue的时候肯定也是父组件在前子组件在后。 然后在 处理单个路由中多个命名视图的时候Object.keys(m.components) 肯定也是定义的在前（即上面的 default > b）,导致 guards中 [ default组件 , b组件 ]。

所以对于正常的流程中应该是 [父组件components中第一个组件的钩子函数（如果数组就按照数组的顺序），父组件components中第二个组件...., 子组件components中第一个组件...]。 即先父后子，components与钩子函数数组按照定义的数组顺序。

但是对于beforeRouteLeave钩子函数 其通过 guards.reverse(),其顺序应该是先子components后父components，钩子函数数组按照定义的数组顺序。

[ 子component2 , 子component1[钩子函数数组顺序未变] , 父component2 , 父component1]

即结果为 
- [ ] 结果


##### 1.  可以为函数、也可以为数组?

在extractGuards中可以知道处理钩子函数的时候判断是否为数组。
```js
return Array.isArray(guard) ? guard.map(guard => bind(guard, instance, match, key)) : bind(guard, instance, match, key)
```

##### 2、3. 其入参为 to, from, next？在beforeRouteLeave、beforeRouteUpdate中可以访问组件的实例`this`？

在extractGuards中可以知道处理钩子函数的时候通过bind进行处理。
```js
return Array.isArray(guard) ? guard.map(guard => bind(guard, instance, match, key)) : bind(guard, instance, match, key)
```
在处理3个组件内部钩子函数的时候 bind 的定义分别为 bindGuard、和 包含bindEnterGuard回调函数
```js
function extractLeaveGuards(deactivated: Array < RouteRecord > ): Array << ? Function > {
    return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
}

function extractUpdateHooks(updated: Array < RouteRecord > ): Array << ? Function > {
    return extractGuards(updated, 'beforeRouteUpdate', bindGuard)
}

function extractEnterGuards(
    activated: Array < RouteRecord > ,
    cbs: Array < Function > ,
    isValid: () => boolean
) : Array << ? Function > {
    return extractGuards(activated, 'beforeRouteEnter', (guard, _, match, key) => {
        return bindEnterGuard(guard, match, key, cbs, isValid)
    })
}
```

然后我们看 bindGuard

```js
/**
 * @description
 * @author guzhanghua
 * @param {NavigationGuard} guard                // 组件的钩子函数   如beforeRouteLeave,beforeRouteEnter,beforeRouteUpdate
 * @param {? _Vue} instance                      // 组件instance属性  m.instances[key]
 * @returns {? NavigationGuard}
 */
function bindGuard(guard: NavigationGuard, instance: ? _Vue): ? NavigationGuard {
    if (instance) {
        return function boundRouteGuard() {
            return guard.apply(instance, arguments)
        }
    }
}
```

其中instance为组件的实例对象this。 arguments为执行时的入参

然后我们看 bindEnterGuard

```js
function bindEnterGuard(
    guard: NavigationGuard,
    match: RouteRecord,
    key: string,
    cbs: Array < Function > ,
    isValid: () => boolean
): NavigationGuard {
    return function routeEnterGuard(to, from, next) {
        return guard(to, from, cb => {
            next(cb)
            if (typeof cb === 'function') {
                cbs.push(() => {
                    // #750
                    // if a router-view is wrapped with an out-in transition,
                    // the instance may not have been registered at this time.
                    // we will need to poll for registration until current route
                    // is no longer valid.
                    poll(cb, match.instances, key, isValid)
                })
            }
        })
    }
}
```
在beforeRouteEnter守卫不能访问this，因为守卫在导航确认前被调用,因此即将登场的新组件还没被创建。不过，你可以通过传一个回调给next来访问组件实例。在导航被确认的时候执行回调，并且把组件实例作为回调方法的参数。

##### 2. 异步组件的处理resolveAsyncComponents

```js
/**
 * 解决异步组件
 {
   component : (resolve) => require(['../views/404.vue'], resolve)
 }
 * @param {Array < RouteRecord >} matched
 * @returns {Function}
 */
export function resolveAsyncComponents(matched: Array < RouteRecord > ): Function {
    return (to, from, next) => {
        let hasAsync = false
        let pending = 0
        let error = null

        /*
          遍历处理 父子组件、组件中命名视图 等多个地方加载异步组件的方法

          def : 组件构造函数
          _   : 组件的 实例对象 instance
          match  父子组件中路由routeRecord对象
          key : 当前处理的路由中的 命名视图 的命名(默认的default)

        */
        flatMapComponents(matched, (def, _, match, key) => {
            // if it's a function and doesn't have cid attached,
            // assume it's an async component resolve function.
            // we are not using Vue's default async resolving mechanism because
            // we want to halt the navigation until the incoming component has been
            // resolved.
            if (typeof def === 'function' && def.cid === undefined) {
                hasAsync = true
                pending++

                // 定义异步组件 resolve 加载完成方法
                const resolve = once(resolvedDef => {
                    // 是否是通过ES5的 import方法加载组件，这时候组件内容存放在default属性上
                    if (isESModule(resolvedDef)) {
                        resolvedDef = resolvedDef.default
                    }
                    // save resolved on async factory in case it's used elsewhere
                    def.resolved = typeof resolvedDef === 'function' ?
                        resolvedDef :
                        _Vue.extend(resolvedDef);

                    // 将路由routeRecord对象中的此命名视图组件赋值成真正的组件实例对象
                    match.components[key] = resolvedDef


                    // pending的作用
                    /*
                      当所有的异步组件都加载完成 才执行next() 进行下一步
                    */
                    pending--
                    if (pending <= 0) {
                        next()
                    }
                });
                // 定义异步组件 reject 加载失败的处理方法
                const reject = once(reason => {
                    const msg = `Failed to resolve async component ${key}: ${reason}`
                    process.env.NODE_ENV !== 'production' && warn(false, msg)
                    if (!error) {
                        error = isError(reason) ?
                            reason :
                            new Error(msg)
                        next(error)
                    }
                })

                let res
                try {
                    // 调用异步组件的执行函数  (resolve) => require(['../views/404.vue'], resolve)
                    res = def(resolve, reject)
                } catch (e) {
                    reject(e)
                }
                if (res) {
                    if (typeof res.then === 'function') {
                        res.then(resolve, reject)
                    } else {
                        // new syntax in Vue 2.3
                        const comp = res.component
                        if (comp && typeof comp.then === 'function') {
                            comp.then(resolve, reject)
                        }
                    }
                }
            }
        })

        // 如果没有异步组件 手动调用next() 执行下一个
        if (!hasAsync) next()
    }
}

```
我们知道异步组件的定义方法一般是

```js
(resolve) => require(['./components/Second1.vue'], resolve)

() => import(/* webpackChunkName: "group-foo" */ './Foo.vue')
```
其都是定义的是一个函数且组件还没有通过Vue.extend()处理，即没有def._cid。所以判断是异步组件的方法为 if (typeof def === 'function' && def.cid === undefined)。

注意的问题主要有： 
- pending的作用。
- next()的执行时机

##### 总结queue

![image](https://note.youdao.com/yws/public/resource/63abdfdd5a66cd92841486eb258ffebc/xmlnote/31C49765A3ED4C72B9B14E039498460F/11234)

我们看一个 /two1/three12 切换到 /two2/three21 时 queue的值。

###### extractLeaveGuards(deactivated)
- 0 : boundRouterGuard()  子路由three12的beforeRouteLeave[0]
- 1 : boundRouterGuard()  子路由three12的beforeRouteLeave[1]
- 2 : boundRouterGuard()  子路由/three12中default视图Default组件的beforeRouteLeave(不是数组类型)
- 3 : boundRouterGuard() 父路由/two1的default组件的beforeRouteLeave(不是数组类型)

###### this.router.beforeHooks
- 4 : router.beforeEach 钩子函数

###### extractUpdateHooks(updated) 没有定义

###### activated.map(m => m.beforeEnter)      (配置文件中的 beforeEnter)
- 5 : beforeEnter(to, from, next)  父路由/two2路由配置上的beforeEnter钩子函数
- 6 : beforeEnter(to, from, next)  子路由/three21路由配置上的beforeEnter钩子函数

###### resolveAsyncComponents(activated)      (加载异步组件)
- 5 : f(to,from,next) 异步组件resolveAsyncComponents()返回的函数

#### 2. 钩子函数的执行

> 上面我们钩子函数的执行队列已经定义好了，那么下一步应该就是去调用执行钩子函数了。

```js
/**
 * 钩子函数队列的执行方法
 * @param {*} queue                 // 钩子函数队列
 * @param {Function} fn             // 执行每一个钩子函数的方法 ，
 * @param {Function} cb             // 执行完所有的钩子函数回调的方法
 */
export function runQueue(queue: Array << ? NavigationGuard > , fn : Function, cb: Function) {
    const step = index => {
        // 如果队列中所有的钩子函数都执行完成就回到 cb
        if (index >= queue.length) {
            cb()
        } else {
            // 如果当前下标的钩子函数存在,如 组件中没有定义 beforeRouteLeave 那么 index : undefined
            if (queue[index]) {
              // 调用钩子函数的执行方法，并将当前执行的钩子函数、执行下一个钩子函数方法 作为入参
                fn(queue[index], () => {
                    step(index + 1)
                })
            } else {
                step(index + 1)
            }
        }
    }
    // 调用执行队列的第一个钩子函数
    step(0)
}
```

钩子函数队列执行的设计很巧妙。其让我们在按顺序执行每一个钩子函数的时候都需要调用next()去开始执行下一个钩子函数，不然整个钩子函数的执行队列将会停止。

具体如： 其定义了一个step队列方法，入参为队列的钩子函数的下标。如果下标超出队列即执行完所有的钩子函数，那么回调cb()方法。如果没有、且此下标钩子函数不为undefined那么就通过fn()去回调此钩子函数，并将step(index+1)作为 next参数传入。所以我们在iterator(hook,next)中想继续执行下一个钩子函数的时候需要手动调用next()方法。

```js
/**
 * 
 * @param {*} hook    当前执行的钩子函数
 * @param {*} next    runQueue中定义的 () => { step(index+1) }用来执行下一个钩子函数
 */
const iterator = (hook: NavigationGuard, next) => {
    if (this.pending !== route) {
        return abort()
    }
    try {
        //执行 钩子函数  to, from , next
        hook(route, current, (to: any) => {
            // 如果我们在钩子函数中 next(false) 或者 next('xxx Error')。
            // 这种情况没有调用next()  所以不会继续执行下面的钩子函数，整个跳转就会停止
            if (to === false || isError(to)) {
                // next(false) -> abort navigation, ensure current URL
                this.ensureURL(true)
                abort(to)
            } else if (
                typeof to === 'string' ||
                (typeof to === 'object' && (
                    typeof to.path === 'string' ||
                    typeof to.name === 'string'
                ))
            ) {
                // next('/') or next({ path: '/' }) -> redirect
                abort()
                if (typeof to === 'object' && to.replace) {
                    this.replace(to)
                } else {
                    this.push(to)
                }
            } else {
                // confirm transition and pass on the value
                // 这时候to 没有啥屁用。
                next(to)
            }
        })
    } catch (e) {
        abort(e)
    }
}
```

下面是真个钩子函数执行完成执行的cb()的函数方法

我们知道导航解析流程我们只执行到第六步。那么下面的怎么处理。

其有生成了一个新的钩子函数执行队列
```js
() => {
    /*
        下面处理导航解析流程 的 7 -> 最后步骤
    */
    const postEnterCbs = []
    const isValid = () => this.current === route;
    // wait until async components are resolved before
    // extracting in-component enter guards
    // 获取到 组件中定义的 beforeRouteEnter钩子函数 (第7步)
    const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid);
    // 将 调用全局的 beforeResolve 添加到 队列中  (第8步)
    const queue = enterGuards.concat(this.router.resolveHooks);
    // 执行钩子函数队列
    runQueue(queue, iterator, () => {
        ...
    })
}
```

##### 第9步其以后在哪里处理？
 
队列执行完成的回调函数

```js
// 执行钩子函数队列
runQueue(queue, iterator, () => {
    if (this.pending !== route) {
        return abort()
    }
    this.pending = null
    onComplete(route)
    if (this.router.app) {
        this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => { cb() })
        })
    }
})
```
调用   onComplete(route) 方法。
```js
this.confirmTransition(route, () => {
    this.updateRoute(route)
    onComplete && onComplete(route)
    this.ensureURL()
        // fire ready cbs once
    if (!this.ready) {
        this.ready = true
        this.readyCbs.forEach(cb => { cb(route) })
    }
}, err => {
    if (onAbort) {
        onAbort(err)
    }
    if (err && !this.ready) {
        this.ready = true
        this.readyErrorCbs.forEach(cb => { cb(err) })
    }
})

// --------------------  updateRoute  -------------------------
updateRoute(route: Route) {
    const prev = this.current;
    // 将跳转的路径routeRecord赋给current。
    this.current = route;

    // 执行 this.listen定义的路由的监听回调函数 
    this.cb && this.cb(route)
    // 调用全局的 afterEach 钩子函数  (第10步)
    this.router.afterHooks.forEach(hook => {
        // 执行全局的 afterEach 钩子函数，这时候就咩有第三个参数 next 了
        hook && hook(route, prev)
    })
}
```

在第二个队列处理完成后其调用onComplete(route)方法。然后在此方法中调用this.updateRoute()方法。 然后在此执行 <font color=red>第10步(调用全局的 afterEach 钩子函数)</font>。

然后触发DOM的更新... <font color=red>第11步(触发 DOM 更新)</font>

最后再最后通过 $nextTick去确保DOM更新，然后执行<font color=red>第12步(用创建好的实例调用 beforeRouteEnter 守卫中传给 next 的回调函数)</font>
```js
// 用创建好的实例调用 beforeRouteEnter 守卫中传给 next 的回调函数。 (第12步)
if (this.router.app) {
    this.router.app.$nextTick(() => {
        postEnterCbs.forEach(cb => { cb() })
    })
}
```

##### about()方法

在VueRouter中对于about、错误的处理有多个地方：
1. this.$router.push('/xx',onComputed,onAbout); 自定义的onAbout处理方法
2. router.onError(cb =>{}) 全局定义的错误处理

当每次如   if (this.pending !== route) ... 路由不继续执行下去的时候都会执行about()
```js
// 定义了 路由跳转失败的回调方法
const abort = err => {
    // 如果 路由中间截止了 且abort(‘Error’) 那么就执行全局定义的router.onError()回调方法
    if (isError(err)) {
        if (this.errorCbs.length) {
            // 执行error回调方法
            this.errorCbs.forEach(cb => { cb(err) })
        } else {
            // 否则只是警告而已
            warn(false, 'uncaught error during route navigation:')
            console.error(err)
        }
    }
    // 调用this.confirmTransition(xx , xx , err)
    onAbort && onAbort(err)
}

//  ---------------confirmTransition err-------------------
err => {
    // 执行用户定义的onAbort方法
    if (onAbort) {
        onAbort(err)
    }
    // 执行 onReady方法，因为可能初始化的时候就about了而不是onComplete
    if (err && !this.ready) {
        // 确保只执行一次ready方法
        this.ready = true
        this.readyErrorCbs.forEach(cb => { cb(err) })
    }
}
```


##### this.ensureURL()方法

在base.js中这只是一个空函数，而且其会被HashHistory、HTML5History、AbstractHistory等去重写。

如HashHistory中的

```js
/**
 * 不管是 路由跳转成功还是被截止了，其都会执行以下 this.ensureURL()去操作以下浏览器的历史记录
 * 
 * @param {boolean} [push]      // 是 pushState 还是 replaceState 。即是否会产生历史记录
 * @memberof HashHistory
 */
ensureURL(push ? : boolean) {
    // 获取当前路由对象的全路径
    const current = this.current.fullPath
    // 获取当前 URL 上的 路径如果不同 则参数了改变
    //  为什么不同的时候还要区分 是否会产生历史记录？
    if (getHash() !== current) {
        // this.ensureURL(true) // pushState去修改浏览器的历史状态
        push ? pushHash(current) : replaceHash(current)
    }
}
```

对于这个我们需要了解一下HTML5历史状态管理history API-pushState/replaceState

#### pushState

```js
history.pushState(stateObject, title, url) 
```

入参为3个： 分别是状态对象、新状态标题和可选参数相对URL 。
- stateObject  ： 状态对象应该传入提供页面状态信息的数据 
- 新状态的标题， 还没有浏览器实现。所以传入一个 ''
- 相对URL      : 如果传入的这个参数，浏览器地址也会更新，<font color=red>但是不会真的向服务器发送请求</font>

##### 注意：

1. history.pushState会修改浏览器的地址，但是不会向服务器请求新地址的数据，所以我们需要配合 onpopstate 去触发浏览器状态的更新（浏览器前后翻页触发，刷新页面不触发） 

#### replaceState

> 重写当前的状态,也就是说替换当前的记录

```js
history.replaceState(stateObject, title, url) 
```
入参为2个： 分别是状态对象、新状态标题 。
- stateObject  ： 状态对象应该传入提供页面状态信息的数据 
- 新状态的标题， 还没有浏览器实现。所以传入一个 ''


回到源码中，我们通过HTML5历史状态管理history知道每一次 进行地址的跳转等 不管是否是完成还是截止，都会产生history状态的改变，只是完成就产生新的历史状态从而可以回退等等，而截止只是修改当前的历史状态。







