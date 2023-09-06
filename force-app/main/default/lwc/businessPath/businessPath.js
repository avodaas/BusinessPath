import { LightningElement, api, wire } from 'lwc';
import { getPicklistValues} from 'lightning/uiObjectInfoApi';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
// Import message service features required for publishing and the message channel
import { MessageContext } from 'lightning/messageService';
import { lmsLifeCycle} from 'c/lmsLifeCycle';
import { SUCCESS, ERROR, handleErrors, showToastMessage} from 'c/jsUtils';

//Apex functions
import getDurationPerStep from '@salesforce/apex/BusinessPathController.getDurationPerStep';


const CONVERT_STAGE = 'Qualified';
const UNQUALIFIED_STEP = 'Unqualified';
const MARK_STATUS = 'Mark Status as Complete';
const UPDATE_CURRENT_STEP = [UNQUALIFIED_STEP];

const STEP_FIELD = 'Lead.Status';
const LEAD_RECORDTYPE_ID = 'Lead.RecordTypeId';
const STATUS_REASON = 'Lead.Status_Reason__c';
const NURTURE_OTHER_REASON = 'Lead.Nurture_Reason_Other_Description__c';
const UNQUALIFIED_OTHER_REASON = 'Lead.Unqualified_Reason_Other_Description__c';

//LEAD_RECORDTYPE_ID - we can get them as an input from the xml 'Lead.RecordTypeId'
//STEP_FIELD - we can get them as an input from the xml 'Lead.Status'
export default class BusinessPath extends  NavigationMixin(LightningElement) {
    @api recordId;
    @api formatMode;
    activeStep;
    curStep;
    prevStep;
    steps = [];
    indexCurrentStep;
    indexSelectedStep = null;
    recordRT;
    updateCurrentStep = false; //flag that identifies if to update just the current step or to move on to the next step 
    sourcePage = 'stepModal'; // form lightning message channel 
    isLoading = false; // flag that identifies 
    locked = false; // a lock record 
    buttonText = MARK_STATUS;
    isCurrentStep = true;
    curRecord;
    @wire(MessageContext)
    messageContext;
    lms;

    connectedCallback() {
        this.lms = new lmsLifeCycle(this.messageContext, this.handleListener, 'businessPath');
        window.addEventListener('resize', this.setToolTipSize);
    }

    get isComplete(){
        return this.formatMode === 'linear' ? 'slds-is-complete' : 'slds-is-incomplete';
    }

    updateStepOnPathBar(recordStep){
        this.removeClassFrom('slds-is-active', this.activeStep); //take off active from old step 
        this.removeCurrentStep(this.curStep);
        this.addClassTo('slds-is-active', recordStep); //add active class on new step 
        this.addCurrentStep(recordStep);
        //update current Stage
        this.prevStep = this.curStep; // previous cureent step 
        this.activeStep = recordStep;
        this.curStep = recordStep;
        this.indexSelectedStep = this.getStepByLabel(this.activeStep).indexStep;
        this.indexCurrentStep = this.getStepByLabel(this.activeStep).indexStep;
        this.setUpCompleteStage(this.indexCurrentStep);
        this.isCurrentStep = true;
    }
   
    
    handleListener = (message) => {
        if(message.pageMessageSource !== this.sourcePage) return;
        let readyForUpdate = message.readyForUpdate;
        this.updateCurrentStep = message.updateCurrentStep;
        let fieldsToUpdate = message.fieldsToUpdate ? message.fieldsToUpdate : {};
        if(readyForUpdate) this.updateLead(fieldsToUpdate, this.activeStep);
        else this.setUpTagsAfterUpdate();
    };


    // wires fire after record update 
    @wire(getRecord, { recordId: '$recordId', fields: [LEAD_RECORDTYPE_ID, STEP_FIELD, STATUS_REASON, NURTURE_OTHER_REASON, UNQUALIFIED_OTHER_REASON] })
    objectInfo({ error, data }) {
        if (data) {
            this.recordRT = getFieldValue(data, LEAD_RECORDTYPE_ID);
            let recordStep = getFieldValue(data, STEP_FIELD);
            this.curRecord = data.fields;
            // the record's step was changed from the layout
            if(this.curStep != recordStep && this.curStep!= null) this.updateStepOnPathBar(recordStep);
            else{
                this.activeStep = recordStep;
                this.curStep = recordStep;
            }
        }
        else if (error) {console.log('error getting the record information' + JSON.stringify(error));}
    }

