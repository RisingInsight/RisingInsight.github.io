---
title: "深度生成模型"
pubDate: 2026-01-02
math: true
featured: true
description: "从VAE到DDPM：全面推导深度生成模型的核心原理，包括变分自编码器ELBO推导、GAN对抗训练、Flow模型以及扩散模型DDPM的前向过程与逆向去噪过程。"
tags:
  - 深度学习
  - 生成模型
  - VAE
  - 扩散模型
  - DDPM
  - GAN
categories:
  - 深度学习理论
series: 生成模型笔记
---
# 图片

​	对于一张彩色图片而言，它有RGB三通道。**R通道**：记录图像中每个像素的**红色分量强度**（通常用0~255的数值表示，0表示无红色，255表示红色最亮）。**G通道**：记录**绿色分量强度**。**B通道**：记录**蓝色分量强度**。对于图片中的某一个像素而言，它有256x256x256种颜色，RGB三个通道组合而成。



# 深度生成模型

​	文本生成，图片生成，视频生成。

​	对于一个输入，可以有多种，甚至无穷种回答。输出可能比输入更加复杂且高纬



​	一段文字转换为一个模型，模型需要进行大量的脑补。因为图片对应的文字有很多，一张图胜过千言万语。

![image-20251222152235572](/posts/deep-generative-models/image-20251222152235572.png)

​	对于文字生成而言，主要采取逐个击破（Autoregressive，自回归），从输入文本计算出最可能的下一个字或者词（计算概率，选概率最大的），然后将其追加到输入文本的末尾，作为新的输入。然后重复，直到生成结束标记；图片生成的话，也可以采取这种方式进行。要画一只奔跑的狗，计算第一个像素最可能为什么颜色（概率最大），然后将第一个像素和文字作为新的输入，重复，知道生成结束标记。太浪费时间，==现在的图像生成不使用Autorgessvie自回归！！！==

​	image-gpt：将2D图像转换为1D序列（得到256排的256个token），对于每一排的256个token，从输入token计算出最可能的下一个token，然后将其追加到输入token的末尾，作为新的输入。然后重复，直到生成结束标记。然后**图片生成都是一排一排生成出来的**。

<img src="/posts/deep-generative-models/image-20251222153436840.png" alt="image-20251222153436840" class="w-1/4" />

​	一步到位生成：直接预测256x256个每个像素点的颜色。得到的结果就是一个分布之内的，在这个分布之内的都是正确的输出。但是使用一步到位生成会导致每个像素点可能要画的图不一样（例如有的像素点是想画黑狗，有的想画白狗，有的向前跑，有的向后退，....）

<img src="/posts/deep-generative-models/image-20251222164736119.png" alt="image-20251222164736119" class="w-2/3" />

​	为了解决这个问题，就需要使用Normal Distribution。通过Normal Distribution 得到可能的图片P(x|y)，然后文字就帮忙指导映射。

<img src="/posts/deep-generative-models/image-20251222165314430.png" alt="image-20251222165314430" class="w-2/3" />



# Variational Auto-encoder(VAE)

​	把Normal Distribution采样得到的向量放进Decoder中

![image-20251222170720742](/posts/deep-generative-models/image-20251222170720742.png)

## AE和VAE结构

AE（自编码器）的核心是**编码-解码-重建**，结构如下：

- **输入**：原始图像 $X$（高维数据）
- **Encoder（编码器）**：将 $X$ 降维到低维隐空间（Latent Space），得到一个确定的隐向量 $z$（$z = \text{Encoder}(X)$）
- **Decoder（解码器）**：将隐向量 $z$ 升维，还原回高维图像 $\hat{X}$（$\hat{X} = \text{Decoder}(z)$）
- **训练目标**：最小化**重建误差**（比如像素级MSE），即让 $\hat{X} \approx X$

​	AE能做好**降维+重建**，但没法**生成新数据**——因为训练后，每个 $X_i$ 和 $z_i$ 是**一一对应**的（隐空间是"离散点"分布）。如果随机采样一个不在训练集中的 $z$，Decoder会生成无意义的垃圾数据（隐空间缺乏"连续性"和"分布规律"）。点到点的映射（像是一个**死记硬背的学生**记住了全部的问题和答案（Xᵢ ↔ zᵢ），考试时只出原题就能答对（重建），但稍微变化一下题目，就完全不会了（无法生成））。

​	**核心需求**：给隐空间 $z$ 加**分布约束**，让 $z$ 服从已知概率分布（如标准正态分布 $\mathcal{N}(0,1)$），这样就能从该分布中随机采样 $z$，通过Decoder生成新数据。这是VAE的核心动机。

<img src="/posts/deep-generative-models/image-20251231194942578.png" alt="image-20251231194942578" class="w-1/3" />



