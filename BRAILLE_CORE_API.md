# BrailleCore API 接口文档

中国现行盲文核心库 - 中文与盲文双向转换引擎

## 概述

BrailleCore 提供了中文拼音与盲文之间的双向转换功能，支持：
- 汉语拼音 → 盲文（Unicode 盲文字符）
- 盲文 → 汉语拼音
- 拼音 → 常用汉字

## 安装

```javascript
const BrailleCore = require('./braille-core.js');
```

## API 参考

### 点阵与字符转换

#### `dotsToBraille(dots)`
将点阵数组转换为 Unicode 盲文字符。

**参数：**
- `dots` (number[]) - 盲点位数组，范围 1-6，例如 `[1, 2]` 表示声母 "b"

**返回：**
- (string) Unicode 盲文字符

**示例：**
```javascript
BrailleCore.dotsToBraille([1, 2]);    // ⠃ (声母 b)
BrailleCore.dotsToBraille([2, 4]);    // ⠔ (韵母 i)
```

---

#### `brailleToDots(ch)` / `brailleCharToDots(ch)`
将 Unicode 盲文字符转换为点阵数组。

**参数：**
- `ch` (string) - 单个盲文字符

**返回：**
- (number[] | null) 点阵数组，失败返回 null

**示例：**
```javascript
BrailleCore.brailleToDots('⠃');  // [1, 2]
```

---

#### `dotsKey(dots)`
将点阵数组转换为排序后的字符串键名（用于查找表）。

**参数：**
- `dots` (number[]) - 点阵数组

**返回：**
- (string) 逗号分隔的键名

**示例：**
```javascript
BrailleCore.dotsKey([2, 1]);  // "1,2"
```

---

### 拼音转换

#### `parseSyllable(syllableWithTone)`
解析拼音音节，返回声母、韵母和声调。

**参数：**
- `syllableWithTone` (string) - 带声调数字的拼音，例如 "ma1", "zhong4"

**返回：**
- (object) `{ initial, final, tone }`
  - `initial`: 声母字符串
  - `final`: 韵母字符串
  - `tone`: 声调数字 (0-4)

**示例：**
```javascript
BrailleCore.parseSyllable('ma1');   // { initial: 'm', final: 'a', tone: 1 }
BrailleCore.parseSyllable('zhong'); // { initial: 'zh', final: 'ong', tone: 0 }
```

---

#### `syllableToBraille(syllableWithTone, withTone = true)`
将拼音音节转换为盲文。

**参数：**
- `syllableWithTone` (string) - 带声调数字的拼音
- `withTone` (boolean, optional) - 是否包含声调，默认为 true

**返回：**
- (string) 盲文字符串

**示例：**
```javascript
BrailleCore.syllableToBraille('ma1');    // ⠍⠁⠂ (妈)
BrailleCore.syllableToBraille('zhong4'); // ⠴⠬⠔⠒ (众)
BrailleCore.syllableToBraille('zhong', false); // 无声调
```

---

#### `parseCellsToPinyin(cells)`
将盲文点阵转换为拼音。

**参数：**
- `cells` (number[][]) - 点阵数组数组

**返回：**
- (object) `{ ok, pinyin, details, error? }`

**示例：**
```javascript
const cells = [[1, 3, 4], [3, 5]];  // m + a = ma
BrailleCore.parseCellsToPinyin(cells);
// { ok: true, pinyin: 'ma', details: [...] }
```

---

#### `pinyinToHanzi(pinyin)`
将拼音转换为对应汉字（基于内置字典）。

**参数：**
- `pinyin` (string) - 拼音字符串，多个音节用空格分隔

**返回：**
- (object) `{ ok, hanzi }`

**示例：**
```javascript
BrailleCore.pinyinToHanzi('ni hao');
// { ok: true, hanzi: '你好' }

BrailleCore.pinyinToHanzi('ma1 ma4');
// { ok: true, hanzi: '妈妈' }
```

---

### 验证函数

#### `validateSyllable(syllable)`
验证单个拼音音节是否有效。

**参数：**
- `syllable` (string) - 拼音音节

**返回：**
- (object) `{ ok }`

