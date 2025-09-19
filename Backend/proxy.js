const express = require('express'); //npm install express
const bodyParser = require('body-parser'); // npm install body-parser
const http = require('http');
const cp = require('child_process');
// Setup Promise for Async Operations.
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const config = require('config');
//const { Proxy } = require('axios-express-proxy');
const proxy = require('express-http-proxy');
var cors = require('cors');
//LOCAL CONFIG
var APP_VERSION = "0.8";
var PORT = process.env.PORT || 4990;

//Do Basic Authentication
function authentication(req, res, next) {
    var authheader = req.headers.authorization;
    //console.log(req.headers);

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

        var vAuthenticated=false;
        var vLogin = config.get('login');
        //console.log("LOGIN:"+JSON.stringify(vLogin));
        for (vUser in vLogin) {
                //console.log("USER:"+JSON.stringify(vLogin[vUser]));
                if (user == vLogin[vUser].user && pass == vLogin[vUser].passwd){
			console.log("USER:"+user+" Logged In.REQ["+JSON.stringify(req.url)+"].");
					req.query.user = ""+user;
                        // If Authorized user
                        vAuthenticated=true;
                        next();
                }
        }
        if(!vAuthenticated){
                var err = new Error('You are not authenticated!');
                res.setHeader('WWW-Authenticate', 'Basic');
                err.status = 401;
                return next(err);
        }
}

//Now lets setup the WEB API ENDPOINTS
var app = express();
app.use(cors());

app.disable('etag');
// First step is the authentication of the client
//app.use(cors());
//app.use(cors({ origin: 'http://10.211.240.25:4650' , credentials :  true,  methods: 'GET,PUT,POST,OPTIONS', allowedHeaders: 'Content-Type,Authorization' }));
//app.use(cors({ origin: true, credentials :  true}));
//
//http://10.211.240.25:4650
//
app.use((req, res, next) => {
//  const allowedOrigins = ['http://10.211.240.25:4650'];
//  const origin = req.headers.origin;
//  if (allowedOrigins.includes(origin)) {
//       res.setHeader('Access-Control-Allow-Origin', origin);
//  }
  res.header('Access-Control-Allow-Origin', 'http://ttd-app');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  //res.header('Cache-Control', 'public, max-age=31536000');
  return next();
});

app.use(authentication);
//app.use(bodyParser.json()); // for parsing application/json
//app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  if (req.url.includes('/dash/')) {
    req.url = req.url.replace('dash/','');
  }
  next();
});

var vCMDLogPort = config.get('CMDLogPort');
var vVIMSLogPort = config.get('VIMSLogPort');
//var vCMDEventPort = config.get('CMDEventPort');
var vCMDConsoleEventPort = config.get('CMDConsoleEventPort');
var vCMDConsoleLogPort = config.get('CMDConsoleLogPort');
var vFLTMachinePort = config.get('FLTMachinePort');
var vFLTDelayPort = config.get('FLTDelayPort');
var vFLTHealthPort = config.get('FLTHealthPort');
var vFLTPanelPort = config.get('FLTPanelPort');
var vCMDTelemetryPort = config.get('CMDTelemetryPort');
var vFLTChutePort = config.get('FLTChutePort');
var vFLTLocationPort = config.get('FLTLocationPort');
var vULTSPort = config.get('ULTSPort');
var vFLTCyclePort = config.get('FLTCyclePort');
var vMSCopilotPort = config.get('MSCopilotPort');
var vOPCUAAPIPort = config.get('OPCUAAPIPort');
var vULTSHistoryPort = config.get('ULTSHistoryPort');
var vFMIChutePort = config.get('FMIChutePort');
//var vPOLYAPIPort = config.get('POLYAPIPort');
var vFLTStatePort = config.get('FLTStatePort');
var vFLTDrawpointPort = config.get('FLTDrawpointPort');
var vCMDStatsPort = config.get('CMDStatsPort');
var vFMIACPPort = config.get('FMIACPPort');
var vFMIACPEventPort = config.get('FMIACPEventPort');
var vPLEDataPort = config.get('PLEDataPort');
var vIMSDataPort = config.get('IMSDataPort');
var vPTFIDetailsPort = config.get('PTFIDetailsPort');
//app.use(express.json());

//app.use(bodyParser.json()); // for parsing application/json
//Minestar Pass through for ORB Testing

