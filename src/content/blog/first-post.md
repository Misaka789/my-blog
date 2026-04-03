---
title: '为什么你的前端构建越来越慢——以及如何系统性地解决它'
description: '从构建耗时逐步失控的真实项目出发，梳理定位前端构建瓶颈与持续治理的思路。'

category: '前端工程'
pubDate: 'Jul 08 2022'
heroImage: '../../assets/blog-placeholder-3.jpg'
---

前端构建慢是一个"温水煮青蛙"式的问题。项目初期，`npm run build` 只要 8 秒，没人在意。半年后变成 45 秒，大家开始抱怨但还能忍。一年后突破 3 分钟，CI 排队开始影响发布节奏，这时候你才意识到——构建性能是一个需要持续治理的工程问题，不是换个工具就能解决的。

## 构建慢的本质：不是工具的错

很多人把构建慢归咎于 Webpack，然后寄希望于 Vite 或 Turbopack。但实际上，构建慢的根因通常不在工具层，而在三个地方：

1. **依赖图的复杂度失控。** 一个看起来只有 200 个组件的项目，加上 node_modules 里的传递依赖，实际需要解析的模块可能超过 5000 个。
2. **转换管道的叠加成本。** TypeScript → Babel → PostCSS → Terser，每一层都在做完整的 AST 解析和序列化。四层下来，同一份代码被解析了四次。
3. **缓存失效的蝴蝶效应。** 改了一个工具函数，由于 re-export 链条过长，导致 30% 的模块缓存失效，增量构建退化成全量构建。

## 实战：把构建时间从 180s 压到 52s

在最近一个中型项目中（约 800 个源文件，120 个路由），我们用了以下策略：

### 1. 构建分析先行

```bash
# 用 speed-measure-plugin 定位瓶颈
SPEED_MEASURE=true npm run build

# 或者用 Vite 的 --profile 参数
vite build --profile
```

不要凭直觉优化。我们发现最大的瓶颈不是 JS 编译，而是 CSS Modules 的类名生成——一个没人关注的插件占了 35% 的构建时间。

### 2. 依赖预构建 + 显式边界

把变化频率低的依赖（UI 库、工具库）通过 `optimizeDeps` 预构建，减少每次增量构建的模块解析范围。关键是要**显式声明**而不是依赖自动检测。

### 3. 并行化一切可以并行的

- TypeScript 类型检查从构建流程中剥离，用 `fork-ts-checker-webpack-plugin` 或单独的 `tsc --noEmit` 并行运行
- 图片优化放到 post-build 阶段
- Lint 不要跑在 build 里，放到 pre-commit hook

### 4. 缓存要持久化，不是仅在内存里

```javascript
// 持久化缓存配置
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename],
  },
}
```

CI 环境下缓存尤其重要。我们通过 GitHub Actions 的 `actions/cache` 持久化 `.cache` 目录，让 CI 构建从 180s 降到了 52s。

## 更深一层的思考

构建性能优化到最后，你会发现它本质上是一个**架构问题**。模块之间的依赖关系越清晰、边界越明确，构建工具就越容易做增量分析和并行处理。

反过来说，如果你的构建越来越慢，它可能是在告诉你：你的代码架构需要重新审视了。

> 构建时间是代码健康度的一个隐性指标。它不会骗你。