    @wire(getPicklistValues, { recordTypeId: '$recordRT', fieldApiName: STEP_FIELD })
    getStatus({ data, error }){
        if (data) {
            let options = data.values;
            let vals = [];
            options.forEach(ele => {vals.push(ele.value);});
            //get the path's width
            let pathElement = this.template.querySelector('.slds-path__scroller-container');
            let width = pathElement.clientWidth;
            let styleSize = width/(vals.length); // get the width of eacth step on the path
            let tempData = [];
            getDurationPerStep({ recordId: this.recordId, stages: vals, statusField :  STEP_FIELD.fieldApiName})
            .then(result => {
                Object.keys(result).forEach((key, index) => {
                    tempData.push({ label : key, value : key, timeInStage : result[key], showPopOver : false, indexStep : index, styleClass : 'left: ' +  styleSize * (index) + 'px;'});
                });
                //           
                this.steps = [...this.steps, ...tempData];
                setTimeout(() => { this.setToolTipSize();})
                this.indexCurrentStep = this.getStepByLabel(this.activeStep).indexStep; // get index of current step
                this.indexSelectedStep = this.getStepByLabel(this.activeStep).indexStep;
                this.setUpInitialStep(this.activeStep);
                this.setUpCompleteStage(this.indexCurrentStep);
                
            }).catch(error => {
                console.log('error getting get Time In Step' +JSON.stringify(error));
            });
        }else if (error) {console.log('error getting the step values' + JSON.stringify(error));}
    }

    setToolTipSize = () => {
        if(!this.steps) return;
        let pathElements = this.template.querySelectorAll('.slds-path__item');
        let totalLength = 0.0;
        this.steps.forEach((element, index)=> {
            let curCumputedElement = window.getComputedStyle(pathElements[index], ':after');
            let itemWidth = parseFloat(curCumputedElement.width);
            element.styleClass = 'left: ' + (totalLength + (itemWidth/2)) + 'px;'
            totalLength += itemWidth;
        });
        this.steps = [...this.steps];
    };
    
    setUpCompleteStage(currentStepIndex){
        this.steps.forEach(item =>{
            if(item.indexStep < currentStepIndex){
                item.isComplete = true;
                setTimeout(() => {
                    this.removeClassFrom('slds-is-incomplete', item.value);
                    this.addClassTo(this.isComplete, item.value);
                });
            }else{
                item.isComplete = false;
                this.removeClassFrom(this.isComplete, item.value); 
                this.addClassTo('slds-is-incomplete', item.value);
            }
        })
        this.steps = [...this.steps];
    }
    setUpInitialStep(stage){
        setTimeout(() => {
            this.addClassTo('slds-is-active', stage);
            this.addCurrentStep(stage);
        });
    }

    // show tooltip on current step 
    showToolTip(event){
        let step = event.target.getAttribute('data-id');
        if(!this.locked)this.setUpToolTipOnSteps(step, true);
    }

    //remove tooltip from current step
    closeToolTip(event){
        let step = event.target.getAttribute('data-id');
        if(!this.locked) this.setUpToolTipOnSteps(step, false);
    }

    setUpToolTipOnSteps(activeStep, showPopOver){
        this.locked = true;
        let isChanged = false;
        if(!activeStep) {
            this.locked = false;
            return;
        }
        this.steps.every(step =>{
            if(step.label == activeStep) {
                if(step.showPopOver != showPopOver){
                     step.showPopOver = showPopOver;
                     isChanged = true;
                     return false;
                }    
            }
            return true;
        });
        if(isChanged) this.steps = [...this.steps];
        this.locked = false;
    }

    getStepByLabel(labelStep){
        let activeStep;
        this.steps.every(step =>{
            if(step.label == labelStep){
                activeStep = step;
                return false;
            }
            return true;
        });
        return activeStep;
    }

    handleSelectStep(event){
        //remove lastStep that was clicked
        this.removeClassFrom('slds-is-active', this.activeStep);
        let stage = event.target.getAttribute('data-id');
        if(!stage) return;
        if(this.curStep == stage) this.isCurrentStep = true;
        else this.isCurrentStep = false;
        let step = this.getStepByLabel(stage);
        if(!step) return;
        this.indexSelectedStep = step.indexStep; // get index of selected step
        this.prevStep = this.activeStep;
        this.activeStep = stage;
        this.addClassTo('slds-is-active',stage);
    }

    /*--- style functions--- */

