export enum ClientEvents {
    JOIN_ROOM = "join_room",
    GET_ROUTER_RTCCAPABILITIES = "get_router_rtc_capabilities",
    CREATE_TRANSPORT = "create_transport",
    CONNECT_TRANSPORT = "connect_tranport",
    PRODUCE = "produce",
    CONSUME = "consume",
    GET_ROOM_PRODUCERS = "get_room_producers",
    GET_ROOM_ADMINS = "get_room_admins",
}

export enum BroadcastEvents {
    PRODUCER_PRODUCING = "producing",
    PRODUCER_PAUSED = "producer_paused",
    PRODUCER_CLOSED = "producer_closed",
    PUBLISH_PRODUCER = "publishProducer",
    REQUEST_TO_PUBLISH = "requestToPublish",
    REQUEST_TO_JOIN = "requestToJoin",
    TOGGLE_PRODUCER_STATE = "toggleProducerState",
    JOIN_REQUEST_ACCEPTED = "join_request_accepted"
}
