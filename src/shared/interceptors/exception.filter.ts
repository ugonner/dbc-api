import { ArgumentsHost, Catch, WsExceptionFilter } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";

@Catch(WsException)
export class EventExceptionHandler implements WsExceptionFilter {
    catch(exception: WsException, host: ArgumentsHost) {
        console.log("Caught Exception:", exception.message)
    }
}