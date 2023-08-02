import { LightningElement, api , wire} from 'lwc';
import { getPicklistValues, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
// Import message service features required for publishing and the message channel
import { MessageContext } from 'lightning/messageService';
import { getLWCName } from 'c/jsUtils';
import { lmsLifeCycle } from 'c/lmsLifeCycle';

//const STATUS_REASON_FIELD = 'Status_Reason__c';
const UNQUALIFIED_STEP = 'Unqualified'; //Controller pick list, we can get it as an @api from the parent 
const NURTURE_STEP = 'Nurture'; // Controller pick list, we can get it as an @api from the parent
const UPDATE_OTHER_DESCRIPTION = { 'Unqualified' : 'Unqualified_Reason_Other_Description__c', 'Nurture' : 'Nurture_Reason_Other_Description__c'};
const UPDATE_CURRENT_STEP = [UNQUALIFIED_STEP];
const SHOW_DEPENDENT_POP_UP = [UNQUALIFIED_STEP, NURTURE_STEP];
export default class StepModal extends LightningElement {
    @api sourcePage;
    recordTypeId;
    showModal = false
    curRecord;
    fieldName;
    dependentValue;
    stepValue;
    lms;
    options = [];
    picklistValuesObj;
    dependentOptions = [];
    fieldsToUpdate = {}; // the Nurture Reason and it there's other (Nurture_Reason_Other_Description__c || Unqualified_Reason_Other_Description__c)
    fieldToUpdate; // Nurture_Reason_Other_Description__c || Unqualified_Reason_Other_Description__c
    showDescription = false;
    prevStep; // prevent duplicate submissions

    @wire(MessageContext)
    messageContext;

    connectedCallback(){
        this.lms = new lmsLifeCycle(this.messageContext, this.handleSubscribe, getLWCName(this));
    }

     // Handler for message received by component
     handleSubscribe = (message) => {
        if(message.pageMessageSource !== this.sourcePage) return;
        this.resetFields();
        this.curRecord = message.curRecord;
        this.fieldName = this.removeSubString(message.fieldStepName);
        this.dependentPickListField = this.removeSubString(message.dependentPickListField);
        this.fieldsToUpdate[this.dependentPickListField] = ''; 
        this.stepValue =  message.step;
        this.prevStep = message.prevStep;
        this.recordTypeId = message.recordTypeId; // fires the picklist values + the dependent picklist
        this.fieldToUpdate = UPDATE_OTHER_DESCRIPTION[this.stepValue];
        if(SHOW_DEPENDENT_POP_UP.includes(this.stepValue)) this.showModal = true;
        // publish event ready for update 
        else this.lms.publishToMessageChannel({updateCurrentStep : false, readyForUpdate : true});
    }

    setDisabledInputs(){
        if(!UPDATE_CURRENT_STEP.includes(this.stepValue) || (UPDATE_CURRENT_STEP.includes(this.stepValue) && this.prevStep != this.stepValue) || !this.curRecord.hasOwnProperty(this.dependentPickListField)) return;
        let unqualifiedReason = this.curRecord[this.dependentPickListField].value;
        if(!unqualifiedReason) return;
        let values = this.dependentOptions.map(({ value }) => value);
        if(values.includes(unqualifiedReason)){
            this.dependentValue = unqualifiedReason;
            this.fieldsToUpdate[this.dependentPickListField] = this.dependentValue;
            this.setDisabledValue('dependentId', this.dependentValue);
            this.template.querySelector('[data-id="submitId"]').disabled = true; //disable done button 
            if(!this.curRecord.hasOwnProperty(this.fieldToUpdate)) return;
            let otherReason = this.curRecord[this.fieldToUpdate].value;
            if(otherReason){
                this.showDescription = true;
                setTimeout(() => { 
                    this.setDisabledValue('reasonId', otherReason);
                });
            }
        }
    }

    // setting the value and the Disabled property on the ui 
    setDisabledValue(auraId, value){
        this.template.querySelector('[data-id="' + auraId +'"]').value = value;
        this.template.querySelector('[data-id="' + auraId + '"]').disabled = true;
    }

    resetFields(){
        this.fieldToUpdate = '';
        this.recordTypeId = '';
        this.dependentValue = '';
        this.showDescription = false;
    }

    removeSubString(textToRemoveFrom){
        return textToRemoveFrom.substring(textToRemoveFrom.indexOf(".") + 1);
    }

    //https://salesforcescool.blogspot.com/2021/12/dependent-picklist-in-lightning-web.html
    // get all pick list values of this record type and push into an array the values of the contoller field picklist
    @wire(getPicklistValuesByRecordType, { objectApiName: 'Lead', recordTypeId: '$recordTypeId' })
    newPicklistValues({ error, data }) {
        if (data) {
            this.picklistValuesObj = data.picklistFieldValues;
            let levelValueslist = data.picklistFieldValues[this.fieldName].values;
            let levelValues = [];
            for (let i = 0; i < levelValueslist.length; i++) {
                levelValues.push({
                    label: levelValueslist[i].label,
                    value: levelValueslist[i].value
                });
            }
            this.options = levelValues;
            console.log('Level values' + JSON.stringify(this.options));
            // populate level 2
            if(this.stepValue) this.populateLevelTwo();
        }
        else if (error) {
            console.log(JSON.stringify(error));
        }
    }

    populateLevelTwo(){
        let selectedLevelValue = this.stepValue;
        if (!selectedLevelValue) return;
        let data = this.picklistValuesObj;
        let totalSecondaryLevelValues =  data[this.dependentPickListField];
        let controllerValueIndex = totalSecondaryLevelValues.controllerValues[selectedLevelValue];
        let secondaryLevelPicklistValues = data[this.dependentPickListField].values;
        let secondaryLevelPicklists = [];            
        secondaryLevelPicklistValues.forEach(key => {
            for (let i = 0; i < key.validFor.length; i++) {
                if (controllerValueIndex == key.validFor[i]) {
                    secondaryLevelPicklists.push({
                        label: key.label,
                        value: key.value
                    });
                }
            }
        })
        console.log('SecondaryLevelPicklists ' + JSON.stringify(secondaryLevelPicklists));
        if (secondaryLevelPicklists){
            this.dependentOptions = secondaryLevelPicklists;
            this.setDisabledInputs();
        }
    }

    closeModal() {
        this.showModal = false;
        this.lms.publishToMessageChannel({readyForUpdate : false});
    }

    refreshReason(){
        if(!this.fieldToUpdate) return; // no field to update or the reason pick list value was never selected
        this.fieldsToUpdate[this.fieldToUpdate] = ''; // blank out the reason 
        if(!this.showDescription) return;
        this.template.querySelector('[data-id="reasonId"]').value = '';
        this.showDescription = false;
    }
    
    handleDependentStepChange(event){
        this.dependentValue = event.detail.value;
        this.fieldsToUpdate[this.dependentPickListField] = this.dependentValue;
        if(this.dependentValue != 'Other') this.refreshReason(); // reason picklist was chosen in the last time
        else if(this.fieldToUpdate) this.showDescription = true;

    }

    handleDescriptionChange(event){ 
        if(!this.fieldToUpdate) return;
        this.fieldsToUpdate[this.fieldToUpdate] = event.detail.value;
    }
    
    handleStepChange(event){
        this.stepValue = event.detail.value;
    }

    handleModalSubmit(){
        this.showModal = false;
        // publish event
        if(UPDATE_CURRENT_STEP.includes(this.stepValue)) this.lms.publishToMessageChannel({updateCurrentStep : true, readyForUpdate : true,  fieldsToUpdate : this.fieldsToUpdate}); // update exsiting step and not next step
        else this.lms.publishToMessageChannel({updateCurrentStep : false, readyForUpdate : true, fieldsToUpdate : this.fieldsToUpdate});
    }
}