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

var cityNames = [];

var cities = {};
var currentCityIndex = 0;
var zeroCity = {
	cloudCover: 0, windDirection: 0, windStrength: 8, rainAmount: 0, sunrise: Date.now()/1000-12000, sunset: Date.now()/1000+43200-12000,
	temperature: 10, weatherData: {weather: []}
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

var parseRainAmount = function(weatherData) {
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

var updateWeather = function(cityName, weatherData) {
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
	c.sunrise = (weatherData.sys && weatherData.sys.sunrise) || (86400 * 1/4);
	c.sunset = (weatherData.sys && weatherData.sys.sunset) || (86400 * 3/4);
};

var fetchInterval = 0;

var fetchWeather = function(cityName, callback, onerror) {
	// Update weather every 30 minutes
	clearInterval(fetchInterval);
	fetchInterval = setInterval(function() { fetchWeather(cityName, callback, onerror); }, 30*60*1000);

	if (cityName.latitude) {
		var queryURL = 'http://api.openweathermap.org/data/2.5/weather?lat='+encodeURIComponent(cityName.latitude)+'&lon='+encodeURIComponent(cityName.longitude)+'&units=metric&APPID=1271d12e99b5bdc1e4d563a61e467190';
	} else {
		var queryURL = 'http://api.openweathermap.org/data/2.5/weather?q='+encodeURIComponent(cityName)+'&units=metric&APPID=1271d12e99b5bdc1e4d563a61e467190';
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', queryURL, true);
	xhr.onload = function(ev) {
		var weatherData = JSON.parse(ev.target.responseText);
		if (callback) {
			callback(cityName, weatherData);
		}
	};
	xhr.onerror = onerror;
	xhr.send(null);
};

window.currentLocation = false;

var fetchCities = function(location) {
	// console.log('fetchCities', location);
	if (location) {
		window.currentLocation = location;
	}
	if (!document.body.classList.contains('loaded')) {
	
		fetchWeather(currentLocation, function(location, weatherData) {
			cityNames = [weatherData.name];
			updateWeather(weatherData.name, weatherData);
			document.body.classList.add('loaded');
			setTimeout(function() {
				weatherUpdateTriggered = true;
			}, 800);
		});

	} else {
	
		fetchWeather(currentLocation, function(location, weatherData) {
			updateWeather(location.city + ', ' + location.country, weatherData);
			weatherUpdateTriggered = true;
		});
	
	}
	
	return;

	var loadCount = cityNames.length;
	for (var i = 0; i < cityNames.length; i++) {
		fetchWeather(cityNames[i], function(cityName, weatherData) {
			updateWeather(cityName, weatherData);
			loadCount--;
			if (cityNames[currentCityIndex] === cityName) {
				if (!document.body.classList.contains('loaded')) {
					document.body.classList.add('loaded');
					setTimeout(function() {
						weatherUpdateTriggered = true;
					}, 800);
				} else {
					weatherUpdateTriggered = true;
				}
			}
			if (loadCount === 0) {
				document.body.classList.add('loaded');
			}
		}, function() {
			loadCount--;
			if (loadCount === 0) {
				document.body.classList.add('loaded');
			}
		});
	}
};

// setInterval(fetchCities, 15*60*1000);

document.getElementById('city').onchange = function(ev) {
	ev.target.blur();
	var cityName = ev.target.value;
	var idx = cityNames.length;
	cityNames.push(cityName);
	document.body.classList.remove('current-location');
	fetchWeather(cityName, function(location, weatherData) {
		updateWeather(cityName, weatherData);
		targetCityIndex = idx;
		weatherTimer = 0;
	});
};

document.getElementById('city').onfocus = function(ev) {
	ev.target.select();
};

document.getElementById('my-location').onclick = function(ev) {
	ev.preventDefault();
	document.getElementById('my-location').blur();
	document.getElementById('my-location').classList.add('locating');
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function(pos) {
				document.getElementById('my-location').classList.remove('locating');
				document.body.classList.add('current-location');
				fetchWeather(pos.coords, function(location, weatherData) {
					targetCityIndex = cityNames.length;
					weatherTimer = 0;
					cityNames.push(weatherData.name);
					updateWeather(weatherData.name, weatherData);
				});
			},
			function(error) {
				// Couldn't get location from geolocation, let's go back to geoip.
				document.getElementById('my-location').classList.remove('locating');
				document.body.classList.add('current-location');
				fetchWeather(window.currentLocation, function(location, weatherData) {
					updateWeather(location.city + ', ' + location.country, weatherData);
					targetCityIndex = 0;
					weatherTimer = 0;
				});
			},
			{
				enableHighAccuracy: true, timeout: 5000
			}
		);
	} else {
		// Couldn't get location from geolocation, let's go back to geoip.
		document.getElementById('my-location').classList.remove('locating');
		document.body.classList.add('current-location');
		fetchWeather(window.currentLocation, function(location, weatherData) {
			updateWeather(location.city + ', ' + location.country, weatherData);
			targetCityIndex = 0;
			weatherTimer = 0;
		});		
	}
};

// fetchCities();

// var getCityNames = function() {
// 	return document.getElementById('city-names').value
// 			.split('\n')
// 			.map(function(c) { return c.replace(/^\s+|\s+$/g, ''); })
// 			.filter(function(c) { return c !== ''; });	
// };

// var updateCityNames = function() {
// 	cityNames = getCityNames() || ['London'];
// 	if (window.localStorage) {
// 		localStorage.setItem('cityNames', JSON.stringify(cityNames));
// 	}
// 	fetchCities();
// };

// var initializeCityNames = function() {
// 	try {
// 		cityNames = JSON.parse(localStorage.getItem('cityNames'));
// 		if (cityNames.length === 0) {
// 			cityNames = getCityNames();
// 			localStorage.setItem('cityNames', JSON.stringify(cityNames));
// 		}
// 		document.getElementById('city-names').value = cityNames.join("\n");
// 	} catch(e) {
// 		cityNames = getCityNames();
// 	}
// 	fetchCities();
// };

// initializeCityNames();
// document.getElementById('city-names').onchange = updateCityNames;
