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

/* load Raspberry libraries */
const Gpio = require('pigpio').Gpio;		//https://www.npmjs.com/package/pigpio
const spi = require('spi-device');			//https://www.npmjs.com/package/spi-device

/* declare SPI + control GPIO for WAVESHARE e-paper module*/
const PIN_CS = new Gpio(8, {mode: Gpio.OUTPUT});
const PIN_BUSY = new Gpio(24, {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP});
const PIN_RST = new Gpio(17, {mode: Gpio.OUTPUT});
const PIN_DC = new Gpio(25, {mode: Gpio.OUTPUT});

/* maximum bytes per buffer to send to the 'spi-device' module 
   value should eventually be adjusted, because this one is empirical 	
*/
const MAX_SPI_MSG_LENGTH = 1024;
/* speed of bytes xfert of the 'spi-device' module */
const SPI_SPEED_HZ = 4000000;

/**
* 	Manage the SPI basic communication with the screen. 
	This is a static class considering that the SPI bus (with GPIO above) can drive only 1 screen
*/
export class CSPI {
	private static mSPIDriver: any;
	
	/**
	* Initialize the 'spi-device' module
	*/
	public static init(): any {
		this.mSPIDriver = spi.openSync(0, 0);
		
		return this.mSPIDriver
	}
	
	/**
	* perform a blocking delay
	* @param pMillis: delay in milliseconds
	*/
	private static sleep(pMillis: number) {
		return new Promise(resolve => setTimeout(resolve, pMillis));
	}	

	/**
	* reset the screen
	*/
	static async reset() {
		PIN_RST.digitalWrite(1);
		await this.sleep(200);
		PIN_RST.digitalWrite(0);
		await this.sleep(200);
		PIN_RST.digitalWrite(1);
		await this.sleep(200);
	}

	/**
	* send a command to the screen
	* @param pCommand: 1 byte command
	*/
	public static async sendCommande(pCommand: number) {
		PIN_DC.digitalWrite(0);
		PIN_CS.digitalWrite(0);
	  
		this.mSPIDriver.transferSync([{
			sendBuffer: Buffer.from([pCommand]),
			byteLength: 1,
			speedHz: SPI_SPEED_HZ
		}]);
		
		PIN_CS.digitalWrite(1);
	}

	/**
	* send a data to the screen
	* @param pData: 1 byte data
	*/
	public static async sendData(pData: number) {
		PIN_DC.digitalWrite(1);
		PIN_CS.digitalWrite(0);
	  
		this.mSPIDriver.transferSync([{
			sendBuffer: Buffer.from([pData]),
			byteLength: 1,
			speedHz: SPI_SPEED_HZ
		}]);
		
		PIN_CS.digitalWrite(1);
	}

	/**
	* send a frame of data to the screen
	* @param pDataArray: bytes array
	*/
	public static async sendFrameData(pDataArray: any[]) {
		PIN_DC.digitalWrite(1);
		PIN_CS.digitalWrite(0);
			
		//because sendBuffer can accept only a maximum size, frame has to be splitted 
		const lMaxIter = Math.round(pDataArray.length / MAX_SPI_MSG_LENGTH);
		
		let lIterCounter: number;
		for (lIterCounter = 0; lIterCounter < lMaxIter; lIterCounter++) {
			const lOffset = MAX_SPI_MSG_LENGTH * lIterCounter;
			const lLength = ((pDataArray.length - (MAX_SPI_MSG_LENGTH * lIterCounter)) > MAX_SPI_MSG_LENGTH) ? MAX_SPI_MSG_LENGTH : (pDataArray.length - (MAX_SPI_MSG_LENGTH * lIterCounter));
			
			this.mSPIDriver.transferSync([{
				sendBuffer: Buffer.from(pDataArray.slice(lOffset, lOffset + lLength)),
				byteLength: lLength,
				speedHz: SPI_SPEED_HZ
			}]);
		}
		
		PIN_CS.digitalWrite(1);
	}

	/**
	* wait for busy GPIO rising edge
	*/
	private static async readBusy() {
		while (PIN_BUSY.digitalRead() == 0) {
			await this.sleep(100);
		}
	}
}