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
/* load 2D canvas library */
var createCanvas = require('canvas').createCanvas;
/* load moment library */
var moment = require('moment');
/* define height of display areas*/
var DISPLAY_HEADER_HEIGHT = 50; //header: name of meeting room
var DISPLAY_FOOTER_HEIGHT = 30; //footer: company name (left) and current date (right)
var DISPLAY_BODY_CURRENT_HEIGHT = 90; //current meeting room status: Free or Busy (incl. details) 
var DISPLAY_BODY_PENDING_HEIGHT = 130; //next/pending meetings 
var MAX_PENDING_MEETINGS = 3; //maximum pendif meeting to display
var DISPLAY_CANVAS_FILL_NORMAL = 'rgba(255, 255, 255, 100)';
var DISPLAY_CANVAS_FILL_INVERT = 'rgba(0, 0, 0, 100)';
var DISPLAY_COLOR;
(function (DISPLAY_COLOR) {
    DISPLAY_COLOR[DISPLAY_COLOR["black_white"] = 0] = "black_white";
    DISPLAY_COLOR[DISPLAY_COLOR["color"] = 1] = "color";
})(DISPLAY_COLOR || (DISPLAY_COLOR = {}));
var DISPLAY_MODE;
(function (DISPLAY_MODE) {
    DISPLAY_MODE[DISPLAY_MODE["normal"] = 0] = "normal";
    DISPLAY_MODE[DISPLAY_MODE["invert"] = 1] = "invert";
})(DISPLAY_MODE || (DISPLAY_MODE = {}));
var DISPLAY_CLEAR;
(function (DISPLAY_CLEAR) {
    DISPLAY_CLEAR[DISPLAY_CLEAR["black_white"] = 0] = "black_white";
    DISPLAY_CLEAR[DISPLAY_CLEAR["color"] = 1] = "color";
    DISPLAY_CLEAR[DISPLAY_CLEAR["both"] = 2] = "both";
    DISPLAY_CLEAR[DISPLAY_CLEAR["none"] = 3] = "none";
})(DISPLAY_CLEAR || (DISPLAY_CLEAR = {}));
var DATE_FORMAT;
(function (DATE_FORMAT) {
    DATE_FORMAT["fr"] = "FR";
    DATE_FORMAT["us"] = "US";
})(DATE_FORMAT || (DATE_FORMAT = {}));
var TIME_FORMAT;
(function (TIME_FORMAT) {
    TIME_FORMAT["twenty_four"] = "24h";
    TIME_FORMAT["twelve"] = "12h";
})(TIME_FORMAT || (TIME_FORMAT = {}));
/**
* 	Manage display operations.
*	drawings are perfomed inside 2D canvas. One canvas per color
*/
var CDisplay = /** @class */ (function () {
    /**
    * Construct instance of display module
    * param pEPDModule: EPD module
    */
    function CDisplay(pEPDModule, pConfig) {
        this.mConfig = {};
        /*init EPD module*/
        this.mEPDModule = pEPDModule;
        /*set some display settings, e.g.:
            {
                free_message: "<Message to display if room is free, e.g.: "Free">",
                next_title: "<top-left title of pending meetings, e.g;: "Next:">",
                time_format: "<time format: "24h" => "14:34", "12h" => "2:34PM" >",
                date_format: "<date format: "FR" => "31/04/2020", "US" => "04/31/2020">"
            }
        */
        this.mConfig = pConfig;
        /*init black&white 2D canvas and context*/
        this.mCanvasBlack = createCanvas(this.mEPDModule.getEPDWidth(), this.mEPDModule.getEPDHeight());
        this.mCtxmCanvasBlack = this.mCanvasBlack.getContext('2d');
        //this.mCtxmCanvasBlack.globalAlpha  = 0.5;
        //this.mCtxmCanvasBlack.imageSmoothingQuality = 'high';
        //this.mCtxmCanvasBlack.imageSmoothingEnabled = true;
        //this.mCtxmCanvasBlack.globalCompositeOperation = 'copy';
        /*init color 2D canvas and context*/
        this.mCanvasColor = createCanvas(this.mEPDModule.getEPDWidth(), this.mEPDModule.getEPDHeight());
        this.mCtxmCanvasColor = this.mCanvasColor.getContext('2d');
        //this.mCtxmCanvasColor.globalAlpha  = 0.5;
        //this.mCtxmCanvasColor.imageSmoothingQuality = 'high';
        //this.mCtxmCanvasColor.imageSmoothingEnabled = true;
        //this.mCtxmCanvasColor.globalCompositeOperation = 'copy';
    }
    Object.defineProperty(CDisplay.prototype, "maxPendingMeetings", {
        get: function () {
            return MAX_PENDING_MEETINGS;
        },
        enumerable: true,
        configurable: true
    });
    /**
    * Init partial 2D context canvas corresponding to the following params
    * param pYPosition: top left position of the canvas
    * param pHeight: height of the canvas
    * param pDisplayColor: canvas color (cf DISPLAY_COLOR enum)
    * param pDisplayMode: normal or invert display (cf DISPLAY_MODE enum) => set background color
    * param pClearMode: tell if clearance has to be performed (cf DISPLAY_CLEAR enum)
    * return 2D canvas context
    */
    CDisplay.prototype.getCanvasContextArea = function (pYPosition, pHeight, pDisplayColor, pDisplayMode, pClearMode) {
        /*clear partial 2D canvas corresponding to the color*/
        if ((pClearMode == DISPLAY_CLEAR.color) || (pClearMode == DISPLAY_CLEAR.both)) {
            this.mCtxmCanvasColor.clearRect(0, pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
        }
        if ((pClearMode == DISPLAY_CLEAR.black_white) || (pClearMode == DISPLAY_CLEAR.both)) {
            this.mCtxmCanvasBlack.clearRect(0, pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
        }
        /*retrevive 2D canvas and context*/
        var ctx = (pDisplayColor == DISPLAY_COLOR.black_white) ? this.mCtxmCanvasBlack : this.mCtxmCanvasColor;
        var canvas = (pDisplayColor == DISPLAY_COLOR.black_white) ? this.mCanvasBlack : this.mCanvasColor;
        /*fill partial 2D canvas according to the diplay mode invert or normal*/
        if (pDisplayMode == DISPLAY_MODE.normal) {
            ctx.strokeStyle = DISPLAY_CANVAS_FILL_NORMAL;
            ctx.strokeRect(0, pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
            ctx.fillStyle = DISPLAY_CANVAS_FILL_NORMAL;
        }
        else {
            ctx.fillStyle = DISPLAY_CANVAS_FILL_NORMAL;
            ctx.fillRect(0, pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
            ctx.fillStyle = DISPLAY_CANVAS_FILL_INVERT;
        }
        return ctx;
    };
    /**
    * Set diplay area: current meeting
    * param pData:
    *		CASE 1: meeting room is free. Display is normal, B&W
    *		{
    *			<empty json>
    *		}
    *		CASE 2: meeting room is booked. Display is inverted, Colored
    *		{
    *			"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
    *			"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
    *			"date": "<date of meeting, french format e.g. 31/04/2020>"
    *			"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
    *		}
    */
    CDisplay.prototype.setDisplayBodyCurrent = function (pData) {
        var MARGIN_TOP_BOTTOM = 18;
        var yPosition = DISPLAY_HEADER_HEIGHT;
        var timeRange = this.buildTimeRange(pData.start_time, pData.stop_time, this.mConfig.time_format);
        if (Object.keys(pData).length === 0) {
            var ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_CURRENT_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);
            ctx.font = '28px verdana';
            ctx.fillText(this.mConfig.free_message, (this.mEPDModule.getEPDWidth() / 2) - (ctx.measureText(this.mConfig.free_message).width / 2), yPosition + (DISPLAY_BODY_CURRENT_HEIGHT / 2) + ((ctx.measureText(this.mConfig.free_message).actualBoundingBoxAscent - ctx.measureText(this.mConfig.free_message).actualBoundingBoxDescent) / 2));
        }
        else {
            var ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_CURRENT_HEIGHT, DISPLAY_COLOR.color, DISPLAY_MODE.invert, DISPLAY_CLEAR.both);
            ctx.font = '28px verdana';
            ctx.fillText(timeRange, (this.mEPDModule.getEPDWidth() / 2) - (ctx.measureText(timeRange).width / 2), yPosition + (DISPLAY_BODY_CURRENT_HEIGHT / 2) + ((ctx.measureText(timeRange).actualBoundingBoxAscent - ctx.measureText(timeRange).actualBoundingBoxDescent) / 2) - MARGIN_TOP_BOTTOM);
            ctx.fillText(pData.topic, (this.mEPDModule.getEPDWidth() / 2) - (ctx.measureText(pData.topic).width / 2), yPosition + (DISPLAY_BODY_CURRENT_HEIGHT / 2) + ((ctx.measureText(pData.topic).actualBoundingBoxAscent - ctx.measureText(pData.topic).actualBoundingBoxDescent) / 2) + MARGIN_TOP_BOTTOM);
        }
    };
    /**
    * Set diplay area: pending meetings
    * param pData:
    *		CASE 1: no meeting is pending. Display is normal, B&W
    *		[
    *			<empty array>
    *		]
    *		CASE 2: meetings are pending (MAX_PENDING_MEETINGS can be displayed). Display is inverted, Colored
    *		[
    *			{
    *				"start_time": "<start time of meeting, 24h format e.g.: 12:00>",
    *				"stop_time": "<end time of meeting, 24h format e.g.: 14:30>",
    *				"date": "<date of meeting, french format e.g. 31/04/2020>"
    *				"topic": "{meeting topic/title, e.g.: 'COMEX Weekly meeting'}"
    *			},
    *			....
    *		]
    */
    CDisplay.prototype.setDisplayBodyPending = function (pData) {
        var TITLE_MARGING_LEFT = 5;
        var TITLE_MARGING_TOP = 5;
        var TITLE_MARGING_BOTTOM = 5;
        var MEETING_RECT_MARGIN_TOP = 5;
        var MEETING_RECT_HEIGHT = 34;
        var MEETING_RECT_SPACE = 2;
        var yPosition = DISPLAY_HEADER_HEIGHT + DISPLAY_BODY_CURRENT_HEIGHT;
        var ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_PENDING_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);
        ctx.font = '15px verdana';
        var tileHeight = ctx.measureText(this.mConfig.next_title).actualBoundingBoxAscent + ctx.measureText(this.mConfig.next_title).actualBoundingBoxDescent;
        ctx.fillText(this.mConfig.next_title, TITLE_MARGING_LEFT, yPosition + ((ctx.measureText(this.mConfig.next_title).actualBoundingBoxAscent - ctx.measureText(this.mConfig.next_title).actualBoundingBoxDescent)) + TITLE_MARGING_TOP);
        if (pData.length === 0) {
            ctx.font = '28px verdana';
            ctx.fillText(this.mConfig.free_message, (this.mEPDModule.getEPDWidth() / 2) - (ctx.measureText(this.mConfig.free_message).width / 2), yPosition + (DISPLAY_BODY_PENDING_HEIGHT / 2) + ((ctx.measureText(this.mConfig.free_message).actualBoundingBoxAscent - ctx.measureText(this.mConfig.free_message).actualBoundingBoxDescent) / 2));
        }
        else {
            ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_PENDING_HEIGHT, DISPLAY_COLOR.color, DISPLAY_MODE.normal, DISPLAY_CLEAR.color);
            ctx.font = '18px verdana';
            var iCounter = void 0;
            for (iCounter = 0; (iCounter < pData.length) && (iCounter < MAX_PENDING_MEETINGS); iCounter++) {
                var topPosition = yPosition + tileHeight + TITLE_MARGING_TOP + TITLE_MARGING_BOTTOM + (iCounter * (MEETING_RECT_HEIGHT + MEETING_RECT_SPACE));
                ctx.fillStyle = DISPLAY_CANVAS_FILL_NORMAL;
                ctx.fillRect(0, topPosition, this.mEPDModule.getEPDWidth(), MEETING_RECT_HEIGHT);
                ctx.fillStyle = DISPLAY_CANVAS_FILL_INVERT;
                var message = this.buildTimeRange(pData[iCounter].start_time, pData[iCounter].stop_time, this.mConfig.time_format) + ": " + pData[iCounter].topic;
                ctx.fillText(message, TITLE_MARGING_LEFT, topPosition + (MEETING_RECT_HEIGHT / 2) + ((ctx.measureText(message).actualBoundingBoxAscent - ctx.measureText(message).actualBoundingBoxDescent) / 2));
            }
        }
    };
    /**
    * Set diplay area: footer (company name and current date)
    * param pData:
    *		{
    *			"company_name": "{name of the company, e.g.: 'myCompany'}",
    *			"date": "{date of the current day, e.g.: '03/30/20'}"
    *		}
    */
    CDisplay.prototype.setDisplayFooter = function (pData) {
        var yPosition = DISPLAY_HEADER_HEIGHT + DISPLAY_BODY_CURRENT_HEIGHT + DISPLAY_BODY_PENDING_HEIGHT;
        var ctx = this.getCanvasContextArea(yPosition, DISPLAY_FOOTER_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.invert, DISPLAY_CLEAR.both);
        ctx.font = '18px verdana';
        ctx.fillText(pData.company_name, 10, (DISPLAY_FOOTER_HEIGHT / 2) + ((ctx.measureText(pData.company_name).actualBoundingBoxAscent - ctx.measureText(pData.company_name).actualBoundingBoxDescent) / 2)
            + yPosition);
        ctx.fillText(pData.date, this.mEPDModule.getEPDWidth() - ctx.measureText(pData.date).width - 10, (DISPLAY_FOOTER_HEIGHT / 2) + ((ctx.measureText(pData.date).actualBoundingBoxAscent - ctx.measureText(pData.date).actualBoundingBoxDescent) / 2)
            + yPosition);
    };
    /**
    * Set diplay area: Header (meeting room name)
    * param pData:
    *		{
    *			"meeting_room_name": "{name of the meeting room, e.g.: 'PARIS'}",
    *		}
    */
    CDisplay.prototype.setDisplayHeader = function (pData) {
        var ctx = this.getCanvasContextArea(0, DISPLAY_HEADER_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.invert, DISPLAY_CLEAR.both);
        ctx.font = '38px verdana';
        ctx.fillText(pData.meeting_room_name, (this.mEPDModule.getEPDWidth() / 2) - (ctx.measureText(pData.meeting_room_name).width / 2), (DISPLAY_HEADER_HEIGHT / 2) + ((ctx.measureText(pData.meeting_room_name).actualBoundingBoxAscent - ctx.measureText(pData.meeting_room_name).actualBoundingBoxDescent) / 2));
    };
    /**
    * Fill whole display with string passed as parameter
    * param pAppConfig: string data to display
    */
    CDisplay.prototype.simpleDisplay = function (pData) {
        var ctx = this.getCanvasContextArea(0, this.mEPDModule.getEPDHeight(), DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);
        ctx.font = '14px arial';
        ctx.fillText(pData, 10, 20);
        this.updateDisplay();
    };
    /**
    * update EPD display module with current canvas.
    * This action has to be perfomed after a canvas (or both) has been updated
    */
    CDisplay.prototype.updateDisplay = function () {
        this.mEPDModule.updateDisplay(this.mCtxmCanvasBlack.getImageData(0, 0, this.mCanvasBlack.width, this.mCanvasBlack.height), this.mCtxmCanvasColor.getImageData(0, 0, this.mCanvasBlack.width, this.mCanvasBlack.height));
    };
    /**
    * Reset whole display and init header and footer
    * param pAppConfig: meeting room config
    *		{
    *			.......
    *			"meeting_room_name": "{name of the meeting room, e.g.: 'PARIS'}",
    *			"company_name": "{name of the company, e.g.: 'myCompany'}"
    *			....
    *		}
    */
    CDisplay.prototype.resetDisplay = function (pAppConfig) {
        var ctx = this.getCanvasContextArea(0, this.mEPDModule.getEPDHeight(), DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);
        this.setDisplayHeader({ meeting_room_name: pAppConfig.meeting_room_name });
        this.setDisplayFooter({ company_name: pAppConfig.company_name, date: ((this.mConfig.date_format === DATE_FORMAT.fr) ? moment().format("DD/MM/YY") : moment().format("MM/DD/YY")) });
        this.updateDisplay();
    };
    /**
    * Build time range string to display
    * param pStartTime: <string> start time of meeting
    * param pStopTime: <string> stop time of meeting
    * param pFormat: format of time, cf TIME_FORMAT enum
    *
    * return timeRange: <string> formated time range, e.g: "15:30-16h00" or '3:30PM-4:00PM'
    */
    CDisplay.prototype.buildTimeRange = function (pStartTime, pStopTime, pFormat) {
        var mnt_start = moment(pStartTime, 'hh:mm');
        var mnt_stop = moment(pStopTime, 'hh:mm');
        var timeRange;
        if (pFormat === TIME_FORMAT.twenty_four) {
            timeRange = mnt_start.format('HH:mm') + '-' + mnt_stop.format('HH:mm');
        }
        else {
            timeRange = mnt_start.format('hh:mmA') + '-' + mnt_stop.format('hh:mmA');
        }
        return timeRange;
    };
    return CDisplay;
}());
exports.CDisplay = CDisplay;
//# sourceMappingURL=CDisplay.js.map