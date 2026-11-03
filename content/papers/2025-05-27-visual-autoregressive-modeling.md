---
title: "Visual Autoregressive Modeling: Scalable Image Generation via Next-Scale Prediction"
display_title: "VAR"
paper_url: "https://arxiv.org/abs/2404.02905"
authors: "Keyu Tian et al."
venue: "NeurIPS"
published: "2024"
read_date: "2025-05-27"
status: "已精读"
tags: ["Image Generation", "Autoregressive Generation"]
search_terms: ["VAR", "下一尺度预测", "next-scale prediction", "多尺度视觉 tokenizer", "块状因果注意力"]
one_liner: "把图像自回归从逐 token 预测改为由粗到细的下一尺度预测。"
---

## 研究问题

逐 token 的图像自回归既破坏空间结构又生成缓慢，能否改用由粗到细的生成顺序？

## 核心方法

论文表示VAR在多方面超过DiT。

自回归(autoregressive, AR) 的大语言模型取得了很大的成功，其扩展性（scaling laws）和泛化性（zero-shot）是关键。

DALL-E和VQGAN使用视觉分词器（visual tokenizer）将连续图像离散化为二维词元网格，然后将其展平为一维序列以进行自回归学习，这一过程类似于语言模型中的序列建模。然而，这些模型的扩展法则尚未被充分研究，更令人沮丧的是，它们的性能明显落后于扩散模型。与大型语言模型（LLMs）取得的显著成果相比，自回归模型在计算机视觉中的潜力似乎尚未被充分释放。

自回归建模需要预先定义数据的生成顺序。这篇工作便是重新思考了图像应如何“排序”：人类通常以一种层次化的方式感知或创作图像，先把握整体结构，再逐步补充局部细节。这种多尺度、由粗到细的特性为图像提供了一种自然的“顺序”。

VAR将图像的自回归学习定义为“下一尺度预测”，与传统的“下一个词元预测”相区别。自回归过程从 1×1 的低分辨率词元图起步，并逐步向更高分辨率扩展。

VQGAN背景知识：

> **注**
>
> 📌  VQGAN 背景知识： VQGAN = VQ-VAE + GAN
> 将图像编码为离散 latent（token），借助 GAN 增强重建质量，兼顾压缩与生成能力。
>
> ---
>
> 🔧 模型结构
>
> - **Encoder**：编码图像 $$x$$ 得到连续 latent 表征 $$z_e(x) \in \mathbb{R}^{H \times W \times D}$$
> - **Vector Quantizer**：将 $$z_e(x)$$ 映射为离散 codebook 向量 $$z_q(x)$$
> - **Decoder**：将 $$z_q(x)$$ 解码为重建图像 $$\hat{x}$$
> - **Discriminator**：判别 $$\hat{x}$$ 是否真实，提高重建质量（GAN 结构）
>
> ---
>
> 🧩 向量量化（Codebook Lookup）
>
> > 这整个过程就叫做向量量化。 所以这儿量化可不是我们平日理解的模型压缩里的比特量化 或 视频编码里的量化。
>
> ✅ Codebook 表示：
> $$
> e = \{ \mathbf{e}_k \}_{k=1}^K, \quad \mathbf{e}_k \in \mathbb{R}^D
> $$
>
> > 视觉模型里，可以看作与语言模型中的 Tokenizer对应
>
> ✅ 查找最近邻向量（L2 距离）：
> $$
> k^* = \arg\min_k \| \mathbf{z}_i - \mathbf{e}_k \|^2
> $$
> $$
> z_q(x)_i = \mathbf{e}_{k^*}
> $$
>
> ✅ 高效距离计算 trick：
> $$
> \| \mathbf{z} - \mathbf{e} \|^2 = \| \mathbf{z} \|^2 + \| \mathbf{e} \|^2 - 2 \cdot \mathbf{z}^\top \mathbf{e}
> $$
>
> ---
>
> 🧮 损失函数组合
> $$
> \mathcal{L} = \mathcal{L}_{\text{rec}} + \mathcal{L}_{\text{VQ}} + \mathcal{L}_{\text{GAN}}
> $$
>
> 1. **重建损失**（感知/像素）：
>    $$
>    \mathcal{L}_{\text{rec}} = \| x - \hat{x} \| + \text{Perceptual / PatchGAN Loss}
>    $$
>
> 2. **Codebook 损失**（只更新 codebook 向量，stop-gradient是指梯度截断）：
>    $$
>    \mathcal{L}_{\text{VQ}} = \| \text{sg}[z_e(x)] - e \|^2
>    $$
>
> 3. **Commitment 损失**（让 encoder 靠近 codebook）：
>    $$
>    \mathcal{L}_{\text{commit}} = \beta \cdot \| z_e(x) - \text{sg}[e] \|^2
>    $$
>
> 4. **对抗损失（GAN）**：
>
>    - PatchGAN 判别器对 decoder 输出打分；
>    - 仅优化 decoder（非 codebook）。
>
> 注： $\mathcal{L}_{\text{VQ}}$ 与 $\mathcal{L}_{\text{commit}}$ 这两个损失的目标一致，只是作用的对象不一样，一个是影响编码器一个影响向量码本。这两个损失是 VQ 量化机制的**双向约束**，互相配合保证训练稳定，编码器和 codebook 共同适应数据分布。
>
> ---
>
> 📈 技术特点
>
> | 特点             | 说明                                                  |
> | ---------------- | ----------------------------------------------------- |
> | 离散 latent 表征 | 支持 token 化、适配 Transformer                       |
> | 高压缩能力       | encoder 输出空间维度降低，训练更高效                  |
> | 感知细节丰富     | GAN 提供对纹理与结构的额外监督                        |
> | 可组合性强       | 可作为图像 tokenizer 用于 DALL·E、VQ-Diffusion 等模型 |
>
> ---
>
> 🔁 与 VQ-VAE 区别
>
> | 模型   | 是否使用 GAN | 重建质量 | 纹理保真 | 应用方向        |
> | ------ | ------------ | -------- | -------- | --------------- |
> | VQ-VAE | ✘            | 模糊     | 差       | 表征学习 / 压缩 |
> | VQGAN  | ✔            | 细节丰富 | 高       | 图像生成 / 合成 |
>
> ---
>
> ✅ 总结关键词
>
> `离散编码` ｜ `Codebook Lookup` ｜ `L2 距离计算 Trick` ｜ `重建 + VQ + GAN Loss` ｜ `高保真图像生成`

