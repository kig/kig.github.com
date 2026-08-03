/*

Tasks

	- [x] Wanted utility features
		- [x] Multiple locations
			- [x] Location list editor
			- [x] My Location
			- [x] Swipe to navigate between locations
		- [x] Show current time at location
		- [x] AQI - air quality data for locations
		- [x] Mobile layout for time display
		- [x] Sunrise & sunset times

	- Cool beans
		- [] Slideshow mode to cycle through locations
		- [] Animate the forecast graph
			- [] Play button
			- [] Sampling function to sample continuous time from the forecast
			- [] Animate by setting the displayed weather to the sampled weather for the frame
			- [] Display a scrubber line on the forecast graph
		- [x] AQI by hour forecast visualization (replace dot with a color strip under the icon?)
		- [] AQI params in the forecast graph
		- [] Zoom-scroll-full window overlay forecast graph
		- [] Use SVG for forecast graph instead of canvas

	- Local features (i.e. no API, have to do custom integrations)
		- [] Hong Kong [pull from https://www.hko.gov.hk/en/index.html]
			- [] Weather signals (typhoons, fire hazard, cold/hot weather warning, rain signals)
			- [] Textual weather report
			- [] Rain radar (... how to make it pretty? Do it like the weather map artwork?)
		- [] London

	- In a world of AI where everything takes no time, this functionality would be fun to explore.
		- [] Location info
		- [] Event info
		- [] Transportation
		- [] Exercise info
		- [] Food

*/

var cities = {};
var cityNames = [];

var currentLocationName = '';

var currentCityIndex = -1;
var targetCityIndex = -1;

var previousMidnight = Date.parse(new Date().toDateString());
var initialSunrise = previousMidnight + 3600e3 * 6;
var initialSunset = previousMidnight + 3600e3 * 18;
var zeroCity = {
	cloudCover: 0, windDirection: 0, windStrength: 8, rainAmount: 0, sunrise: initialSunrise/1e3, sunset: initialSunset/1e3,
	temperature: 10, weatherData: { weather: [] }, forecast: { list: [], city: { timezone: 0 }}
};

var rainTable = {
	200: 0.2,
	201: 0.5,
	202: 1.0,
	230: 0.1,
	231: 0.2,
	232: 0.3,

	300: 0.1,
	301: 0.2,
	302: 0.3,
	310: 0.1,
	311: 0.2,
	312: 0.3,
	313: 0.5,
	314: 0.7,
	321: 0.2,

	500: 0.2,
	501: 0.4,
	502: 0.6,
	503: 0.8,
	504: 1.0,
	520: 0.2,
	521: 0.5,
	522: 1.0,
	531: 0.4
};

var parseRainAmount = function (weatherData) {
	var rainAmount = 0;
	for (var i = 0; i < weatherData.weather.length; i++) {
		var w = weatherData.weather[i];
		var r = rainTable[w.id];
		if (r) {
			rainAmount = Math.max(r, rainAmount);
		}
	}
	return rainAmount;
};



var updateWeatherCache = function (cityName, weatherData) {
	var c = cities[cityName];
	if (!c) {
		c = cities[cityName] = {};
	}
	weatherData = weatherData || {};
	c.name = weatherData.name;
	c.weatherData = weatherData;
	c.cloudCover = weatherData.clouds ? (weatherData.clouds.all || 0) / 100 : 0;
	c.windDirection = (weatherData.wind && weatherData.wind.deg) || 0;
	c.windStrength = (weatherData.wind && weatherData.wind.speed) || 0.1;
	c.rainAmount = parseRainAmount(weatherData);
	c.temperature = (weatherData.main && weatherData.main.temp) || 0;
	c.sunrise = (weatherData.sys && weatherData.sys.sunrise) || (86400 * 1 / 4);
	c.sunset = (weatherData.sys && weatherData.sys.sunset) || (86400 * 3 / 4);
	c.forecast = weatherData.forecast || zeroCity.forecast;
	c.hkWarnings = weatherData.hkWarnings || [];

	var locations = document.querySelectorAll('#city-list ul .name');
	c._cacheTime = Date.now();
	for (var i = 0; i < locations.length; i++) {
		var location = locations[i];
		if (location.textContent === cityName) {
			var li = location.parentNode;
			li.querySelector('.temp').textContent = Math.round(c.temperature) + '°C';
			var timeEl = li.querySelector('.time');
			timeEl.dataset.tz = weatherData.timezone;
			li.querySelector('.weather-icon').className = 'weather-icon wi wi-owm-' + weatherData.weather[0].id + ' aqi-' + weatherData.airQuality.main.aqi;
		}
	}

	// Cache weather data to localStorage for offline/instant display
	try {
		localStorage['weather-cache-' + cityName] = JSON.stringify({
			data: weatherData,
			timestamp: Date.now()
		});
	} catch(e) {}

	// Also save under "my-location" key when viewing current location
	if (document.body.classList.contains('current-location')) {
		try {
			localStorage['weather-cache-my-location'] = JSON.stringify({
				data: weatherData,
				timestamp: Date.now()
			});
		} catch(e) {}
	}
}

var updateWeather = function (cityName, weatherData) {
	targetCityIndex = addCityIfNeeded(cityName);
	weatherTimer = 0;

	updateWeatherCache(cityName, weatherData);

	document.getElementById('location').value = cityName;

	if (currentCityIndex === targetCityIndex) {
		weatherUpdateTriggered = true;
	}

	if (!document.body.classList.contains('loaded')) {
		document.body.classList.add('loaded');
	}
};

var fetchInterval = 0;
var firstFetch = true;
var instantWeatherDataRefresh = false;

