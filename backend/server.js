/**
 * Braille Translator Backend with DeepSeek AI
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'YOUR_API_KEY_HERE';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// DeepSeek API 调用
async function callDeepSeek(messages) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// API 端点

// 1. AI 翻译盲文（使用 DeepSeek）
app.post('/api/ai-translate', async (req, res) => {
  try {
    const { braille, pinyin } = req.body;

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

请将上述拼音准确转换为对应的汉字（按分词连写规则，空格分隔汉字）。`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, hanzi: result.trim() });
  } catch (error) {
    console.error('AI翻译错误:', error);
    res.json({ success: false, error: error.message });
  }
});

// 2. AI 解释盲文内容
app.post('/api/explain', async (req, res) => {
  try {
    const { text, pinyin, hanzi } = req.body;

    const messages = [
      {
        role: 'system',
        content: '你是一个盲文翻译专家，请用简单易懂的语言解释盲文内容的含义。'
      },
      {
        role: 'user',
        content: `请解释以下盲文内容的含义：

原始盲文: ${text}
拼音: ${pinyin}
汉字: ${hanzi || '未知'}

请给出：1. 整体含义 2. 可能的使用场景`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, explanation: result.trim() });
  } catch (error) {
    console.error('AI解释错误:', error);
    res.json({ success: false, error: error.message });
  }
});

// 3. 改进翻译建议
app.post('/api/suggest', async (req, res) => {
  try {
    const { pinyin } = req.body;

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

拼音: ${pinyin}

请分析：
1. 拼写是否正确规范
2. 如有错误，指出具体问题
3. 给出正确的盲文拼写方案`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, suggestion: result.trim() });
  } catch (error) {
    console.error('AI建议错误:', error);
    res.json({ success: false, error: error.message });
  }
});

// 4. 文字转盲文解释
app.post('/api/convert-explain', async (req, res) => {
  try {
    const { text } = req.body;

    const messages = [
      {
        role: 'system',
        content: '你是一个盲文专家，请解释中文文字如何对应到盲文点阵。'
      },
      {
        role: 'user',
        content: `请解释以下中文如何转换为盲文：

文字: ${text}

请逐一解释每个字的盲文点阵结构。`
      }
    ];

    const result = await callDeepSeek(messages);
    res.json({ success: true, explanation: result.trim() });
  } catch (error) {
    console.error('AI解释错误:', error);
    res.json({ success: false, error: error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    deepseek: DEEPSEEK_API_KEY !== 'YOUR_API_KEY_HERE' ? 'configured' : 'not_configured'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
========================================
  盲文翻译后端服务已启动
========================================
  本地地址: http://localhost:${PORT}
  API 端点:
    - POST /api/ai-translate
    - POST /api/explain
    - POST /api/suggest
    - POST /api/convert-explain
    - GET  /api/health
========================================

  DeepSeek API 状态: ${DEEPSEEK_API_KEY !== 'YOUR_API_KEY_HERE' ? '已配置' : '未配置'}

  请设置环境变量 DEEPSEEK_API_KEY 或修改 server.js 中的 DEEPSEEK_API_KEY
========================================
  `);
});
