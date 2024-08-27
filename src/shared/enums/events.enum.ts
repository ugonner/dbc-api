export enum ClientEvents {
    JOIN_ROOM = "join_room",
    GET_ROUTER_RTCCAPABILITIES = "get_router_rtc_capabilities",
    CREATE_TRANSPORT = "create_transport",
    CONNECT_TRANSPORT = "connect_tranport",
    PRODUCE = "produce",
    CONSUME = "consume",
    GET_ROOM_PRODUCERS = "get_room_producers",
    REQUEST_TO_JOIN = "requestToJoin",
    REQUEST_TO_PUBLISH = "requestToPublish",
    PUBLISH_PRODUCER = "publishProducer"

}

export enum ServerEvents {
    PRODUCER_PRODUCING = "producing",
    PRODUCER_PAUSED = "producer_paused",
    PRODUCER_CLOSED = "producer_closed",
    PUBLISH_PRODUCER = "publishProducer",
    REQUEST_TO_PUBLISH = "requestToPublish",
    REQUEST_TO_JOIN = "requestToJoin"
}