var networkWeatherFetch = function(cityName, onSuccess, onFailure) {
	var server = '//api.openweathermap.org/data/2.5/';
	var units = '&units=metric';
	var appid = '&APPID=1271d12e99b5bdc1e4d563a61e467190';
	var lang = '&lang=' + (navigator.language || 'en').split('-')[0];
	var location = 
		cityName.latitude
		? '?lat=' + encodeURIComponent(cityName.latitude) + '&lon=' + encodeURIComponent(cityName.longitude)
		: '?q=' + encodeURIComponent(cityName);
	var cacheTime = '&' + Math.floor(Date.now() / 3.6e6); // Cache weather responses for 1 hour.
	// Fetch the current weather, forecast and air pollution forecast.
	return Promise.all([
		fetch(server+'weather'+location+units+appid+lang+cacheTime).then(res => res.json()),
		fetch(server+'forecast'+location+units+appid+lang+cacheTime).then(res => res.json())
	]).then(([weatherData, forecast]) => {
		if (parseInt(weatherData.cod) !== 200) {
			onFailure(weatherData);
			return;
		}
		weatherData.forecast = (parseInt(forecast.cod) === 200 ? forecast : zeroCity.forecast);
		var coordsLocation = '?lat=' + encodeURIComponent(weatherData.coord.lat) + '&lon=' + encodeURIComponent(weatherData.coord.lon);
		fetch(server+'air_pollution/forecast'+coordsLocation+units+appid+lang+cacheTime).then(res => res.json()).then(airQuality => {
			if (airQuality && !airQuality.cod) {
				weatherData.airQuality = airQuality.list[0] || {main: {aqi: -1}};
				airQuality.list.forEach((q,i) => {
					if (weatherData.forecast.list[i]) {
						weatherData.forecast.list[i].airQuality = q;
					}
				});
			}
			// Fill in possibly missing airQuality data.
			weatherData.forecast.list.forEach(l => {
				if (!l.airQuality) l.airQuality = {main: {aqi: -1}};
			});
			// If we're near Hong Kong, fetch HK-specific data.
			// Lat 22°08' N to 22°35' N and Long 113°49' E to 114°31' E
			// Add a degree of leeway.
			if (weatherData.coord.lat > 21 && weatherData.coord.lat < 23 && weatherData.coord.lon > 112 && weatherData.coord.lon < 115) {
				if (typeof initRainMap === 'function') initRainMap('rain-map-container', weatherData.coord.lat, weatherData.coord.lon);
				fetchHKWarnings().then(hkWarnings => {
					weatherData.hkWarnings = hkWarnings;
					onSuccess(weatherData);
				}).catch(() => {
					onSuccess(weatherData);
				});
			} else {
				onSuccess(weatherData);
			}
		});
	});

};

var fetchWeather = function (cityName, isRefresh) {
	// Update weather every hour
	clearInterval(fetchInterval);
	fetchInterval = setInterval(function () {
		fetchWeather(cityName, true).then(() => weatherUpdateTriggered = true);
	}, 60 * 60 * 1000);

	// Show spinner: always on initial fetch, also on refresh if the city has no cached data
	var hasCachedData = typeof cityName === 'string' &&
		cities[cityName] && cities[cityName].weatherData &&
		cities[cityName].weatherData.cod === 200;
	if (!hasCachedData) {
		document.getElementById('weather-data').classList.add('fade-out');
		document.getElementById('time-data').classList.add('fade-out');
	}

	return networkWeatherFetch(cityName, 
		function onSuccess(weatherData) {
			firstFetch = false;
			updateWeather(weatherData.name, weatherData);
			if (isRefresh) {
				instantWeatherDataRefresh = true;
				weatherUpdateTriggered = true;
			} else {
				window.localStorage.currentLocation = JSON.stringify(cityName);
				currentLocationName = weatherData.name;
			}
		}, 
		function onFailure(weatherData) {
			if (firstFetch) { // Failed initial fetchWeather, fall back to geoIP.
				firstFetch = false;
				fetchGeoIPWeather();
			} else {
				document.body.classList.add('error');
				document.getElementById('error').textContent = weatherData.message;
				document.getElementById('weather-data').classList.remove('fade-out');
				document.getElementById('time-data').classList.remove('fade-out');
			}
		}
	);
};

window.currentLocation = false;

document.getElementById('location').onchange = function (ev) {
	document.body.classList.remove('error');
	document.body.classList.remove('current-location');
	if (ev.target.value === '') {
	} else {
		var cityName = ev.target.value;
		fetchWeather(cityName);
		ev.target.blur();
		document.body.focus();
		dataLayer.push({event: 'location-field', action: 'change'});
	}
};

var eatLocationMouseup = false;
document.getElementById('location').onfocus = function (ev) {
	this.spellcheck = 'true';
	document.body.classList.remove('error');
	dataLayer.push({event: 'location-field', action: 'focus'});
	ev.target.setSelectionRange(0, ev.target.value.length);
	eatLocationMouseup = true;
};
document.getElementById('location').onmouseup = function (ev) {
	if (eatLocationMouseup) {
		eatLocationMouseup = false;
		ev.preventDefault();
		ev.target.setSelectionRange(0, ev.target.value.length);
	}
};
document.getElementById('location').onblur = function (ev) {
	this.spellcheck = 'false';
};

document.getElementById('my-location').onclick = function (ev) {
	ev.preventDefault();
	document.body.classList.remove('error');
	dataLayer.push({event: 'my-location', action: 'click'});
	fetchMyLocationWeather();
};

function addCityIfNeeded(name) {
	var idx = cityNames.indexOf(name);
	if (idx === -1) {
		idx = cityNames.length;
		cityNames.push(name);
	}
	return idx;
}

function fetchMyLocationWeather() {
	document.getElementById('my-location').blur();
	document.getElementById('weather-data').classList.add('locating');
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function (pos) {
				window.geolocationFetched = true;
				window.currentLocation = pos.coords;
				document.getElementById('weather-data').classList.remove('locating');
				document.body.classList.add('current-location');
				fetchWeather({latitude: pos.coords.latitude, longitude: pos.coords.longitude});
			},
			function (error) {
				// Couldn't get location from geolocation, let's go back to geoip.
				document.getElementById('weather-data').classList.remove('locating');
				document.body.classList.add('current-location');
				fetchGeoIPWeather();
			},
			{
				enableHighAccuracy: false,
				maximumAge: 86400000,
				timeout: 5000
			}
		);
	} else {
		// Couldn't get location from geolocation, let's go back to geoip.
		document.getElementById('weather-data').classList.remove('locating');
		document.body.classList.add('current-location');
		fetchGeoIPWeather();
	}
}

