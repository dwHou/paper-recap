---
title: "Talking Face Generation by Adversarially Disentangled Audio-Visual Representation"
display_title: "Adversarially Disentangled Audio-Visual Representation"
paper_url: "https://arxiv.org/abs/1807.07860"
authors: "Hang Zhou et al."
venue: "AAAI"
published: "2019"
read_date: "2026-08-31"
status: "已读"
tags: ["Digital Humans", "Lip Sync"]
search_terms: ["音视频解耦表示", "domain adversarial", "梯度反转层", "说话人身份解耦", "viseme"]
one_liner: "用对抗式训练解耦人物外观与语音内容，使说话脸生成可跨身份泛化。"
---

## 研究问题

怎样将说话内容与人物外观解耦，使音频驱动人脸生成可以跨身份工作？

## 核心方法

作者Yu Liu创业做可交互生成（包括[数字人](https://vivix.ai/tech-report-vivix-a1)）了，估值很高。

核心创新就是 domain-adversarial / gradient-reversal 方法的利用。

> 这也是语音转换里speaker-independent content encoder、人脸重演里identity/expression disentangle 等任务里的经典方法。

其实思想和GRL很像，GRL来自Unsupervised Domain Adaptation by Backpropagation

> 个人认为 在生成任务（主任务）上用处不大，这个主要还是在DANN/不变性上用得较多。

Viseme-Invariant Source Encoder的实验尝试：

1. 第一版：

$$ \mathcal{L}_{\mathrm{inv}}^{\mathrm{L1}} = \bigl\| E(c_A) - E(c_B) \bigr\|_1. $$

`src_encoder(companionA)` = `src_encoder(companionB)`

使得`src_encoder`编码器要对teacher 实际随音频改的东西无感，留下两边共有的：id、背景、头姿、光照。 **去表情，存身份。**

> 不变性的encoder里加了attetion map，用于可视化。发现会对高频信息压制，而不单纯对viseme压制。不然上半张脸不应该压制的。

2. 第二版

$$ \min_{E}\max_{D}\; \mathbb{E}\bigl[ \log D(h_B) + \log\bigl(1 - D(h_A)\bigr) \bigr]. $$

用对抗损失来实现类似的目标。让判别器不可分 $h_B$和 $h_A$。

> 注：D是以音频为条件的条件判别器

3. 第三版

$$ \mathrm{GRL}_{\lambda}(h) = h, \qquad \frac{\partial\,\mathrm{GRL}_{\lambda}(h)}{\partial h} = -\lambda I. $$

GRL方法也是做这个事情。

$$ \nabla_{\theta_D}\mathcal{L}=+\nabla_{\theta_D}\mathcal{L}_{D}, \qquad \nabla_{\theta_E}\mathcal{L}_{\mathrm{adv}} = -\lambda\,\nabla_{\theta_E}\mathcal{L}_{D}. $$

> Unsupervised Domain Adaptation by Backpropagation
>
> 在生成任务（主任务）上用处不大，这个主要还是在DANN/不变性上用得较多。

$$ \begin{align} \mathcal{L}_{\mathrm{inv}}^{\mathrm{L1}} &= \bigl\| h_A - h_B \bigr\|_1, \\ \mathcal{L}_{\mathrm{inv}}^{\mathrm{adv}} &= \ell_{\mathrm{BCE}}\bigl(D(h_A), 1\bigr) + \ell_{\mathrm{BCE}}\bigl(D(h_B), 0\bigr), \\ \mathcal{L}_{\mathrm{inv}}^{\mathrm{GRL}} &= \ell_{\mathrm{BCE}}\bigl(D(\mathrm{GRL}_{\lambda}(h_A)), 0\bigr) + \ell_{\mathrm{BCE}}\bigl(D(\mathrm{GRL}_{\lambda}(h_B)), 1\bigr). \end{align} $$

考虑到推理时用真实分布，所以也需要D在真实分布上能判别viseme：

| 样本对                                                     | 标签   | 音频来源                       |
| ---------------------------------------------------------- | ------ | ------------------------------ |
| ($h_A$, $a_A$)、($h_B$, $a_B$)                             | 同步   | teacher whisper                |
| ($h_A$, $a_B$)、($h_B$, $a_A$)                             | 不同步 | A/B 对换                       |
| ($h_{\mathrm{src}}$, $a_{\mathrm{src}}$)                   | 同步   | 本帧真实语音（源视频 whisper） |
| ($h_{\mathrm{src}}$, $a_A$) 或 ($h_{\mathrm{src}}$, $a_B$) | 不同步 | 随机 teacher 音频              |

## 关键发现


## 我的提问


## 局限与疑问


## 我的判断


## 下次只看这些

1. 用对抗式训练解耦人物外观与语音内容，使说话脸生成可跨身份泛化。
