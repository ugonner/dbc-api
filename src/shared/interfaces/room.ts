import { Producer } from "mediasoup/node/lib/Producer";

export interface IRoomContext {
    screenShareProducer?: Producer;
    screenShareProducerId?: string;
    isSharing?: boolean;
    room?: string;
    sharerUserName?: string;
    sharerSocketId: string;
    hasSpecialPresenter?: boolean;
    specialPresenterSocketId?: string;
    accessibilityPriority?: AccessibilityPriority   
}

export enum AccessibilityPriority {
  HIGH = "High",
  MEDIUM = "Medium",
  NONE = "None"
}