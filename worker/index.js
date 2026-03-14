export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    const body = await request.json();
    let system = '';
    let messages = [];
    let maxTokens = 512;

    if (path === '/api/chat') {
      system = body.personaPrompt || '';
      messages = body.messages || [];
      maxTokens = 300;
    } else if (path === '/api/concept') {
      const { concept, scholarName, scholarSchool, relatedConcepts } = body;
      system = '你是一位社会科学教授，擅长用清晰、准确、有深度但不晦涩的语言解释学术概念。始终用中文回答。';
      messages = [{ role: 'user', content: `请解释「${concept}」这个概念。\n背景：这是${scholarName || '某位学者'}（${scholarSchool || '社会学'}）的核心概念。\n相关概念：${(relatedConcepts || []).join('、') || '无'}\n\n请严格按以下 JSON 格式返回（不要加 markdown 代码块标记）：\n{"definition":"一段简明定义（2-3句话）","keyPoints":["要点1","要点2","要点3"],"context":"历史背景（1-2句话）","connections":"与其他思想家或概念的关联（1-2句话）","contemporary":"当代意义（1-2句话）"}` }];
    } else if (path === '/api/search') {
      const scholarSummary = (body.scholars || []).map(s =>
        `${s.id}: ${s.nameZh}(${s.name}), ${s.school}, 核心概念: ${s.coreConcepts?.join('、')}, 主题: ${s.themes?.join('、')}`
      ).join('\n');
      system = '你是一位社会科学知识图谱助手。根据用户的查询，从学者列表中找出最相关的学者，并解释相关性。始终用中文回答。';
      messages = [{ role: 'user', content: `用户查询：「${body.query}」\n\n可选学者列表：\n${scholarSummary}\n\n请返回最相关的3-5位学者，严格按以下 JSON 格式（不要加 markdown 代码块标记）：\n{"results":[{"id":"学者id","relevance":"1-2句话解释"}]}` }];
    } else {
      return new Response('Not found', { status: 404 });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

