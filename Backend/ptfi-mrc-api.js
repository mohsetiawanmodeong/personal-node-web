//COMMON UGTECH-MRC API FUNCTIONS 
function getCMDConsoleDetails(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleDetails";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDConsoleDetails: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDConsoleDetials:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getCMDConsoleEventData(vMachine_Name, vStartTime, vEndTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vEnd = new Date(vEndTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleEvent?machine_name=" + vMachine_Name + "&startdatetime=" + vStart + "&enddatetime=" + vEnd + "&timeinclusion=either";
    if (vMachine_Name == "") {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleEvent?startdatetime=" + vStart + "&enddatetime=" + vEnd + "&timeinclusion=either";
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDConsoleEventData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDConsoleEventData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getCMDConsoleEventDataAtTime(vMachine_Name, vStartTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleEventAtTime?machine_name=" + vMachine_Name + "&startdatetime=" + vStart + "";
    if (vMachine_Name == "") {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleEventAtTime?startdatetime=" + vStart + "";
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDConsoleEventData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDConsoleEventData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getCMDConsoleEventCurrentData(success, failure) {
    var vStart = new Date().toISOString();
    //var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleEventCurrent"; //?startdatetime=" + vStart +"&timeinclusion=contain"
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDConsoleEvent?startdatetime=" + vStart + "&timeinclusion=contain";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDConsoleEventCurrentData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDConsoleEventCurrentData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

/*function getCMDTelemetryData(vCategory, vMachine_Name, vStartTime, vEndTime, success, failure) {
		var vStart = (new Date(vStartTime).toISOString());
		var vEnd = (new Date(vEndTime).toISOString());
		var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetry?category="+vCategory+"&machine_name="+vMachine_Name+"&startdatetime=" + vStart +"&enddatetime="+ vEnd +"&sort=start&timeinclusion=start";
		if ( vMachine_Name == "" ){
			vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetry?category="+vCategory+"&startdatetime=" + vStart +"&enddatetime="+ vEnd +"&sort=start&timeinclusion=start";
		}
		$.ajax({
				url: vURL,
				method: "GET",
				headers: { "Accept": "application/json; charset=utf-8; odata=verbose" },
				success: function (data) {
						console.log("getCMDTelemetryData: "+ vURL +" Request Complete");
						success(data);
				},
				error: function (data) {
						console.log("getCMDTelemetryData:ERROR "+vURL +" Request Failed");
						failure(data);
				}
		});
}*/

function getCMDTelemetryErrorMeasureCodes(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryErrorMeasureCodes";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDTelemetryErrorMeasureCodes: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDTelemetryErrorMeasureCodes:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getCMDTelemetryErrorItemCodes(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryErrorItemCodes";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDTelemetryErrorItemCodes: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDTelemetryErrorItemCodes:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getCMDTelemetryErrorCodes(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryErrorCodes";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDTelemetryErrorCodes: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDTelemetryErrorCodes:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getCMDTelemetryData(vCategory, vType, vMachine_Name, vStartTime, vEndTime, success, failure) {
    var vStart = (new Date(vStartTime).toISOString());
    var vEnd = (new Date(vEndTime).toISOString());
    var vTypeStr = "&type=" + vType;
    if (vType == "") {
        vTypeStr = "";
    }
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetry?category=" + vCategory + "&machine_name=" + vMachine_Name + "&startdatetime=" + vStart + "&enddatetime=" + vEnd + "&sort=start&timeinclusion=start" + vTypeStr;
    if (vMachine_Name == "") {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetry?category=" + vCategory + "&startdatetime=" + vStart + "&enddatetime=" + vEnd + "&sort=start&timeinclusion=start" + vTypeStr;
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDTelemetryData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDTelemetryData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

/*function getCMDTelemetryCurrentData(vCategory, success, failure) {
		//vStart = new Date(new Date().getTime() - 300*1000).toISOString();
		//var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryCurrent?startdatetime="+vStart+"&timeinclusion=start&category="+vCategory+"&sort=start";
		var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryCurrent?category="+vCategory+"&sort=start";
		$.ajax({
				url:  vURL,
				method: "GET",
				headers: { "Accept": "application/json; charset=utf-8; odata=verbose" },
				success: function (data) {
						console.log("getCMDTelemetryCurrentData: "+ vURL +" Request Complete");
						success(data);
				},
				error: function (data) {
						console.log("getCMDTelemetryCurrentData:ERROR "+vURL +" Request Failed");
						failure(data);
				}
		});
}*/

function getCMDTelemetryCurrentData(vCategory, vType, success, failure) {
    //vStart = new Date(new Date().getTime() - 300*1000).toISOString();
    //var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryCurrent?startdatetime="+vStart+"&timeinclusion=start&category="+vCategory+"&sort=start";
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryCurrent?category=" + vCategory + ""; //&sort=start";
    if (vType != "") {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getCMDTelemetryCurrent?category=" + vCategory + "&type=" + vType + ""; //&sort=start"; //Should prob use this...
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getCMDTelemetryCurrentData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getCMDTelemetryCurrentData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTDelayData(vStartTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTDelayCurrent?active=true&startdatetime=" + vStart + "&timeinclusion=contain&sort=start";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTDelayData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTDelayData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTDelayCurrentData(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTDelayCurrent?active=true&sort=start"
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTDelayCurrentData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTDelayCurrentData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTMachineData(vModeActive, vStartTime, vEndTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vEnd = new Date(vEndTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTMachine?startdatetime=" + vStart + "&enddatetime=" + vEnd + "&timeinclusion=start&mode_active=" + vModeActive;
    if (vModeActive == "") {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTMachine?startdatetime=" + vStart + "&enddatetime=" + vEnd + "&timeinclusion=start";
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTMachineData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTMachineData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTMachineCurrentData(vModeActive, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTMachineCurrent?mode_active=" + vModeActive;
    if (vModeActive == "") {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTMachineCurrent";
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTMachineCurrentData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTMachineCurrentData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTPanelData(vStartTime, vEndTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vEnd = new Date(vEndTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTPanel?startdatetime=" + vStart + "&enddatetime=" + vEnd + "&timeinclusion=start&sort=start";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTPanelData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTPanelData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTPanelDataAtTime(vStartTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTPanelAtTime?startdatetime=" + vStart + "&sort=start";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTPanelData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTPanelData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTPanelCurrentData(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTPanelCurrent";
    //}
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTPanelCurrentData: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTPanelCurrentData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

/*function postULTSHistoryData(vPosRequests, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/postULTSHistory";
    $.ajax({
		type: "POST",
        url: vURL,
        method: "POST",
        data: vPosRequests,
		contentType: "application/json; charset=utf-8",
        dataType: "json",
        //headers: { "Accept": "application/json; charset=utf-8; odata=verbose" },
        timeout: 10000,
        success: function(data, textStatus, jqXHR) {
            console.log("postULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(jqXHR, textStatus, data) {
            console.log("postULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getULTSHistoryData(vTimeStamp, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSHistory?timestamp=" + vTimeStamp + "";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}*/

function postULTSHistoryData(vPosRequests, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/postULTSHistory";
    $.ajax({
		type: "POST",
        url: vURL,
        method: "POST",
        data: vPosRequests,
		contentType: "application/json; charset=utf-8",
        dataType: "json",
        //headers: { "Accept": "application/json; charset=utf-8; odata=verbose" },
        timeout: 10000,
        success: function(data, textStatus, jqXHR) {
            console.log("postULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(jqXHR, textStatus, data) {
            console.log("postULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getULTSHistoryData(vTimeStamp, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSHistory?timestamp=" + vTimeStamp + "";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSZoneHistoryData(vTrackingZoneName,vTimeStamp,success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSZoneHistory?timestamp=" + vTimeStamp + "&zone_name=" + vTrackingZoneName;
    if ( vTrackingZoneName === "" ){
        vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSZoneHistory?timestamp=" + vTimeStamp + "";
    }
	//console.log("getULTSZoneHistory: Calling URL["+ vURL +"].");
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSZoneHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSZoneHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSZoneHistoryDataFromOID(vOID,vTimeStamp,success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSZoneHistory?timestamp=" + vTimeStamp + "&zone_oid=" + vOID;
    if ( vOID === 0 || vOID === "" ){
        vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSZoneHistory?timestamp=" + vTimeStamp + "";
    }
	//console.log("getULTSZoneHistory: Calling URL["+ vURL +"].");
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSZoneHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSZoneHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSHistoryMachineData(vTimeStamp, vMachineName, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSHistory?timestamp=" + vTimeStamp + "&machine_name="+vMachineName+"";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSHistoryDataRangeMachineMatch(vStartTime, vEndTime, vMatch, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vEnd = new Date(vEndTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSHistory?startdatetime=" + vStart + "&enddatetime=" + vEnd + "&machine_name_match="+vMatch+"";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getULTSHistoryDataRange(vStartTime, vEndTime, success, failure) {
    var vStart = new Date(vStartTime).toISOString();
    var vEnd = new Date(vEndTime).toISOString();
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSHistory?startdatetime=" + vStart + "&enddatetime=" + vEnd + "";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSHistory: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSHistory:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getULTSLocationCurrentData(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSLocationCurrent";
    if (vShowOnlyLastUpdate) {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSLocationCurrent?minlastupdate=" + vMinLastUpdate;
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            //console.log("getFLTLocationCurrentData: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTLocationCurrentData:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSLocationCurrentOIDFilterData(vOIDFilter, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSLocationCurrent?machine_class_oid_match=" + vOIDFilter;
    if (vShowOnlyLastUpdate) {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSLocationCurrent?minlastupdate=" + vMinLastUpdate + "&machine_class_oid_match=" + vOIDFilter;
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            //console.log("getFLTLocationCurrentData: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTLocationCurrentOIDFilterData:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSEntityData(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSEntity";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSEntityData: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSEntityData:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getULTSPersonData(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSPerson";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSPersonData: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSPersonData:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function updateULTSEntityData(vEntity, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/updateULTSEntity";
    $.ajax({
        url: vURL,
        method: "PUT",
        data: jQuery.param(vEntity),
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        timeout: 10000,
        success: function(data) {
            console.log("updateULTSEntityData:: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("updateULTSEntityData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function updateULTSPersonData(vEntity, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/updateULTSPerson";
    $.ajax({
        url: vURL,
        method: "PUT",
        data: jQuery.param(vEntity),
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        timeout: 10000,
        success: function(data) {
            console.log("updateULTSPersonData:: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("updateULTSPersonData:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getULTSEntityGroupData(success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getULTSEntityGroup";
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getULTSEntityGroupData: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getULTSEntityGroupData:ERROR " + vURL + " Request Failed");
            failure(data);
        },
        cache: false
    });
}

function getFLTAutoZoneFeatures(vType, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTAutoZoneFeatures?feature_type=" + vType;
    //if ( vModeActive == "" ) {
    //        vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTMachineCurrent";
    //}
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        success: function(data) {
            console.log("getFLTAutoZoneFeatures: " + vURL + " Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTAutoZoneFeatures:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function getFLTAutoZoneEntitiesList(vZoneName, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTAutoZoneEntitiesList?zone_name=" + vZoneName;
    if (vShowOnlyLastUpdate) {
        vURL = window.location.protocol + "//" + window.location.host + "/api/getFLTAutoZoneEntitiesList?zone_name=" + vZoneName + "&minlastupdate=" + vMinLastUpdate;
    }
    $.ajax({
        url: vURL,
        method: "GET",
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        timeout: 10000,
        success: function(data) {
            //console.log("getFLTAutoZoneEntitiesList: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTAutoZoneEntitiesList:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function createFLTAutoZoneFeature(vFeature, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/createFLTAutoZoneFeature";
    $.ajax({
        url: vURL,
        method: "POST",
        data: vFeature,
        dataType: "json",
        //headers: { "Accept": "application/json; charset=utf-8; odata=verbose" },
        timeout: 10000,
        success: function(data, textStatus, jqXHR) {
            console.log("createFLTAutoZoneFeature: " + vURL + " Request Complete");
            success(data);
        },
        error: function(jqXHR, textStatus, data) {
            console.log("createFLTAutoZoneFeature:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}

function updateFLTAutoZoneFeature(vFeature, success, failure) {
    var vURL = window.location.protocol + "//" + window.location.host + "/api/updateFLTAutoZoneFeature";
    $.ajax({
        url: vURL,
        method: "PUT",
        data: jQuery.param(vFeature),
        headers: {
            "Accept": "application/json; charset=utf-8; odata=verbose"
        },
        timeout: 10000,
        success: function(data) {
            //console.log("getFLTAutoZoneEntitiesList: "+ vURL +" Request Complete");
            success(data);
        },
        error: function(data) {
            console.log("getFLTAutoZoneEntitiesList:ERROR " + vURL + " Request Failed");
            failure(data);
        }
    });
}
