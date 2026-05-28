# Organic / Biomorphic UI 设计与交互指令文件

> 基于 `claudekit/frontend-design-pro-demo` #11 风格提炼  
> 风格定位：**自然有机 · 仿生形态 · 大地调色盘**

---

## 一、设计哲学

用界面模拟自然生长的感觉。形状不是几何的，而是**有呼吸的**；颜色不是鲜艳的，而是**从土地里长出来的**；交互不是机械的，而是**弹性的、有弹力的**。每一个元素都在缓慢地、轻微地动着——像水面的涟漪，像叶子随风轻颤。

---

## 二、色彩系统（Living Earth 调色板）

```css
:root {
  /* 背景层 */
  --color-bg:               #faf8f5;  /* 温暖米白，主背景 */
  --color-bg-alt:           #f0ebe3;  /* 稍深奶油，次级背景 */
  --color-cream:            #f5f0e6;  /* 卡片背景 */

  /* 文字 */
  --color-text:             #2d2a26;  /* 深炭灰，主文字 */
  --color-text-muted:       #6b6560;  /* 棕灰，辅助文字 */

  /* 主色：鼠尾草绿 */
  --color-sage:             #8fa68f;
  --color-sage-light:       #b8ccb8;

  /* 辅色：赤陶土 */
  --color-terracotta:       #c67d5a;
  --color-terracotta-light: #e8a889;

  /* 第三色：沙漠沙 */
  --color-sand:             #d4c4a8;
}
```

**配色原则：**
- 主界面底色永远是暖米白，绝不用纯白 `#ffffff`
- 强调色优先用鼠尾草绿；次要动作/hover 状态切换为赤陶土
- 文字颜色只用深炭灰，禁止纯黑 `#000000`
- 渐变只在 blob 背景层使用，组件内避免生硬渐变

---

## 三、字体规范

```css
/* 标题：衬线字体，手工感，有温度 */
font-family: 'Fraunces', serif;
font-optical-sizing: auto;

/* 正文：干净可读的无衬线 */
font-family: 'Karla', sans-serif;
```

- **H1**：Fraunces，48–64px，字重 300–400，行高 1.1
- **H2**：Fraunces，32–40px，字重 400
- **正文**：Karla，16–18px，行高 1.6
- **标签/小标**：Karla，12–13px，letter-spacing: 0.08em，全大写

---

## 四、形态规范：有机 border-radius

这是整个风格的**核心**。所有形状使用 8 值语法的 border-radius，禁止使用标准圆角（如 `8px` 或 `50%` 均等圆）。

### 基础 Blob 形
```css
/* 圆润不对称形 */
border-radius: 50% 40% 60% 50% / 50% 60% 40% 50%;

/* 偏转变体 A */
border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%;

/* 偏转变体 B */
border-radius: 60% 50% 40% 50% / 40% 50% 60% 50%;
```

### 按钮形态（主按钮）
```css
/* 默认：左圆右方 */
.btn-primary {
  border-radius: 50px 20px 50px 20px;
}
/* Hover：翻转 */
.btn-primary:hover {
  border-radius: 20px 50px 20px 50px;
}
```

### 按钮形态（次按钮）
```css
.btn-secondary {
  border-radius: 20px 50px 20px 50px;
  background: transparent;
  border: 2px solid var(--color-sage);
}
.btn-secondary:hover {
  border-radius: 50px 20px 50px 20px;
  background: var(--color-cream);
}
```

---

## 五、动画系统

### 5.1 缓动函数（弹簧感）

```css
/* 所有交互动画统一使用此 easing，模拟弹簧回弹 */
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
```

这个曲线会轻微超调后回弹，赋予每个交互「活着的弹性感」。

### 5.2 背景 Blob 形变动画

