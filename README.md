# GitHub.io URL Codec

一个纯静态 GitHub Pages 小工具：把普通 HTTP(S) 网址转换成三种“看起来不断重复”的长网址，粘贴到地址栏后会显示真实目标，确认后再打开原网站。

## 三种模式

1. **重复 p**：`p.pp.ppp.pppp...`
2. **相似 p 字符**：使用 `p / ρ / р / ᴘ` 表示四进制数字
3. **重复 github.io**：`github.io/github.io.github.io/...`

所有模式都会先把网址编码成 UTF-8 字节，再把每个字节表示为四位四进制。页面不保存输入内容。

## 部署到 GitHub Pages

### 方式一：从分支部署

1. 新建一个公开仓库，例如 `github-io-url-codec`。
2. 将本项目全部文件上传到仓库根目录。
3. 打开 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. 选择 `main` 和 `/ (root)`，保存。

站点地址通常为：

```text
https://<用户名>.github.io/<仓库名>/
```

### 方式二：GitHub Actions

项目已包含 `.github/workflows/pages.yml`。在 Pages 设置中选择 **GitHub Actions** 后即可使用。

## 路由原理

生成链接使用路径形式，例如：

```text
https://username.github.io/repository/p/p.ppp.pp...
```

GitHub Pages 找不到该实际文件时会返回项目中的 `404.html`。404 页面提取模式与编码内容，再转到主页的 hash 路由；主页完成解码，清楚显示真实域名和完整网址，由用户确认后再打开原网站。

## 注意

- 这是编码，不是加密。
- `github.io` 模式会产生非常长的网址，较长原网址可能超过部分应用的链接长度限制。
- 仅允许跳转至 `http://` 或 `https://` 地址。
