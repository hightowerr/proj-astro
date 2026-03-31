# Questionnaire

To help me analyze this problem thoroughly, please provide some more details on the following points:

1.  **System Architecture:** Could you describe how the different frontends (desktop web, mobile web, native app) interact with the backend? Are they all using the same API for basket management? If not, how do they differ?
	1. So for the app, the backend for app actually comes from the backend that is managed by the mobile weapon desktop team the API is called the basket API and at the moment it sounds all the items in the trolley to another system called SPE which then return some information which is then what we display on the basket Apparently the app uses basket API but also makes a separate call to SP to get some information which then displays in the app

2.  **API Details:** If possible, could you provide an example of the request and response for the basket API call? Specifically, the part that deals with basket items and subtotals.
	1. Unfortunately not

4.  **Business Rules:**
    *   What are the precise business rules for "Argos Plus" eligibility? (e.g., what product categories are excluded?).
	    * Supplier direct fulfilment products are excluded and Tu clothing items
	    * Min £20 basket value threshold 
    *   What are the precise business rules for "Argos Pay" eligibility? (e.g., what are the credit thresholds, and what items are excluded?).
	    * min £5 basket value 
	    * There are a number of credit options based on different term values. The Argos pay proposition isn’t eligible for digital downloads or gift cards otherwise as long as you meet the minimum threshold then you’re eligible for an Argos pay proposition of which there are 6 to 9

5.  **Desired State:** In an ideal world, how should the basket, subtotal, and fulfillment options work for the user? Could you describe the desired user journey?
	1. In an ideal world frogs pay we would be able to show the correct payment proposition based on their basketball value for their preferred intended fulfilment choice which is easier on mobile web difficult on the desktop where we don’t have that intent for the customer
	2. And an ideal world for Argos plus we would be able to advertise the past to customers who don’t have it whether they are logged in or not logged in based on having eligible items based on a basket that considers whether or not your fulfilment type has been set to delivery

6.  **Constraints:** Are there any known technical, business, or resource constraints that I should be aware of while proposing a solution?
	1. Can’t change the desktop UI.

Please provide your answers to these questions. Once I have your responses, I will proceed with the analysis.