​	VAE（变分自编码器）保留AE的**编码-解码**结构，但对Encoder做关键修改，同时引入新的Loss项，解决"生成能力"问题。给隐空间加"分布约束"。分布到分布的映射（像是一个**理解规律的学生**，不仅记住答案，还理解了**答案背后的分布规律**，知道所有答案都符合某种"语法"或"规则"，即使遇到新问题，也能根据规则生成合理答案）。

- **Encoder（变分编码器）**：不再输出确定的 $z$，而是输出**概率分布的参数**——均值 $\mu$ 和方差 $\sigma^2$：
  $$
  \mu = f_1(X), \quad \log\sigma^2 = f_2(X)
  $$
  含义：对于输入 $X$，其隐向量 $z$ 不是一个点，而是服从高斯分布 $\mathcal{N}(\mu, \sigma^2)$ 的随机变量。

- **采样步骤**：从 $\mathcal{N}(\mu, \sigma^2)$ 中随机采样一个 $z$（生成能力的关键，后续用重参数化解决梯度问题）。

- **Decoder（解码器）**：和AE一致，输入采样得到的 $z$，输出重建图像 $\hat{X}$，对应条件概率 $p(X|z)$（"给定 $z$，生成 $X$ 的概率"）。

## VAE的Loss

VAE的Loss是**重建Loss + KL散度**，本质是平衡两个矛盾：

- 采样的随机性会导致重建误差增大（每次采样的 $z$ 不同，$\hat{X}$ 也不同）→ 网络倾向于让方差 $\sigma^2 \to 0$（退化成AE，失去生成能力）。
- 需要 $z$ 服从标准正态分布 $\mathcal{N}(0,1)$（保证隐空间连续性，方便采样生成）→ 必须约束 $\mathcal{N}(\mu, \sigma^2)$ 贴近 $\mathcal{N}(0,1)$。

首先给出完整的VAE损失函数（对于单个样本$X$）：
$$
\mathcal{Loss}_{\text{VAE}}(\theta, \phi; X) = \underbrace{\mathbb{E}_{q_\phi(z|X)}[\log p_\theta(X|z)]}_{\text{重建Loss}} - \beta \cdot \underbrace{D_{\text{KL}}(q_\phi(z|X) \parallel p(z))}_{\text{KL散度正则项约束}}
$$

- | $X$      | 观测数据（输入） | 向量 $\mathbb{R}^D$ | 例如：一张$28×28$的MNIST图像展平为$784$维向量 |
  | -------- | ---------------- | ------------------- | --------------------------------------------- |
  | $z$      | **隐变量**       | 向量 $\mathbb{R}^d$ | 潜在表示，$d \ll D$（如$d=20$）               |
  | $\theta$ | **解码器参数**   | 神经网络权重        | 解码器$p_\theta(x|z)$的参数                   |
  | $\phi$   | **编码器参数**   | 神经网络权重        | 编码器$q_\phi(z|x)$的参数                     |
  | $\beta$  | **正则化系数**   | 标量 $\mathbb{R}^+$ | 控制KL散度的权重，$\beta=1$时为标准VAE        |

- **第一项           $\mathbb{E}_{q_\phi(z|x)}[\log p_\theta(x|z)]= \int \log p_\theta(x|z) \cdot q_\phi(z|x) dz$ （重建Loss）**

  - 和AE一致，让 $\hat{X}$($\hat{X}=\log p(X|z) \approx X$)越大，重建效果越好。从编码器分布$q_\phi(z|x)$中**采样**多个$z$，对每个$z$计算$\log p_\theta(x|z)$（重建质量），然后取**平均值**。
  - **$q_\phi(z|X)$**：变分后验分布，给定$X$时，$z$的近似后验分布，编码器建模。多元高斯分布$$q_\phi(z|X) = \mathcal{N}(z; \mu_\phi(X), \text{diag}(\sigma^2_\phi(X)))$$
    - 编码器输出两个向量：$\mu_\phi(x) \in \mathbb{R}^d$均值向量，$\log\sigma^2_\phi(x) \in \mathbb{R}^d$对数方差向量
  - **$\log p_\theta(X|z)$**：**对数条件似然函数 **（在给定$z$的条件下，数据$X$出现的"可能性"的对数，越大表示重建效果越好）
  - **$p_\theta(x|z)$**：**条件似然函数**（给定隐变量$z$时，生成观测数据$X$的概率，由**解码器**建模），为二值数据或者连续数据
    - **二值数据**（如MNIST二值图）：伯努利分布$$p_\theta(X|z) = \prod_{i=1}^D [\pi_i(z)]^{x_i}[1-\pi_i(z)]^{1-x_i}$$，其中$\pi_i(z) \in [0,1]$是解码器第$i$个输出（sigmoid激活）。$$\log p_\theta(X|z) = \sum_{i=1}^D [X_i \log \pi_i(z) + (1-X_i)\log(1-\pi_i(z))]$$，这就是**交叉熵损失**！
    - **连续数据**（如灰度图）：高斯分布$$p_\theta(X|z) = \prod_{i=1}^D \frac{1}{\sqrt{2\pi\sigma^2}} \exp\left(-\frac{(X_i - \mu_i(z))^2}{2\sigma^2}\right)$$, 通常固定$\sigma=1$，解码器输出均值$\mu(z)$。$$\log p_\theta(X|z) = -\frac{1}{2}\sum_{i=1}^D (X_i - \mu_i(z))^2 + \text{常数}$$，这就是**均方误差（MSE）** 的负值！

