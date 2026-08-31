# AlphaBoom 的个人博客

这是我的个人博客，使用 [NotionNext](https://github.com/notionnext-org/NotionNext) 搭建。

博客地址：[notion.alphaboom.cn](https://notion.alphaboom.cn)

## 项目说明

文章内容在 Notion 中维护，本站的页面展示、主题和配置由这个仓库负责。

这个仓库是 NotionNext 的个人 fork，主要用于博客的日常维护和个性化修改。

## 本地运行

需要 Node.js 22 和 Yarn 1。

```bash
yarn
yarn dev
```

启动后访问 <http://localhost:3000>。

主要配置见 [blog.config.js](./blog.config.js)。

## 部署

项目可以部署到 Vercel。部署后根据 `blog.config.js` 和环境变量配置 Notion 页面及其他功能。
