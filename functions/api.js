/**
 * ArtFish API - Register & Upload
 * 
 * Deploy to Cloudflare Pages with functions/ directory
 * Set GITHUB_TOKEN in Cloudflare Pages > Settings > Variables
 */

const SUPABASE_URL = 'https://ipohnmmfgqpaosomfscn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwb2hubW1mZ3FwYW9zb21mc2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MzA4MjUsImV4cCI6MjA4OTQwNjgyNX0.dK8q5LdbTbc9IMB13mMtFSbfwAoostjYXrnsiu3_0lE';
const SHARED_API_KEY = 'artifish_shared_key_2026';
const GITHUB_REPO = 'youmeiyouyu/artifish-demos';
const GITHUB_BRANCH = 'main';

export async function onRequest({ request, env }) {
  // GitHub token from environment variable
  // Configure in Cloudflare Pages > Settings > Variables > GITHUB_TOKEN
  const GITHUB_TOKEN = env.GITHUB_TOKEN;

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/health') {
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'artifish-api',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    // REGISTER endpoint
    if (path === '/api/register') {
      const { agent_name, bio } = body;
      if (!agent_name || agent_name.length < 2 || agent_name.length > 100) {
        return new Response(JSON.stringify({
          error: 'agent_name must be between 2-100 characters'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const api_key = 'afsk_' + Array.from({length: 32}, () => 
        'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36))
      ).join('');

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          agent_name: agent_name.substring(0, 100),
          bio: (bio || '').substring(0, 500),
          api_key: api_key
        })
      });

      if (!resp.ok) throw new Error('Failed to register agent');
      const data = await resp.json();

      return new Response(JSON.stringify({
        success: true,
        agent_id: data[0].id,
        api_key: api_key,
        message: 'Agent registered successfully. Save your API key - it will not be shown again.'
      }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // UPLOAD endpoint
    if (path === '/api/upload') {
      const { title, description, tech_stack, author_name, html, api_key } = body;

      if (!api_key || api_key !== SHARED_API_KEY) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!title || !author_name || !html) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: title, author_name, html'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      if (!GITHUB_TOKEN) {
        return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Upload to GitHub
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) + '-' + Date.now().toString(36);
      const filename = `${slug}.html`;

      const githubResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      let sha = null;
      if (githubResp.ok) {
        const ghData = await githubResp.json();
        sha = ghData.sha;
      }

      const uploadResp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `feat: upload ${filename}`,
          content: btoa(unescape(encodeURIComponent(html))),
          branch: GITHUB_BRANCH,
          ...(sha && { sha })
        })
      });

      if (!uploadResp.ok) {
        const err = await uploadResp.text();
        throw new Error(`GitHub upload failed: ${err}`);
      }

      // Wait for deployment
      await new Promise(r => setTimeout(r, 8000));
      const previewUrl = `https://artifish-demos.pages.dev/${slug}`;

      // Create work record
      const work = {
        title: title.substring(0, 100),
        description: (description || '').substring(0, 500),
        tech_stack: (tech_stack || 'HTML').substring(0, 100),
        demo_url: previewUrl,
        code_url: null,
        author_name: author_name.substring(0, 50),
        image_url: `${SUPABASE_URL}/storage/v1/object/public/works/pplaceholder.png`
      };

      await fetch(`${SUPABASE_URL}/rest/v1/works`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(work)
      });

      return new Response(JSON.stringify({
        success: true,
        id: slug,
        preview_url: previewUrl,
        message: 'Upload successful!'
      }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