//app.get('/underground/api/cycles', proxy('http://172.16.0.1:1100'));
//app.get('/underground/api/drawpoints', proxy('http://172.16.0.1:1100'));
//app.get('/underground/api/drawpoints/operatingstatuses', proxy('http://172.16.0.1:1100'));
//app.get('/underground/api/cycles/subscribe', proxy('http://localhost:'+vPOLYAPIPort));//
//app.get('/underground/api/drawpoints/subscribe', proxy('http://localhost:'+vPOLYAPIPort));//
//app.get('/underground/api/cycles/subscribe', proxy('http://172.16.0.1:1100'));//, { userResHeaderDecorator(headers, userReq, userRes, proxyReq, proxyRes){ return headers;}}));

//
app.get('/api/getCMDLog', proxy('http://localhost:'+vCMDLogPort));
app.get('/api/getCMDEvent', proxy('http://localhost:'+vCMDLogPort));
app.get('/api/getCMDAECMLog', proxy('http://localhost:'+vCMDLogPort));
app.get('/api/getAppStatusCMDLog', proxy('http://localhost:'+vCMDLogPort));

//app.get('/api/getCMDEvent', proxy('http://localhost:'+vCMDEventPort));
//app.get('/api/getAppStatusCMDEvent', proxy('http://localhost:'+vCMDEventPort));

app.get('/api/getCMDConsoleEvent', proxy('http://localhost:'+vCMDConsoleEventPort));
app.get('/api/getCMDConsoleEventAtTime', proxy('http://localhost:'+vCMDConsoleEventPort));
app.get('/api/getCMDConsoleEventCurrent', proxy('http://localhost:'+vCMDConsoleEventPort));
app.get('/api/getCMDConsoleDetails', proxy('http://localhost:'+vCMDConsoleEventPort));
app.get('/api/getAppStatusCMDConsoleEvent', proxy('http://localhost:'+vCMDConsoleEventPort));

app.get('/api/getCMDConsoleLog', proxy('http://localhost:'+vCMDConsoleLogPort));
app.get('/api/getCMDROSLog', proxy('http://localhost:'+vCMDConsoleLogPort));
app.get('/api/getAppStatusCMDConsoleLog', proxy('http://localhost:'+vCMDConsoleLogPort));

