---
title: "StyleLipSync: Style-based Personalized Lip-sync Video Generation"
display_title: "StyleLipSync"
paper_url: "https://arxiv.org/abs/2305.00521"
authors: "Taekyung Ki and Dongchan Min"
venue: "ICCV"
published: "2023"
read_date: "2023-09-05"
status: "略读"
tags: ["Digital Humans", "Lip Sync"]
search_terms: ["StyleLipSync", "StyleGAN 嘴部先验", "个性化口型", "少样本微调", "sync regularizer"]
one_liner: "以 StyleGAN 嘴部先验和同步正则实现少样本个性化唇形生成。"
---

## 研究问题

如何把通用口型模型适配到少量样本的特定人物，同时保留同步泛化能力？

## 核心方法

ICCV2023

图像解码器使用了StyleGAN，提供嘴部先验。

对latent使用了滑动平均进行平滑，使得时域更稳定。

提到这几篇论文可以做person- specific finetune：`Mystyle`, `Synctalkface`, `Pivotal tuning for latent-based editing of real images`

它将ref和audio都放在旁支网络了。

使用Sync regularizer增加短视频训练对于音频的泛化性。

> fine-tuning the decoder on a short video of a single identity leads to over-fitting and losing the lip-sync generality as the generator can memorize the target video.

和我们的做法不谋而合，很容易想到。区别点只是，该工作先训general的，再finetune person-specific的，过程中加上大规模数据集的音频完成Sync regularizer。 且普通的sync loss一直都在。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 以 StyleGAN 嘴部先验和同步正则实现少样本个性化唇形生成。
