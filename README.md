# @ctsy/server路由组件

## 1.安装包
> yarn add @ctsy/router

## 2.引入并安装组件
```typescript
import server from "@ctsy/server"
//若需要用到session，请在session后安装router
import {install as si} from "@ctsy/session"

import {install as ri} from "@ctsy/router"

//若需要用到session，请在session后安装router
server.install({install:si});

server.install({install:ri});

// 若需要引用完整的服务端逻辑模块，请根据模块规则来安装，当前最新的@ctsy/server_auth_plugin已经不需要手动安装了
// 更多内容请查阅各个模组的文档
//导入服务
import auth from '@ctsy/server_auth_plugin'
//设置密码加密的salt
auth.Crypto.salt = "fwjfwei-2or3fw0-"
//设置账号验证规则，不符合这个规则的将被拒绝
auth.Verify.Account = /^.{5,}/
```

## 3.