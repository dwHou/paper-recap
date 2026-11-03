---
title: "Super Resolution for Compressed Screen Content Video"
display_title: "Super Resolution for Compressed Screen Content Video"
paper_url: "https://sigport.org/sites/default/files/docs/199_4.pdf"
authors: "Meng Wang et al."
venue: "DCC"
published: "2021"
read_date: "2023-01-17"
status: "已读"
tags: ["Image Restoration", "Super Resolution"]
search_terms: ["屏幕内容视频超分", "SCC", "压缩伪影", "场景切换", "文本边缘"]
one_liner: "针对屏幕内容和压缩失真的特点设计视频超分，避免直接沿用自然图像模型。"
---

## 研究问题

屏幕内容具有尖锐边缘、场景突变和压缩失真，直接应用自然视频超分为什么会失效？

## 核心方法

屏幕内容超分

现有超分失效的原因：

1. 数据gap：自然场景内容相对平滑，带有附加传感器噪声。 相比之下，屏幕内容视频可能具有锐利的边缘、高对比度的纹理和无噪声的内容。

   经过编码的屏幕内容：局部切入和截断在屏幕内容视频中很常见，这可能会由于缺少有利的参考而导致编码质量下降。

2. 其次，现有方法采用连续的相邻帧作为输入，而不考虑场景瞬间切换或局部突变。

3. 大多现有方面没有考虑压缩失真。

相关工作：

SSIM把两幅图的相似性按三个维度进行比较：亮度，对比度和结构。公式的设计遵循三个原则：对称性s(x,y)=s(y,x)、有界性s(x,y)<=1、极限值唯一s(x,y)=1当且仅当x=y。

比如，亮度相似度：$l(x,y)=\frac{2\mu_{x}\mu_{y} + C_{1}}{\mu_{x}^{2}+\mu_{y}^{2}+C_{1}} $

本文贡献：

- luminance-sharpness similarity作为loss，

  就是SSIM中亮度维度的相似度 + 提出的一个锐度的相似度。

- 网络结构主要就是利用3个输入：当前帧、前一帧、两帧差异的指数

数据有网页、游戏画面、动画和中英文文档等等。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断

**评价：感觉从网络结构来说有些道理。：**

## 下次只看这些

1. 针对屏幕内容和压缩失真的特点设计视频超分，避免直接沿用自然图像模型。
