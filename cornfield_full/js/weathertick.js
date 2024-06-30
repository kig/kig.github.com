var weatherTickDataElement = document.querySelector('#weather-data-container');

var wdOff = 0;
var wdOffTarget = 0;
var wsOff = 0;
var wsOffTarget = 0;
var windDirection = 0, windStrength = 0;
var weatherTimer = 0;

const weatherCodePriority = [
	233,
	202,
	201,
	200,
	232,
	231,
	230,
	602,
	612,
	511,
	502,
	522,
	623,
	622,
	611,
	610,
	601,
	621,
	501,
	711,
	731,
	751,
	521,
	600,
	302,
	500,
	520,
	301,
	300,
	741,
	800,
	700,
	721,
	801,
	802,
	803,
	804,
	900,
];

const weatherCodeNames = {
	200: {group: 'Thunderstorm', title: 'thunderstorm with light rain', intensity: 1},
	201: {group: 'Thunderstorm', title: 'thunderstorm with rain', intensity: 2},
	202: {group: 'Thunderstorm', title: 'thunderstorm with heavy rain', intensity: 3},
	210: {group: 'Thunderstorm', title: 'light thunderstorm', intensity: 1},
	211: {group: 'Thunderstorm', title: 'thunderstorm', intensity: 2},
	212: {group: 'Thunderstorm', title: 'heavy thunderstorm', intensity: 3},
	221: {group: 'Thunderstorm', title: 'ragged thunderstorm', intensity: 2},
	230: {group: 'Thunderstorm', title: 'thunderstorm with light drizzle', intensity: 1},
	231: {group: 'Thunderstorm', title: 'thunderstorm with drizzle', intensity: 2},
	232: {group: 'Thunderstorm', title: 'thunderstorm with heavy drizzle', intensity: 3},
	300: {group: 'Drizzle', title: 'light intensity drizzle', intensity: 1},
	301: {group: 'Drizzle', title: 'drizzle', intensity: 2},
	302: {group: 'Drizzle', title: 'heavy intensity drizzle', intensity: 3},
	310: {group: 'Drizzle', title: 'light intensity drizzle rain', intensity: 1},
	311: {group: 'Drizzle', title: 'drizzle rain', intensity: 2},
	312: {group: 'Drizzle', title: 'heavy intensity drizzle rain', intensity: 3},
	313: {group: 'Drizzle', title: 'shower rain and drizzle', intensity: 2},
	314: {group: 'Drizzle', title: 'heavy shower rain and drizzle', intensity: 3},
	321: {group: 'Drizzle', title: 'shower drizzle', intensity: 2},
	500: {group: 'Rain', title: 'light rain', intensity: 1},
	501: {group: 'Rain', title: 'rain', intensity: 2},
	502: {group: 'Rain', title: 'heavy rain', intensity: 3},
	503: {group: 'Rain', title: 'very heavy rain', intensity: 4},
	504: {group: 'Rain', title: 'extreme rain', intensity: 5},
	511: {group: 'Rain', title: 'freezing rain', intensity: 3},
	520: {group: 'Rain', title: 'light intensity shower rain', intensity: 1},
	521: {group: 'Rain', title: 'shower rain', intensity: 2},
	522: {group: 'Rain', title: 'heavy intensity shower rain', intensity: 3},
	531: {group: 'Rain', title: 'ragged shower rain', intensity: 2},
	600: {group: 'Snow', title: 'light snow', intensity: 1},
	601: {group: 'Snow', title: 'snow', intensity: 2},
	602: {group: 'Snow', title: 'heavy snow', intensity: 3},
	611: {group: 'Snow', title: 'sleet', intensity: 2},
	612: {group: 'Snow', title: 'shower sleet', intensity: 2},
	615: {group: 'Snow', title: 'light rain and snow', intensity: 2},
	616: {group: 'Snow', title: 'rain and snow', intensity: 3},
	620: {group: 'Snow', title: 'light shower snow', intensity: 2},
	621: {group: 'Snow', title: 'shower snow', intensity: 3},
	622: {group: 'Snow', title: 'heavy shower snow', intensity: 4},

	701: {group: 'Mist', title: 'mist', intensity: 1},
	711: {group: 'Smoke', title: 'smoke', intensity: 1},
	721: {group: 'Haze', title: 'haze', intensity: 1},
	731: {group: 'Dust', title: 'dust', intensity: 1},
	741: {group: 'Fog', title: 'fog', intensity: 1},
	751: {group: 'Sand', title: 'sand', intensity: 1},
	761: {group: 'Dust', title: 'dust', intensity: 1},
	762: {group: 'Ash', title: 'volcanic ash', intensity: 1},
	771: {group: 'Squall', title: 'squalls', intensity: 1},
	781: {group: 'Tornado', title: 'tornado', intensity: 1},

	800: {group: 'Clear', title: 'clear sky', intensity: 0},

	801: {group: 'Clouds', title: 'few clouds', intensity: 1},
	802: {group: 'Clouds', title: 'scattered clouds', intensity: 1},
	803: {group: 'Clouds', title: 'broken clouds', intensity: 1},
	804: {group: 'Clouds', title: 'overcast clouds', intensity: 1},
};

