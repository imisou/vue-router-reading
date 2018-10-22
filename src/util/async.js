/* @flow */


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