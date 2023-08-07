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