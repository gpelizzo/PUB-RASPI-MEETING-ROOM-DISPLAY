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

/* WAVESHARE EPD COMMANDS. See : https://www.waveshare.com/wiki/File:4.2inch-e-paper-specification.pdf*/
const EPD_PANEL_SETTING = 0x00;
const EPD_POWER_OFF = 0x02;
const EPD_POWER_ON  = 0x04;
const EPD_BOOSTER_SOFT_START  = 0x06;
const EPD_DEEP_SLEEP = 0x07;
const EPD_DATA_START_TRANSMISSION_1 = 0x10;
const EPD_DISPLAY_REFRESH = 0x12;
const EPD_DATA_START_TRANSMISSION_2 = 0x13;
const EPD_VCOM_AND_DATA_INTERVAL_SETTING = 0x50;
const EPD_RESOLUTION_SETTING = 0x61;

/* EPD 4.2" e-Paper size*/
const EPD_WIDTH = 400;
const EPD_HEIGHT = 300;

/**
* 	Manage the EPD-color basic basic display commands. 
*/
export class CEPD42b {
	/* SPI module to perform communication*/
	private mSPIModule: any;
	
	/**
	* Construct instance of EDP module
	* param pSPIModule: SPI communication module
	*/
	constructor(pSPIModule: any) {
		/* Set SPI module */
		this.mSPIModule = pSPIModule;
	}
	
	public getEPDWidth(): number {
		return EPD_WIDTH;
	}	

	public getEPDHeight(): number {
		return EPD_HEIGHT;
	}		
	
	/**
	* Initialize the EPD display screen module
	*/
	async init() {		
		await this.mSPIModule.reset();
		
		await this.mSPIModule.sendCommande(EPD_BOOSTER_SOFT_START);
		await this.mSPIModule.sendData(0x17);
		await this.mSPIModule.sendData(0x17);
		await this.mSPIModule.sendData(0x17);
		
		await this.mSPIModule.sendCommande(EPD_POWER_ON);
		await this.mSPIModule.readBusy();
		
		await this.mSPIModule.sendCommande(EPD_PANEL_SETTING);
		await this.mSPIModule.sendData(0x0F);
	}
	
	/**
	* Sleep the EPD display screen module
	*/
	async sleepScreen() {
		await this.mSPIModule.sendCommande(EPD_POWER_OFF);
		await this.mSPIModule.readBusy();
		await this.mSPIModule.sendCommande(EPD_DEEP_SLEEP);
		await this.mSPIModule.sendData(0xA5);
	}

	/**
	* display both B&W and one color images
	* @param pImageDataBlack: Black&White ImageData (RVBA Uint8ClampedArray)
	* @param pImageDataRed: one color ImageData (RVBA Uint8ClampedArray)
	*/
	async updateDisplay(pImageDataBlack: any, pImageDataColor: any) {
		
		await this.mSPIModule.sendCommande(EPD_RESOLUTION_SETTING);
		await this.mSPIModule.sendData(Math.floor(EPD_WIDTH/256));
		await this.mSPIModule.sendData(EPD_WIDTH - (Math.floor(EPD_WIDTH/256) * 256));
		await this.mSPIModule.sendData(Math.floor(EPD_HEIGHT/256));
		await this.mSPIModule.sendData(EPD_HEIGHT - (Math.floor(EPD_HEIGHT/256) * 256));	
		
		await this.mSPIModule.sendCommande(EPD_VCOM_AND_DATA_INTERVAL_SETTING);
		await this.mSPIModule.sendData(0x87);
		
		await this.mSPIModule.sendCommande(EPD_DATA_START_TRANSMISSION_1);
		await this.mSPIModule.sendFrameData(this.getDisplayArray(pImageDataBlack));
		
		await this.mSPIModule.sendCommande(EPD_DATA_START_TRANSMISSION_2);
		await this.mSPIModule.sendFrameData(this.getDisplayArray(pImageDataColor));
		
		await this.mSPIModule.sendCommande(EPD_DISPLAY_REFRESH);
		
		await this.mSPIModule.readBusy();
	}
	
	/**
	* Convert RVBA Uint8ClampedArray to bits array.
	* Each RVBA bytes quartet is convert to a unit bit
	* @param pImageData: ImageData (RVBA Uint8ClampedArray)
	* @return: bits array matrix
	*/
	getDisplayArray(pImageData: any) {
		let displayArray = new Array(pImageData.data.length/32);
		
		let byteCounter = 0;
		let bitCounter: number = 0x00;
		
		let iCounter: number;
		for (iCounter=0; iCounter < pImageData.data.length; iCounter+=4) {
			if (bitCounter > 7) {
				byteCounter++;
				bitCounter = 0;
			}
						
			let bDrawBit = (((pImageData.data[iCounter] + pImageData.data[iCounter+1] + pImageData.data[iCounter+2] + pImageData.data[iCounter+3]) / 4 ) > 180) ? true : false;
			//let bDrawBit = (((pImageData.data[iCounter] + pImageData.data[iCounter+1] + pImageData.data[iCounter+2]) / 3 ) > 200) ? true : false;
			
			if (bDrawBit) {		
				displayArray[byteCounter] |= (0x80 >>> bitCounter);		
			} else {
				displayArray[byteCounter] &= (0xFF ^ (0x80 >>> bitCounter));				
			}
			
			bitCounter++;
		}

		return displayArray;
	}
}