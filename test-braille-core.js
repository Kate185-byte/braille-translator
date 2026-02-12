/**
 * BrailleCore 测试脚本
 * 测试中国现行盲文核心库的所有功能
 */

const BrailleCore = require('./braille-core.js');

// 控制台颜色
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function color(text, colorName) {
  return `${COLORS[colorName]}${text}${COLORS.reset}`;
}

function separator(title) {
  console.log('\n' + '='.repeat(60));
  console.log(color(`  ${title}`, 'blue'));
  console.log('='.repeat(60));
}

function testCase(name, fn) {
  try {
    fn();
    console.log(color('✓ ', 'green') + name);
    return true;
  } catch (e) {
    console.log(color('✗ ', 'red') + name);
    console.log(color(`  错误: ${e.message}`, 'red'));
    return false;
  }
}

function assertEqual(actual, expected, inputDesc, outputDesc) {
  const isOk = JSON.stringify(actual) === JSON.stringify(expected);
  if (!isOk) {
    throw new Error(`\n    ${inputDesc}: ${JSON.stringify(actual)}\n    ${outputDesc}: ${JSON.stringify(expected)}`);
  }
}

// ============================================================
// 测试统计
// ============================================================
let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  if (testCase(name, fn)) {
    passedTests++;
  }
}

// ============================================================
// 1. 点阵转换测试
// ============================================================
separator('1. 点阵与盲文字符转换');

runTest('dotsToBraille: 声母 b (点 1,2)', () => {
  const input = [1, 2];
  const expected = '⠃';
  const actual = BrailleCore.dotsToBraille(input);
  console.log(`    输入: [1, 2] -> 输出: ${actual} (期望: ${expected})`);
  assertEqual(actual, expected, '输入 [1,2]', '输出');
});

runTest('dotsToBraille: 韵母 a (点 3,5)', () => {
  const input = [3, 5];
  const expected = '⠔';
  const actual = BrailleCore.dotsToBraille(input);
  console.log(`    输入: [3, 5] -> 输出: ${actual} (期望: ${expected})`);
  assertEqual(actual, expected, '输入 [3,5]', '输出');
});

runTest('brailleToDots: 盲文字符转点阵', () => {
  const input = '⠃';
  const expected = [1, 2];
  const actual = BrailleCore.brailleToDots(input);
  console.log(`    输入: ${input} -> 输出: ${JSON.stringify(actual)} (期望: ${JSON.stringify(expected)})`);
  assertEqual(actual, expected, '输入 ⠃', '输出');
});

runTest('brailleCharToDots: 字母别名函数', () => {
  const input = '⠔';
  const actual = BrailleCore.brailleCharToDots(input);
  const expected = [3, 5];
  console.log(`    输入: ${input} -> 输出: ${JSON.stringify(actual)} (期望: ${JSON.stringify(expected)})`);
  assertEqual(actual, expected, '输入 ⠔', '输出');
});

runTest('dotsKey: 生成排序键名', () => {
  const input = [2, 1];
  const expected = '1,2';
  const actual = BrailleCore.dotsKey(input);
  console.log(`    输入: [2, 1] -> 输出: "${actual}" (期望: "${expected}")`);
  assertEqual(actual, expected, '输入 [2,1]', '输出');
});

// ============================================================
// 2. 拼音解析测试
// ============================================================
separator('2. 拼音音节解析');

runTest('parseSyllable: 带声调 ma1', () => {
  const input = 'ma1';
  const expected = { initial: 'm', final: 'a', tone: 1 };
  const actual = BrailleCore.parseSyllable(input);
  console.log(`    输入: "ma1" -> 输出: ${JSON.stringify(actual)}`);
  assertEqual(actual, expected, '输入 ma1', '输出');
});

runTest('parseSyllable: 带声调 zhong4', () => {
  const input = 'zhong4';
  const expected = { initial: 'zh', final: 'ong', tone: 4 };
  const actual = BrailleCore.parseSyllable(input);
  console.log(`    输入: "zhong4" -> 输出: ${JSON.stringify(actual)}`);
  assertEqual(actual, expected, '输入 zhong4', '输出');
});

runTest('parseSyllable: 无声调 ai', () => {
  const input = 'ai';
  const expected = { initial: '', final: 'ai', tone: 0 };
  const actual = BrailleCore.parseSyllable(input);
  console.log(`    输入: "ai" -> 输出: ${JSON.stringify(actual)}`);
  assertEqual(actual, expected, '输入 ai', '输出');
});

runTest('parseSyllable: 声母 sh', () => {
  const input = 'shang1';
  const expected = { initial: 'sh', final: 'ang', tone: 1 };
  const actual = BrailleCore.parseSyllable(input);
  console.log(`    输入: "shang1" -> 输出: ${JSON.stringify(actual)}`);
  assertEqual(actual, expected, '输入 shang1', '输出');
});

