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

/* load 2D canvas library */
const { createCanvas } = require('canvas');

/* load moment library */
const moment = require('moment'); 

/* define height of display areas*/
const DISPLAY_HEADER_HEIGHT = 50;			//header: name of meeting room
const DISPLAY_FOOTER_HEIGHT = 30;			//footer: company name (left) and current date (right)
const DISPLAY_BODY_CURRENT_HEIGHT = 90;		//current meeting room status: Free or Busy (incl. details) 
const DISPLAY_BODY_PENDING_HEIGHT = 130;	//next/pending meetings 

const MAX_PENDING_MEETINGS = 3;				//maximum pendif meeting to display

const DISPLAY_CANVAS_FILL_NORMAL = 'rgba(255, 255, 255, 100)';
const DISPLAY_CANVAS_FILL_INVERT = 'rgba(0, 0, 0, 100)';

enum DISPLAY_COLOR {
	black_white,
	color
}

enum DISPLAY_MODE {
	normal,
	invert
}

enum DISPLAY_CLEAR {
	black_white,
	color,
	both,
	none
}

enum DATE_FORMAT {
	fr = "FR",
	us = "US"
}

enum TIME_FORMAT {
	twenty_four = "24h",
	twelve = "12h"
}


/**
* 	Manage display operations. 
*	drawings are perfomed inside 2D canvas. One canvas per color
*/
export class CDisplay {
	/*black&white canvas*/
	private mCanvasBlack: any;
	/*black&white 2D canvas context*/
	private mCtxmCanvasBlack: any;
	/*colore canvas*/
	private mCanvasColor: any;
	/*color 2D canvas context*/
	private mCtxmCanvasColor: any;
	
	/*WAVESHARE EPD display module*/
	private mEPDModule: any;
	
	private mConfig: any = {};
	
