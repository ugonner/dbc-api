export interface IMail{
    subject: string;
    message?: string;
    template?: {
        templatePath: string;
        content: {[key: string]: unknown}
    }
}