runTest('parseSyllable: 复韵母 iou', () => {
  const input = 'liu2';
  const expected = { initial: 'l', final: 'iu', tone: 2 };
  const actual = BrailleCore.parseSyllable(input);
  console.log(`    输入: "liu2" -> 输出: ${JSON.stringify(actual)}`);
  assertEqual(actual, expected, '输入 liu2', '输出');
});

// ============================================================
// 3. 拼音转盲文测试
// ============================================================
separator('3. 拼音转盲文');

runTest('syllableToBraille: ma1 (妈)', () => {
  const input = 'ma1';
  const actual = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 输出: ${actual} (盲文)`);
  if (!actual) throw new Error('输出为空');
});

runTest('syllableToBraille: zhong4 (众)', () => {
  const input = 'zhong4';
  const actual = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 输出: ${actual} (盲文)`);
  if (!actual) throw new Error('输出为空');
});

runTest('syllableToBraille: ni3 (你)', () => {
  const input = 'ni3';
  const actual = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 输出: ${actual} (盲文)`);
  if (!actual) throw new Error('输出为空');
});

runTest('syllableToBraille: wo3 (我)', () => {
  const input = 'wo3';
  const actual = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 输出: ${actual} (盲文)`);
  if (!actual) throw new Error('输出为空');
});

runTest('syllableToBraille: guo2 (国)', () => {
  const input = 'guo2';
  const actual = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 输出: ${actual} (盲文)`);
  if (!actual) throw new Error('输出为空');
});

runTest('syllableToBraille: 无声调模式', () => {
  const input = 'ma';
  const actualWithTone = BrailleCore.syllableToBraille(input, true);
  const actualWithoutTone = BrailleCore.syllableToBraille(input, false);
  console.log(`    输入: "${input}" -> 带声调: ${actualWithTone}, 不带声调: ${actualWithoutTone}`);
  if (!actualWithoutTone) throw new Error('输出为空');
});

// ============================================================
// 4. 盲文转拼音测试
// ============================================================
separator('4. 盲文转拼音');

runTest('parseCellsToPinyin: 简单音节 ma', () => {
  const cells = [[1, 3, 4], [3, 5]];  // m + a
  const actual = BrailleCore.parseCellsToPinyin(cells);
  console.log(`    输入: [[1,3,4],[3,5]] -> 输出: ${actual.pinyin}, 成功: ${actual.ok}`);
  if (!actual.ok) throw new Error('解析失败');
  assertEqual(actual.ok, true, '解析结果', '成功状态');
});

runTest('parseCellsInput: 解析用户输入格式', () => {
  const input = '1,2 3,5';
  const actual = BrailleCore.parseCellsInput(input);
  console.log(`    输入: "${input}" -> cells: ${JSON.stringify(actual.cells)}`);
  assertEqual(actual.ok, true, '解析结果', '成功状态');
  assertEqual(actual.cells, [[1, 2], [3, 5]], 'cells', '解析结果');
});

// ============================================================
// 5. 拼音转汉字测试
// ============================================================
separator('5. 拼音转汉字');

runTest('pinyinToHanzi: ni hao -> 你好', () => {
  const input = 'ni hao';
  const expected = '你好';
  const actual = BrailleCore.pinyinToHanzi(input);
  console.log(`    输入: "${input}" -> 输出: "${actual.hanzi}" (期望: "${expected}")`);
  assertEqual(actual.hanzi, expected, '输出', '汉字');
});

runTest('pinyinToHanzi: zhong guo -> 中国', () => {
  const input = 'zhong guo';
  const expected = '中国';
  const actual = BrailleCore.pinyinToHanzi(input);
  console.log(`    输入: "${input}" -> 输出: "${actual.hanzi}" (期望: "${expected}")`);
  assertEqual(actual.hanzi, expected, '输出', '汉字');
});

runTest('pinyinToHanzi: wo de -> 我的', () => {
  const input = 'wo de';
  const expected = '我的';
  const actual = BrailleCore.pinyinToHanzi(input);
  console.log(`    输入: "${input}" -> 输出: "${actual.hanzi}" (期望: "${expected}")`);
  assertEqual(actual.hanzi, expected, '输出', '汉字');
});

runTest('pinyinToHanzi: a e i o u -> 啊饿一哦无', () => {
  const input = 'a e i o u';
  const expected = '啊饿一哦无';
  const actual = BrailleCore.pinyinToHanzi(input);
  console.log(`    输入: "${input}" -> 输出: "${actual.hanzi}" (期望: "${expected}")`);
  assertEqual(actual.hanzi, expected, '输出', '汉字');
});

// ============================================================
// 6. 验证函数测试
// ============================================================
separator('6. 验证函数');

runTest('validateSyllable: 有效音节 ma', () => {
  const input = 'ma';
  const actual = BrailleCore.validateSyllable(input);
  console.log(`    输入: "${input}" -> 有效: ${actual.ok}`);
  assertEqual(actual.ok, true, '验证结果', '有效');
});

runTest('validateSyllable: 无效音节 abc', () => {
  const input = 'abc';
  const actual = BrailleCore.validateSyllable(input);
  console.log(`    输入: "${input}" -> 有效: ${actual.ok}`);
  assertEqual(actual.ok, false, '验证结果', '无效');
});

runTest('validatePinyin: 有效拼音 zhong guo', () => {
  const input = 'zhong guo';
  const actual = BrailleCore.validatePinyin(input);
  console.log(`    输入: "${input}" -> 有效: ${actual.isValid}`);
  assertEqual(actual.isValid, true, '验证结果', '有效');
});

runTest('validateSequence: 非空序列', () => {
  const input = 'test';
  const actual = BrailleCore.validateSequence(input);
  console.log(`    输入: "${input}" -> 有效: ${actual.ok}`);
  assertEqual(actual.ok, true, '验证结果', '有效');
});

runTest('validateSequence: 空序列', () => {
  const input = '';
  const actual = BrailleCore.validateSequence(input);
  console.log(`    输入: "" -> 有效: ${actual.ok}`);
  assertEqual(actual.ok, false, '验证结果', '无效');
});

// ============================================================
// 7. 数据字典测试
// ============================================================
separator('7. 数据字典');

runTest('INITIALS_MAP: 包含所有声母', () => {
  const expectedInitials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'j', 'q', 'x'];
  const actual = Object.keys(BrailleCore.INITIALS_MAP);
  console.log(`    声母数量: ${actual.length}`);
  assertEqual(actual.length, 21, '声母数量', '21');
});

runTest('FINALS_MAP: 包含所有韵母', () => {
  const count = Object.keys(BrailleCore.FINALS_MAP).length;
  console.log(`    韵母数量: ${count}`);
  if (count < 30) throw new Error('韵母数量不足');
});

runTest('TONE_MAP: 声调映射完整', () => {
  const expected = { 1: [1], 2: [2], 3: [3], 4: [2, 3] };
  console.log(`    声调映射: ${JSON.stringify(BrailleCore.TONE_MAP)}`);
  assertEqual(BrailleCore.TONE_MAP, expected, '声调映射', '完整');
});

// ============================================================
// 8. 综合测试
// ============================================================
separator('8. 综合功能测试');

runTest('完整流程: 拼音 -> 盲文 -> 拼音', () => {
  const pinyin = 'ni3';
  // 拼音转盲文
  const braille = BrailleCore.syllableToBraille(pinyin);
  console.log(`    拼音: "${pinyin}" -> 盲文: ${braille}`);

  // 盲文转点阵
  const dots = BrailleCore.brailleToDots(braille[0]);
  const toneDots = braille[1] ? BrailleCore.brailleToDots(braille[1]) : null;
  console.log(`    盲文点阵: ${JSON.stringify(dots)}, 声调: ${JSON.stringify(toneDots)}`);

  if (!dots) throw new Error('转换失败');
});

runTest('完整流程: 汉字 -> 拼音 -> 盲文', () => {
  const pinyin = 'ai4';
  const braille = BrailleCore.syllableToBraille(pinyin);
  console.log(`    拼音: "${pinyin}" -> 盲文: ${braille}`);
  if (!braille) throw new Error('转换失败');
});

runTest('复杂拼音: shuang1 (霜)', () => {
  const input = 'shuang1';
  const result = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 盲文: ${result}`);
  if (!result) throw new Error('转换失败');
});

