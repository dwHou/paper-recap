---
title: "Self Forcing: Bridging the Train-Test Gap in Autoregressive Video Diffusion"
display_title: "Self Forcing"
paper_url: "https://arxiv.org/abs/2506.08009"
authors: "Xun Huang et al."
venue: "NeurIPS 2025"
published: "2025"
read_date: "2026-11-04"
status: "待读"
tags: ["Video Generation", "Autoregressive Generation", "Streaming Video", "Diffusion Models", "Training & Optimization"]
search_terms: ["Self Forcing", "自强制", "exposure bias", "rollout", "train-test gap", "KV cache"]
one_liner: ""
---

## 研究问题

自回归视频扩散训练时用真实历史、推理时用自身生成历史，两者不一致会怎样累积误差？

DMD2里提到的Backward Simulation：在训练时模拟推理过程（Simulate the inference process during training），强迫模型直面自己产生的误差，并在自己的输出分布上进行修正。很有成效。怎么将这个idea从 图像去噪步维度 延伸到 视频自回归序列维度呢？

## 核心方法

待读：重点核对训练时的自身 rollout、KV cache 和梯度截断策略。

> [!TIP]
>
> **KV caching 解决“历史别重复算”；梯度截断解决“整条生成链别完整反传”；Rolling KV Cache 解决“历史别无限存”，配套训练则让模型适应被遗忘的早期上下文。**

#### 1. 训练期 KV Caching（Training-time KV Caching）

原先Teacher Forcing 或 Diffusion Forcing——所有历史帧都是现成的（来自数据集真值），直接拼成一个完整的序列一次性喂给 Transformer，用 Causal Mask（下三角掩码）并行算完所有帧即可，根本不需要缓存。

但在 Self-Forcing 中，训练变成了串行的“边生成、边作为下一帧条件”的过程，如果不加 KV Cache，计算复杂度会变成灾难性的 $O(N^2 \cdot T)$

**Self-Forcing 的做法：** 直接把推理时的 KV Cache 机制搬进训练循环（Training Loop）：

- 当第 $i$ 帧完成了它的去噪过程，得到最终预测的干净帧 $\hat{x}^i_0$ 后，立刻将 $\hat{x}^i_0$ 单独送入网络跑一次前向传播，提取出它在各层的 Key 和 Value 张量，**追加（Append）到训练期的 KV Cache 池子里**。
- 在后续生成第 $i+1, i+2, \dots$ 帧的任何去噪步时，直接复用池子里的 KV Cache，不再重复计算历史帧，将训练展开的时间复杂度降回线性。

#### 2. 随机梯度截断（Stochastic Gradient Truncation）

- **去噪轴：Backward Simulation 式前向展开 + 去噪链梯度截断。**
- **视频轴：自回归 Self-rollout 前向展开 + 历史 KV 梯度截断。**

光用 KV Cache 解决了“算得慢”的问题，但没解决**“显存爆炸（OOM）”**的问题。

假设一个视频有 $N=21$ 个潜空间帧（或 Chunk），每帧去噪 $T=4$ 步。如果老老实实把整个串行生成过程的计算图全部保留下来做反向传播（BPTT，Backpropagation Through Time），梯度链路长达 $21 \times 4 = 84$ 次大模型前向传播！哪怕是 80GB 的 H100 也会瞬间爆显存。

为了斩断这条恐怖的计算图，Self-Forcing 做了**“双重截断”**：

<font color="brown">第一刀</font>：单帧去噪步内的随机截断（Intra-frame Truncation）

就是Backward Simulation，去噪步维度的Simulate the inference process。

生成第 $i$ 帧原本固定要跑 $T$ 步（比如 4 步）。但在训练时，对于每一帧，算法会**随机采样一个终止步数 $s \in \{1, 2, \dots, T\}$**：

- **前 $s-1$ 步（无梯度模拟）**：全部放在 `torch.no_grad()` 下运行！不保存中间激活值，纯粹为了模拟推理时的中间状态。
- **第 $s$ 步（挂载梯度并提前终止）**：开启 `torch.enable_grad()`，跑完这第 $s$ 步后，直接拿模型在这一步预测出的干净图像 $\hat{x}^i_0$ 作为该帧的最终输出（跳过剩下的 $T-s$ 步），并送到后面去算整段视频的 DMD Loss。
- **为什么必须是“随机”选第 $s$ 步，而不是固定只算第 4 步的梯度？** 如果你永远只对最后一步（第 4 步，噪声最小的那一步）开启梯度回传，那么模型在面对大噪声（第 1、2、3 步）时的去噪能力就永远得不到梯度更新！通过随机在第 $s$ 步停下并算 Loss，既保证了**每一帧永远只有 1 步去噪留在计算图里（节省了 75% 显存）**，又能在期望上让所有噪声时间步都得到充分的监督。

