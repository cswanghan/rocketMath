# App Store 截图（已完成）

## 直接上传这些（推荐）

> ASC 报尺寸错误时：当前展示位若要求 **1242×2688**，请用 **`final-iphone-6.5/`**，不要用 6.7/6.9。

| 目录 | 尺寸 | 说明 |
|------|------|------|
| **`final-iphone-6.5/`** | **1242×2688** | **首选（匹配 ASC 常见报错尺寸）** |
| **`final-iphone-6.5-alt/`** | **1284×2778** | ASC 也接受的另一种竖屏尺寸 |
| `final-iphone-6.7/` | 1290×2796 | 6.7" 位 |
| `final-iphone-6.9/` | 1320×2868 | 6.9" 位 |
| **`final-ipad-13/`** | 2048×2732 | **iPad 13"** |

### 上传顺序（iPhone / iPad 相同）

1. `01-按单元学.png` — 知识地图  
2. `02-限时口算.png` — 起飞答题  
3. `03-竖式与概念.png` — Practice  
4. `04-竞速挑战.png` — 竞速选速度  
5. `05-家长错题本.png` — 家长区  

### 纯 UI 无顶栏（备选）

| 目录 | 说明 |
|------|------|
| `upload-iphone-6.7/` | 精选 5 张，无文案条 |
| `upload-ipad-13/` | 精选 5 张，无文案条 |

### 全量原始（调试用）

| 目录 | 说明 |
|------|------|
| `named/` / `named-ipad/` | 模拟器原始截图 |
| `asc-iphone-6.7/` 等 | 全 9 张缩放版 |

---

## 重新生成

```bash
# 1) iPhone + iPad UI 测试截图并导出
./ios/tools/export-uitest-screenshots.sh
./ios/tools/make-store-screenshots.sh   # 成片 + 多尺寸
```

依赖：Xcode 模拟器；成片脚本使用仓库内 `.venv-screens`（Pillow）。