	/**
	* Construct instance of display module
	* param pEPDModule: EPD module
	*/
	constructor(pEPDModule: any, pConfig: any) {
		
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
	
	get maxPendingMeetings() {
		return MAX_PENDING_MEETINGS;
	}
	
	/**
	* Init partial 2D context canvas corresponding to the following params
	* param pYPosition: top left position of the canvas
	* param pHeight: height of the canvas
	* param pDisplayColor: canvas color (cf DISPLAY_COLOR enum)
	* param pDisplayMode: normal or invert display (cf DISPLAY_MODE enum) => set background color
	* param pClearMode: tell if clearance has to be performed (cf DISPLAY_CLEAR enum)
	* return 2D canvas context
	*/
	private getCanvasContextArea(pYPosition: number, pHeight: number, pDisplayColor: number, pDisplayMode: number, pClearMode: number): any {

		/*clear partial 2D canvas corresponding to the color*/
		if ((pClearMode == DISPLAY_CLEAR.color) || (pClearMode == DISPLAY_CLEAR.both)) {
			this.mCtxmCanvasColor.clearRect(0, pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
		}
		
		if ((pClearMode == DISPLAY_CLEAR.black_white) || (pClearMode == DISPLAY_CLEAR.both)) {
			this.mCtxmCanvasBlack.clearRect(0, pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
		}
		
		/*retrevive 2D canvas and context*/
		let ctx = (pDisplayColor == DISPLAY_COLOR.black_white) ? this.mCtxmCanvasBlack : this.mCtxmCanvasColor;
		let canvas = (pDisplayColor == DISPLAY_COLOR.black_white) ? this.mCanvasBlack : this.mCanvasColor;
		
		/*fill partial 2D canvas according to the diplay mode invert or normal*/
		if (pDisplayMode == DISPLAY_MODE.normal) {
			ctx.strokeStyle  = DISPLAY_CANVAS_FILL_NORMAL;
			ctx.strokeRect(0,  pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
			ctx.fillStyle = DISPLAY_CANVAS_FILL_NORMAL;
		} else {
			ctx.fillStyle = DISPLAY_CANVAS_FILL_NORMAL;
			ctx.fillRect(0,  pYPosition, this.mEPDModule.getEPDWidth(), pHeight);
			ctx.fillStyle = DISPLAY_CANVAS_FILL_INVERT;
		}
		
		return ctx;
	}
	
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
	public setDisplayBodyCurrent(pData: any) {
		
		const MARGIN_TOP_BOTTOM = 18;
		
		const yPosition = DISPLAY_HEADER_HEIGHT;
		
		const timeRange: string = this.buildTimeRange(pData.start_time, pData.stop_time, this.mConfig.time_format);
		
		if (Object.keys(pData).length === 0) {
			const ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_CURRENT_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);
			ctx.font = '28px verdana';
			ctx.fillText(this.mConfig.free_message, (this.mEPDModule.getEPDWidth()/2) - (ctx.measureText(this.mConfig.free_message).width / 2),
					yPosition + (DISPLAY_BODY_CURRENT_HEIGHT/2) + ((ctx.measureText(this.mConfig.free_message).actualBoundingBoxAscent - ctx.measureText(this.mConfig.free_message).actualBoundingBoxDescent) / 2));
		} else {
			const ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_CURRENT_HEIGHT, DISPLAY_COLOR.color, DISPLAY_MODE.invert, DISPLAY_CLEAR.both);
			
			ctx.font = '28px verdana';
			ctx.fillText(timeRange, (this.mEPDModule.getEPDWidth()/2) - (ctx.measureText(timeRange).width / 2),
					yPosition + (DISPLAY_BODY_CURRENT_HEIGHT/2) + ((ctx.measureText(timeRange).actualBoundingBoxAscent - ctx.measureText(timeRange).actualBoundingBoxDescent)/ 2) - MARGIN_TOP_BOTTOM);
					
			ctx.fillText(pData.topic, (this.mEPDModule.getEPDWidth()/2) - (ctx.measureText(pData.topic).width / 2),
					yPosition + (DISPLAY_BODY_CURRENT_HEIGHT/2) + ((ctx.measureText(pData.topic).actualBoundingBoxAscent - ctx.measureText(pData.topic).actualBoundingBoxDescent) / 2) + MARGIN_TOP_BOTTOM);
					
		}
	}

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
	public setDisplayBodyPending(pData: any) {
		const TITLE_MARGING_LEFT = 5;
		const TITLE_MARGING_TOP = 5;
		const TITLE_MARGING_BOTTOM = 5;
		const MEETING_RECT_MARGIN_TOP = 5;
		const MEETING_RECT_HEIGHT = 34;
		const MEETING_RECT_SPACE = 2;
		
		const yPosition = DISPLAY_HEADER_HEIGHT + DISPLAY_BODY_CURRENT_HEIGHT;
		
		let ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_PENDING_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);
		ctx.font = '15px verdana';
		const tileHeight = ctx.measureText(this.mConfig.next_title).actualBoundingBoxAscent + ctx.measureText(this.mConfig.next_title).actualBoundingBoxDescent;
		ctx.fillText(this.mConfig.next_title, TITLE_MARGING_LEFT, yPosition + ((ctx.measureText(this.mConfig.next_title).actualBoundingBoxAscent - ctx.measureText(this.mConfig.next_title).actualBoundingBoxDescent)) + TITLE_MARGING_TOP);
		
		if (pData.length === 0) {
			ctx.font = '28px verdana';
			ctx.fillText(this.mConfig.free_message, (this.mEPDModule.getEPDWidth()/2) - (ctx.measureText(this.mConfig.free_message).width / 2),
						yPosition + (DISPLAY_BODY_PENDING_HEIGHT/2) + ((ctx.measureText(this.mConfig.free_message).actualBoundingBoxAscent - ctx.measureText(this.mConfig.free_message).actualBoundingBoxDescent) / 2));
		} else {
			ctx = this.getCanvasContextArea(yPosition, DISPLAY_BODY_PENDING_HEIGHT, DISPLAY_COLOR.color, DISPLAY_MODE.normal, DISPLAY_CLEAR.color);
			ctx.font = '18px verdana';
			let iCounter: number;
			
			for (iCounter=0; (iCounter < pData.length) && (iCounter < MAX_PENDING_MEETINGS); iCounter++) {			
				const topPosition = yPosition + tileHeight + TITLE_MARGING_TOP + TITLE_MARGING_BOTTOM + (iCounter*(MEETING_RECT_HEIGHT + MEETING_RECT_SPACE));
				ctx.fillStyle = DISPLAY_CANVAS_FILL_NORMAL;
				ctx.fillRect(0, topPosition, this.mEPDModule.getEPDWidth(), MEETING_RECT_HEIGHT);
				ctx.fillStyle = DISPLAY_CANVAS_FILL_INVERT;
				const message = this.buildTimeRange(pData[iCounter].start_time, pData[iCounter].stop_time, this.mConfig.time_format) + ": " + pData[iCounter].topic;
				ctx.fillText(message, TITLE_MARGING_LEFT, topPosition + (MEETING_RECT_HEIGHT/2) + ((ctx.measureText(message).actualBoundingBoxAscent - ctx.measureText(message).actualBoundingBoxDescent) / 2));						
			}
		}	
	}

	/**
	* Set diplay area: footer (company name and current date)
	* param pData: 
	*		{
	*			"company_name": "{name of the company, e.g.: 'myCompany'}",
	*			"date": "{date of the current day, e.g.: '03/30/20'}"
	*		}
	*/
	private setDisplayFooter(pData: any) {
		
		const yPosition = DISPLAY_HEADER_HEIGHT + DISPLAY_BODY_CURRENT_HEIGHT + DISPLAY_BODY_PENDING_HEIGHT;
		const ctx = this.getCanvasContextArea(yPosition, DISPLAY_FOOTER_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.invert, DISPLAY_CLEAR.both);
		
		ctx.font = '18px verdana';		
		ctx.fillText(pData.company_name, 10,
					(DISPLAY_FOOTER_HEIGHT/2) + ((ctx.measureText(pData.company_name).actualBoundingBoxAscent - ctx.measureText(pData.company_name).actualBoundingBoxDescent) / 2)
					+ yPosition);
		ctx.fillText(pData.date, this.mEPDModule.getEPDWidth() - ctx.measureText(pData.date).width - 10,
					(DISPLAY_FOOTER_HEIGHT/2) + ((ctx.measureText(pData.date).actualBoundingBoxAscent - ctx.measureText(pData.date).actualBoundingBoxDescent) / 2)
					+ yPosition);
	}

	/**
	* Set diplay area: Header (meeting room name)
	* param pData: 
	*		{
	*			"meeting_room_name": "{name of the meeting room, e.g.: 'PARIS'}",
	*		}
	*/
	public setDisplayHeader(pData: any){
		
		const ctx = this.getCanvasContextArea(0, DISPLAY_HEADER_HEIGHT, DISPLAY_COLOR.black_white, DISPLAY_MODE.invert, DISPLAY_CLEAR.both);
			
		ctx.font = '38px verdana';
		ctx.fillText(pData.meeting_room_name, (this.mEPDModule.getEPDWidth()/2) - (ctx.measureText(pData.meeting_room_name).width / 2),
					(DISPLAY_HEADER_HEIGHT/2) + ((ctx.measureText(pData.meeting_room_name).actualBoundingBoxAscent - ctx.measureText(pData.meeting_room_name).actualBoundingBoxDescent) / 2));
	}

	/**
	* Fill whole display with string passed as parameter
	* param pAppConfig: string data to display
	*/
	public simpleDisplay(pData: string) {
		
		const ctx = this.getCanvasContextArea(0, this.mEPDModule.getEPDHeight(), DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);

		ctx.font = '14px arial';		
		ctx.fillText(pData, 10, 20);
		
		this.updateDisplay();
	}

	/**
	* update EPD display module with current canvas.
	* This action has to be perfomed after a canvas (or both) has been updated
	*/
	public updateDisplay() {
		this.mEPDModule.updateDisplay(this.mCtxmCanvasBlack.getImageData(0, 0, this.mCanvasBlack.width, this.mCanvasBlack.height),
								this.mCtxmCanvasColor.getImageData(0, 0, this.mCanvasBlack.width, this.mCanvasBlack.height));	
	}
	
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
	public resetDisplay(pAppConfig: any) {
		const ctx = this.getCanvasContextArea(0, this.mEPDModule.getEPDHeight(), DISPLAY_COLOR.black_white, DISPLAY_MODE.normal, DISPLAY_CLEAR.both);

		this.setDisplayHeader({meeting_room_name: pAppConfig.meeting_room_name});
		this.setDisplayFooter({company_name: pAppConfig.company_name, date: ((this.mConfig.date_format === DATE_FORMAT.fr) ? moment().format("DD/MM/YY") : moment().format("MM/DD/YY"))});
		
		this.updateDisplay();
	}
	
	/**
	* Build time range string to display
	* param pStartTime: <string> start time of meeting
	* param pStopTime: <string> stop time of meeting
	* param pFormat: format of time, cf TIME_FORMAT enum
	*
	* return timeRange: <string> formated time range, e.g: "15:30-16h00" or '3:30PM-4:00PM'
	*/
	private buildTimeRange(pStartTime: string, pStopTime: string, pFormat: string): string {
		const mnt_start = moment(pStartTime, 'hh:mm');
		const mnt_stop = moment(pStopTime, 'hh:mm');

		let timeRange: string;
		if (pFormat === TIME_FORMAT.twenty_four) {
			timeRange = mnt_start.format('HH:mm') + '-' + mnt_stop.format('HH:mm');
		} else {
			timeRange = mnt_start.format('hh:mmA') + '-' + mnt_stop.format('hh:mmA');
		}
		
		return timeRange;
	}
}