function fetchGeoIPWeather() {
	if (!window.geoIPFetched) return setTimeout(fetchGeoIPWeather, 10);
	var loc;
	if (window.geoIPData && !window.geolocationFetched) {
		window.currentLocation = window.geoIPData;
		loc = window.geoIPData;
	} else {
		loc = window.currentLocation;
	}
	fetchWeather(loc);
}

window.currentLocation = { "country_code": "HK", "country_name": "Hong Kong", "region_code": "", "region_name": "", "city": "Central District", "zip_code": "", "time_zone": "Asia/Hong_Kong", "latitude": 22.291, "longitude": 114.15, "metro_code": 0 };

function formatTimeString(t, lang) {
	var ts = t.toLocaleTimeString(lang, {hour:'numeric', minute:'numeric'});
	ts = ts.replace(/( [^\d]+)$/i, '<small>$1</small>');
	ts = ts.replace(/^([^\d]+)(\d)/i, '<small>$1</small>$2');
	ts = ts.replace(/(.)<small>([^<]{6})/i, '$1<small class="end">$2');
	ts = ts.replace(/^<small>([^<]{6}[^<]*<\/small>)/i, '<small class="start">$1');
	return ts;
}

var clock = document.getElementById('clock');
var date = document.getElementById('date');
var sunriseEl = document.getElementById('sunrise');
var sunsetEl = document.getElementById('sunset');
var updateClock = function() {
	var t = new Date();
	var now = Date.now();
	var localTzOff = t.getTimezoneOffset() * 60;
	if (cityNames[currentCityIndex]) {
		var wd = cities[cityNames[currentCityIndex]].weatherData;
		var tzOff = wd.timezone + localTzOff;
		t = new Date(now + tzOff * 1000);

		var sunrise = new Date(wd.sys.sunrise * 1000 + tzOff * 1000);
		var sunset = new Date(wd.sys.sunset * 1000 + tzOff * 1000);
		sunriseEl.querySelector('.time').textContent = sunrise.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});
		sunsetEl.querySelector('.time').textContent = sunset.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});
	}
	clock.innerHTML = formatTimeString(t, navigator.language);
	// Show weather data age if older than 30 minutes
	var ageEl = document.getElementById('weather-age');
	if (ageEl) {
		var city = cityNames[currentCityIndex] && cities[cityNames[currentCityIndex]];
		var cacheTime = city && city._cacheTime;
		var ageMin = cacheTime ? Math.round((now - cacheTime) / 60000) : 0;
		if (ageMin > 30) {
			var ah = Math.floor(ageMin / 60), am = ageMin % 60;
			ageEl.textContent = '· weather ' + (ah > 0 ? ah + 'h ' : '') + am + 'm ago';
			ageEl.style.display = '';
		} else {
			ageEl.style.display = 'none';
		}
	}
	date.textContent = t.toLocaleDateString(navigator.language, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })

	var timeEls = document.querySelectorAll('#city-list .time');
	for (var i = 0; i < timeEls.length; i++) {
		var timeEl = timeEls[i];
		if (timeEl.dataset.tz !== undefined) {
			var tzOff = parseInt(timeEl.dataset.tz) + localTzOff;
			var t2 = new Date(now + tzOff * 1000);
			timeEl.textContent = t2.toLocaleDateString(navigator.language, { weekday: 'short'}) + " " + t2.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});
		}
	}
};
setInterval(updateClock, 1000);
updateClock();
var timeData = document.getElementById('time-data')
timeData.ondblclick = function(ev) {
	ev.preventDefault();
	if (timeData.style.opacity === '0') {
		timeData.style.opacity = '0.8';
	} else {
		timeData.style.opacity = '0';
	}
};

var haveCurrentLocation = false;

if (false && (window.localStorage && window.localStorage.currentLocation)) {
	try {
		var currentLocation = JSON.parse(window.localStorage.currentLocation);
		if (typeof currentLocation === 'string') currentLocation = currentLocation.trim();
		else if (typeof currentLocation === 'object' && !(isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude))) {
			// Ok, we can use this object.
		} else {
			// Bad currentLocation in localStorage.
			currentLocation = false;
		}
		if (currentLoclation) {
			window.currentLocation = currentLocation;
			fetchWeather(currentLocation);
			haveCurrentLocation = true;
		}
	} catch (e) {
		console.error(e);
	}
}
if (!haveCurrentLocation) {
	fetchGeoIPWeather();
	if (navigator.geolocation && navigator.permissions) {
		navigator.permissions.query({
			name: 'geolocation'
		}).then(permission => {
			if (permission.state === "granted") {
				fetchMyLocationWeather();
			}
		});
	}	
}

/*
	Location list.
	
	An editable list of locations, saved in the user profile.
	When you swipe left/right, the weather changes to the next/previous location.

	LocationList.add(location)
	LocationList.remove(location)
	LocationList.move(location, newIndex)

	LocationList.indexOf(location)
	LocationList.save()
	LocationList.load()
*/
var LocationList = {
	locations: [],
	currentLocation: '',

	makeLocationElement: function(location) {
		var li = document.createElement('li');
		li.innerHTML = '<span class="time"></span><span class="weather-icon"></span><span class="temp"></span><span class="name"></span><span class="delete"></span>';
		li.querySelector('.name').textContent = location;
		return li;
	},

	add: function(location) {
		if (this.locations.indexOf(location) > -1) return;
		this.locations.push(location);
		document.querySelector('#city-list ul').append(this.makeLocationElement(location));
		networkWeatherFetch(location, function onSuccess(weatherData) {
			updateWeatherCache(location, weatherData);
		}, function onFailure() {});
		this.save();
	},

	remove: function(location) {
		var idx = this.locations.indexOf(location);
		if (idx === -1) return;
		this.locations.splice(idx, 1);
		document.querySelector('#city-list ul').children[idx].remove();
		this.save();
	},

	move: function(location, newIndex) {
		var idx = this.locations.indexOf(location);
		if (idx === -1) return;
		this.locations.splice(idx, 1);
		if (idx < newIndex) {
			newIndex--;
		}
		this.locations.splice(newIndex, 0, location);
		this.save();
	},

	save: function() {
		window.localStorage['weather-location-list'] = JSON.stringify(this.locations);
	},

	load: function() {
		if (window.localStorage['weather-location-list']) {
			try {
				var locations = JSON.parse(window.localStorage['weather-location-list']);
				if (locations && locations instanceof Array) {
					locations.forEach(location => this.add(location));
					this.currentLocation = document.getElementById('location').value;
				}
			} catch (error) {}
		}
	}
};