app.get('/api/getVIMSLog', proxy('http://localhost:'+vVIMSLogPort));
app.get('/api/getVIMSLogAll', proxy('http://localhost:'+vVIMSLogPort));
app.get('/api/getAppStatusVIMSLog', proxy('http://localhost:'+vVIMSLogPort));
//FLTChute
app.put('/api/putFLTChuteUpdate', proxy('http://localhost:'+vFLTChutePort));
app.get('/api/getFLTChuteCalc', proxy('http://localhost:'+vFLTChutePort)); 
app.get('/api/getFLTChuteHistory', proxy('http://localhost:'+vFLTChutePort));
app.get('/api/getAppStatusFLTChute', proxy('http://localhost:'+vFLTChutePort));
//FLTDelay
app.get('/api/getFLTDelay', proxy('http://localhost:'+vFLTDelayPort));
app.get('/api/getFLTDelayCurrent', proxy('http://localhost:'+vFLTDelayPort));
app.get('/api/getAppStatusFLTDelay', proxy('http://localhost:'+vFLTDelayPort));
//FLTHealth
app.get('/api/getFLTHealthCurrent', proxy('http://localhost:'+vFLTHealthPort));
app.get('/api/getFLTHealthAtTime', proxy('http://localhost:'+vFLTHealthPort));
app.get('/api/getAppStatusFLTHealth', proxy('http://localhost:'+vFLTHealthPort));
//FLTLOCATION
//app.get('/api/getFLTLocation', proxy('http://localhost:'+vFLTLocationPort));
//app.get('/api/getFLTLocationCurrent', proxy('http://localhost:'+vFLTLocationPort));
//app.get('/api/getFLTLocationAtTime', proxy('http://localhost:'+vFLTLocationPort));
//app.get('/api/getAppStatusFLTLocation', proxy('http://localhost:'+vFLTLocationPort));
//FLTMACHINE
app.get('/api/getFLTMachine', proxy('http://localhost:'+vFLTMachinePort));
app.get('/api/getFLTMachineCurrent', proxy('http://localhost:'+vFLTMachinePort));
app.get('/api/getFLTMachineAtTime', proxy('http://localhost:'+vFLTMachinePort));
app.get('/api/getAppStatusFLTMachine', proxy('http://localhost:'+vFLTMachinePort));
//FLTPANEL
app.get('/api/getFLTPanelCurrent', proxy('http://localhost:'+vFLTPanelPort));
app.get('/api/getFLTPanelAtTime', proxy('http://localhost:'+vFLTPanelPort));
app.get('/api/getFLTPanel', proxy('http://localhost:'+vFLTPanelPort));
app.get('/api/getAppStatusFLTPanel', proxy('http://localhost:'+vFLTPanelPort));
//CMDTELEMETRY
app.get('/api/getCMDTelemetryErrorMeasureCodes', proxy('http://localhost:'+vCMDTelemetryPort));
app.get('/api/getCMDTelemetryErrorItemCodes', proxy('http://localhost:'+vCMDTelemetryPort));
app.get('/api/getCMDTelemetryErrorCodes', proxy('http://localhost:'+vCMDTelemetryPort));
app.get('/api/getCMDTelemetry', proxy('http://localhost:'+vCMDTelemetryPort));
app.get('/api/getCMDTelemetryCurrent', proxy('http://localhost:'+vCMDTelemetryPort));//,{ timeout: 2000});
app.get('/api/getCMDTelemetryAtTime', proxy('http://localhost:'+vCMDTelemetryPort));
app.get('/api/getAppStatusCMDTelemetry', proxy('http://localhost:'+vCMDTelemetryPort));
//ULTS
//app.get('/api/getMSLocation', proxy('http://localhost:'+vULTSPort));
//app.get('/api/getMSLocationCurrent', proxy('http://localhost:'+vULTSPort));
app.get('/api/getULTSLocationCurrent', proxy('http://localhost:'+vULTSPort));
app.get('/api/getULTSEntity', proxy('http://localhost:'+vULTSPort));
app.get('/api/getULTSPerson', proxy('http://localhost:'+vULTSPort));
app.put('/api/updateULTSEntity', proxy('http://localhost:'+vULTSPort));
app.put('/api/updateULTSPerson', proxy('http://localhost:'+vULTSPort));
app.get('/api/getULTSEntityGroup', proxy('http://localhost:'+vULTSPort));
app.get('/api/getUPSEvents', proxy('http://localhost:'+vULTSPort));
app.get('/api/getFLTAutoZoneFeatures', proxy('http://localhost:'+vULTSPort));
app.get('/api/getFLTAutoZoneEntitiesList', proxy('http://localhost:'+vULTSPort));
app.get('/api/getFLTAutoZoneEntitiesCount', proxy('http://localhost:'+vULTSPort));
//app.get('/api/getFLTAutoZoneActivities',  proxy('http://localhost:'+vULTSPort));
app.put('/api/updateFLTAutoZoneFeature',  proxy('http://localhost:'+vULTSPort));
app.post('/api/createFLTAutoZoneFeature',  proxy('http://localhost:'+vULTSPort));
//Lets create a new Zone Feature.
/*app.post('/api/createFLTAutoZoneFeature', (req,res)=> {
        //var vNewZone = req.body;
        console.log("CREATE:ZONE:New FMI zone created["+JSON.stringify(req.body)+"]");
        res.json(req.body);//{ id: vNewZone.id});
});*/
app.get('/api/getAppStatusULTS', proxy('http://localhost:'+vULTSPort));
//ULTSHISTORY
app.post('/api/postULTSHistory', proxy('http://localhost:'+vULTSHistoryPort));
app.get('/api/getULTSHistory', proxy('http://localhost:'+vULTSHistoryPort));
app.get('/api/getULTSZoneHistory', proxy('http://localhost:'+vULTSHistoryPort));
app.get('/api/getULTSHistoryAnalysis', proxy('http://localhost:'+vULTSHistoryPort));
app.get('/api/getAppStatusULTSHistory', proxy('http://localhost:'+vULTSHistoryPort));
//FLTCycle
app.get('/api/getFLTCycle', proxy('http://localhost:'+vFLTCyclePort));//Should be connecting to fltcycle
app.get('/api/getFLTActivity', proxy('http://localhost:'+vFLTCyclePort));//Should be connecting to fltcycle
app.get('/api/getFLTCycleDelay', proxy('http://localhost:'+vFLTCyclePort));//Should be connecting to fltcycle
app.get('/api/getAppStatusFLTCycle', proxy('http://localhost:'+vFLTCyclePort));
//MSCOPILOT
app.get('/api/getCopilotCycle', proxy('http://localhost:'+vMSCopilotPort));//Should be connecting to mscopilot
//OPCUAAPI
app.get('/api/getOPCUA', proxy('http://localhost:'+vOPCUAAPIPort));
app.get('/api/getOPCUARockbreaker', proxy('http://localhost:'+vOPCUAAPIPort));
app.get('/api/getAppStatusOPCUAAPI', proxy('http://localhost:'+vOPCUAAPIPort));
//FMIChute
app.post('/api/createFMIChuteUpdate', proxy('http://localhost:'+vFMIChutePort));
app.get('/api/getFMIChute', proxy('http://localhost:'+vFMIChutePort)); 
app.get('/api/getFMIChuteHistory', proxy('http://localhost:'+vFMIChutePort));
app.get('/api/getAppStatusFMIChute', proxy('http://localhost:'+vFMIChutePort));
//FLTState
app.get('/api/getFLTState', proxy('http://localhost:'+vFLTStatePort));
app.get('/api/getFLTStateCurrent', proxy('http://localhost:'+vFLTStatePort));
app.get('/api/getFLTStateAtTime', proxy('http://localhost:'+vFLTStatePort));
app.get('/api/getAppStatusFLTState', proxy('http://localhost:'+vFLTStatePort));
//FLTDrawpoint
app.get('/api/getFLTDrawpoint', proxy('http://localhost:'+vFLTDrawpointPort));
app.get('/api/getFLTDrawpointCurrent', proxy('http://localhost:'+vFLTDrawpointPort));
app.get('/api/getFLTDrawpointAtTime', proxy('http://localhost:'+vFLTDrawpointPort));
app.get('/api/getAppStatusFLTDrawpoint', proxy('http://localhost:'+vFLTDrawpointPort));
//CMDStat
app.get('/api/getCMDStats', proxy('http://localhost:'+vCMDStatsPort));
app.get('/api/getAppStatusCMDStats', proxy('http://localhost:'+vCMDStatsPort));
//FMIACP
app.post('/api/createFMIACP', proxy('http://localhost:'+vFMIACPPort));
app.get('/api/getFMIACP', proxy('http://localhost:'+vFMIACPPort));
app.get('/api/getFMIACPCurrent', proxy('http://localhost:'+vFMIACPPort));
app.get('/api/getAppStatusFMIACP', proxy('http://localhost:'+vFMIACPPort));
//FMIACPEvent
app.get('/api/getFMIACPEvent', proxy('http://localhost:'+vFMIACPEventPort));
app.get('/api/getAppStatusFMIACPEvent', proxy('http://localhost:'+vFMIACPEventPort));

