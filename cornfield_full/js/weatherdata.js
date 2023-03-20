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
		- [] AQI by hour forecast visualization (replace dot with a color strip under the icon?)
		- [] AQI params in the forecast graph
		- [] Zoom-scroll-full window overlay forecast graph
		- [] Use SVG for forecast graph instead of canvas

	- Local features (i.e. no API, have to do custom integrations)
		- [] Weather signals (typhoons, fire hazard, cold/hot weather warning, rain signals)
		- [] Textual weather report
		- [] Rain radar (... how to make it pretty? Do it like the weather map artwork?)

	- In a world where everything takes no time, this functionality would be fun to explore.
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
			onSuccess(weatherData);
		});
	});

};

var fetchWeather = function (cityName, isRefresh) {
	// Update weather every hour
	clearInterval(fetchInterval);
	fetchInterval = setInterval(function () {
		fetchWeather(cityName, true).then(() => weatherUpdateTriggered = true);
	}, 60 * 60 * 1000);

	if (!isRefresh) {
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
var updateClock = function() {
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
	}
	clock.innerHTML = formatTimeString(t, navigator.language);
	date.textContent = t.toLocaleDateString(navigator.language, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
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
		li.innerHTML = '<span class="time"></span><span class="temp"></span><span class="name"></span><span class="delete"></span>';
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
cityList.onmousedown = function(ev) {
	if (ev.target.classList.contains('name') && ev.target.parentNode.parentNode.tagName === 'UL') {
		ev.preventDefault();
		dragTarget = ev.target.parentNode;
		dragStartY = ev.clientY;
		dragInProgress = false;
	}
};
cityList.onmousemove = function(ev) {
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
cityList.onmouseup = function(ev) {
	if (dragTarget) {
		ev.preventDefault();
		dragTarget.classList.remove('dragging');
		dragTarget.style.transform = '';
		dragTarget = null;
	}
};


const addButton = cityList.querySelector('.add-city');
addButton.onclick = function(ev) {
	cityList.classList.toggle('show-add-location');
	var newLocationInput = document.getElementById('new-location-name');
	newLocationInput.focus();
	newLocationInput.setSelectionRange(0, newLocationInput.value.length);
};

document.getElementById('add-location-form').onsubmit = function(ev) {
	ev.preventDefault();
	var location = document.getElementById('new-location-name').value;
	if (location) {

		LocationList.add(location);
		var newLocationInput = document.getElementById('new-location-name');
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
	if (Math.abs(dx) < 50) {
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