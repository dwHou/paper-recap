---
title: "Pixel-Adaptive Convolutional Neural Networks"
display_title: "Pixel-Adaptive Convolutional Neural Networks"
paper_url: "https://openaccess.thecvf.com/content_CVPR_2019/html/Su_Pixel-Adaptive_Convolutional_Neural_Networks_CVPR_2019_paper.html"
authors: "Hang Su et al."
venue: "CVPR"
published: "2019"
read_date: "2022-10-31"
status: "已精读"
tags: ["Image Enhancement", "Training & Optimization"]
search_terms: ["PAC", "像素自适应卷积", "动态卷积", "双边滤波", "内容自适应核"]
one_liner: "让卷积核随像素内容变化，改善固定权重卷积的内容无关性。"
---

## 研究问题

**分析现有方法：**

权重共享的标准卷积是content-agnostic的。这个劣势可以通过学习大量滤波器来解决，但这样做增加了待学习的参数量，需要更大的内存占用和更多的标注数据。 另一种是content-adaptive的卷积：

- 一类是使传统的图像自适应滤波器可微分，例如双边滤波器（bilateral filters ）、导向滤波器（guided image filters ）、非局部均值（non-local means ）、传播图像滤波（propagated image filtering  ），并将它们用作 CNN 的层。 这些内容自适应层通常设计用于增强 CNN 结果，但不能替代标准卷积。
- 另一类是内容自适应网络，使用单独的子网络学习特定位置的核，该子网络预测每个像素的卷积滤波器权重。 这些被称为“动态滤波网络”（DFN），也称为交叉卷积（cross-convolution）或核预测网络（KPN）。尽管 DFN 是通用的并且可作为标准卷积层的替代品，但很难扩展到具有大量滤波器组的整个网络。

## 核心方法

[PAC](https://suhangpro.github.io/pac/)

**本文方法：**

标准卷积：

$\mathbf{v}'_i = \sum_{j \in \Omega(i)} \mathbf{W}\left[\mathbf{p}_i - \mathbf{p}_j\right] \mathbf{v}_j + \mathbf{b} $  (1)

这里$\mathbf{p}_i$是像素坐标。稍微滥用了符号，本文使用$[\mathbf{p}_i - \mathbf{p}_j]$来表示2D的空间维度
偏移量的索引。公式(1)可见，权重仅取决于像素位置，因此与图像内容无关。 换句话说，权重在空间上是共享的，是image-agnostic的。

现有动态卷积：

$\mathbf{v}'_i = \sum_{j \in \Omega(i)} \mathbf{W}\left(\mathbf{f}_i - \mathbf{f}_j\right) \mathbf{v}_j + \mathbf{b}$ (2)

使卷积操作内容自适应的一种直观方法，而不仅仅是基于像素位置，是将 W 泛化为依赖于像素特征。它的缺点是 ① 计算开销(overhead)大 ② 特征f很难学。需要手动指定特征空间，例如位置和颜色特征f = (x, y, r, g, b)。③ 我们必须限制特征的维度 d（例如，< 10），因为投影的输入图像在高维空间中可能变得过于稀疏。 ④ 此外，标准卷积的权值共享带来的优势在高维滤波中消失了。

像素自适应卷积：

$\mathbf{v}'_i = \sum_{j \in \Omega(i)} K\left(\mathbf{f}_i, \mathbf{f}_j\right) \mathbf{W}\left[\mathbf{p}_i - \mathbf{p}_j\right] \mathbf{v}_j + \mathbf{b}$  (3)

其中 K 是具有固定参数形式的核函数，例如高斯：$K(\mathbf{f}_i, \mathbf{f}_j)=\exp(-\frac{1}{2}(\mathbf{f}_i-\mathbf{f}_j)^\intercal (\mathbf{f}_i-\mathbf{f}_j))$

因为 K 具有预定义的形式，我们可以在 2D 网格本身上执行此过滤，而无需移动到更高维。 我们将上述滤波操作（等式 3）称为“像素自适应卷积”（PAC），因为标准空间卷积 W 通过内核 K 使用像素特征 f 在每个像素处进行自适应。我们将这些像素特征 f 称为“自适应特征 ”，内核 K 为“自适应内核”。 **自适应特征 f** 可以是手动指定的，例如位置和颜色特征 f = (x, y, r, g, b)，也可以是端到端学习的深度特征。

PAC可以看作几种广泛使用的滤波操作的泛化形式：

- 标准卷积可以看作PAC的特例，$K(\mathbf{f}_i, \mathbf{f}_j) = 1$。这可以通过设置常数自适应特征 f 来实现，即$\mathbf{f}_i = \mathbf{f}_j, \forall i,j$。

- 双边滤波也可看作PAC的特例，其中W 也有固定的参数形式，例如 2D 高斯滤波器：$\mathbf{W}\left[\mathbf{p}_i - \mathbf{p}_j\right]=\exp(-\frac{1}{2}(\mathbf{p}_i-\mathbf{p}_j)^\intercal\Sigma^{-1}(\mathbf{p}_i-\mathbf{p}_j))$.

  > 双边滤波（Bilateral filter）是**一种非线性的滤波方法，是结合图像的空间邻近度和像素值相似度的一种折中处理，同时考虑空域信息和灰度相似性，达到保边去噪的目的**。

- 池化操作也可以由 PAC 建模。平均池化对应PAC的特例，

  $K(\mathbf{f}_i, \mathbf{f}_j)=1,\; \mathbf{W}=\frac{1}{s^2}\cdot\mathbf{1}$，最近提出的细节保持池化，对应$K(\mathbf{f}_i, \mathbf{f}_j)=\alpha + \left(|\mathbf{f}_i-\mathbf{f}_j|^2+\epsilon^2\right)^\lambda$

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断

**阅读评价：**

文章提到了自注意力，说概念类似，但是PAC只关注local，不需要很高的复杂度。但比较好奇这样和空间注意力有啥区别？可能唯一区别是多了img2col。在卷积操作时起作用。

https://www.yuque.com/lart/architecture

## 下次只看这些

1. 让卷积核随像素内容变化，改善固定权重卷积的内容无关性。
