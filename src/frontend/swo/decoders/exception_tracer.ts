///////////////////////////////////////////////////////////////////////////////
// File:        exception tracer
// Date:        13.06.2020
// Revision:    1.0
// Author:      GrandChris
// Description: Parses exception/interrupt events and calculates the 
//              processing time
//              https://static.docs.arm.com/ddi0403/eb/DDI0403E_B_armv7m_arm.pdf S.851
///////////////////////////////////////////////////////////////////////////////

import * as vscode from 'vscode';

import { SWODecoder } from "./common";
import { Packet } from "../common";

const EXCEPTION_PACKAGE_ID    = 0b00001110;
const EXCEPTION_NUMBER_MASK1  = 0b11111110;
const EXCEPTION_NUMBER_MASK2  = 0b00000001;
const EXCEPTION_FUNCTION_MASK = 0b00110000;
const FUNCTION_ENTERED        = 0b00010000;
const FUNCTION_EXITED         = 0b00100000;
const FUNCTION_RETURNED       = 0b00110000;

const EXCEPTION_PACKAGE_PORT = 1;

export class SWOExceptionTracer implements SWODecoder {
    format: string;

    private output: vscode.OutputChannel;
    private count: number = 0;
    private exceptionNumber : number = 0;
    private exceptionFunction : number = 0;

    private executionCounts : number[] = new Array<number>(128).fill(0);
    private executionStack : number[] = [0];

    constructor() {
        this.output = vscode.window.createOutputChannel(`SWO: Exception trace console`);
        this.output.show();
    }


    softwareEvent(packet: Packet) {
        // console.log(`ExceptionTracer: Software package received`);
        // throw new Error("Method not implemented.");
    }

    hardwareEvent(packet: Packet) {
        let size = packet.size;
        let data = packet.data;

        if(packet.port !== EXCEPTION_PACKAGE_PORT) {
            return;
        }

        if(packet.size != 2) {
            console.log(`ExceptionTracer: Unexpected package length`);
        }

        this.exceptionNumber = (data[0] & EXCEPTION_NUMBER_MASK1) | (data[1] & EXCEPTION_NUMBER_MASK2);
        this.exceptionFunction = data[1] & EXCEPTION_FUNCTION_MASK;

        const date = new Date();
        const header = `[${date.toISOString()}]   `;
        
        // this.output.append(header + this.count++ + ' Interrupt Number: '+ this.exceptionNumber + " " + this.exceptionFunctionToString(this.exceptionFunction) + "\n");
        // console.log('Exception Number: ', exceptionNumber, " ", this.exceptionFunctionToString(exceptionFunction));
    }

    localTimeStamp(timestamp: number) {

        // this.output.append(`local timestamp received: ` + timestamp + "\n");

        switch(this.exceptionFunction) {
            case FUNCTION_ENTERED:
                this.executionStack[this.executionStack.length -1] += timestamp;
                this.executionStack.push(0);
                break;
            case FUNCTION_EXITED:
                this.executionStack[this.executionStack.length -1] += timestamp;
                this.executionCounts[this.exceptionNumber] += this.executionStack[this.executionStack.length -1];
                this.executionStack.pop();   

                // this.output.append(`local timestamp received: ` + timestamp + ", " + this.executionCounts[this.exceptionNumber] + "\n");
                this.output.append(this.exceptionNumber + " " + this.exceptionFunctionToString(this.exceptionFunction) + ", " + this.executionCounts[this.exceptionNumber] + "\n");
             
                break;
            case FUNCTION_RETURNED:
                // this.executionCounts[this.exceptionNumber] += timestamp;

                // this.output.append(`local timestamp received: ` + timestamp + ", " + this.executionCounts[this.exceptionNumber] + "\n");

                if(this.exceptionNumber == 0) {
                    this.output.append(this.exceptionNumber + " " + this.exceptionFunctionToString(this.exceptionFunction) + ", " + this.executionStack[this.executionStack.length -1] + "\n");
                }
                else
                {
                    this.output.append(this.exceptionNumber + " " + this.exceptionFunctionToString(this.exceptionFunction) + ", " + this.executionCounts[this.exceptionNumber] + "\n");
                }

                let sum =  this.executionStack[0];

                for (let i = 0; i < this.executionCounts.length; i++) {
                    sum += this.executionCounts[i];
                  }

                  this.output.append(( 100.0 - this.executionStack[0] / sum * 100.0) + "%\n")


                break;
            default:
                console.log(`ExceptionTracer: Unexpected exception function`);
                vscode.window.showErrorMessage(`ExceptionTracer: Unexpected exception function`);
                break;
        }

        


    }

    synchronized() {
        // throw new Error("Method not implemented.");
    }

    lostSynchronization() {
        // throw new Error("Method not implemented.");
    }

    dispose() {
        // throw new Error("Method not implemented.");
    }

    exceptionFunctionToString(exceptionFunction) {
        switch(exceptionFunction) {
            case FUNCTION_ENTERED:
                return "entered";
                break;
            case FUNCTION_EXITED:
                return "exited";
                break;
            case FUNCTION_RETURNED:
                return "returned";
                break;
            default:
                console.log(`ExceptionTracer: Unexpected exception function`);
                vscode.window.showErrorMessage(`ExceptionTracer: Unexpected exception function`);
                return;
                break;
        }
    }

}