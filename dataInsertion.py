import csv
import MySQLdb

mydb = MySQLdb.connect(host='localhost',
    user='root',
    passwd='root',
    db='project')
cursor = mydb.cursor()
with open('book.csv', 'r') as file:
    csv_data = csv.reader(file)
    for row in csv_data:
        cursor.execute(
        'INSERT INTO BookListing(Title, Author, Book_condition, Price, Genre, Book_description, Quantity, Auction, Photos, SellerID) '
        'VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (row[1], row[2], row[6], float(row[4]), row[7], row[3], int(row[9]), bool(row[10]), row[5], int(row[9])
        ))

#close the connection to the database.
mydb.commit()
cursor.close()
print ("Done")