- **第二项        $D_{\text{KL}}(q_\phi(z|x) \parallel p(z))$（KL散度）**：

  -  KL散度定义：$ D_{\text{KL}}(q \parallel p) = \int q(z) \log\frac{q(z)}{p(z)} dz $，衡量两个概率分布$q$和$p$之间的"差异"或"距离"。
  -  衡量解码器输出分布 $q(z|X) = \mathcal{N}(\mu, \sigma^2)$ 与目标先验分布 $p(z) = \mathcal{N}(0,1)$ 差距，KL越小分布越近，隐空间越符合正态分布。
     - **$q_\phi(z|x) = \mathcal{N}(z; \mu, \text{diag}(\sigma^2))$**：编码器输出的分布，其中$\mu = \mu_\phi(x)$，$\sigma^2 = \sigma^2_\phi(x)$
     - $p(z) = \mathcal{N}(z; 0, I)$：先验分布，标准多元正态分布

- **负号**：最大化重建（$\log p(X|z)$ 越大越好）+ 最小化KL散度，合并后为"重建项-KL项"，整体目标是最大化Loss/最小化其负值。



## ELBO

生成模型的终极目标是**学习数据的真实分布 $p(X)$**——只要学到 $p(X)$，就能从该分布中采样生成新数据。

但直接估计 $p(X)$ 极难（如图像数据分布复杂，无简单公式描述），因此VAE引入**隐变量 $z$**，将 $p(X)$ 分解为：
$$
p(X) = \int p(X|z) p(z) dz
$$

- **含义**：数据 $X$ 的生成过程是"先从先验分布 $p(z)$ 采样 $z$，再从条件分布 $p(X|z)$ 采样 $X$"
- **问题**：高维隐空间的积分是NP难的，无法直接计算



为解决积分难题，VAE采用**变分推断**：引入可参数化的近似后验分布 $q(z|X)$（即Encoder输出的 $\mathcal{N}(\mu, \sigma^2)$），用它近似无法计算的真实后验 $p(z|X)$（"给定 $X$，隐变量 $z$ 的真实分布"）。

衡量两个分布相似度的指标是**KL散度**：$KL(q(z|X) \parallel p(z|X)) \geq 0$（KL散度永远非负，等于0时两个分布完全一致）。

目标是最大化**对数似然 $\log p(X)$**（极大似然估计，让模型生成真实数据的概率最大）。通过数学变形，可将 $\log p(X)$ 拆分为**ELBO + KL散度**：
$$
\begin{aligned}
\log p(X) &= \mathbb{E}_{q(z|X)}[\log p(X)] \quad (\text{乘以} \int q(z|X)dz=1\text{，不改变结果}) \\
&= \mathbb{E}_{q(z|X)}\left[\log \frac{p(X,z)}{p(z|X)}\right] \quad (\text{贝叶斯公式：} p(X,z)=p(X|z)p(z)=p(z|X)p(X)) \\
&= \mathbb{E}_{q(z|X)}\left[\log \frac{p(X,z) q(z|X)}{p(z|X) q(z|X)}\right] \quad (\text{分子分母同乘} q(z|X)) \\
&= \underbrace{\mathbb{E}_{q(z|X)}\left[\log \frac{p(X,z)}{q(z|X)}\right]}_{\text{ELBO}} + \underbrace{KL(q(z|X) \parallel p(z|X))}_{\geq 0}
\end{aligned}
$$

因 $KL(q \parallel p) \geq 0$，故：
$$
\log p(X) \geq \text{ELBO}
$$

- $\log p(X)$ 是**模型证据**（Model Evidence），衡量模型对数据的拟合程度
- ELBO是**证据下界**（Evidence Lower Bound）——它是 $\log p(X)$ 的下界，最大化ELBO等价于最大化 $\log p(X)$（当KL=0时，ELBO=log p(X)）

对ELBO进一步变形，可得VAE的Loss：
$$
\begin{aligned}
\text{ELBO} &= \mathbb{E}_{q(z|X)}\left[\log \frac{p(X,z)}{q(z|X)}\right] \\
&= \mathbb{E}_{q(z|X)}\left[\log \frac{p(X|z) p(z)}{q(z|X)}\right] \quad (\text{分解联合分布} p(X,z)=p(X|z)p(z)) \\
&= \mathbb{E}_{q(z|X)}[\log p(X|z)] + \mathbb{E}_{q(z|X)}\left[\log \frac{p(z)}{q(z|X)}\right] \\
&= \mathbb{E}_{q(z|X)}[\log p(X|z)] - KL(q(z|X) \parallel p(z))
\end{aligned}
$$

