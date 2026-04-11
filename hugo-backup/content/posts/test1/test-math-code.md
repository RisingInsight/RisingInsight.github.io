---
title: "公式和代码测试"
date: 2026-01-01T12:00:00+08:00
draft: false
math: true  
---

## 1. 数学公式测试 (MathJax)

**行内公式：** 
我们要计算 $E = mc^2$ 的能量。

**块级公式：**
这是一个高斯积分：
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## 2. 代码块测试

```python
def fib(n):
    if n <= 1: 
        return n
    return fib(n-1) + fib(n-2)

print(fib(10))
