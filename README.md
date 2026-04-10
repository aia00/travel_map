# Visited Administrative Map / 足迹行政区地图

A static map app for tracking where you have been by continent, country, and first-level administrative region.

这是一个静态网页，用来按大洲、国家和一级行政区记录你去过的地方。

## Features / 功能

- Continent-first browsing, then country-level drill-down into ADM1 regions such as states and provinces.
- Mark places as `Resident`, `Travel`, or `Transit`.
- Add regions by search or by clicking the map directly.
- Chinese / English UI toggle in the top-right corner of the page.
- Data is saved in the browser with `localStorage`.
- The app also remembers your last selected continent, country, region, search text, and visit type.

## Local Development / 本地运行

```bash
cd /home/ykwang/projects/maps
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## GitHub Pages

This repository includes:

- `.github/workflows/deploy-pages.yml`
- `.nojekyll`

For a repository using GitHub Actions Pages deployment:

1. Push the repository to GitHub.
2. Open `Settings > Pages`.
3. Set `Build and deployment` to `GitHub Actions`.
4. Push to `main` to trigger deployment.

If the first workflow run fails with a Pages `Not Found` error, it usually means Pages has not been enabled for the repository yet. Set `Settings > Pages > Build and deployment` to `GitHub Actions`, then rerun the workflow.

Typical site URL:

```text
https://<your-github-username>.github.io/maps/
```

## Notes / 说明

- UI text can switch between English and Chinese, but geographic names come from the source datasets and may remain in their original naming.
- `localStorage` is domain-specific, so marks saved on `localhost` are separate from marks saved on your GitHub Pages domain.
- The page needs network access to fetch map data on first load and when switching countries.

## Data Sources / 数据来源

- World country overview: `visionscarto/world-atlas`
- Administrative boundaries: `geoBoundaries`
