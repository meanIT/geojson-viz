'use strict';

const centroid = require('@turf/centroid').default;
const geojsonhint = require('@mapbox/geojsonhint').hint;

const map = L.map('map').setView([0, 0], 4);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  maxZoom: 18,
  id: 'mapbox/streets-v11',
  accessToken: 'pk.eyJ1IjoidmthcnBvdjEiLCJhIjoiY2s2Y29zOGVsMDV5ODNtcGN5NTNhb2FhbSJ9.XqXvO2OGxFjkaLo3u6lO5g'
}).addTo(map);

const app = new Vue({
  data: () => ({ content: '' }),
  mounted: function() {
    this._editor = CodeMirror.fromTextArea(document.querySelector('#geojson-input'), {
      lineNumbers: true
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

      const errors = geojsonhint(this.content);
      if (errors != null && errors.length > 0) {
        console.log(errors);
        return;
      }

      if (this._layer != null) {
        this._layer.remove();
      }
      this._layer = L.geoJSON(data).addTo(map);

      const center = centroid(data);

      const [lng, lat] = center.geometry.coordinates;
      map.panTo(new L.LatLng(lat, lng));
    }
  },
  template: `
    <div id="app">
      <textarea id="geojson-input" v-model="content" v-on:keyup="draw()"></textarea>
    </div>
  `
});

app.$mount('#app');