function weatherCodeCompare(a, b) {
	const categoryPriority = weatherCodePriority.indexOf(a) - weatherCodePriority.indexOf(b);
	if (categoryPriority !== 0) return categoryPriority;
	return a - b;
}

var useUSAUnits = /^en-US$/i.test(navigator.language);
if (localStorage.useUSAUnits !== undefined) {
	useUSAUnits = localStorage.useUSAUnits === 'true';
}

var lastTap = Date.now();
document.getElementById('temperature').onmousedown = document.getElementById('temperature').ontouchstart = function(ev) {
	ev.preventDefault();
	if (Date.now() - lastTap < 1000) {
		useUSAUnits = !useUSAUnits;
		localStorage.useUSAUnits = useUSAUnits.toString();
		weatherUpdateTriggered = true;
		lastTap = 0;
		dataLayer.push({event: 'temperature', action: 'USAUnits-' + useUSAUnits});
	} else {
		lastTap = Date.now();
		dataLayer.push({event: 'temperature', action: 'ignored-fast-tap'});
	}
}

var cityChangeDuration = 500;
var weatherUpdateTriggered = false;

function fractSample2DArray(arr, i, idx) {
	const t = idx - Math.floor(idx);
	return arr[Math.max(0,Math.min(arr.length-1, Math.floor(idx)))][i] * (1-t) + arr[Math.max(0,Math.min(arr.length-1, Math.ceil(idx)))][i] * t;
}

function formatTemperature(temperatureCelsius) {
	if (useUSAUnits) return Math.round(temperatureCelsius * 1.8 + 32) + '°F';
	return Math.round(temperatureCelsius) + '°C';
}

function formatWindSpeed(windSpeedMetersPerSecond) {
	if (useUSAUnits) return Math.round(windSpeedMetersPerSecond * 2.237) + ' mph';
	return Math.round(windSpeedMetersPerSecond) + ' m/s';
}

// 0 = left = 6:00, 0.5 = up = 12:00, 1 = right = 18:00, 1.5 = down = 24:00
function getSunPosition(c) {
	var t = Date.now() / 1000;
	var lengthOfDay = c.sunset-c.sunrise;
	if (Math.abs(lengthOfDay) >= 86400) {
		// Polar day / night.
		if (t > c.sunrise && t < c.sunset) {
			return (t-c.sunrise) / (c.sunset-c.sunrise); // 0..1 sunrise..sunset
		} else {
			return 1.5; // midnight
		}
	}
	if (t >= c.sunrise && t <= c.sunset) {
		return (t-c.sunrise) / (c.sunset-c.sunrise); // 0..1 sunrise..sunset
	}
	var lengthOfNight = 86400 - lengthOfDay;
	var timeSinceSunset = (t - c.sunset) % 86400;
	if (timeSinceSunset < 0) timeSinceSunset += 86400;
	return 1 + (timeSinceSunset / lengthOfNight);
}
// a 0..2, b 0..2, t 0..1
function angleLerp(src, dst, t) {
	if (t <= 0) return src;
	if (t >= 1) return dst;
	var d = (dst - src) % 2;
	if (d < -1) d += 2;
	if (d > 1) d -= 2;
	return src + d * t;
}

