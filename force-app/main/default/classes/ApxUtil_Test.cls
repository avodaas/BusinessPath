
/**
 *  ApxUtil_Test
 *    Unit tests for ApxUtil class
 *  
 **/
@isTest
public with sharing class ApxUtil_Test {

    @isTest static void ApxUtil_helperMethods_Test() {
        Assert.isTrue(ApxUtil.getSObjectFieldDescribes('Contact').containsKey('FirstName'));
        Account a1 = new Account(BillingStreet = '123 Main St', BillingCity = 'Nowheresville', BillingState = 'Iowa', BillingCountry = 'United States', BillingPostalCode = '1234455');
		try{
            insert a1;
        }catch (Exception e) {  
			String errorMessage = ApxUtil.longErrorString(e);
            ApxUtil.createErrorLog(errorMessage, 'ApxUtil_Test');
            ApxUtil.sendAdminEmail('Error inserting Account', errorMessage);
		}
        a1.Name = 'Acme';
        insert a1;
        System.assertEquals('Account', ApxUtil.getObjectNameById(a1.Id));
        Assert.isTrue(ApxUtil.getPicklistValues('Lead', 'Status').contains('New Lead') );
        
    }
}