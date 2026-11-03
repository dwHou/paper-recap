---
title: "StegaStamp: Invisible Hyperlinks in Physical Photographs"
display_title: "StegaStamp"
paper_url: "https://arxiv.org/abs/1904.05343"
authors: "Matthew Tancik et al."
venue: "CVPR"
published: "2020"
read_date: "2023-05-22"
status: "已读"
tags: ["Watermarking", "Image Restoration"]
search_terms: ["StegaStamp", "物理照片隐写", "不可见超链接", "打印拍摄失真", "图像二维码"]
one_liner: "将链接位串隐写进自然照片，并针对打印、拍摄造成的失真训练解码器。"
---

## 研究问题

如何把链接隐写进实体照片，使其经历打印和再次拍摄仍可扫描？

## 核心方法

本文设计了一个有趣的应用，可以称之为自然图片二维码。扫描图片就可以得到网址。幕后的技术仍是视频不可见水印。进一步，未来，增强现实 (AR) 系统可能会执行此任务，将检索到的信息与用户视图中的照片一起视觉叠加（Ren Ng真是创新力相当强）。

> *Another way to think about this is physical photographs that have unique QR codes invisibly embedded within them.*

后续有人开发了[*1](https://github.com/JisongXie/StegaStamp_pytorch)[*2](https://github.com/Charmve/StegaStamp-plus)[*demo](https://charmve.github.io/steganography.js/examples/showcase/)，可玩性比较不错。

本文训练上比较特别的是：原作者的程序在前1500次迭代中将图像损失函数从总损失函数中去除，从而在一定程度上提高了比特精度。后面才加入图像损失。然后模型的初始化方式值得思考一下。

HiDDeN vs. StegaStamp:

1. 嵌入方式：HiDDeN是将消息膨胀后在通道维度和深度特征连接；StegaStamp是用全连接层预处理消息，再reshape和上采样到和图片一样的空间尺寸。（倾向HiDDeN）
2. 损失函数：HiDDeN是$L_M+0.7*L_I+0.001*L_G$，整个训练期间使用不变的系数；StegaStamp加入了$L_{lpips}$，特别指出一开始$L_{lpips}$、$L_I$、$L_G$的系数都设为0，直到解码达到比较高的准确率，再线性增加$L_{lpips}$、$L_I$、$L_G$的系数。（倾向StegaStamp）
3. 训练阶段：HiDDeN没有训练阶段的区别，只是攻击越难，训练总轮数越多；StegaStamp对于图像扰动/攻击，则是由易到难地慢慢增加。（倾向StegaStamp）
4. 网络结构：HiDDeN是平铺型，靠膨胀（expand）和池化来编码和解码消息；StegaStamp是U型，使用残差学习。

StegaStamp还使用了纠错码等传统方法。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 将链接位串隐写进自然照片，并针对打印、拍摄造成的失真训练解码器。