LocationList.load();

// Load cached weather data from localStorage for instant display
function loadCachedWeather() {
	var locations = LocationList.locations;
	// Check cache for each saved location
	for (var i = 0; i < locations.length; i++) {
		var cityName = locations[i];
		var cached = localStorage['weather-cache-' + cityName];
		if (!cached) continue;
		try {
			var entry = JSON.parse(cached);
			if (entry && entry.data && entry.data.cod === 200) {
				updateWeatherCache(cityName, entry.data);
				if (cities[cityName]) cities[cityName]._cacheTime = entry.timestamp;
			}
		} catch(e) {}
	}
	// If we have cached data for the current location, display it instantly
	if (locations.length) {
		var currentLoc = LocationList.currentLocation || locations[0];
		var cached = localStorage['weather-cache-' + currentLoc];
		if (cached) {
			try {
				var entry = JSON.parse(cached);
				if (entry && entry.data && entry.data.cod === 200) {
					updateWeather(currentLoc, entry.data);
				}
			} catch(e) {}
		}
	}
	// Also check "my location" cache (works even without saved locations)
	var myLoc = localStorage['weather-cache-my-location'];
	if (myLoc) {
		try {
			var entry = JSON.parse(myLoc);
			if (entry && entry.data && entry.data.cod === 200) {
				var name = entry.data.name;
				updateWeatherCache(name, entry.data);
				if (cities[name]) cities[name]._cacheTime = entry.timestamp;
				// If no saved locations, this becomes the current display
				if (!locations.length) updateWeather(name, entry.data);
			}
		} catch(e) {}
	}
}
loadCachedWeather();


const listButton = document.getElementById('toggle-city-list');
listButton.onclick = function(ev) {
	document.body.classList.toggle('in-city-list');
}

const cityList = document.getElementById('city-list');

function setLocation(location) {
	var locationInput = document.getElementById('location');
	locationInput.value = location;
	if (location.toLowerCase().trim() === 'my location') {
		document.getElementById('my-location').click();
	} else {
		fetchWeather(location, true);
	}
}

cityList.onclick = function(ev) {
	if (ev.target.classList.contains('delete')) {
		LocationList.remove(ev.target.previousElementSibling.textContent);
	}
	if (ev.target.classList.contains('name')) {
		setLocation(ev.target.textContent);
		listButton.onclick();
	}
};
var dragTarget = null;
var dragStartY = 0;
var dragInProgress = false;
cityList.onpointerdown = function(ev) {
	if (ev.target.classList.contains('name') && ev.target.parentNode.parentNode.tagName === 'UL') {
		ev.preventDefault();
		dragTarget = ev.target.parentNode;
		dragStartY = ev.clientY;
		dragInProgress = false;
	}
};
cityList.onpointermove = function(ev) {
	if (dragTarget) {
		ev.preventDefault();
		var dy = ev.clientY - dragStartY;
		if (Math.abs(dy) > 3 && !dragInProgress) {
			dragInProgress = true;
			dragTarget.classList.add('dragging');
		}
		if (!dragInProgress) return;
		dragTarget.style.transform = 'translateY('+dy+'px)';
		var cc = Array.from(dragTarget.parentNode.children);
		var dragTargetBBox = dragTarget.getBoundingClientRect();
		var dragTargetY = dragTargetBBox.top + dragTargetBBox.height/2;
		var overlapAbove = true;
		for (var i = 0; i < cc.length; i++) {
			if (cc[i] === dragTarget) {
				overlapAbove = false;
				continue;
			}
			var bbox = cc[i].getBoundingClientRect();
			if ((bbox.top < dragTargetY || i === 0) && (bbox.bottom > dragTargetY || i === cc.length-1)) {
				// On top of this element, or above first element or below last element.
				var midPoint = bbox.top + bbox.height/2;
				if (overlapAbove) {
					if (midPoint > dragTargetY) {
						// Move dragTarget before the element.
						dragTarget.parentNode.insertBefore(dragTarget, cc[i]);
						dragStartY = ev.clientY + (midPoint - dragTargetY);
						var dy = ev.clientY - dragStartY;
						dragTarget.style.transform = 'translateY('+dy+'px)';
						break;
					}
				} else {
					if (midPoint < dragTargetY) {
						// Move dragTarget after the element.
						dragTarget.parentNode.insertBefore(dragTarget, cc[i+1]);
						dragStartY = ev.clientY + (midPoint - dragTargetY);
						var dy = ev.clientY - dragStartY;
						dragTarget.style.transform = 'translateY('+dy+'px)';
						break;
					}
				}
			}
		}
	}
};
cityList.onpointerup = function(ev) {
	if (dragTarget) {
		ev.preventDefault();
		dragTarget.classList.remove('dragging');
		dragTarget.style.transform = '';
		dragTarget = null;
	}
};


document.getElementById('add-location-form').onsubmit = function(ev) {
	ev.preventDefault();
	const newLocationInput = document.getElementById('new-location-name');
	const location = newLocationInput.value;
	if (location) {
		LocationList.add(location);
		newLocationInput.value = '';
		newLocationInput.focus();
	}
}

