---
title: "FlashAttention v1/v2：IO 感知的精确注意力"
display_title: "FlashAttention"
paper_url: ""
authors: "Tri Dao et al.（v1）；Tri Dao（v2）"
venue: "专题学习 / NeurIPS 2022 与 ICLR 2024"
published: "2022 / 2023"
read_date: "2026-01-22"
status: "已读"
tags: ["Efficient Attention", "Inference Acceleration"]
search_terms: ["FlashAttention", "Flash Attention", "FA1", "FA2", "IO-aware attention", "tiling", "online softmax", "SRAM", "HBM"]
one_liner: "v1 用分块与在线 softmax 避免写出完整注意力矩阵；v2 重新分配 GPU 工作，提高并行效率。"
---

## 研究问题

标准注意力 $\operatorname{softmax}(QK^\top/\sqrt d)V$ 若显式保存 $N\times N$ 分数和概率矩阵，会产生大量显存读写。旧笔记把 FlashAttention v1 与 v2 放在一起比较；这里分别对应 [v1 原论文](https://arxiv.org/abs/2205.14135) 和 [v2 原论文](https://arxiv.org/abs/2307.08691)。

## 核心方法

| 版本 | 核心改动 | 主要瓶颈 |
| --- | --- | --- |
| 常规显式实现 | 物化注意力分数与概率矩阵 | $O(N^2)$ 中间显存及 HBM 流量 |
| v1 | $Q,K,V$ 分块，片上 SRAM 内完成局部计算；在线 softmax 合并各块 | 减少 HBM 读写，保持精确注意力 |
| v2 | 减少非矩阵乘法运算；按序列维拆分工作，并调整线程块/warp 分工 | 提高 GPU 占用率并减少共享内存通信 |

v1 的关键不是把注意力公式改成近似算法，而是**避免把完整 $N\times N$ 中间矩阵写回显存**。为跨块得到与全局 softmax 等价的结果，每一行维护当前最大值 $m$、指数和 $\ell$ 与加权值累积 $o$；新块到来时以新的最大值重新缩放旧累积。反向传播也可重算局部中间量，以计算换显存。

v2 延续 v1 的 IO 思路，重点解决不同 GPU 计算单元间的工作分配。它并非把渐进复杂度降到线性时间；密集精确注意力仍有二次计算量。


### 原笔记逐节学习记录

以下按旧笔记的原有顺序保留推导、解释、代码片段与图示。前面的概览供快速回顾；这一节用于完整复习。代码片段保持原笔记的教学语境，未作为可运行示例重新验证。

#### ⚡ Flash Attention (FA) 技术核心总结

##### 1. 核心属性对比表
| 特性           | 原生 Attention (Eager)       | Flash Attention v1        | Flash Attention v2           |
| :------------- | :--------------------------- | :------------------------ | :--------------------------- |
| **数学等价性** | 基准                         | **完全等价**              | **完全等价**                 |
| **显存占用**   | $O(N^2)$ (高)                | $O(N)$ (低)               | $O(N)$ (低)                  |
| **速度表现**   | 慢 (IO 受限)                 | 快 (分块计算)             | 极快 (并行优化)              |
| **GPU 要求**   | 无限制                       | Turing (T4/RTX 20) 及以上 | Ampere (A100/RTX 30) 及以上  |
| **计算逻辑**   | 存储完整的 $N \times N$ 矩阵 | SRAM 内分块，不存大矩阵   | 改进分块算法，减少非矩阵运算 |

---

##### 2. PyTorch 集成历程
在 **PyTorch 2.0** 之前，Flash Attention 必须通过 `pip install flash-attn` 独立安装。

| PyTorch 版本 | 发布时间  | 集成内容                     | 核心接口                         |
| :----------- | :-------- | :--------------------------- | :------------------------------- |
| **< 2.0**    | 2023 以前 | **不自带**，需手动编译安装   | `flash_attn_interface`           |
| **2.0**      | 2023.03   | **集成 FA v1**               | `F.scaled_dot_product_attention` |
| **2.2**      | 2024.01   | **集成 FA v2**               | `F.scaled_dot_product_attention` |
| **2.5+**     | 2024.10   | **集成 FA v3** (Hopper 优化) | `F.scaled_dot_product_attention` |

---

##### 3. v1 与 v2 的进化史

###### 🟢 Flash Attention v1 (2022) - “搬运工的革命”
* **痛点**：传统的 Attention 慢不是因为计算量大，是因为在显存（HBM）和缓存（SRAM）之间反复读写 $N \times N$ 的中间矩阵，导致 I/O 瓶颈。
* **方案**：**Tiling (分块)**。将 $Q, K, V$ 拆成小块搬进 SRAM 算完直接出结果，不再写回巨大的中间矩阵。

###### 🔵 Flash Attention v2 (2023) - “流水线的重组”
* **痛点**：v1 虽解决了内存问题，但在多处理器（SM）上的并行分配不够平均。
* **方案**：
    1.  **减少非矩阵运算**：减少了 Softmax 重缩放次数。
    2.  **并行度增强**：支持在 Sequence Length 维度上并行，不再局限于 Batch 和 Head。
    * **结果**：计算效率接近显卡理论峰值（A100 上约 70% 的算力利用率）。

---

##### 4. 结论：跨架构兼容性
* **训练与推理**：你可以使用 Flash Attention v2 训练模型，然后在推理时回退到原生 Attention。
* **一致性**：结果在数值上极其接近（仅有微小的浮点舍入误差），对模型精度（如 LLM 的生成质量）**没有实际影响**。

---

##### 5. 快速检查代码 (PyTorch 2.0+)
```python
import torch
import torch.nn.functional as F

# PyTorch 会根据你的显卡自动选择最优后端
# 优先级：FlashAttention > MemoryEfficient > Math(原生)
with torch.backends.cuda.sdp_kernel(enable_flash=True, enable_math=False):
    output = F.scaled_dot_product_attention(q, k, v)

## 关键发现

- v1 论文给出更低的 HBM 访问量，并报告在多个 Transformer 训练场景的端到端加速。
- v2 论文在 A100 上报告相对 v1 约 2 倍速度，以及达到理论矩阵乘吞吐的 50–73%；该数字来自特定硬件与配置，不能直接套到所有设备。
- 旧稿提到 PyTorch 的 scaled_dot_product_attention。它是**统一 API**，实际选择哪个后端依赖版本、硬件、张量形状和运行条件；不能据接口存在就断言使用了某个 FlashAttention 版本。

## 我的提问


## 局限与疑问

- “数学精确”指实现同一注意力运算；浮点归约顺序不同可能产生小的数值差异，不能保证逐位相同。
- 旧稿的 GPU 代际兼容表和 PyTorch 版本时间线未经对应实现文档逐项核查，暂不将其当成论文结论。

## 我的判断

读性能报告时应同时看 kernel 时间、端到端时间、序列长度、head 维度和实际后端。先记住 **v1 降 IO、v2 提并行**，再决定是否需要深入 CUDA 细节。

## 下次只看这些

1. v1 分块 + 在线 softmax，避免物化完整注意力矩阵。
2. v2 调整序列维并行和 warp 分工。
3. 精确注意力仍是二次计算；实际速度取决于硬件和工作负载。
