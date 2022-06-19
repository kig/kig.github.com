/*

To set up a weather visualisation, you create a W3.Visualiser object and feed it weather data using
W3.Visualiser#setWeatherForLocation.

If you want to cycle through multiple locations, use W3.Visualiser#setLocation whenever
you wish to change the location. If you haven't set the weather for the set location yet,
you'll get blank weather with a loading screen. When you set the weather for the current location,
the visualiser animates to the newly set weather data.

If you don't call setLocation, the weather visualiser will display the weather for the location
specified in the first call to W3.Visualiser#setWeatherForLocation.


For convenience, the W3.WeatherSource class implements a handy way to load and periodically update
weather data for a given list of locations.


The W3.Visualiser comes with a number of plugins for adding graphics effects to the visualiser
and for controlling the visualisation.


The bundled graphics plugins are:

	- W3.LakeBackground, the default background that's set on a placid lake with sun and clouds driven by weather data.
	- W3.Cornfield, a randomly-generated field of corn growing out of the lake. The corn sways with the wind. The height and density of the corn can be controlled.
	- W3.Birds, a flock of birds flying around when the weather is fine. The birds can be scared away or attracted to the screen.
	- W3.Rain, a rain particle field that reacts to the rain and wind data.
	- W3.Stars, a star particle field that appears on fine nights.
	- W3.Fluff, a particle field of flying fluff that appears on fine days.


The bundled controller plugins are:

	- W3.Kinect, implements a couple of Kinect-driven gestures for controlling the visualiser.
	- W3.Microphone, implements a simple Web Audio API -based microphone control to monitor the ambient volume.
	- W3.Keyboard, simple keyboard controls.
	- W3.Touch, touch controls.



var vis = new WeatherVisualiser(document.body);
var weatherSource = new WeatherSource();

var locations = [currentLocation].concat(cities);

locations.forEach(l => weatherSource.addLocation(l));
vis.setLocation(currentLocation);

weatherSource.addEventListener('load', function(ev) {
	vis.setWeatherForLocation(ev.data.location, ev.data.weather);
});

weatherSource.updateFrequency = 15 * 60 * 1000;
weatherSource.startUpdating();

var locationDuration = 30 * 1000;

setInterval(function() {
	locationIndex = (locationIndex + 1) % locations.length;
	vis.setLocation(locations[locationIndex]);
}, locationDuration);

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

	if (!document.body.classList.contains('loaded')) {
		document.body.classList.add('loaded');
	}
};

var fetchInterval = 0;

var fetchWeather = function (cityName, onerror) {
	// Update weather every hour
	clearInterval(fetchInterval);
	fetchInterval = setInterval(function () {
		fetchWeather(cityName).then(() => weatherUpdateTriggered = true);
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

	return Promise.all([
		fetch(server+'weather'+location+units+appid+lang+cacheTime).then(res => res.json()),
		fetch(server+'forecast'+location+units+appid+lang+cacheTime).then(res => res.json())
	]).then(([weatherData, forecast]) => {
		if (parseInt(weatherData.cod) !== 200) {
			document.body.classList.add('error');
			document.getElementById('error').textContent = weatherData.message;
			return;
		}
		weatherData.forecast = (parseInt(forecast.cod) === 200 ? forecast : zeroCity.forecast);
		updateWeather(weatherData.name, weatherData);
	}).catch(onerror);
};

window.currentLocation = false;

document.getElementById('city').onchange = function (ev) {
	if (ev.target.value === '') {
		ev.target.value = prevCityValue;
	} else {
		var cityName = ev.target.value;
		document.body.classList.remove('current-location');
		fetchWeather(cityName);
		ev.target.blur();
		document.body.focus();
		gtag('location-field', {action: 'change'});
	}
};

document.getElementById('city').onblur = function (ev) {
	if (ev.target.value === '') {
		ev.target.value = prevCityValue;
	}
};

var prevCityValue = '';
document.getElementById('city').onfocus = function (ev) {
	document.body.classList.remove('error');
	prevCityValue = ev.target.value;
	gtag('location-field', {action: 'focus'});
	ev.target.value = '';
};

document.getElementById('my-location').onclick = function (ev) {
	ev.preventDefault();
	document.body.classList.remove('error');
	gtag('my-location', {action: 'click'});
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
	document.getElementById('my-location').classList.add('locating');
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function (pos) {
				window.geolocationFetched = true;
				window.currentLocation = pos.coords;
				document.getElementById('my-location').classList.remove('locating');
				document.body.classList.add('current-location');
				fetchWeather(pos.coords);
			},
			function (error) {
				// Couldn't get location from geolocation, let's go back to geoip.
				document.getElementById('my-location').classList.remove('locating');
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
		document.getElementById('my-location').classList.remove('locating');
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

