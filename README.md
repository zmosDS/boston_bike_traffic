# Boston BlueBike Traffic

An interactive web visualization of Boston’s BlueBike system, showing real-time patterns of bike station traffic across the city. The map updates dynamically as you filter by time, revealing how arrivals and departures shift throughout the day.

**Live demo:** https://yourusername.github.io/boston_bike_traffic

---

## Goal
Visualize daily bike traffic patterns across Boston and Cambridge using public trip and station data, combining Mapbox rendering with D3-driven overlays.

---

## Built With
- HTML, CSS, JavaScript  
- D3.js  
- Mapbox GL JS  
- Bluebikes + City of Boston Open Data  

---

## Features
- Time slider to filter trips by minute of day  
- Circle sizing based on total traffic per station  
- Color encoding for arrivals, departures, and balanced flow  
- SVG overlay synced with Mapbox interactions  
- Boston and Cambridge bike lane layers  

---

## File Structure
```
boston_bike_traffic/
├── assets/
│   ├── index.html        # Main page layout, Mapbox container, time slider UI
│   ├── map.js            # Mapbox layers, D3 station markers, traffic filtering
│   ├── map.css           # Styling for markers, legend, and interactive elements
│   ├── global.css        # Base typography and layout rules
│   └── favicon.svg       # Site icon
└── README.md             # Project overview and documentation

```

---

## Data Sources
- Boston Open Data: Existing Bike Network  
- Cambridge Open Data: Bike Lanes  
- Bluebikes System Data (stations and March 2024 traffic)  

