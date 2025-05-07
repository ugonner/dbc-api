export interface IChatUser {
    userId: string;
    userName: string;
    avatar?: string;
    isAdmin?: boolean;
    socketId?: string;
    chatIds?: string[];
    phoneNumber: string;
}

export interface IChat {
    chatId: string;
    users: IChatUser[];
    lastMessage?: IChatMessage;
}

export interface IMessageAttachment {
    attachmentUrl: string;
    attachmentType: "video" | "audio";
}
export interface IChatMessage {
    chatId: string;
    message?: string;
    sender: IChatUser;
    receiver: IChatUser;
    isViewed: boolean;
    createdAt: string
}