//PTFIDetails
app.get('/api/getPTFIDetailsEmployee', proxy('http://localhost:'+vPTFIDetailsPort));
app.get('/api/getAppStatusPTFIDetails', proxy('http://localhost:'+vPTFIDetailsPort));
//var vMSDataPort=4750;
//app.get('/api/getFLTLog', proxy('http://localhost:'+vMSDataPort));//Should be connecting to fltlog
//app.get('/api/getFLTCycle', proxy('http://localhost:'+vMSDataPort));//Should be connecting to fltcycle
//app.get('/api/getMineSenseFLTCycle', proxy('http://localhost:'+vMSDataPort));//Should be connecting to fltcycle
//app.get('/api/getMPMCycle', proxy('http://localhost:'+vMSDataPort));//Should be connecting to mpmcycle
//app.get('/api/getFLTActivity', proxy('http://localhost:'+vMSDataPort));//Should be connecting to fltcycle
//app.get('/api/getFLTCycleDelay', proxy('http://localhost:'+vMSDataPort));//Should be connecting to fltcycle
//app.get('/api/getMSCopilot', proxy('http://localhost:'+vMSDataPort));//Should be connecting to mscopilot
//app.get('/api/getCopilotCycle', proxy('http://localhost:'+vMSDataPort));//Should be connecting to msdata
//app.get('/api/getFLTChute', proxy('http://localhost:'+vMSDataPort)); //Should be connecting to fltchute

