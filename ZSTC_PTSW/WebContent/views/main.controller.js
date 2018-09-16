sap.ui.controller("views.main", {

	/**
	* Called when a controller is instantiated and its View controls (if available) are already created.
	* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
	* @memberOf pts.workshop.App
	*/
		onInit: function() {
	        
			//Read the user details based on the current logged in account
			//The information is stored in the oModel property "userinfo"
	        this.readUserInfo();

	        //Set Initial focus to the Serial Number input filed
	        var oSNInput = this.getView().byId("idSerialNr");
	        this.setInitialFocus(oSNInput);
	        
			//Add an AfterRendering on Comboboxes to set default values
			// TODO the following functionality is not yet active. It is the intention to search for materials during equipment creation
			var cmbNewMaterialNr = this.byId("idNewMaterialNrCombo");
			var equipDescription = this.byId("idNewEquipDescr");
			cmbNewMaterialNr.onAfterRendering = function () {
				var materialList = oModel.getProperty("/materialList");
				var equip = oModel.getProperty("/equipment");
				if(materialList && materialList.length > 1) {
					var selectedKey = materialList[0].id;
					if(selectedKey) {
						cmbNewMaterialNr.setSelectedKey(selectedKey);
						if(equip && equip.description =="") {
							oModel.setProperty("/equipment/description", materialList[0].description); 
						}
					}
				}
			}
			
		},

	/**
	* Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
	* (NOT before the first rendering! onInit() is used for that one!).
	* @memberOf pts.workshop.App
	*/
		onBeforeRendering: function() {

		},

	/**
	* Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
	* This hook is the same one that SAPUI5 controls get after being rendered.
	* @memberOf pts.workshop.App
	*/
		onAfterRendering: function() {
			var oSerialNr = this.getView().byId("idSerialNr");
			oSerialNr.focus();
			
			//Read cookie info to see if an e-mail was already stored and put it in the oModel property "mailto"
	        var emailCookie = jQuery.sap.storage.get("email");
	        if(emailCookie) {
	        	oModel.setProperty("/mailto", emailCookie);
	        }
			
	        //Declare an empty equipment JSON
	        var equipment = {
	        		
	        }
	        
	        //Declare a default material JSON
	        var initialMaterial = {
	        		"id": ""
	        }
	        
	      //Initialize data model
	        oModel.setProperty("/equipmentfound", false);
			oModel.setProperty("/equipment/checked_in",false);
			oModel.setProperty("/equipmentWorkshopList", null);
			oModel.setProperty("/materialList", null);		//Not yet used
			oModel.setProperty("/selectmaterial",false);	//Not yet used
			oModel.setProperty("/entermaterial",true);		//Not yet used
			oModel.setProperty("/material", initialMaterial);	//Not yet used
			oModel.setProperty("/new_customers", null);

			//Hide the page footer. It will become active when equipment is selected
			var mainPage = this.byId("mainPage");
	        mainPage.setShowFooter(false);
			
		},

	/**
	* Called when the Controller is destroyed. Use this one to free resources and finalize activities.
	* @memberOf pts.workshop.App
	*/
		onExit: function() {

	        //Store cookie info to store last changed e-mail address when user is closing the application.
			var email = oModel.getProperty("/mailto");
			jQuery.sap.storage.put("email", email);
			
		},
		
		setInitialFocus: function(control) { 
			  this.getView().addEventDelegate({
			    onAfterShow: function() {
			      setTimeout(function() {
			        control.focus();
			      }.bind(this), 0);
			    },
			  }, this);
		},
		
		//onSerialChange: Triggered when user is typing in a serial number.
		//If the serial number is longer than 5 characters, a request is sent to back-end.
		//When a unique serial number is found, its data is populated and a check is done to see what status it has.
		onSerialChange: function(t) {
			var custumerInput = this.byId("idCustomerInput");
	    	var customerCombo = this.byId("idCustomerCombo");
	    	var mainPage = this.byId("mainPage");
	    	var eqList = this.byId("idFlexEquipment");
	    	var eqState = this.byId("idCurrentState");
	    	var warrState = this.byId("idEquipWarr");
	    	var arrDateTime = this.byId("dtpArrivalDateTime");
	    	var ser = this.byId("idSerialNr");
	    	var flowIconTabItem = this.byId("idServiceFlow");
	    	var subIconBar = this.byId("idSubIconBar");
	    	var checkInButton = this.byId("idBtnCheckin");
	    	var inputPrice = this.byId("idFixedPriceValue");
	    	var lblMailTo = this.byId("idLabelMailTo");
			var inputMailTo = this.byId("idSendMailTo");
			lblMailTo.setVisible(false);
			inputMailTo.setVisible(false);
	    	
	    	custumerInput.setVisible(true);
	    	customerCombo.setVisible(false);
	    	
	    	//Clear list of found customers in model as we search now on serial
	    	customerCombo.removeAllItems();
	    	var aCustomers = [];
	    	oModel.setProperty("/customers", aCustomers);
	    	
	    	//Clear equipment
			var aEquipment = [];
			
			//Set serial number to Uppercase
			var sernr;
			if(t.mParameters.value)
				sernr = t.mParameters.value;
			else 
				sernr = ser.mProperties["value"];
			
			sernr = sernr.toUpperCase();
			var equipment = {
					'serial_number': sernr
			}
		
			aEquipment.push(equipment);
			oModel.setProperty("/equipment", aEquipment[0]);
			var vkorg = oModel.getProperty("/userinfo/default_sales_org");
			
			var j = {
					'serial_number' : sernr,
					'sales_org': vkorg
			}
			
		//	var j = { 'rsparms_tt':
		//				[{'SELNAME': 'SERNR', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': sernr},
		//					{'SELNAME': 'VKORG', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': vkorg}]
		//	}
			
			var locationHostName = window.location.hostname;
			var strUrl;
			if(locationHostName.toLowerCase()=="localhost") {
				//AS1 strUrl = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
				//AQ1 strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
				strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
				//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
			} else {
				var sapClient = window.location.search.toUpperCase();
				if(sapClient.indexOf("SAP-CLIENT")!=-1) {
					strUrl = "/sap/zrest/stc/equipment"+sapClient+"&sap-language=EN";
				} else {
					strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
				}
			}
			
			if(sernr.length > 5) {
				var aData = jQuery.ajax({
					type: "GET",
					contentType: "application/json", 
					url: strUrl,
					data: {"json": JSON.stringify(j), "action": "get_by_serial"},
			//		data: {"json": JSON.stringify(j), "action": "query_equipment"},
					dataType: "json", 
					success: function(data, textStatus, jqXHR){
					
						var result = data[0].model;
						//Test if data has been found
						if (result.length > 0) {
							
							//If the result contains 1 data set, then 1 equipment is found and can be displayed
							if(result.length === 1) {
								aEquipment = [];
								
								//check if warranty is filled and valid.
								if(result[0].vendor_warranty_end && result[0].vendor_warranty_end.length == 8) {
									var sYYYYMMDD = result[0].vendor_warranty_end.toString();
									var sYYYY = sYYYYMMDD.substring(0, 4);
									var sMM = sYYYYMMDD.substring(4, 6);
									var sDD = sYYYYMMDD.substring(6, 8);
									var warrDate = new Date(sYYYY+"-"+sMM+"-"+sDD+"Z");
									result[0].vendor_warranty_end = warrDate;
									
								} else {
									oModel.setProperty("/equipment/warranty_end", "");
									oModel.setProperty("/equipment/warranty_valid", false);
								}
								aEquipment.push(result[0]);
								
								oModel.setProperty("/equipment", aEquipment[0]);
								oModel.setProperty("/equipment/serial_number_id", result[0].serial_number+" (SAP id: "+result[0].id+")");
								
								//check if warranty is passed or not
								if(aEquipment[0].vendor_warranty_end) {
									var warrDate = aEquipment[0].vendor_warranty_end;
									oModel.setProperty("/equipment/vendor_warranty_end", warrDate.toLocaleDateString());	
									var today = new Date();
									if(warrDate >= today) {	
										oModel.setProperty("/equipment/warranty_valid", true);
										warrState.addStyleClass("InfoStateGreen");
									} else {
										oModel.setProperty("/equipment/warranty_valid", false);
										warrState.addStyleClass("InfoStateRed");
									}
								} else {
									oModel.setProperty("/equipment/vendor_warranty_end", "Unknown");
									oModel.setProperty("/equipment/warranty_valid", false);
									warrState.addStyleClass("InfoStateRed");
								}
								//check status of equipment
								if(result[0].user_status && result[0].user_status.indexOf("ZCHI")!==-1) {
									oModel.setProperty("/equipment/checked_in","Checked-In");
									oModel.setProperty("/checkinButton", "Start Service Repair");
									inputPrice.setEnabled(true);
									var warr = oModel.getProperty("/equipment/warranty_valid");
									if(warr) {
										checkInButton.setEnabled(true);
									} else {
										var valueFP = inputPrice.mProperties.value;
										if(valueFP && valueFP > 0) {
											checkInButton.setEnabled(true);
										} else {
											checkInButton.setEnabled(false);
										}
									}
									if(warr) {
										inputPrice.setValueState("None");
										inputPrice.setEnabled(false);
									}
									
									eqState.addStyleClass("InfoStateGreen");
									
									lblMailTo.setVisible(true);
									inputMailTo.setVisible(true);
								}
								if(result[0].user_status && result[0].user_status.indexOf("ZINS")!==-1) {
									oModel.setProperty("/equipment/checked_in","In Service");
									oModel.setProperty("/checkinButton", "Ready for Shipment");
									checkInButton.setEnabled(true);
									inputPrice.setEnabled(false);
									eqState.addStyleClass("InfoStateGreen");
									lblMailTo.setVisible(false);
									inputMailTo.setVisible(false);
								}
								if(result[0].user_status && result[0].user_status.indexOf("ZCHO")!==-1) {
									oModel.setProperty("/equipment/checked_in","Checked-Out");
									oModel.setProperty("/checkinButton", "Check in");
									eqState.addStyleClass("InfoStateGreen");
									inputPrice.setEnabled(false);
									arrDateTime.setEnabled(true);
									lblMailTo.setVisible(false);
									inputMailTo.setVisible(false);
								}
								if(result[0].user_status && result[0].user_status.indexOf("ZRFS")!==-1) {
									oModel.setProperty("/equipment/checked_in","Ready for Shipment");
									oModel.setProperty("/checkinButton", "Check out");
									eqState.addStyleClass("InfoStateGreen");
									inputPrice.setEnabled(false);
									lblMailTo.setVisible(false);
									inputMailTo.setVisible(false);
								}
								if (!result[0].user_status || (result[0].user_status && result[0].user_status === "")) {
									oModel.setProperty("/equipment/checked_in","Unknown");
									oModel.setProperty("/checkinButton", "Check in");
									arrDateTime.setEnabled(true);
									inputPrice.setEnabled(false);
									eqState.addStyleClass("InfoStateGreen");
									lblMailTo.setVisible(false);
									inputMailTo.setVisible(false);
								}
								
								oModel.setProperty("/equipmentfound", true);
								subIconBar.setSelectedKey(flowIconTabItem.sId);
								custumerInput.setEnabled(false);
								mainPage.setShowFooter(true);
							} 
						
						//If no data is found, reset content of other fields, areas...	
						} else {
							oModel.setProperty("/equipmentfound", false);
							custumerInput.setEnabled(true);
							mainPage.setShowFooter(false);
						} 
					},
					error: function(json) { } });
			} else {
				custumerInput.setEnabled(true);
				oModel.setProperty("/equipmentfound", false);
				//flowIconTabItem.setVisible(false);
				mainPage.setShowFooter(false);
			}
		},
		
		//onCustomerInputChange: Triggered when user is typing in a customer name.
		//When the customer name length is more than 4 characters, a back-end request is launched to find customers (Sold-To)
		//If a list of customers is returned, they are populated in a Combobox and the Input box is set to hidden.
		onCustomerInputChange: function(t) {
			var custn = t.mParameters.value;
			
			//If we are in new equipment creation pop-up, then we need variable newEquipPopup to be set to true
			var idNewEquipCustInput = this.byId("idNewCustomerInput");
			var newEquipPopup = false;
			if (t.mParameters.id == idNewEquipCustInput.sId)
				newEquipPopup = true;
			
			var userinfo = oModel.getProperty("/userinfo");
			var salesorg = userinfo.default_sales_org;
			var division = userinfo.default_division;
			var customersFound = 0;
			var aCustomers = oModel.getProperty("/customers");
			if(aCustomers && aCustomers.length > 0) 
				customersFound = aCustomers.length;
			
			//Check if a country as been selected, otherwise country is equal to first 2 digits of sales org
			var countryCombo = this.byId("idCountry");
			var country = "";
			if(countryCombo.getSelectedKey() != "") {
				country = countryCombo.getSelectedKey();
			} else {
				country = salesorg.substring(0,2);
				countryCombo.setSelectedKey(country);
			}
			
			var aEquipment = oModel.getProperty("/equipment");
			aEquipment = [];
			
			oModel.setProperty("/equipmentfound", false);
			oModel.setProperty("/equipmentList", null);
			
			var equipment = {
					'sold_to_name': custn
			}
		
			aEquipment.push(equipment);
			oModel.setProperty("/equipment", aEquipment[0]);
			
			if(this.isNumeric(custn)) {
				//if it is a number, then read using customer number
				// NOT IMPLEMENTED
			} else {
				//GET_BY_ADDRESS_C4S
				var aAccountGrps = [];
				aAccountGrps.push("ZXGC");  //Read global Sold-to customers
				
				if(custn.length >= 4) {		//Start searching if user enter 4 or more characters
					
					var j = {
							'name': custn,
							'country': country,
							'sales_org': salesorg,
							'distr_chn': '01',
							'division': '01',
							'account_grps':  aAccountGrps
					}
					
					var locationHostName = window.location.hostname;
					var strUrl;
					if(locationHostName.toLowerCase()=="localhost") {
						//AS1 strUrl = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
						strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
						//AQ1 strUrl ="proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
						//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
					} else {
						var sapClient = window.location.search.toUpperCase();
						if(sapClient.indexOf("SAP-CLIENT")!=-1) {
							strUrl = "/sap/zrest/stc/customer"+sapClient+"&sap-language=EN";
						} else {
							strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
						}
						//strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
					}
					
					//Call Backend system to request customers with parameters as specified in JSON structure
					var aData = jQuery.ajax({
						type: "GET",
						contentType: "application/json", 
						url: strUrl,
						data: {"json": JSON.stringify(j), "action": "get_by_address"},
						dataType: "json", 
						success: function(data, textStatus, jqXHR){
						
							var result = data[0].model;
							if (result.length > 0) {
								oModel.setProperty("/customers", result);
								customersFound = result.length;
							} else {
								oModel.setProperty("/customers", null);
							};
						}, 
						error: function(json) {
							alert("fail to post"); 
						} 
					});
				}
			}
			//this.getView().setModel(oModel,"dataModel");
			
			//Load the customers found in the Combo to allow user to select correct customer
			//Use variable newEquipPopup to decide if list needs to be shown in pop-up or not
			this.fillCustomerCombo(newEquipPopup);
			
		},
		
		//onNewCustomerInputChange: Triggered when user is entering a customer in the addEquipment dialog
		onNewCustomerInputChange: function(oEvent) {
			var custn = oEvent.mParameters.value;
			var customerInput = this.byId("idNewCustomerInput");
			var customerCombo = this.byId("idNewCustomerCombo");
			var custID = this.byId("idNewCustId");
			var idCountry = this.byId("idCountry");
			
			customerInput.setValueState("None");
			customerCombo.setValueState("None");
			
			if(custn) {  //this means we are using the input box, otherwise we use Combo
				var userinfo = oModel.getProperty("/userinfo");
				var salesorg = userinfo.default_sales_org;
				var division = userinfo.default_division;
				var customersFound = 0;
				var aAccountGrps = [];
				aAccountGrps.push("ZXGC");  //Read global Sold-to customers
			
				if(custn.length >= 4) {		//Start searching if user enter 4 or more characters
					var country = "";
					if(idCountry.getSelectedKey()=="") {
						country = salesorg.substring(0,2);
					} else {
						country = idCountry.getSelectedKey();
					}
					var j = {
						'name': custn,
						'country': country,
						'sales_org': salesorg,
						'distr_chn': '01',
						'division': '01',
						'account_grps':  aAccountGrps
					}
				
					var locationHostName = window.location.hostname;
					var strUrl;
					if(locationHostName.toLowerCase()=="localhost") {
						//AS1 strUrl ="proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
						strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
						//AQ1 strUrl ="proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
						//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
					} else {
						var sapClient = window.location.search.toUpperCase();
						if(sapClient.indexOf("SAP-CLIENT")!=-1) {
							strUrl = "/sap/zrest/stc/customer"+sapClient+"&sap-language=EN";
						} else {
							strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
						}
						//strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
					}
				
					//Call Backend system to request customers with parameters as specified in JSON structure
					var aData = jQuery.ajax({
						type: "GET",
						contentType: "application/json", 
						url: strUrl,
						data: {"json": JSON.stringify(j), "action": "get_by_address"},
						dataType: "json", 
						success: function(data, textStatus, jqXHR){
					
							var result = data[0].model;
							if (result.length > 0) {
								oModel.setProperty("/new_customers", result);
								customersFound = result.length;
								customerInput.setVisible(false);
								customerCombo.setVisible(true);
								customerCombo.setSelectedKey(result[0].id);
								custID.setTitle("ID: "+result[0].id);
							} else {
								oModel.setProperty("/new_customers", null);
								customerInput.setVisible(true);
								customerCombo.setVisible(false);
							};
						}, 
						error: function(json) { 
							customerInput.setVisible(true);
							customerCombo.setVisible(false);
						}
					});
				}
			} else {  //Now we follow-up changes of Combo
				if(customerCombo.mProperties.selectedKey==="") {
					customerCombo.setVisible(false);
					customerInput.setVisible(true);
					custID.setTitle("ID: ");
				} else {
					custID.setTitle("ID: "+customerCombo.mProperties.selectedKey);
					this.getEquipmentFromCustomer(customerCombo.getSelectedKey());
				}
			}
		},
		
		onChangeNewCustomer: function(oEvent) {
			var combo = this.byId("idNewCustomerCombo");
			if(combo.getSelectedKey() != "") {
				this.getEquipmentFromCustomer(combo.getSelectedKey());
			}
		},
		
		//customerDropDownChange: Triggered when a user selects another customer in the drop down Combo box.
		customerDropDownChange: function(t) {
			
			//If we are in new equipment creation pop-up, then we need variable newEquipPopup to be set to true
			var idNewEquipCustCombo = this.byId("idNewCustomerCombo");
			var newEquipPopup = false;
			if (t.mParameters.id == idNewEquipCustCombo.sId)
				newEquipPopup = true;
			
			var customerInput = null;
			var customerCombo = null;
			if(newEquipPopup) {
				customerInput = this.byId("idNewCustomerInput");
				customerCombo = this.byId("idNewCustomerCombo");
				var custId = this.byId("idNewCustId");
				custId.setTitle("ID: " + customerCombo.getSelectedKey());
				
			} else {
				customerInput = this.byId("idCustomerInput");
				customerCombo = this.byId("idCustomerCombo");
			}
			var iconBar = this.byId("idSubIconBar");
			var equipmentFound = 0;
			
			if(customerCombo.getValue()=="") {
				customerInput.mProperties.value = "";
				aCustomers = [];
				oModel.setProperty("/customers",aCustomers);
				customerInput.setVisible(true);
				customerCombo.setVisible(false);
				iconBar.setVisible(false);
			} else {
				oModel.setProperty("/equipmentfound",false);
				oModel.setProperty("/equipmentList",null);
				iconBar.setVisible(true);
				this.getEquipmentFromCustomer(customerCombo.getSelectedKey());
				
				var eqModel = this.getView().getModel("dataModel");
				if(eqModel) {
					eqModel.updateBindings(true);
				}			
			}
		},

		//isNumeric: a global function to validate if a value is numeric or not.
		isNumeric: function(n) {
			  return !isNaN(parseFloat(n)) && isFinite(n);
		},
		
		//GetClock: Triggered via the onInit page event and used to display a clock on the page which is refreshed every second
		//via a new event assignment in the onInit method.
		GetClock: function() {

	        var tday = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
	        var tmonth = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
	        var d = new Date();
	        var nday = d.getDay(),
	          nmonth = d.getMonth(),
	          ndate = d.getDate(),
	          nyear = d.getYear(),
	          nhour = d.getHours(),
	          nmin = d.getMinutes(),
	          nsec = d.getSeconds()
	          
	        if (nyear < 1000) nyear += 1900;
	        if (nmin <= 9) nmin = "0" + nmin;
	        if (nsec <= 9) nsec = "0" + nsec;
	        var result = new Array();
	        result[0] = tmonth[nmonth] + " " + ndate + ", " + nyear;
	        result[1] = nhour + ":" + nmin + ":" + nsec;
	        return result;
	      },
	      
	    //readUserInfo: Triggered by the onInit page event. The logged in user is retrieved with name and sales area data.
	    readUserInfo: function() {
	    	
	    	var locationHostName = window.location.hostname;
	    	var userInfoCombo = this.byId("idCmbUserInfo");
			var strUrl;
			if(locationHostName.toLowerCase()=="localhost") {
				//AS1 strUrl ="proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/user?sap-client=500&sap-language=EN";
				strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/user?sap-client=510&sap-language=EN";
				//AQ1 strUrl ="proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/user?sap-client=500&sap-language=EN";
				//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/user?sap-client=500&sap-language=EN";
			} else {
				var sapClient = window.location.search.toUpperCase();
				if(sapClient.indexOf("SAP-CLIENT")!=-1) {
					strUrl = "/sap/zrest/stc/user"+sapClient+"&sap-language=EN";
				} else {
					strUrl = "/sap/zrest/stc/user?sap-client=500&sap-language=EN";
				}
				//strUrl = "/sap/zrest/stc/user?sap-client=500&sap-language=EN";
			}
	    	
	    	var aData = jQuery.ajax({
				type: "GET",
				contentType: "application/json", 
				url: strUrl,
				data: {"action": "get_hr_info"},
				dataType: "json", 
				success: this.onRequestUserInfoSuccess,
				error: function(json) {  } });
	    },
	    
	    //onRequestUserInfoSuccess: Triggered by the success function of the readUserInfo function.
	    //The retrieved data is stored in the oModel
	    onRequestUserInfoSuccess: function(data) {
	    	var result = data[0].model;
			if (result.length > 0) {
				//alert("data found");
				if(result.length === 1) {
					var aUser = [];
					aUser.push(result[0]);
					oModel.setProperty("/userinfo", aUser[0]);
					//Set a default country
			        if(result[0].default_sales_org) {
			        	oModel.setProperty("country",result[0].default_sales_org.substring(0,2));
			        }
				} 
			}		
	    },
	    
	    //onRequestMaterialSuccess: Not in use. Intention is to provide a list of materials found.
	    onRequestMaterialSuccess: function(data) {
	    	//var materialInput = this.byId("idNewMaterialNr");
	    	var result = data[0].model;
	    	if(result.length > 1) {
	    		oModel.setProperty("/selectmaterial", true);
	    		oModel.setProperty("/entermaterial", false);
	    		oModel.setProperty("/materialList", result);
	    		oModel.setProperty("/material", result[0]);
	    	} else {
	    		oModel.setProperty("/selectmaterial", false);
	    		oModel.setProperty("/entermaterial", true);
	    		oModel.setProperty("/materialList", null);
	    		if(result && result.length==1) {
	    			oModel.setProperty("/material", result[0]);
	    		}
	    	}
	    },
	    
	    //fillCustomerCombo: When a list of customers is found (via the customer Input box), the list is populated
	    //in a Combo box and then displayed while the Input box is set to hidden. Every change in the list is triggering
	    //a search for equipment.
	    //When the Selected Key is cleared, the Combobox is hidden again and the Input box is made visible again.
	    fillCustomerCombo: function(usePopup) {
	    	var aData = oModel.getProperty("/customers");
	    	var customerInput = null;
	    	
	    	//If the input is via Popup, then data needs to be loaded in Popup.
	    	if(usePopup) {
	    		customerInput = this.byId("idNewCustomerInput");
	    		customerCombo = this.byId("idNewCustomerCombo");
	    	} else {
	    		customerInput = this.byId("idCustomerInput");
	    		customerCombo = this.byId("idCustomerCombo");
	    	}
	    	var eqList = this.byId("idFlexEquipment");
	    	var equipListIconTabItem = this.byId("idEquipmentList");
	    	var iconBar = this.byId("idSubIconBar");
	    	
	    	if(aData && aData.length > 0) {
	    		
	    		var countryCombo = this.byId("idCountry");
	    		
	    		customerInput.setVisible(false);
	    		customerCombo.setShowSecondaryValues(true);
	    		customerCombo.setTooltip("Select customer...");
	    		customerCombo.setEditable(true);
	    		customerCombo.removeAllItems();
	    		var comboValue = null;
	    		
	    		if(!usePopup)
	    			iconBar.setVisible(true);
	    		
	    		aData.sort(function( a, b) { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);});
	    		
	    		for(var i = 0; i < aData.length; i++) {
	    			//Fill Country drop down key if it is not yet set
	    			if(countryCombo.getSelectedKey()=="" &&aData[i].country) {
	    				countryCombo.setSelectedKey(aData[i].country);
	    			}
	    			var listItem = new sap.ui.core.ListItem();
	    			listItem.setText(aData[i].name+" ("+aData[i].city+")");
	    			listItem.setTooltip(aData[i].street + ", "+aData[i].house_number+", "+aData[i].city+" (SAP id: "+aData[i].id+")");
	    			listItem.setKey(aData[i].id);
	    			customerCombo.addItem(listItem);
	    			
	    			var custValue = customerInput.mProperties.value
	    			if(aData[i].name.substring(0, custValue.length).toUpperCase() == custValue.toUpperCase() && comboValue == null) {
	    				comboValue = aData[i].name;
	    				customerCombo.setValue(comboValue);
	    				customerCombo.setSelectedItem(listItem);
	    				this.getEquipmentFromCustomer(customerCombo.getSelectedKey());
	    			}
	    		}
	    		if(customerCombo.getValue()=="")
	    			customerCombo.setValue(aData[0].name);
	    		
	    		iconBar.setSelectedKey(equipListIconTabItem.sId);
	    		customerCombo.setVisible(true);
	    		
	    		if(usePopup) {
	    			var custId = this.byId("idNewCustId");
	    			custId.setTitle("ID: " + customerCombo.getSelectedKey());
	    		}
	    		
	    		if(!usePopup)
	    			eqList.setVisible(true);
	    	} else if(aData && aData.length == 1) {
	    			customerInput.setVisible(true);
	    			customerCombo.setVisible(false);
	    			if(!usePopup)
	    				iconBar.setVisible(true);
	    		}  else {
	    			iconBar.setVisible(false);
	    		}  		
	    },

	    //getEquipmentFromCustomer: Triggered when a customer is selected (also when specific serial number is entered or selected)
	    //A list of equipment is read via back-end resource CUSTOMER.
	    //First all Installed-at partners are searched and then for each Installed-At, the equipment are retrieved and merged in
	    //a list (array).
	    getEquipmentFromCustomer: function(id) {
	    	var aSPIds = [];
	    	var subIconBar = this.byId("idSubIconBar");
	    	var equipListIconTabItem = this.byId("idEquipmentList");
	    	var flowIconTabItem = this.byId("idServiceFlow");
	    	var eqFlexList = this.byId("idFlexEquipment");
	    	
	    	var eqFound = oModel.getProperty("/equipmentfound");
	    	var eqList = oModel.getProperty("/equipmentList");
	    	var userInfo = oModel.getProperty("/userinfo");
	    	
	    	if(eqFound == true && eqList != null && eqList.length > 0) {
	    		subIconBar.setSelectedKey(flowIconTabItem.sId);
	    	} else {
	    		subIconBar.setSelectedKey(equipListIconTabItem.sId);
	    	}
	    	
	    	var locationHostName = window.location.hostname;
			var strUrl;
			if(locationHostName.toLowerCase()=="localhost") {
				//AS1 strUrl ="proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
				strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/customer?sap-client=510&sap-language=EN";
				//AQ1 strUrl ="proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
				//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
			} else {
				var sapClient = window.location.search.toUpperCase();
				if(sapClient.indexOf("SAP-CLIENT")!=-1) {
					strUrl = "/sap/zrest/stc/customer"+sapClient+"&sap-language=EN";
				} else {
					strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
				}
				//strUrl = "/sap/zrest/stc/customer?sap-client=500&sap-language=EN";
			}
	    	
	    	//Find Installed-at customer ids for the current customer
	    	aSPIds.push(id);
	    	var parvws = [];
	    	parvws.push("ZI");
	    	var j = {
	    			'ids': aSPIds,
	    			'sales_org':userInfo.default_sales_org,
	    			'distr_chn': '01',
	    			'division': '01',
	    			'depth': 5,
	    			'partner_functions': parvws
	    	}
	    	
	    	var aData = jQuery.ajax({
	    		type: "GET",
	    		contentType: "application/json",
	    		url: strUrl,
	    		data: {"json": JSON.stringify(j), "action": "get_customer_hierarchy"},
				dataType: "json",
				success: function(data, textStatus, jqXHR){
					var result = data[0].model;
					var aZIId = [];
					var ziFound = false;
					for(var i = 0; i < result.length; i++) {
						for(var i2 = 0; i2 < result[i].edges.length; i2++) {
							if(result[i].edges[i2].label == "ZI") {
								aZIId.push(result[i].edges[i2].from);
								ziFound = true;
							}
						}
						if(!ziFound) { //If no Installed-at is found, use the first entry as customer to find equipment on
							aZIId.push(result[0].edges[0].from);
						}
					}
					var j2 = {
							'ids': aZIId,
							'READ_EQUIPMENTS': "TRUE",
							'READ_CONTACTS': "TRUE"
					}
					
					if(aZIId.length > 0) {
						var aData2 = jQuery.ajax({
							type: "GET",
							contentType: "application/json", 
							url: strUrl,
							data: {"json": JSON.stringify(j2), "action": "get_all_in_range"},
							dataType: "json", 
							success: function(data, textStatus, jqXHR){
								var result = data[0].model;
								oModel.setProperty("/equipmentList", null);
								var listEQ = oModel.getProperty("/equipmentList"); 
								if(listEQ == null)
									listEQ = [];
							
								for(var i = 0; i < result.length; i++) {
									if(result[i].equipments) {
										for(var k = 0; k < result[i].equipments.length; k++) {
											listEQ.push(result[i].equipments[k]);
										}
									}
								}
								oModel.setProperty("/equipmentList", listEQ);
								eqFlexList.setVisible(true);
								if(result[0].contacts && result[0].contacts.length > 0) {
									oModel.setProperty("/customercontacts", result[0].contacts)
								}
								else {
									oModel.setProperty("/customercontacts", null);
								}
						/*	} else {
								oModel.setProperty("/equipmentList", null);
								oModel.setProperty("/customercontacts", null);
								eqFlexList.setVisible(false);
							}; */
						}, 
						error: function(json) {
							alert("fail to post"); 
						}
					});
					} else {  // No Installed-at ids found
						eqFlexList.setVisible(false);
						oModel.setProperty("/equipmentList", null);
					}
				},
				error: function(json) {
					alert("fail to post"); 
				}
	    	});
	    	
	    	/*
			
			
			*/
			var eqModel = this.getView().getModel("dataModel");
			if(eqModel) {
				eqModel.updateBindings(true);
			}
	    	
	    },
	    
	    //onSelectSerialNr: Triggered when user selects an other equipment from the same customer
	    onSelectSerialNr: function(t) {
	    	var mainIconBar = this.byId("idMainIconBar");
	    	var equipSearchForm = this.byId("idSearchForm");
	    	
	    	var sernr = this.byId("idSerialNr");
	    	if(t.oSource.mProperties["text"]) {
	    		var sn = t.oSource.mProperties["text"];
	    		sn=sn.toUpperCase();
	    		
	    		sernr.setValue(sn);
	    		
	    		this.onSerialChange(t);
	    	}
	    	
	    	//Switch view IconBar
	    	var id = t.mParameters.id;
	    	if(id.indexOf('idWorkListSerialNr') != -1) {
	    		mainIconBar.setSelectedKey(equipSearchForm.id);
	    	} 
	    },
	    
	    //onCheckInEquipment: Triggered when user clicks on the Button in the right part of the Service Flow
	    //Depending on the current state of the equipment, the button will
	    //   - change the equipment user status --> directly posted to back-end (resource = EQUIPMENT)
	    //   - start a service flow: validations are done on business type (ILART) --> post to back-end with resource SERVICEFLOW
	    // Back-end call to be changed to global function 
	    onCheckInEquipment: function(t) {
	    	var inpFPPrice = this.byId("idFixedPriceValue");
	    	var btnCheckin = this.byId("idBtnCheckin");
	    	var arrDateTime = this.byId("dtpArrivalDateTime");
	    	var notifText = this.byId("idNotifText");
	    	var eqStateLabel = this.byId("idCurrentState");
	    	var postdata = null;
	    	var userStatuses = [];
	    	var ilart = "";
	    	var text = "";
	    	var warr = oModel.getProperty("/equipment/warranty_valid");
	    	var warrChecked = this.byId("idWarrCheck");
	    	var idLabelMailTo = this.byId("idLabelMailTo");
	    	var idSendMailTo = this.byId("idSendMailTo");
	    	
	    	inpFPPrice.setEnabled(false);
	    	var value = 0;
	    	if(inpFPPrice.mProperties.value) 
	    		value = inpFPPrice.mProperties.value;
	    	
	    	var equipment = oModel.getProperty("/equipment");

	    	if(t.oSource.mProperties.text == "Start Service Repair") {
	    		if(warr && warrChecked.getSelected()) {
	    			warr = true;
	    			ilart = "PG";
	    		} else {
	    			warr = false;
	    			ilart = "FP";
	    		}
	    		if(value > 0 || warr ) {
	    			var userinfo = oModel.getProperty("/userinfo");
	    			var service_order_hd = [];
	    			var service_order_par = [];
	    			var service_order_nts = [];
	    			if(arrDateTime.mProperties.value)
	    				text = "Arrival date/time: " + arrDateTime.mProperties.value + "\n\n";
	    			
	    			if(notifText.mProperties.value) {
	    				//Check line feeds and insert after 72 characters
	    				var lines = this.fragmentText(notifText.getValue(), 72);
	    				for(var i = 0; i < lines.length; i++) {
	    					text += lines[i] + "\n";	
	    				}
	    				
	    			}
	    			
	    			var d = new Date();
	    			var createdDate = d.toISOString().slice(0,10);
	    			createdDate = createdDate.replace(/-/g,"");
	    			var createdOn = d.toLocaleTimeString().slice(0,8);
	    			createdOn = createdOn.replace(/:/g,"");
	    			
	    			service_order_hd.push({
	    					'ilart': ilart,
	    					'equnr': equipment.id,
	    					'created_by': userinfo.name,
	    					'created_date': createdDate,
	    					'created_on': createdOn,
	    					'vkorg': equipment.sales_organization,
	    					'vtweg': equipment.distribution_channel,
	    					'spart': equipment.division,
	    					'serv_ord_text': 'Workshop repair',
	    					'notification_descr': 'Workshop repair',
	    					'notification_type': 'Y1',
	    					'selling_value': value,
	    			});
	    			
	    			service_order_par.push({
	    				'parvw': 'SP',
	    				'kunn2': equipment.sold_to,
	    				'created_by': userinfo.name,
	    				'created_date': createdDate
	    			});
	    			
	    			service_order_par.push({
	    				'parvw': 'ZI',
	    				'kunn2': equipment.installed_at,
	    				'created_by': userinfo.name,
	    				'created_date': createdDate
	    			});
	    			
	    			service_order_nts.push({
	    				'tdobject': 'QMEL',
	    				'tdid': 'LTXT',
	    				'langu': 'EN',
	    				'text': text
	    			});
	    			
	    			if(this.validateEmail(idSendMailTo.getValue())) {
	    				service_order_nts.push({
		    				'tdobject': 'EMAIL',
		    				'tdid': 'MAIL',
		    				'langu': 'EN',
		    				'text': idSendMailTo.mProperties.value
		    			}); 				
	    			}
	    			
	    			var postdata = {
	    					'ZSTC_TAB_SRVFLOW_HD': service_order_hd,
	    					'ZSTC_TAB_SRVFLOW_PAR': service_order_par,
	    					'ZSTC_TAB_SRVFLOW_NTS': service_order_nts
	    			};
	    			
	    			var locationHostName = window.location.hostname;
	        		var strUrl;
	        		if(locationHostName.toLowerCase()=="localhost") {
	        			//AS1 strUrl = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/serviceflow?sap-client=510&sap-language=EN";
	        			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/serviceflow?sap-client=510&sap-language=EN";
	        			//AQ1 strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/serviceflow?sap-client=500&sap-language=EN";
	        			//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/serviceflow?sap-client=500&sap-language=EN";
	        		} else {
	        			var sapClient = window.location.search.toUpperCase();
						if(sapClient.indexOf("SAP-CLIENT")!=-1) {
							strUrl = "/sap/zrest/stc/serviceflow"+sapClient+"&sap-language=EN";
						} else {
							strUrl = "/sap/zrest/stc/serviceflow?sap-client=500&sap-language=EN";
						}
	        			//strUrl = "/sap/zrest/stc/serviceflow?sap-client=500&sap-language=EN";
	        		}
	        		var aData = jQuery.ajax({
	    				type: "POST",
	    				contentType: "application/json", 
	    				url: strUrl,
	    				data: {"json": JSON.stringify(postdata), "action": "create"},
	    		//		data: {"json": JSON.stringify(j), "action": "query_equipment"},
	    				dataType: "json", 
	    				success: function(data, textStatus, jqXHR){    		}
	        		});
	    		}
	    	}  //End if Start Service Repair
	    	
	    	var eqState = oModel.getProperty("/equipment/checked_in");
	    	if(!eqState || eqState=="" || eqState=="Unknown" || eqState=="Checked-Out") {
	    		oModel.setProperty("/equipment/checked_in","Checked-In");
	    		inpFPPrice.setEnabled(true);
	    		if(value <= 0) {
	    			inpFPPrice.setValueState("Error");
	    			btnCheckin.setEnabled(false);
	    		} else {
	    			btnCheckin.setEnabled(true);
	    		}
	    		userStatuses.push({'USER_STATUS_CODE':'ZCHI','INACT': ''});
	    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': 'X'});
	    		userStatuses.push({'USER_STATUS_CODE':'ZRFS','INACT': 'X'});
	    		postdata = {
	    				'equnr': equipment.id,
	    				'user_status_changes': userStatuses
	    		};
	    		
	    		oModel.setProperty("/checkinButton", "Start Service Repair");
	    		idLabelMailTo.setVisible(true);
	    		idSendMailTo.setVisible(true);
	    	}
	    	if(eqState=="Checked-In") {
	    		oModel.setProperty("/equipment/checked_in","In Service");
	    		oModel.setProperty("/checkinButton", "Ready for Shipment");
	    		
	    		userStatuses.push({'USER_STATUS_CODE':'ZINS','INACT': ''});
	    		userStatuses.push({'USER_STATUS_CODE':'ZRFS','INACT': 'X'});
	    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': 'X'});
	    		postdata = {
	    				'equnr': equipment.id,
	    				'user_status_changes': userStatuses
	    		};
	    		idLabelMailTo.setVisible(false);
	    		idSendMailTo.setVisible(false);
	    	}
	    	if(eqState=="In Service") {
	    		oModel.setProperty("/equipment/checked_in","Ready for Shipment");
	    		oModel.setProperty("/checkinButton", "Check out");
	    		
	    		userStatuses.push({'USER_STATUS_CODE':'ZINS','INACT': 'X'});
	    		userStatuses.push({'USER_STATUS_CODE':'ZRFS','INACT': ''});
	    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': 'X'});
	    		postdata = {
	    				'equnr': equipment.id,
	    				'user_status_changes': userStatuses
	    		};
	    		idLabelMailTo.setVisible(false);
	    		idSendMailTo.setVisible(false);
	    	}
	    	if(eqState=="Ready for Shipment") {
	    		oModel.setProperty("/equipment/checked_in","Checked-Out");
	    		oModel.setProperty("/checkinButton", "Check in");
	    		arrDateTime.setEnabled(true);
	    		
	    		userStatuses.push({'USER_STATUS_CODE':'ZCHO','INACT': ''});
	    		userStatuses.push({'USER_STATUS_CODE':'ZINS','INACT': 'X'});
	    		userStatuses.push({'USER_STATUS_CODE':'ZCHI','INACT': 'X'});
	    		userStatuses.push({'USER_STATUS_CODE':'ZRFS','INACT': 'X'});
	    		postdata = {
	    				'equnr': equipment.id,
	    				'user_status_changes': userStatuses
	    		};
	    		idLabelMailTo.setVisible(false);
	    		idSendMailTo.setVisible(false);
	    	}
	    	if(postdata) {
	    		var locationHostName = window.location.hostname;
	    		var strUrl;
	    		if(locationHostName.toLowerCase()=="localhost") {
	    			//AS1 strUrl = "proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
	    			strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
	    			//AQ1 strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
	    			//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
	    		} else {
	    			var sapClient = window.location.search.toUpperCase();
					if(sapClient.indexOf("SAP-CLIENT")!=-1) {
						strUrl = "/sap/zrest/stc/equipment"+sapClient+"&sap-language=EN";
					} else {
						strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
					}
	    			//strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
	    		}
	    		var aData = jQuery.ajax({
					type: "GET",
					contentType: "application/json", 
					url: strUrl,
					data: {"json": JSON.stringify(postdata), "action": "update"},
			//		data: {"json": JSON.stringify(j), "action": "query_equipment"},
					dataType: "json", 
					success: function(data, textStatus, jqXHR){
						var result = data[0].model;
						//Result must have only 1 equipment, check status of equipment
						if(result[0].user_status && result[0].user_status.indexOf("ZCHI")!==-1) {
							oModel.setProperty("/equipment/checked_in","Checked-In");
							oModel.setProperty("/checkinButton", "Start Service Repair");
							eqStateLabel.addStyleClass("InfoStateRed");
							arrDateTime.setEnabled(true);
						} 
						if(result[0].user_status && result[0].user_status.indexOf("ZINS")!==-1) {
							oModel.setProperty("/equipment/checked_in","In Service");
							oModel.setProperty("/checkinButton", "Ready for Shipment");
							eqStateLabel.addStyleClass("InfoStateGreen");
							//arrDateTime.setEnabled(false);
						}
						if(result[0].user_status && result[0].user_status.indexOf("ZCHO")!==-1) {
							oModel.setProperty("/equipment/checked_in","Checked-Out");
							oModel.setProperty("/checkinButton", "Check in");
							eqStateLabel.addStyleClass("InfoStateGreen");
							arrDateTime.setEnabled(true);
						}
						if(result[0].user_status && result[0].user_status.indexOf("ZRFS")!==-1) {
							oModel.setProperty("/equipment/checked_in","Ready for Shipment");
							oModel.setProperty("/checkinButton", "Check out");
							eqStateLabel.addStyleClass("InfoStateGreen");
						}
						if(result[0].user_status && result[0].user_status === "") {
							oModel.setProperty("/equipment/checked_in","Unknown");
							oModel.setProperty("/checkinButton", "Check in");
							arrDateTime.setEnabled(true);
							eqStateLabel.addStyleClass("InfoStateGreen");
						}
					},
					error: function() {}
	    		});
	    	}
	    },
	      
	    //onInputFPPriceChange: Triggered when user is changing the content of the Fixed Price input box
	    //A validation is done to see if the value is Numeric and bigger than 0. Only then the button idBtnCheckin is enabled.
	    onInputFPPriceChange: function(t) {
			var btn = this.byId("idBtnCheckin");
			var inp = this.byId("idFixedPriceValue");
			var value = t.mParameters.value;
			var eqState = oModel.getProperty("/equipment/checked_in");
			
			if(eqState && eqState == "Checked-In") {
				if(this.isNumeric(value) && value > 0) {
					inp.setValueState("None");
					btn.setEnabled(true);
				}
				else {
					inp.setValueState("Error");
					btn.setEnabled(false);
					
				}
			}
			
		},
		
		//onInputMailChange: Triggered when user is typing a new e-mail address.
		// A validation of the e-mail address is done by calling function this.validateEmail(email)
		// When the e-mail address is correct, store it in the cookie.
		onInputMailChange: function(t) {
			var idSendMailTo = this.byId("idSendMailTo");
			var mailString = t.mParameters.value;
			
			if(this.validateEmail(mailString)) {
				idSendMailTo.setValueState("None");
				//If the e-mail address is valid, update the cookie
				jQuery.sap.storage.put("email", mailString);

			} else {
				idSendMailTo.setValueState("Error");
			}
		},
		
		//validateEmail: Copied function to validate an e-mail address.
		// This function should move to a general library.
		validateEmail:function(email) {
		    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		    return re.test(String(email).toLowerCase());
		},
		
		//onSubIconBarSelect: Triggered when the user is clicking on one of the TabItems.
		//If the IconTabItem is equal to the "Equipment on location" (idEquipmentList), then a function
		//this.getEquipmentFromCustomer is launched to read all equipment for this Sold-to customer.
		onSubIconBarSelect: function(t) {
			var equipFound = oModel.getProperty("/equipmentfound");
			var equipListIconTabItem = this.byId("idEquipmentList");
			
			if(equipFound == true && t.mParameters.selectedKey == equipListIconTabItem.sId) {
				var equipList = oModel.getProperty("/equipmentList")
				if(equipList == null || equipList.length == 0) {
					var equip = oModel.getProperty("/equipment");
					this.getEquipmentFromCustomer(equip.sold_to);
				}
			}
		},
		
		//OnShowUserInfo: currently no longer in use.
		OnShowUserInfo: function(oEvent) {
			if(!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("fragments.userInfo");
				this._oDialog.setModel(oModel);
				this._oDialog.setBindingContext(new sap.ui.model.Context(oModel, "/userinfo"));
			}
				
			// Multi-select if required
			var bMultiSelect = !!oEvent.getSource().data("multi");
			this._oDialog.setMultiSelect(bMultiSelect);

			// Remember selections if required
			var bRemember = !!oEvent.getSource().data("remember");
			this._oDialog.setRememberSelections(bRemember);

			// clear the old search filter
			this._oDialog.getBinding("items").filter([]);

			// toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
			this._oDialog.open();
		},
		
		//onAddEquipment: Triggered when user clicks the "+"-sign behind serial number.
		//It makes the Dialog addEquipmentDialog visible to create a new equipment
		onAddEquipment: function(oEvent) {
			var oView = this.getView();
			var oDialog = oView.byId("addEquipmentDialog");
			
			if (!oDialog) {
				// create dialog via fragment factory
				oDialog = sap.ui.xmlfragment(oView.getId(), "fragments.addEquipment");
				// connect dialog to view (models, lifecycle)
				oView.addDependent(oDialog);
			}

			oDialog.open();
		},
		
		//onNewSerialChange: Triggered when user is typing a serial number in the dialog addEquipmentDialog
		//Other steps have to be done and validated compared to the earlier described onSerialChange
		onNewSerialChange: function(oEvent) {
			var sernr = this.byId("idNewSerialNr");
			var val = oEvent.mParameters.value;
			sernr.setValueState("None");
			
			val=val.toUpperCase();
			
			oModel.setProperty("/serial_number_new", val);
			
		},

		onChangeRefEquipment: function(oEvent) {
			var idRefEquip = this.byId("idRefEquip");
			var eqList = oModel.getProperty("/equipmentList");
			
			if(idRefEquip.getSelectedKey() != "") {
				var equip = eqList.find(function(eq) {
					return eq.id = idRefEquip.getSelectedKey();
				});
				if(equip) {
					oModel.setProperty("/newmaterial", equip.material_number);
				}
			}
		},
		
		//onCreateEquipment: Triggered when user is clicking button Create in the dialog addEquipmentDialog
		onCreateEquipment: function(oEvent) {
			var oView = this.getView();
			var oDialog = oView.byId("addEquipmentDialog");
			
			var newCustCombo = this.byId("idNewCustomerCombo");
			var newCustInput = this.byId("idNewCustomerInput");
			var newSerialNr = this.byId("idNewSerialNr");
			var newMaterialNr = this.byId("idNewMaterialNr");
			var newDescription = this.byId("idNewEquipDescr");
			var idRefEquip = this.byId("idRefEquip");
			var validation = true;
			
			if(newCustCombo.mProperties.selectedKey == null || newCustCombo.mProperties.selectedKey == "") {
				newCustCombo.setValueState("Error");
				newCustInput.setValueState("Error");
				validation = false;
			} else {
				newCustCombo.setValueState("None");
			}
			
			if(newSerialNr.mProperties.value=="") {
				newSerialNr.setValueState("Error");
				validation = false;
			} else {
				newSerialNr.setValueState("None");
			}
			
			if(newMaterialNr.mProperties.value == "" || newMaterialNr.mProperties.length < 10) {
				newMaterialNr.setValueState("Error");
				validation = false;
			} else {
				newMaterialNr.setValueState("None");
			}
			
			if(newDescription.mProperties.value == "") {
				newDescription.setValueState("Error");
				validation = false;
			} else {
				newDescription.setValueState("None");
			}
			if(idRefEquip.getSelectedKey() == "") {
				idRefEquip.setValueState("Error");
				validation = false;
			} else {
				idRefEquip.setValueState("None");
			}
			
			if(validation) {
				var eqList = oModel.getProperty("/equipmentList");
				var equip = eqList.find(function(eq) {
					return eq.id = idRefEquip.getSelectedKey();
				});
				if(equip) {
					var j = {
							"installed_at":equip.installed_at,
					        "sold_to":equip.sold_to,
					        "serialnumber":newSerialNr.getValue(),
					        "material":newMaterialNr.getValue(),
					        "description":newDescription.getValue(),
					        "sales_org":equip.sales_organization,
					        "plant":equip.planning_plant,
					        "division":equip.division,
					        "distr_channel":'01'	
					}
					var locationHostName = window.location.hostname;
					var strUrl;
					if(locationHostName.toLowerCase()=="localhost") {
						//AS1 strUrl ="proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
						strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
						//AQ1 strUrl ="proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
						//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
					} else {
						var sapClient = window.location.search.toUpperCase();
						if(sapClient.indexOf("SAP-CLIENT")!=-1) {
							strUrl = "/sap/zrest/stc/equipment"+sapClient+"&sap-language=EN";
						} else {
							strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
						}
					}
					var aData = jQuery.ajax({
			    		type: "POST",
			    		contentType: "application/json",
			    		url: strUrl,
			    		data: {"json": JSON.stringify(j), "action": "create"},
						dataType: "json",
						success: function(data, textStatus, jqXHR){
							var result = data[0].model;
							sap.m.MessageBox.show("New equipment has been created with ID: "+result[0].id, {
									icon: sap.m.MessageBox.Icon.INFORMATION,
									title: "Equipment creation"});
						}
					});
					
				}
				
				if (oDialog) {
					oDialog.close();
				}
			}
			
		},
		
		//onCancelEquipCreate: Triggered when user is clicking button Cancel in the dialog addEquipmentDialog
		onCancelEquipCreate: function(oEvent) {
			var oView = this.getView();
			var oDialog = oView.byId("addEquipmentDialog");
			
			if (oDialog) {
				oDialog.close();
			}
		},
		
		//onDescriptionChange: Triggered when user is typing a description in the dialog addEquipmentDialog
		//This function is to store the entered description in the oModel property "/newdescription"
		onDescriptionChange: function(oEvent) {
			var idDescription = this.byId("idNewEquipDescr");
			var val = oEvent.mParameters.value;
			idDescription.setValueState("None");
			
			//val=val.toUpperCase();
			
			oModel.setProperty("/newdescription", val);
			
		},
		
		//onMaterialChange: Triggered when user is typing a material in the dialog addEquipmentDialog
		//The function is converting values to uppercase and store it in oModel property "/newmaterial"
		onMaterialChange: function(oEvent) {
			var idMaterial = this.byId("idNewMaterialNr");
			var val = oEvent.mParameters.value;
			idMaterial.setValueState("None");
			
			val = val.toUpperCase();
			
			oModel.setProperty("/newmaterial", val);
		},
		
		//onSelectWorkshopList: Triggered when user clicks on the IconTabFilter idEquipInWorkshop (Equipment in Worskhop)
		//The function will call REST service with resource EQUIPMENT for all equipment having userstatus ZCHI, ZINS or ZRFS
		//TODO Calling the back-end is to be centralized in a global function
		onSelectWorkshopList: function(oEvent) {
			var idSelectWorkshopList = this.byId("idEquipInWorkshop").sId;
			var vkorg = oModel.getProperty("/userinfo/default_sales_org");
			
			if(oEvent.mParameters.selectedKey == idSelectWorkshopList) {

				var j = { 'rsparms_tt':
							[{'SELNAME': 'EQART', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'EQUIPMENT'},
								{'SELNAME': 'STAT', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'ZCHI'},
								{'SELNAME': 'STAT', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'ZINS'},
								{'SELNAME': 'STAT', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': 'ZRFS'},
								{'SELNAME': 'VKORG', 'KIND':'S', 'SIGN':'I', 'OPTION': 'EQ', 'LOW': vkorg}]
				}
					
					var locationHostName = window.location.hostname;
					var strUrl;
					if(locationHostName.toLowerCase()=="localhost") {
						//AS1 strUrl ="proxy/http/as1sapr3.emea.group.atlascopco.com:8060/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
						strUrl = "proxy/http/ad1sapr3.emea.group.atlascopco.com:8076/sap/zrest/stc/equipment?sap-client=510&sap-language=EN";
						//AQ1 strUrl ="proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
						//strUrl = "proxy/http/aq1sapr3.emea.group.atlascopco.com:8075/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
					} else {
						var sapClient = window.location.search.toUpperCase();
						if(sapClient.indexOf("SAP-CLIENT")!=-1) {
							strUrl = "/sap/zrest/stc/equipment"+sapClient+"&sap-language=EN";
						} else {
							strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
						}
						//strUrl = "/sap/zrest/stc/equipment?sap-client=500&sap-language=EN";
					}
					
					var aData = jQuery.ajax({
						type: "GET",
						contentType: "application/json", 
						url: strUrl,
						data: {"json": JSON.stringify(j), "action": "query_equipment"},
						dataType: "json", 
						success: function(data, textStatus, jqXHR){
							
							var result = data[0].model;
							//Test if data has been found
							if (result.length > 0) {
								aEquipment = [];		
								for(var i = 0; i < result.length;i++) {
									if(result[i].user_status.indexOf("ZCHI")!==-1) {
										result[i].status = "Checked-In";
									}
									if(result[i].user_status.indexOf("ZINS")!==-1) {
										result[i].status = "In Service";
									}
									if(result[i].user_status.indexOf("ZRFS")!==-1) {
										result[i].status = "Ready for Shipment";
									}
									aEquipment.push(result[i]);
								}
							}
							else {
								aEquipment = [];
							}
							oModel.setProperty("/equipmentWorkshopList", aEquipment);
						}, 
							error: function(json) {
								alert("fail to post");
							}
					});
			}
			
		},

		//onChangeWarrantyCheck: Triggered when user is selecting/unselecting the Warranty Check Box
		//If the checkbox is selected, then no price needs to be entered and input is disabled and a service flow can be created
		//Otherwise, a check is done if a price is entered as numeric value to decide if the button idBtnCheckin is disabled or not.
		onChangeWarrantyCheck: function(oEvent) {
			var inputFP = this.byId("idFixedPriceValue");
			var warrCheck = this.byId("idWarrCheck");
			var btnCheckIn = this.byId("idBtnCheckin");
			
			if(oEvent.mParameters.selected) {
				inputFP.setEnabled(false);
				inputFP.setValueState("None");
				btnCheckIn.setEnabled(true);
			} else {
				inputFP.setEnabled(true);
				if(inputFP.mProperties.value && this.isNumeric(inputFP.mProperties.value) && inputFP.mProperties.value > 0) {
					btnCheckIn.setEnabled(true);
				} else {
					btnCheckIn.setEnabled(false);
				}
			}
			
		},
		
		fragmentText: function(text, maxWidth) {
			var words = text.split(' ');
			var lines = [];
			var line = "";
			if (text.length < maxWidth) {
		        return [text];
		    }
		    while (words.length > 0) {
		        while (words[0].length >= maxWidth) {
		            var tmp = words[0];
		            words[0] = tmp.slice(0, -1);
		            if (words.length > 1) {
		                words[1] = tmp.slice(-1) + words[1];
		            } else {
		                words.push(tmp.slice(-1));
		            }
		        }
		        if (line.length + words[0].length < maxWidth) {
		            line += words.shift() + " ";
		            if(line.indexOf("\n") != -1) {
		            	var pos = line.indexOf("\n");
		            	var newLine = line.substr(pos+1);
		            	line = line.substr(0,pos-1);
		            	lines.push(line);
		            	line = newLine;
		            }
		        } else {
		            lines.push(line);
		            line = "";
		        }
		        if (words.length === 0) {
		            lines.push(line);
		        }
		    }
		    return lines;

		},
		
		quickHelp: function(oControl, sText, bCustomize) {
			// create the RichTooltip control
			var oRichTooltip = new sap.ui.commons.RichTooltip({
				text : sText,
				title: "Quick Help",
				imageSrc : "assets/images/Tip.gif"
			});
			//Change position and durations if required
			if (bCustomize) {
				oRichTooltip.setMyPosition("begin top");
				oRichTooltip.setAtPosition("end top");
				oRichTooltip.setOpenDuration(300);
				oRichTooltip.setCloseDuration(300);
			}
			// add it to the control
			oControl.setTooltip(oRichTooltip);
			// return the control itself (makes this function a decorator function)
			return oControl;
		}
});