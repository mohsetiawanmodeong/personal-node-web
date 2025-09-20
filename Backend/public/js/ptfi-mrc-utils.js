function get_url_param(name, vDefault) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null) return vDefault;
    else return results[1];
}

//Convert MAP to Array.
function getArray(vMap) {
    var vArray = [];

    for (const [name, value] of vMap) {
        vArray.push(value);
    }
    return vArray;
}

function millisecondsToStrTime8Char(milliseconds) {
    if (milliseconds < 0) {
        return "ERR:" + milliseconds + ".";
    }
    let temp = milliseconds / 1000;
    const years = Math.floor(temp / 31536000),
        days = Math.floor((temp %= 31536000) / 86400),
        hours = Math.floor((temp %= 86400) / 3600),
        minutes = Math.floor((temp %= 3600) / 60),
        seconds = temp % 60;

    if (days || hours || seconds || minutes) {
        return (years ? years + "y " : "") +
            (days ? days + "d " : "") +
            ('00' + Number.parseFloat(hours).toFixed(0)).slice(-2) + ":" +
            ('00' + Number.parseFloat(minutes).toFixed(0)).slice(-2) + ":" +
            ('00' + Number.parseFloat(seconds).toFixed(0)).slice(-2) + "";
    }
    return "00:00:00";
}

//So can stringify circular references.
const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null && key !== "_events") {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
}

function angleFromCoordinate(lat1, lng1, lat2, lng2) {
    //var angleRadians = Math.atan2(lng2 - lng1, lat2 - lat1);
    var angleDeg = Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI;
    angleDeg = (angleDeg - 90 + 360) % 360;
    angleDeg = 360 - angleDeg;
    return angleDeg;
    /*var angleDeg = Math.atan2(
    var dLon = (lng2 - lng1);
    var y = Math.sin(dLon)*Math.cos(lat2);
    var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    var brng = Math.atan2(y,x);
    brng = Math.toDegrees(brng);
    brng = (brng + 360) % 360;
    return brng;*/
}

function absAngle(a) {
    return (360 + (a % 360)) % 360;
}

function angleDelta(angleDegOld, angleDegNew) {
    //let delta = Math.abs(absAngle(angleDegOld) - absAngle(angleDegNew));
    //let sign = absAngle(angleDegOld) > absAngle(angleDegNew) || delta >= 180 ? -1 : 1;
    //return (180 - Math.abs(delta - 180)) * sign;
    return Math.abs((angleDegNew - angleDegOld) % 360);
}

function angleFromCoordinateNoFlip(lat1, lng1, lat2, lng2, vCurrentHeading) {
    let angleNew = angleFromCoordinate(lat1, lng1, lat2, lng2);
    if (absAngle(angleDelta(vCurrentHeading, angleNew)) > 90) {
        angleNew = angleNew - 180;
        if (angleNew < 0) {
            angleNew = 360 + angleNew;
        }
    }
    return angleNew;
}

function createTrackIcon(vFeature, vNewLatLng) {
    //console.log("ID["+vFeature.id+"]Making ICON Marker.");
    var cssClass = 'lp-marker';
    var iconSize = [vFeature.config.sizex, vFeature.config.sizey];
    var icon = L.divIcon({
        className: cssClass,
        html: vFeature.properties.name,
        iconSize: iconSize
    });
    var vNewMarker = L.marker(vNewLatLng, {
        title: vFeature.properties.name,
        icon: icon
    });
    return vNewMarker;
}

