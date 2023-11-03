CREATE DATABASE IF NOT EXISTS project;
use project;

CREATE TABLE IF NOT EXISTS CUSTOMER (
    UserID INT PRIMARY KEY,
    FirstName VARCHAR(20),
    LastName VARCHAR(20),
    PhoneNumber VARCHAR(10),
    Email NVARCHAR(100),
    UserAddress NVARCHAR(255),
    UserPassword NVARCHAR(20),
    UserCreatedAt DATETIME,
    LastLogin DATETIME,
    LastUpdated DATETIME
);

CREATE TABLE IF NOT EXISTS Wallet (
    UserID INT PRIMARY KEY,
    WalletBalance DECIMAL(10, 2),
    FOREIGN KEY (UserID) REFERENCES CUSTOMER(UserID)
);

CREATE TABLE IF NOT EXISTS BookListing (
    BookID INT PRIMARY KEY,
    Title VARCHAR(255),
    Author VARCHAR(255),
    Book_condition VARCHAR(50),
    Price DECIMAL(10, 2),
    Genre VARCHAR(100),
    Book_description TEXT,
    Quantity INT,
    Auction BOOLEAN,
    Photos VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS PurchaseHistory (
    PurchaseID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    Amount DECIMAL(10, 2),
    PaymentDateTime DATETIME,
    BookID INT,
    Quantity INT,
    FOREIGN KEY (UserID) REFERENCES CUSTOMER(UserID),
    FOREIGN KEY (BookID) REFERENCES BookListing(BookID)
);

CREATE TABLE IF NOT EXISTS Auction (
   	 BookID INT PRIMARY KEY,
   	 StartDateTime DATETIME,
   	 EndDateTime DATETIME,
    	 ReservePrice DECIMAL(10, 2),
	 MinimumIncrement INT,
	 CurrentBid INT,
	AuctionStatus VARCHAR(10),
    	FOREIGN KEY (BookID) REFERENCES BookListing(BookID)
);

CREATE TABLE IF NOT EXISTS Bids (
   	 BidID INT PRIMARY KEY,
   	 UserID INT,
   	 BookID INT,
	 PriceList VARCHAR(20),
	 MaxLimit INT,
	 AutoBid BOOL,
	FOREIGN KEY (BookID) REFERENCES BookListing(BookID),
	FOREIGN KEY (UserID) REFERENCES Customer(UserID)
);

CREATE TABLE BookLending (
    LendingID INT PRIMARY KEY AUTO_INCREMENT,
    BorrowerUserID INT,
    BookID INT,
    LendingStartDate DATE NOT NULL,
    LendingEndDate DATE NOT NULL,
    LateFee INT,
    FOREIGN KEY (BorrowerUserID) REFERENCES CUSTOMER(UserID),
    FOREIGN KEY (BookID) REFERENCES BookListing(BookID)
);

CREATE TABLE NotificationRequests (
    RequestID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT,
    BookID INT,
    RequestDate DATE NOT NULL,
    FOREIGN KEY (UserID) REFERENCES CUSTOMER(UserID),
    FOREIGN KEY (BookID) REFERENCES BookListing(BookID)
);

CREATE TABLE NotificationPreferences (
    NotificationPreferencesId INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT,           
    EmailNotifications BOOLEAN,      
    SMSNotifications BOOLEAN,
    FOREIGN KEY (UserID) REFERENCES CUSTOMER(UserID)
);

ALTER TABLE Cart
ADD CONSTRAINT uc_Cart_User_Book UNIQUE (UserID, BookID);

CREATE TABLE IF NOT EXISTS Cart (
    UserID INT,
    BookID INT,
    Quantity INT,
    FOREIGN KEY (UserID) REFERENCES CUSTOMER(UserID),
    FOREIGN KEY (BookID) REFERENCES BookListing(BookID)
);
