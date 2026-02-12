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
        content: `你是一个专业的盲文翻译助手。用户会提供盲文翻译结果，请根据拼音给出最可能的汉字。
要求：
1. 根据上下文选择最合适的汉字
2. 如果有多个选择，给出最常见的用法
3. 直接返回翻译结果，不要解释`
      },
      {
        role: 'user',
        content: `盲文: ${braille || ''}
拼音: ${pinyin || ''}

请给出最准确的汉字翻译。`
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
        content: '你是一个拼音和盲文专家，给出更好的拼音输入建议。'
      },
      {
        role: 'user',
        content: `请分析以下拼音，指出可能的改进建议：

拼音: ${pinyin}

请给出：1. 是否正确 2. 如有错误建议正确的写法 3. 相关的常用词组`
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
