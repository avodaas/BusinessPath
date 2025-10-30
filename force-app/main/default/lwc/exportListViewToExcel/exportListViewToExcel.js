import { LightningElement, wire } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import  orgUrl   from  '@salesforce/apex/ListViewToExcelController.getOrgUrl';
import getObjectNames from '@salesforce/apex/ListViewToExcelController.getObjectNames';
import getListViewByObject from '@salesforce/apex/ListViewToExcelController.getListViewByObject';
import getRecords from '@salesforce/apex/ListViewToExcelController.getRecords';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


export default class ExportListViewToExcel extends LightningElement {

    objectName;
    listviewid;
    disableListvSearch = true;
    disableExportBotton = true;
    isProccessingCsv = false;
    orgDomain;
    mesTitle;
    mesMessage;
    mesVariant;

    objectOptions = [];
    listviewOptions = [];

    @wire(orgUrl)
    orgDom({data, error}){
      if(data){
        this.orgDomain = data;
      }else if(error){
        console.log('Error getting Org Url: ' + JSON.stringify(error));
      }
    }

    @wire(getListViewByObject, { objectName : '$objectName' })
    listObjectInfo({ error, data }) {
    if (data) {
      console.log('List View Data: ' + JSON.stringify(data));
      //this.disableListvSearch = false;
      this.listviewOptions = [];
      data.forEach(element => {
        this.listviewOptions.push({ label: element.label, value: element.id });
      });
    } else if (error) {
      this.error = error;
      console.log('Error retrieving List View Data: ' + JSON.stringify(error));
    }
  }

    @wire(getObjectNames)
    wiredobjectNames({ data, error}) {
        if (data) {
            //this.objectOptions = data; // { Fiat: "Punto", Toyota: "Aygo" }
            this.objectOptions = Object.entries(data).map(([key, value]) => ({ label: value, value: key }));
        }
        else if(error) console.log('error getting Object Names' + JSON.stringify(error));
    }


    handleObjectNameSelection(event){
        this.objectName = event.detail.value;
        this.disableListvSearch = false;
    }

    handleObjectNameInputChange(){
        this.disableListvSearch = true;
        this.disableExportBotton = true;
    }

    handleGenerateCSV(){
      if(!this.objectName || !this.listviewid) return; //implment validyation later
      this.isProccessingCsv = true;
      this.disableExportBotton = true;
      getRecords({ objectName : this.objectName, listviewId : this.listviewid })
      .then(result => {
        if(!result || result.length === 0){
            this.showMessage('No Records', 'No records found in the selected List View', 'info');
            return;
        }
        console.log('CSV Data: ' + JSON.stringify(result));
        let headers = this.getHeaders(result);
        console.log('Headers: ' + JSON.stringify(headers));
        this.getcvRows(headers, result);
      })
      .catch(error => {
          console.log('Error generating CSV: ' +error);
    }).finally(() => {
      console.log('finally');
        this.isProccessingCsv = false;
        this.disableExportBotton = false;
        this.showMessage(this.mesTitle, this.mesMessage, this.mesVariant);
    });
  }

   handleListviewSelection(event){
        this.listviewid = event.detail.value;
        this.disableExportBotton = false;
        console.log(this.orgDomain)
    
   }

   getHeaders(result){
      let headers = Object.keys(result[0]);
      console.log('Headers: ' + JSON.stringify(headers));
      //remove  fields that behave like an object
       Object.entries(result[0]).forEach(([key, value]) => {
        if(typeof value === 'object') headers.splice(headers.indexOf(key),1)
        });
      console.log('headers after removing objects: ' + JSON.stringify(headers));
   
      //shift id to the befining of the headers
      let item = headers.splice(headers.indexOf('Id'),1)[0];
      headers.unshift(item);
      return headers;
    }

    getcvRows(headers, result){
      let cvRows = [headers.join(','),
        ...result.map(row =>
        headers.map(field =>{
            let value = row[field] ? row[field] : '';
            value = String(value);
            if(value.includes(',') || value.includes('"') ||value.includes('\n'))
              value = `"${value.replace(/"/g, '""')}"`; //escape double quotes
            return value;
        }).join(','))];
        console.log('CSV Rows: ' + JSON.stringify(cvRows));
        const csvContent = cvRows.join('\n');
        this.downloadCSVFile(csvContent);
    }

    async downloadCSVFile(csvContent){
      let filename = this.getFileName();
      try{
          const base64 = await this.createCsvFile(csvContent);
          const linksource = `data:text/csv;charset=utf-8;base64,${base64}`;

         /* const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const docFields ={
              PathOnClient: filename.replace(/ /g, '_') +'.csv',
              Title: filename,
              VersionData: base64           
          }
        createRecord({apiName:'ContentVersion', fields:docFields })
        .then(record => {})*/
           
            this.downloadCSVFileLink(linksource,filename);
            this.mesVariant = 'success';
            this.mesMessage = 'CSV File downloaded successfully';
            this.mesTitle = 'Success!';
        
      }catch(error){
        console.log('Error downloading CSV File: ' + JSON.stringify(error));
        this.mesVariant  = 'error';
        this.mesMessage = 'Error downloading CSV File: ' + error;
        this.mesTitle = 'Error downlaofing csv file';
      }
    }

    downloadCSVFileLink(linksource, filename){
     
      const link = document.createElement('a');
      link.href = linksource;
      link.download = filename + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      //document.body.removeChild(link);
    }

    createCsvFile(csvContent){
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = () => (reject.error);
        reader.readAsDataURL(blob);
      });
    }

    showMessage(title, message, variant){
      console.log('Showing Toast: ' + title + ' - ' + message);
        const event = new ShowToastEvent({
           message: message,
           variant: variant,
          title: title  
        });
        this.dispatchEvent(event);
  }

    getFileName(){
      let listviewname = this.listviewOptions.find(item => item.value === this.listviewid)?.label;
      listviewname = this.objectName + ':' + ' ' + listviewname + ' ' + new Date().toLocaleDateString();
      if(listviewname.lenght> 255) listviewname = listviewname.slice(0, 255);
      return listviewname; 
    }
    
  

   

}