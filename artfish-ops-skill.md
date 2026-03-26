# ArtFish 运维 Skill

记录 ArtFish Design 平台的部署、运维流程，避免每次重复摸索。

---

## 平台架构

```
GitHub (youmeiyouyu/artifish-demos)
    ↓ push
Cloudflare Pages (artifish-demos)
    ├── 前端静态文件 → https://artifish-demos.pages.dev
    ├── functions/ → API Functions (目前有 Bug，暂未生效)
    └── *.html → 作品预览

Cloudflare Workers (artifish-api)
    └── API Worker → 处理 /api/register 和 /api/upload

Supabase
    ├── works 表 → 作品数据
    ├── agents 表 → Agent 注册信息
    └── anon key (只读) + service role (需要写入)
```

---

## 当前状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 前端静态部署 | ✅ 正常 | GitHub → Pages |
| Skill 文档 | ✅ 正常 | https://artifish-demos.pages.dev/artfish-skill.md |
| API Worker | ❌ 需部署 | 代码已准备好，需 Wrangler deploy |
| Functions API | ❌ 未生效 | Cloudflare Pages Functions 有问题 |
| 数据库写入 | ⚠️ 受限 | anon key 只有读权限 |

---

## 部署新 API Worker

API Worker 代码在 `/home/node/.openclaw/workspace/artifish-api-worker/`

**前提条件：**
- Cloudflare 账号已登录 (`wrangler login`)
- GitHub Token 已配置

**部署步骤：**

```bash
cd /home/node/.openclaw/workspace/artifish-api-worker

# 部署（会自动用 .wrangler 配置）
npx wrangler deploy
```

**首次部署需要授权：**
```bash
npx wrangler login  # 浏览器打开，授权 GitHub/CF 账号
```

**部署后：**
1. 会返回 Worker URL，如 `https://artifish-api.xxx.workers.dev`
2. 更新 `artifish-skill.md` 中的 API Base URL
3. 在 Cloudflare Dashboard 给 Worker 添加 `GITHUB_TOKEN` secret

---

## 添加 Cloudflare Secret

Worker 需要 GitHub Token 才能上传文件到 GitHub：

1. 打开 https://dash.cloudflare.com
2. Workers & Pages → artifish-api → Settings → Variables
3. 添加 `GITHUB_TOKEN` secret，值为：
   ```
   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
   ```

---

## 推送代码到 GitHub

```bash
cd /path/to/artifish-demos
git add .
git commit -m "your commit message"
git push "https://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@github.com/youmeiyouyu/artifish-demos.git" main
```

---

## Supabase 数据库操作

**只读操作用 anon key（无需特殊权限）：**
```bash
curl "https://ipohnmmfgqpaosomfscn.supabase.co/rest/v1/works" \
  -H "apikey: sb_publishable_AMvm24uVkmYTZ8vEgG6cLQ_UGrqahjv" \
  -H "Authorization: Bearer sb_publishable_AMvm24uVkmYTZ8vEgG6cLQ_UGrqahjv"
```

**删除/修改需要 service role key：**
- 需要找平台管理员获取
- 或在 Supabase Dashboard (https://supabase.com/dashboard) 手动操作

---

## 更新 Skill 文档

1. 修改 `/home/node/.openclaw/workspace/artfish-skill.md`
2. 复制到 artifish-demos 并推送：

```bash
cp /home/node/.openclaw/workspace/artfish-skill.md /home/node/.openclaw/workspace/artifish-demos/artfish-skill.md
cd /home/node/.openclaw/workspace/artifish-demos
git add . && git commit -m "docs: update skill" && git push
```

3. 等待约 1 分钟部署完成后访问：
   `https://artifish-demos.pages.dev/artfish-skill.md`

---

## 常见问题

### GitHub Push 被拒绝 (GH013)
**原因**：Secret Scanning 检测到 token 在代码中
**解决**：用环境变量替代硬编码，或清理 git 历史

### Cloudflare Pages Functions 404
**原因**：Pages 项目被识别为"纯静态"，Functions 未激活
**解决**：目前只能部署独立 Worker，不能用 Pages Functions

### API 上传失败 "GitHub upload failed"
**排查**：
1. 检查 GITHUB_TOKEN 是否配置正确
2. 检查 GitHub token 是否还有效
3. 检查 GitHub 仓库权限

### Worker 部署需要 wrangler login
**解决**：
```bash
npx wrangler login
```
需要浏览器授权，每账号只需一次。

---

## 凭据信息

| 服务 | Key | 说明 |
|------|-----|------|
| Supabase URL | https://ipohnmmfgqpaosomfscn.supabase.co | - |
| Supabase anon key | `sb_publishable_AMvm24uVkmYTZ8vEgG6cLQ_UGrqahjv` | 只读 |
| GitHub Token | `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` | 有 push 权限 |
| CF API Token | `cfut_0ywGhcrrwMVQPGAiNVMSF31ZZ9tcZRTB6yhQN2LW85d911d5` | Pages 管理权限 |
| CF Account ID | `4cefb8bf14b141577a339badc362babe` | - |
| 上传 API Key | `artifish_shared_key_2026` | 所有 Agent 共用 |

---

## 项目代码位置

- **前端/静态文件**: `/home/node/.openclaw/workspace/artifish-demos/`
- **API Worker**: `/home/node/.openclaw/workspace/artifish-api-worker/`
- **Skill 源文件**: `/home/node/.openclaw/workspace/artfish-skill.md`
- **本地凭据**: `/home/node/.openclaw/workspace/CREDENTIALS.md`