    removeClassFrom(sldsClass, stage){ 
        try{
            this.template.querySelector('[data-li-id="'+ stage +'"]').classList.remove(sldsClass);
        }catch(error){
            console.log('error removeClassFrom function' + " stage : " + stage + ' slds class: '  + sldsClass + ' error message: ' +JSON.stringify(error));
        }
    }
    
    addClassTo(sldsClass, stage){
        try{
            this.template.querySelector('[data-li-id="'+ stage +'"]').classList.add(sldsClass);
        }catch(error){
            console.log('error addClassTo function' + " stage : " + stage + ' slds class: '  + sldsClass + ' error message: ' +JSON.stringify(error));
        }
    }

    removeCurrentStep(step){
        this.removeClassFrom('slds-is-current', step); //take off current and from Old step
        //this.addClassTo('slds-is-incomplete', step); // add slds-is-incomplete
        //this.addClassTo(this.isComplete, step);

    }
    
    addCurrentStep(step){
        this.addClassTo('slds-is-current', step); //take off current and from Old step
        this.removeClassFrom('slds-is-incomplete', step); // add slds-is-incomplete
    }

    /* reactive functions from ui*/

    handleSubmit(){
        this.setInProcessing();
        let step = this.indexCurrentStep != this.indexSelectedStep || UPDATE_CURRENT_STEP.includes(this.activeStep) ? this.activeStep : this.getNextStep(this.activeStep); // step to update 
        this.lms.publishToMessageChannel({curRecord : this.curRecord, step : step, fieldStepName : STEP_FIELD, recordTypeId : this.recordRT, dependentPickListField : STATUS_REASON,  prevStep : this.curStep});
    }

    setInProcessing(){
        this.isLoading = true;
        this.buttonText = 'Saving...';
    }

    updateLead(fields, pathStage){
       if(!this.isLoading) this.setInProcessing(); //show loading process
       let stepToUpdate, prevStep;
       if(pathStage == CONVERT_STAGE){
           this.handleLeadConvert();
           this.setUpTagsAfterUpdate();
           return;
       }
       if((this.indexCurrentStep != this.indexSelectedStep) || UPDATE_CURRENT_STEP.includes(pathStage)){ // update the current step only 
            stepToUpdate = pathStage;
            prevStep = this.prevStep; //previous active step 
       }else{ // update to the next step 
            stepToUpdate = this.getNextStep(pathStage);
            prevStep = pathStage;
       }
       if(!stepToUpdate) return; // no step to update 
       let leadFields = {
            Id: this.recordId,
            Status: stepToUpdate
       }
       for(let field in fields) leadFields[field] = fields[field];
        let record = {
            fields: leadFields
        };
        console.log('record'+JSON.stringify(record));
        updateRecord(record)
        .then(() => {
            console.log('success Updated record');
            this.removeClassFrom('slds-is-active', prevStep); //take off active from old step
            this.removeClassFrom('slds-is-incomplete', prevStep);
            this.addClassTo(this.isComplete, prevStep);
            this.removeCurrentStep(this.curStep); // remove current slds from the current step
            this.addClassTo('slds-is-active', stepToUpdate); //add active class on new step 
            this.addCurrentStep(stepToUpdate);//add current and take off incomplete class on new step
            this.activeStep = stepToUpdate;
            this.curStep = stepToUpdate;
            this.indexCurrentStep = this.getStepByLabel(this.activeStep).indexStep; // get index of current step
            this.indexSelectedStep = this.indexCurrentStep; // set selected Step to current step
            this.isCurrentStep = true;
            this.setUpCompleteStage(this.indexCurrentStep);
            showToastMessage(this, 'Success', 'Record Is Updated', SUCCESS);
        }).catch(error => {
            console.log('error update Record' + JSON.stringify(error));
            handleErrors(this, error); // show the user the error
        }).finally(() =>{
            this.setUpTagsAfterUpdate();
        });
    }
    setUpTagsAfterUpdate(){
        this.updateCurrentStep = false;
        this.isLoading = false;
        this.buttonText = MARK_STATUS;
    }

    handleLeadConvert(){
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__component',
            attributes: {
                componentName: 'runtime_sales_lead__convertDesktopConsole'
            },
            state: {
                leadConvert__leadId: this.recordId //Pass your record Id here
            }
        }).then((url) => {
            window.open(url, '_blank');
        });

    }

    getNextStep(activeStep){
        for(let i = 0; i < this.steps.length -1 ; i++) {
            if(this.steps[i].label == activeStep) return this.steps[i+1].label;
        }
        return null;
    }
}