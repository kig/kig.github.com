
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

var cityChangeDuration = 3000;
var weatherUpdateTriggered = false;
var windArrow = document.getElementById('wind-direction-arrow').transform.baseVal.getItem(0);

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
		const c = cities[cityNames[currentCityIndex]] || cities[cityNames[targetCityIndex]] || zeroCity;
		document.getElementById('location').value = (cityNames[currentCityIndex] || cityNames[targetCityIndex] || "").split(",")[0];
		const tempString = formatTemperature(c.temperature);
		const windString = formatWindSpeed(c.windStrength);

		const weatherIcon = document.createElement('span');
		weatherIcon.className = 'wi wi-owm-' + c.weatherData.weather[0].id;

		const temperatureTextEl = document.createElement('span');
		temperatureTextEl.textContent = tempString;

		const minTempEl = document.createElement('span');
		minTempEl.className = 'min-temperature';

		const maxTempEl = document.createElement('span');
		maxTempEl.className = 'max-temperature';

		const tempEl = document.getElementById('temperature');
		tempEl.innerHTML = '';
		tempEl.append(weatherIcon, temperatureTextEl, maxTempEl, minTempEl);
		document.getElementById('cloud-cover').innerHTML = Math.floor(c.cloudCover*100) + '% <i class="wi wi-cloudy"></i>';
		document.getElementById('wind-speed').innerHTML = windString + ' <i class="wi wi-strong-wind"></i>';
		document.getElementById('wind-direction-arrow').transform.baseVal.getItem(0).setRotate(c.windDirection, 7.5, 7.5);
		document.getElementById('weather-desc').textContent = c.weatherData.weather.map(function(wd) {
			return wd.description;
		}).join(", ");

		const fc = c.forecast;
		const dayTemps = fc.list.filter(l => /(12|13|14):00:00.000Z$/.test(new Date((l.dt + fc.city.timezone) * 1e3).toISOString()));
		const forecastElem = document.getElementById('forecast');
		forecastElem.innerHTML = '';
		const days = {};
		const myDay = new Date((c.weatherData.dt + c.weatherData.timezone) * 1e3).toISOString().split("T")[0];
		days[myDay] = {minTemp: c.weatherData.main.temp, maxTemp: c.weatherData.main.temp, weatherCode: c.weatherData.weather[0].id};
		if (fc.list.length > 0) {
			fc.list.forEach(l => {
				const itemDay = new Date((l.dt + fc.city.timezone) * 1e3).toISOString().split("T")[0];
				if (!days[itemDay]) {
					days[itemDay] = {minTemp: l.main.temp, maxTemp: l.main.temp, weatherCode: l.weather[0].id};
				} else {
					if (days[itemDay].minTemp > l.main.temp) days[itemDay].minTemp = l.main.temp;
					if (days[itemDay].maxTemp < l.main.temp) days[itemDay].maxTemp = l.main.temp;
					if (weatherCodeCompare(days[itemDay].weatherCode, l.weather[0].id) > 0) days[itemDay].weatherCode = l.weather[0].id;
				}
			});
		}
		minTempEl.textContent = formatTemperature(days[myDay].minTemp);
		maxTempEl.textContent = formatTemperature(days[myDay].maxTemp);
		weatherIcon.className = 'wi wi-owm-' + days[myDay].weatherCode;
		dayTemps.forEach(f => {
			const itemDay = new Date((f.dt + fc.city.timezone) * 1e3).toISOString().split("T")[0];
			const day = days[itemDay];
			const span = document.createElement('span');
			const tempString = formatTemperature(f.main.temp);
			const minTempString = formatTemperature(day.minTemp);
			const maxTempString = formatTemperature(day.maxTemp);
			span.textContent = new Date((f.dt + fc.city.timezone) * 1e3).toLocaleDateString(navigator.language, { weekday: 'short' }) + ' ' + maxTempString;
			const icon = document.createElement('span');
			icon.className = 'weather-icon wi wi-owm-' + day.weatherCode;
			span.appendChild(icon);
			span.appendChild(document.createTextNode(" " + minTempString));
			forecastElem.appendChild(span);
		});

		forecastElem.onclick = function(ev) {
			ev.preventDefault();
			const c = document.getElementById('weather-graph');
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
			const weatherGraph = document.getElementById('weather-graph');
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
			
			line(ctx, 'Rain', '#44C', 180, fc.list.map(f => f.rain ? f.rain['3h'] : 0), dayIndexes, 0, 12);
			line(ctx, 'Pres', '#4C8', 240, fc.list.map(f => f.main.pressure), dayIndexes);		
			line(ctx, 'Cloud', '#888', 300, fc.list.map(f => f.clouds.all), dayIndexes, 0, 100);
			line(ctx, 'Humid', '#49F', 360, fc.list.map(f => f.main.humidity), dayIndexes);

			// line(ctx, 'Vis', '#088', 420, fc.list.map(f => Math.round(f.visibility/1000)), dayIndexes);
		}
		// Update window title.
		// if (currentCityIndex === 0) {
		// 	var temp = Math.round(c.temperature) + 'C';
		// 	var desc = c.weatherData.weather.map(function(wd) {
		// 		return wd.description;
		// 	}).join(", ");
		// 	document.title = temp + ', ' + desc + ' - ' + cityNames[currentCityIndex] + ' Weather';
		// }

		const wd = document.getElementById('weather-data');
		if (currentCityIndex === -1) {
			wd.classList.add('transition-0');
		} else {
			wd.classList.remove('transition-0');
		}
		wd.classList.remove('fade-out');

	}

	if (weatherTimer <= cityChangeDuration && currentCityIndex !== targetCityIndex) {
		fade = weatherTimer / cityChangeDuration;
		fade = 0.5 - 0.5*Math.cos(fade*Math.PI);
		if (currentCityIndex !== -1) {
			document.getElementById('weather-data').classList.add('fade-out');
		}
	}

	var c0 = cities[cityNames[currentCityIndex]] || zeroCity;
	var c1 = cities[cityNames[targetCityIndex]] || c0;

	shaderMat.uniforms.ufCloudCover.value = c1.cloudCover * fade + c0.cloudCover * (1-fade);
	rainShaderMat.uniforms.ufRainAmount.value = c1.rainAmount * fade + c0.rainAmount * (1-fade);

	windStrength = (c1.windStrength * fade + c0.windStrength * (1-fade));
	windDirection = (c1.windDirection * fade + c0.windDirection * (1-fade));

	var sunrise = c1.sunrise * fade + c0.sunrise * (1-fade);
	var sunset = c1.sunset * fade + c0.sunset * (1-fade);

	var lengthOfDay = sunset-sunrise;
	var noon = (sunrise + lengthOfDay/2);
	var zeroHour = noon - 12 * 3600;
	var timeOfDay = (-6 * 3600 + Date.now() / 1000 - zeroHour);
	shaderMat.uniforms.ufSunPosition.value = 2*timeOfDay / 86400; // 0 = left = 6:00, 0.5 = up = 12:00, 1 = right = 18:00, 1.5 = down = 24:00
	// shaderMat.uniforms.ufSunPosition.value = (Date.now() / 3000) % 2;

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
	// Add ground effect noise to wind for the rain & grass.
	rainShaderMat.uniforms.ufWindDirection.value = Math.PI + windDirection / 180 * Math.PI + wdOff;
	rainShaderMat.uniforms.ufWindStrength.value = windStrength / 20 * 0.4 + wsOff;
	windArrow.setRotate(windDirection, 7.5, 7.5);

	cornShaderMat.uniforms.ufImpulse.value = 0.00; // Math.max(-1, -0.5*Math.cos(Math.PI*((2*timeOfDay / 86400) % 2)) - 0.5);
};

