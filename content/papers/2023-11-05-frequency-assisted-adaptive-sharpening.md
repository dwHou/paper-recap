---
title: "Frequency-Assisted Adaptive Sharpening Scheme Considering Bitrate and Quality Tradeoff"
display_title: "Frequency-Assisted Adaptive Sharpening"
paper_url: ""
authors: "Yingxue Pang et al."
venue: "ICME"
published: "2023"
read_date: "2023-11-05"
status: "略读"
tags: ["Image Enhancement", "Video Processing"]
search_terms: ["FreqSP", "码率质量折中", "VMAF", "USM 锐化", "频域特征"]
one_liner: "依据频率特征预测锐化等级，在码率和 VMAF 之间寻找折中。"
---

## 研究问题

锐化会同时影响画质和编码码率；怎样选择对视频内容合适的锐化等级？

## 核心方法

考虑码率和质量的trade-off。

首先标注最优的锐化水平：

> Given the uncompressed video, we first sharpen it at seven levels (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0) using the built-in USM function of FFmpeg [2], and then encode the sharpened videos using the HEVC/H.265 codec [3] across five CRF values (21, 24, 27, 30, 33). We define the pre- sharpening encoding process as different encoders by sharpening levels and plot the RD curves for each encoder using the bitrate and VMAF. The overall seven curves are displayed in Fig. 2 (a). Then we consider the encoder with sharpening level 0.0 as the anchor to calculate the BD-Rate of the other sharpening levels.

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 依据频率特征预测锐化等级，在码率和 VMAF 之间寻找折中。