```css
@keyframes blob-morph {
  0%, 100% {
    border-radius: 50% 40% 60% 50% / 50% 60% 40% 50%;
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%;
    transform: translate(30px, -20px) rotate(90deg);
  }
  50% {
    border-radius: 60% 50% 40% 50% / 40% 50% 60% 50%;
    transform: translate(-20px, 30px) rotate(180deg);
  }
  75% {
    border-radius: 50% 50% 60% 40% / 50% 50% 40% 60%;
    transform: translate(20px, 20px) rotate(270deg);
  }
}
```

- Blob 1：`animation: blob-morph 20s ease-in-out infinite;`
- Blob 2：`animation: blob-morph 25s ease-in-out infinite reverse;`
- Blob 3：`animation: blob-morph 30s ease-in-out infinite 5s;`

### 5.3 元素持续呼吸动画（morphRadius）

用于主视觉图像、画廊卡片等大块内容：

```css
@keyframes morphRadius {
  0%, 100% { border-radius: 50% 40% 60% 50% / 50% 60% 40% 50%; }
  33%       { border-radius: 40% 60% 55% 45% / 55% 45% 60% 40%; }
  66%       { border-radius: 60% 44% 46% 54% / 44% 56% 44% 56%; }
}

.hero-image    { animation: morphRadius 20s ease-in-out infinite; }
.gallery-item  { animation: morphRadius 15s ease-in-out infinite; }
/* 画廊项目交错延迟 */
.gallery-item:nth-child(2) { animation-delay: -5s; }
.gallery-item:nth-child(3) { animation-delay: -10s; }
```

### 5.4 入场动画

```css
@keyframes organicFadeIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes blobPop {
  from { opacity: 0; transform: scale(0.7); border-radius: 50%; }
  to   { opacity: 1; transform: scale(1);   }
}
```

### 5.5 悬浮标签动画

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-8px); }
}
.floating-tag { animation: float 4s ease-in-out infinite; }
```

### 5.6 动画时长参考表

| 动画 | 时长 | 适用场景 |
|------|------|---------|
| blob-morph | 20–30s | 背景 Blob |
| morphRadius | 15–20s | 图片/画廊卡片 |
| float | 4s | 浮动标签 |
| organicFadeIn | 0.6–0.9s | 入场 |
| blobPop | 0.5–0.8s | 元素弹入 |
| 交互 hover | 0.3–0.4s | 按钮/卡片 |

---

## 六、背景 Blob 层实现

```html
<div class="blob-bg">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>
```

```css
.blob-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.blob {
  position: absolute;
  filter: blur(60px);
  opacity: 0.4;
}

.blob-1 {
  width: 500px; height: 500px;
  background: var(--color-sage-light);
  top: -100px; left: -150px;
  animation: blob-morph 20s ease-in-out infinite;
}

.blob-2 {
  width: 400px; height: 400px;
  background: var(--color-terracotta-light);
  top: 30%; right: -100px;
  animation: blob-morph 25s ease-in-out infinite reverse;
}

.blob-3 {
  width: 350px; height: 350px;
  background: var(--color-sand);
  bottom: -80px; left: 30%;
  animation: blob-morph 30s ease-in-out infinite 5s;
}
```

---

## 七、卡片组件规范

### Feature Card（功能卡）

```css
.feature-card {
  background: var(--color-cream);
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  padding: 2rem;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s ease;
}

.feature-card:hover {
  border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(143, 166, 143, 0.2);
}

/* 图标在 hover 时反转形状 */
.feature-card .icon {
  border-radius: 50% 30% 50% 30%;
  background: var(--color-sage-light);
  transition: border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.feature-card:hover .icon {
  border-radius: 30% 50% 30% 50%;
  transform: scale(1.1) rotate(5deg);
}
```

### Hero Blob Card（主视觉卡片）

```css
.hero-blob-card {
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  overflow: hidden;
  transition: border-radius 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hero-blob-card:hover {
  border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
}
```

---

## 八、滚动揭示（Scroll Reveal）

使用 IntersectionObserver，禁止使用 scroll 事件监听：

```javascript
// 通用内容揭示
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

// 卡片交错揭示
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = `${i * 100}ms`;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.2 });

