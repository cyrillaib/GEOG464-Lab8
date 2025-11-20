// GEOG 464 – Lab 8
// Climate stations map + Environment Canada Climate Daily API

//////////////////////////////
// PART 0 – BASE MAP SETUP  //
//////////////////////////////

// Initialize the Leaflet map
const map = L.map("map").setView([48.5, -71], 5);

// OpenStreetMap base layer
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Q7 – Add another base tileset (no API key required)
const esriWorldImagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 18,
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  }
);

///////////////////////////////////////
// PART 1 – LOADING GEOJSON STATIONS //
///////////////////////////////////////

// Load GeoJSON of weather stations
const stationsURL =
  "https://raw.githubusercontent.com/brubcam/GEOG-464_Lab-8/refs/heads/main/DATA/climate-stations.geojson";

// Fetch GeoJSON and add to map
function loadStations(url) {
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load GeoJSON");
      return response.json();
    })
    .then((data) => {
      // Build the GeoJSON layer but DO NOT add directly to the map
      const stationLayer = L.geoJSON(data, {
        onEachFeature: onEachStation,
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, stationStyle(feature))
      });

      // Add marker cluster group
      const markers = L.markerClusterGroup();
      stationLayer.eachLayer((layer) => {
        markers.addLayer(layer);
      });
      markers.addTo(map);

      // Add layer control and scale bar (Part 4)
      const baseMaps = {
        OpenStreetMap: osm,
        "Esri World Imagery": esriWorldImagery
      };

      const overlayMaps = {
        "Climate Stations": markers
      };

      L.control.layers(baseMaps, overlayMaps).addTo(map);
      L.control.scale().addTo(map);
    })
    .catch((err) => console.error("Error loading GeoJSON:", err));

  // Q1 – Explanation of .then() and .catch()
  // .then() runs after the Promise from fetch() resolves successfully,
  //        letting us work with the returned data step by step.
  // .catch() runs if the Promise is rejected (for example a network/server
  //        error) so we can handle or log the error instead of the script
  //        failing silently.
}

// Popup and click handler for each station
function onEachStation(feature, layer) {
  const props = feature.properties;
  const stationName = props.STATION_NAME || props.name;
  const province = props.PROVINCE || props.province || props.PROVINCE_CODE;

  // Q2 – Include the station’s ID and elevation in the popup
  const popup = `
    <strong>${stationName}</strong><br>
    Province: ${province}<br>
    Climate ID: ${props.CLIMATE_IDENTIFIER}<br>
    Elevation: ${props.ELEVATION} m
  `;
  layer.bindPopup(popup);

  // Fetch API data on click
  layer.on("click", () => {
    document.getElementById("station-name").innerHTML =
      "<strong>" + stationName + "</strong>";
    document.getElementById("climate-data").innerHTML =
      "<p>Loading climate data...</p>";
    fetchClimateData(props.CLIMATE_IDENTIFIER);
  });
}

///////////////////////////////////////////////
// PART 2 – FETCHING ECCC CLIMATE DAILY API //
///////////////////////////////////////////////

// Function to fetch Environment Canada climate data
function fetchClimateData(climateID) {
  // Q4 – Use a year variable so the URL only returns data from that year
  let year = 2020;
  const apiURL = `https://api.weather.gc.ca/collections/climate-daily/items?limit=10&sortby=-LOCAL_DATE&CLIMATE_IDENTIFIER=${climateID}&LOCAL_YEAR=${year}`;

  fetch(apiURL)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((json) => {
      if (!json.features || json.features.length === 0) {
        document.getElementById("climate-data").innerHTML =
          "<p>No recent climate data available for this station.</p>";
        return;
      }

      const props = json.features[0].properties;

      // Q3 – Also print another value (e.g. total precipitation)
      // (These logs are commented out in the final version after Part 6,
      //  but they show the extra field used for Q3.)
      // console.log("Date:", props.LOCAL_DATE);
      // console.log("Mean Temp (°C):", props.MEAN_TEMPERATURE);
      // console.log("Total Precipitation (mm):", props.TOTAL_PRECIPITATION);

      // PART 6 / Q9 – Present data in the sidebar instead of the console
      const container = document.getElementById("climate-data");

      let html = "";
      html += `<p><strong>Date:</strong> ${props.LOCAL_DATE}</p>`;

      if (props.MAX_TEMPERATURE !== null) {
        html += `<p><strong>Max Temp:</strong> ${props.MAX_TEMPERATURE} °C</p>`;
      }
      if (props.MIN_TEMPERATURE !== null) {
        html += `<p><strong>Min Temp:</strong> ${props.MIN_TEMPERATURE} °C</p>`;
      }
      if (props.MEAN_TEMPERATURE !== null) {
        html += `<p><strong>Mean Temp:</strong> ${props.MEAN_TEMPERATURE} °C</p>`;
      }

      // Q9 – Only show precipitation values if they are NOT null
      let precipHTML = "";
      if (props.TOTAL_PRECIPITATION !== null) {
        precipHTML += `<p><strong>Total Precipitation:</strong> ${props.TOTAL_PRECIPITATION} mm</p>`;
      }
      if (props.TOTAL_RAIN !== null) {
        precipHTML += `<p><strong>Total Rain:</strong> ${props.TOTAL_RAIN} mm</p>`;
      }
      if (props.TOTAL_SNOW !== null) {
        precipHTML += `<p><strong>Total Snow:</strong> ${props.TOTAL_SNOW} mm</p>`;
      }

      container.innerHTML = html + precipHTML;
    })
    .catch((error) => {
      console.error("Error fetching climate data:", error);
      document.getElementById("climate-data").innerHTML =
        "<p>There was an error loading climate data for this station.</p>";
    });
}

/////////////////////////////////////
// PART 3 – STYLING MAP & LAYERS  //
/////////////////////////////////////

function stationStyle(feature) {
  const elev = feature.properties.ELEVATION;

  // Q5 – Three elevation classes: low, medium, high
  let fillColor;
  if (elev == null) {
    fillColor = "#d4d4d4"; // fallback if elevation is missing
  } else if (elev <= 100) {
    fillColor = "#91bfdb"; // low
  } else if (elev <= 300) {
    fillColor = "#ffffbf"; // medium
  } else {
    fillColor = "#fc8d59"; // high
  }

  return {
    radius: 6,
    fillColor: fillColor,
    color: "#ffffff",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  };
}

//////////////////////////////
// PART 5 – ELEVATION LEGEND //
//////////////////////////////

const legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "info legend");

  // Q8 – Match the three elevation classes used in stationStyle()
  const grades = [0, 100, 300];
  const colors = ["#91bfdb", "#ffffbf", "#fc8d59"];

  div.innerHTML += "<b>Elevation (m)</b><br>";

  for (let i = 0; i < grades.length; i++) {
    const from = grades[i];
    const to = grades[i + 1];

    div.innerHTML +=
      `<i style="background:${colors[i]}"></i> ` +
      from +
      (to ? "&ndash;" + to + "<br>" : "+");
  }

  return div;
};

legend.addTo(map);

// Kick everything off
loadStations(stationsURL);
