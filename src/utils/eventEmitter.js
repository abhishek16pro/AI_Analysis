import EventEmitter from "events";

export const emitter = new EventEmitter();

export const channels = {
    DATA_SAVED: "DATA_SAVED",
    PULLBACK_STRATEGY: "PULLBACK_STRATEGY",
};
