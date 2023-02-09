/*

Tasks

	- [] Wanted utility features
		- [] Multiple locations
			- [] Location list editor
			- [] My Location
			- [] Swipe to navigate between locations
			- [] Slideshow mode to cycle through locations
		- [x] Show current time at location
		- [x] AQI - air quality data for locations
		- [x] Mobile layout for time display
		- [x] Sunrise & sunset times

	- [] Local features (i.e. no API, have to do custom integrations)
		- [] Weather signals (typhoons, fire hazard, cold/hot weather warning, rain signals)
		- [] Textual weather report
		- [] Rain radar (... how to make it pretty? Do it like the weather map artwork?)

	- [] In a world where everything takes no time, this functionality would be fun to explore.
		- [] Location info
		- [] Event info
		- [] Transportation
		- [] Exercise info
		- [] Food
		- [] Weather Pay
		- [] Weather Store
		- [] Weather Marketplace
		- [] wPhone
		- [] Monopoly on Weather
		- [] Weather Tax
		- [] Every breath you take should be a financial transaction and we should take a 30% cut of it


*/

var cities = {};
var cityNames = [];

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

var updateWeather = function (cityName, weatherData) {
	targetCityIndex = addCityIfNeeded(cityName);
	weatherTimer = 0;

	var c = cities[cityName];
	if (!c) {
		c = cities[cityName] = {};
	}
	weatherData = weatherData || {};
	c.weatherData = weatherData;
	c.cloudCover = weatherData.clouds ? (weatherData.clouds.all || 0) / 100 : 0;
	c.windDirection = (weatherData.wind && weatherData.wind.deg) || 0;
	c.windStrength = (weatherData.wind && weatherData.wind.speed) || 0.1;
	c.rainAmount = parseRainAmount(weatherData);
	c.temperature = (weatherData.main && weatherData.main.temp) || 0;
	c.sunrise = (weatherData.sys && weatherData.sys.sunrise) || (86400 * 1 / 4);
	c.sunset = (weatherData.sys && weatherData.sys.sunset) || (86400 * 3 / 4);
	c.forecast = weatherData.forecast || zeroCity.forecast;

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

var fetchWeather = function (cityName, isRefresh) {
	// Update weather every hour
	clearInterval(fetchInterval);
	fetchInterval = setInterval(function () {
		fetchWeather(cityName, true).then(() => weatherUpdateTriggered = true);
	}, 60 * 60 * 1000);
	var server = '//api.openweathermap.org/data/2.5/';
	var units = '&units=metric';
	var appid = '&APPID=1271d12e99b5bdc1e4d563a61e467190';
	var lang = '&lang=' + (navigator.language || 'en').split('-')[0];
	var location = 
		cityName.latitude
		? '?lat=' + encodeURIComponent(cityName.latitude) + '&lon=' + encodeURIComponent(cityName.longitude)
		: '?q=' + encodeURIComponent(cityName);
	var cacheTime = '&' + Math.floor(Date.now() / 3.6e6); // Cache weather responses for 1 hour.

	if (!isRefresh) {
		document.getElementById('weather-data').classList.add('fade-out');
	}

	return Promise.all([
		fetch(server+'weather'+location+units+appid+lang+cacheTime).then(res => res.json()),
		fetch(server+'forecast'+location+units+appid+lang+cacheTime).then(res => res.json())
	]).then(([weatherData, forecast]) => {
		if (parseInt(weatherData.cod) !== 200) {
			if (firstFetch) { // Failed initial fetchWeather, fall back to geoIP.
				firstFetch = false;
				fetchGeoIPWeather();
			} else {
				document.body.classList.add('error');
				document.getElementById('error').textContent = weatherData.message;
				document.getElementById('weather-data').classList.remove('fade-out');
			}
			return;
		}
		firstFetch = false;
		weatherData.forecast = (parseInt(forecast.cod) === 200 ? forecast : zeroCity.forecast);
		var coordsLocation = '?lat=' + encodeURIComponent(weatherData.coord.lat) + '&lon=' + encodeURIComponent(weatherData.coord.lon);
		fetch(server+'air_pollution/forecast'+coordsLocation+units+appid+lang+cacheTime).then(res => res.json()).then(airQuality => {
			if (airQuality && !airQuality.cod) {
				weatherData.airQuality = airQuality.list[0];
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
			updateWeather(weatherData.name, weatherData);
			if (!isRefresh) {
				window.localStorage.currentLocation = JSON.stringify(cityName);
			}
		});
	});
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

document.getElementById('location').onfocus = function (ev) {
	document.body.classList.remove('error');
	dataLayer.push({event: 'location-field', action: 'focus'});
	ev.target.value = ev.target.value;
	ev.target.setSelectionRange(0, ev.target.value.length);
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
	if (window.geoIPData && !window.geolocationFetched) {
		window.currentLocation = window.geoIPData;
		fetchWeather(window.geoIPData);
	} else {
		fetchWeather(window.currentLocation);
	}
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
setInterval(function() {
	var t = new Date();
	if (cityNames[currentCityIndex]) {
		var wd = cities[cityNames[currentCityIndex]].weatherData;
		var tzOff = wd.timezone;
		tzOff += t.getTimezoneOffset() * 60;
		t = new Date(Date.now() + tzOff * 1000);

		var sunrise = new Date(wd.sys.sunrise * 1000 + tzOff * 1000);
		var sunset = new Date(wd.sys.sunset * 1000 + tzOff * 1000);
		sunriseEl.querySelector('.time').textContent = sunrise.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});
		sunsetEl.querySelector('.time').textContent = sunset.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});
		sunriseEl.style.visibility = 'visible';
		sunsetEl.style.visibility = 'visible';
	} else {
		sunriseEl.style.visibility = 'hidden';
		sunsetEl.style.visibility = 'hidden';
	}
	clock.innerHTML = formatTimeString(t, navigator.language);
	date.textContent = t.toLocaleDateString(navigator.language, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
}, 1000);
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

if (window.localStorage && window.localStorage.currentLocation) {
	try {
		var currentLocation = JSON.parse(window.localStorage.currentLocation);
		if (typeof currentLocation === 'string') currentLocation = currentLocation.trim();
		else if (typeof currentLocation === 'object' && !(isNaN(currentLocation.latitude) || isNaN(currentLocation.longitude))) {
			// Ok, we can use this object.
		} else {
			// Bad currentLocation in localStorage.
			currentLocation = false;
		}
		if (currentLocation) {
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

const listButton = window.getElementById('toggle-city-list');
listButton.onclick = function(ev) {
	document.body.classList.toggle('in-city-list');
}

const cityList = window.getElementById('city-list');

const addButton = cityList.querySelector('.add-city');

function wireUpCityEditor(el) {
	// Make it draggable.
	// Make the city name editable.
	// Load city weather data when you finish editing.
}

cityList.onclick = function(ev) { 
	const outside = (ev.clientX > ev.target.getBoundingClientRect().right);
	const isMyLocation = ev.target.parentElement.parentElement.firstElementChild === ev.target.parentElement;
	if (outside && !isMyLocation && ev.target.classList.contains('name')) {
		// Remove this city
		removeCity(this.textContent);
		ev.target.parentElement.remove();
	}
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