var weatherDataElement = document.querySelector('#weather-data-container');
var wd2 = weatherDataElement.cloneNode(true);
Array.from(wd2.querySelectorAll('.fade-out')).forEach(e => e.classList.remove('fade-out'));

dragStart = { x: 0, y: 0, down: false };
window.addEventListener('pointerdown', ev => {
	if (ev.target.tagName !== 'CANVAS' || LocationList.locations.length === 0) return;
	wd2.style.display = 'none';
	weatherDataElement.parentElement.insertBefore(wd2, weatherDataElement);
	dragStart.x = ev.clientX;
	dragStart.y = ev.clientY;
	dragStart.down = true;
	ev.preventDefault();
});

window.addEventListener('pointermove', function (ev) {
	if (!dragStart.down) return;
	var dx = ev.clientX - dragStart.x;
	weatherDataElement.style.transition = wd2.style.transition = '0s';
	weatherDataElement.style.transform = 'translateX(' + (dx) + 'px)';
	weatherDataElement.style.opacity = 1 - Math.min(1, Math.max(0, dx * dx / (200 * 200)));
	wd2.style.transform = 'translateX(' + (Math.abs(dx) >= 200 ? 0 : ((dx > 0 ? -1 : 1) * 200 + dx)) + 'px';
	wd2.style.opacity = 1 - weatherDataElement.style.opacity;
	var idx = LocationList.locations.indexOf(LocationList.currentLocation);
	var nextLocation = LocationList.locations[0];
	var previousLocation = LocationList.locations[LocationList.locations.length - 1];
	if (idx !== -1) {
		nextLocation = LocationList.locations[(idx+1) % LocationList.locations.length];
		var prevIdx = ((idx-1) % LocationList.locations.length);
		if (prevIdx < 0) prevIdx += LocationList.locations.length;
		previousLocation = LocationList.locations[prevIdx];
		if (idx === LocationList.locations.length-1) nextLocation = currentLocationName || 'my location';
		if (idx === 0) previousLocation = currentLocationName || 'my location';
	}
	// Prevent swiping to the same location — bounce back instead
	if (nextLocation === LocationList.currentLocation) nextLocation = null;
	if (previousLocation === LocationList.currentLocation) previousLocation = null;
	LocationList.swipeLocation = dx < 0 ? nextLocation : previousLocation;
	if (wd2.querySelector('#location').value !== LocationList.swipeLocation) {
		wd2.style.display = 'block';
		wd2.querySelector('#location').value = LocationList.swipeLocation;
		populateWeatherElement(wd2, cities[LocationList.swipeLocation]);
	}
});

window.addEventListener('pointerup', function (ev) {
	if (!dragStart.down) return;
	var dx = ev.clientX - dragStart.x;
	dragStart.down = false;
	ev.preventDefault();
	wd2.style.transition = '0.3s';
	weatherDataElement.style.transition = '0.3s';
	if (Math.abs(dx) < 50 || !LocationList.swipeLocation) {
		weatherDataElement.style.opacity = 1;
		wd2.style.opacity = 0;
		weatherDataElement.style.transform = 'translateX(0px)';
		wd2.style.transform = 'translateX(' + (dx > 0 ? 200 : -200) + 'px)';
		setTimeout(function() {
			weatherDataElement.style.transition = '0s';
			weatherDataElement.style.transform = 'translateX(0px)';
			wd2.remove();
			setTimeout(function() {
				weatherDataElement.removeAttribute('style');
			}, 10);
		}, 300);
	} else {
		weatherDataElement.style.opacity = 0;
		wd2.style.opacity = 1;
		weatherDataElement.style.transform = 'translateX(' + (dx > 0 ? 200 : -200) + 'px)';
		wd2.style.transform = 'translateX(0px)';
		setTimeout(function() {
			LocationList.currentLocation = LocationList.swipeLocation;
			weatherDataElement.querySelector('#location').value = LocationList.currentLocation;
			populateWeatherElement(weatherDataElement, cities[LocationList.currentLocation]);
			// Show spinner if the target location has no weather data yet
			if (!cities[LocationList.swipeLocation] || !cities[LocationList.swipeLocation].weatherData || cities[LocationList.swipeLocation].weatherData.cod !== 200) {
				document.getElementById('weather-data').classList.add('fade-out');
				document.getElementById('time-data').classList.add('fade-out');
			}
			weatherDataElement.style.transition = '0s';
			weatherDataElement.style.transform = 'translateX(0px)';
			setTimeout(function() {
				weatherDataElement.removeAttribute('style');
				wd2.remove();
				setLocation(LocationList.currentLocation);
			}, 10);
		}, 300);
	}
});

function stripTags(s) {
    return (s||'').replace(/<[^>]+>/g, '');
}

