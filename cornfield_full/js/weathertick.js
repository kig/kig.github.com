
var wdOff = 0;
var wdOffTarget = 0;
var wsOff = 0;
var wsOffTarget = 0;
var windDirection = 0, windStrength = 0;
var weatherTimer = 0;

var targetCityIndex = 0;

var cityChangeDuration = 3000;
var weatherUpdateTriggered = false;
var windArrow = document.getElementById('wind-direction-arrow').transform.baseVal.getItem(0);

var setWeather = function() {
	weatherTimer += 16;
	var fade = 0;
	if (weatherTimer > cityChangeDuration && currentCityIndex !== targetCityIndex) {
		weatherTimer = 0;
		currentCityIndex = targetCityIndex;
		weatherUpdateTriggered = true;
	}
	if (weatherUpdateTriggered) {
		weatherUpdateTriggered = false;
		var c = cities[cityNames[currentCityIndex]] || zeroCity;
		document.getElementById('city').value = cityNames[currentCityIndex].split(",")[0];
		document.getElementById('temperature').textContent = Math.round(c.temperature) + '°C';
		document.getElementById('cloud-cover').textContent = 'clouds ' + Math.floor(c.cloudCover*100) + '%';
		document.getElementById('wind-speed').textContent = 'wind ' + Math.floor(c.windStrength*10)/10 + ' m/s';
		document.getElementById('wind-direction-arrow').transform.baseVal.getItem(0).setRotate(c.windDirection, 7.5, 7.5);
		document.getElementById('weather-desc').textContent = c.weatherData.weather.map(function(wd) {
			return wd.description;
		}).join(", ");
		document.getElementById('weather-data').classList.remove('fade-out');

		// Update window title.
		// if (currentCityIndex === 0) {
		// 	var temp = Math.round(c.temperature) + 'C';
		// 	var desc = c.weatherData.weather.map(function(wd) {
		// 		return wd.description;
		// 	}).join(", ");
		// 	document.title = temp + ', ' + desc + ' - ' + cityNames[currentCityIndex] + ' Weather';
		// }
	}

	if (weatherTimer <= cityChangeDuration && currentCityIndex !== targetCityIndex) {
		fade = weatherTimer / cityChangeDuration;
		fade = 0.5 - 0.5*Math.cos(fade*Math.PI);
		document.getElementById('weather-data').classList.add('fade-out');
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

	if (shaderMat.uniforms.ufSunPosition.value > 0.0 && shaderMat.uniforms.ufSunPosition.value < 1.0) {
		document.body.classList.add('daytime');
	} else {
		document.body.classList.remove('daytime');		
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

