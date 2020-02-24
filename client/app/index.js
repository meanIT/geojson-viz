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
    searchResults: null
  }),
  mounted: function() {
    this._editor = CodeMirror.fromTextArea(document.querySelector('#geojson-input'), {
      lineNumbers: true,
      gutters: ['error']
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
      this._layer = L.geoJSON(data).addTo(map);

      const center = centroid(data);

      const [lng, lat] = center.geometry.coordinates;
      map.panTo(new L.LatLng(lat, lng));
    },
    search: async function() {
      const results = await geocode(this.searchText);
      this.searchResults = results.features;
    },
    addToMap: function(result) {
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

      console.log('Add to map', result, json);

      if (json == null) {
        json = JSON.parse(defaultContent);
        json.features.push(result);

        this.content = JSON.stringify(json, null, '  ');

        this._editor.setValue(this.content);
        this.draw();
      } else if (json.type === 'FeatureCollection') {
        json.features.push(result);

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
          placeholder="Search for Address or Place"
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
      <textarea id="geojson-input" v-model="content" v-on:keyup="draw()"></textarea>
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
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(str) + '.json?' +
    `access_token=${encodeURIComponent(accessToken)}&autocomplete=true`;
  
  const res = await axios.get(url);

  return res.data;
}