---
title: 'OSPF 多区域与 DHCP 动态分配实验复盘'
description: '把这次计网实验从题目要求、地址规划、OSPF 多区域、DHCP、排障过程到最终验收完整复盘，适合作为实验总结和博客记录。'
pubDate: '2026-04-05'
updatedDate: '2026-04-05'
---

这次计网实验终于完整做完了。实验本身不算特别复杂，但真正做下来，会把很多基础概念和实际配置问题连在一起：接口 IP、网段划分、OSPF 多区域、DHCP 动态分配、邻居关系、路由表、主机连通性，还有排障时最容易踩的接口和 area 对不上。

这篇文章不再只讲“怎么配”，而是把这次实验完整复盘一遍，整理成一份更适合回顾和交作业前自查的笔记。

## 题目要求

这次实验的核心要求可以概括成四件事：

- 按给定拓扑完成地址规划，并在图中标明各网络地址和路由器接口 IP
- 所有路由器配置 OSPF，使全网互通
- 主机采用 DHCP 动态地址分配
- 实验报告中要包含拓扑结构图、各路由器 `running-config`，以及路由表等结果

从结果上看，最终不是“端口亮了”就算成功，而是要同时满足：

- 物理链路正常
- 接口地址正确
- OSPF 邻居正常建立
- 路由表学习到远端网段
- 主机能自动获取地址
- 不同网段主机之间可以互相 `ping` 通

![实验要求图](/my-blog/images/ospf-lab/requirements.png)

## 拓扑与地址规划

这次实验拓扑可以拆成 5 个网段：

| 网段 | 作用 |
| --- | --- |
| `36.168.0.0/24` | 中间局域网，连接 `Router1`、`Router2`、`Laptop1`、`Laptop2` |
| `36.168.1.0/24` | `Router0` 与 `Router1` 的点到点链路 |
| `36.168.2.0/24` | 左侧局域网，连接 `Router0`、`PC0`、`Laptop0` |
| `36.168.3.0/24` | `Router2` 与 `Router3` 的点到点链路 |
| `36.168.4.0/24` | 右侧局域网，连接 `Router3`、`Laptop3`、`Laptop4` |

![实验拓扑图](/my-blog/images/ospf-lab/topology.png)

最终确认下来的接口地址如下：

| 设备 | 接口 | IP 地址 | 说明 |
| --- | --- | --- | --- |
| `Router0` | `Fa0/0` | `36.168.2.1/24` | 左侧 LAN 网关 |
| `Router0` | `Fa0/1` | `36.168.1.1/24` | 连接 `Router1` |
| `Router1` | `Fa0/0` | `36.168.1.2/24` | 连接 `Router0` |
| `Router1` | `Fa0/1` | `36.168.0.1/24` | 中间 LAN |
| `Router2` | `Fa0/0` | `36.168.0.2/24` | 中间 LAN |
| `Router2` | `Fa0/1` | `36.168.3.1/24` | 连接 `Router3` |
| `Router3` | `Fa0/0` | `36.168.3.2/24` | 连接 `Router2` |
| `Router3` | `Fa0/1` | `36.168.4.1/24` | 右侧 LAN 网关 |

如果老师要求把第一段的 `36` 换成学号后两位，对应替换即可，配置逻辑不变。

## 这次实验涉及到的核心概念

## 1. 网段与子网掩码

本实验所有网段都是 `/24`，对应子网掩码：

```text
255.255.255.0
```

例如 `36.168.2.0/24`：

- 网络地址是 `36.168.2.0`
- 可用主机地址范围是 `36.168.2.1` 到 `36.168.2.254`
- 广播地址是 `36.168.2.255`

同一网段的设备可以直接通信，不同网段之间必须依靠路由器转发。

## 2. 默认网关

主机离开本地网段时，流量会先交给默认网关。默认网关一般就是路由器连接该局域网的接口地址。

例如：

