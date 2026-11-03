---
title: "Structure-Aware Motion Transfer with Deformable Anchor Model"
display_title: "Structure-Aware Motion Transfer with Deformable Anchor Model"
paper_url: "https://arxiv.org/abs/2204.05018"
authors: "Jiale Tao et al."
venue: "CVPR"
published: "2022"
read_date: "2023-03-24"
status: "略读"
tags: ["Digital Humans", "Video Processing"]
search_terms: ["DAM", "可形变锚点", "结构感知运动迁移", "根锚点", "无监督关键点"]
one_liner: "通过潜在根锚点约束运动关键点，降低结构错配造成的运动迁移模糊。"
---

## 研究问题

运动迁移中的隐式关键点可能落在错误部位，怎样加入结构先验减少模糊？

## 核心方法

阿里妈妈的工作，基于FOMM。👉🏻[PR](https://blog.csdn.net/alimama_Tech/article/details/125419491)

FOMM的缺陷：

**源图像**和**驱动图像**关键点检出的对应关键点并没有指向同一个真实部位时，输出结果中这个区域的就有较强的结构模糊。另外，还有一个观察是通常这样的不匹配都源自关键点检测没有击中合理的部位，甚至都在人体/脸部以外了。

本文改进：

推理不变，训练则引入结构先验（或叫位置先验），关键点的对应点既可以通过根节点光流图计算得到，又可以通过模型直接直接预测出来。两路结果求Loss，就惩罚了不符合根节点先验约束的关键点位置预测。

## 关键发现

**效果比较：**

FOMM vs. RegionMM vs. This paper

## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 通过潜在根锚点约束运动关键点，降低结构错配造成的运动迁移模糊。