async function fetchWeatherHK() {
    const weather = await (await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=en')).json();
	const useOneJSONXML = false;
	if (useOneJSONXML) {
		return (
			`The temperature is ${parseInt(weather.hko.Temperature)} with a high of ${weather.hko.HomeMaxTemperature} and a low of ${weather.hko.HomeMinTemperature}. ` +
			stripTags(weather.FLW.GeneralSituation) +
			stripTags(' Forecast: ' + weather.FLW.ForecastDesc) +
			stripTags(' Outlook: ' + weather.FLW.OutlookContent) + ' ' + stripTags(weather.FLW.TCInfo || '')
		);
	} else {
		// use weather.php API format
		return (
			`Current weather: ` + weather.generalSituation + ' ' +
			weather.forecastPeriod + ': ' + weather.forecastDesc +
			' Outlook: ' + weather.outlook + ' ' + (weather.tcInfo ? (' ' + weather.tcInfo) : '' ) +
			(weather.fireDangerWarning ? (weather.fireDangerWarning) : '')
		);
	}
}

function createWeatherSpeechText(city) {
	if (!city || !city.weatherData) return "No weather data available.";
	return weatherDataToString(city);
}

const i18n = { t: (s) => s };

const WarningCodes = new Map([
    [200, ''],
    [201, ''],
    [202, ''],
    [210, ''],
    [211, ''],
    [212, ''],
    [221, ''],
    [230, ''],
    [231, ''],
    [232, ''],
    [300, ''],
    [301, ''],
    [302, ''],
    [310, ''],
    [311, ''],
    [312, ''],
    [313, ''],
    [314, ''],
    [321, ''],
    [500, ''],
    [501, ''],
    [502, ''],
    [503, ''],
    [504, ''],
    [511, ''],
    [520, ''],
    [521, ''],
    [522, ''],
    [531, ''],
    [600, ''],
    [601, ''],
    [602, ''],
    [611, ''],
    [612, ''],
    [613, ''],
    [615, ''],
    [616, ''],
    [620, ''],
    [621, ''],
    [622, ''],
    [701, ''],
    [711, ''],
    [721, ''],
    [731, ''],
    [741, ''],
    [751, ''],
    [761, ''],
    [762, ''],
    [771, ''],
    [781, ''],
    [800, ''],
    [801, ''],
    [802, ''],
    [803, ''],
    [804, ''],
    [900, ''],
    [901, ''],
    [902, ''],
    [903, ''],
    [904, ''],
    [905, ''],
    [906, ''],
    [951, ''],
    [952, ''],
    [953, ''],
    [954, ''],
    [955, ''],
    [956, ''],
    [957, ''],
    [958, ''],
    [959, ''],
    [960, ''],
    [961, ''],
    [962, ''],
]);

function getWeatherCodeDescription(code) {
    switch (code) {
        case 200: return 'thunderstorm with light rain';
        case 201: return 'thunderstorm with rain';
        case 202: return 'thunderstorm with heavy rain';
        case 210: return 'light thunderstorm';
        case 211: return 'thunderstorm';
        case 212: return 'heavy thunderstorm';
        case 221: return 'ragged thunderstorm';
        case 230: return 'thunderstorm with light drizzle';
        case 231: return 'thunderstorm with drizzle';
        case 232: return 'thunderstorm with heavy drizzle';
        case 300: return 'light intensity drizzle';
        case 301: return 'drizzle';
        case 302: return 'heavy intensity drizzle';
        case 310: return 'light intensity drizzle rain';
        case 311: return 'drizzle rain';
        case 312: return 'heavy intensity drizzle rain';
        case 313: return 'shower rain and drizzle';
        case 314: return 'heavy shower rain and drizzle';
        case 321: return 'shower drizzle';
        case 500: return 'light rain';
        case 501: return 'moderate rain';
        case 502: return 'heavy intensity rain';
        case 503: return 'very heavy rain';
        case 504: return 'extreme rain';
        case 511: return 'freezing rain';
        case 520: return 'light intensity shower rain';
        case 521: return 'shower rain';
        case 522: return 'heavy intensity shower rain';
        case 531: return 'ragged shower rain';
        case 600: return 'light snow';
        case 601: return 'snow';
        case 602: return 'heavy snow';
        case 611: return 'sleet';
        case 612: return 'shower sleet';
        case 613: return 'light rain and snow';
        case 615: return 'light rain and snow';
        case 616: return 'rain and snow';
        case 620: return 'light shower snow';
        case 621: return 'shower snow';
        case 622: return 'heavy shower snow';
        case 701: return 'mist';
        case 711: return 'smoke';
        case 721: return 'haze';
        case 731: return 'sand, dust whirls';
        case 741: return 'fog';
        case 751: return 'sand';
        case 761: return 'dust';
        case 762: return 'volcanic ash';
        case 771: return 'squalls';
        case 781: return 'tornado';
        case 800: return 'clear sky';
        case 801: return 'few clouds';
        case 802: return 'scattered clouds';
        case 803: return 'broken clouds';
        case 804: return 'overcast clouds';
        case 900: return 'tornado';
        case 901: return 'tropical storm';
        case 902: return 'hurricane';
        case 903: return 'cold';
        case 904: return 'hot';
        case 905: return 'windy';
        case 906: return 'hail';
        case 951: return 'calm';
        case 952: return 'light breeze';
        case 953: return 'gentle breeze';
        case 954: return 'moderate breeze';
        case 955: return 'fresh breeze';
        case 956: return 'strong breeze';
        case 957: return 'high wind, near gale';
        case 958: return 'gale';
        case 959: return 'severe gale';
        case 960: return 'storm';
        case 961: return 'violent storm';
        case 962: return 'hurricane';
    }
    return 'unknown weather, watch out for aliens';
}

function airQualityToString(aqi) {
    if (aqi <= 0) return i18n.t('unknown');
    if (aqi >= 5) return i18n.t('hazardous');

    if (aqi === 1) return i18n.t('very good');
    if (aqi === 2) return i18n.t('good');
    if (aqi === 3) return i18n.t('bad');
    if (aqi === 4) return i18n.t('unhealthy');
}

// Compares the array values to a given value and returns how they compare.
// Uses the mean and stdev of the array to figure out the variability of the data.
// Returns one of the given strings depending on the comparison result.
// If the stdev is high, adds the variableString to the returned message.
// E.g. if the array is temperatures over the next days and value is the current temperature.
// lessString is cooler, similarString is similar, greaterString is warmer, and variableString is occasionally.
// Temperatures fall compared to present: "cooler"
// Temperatures rise compared to present: "warmer"
// Temperatures are high one day, low another, and high again: "occasionally warmer"
//
function timeSeriesCompare(arr, val, threshold, lessString, similarString, greaterString, variableString) {
    if (arr.length === 0) return similarString;
    const mean = arr.reduce((a, b) => a + b) / arr.length;
    const stdev = Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / arr.length);
    let str = '';
    if (stdev > threshold) str += variableString + ' ';
    if (val - mean > threshold) str += lessString;
    else if (mean - val > threshold) str += greaterString;
    else str += similarString;
    return str;
}

