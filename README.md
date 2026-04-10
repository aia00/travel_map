# 足迹行政区地图

这是一个纯静态网页，用来按大洲整理旅行足迹，并细化到各个国家的一级行政区。

## 本地启动

在当前目录执行：

```bash
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000
```

## GitHub Pages 部署

这个目录已经包含 GitHub Pages workflow：

- `.github/workflows/deploy-pages.yml`
- `.nojekyll`

如果你要把它部署到 GitHub，最短流程是：

```bash
cd /home/ykwang/projects/maps
git init
git add .
git commit -m "Initial GitHub Pages site"
git branch -M main
gh repo create maps --public --source=. --remote=origin --push
```

然后到 GitHub 仓库页面：

1. 打开 `Settings`
2. 进入 `Pages`
3. 在 `Build and deployment` 里选择 `GitHub Actions`

之后每次你往 `main` 分支 push，GitHub Pages 都会自动重新部署。

默认站点地址通常会是：

```text
https://<你的GitHub用户名>.github.io/maps/
```

如果你已经有远程仓库，也可以手动连上去：

```bash
cd /home/ykwang/projects/maps
git init
git add .
git commit -m "Initial GitHub Pages site"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

## 使用说明

- 先切换大洲，再选择国家。
- 页面会加载这个国家的一级行政区边界。
- 可以在搜索框输入州、省、郡等名称，再选择 `常住 / 旅行 / 途径` 上色。
- 也可以直接点击地图区域，再用右侧快捷按钮改颜色。
- 标记结果保存在浏览器 `localStorage` 里。

## 注意

- `localStorage` 是按域名分开的，所以你在 `localhost` 上标的内容，不会自动出现在 GitHub Pages 域名上。
- 页面首次加载和切换国家时需要联网获取地图数据。

## 数据来源

- 全球国家概览底图：`visionscarto/world-atlas`
- 国家与一级行政区边界：`geoBoundaries`
