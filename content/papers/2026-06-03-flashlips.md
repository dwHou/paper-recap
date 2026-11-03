---
title: "FlashLips: 100-FPS Mask-Free Latent Lip-Sync using Reconstruction Instead of Diffusion or GANs"
display_title: "FlashLips"
paper_url: "https://arxiv.org/abs/2512.20033"
authors: "Andreas Zinonos et al."
venue: "CVPR"
published: "2026"
read_date: "2026-06-03"
status: "略读"
tags: ["Digital Humans", "Lip Sync"]
search_terms: ["FlashLips", "单步潜空间编辑", "mask-free lip sync", "伴侣帧", "实时唇形同步"]
one_liner: "将口型控制与渲染分开，以单步潜空间重建实现实时无掩码同步。"
---

## 研究问题

怎样实现低延迟、无掩码的口型同步，同时避免反复扩散采样？

## 核心方法

https://arxiv.org/pdf/2512.20033

核心idea是借用SDXL VAE来实现mask-free。

但我认为本质没有变，只是在latent空间做。关键在于构建一个改口型的latent，和src的latent是同一个domain。 然后训练时都用改口型的latent制造companion输入，推理时则用src。

其实和我们在图像空间做companion video是一个道理。

> 个人感受是它在latent space制造companion（其它口型的输入），我们通用模型是在image space制造companion。 本质上差别不大，但在latent space可能对图像线索的泄漏要少一点。
>
> 相关知识参考From Inpainting to Editing.

可以复现出基础效果。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 将口型控制与渲染分开，以单步潜空间重建实现实时无掩码同步。
