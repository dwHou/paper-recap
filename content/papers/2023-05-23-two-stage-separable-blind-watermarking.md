---
title: "A Novel Two-stage Separable Deep Learning Framework for Practical Blind Watermarking"
display_title: "A Novel Two-stage Separable Framework for Practical Blind Watermarking"
paper_url: "https://doi.org/10.1145/3343031.3351025"
authors: "Yang Liu et al."
venue: "ACM Multimedia"
published: "2019"
read_date: "2023-05-23"
status: "已读"
tags: ["Watermarking"]
search_terms: ["两阶段盲水印", "不可导攻击", "分离式训练", "抗 JPEG", "水印解码器"]
one_liner: "把水印嵌入与提取分阶段训练，便于适配不可导和新增失真。"
---

## 研究问题

端到端水印系统遇到不可导失真或新增攻击类型时需要重训，如何提高实用性？

## 核心方法

刘杨和郭孟曦的一篇文章，张健等几位老师打磨以后可读性挺好。阅读下来，感觉方法确实比较实用。

现有工作：HiDDeN、ReDMark等端到端训练的框架，一般有编码器、噪声层、解码器三个组件。它的缺点是

- 不支持不可导的噪声，比如压缩
- 不方便临时增加新的噪声类别，整个网络需要重新训练
- 对于训练超参非常敏感，加入一种新的噪声，如果不调整超参，可能图像质量会下降来保证解码的准确率

>It should be emphasized that, for the images with watermarks,the distribution of decoder output M would be as close as possible to -1 and 1, while for the images without watermarks,the distribution would be close to 0, therefore we make the binary message $M\in \left \{-1, 1\right \} ^L$ instead of $ \left \{0, 1\right \} ^L$ .
>
>这里有一个思路是视频盲水印时，提取M接近全0的可以判断为没有嵌入水印的帧。甚至可以设计为early-stop。

这一段是非常重要的细节（不过这也标志着我想转十进制做的方法行不通了，尽快转变思路）。另外由于GAN训练的不稳定性，该工作还加入了谱归一化（spectral normalization）。此外该方法沿用了ReDMark提出的强度系数（S_factor），训练时设置为1，推理时可以增大或减小来调节画质-准确率的trade-off。

该工作还对深度学习的盲水印做了可解释性方面的研究。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断

**评价：主要思想确实有道理。因为是否受攻击，更应该是解码器考虑的事情。编码器去考虑只会影响图像质量。：**

## 下次只看这些

1. 把水印嵌入与提取分阶段训练，便于适配不可导和新增失真。