这与之前的VAE Loss完全一致！

**结论**：VAE的训练目标**最大化ELBO**，本质是通过近似后验 $q(z|X)$ 间接最大化模型证据 $\log p(X)$，既保证重建效果，又约束隐空间分布，从而获得生成能力。





# Flow-based Generative Model

​	很多照片输入，输出是Normal Distribution

![image-20251222170843651](/posts/deep-generative-models/image-20251222170843651.png)



# Generative Adversarial Network(GAN)

![image-20251222171609033](/posts/deep-generative-models/image-20251222171609033.png)

![image-20251222171947177](/posts/deep-generative-models/image-20251222171947177.png)



# Diffusion Model

![image-20251222171343954](/posts/deep-generative-models/image-20251222171343954.png)





## DDPM（Denoising Diffusion Probabilistic Models）

![image-20260102235029351](/posts/deep-generative-models/image-20260102235029351.png)

DDPM包括前向加噪，逆向去噪生成两个部分。

DDPM（Denoising Diffusion Probabilistic Models）是扩散模型的经典范式，属于**基于似然的生成模型**，其核心思想是通过 “双向马尔可夫链” 实现复杂数据分布的建模：

- **正向过程**：将原始图像（或数据）逐步添加高斯噪声，最终转化为易于处理的**标准正态分布**（噪声），此过程完全可控、可解析；
- **逆向过程**：通过神经网络学习 “从噪声恢复原始数据” 的映射，逐步去除噪声，最终生成与原始数据分布一致的样本。
- DDPM可看作**分层变分自编码器（HVAE）** ——相较于传统VAE“一步编码/解码”的简单结构，DDPM将过程拆分为T步（通常T=1000），类似“分段线性逼近曲线”，大幅提升生成质量。



### 前向扩散过程：从数据到噪声

前向过程的目标是**确定性地将原始数据$\boldsymbol{x}_0$（原图）转化为纯噪声$\boldsymbol{x}_T \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$**，每一步仅添加微小噪声，保证过程的平滑性与可推导性。

#### 相邻步的线性建模

对于任意时间步$t$，定义从$\boldsymbol{x}_{t-1}$到$\boldsymbol{x}_t$的“加噪声”过程为**线性高斯模型**：
$$
\boldsymbol{x}_t = a_t\boldsymbol{x}_{t-1} + b_t \boldsymbol{\varepsilon}_t, \quad \boldsymbol{\varepsilon}_t \sim \mathcal{N}(\mathbf{0}, \mathbf{I}) 
$$
- **系数含义**：
  - $a_t$：衰减系数，满足$0 < a_t < 1$。因$\boldsymbol{x}_{t-1}$保留更多原始数据信息，需通过$a_t$降低其权重，避免信息过载；
  - $b_t$：噪声系数，满足$0 < b_t < 1$。控制当前步添加的噪声强度，确保每一步噪声“微小”，过程平滑；
  - $\boldsymbol{\varepsilon}_t$：标准高斯噪声（均值0、单位协方差），保证噪声的随机性与可处理性。

#### 多步展开与正态分布叠加性

将**式中递归展开（代入$\boldsymbol{x}_{t-1} = a_{t-1}\boldsymbol{x}_{t-2} + b_{t-1}\boldsymbol{\varepsilon}_{t-1}$，依此类推）**，可得：
$$
\boldsymbol{x}_t = \left(\prod_{s=1}^t a_s\right)\boldsymbol{x}_0 + \sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)b_k \boldsymbol{\varepsilon}_k
$$
（注：当$k=t$时，$\prod_{s=t+1}^t a_s = 1$，即最后一项为$b_t \boldsymbol{\varepsilon}_t$）

式中，除第一项$\left(\prod_{s=1}^t a_s\right)\boldsymbol{x}_0$（原始数据项）外，其余均为**独立高斯噪声的线性组合**。根据正态分布的“叠加性”：多个独立正态变量的线性组合仍为正态分布，且均值为0（各噪声均值均为0），方差为各噪声系数的平方和：                                                                                                                                                                                                                                                                                                                      

1. **每个分量的方差**：
   对于每个 $k$，$\boldsymbol{\varepsilon}_k$ 是标准高斯噪声，满足 $\text{Var}(\boldsymbol{\varepsilon}_k) = \mathbf{I}$（单位矩阵，对角线元素为1）。
   因此：
   $$
   \text{Var}(c_k \boldsymbol{\varepsilon}_k) = c_k^2 \text{Var}(\boldsymbol{\varepsilon}_k) = c_k^2 \times 1 = c_k^2
   $$

2. **总和的方差**：
   由于 $\boldsymbol{\varepsilon}_1, \boldsymbol{\varepsilon}_2, \ldots, \boldsymbol{\varepsilon}_t$ 相互独立，根据性质2：
   $$
   \text{Var}\left(\sum_{k=1}^t c_k \boldsymbol{\varepsilon}_k\right) = \sum_{k=1}^t \text{Var}(c_k \boldsymbol{\varepsilon}_k) = \sum_{k=1}^t c_k^2
   $$

