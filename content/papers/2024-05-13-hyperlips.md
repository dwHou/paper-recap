---
title: "HyperLips: Hyper Control Lips with High Resolution Decoder for Talking Face Generation"
display_title: "HyperLips"
paper_url: "https://arxiv.org/abs/2310.05720"
authors: "Yaosen Chen et al."
venue: "arXiv"
published: "2023"
read_date: "2024-05-13"
status: "略读"
tags: ["Digital Humans", "Lip Sync"]
search_terms: ["HyperLips", "HyperConv", "超网络动态卷积", "高分辨率唇形", "音频条件卷积"]
one_liner: "用音频驱动的超网络调节卷积权重，再用高分辨率解码器增强口型画质。"
---

## 研究问题

怎样用音频更直接地控制唇部生成，并改善高分辨率人脸画质？

## 核心方法

他们复现的DINet(R)看起来色差问题很严重。至于HyperLips本身，它提出一个很有趣的条件注入方式：

- 在自定义的动态卷积BatchConv2d内部, audio特征会进一步经过2种mlp得到$oc*ic*k*k$、$oc$的维度,用于作为卷积的weight和bias。这里注意下batch维度的处理, 设计了一个分组卷积, groups=b_i。
- 自定义的MultiSequential也挺有意思, 选择性的输入流。

可以看出来hyperlips是以wav2lip的代码基础来改的，改动后的网络结构比较有意思，但不一定高效、解决问题。

它和Wav2Lip一样，应该会遇到数据集过小就没法训练的问题（https://github.com/Rudrabha/Wav2Lip/issues/260）

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 用音频驱动的超网络调节卷积权重，再用高分辨率解码器增强口型画质。
