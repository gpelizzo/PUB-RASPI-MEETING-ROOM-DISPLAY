"use strict";
/**	This file is part of RASPI-MEETING-SERVER.
*
*	RASPI-MEETING-SERVER is free software: you can redistribute it and/or modify
*	it under the terms of the GNU General Public License as published by
*	the Free Software Foundation, either version 3 of the License, or
*	(at your option) any later version.
*
*	RASPI-MEETING-SERVER is distributed in the hope that it will be useful,
*	but WITHOUT ANY WARRANTY; without even the implied warranty of
*	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*	GNU General Public License for more details.
*
*	You should have received a copy of the GNU General Public License
*	along with Foobar.  If not, see <https://www.gnu.org/licenses/>.
*
*
*	Author: Gilles PELIZZO <https://www.linkedin.com/in/pelizzo/>
*	Date: April 20th, 2020.
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var CSPI_1 = require("./epd/CSPI");
var CEPD42b_1 = require("./epd/CEPD42b");
var CDisplay_1 = require("./CDisplay");
var CEvents_1 = require("./CEvents");
var CLogger_1 = require("./CLogger");
var getmac_1 = __importDefault(require("getmac"));
var Gpio = require('pigpio').Gpio;
var express = require('express');
var body = require('body-parser');
var fs = require('fs');
var internalIp = require('internal-ip');
var dgram = require('dgram');
var exec = require('child_process').exec;
var getmac = require('getmac');
var moment = require('moment');
var http = require('http');
/*GPIO to maintain to low during TIMEOUT_DISPLAY_SETTINGS in order to display settings. A short triggering action will reset back to meeting display*/
var PIN_DISPLAY_SETTINGS = new Gpio(16, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, edge: Gpio.EITHER_EDGE });
/*GPIO to maintain to low during TIMEOUT_FACTORY_RESET in order to reset settings */
var PIN_FACTORY_RESET = new Gpio(26, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, edge: Gpio.EITHER_EDGE });
/*duration of the action to maintain PIN_FACTORY_RESET to low before performing factory reset*/
var TIMEOUT_FACTORY_RESET = 8000;
/*duration of the action to maintain PIN_DISPLAY_SETTINGS to low before displaying settings*/
var TIMEOUT_DISPLAY_SETTINGS = 5000;
/*time before starting to register to server - waiting for display refreshing after booting*/
var TIMER_REGISTER_TO_SERVER = 20000;
/*time between attempts to register to server*/
var TIMEOUT_REGISTER_TO_SERVER = 5000;
var CONFIG_FILE_NAME = 'config.json';
var DEFAULT_TCPIP_TOKEN = '123456';
var DEFAULT_UDP_TOKEN = '654321';
var DEFAULT_TCP_LISTENING_PORT = 8080;
var DEFAULT_UDP_LISTENING_PORT = 8089;
var DEFAULT_COMPANY_NAME = 'myCompany';
var DEFAULT_MEETING_ROOM_NAME = 'My Room Name';
var DEFAULT_TIME_FORMAT = '24h';
var DEFAULT_DATE_FORMAT = 'FR';
var DEFAULT_FREE_MESSAGE = 'Free';
var DEFAULT_NEXT_TITLE = 'Next:';
/*express TCP-IP REST commands*/
var REST_POST_EVENTS = '/events'; //set meetings events
var REST_POST_SETTINGS = '/settings'; //set settings
var REST_POST_REBOOT = '/reboot'; //reboot device
var REST_GET_SETTINGS = '/settings'; //get settings
/*UDP broadcasted commands*/
var UDP_DISPLAY_SETTINGS = 'display-config'; //display settings
var UDP_DISPLAY_MEETINGS = 'display-meetings'; //display meetings
var APP_VERSION = '1.0.0';
/**
* 	Main class
*/
var CMain = /** @class */ (function () {
    function CMain() {
    }
    /**
    * Init: perform modules configuration
    */
    CMain.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        /*retreive configuration from file*/
                        this.readConfig();
                        /* init global logger module */
                        CLogger_1.CLogger.init(this.mAppConfig.logs_path, this.mAppConfig.log_level);
                        /*init express and map token verification*/
                        this.mExpressModule.use(body.json());
                        this.mExpressModule.use(this.verifyToken(this));
                        /*init SPI interface*/
                        this.mSPIModule.init();
                        /*create and init instance of EPD display module*/
                        this.mEPDScreenModule = new CEPD42b_1.CEPD42b(this.mSPIModule);
                        return [4 /*yield*/, this.mEPDScreenModule.init()];
                    case 1:
                        _a.sent();
                        /*create instance of meeting room diplay module. Pass EPD module instance and diplay default config */
                        this.mDisplayMeetingModule = new CDisplay_1.CDisplay(this.mEPDScreenModule, {
                            free_message: this.mAppConfig.free_message,
                            next_title: this.mAppConfig.next_title,
                            time_format: this.mAppConfig.time_format,
                            date_format: this.mAppConfig.date_format
                        });
                        /*init event management module passing the callback used when clock alarm elaspe*/
                        this.mEventsManagement.init(this.clockAlarm.bind(this));
                        /*init display with meeting room basic settings, mainly header and footer*/
                        this.mDisplayMeetingModule.resetDisplay(this.mAppConfig);
                        /*set express to listen REST command*/
                        this.mExpressModule.listen(this.mAppConfig.tcp_listening_port, function () {
                            CLogger_1.CLogger.info('(CMain:init:#1) Server started on port ' + _this.mAppConfig.tcp_listening_port);
                        });
                        /*set UDP to listen incoming broadcasting messages. special sommands*/
                        this.mUDPServer = dgram.createSocket("udp4");
                        this.mUDPServer.bind(this.mAppConfig.udp_listening_port);
                        /* start interval timer up to events server response*/
                        if (this.mTimerRegisterToServer === null) {
                            setTimeout(function () {
                                _this.mTimerRegisterToServer = setInterval(function () {
                                    /*register to events server in order to receive events meeting notifications*/
                                    _this.registerToEventsServer().then(function (data) {
                                        if (data.status === 'true') {
                                            CLogger_1.CLogger.info('(CMain:init:#2) succeeded to register to event server:' + data.value);
                                        }
                                        else {
                                            CLogger_1.CLogger.error('(CMain:init:#3) failed to register to event server:' + data.value);
                                        }
                                        clearInterval(_this.mTimerRegisterToServer);
                                    })
                                        .catch(function (error) {
                                        CLogger_1.CLogger.error('(CMain:init:#4) Events server registration failure: ' + error);
                                    });
                                }, TIMEOUT_REGISTER_TO_SERVER);
                            }, TIMER_REGISTER_TO_SERVER);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
    * perform events server registration
    */
    CMain.registerToEventsServer = function () {
        var data = JSON.stringify({
            ip: internalIp.v4.sync(),
            mac: getmac_1.default(),
            meeting_room_id: this.mAppConfig.meeting_room_id,
            date_time: moment().format('DD/MM/YY HH:mm')
        });
        var options = {
            hostname: this.mAppConfig.events_server_ip,
            port: this.mAppConfig.events_server_port,
            path: '/register-device',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'Authorization': 'Bearer ' + this.mAppConfig.tcpip_server_token
            }
        };
        return new Promise(function (resolve, reject) {
            var request = http.request(options, function (res) {
                res.on('data', function (data) {
                    resolve(JSON.parse(data));
                });
            });
            request.on('error', function (error) {
                reject(error);
            });
            request.write(data);
            request.end();
        });
    };
    /**
    * Diplay config parameters
    */
    CMain.displaySettings = function () {
        this.mDisplayMeetingModule.simpleDisplay('Meeting room name: ' + this.mAppConfig.meeting_room_name + '\r\n' +
            'Meeting room ID: ' + this.mAppConfig.meeting_room_id + '\r\n' +
            'Company_name: ' + this.mAppConfig.company_name + '\r\n' +
            'ip: ' + internalIp.v4.sync() + '\r\n' +
            'mac: ' + getmac_1.default() + '\r\n' +
            'tcp listening port: ' + this.mAppConfig.tcp_listening_port + '\r\n' +
            'udp listening port: ' + this.mAppConfig.udp_listening_port + '\r\n' +
            'Events server IP: ' + this.mAppConfig.events_server_ip + '\r\n' +
            'Events server port: ' + this.mAppConfig.events_server_port + '\r\n' +
            'Date/Time: ' + moment().format('DD/MM/YY HH:mm') + '\r\n' +
            'Version: ' + APP_VERSION);
    };
    /**
    * Read config parameters from file
    */
    CMain.readConfig = function () {
        var fileContent = fs.readFileSync(__dirname + '/' + CONFIG_FILE_NAME);
        this.mAppConfig = JSON.parse(fileContent);
        this.mAppConfig.version = APP_VERSION;
    };
    /**
    * Verify express REST command token
    * param pThis: main class this context in order to access mAppConfig variable member
    */
    CMain.verifyToken = function (pThis) {
        return function (req, res, next) {
            if (!req.headers.hasOwnProperty("authorization")) {
                res.send('token is missing');
                return;
            }
            if (req.headers.authorization.replace("Bearer ", "") === pThis.mAppConfig.tcpip_token) {
                next();
            }
            else {
                res.send('token is incorrect');
                return;
            }
        };
    };
    /**
    * clockAlarm callback
    */
    CMain.clockAlarm = function () {
        var updateStatus = this.mEventsManagement.update(this.mEventsManagement.getMergedCurrentPendingEvents(), false);
        this.updateEventsDisplay(updateStatus);
    };
    /**
    * update display with meeting events
    * param pStatus
    *	{
    *		"current_updated": true is current meeting has changed. Else, false.
    *		"pending_updated": true if pending meetings list has changed. Else, false.
    *		"pending_updated_position": <optional>. If pending_updated is true, this value contains the ordered position of the change among pending meetings.
    *			This in order to avoid refreshing the display if change concerns not yet display pending meeting(s). The position if eventually managed by calling function.
    *	}
    */
    CMain.updateEventsDisplay = function (pStatus) {
        var bUpdateDisplay = false;
        if (pStatus.current_updated) {
            this.mDisplayMeetingModule.setDisplayBodyCurrent(this.mEventsManagement.getCurrentEvent());
            bUpdateDisplay = true;
        }
        if (pStatus.pending_updated) {
            if (pStatus.pending_updated_position < this.mDisplayMeetingModule.maxPendingMeetings) {
                this.mDisplayMeetingModule.setDisplayBodyPending(this.mEventsManagement.getPendingEvents());
                bUpdateDisplay = true;
            }
        }
        if (bUpdateDisplay) {
            this.mDisplayMeetingModule.updateDisplay();
        }
    };
    /**Run listening GPIO interrupt, REST and UDP
    * param pThis: main class this context in order to access mAppConfig variable member
    */
    CMain.run = function () {
        var _this = this;
        /*Factory reset: PIN_FACTORY_RESET has to maintain a low level during TIMEOUT_FACTORY_RESET ms*/
        PIN_FACTORY_RESET.on('interrupt', function (level) {
            if (PIN_FACTORY_RESET.digitalRead() === 0) {
                if (_this.mTimerFactoryReset === null) {
                    _this.mTimerFactoryReset = setTimeout(function () {
                        _this.mAppConfig.tcpip_token = DEFAULT_TCPIP_TOKEN;
                        _this.mAppConfig.udp_token = DEFAULT_UDP_TOKEN;
                        _this.mAppConfig.meeting_room_name = DEFAULT_MEETING_ROOM_NAME;
                        _this.mAppConfig.company_name = DEFAULT_COMPANY_NAME;
                        _this.mAppConfig.tcp_listening_port = DEFAULT_TCP_LISTENING_PORT;
                        _this.mAppConfig.udp_listening_port = DEFAULT_UDP_LISTENING_PORT;
                        _this.mAppConfig.time_format = DEFAULT_TIME_FORMAT;
                        _this.mAppConfig.date_format = DEFAULT_DATE_FORMAT;
                        _this.mAppConfig.free_message = DEFAULT_FREE_MESSAGE;
                        _this.mAppConfig.next_title = DEFAULT_NEXT_TITLE;
                        _this.mAppConfig.version = APP_VERSION;
                        var data = JSON.stringify(_this.mAppConfig, null, 2);
                        fs.writeFile(__dirname + '/' + CONFIG_FILE_NAME, data, function (err) {
                            if (err) {
                                CLogger_1.CLogger.error('(CMain:run:#1) can\'t reset from factory');
                            }
                            else {
                                _this.mDisplayMeetingModule.resetDisplay(_this.mAppConfig);
                            }
                        });
                    }, TIMEOUT_FACTORY_RESET);
                }
            }
            else {
                if (_this.mTimerFactoryReset) {
                    clearTimeout(_this.mTimerFactoryReset);
                    _this.mTimerFactoryReset = null;
                }
            }
        });
        /*Display settings: PIN_SHOW_SETTINGS has to maintain a low level during TIMEOUT_DISPLAY_SETTINGS ms*/
        PIN_DISPLAY_SETTINGS.on('interrupt', function (level) {
            if (PIN_DISPLAY_SETTINGS.digitalRead() === 0) {
                if (_this.mTimerDisplaySettings === null) {
                    _this.mTimerDisplaySettings = setTimeout(function () {
                        _this.displaySettings();
                    }, TIMEOUT_DISPLAY_SETTINGS);
                }
            }
            else {
                if (_this.mTimerDisplaySettings) {
                    clearTimeout(_this.mTimerDisplaySettings);
                    _this.mTimerDisplaySettings = null;
                }
                _this.mDisplayMeetingModule.resetDisplay(_this.mAppConfig);
            }
        });
        /*REST POST: update meetings events
        * param: Array of events meetings
        *		{
        *			"force_update": <force display update avoiding comparaison between stored and incomming events : true or false>,
        *			"events":
        *			[
        *				{
        *					"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
        *					"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
        *					"date": "<date of meeting, french format e.g. 31/04/2020>"
        *					"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
        *				},
        *				....
        *			]
        *		}
        */
        this.mExpressModule.post(REST_POST_EVENTS, function (req, res) {
            var scheduledEvents = req.body.events;
            var bForceUpdate = (req.body.force_update === "true") ? true : false;
            res.send('ok');
            /**/
            var updateStatus = _this.mEventsManagement.update(scheduledEvents, bForceUpdate);
            _this.updateEventsDisplay(updateStatus);
        });
        /*REST POST: set configuration
            param: req.body
            {
                "meeting_room_name": "{name of the meeting room, e.g.: 'PARIS'}",
                "company_name": "{name of the company, e.g.: 'myCompany'}"
            }
        */
        this.mExpressModule.post(REST_POST_SETTINGS, function (req, res) {
            for (var _i = 0, _a = Object.keys(req.body); _i < _a.length; _i++) {
                var key = _a[_i];
                if (req.body.hasOwnProperty(key)) {
                    _this.mAppConfig[key] = req.body[key];
                }
            }
            /*format and write JSON config*/
            var data = JSON.stringify(_this.mAppConfig, null, 2);
            fs.writeFile(__dirname + '/' + CONFIG_FILE_NAME, data, function (err) {
                if (err) {
                    res.send('can\'t write configuration file');
                }
                else {
                    _this.mDisplayMeetingModule.resetDisplay(_this.mAppConfig);
                    res.send('ok');
                }
            });
        });
        /*REST POST: reboot device
        */
        this.mExpressModule.post(REST_POST_REBOOT, function (req, res) {
            res.send('ok');
            exec('shutdown -r now');
        });
        /*REST GET: retreive configuration
            return: configuration JSON file
        */
        this.mExpressModule.get(REST_GET_SETTINGS, function (req, res) {
            res.send(_this.mAppConfig);
        });
        /* UDP brodcast command. UDP buffer shall be format as : {"message":"<UDP_MESSAGE>", "token"; "<UDP_TOKEN>"}*/
        this.mUDPServer.on("message", (function (pMessage) {
            try {
                var UDPMessage = JSON.parse(pMessage);
                if (UDPMessage.token !== _this.mAppConfig.udp_token) {
                    return;
                }
                switch (UDPMessage.message) {
                    case UDP_DISPLAY_SETTINGS:
                        _this.displaySettings();
                        break;
                    case UDP_DISPLAY_MEETINGS:
                        _this.mDisplayMeetingModule.resetDisplay(_this.mAppConfig);
                        break;
                    default:
                        break;
                }
            }
            catch (e) {
                CLogger_1.CLogger.error('(CMain:run:#2) UDP message error: ' + e);
            }
        }));
        /*UDP listening: in order manage broadcast comman operation*/
        this.mUDPServer.on('listening', (function () {
            var address = _this.mUDPServer.address();
            CLogger_1.CLogger.info('(CMain:run:#3) UDP Server started and listening on ' + address.address + ":" + address.port);
        }));
    };
    CMain.mExpressModule = express();
    CMain.mAppConfig = {};
    CMain.mSPIModule = CSPI_1.CSPI;
    CMain.mEventsManagement = CEvents_1.CEvents;
    CMain.mTimerFactoryReset = null;
    CMain.mTimerDisplaySettings = null;
    CMain.mTimerRegisterToServer = null;
    return CMain;
}());
exports.CMain = CMain;
/**
* async function is mandatory because of await call
*/
function start() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, CMain.init()];
                case 1:
                    _a.sent();
                    CMain.run();
                    return [2 /*return*/];
            }
        });
    });
}
/**
* Main entry
*/
start();
//# sourceMappingURL=CMain.js.map