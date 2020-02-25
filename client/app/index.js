'use strict';

const axios = require('axios');
const centroid = require('@turf/centroid').default;
const geojsonhint = require('@mapbox/geojsonhint').hint;

const map = L.map('map').setView([0, 0], 4);

const accessToken = 'pk.eyJ1IjoidmthcnBvdjEiLCJhIjoiY2s2Y29zOGVsMDV5ODNtcGN5NTNhb2FhbSJ9.XqXvO2OGxFjkaLo3u6lO5g';

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  maxZoom: 18,
  id: 'mapbox/streets-v11',
  accessToken: accessToken
}).addTo(map);

const defaultContent = `
{
  "type": "FeatureCollection",
  "features": []
}
`.trim();

const app = new Vue({
  data: () => ({
    content: defaultContent,
    searchText: '',
    searching: false,
    searchResults: null,
    currentPoint: null
  }),
  mounted: function() {
    this._editor = CodeMirror(document.querySelector('#app'), {
      mode: 'application/json',
      lineNumbers: true,
      gutters: ['error'],
      tabSize: 2,
      theme: 'idea',
      value: defaultContent
    });

    this._editor.on('changes', (instance) => {
      this.content = instance.getValue();
      this.draw();
    });
  },
  methods: {
    draw: async function() {
      let data = null;
      
      try {
        data = JSON.parse(this.content);
      } catch (err) {
        return;
      }
      if (data == null) {
        return;
      }

      this._editor.clearGutter('error');
      const errors = geojsonhint(this.content);
      if (errors != null && errors.length > 0) {
        for (const error of errors) {
          this._editor.setGutterMarker(error.line, 'error', makeMarker(error.message));
        }
        return;
      }

      if (this._layer != null) {
        this._layer.remove();
      }
      this._layer = L.geoJSON(data, {
        onEachFeature: (feature, layer) => {
          console.log('II', feature)
          if (feature.type === 'Feature' && feature.geometry.type === 'Point') {
            layer.on('click', () => {
              this.currentPoint = feature;
            });
          }
        }
      }).addTo(map);

      const center = centroid(data);

      const [lng, lat] = center.geometry.coordinates;
      map.panTo(new L.LatLng(lat, lng));
    },
    search: async function() {
      const results = await geocode(this.searchText);
      this.searchResults = results.features;
    },
    addToMap: async function(result) {
      let json = null;

      result = {
        type: result.type,
        geometry: result.geometry,
        properties: {
          address: result.place_name
        }
      };

      try {
        json = JSON.parse(this.content);
      } catch (err) {}

      let extra = null;
      if (this.currentPoint != null) {
        extra = {
          type: 'Feature',
          properties: {},
          geometry: await directions(this.currentPoint.geometry, result.geometry)
        };
        this.currentPoint = null;
      }
      console.log('Add to map', result, json);

      if (json == null) {
        json = JSON.parse(defaultContent);
        json.features.push(result);
        if (extra != null) {
          json.features.push(extra);
        }

        this.content = JSON.stringify(json, null, '  ');

        this._editor.setValue(this.content);
        this.draw();
      } else if (json.type === 'FeatureCollection') {
        json.features.push(result);
        if (extra != null) {
          json.features.push(extra);
        }

        this.content = JSON.stringify(json, null, '  ');

        this._editor.setValue(this.content);
        this.draw();
      }

      this.searchResults = null;
      this.searchText = '';
    }
  },
  template: `
    <div id="app">
      <div>
        <input
          type="text"
          v-bind:placeholder="currentPoint ? 'Search for Directions from ' + currentPoint.properties.address : 'Search for Address or Place'"
          class="autocomplete"
          v-model="searchText"
          v-on:change="search()">
        <div
          class="autocomplete-results"
          :class="{ hide: searchResults == null || searchText.length === 0 }">
          <div
            v-for="result in searchResults"
            class="autocomplete-result"
            v-on:click="addToMap(result)">
            {{result.place_name}}
          </div>
        </div>
      </div>
    </div>
  `
});

app.$mount('#app');

function makeMarker(msg) {
  var marker = document.createElement('div');
  marker.classList.add('error-marker');
  marker.innerHTML = '&nbsp;';

  var error = document.createElement('div');
  error.innerHTML = msg;
  error.classList.add('error-message');
  marker.appendChild(error);

  return marker;
}

async function geocode(str) {
  let url = 'https://api.mapbox.com/geocoding/v5/' +
    'mapbox.places/' + encodeURIComponent(str) + '.json?' +
    'autocomplete=true&' +
    `access_token=${encodeURIComponent(accessToken)}`;
  
  const res = await axios.get(url);

  return res.data;
}

async function directions(fromPt, toPt) {
  const fromCoords = fromPt.coordinates.join(',');
  const toCoords = toPt.coordinates.join(',');
  let url = 'https://api.mapbox.com/directions/v5/' +
    'mapbox/driving/' + fromCoords + ';' + toCoords + '?' +
    'geometries=geojson&' +
    `access_token=${encodeURIComponent(accessToken)}`;

  const res = await axios.get(url).then(res => res.data);
  return res.routes[0].geometry;
}