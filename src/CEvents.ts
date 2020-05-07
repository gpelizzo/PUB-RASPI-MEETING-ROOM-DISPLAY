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
*	Author: Gilles PELIZZO <rhttps://www.linkedin.com/in/pelizzo/>
*	Date: April 20th, 2020.
*/

/* load moment library */
const moment = require('moment'); 

import { CLogger } from './CLogger';

/**
* 	Manage meetings events. 
*	extract current meeting, pendings meetings and sort
*/
export class CEvents {
	/*current mmeeting*/
	private static mCurrentEvent: any = {};
	/* array of pending meetings*/
	private static mPendingEvents: any = [];
	
	/*timeout closk alarm*/
	private static mClockAlarmTimeout: any = null;
	
	/*clock alarm callback reference*/
	private static mClockElaspeCallback: any;

	
	/**
	* Init(clear) current and pending meetings. Insert dummy value in order to ensure display refresh from starting vs free meeting room
	* param pClockElaspeCallback: clock alarm elapse callback
	*/
	public static init(pClockElaspeCallback: any) {
		this.mCurrentEvent = {dummy: true};
		this.mPendingEvents = [{dummy: true}];
		
		this.mClockElaspeCallback = pClockElaspeCallback;
	}
	
	/**
	* retreive current meeting
	* return:
	*	{
	*		"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
	*		"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
	*		"date": "<date of meeting, french format e.g. 31/04/2020>"
	*		"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
	*	},
	*/
	public static getCurrentEvent(): any {
		return this.mCurrentEvent;
	}
	
	/**
	* retreive pending meetings
	* return:
	*	[
	*		{
	*			"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
	*			"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
	*			"date": "<date of meeting, french format e.g. 31/04/2020>"
	*			"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
	*		},
	*		....
	*	]
	*/
	public static getPendingEvents(): any {
		return this.mPendingEvents;
	}
	
	public static getMergedCurrentPendingEvents(): any {
		let listEvents = this.mPendingEvents;
		
		if (Object.keys(this.mCurrentEvent).length !== 0) {
			listEvents.push(this.mCurrentEvent);
		}
		
		return listEvents;
	}

