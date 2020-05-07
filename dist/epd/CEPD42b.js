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
Object.defineProperty(exports, "__esModule", { value: true });
/* WAVESHARE EPD COMMANDS. See : https://www.waveshare.com/wiki/File:4.2inch-e-paper-specification.pdf*/
var EPD_PANEL_SETTING = 0x00;
var EPD_POWER_OFF = 0x02;
var EPD_POWER_ON = 0x04;
var EPD_BOOSTER_SOFT_START = 0x06;
var EPD_DEEP_SLEEP = 0x07;
var EPD_DATA_START_TRANSMISSION_1 = 0x10;
var EPD_DISPLAY_REFRESH = 0x12;
var EPD_DATA_START_TRANSMISSION_2 = 0x13;
var EPD_VCOM_AND_DATA_INTERVAL_SETTING = 0x50;
var EPD_RESOLUTION_SETTING = 0x61;
/* EPD 4.2" e-Paper size*/
var EPD_WIDTH = 400;
var EPD_HEIGHT = 300;
/**
* 	Manage the EPD-color basic basic display commands.
*/
var CEPD42b = /** @class */ (function () {
    /**
    * Construct instance of EDP module
    * param pSPIModule: SPI communication module
    */
    function CEPD42b(pSPIModule) {
        /* Set SPI module */
        this.mSPIModule = pSPIModule;
    }
    CEPD42b.prototype.getEPDWidth = function () {
        return EPD_WIDTH;
    };
    CEPD42b.prototype.getEPDHeight = function () {
        return EPD_HEIGHT;
    };
    /**
    * Initialize the EPD display screen module
    */
    CEPD42b.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mSPIModule.reset()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_BOOSTER_SOFT_START)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(0x17)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(0x17)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(0x17)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_POWER_ON)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.readBusy()];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_PANEL_SETTING)];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(0x0F)];
                    case 9:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
    * Sleep the EPD display screen module
    */
    CEPD42b.prototype.sleepScreen = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_POWER_OFF)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.readBusy()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_DEEP_SLEEP)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(0xA5)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
    * display both B&W and one color images
    * @param pImageDataBlack: Black&White ImageData (RVBA Uint8ClampedArray)
    * @param pImageDataRed: one color ImageData (RVBA Uint8ClampedArray)
    */
    CEPD42b.prototype.updateDisplay = function (pImageDataBlack, pImageDataColor) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_RESOLUTION_SETTING)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(Math.floor(EPD_WIDTH / 256))];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(EPD_WIDTH - (Math.floor(EPD_WIDTH / 256) * 256))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(Math.floor(EPD_HEIGHT / 256))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(EPD_HEIGHT - (Math.floor(EPD_HEIGHT / 256) * 256))];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_VCOM_AND_DATA_INTERVAL_SETTING)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendData(0x87)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_DATA_START_TRANSMISSION_1)];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendFrameData(this.getDisplayArray(pImageDataBlack))];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_DATA_START_TRANSMISSION_2)];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendFrameData(this.getDisplayArray(pImageDataColor))];
                    case 11:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.sendCommande(EPD_DISPLAY_REFRESH)];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, this.mSPIModule.readBusy()];
                    case 13:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
    * Convert RVBA Uint8ClampedArray to bits array.
    * Each RVBA bytes quartet is convert to a unit bit
    * @param pImageData: ImageData (RVBA Uint8ClampedArray)
    * @return: bits array matrix
    */
    CEPD42b.prototype.getDisplayArray = function (pImageData) {
        var displayArray = new Array(pImageData.data.length / 32);
        var byteCounter = 0;
        var bitCounter = 0x00;
        var iCounter;
        for (iCounter = 0; iCounter < pImageData.data.length; iCounter += 4) {
            if (bitCounter > 7) {
                byteCounter++;
                bitCounter = 0;
            }
            var bDrawBit = (((pImageData.data[iCounter] + pImageData.data[iCounter + 1] + pImageData.data[iCounter + 2] + pImageData.data[iCounter + 3]) / 4) > 180) ? true : false;
            //let bDrawBit = (((pImageData.data[iCounter] + pImageData.data[iCounter+1] + pImageData.data[iCounter+2]) / 3 ) > 200) ? true : false;
            if (bDrawBit) {
                displayArray[byteCounter] |= (0x80 >>> bitCounter);
            }
            else {
                displayArray[byteCounter] &= (0xFF ^ (0x80 >>> bitCounter));
            }
            bitCounter++;
        }
        return displayArray;
    };
    return CEPD42b;
}());
exports.CEPD42b = CEPD42b;
//# sourceMappingURL=CEPD42b.js.map