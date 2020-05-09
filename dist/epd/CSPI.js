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
/* load Raspberry libraries */
var Gpio = require('pigpio').Gpio; //https://www.npmjs.com/package/pigpio
var spi = require('spi-device'); //https://www.npmjs.com/package/spi-device
/* declare SPI + control GPIO for WAVESHARE e-paper module*/
var PIN_CS = new Gpio(8, { mode: Gpio.OUTPUT });
var PIN_BUSY = new Gpio(24, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP });
var PIN_RST = new Gpio(17, { mode: Gpio.OUTPUT });
var PIN_DC = new Gpio(25, { mode: Gpio.OUTPUT });
/* maximum bytes per buffer to send to the 'spi-device' module
   value should eventually be adjusted, because this one is empirical
*/
var MAX_SPI_MSG_LENGTH = 1024;
/* speed of bytes xfert of the 'spi-device' module */
var SPI_SPEED_HZ = 4000000;
/**
* 	Manage the SPI basic communication with the screen.
    This is a static class considering that the SPI bus (with GPIO above) can drive only 1 screen
*/
var CSPI = /** @class */ (function () {
    function CSPI() {
    }
    /**
    * Initialize the 'spi-device' module
    */
    CSPI.init = function () {
        this.mSPIDriver = spi.openSync(0, 0);
        return this.mSPIDriver;
    };
    /**
    * perform a blocking delay
    * @param pMillis: delay in milliseconds
    */
    CSPI.sleep = function (pMillis) {
        return new Promise(function (resolve) { return setTimeout(resolve, pMillis); });
    };
    /**
    * reset the screen
    */
    CSPI.reset = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        PIN_RST.digitalWrite(1);
                        return [4 /*yield*/, this.sleep(200)];
                    case 1:
                        _a.sent();
                        PIN_RST.digitalWrite(0);
                        return [4 /*yield*/, this.sleep(200)];
                    case 2:
                        _a.sent();
                        PIN_RST.digitalWrite(1);
                        return [4 /*yield*/, this.sleep(200)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
    * send a command to the screen
    * @param pCommand: 1 byte command
    */
    CSPI.sendCommande = function (pCommand) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                PIN_DC.digitalWrite(0);
                PIN_CS.digitalWrite(0);
                this.mSPIDriver.transferSync([{
                        sendBuffer: Buffer.from([pCommand]),
                        byteLength: 1,
                        speedHz: SPI_SPEED_HZ
                    }]);
                PIN_CS.digitalWrite(1);
                return [2 /*return*/];
            });
        });
    };
    /**
    * send a data to the screen
    * @param pData: 1 byte data
    */
    CSPI.sendData = function (pData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                PIN_DC.digitalWrite(1);
                PIN_CS.digitalWrite(0);
                this.mSPIDriver.transferSync([{
                        sendBuffer: Buffer.from([pData]),
                        byteLength: 1,
                        speedHz: SPI_SPEED_HZ
                    }]);
                PIN_CS.digitalWrite(1);
                return [2 /*return*/];
            });
        });
    };
    /**
    * send a frame of data to the screen
    * @param pDataArray: bytes array
    */
    CSPI.sendFrameData = function (pDataArray) {
        return __awaiter(this, void 0, void 0, function () {
            var lMaxIter, lIterCounter, lOffset, lLength;
            return __generator(this, function (_a) {
                PIN_DC.digitalWrite(1);
                PIN_CS.digitalWrite(0);
                lMaxIter = Math.round(pDataArray.length / MAX_SPI_MSG_LENGTH);
                for (lIterCounter = 0; lIterCounter < lMaxIter; lIterCounter++) {
                    lOffset = MAX_SPI_MSG_LENGTH * lIterCounter;
                    lLength = ((pDataArray.length - (MAX_SPI_MSG_LENGTH * lIterCounter)) > MAX_SPI_MSG_LENGTH) ? MAX_SPI_MSG_LENGTH : (pDataArray.length - (MAX_SPI_MSG_LENGTH * lIterCounter));
                    this.mSPIDriver.transferSync([{
                            sendBuffer: Buffer.from(pDataArray.slice(lOffset, lOffset + lLength)),
                            byteLength: lLength,
                            speedHz: SPI_SPEED_HZ
                        }]);
                }
                PIN_CS.digitalWrite(1);
                return [2 /*return*/];
            });
        });
    };
    /**
    * wait for busy GPIO rising edge
    */
    CSPI.readBusy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(PIN_BUSY.digitalRead() == 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.sleep(100)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return CSPI;
}());
exports.CSPI = CSPI;
//# sourceMappingURL=CSPI.js.map