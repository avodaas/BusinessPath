public with sharing class BusinessPathController {

    private class HistoryWrapper {
        private String newValue {get;set;}
        private String oldValue {get;set;}
        private DateTime CreatedDate {get;set;}
        private HistoryWrapper (String newValue, String oldValue, DateTime createdDate){
            this.newValue = newValue;
            this.oldValue = oldValue;
            this.createdDate = createdDate;
         }
    }
   

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getDurationPerStep(String recordId, List<String> stages, String statusField){
        Map<String, String> lifeCycleStage = new Map<String, String>();
        // find the object history
        String objectNameHistory, parentLookUpField, queryString;
        try{
            String objectName = ApxUtil.getObjectNameById(recordId);
            objectNameHistory = (objectName.contains('__c') ?  objectName.replace('__c','__') : objectName) + 'History'; 
            parentLookUpField = (objectName.contains('__c') ? 'Parent' : objectName) + 'Id';
            queryString = 'SELECT Id,  NewValue, OldValue, CreatedDate FROM ' + objectNameHistory + ' WHERE ' + 'Field = ' + '\''+ statusField + '\'' + ' AND ' + parentLookUpField + '=\'' + recordId  + '\'' + ' order by CreatedDate desc';
            List<HistoryWrapper> historyRecords;
            if(Test.isRunningTest()) historyRecords = setMockHistoryRecords(stages);
            else historyRecords = (List<HistoryWrapper>)JSON.deserialize(JSON.serialize(Database.query(queryString)), List<HistoryWrapper>.class);
            String recentStage;
            HistoryWrapper recentStageHw;
            DateTime recentStageDateTime;
            Integer daysInStage = 0;
            Date oldDate, newDate;
            if(!historyRecords.isEmpty()) recentStageHw = historyRecords[0];
            for(String stage : stages){
                daysInStage = calculateDaysInStage(stage, historyRecords);
                lifeCycleStage.put(stage, (daysInStage > 0 ? daysInStage + ' days in ' : '') + stage);
            }
            // populate last recent stage 
            if(recentStageHw != null){
                recentStage = recentStageHw.NewValue;
                recentStageDateTime = recentStageHw.CreatedDate;
                daysInStage = recentStageDateTime.date().daysBetween(Date.today());
                lifeCycleStage.put(recentStage, (daysInStage > 0 ? daysInStage + ' days in ' : '') + recentStage);
            }
        }catch(Exception e){
            ApxUtil.createErrorLog(ApxUtil.longErrorString(e), 'Error getting Time Per Step on the record');
            System.debug('Error in  getting Time Per Step on the record: ' + ApxUtil.longErrorString(e));
            ApxUtil.sendAdminEmail('Error getting Business Path Time Per Step on the record', ApxUtil.longErrorString(e));	
        }
        return lifeCycleStage;
    }

    
    private static Integer calculateDaysInStage(String stage, List<HistoryWrapper> historyRecords){
        String oldValue, newValue;
        Date oldDate, newDate;
        DateTime oldDateTime, newDateTime;
        Integer daysInStage = 0;
        for(HistoryWrapper rec : historyRecords){
            oldValue = rec.oldValue;
            newValue = rec.newValue;
            if(oldValue == stage) oldDateTime = rec.createdDate;
            if(newValue == stage) newDateTime = rec.createdDate;
            if(oldDateTime != null && newDateTime!= null){
                oldDate = Date.newInstance(oldDateTime.year(), oldDateTime.month(), oldDateTime.day());
                newDate = Date.newInstance(newDateTime.year(), newDateTime.month(), newDateTime.day());
                daysInStage = newDate.daysBetween(oldDate);
               return daysInStage;
            }
        }
        return null;
    }

  

    /* the function gets s a list of steps and creates fake history records for testing
        because test class can't create history records */
    private static List<HistoryWrapper> setMockHistoryRecords(List<String> stages){
        if(stages.isEmpty()) return new List<HistoryWrapper>();
        List<HistoryWrapper> mockHistoryRecords = new List<HistoryWrapper>();
        Integer i = 0;
        String newValue = stages[0], oldValue; 
        do {
            if(i + 1 < stages.size()) oldValue = stages[i+1];
            if(!String.isblank(oldValue)) mockHistoryRecords.add(new HistoryWrapper(newValue, oldValue, DateTime.now().addDays(-(i+1))));
            i++;
            newValue = oldValue;
            oldValue = null;
        } while (i < stages.size()); 
        return  mockHistoryRecords;
    }
     
}