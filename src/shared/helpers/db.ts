import { Logger } from "@nestjs/common";
import { FindOptionsWhere, QueryRunner, Repository } from "typeorm";

export class DBUtils{
    static async handleFailedQueryRunner(queryRunner: QueryRunner, error: Error){
        await queryRunner.rollbackTransaction();
        (new Logger("HandleQueryRunnerTransactionFailure")).error(error?.message)
    }

    static async generateUniqueID<T>(repository: Repository<T>, uniqueProperty: string, length = 8, baseString = ""): Promise<string>{
        baseString = baseString ? baseString : `${Math.random().toString(16).slice(2, length)}`
        const entityExists = await repository.findOneBy({[uniqueProperty]: baseString} as FindOptionsWhere<T>);
        if(!entityExists) return baseString;
         baseString = `${baseString}-${Math.random().toString(16).slice(2, (length))}`;
        return await DBUtils.generateUniqueID(repository, uniqueProperty, length, baseString); 
    }

    static addTime(baseDate: Date, duration: number, timeType: "Days" | "Hours" | "Minutes" | "Seconds" | "Milliseconds" = "Minutes"): Date {
        let timeSpan: number;
        switch(timeType){
            case "Days":
                timeSpan = (24 * 60 * 60 * 1000 * duration);
            case "Hours":
                timeSpan = (60 * 60 * 1000 * duration);
            case "Minutes":
                timeSpan = (60 * 1000 * duration);
            case "Seconds":
                timeSpan = (1000 * duration);
            case "Milliseconds":
                timeSpan = (duration);
            default:
                timeSpan = (60 * 1000 * duration);
            break;
        }
        return new Date(baseDate.getTime() + timeSpan);
    }
}