- 左侧局域网 `36.168.2.0/24` 的默认网关是 `36.168.2.1`
- 右侧局域网 `36.168.4.0/24` 的默认网关是 `36.168.4.1`

## 3. DHCP

DHCP 用来自动给主机分配：

- IP 地址
- 子网掩码
- 默认网关
- DNS 服务器

这意味着主机端不需要手动配置 IP，只需要在 Packet Tracer 中切换到 `DHCP` 即可。

## 4. OSPF

OSPF 是动态路由协议。它的作用是让路由器把自己直连的网络发布出去，并自动学习去其他网段的路径。

本实验不是单区域，而是多区域 OSPF。最终采用的 area 划分是：

- `Area 1`：左侧区域，包含 `36.168.1.0/24` 和 `36.168.2.0/24`
- `Area 0`：骨干区域，包含 `36.168.0.0/24`
- `Area 2`：右侧区域，包含 `36.168.3.0/24` 和 `36.168.4.0/24`

各路由器角色如下：

- `Router0`：Area 1 内部路由器
- `Router1`：ABR，连接 Area 1 和 Area 0
- `Router2`：ABR，连接 Area 0 和 Area 2
- `Router3`：Area 2 内部路由器

![OSPF area 划分图](/my-blog/images/ospf-lab/areas.png)

这里有一个很关键的规则：

**同一条物理链路两端，必须属于同一个 OSPF area。**

## 5. `running-config`

`running-config` 是设备当前正在生效的配置。实验报告要求中常见的“附各路由器配置”，本质上就是把每台设备的 `running-config` 导出或截图。

查看命令：

```bash
show running-config
```

注意要先进入特权模式：

```bash
enable
```

否则在 `Router>` 下执行会报错。

## 最终配置思路

整个实验最合理的顺序不是直接去敲 OSPF，而是：

1. 先确认物理连接和接口对应关系
2. 给每个路由器接口配置正确 IP，并执行 `no shutdown`
3. 再配置 OSPF
4. 再配置 DHCP
5. 再让主机切到 `DHCP`
6. 最后通过邻居表、路由表和 `ping` 验收

这次实验后面的问题，几乎都证明了一个事实：

**如果接口和网段先没搞清楚，后面的所有现象都会混在一起。**

## 最终各路由器 OSPF 设计

## Router0

```bash
router ospf 1
 network 36.168.1.0 0.0.0.255 area 1
 network 36.168.2.0 0.0.0.255 area 1
```

## Router1

```bash
router ospf 1
 network 36.168.1.0 0.0.0.255 area 1
 network 36.168.0.0 0.0.0.255 area 0
```

## Router2

```bash
router ospf 1
 network 36.168.0.0 0.0.0.255 area 0
 network 36.168.3.0 0.0.0.255 area 2
```

## Router3

```bash
router ospf 1
 network 36.168.3.0 0.0.0.255 area 2
 network 36.168.4.0 0.0.0.255 area 2
```

其中 `Router1` 和 `Router2` 是多区域的关键节点，也是最容易出现 area 配错和残留配置的地方。

## DHCP 配置思路

本实验中真正连接主机的局域网一共有 3 段：

- 左侧 `36.168.2.0/24`
- 中间 `36.168.0.0/24`
- 右侧 `36.168.4.0/24`

所以 DHCP 分别放在对应的网关路由器上：

## Router0

```bash
ip dhcp excluded-address 36.168.2.1 36.168.2.20
ip dhcp pool LAN2
 network 36.168.2.0 255.255.255.0
 default-router 36.168.2.1
 dns-server 8.8.8.8
```

## Router1

```bash
ip dhcp excluded-address 36.168.0.1 36.168.0.20
ip dhcp pool LAN0
 network 36.168.0.0 255.255.255.0
 default-router 36.168.0.1
 dns-server 8.8.8.8
```

## Router3

