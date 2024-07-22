import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(map((res) => {
            return {
                message: res.message ? res.message : "All went fine",
                status: res.status ? res.status :  "success",
                data: res.data ? res.data : res,
                error: res.error ? res.error : null
            }
        }))
    }
}