具体分析当前next-token AR模型的缺陷：

1）**数学前提的违背。** 在量化自编码器（VQVAE）中，编码器通常会生成一个图像特征图 $f$，其中每个位置 $f(i, j)$ 的特征向量彼此存在依赖关系。因此，在经过量化和展平之后，得到的词元序列$(x_1, x_2, ..., x_{h \times w})$ 仍然保留着**双向相关性**。这与**自回归模型的单向依赖假设**相矛盾——自回归模型要求每个词元 $x_t$ 只能依赖于其前缀 $(x_1, x_2, ..., x_{t-1})$。

2）**在某些零样本泛化任务中无法执行**。类似于问题1），图像自回归建模的单向性限制了其在需要双向推理的任务中的泛化能力。例如，它无法在给定图像底部的情况下预测图像的顶部部分。

3）**结构性退化**。展平操作破坏了图像特征图中固有的空间局部性。例如，令 $q(i,j)$ 表示一个 token，它与其四个相邻的邻居 $q(i±1,j)$、$q(i,j±1)$ 由于位置接近而具有较强相关性。但在被线性展开为序列 $x$ 后，这种空间关系被削弱，而单向约束进一步降低了这些相关性。

4）**低效**。使用传统的自注意力 Transformer 生成图像的 token 序列 $x = (x₁, x₂, ..., xₙ×ₙ)$ 需要 $O(n²)$ 个自回归步骤，并带来 $O(n⁶)$ 的计算开销。

提出next-scale预测的视觉自回归模型：

> token是VQVAE里量化的离散的潜在表示。

在这里，自回归单元是整个 token 映射图，而不是单个 token。其建模公式如下：


​                            $p(r_1, r_2, \ldots, r_K) = \prod_{k=1}^{K} p(r_k \mid r_1, r_2, \ldots, r_{k-1})$

其中，$r_k$ 表示第 $k$ 个尺度上的 token 映射图，包含 $h_k \times w_k$ 个 token。

> VAR里训练Multi-scale的VQVAE，我在想这儿codebook应该可以共用一个吧，如果不是，可作为一个改进点？
>
> 看了论文后面，就是共用的codebook。Note that a shared codebook Zis utilized across all scales, ensuring that each rk’s tokens belong to the same vocabulary [V].

请注意，VAR在训练时使用了**块状因果注意力掩码**（block-wise causal attention mask），以确保每个 $r_k$ 只能关注其前缀 $r_{\leq k}$。

> 就是decoder-only架构里的“下三角”注意力。

而在推理阶段，则可以使用 **kv-caching**（键值缓存）机制，此时无需使用注意力掩码。

Tokenization就是用的类似VQGAN里的结构，但是改成了多尺度，以及用了残差设计。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 把图像自回归从逐 token 预测改为由粗到细的下一尺度预测。