```bash
ip dhcp excluded-address 36.168.4.1 36.168.4.20
ip dhcp pool LAN4
 network 36.168.4.0 255.255.255.0
 default-router 36.168.4.1
 dns-server 8.8.8.8
```

主机端只要进入 `Desktop -> IP Configuration`，切换到 `DHCP` 即可。

## 实验中涉及到的常用命令

这次实验真正高频使用的命令不多，但每一类都很关键。

## 1. 查看接口状态

```bash
show ip interface brief
```

用来快速确认：

- 接口有没有 IP
- 接口是不是 `up/up`
- 哪个接口对应哪条链路

## 2. 查看当前配置

```bash
show running-config
```

用来检查：

- 接口地址是否配对
- OSPF `network` 语句是否正确
- DHCP 池是否配置完整

## 3. 查看 OSPF 邻居

```bash
show ip ospf neighbor
```

用来判断 OSPF 是否真正建立成功。如果邻居为空，说明 area、接口、IP、链路或 OSPF 进程存在问题。

## 4. 查看路由表

```bash
show ip route
```

这个命令最能说明实验是否成功。重点关注：

- `C`：直连路由
- `O`：同区域 OSPF 路由
- `O IA`：跨区域 OSPF 路由

## 5. 查看路由协议状态

```bash
show ip protocols
```

这个命令在排障时特别有用，可以看到：

- 当前 OSPF 进程
- 宣告了哪些网段
- 每个网段属于哪个 area

## 6. 清理 OSPF 进程

```bash
clear ip ospf process
```

当 Packet Tracer 中存在旧状态残留时，这个命令很有用。执行后会重建邻居关系和链路状态数据库。

## 7. 删除并重建 OSPF

```bash
no router ospf 1
router ospf 1
```

当 area 或 network 残留严重、`show ip protocols` 与 `running-config` 对不上时，直接重建 OSPF 往往比一点点修补更快。

## 8. 保存配置

```bash
copy running-config startup-config
```

实验做完一定要保存，否则 Packet Tracer 关闭后配置可能丢失。

## 这次实验里遇到的问题

这部分是整次实验里最有价值的地方，因为真正学到东西的地方大多都在排障过程里。

## 1. 看到端口亮绿，以为已经配置成功

刚开始看到端口都亮了，很容易误以为实验已经差不多完成。

但端口亮绿只说明：

- 物理连接正常
- 接口链路层基本起来了

它不代表：

- IP 配置正确
- OSPF 成功
- DHCP 正常
- 全网互通

解决方法是继续检查：

- `show ip interface brief`
- `show ip ospf neighbor`
- `show ip route`

## 2. OSPF 报 `mismatch area ID`

这是本次最典型的问题之一。报错内容类似：

```text
Received invalid packet: mismatch area ID
```

原因是链路两端配置到了不同的 area。

例如：

- 一端把 `36.168.1.0/24` 放到了 `area 0`
- 另一端把同一条链路放到了 `area 1`

解决方法：

- 重新梳理 area 划分
- 确保同一条物理链路两端 area 一致
- 必要时删除旧的 `network` 语句，或直接重建 OSPF 进程

## 3. 一直盯着 area，后来才发现接口接反了

这次实验最关键的一次排障，是发现 `Router0` 实际上是：

- `Fa0/1` 连 `Router1`
- `Fa0/0` 连左侧交换机

但一开始却把 IP 地址反着配了：

- 把去 `Router1` 的地址配到了 `Fa0/0`
- 把 LAN 网关地址配到了 `Fa0/1`

这会直接导致：

- 邻居关系起不来
- 单向 `ping`
- 路由不收敛

解决方法：

- 重新确认真实连线关系
- 重新给接口分配正确地址

这个问题说明：**接口对应关系比命令本身更重要。**

## 4. 修改接口地址时出现 `overlaps with`

这个报错出现在想交换两个接口地址的时候。

原因是：

- 一个接口还保留旧地址
- 另一个接口又要配置到相同网段

