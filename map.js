// ---------------------------
// Imports
// ---------------------------
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

mapboxgl.accessToken =
  "pk.eyJ1Ijoiem1vcyIsImEiOiJjbWh5amMzbTYwZDh4MmtvbHd0cmNiczhkIn0.tTsUFtEJKsoPBQCaoMuBYg";


// ---------------------------
// Global helpers
// ---------------------------

// Convert minutes to formatted 12-hour time
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString("en-US", { timeStyle: "short" });
}

// Minutes since midnight
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Compute traffic for each station
function computeStationTraffic(stations, trips) {
  // Count departures
  const departures = d3.rollup(
    trips,
    v => v.length,
    d => d.start_station_id
  );

  // Count arrivals
  const arrivals = d3.rollup(
    trips,
    v => v.length,
    d => d.end_station_id
  );

  // Attach numbers to each station
  return stations.map(station => {
    const id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// Step 6: quantize scale for departure ratio
let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);


// ---------------------------
// Map setup
// ---------------------------
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/outdoors-v12",
  center: [-71.06447, 42.36034],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});


// ---------------------------
// MAIN LOGIC
// ---------------------------
map.on("load", async () => {

  // -------------------------
  // Add bike lane layers
  // -------------------------
  map.addSource("boston_route", {
    type: "geojson",
    data: "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson"
  });

  map.addLayer({
    id: "boston-lanes",
    type: "line",
    source: "boston_route",
    filter: ["==", "$type", "LineString"],
    paint: lanes,
  });

  map.addSource("cambridge_route", {
    type: "geojson",
    data: "https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson"
  });

  map.addLayer({
    id: "cambridge-lanes",
    type: "line",
    source: "cambridge_route",
    filter: ["==", "$type", "LineString"],   // <-- THIS REMOVES THE BLACK DOTS
    paint: lanes,
  });

  
  // -------------------------
  // Load station JSON
  // -------------------------
  const stationURL = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
  const jsonData = await d3.json(stationURL);
  let stations = jsonData.data.stations;


  // -------------------------
  // Load trips with date parsing
  // -------------------------
  const tripsURL = "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";

  let trips = await d3.csv(tripsURL, trip => {
    trip.started_at = new Date(trip.started_at);
    trip.ended_at = new Date(trip.ended_at);
    return trip;
  });

  // Compute full-month traffic
  stations = computeStationTraffic(stations, trips);


  // -------------------------
  // Radius scale
  // -------------------------
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, d => d.totalTraffic)])
    .range([0, 25]);


  // -------------------------
  // Add SVG overlay
  // -------------------------
  const svg = d3.select("#map").append("svg");

  const circles = svg
    .selectAll("circle")
    .data(stations, d => d.short_name)
    .enter()
    .append("circle")
    .attr("r", d => radiusScale(d.totalTraffic))
     .style("--departure-ratio", d => {
    const ratio = d.totalTraffic === 0 ? 0.5 : d.departures / d.totalTraffic;
    return stationFlow(ratio);
  });

  // Tooltips
  circles
    .append("title")
    .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);


  // -------------------------
  // Circle positioning
  // -------------------------
  function getCoords(station) {
    const pt = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(pt);
    return { cx: x, cy: y };
  }

  function updatePositions() {
    circles
      .attr("cx", d => getCoords(d).cx)
      .attr("cy", d => getCoords(d).cy);
  }

  updatePositions();

  map.on("move", updatePositions);
  map.on("zoom", updatePositions);
  map.on("resize", updatePositions);
  map.on("moveend", updatePositions);


  // -------------------------
  // Step 5: Time slider
  // -------------------------
  let timeFilter = -1;

  const timeSlider = document.getElementById("time-slider");
  const timeDisplay = document.getElementById("time-display");
  const anyTimeLabel = document.getElementById("any-time");


  // Filter trips by time (±60 minutes)
  function filterTripsByTime(trips, timeFilter) {
    if (timeFilter === -1) return trips;

    return trips.filter(trip => {
      const s = minutesSinceMidnight(trip.started_at);
      const e = minutesSinceMidnight(trip.ended_at);

      return (
        Math.abs(s - timeFilter) <= 60 ||
        Math.abs(e - timeFilter) <= 60
      );
    });
  }


  function updateScatterPlot(timeFilter) {
    const filteredTrips = filterTripsByTime(trips, timeFilter);
    const filteredStations = computeStationTraffic(stations, filteredTrips);

    // Adjust radius scale for filtered vs unfiltered
    if (timeFilter === -1) {
      radiusScale.range([0, 25]);
    } else {
      radiusScale.range([3, 50]);
    }

    circles
      .data(filteredStations, d => d.short_name)
      .attr("display", d => d.totalTraffic === 0 ? "none" : "block")
      .attr("r", d => radiusScale(d.totalTraffic))
      .style("--departure-ratio", d => {
        const ratio = d.totalTraffic === 0 ? 0.5 : d.departures / d.totalTraffic;
        return stationFlow(ratio);
      });
}

  // Update time display text
  function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      timeDisplay.textContent = "";
      anyTimeLabel.style.display = "block";
    } else {
      timeDisplay.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = "none";
    }

    // optional: slider highlight percentage
    document.getElementById("time-slider")
      .style.setProperty("--percent", (timeFilter / 1440) * 100 + "%");

    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener("input", updateTimeDisplay);
  updateTimeDisplay(); // initialize
});


// ---------------------------
// Lane color style
// ---------------------------
const lanes = {
  "line-color": "#4169E1",
  "line-width": 2,
  "line-opacity": 0.85
};
