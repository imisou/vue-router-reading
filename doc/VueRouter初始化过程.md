# VueRouter初始化过程

首先我们看一个最简单的Vue.router的使用方法

```js
// 1. Use plugin.
// This installs <router-view> and <router-link>,
// and injects $router and $route to all router-enabled child components
Vue.use(VueRouter)

// 2. Define route components
const Home = { template: '<div>home</div>' }

// 3. Create the router
const router = new VueRouter({
  mode: 'history',
  base: __dirname,
  routes: [
    { path: '/', component: Home },
  ]
})

// 4. Create and mount root instance.
// Make sure to inject the router.
// Route components will be rendered inside <router-view>.
new Vue({
  router,
  template: ``
}).$mount('#app')
```

## 第一步: 调用Vue.use(VueRouter)

> 调用插件的初始化方法 VueRouter.install