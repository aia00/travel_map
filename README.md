# Travel Dashboard / 旅行总览

A static multi-page travel dashboard with:

- a world atlas for continent, country, and ADM1 footprint tracking
- a flight log with airport-based statistics
- a reserved hotel module placeholder for the next build

这是一个静态多页面旅行记录站点，目前包含：

- 世界地图模块：按大洲、国家和一级行政区记录足迹
- 航班模块：按机场录入航班并自动生成统计
- 酒店模块占位页：后续再继续实现

## Pages / 页面

- `/`:
  the main dashboard home page
- `/atlas.html`:
  the existing world map / administrative-region tracker
- `/flights.html`:
  the new flight logging and stats page
- `/stays.html`:
  placeholder page for future hotel tracking
- `/visited.html`:
  archive page for saved map regions

## Current Features / 当前功能

### Atlas / 地图模块

- Continent-first browsing, then country-level drill-down into ADM1 regions such as states and provinces.
- Mark places as `Resident`, `Travel`, or `Transit`.
- Add regions by search, city/place lookup, airport code lookup, or by clicking the map directly.
- Chinese / English UI toggle.
- Data is saved in the browser with `localStorage`.

### Flights / 航班模块

- Log each flight segment with airline, flight number, departure airport, arrival airport, departure time, duration, cabin, aircraft, seat, and notes.
- Airport lookup is based on airport code selection rather than free text auto-match.
- Flight data is saved in `localStorage`.
- Built-in stats include completed flights, upcoming flights, flown distance, flown air time, unique airports, top airlines, top routes, longest completed segment, and yearly summaries.

## Local Development / 本地运行

```bash
cd /home/ykwang/projects/maps
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Recommended navigation after opening:

- Home dashboard: `http://localhost:8000/`
- Atlas: `http://localhost:8000/atlas.html`
- Flights: `http://localhost:8000/flights.html`

## Persistence / 数据保存

- Map marks are saved in browser `localStorage`.
- Flight records are also saved in browser `localStorage`.
- Language preference is shared across pages.
- `localStorage` is domain-specific, so data on `localhost` and GitHub Pages are separate.

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

- Geographic names come from the source datasets and may remain in their original naming.
- The atlas page still needs network access to fetch map data on first load and when switching countries.
- The flights page needs network access to resolve airport codes from the airport dataset.

## Data Sources / 数据来源

- World country overview: `visionscarto/world-atlas`
- Administrative boundaries: `geoBoundaries`
- Airport reference data: `ourairports-data`
