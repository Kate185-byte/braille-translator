/**
 * Braille Translator Backend with DeepSeek AI
 * 盲文翻译后端服务
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// API Key 检查
const API_KEY = process.env.DEEPSEEK_API_KEY;

if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE' || API_KEY === '') {
  console.warn('========================================');
  console.warn('⚠️  警告: DEEPSEEK_API_KEY 未配置！');
  console.warn('========================================');
  console.warn('请在 .env 文件中设置你的 DeepSeek API Key');
  console.warn('获取地址: https://platform.deepseek.com/api_keys');
  console.warn('========================================\n');
}

const API_URL = 'https://api.deepseek.com/chat/completions';

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 检查 Node 版本
const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
if (nodeVersion < 18) {
  console.warn(`⚠️  建议使用 Node.js 18+ 版本，当前版本: ${process.version}`);
}

// DeepSeek API 调用
async function callDeepSeek(messages) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE' || API_KEY === '') {
    throw new Error('API Key 未配置，请在 .env 文件中设置 DEEPSEEK_API_KEY');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// API 端点

// 1. AI 翻译盲文
app.post('/api/ai-translate', async (req, res) => {
  try {
    const { braille, pinyin } = req.body;

    if (!braille && !pinyin) {
      return res.json({ success: false, error: '请提供盲文或拼音内容' });
    }

    const messages = [
      {
        role: 'system',
        content: `你是一个专业的汉字盲文翻译专家，专注于将盲文/拼音准确转换为规范汉字。

翻译原则：
1. 根据《中国现行盲文》标准进行翻译
2. 遵循"分词连写"规则：两个汉字之间需要空格分隔
3. 声调标注：使用数字1-4表示四声，数字5表示轻声
4. 多音字处理：根据上下文选择正确的读音
5. 生僻字处理：优先使用常用字

输出格式：
- 汉字之间用空格分隔
- 不添加标点符号
- 不添加任何解释说明
- 直接返回纯汉字结果`
      },
      {
        role: 'user',
        content: `盲文点阵: ${braille || ''}
拼音: ${pinyin || ''}

请将上述内容准确转换为对应的汉字（按分词连写规则，空格分隔汉字）。`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, hanzi: result.trim() });
  } catch (error) {
    console.error('AI翻译错误:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// 2. AI 解释内容
app.post('/api/explain', async (req, res) => {
  try {
    const { text, pinyin, hanzi } = req.body;

    if (!text && !pinyin) {
      return res.json({ success: false, error: '请提供盲文或拼音内容' });
    }

    const messages = [
      {
        role: 'system',
        content: '你是一个盲文翻译专家，请用简单易懂的语言解释盲文内容的含义。'
      },
      {
        role: 'user',
        content: `请解释以下盲文内容的含义：

原始盲文: ${text || ''}
拼音: ${pinyin || ''}
汉字: ${hanzi || '未知'}

请给出：1. 整体含义 2. 可能的使用场景`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, explanation: result.trim() });
  } catch (error) {
    console.error('AI解释错误:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// 3. 改进建议
app.post('/api/suggest', async (req, res) => {
  try {
    const { pinyin, text } = req.body;

    if (!pinyin && !text) {
      return res.json({ success: false, error: '请提供拼音或盲文内容' });
    }

    const messages = [
      {
        role: 'system',
        content: `你是盲文拼写检查专家，专注于检查拼音的声母、韵母和声调是否规范。

检查要点：
1. 声母是否完整正确
2. 韵母是否符合汉语拼音规则
3. 声调标注是否准确（1-4声，轻声用5）
4. 音节分隔是否正确
5. 整体盲文点阵是否合理`
      },
      {
        role: 'user',
        content: `请检查以下拼音/盲文的拼写，并给出改进建议：

拼音: ${pinyin || ''}
盲文: ${text || ''}

请分析：
1. 拼写是否正确规范
2. 如有错误，指出具体问题
3. 给出正确的盲文拼写方案`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, suggestion: result.trim() });
  } catch (error) {
    console.error('AI建议错误:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// 4. 文字转盲文解释
app.post('/api/convert-explain', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.json({ success: false, error: '请提供中文文字' });
    }

    const messages = [
      {
        role: 'system',
        content: '你是一个盲文专家，请解释中文文字如何对应到盲文点阵。'
      },
      {
        role: 'user',
        content: `请解释以下中文如何转换为盲文：

文字: ${text}

请逐一解释每个字的盲文点阵结构、声母、韵母和声调。`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, explanation: result.trim() });
  } catch (error) {
    console.error('AI解释错误:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// 5. OCR 拼音消歧 - 从多个候选拼音中选出最通顺的
app.post('/api/ocr-disambiguate', async (req, res) => {
  try {
    const { candidates } = req.body;

    if (!candidates || !candidates.length) {
      return res.json({ success: false, error: '请提供候选拼音列表' });
    }

    const candidateList = candidates.map((c, i) => `${i + 1}. ${c}`).join('\n');

    const messages = [
      {
        role: 'system',
        content: `你是一个专业的中文盲文翻译专家。你的任务是从多个候选拼音组合中，选出最合理、最通顺的一个，并将其转换为汉字。

规则：
1. 分析每个候选拼音，判断哪个组合能构成有意义的中文词句
2. 优先选择常用词汇和通顺的语句
3. 如果多个候选都合理，选择最常用的那个
4. 将选中的拼音转为对应汉字

输出格式（严格遵守，不要添加任何其他内容）：
第一行：选中的拼音（原样输出，空格分隔）
第二行：对应的汉字`
      },
      {
        role: 'user',
        content: `以下是从盲文图片识别出的多个候选拼音组合，请选出最通顺合理的一个并转为汉字：

${candidateList}`
      }
    ];

    const result = await callDeepSeek(messages);
    const lines = result.trim().split('\n').filter(l => l.trim());

    if (lines.length >= 2) {
      res.json({ success: true, pinyin: lines[0].trim(), hanzi: lines[1].trim() });
    } else if (lines.length === 1) {
      res.json({ success: true, pinyin: candidates[0], hanzi: lines[0].trim() });
    } else {
      res.json({ success: false, error: 'AI 返回格式异常' });
    }
  } catch (error) {
    console.error('OCR消歧错误:', error.message);
    res.json({ success: false, error: error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  const apiKeyConfigured = API_KEY && API_KEY !== 'YOUR_API_KEY_HERE' && API_KEY !== '';
  res.json({
    status: apiKeyConfigured ? 'ok' : 'warning',
    deepseek: apiKeyConfigured ? 'configured' : 'not_configured',
    nodeVersion: process.version,
    message: apiKeyConfigured ? '服务正常运行' : '请在 .env 文件中配置 DEEPSEEK_API_KEY'
  });
});

// API Key 配置检查端点
app.get('/api/config-status', (req, res) => {
  const configured = API_KEY && API_KEY !== 'YOUR_API_KEY_HERE' && API_KEY !== '';
  res.json({
    configured: configured,
    prefix: configured ? API_KEY.substring(0, 7) + '...' : null
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  const apiKeyConfigured = API_KEY && API_KEY !== 'YOUR_API_KEY_HERE' && API_KEY !== '';

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           盲文翻译后端服务已启动                               ║
╠══════════════════════════════════════════════════════════════╣
║  本地地址: http://localhost:${PORT}                           ║
║  API 端点:                                                    ║
║    - POST /api/ai-translate    (AI 翻译盲文)                  ║
║    - POST /api/explain         (AI 解释内容)                  ║
║    - POST /api/suggest         (AI 改进建议)                  ║
║    - POST /api/convert-explain (文字转盲文解释)                ║
║    - POST /api/ocr-disambiguate(OCR 拼音消歧)                 ║
║    - GET  /api/health          (健康检查)                      ║
║    - GET  /api/config-status   (配置状态)                     ║
╠══════════════════════════════════════════════════════════════╣
║  DeepSeek API: ${apiKeyConfigured ? '✓ 已配置' : '✗ 未配置'}
╚══════════════════════════════════════════════════════════════╝

${apiKeyConfigured ? '' : '⚠️  请编辑 backend/.env 文件配置你的 API Key\n'}

启动前端后访问: http://localhost:${PORT} (如果 frontend 目录存在)
或直接在 index.html 中使用

  `);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  process.exit(0);
});
