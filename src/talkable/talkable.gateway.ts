import { forwardRef, Inject, Injectable, UseFilters, UseInterceptors } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { ResponseInterceptor } from '../shared/interceptors/response.interceptor';
import { EventExceptionHandler } from '../shared/interceptors/exception.filter';
import { Server, Socket } from 'socket.io';
import { TalkableService } from './talkable.service';
import { TalkableChatEvents } from '../shared/enums/talkables/chat-event.enum';
import { IChat, IChatMessage, IChatUser } from '../shared/interfaces/talkables/chat';
import { ApiResponse, IApiResponse } from '../shared/helpers/apiresponse';
import { CLIENT_RENEG_LIMIT } from 'tls';

@UseFilters(EventExceptionHandler)
@UseInterceptors(ResponseInterceptor)
@WebSocketGateway({
  namespace: '/talkable',
  cors: {
    origin: '*',
  },
})
export class TalkableGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{

  
  @WebSocketServer()
  server: Server;

  
DBCChatUser: IChatUser = {
  userName: "DBC_OFFICIAL",
  userId: "dbc_official",
  phoneNumber: "08012345678"
}

activeChats: IChat[] = [];
activeUsers: IChatUser[] = [];

  async afterInit() {
    console.log("Talkable gateway is on");
  }

  async handleConnection(client: Socket) {
    console.log(client.id, " Connected");
  }

  handleDisconnect(client: Socket) {
    console.log(client.id, "Disconncted")
  }

  @SubscribeMessage(TalkableChatEvents.JOIN_ROOM)
  async joinRoom(client: Socket, payload: IChatUser): Promise<IApiResponse<IChat>> {
    let chatData: IChat;
    try{
      payload.socketId = client.id;
      const chatData: IChat = {
        chatId: `ID${payload.phoneNumber}TK`,
        users: [payload, this.DBCChatUser],
      };

      if(!payload.isAdmin) {
        client.join(chatData.chatId);
        await this.addOrUpdateActiveChat(chatData);
        await this.addOrUpdateActiveChatUser(payload);

        client.to(this.DBCChatUser.userId).emit(TalkableChatEvents.JOIN_ROOM_INVITE, chatData);
 
      }
      return ApiResponse.success("Join room successful", chatData);
    }catch(error){
      console.log("Join room", error.message);
      return ApiResponse.fail("error joining room", chatData);
    }
  }
  
  @SubscribeMessage(TalkableChatEvents.JOIN_AS_ADMIN)
  async joinRoomAsAdmin(client: Socket, payload: IChatUser): Promise<IApiResponse<IChat>> {
    let chatData: IChat;
    try{
      payload.socketId = client.id;
      const chatData: IChat = {
        chatId: this.DBCChatUser.userId,
        users: [payload, this.DBCChatUser]
      };
      if(payload.isAdmin) {
        
        client.join(chatData.chatId);
        await this.addOrUpdateActiveChat(chatData);
        await this.addOrUpdateActiveChatUser(payload);
        //Rejoin all chat roomss
        this.activeChats.forEach((aChat) => {
          client.join(aChat.chatId);
          // Send notification message
          const chatMessageData: IChatMessage = {
            chatId: aChat.chatId,
            sender: this.DBCChatUser,
            receiver: aChat.users.find((user) => user.userId !== this.DBCChatUser.userId) || this.DBCChatUser,
            message: `You have my attention`,
            isViewed: false,
            createdAt: new Date().toISOString()
          }
          client.to(aChat.chatId).emit(TalkableChatEvents.CHAT_MESSAGE, chatMessageData)
        });
        
      }
      return ApiResponse.success("Join room successful", chatData);
    }catch(error){
      console.log("Join room", error.message);
      return ApiResponse.fail("error joining room as admin", chatData);
    }
  }

