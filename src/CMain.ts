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

import { CSPI } from './epd/CSPI'; 
import { CEPD42b } from './epd/CEPD42b'; 
import { CDisplay } from './CDisplay'; 
import { CEvents } from './CEvents';
import { CLogger } from './CLogger';

import getMAC from 'getmac'; 
const Gpio = require('pigpio').Gpio;
const express = require('express');
const body = require('body-parser');
const fs = require('fs');
const internalIp = require('internal-ip');
const dgram = require('dgram');
const exec = require('child_process').exec;
const getmac = require('getmac');
const moment = require('moment'); 
const http = require('http');

/*GPIO to maintain to low during TIMEOUT_DISPLAY_SETTINGS in order to display settings. A short triggering action will reset back to meeting display*/
const PIN_DISPLAY_SETTINGS = new Gpio(16, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, edge: Gpio.EITHER_EDGE});
/*GPIO to maintain to low during TIMEOUT_FACTORY_RESET in order to reset settings */
const PIN_FACTORY_RESET = new Gpio(26, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, edge: Gpio.EITHER_EDGE});

/*duration of the action to maintain PIN_FACTORY_RESET to low before performing factory reset*/
const TIMEOUT_FACTORY_RESET = 8000;
/*duration of the action to maintain PIN_DISPLAY_SETTINGS to low before displaying settings*/
const TIMEOUT_DISPLAY_SETTINGS = 5000;
/*time before starting to register to server - waiting for display refreshing after booting*/
const TIMER_REGISTER_TO_SERVER = 20000;
/*time between attempts to register to server*/
const TIMEOUT_REGISTER_TO_SERVER = 5000;

const CONFIG_FILE_NAME = 'config.json';

const DEFAULT_TCPIP_TOKEN = '123456';
const DEFAULT_UDP_TOKEN = '654321';
const DEFAULT_TCP_LISTENING_PORT = 8080;
const DEFAULT_UDP_LISTENING_PORT = 8089;
const DEFAULT_COMPANY_NAME = 'myCompany';
const DEFAULT_MEETING_ROOM_NAME = 'My Room Name';
const DEFAULT_TIME_FORMAT = '24h';
const DEFAULT_DATE_FORMAT = 'FR';
const DEFAULT_FREE_MESSAGE = 'Free'
const DEFAULT_NEXT_TITLE = 'Next:';

/*express TCP-IP REST commands*/
const REST_POST_EVENTS = '/events';					//set meetings events
const REST_POST_SETTINGS = '/settings';				//set settings
const REST_POST_REBOOT = '/reboot';					//reboot device
const REST_GET_SETTINGS = '/settings';				//get settings

/*UDP broadcasted commands*/
const UDP_DISPLAY_SETTINGS = 'display-config';		//display settings
const UDP_DISPLAY_MEETINGS = 'display-meetings';	//display meetings

const APP_VERSION = '1.0.0';

/**
* 	Main class
*/
export class CMain {
	private static mExpressModule = express();
	private static mAppConfig: any = {};
	private static mSPIModule = CSPI;
	private static mEPDScreenModule: CEPD42b;
	private static mDisplayMeetingModule: CDisplay;
	private static mUDPServer: any;
	private static mEventsManagement = CEvents;
	
	private static mTimerFactoryReset: any = null;
	private static mTimerDisplaySettings: any = null;
	private static mTimerRegisterToServer: any = null;
	
