---
title: "SyncAnyone: Implicit Disentanglement via Progressive Self-Correction for Lip-Syncing in the Wild"
display_title: "SyncAnyone"
paper_url: "https://arxiv.org/abs/2512.21736"
authors: "Xindi Zhang et al."
venue: "arXiv"
published: "2025"
read_date: "2026-10-26"
status: "略读"
tags: ["Digital Humans", "Lip Sync"]
search_terms: ["SyncAnyone", "Progressive Self-Correction", "伪配对数据", "无掩码口型编辑", "DMD"]
one_liner: "先用掩码扩散模型生成口型，再以伪配对数据训练无掩码编辑能力。"
---

## 研究问题

掩码过小会泄漏旧口型、过大又丢失身份和背景；如何得到稳定的无掩码口型编辑？

## 核心方法

认为mask-inpainting-based方法，mask小了模型会找图像线索的捷径，mask大了导致关键的背景和id信息丢失。

这个工作提出了Progressive Self-Correction，

其实和X-Dub就类似，只是该工作把数据构造的mask-based的diffusion网络进行了蒸馏，用了Distribution Matching Distillation (DMD)技术，不然在线数据合成太慢了。

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 先用掩码扩散模型生成口型，再以伪配对数据训练无掩码编辑能力。