// 画廊交错揭示
const galleryObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = `${i * 120}ms`;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'scale(1)';
    }
  });
}, { threshold: 0.15 });
```

初始隐藏状态通过 JS 设置（不用 CSS 避免无 JS 时内容消失）：

```javascript
document.querySelectorAll('.feature-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(40px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  cardObserver.observe(el);
});
```

---

## 九、按钮涟漪效果

```css
.btn-primary {
  position: relative;
  overflow: hidden;
}
.btn-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.3), transparent 70%);
  transform: scale(0);
  transition: transform 0.4s ease;
  border-radius: inherit;
}
.btn-primary:hover::after {
  transform: scale(2);
}
```

---

## 十、Section 标签样式

```css
.section-tag {
  display: inline-block;
  font-family: 'Karla', sans-serif;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-terracotta);
  background: var(--color-terracotta-light);
  padding: 6px 16px;
  border-radius: 20px 8px 20px 8px;
  animation: gentleBounce 3s ease-in-out infinite;
}

@keyframes gentleBounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
```

---

## 十一、响应式断点

```css
/* 桌面：3列功能网格，4列画廊，双列 Hero */
@media (min-width: 1025px) { ... }

/* 平板：2列功能网格，2列画廊，1列 Hero */
@media (max-width: 1024px) {
  .feature-grid { grid-template-columns: repeat(2, 1fr); }
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
  .hero-grid    { grid-template-columns: 1fr; }
}

/* 手机：单列，隐藏桌面导航，按钮竖排 */
@media (max-width: 768px) {
  .feature-grid { grid-template-columns: 1fr; }
  .nav-links    { display: none; }
  .hero-actions { flex-direction: column; align-items: flex-start; }

  /* 手机端简化 blob 圆角 */
  .cta-card { border-radius: 30px; }
}
```

---

## 十二、无障碍规范

### 减少动画（prefers-reduced-motion）

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .blob { display: none; }
}
```

### 键盘焦点样式

```css
:focus-visible {
  outline: 3px solid var(--color-sage);
  outline-offset: 4px;
  border-radius: 4px;
}
```

---

## 十三、快速使用 Prompt

复制以下 prompt 直接给 Claude 或其他 AI 生成符合此风格的界面：

```
使用 Organic / Biomorphic 有机仿生设计风格创建 [目标页面]。

设计要求：
- 调色板：暖米白背景(#faf8f5)，鼠尾草绿(#8fa68f)，赤陶土(#c67d5a)，大地沙(#d4c4a8)
- 字体：标题用 Fraunces（衬线），正文用 Karla（无衬线）
- 所有形状使用 8 值 border-radius 语法模拟有机 blob 形态
- 背景放置 3 个模糊 blob（filter: blur(60px)），持续缓慢形变（20–30s 周期）
- 按钮 hover 时 border-radius 翻转，加弹簧缓动 cubic-bezier(0.34, 1.56, 0.64, 1)
- 卡片 hover 时上浮 + 形状变化 + 图标旋转
- 入场动画使用 organicFadeIn（fadeIn + scale + blur），卡片交错 100ms 延迟
- 图片/画廊元素持续 morphRadius 形变（15–20s 循环）
- 滚动揭示用 IntersectionObserver，禁用 scroll 监听
- 必须包含 prefers-reduced-motion 媒体查询
- 纯 HTML + CSS + 原生 JS，无框架依赖
```

---

## 十四、禁止事项

| 禁止 | 原因 |
|------|------|
| 使用 Inter / Roboto 字体 | 过于 AI 通用感 |
| 纯白或纯黑背景 | 破坏温暖有机感 |
| 标准等比圆角（如 `8px`）| 缺乏有机形态 |
| CSS transition: all | 性能差，不精确 |
| scroll 事件监听 | 性能差，用 IntersectionObserver |
| 亮色/霓虹色系 | 与大地调色板冲突 |
| 几何对称形状 | 违背仿生原则 |
