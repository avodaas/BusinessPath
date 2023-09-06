// Import message service features required for subscribing and the message channel
import STEP_SELECTED_CHANNEL from '@salesforce/messageChannel/Step_Selected__c';
import { messageChannelUtil } from 'c/messageChannelUtils';

export default class lmsLifeCycle extends messageChannelUtil {
    constructor(messageContext, callback = null, pageMessageSource = null){
        super(messageContext, STEP_SELECTED_CHANNEL, callback, pageMessageSource);
    }
}
export {lmsLifeCycle}