// Create an SVG graphic for the AQI.
//
// aqisByHour is an array of AQI values with the hour of the measurement, these are generally 3 hours apart.
// The AQI values are in the range 0..5.
// e.g. [{ hour: 3, aqi: 5 }, {hour: 6, aqi:4}, {hour: 9, aqi: 3}, ...]
//
// We plot the AQI values as a half-circle graph, with the angle from the left being the hour of the day.
// Start of the day (i.e. 00:00) is at the left edge, noon is at the top of the circle, midnight is at the right edge.
// There are separator lines at 6:00, 12:00 and 18:00.
// The AQI SVG is a 40x40px graphic, with the circle centered at 20,20.
// The circle stroke width is 3px and the circle has no fill. The separator lines are 1px wide.
// The circle is composed of small filled circles with the class names 'aqi-0' to 'aqi-5' corresponding to the AQI values.
function createAQISVG(aqisByHour) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 40 40');
	svg.setAttribute('width', '40');
	svg.setAttribute('height', '40');
	for (var i = 0; i < aqisByHour.length; i++) {
		const aqi = aqisByHour[i];
		// Use an arc that's 3 hours long.
		const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		const arcAngle = 1 + aqi.hour / 24;
		const threeHourAngle = 3 / 24;
		const arcX = 20 + 17 * Math.cos(arcAngle * -Math.PI);
		const arcY = 20 - 17 * Math.sin(arcAngle * -Math.PI);
		const arcX2 = 20 + 17 * Math.cos(Math.min(2, arcAngle + threeHourAngle) * -Math.PI);
		const arcY2 = 20 - 17 * Math.sin(Math.min(2, arcAngle + threeHourAngle) * -Math.PI);
		arc.setAttribute('d', 'M ' + arcX + ' ' + arcY + ' A 17 17 0 0 1 ' + arcX2 + ' ' + arcY2);
		arc.setAttribute('stroke-width', '3');
		arc.setAttribute('stroke-linecap', 'round');
		arc.setAttribute('class', 'aqi-' + aqi.aqi);
		svg.appendChild(arc);
	}
	for (var i = 0; i < 3; i++) {
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', '20');
		line.setAttribute('y1', '1');
		line.setAttribute('x2', '20');
		line.setAttribute('y2', '5');
		line.setAttribute('stroke-width', '1');
		line.setAttribute('stroke', 'white');
		line.setAttribute('transform', 'rotate(' + (-45+i*45) + ' 20 20)');
		svg.appendChild(line);
	}
	return svg;
}

// Test function for createAQISVG.
// Creates 100 AQI graphs with random sets of AQI values.
// Appends the graphs to the document.body for visual inspection.
function testCreateAQISVG() {
	document.body.innerHTML = '';
	for (var i = 0; i < 100; i++) {
		const aqisByHour = [];
		var initialHour = Math.floor(Math.pow(Math.random(), 2)*24);
		var lastHour = initialHour + Math.floor(Math.sqrt(Math.random())*(24 - initialHour));
		for (var j = initialHour; j < lastHour; j += 3) {
			aqisByHour.push({ hour: j, aqi: Math.floor(Math.random() * 6) });
		}
		// Add the parameters and the graph to a new element.
		// Add the element to the document.
		const el = document.createElement('div');
		el.appendChild(createAQISVG(aqisByHour));
		const p = document.createElement('p');
		p.textContent = JSON.stringify(aqisByHour);
		el.appendChild(p);
		document.body.appendChild(el);		
	}
}


