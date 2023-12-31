const map = L.map('map').setView([54.5, -3], 7);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


let baseRequest = fetch('https://raw.githubusercontent.com/doismellburning/etcc-csv-scrape/main/packetlist.json')
	.then(response => response.json());

let augmentRequest = fetch('augments.yaml')
	.then(response => response.text());

Promise.all([baseRequest, augmentRequest])
	.then(responses => {
		let points = responses[0];
		let augments = responses[1];
		augments = jsyaml.load(augments);
		augments = augments["augments"];

		let bands = new Set();

		// For each point, if there's a corresponding callsign entry in augments, merge the properties
		// Also populate the bands set!
		points["features"].forEach((element, index, arr) => {
			let callsign = element["properties"]["callsign"];
			if (augments[callsign]) {
				arr[index]["properties"] = Object.assign({}, element["properties"], augments[callsign]["properties"]);
			}
			bands.add(arr[index]["properties"]["band"]);
		});

		bands = Array.from(bands).sort(function (a, b) {
			let regex = /^(\d+)(\w+)$/;
			let aMatch = a.match(regex);
			let bMatch = b.match(regex);

			// If we can't parse one, that's something like "OTHER", put it at the end
			if (!aMatch) {
				return 1;
			}
			if (!bMatch) {
				return -1;
			}

			aNum = parseInt(aMatch[1]);
			aUnit = aMatch[2];
			bNum = parseInt(bMatch[1]);
			bUnit = bMatch[2];

			//console.log(`${aNum} / ${aUnit} / ${bNum} / ${bUnit}`);

			if (aUnit < bUnit) {
				return -1;
			}
			if (aUnit > bUnit) {
				return 1;
			}

			if (aNum < bNum) {
				return -1;
			}
			if (aNum > bNum) {
				return 1;
			}

			return 0;
		});

		let markerLayer = L.geoJSON(points, {
			useSimpleStyle: true,
			useMakiMarkers: true,
			onEachFeature: function (f, l) {
				l.bindPopup('<pre>' + JSON.stringify(f.properties, null, ' ').replace(/[\{\}"]/g, '') + '</pre>');
			}
		})
		markerLayer.addTo(map);

		let filterControl = L.control({
			position: "bottomright",
		});

		filterControl.onAdd = function(map) {
			let div = L.DomUtil.create("div", "filter");
			let html = "<h3>Filter</h3>";
			bands.forEach(function (band) {
				html += `<label><input type="checkbox" name="${band}" value="${band}" checked>${band}</label><br>`;
			});
			div.innerHTML = html;
			return div;
		}

		filterControl.addTo(map);

		function filterMarkers() {
			let checkboxes = document.querySelectorAll("input[type='checkbox']");
			checkboxes.forEach(function (checkbox) {
				let markerBand = checkbox.value;
				let isChecked = checkbox.checked;

				let markers = markerLayer.getLayers().filter(function (layer) {
					return layer.feature.properties.band === markerBand;
				});

				markers.forEach(function (marker) {
					isChecked ? map.addLayer(marker) : map.removeLayer(marker);
				});
			});
		}

		document.querySelectorAll("input[type='checkbox']").forEach(function (checkbox) {
			checkbox.addEventListener("change", filterMarkers);
		});

		filterMarkers();
	})

