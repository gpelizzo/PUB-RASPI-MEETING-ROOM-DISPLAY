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
*	Author: Gilles PELIZZO <rhttps://www.linkedin.com/in/pelizzo/>
*	Date: April 20th, 2020.
*/
Object.defineProperty(exports, "__esModule", { value: true });
/* load moment library */
var moment = require('moment');
var CLogger_1 = require("./CLogger");
/**
* 	Manage meetings events.
*	extract current meeting, pendings meetings and sort
*/
var CEvents = /** @class */ (function () {
    function CEvents() {
    }
    /**
    * Init(clear) current and pending meetings. Insert dummy value in order to ensure display refresh from starting vs free meeting room
    * param pClockElaspeCallback: clock alarm elapse callback
    */
    CEvents.init = function (pClockElaspeCallback) {
        this.mCurrentEvent = { dummy: true };
        this.mPendingEvents = [{ dummy: true }];
        this.mClockElaspeCallback = pClockElaspeCallback;
    };
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
    CEvents.getCurrentEvent = function () {
        return this.mCurrentEvent;
    };
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
    CEvents.getPendingEvents = function () {
        return this.mPendingEvents;
    };
    CEvents.getMergedCurrentPendingEvents = function () {
        var listEvents = this.mPendingEvents;
        if (Object.keys(this.mCurrentEvent).length !== 0) {
            listEvents.push(this.mCurrentEvent);
        }
        return listEvents;
    };
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
    CEvents.update = function (pEventsList, bForceUpdate) {
        /*create temporary current and pending meetings storage*/
        var currentEvent = {};
        var pendingEvents = [];
        /**/
        var retValue = {};
        /*iterate event meetings list*/
        pEventsList.forEach(function (evt) {
            var mnt_start = moment(evt.date + ' ' + evt.start_time, 'DD/MM/yyyy hh:mm');
            var mnt_stop = moment(evt.date + ' ' + evt.stop_time, 'DD/MM/yyyy hh:mm');
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
        pendingEvents = pendingEvents.sort(function (pEvtA, pEvtB) {
            var evtA_start = moment(pEvtA.date + ' ' + pEvtA.start_time, 'DD/MM/yyyy hh:mm');
            var evtB_start = moment(pEvtB.date + ' ' + pEvtB.start_time, 'DD/MM/yyyy hh:mm');
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
        }
        else {
            retValue.current_updated = false;
        }
        /*check if pending event meetings has changed. Also calculate the position of the change*/
        var counter = this.compareEventsArray(pendingEvents, this.mPendingEvents);
        if (counter > -1) {
            this.mPendingEvents = pendingEvents;
            retValue.pending_updated = true;
            retValue.pending_updated_position = counter;
        }
        else {
            retValue.pending_updated = false;
        }
        /*eventually, set/reset clock alarm*/
        if (Object.keys(this.mCurrentEvent).length !== 0) {
            this.setClockAlarm(moment(this.mCurrentEvent.date + ' ' + this.mCurrentEvent.stop_time, 'DD/MM/yyyy hh:mm'));
            CLogger_1.CLogger.debug('(CEvents:update:#1) next alarm is: ' + this.mCurrentEvent.stop_time);
        }
        else {
            if (this.mPendingEvents.length !== 0) {
                this.setClockAlarm(moment(this.mPendingEvents[0].date + ' ' + this.mPendingEvents[0].start_time, 'DD/MM/yyyy hh:mm'));
                CLogger_1.CLogger.debug("(CEvents:update:#2) next alarm is: " + this.mPendingEvents[0].start_time);
            }
            else {
                this.clearClockAlarm();
                CLogger_1.CLogger.debug('(CEvents:update:#3) no alarm');
            }
        }
        if (bForceUpdate) {
            retValue.current_updated = true;
            retValue.pending_updated = true;
            retValue.pending_updated_position = 0;
        }
        return retValue;
    };
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
    CEvents.compareEvent = function (pEvtA, pEvtB) {
        if ((Object.keys(pEvtA).length === 0) || (Object.keys(pEvtB).length === 0)) {
            if (Object.keys(pEvtA).length !== Object.keys(pEvtB).length) {
                return false;
            }
            else {
                return true;
            }
        }
        for (var _i = 0, _a = Object.keys(pEvtA); _i < _a.length; _i++) {
            var key = _a[_i];
            if (!pEvtB.hasOwnProperty(key)) {
                return false;
            }
            else {
                if (pEvtA[key] !== pEvtB[key]) {
                    return false;
                }
            }
        }
        return true;
    };
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
    CEvents.compareEventsArray = function (pEvtArrayA, pEvtArrayB) {
        if ((pEvtArrayA.length === 0) || (pEvtArrayB.length === 0)) {
            if (pEvtArrayA.length !== pEvtArrayB.length) {
                return 0;
            }
            else {
                return -1;
            }
        }
        for (var index = 0; index < Math.min(pEvtArrayA.length, pEvtArrayB.length); index++) {
            if (!this.compareEvent(pEvtArrayA[index], pEvtArrayB[index])) {
                return index;
            }
        }
        if ((pEvtArrayA.length) !== (pEvtArrayB.length)) {
            return Math.min(pEvtArrayA.length, pEvtArrayB.length) + 1;
        }
        return -1;
    };
    /**
    * Create a clock alarm. After time elapse, member callback is called, filled with parent this reference
    * param pClockAlarm: moment object representing date and time of the alarm.
    */
    CEvents.setClockAlarm = function (pClockAlarm) {
        var _this = this;
        this.clearClockAlarm();
        var now = moment();
        var timeout = moment.duration(pClockAlarm.diff(now)).as('milliseconds');
        this.mClockAlarmTimeout = setTimeout(function () {
            _this.mClockElaspeCallback();
        }, timeout);
    };
    /**
    * clear/stop current clock alarm.
    */
    CEvents.clearClockAlarm = function () {
        if (this.mClockAlarmTimeout) {
            clearTimeout(this.mClockAlarmTimeout);
            this.mClockAlarmTimeout = null;
        }
    };
    /*current mmeeting*/
    CEvents.mCurrentEvent = {};
    /* array of pending meetings*/
    CEvents.mPendingEvents = [];
    /*timeout closk alarm*/
    CEvents.mClockAlarmTimeout = null;
    return CEvents;
}());
exports.CEvents = CEvents;
//# sourceMappingURL=CEvents.js.map