  @SubscribeMessage(TalkableChatEvents.JOIN_INVITE_ACCEPTANCE)
  async joinInviteAcceptance(client: Socket, payload: IChat): Promise<IApiResponse<IChat>>{
    let chat: IChat;
    try{
      await this.addOrUpdateActiveChat(payload);
      chat = await this.getChat(payload.chatId);
      const chatConversant = payload.users?.find((usr) => usr.userId !== this.DBCChatUser.userId);
      if(!chatConversant) return ApiResponse.fail("No conversant found", chat);
      const activeUser = await this.getUser(chatConversant);
      chat = payload;
      client.join(payload.chatId);
      this.server.to(client.id).emit(TalkableChatEvents.JOIN_INVITE_ACCEPTANCE, chat);
      client.to(activeUser?.socketId).emit(TalkableChatEvents.JOIN_INVITE_ACCEPTANCE, chat);
      return ApiResponse.success("Join invite accepted successfully", chat);
    }catch(error){
      console.log("Error accepting join invite", error.message);
      return ApiResponse.fail("Error accepting join invite", chat);
    }
  }
  
  @SubscribeMessage(TalkableChatEvents.JOIN_INVITE_REJECTION)
  async joinInviteRejection(client: Socket, payload: IChat): Promise<IApiResponse<IChat>>{
    let chat: IChat;
    try{
      const chatConversant = payload.users?.find((usr) => usr.userId !== this.DBCChatUser.userId);
      if(!chatConversant) return ApiResponse.fail("No conversant found", chat);
      const activeUser = await this.getUser(chatConversant);
      chat = payload;
      client.to(activeUser?.socketId).emit(TalkableChatEvents.JOIN_INVITE_REJECTION, chat);
      return ApiResponse.success("Join invite rejected successfully", chat);
    }catch(error){
      console.log("Error rejecting join invite", error.message);
      return ApiResponse.fail("Error rejecting join invite", chat);
    }
  }

  @SubscribeMessage(TalkableChatEvents.CHAT_MESSAGE)
  async sendChatMessage(client: Socket, payload: IChatMessage): Promise<IApiResponse<IChatMessage>>{
    let chatMessage: IChatMessage;
    try{
      const chatConversant = payload.receiver;
      if(!chatConversant) return ApiResponse.fail("No conversant found", chatMessage);
      chatMessage = payload;
      this.server.to(payload.chatId).emit(TalkableChatEvents.CHAT_MESSAGE, chatMessage);
      return ApiResponse.success("Chat message sent successfully", chatMessage);
    }catch(error){
      console.log("Error sending chat message", error.message);
      return ApiResponse.fail("Error sending caht message", chatMessage);
    }
  }


  

  async addOrUpdateActiveChat(chat: IChat) {
    try{
      const chatIndex = this.activeChats.findIndex((ac) => ac.chatId === chat.chatId);
      if(chatIndex === -1) {
        this.activeChats.push(chat);
        return;
      }
      const users = [...(this.activeChats[chatIndex].users || []), ...(chat.users || [])];
      this.activeChats[chatIndex] = {...this.activeChats[chatIndex], ...chat, users};

    }catch(error){
      console.log("Error updation active chats", error.message);
    }
  }
  async addOrUpdateActiveChatUser(chatUser: IChatUser) {
    try{
      const chatUserIndex = this.activeUsers.findIndex((usr) => (usr.userId && usr.userId === chatUser.userId) || (usr.socketId && usr.socketId === chatUser.socketId) || usr.userName === chatUser.userName);
      if(chatUserIndex === -1) {
        this.activeUsers.push(chatUser);
        return;
      }
      const chatIds = [...(this.activeUsers[chatUserIndex].chatIds || []), ...(chatUser.chatIds || [])];
      this.activeUsers[chatUserIndex] = {...this.activeUsers[chatUserIndex], ...chatUser, chatIds};

      
    }catch(error){
      console.log("Error updation active user", error.message);
    }
  }

  async getChat(chatId: string): Promise<IChat> {
    return this.activeChats.find((cht) => (cht.chatId === chatId));
  }

  async getUser(chatUser: Partial<IChatUser>): Promise<IChatUser> {
    return this.activeUsers.find((usr) => (usr.userId && usr.userId === chatUser.userId) || (usr.socketId && usr.socketId === chatUser.socketId) || usr.userName === chatUser.userName);
     
  }
  async getActiveChats(): Promise<IChat[]> {
    return this.activeChats;
  }

}
