# Questionnaire: Order Summary and Upsell Logic

To ensure I can provide the most effective analysis, please answer the following questions:

1.  What is the single most important business outcome for this work? (e.g., Increase Argos Pay adoption by X%, Reduce user confusion in checkout, Ensure 100% accuracy in order summary).
	1. Ensure 100% accuracy in order summary

2.  You mentioned challenges on desktop vs. mobile. Could you rank the importance of solving this for each platform? Is one a higher priority than the other?
	1. Mobile has more visits

3.  Who is the ultimate decision-maker for the technical approach (e.g., Head of Engineering, a specific architect, the backend team lead)?
	1. Collaboration between teams App set-up seems good

4.  What are the hard constraints we must operate within? (e.g., cannot change the backend APIs, must be delivered by a certain date, performance impact of extra calls must be under X ms).
	1. The UI of the desktop is a little bit different so we have three different channels we have app which is iOSThe UI of the desktop is a little bit different so we have three different channels we have app which is iOS We have mobile web and mobile desktop mobile desktop has no selection process for fulfilment type and so we have no signal as to which type of fulfilment the customer will choose so if an item is out of stock if an item is not eligible for one or the other fulfilment type, it’s really hard to know until they click the call to action to continue to check out also on mobile web you do have a way to signal which film type you want to use so that might be a little bit simpler to replicate we believe that the app have a way that we could use but the desktop is different in UI and so it makes it quite challenging to figure out how to resolve

5.  You mentioned "Argos plus" and "Argos pay". Can you briefly clarify the distinction between them and how they relate to the order summary?
	1. Argos plus - this is a proposition a delivery proposition where customers pay £40 for a year delivery included for free. It’s important here that we don’t advertise the proposition to customers who don’t have it if the basket that they are shopping with at that point in time wouldn’t be eligible for the service if they were to buy it’s also important that we consider out of stock items and ineligible items as part of the logic care. Also did the delivery price information is where we upsell so the delivery information needs to be accurate based on the contents of your basket
	2. Argos Pay - Argos pays a new payment proposition that has a number of different payment plans like by now pay later 0% finance interest free credit interest bearing credit flex all of which are dependent on having eligible items in your basket plus also meeting a certain threshold so minimum £5 threshold but depending on how much your basket comes to will determine what proposition you are offered and so again it’s important that you know what the order summary is correct