Cisco 会认为两个接口落在同一网段，从而报重叠错误。

解决方法：

```bash
interface fa0/0
 no ip address
interface fa0/1
 no ip address
```

先把旧地址清掉，再重新配置。

## 5. 配置看起来对，但路由表不刷新

后面有几台路由器出现了这种现象：

- `running-config` 看起来没问题
- 邻居也部分正常
- 但路由表还没学到该有的远端网段

这在 Packet Tracer 里很常见，往往是旧的 OSPF 状态残留。

解决方法：

```bash
clear ip ospf process
```

如果还不干净，就直接：

```bash
no router ospf 1
router ospf 1
```

然后按正确的 `network ... area ...` 重新配置。

## 6. 命令拼写错误导致误判

这次实验里也遇到了不少很真实的小问题，例如：

- `configure trminal`
- `sow ip ospf neighbor`
- `enbale`

这些问题本身不复杂，但在排障节奏里很容易把人带偏。

尤其是输入 `enbale` 之后，设备会去尝试做域名解析，出现：

```text
Translating "enbale"...domain server (255.255.255.255)
```

这不是网络崩了，只是拼错了命令。

为了避免这种情况，可以配置：

```bash
no ip domain-lookup
```

## 7. 在 `>` 模式下执行特权命令

像下面这种情况：

```bash
Router0>show running-config
```

会报错，因为 `show running-config` 需要先进入特权模式：

```bash
enable
Router0#show running-config
```

这也是 Cisco CLI 最基础但很容易忽略的地方。

## 最终验收应该看什么

如果只说一句“都能 ping 通了”，其实还不够严谨。更完整的验收应该包括：

## 1. OSPF 邻居

每台路由器执行：

```bash
show ip ospf neighbor
```

确认邻居关系完整建立。

## 2. 路由表

每台路由器执行：

```bash
show ip route
```

确认能看到直连网段和远端 OSPF 路由。

例如：

- ABR 上会同时看到 `O` 和 `O IA`
- 边缘路由器会看到跨区域学到的 `O IA`

## 3. DHCP 获取地址

主机切到 `DHCP` 后，应该自动获取到：

- 正确网段的 IP
- 正确的默认网关
- DNS 服务器

## 4. 跨网段连通性

至少要测试：

- 左侧主机 `ping` 右侧主机
- 右侧主机 `ping` 左侧主机
- 中间主机 `ping` 左侧或右侧主机

如果这些都能成功，才可以说实验真正达到了“全网互通”。

## 这次实验最大的收获

这次实验表面上是在练 OSPF 和 DHCP，实际上训练的是更底层的网络思维：

- 先看拓扑，再谈配置
- 先确认接口对应关系，再配地址
- 先看物理和二层，再看三层协议
- 先看邻居，再看路由表
- 不要把“端口亮了”当成“实验完成”

如果只背命令，很容易在 area、接口、链路和网段之间绕晕。真正有用的是把下面这个排障顺序记住：

1. 接口是否 `up/up`
2. 接口 IP 是否正确
3. 同链路两端网段是否一致
4. OSPF area 是否一致
5. 邻居是否建立
6. 路由表是否收敛
7. 主机是否拿到正确地址
8. 全网是否可以互通

这也是这次实验真正比“把命令抄一遍”更有价值的地方。

## 小结

最终这次实验是完整跑通的：

- 四台路由器接口地址配置正确
- OSPF 三个 area 划分正确
- DHCP 能给主机自动分配地址
- 路由表能正确学习远端网络
- 不同网段主机之间可以正常 `ping` 通

如果以后再做类似实验，我会优先做三件事：

- 先确认接口到底接到哪里
- 先把地址规划写清楚
- 出问题先看邻居表和路由表，不急着怀疑所有配置

这次实验做完之后，再回头看 OSPF、ABR、`O IA` 这些概念，就不会只停留在书本定义上了。