// This is the weather HTML element update function.
// It populates the element el with the data from weatherData.
// If weatherData is undefined, it will hide the element.
function populateWeatherElement(el, weatherData) {
	if (!weatherData) {
		el.querySelector('.weather-data-elements').style.display = 'none';
		return;
	}
	el.querySelector('.weather-data-elements').style.display = 'block';
	const c = weatherData;

	el.querySelector('#location').value = c.name.split(",")[0];
	const tempString = formatTemperature(c.temperature);
	const windString = formatWindSpeed(c.windStrength);

	const weatherIcon = document.createElement('span');
	weatherIcon.className = 'wi wi-owm-' + c.weatherData.weather[0].id;

	const temperatureTextEl = document.createElement('span');
	temperatureTextEl.textContent = tempString;

	/*
	const minTempEl = document.createElement('span');
	minTempEl.className = 'min-temperature';

	const maxTempEl = document.createElement('span');
	maxTempEl.className = 'max-temperature';
	*/

	const aqEl = document.createElement('div');
	aqEl.className = 'air-quality aqi-' + c.weatherData.airQuality.main.aqi;
	aqEl.textContent = 'AQI ' + c.weatherData.airQuality.main.aqi;

	const tempEl = el.querySelector('#temperature');
	tempEl.innerHTML = '';
	tempEl.append(weatherIcon, temperatureTextEl, /* maxTempEl, minTempEl, */ aqEl);
	el.querySelector('#cloud-cover').innerHTML = Math.floor(c.cloudCover*100) + '% <i class="wi wi-cloudy"></i>';
	el.querySelector('#wind-speed').innerHTML = windString + ' <i class="wi wi-strong-wind"></i>';
	el.querySelector('#wind-direction-arrow').transform.baseVal.getItem(0).setRotate(c.windDirection, 7.5, 7.5);
	el.querySelector('#weather-desc').textContent = c.weatherData.weather.map(function(wd) {
		return wd.description;
	}).join(", ");

	const fc = c.forecast;
	const dayTemps = fc.list.filter(l => /(12|13|14):00:00.000Z$/.test(new Date((l.dt + fc.city.timezone) * 1e3).toISOString()));
	const forecastElem = el.querySelector('#forecast');
	forecastElem.innerHTML = '';
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
	// minTempEl.textContent = formatTemperature(days[myDay].minTemp);
	// maxTempEl.textContent = formatTemperature(days[myDay].maxTemp);
	weatherIcon.className = 'wi wi-owm-' + days[myDay].weatherCode;
	dayTemps.forEach(f => {
		const itemDay = new Date((f.dt + fc.city.timezone) * 1e3).toISOString().split("T")[0];
		const day = days[itemDay];
		const span = document.createElement('span');
		const tempString = formatTemperature(f.main.temp);
		const minTempString = formatTemperature(day.minTemp);
		const maxTempString = formatTemperature(day.maxTemp);
		span.textContent = new Date((f.dt + fc.city.timezone) * 1e3).toLocaleDateString(navigator.language, { weekday: 'short' })
		span.innerHTML += '<br>' + maxTempString;
		const icon = document.createElement('span');
		icon.className = 'weather-icon wi wi-owm-' + day.weatherCode + ' aqi-' + day.maxAQI;
		icon.appendChild(createAQISVG(day.aqis));
		span.appendChild(icon);
		span.appendChild(document.createTextNode(" " + minTempString));
		forecastElem.appendChild(span);
	});

	forecastElem.onclick = function(ev) {
		ev.preventDefault();
		const c = el.querySelector('#weather-graph');
		if (c.style.display !== 'block') {
			dataLayer.push({event: 'forecast', action: 'opened'});
			c.style.display = 'block';
		} else {
			dataLayer.push({event: 'forecast', action: 'closed'});
			c.style.display = 'none';
		}
	}

	{ 
		const hours = fc.list.map(l => parseInt(new Date((l.dt + fc.city.timezone) * 1e3).toISOString().match(/T(\d+)/)[1]));
		const dayIndexes = [];
		for (let i = 0; i < hours.length; i++) { 
			const h = hours[i]; 
			if (h < 3) dayIndexes.push(i - h/3);
		}
		const weatherGraph = el.querySelector('#weather-graph');
		if (!weatherGraph.ctx) {
			weatherGraph.ctx = weatherGraph.getContext('2d');
			weatherGraph.ctx.scale(2,2);
			weatherGraph.onclick = function(ev) {
				const box = weatherGraph.getBoundingClientRect();
				const x = (ev.clientX - box.x) / box.width;
				const y = (ev.clientY - box.y) / box.height;
				dataLayer.push({event: 'weather-graph-click', x: x, y: y});
			};
		}
		const ctx = weatherGraph.ctx;
		ctx.font = '700 24px "Roboto Condensed","roboto-condensed","Helvetica Neue","Segoe UI",sans-serif'
		const line = (ctx, label, color, off, values, dayIndexes, minV=Infinity, maxV=-Infinity, height=40) => {
			off = off / 60 * 80;
			if (!values[0].length) values = values.map(v => [v]);
			let vl = values[0].length;
			if (!(color instanceof Array)) color = [color];
			const fvalues= values.flat();
			let maxIdx = 0;
			let minIdx = 0;
			fvalues.forEach((v,i) => {
				if (v > maxV) {
					maxV = v;
					maxIdx = i;
				}
				if (v < minV) {
					minV = v;
					minIdx = i;
				}
			});
			const dV = (maxV - minV) || 1;
			ctx.fillStyle = color[color.length-1];
			dayIndexes.forEach(idx => idx >= 0 && idx < values.length && ctx.fillRect(120 + idx*10, off - height*(fractSample2DArray(values, 0, idx)-minV)/dV, 2, 10));
			const txt = label + " " + (fvalues[0]|0);
			ctx.fillText(txt, 120-ctx.measureText(txt).width-5, 7+off - height*(fvalues[0]-minV)/dV);
			ctx.fillText(fvalues[fvalues.length-1]|0, 492+24, 7+off - height*(fvalues[fvalues.length-1]-minV)/dV);
			if (maxIdx > 0 && maxIdx < fvalues.length-1) ctx.fillText(maxV|0, 120+((maxIdx/vl)|0)*10, -5+off - height*(maxV-minV)/dV);
			if (minIdx > 0 && minIdx < fvalues.length-1) ctx.fillText(minV|0, 120+((minIdx/vl)|0)*10, 20+off - height*(minV-minV)/dV);
			for(let j=0; j < vl; j++){
				ctx.beginPath();
				values.forEach((v,i) => ctx.lineTo(120+i*10, off - height*(v[j]-minV)/dV));
				ctx.strokeStyle = color[j];
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		}

		ctx.clearRect(0,0,600,600); 

		line(ctx, 'Temp', ['#822','#C22'], 60, fc.list.map(f => [f.main.temp,f.main.feels_like]), dayIndexes);

		line(ctx, 'Wind', ['#840','#C80'], 120, fc.list.map(f => [f.wind.speed,f.wind.gust]), dayIndexes);
		
		line(ctx, 'Rain', '#44C', 180, fc.list.map(f => f.rain ? f.rain['3h'] : 0), dayIndexes, 0, 2);
		line(ctx, 'Pres', '#4C8', 240, fc.list.map(f => f.main.pressure), dayIndexes);		
		line(ctx, 'Cloud', '#888', 300, fc.list.map(f => f.clouds.all), dayIndexes, 0, 100);
		line(ctx, 'Humid', '#49F', 360, fc.list.map(f => f.main.humidity), dayIndexes);

		// line(ctx, 'Vis', '#088', 420, fc.list.map(f => Math.round(f.visibility/1000)), dayIndexes);
	}

	// Weather warnings. Log to console for now.
	// The weather warnings are for things like thunderstorms, heavy rain, heavy snow, hot weather, high winds and cold weather.
	// If the feels_like temperature is above 40C, there's a hot weather warning.
	// If the feels_like temperature is above 45C, there's an extreme heat warning.
	// If the feels_like temperature is above 50C, there's a deadly heat warning.
	// If the feels_like temperature is below -20C, there's a cold weather warning.
	// If the feels_like temperature is below -30C, there's a extreme cold warning.
	// If the feels_like temperature is below -60C, there's a penguin.
	// If the wind speed is above 15 m/s, there's a high wind warning.
	// If the wind speed is above 20 m/s, there's a storm warning.
	// If the wind speed is above 30 m/s, there's a typhoon warning.
	// If the rain amount is above 30 mm/h, there's a yellow rain warning.
	// If the rain amount is above 50 mm/h, there's a red rain warning.
	// If the rain amount is above 70 mm/h, there's a black rain warning.
	{
		const warnings = [];
		if (c.weatherData.weather.some(wd => wd.id >= 200 && wd.id < 300)) warnings.push('thunderstorm');
		// console.log(c.weatherData);
		// heat
		if (c.weatherData.feels_like > 40) warnings.push('hot');
		if (c.weatherData.feels_like > 45) warnings.push('extreme heat');
		if (c.weatherData.feels_like > 50) warnings.push('deadly heat');
		// cold
		if (c.weatherData.feels_like < -20) warnings.push('cold');
		if (c.weatherData.feels_like < -30) warnings.push('extreme cold');
		if (c.weatherData.feels_like < -60) warnings.push('penguin');
		// wind
		if (c.weatherData.wind.speed > 15) warnings.push('high wind');
		if (c.weatherData.wind.speed > 20) warnings.push('storm');
		if (c.weatherData.wind.speed > 30) warnings.push('typhoon');
		// rain
		if (c.weatherData.rain && c.weatherData.rain['3h'] > 3*30) warnings.push('yellow rain');
		if (c.weatherData.rain && c.weatherData.rain['3h'] > 3*50) warnings.push('red rain');
		if (c.weatherData.rain && c.weatherData.rain['3h'] > 3*70) warnings.push('black rain');
		if (warnings.length > 0) {
			console.log("Warnings", warnings);
		}
	}

	// Hourly forecast.
	// The hourly forecast buckets contiguous similar weather together.
	// The buckets are separated by a change in weather.
	// E.g. {start: 12, weather: 800, temp: 20, wind: 5}, {start: 21, weather: 501, temp: 16, wind: 3}, ...
	// To give you important information front and center, the visualization de-emphasizes clear and cloudy weather and emphasizes warnings, rain, thunder, etc.
	{
		// This is a string of hours formatted as [+-]0000-2359 (-2359, -2358, ..., -0100, -0000, +0000, +0100, ..., +2359)
		const timeZoneMinutesInt = Math.round(fc.city.timezone / 60);
		let timeZoneMinutes = timeZoneMinutesInt % 60;
		if (timeZoneMinutes < 0) timeZoneMinutes += 60;
		const timeZoneHoursInt = Math.floor(Math.abs(timeZoneMinutesInt) / 60) * Math.sign(timeZoneMinutesInt);

		const timeZone = (timeZoneHoursInt >= 0 ? '+' : '-') + Math.abs(timeZoneHoursInt).toString().padStart(2, '0') + timeZoneMinutes.toString().padStart(2, '0');

		const forecast = [
			{start: c.weatherData.dt, weather: c.weatherData.weather[0].id, temp: c.weatherData.main.temp, wind: c.weatherData.wind.speed, elapsed: (c.weatherData.dt-Math.round(Date.now()/1e3)) / 3600}
		];
		fc.list.forEach((l, i) => {
			const prev = fc.list[i-1] || c.weatherData;
			const prevFC = forecast[forecast.length-1];
			if (!prev || l.weather[0].id !== prev.weather[0].id || Math.abs(l.main.temp - prevFC.temp) > 3 || Math.abs(l.wind.speed - prevFC.wind) > 3) {
				forecast.push({start: l.dt, weather: l.weather[0].id, temp: l.main.temp, wind: l.wind.speed, elapsed: (l.dt-Math.round(Date.now()/1e3)) / 3600});
			}
		});
		
		// For debugging and testing title condensing logic.
		const condensedForecast = [];
		forecast.forEach((f, i) => {
			const wd = weatherCodeNames[f.weather];
			// If the previous weather belongs to the same group and has intensity below 3, skip this weather.
			if (i > 0 && weatherCodeNames[forecast[i-1].weather].group === wd.group && weatherCodeNames[forecast[i-1].weather].intensity < 3 && wd.intensity < 3) {
				return;
			}
			const dayOfWeekString = new Date(f.start * 1e3).toLocaleDateString(navigator.language, { weekday: 'short', timeZone });
			const date = new Date((f.start + fc.city.timezone) * 1e3);
			condensedForecast.push({
				start: f.start, hour: date.getUTCHours(), day: dayOfWeekString, 
				weather: f.weather, title: wd.title, intensity: wd.intensity, group: wd.group,
				temp: f.temp, wind: f.wind, elapsed: f.elapsed
			});
		});

		// Add end times to the forecast items. This is the start time of the next item or +3 hours for the last one.
		forecast.forEach((f, i) => {
			f.end = forecast[i+1] ? forecast[i+1].start : f.start + 3*3600;
		});
		condensedForecast.forEach((f, i) => {
			f.end = condensedForecast[i+1] ? condensedForecast[i+1].start : f.start + 3*3600;
		});

		// Create a visualization of the forecast.
		// This is a color bar with the weather code color, a title and time at condensed forecast start.
		// Above the bar is the time, under is the weather icon.
		// One hour is 10px wide, the bar is 8px tall.
		const container = document.createElement('div');
		container.className = 'forecast-container';
		let currentLeft = 0;
		forecast.forEach((f,i) => {
			const div = document.createElement('div');
			div.className = `forecast-item`;
			const bg = document.createElement('div');
			bg.className = `forecast-bg ${weatherCodeNames[f.weather].group} i-${weatherCodeNames[f.weather].intensity}`;
			div.appendChild(bg);
			div.style.left = currentLeft + 'px';
			const width = Math.floor((f.end - f.start) / 3600) * 11;
			div.style.width = width + 'px';
			currentLeft += width;
			container.appendChild(div);
			const wd = weatherCodeNames[f.weather];
			if (i > 0 && weatherCodeNames[forecast[i-1].weather].group === wd.group && weatherCodeNames[forecast[i-1].weather].intensity < 3 && wd.intensity < 3) {
				return;
			}
			if (width < 33) {
				return;
			}
			const date = new Date((f.start + fc.city.timezone) * 1e3);
			// Add the time.
			const time = document.createElement('div');
			time.className = 'forecast-time';
			time.textContent = date.getUTCHours();
			div.appendChild(time);
			// Add the weather icon.
			const icon = document.createElement('span');
			// If the intensity is 1, use the intensity 2 icon if one exists.
			let iconNumber = f.weather;
			if (wd.intensity === 1 && weatherCodeNames[f.weather+1] && weatherCodeNames[f.weather+1].intensity === 2) {
				iconNumber = f.weather + 1;
			}
			icon.className = 'wi wi-owm-' + iconNumber;
			div.appendChild(icon);
		});
		// Create day labels for the forecast.
		let dayTime = forecast[0].start;
		while (dayTime < forecast[forecast.length-1].end) {
			const left = Math.floor((dayTime - forecast[0].start) / 3600) * 11;
			if (left > 0 && left < 33) {
				container.lastChild.remove();
			}
			const dayOfWeekString = new Date(dayTime * 1e3).toLocaleDateString(navigator.language, { weekday: 'short', timeZone });
			const div = document.createElement('div');
			div.className = 'forecast-day';
			div.textContent = dayOfWeekString;
			div.style.left = left + 'px';
			container.appendChild(div);

			dayTime = new Date((dayTime + fc.city.timezone) * 1e3).setUTCHours(24).valueOf() / 1e3 - fc.city.timezone;
		}

		let wg = el.querySelector('#hourly-forecast');
		if (!wg) {
			wg = document.createElement('div');
			wg.id = 'hourly-forecast';
			tempEl.parentNode.insertBefore(wg, tempEl.nextSibling);
		}
		wg.innerHTML = '';
		wg.appendChild(container);

		// console.log("Hourly forecast", forecast, condensedForecast, container);
	}
}

var setWeather = function(elapsed) {
	weatherTimer += elapsed;
	var fade = 0;
	if (weatherTimer > cityChangeDuration && currentCityIndex !== targetCityIndex) {
		weatherTimer = 0;
		currentCityIndex = targetCityIndex;
		weatherUpdateTriggered = true;
	}
	if (weatherUpdateTriggered || (currentCityIndex === -1 && targetCityIndex !== -1)) {
		weatherUpdateTriggered = false;
		const c = cities[cityNames[targetCityIndex]] || cities[cityNames[currentCityIndex]] || zeroCity;
		document.getElementById('location').value = (cityNames[targetCityIndex] || cityNames[currentCityIndex] || "").split(",")[0];
		if (!c.name) c.name = (cityNames[targetCityIndex] || cityNames[currentCityIndex] || "");

		populateWeatherElement(weatherTickDataElement, c);

		// Update window title.
		// if (currentCityIndex === 0) {
		// 	var temp = Math.round(c.temperature) + 'C';
		// 	var desc = c.weatherData.weather.map(function(wd) {
		// 		return wd.description;
		// 	}).join(", ");
		// 	document.title = temp + ', ' + desc + ' - ' + cityNames[currentCityIndex] + ' Weather';
		// }

		var sunriseEl = document.getElementById('sunrise');
		var sunsetEl = document.getElementById('sunset');

		var t = new Date();
		var tzOff = c.weatherData.timezone;
		tzOff += t.getTimezoneOffset() * 60;
		t = new Date(Date.now() + tzOff * 1000);

		var sunrise = new Date(c.weatherData.sys.sunrise * 1000 + tzOff * 1000);
		var sunset = new Date(c.weatherData.sys.sunset * 1000 + tzOff * 1000);
		sunriseEl.querySelector('.time').textContent = sunrise.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});
		sunsetEl.querySelector('.time').textContent = sunset.toLocaleTimeString(navigator.language, {hour:'numeric', minute:'numeric'});

		const weatherDataElement = document.getElementById('weather-data');
		if (currentCityIndex === -1) {
			weatherDataElement.classList.add('transition-0');
		} else {
			weatherDataElement.classList.remove('transition-0');
		}
		weatherDataElement.classList.remove('fade-out');
		document.getElementById('time-data').classList.remove('fade-out');

	}

	if (weatherTimer <= cityChangeDuration && currentCityIndex !== targetCityIndex) {
		fade = weatherTimer / cityChangeDuration;
		fade = 0.5 - 0.5*Math.cos(fade*Math.PI);
		if (currentCityIndex !== -1 && !instantWeatherDataRefresh) {
			document.getElementById('weather-data').classList.add('fade-out');
			document.getElementById('time-data').classList.add('fade-out');
		}
	} else {
		instantWeatherDataRefresh = false;
	}

	var c0 = cities[cityNames[currentCityIndex]] || zeroCity;
	var c1 = cities[cityNames[targetCityIndex]] || c0;

	shaderMat.uniforms.ufCloudCover.value = c1.cloudCover * fade + c0.cloudCover * (1-fade);
	rainShaderMat.uniforms.ufRainAmount.value = c1.rainAmount * fade + c0.rainAmount * (1-fade);

	windStrength = (c1.windStrength * fade + c0.windStrength * (1-fade));
	windDirection = angleLerp(c0.windDirection/180, c1.windDirection/180, fade) * 180;

	shaderMat.uniforms.ufSunPosition.value = angleLerp(getSunPosition(c0), getSunPosition(c1), fade);

	// Base dark text mode on screen width:
	//  - narrow screens need dark text most of the day
	//  - wide screens only need dark text in the morning
	//  - squat screens need dark text most of the time
	var aspect = (shaderMat.uniforms.uv2Resolution.value.x / shaderMat.uniforms.uv2Resolution.value.y);
	if (shaderMat.uniforms.ufSunPosition.value > -0.05 && shaderMat.uniforms.ufSunPosition.value < 0.95 && // daytime
		true // shaderMat.uniforms.ufSunPosition.value < (document.body.offsetHeight < 360 ? 0.95 : (aspect > 3/4 ? 0.5 : 0.92)) // tweak based on screen size
	) {
		document.body.classList.add('daytime');
	} else {
		document.body.classList.remove('daytime');		
	}

	if (shaderMat.uniforms.ufSunPosition.value > 0.05 && shaderMat.uniforms.ufSunPosition.value < 0.95 && // daytime
		shaderMat.uniforms.ufSunPosition.value > (document.body.offsetHeight < 360 ? 0.05 : (aspect > 3/4 ? 0.5 : 0.08)) // tweak based on screen size
	) {
		document.body.classList.add('daytime-left');
	} else {
		document.body.classList.remove('daytime-left');		
	}

	wdOffTarget = (0.5-Math.random()) * windStrength / 20 * 0.4;
	wdOff += 0.1 * (wdOffTarget - wdOff)

	wsOffTarget = (Math.random()*0.01) * windStrength / 20 * 0.4;
	wsOff += 0.1 * (wsOffTarget - wsOff);

	// Wind direction is the direction from where the wind blows.
	shaderMat.uniforms.ufWindDirection.value = Math.PI + windDirection / 180 * Math.PI;
	shaderMat.uniforms.ufWindStrength.value = windStrength / 20 * 0.4;

	var windFactor = (elapsed / 1000) * (10.0 * shaderMat.uniforms.ufWindStrength.value);
	windOffset.x += -Math.cos(shaderMat.uniforms.ufWindDirection.value) * windFactor;
	windOffset.y += -0.2 * windFactor;
	windOffset.z += -Math.sin(shaderMat.uniforms.ufWindDirection.value) * windFactor;
	shaderMat.uniforms.uv3WindOffset.value = windOffset;

	// Add ground effect noise to wind for the rain & grass.
	rainShaderMat.uniforms.ufWindDirection.value = Math.PI + windDirection / 180 * Math.PI + wdOff;
	rainShaderMat.uniforms.ufWindStrength.value = windStrength / 20 * 0.4 + wsOff;

	cornShaderMat.uniforms.ufImpulse.value = 0.00; // Math.max(-1, -0.5*Math.cos(Math.PI*((2*timeOfDay / 86400) % 2)) - 0.5);
};

var windOffset = new THREE.Vector3();