3. **代回原系数**：
   $$
   \text{Var}\left[\sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)b_k \boldsymbol{\varepsilon}_k\right] =\sum_{k=1}^t\left[\text{Var}\left(\prod_{s=k+1}^t a_s\right)b_k \boldsymbol{\varepsilon}_k \right] 
   = \sum_{k=1}^t \left[\left(\prod_{s=k+1}^t a_s\right)b_k\right]^2 = \sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)^2 b_k^2
   $$

即得到：
$$
\sum_{k=1}^t \left[\left(\prod_{s=k+1}^t a_s\right)b_k\right]^2 = \sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)^2 b_k^2,\quad \sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)b_k \boldsymbol{\varepsilon}_k =
{\sqrt{\sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)^2 b_k^2} \cdot{\boldsymbol{\varepsilon}}_k}
$$


由此，式可简化为==“原始数据项 + 单正态噪声项”==：
$$
\boldsymbol{x}_t = \underbrace{\left(\prod_{s=1}^t a_s\right)\boldsymbol{x}_0}_{\text{数据保留项}} + \underbrace{\sqrt{\sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)^2 b_k^2} \cdot \bar{\boldsymbol{\varepsilon}}_t}_{\text{累积噪声项}}, \quad \bar{\boldsymbol{\varepsilon}}_t \sim \mathcal{N}(\mathbf{0}, \mathbf{I})
$$

#### 系数约束：简化方差计算

为避免式中方差计算的复杂性，引入**关键约束**：

假设：确保方差总和为1，进行简化
$$
a_t^2 + b_t^2 = 1 \quad \forall t
$$
约束的作用：方差总和为1

对式中的方差项（平方和）进行递推化简，可发现：当$a_t^2 + b_t^2 = 1$时，整个平方和等于1，即：
$$
\left(\prod_{s=1}^t a_s\right)^2 + \sum_{k=1}^t \left(\prod_{s=k+1}^t a_s\right)^2 b_k^2 = 1
$$
由此，累积噪声项的方差可简化为$1 - \left(\prod_{s=1}^t a_s\right)^2$，式进一步简化为：
$$
\boldsymbol{x}_t = \sqrt{\bar{a}_t} \boldsymbol{x}_0 + \sqrt{1 - \bar{a}_t} \bar{\boldsymbol{\varepsilon}}_t, \quad \bar{a}_t = \left(\prod_{s=1}^t a_s\right)^2
$$

#### 与原论文符号对齐：引入$\alpha_t$与$\beta_t$

为与DDPM原论文一致，文章将系数替换为：
- $a_t = \sqrt{\alpha_t}$（衰减系数对应$\alpha_t$的平方根）；
- $b_t = \sqrt{1 - \alpha_t}$（噪声系数对应$1-\alpha_t$的平方根）；
- 定义$\beta_t = 1 - \alpha_t$（噪声强度参数，满足$0 < \beta_t < 1$）。

#### 最终前向过程公式

1. 从$\boldsymbol{x}_{t-1}$到$\boldsymbol{x}_t$的条件概率为高斯分布，均值依赖$\boldsymbol{x}_{t-1}$，方差固定为$\beta_t$：
   $$
   q(\boldsymbol{x}_t \mid \boldsymbol{x}_{t-1}) = \mathcal{N}\left(\boldsymbol{x}_t; \sqrt{\alpha_t} \boldsymbol{x}_{t-1}, \beta_t \mathbf{I}\right) 
   $$
   （注：$\beta_t$是**预设参数**，非学习参数，通常随t递增，确保后期添加更强噪声）

2. 无需递归计算每一步$\boldsymbol{x}_{t-1}$，可直接通过$\boldsymbol{x}_0$生成$\boldsymbol{x}_t$，条件概率为：
   $$
   q(\boldsymbol{x}_t \mid \boldsymbol{x}_0) = \mathcal{N}\left(\boldsymbol{x}_t; \sqrt{\bar{\alpha}_t} \boldsymbol{x}_0, (1 - \bar{\alpha}_t) \mathbf{I}\right)
   $$
   其中$\bar{\alpha}_t = \prod_{s=1}^t \alpha_s$（$\alpha_t$的累积乘积），代表$t$步后原始数据的“信息保留程度”：
   - ==$t=0$时，$\bar{\alpha}_0 = 1$，$\boldsymbol{x}_0 = \boldsymbol{x}_0$（无噪声）；==
   - ==$t=T$时，$\bar{\alpha}_T \approx 0$，$\boldsymbol{x}_T \approx \mathcal{N}(\mathbf{0}, \mathbf{I})$（纯噪声）。==

   结合噪声项，$\boldsymbol{x}_t$的生成式可写为：
   $$
   \boldsymbol{x}_t = \sqrt{\bar{\alpha}_t} \boldsymbol{x}_0 + \sqrt{1 - \bar{\alpha}_t} \boldsymbol{\varepsilon},\quad \boldsymbol{\varepsilon} \sim \mathcal{N}(\mathbf{0}, \mathbf{I})
   $$
   这是后续训练的核心公式——可直接从原图$\boldsymbol{x}_0$生成任意步的含噪图像$\boldsymbol{x}_t$。

