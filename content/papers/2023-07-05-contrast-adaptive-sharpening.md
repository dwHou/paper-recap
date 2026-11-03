---
title: "Contrast Adaptive Sharpening"
display_title: "Contrast Adaptive Sharpening"
paper_url: ""
authors: "待补充"
venue: "工程项目"
published: "待补充"
read_date: "2023-07-05"
status: "略读"
tags: ["Image Enhancement", "Image Restoration"]
search_terms: ["CAS", "AMD FidelityFX", "局部对比度锐化", "3x3 锐化", "TAA"]
one_liner: "按局部 3×3 对比度调节锐化强度，以免高对比区域过度锐化。"
---

## 研究问题

怎样根据局部对比度调整锐化强度，避免高对比区域过冲？

## 核心方法

对比度自适应锐化 ([CAS](https://docs.o3de.org/docs/atom-guide/features/cas/)) 是一种图像锐化技术，在决定锐化程度时会考虑局部 3x3 邻域的对比度。 高对比度样本的锐化程度远低于低对比度样本。 这有助于防止在均匀锐化的标准锐化滤镜中出现过度锐化的外观。 您可以将 CAS 与临时抗锯齿 (TAA) 结合使用，以减少 [TAA](https://docs.o3de.org/docs/atom-guide/features/taa/) 给图像带来的柔和。

AMD的CAS和NVIDIA的Freestyle都使用的该技术，实现可参考 https://chainner.app/。

PPT&DEMO:

https://gpuopen.com/wp-content/uploads/2019/07/FidelityFX-CAS.pptx

https://www.shadertoy.com/view/wtlSWB#

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 按局部 3×3 对比度调节锐化强度，以免高对比区域过度锐化。
