public without sharing class ApxUtil {

    public static final List<String> ADMIN_EMAILS = new List<String>{'saas-package-admin@avodaas.com'}; 
    public static Map<String, Map<String, Schema.DescribeFieldResult>> objectFieldDescribes = new Map<String, Map<String, Schema.DescribeFieldResult>>();
    public static final String ADMIN_REPLYTO_EMAIL = 'saas-package-admin@avodaas.com';
    public static final String ADMIN_SENDER_DISPLAYNAME = UserInfo.getOrganizationName();



    // ========== Cached MetaData ========== //
    // ===================================== //



    public static final Map<String, Schema.SObjectType> cachedGlobalDescribe{
        get{
            if(cachedGlobalDescribe == null){
                 cachedGlobalDescribe = Schema.getGlobalDescribe();
            }
            return cachedGlobalDescribe;
        } private set;
    }

    public static final Map<String, Schema.DescribeSObjectResult> cachedGlobalDsrs{
        get {
            if (cachedGlobalDsrs == null) {
                cachedGlobalDsrs = new Map<String,Schema.DescribeSObjectResult>();
                List<Schema.DescribeSObjectResult> objects = Schema.describeSObjects(New List<String>(cachedGlobalDescribe.keySet()));
                for(Schema.DescribeSObjectResult sdSoj : objects) cachedGlobalDsrs.put(sdSoj.getName(), sdSoj);
            }
            return cachedGlobalDsrs;
        } private set;
    }

     /**
     * @description Get Describe Sobject Result
     * @param String object api name
     * @return Describe SObject result or null if it doesn't exist
     */
    public static Schema.DescribeSObjectResult getSObjectDescribeResult(String objectAPIName){
        try{
            if(cachedGlobalDsrs.containsKey(objectAPIName)) return cachedGlobalDsrs.get(objectAPIName);
            else return null;
        } catch(System.InvalidParameterValueException e){
            //object doesn't exist
            return null;
        }
    }

    public static Map<String, Schema.DescribeFieldResult> getSObjectFieldDescribes(String objectAPIName) {
        Schema.DescribeSObjectResult describeResult = getSObjectDescribeResult(objectAPIName);
        if(describeResult == null) return null;
        if(objectFieldDescribes.containsKey(objectAPIName)) return objectFieldDescribes.get(objectAPIName);
       
        Map<String, Schema.DescribeFieldResult> fields = new Map<String, Schema.DescribeFieldResult>();
        Map<String, Schema.SObjectField> objFields = describeResult.fields.getMap();
        Schema.DescribeFieldResult dfr;
        for(Schema.SObjectField field: objFields.values()){
            dfr = field.getDescribe();
            fields.put(dfr.getName(), dfr);
        }
       objectFieldDescribes.put(objectAPIName, fields);
       return fields;
    }

     // ========== Error Functions ========== //
    // ==

      /**
     * @description A custom error string that compiles all the exception's error information into one string
     **/
    public static String longErrorString(System.Exception e) {
        return 'Message: ' + e.getMessage() + ', Cause: ' + e.getCause() + ', Type: ' + e.getTypeName() + ', Line Number: ' + e.getLineNumber() + ', Stack Trace: ' + e.getStackTraceString();
    }





    // ========== Email Utility Functions ========== //
    // ==

      /**
     *  @description Sends an email to the default admin email addresses
     */
    public static void sendAdminEmail(String subject, String msg) {
        sendEmail(ADMIN_EMAILS, subject, msg);
    }
       /**
     *  @description Sends an email to the specified email addresses
     */
    public static void sendEmail (String[] toAddresses, String subject, String msg) {
        Messaging.SingleEmailMessage mail = setUpEmail(toAddresses, subject, msg);
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }

     /**
     * Create a Messaging.SingleEmailMessage object 
     * @params List of to Email Addresses, Subject, Message, List of cc Addresses
     * @returns Messaging.SingleEmailMessage
     */
    public static Messaging.SingleEmailMessage setUpEmail(String[] toAddresses, String subject, String msg, String[] ccAddresses){
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(toAddresses);
        mail.setReplyTo(ADMIN_REPLYTO_EMAIL);
        mail.setSenderDisplayName(ADMIN_SENDER_DISPLAYNAME);
        mail.setSubject(subject);
        mail.setPlainTextBody(msg);
        if(ccAddresses != null && !ccAddresses.isEmpty()) mail.setCcAddresses(ccAddresses);
        return mail;
    }

      /**
     * Create a Messaging.SingleEmailMessage object 
     * @params List of to Email Addresses, Subject, Message
     * @returns Messaging.SingleEmailMessage
     */
    public static Messaging.SingleEmailMessage setUpEmail(String[] toAddresses, String subject, String msg){
        return setUpEmail(toAddresses, subject, msg, null);
    }

    // ========== Utility Functions ========== //
    // ==


    /****
     * @description Get Object name from a record id
     * @param RecordId
     * @return Object Name
     */
    @AuraEnabled(cacheable=true)
    public static String getObjectNameById(Id recordId){
        if(recordId == null) return null;
        return recordId.getSObjectType().getDescribe().getName();
    }

    
     /**
     * @description Get a list of legal values for a picklist field
     * @param Object name and Field name
     * @return List of picklist values
     */
    public static List<String>  getPicklistValues(String objectAPIName, String fieldAPIName) { 
        if(objectApiName == null || fieldApiName == null) return null; 
        //verify that the object & field exist
        Map<String, Schema.DescribeFieldResult> objectFields = getSObjectFieldDescribes(objectAPIName);
        if(objectFields == null || !objectFields.containsKey(fieldAPIName)) return null;

        //get the SObjectField Describe Result
        Schema.DescribeFieldResult describe = objectFields.get(fieldAPIName);

        //verify that the field is a picklist field
        Schema.DisplayType theDisplayType = describe.getType();
        if(theDisplayType != Schema.DisplayType.Picklist && theDisplayType != Schema.DisplayType.MultiPicklist) return null;

        //get the values!
        return getPicklistValues(describe.getPickListValues());
    }

    public static List<String> getPicklistValues(List<Schema.PicklistEntry> picklistEntries){
        List<String> picklistValues = new List<String>();
        for (Schema.PicklistEntry a: picklistEntries) picklistValues.add(a.getValue());
        return picklistValues;
    }



        /*
    * @description the function gets a string and inserts an error log record
    * @params String Exception, fileName
    * @returns void
    */
    public static void createErrorLog(String strEx, String filename) {
        try{
            Error_Log__c log = new Error_Log__c(File_Name__c = filename, Error_Message__c = strEx, User__c = userinfo.getUserId());
            insert log;
        }catch(Exception ex){
            String message = 'ApxUtil.createErrorLog => the error:' + ex.getMessage() + '\r\nStack Trace: ' + ex.getStackTraceString();
            sendAdminEmail('Error inserting Log Tracking', message);
            System.debug(message);
        }
    }


}