<font color="brown">第二刀</font>：跨帧 KV Cache 的梯度截断（Inter-frame Detach）

当第 $i$ 帧生成完毕、提取出 KV Cache 准备给第 $i+1$ 帧使用时，Self-Forcing **显式地对 KV Cache 做了 `.detach()`（截断梯度流）**！

- 也就是说，第 $i+1$ 帧算出的 Loss 梯度，只会用来更新第 $i+1$ 帧当前这一步的模型参数，**不会顺着 KV Cache 反向传播回第 $i$ 帧、第 $i-1$ 帧的生成过程**。
- 虽然梯度不往回传，但**前向传播的输入（Forward Context）变了**。第 $i+1$ 帧在训练时看到的 KV Cache，实打实是模型自己在前 $i$ 帧生成的带有瑕疵的特征。

#### 3. 滚动 KV 缓存机制（Rolling KV Cache）

前两点解决了“固定长度视频（比如训练时的 5 秒视频）”的生成，但如果要做无限长视频流式生成（Extrapolation，比如生成 30 秒、1 分钟），KV Cache 无限增长还是会爆显存，而且超出训练时的位置编码长度也会崩。

最直观的想法是用**滑动窗口（Sliding Window / FIFO 队列）**：只保留最近 $L$ 帧的 KV Cache，每生成新的一帧，就把最老的一帧踢出缓存。但直接这么做，在当时的视频模型（比如基于 Wan2.1 架构的模型）上会遇到一个**致命的架构坑**，导致视频画面疯狂闪烁或崩坏：

- **坑在哪里？（首帧的特殊性）** 现代视频扩散模型使用的是 **3D 因果 VAE（Causal 3D VAE）**。为了既能处理图片又能压缩视频，这类 VAE 的编码规则通常是：**第 1 帧（First Frame）是不做时间压缩的（1帧图像对应 1个 Latent 帧），而后面的帧是每 4 帧像素压缩成 1 个 Latent 帧**。 这导致**第 1 个 Latent 帧的统计分布（Statistics）和后面所有 Latent 帧都完全不同**！如果在训练时，模型每一帧都能看到第 1 帧，它就会把第 1 帧当成“定海神针（Attention Sink）”。一旦在推理长视频时，用滑动窗口把第 1 帧踢出了 KV Cache，模型突然发现视野里没有那个特殊分布的“首帧”了，瞬间就会发生分布崩溃！

- **适应“首帧消失”的训练**

  **Self-Forcing 的 Rolling KV Cache 是怎么解决的？** 既然推理长视频时早晚要扔掉第 1 帧，那就**在训练时提前模拟“看不见第 1 帧”的情况**： 在训练序列展开到最后几帧（或最后一个 Chunk）时，作者专门加了一个**局部注意力掩码限制（Attention Restriction）——强制禁止最后一帧去 Attend 第 1 帧的 KV Cache**！ 通过这个极其简单却直击要害的训练技巧，模型在训练期就学会了：“即便我的缓存窗口里全是经过时间压缩的普通视频 Latent、没有那个特殊的第 1 帧，我也知道该怎么正常生成画面”。这样在推理时，就可以丝滑地用固定大小的环形缓冲区（Rolling Buffer）一路无限滚动生成下去，不仅时间复杂度是 $O(T \cdot L)$，而且无需任何重叠帧重计算。

![Self Forcing 训练算法：随机梯度截断与 KV 缓存更新](../media/self-forcing/self-forcing-training-algorithm.png "算法 1：Self Forcing 训练流程。来源：[Huang 等，原论文算法 1](https://arxiv.org/html/2506.08009v2)；许可：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；原图摘录，未改动。")

## 关键发现

待读。阅读论文后补充实验结论与数字。

## 我的提问

### Q1：阅读时先确认什么？

与 CausVid 使用 per-chunk 噪声和双向教师蒸馏的路线怎样互补？

## 局限与疑问

待读。阅读后核对论文自己承认的局限。

## 我的判断

待读。暂不作可信度或复现价值判断。

## 下次只看这些

1. 阅读原论文并补充方法、关键图和实验依据。
