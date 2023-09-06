// Import message service features required for subscribing and the message channel
import {
    publish,
    subscribe,
    unsubscribe,
    APPLICATION_SCOPE,
    MessageContext
} from 'lightning/messageService';


class messageChannelUtil{
    
    callback;
    subscription;
    messageContext;
    messageChannel;
    pageMessageSource;

    constructor(messageContext, messageChannel, callback = null, pageMessageSource = null){
        if(callback) this.callback = callback;
        else this.callback = () => {};
        this.messageContext = messageContext;
        this.messageChannel = messageChannel;
        this.pageMessageSource = pageMessageSource;
        this.subscribeToMessageChannel();
    }

    // Encapsulate logic for Lightning message service subscribe and unsubsubscribe
    subscribeToMessageChannel(){
        console.log('subscribeToMessageChannel');
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                this.messageChannel,
                (message) => this.callback(message),
                { scope: APPLICATION_SCOPE }
            );
        }
    }

    unsubscribeToMessageChannel(){
        unsubscribe(this.subscription);
        this.subscription = null;
    }

    publishToMessageChannel(payload){
        payload['pageMessageSource'] = this.pageMessageSource;
        publish(this.messageContext, this.messageChannel, payload);
    }
}

export {messageChannelUtil}