	/**
	* update/init current and pending meetings
	* param pEventsList: array of json fiiled with event meetings. Should normaly concern only the current day 
	*	[
	*		{
	*			"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
	*			"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
	*			"date": "<date of meeting, french format e.g. 31/04/2020>"
	*			"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
	*		},
	*		....
	*	]
	* param bForceUpdate: true to update anyway without performing any comparaison
	* return retValue: 
	*	{
	*		"current_updated": true is current meeting has changed. Else, false.
	*		"pending_updated": true if pending meetings list has changed. Else, false. 
	*		"pending_updated_position": <optional>. If pending_updated is true, this value contains the ordered position of the change among pending meetings. 
	*			This in order to avoid refreshing the display if change concerns not yet display pending meeting(s). The position if eventually managed by calling function.
	*	}
	*/
	public static update(pEventsList: any, bForceUpdate: boolean): any {
		/*create temporary current and pending meetings storage*/
		let currentEvent: any = {};
		let pendingEvents: any = [];
		
		/**/
		let retValue: any = {};
		
		/*iterate event meetings list*/
		pEventsList.forEach((evt: any) => {
			const mnt_start = moment(evt.date + ' ' + evt.start_time, 'DD/MM/yyyy hh:mm');
			const mnt_stop = moment(evt.date + ' ' + evt.stop_time, 'DD/MM/yyyy hh:mm');
		
			if (moment().isAfter(mnt_stop)) {
				//skip event meeting because past
			}
			
			if (moment().isBefore(mnt_start)) {
				//event meetings has not yet started. Must be added to pending list storage
				pendingEvents.push(evt);					
			}
			
			if (moment().isBetween(mnt_start, mnt_stop)) {
				//event meeting is currently in progress. Must be added to current storage
				currentEvent = evt;
			}
		});
		
		//sort pending event meetings from recent to last
		pendingEvents = pendingEvents.sort((pEvtA: any, pEvtB: any) => {
			const evtA_start = moment(pEvtA.date + ' ' + pEvtA.start_time, 'DD/MM/yyyy hh:mm');
			const evtB_start = moment(pEvtB.date + ' ' + pEvtB.start_time, 'DD/MM/yyyy hh:mm');
			
			if (evtA_start.isBefore(evtB_start)) {
				return -1;
			}
			
			if (evtA_start.isAfter(evtB_start)) {
				return 1;
			}
			
			return 0;
		});		
		
		/*check if the new current event meeting has changed*/
		if (!this.compareEvent(currentEvent, this.mCurrentEvent)) {
			this.mCurrentEvent = currentEvent;
			retValue.current_updated = true;
			
		} else {
			retValue.current_updated = false;
		}
		
		/*check if pending event meetings has changed. Also calculate the position of the change*/
		const counter: Number = this.compareEventsArray(pendingEvents, this.mPendingEvents);
		if (counter > -1) {			
			this.mPendingEvents = pendingEvents;
			retValue.pending_updated = true;
			retValue.pending_updated_position = counter;
		} else {
			retValue.pending_updated = false;
		}
		
		/*eventually, set/reset clock alarm*/
		if (Object.keys(this.mCurrentEvent).length !== 0) {
			this.setClockAlarm(moment(this.mCurrentEvent.date + ' ' + this.mCurrentEvent.stop_time, 'DD/MM/yyyy hh:mm'));
			CLogger.debug('(CEvents:update:#1) next alarm is: ' + this.mCurrentEvent.stop_time);
		} else {
			if (this.mPendingEvents.length !== 0) {
				this.setClockAlarm(moment(this.mPendingEvents[0].date + ' ' + this.mPendingEvents[0].start_time, 'DD/MM/yyyy hh:mm'));
				CLogger.debug("(CEvents:update:#2) next alarm is: " + this.mPendingEvents[0].start_time);
			} else {
				this.clearClockAlarm();
				CLogger.debug('(CEvents:update:#3) no alarm');
			}
		}

		if (bForceUpdate) {
			retValue.current_updated = true;
			retValue.pending_updated = true;
			retValue.pending_updated_position = 0;
		}
		
		return retValue;
	}
	
	
	/**
	* compare events meetings
	* param pEvtA: primary event to compare. 
	* param pEvtB: secondary event to compare
	* 	both have following structure
	*		{
	*			"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
	*			"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
	*			"date": "<date of meeting, french format e.g. 31/04/2020>"
	*			"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
	*		}
	* return true if any change has been founded., Else, false
	*/
	private static compareEvent(pEvtA: any, pEvtB: any): boolean {
		if ((Object.keys(pEvtA).length === 0) || (Object.keys(pEvtB).length === 0)) {
			if (Object.keys(pEvtA).length !== Object.keys(pEvtB).length) {
				return false;
			} else {
				return true;
			}
		}
		
		for (let key of Object.keys(pEvtA)) {
			if (!pEvtB.hasOwnProperty(key)) {
				return false;
			} else {
				if (pEvtA[key] !== pEvtB[key]) {
					return false;
				}
			}
		}
		
		return true;
	}	
	
	/**
	* compare events meetings array
	* param pEvtA: primary events array to compare. 
	* param pEvtB: secondary event array to compare
	* 	both have following structure
	*		[
	*			{
	*				"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
	*				"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
	*				"date": "<date of meeting, french format e.g. 31/04/2020>"
	*				"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
	*			},
	*			....
	*		]
	* return <number greater than -1> if any change has been founded. This number is the ordered position of the change (0 means one the array is empty).  Else, -1
	*/
	private static compareEventsArray(pEvtArrayA: any, pEvtArrayB: any): Number {
		if ((pEvtArrayA.length === 0) || (pEvtArrayB.length === 0)) {
			if (pEvtArrayA.length !== pEvtArrayB.length) {
				return 0;
			} else {
				return -1;
			}
		}

		for (let index=0; index < Math.min(pEvtArrayA.length, pEvtArrayB.length); index++) {
			if (!this.compareEvent(pEvtArrayA[index], pEvtArrayB[index])) {
				return index;
			}
		}
		
		if ((pEvtArrayA.length) !== (pEvtArrayB.length)) {
			return Math.min(pEvtArrayA.length, pEvtArrayB.length) + 1;
		}
		
		return -1;
	}
	
	/**
	* Create a clock alarm. After time elapse, member callback is called, filled with parent this reference 
	* param pClockAlarm: moment object representing date and time of the alarm. 
	*/
	private static setClockAlarm(pClockAlarm: any) {
		
		this.clearClockAlarm();
		
		let now = moment();

		let timeout = moment.duration(pClockAlarm.diff(now)).as('milliseconds');

		this.mClockAlarmTimeout = setTimeout(() => {
			this.mClockElaspeCallback();
		}, timeout);
	}
	
	/**
	* clear/stop current clock alarm. 
	*/
	private static clearClockAlarm() {
		if (this.mClockAlarmTimeout) {
			clearTimeout(this.mClockAlarmTimeout);
			this.mClockAlarmTimeout = null;
		}
	}
}