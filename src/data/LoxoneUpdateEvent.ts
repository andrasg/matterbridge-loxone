class LoxoneUpdateEvent {

    uuid: string;
    value: number;
    date: Date;
    
    constructor(uuid:string, evt: number) {
        this.uuid = uuid;
        this.value = evt;
        this.date = new Date();
    }
}

export { LoxoneUpdateEvent }