function getForecastDays(c) {
	const fc = c.forecast;
	const days = {};
	const myDay = new Date((c.weatherData.dt + c.weatherData.timezone) * 1e3).toISOString().split("T")[0];
	const myHour = new Date((c.weatherData.dt + c.weatherData.timezone) * 1e3).toISOString().split("T")[1].split(":")[0];
	days[myDay] = {minTemp: c.weatherData.main.temp, maxTemp: c.weatherData.main.temp, aqis: [{hour: myHour, aqi: c.weatherData.airQuality.main.aqi}], maxAQI: c.weatherData.airQuality.main.aqi, weatherCode: c.weatherData.weather[0].id};
	if (fc.list.length > 0) {
		var lastAQI = null;
		fc.list.forEach(l => {
			const dateString = new Date((l.dt + fc.city.timezone) * 1e3).toISOString();
			const itemDay = dateString.split("T")[0];
			const itemHour = dateString.split("T")[1].split(":")[0];
			const day = days[itemDay];
			if (!day) {
				days[itemDay] = {minTemp: l.main.temp, maxTemp: l.main.temp, aqis: [], maxAQI: l.airQuality.main.aqi, weatherCode: l.weather[0].id};
				if (lastAQI) days[itemDay].aqis.push({hour: 0, aqi: lastAQI});
				days[itemDay].aqis.push({hour: itemHour, aqi: l.airQuality.main.aqi});
			} else {
				if (day.minTemp > l.main.temp) day.minTemp = l.main.temp;
				if (day.maxTemp < l.main.temp) day.maxTemp = l.main.temp;
				day.aqis.push({hour: itemHour, aqi: l.airQuality.main.aqi});
				if (day.maxAQI < l.airQuality.main.aqi) day.maxAQI = l.airQuality.main.aqi;
				if (weatherCodeCompare(day.weatherCode, l.weather[0].id) > 0) day.weatherCode = l.weather[0].id;
				lastAQI = l.airQuality.main.aqi;
			}
		});
	}
    return {myDay, days};
}

function weatherDataToString(c) {

    const {myDay, days} = getForecastDays(c);
    const today = days[myDay];
    const minTemp = formatTemperature(today.minTemp, true);
    const maxTemp = formatTemperature(today.maxTemp, true);
    const todayDesc = c.weatherData.weather.map(function(wd) {
		return wd.description;
	}).join(" and ");
    const weatherDesc = i18n.t(getWeatherCodeDescription(today.weatherCode));

    let warning = i18n.t(WarningCodes.get(today.weatherCode)) || '';
    if (c.rainAmount > 0.2 && c.temperature > -2) warning += i18n.t('Bring an umbrella. ');

    const tomorrow = Object.values(days)[1];
    const followingDays = Object.values(days).slice(2);

    const followingDaysMinTemp = followingDays.map(d => d.minTemp).reduce((a,b) => Math.min(a,b));
    const followingDaysMaxTemp = followingDays.map(d => d.maxTemp).reduce((a,b) => Math.max(a,b));

    let followingDaysCoolerSimilarWarmer = i18n.t('similar');
    if (followingDaysMinTemp < today.minTemp - 5) followingDaysCoolerSimilarWarmer = i18n.t('cooler');
    if (followingDaysMaxTemp > today.maxTemp + 5) followingDaysCoolerSimilarWarmer = i18n.t('warmer');

    const followingDaysWeatherCode = followingDays.map(d => d.weatherCode).sort(weatherCodeCompare)[0];
    const followingDaysWeatherDescription = i18n.t(getWeatherCodeDescription(followingDaysWeatherCode));
    const followingDaysAirQuality = timeSeriesCompare(followingDays.map(d => d.aqis), today.maxAQI, 1, i18n.t('better'), i18n.t('similar'), i18n.t('worse'), i18n.t('occasionally'));
    
    let laterDesc = '';
    if (todayDesc === weatherDesc) {
        laterDesc = i18n.t(` all day long.`);
    } else {
        laterDesc = `${i18n.t(` with `)}${weatherDesc}${i18n.t(` later today.`)}`
    }

    return `${warning}${i18n.t(`The weather in `)}${c.name}${i18n.t(` is `)}${todayDesc}${laterDesc} ${i18n.t(`The temperature is `)}${formatTemperature(c.temperature, false)}${i18n.t(` with a high of `)}${maxTemp}${i18n.t(` and a low of `)}${minTemp}. ` +
        `${i18n.t(`The air quality is `)}${airQualityToString(c.weatherData.airQuality.main.aqi)}${(today.maxAQI > c.weatherData.airQuality.main.aqi) ? `${i18n.t(`, becoming `)}${airQualityToString(today.maxAQI)}${i18n.t(` later`)}` : ""}. ` +
        `${i18n.t(`Tomorrow will be `)}${i18n.t(getWeatherCodeDescription(tomorrow.weatherCode))}${i18n.t(` with temperatures from `)}${formatTemperature(tomorrow.minTemp, true)} to ${formatTemperature(tomorrow.maxTemp, true)}${i18n.t(` and `)}${airQualityToString(tomorrow.maxAQI)}${i18n.t(` air quality. `)}` +
        `${i18n.t(`The following days will be `)}${followingDaysCoolerSimilarWarmer}${i18n.t(` with `)}${followingDaysWeatherDescription} and ${followingDaysAirQuality} air quality.`;
}