---





### 逆向生成过程：从噪声到数据

逆向过程是DDPM的“生成核心”，目标是**学习从纯噪声$\boldsymbol{x}_T$逐步恢复原始数据$\boldsymbol{x}_0$的映射**。此过程需通过神经网络参数化，且每一步与前向过程“对称”（均为高斯分布）。

#### 逆向过程的建模思路

逆向过程目标是**学习从纯噪声$\boldsymbol{x}_T$逐步恢复原始数据$\boldsymbol{x}_0$的映射**。需通过神经网络参数化，且每一步与前向过程“对称”（均为高斯分布）。与前向过程（固定参数）不同，==逆向过程的每一步条件分布$p_\theta(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t)$是**参数化的高斯分布**==，由神经网络学习均值$\mu_\theta(\boldsymbol{x}_t, t)$和方差$\Sigma_\theta(\boldsymbol{x}_t, t)$：
$$
p_\theta(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t) = \mathcal{N}\left(\boldsymbol{x}_{t-1}; \mu_\theta(\boldsymbol{x}_t, t), \Sigma_\theta(\boldsymbol{x}_t, t)\right)
$$
- 输入：当前含噪图像$\boldsymbol{x}_t$ + 时间步$t$（时间嵌入，用于感知当前扩散阶段）；
- 输出：下一轮去噪后的图像$\boldsymbol{x}_{t-1}$的分布参数。

整个逆向过程的联合概率为：
$$
p_\theta(\boldsymbol{x}_{0:T}) = p(\boldsymbol{x}_T) \prod_{t=1}^T p_\theta(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t)
$$
其中$p(\boldsymbol{x}_T) = \mathcal{N}(\boldsymbol{x}_T; \mathbf{0}, \mathbf{I})$（预设的噪声先验分布）。

#### 优化目标：最大化数据似然与变分下界

生成模型的核心目标是**最大化原始数据的对数似然**$\log p_\theta(\boldsymbol{x}_0)$（即让模型生成的分布尽可能接近真实数据分布）。但直接计算$\log p_\theta(\boldsymbol{x}_0)$需积分所有中间变量$\boldsymbol{x}_{1:T}$，难以实现，通过==**变分推断**推导“变分下界（ELBO）==”，将难计算的似然转化为可优化的损失。

##### 步骤1：似然的变分转化（Jensen不等式）

根据==**全概率公式与Jensen不等式**==（对数函数是凹函数，$\log \mathbb{E}[X] \geq \mathbb{E}[\log X]$），可得：
$$
\log p_\theta(\boldsymbol{x}_0) \geq \mathbb{E}_{q(\boldsymbol{x}_{1:T} \mid \boldsymbol{x}_0)} \left[ \log \frac{p_\theta(\boldsymbol{x}_{0:T})}{q(\boldsymbol{x}_{1:T} \mid \boldsymbol{x}_0)} \right] =: L_{\text{VLB}}
$$
- $q(\boldsymbol{x}_{1:T} \mid \boldsymbol{x}_0)$：前向过程的联合分布（已知，可解析）；
- $p_\theta(\boldsymbol{x}_{0:T})$：逆向过程的联合分布（待学习）；
- $L_{\text{VLB}}$：变分下界，最大化$\log p_\theta(\boldsymbol{x}_0)$等价于最大化$L_{\text{VLB}}$。

##### 步骤2：ELBO的拆解与简化

通过展开==联合分布、利用马尔可夫链性质（$q(\boldsymbol{x}_t \mid \boldsymbol{x}_{t-1}, \boldsymbol{x}_0) = q(\boldsymbol{x}_t \mid \boldsymbol{x}_{t-1})$）==，将$L_{\text{VLB}}$拆解为三部分：
$$
L_{\text{VLB}} = \underbrace{\mathbb{E}_{q(\boldsymbol{x}_1 \mid \boldsymbol{x}_0)} \left[ \log p_\theta(\boldsymbol{x}_0 \mid \boldsymbol{x}_1) \right]}_{\text{重建项（Reconstruction Term）}} - \underbrace{D_{\text{KL}}(q(\boldsymbol{x}_T \mid \boldsymbol{x}_0) \parallel p(\boldsymbol{x}_T))}_{\text{先验匹配项（Prior Matching Term）}} - \underbrace{\sum_{t=2}^T \mathbb{E}_{q(\boldsymbol{x}_t \mid \boldsymbol{x}_0)} \left[ D_{\text{KL}}(q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0) \parallel p_\theta(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t)) \right]}_{\text{去噪匹配项（Denoising Matching Term）}}
$$