function createTrackMarker(vFeature, vNewLatLng, scale) {
    var vIconSizeX = Math.round(parseInt(vFeature.config.sizex) * scale);
    var vIconSizeY = Math.round(parseInt(vFeature.config.sizey) * scale);
    var vIconAnchorX = vIconSizeX / 2;
    var vIconAnchorY = vIconSizeY / 2;
	var vImageURL = vFeature.config.imageurl;
    if ( vShowPersonnelCircle && vFeature.config.imagecircleurl){
    	vImageURL = "" + vFeature.config.imagecircleurl;
    }
    //if (! vFeature.properties.role || vFeature.properties.role === "undefined" ){
    //	vFeature.properties.role="worker";
    //}
	if (vFeature.config.articulated){
		console.log("Making an articulated Machine...");
		var vBaseImageURL = vImageURL.split('.')[0];
        var vHTML = '<div class="marker-back" style="padding: 0px 0px 0px 0px;border: 0px 0px 0px 0px;transform: translateX(0px) translateY(0px);width:' + vIconSizeX + 'px; height:' + vIconSizeY + 'px;"> ';
        vHTML = vHTML + '<img style="display:block; vertical-align: bottom;" width="'+vIconSizeX+'" height="'+vIconSizeY+'" src="'+vBaseImageURL+'-back.svg"> </div>';
        vHTML = vHTML + '<div class="marker-front" style="padding: 0px 0px 0px 0px;border: 0px 0px 0px 0px;margin-left:0px;margin-top:-'+vIconSizeY+'px;width:'+vIconSizeX+'px; height:'+vIconSizeY+'px;"> ';
        vHTML = vHTML + '<img style="display:block; vertical-align: bottom;" width="'+vIconSizeX+'" height="'+vIconSizeY+'" src="'+vBaseImageURL+'-front.svg"> </div>';
        var vDivIcon = L.divIcon({
                        iconSize: [vIconSizeX, vIconSizeY],
                        html: vHTML,
                        //bgPos: [0, 0],
                        //iconUrl: vImageURL,
                        //shadowUrl: '',
                        //shadowSize: [0, 0],
                        iconAnchor: [vIconAnchorX, vIconAnchorY],
                        //shadowAnchor: [32, 9],
                        popupAnchor: [0, 0],
                        className: 'machine' + vFeature.id,
                        //role: vFeature.properties.role.toLowerCase()
                });
		vNewMarker = L.Marker.movingMarker([vNewLatLng], [], {
        	'icon': vDivIcon,
        	title: vFeature.properties.name,
        	clickable: true,
        	draggable: false,
        	rotationAngle: convertHeading(vFeature.properties.heading),
			articulationAngle: vFeature.properties.steering_angle,
        	rotationOrigin: '50% 50%',
        	//role: vFeature.properties.role.toLowerCase()//,
    	});
	}else{
    	vNewMarker = L.Marker.movingMarker([vNewLatLng], [], {
        	'icon': L.icon({
            	iconUrl: vImageURL,
            	shadowUrl: '',
            	iconSize: [vIconSizeX, vIconSizeY],
            	shadowSize: [0, 0],
            	iconAnchor: [vIconAnchorX, vIconAnchorY],
            	shadowAnchor: [32, 9],
            	popupAnchor: [0, 0],
            	className: 'machine' + vFeature.id,
            	//role: vFeature.properties.role.toLowerCase()
        	}),
        	title: vFeature.properties.name,
        	clickable: true,
        	draggable: false,
        	rotationAngle: convertHeading(vFeature.properties.heading),
        	rotationOrigin: '50% 50%',
        	//role: vFeature.properties.role.toLowerCase()//,
    	});
	}
    vNewMarker.calcHeading = vFeature.config.calcheading;
    return vNewMarker;
}

function convertHeading(vAngle) {
    var vNewAngle = -vAngle + vRotation;
    if (vNewAngle < 0) {
        vNewAngle = 360 + vNewAngle;
    }
    if (vNewAngle >= 360) {
        vNewAngle = vNewAngle - 360;
    }
    return Math.round(vNewAngle);
}

function calculateNewHeading(vHeading, vCurrentLatLng, vNewLatLng) {
    var vNewHeading = vHeading;
    var vNewHeadingCalc1 = 0;
    var vNewHeadingCalc2 = 0;
    vNewHeading = angleFromCoordinateNoFlip(vCurrentLatLng.lat, vCurrentLatLng.lng, vNewLatLng.lat, vNewLatLng.lng, vHeading);
    vNewHeadingCalc1 = vNewHeading;
    //HACK for fleet to use the MO heading to figure out the direction of travel.
    if (vHeading != 0) {
        if (absAngle(angleDelta(vNewHeading, vHeading)) > 150) {
            vNewHeading = vNewHeading - 180;
            if (vNewHeading < 0) {
                vNewHeading = 360 + vNewHeading;
            }
        }
    }
    vNewHeadingCalc2 = vNewHeading;
    if (absAngle(angleDelta(vNewHeading, vHeading)) > 30) {
        if (angleDelta(vNewHeading, vHeading) < 0) {
            vNewHeading = vHeading - 30;
        } else {
            vNewHeading = vHeading + 30;
        }
        if (vNewHeading < 0) {
            vNewHeading = 360 + vNewHeading;
        }
        if (vNewHeading > 360) {
            vNewHeading = vNewHeading - 360;
        }
    }
    return vNewHeading;
}