function weatherDataToCurrentString(c) {
    const {myDay, days} = getForecastDays(c);
    const today = days[myDay];
    const minTemp = formatTemperature(today.minTemp, true);
    const maxTemp = formatTemperature(today.maxTemp, true);
    const todayDesc = c.weatherData.weather.map(function(wd) {
		return wd.description;
	}).join(i18n.t(" and "));
    const weatherDesc = i18n.t(getWeatherCodeDescription(today.weatherCode));

    let warning = i18n.t(WarningCodes.get(today.weatherCode)) || '';
    if (c.rainAmount > 0.2 && c.temperature > -2) warning += i18n.t('Bring an umbrella. ');

    const tomorrow = Object.values(days)[1];
    const followingDays = Object.values(days).slice(2);

    const followingDaysMinTemp = followingDays.map(d => d.minTemp).reduce((a,b) => Math.min(a,b));
    const followingDaysMaxTemp = followingDays.map(d => d.maxTemp).reduce((a,b) => Math.max(a,b));

    let followingDaysCoolerSimilarWarmer = i18n.t('similar');
    if (followingDaysMinTemp < today.minTemp - 5) followingDaysCoolerSimilarWarmer = i18n.t('cooler');
    if (followingDaysMaxTemp > today.maxTemp + 5) followingDaysCoolerSimilarWarmer = i18n.t('warmer');

    const followingDaysWeatherCode = followingDays.map(d => d.weatherCode).sort(weatherCodeCompare)[0];
    const followingDaysWeatherDescription = i18n.t(getWeatherCodeDescription(followingDaysWeatherCode));
    const followingDaysAirQuality = timeSeriesCompare(followingDays.map(d => d.aqis), today.maxAQI, 1, i18n.t('better'), i18n.t('similar'), i18n.t('worse'), i18n.t('occasionally'));

    return `${warning}${i18n.t(`The weather outside is `)}${todayDesc}. ${i18n.t(`The temperature is `)}${formatTemperature(c.temperature, false)}. ` +
        `${i18n.t(`The air quality is `)}${airQualityToString(c.weatherData.airQuality.main.aqi)}. `;
}


async function fetchHKWarnings() {
	const warnings = await (await fetch('https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en')).json();
	return warnings;
}

function updateHKWarnings(warnings) {
	const warningsDiv = document.body.querySelector('#warnings');
	warningsDiv.innerHTML = '';
	for (const warningName in warnings) {
		/*  warningName values:
			WFIRE: Fire Danger Warning
			WFROST: Frost Warning
			WHOT: Hot Weather Warning
			WCOLD: Cold Weather Warning
			WMSGNL: Strong Monsoon Signal
			WRAIN: Rainstorm Warning Signal
			WFNTSA: Special Announcement on Flooding in the northern New Territories
			WL: Landslip Warning
			WTCSGNL: Tropical Cyclone Warning Signal
			WTMW: Tsunami Warning
			WTS: Thunderstorm Warning
			WFIRE WFIREY

			warning.code values:
			WFIRE: WFIREY, WFIRER
			WFROST: WFROST
			WHOT: WHOT
			WCOLD: WCOLD
			WMSGNL: WMSGNL
			WRAIN: WRAINA, WRAINR, WRAINB
			WFNTSA: WFNTSA
			WL: WL
			WTCSGNL: TC1, TC3, TC8NE, TC8SE, TC8NW, TC8SW, TC9, TC10, CANCEL
			WTMW: WTMW
			WTS: WTS
		*/
		const warning = warnings[warningName];
		const span = document.createElement('a');
		span.className = 'icon hko-' + warning.code.toLowerCase();
		span.title = warning.type + " " + warning.name;
		span.href = 'https://www.hko.gov.hk/en/wxinfo/dailywx/wxwarntoday.htm';
		warningsDiv.appendChild(span);
	}
}

async function say(text, options) {
	if (navigator.wakeLock && navigator.wakeLock.request) {
		try {
			navigator.wakeLockSentinel = await navigator.wakeLock.request('screen');
		} catch (e) {
			console.error('Wake lock request failed:', e);
		}
	}
	return new Promise((resolve, reject) => {
		const u = new SpeechSynthesisUtterance(text);
		u.voice = 
			speechSynthesis.getVoices().find(voice => voice.name === 'Google US English')
			|| speechSynthesis.getVoices().find(voice => voice.lang.startsWith('en'))
			|| null;
		if (options) Object.assign(u, options);
		u.onend = () => {
			if (navigator.wakeLockSentinel) {
				navigator.wakeLockSentinel.release();
				navigator.wakeLockSentinel = null;
			}
			resolve();
		};
		speechSynthesis.speak(u); 
	});
}

async function speakWeather() {
	const button = document.getElementById('speak-weather-button');
	if (speechSynthesis.speaking) {
		speechSynthesis.cancel();
		if (navigator.wakeLockSentinel) {
			navigator.wakeLockSentinel.release();
			navigator.wakeLockSentinel = null;
		}
		button.classList.remove('playing');
		return;
	}
	const c = cities[cityNames[targetCityIndex]] || cities[cityNames[currentCityIndex]] || zeroCity;
	const weatherData = c ? c.weatherData : null;
	if (!weatherData) {
		await say("No weather data available.");
		return;
	}
	const latitude = weatherData.coord.lat;
	const longitude = weatherData.coord.lon;
	// Hong Kong region
	try {
		button.classList.add('playing');
		if (latitude > 21 && latitude < 23 && longitude > 112 && longitude < 115) {
			await say(await fetchWeatherHK());
		} else {
			await say(createWeatherSpeechText(c));
		}
	} catch (e) {
		console.error(e);
	}
	button.classList.remove('playing');
}

/*

function swipeLeft() {
	const newCityIndex = (cityIndex+1) % cities.length;
	cityIndex = newCityIndex;
	fillNextCityElement(cities[cityIndex]);
	animateNextCityInFromRight().then(() => {
		fillCurrentCityElement(cities[cityIndex]);
		clearNextCityElement();
	});
}

function swipeRight() {
	if (cityIndex === 0) cityIndex = cities.length;
	const newCityIndex = (cityIndex-1);
	cityIndex = newCityIndex;
	fillNextCityElement(cities[cityIndex]);
	animateNextCityInFromLeft().then(() => {
		fillCurrentCityElement(cities[cityIndex]);
		clearNextCityElement();
	});
}

function wireUpCityEditor(el) {
	// Make it draggable.
	// Make the city name editable.
	// Load city weather data when you finish editing.
}

addButton.onclick = function(ev) {
	const btn = this;
	ev.preventDefault();
	const el = btn.previousElementSibling.cloneNode(true);
	wireUpCityEditor(el);
	btn.parentElement.insertBefore(el, btn);
};

function addCityEditor(city) {

}

function addMyLocationCity() {

}

addMyLocationCity();
cities.forEach(c => addCityEditor(c));
*/