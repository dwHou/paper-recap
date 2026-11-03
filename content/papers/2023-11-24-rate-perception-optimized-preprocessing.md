---
title: "Rate-Perception Optimized Preprocessing for Video Coding"
display_title: "Rate-Perception Optimized Preprocessing"
paper_url: "https://arxiv.org/abs/2301.10455"
authors: "Chengqian Ma et al."
venue: "arXiv"
published: "2023"
read_date: "2023-11-24"
status: "略读"
tags: ["Image Enhancement", "Video Processing"]
search_terms: ["RPP", "编码前处理", "码率感知优化", "自适应 DCT 损失", "视频压缩"]
one_liner: "在编码前用轻量网络预处理视频，同时权衡码率和感知质量。"
---

## 研究问题

如何在不改动现有编解码器的前提下，用编码前处理改善感知质量和码率？

## 核心方法

RPP是b站上产线的一个编码前处理方法。

- 提出adaptive Discrete Cosine Transform (DCT) loss
- 结合high-order degradation model
- 结合efficient lightweight network design (1080p@87FPS)
- 结合Image Quality Assessment model

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 在编码前用轻量网络预处理视频，同时权衡码率和感知质量。
