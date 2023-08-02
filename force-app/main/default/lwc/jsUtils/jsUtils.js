import { ShowToastEvent } from 'lightning/platformShowToastEvent';

//general useful definitions
const SUCCESS = 'success';
const ERROR = 'error';
const WARNING = 'warn';
/**
 * @description: Display toast message
 * @name showToastMessage
 * @params The LWC object, String title for message, String message, String variant
 *          Legal values: SUCCESS, ERROR
 * @returns: none
 * */
 function showToastMessage(lwc, title, message, variant){
    lwc.dispatchEvent(
        new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        })
    );
}

/**
 * @description: add months to a given date
 * @name addMonths
 * @params Date curDate, Integer months
 * @returns: date 
 * */
function addMonths(curDate, months) {
    let d = curDate.getDate();
    curDate.setMonth(curDate.getMonth() + +months);
    if (curDate.getDate() != d) {
        curDate.setDate(0);
    }
    return curDate;
}

/**
 * @description: formats a Date to to sf date yyyy-mm-dd
 * @name formatDate
 * @params Date date
 * @returns: String 
 * */
 function formatDate(curDate) {
    let month = '' + (curDate.getMonth() + 1);
    let day = '' + curDate.getDate();
    let year = curDate.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    return [year, month, day].join('-');
}

/**
 * @description: checks if all the html elements of a specific type on the page are valid.
 * @name isFormValid
 * @params The LWC object, the html elemnt
 * @returns: Boolean 
 * */
function isFormValid(lwc, elementType){
    return [...lwc.template.querySelectorAll(elementType)]
        .reduce((validSoFar, inputField) => {
            inputField.reportValidity();
            return validSoFar && inputField.checkValidity();
        }, true);
}


function handleErrors(lwc, errorMessage){
    var fieldErrors = errorMessage.body.output.fieldErrors;
    if (errorMessage.body.output.errors != null) {
        var message = '';
        console.log('Displaying Errors')
        // Loop & Display Errors
        for (let index = 0; index < errorMessage.body.output.errors.length; index++) {
            console.log('Displaying Errors');
            message += errorMessage.body.output.errors[index].errorCode + ' - ' + errorMessage.body.output.errors[index].message;
        }
        showToastMessage(lwc, 'Error', message, ERROR);
    }
    if (errorMessage.body.output.fieldErrors != null) {
        console.log('Displaying Field Errors');
            var val = Object.values(fieldErrors);
            showToastMessage(lwc,'Error updating/inserting record - field issues', val[0][0]["message"], ERROR);
    } else {
        console.log('Displaying Generic Errors')
        showToastMessage(lwc, 'Error updating/inserting record', 'error.body.message', ERROR);
    }
}

function getLWCName(lwc){
    return lwc.template.host.localName // c-test-component
        .split('-')              // ['c', 'test', 'component'] 
        .slice(1)                // removes ns prefix => ['test', 'component']
        .reduce((a, b) => a + b.charAt(0).toUpperCase() + b.slice(1)); // converts to camelCase => testComponent 
}

export {SUCCESS, ERROR, WARNING, showToastMessage, addMonths, formatDate, isFormValid, handleErrors, getLWCName};