	/**
	* Init: perform modules configuration 
	*/
	public static async init() {
		/*retreive configuration from file*/
		this.readConfig();
		
		/* init global logger module */
		CLogger.init(this.mAppConfig.logs_path, this.mAppConfig.log_level);
		
		/*init express and map token verification*/
		this.mExpressModule.use(body.json());
		this.mExpressModule.use(this.verifyToken(this));
		
		/*init SPI interface*/
		this.mSPIModule.init();
		
		/*create and init instance of EPD display module*/
		this.mEPDScreenModule = new CEPD42b(this.mSPIModule);
		await this.mEPDScreenModule.init();
			
		
		/*create instance of meeting room diplay module. Pass EPD module instance and diplay default config */
		this.mDisplayMeetingModule = new CDisplay(this.mEPDScreenModule, {
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
		this.mExpressModule.listen(this.mAppConfig.tcp_listening_port, () => {
			CLogger.info('(CMain:init:#1) Server started on port ' + this.mAppConfig.tcp_listening_port);
		});
		
		/*set UDP to listen incoming broadcasting messages. special sommands*/
		this.mUDPServer = dgram.createSocket("udp4");
		this.mUDPServer.bind(this.mAppConfig.udp_listening_port);
		
		/* start interval timer up to events server response*/
		if (this.mTimerRegisterToServer === null) {
			setTimeout(() => {
				this.mTimerRegisterToServer = setInterval(() => {
					
					/*register to events server in order to receive events meeting notifications*/
					this.registerToEventsServer().then((data: any) => {
						if (data.status === 'true') {
							CLogger.info('(CMain:init:#2) succeeded to register to event server:' + data.value);
						} else {
							CLogger.error('(CMain:init:#3) failed to register to event server:' + data.value);
						}
						
						clearInterval(this.mTimerRegisterToServer);
					})
					.catch((error: any) => {
						CLogger.error('(CMain:init:#4) Events server registration failure: ' + error);
					});
					
				}, TIMEOUT_REGISTER_TO_SERVER);
			}, TIMER_REGISTER_TO_SERVER);
		}
	}
	
	/**
	* perform events server registration 
	*/
	private static registerToEventsServer(): any {
		
		const data = JSON.stringify({
		  ip: internalIp.v4.sync(),
		  mac: getMAC(),
		  meeting_room_id: this.mAppConfig.meeting_room_id,
		  date_time: moment().format('DD/MM/YY HH:mm')
		});

		const options: any = {
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
		
		return new Promise((resolve: any, reject: any) => {
			const request = http.request(options, (res: any) => {
				res.on('data', (data: any) => {
					resolve(JSON.parse(data));
				})
			});
			
			request.on('error', (error: any) => {
				reject(error);
			})
			
			request.write(data)
			request.end()
		});
	}
	
	/**
	* Diplay config parameters 
	*/
	private static displaySettings() {
		this.mDisplayMeetingModule.simpleDisplay(
				'Meeting room name: ' + this.mAppConfig.meeting_room_name + '\r\n' + 
				'Meeting room ID: ' + this.mAppConfig.meeting_room_id + '\r\n' + 
				'Company_name: ' + this.mAppConfig.company_name + '\r\n' + 
				'ip: ' + internalIp.v4.sync() + '\r\n' +
				'mac: ' + getMAC() + '\r\n' +
				'tcp listening port: ' + this.mAppConfig.tcp_listening_port + '\r\n' +
				'udp listening port: ' + this.mAppConfig.udp_listening_port + '\r\n' +
				'Events server IP: ' + this.mAppConfig.events_server_ip + '\r\n' +
				'Events server port: ' + this.mAppConfig.events_server_port + '\r\n' +
				'Date/Time: ' + moment().format('DD/MM/YY HH:mm')  + '\r\n' +
				'Version: ' + APP_VERSION);
	}
	
	/**
	* Read config parameters from file 
	*/
	private static readConfig() {
		let fileContent = fs.readFileSync(__dirname + '/' + CONFIG_FILE_NAME);
		this.mAppConfig = JSON.parse(fileContent);
		this.mAppConfig.version = APP_VERSION;
	}
	
	/**
	* Verify express REST command token
	* param pThis: main class this context in order to access mAppConfig variable member
	*/
	private static verifyToken(pThis: any) {
		return function(req: any, res: any, next: any) {
			if (!req.headers.hasOwnProperty("authorization")) {
				res.send('token is missing');
				return;
			}
			if (req.headers.authorization.replace("Bearer ", "") === pThis.mAppConfig.tcpip_token) {
				next();
			} else {
				res.send('token is incorrect');
				return;
			}
		}
	}
	
	/**
	* clockAlarm callback
	*/
	public static clockAlarm() {
		const updateStatus = this.mEventsManagement.update(this.mEventsManagement.getMergedCurrentPendingEvents(), false);
		this.updateEventsDisplay(updateStatus);
	}
	
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
	private static updateEventsDisplay(pStatus: any) {
		let bUpdateDisplay: boolean = false;
		if (pStatus.current_updated) {
			this.mDisplayMeetingModule.setDisplayBodyCurrent(this.mEventsManagement.getCurrentEvent());
			bUpdateDisplay = true;
		}
		
		if (pStatus.pending_updated) {
			if (pStatus.pending_updated_position <  this.mDisplayMeetingModule.maxPendingMeetings) {
				this.mDisplayMeetingModule.setDisplayBodyPending(this.mEventsManagement.getPendingEvents());
				bUpdateDisplay = true;
			}
		}
		
		if (bUpdateDisplay) {
			this.mDisplayMeetingModule.updateDisplay();
		}
	}

	/**Run listening GPIO interrupt, REST and UDP
	* param pThis: main class this context in order to access mAppConfig variable member
	*/
	public static run() {
		
		/*Factory reset: PIN_FACTORY_RESET has to maintain a low level during TIMEOUT_FACTORY_RESET ms*/
		PIN_FACTORY_RESET.on('interrupt', (level: any) => {
			if (PIN_FACTORY_RESET.digitalRead() === 0) {
				if (this.mTimerFactoryReset === null) {
					this.mTimerFactoryReset = setTimeout(() => {
						
					this.mAppConfig.tcpip_token = DEFAULT_TCPIP_TOKEN;
					this.mAppConfig.udp_token = DEFAULT_UDP_TOKEN;
					this.mAppConfig.meeting_room_name = DEFAULT_MEETING_ROOM_NAME;
					this.mAppConfig.company_name = DEFAULT_COMPANY_NAME;
					this.mAppConfig.tcp_listening_port = DEFAULT_TCP_LISTENING_PORT;
					this.mAppConfig.udp_listening_port = DEFAULT_UDP_LISTENING_PORT;
					this.mAppConfig.time_format = DEFAULT_TIME_FORMAT;
					this.mAppConfig.date_format = DEFAULT_DATE_FORMAT;
					this.mAppConfig.free_message = DEFAULT_FREE_MESSAGE;
					this.mAppConfig.next_title = DEFAULT_NEXT_TITLE;
					this.mAppConfig.version = APP_VERSION;
					
					let data = JSON.stringify(this.mAppConfig, null, 2);
					fs.writeFile(__dirname + '/' + CONFIG_FILE_NAME, data, (err: any) => {
						if (err) {
							CLogger.error('(CMain:run:#1) can\'t reset from factory');
						} else {
							this.mDisplayMeetingModule.resetDisplay(this.mAppConfig);
						}
					});	
						
					}, TIMEOUT_FACTORY_RESET);
				}
			} else {
				if (this.mTimerFactoryReset) {
					clearTimeout(this.mTimerFactoryReset);
					this.mTimerFactoryReset = null;
				}
			}
		});
		
		/*Display settings: PIN_SHOW_SETTINGS has to maintain a low level during TIMEOUT_DISPLAY_SETTINGS ms*/
		PIN_DISPLAY_SETTINGS.on('interrupt', (level: any) => {
			if (PIN_DISPLAY_SETTINGS.digitalRead() === 0) {
				if (this.mTimerDisplaySettings === null) {
					this.mTimerDisplaySettings = setTimeout(() => {
						this.displaySettings();
					}, TIMEOUT_DISPLAY_SETTINGS);
				}
			} else {
				if (this.mTimerDisplaySettings) {
					clearTimeout(this.mTimerDisplaySettings);
					this.mTimerDisplaySettings = null;
				}
				
				this.mDisplayMeetingModule.resetDisplay(this.mAppConfig);
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
		this.mExpressModule.post(REST_POST_EVENTS, (req: any, res: any) => {
			const scheduledEvents = req.body.events;
			const bForceUpdate = (req.body.force_update === "true") ? true : false;
			res.send('ok');
			
			/**/
			const updateStatus = this.mEventsManagement.update(scheduledEvents, bForceUpdate);
			this.updateEventsDisplay(updateStatus);
		});
		
		/*REST POST: set configuration
			param: req.body
			{
				"meeting_room_name": "{name of the meeting room, e.g.: 'PARIS'}",
				"company_name": "{name of the company, e.g.: 'myCompany'}"
			}
		*/
		this.mExpressModule.post(REST_POST_SETTINGS, (req: any, res: any) => {			
			for (let key of Object.keys(req.body)) {
				if (req.body.hasOwnProperty(key)) {
					this.mAppConfig[key] = req.body[key];
				}
			}
			
			/*format and write JSON config*/
			let data = JSON.stringify(this.mAppConfig, null, 2);
			fs.writeFile(__dirname + '/' + CONFIG_FILE_NAME, data, (err: any) => {
				if (err) {
					res.send('can\'t write configuration file');
				} else {
					this.mDisplayMeetingModule.resetDisplay(this.mAppConfig);
					res.send('ok');
				}
			});
		});
			
		
		/*REST POST: reboot device
		*/
		this.mExpressModule.post(REST_POST_REBOOT, (req: any, res: any) => {
			res.send('ok');
			exec('shutdown -r now');
		});
		
		/*REST GET: retreive configuration
			return: configuration JSON file
		*/
		this.mExpressModule.get(REST_GET_SETTINGS, (req: any, res: any) => {	
			res.send(this.mAppConfig);
		});
		
		
		/* UDP brodcast command. UDP buffer shall be format as : {"message":"<UDP_MESSAGE>", "token"; "<UDP_TOKEN>"}*/
		this.mUDPServer.on("message", ((pMessage: any) => {
			
			try {
				const UDPMessage = JSON.parse(pMessage);
				
				if (UDPMessage.token !== this.mAppConfig.udp_token) {
					return;
				}
				
				switch (UDPMessage.message) {
					case UDP_DISPLAY_SETTINGS:
						this.displaySettings();
					break;
					
					case UDP_DISPLAY_MEETINGS:
						this.mDisplayMeetingModule.resetDisplay(this.mAppConfig);
					break;
					
					default:
					break;
				}
			} catch(e) {
				CLogger.error('(CMain:run:#2) UDP message error: ' + e);
			}
		}));

		/*UDP listening: in order manage broadcast comman operation*/
		this.mUDPServer.on('listening', (() => {
			const address = this.mUDPServer.address(); 
			CLogger.info('(CMain:run:#3) UDP Server started and listening on ' + address.address + ":" + address.port);
		}));
	}
}

/**
* async function is mandatory because of await call
*/
async function start() {
	await CMain.init();
	CMain.run();
}

/**
* Main entry
*/
start();


