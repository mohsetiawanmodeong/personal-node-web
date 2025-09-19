//MODULES
import { JDBC, isJvmCreated, addOption, setupClasspath } from 'nodejs-jdbc';
//import { writeHeapSnapshot } from 'v8';
import util from 'util';
import stream from 'stream';
// Load the child process module
import cp from 'child_process';
// Setup Promise for Async Operations.
const exec = util.promisify(cp.exec);
const execFile = util.promisify(cp.execFile);
import pLimit from 'p-limit'; //Limit the concurrent processes for promise.all
//import fs from 'fs/promises';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
//const es = require('event-stream');
//const getStream = require('get-stream');
// Load Configs
import config from 'config';
// Setup Database Connection
import sql from 'mssql';
//Web API Stuff
import express from 'express'; //npm install express
import bodyParser from 'body-parser'; // npm install body-parser
import http from 'http';
import filter from "mrc-filter";
import utils from "mrc-utils";
//const { setTimeout } = require('node:timers/promises');
//SITE VARIABLES
const vCMDServer = config.get('CMDServer');
//const vCMDServerB = config.get('CMDServerB');
const vCMDServerC = config.get('CMDServerC');
const vCMDUsername = config.get('CMDUsername');
const vCMDPasswd = config.get('CMDPasswd');
const vCMDOSUsername = config.get('CMDOSUsername');
const vCMDOSPasswd = config.get('CMDOSPasswd');
var dbConfig = config.get('dbConfig');
const vPTFIDetailsPort = config.get('PTFIDetailsPort');

//STATIC VARIABLES - SETTINGS
var APP_VERSION = "1.0";
const vTimeInterval = 30000;
const vLoadDataInterval = 2000;
const vLoadDataIntervalAfterStart = 30000;
var vMachineMap = new Map();
var vLastUpdateCMDLog = 0;
var vLoadingData = false;
var vMAPCMDTelemetryCurrent = new Map();
var vMAPCMDTelemetryLatest = new Map();
var vMAPCMDSerialToName = new Map();
var vMAPCMDNameToSerial = new Map();
var PORT = process.env.PORT || vPTFIDetailsPort;
var vEmployeesFile = "Employee.csv"
var vEmployeesMap = new Map();

async function loadEmployees() {
    console.log("PTFIDETAILS:LOADEMPLOYEES:Loading Employees...");
    try {
		//0000000004,3992637341,Adrianto Machribie,Active,https://ptficollab.fmi.com/apps/uidbadge/photos/0000000004.jpg,https://ptficollab.fmi.com/apps/uidbadge/Photos/_T/0000000004_JPG.jpg,Senior Management (Corp),Staff,Contractor Project,ADRIANTO MACHRIBIE REKSOHADIPRODJO,PTFI COMMISSIONER,M,amachrib@fmi.com,,,,,0000881233,LUKMAN BUDI PRASETYA,Manager  Contracts & Compliance,lprasety@fmi.com,5462758,,
        var rs = await fs.createReadStream(vEmployeesFile)
            .pipe(csv({
                separator: ',',
                headers: ['EMPLOYEE_ID', 'SMARTCARD_ID', 'NAME', 'STATUS', 'PHOTO', 'PHOTO_THUMBNAIL', 'DEPARTMENT', 'EMPLOYMENT_TYPE', 'COMPANY_TYPE', 'COMPANY', 'JOB_TITLE', 'GENDER', 'EMAIL', 'PHONE', 'TRUNK_RADIO', 'TRUNK_RADIO_FROM_PHONE', 'SITE_ADDRESS', 'SUPERVISOR_ID', 'SUPERVISOR_NAME', 'SUPERVISOR_JOB_TITLE', 'SUPERVISOR_EMAIL', 'SUPERVISOR_OFFICE_PHONE', 'SUPERVISOR_TRUNK_RADIO', 'SUPERVISOR_TRUNK_RADIO_FROM_PHONE']
            }))
            .on('data', (data) => {
                var vMachine = {};
                //vMachine.MEASURE_CODE = "" + data.MEASURE_CODE;
                //vMachine.DESCRIPTION = "" + data.DESCRIPTION;
				data.PHOTO = "images/spdata/"+data.EMPLOYEE_ID + ".jpg";
				data.PHOTO_THUMBNAIL = "images/spdata_t/"+data.EMPLOYEE_ID + "_t.jpg";
                vEmployeesMap.set(data.SMARTCARD_ID, data);
                //vMachineData.push(vMachine);
                //vDataInputCount++;
            })
            .on('end', () => {
                //vChangesData=[].concat(vTmpData);
                console.log("PTFIDETAILS:LOADERRORMEASURECODES:File Load Complete(" + vEmployeesMap.size + ").");
            });
    } catch (e) {
        console.error("PTFIDETAILS:LOADERRORMEASURECODES:ERROR:" + e); // should contain code (exit code) and signal (that caused the termination).
    }
}

