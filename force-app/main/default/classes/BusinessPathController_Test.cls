/**
 *  BusinessPathController_Test
 *    Unit tests for BusinessPathController class
 *    @author Avodaas
 *    @date  May 2022
 **/
@isTest
private class BusinessPathController_Test {
    @isTest private static void businessPathController_UnitTest(){
        List<String> pickVals = ApxUtil.getPicklistValues('Lead', 'Status');
        Map<String, String> timeStampByStep = BusinessPathController.getDurationPerStep('00Q05000005bQSIEA2', pickVals, 'Status'); //leadId
        for(String stage : timeStampByStep.keySet()){
            if(pickVals[pickVals.size()-1] == stage) system.assertEquals(stage, timeStampByStep.get(stage)); // the first time record 
            else system.assertEquals( '1 days in ' + stage , timeStampByStep.get(stage));
        }
        
    }
}