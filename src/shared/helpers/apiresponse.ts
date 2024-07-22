export interface IApiResponse<TDATATYPE>{
    message: string;
    status: "success" | "error" | "processing";
    statusCode?: number;
    data?: TDATATYPE;
    error?: TDATATYPE;
}

export class ApiResponse {
    static success<T>(message: string, data: T, statusCode?: number): IApiResponse<T> {
        return {
            status: "success",
            message,
            statusCode: statusCode ? statusCode : 200,
            data
        }
    }
    
    static fail<T>(message: string, error: T, statusCode?: number): IApiResponse<T> {
        return {
            status: "error",
            message,
            statusCode: statusCode ? statusCode : 500,
            error
        }
    }
}