**示例：**
```javascript
BrailleCore.validateSyllable('ma');   // { ok: true }
BrailleCore.validateSyllable('abc');  // { ok: false }
```

---

#### `validatePinyin(pinyin)`
验证完整拼音字符串是否有效。

**参数：**
- `pinyin` (string) - 拼音字符串

**返回：**
- (object) `{ ok, isValid }`

**示例：**
```javascript
BrailleCore.validatePinyin('zhong guo');  // { ok: true, isValid: true }
```

---

#### `validateSequence(p)`
验证盲文序列是否有效。

**参数：**
- `p` (string) - 待验证字符串

**返回：**
- (object) `{ ok }`

---

### 解析函数

#### `parseCellsInput(input)`
解析用户输入的盲文单元格格式。

**参数：**
- `input` (string) - 输入字符串，支持格式如 "1,2 3,5" 或 "[1,2][3,5]"

**返回：**
- (object) `{ ok, cells }` 或 `{ ok: false }`

**示例：**
```javascript
BrailleCore.parseCellsInput('1,2 3,5');
// { ok: true, cells: [[1, 2], [3, 5]] }

BrailleCore.parseCellsInput('[1,2][3,5]');
// { ok: true, cells: [[1, 2], [3, 5]] }
```

---

### 数据字典

#### `INITIALS_MAP`
声母到点阵的映射表。

```javascript
BrailleCore.INITIALS_MAP;
// {
//   'b': [1, 2], 'p': [1, 2, 3, 4], 'm': [1, 3, 4],
//   'zh': [3, 4], 'ch': [1, 2, 3, 4, 5], ...
// }
```

#### `FINALS_MAP`
韵母到点阵的映射表。

```javascript
BrailleCore.FINALS_MAP;
// {
//   'a': [3, 5], 'o': [2, 6], 'ai': [2, 4, 6], ...
// }
```

#### `TONE_MAP`
声调到点阵的映射表。

```javascript
BrailleCore.TONE_MAP;
// { 1: [1], 2: [2], 3: [3], 4: [2, 3] }
```

---

## 完整使用示例

```javascript
const BrailleCore = require('./braille-core.js');

// 1. 汉字转盲文
function chineseToBraille(text) {
  // 暂不支持直接汉字转换
  // 需先转换为拼音，再转换为盲文
  return null;
}

// 2. 拼音转盲文
function pinyinToBraille(pinyinText) {
  const syllables = pinyinText.trim().split(/\s+/);
  let braille = '';
  for (const syl of syllables) {
    braille += BrailleCore.syllableToBraille(syl);
  }
  return braille;
}

// 3. 盲文转拼音
function brailleToPinyin(brailleText) {
  const cells = [];
  for (const ch of brailleText) {
    const dots = BrailleCore.brailleToDots(ch);
    if (dots) cells.push(dots);
  }
  const result = BrailleCore.parseCellsToPinyin(cells);
  return result.ok ? result.pinyin : null;
}

// 4. 拼音转汉字
function pinyinToChinese(pinyinText) {
  const result = BrailleCore.pinyinToHanzi(pinyinText);
  return result.ok ? result.hanzi : null;
}

// 测试
console.log(pinyinToBraille('ni hao'));      // 盲文
console.log(brailleToPinyin('⠝⠊ ⠭⠁⠕'));   // ni xao
console.log(pinyinToChinese('ni hao'));      // 你好
```

---

## 盲文点阵说明

```
点阵位置编号：

  1   4
  2   5
  3   6

示例：⠃ (点 1, 2) = 声母 b
```

---

## 声母表

| 拼音 | 点阵 |
|------|------|
| b | [1,2] |
| p | [1,2,3,4] |
| m | [1,3,4] |
| f | [1,2,4] |
| d | [1,4,5] |
| t | [2,3,4,5] |
| n | [1,3,4,5] |
| l | [1,2,3] |
| g | [1,2,4,5] |
| k | [1,3] |
| h | [1,2,5] |
| j | [1,2,4,5] |
| q | [1,3] |
| x | [1,2,5] |
| zh | [3,4] |
| ch | [1,2,3,4,5] |
| sh | [1,5,6] |
| r | [2,4,5] |
| z | [1,3,5,6] |
| c | [1,4] |
| s | [2,3,4] |
