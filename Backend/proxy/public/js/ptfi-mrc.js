	/**
	 * Gives unique values in an array
	 */
	// Using Array.filter
	const uniqueFilter = arr => {
	    return arr.filter((value, index, self) => {
	        return self.indexOf(value) === index;
	    });
	};

	//Returns the shift name
	function shiftNameFromTimestamp(vGStartTime, vGEndTime) {
	    var vDate = new Date(vGStartTime);
	    var vRangeDiff = vGEndTime - vGStartTime;
	    var vRangeMiddle = vGStartTime + (vGEndTime - vGStartTime) / 2;
	    vDate.setHours(5);
	    vDate.setMinutes(0);
	    vDate.setSeconds(0);
	    vDate.setMilliseconds(0);
	    var vStartDayShift = vDate.getTime();
	    vDate.setHours(17);
	    var vEndDayShift = vDate.getTime();
	    var vShiftStr = "DAY";
	    var vDateStr = moment(new Date(vGStartTime)).format('YYYY-MM-DD dddd');
	    if (vGStartTime < vStartDayShift) {
	        vYestDate = new Date(vGStartTime);
	        vYestDateValue = vYestDate.getDate() - 1;
	        vYestDate.setDate(vYestDateValue);
	        vDateStr = moment(vYestDate).format('YYYY-MM-DD dddd');
	        vShiftStr = "NIGHT";
	    }
	    if (vGStartTime >= vEndDayShift) {
	        vShiftStr = "NIGHT";
	    }
	    return vDateStr + " " + vShiftStr + " SHIFT";
	}

	function addData(chart, data) {
	    chart.data.datasets = data;
	    chart.update();
	}

	function addLabels(chart, label) {
	    chart.data.labels = label;
	    chart.update();
	}

	function addDataAndLabels(chart, data, label) {
	    chart.data.datasets = data;
	    chart.data.labels = label;
	    chart.update();
	}

	function addDataAll(chart, label, data) {
	    chart.data.labels.push(label);
	    chart.data.datasets.forEach((dataset) => {
	        dataset.data.push(data);
	    });
	    chart.update();
	}

	function removeData(chart) {
	    chart.data.labels.pop();
	    chart.data.datasets.forEach((dataset) => {
	        dataset.data.pop();
	    });
	    chart.update();
	}

	function timeFilterData(data, vGTimeStart, vGTimeEnd) {
	    vReturnData = [];
	    data.forEach((datavalue, index, array) => {
	        if (datavalue.END_TIME > vGTimeStart) {
	            if (datavalue.START_TIME < vGTimeEnd) {
	                vReturnData.push(datavalue);
	            }
	        }
	    });
	    console.log("Before Time Filter(" + vGTimeStart + ")(" + vGTimeEnd + ")(" + data.length + ")after(" + vReturnData.length + ").");
	    return vReturnData;
	}

	function timeFilterEventData(data, vGTimeStart, vGTimeEnd) {
	    vReturnData = [];
	    vTestStart = Math.round(vGTimeStart / 1000);
	    vTestEnd = Math.round(vGTimeEnd / 1000);
	    data.forEach((datavalue, index, array) => {
	        if (datavalue.TIME_STAMP > vTestStart) {
	            if (datavalue.TIME_STAMP < vTestEnd) {
	                vReturnData.push(datavalue);
	            }
	        }
	    });
	    console.log("Before Time Filter(" + vTestStart + ")(" + vTestEnd + ")(" + data.length + ")after(" + vReturnData.length + ").");
	    return vReturnData;
	}

	function levelFilterEventData(data, vLevel) {
	    vReturnData = [];
	    data.forEach((datavalue, index, array) => {
	        if (datavalue.BRIDGE_LEVEL == vLevel) {
	            vReturnData.push(datavalue);
	        }
	    });
	    console.log("Before Level Filter(" + vLevel + ")(" + data.length + ")after(" + vReturnData.length + ").");
	    return vReturnData;
	}

	function nullFilterEventData(data) {
	    vReturnData = [];
	    data.forEach((datavalue, index, array) => {
	        if (datavalue.BRIDGE_NAME != "") {
	            vReturnData.push(datavalue);
	        }
	    });
	    console.log("Before Null Filter(" + data.length + ")after(" + vReturnData.length + ").");
	    return vReturnData;
	}



	function panelFilterData(data, vPanel) {
	    vReturnData = []
	    data.forEach((datavalue, index, array) => {
	        if (datavalue.SINK_DESTINATION_NAME.replace("Orepass", "") == vPanel) {
	            vReturnData.push(datavalue);
	        }
	    });
	    console.log("Panel Filter(" + vPanel + ")Before(" + data.length + ")After(" + vReturnData.length + ").");
	    return vReturnData;
	}

	function vpcFilterData(data, vVPC) {
	    vReturnData = []
	    data.forEach((datavalue, index, array) => {
	        if (datavalue.MACHINE_NAME == vVPC) {
	            vReturnData.push(datavalue);
	        }
	    });
	    console.log("VPC Filter(" + vVPC + ")Before(" + data.length + ")After(" + vReturnData.length + ").");
	    return vReturnData;
	}