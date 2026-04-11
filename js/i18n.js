const TRANSLATIONS = {
  en: {
    pageTitle: "Visited Administrative Map",
    eyebrow: "Visited Atlas",
    languageSwitchAria: "Language switch",
    heroTitle: "Track your footprints by continent, country, and region.",
    heroText:
      "Choose a continent, open a country, then mark states, provinces, prefectures, or equivalent first-level divisions by search or directly on the map.",
    metrics: {
      total: "Total Marks",
    },
    sections: {
      continents: "Continents",
      markPlaces: "Mark Places",
      currentSelection: "Current Selection",
      saved: "Saved",
      continentView: "Continent View",
      adminLevel1: "Administrative Level 1",
    },
    continentSectionTitle:
      "Choose a continent first, then drill into each country’s administrative regions.",
    markPlacesTitle: "Search and color-code",
    savedTitle: "Marked regions in this country",
    archive: {
      title: "Visited archive",
      openPage: "Open visited page",
      totalMarks: "Saved regions",
      totalCountries: "Visited countries",
      currentCountry: "In current country",
      pageTitle: "Visited archive",
      pageText: "Browse all saved regions, then jump back into the map at the exact place.",
      backToMap: "Back to map",
      empty: "No saved regions yet.",
      updatedAt: "Updated {date}",
      openMap: "Open on map",
      searchPlaceholder: "Filter by country or region",
      searchLabel: "Filter",
      count: "{count} saved regions",
    },
    nav: {
      home: "Home",
      atlas: "Atlas",
      flights: "Flights",
      stays: "Hotels",
    },
    portal: {
      pageTitle: "Travel dashboard",
      heroTitle: "One home for your atlas, flights, and future hotel tracking.",
      heroText:
        "Open the world map to mark regions, log flights with airport-level stats, and reserve a dedicated hotel module for the next step.",
      modulesTitle: "Modules",
      modulesText: "Jump into the part of the travel log you want to update next.",
      metrics: {
        mapMarks: "Map marks",
        visitedCountries: "Visited countries",
        flights: "Flights logged",
        flightDistance: "Distance flown",
        upcomingFlights: "Upcoming flights",
      },
      cards: {
        atlasTitle: "World atlas",
        atlasText:
          "Track countries and first-level administrative regions with search, color coding, and saved history.",
        atlasAction: "Open atlas",
        atlasMeta: "{regions} regions across {countries} countries",
        flightsTitle: "Flight log",
        flightsText:
          "Record individual flights, choose exact airports, and review distance, duration, route, and airline stats.",
        flightsAction: "Open flights",
        flightsMeta: "{count} flights logged, {distance} flown",
        staysTitle: "Hotels",
        staysText:
          "A dedicated stay tracker for hotels, cities, and nights is reserved here for the next module.",
        staysAction: "View placeholder",
        staysMeta: "Coming soon",
      },
    },
    flights: {
      pageTitle: "Flight log",
      heroTitle: "Log flights and turn them into a personal dashboard.",
      heroText:
        "Add each segment with exact departure and arrival airports, then review distance, air time, airlines, routes, and yearly summaries.",
      formTitle: "Add a flight",
      formText:
        "Type a 3 or 4 character airport code, choose the exact airport from the list, then save the segment.",
      statsTitle: "Flight stats",
      statsText: "Completed flights drive the flown totals. Upcoming flights are tracked separately.",
      historyTitle: "Flight history",
      historyText: "Every saved segment stays editable through re-entry or removable from the list below.",
      filterLabel: "Show",
      filterAll: "All flights",
      filterCompleted: "Completed",
      filterUpcoming: "Upcoming",
      filterCanceled: "Canceled",
      emptyHistory: "No flights logged yet.",
      emptySuggestions: "Type an airport code to load matching airports.",
      emptyRankings: "No flight stats yet.",
      emptyYears: "No annual summary yet.",
      metrics: {
        totalFlights: "Flights logged",
        completedFlights: "Completed",
        upcomingFlights: "Upcoming",
        distanceFlown: "Distance flown",
        airTime: "Air time flown",
        uniqueAirports: "Airports used",
      },
      fields: {
        airline: "Airline",
        flightNumber: "Flight number",
        departureCode: "Departure airport code",
        arrivalCode: "Arrival airport code",
        departureAt: "Departure date and time",
        duration: "Flight duration",
        durationHours: "Hours",
        durationMinutes: "Minutes",
        status: "Flight status",
        cabinClass: "Cabin",
        aircraft: "Aircraft",
        seat: "Seat",
        notes: "Notes",
      },
      placeholders: {
        airline: "Delta Air Lines",
        flightNumber: "DL 289",
        departureCode: "JFK",
        arrivalCode: "LAX",
        aircraft: "Airbus A321neo",
        seat: "14A",
        notes: "Red-eye, upgraded at gate, or any note you want to keep.",
      },
      selectedAirport: "Selected: {airport}",
      airportMeta: "{name} · {meta}",
      statusLabels: {
        completed: "Completed",
        upcoming: "Upcoming",
        canceled: "Canceled",
      },
      cabinLabels: {
        economy: "Economy",
        premium: "Premium economy",
        business: "Business",
        first: "First",
      },
      labels: {
        favoriteAirline: "Most logged airline",
        busiestRoute: "Most logged route",
        longestFlight: "Longest completed segment",
        annualSummary: "Yearly summary",
        topAirlines: "Top airlines",
        topRoutes: "Top routes",
        recentFlights: "Recent flights",
        noLeader: "Not enough data yet",
        flightsCount: "{count} flights",
        durationsAndDistance: "{duration} · {distance}",
      },
      status: {
        ready: "Flight log is ready.",
        loadingAirports: "Looking up airports for {query}…",
        airportResults: "Found {count} airport matches for {query}. Pick one from the list.",
        airportNotFound: "No airports matched {query}.",
        selectDepartureAirport: "Pick one exact departure airport first.",
        selectArrivalAirport: "Pick one exact arrival airport first.",
        sameAirport: "Departure and arrival airports must be different.",
        durationRequired: "Enter a valid flight duration.",
        saved: "Saved {route}.",
        deleted: "Deleted {route}.",
      },
    },
    stays: {
      pageTitle: "Hotel module",
      heroTitle: "Hotel tracking is reserved here for the next build.",
      heroText:
        "The flights and atlas modules are live. This page holds the future stay tracker for hotels, nights, and city-level lodging history.",
      panelTitle: "Planned hotel features",
      panelText:
        "Next, this module can track hotels, check-in and check-out dates, nights, cities, brands, and stay summaries.",
    },
    fields: {
      country: "Country",
      countryPlaceholder: "Select a country",
      regionSearch: "Region search",
      visitType: "Visit type",
    },
    regionPlaceholder: "Search a state, province, city, airport code, or landmark",
    buttons: {
      addOrUpdate: "Add / update color",
      clearCurrent: "Clear current mark",
      clear: "Clear",
      delete: "Delete",
      addFlight: "Add flight",
      resetFlightForm: "Reset form",
    },
    labels: {
      unmarked: "Unmarked",
    },
    selection: {
      emptyTitle: "No region selected yet",
      emptyMeta: "Click a map region or type into the search box.",
      meta: "{country} · Current status: {status}",
    },
    search: {
      flexHint:
        "Search globally by city, state, airport code, or landmark, then pick a result below.",
      noMatches:
        "No matching results yet. Keep typing or press Enter to search all countries.",
      placeNoMatches:
        "Still nothing mapped. Try another spelling, a nearby city, or the exact state / province name.",
      pickResult:
        "Pick one result below to focus the map. Then choose a visit type and save it.",
      loading: "Searching across countries…",
      badges: {
        region: "Region",
        place: "Place",
        airport: "Airport",
      },
    },
    saved: {
      emptySelectCountry: "Select a country first.",
      emptyNoRegions:
        "No marked regions in this country yet. Click a region on the map to color it.",
    },
    visitTypes: {
      resident: {
        label: "Resident",
        description: "Long-term living, working, or sustained stay.",
      },
      travel: {
        label: "Travel",
        description: "Trips, business travel, study, or short visits.",
      },
      transit: {
        label: "Transit",
        description: "Passing through, layovers, transfers, or brief stops.",
      },
    },
    continents: {
      asia: "Asia",
      europe: "Europe",
      africa: "Africa",
      "north-america": "North America",
      "south-america": "South America",
      oceania: "Oceania",
      antarctica: "Antarctica",
    },
    map: {
      continentTitleSuffix: "Map",
      countryTitleSuffix: "Administrative Level 1",
      continentMeta:
        "Visited {visitedCount}/{count} countries or territories in this continent. Click the map or dropdown to switch countries.",
      continentMarkedRegions: "Marked regions: {count}",
      continentNoMarks: "No marks yet.",
      continentBreakdown:
        "{residentLabel} {resident} / {travelLabel} {travel} / {transitLabel} {transit}",
      countryMetaFallback:
        "Visited {visitedCount}/{count} displayed regions. ADM1 is unavailable for this country, so the view falls back to the country boundary.",
      countryMetaLoaded:
        "Visited {visitedCount}/{count} first-level administrative regions. Click a region to mark it.",
      countryTitleEmpty: "Administrative map",
      adminStatus: "Status: {status}",
      emptyContinent:
        "No country boundaries are available for this continent right now.",
      emptyCountryPrompt:
        "Select a country to view its first-level administrative regions.",
      emptyCountryLoading: "First-level boundaries are still loading.",
      emptyCountryNoAdm1:
        "This country does not have displayable first-level administrative boundaries.",
      emptyCountryUnavailable:
        "Unable to load first-level administrative boundaries right now.",
      emptyContinentLoad:
        "Failed to load the world map. Refresh the page and try again.",
      emptyContinentNoCountryData:
        "This continent does not currently have loadable country data.",
    },
    status: {
      loadingGlobalData: "Loading global country metadata and base map…",
      ready: "The map is ready.",
      initError:
        "Initialization failed. Make sure your browser can reach the external data sources.",
      loadingCountry:
        "Loading first-level administrative boundaries for {country}…",
      loadedCountry:
        "Loaded first-level administrative boundaries for {country}.",
      countryLoadError: "Failed to load first-level administrative boundaries.",
      selectCountryFirst: "Select a country first.",
      enterRegion: "Enter a region name.",
      searchingAirportCode:
        "Looking up airport code {code} across countries…",
      searchingPlaces: "Searching cities and places across countries…",
      regionNotFound:
        "No matching region was found. Pick one from the suggestions first.",
      multipleMatches:
        "Multiple regions matched. Pick the exact one before saving.",
      airportCodeNotFound:
        "No airport with code {code} could be mapped to a first-level region in {country}.",
      airportCodeMultipleMatches:
        "This airport code maps to multiple first-level regions. Pick the exact one first.",
      placeNotFound:
        "No city or place match could be mapped to a first-level region in {country}.",
      placeMultipleMatches:
        "This place could belong to multiple first-level regions. Pick the exact one first.",
      placeLookupError:
        "City and place search is temporarily unavailable. Try an exact administrative region name.",
      searchResultsReady:
        "Found {count} matching results. Pick one to focus the map, then save it.",
      resultSelected:
        "Focused {region} in {country}. Choose a visit type and save it.",
      savedVisit: "{region} is now marked as {type}.",
      savedAirportVisit:
        "Matched airport code {query} to {region}, and marked it as {type}.",
      savedPlaceVisit:
        "Matched {query} to {region}, and marked it as {type}.",
      saveFailed: "Failed to save the mark. Try again.",
      selectRegionFirst:
        "Select a region from the map or search results first.",
      noMarkToClear: "The selected region does not have a mark yet.",
      clearedVisit: "Cleared the mark for {region}.",
      updatedVisit: "Updated {region} to {type}.",
      deletedVisit: "Deleted the mark for {region}.",
    },
    aria: {
      continentMap: "Continent map",
      countryMap: "Administrative map",
      countryMapZoom: "Administrative map zoom controls",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
    },
  },
  zh: {
    pageTitle: "足迹行政区地图",
    eyebrow: "Visited Atlas",
    languageSwitchAria: "语言切换",
    heroTitle: "按大洲整理你的足迹，再细到每个国家的一级行政区。",
    heroText:
      "先选大洲，再选国家。地图会加载该国的州、省、郡或同级一级行政区；你可以通过搜索或点击地图，把地区标记为常住、途径或旅行。",
    metrics: {
      total: "总标记数",
    },
    sections: {
      continents: "大洲",
      markPlaces: "标记地区",
      currentSelection: "当前选择",
      saved: "已保存",
      continentView: "大洲视图",
      adminLevel1: "一级行政区",
    },
    continentSectionTitle: "先切换大洲，再进入国家一级行政区。",
    markPlacesTitle: "搜索并上色",
    savedTitle: "当前国家已标记地区",
    archive: {
      title: "足迹归档",
      openPage: "打开足迹页面",
      totalMarks: "已存地区",
      totalCountries: "已访问国家",
      currentCountry: "当前国家内",
      pageTitle: "足迹归档",
      pageText: "查看所有已保存地区，并一键跳回地图中的具体位置。",
      backToMap: "返回地图",
      empty: "还没有保存任何地区。",
      updatedAt: "更新于 {date}",
      openMap: "打开地图定位",
      searchPlaceholder: "按国家或地区筛选",
      searchLabel: "筛选",
      count: "共 {count} 个已保存地区",
    },
    nav: {
      home: "主页",
      atlas: "地图",
      flights: "航班",
      stays: "酒店",
    },
    portal: {
      pageTitle: "旅行总览",
      heroTitle: "把地图、航班和之后的酒店记录，放到同一个主页里。",
      heroText:
        "你可以先从世界地图标地区，再进入航班日志记录每一段飞行；酒店模块的位置也先预留好了。",
      modulesTitle: "模块入口",
      modulesText: "从这里直接进入你下一步要更新的旅行记录。",
      metrics: {
        mapMarks: "地图标记",
        visitedCountries: "已访问国家",
        flights: "已录航班",
        flightDistance: "已飞里程",
        upcomingFlights: "待飞航班",
      },
      cards: {
        atlasTitle: "世界地图",
        atlasText:
          "按国家和一级行政区记录足迹，支持搜索、颜色标记和已保存历史。",
        atlasAction: "打开地图",
        atlasMeta: "{regions} 个地区，覆盖 {countries} 个国家",
        flightsTitle: "航班日志",
        flightsText:
          "记录每一段航班，选择精确机场，并统计里程、飞行时长、热门航线和常飞航司。",
        flightsAction: "打开航班",
        flightsMeta: "已录 {count} 段，已飞 {distance}",
        staysTitle: "酒店",
        staysText:
          "后续会在这里放酒店和住宿记录，包括城市、酒店品牌、入住晚数等。",
        staysAction: "查看占位页",
        staysMeta: "即将实现",
      },
    },
    flights: {
      pageTitle: "航班日志",
      heroTitle: "把你的航班记录成一张可统计的个人飞行面板。",
      heroText:
        "录入每一段航班的出发机场、到达机场、时间和时长，然后按里程、飞行时长、热门航司、航线和年份汇总。",
      formTitle: "新增航班",
      formText:
        "输入 3 位或 4 位机场代码，再从候选里点选准确机场，然后保存这一段航班。",
      statsTitle: "航班统计",
      statsText: "已飞统计只计算完成航班；待飞航班会单独保留。",
      historyTitle: "航班记录",
      historyText: "下面会保留每一段已保存航班；需要的话可以直接从列表删除。",
      filterLabel: "显示",
      filterAll: "全部航班",
      filterCompleted: "已完成",
      filterUpcoming: "待飞",
      filterCanceled: "已取消",
      emptyHistory: "还没有保存任何航班。",
      emptySuggestions: "输入机场代码后，这里会显示候选机场。",
      emptyRankings: "还没有形成统计。",
      emptyYears: "还没有年度汇总。",
      metrics: {
        totalFlights: "已录航班",
        completedFlights: "已完成",
        upcomingFlights: "待飞",
        distanceFlown: "已飞里程",
        airTime: "已飞时长",
        uniqueAirports: "使用机场数",
      },
      fields: {
        airline: "航司",
        flightNumber: "航班号",
        departureCode: "出发机场代码",
        arrivalCode: "到达机场代码",
        departureAt: "起飞日期时间",
        duration: "飞行时长",
        durationHours: "小时",
        durationMinutes: "分钟",
        status: "航班状态",
        cabinClass: "舱位",
        aircraft: "机型",
        seat: "座位",
        notes: "备注",
      },
      placeholders: {
        airline: "中国东方航空",
        flightNumber: "MU 587",
        departureCode: "PVG",
        arrivalCode: "LAX",
        aircraft: "Boeing 777-300ER",
        seat: "32A",
        notes: "比如红眼航班、升舱、延误、同行人等备注。",
      },
      selectedAirport: "已选：{airport}",
      airportMeta: "{name} · {meta}",
      statusLabels: {
        completed: "已完成",
        upcoming: "待飞",
        canceled: "已取消",
      },
      cabinLabels: {
        economy: "经济舱",
        premium: "超级经济舱",
        business: "商务舱",
        first: "头等舱",
      },
      labels: {
        favoriteAirline: "最常乘坐航司",
        busiestRoute: "最常走航线",
        longestFlight: "最长已完成航段",
        annualSummary: "年度汇总",
        topAirlines: "常飞航司",
        topRoutes: "常飞航线",
        recentFlights: "最近航班",
        noLeader: "还没有足够数据",
        flightsCount: "{count} 段航班",
        durationsAndDistance: "{duration} · {distance}",
      },
      status: {
        ready: "航班页已准备好。",
        loadingAirports: "正在查找 {query} 对应的机场…",
        airportResults: "找到了 {count} 个 {query} 的机场候选，请点选一个准确机场。",
        airportNotFound: "没有找到 {query} 对应的机场。",
        selectDepartureAirport: "请先点选一个准确的出发机场。",
        selectArrivalAirport: "请先点选一个准确的到达机场。",
        sameAirport: "出发机场和到达机场不能相同。",
        durationRequired: "请输入有效的飞行时长。",
        saved: "已保存 {route}。",
        deleted: "已删除 {route}。",
      },
    },
    stays: {
      pageTitle: "酒店模块",
      heroTitle: "酒店记录模块先预留在这里，下一步再实现。",
      heroText:
        "地图和航班已经可以使用；这页先作为酒店、住宿晚数和城市停留记录的预留入口。",
      panelTitle: "计划中的酒店功能",
      panelText:
        "下一阶段可以在这里接酒店、入住退房日期、城市、品牌、夜数以及住宿统计。",
    },
    fields: {
      country: "国家",
      countryPlaceholder: "请选择国家",
      regionSearch: "地区搜索",
      visitType: "足迹类型",
    },
    regionPlaceholder: "输入州、省、城市、机场代码或地名",
    buttons: {
      addOrUpdate: "添加 / 更新颜色",
      clearCurrent: "清除当前标记",
      clear: "清除",
      delete: "删除",
      addFlight: "保存航班",
      resetFlightForm: "重置表单",
    },
    labels: {
      unmarked: "未标记",
    },
    selection: {
      emptyTitle: "还没有选中地区",
      emptyMeta: "可以点击地图，或在搜索框里输入地区名称。",
      meta: "{country} · 当前状态：{status}",
    },
    search: {
      flexHint: "可以直接全局搜索州、省、城市、机场代码或地名，再从下面候选里选择。",
      noMatches: "还没有匹配结果。继续输入，或按回车搜索所有国家。",
      placeNoMatches:
        "还是没有归到行政区。可以换个拼写、附近城市，或直接输入州 / 省名称。",
      pickResult: "请先从下面候选里点一个结果，地图会自动定位到对应国家和一级行政区。",
      loading: "正在跨国家搜索…",
      badges: {
        region: "行政区",
        place: "地点",
        airport: "机场",
      },
    },
    saved: {
      emptySelectCountry: "先选择一个国家。",
      emptyNoRegions:
        "这个国家还没有标记地区。选中地图区域后，可以一键上色。",
    },
    visitTypes: {
      resident: {
        label: "常住",
        description: "长期生活、工作或稳定停留。",
      },
      travel: {
        label: "旅行",
        description: "旅行、出差、游学、短期访问。",
      },
      transit: {
        label: "途径",
        description: "路过、转机、换乘、短暂停留。",
      },
    },
    continents: {
      asia: "亚洲",
      europe: "欧洲",
      africa: "非洲",
      "north-america": "北美洲",
      "south-america": "南美洲",
      oceania: "大洋洲",
      antarctica: "南极洲",
    },
    map: {
      continentTitleSuffix: "地图",
      countryTitleSuffix: "一级行政区",
      continentMeta:
        "本大洲已访问 {visitedCount}/{count} 个国家 / 地区。点击地图或下拉框切换国家。",
      continentMarkedRegions: "已标记地区：{count}",
      continentNoMarks: "还没有标记。",
      continentBreakdown:
        "{residentLabel} {resident} / {travelLabel} {travel} / {transitLabel} {transit}",
      countryMetaFallback:
        "已访问 {visitedCount}/{count} 个当前显示区域。该国家未能加载 ADM1，当前退回到国家边界视图。",
      countryMetaLoaded:
        "已访问 {visitedCount}/{count} 个一级行政区。点击区域可直接标记。",
      countryTitleEmpty: "一级行政区地图",
      adminStatus: "状态：{status}",
      emptyContinent: "这个大洲当前没有可展示的国家边界。",
      emptyCountryPrompt: "先选择一个国家，再查看一级行政区地图。",
      emptyCountryLoading: "一级行政区边界还在加载中。",
      emptyCountryNoAdm1: "当前国家没有可展示的一级行政区边界。",
      emptyCountryUnavailable: "当前无法加载一级行政区边界。",
      emptyContinentLoad: "加载全球地图失败。请刷新页面后重试。",
      emptyContinentNoCountryData: "这个大洲当前没有可加载的国家数据。",
    },
    status: {
      loadingGlobalData: "正在加载全球国家元数据和地图底图…",
      ready: "地图已准备好，可以开始标记。",
      initError: "初始化失败：请确认浏览器能访问外部数据源。",
      loadingCountry: "正在加载 {country} 的一级行政区边界…",
      loadedCountry: "已加载 {country} 的一级行政区边界。",
      countryLoadError: "一级行政区边界加载失败。",
      selectCountryFirst: "请先选择国家。",
      enterRegion: "请输入地区名称。",
      searchingAirportCode: "正在跨国家查找机场代码 {code} 对应的一级行政区…",
      searchingPlaces: "正在跨国家继续搜索城市或地名…",
      regionNotFound: "没有找到这个地区，请从候选结果里点选。",
      multipleMatches: "匹配到多个地区，请先点选具体地区。",
      airportCodeNotFound: "没有把机场代码 {code} 准确归到 {country} 的一级行政区。",
      airportCodeMultipleMatches: "这个机场代码可能对应多个一级行政区，请先点选具体地区。",
      placeNotFound: "没有把这个城市或地名准确归到 {country} 的一级行政区。",
      placeMultipleMatches: "这个地名可能对应多个一级行政区，请先点选具体地区。",
      placeLookupError: "城市 / 地名搜索暂时不可用，请改用更精确的一级行政区名称。",
      searchResultsReady: "找到了 {count} 个候选结果。请先点选一个，再保存标记。",
      resultSelected: "已定位到 {country} 的 {region}。接下来选择足迹类型并保存即可。",
      savedVisit: "{region} 已标记为 {type}。",
      savedAirportVisit: "已将机场代码 {query} 归到 {region}，并标记为 {type}。",
      savedPlaceVisit: "已将 {query} 归到 {region}，并标记为 {type}。",
      saveFailed: "保存标记失败，请稍后重试。",
      selectRegionFirst: "请先点击地图或从搜索结果里选择地区。",
      noMarkToClear: "当前地区还没有颜色标记。",
      clearedVisit: "{region} 的标记已清除。",
      updatedVisit: "{region} 已更新为 {type}。",
      deletedVisit: "{region} 的标记已删除。",
    },
    aria: {
      continentMap: "大洲地图",
      countryMap: "一级行政区地图",
      countryMapZoom: "一级行政区地图缩放按钮",
      zoomIn: "放大地图",
      zoomOut: "缩小地图",
    },
  },
};

