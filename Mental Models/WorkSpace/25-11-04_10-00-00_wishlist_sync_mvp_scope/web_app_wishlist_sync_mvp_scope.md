# Web/App Wishlist Sync - MVP Scope

## 1. Problem Statement

Currently, the Web and App wishlists are entirely separate and not synchronized. The App wishlist is stored locally on the user's device via caching. This has led to a critical incident where users lost their entire wishlist when the app's cache was cleared. This represents a significant risk to user trust and data, creating a poor and inconsistent customer experience. The lack of a centralized backend service for wishlists is a foundational problem that needs to be addressed.

## 2. Goals (In-Scope)

The primary goal of this MVP is to create a single, unified, and persistent wishlist experience across both Web and App platforms.

- **Full Synchronization:** Any item added to a wishlist on one channel (Web or App) must be reflected on the other in near real-time.
- **Persistence:** Wishlists must be stored in a central backend database, not on the user's device. This will prevent data loss.
- **Feature Parity with App:** The MVP must support, at a minimum, the existing functionality of the App, which includes the ability for a user to have multiple, named wishlists.
- **View Multiple Wishlists:** Users must be able to see all their wishlists on both Web and App.

## 3. Non-Goals (Out-of-Scope)

To ensure a focused and timely delivery of the core synchronization functionality, the following features will be considered out of scope for this MVP:

- **Digital Catalogue on Web:** The "Digital Catalogue" and its associated "Wishlist of Dreams" are app-only features and will not be part of the web experience for this MVP. The "Wishlist of Dreams" may be used as a prompt on the web to encourage app downloads.
- **Adding to Specific Wishlists on Web (Day 1):** While users will see all their wishlists on the web, the ability to choose a specific list to add an item to may not be part of the initial web release. The default behavior will be to add to a single, primary wishlist.
- **"Combine Wishlists" Feature:** The functionality to merge multiple wishlists into one is not a requirement for the MVP.
- **UI/UX Overhaul:** This project is focused on the backend and synchronization logic. A major redesign of the wishlist interface on either platform is not in scope.

## 4. High-Level Requirements

| ID | Requirement | Platform | Priority |
|---|---|---|---|
| WS-01 | A user's wishlists are stored in a centralized database. | Backend | Must Have |
| WS-02 | When a user adds an item to a wishlist on the App, it appears on the Web. | Web/App | Must Have |
| WS-03 | When a user adds an item to a wishlist on the Web, it appears on the App. | Web/App | Must Have |
| WS-04 | Users can view all their existing wishlists on both Web and App. | Web/App | Must Have |
| WS-05 | The system supports multiple, named wishlists per user. | Backend | Must Have |
| WS-06 | The "notify on price drop" functionality is retained. | App | Must Have |

## 5. Proposed Technical Approach

The core of this project will be the development of a new backend service to manage wishlists.

1.  **New Wishlist Service:** A new microservice will be created to handle all CRUD (Create, Read, Update, Delete) operations for wishlists and their items.
2.  **Database:** A database (e.g., a NoSQL or relational database) will be used to store user wishlists persistently.
3.  **API:** The new service will expose a set of APIs for the Web and App frontends to consume.
4.  **Authentication:** The APIs will be secured and will require user authentication to access and modify wishlists.
5.  **Migration:** A strategy will be required to handle existing wishlists on the app. Given they are cached, a seamless migration might not be possible. The initial launch might require users to start new wishlists. This needs further discussion.

## 6. Success Metrics

- **Reduction in Data Loss Incidents:** A complete elimination of user complaints related to lost wishlists.
- **Cross-Platform Usage:** An increase in users interacting with their wishlists on both Web and App.
- **API Performance:** The new wishlist service APIs should meet performance and availability targets.

## 7. Open Questions

- **Migration Strategy:** How will we handle existing, cached wishlists on the App? Can we provide a way for users to migrate them, or will we require them to start fresh?
- **"Combine Wishlists" Data:** Do we have any data on the usage of the "combine wishlists" feature in the app? This will help inform its priority for future releases.
- **"Notify on Price Drop" Implementation:** How is the "notify on price drop" feature currently implemented? Will the new backend service impact it?
- **Web "Add to List" Experience:** What is the desired default behavior for adding an item to a wishlist on the web if the user has multiple lists?
