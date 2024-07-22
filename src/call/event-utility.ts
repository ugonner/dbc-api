import MediaSoup from "mediasoup";
import { Server } from "socket.io";

export class EventUtility {
    public static AttachRouterEventHandlers(
        router: MediaSoup.types.Router,
        server: Server,
        room: string
    ){
        router.on("@close", () => {
            server.to(room).emit("routerClosed", {});
        })
    }
}