//Now lets setup the WEB API ENDPOINTS
var app = express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return next();
});

function authentication(req, res, next) {
    var authheader = req.headers.authorization;
    //console.debug(req.headers);

    if (!authheader) {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err)
    }

    var auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];

    var vAuthenticated = false;
    var vLogin = config.get('login');
    //console.debug("LOGIN:"+JSON.stringify(vLogin));
    for (let vUser in vLogin) {
        //console.debug("USER:"+JSON.stringify(vLogin[vUser]));
        if (user == vLogin[vUser].user && pass == vLogin[vUser].passwd) {
            console.debug("USER:" + JSON.stringify(vLogin[vUser]) + " Logged In.");
            // If Authorized user
            vAuthenticated = true;
            next();
        }
    }
    if (!vAuthenticated) {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err);
    }
}

app.use(authentication);
app.use(bodyParser.json()); // for parsing application/json

var vDataInputCount = 0;
var vDataInputRequestCount = 0;
var vDataOutputCount = 0;
var vDataOutputRequestCount = 0;

app.get('/api/getPTFIDetailsEmployee', (req, res) => {
	var vReturnData = utils.getArray(vEmployeesMap);
	if ( req.query.smartcard_id ){
		var vChosenEmployee={};
		vReturnData.forEach((employee) => {
			if ( req.query.smartcard_id === employee.SMARTCARD_ID ) {
				vChosenEmployee=employee;
			}
		});
		res.send(vChosenEmployee);
    }else if ( req.query.employee_id ){
        var vChosenEmployee={};
        vReturnData.forEach((employee) => {
            if ( req.query.employee_id === employee.EMPLOYEE_ID ) {
                vChosenEmployee=employee;
            }
        });
        res.send(vChosenEmployee);
    }else{
    	var vReturnData = utils.getArray(vEmployeesMap);
    	vReturnData = filter.doFilters(vReturnData, req);
    	res.send(vReturnData);
	}
    //Stats
    vDataOutputRequestCount++;
    vDataOutputCount = vDataOutputCount + vReturnData.length;
});

app.get('/api/getAppStatusPTFIDetails', (req, res) => {
    var vAppStatus = {};
    vAppStatus.Name = "PTFIDetails";
    vAppStatus.Version = APP_VERSION;
    vAppStatus.DataStoreSize = calcTotalDataSize();
    vAppStatus.DataStoreCount = vDataStoreCount;
    vAppStatus.DataStoreFailCount = vDataStoreFailCount;
    vAppStatus.DataInputCount = vDataInputCount;
    vAppStatus.DataInputRequestCount = vDataInputRequestCount;
    vAppStatus.DataOutputCount = vDataOutputCount;
    vAppStatus.DataOutputRequestCount = vDataOutputRequestCount;
    vAppStatus.UsageMemory = process.memoryUsage();
    vAppStatus.UsageCPU = process.cpuUsage();
    vAppStatus.CPU = vCPUPercent;
    res.send(vAppStatus);
});

console.log("Starting API endpoints...");
var server = http.createServer(app);
server.listen(PORT, function() {
    console.log('Server running, version ' + APP_VERSION + ', Express is listening... at ' + PORT + " for requests");
});

//START OF APP`
loadEmployees();
