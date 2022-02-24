import { join, resolve } from 'path';
import Hook, { HookWhen } from '@ctsy/hook';
const server: any = require('@ctsy/server').default
if (!server._prefix) { server._prefix = {} }
/**
 * 路由事件注册
 */
export enum RouterHook {
    Controller = '_router/controller',
    /**
     * 执行某个方法的事件
     */
    Method = '_router',
    Router = "_router/r"
}

/**
 * 执行route
 * @param ctx 
 * @param next 
 */
export async function router(ctx: any, next: Function) {
    // await timeout(5000)
    if ('OPTIONS' != ctx.method) {
        try {
            if (!ctx.route) {
                ctx.route = await ctx.config.getController();
            }
            await Hook.emit(RouterHook.Router, HookWhen.Before, ctx, {})
            if (ctx.config && ctx.config.sendFile) {
                await ctx.config.getStaticFile();
            } else {
                // await timeout
                await check(ctx);
                let d = await controller(ctx)
                if (d !== undefined) {
                    ctx.body = d;
                }
            }
            await Hook.emit(RouterHook.Router, HookWhen.After, ctx, {})
        } catch (error) {
            await Hook.emit(RouterHook.Controller, HookWhen.Error, ctx, error)
            ctx.error = error;
        }
    }
    // ctx.body = "a"
    await next()
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
export async function controller<T>(ctx: any, route: { Module?: string, Method: string, Path?: string, Controller: string } | string = "", data?: any): Promise<T> {
    // let route = ctx.route;
    let cr = Object.assign(ctx.route);
    if ("string" == typeof route && route.length > 0) {
        ctx.path = route;
        route = await ctx.config.getController();
    } else {
        route = cr;
    }
    if ("object" == typeof route) {
        let { Method, Controller, Module, Path } = route;
        if (!route || route.Controller.length == 0) {
            route = ctx.route
        } else {
            ctx.route = route;
            if (!ctx.route.Path || ctx.route.Path.length == 0) {
                ctx.route.Path = server._modules[route.Module || ''] || ''
            }
        }
        let hookm: string[] = [RouterHook.Method];
        if (Module) { hookm.push(Module) }
        hookm.push(Controller, Method)
        await Hook.emit(RouterHook.Controller, HookWhen.Before, ctx, route);
        let c;
        try {
            //调用业务逻辑
            c = await get_controller(ctx, route)
        } catch (error) {
            console.error(error)
        }
        if (!c) {
            ctx.status = 404;
            throw new Error("Not Found")
        }
        try {
            let co = new c(ctx)
            let d = {};
            // let body = Object.assign(ctx.req.body || {}, ctx.request.body || {})
            let body = data ? data : ctx.request && ctx.request.body ? ctx.request.body : {};
            if (ctx.req && ctx.req.body) {
                body = Object.assign(body, ctx.req.body);
            }
            if (Module && server._prefix[Module]) {
                if (!co._prefix)
                    co._prefix = server._prefix[Module]
            }
            await Hook.emit(hookm.join('/'), HookWhen.Before, ctx, body);
            if (co['_init_'] instanceof Function) {
                await co['_init_'](body, ctx);
            }
            if (co['_before_' + Method] instanceof Function) {
                await co['_before_' + Method](body, ctx)
            }
            if (co[Method] instanceof Function) {
                d = await co[Method](body, ctx)
            } else if (co['__call'] instanceof Function) {
                d = await co['__call'](body, ctx)
            } else {
                ctx.status = 404;
                throw new Error("Not Found")
            }
            if (co['_after_' + Method] instanceof Function) {
                await co['_after_' + Method](body, ctx)
            }
            //调用hook
            await Hook.emit(hookm.join('/'), HookWhen.After, ctx, d);
            await Hook.emit(RouterHook.Controller, HookWhen.After, ctx, d);
            return <any>d;
        } catch (error) {
            throw error;
        } finally {
            ctx.route = cr;
        }
    } else {
        throw new Error('Router Error')
    }
}
// /**
//  * 配置route
//  * @param ctx 
//  * @param next 
//  */
// export async function config_route(ctx: any, next: Function) {
//     ctx.route = ctx.config ? await ctx.config.getController() : {
//         Module: '',
//         Method: "",
//         Controller: "",
//     };
//     await next()
// }
/**
 * 获取控制器实例
 * @param ctx 
 * @param Module 
 * @param Controller 
 */
export async function get_controller(ctx: any, route: any) {
    let p = join(ctx.config ? await ctx.config.getLibPath() : 'dist', 'controller', route.Controller) + '.js';
    return require(resolve(p)).default;
}
/**
 * 获取检查实例
 * @param ctx 
 * @param Module 
 * @param Controller 
 */
export async function get_check_controller(ctx: any, Module: string, Controller: string) {
    let p = join(ctx.config ? await ctx.config.getLibPath() : 'dist', 'check', Controller) + '.js';
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
    // koa.use(config_route);
    // koa.use();
    koa.use(router);
}