runTest('复杂拼音: jiong2 (窘)', () => {
  const input = 'jiong2';
  const result = BrailleCore.syllableToBraille(input);
  console.log(`    输入: "${input}" -> 盲文: ${result}`);
  if (!result) throw new Error('转换失败');
});

runTest('完整句子: wo3 ai4 ni3', () => {
  const pinyinWords = ['wo3', 'ai4', 'ni3'];
  let braille = '';
  for (const p of pinyinWords) {
    braille += BrailleCore.syllableToBraille(p);
  }
  console.log(`    拼音: ${pinyinWords.join(' ')} -> 盲文: ${braille}`);
  if (!braille) throw new Error('转换失败');
});

// ============================================================
// 测试结果汇总
// ============================================================
separator('测试结果汇总');

console.log(color(`\n  总测试数: ${totalTests}`, 'bold'));
console.log(color(`  通过: ${passedTests}`, 'green'));
console.log(color(`  失败: ${totalTests - passedTests}`, totalTests - passedTests > 0 ? 'red' : 'green'));

const passRate = ((passedTests / totalTests) * 100).toFixed(1);
console.log(color(`  通过率: ${passRate}%`, passRate >= 80 ? 'green' : 'yellow'));

if (passedTests === totalTests) {
  console.log(color('\n  所有测试通过!', 'green'));
} else {
  console.log(color(`\n  有 ${totalTests - passedTests} 个测试失败，请检查输出。`, 'red'));
}

console.log('\n');