var vFLTProxyLogPort=4370;
app.get('/api/getFLTProxyLog', proxy('http://localhost:'+vFLTProxyLogPort));//FLTPROXYLOG
app.get('/api/getFLTWifiLog', proxy('http://localhost:'+vFLTProxyLogPort));//FLTPROXYLOG
app.get('/api/getFLTPosPacketsLog', proxy('http://localhost:'+vFLTProxyLogPort));//FLTPROXYLOG
app.get('/api/getFLTPosUpdateLog', proxy('http://localhost:'+vFLTProxyLogPort));//FLTPROXYLOG

app.get('/api/getIMSData', proxy('http://localhost:'+vIMSDataPort));//IMSDATA
app.get('/api/getMSTAPDetails', proxy('http://localhost:'+vIMSDataPort));//IMSDATA
app.get('/api/getAppStatusIMSData', proxy('http://localhost:'+vIMSDataPort));//IMSDATA

//var vFLTManagerPort=4850;
//app.get('/api/getMachineStatus', proxy('http://localhost:'+vFLTManagerPort));//FLTMANAGER

var vUOMSProxyPort=4170;
app.get('/api/updateDrawpointStatus', proxy('http://localhost:'+vUOMSProxyPort));//UOMSPROXY
app.get('/api/updateMachineDelayDescription', proxy('http://localhost:'+vUOMSProxyPort));//#UOMSPROXY
//PLEDATA
app.get('/api/getPLEData', proxy('http://localhost:' + vPLEDataPort));
app.get('/api/getAppStatusPLEData', proxy('http://localhost:' + vPLEDataPort));

var vAppStatus = [];
vAppStatus.push("CMDLog");
//        vAppStatus.push("CMDEvent");
        vAppStatus.push("CMDConsoleLog");
        vAppStatus.push("CMDConsoleEvent");
        vAppStatus.push("CMDTelemetry");
        vAppStatus.push("FLTChute");
        vAppStatus.push("FLTCycle");
        vAppStatus.push("FLTDelay");
        //vAppStatus.push("FLTHealth");
        //vAppStatus.push("FLTLocation");
        vAppStatus.push("FLTMachine");
        vAppStatus.push("FLTPanel");
        vAppStatus.push("FMIChute");
        //vAppStatus.push("FLTTruckAssignment");
        vAppStatus.push("ULTS");
        vAppStatus.push("OPCUAAPI");
        vAppStatus.push("IMSData");
        vAppStatus.push("ULTSHistoryAll");
        vAppStatus.push("ULTSHistoryAll-loaddata");
        vAppStatus.push("FLTState");
        //vAppStatus.push("CMDStats");
        vAppStatus.push("FMIACP");
        vAppStatus.push("FMIACPEvent");
        vAppStatus.push("PLEData");

app.get('/api/getAppStatus', (req,res)=> {
        res.send(vAppStatus);
});

//Rsync Files from the Command Server.
async function restartApp(vApp) {
    try {
        console.log('PROXY:restartApp:' + vApp +':Restarting...');
        const { stdout, stderr } = await exec('pm2 restart '+vApp.toLowerCase()+'');
        console.log('PROXY:restartApp:'+vApp+':stdout:', stdout);
        console.log('PROXY:restartApp:'+vApp+'::stderr:', stderr);
        console.log('PROXY:restartApp:'+vApp+':Finished Restarting App.');
    } catch (e) {
        console.error(e); // should contain code (exit code) and signal (that caused the termination).
        return "FAILED:["+e+"].";
    }
    return "SUCCESS";
}

app.get('/api/getAppRestart', (req,res)=> {
	var vResult="";
	if (req.query.user === "admin"){
    if (req.query.app) {
		var vRun=false;
		vAppStatus.forEach((app) => {
			if ( app === req.query.app ) {
				vRun=true;
			}
		});
		if ( req.query.app === "all" ) { vRun=true; };
		if ( vRun){
			vResult = restartApp(req.query.app);
		}else{
			vResult = "app not in app list."
		}
    }else{
		vResult = "must specify app setting.";
	}
	}else{
		vResult = "Must be admin user.";
	}
    res.send(vResult);
});

app.use(bodyParser.json()); // for parsing application/json
app.use(express.static(__dirname + '/public'));

console.log("Starting API Proxy to all endpoints...");
var server = http.createServer(app);
server.listen(PORT, function () {
    console.log('Server running, version ' + APP_VERSION + ', Express is listening... at ' + PORT + " for requests");
});
