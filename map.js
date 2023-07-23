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

		// For each point, if there's a corresponding callsign entry in augments, merge the properties
		points["features"].forEach((element, index, arr) => {
			let callsign = element["properties"]["callsign"];
			if (augments[callsign]) {
				arr[index]["properties"] = Object.assign({}, element["properties"], augments[callsign]["properties"]);
			}
		});

		L.geoJSON(points, {
			useSimpleStyle: true,
			useMakiMarkers: true,
			onEachFeature: function (f, l) {
				l.bindPopup('<pre>' + JSON.stringify(f.properties, null, ' ').replace(/[\{\}"]/g, '') + '</pre>');
			}
		}).addTo(map);
	})