各部分含义：
1. **重建项**：让模型从“轻微噪声$\boldsymbol{x}_1$”恢复原图$\boldsymbol{x}_0$，类似VAE的重建损失；
2. **先验匹配项**：让前向过程的最终噪声$q(\boldsymbol{x}_T \mid \boldsymbol{x}_0)$与预设先验$p(\boldsymbol{x}_T)$（标准正态）尽可能一致，确保逆向过程起点合理；
3. **去噪匹配项**：核心损失，让“真实去噪分布$q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0)$”与“模型预测的去噪分布$p_\theta(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t)$”尽可能接近（通过KL散度衡量）。

#### 关键分布建模：$q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0)$

“去噪匹配项”的优化需先明确“真实去噪分布”$q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0)$。文章通过**贝叶斯公式**推导该分布：
$$
q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0) = \frac{q(\boldsymbol{x}_t \mid \boldsymbol{x}_{t-1}) q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_0)}{q(\boldsymbol{x}_t \mid \boldsymbol{x}_0)} 
$$
- 分子：$q(\boldsymbol{x}_t \mid \boldsymbol{x}_{t-1})$（前向相邻步分布，式7）、$q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_0)$（前向边际分布，式8）；
- 分母：$q(\boldsymbol{x}_t \mid \boldsymbol{x}_0)$（前向边际分布，式8）。

#### 推导结果：$q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0)$是高斯分布

将三个高斯分布代入式11，通过化简指数项（合并二次项、消去与$\boldsymbol{x}_{t-1}$无关的常数$C(\boldsymbol{x}_t, \boldsymbol{x}_0)$），最终可得：
$$
q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0) = \mathcal{N}\left( \boldsymbol{x}_{t-1}; \mu_q(\boldsymbol{x}_t, \boldsymbol{x}_0), \Sigma_q(t) \mathbf{I} \right) \tag{14}
$$
其中：
1. **均值$\mu_q$**（真实去噪均值）：
   $$
   \mu_q = \frac{\sqrt{\bar{\alpha}_{t-1}} \beta_t}{1 - \bar{\alpha}_t} \boldsymbol{x}_0 + \frac{\sqrt{\alpha_t} (1 - \bar{\alpha}_{t-1})}{1 - \bar{\alpha}_t} \boldsymbol{x}_t
   $$
2. **方差$\Sigma_q(t)$**（真实去噪方差，与$\boldsymbol{x}_t, \boldsymbol{x}_0$无关）：
   $$
   \Sigma_q(t) = \frac{(1 - \alpha_t)(1 - \bar{\alpha}_{t-1})}{1 - \bar{\alpha}_t} = \frac{1 - \bar{\alpha}_{t-1}}{1 - \bar{\alpha}_t} \beta_t
   $$

### 模型参数学习：从“学图像”到“学噪声”

逆向过程的模型$p_\theta(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t)$需与$q(\boldsymbol{x}_{t-1} \mid \boldsymbol{x}_t, \boldsymbol{x}_0)$匹配。文章做了两个关键简化：
1. **固定方差**：令$\Sigma_\theta(t) = \Sigma_q(t)$（非学习参数），避免方差学习带来的复杂度；
2. **优化均值匹配**：当方差相同时，KL散度的优化等价于“均值的L2距离最小化”（见文章式16）。

#### 关键转换：从“预测$\boldsymbol{x}_0$”到“预测噪声$\boldsymbol{\varepsilon}$”

式14中，$\mu_q$依赖$\boldsymbol{x}_0$（原图），但逆向过程中$\boldsymbol{x}_0$未知，因此需通过神经网络预测$\boldsymbol{x}_0$或与$\boldsymbol{x}_0$相关的量。文章通过以下步骤实现简化：

1. **用$\boldsymbol{x}_t$与$\boldsymbol{\varepsilon}$表示$\boldsymbol{x}_0$**：从正向过程的边际分布（式5）$\boldsymbol{x}_t = \sqrt{\bar{\alpha}_t} \boldsymbol{x}_0 + \sqrt{1 - \bar{\alpha}_t} \boldsymbol{\varepsilon}$，可解出：
   $$
   \boldsymbol{x}_0 = \frac{\boldsymbol{x}_t - \sqrt{1 - \bar{\alpha}_t} \boldsymbol{\varepsilon}}{\sqrt{\bar{\alpha}_t}}
   $$
   （$\boldsymbol{\varepsilon}$是正向过程中添加的真实噪声）

2. **将$\mu_q$转化为“噪声表达式”**：将$\boldsymbol{x}_0$代入$\mu_q$的公式，化简后可得（见文章式20）：
   $$
   \mu_q = \frac{1}{\sqrt{\alpha_t}} \boldsymbol{x}_t - \frac{1 - \alpha_t}{\sqrt{1 - \bar{\alpha}_t} \sqrt{\alpha_t}} \boldsymbol{\varepsilon}
   $$

