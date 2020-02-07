'use strict';

console.log('TT', require('@turf/centroid'))
const centroid = require('@turf/centroid').default;

const map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  maxZoom: 18,
  id: 'mapbox/streets-v11',
  accessToken: 'pk.eyJ1IjoidmthcnBvdjEiLCJhIjoiY2s2Y29zOGVsMDV5ODNtcGN5NTNhb2FhbSJ9.XqXvO2OGxFjkaLo3u6lO5g'
}).addTo(map);

const app = new Vue({
  data: () => ({ content: '' }),
  methods: {
    draw: async function() {
      const data = JSON.parse(this.content);

      L.geoJSON(data).addTo(map);

      const center = centroid(data);

      const [lng, lat] = center.geometry.coordinates;
      map.panTo(new L.LatLng(lat, lng));
    }
  },
  template: `
    <div>
      <textarea v-model="content"></textarea>
      <button v-on:click="draw">Draw</button>
    </div>
  `
});

app.$mount('#content');