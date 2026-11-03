---
title: "VideoReTalking: Audio-based Lip Synchronization for Talking Head Video Editing In the Wild"
display_title: "VideoReTalking"
paper_url: "https://arxiv.org/abs/2211.14758"
authors: "Kun Cheng et al."
venue: "SIGGRAPH Asia"
published: "2022"
read_date: "2023-05-22"
status: "已读"
tags: ["Digital Humans", "Video Editing", "Lip Sync"]
search_terms: ["VideoReTalking", "视频重配音", "canonical expression", "人脸增强", "audio-based lip synchronization"]
one_liner: "通过视频编辑流程将已有说话视频重新对齐到新音频。"
---

## 研究问题

**现有方法：恢复牙齿使用teeth proxy：**

## 核心方法

如果是全身人像，感觉更廉价的方案是 [video-retalking](https://opentalker.github.io/video-retalking/)。

后续还有[SadTalker](https://github.com/OpenTalker/SadTalker)，[StyleSync](https://github.com/guanjz20/StyleSync_PyTorch)，[DINet](https://github.com/MRzzm/DINet)，[FaceFormer](https://github.com/EvelynFan/FaceFormer)，[CodeTalker](https://github.com/Doubiiu/CodeTalker)等新的SOTA。

用类似俞睿师兄的PIRender来做canonical expression，同时也能控制表情。

lipsync的网络用了Fast Fourier Convolution.


产业界可以关注：

[https://aman-agarwal.com/2022/07/01/deepfake-videos-kristof-szabo-colossyan/](https://www.google.com/url?q=https://aman-agarwal.com/2022/07/01/deepfake-videos-kristof-szabo-colossyan/&sa=D&source=docs&ust=1696838688057700&usg=AOvVaw1DRSXTs2lZf5W7CNtDd8y7)

**本文方法：使用预训练的人脸解析网络，配合GFP-GAN修复牙齿：**

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 通过视频编辑流程将已有说话视频重新对齐到新音频。