3. **神经网络预测噪声$\boldsymbol{\varepsilon}$**：定义神经网络$\varepsilon_\theta(\boldsymbol{x}_t, t)$，其目标是预测正向过程中添加的真实噪声$\boldsymbol{\varepsilon}$。此时，模型预测的去噪均值为：
   $$
   \mu_\theta = \frac{1}{\sqrt{\alpha_t}} \boldsymbol{x}_t - \frac{1 - \alpha_t}{\sqrt{1 - \bar{\alpha}_t} \sqrt{\alpha_t}} \varepsilon_\theta(\boldsymbol{x}_t, t)
   $$

#### 最终优化目标：噪声的MSE损失

KL散度的最小化等价于“预测噪声$\varepsilon_\theta$与真实噪声$\boldsymbol{\varepsilon}$的L2距离最小化”。文章进一步省略与$\theta$无关的系数（不影响优化方向），得到DDPM的核心训练损失：
$$
L_{\text{simple}}(\theta) := \mathbb{E}_{t \sim \mathcal{U}(1,T), \boldsymbol{x}_0 \sim q(\boldsymbol{x}_0), \boldsymbol{\varepsilon} \sim \mathcal{N}(\mathbf{0},\mathbf{I})} \left[ \left\| \boldsymbol{\varepsilon} - \varepsilon_\theta\left( \sqrt{\bar{\alpha}_t} \boldsymbol{x}_0 + \sqrt{1 - \bar{\alpha}_t} \boldsymbol{\varepsilon}, t \right) \right\|^2 \right]
$$
- 含义：随机采样时间步$t$、原图$\boldsymbol{x}_0$、真实噪声$\boldsymbol{\varepsilon}$，生成含噪图像$\boldsymbol{x}_t$，让模型从$\boldsymbol{x}_t$和$t$预测的噪声尽可能接近真实噪声。

---

## 四、DDPM的训练与采样算法

文章结尾给出了DDPM原论文的核心算法，对应“训练阶段”与“生成阶段”，流程简洁且可落地。

### 4.1 训练算法（Algorithm 1）
目标：通过最小化$L_{\text{simple}}$训练噪声预测网络$\varepsilon_\theta$。

1. **重复迭代**，直到模型收敛：
   - 采样原图$\boldsymbol{x}_0 \sim q(\boldsymbol{x}_0)$（真实数据分布）；
   - 采样时间步$t \sim \mathcal{U}(1, T)$（均匀分布，覆盖所有扩散阶段）；
   - 采样真实噪声$\boldsymbol{\varepsilon} \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$；
   - 生成含噪图像$\boldsymbol{x}_t = \sqrt{\bar{\alpha}_t} \boldsymbol{x}_0 + \sqrt{1 - \bar{\alpha}_t} \boldsymbol{\varepsilon}$；
   - 计算损失$\left\| \boldsymbol{\varepsilon} - \varepsilon_\theta(\boldsymbol{x}_t, t) \right\|^2$，并通过梯度下降更新$\theta$。

### 4.2 采样算法（Algorithm 2）
目标：从纯噪声出发，逐步去噪生成原图$\boldsymbol{x}_0$。

1. **初始化**：采样初始噪声$\boldsymbol{x}_T \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$；
2. **反向迭代**（从$t=T$到$t=1$）：
   - 采样随机噪声$z \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$（$t=1$时$z=0$，避免最后一步引入噪声）；
   - 用模型预测噪声$\varepsilon_\theta(\boldsymbol{x}_t, t)$，计算去噪均值$\mu_\theta$；
   - 生成下一步去噪图像：
     $$
     \boldsymbol{x}_{t-1} = \frac{1}{\sqrt{\alpha_t}} \left( \boldsymbol{x}_t - \frac{1 - \alpha_t}{\sqrt{1 - \bar{\alpha}_t}} \varepsilon_\theta(\boldsymbol{x}_t, t) \right) + \sigma_t z
     $$
     （其中$\sigma_t = \sqrt{\Sigma_q(t)}$，即真实去噪方差的平方根）；
3. **输出**：迭代结束后，$\boldsymbol{x}_0$即为生成的样本。

---

## 五、核心总结

DDPM的本质是“通过可控的正向加噪将复杂数据转化为简单噪声，再通过学习逆向去噪从噪声恢复数据”，其关键设计包括：
1. **双向高斯过程**：前向固定、逆向参数化，确保过程可解析且易优化；
2. **噪声预测机制**：不直接学习“图像恢复”，而是学习“噪声预测”，大幅简化损失函数；
3. **分层迭代**：将生成拆分为T步，提升生成质量与稳定性。

文章通过详细的公式推导，解答了“系数为什么这么设”“损失为什么这么定”等核心问题，为理解后续扩散模型变种（如DDIM、Stable Diffusion）奠定了理论基础。







