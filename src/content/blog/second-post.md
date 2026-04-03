---
title: 'API 设计的隐性契约：那些文档里不会写的东西'
description: '聊聊 API 设计里那些文档不会明写、却会真实影响集成体验的隐性约束。'

category: 'API 设计'
pubDate: 'Jul 15 2022'
heroImage: '../../assets/blog-placeholder-4.jpg'
---

设计 API 是一件很容易"自以为做对了"的事。字段命了名，状态码选了个合适的，文档写了两段——看起来一切都到位了。但真正检验 API 设计质量的时刻，是消费者（前端、移动端、第三方开发者）拿到你的接口开始集成的时候。

如果他们每隔三分钟就要翻一次文档，那你的 API 设计就有问题。

## 一致性是最重要的设计原则

不是 REST vs GraphQL，不是 JSON vs Protobuf，**一致性**才是 API 设计中最被低估也最重要的原则。

```json
// 不一致的命名，消费者需要记忆每个接口的特殊规则
GET /users       → { "data": [...] }
GET /orders      → { "items": [...] }
GET /products    → { "results": [...] }

// 一致的命名，消费者可以预测
GET /users       → { "data": [...], "meta": {...} }
GET /orders      → { "data": [...], "meta": {...} }
GET /products    → { "data": [...], "meta": {...} }
```

一致性的核心价值是**可预测性**。当消费者在一个端点上学到了某个模式，他们应该能把这个模式迁移到所有端点上。

## 错误响应是 API 的"第二张脸"

大多数开发者花 90% 的时间设计成功路径，却把错误响应当作事后补丁。但现实是，消费者在集成阶段遇到错误响应的频率远高于成功响应。

```json
// 糟糕的错误响应：消费者不知道哪里出了问题
{ "error": "Bad Request" }

// 有用的错误响应：消费者可以直接定位问题
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "请求参数校验失败",
    "details": [
      {
        "field": "email",
        "issue": "格式无效，期望格式: user@domain.com",
        "received": "not-an-email"
      }
    ],
    "request_id": "req_7f3a2b",
    "docs": "https://api.example.com/docs/errors#VALIDATION_FAILED"
  }
}
```

好的错误响应应该包含三个层次的信息：
1. **机器可读的错误码**（用于前端条件判断）
2. **人类可读的描述**（用于 debug 和日志）
3. **可操作的上下文**（用于快速定位和修复）

## 版本策略：不要等到出问题才想起来

API 版本化最常见的误区是"等有破坏性变更再说"。到那时候你会发现，没有版本化基础设施的 API 做版本迁移是一场噩梦。

我推荐的策略是：**从 v1 开始就做好版本化基建，但尽量不发 v2。**

```
# URL 路径版本化（简单直观）
/api/v1/users

# Header 版本化（更灵活，适合复杂场景）
Accept: application/vnd.myapp.v1+json
```

比版本号更重要的是**变更策略**：
- **添加字段**：永远不是破坏性变更
- **删除字段**：先标记 deprecated，至少保留两个发布周期
- **修改字段类型**：这是硬性破坏性变更，必须走新版本

## 限流和降级：对消费者的善意

限流不是惩罚，是保护。好的限流设计会告诉消费者三件事：

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1625097600
Retry-After: 30
```

- 你的配额是多少（Limit）
- 你还剩多少（Remaining）
- 什么时候恢复（Reset / Retry-After）

有了这些信息，消费者可以实现智能退避，而不是盲目重试导致雪崩。

## 最后的思考

> API 是一份契约，不只是一组端点。它承载的不只是数据的交换，还有设计者对消费者的理解和尊重。

设计 API 的时候，试着把自己放在消费者的位置上：如果你拿到这个接口，没有任何额外上下文，你能多快开始工作？这个时间，就是你 API 质量的真实度量。