export function t(language, key, params = {}) {
  const bundle = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const value = key.split(".").reduce((current, part) => current?.[part], bundle);
  return typeof value === "string" ? formatMessage(value, params) : key;
}

export function getVisitTypeLabel(language, type) {
  return t(language, `visitTypes.${type}.label`);
}

export function getContinentLabel(language, continentId) {
  return t(language, `continents.${continentId}`);
}

export function formatContinentTitle(language, continentId) {
  const label = getContinentLabel(language, continentId);
  const suffix = t(language, "map.continentTitleSuffix");
  return language === "zh" ? `${label}${suffix}` : `${label} ${suffix}`;
}

export function formatCountryTitle(language, countryName) {
  const suffix = t(language, "map.countryTitleSuffix");
  return language === "zh" ? `${countryName}${suffix}` : `${countryName} ${suffix}`;
}

export function applyStaticTranslations({ dom, language }) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t(language, "pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(language, node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(language, node.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(language, node.dataset.i18nAriaLabel));
  });

  [...dom.visitTypeSelect.options].forEach((option) => {
    option.textContent = getVisitTypeLabel(language, option.value);
  });

  dom.continentMap.setAttribute("aria-label", t(language, "aria.continentMap"));
  dom.countryMap.setAttribute("aria-label", t(language, "aria.countryMap"));

  dom.langButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
  });
}

function formatMessage(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, token) => `${params[token] ?? ""}`);
}
