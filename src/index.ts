import { join, resolve } from 'path';
/**
 * 执行route
 * @param ctx 
 * @param next 
 */
export async function router(ctx: any, next: Function) {
    try {
        if (ctx.config && ctx.config.sendFile) {
            await ctx.config.getStaticFile();
        } else {
            await check(ctx);
            await controller(ctx)
        }
    } catch (error) {
        ctx.error = error;
    }
    next()
}
/**
 * 执行检查逻辑
 * @param ctx 
 */
export async function check(ctx: any) {
    let route = ctx.route;
    let check;
    try {
        check = await get_check_controller(ctx, route.Module, route.Controller)
    } catch (error) {

    }
    let checkp
    if (check) {
        checkp = new check(ctx)
        if (checkp[route.Method] instanceof Function) {
            try {
                await checkp[route.Method](ctx.req.body, ctx)
            } catch (error) {
                ctx.status = 403;
                throw error
            }
        }
    }
}
/**
 * 执行控制器逻辑
 * @param ctx 
 */
export async function controller(ctx: any) {
    let route = ctx.route;
    let c;
    try {
        //调用业务逻辑
        c = await get_controller(ctx, '', route.Controller)
    } catch (error) {
    }
    if (!c) {
        ctx.status = 404;
        throw new Error("Not Found")
    }
    let co = new c(ctx)
    ctx.body = {};
    if (co['_before_' + route.Method] instanceof Function) {
        co['_before_' + route.Method](ctx.req.body, ctx)
    }
    if (co[route.Method] instanceof Function) {
        ctx.body = await co[route.Method](ctx.req.body, ctx)
    } else if (co['__call'] instanceof Function) {
        ctx.body = co['__call'](ctx.req.body, ctx)
    } else {
        ctx.status = 404;
        throw new Error("Not Found")
    }
    if (co['_after_' + route.Method] instanceof Function) {
        co['_after_' + route.Method](ctx.req.body, ctx)
    }
}
/**
 * 配置route
 * @param ctx 
 * @param next 
 */
export async function config_route(ctx: any, next: Function) {
    ctx.route = ctx.config ? await ctx.config.getController() : {
        Module: '',
        Method: "",
        Controller: "",
    };
    next()
}
/**
 * 获取控制器实例
 * @param ctx 
 * @param Module 
 * @param Controller 
 */
export async function get_controller(ctx: any, Module: string, Controller: string) {
    let p = join(ctx.config ? await ctx.config.getAppPath() : 'dist', 'controller', Controller) + '.js';
    return require(resolve(p)).default;
}
/**
 * 获取检查实例
 * @param ctx 
 * @param Module 
 * @param Controller 
 */
export async function get_check_controller(ctx: any, Module: string, Controller: string) {
    let p = join(ctx.config ? await ctx.config.getAppPath() : 'dist', 'check', Controller) + '.js';
    return require(resolve(p)).default;
}
/**
 * 安装实例
 * @param that 
 * @param koa 
 * @param config 
 */
// export async function
export function install(that: any, koa: any, config: any) {
    that.watch([
        'dist/**/*.js'
    ], [1, 2], (d: string) => {
        if (require.cache[resolve(d)]) {
            console.log(`File ${d} changed,deleted cache`)
            delete require.cache[resolve(d)]
        }
    })
    koa.use(config_route);
    // koa.use();
    koa.use(router);
}
